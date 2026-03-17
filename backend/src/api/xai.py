"""
XAI API Routes — Explainability, User Profiling, and Feedback

Endpoints:
  POST /api/xai/explain         — SHAP token attribution + fused risk score
  POST /api/xai/explain-deepfake — Deepfake detection explainability
  GET  /api/xai/user-profile/{user_id} — User vulnerability score & history
  POST /api/xai/feedback        — Submit false-positive / false-negative feedback
  POST /api/xai/deepfake-feedback — Submit deepfake detection feedback
  GET  /api/xai/feedback/stats  — Global feedback statistics
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from ..services.xai_engine import xai_engine
from ..services.fusion_engine import fuse_scores
from ..services.user_profile import user_profile_manager
from ..services.feedback_store import feedback_store
from ..services.email_analyzer import get_email_analyzer
from ..services.phishing_analyzer import analyze_url as rule_based_analyze

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request / Response Models ──

class ExplainRequest(BaseModel):
    text: str
    url: Optional[str] = None
    user_id: Optional[str] = None


class ExplainResponse(BaseModel):
    tokens: List[str]
    shap_values: List[float]
    base_value: float
    model_score: float
    model_label: str
    fused_score: int
    severity: str
    cta: str
    component_scores: dict
    fallback: bool
    timestamp: str


class FeedbackRequest(BaseModel):
    url: str
    original_verdict: str
    original_score: int
    user_label: str  # "safe" or "phishing"
    user_id: Optional[str] = None
    raw_text: Optional[str] = None


class DeepfakeExplainRequest(BaseModel):
    verdict: str  # "DEEPFAKE", "AUTHENTIC", "INCONCLUSIVE"
    confidence: float
    media_url: Optional[str] = None
    details: Optional[dict] = None
    user_id: Optional[str] = None


class DeepfakeFeature(BaseModel):
    name: str
    value: str
    impact: str  # "high", "medium", "low"


class DeepfakeExplainResponse(BaseModel):
    risk_score: int
    severity: str
    cta: str
    features: List[DeepfakeFeature]


class DeepfakeFeedbackRequest(BaseModel):
    media_url: str
    original_verdict: str
    original_confidence: float
    user_label: str  # "authentic" or "deepfake"
    user_id: Optional[str] = None


# ── Endpoints ──

@router.post("/xai/explain", response_model=ExplainResponse, tags=["XAI"])
async def explain_text(request: ExplainRequest):
    """
    Analyze text with SHAP token attribution and produce a fused risk score.

    - Runs DistilBERT + SHAP for token-level explainability
    - Runs rule-based URL analysis if a URL is provided
    - Fuses all signals via the fusion engine
    - Incorporates user history boost if user_id is provided
    """
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(status_code=400, detail="Text must be at least 3 characters")

    try:
        # Ensure XAI engine is initialized
        if not xai_engine._initialized:
            analyzer = get_email_analyzer()
            if analyzer.phishing_model:
                xai_engine.initialize(analyzer.phishing_model)

        # 1. Get SHAP explanation
        xai_result = await xai_engine.explain(request.text)

        # 2. Get rule-based score (if URL provided)
        rule_score = 0.0
        if request.url:
            rule_result = rule_based_analyze(request.url)
            rule_score = rule_result.get("riskScore", 0)

        # 3. Compute model score (0–100 scale)
        model_score_raw = xai_result.get("model_score", 0.0)
        model_label = xai_result.get("model_label", "UNKNOWN")
        # LABEL_1 = phishing → use score directly
        # LABEL_0 = safe → invert
        if model_label == "LABEL_1":
            model_score = model_score_raw * 100
        elif model_label == "LABEL_0":
            model_score = (1 - model_score_raw) * 100
        else:
            model_score = 0.0

        # 4. User history boost
        user_boost = 0.0
        if request.user_id:
            domain = ""
            if request.url:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(request.url).hostname or ""
                except Exception:
                    pass
            user_boost = user_profile_manager.get_history_anomaly_boost(
                request.user_id, domain
            )

        # 5. Fuse scores
        fused = fuse_scores(
            rule_based_score=rule_score,
            model_score=model_score,
            shap_values=xai_result.get("shap_values", []),
            user_history_boost=user_boost
        )

        # 6. Record scan in user profile
        if request.user_id:
            domain = ""
            if request.url:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(request.url).hostname or ""
                except Exception:
                    pass
            user_profile_manager.record_scan(
                user_id=request.user_id,
                domain=domain,
                risk_score=fused["score"],
                category=_score_to_category(fused["score"])
            )

        return ExplainResponse(
            tokens=xai_result.get("tokens", []),
            shap_values=xai_result.get("shap_values", []),
            base_value=xai_result.get("base_value", 0.0),
            model_score=round(model_score, 2),
            model_label=model_label,
            fused_score=fused["score"],
            severity=fused["severity"],
            cta=fused["cta"],
            component_scores=fused["component_scores"],
            fallback=xai_result.get("fallback", True),
            timestamp=xai_result.get("timestamp", "")
        )

    except Exception as e:
        logger.error(f"[XAI] Explain error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"XAI analysis failed: {str(e)}")


@router.get("/xai/user-profile/{user_id}", tags=["XAI"])
async def get_user_profile(user_id: str):
    """
    Get user vulnerability score, scan history summary, and prediction trend.
    """
    try:
        return user_profile_manager.get_profile_summary(user_id)
    except Exception as e:
        logger.error(f"[XAI] Profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load user profile")


@router.post("/xai/feedback", tags=["XAI"])
async def submit_feedback(request: FeedbackRequest):
    """
    Submit user feedback on a detection result (false positive / false negative).
    """
    if request.user_label not in ("safe", "phishing"):
        raise HTTPException(
            status_code=400,
            detail="user_label must be 'safe' or 'phishing'"
        )

    try:
        entry = feedback_store.add_feedback(
            url=request.url,
            original_verdict=request.original_verdict,
            original_score=request.original_score,
            user_label=request.user_label,
            user_id=request.user_id,
            raw_text=request.raw_text
        )
        return {"status": "ok", "feedback_id": entry["id"]}
    except Exception as e:
        logger.error(f"[XAI] Feedback error: {e}")
        raise HTTPException(status_code=500, detail="Failed to store feedback")


@router.get("/xai/feedback/stats", tags=["XAI"])
async def get_feedback_stats():
    """
    Get global feedback statistics: FP/FN rates, total feedback count, recent entries.
    """
    try:
        return feedback_store.get_stats()
    except Exception as e:
        logger.error(f"[XAI] Feedback stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute feedback stats")


@router.post("/xai/explain-deepfake", response_model=DeepfakeExplainResponse, tags=["XAI"])
async def explain_deepfake(request: DeepfakeExplainRequest):
    """
    Generate an explainability report for a deepfake detection result.

    Maps detection metadata into severity, CTA, and feature-level explanations.
    """
    try:
        verdict = request.verdict
        confidence = request.confidence
        details = request.details or {}

        # Compute risk score (0-100)
        if verdict == "DEEPFAKE":
            risk_score = int(min(confidence * 100, 100))
        elif verdict == "AUTHENTIC":
            risk_score = int(max((1 - confidence) * 100, 0))
        else:
            risk_score = 50

        # Severity mapping
        if risk_score >= 70:
            severity = "CRITICAL"
        elif risk_score >= 50:
            severity = "HIGH"
        elif risk_score >= 30:
            severity = "MODERATE"
        else:
            severity = "LOW"

        # CTA recommendation
        cta_map = {
            "CRITICAL": "This media is very likely manipulated. Do not share or trust this content without independent verification.",
            "HIGH": "This media shows strong signs of manipulation. Verify the source before sharing or acting on it.",
            "MODERATE": "This media has some suspicious characteristics. Consider verifying with the original source.",
            "LOW": "This media appears genuine. Standard caution is still recommended for any online content.",
        }
        cta = cta_map[severity]

        # Extract feature-level explanations from detection details
        features = []

        model = details.get("model", details.get("method", ""))
        if model:
            features.append(DeepfakeFeature(
                name="Detection Model",
                value=model.split("/")[-1] if "/" in model else model,
                impact="high" if "Deep-Fake" in model or "ViT" in model else "medium",
            ))

        if "average_score" in details:
            avg = details["average_score"]
            avg_pct = round(avg * 100)
            features.append(DeepfakeFeature(
                name="Average Deepfake Score",
                value=f"{avg_pct}%",
                impact="high" if avg > 0.6 else "medium" if avg > 0.3 else "low",
            ))

        if "score" in details:
            score = details["score"]
            score_pct = round(score * 100)
            features.append(DeepfakeFeature(
                name="Model Detection Score",
                value=f"{score_pct}%",
                impact="high" if score > 0.6 else "medium" if score > 0.3 else "low",
            ))

        if "faces_detected" in details:
            n_faces = details["faces_detected"]
            features.append(DeepfakeFeature(
                name="Faces Detected",
                value=str(n_faces),
                impact="medium",
            ))

        if "max_score" in details:
            mx = details["max_score"]
            features.append(DeepfakeFeature(
                name="Peak Frame Score",
                value=f"{round(mx * 100)}%",
                impact="high" if mx > 0.7 else "medium",
            ))

        if "frames_analyzed" in details:
            features.append(DeepfakeFeature(
                name="Frames Analyzed",
                value=f"{details['frames_analyzed']}/{details.get('total_frames', '?')}",
                impact="low",
            ))

        if "method" in details:
            method = details["method"]
            if method == "face_analysis":
                features.append(DeepfakeFeature(
                    name="Analysis Method",
                    value="Heuristic face analysis (blur + frequency)",
                    impact="medium",
                ))

        # Add confidence as a feature
        features.append(DeepfakeFeature(
            name="Confidence Level",
            value=f"{round(confidence * 100)}%",
            impact="high" if confidence > 0.8 else "medium" if confidence > 0.5 else "low",
        ))

        return DeepfakeExplainResponse(
            risk_score=risk_score,
            severity=severity,
            cta=cta,
            features=features,
        )

    except Exception as e:
        logger.error(f"[XAI] Deepfake explain error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Deepfake XAI analysis failed: {str(e)}")


@router.post("/xai/deepfake-feedback", tags=["XAI"])
async def submit_deepfake_feedback(request: DeepfakeFeedbackRequest):
    """
    Submit user feedback on a deepfake detection result.
    """
    if request.user_label not in ("authentic", "deepfake"):
        raise HTTPException(
            status_code=400,
            detail="user_label must be 'authentic' or 'deepfake'"
        )

    try:
        entry = feedback_store.add_feedback(
            url=request.media_url,
            original_verdict=request.original_verdict,
            original_score=int(request.original_confidence * 100),
            user_label=request.user_label,
            user_id=request.user_id,
        )
        return {"status": "ok", "feedback_id": entry["id"]}
    except Exception as e:
        logger.error(f"[XAI] Deepfake feedback error: {e}")
        raise HTTPException(status_code=500, detail="Failed to store deepfake feedback")


def _score_to_category(score: int) -> str:
    """Map risk score to category string."""
    if score >= 70:
        return "high_risk"
    elif score >= 40:
        return "medium_risk"
    elif score >= 20:
        return "low_risk"
    else:
        return "safe"
