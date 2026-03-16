"""
Risk Score Fusion Engine

Takes analysis results from multiple detection components
(rule-based URL analyzer, DistilBERT model, SHAP confidence, user history)
and fuses them into a single risk score with severity label and CTA.
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Fusion weights (must sum to 1.0)
W_RULE_BASED = 0.35
W_MODEL = 0.40
W_SHAP_BOOST = 0.15
W_USER_HISTORY = 0.10

# Severity thresholds
SEVERITY_CRITICAL = 80
SEVERITY_HIGH = 60
SEVERITY_MODERATE = 40

# CTA mapping
CTA_MAP = {
    "CRITICAL": "Block immediately — this is a confirmed phishing vector.",
    "HIGH": "Do not interact — high probability of malicious intent.",
    "MODERATE": "Proceed with caution — some suspicious indicators detected.",
    "LOW": "Appears safe — no significant threats detected."
}


def compute_shap_confidence_boost(shap_values: list[float]) -> float:
    """
    Derive a confidence boost (0–100) from SHAP attribution values.

    If many tokens have high positive attribution (phishing signals),
    the boost is higher. If SHAP is not available, returns 0.
    """
    if not shap_values:
        return 0.0

    # Count tokens with positive attribution > 0.1
    positive_tokens = [v for v in shap_values if v > 0.1]
    if not positive_tokens:
        return 0.0

    # Boost = average positive attribution * 100, capped at 100
    avg_positive = sum(positive_tokens) / len(positive_tokens)
    boost = min(avg_positive * 100, 100.0)

    return round(boost, 2)


def get_severity_label(score: int) -> str:
    """Map a risk score (0–100) to a severity label."""
    if score >= SEVERITY_CRITICAL:
        return "CRITICAL"
    elif score >= SEVERITY_HIGH:
        return "HIGH"
    elif score >= SEVERITY_MODERATE:
        return "MODERATE"
    else:
        return "LOW"


def fuse_scores(
    rule_based_score: float = 0.0,
    model_score: float = 0.0,
    shap_values: Optional[list[float]] = None,
    user_history_boost: float = 0.0
) -> Dict[str, Any]:
    """
    Fuse multiple detection signals into a final risk verdict.

    Args:
        rule_based_score: Score from phishing_analyzer (0–100)
        model_score: DistilBERT model confidence * 100 for phishing class (0–100)
        shap_values: List of SHAP attribution values (or None)
        user_history_boost: Extra risk boost from user profiling (0–100)

    Returns:
        {
            "score": int (0–100),
            "severity": str,
            "cta": str,
            "component_scores": {
                "rule_based": float,
                "model": float,
                "shap_boost": float,
                "user_history": float
            }
        }
    """
    shap_boost = compute_shap_confidence_boost(shap_values or [])

    # Weighted fusion
    raw_score = (
        W_RULE_BASED * rule_based_score +
        W_MODEL * model_score +
        W_SHAP_BOOST * shap_boost +
        W_USER_HISTORY * user_history_boost
    )

    # Clamp to 0–100
    final_score = int(min(max(raw_score, 0), 100))

    severity = get_severity_label(final_score)
    cta = CTA_MAP[severity]

    logger.info(
        f"[Fusion] rule={rule_based_score:.1f} model={model_score:.1f} "
        f"shap={shap_boost:.1f} user={user_history_boost:.1f} → "
        f"final={final_score} ({severity})"
    )

    return {
        "score": final_score,
        "severity": severity,
        "cta": cta,
        "component_scores": {
            "rule_based": round(rule_based_score, 2),
            "model": round(model_score, 2),
            "shap_boost": round(shap_boost, 2),
            "user_history": round(user_history_boost, 2)
        }
    }
