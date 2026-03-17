import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

def fuse_scores(rule_based_score: float, model_score: float, shap_values: Optional[List] = None, user_history_boost: float = 0.0) -> dict:
    """
    Fuse multiple risk scores into a single final verdict.

    Args:
        rule_based_score: Score from rule-based analysis (0-100)
        model_score: Score from ML model (0-100)
        shap_values: SHAP attribution values for explainability
        user_history_boost: Boost factor from user history anomalies (0-50)

    Returns:
        dict with fused_score, verdict, confidence, and key_factors
    """
    # Weighted average: 40% rule-based, 60% model
    base_score = (rule_based_score * 0.4) + (model_score * 0.6)

    # Apply user history boost
    final_score = min(100, base_score + user_history_boost)

    # Determine verdict
    if final_score >= 80:
        verdict = "Critical Risk"
        confidence = 0.95
    elif final_score >= 60:
        verdict = "High Risk"
        confidence = 0.85
    elif final_score >= 40:
        verdict = "Moderate Risk"
        confidence = 0.70
    else:
        verdict = "Low Risk"
        confidence = 0.80

    key_factors = []
    if rule_based_score > 50:
        key_factors.append("Rule-based detection triggered")
    if model_score > 50:
        key_factors.append("ML model flagged suspicious patterns")
    if user_history_boost > 0:
        key_factors.append("User history anomaly detected")

    return {
        "fused_score": round(final_score, 2),
        "verdict": verdict,
        "confidence": confidence,
        "key_factors": key_factors,
        "component_scores": {
            "rule_based": rule_based_score,
            "model": model_score,
            "history_boost": user_history_boost
        }
    }

async def process_and_fuse_verdict(message_sid: str, worker_results: dict) -> dict:
    """
    Mock Fusion Engine
    Takes results from various analysis workers (URL, Image, Text, Audio)
    and fuses them into a single final verdict and recommendation string.
    """
    logger.info(f"Fusing results for {message_sid}: {worker_results}")
    
    # Placeholder Logic
    risk_score = 15  # Out of 100
    verdict = "Low Risk"
    explanation = "No immediate threats detected."
    action = "No action needed."
    
    if worker_results.get("phishing_detected") or worker_results.get("deepfake_detected"):
        risk_score = 95
        verdict = "High Risk - Critical"
        explanation = "Suspicious patterns detected matching known phishing or deepfake signatures."
        action = "Do not pay. Verify on a live call. Report to 1930."
        
    return {
        "score": risk_score,
        "verdict": verdict,
        "explanation": explanation,
        "recommended_action": action
    }
