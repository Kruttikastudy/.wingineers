import logging
import re

logger = logging.getLogger(__name__)

# Basic keywords and patterns for phone-based threats/scams
SCAM_PATTERNS = [
    (r"password|pin|otp|credit card|bank account", 40, "Sensitive information requested"),
    (r"immediately|urgent|within 24 hours|account will be blocked", 25, "Urgency tactics detected"),
    (r"irs|tax|police|government|official", 20, "Impersonation of authority"),
    (r"money|transfer|wired|gift card|crypto", 35, "Suspicious payment request"),
    (r"don't tell anyone|keep this secret|private", 20, "Secrecy request detected")
]

def analyze_transcript(text: str) -> dict:
    """
    Analyzes call transcript for potential threats.
    Returns a dict with safe, risk_score, reasons, and category.
    """
    if not text:
        return {"safe": True, "risk_score": 0, "reasons": [], "category": "safe"}

    text_lower = text.lower()
    risk_score: int = 0
    reasons = []

    for pattern, score, reason in SCAM_PATTERNS:
        if re.search(pattern, text_lower):
            risk_score += score
            reasons.append(reason)

    # Cap score
    risk_score = min(risk_score, 100)

    category = "safe"
    if risk_score >= 70:
        category = "high_risk"
    elif risk_score >= 40:
        category = "medium_risk"
    elif risk_score >= 20:
        category = "low_risk"

    # Calculate confidence based on flag count
    base_confidence = 0.85 # Default high confidence for negative check
    if reasons:
        # More reasons = higher confidence that it IS a threat
        base_confidence = min(0.65 + (len(reasons) * 0.1), 0.99)
    
    return {
        "safe": risk_score < 40,
        "risk_score": risk_score,
        "confidence": round(base_confidence * 100, 1),
        "reasons": reasons,
        "category": category,
        "text": text
    }
