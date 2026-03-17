"""
Deepfake Reasoning Engine — ML-Primary Adaptive Scoring + LLM Reasoning

Uses the ML model's raw detection scores as the primary decision signal,
applies sigmoid-based confidence mapping with signal quality multipliers,
and uses the LLM only for human-readable reasoning (never to override verdict).
"""

import math
import logging
import asyncio
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# ── Adaptive scoring parameters ──────────────────────────────────────────────
SIGMOID_STEEPNESS = 8       # k — how aggressively the sigmoid separates fake/real
BASE_DEAD_ZONE = 0.12       # half-width of the inconclusive zone around 0.5
MAX_LLM_NUDGE = 0.08        # ±8% max influence from LLM on confidence


def _signal_quality(
    std_score: float = 0.0,
    frames_analyzed: int = 1,
    total_frames: int = 1,
) -> float:
    """
    Compute a signal quality multiplier in [0.5, 1.0].

    High quality  → many frames analysed, low score variance.
    Low  quality  → few frames, high variance.
    """
    coverage = min(frames_analyzed / max(total_frames, 1), 1.0)
    consistency = max(0.0, 1.0 - std_score * 3)  # low std → 1.0

    quality = 0.5 + 0.25 * min(coverage * 10, 1.0) + 0.25 * consistency
    return min(quality, 1.0)


def _sigmoid_confidence(avg_score: float, quality: float) -> float:
    """
    Map a raw ML average score → directional confidence via steepened sigmoid.

    Returns a value in (0, 1] where:
      - values near 0.5  → low confidence (uncertain)
      - values near 0 / 1 → high confidence
    """
    raw = 1.0 / (1.0 + math.exp(-SIGMOID_STEEPNESS * (avg_score - 0.5)))

    # Directional: convert sigmoid output to "confidence in the verdict"
    if raw >= 0.5:
        confidence = raw * quality        # DEEPFAKE side
    else:
        confidence = (1.0 - raw) * quality  # AUTHENTIC side

    return min(confidence, 1.0)


def _adaptive_verdict(avg_score: float, quality: float) -> str:
    """
    Determine verdict using a dead-zone that adapts to signal quality.

    Poor quality → wider inconclusive zone (more cautious).
    High quality → narrower zone (more decisive).
    """
    adjusted_dz = BASE_DEAD_ZONE * (1.5 - 0.5 * quality)

    if avg_score > 0.5 + adjusted_dz:
        return "DEEPFAKE"
    elif avg_score < 0.5 - adjusted_dz:
        return "AUTHENTIC"
    else:
        return "Likely not Deepfake"


def _apply_llm_nudge(
    confidence: float,
    ml_verdict: str,
    llm_result: Optional[Dict[str, Any]],
) -> tuple[float, bool]:
    """
    Bayesian-style nudge: LLM can adjust confidence by up to ±MAX_LLM_NUDGE
    but CANNOT flip the verdict.

    Returns (adjusted_confidence, llm_agrees).
    """
    if not llm_result:
        return confidence, True

    llm_verdict = llm_result.get("verdict", "INCONCLUSIVE")
    llm_conf_factor = llm_result.get("confidence", 50) / 100.0

    agrees = (
        llm_verdict == ml_verdict
        or llm_verdict == "Likely not Deepfake"
        or ml_verdict == "Likely not Deepfake"
    )

    if agrees:
        confidence += MAX_LLM_NUDGE * llm_conf_factor  # reinforce
    else:
        confidence -= MAX_LLM_NUDGE * 0.5  # slight doubt, bounded
        logger.warning(
            f"[Reasoning] ML/LLM DISAGREE — ML={ml_verdict}, "
            f"LLM={llm_verdict} ({llm_conf_factor:.0%}). "
            "Keeping ML verdict, applying negative nudge."
        )

    return max(0.0, min(confidence, 1.0)), agrees


# ── Public API ────────────────────────────────────────────────────────────────

async def analyze_with_reasoning(
    detection_result: Dict[str, Any],
    media_type: str = "unknown",
) -> Dict[str, Any]:
    """
    Enhance a raw ML detection result with:
      1. Sigmoid-based adaptive confidence
      2. Dynamic dead-zone verdict
      3. Bounded LLM nudge
      4. LLM-generated human-readable reasoning
    """
    # If detection itself failed, return as-is
    if detection_result.get("error"):
        return detection_result

    # ── Step 1: Extract ML signals ────────────────────────────────────────
    avg_score = detection_result.get(
        "average_score",
        detection_result.get("score",
            detection_result.get("anomaly_score",
                detection_result.get("confidence", 0.5)
            )
        )
    )
    std_score = detection_result.get("std_score", 0.0)
    frames_analyzed = detection_result.get("frames_analyzed", 1)
    total_frames = detection_result.get("total_frames", 1)

    # ── Step 2: Compute signal quality & sigmoid confidence ───────────────
    quality = _signal_quality(std_score, frames_analyzed, total_frames)
    confidence = _sigmoid_confidence(avg_score, quality)
    ml_verdict = _adaptive_verdict(avg_score, quality)

    # ── Step 3: Run LLM for reasoning (non-blocking) ─────────────────────
    llm_result = None
    try:
        from .featherless_llm import analyze_with_llm
        llm_result = await analyze_with_llm(detection_result, media_type)
    except Exception as e:
        logger.warning(f"[Reasoning] LLM analysis failed: {e}")

    # ── Step 4: Bayesian LLM nudge ────────────────────────────────────────
    confidence, llm_agrees = _apply_llm_nudge(confidence, ml_verdict, llm_result)

    # ── Step 5: Map verdict → is_deepfake ─────────────────────────────────
    if ml_verdict == "DEEPFAKE":
        is_deepfake = True
    elif ml_verdict == "AUTHENTIC":
        is_deepfake = False
    else:  # Likely not Deepfake
        is_deepfake = False

    # ── Step 6: Merge into result ─────────────────────────────────────────
    detection_result["ml_raw_score"] = float(avg_score)
    detection_result["ml_confidence"] = detection_result.get("confidence", 0.0)
    detection_result["signal_quality"] = round(quality, 3)
    detection_result["is_deepfake"] = is_deepfake
    detection_result["confidence"] = float(confidence)
    detection_result["verdict"] = ml_verdict

    if llm_result:
        reasoning = llm_result.get("reasoning", "")
        if not llm_agrees:
            reasoning = (
                f"[Note: The AI reasoning model suggested '{llm_result.get('verdict', '?')}' "
                f"but the ML detection signals indicate '{ml_verdict}'. "
                f"The ML-based verdict is used.] {reasoning}"
            )
        detection_result["reasoning"] = reasoning
        detection_result["key_factors"] = llm_result.get("key_factors", [])
        detection_result["llm_verdict"] = llm_result.get("verdict")
        detection_result["llm_confidence"] = llm_result.get("confidence", 0) / 100.0
        detection_result["analysis_source"] = "ml_primary_llm_reasoned"
    else:
        detection_result["reasoning"] = _generate_fallback_reasoning(
            detection_result, media_type, ml_verdict, confidence
        )
        detection_result["key_factors"] = _generate_fallback_factors(detection_result)
        detection_result["analysis_source"] = "ml_only"

    # Flag low-trust heuristic results prominently
    if detection_result.get("low_trust"):
        detection_result["analysis_source"] += "_low_trust"
        detection_result["reasoning"] = (
            "[Low confidence — heuristic fallback] "
            + detection_result.get("reasoning", "")
        )

    logger.info(
        f"[Reasoning] {ml_verdict} "
        f"(confidence: {confidence:.0%}, ML raw: {avg_score:.4f}, "
        f"quality: {quality:.2f})"
    )

    return detection_result


# ── Fallback reasoning (when LLM is unavailable) ─────────────────────────────

def _generate_fallback_reasoning(
    result: Dict[str, Any],
    media_type: str,
    verdict: str,
    confidence: float,
) -> str:
    """Generate human-readable reasoning from ML signals alone."""
    conf_pct = round(confidence * 100)
    raw = result.get("ml_raw_score", 0)

    if verdict == "Likely not Deepfake":
        return (
            f"Analysis produced borderline results (raw score: {raw:.2f}). "
            f"The signals are not strong enough to confidently determine manipulation, "
            f"so it is likely not a deepfake. Manual review is recommended if context is suspicious."
        )

    if media_type == "audio":
        anomaly = result.get("anomaly_score", 0)
        if verdict == "DEEPFAKE":
            return (
                f"Audio analysis detected anomalous patterns with {conf_pct}% confidence. "
                f"The spectral characteristics show irregularities (anomaly score: {anomaly:.2f}) "
                f"consistent with AI-generated or manipulated audio."
            )
        return (
            f"Audio analysis found natural speech characteristics with {conf_pct}% confidence. "
            f"The spectral patterns and voice timbre appear consistent with authentic human speech."
        )

    if media_type in ("video", "image"):
        frames = result.get("frames_analyzed", 0)
        total = result.get("total_frames", 0)
        if verdict == "DEEPFAKE":
            return (
                f"Visual analysis detected manipulation markers with {conf_pct}% confidence. "
                f"Analyzed {frames}/{total} frames with an average deepfake score of {raw:.2f}. "
                f"Facial features, blur patterns, or frequency artifacts suggest synthetic generation."
            )
        return (
            f"Visual analysis found consistent and natural features with {conf_pct}% confidence. "
            f"Analyzed {frames}/{total} frames with no significant manipulation artifacts detected."
        )

    return f"Analysis completed with {conf_pct}% confidence. Verdict: {verdict}."


def _generate_fallback_factors(result: Dict[str, Any]) -> list:
    """Generate key factor list from ML signals alone."""
    factors = []

    if "ml_raw_score" in result:
        raw = result["ml_raw_score"]
        factors.append({
            "name": "ML Detection Score",
            "value": f"{round(raw * 100)}% deepfake probability",
            "impact": "high" if raw > 0.7 or raw < 0.3 else "medium",
        })

    if "signal_quality" in result:
        q = result["signal_quality"]
        factors.append({
            "name": "Signal Quality",
            "value": f"{round(q * 100)}%",
            "impact": "high" if q < 0.6 else "low",
        })

    if "frames_analyzed" in result:
        fa = result["frames_analyzed"]
        total = result.get("total_frames", 0)
        coverage = (fa / total * 100) if total > 0 else 0
        factors.append({
            "name": "Frame Coverage",
            "value": f"{fa}/{total} frames ({coverage:.0f}%)",
            "impact": "medium" if coverage > 3 else "low",
        })

    if "std_score" in result:
        std = result["std_score"]
        factors.append({
            "name": "Score Consistency",
            "value": "Consistent" if std < 0.15 else "Variable",
            "impact": "medium",
        })

    if "anomaly_score" in result:
        anomaly = result["anomaly_score"]
        factors.append({
            "name": "Audio Anomaly Level",
            "value": f"{round(anomaly * 100)}%",
            "impact": "high" if anomaly > 0.5 else "medium" if anomaly > 0.3 else "low",
        })

    if "model" in result:
        model = result["model"]
        model_short = model.split("/")[-1] if "/" in model else model
        factors.append({
            "name": "Detection Model",
            "value": model_short,
            "impact": "low",
        })

    return factors
