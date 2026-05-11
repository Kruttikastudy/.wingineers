"""
Groq LLM Service — Serverless AI Reasoning for Deepfake Detection

Uses the Groq OpenAI-compatible API to provide intelligent
reasoning and calibrated confidence scoring for deepfake detection results.

Supports a backup API key that is tried when the primary key fails.
"""

import json
import logging
import hashlib
from typing import Dict, Any, Optional
from collections import OrderedDict

logger = logging.getLogger(__name__)

# LRU-style cache for LLM responses
_llm_cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
_CACHE_MAX = 50
_LLM_TIMEOUT = 15  # seconds

GROQ_API_BASE = "https://api.groq.com/openai/v1"


def _get_api_key() -> str:
    """Return the primary Groq key, falling back to the legacy Featherless key."""
    from ..config import settings
    return (settings.GROQ_API_KEY or settings.FEATHERLESS_API_KEY or "").strip()


def _get_backup_api_key() -> str:
    """Return the backup Groq key."""
    from ..config import settings
    return (settings.GROQ_BACKUP_API_KEY or "").strip()


def _get_model() -> str:
    """Return the configured model, falling back to legacy Featherless model."""
    from ..config import settings
    return (settings.GROQ_MODEL or settings.FEATHERLESS_MODEL or "llama-3.1-8b-instant").strip()


async def validate_model() -> bool:
    """Validate that the configured Groq model is available. Call at startup."""
    api_key = _get_api_key()

    if not api_key:
        logger.info("[LLM] No GROQ_API_KEY — skipping model validation")
        return False

    try:
        import aiohttp

        headers = {"Authorization": f"Bearer {api_key}"}
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{GROQ_API_BASE}/models",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status != 200:
                    logger.error(
                        f"[LLM] Model validation failed: could not list models "
                        f"(HTTP {response.status}). LLM reasoning will be unavailable."
                    )
                    return False

                data = await response.json()
                model_ids = {m["id"] for m in data.get("data", [])}
                model = _get_model()
                if model not in model_ids:
                    logger.error(
                        f"[LLM] GROQ_MODEL '{model}' "
                        f"not found on Groq. LLM reasoning will be unavailable. "
                        f"Check https://console.groq.com/docs/models for valid model IDs."
                    )
                    return False

        logger.info(f"[LLM] Model validated: {_get_model()} (Groq)")
        return True
    except Exception as e:
        logger.error(f"[LLM] Model validation request failed: {e}")
        return False


DEEPFAKE_SYSTEM_PROMPT = """You are an AI reasoning assistant that explains deepfake detection results to non-technical users. You receive structured detection signals from ML models and your job is to EXPLAIN what the numbers mean — you do NOT make the final decision.

Your tasks:
1. **Explain the signals** in 2-3 plain-language sentences. Describe what the ML detection scores, frame analysis, and audio features suggest about the media's authenticity.
2. **Be honest about uncertainty** — if the average score is between 0.40 and 0.60, clearly state that the results are inconclusive and manual review is recommended.
3. **Highlight key factors** that a human reviewer should pay attention to (score distribution, consistency, frame coverage, audio anomalies).

CRITICAL RULES:
- You are a REASONING ASSISTANT, not the decision-maker. The ML model decides.
- If the average deepfake score is BELOW 0.50, the media is more likely authentic — say so.
- If the average deepfake score is ABOVE 0.70, the media is more likely manipulated — say so.
- If scores are between 0.40-0.60, state the results are likely not a deepfake but borderline.
- Low frame count analyzed vs total frames = mention this as a limitation.
- High variance in frame scores = mention some frames look different, explain which ones.
- Do NOT inflate confidence. A score of 0.55 is NOT strong evidence of anything.

Respond ONLY with valid JSON matching this schema:
{
  "verdict": "DEEPFAKE" | "AUTHENTIC" | "Likely not Deepfake",
  "confidence": <integer 0-100>,
  "reasoning": "<2-3 sentence plain-language explanation>",
  "key_factors": [
    {"name": "<factor name>", "value": "<description>", "impact": "high" | "medium" | "low"}
  ]
}"""


def _build_analysis_prompt(detection_result: Dict[str, Any], media_type: str) -> str:
    """Build a structured prompt from detection signals."""
    signals = []

    signals.append(f"Media Type: {media_type}")

    # Core detection result
    if detection_result.get("is_deepfake") is not None:
        signals.append(f"ML Detection Verdict: {'DEEPFAKE' if detection_result['is_deepfake'] else 'AUTHENTIC'}")

    if "average_score" in detection_result:
        signals.append(f"Average Deepfake Score: {detection_result['average_score']:.4f}")
    if "max_score" in detection_result:
        signals.append(f"Max Frame Score: {detection_result['max_score']:.4f}")
    if "std_score" in detection_result:
        signals.append(f"Score Std Deviation: {detection_result['std_score']:.4f}")
    if "frames_analyzed" in detection_result:
        signals.append(f"Frames Analyzed: {detection_result['frames_analyzed']}/{detection_result.get('total_frames', '?')}")
    if "duration_seconds" in detection_result:
        signals.append(f"Duration: {detection_result['duration_seconds']:.1f}s")

    # Audio-specific signals
    if "anomaly_score" in detection_result:
        signals.append(f"Audio Anomaly Score: {detection_result['anomaly_score']:.4f}")
    if "audio_features" in detection_result:
        af = detection_result["audio_features"]
        for key, val in af.items():
            if isinstance(val, float):
                signals.append(f"Audio {key}: {val:.4f}")
            else:
                signals.append(f"Audio {key}: {val}")

    # Temporal consistency
    if "temporal_consistency" in detection_result:
        tc = detection_result["temporal_consistency"]
        signals.append(f"Temporal Consistency Score: {tc:.4f}")

    # Frame-level scores
    if "frame_scores" in detection_result:
        fs = detection_result["frame_scores"]
        if len(fs) > 10:
            # Summarize
            signals.append(f"Frame Scores (sampled): first={fs[0]:.3f}, mid={fs[len(fs)//2]:.3f}, last={fs[-1]:.3f}")
        else:
            signals.append(f"Frame Scores: {[round(s, 3) for s in fs]}")

    # Model info
    if "model" in detection_result:
        signals.append(f"Model Used: {detection_result['model']}")
    if "method" in detection_result:
        signals.append(f"Method: {detection_result['method']}")

    # Overall confidence from ML
    if "confidence" in detection_result:
        signals.append(f"Raw ML Confidence: {detection_result['confidence']:.4f}")

    return "Analyze these deepfake detection signals:\n\n" + "\n".join(f"• {s}" for s in signals)


def _get_cache_key(signals: str) -> str:
    """Generate cache key from signal string."""
    return hashlib.md5(signals.encode()).hexdigest()


async def _make_groq_request(
    api_key: str,
    model: str,
    messages: list,
    temperature: float = 0.1,
    max_tokens: int = 500,
) -> Optional[Dict[str, Any]]:
    """Make a single request to Groq API. Returns parsed JSON response or None."""
    import aiohttp
    import asyncio

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{GROQ_API_BASE}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=_LLM_TIMEOUT),
                ) as response:
                    if response.status == 429 or response.status >= 500:
                        error_text = await response.text()
                        logger.warning(
                            f"[LLM] Retryable error {response.status} "
                            f"(attempt {attempt + 1}/{max_retries + 1}): {error_text[:200]}"
                        )
                        if attempt < max_retries:
                            await asyncio.sleep(1 * (2 ** attempt))
                            continue
                        return None

                    if response.status != 200:
                        error_text = await response.text()
                        logger.warning(f"[LLM] API returned {response.status}: {error_text[:200]}")
                        return None

                    data = await response.json()
                    return data

        except asyncio.TimeoutError:
            logger.warning(
                f"[LLM] Request timed out (attempt {attempt + 1}/{max_retries + 1})"
            )
            if attempt < max_retries:
                await asyncio.sleep(1 * (2 ** attempt))
                continue
            return None
        except Exception as e:
            logger.warning(
                f"[LLM] Network error (attempt {attempt + 1}/{max_retries + 1}): {e}"
            )
            if attempt < max_retries:
                await asyncio.sleep(1 * (2 ** attempt))
                continue
            return None

    return None


async def analyze_with_llm(
    detection_result: Dict[str, Any],
    media_type: str = "unknown"
) -> Optional[Dict[str, Any]]:
    """
    Send detection signals to Groq LLM for intelligent reasoning.

    Args:
        detection_result: Raw detection result from DeepfakeDetector
        media_type: "audio", "video", or "image"

    Returns:
        LLM analysis dict with verdict, confidence, reasoning, key_factors
        or None if LLM is unavailable
    """
    primary_key = _get_api_key()
    backup_key = _get_backup_api_key()

    if not primary_key and not backup_key:
        logger.warning("[LLM] No GROQ_API_KEY configured — skipping LLM reasoning")
        return None

    # Build prompt
    user_prompt = _build_analysis_prompt(detection_result, media_type)

    # Check cache
    cache_key = _get_cache_key(user_prompt)
    if cache_key in _llm_cache:
        logger.debug("[LLM] Cache hit")
        _llm_cache.move_to_end(cache_key)
        return _llm_cache[cache_key]

    model = _get_model()
    messages = [
        {"role": "system", "content": DEEPFAKE_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    logger.info(f"[LLM] Querying Groq ({model})...")

    # Try primary key first
    data = None
    if primary_key:
        data = await _make_groq_request(primary_key, model, messages)

    # Fallback to backup key
    if data is None and backup_key:
        logger.info("[LLM] Primary key failed, trying backup Groq key...")
        data = await _make_groq_request(backup_key, model, messages)

    if data is None:
        logger.warning("[LLM] All Groq API keys exhausted — no LLM reasoning available")
        return None

    try:
        # Parse response
        content = data["choices"][0]["message"]["content"]
        llm_result = json.loads(content)

        # Validate structure
        if "verdict" not in llm_result or "confidence" not in llm_result:
            logger.warning(f"[LLM] Invalid response structure: {content[:200]}")
            return None

        # Ensure confidence is 0-100 integer
        llm_result["confidence"] = max(0, min(100, int(llm_result["confidence"])))

        # Ensure key_factors is a list
        if "key_factors" not in llm_result or not isinstance(llm_result["key_factors"], list):
            llm_result["key_factors"] = []

        logger.info(
            f"[LLM] Result: {llm_result['verdict']} "
            f"(confidence: {llm_result['confidence']}%)"
        )

        # Cache result
        if len(_llm_cache) >= _CACHE_MAX:
            _llm_cache.popitem(last=False)
        _llm_cache[cache_key] = llm_result

        return llm_result

    except json.JSONDecodeError as e:
        logger.warning(f"[LLM] Failed to parse LLM response as JSON: {e}")
        return None
    except Exception as e:
        logger.warning(f"[LLM] Groq request failed: {e}")
        return None
