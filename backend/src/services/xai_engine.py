"""
XAI Engine — SHAP-based Token Attribution for Phishing Detection

Wraps the DistilBERT phishing model with SHAP to produce per-token
attribution scores, enabling explainable AI on the warning page and dashboard.
"""

import logging
import asyncio
from functools import lru_cache
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Cache for recent SHAP computations (keyed by text hash)
_shap_cache: Dict[int, Dict[str, Any]] = {}
_CACHE_MAX = 100
_SHAP_TIMEOUT = 15.0  # seconds


class XAIEngine:
    """
    Produces SHAP token-level attribution for the phishing detection model.
    Falls back to model-confidence-only output if SHAP times out.
    """

    def __init__(self):
        self.explainer = None
        self.model_pipeline = None
        self._initialized = False

    def initialize(self, model_pipeline):
        """
        Lazily initialize with the existing HuggingFace pipeline.

        Args:
            model_pipeline: The transformers text-classification pipeline
                            from EmailAnalyzer.
        """
        if model_pipeline is None:
            logger.warning("[XAI] No phishing model pipeline provided — XAI disabled")
            return

        self.model_pipeline = model_pipeline
        try:
            import shap
            self.explainer = shap.Explainer(model_pipeline)
            self._initialized = True
            logger.info("[XAI] SHAP Explainer initialized successfully")
        except Exception as e:
            logger.warning(f"[XAI] Failed to initialize SHAP Explainer: {e}")

    async def explain(self, text: str) -> Dict[str, Any]:
        """
        Generate SHAP token attribution for an input text.

        Args:
            text: The raw text to explain (email body, URL, etc.)

        Returns:
            {
                "tokens": ["word1", "word2", ...],
                "shap_values": [+0.45, -0.12, ...],
                "base_value": float,
                "model_score": float,
                "model_label": str,
                "timestamp": str
            }
        """
        # Check cache first
        text_hash = hash(text[:512])
        if text_hash in _shap_cache:
            logger.debug("[XAI] Cache hit for text")
            return _shap_cache[text_hash]

        # Get model prediction first (always available)
        model_result = self._get_model_prediction(text)

        if not self._initialized or self.explainer is None:
            return {
                "tokens": [],
                "shap_values": [],
                "base_value": 0.0,
                "model_score": model_result["score"],
                "model_label": model_result["label"],
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "fallback": True,
                "reason": "SHAP explainer not initialized"
            }

        # Run SHAP with timeout
        try:
            result = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, self._compute_shap, text
                ),
                timeout=_SHAP_TIMEOUT
            )

            # Build output
            output = {
                "tokens": result["tokens"],
                "shap_values": result["shap_values"],
                "base_value": result["base_value"],
                "model_score": model_result["score"],
                "model_label": model_result["label"],
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "fallback": False
            }

            # Cache result
            if len(_shap_cache) >= _CACHE_MAX:
                # Remove oldest entry
                oldest_key = next(iter(_shap_cache))
                del _shap_cache[oldest_key]
            _shap_cache[text_hash] = output

            return output

        except asyncio.TimeoutError:
            logger.warning("[XAI] SHAP computation timed out — using fallback")
            return {
                "tokens": [],
                "shap_values": [],
                "base_value": 0.0,
                "model_score": model_result["score"],
                "model_label": model_result["label"],
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "fallback": True,
                "reason": "SHAP computation timed out"
            }
        except Exception as e:
            logger.error(f"[XAI] SHAP computation failed: {e}")
            return {
                "tokens": [],
                "shap_values": [],
                "base_value": 0.0,
                "model_score": model_result["score"],
                "model_label": model_result["label"],
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "fallback": True,
                "reason": str(e)
            }

    def _get_model_prediction(self, text: str) -> Dict[str, Any]:
        """Get raw model prediction without SHAP."""
        if self.model_pipeline is None:
            return {"label": "UNKNOWN", "score": 0.0}

        try:
            truncated = text[:512]
            result = self.model_pipeline(truncated)
            return {
                "label": result[0]["label"],
                "score": result[0]["score"]
            }
        except Exception as e:
            logger.warning(f"[XAI] Model prediction failed: {e}")
            return {"label": "ERROR", "score": 0.0}

    def _compute_shap(self, text: str) -> Dict[str, Any]:
        """
        Synchronous SHAP computation (run in executor).

        Returns dict with tokens, shap_values, base_value.
        """
        truncated = text[:512]
        shap_values = self.explainer([truncated])

        # Extract token-level data
        # shap_values.data contains the tokenized words
        # shap_values.values contains the attribution scores
        tokens = []
        values = []
        base_value = 0.0

        if hasattr(shap_values, 'data') and hasattr(shap_values, 'values'):
            raw_tokens = shap_values.data[0]
            raw_values = shap_values.values[0]

            # Get base value
            if hasattr(shap_values, 'base_values'):
                base_val = shap_values.base_values[0]
                if hasattr(base_val, '__len__'):
                    # Multi-class: pick the phishing class (index 1)
                    base_value = float(base_val[1]) if len(base_val) > 1 else float(base_val[0])
                else:
                    base_value = float(base_val)

            for i, token in enumerate(raw_tokens):
                token_str = str(token).strip()
                if not token_str:
                    continue

                # Get SHAP value — may be multi-dimensional for multi-class
                val = raw_values[i]
                if hasattr(val, '__len__'):
                    # Use the phishing class attribution (index 1)
                    shap_val = float(val[1]) if len(val) > 1 else float(val[0])
                else:
                    shap_val = float(val)

                tokens.append(token_str)
                values.append(round(shap_val, 4))

        return {
            "tokens": tokens,
            "shap_values": values,
            "base_value": round(base_value, 4)
        }


# Global singleton
xai_engine = XAIEngine()
