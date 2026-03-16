"""
Tests for the Fusion Engine
"""

from src.services.fusion_engine import (
    fuse_scores,
    compute_shap_confidence_boost,
    get_severity_label,
    W_RULE_BASED, W_MODEL, W_SHAP_BOOST, W_USER_HISTORY
)


def test_weights_sum_to_one():
    """Fusion weights must sum to exactly 1.0."""
    total = W_RULE_BASED + W_MODEL + W_SHAP_BOOST + W_USER_HISTORY
    assert abs(total - 1.0) < 1e-9, f"Weights sum to {total}, expected 1.0"


def test_fusion_high_risk():
    """When all components report high risk, fused score should be CRITICAL."""
    result = fuse_scores(
        rule_based_score=90,
        model_score=95,
        shap_values=[0.5, 0.4, 0.3, 0.2],
        user_history_boost=80
    )
    assert result["score"] >= 80, f"Expected >= 80, got {result['score']}"
    assert result["severity"] == "CRITICAL"
    assert "Block" in result["cta"]


def test_fusion_safe():
    """When all components report safe, fused score should be LOW."""
    result = fuse_scores(
        rule_based_score=5,
        model_score=3,
        shap_values=[],
        user_history_boost=0
    )
    assert result["score"] < 40, f"Expected < 40, got {result['score']}"
    assert result["severity"] == "LOW"
    assert "safe" in result["cta"].lower()


def test_fusion_moderate():
    """Mixed signals should produce MODERATE severity."""
    result = fuse_scores(
        rule_based_score=50,
        model_score=60,
        shap_values=[0.15, 0.1],
        user_history_boost=0
    )
    assert 40 <= result["score"] < 80, f"Expected 40-79, got {result['score']}"
    assert result["severity"] in ("MODERATE", "HIGH")


def test_fusion_component_scores_present():
    """Output must include all component scores."""
    result = fuse_scores(rule_based_score=50, model_score=50)
    cs = result["component_scores"]
    assert "rule_based" in cs
    assert "model" in cs
    assert "shap_boost" in cs
    assert "user_history" in cs


def test_shap_boost_empty():
    """No SHAP values → 0 boost."""
    assert compute_shap_confidence_boost([]) == 0.0
    assert compute_shap_confidence_boost(None or []) == 0.0


def test_shap_boost_positive():
    """High SHAP positive values → non-zero boost."""
    boost = compute_shap_confidence_boost([0.5, 0.3, 0.2])
    assert boost > 0, f"Expected positive boost, got {boost}"


def test_severity_labels():
    """Severity label mapping."""
    assert get_severity_label(90) == "CRITICAL"
    assert get_severity_label(65) == "HIGH"
    assert get_severity_label(50) == "MODERATE"
    assert get_severity_label(10) == "LOW"


def test_fusion_clamped_to_100():
    """Score should never exceed 100."""
    result = fuse_scores(
        rule_based_score=100,
        model_score=100,
        shap_values=[1.0, 1.0, 1.0],
        user_history_boost=100
    )
    assert result["score"] <= 100
