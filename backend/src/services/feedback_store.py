"""
Feedback Store — Continuous Learning Data Collection

Stores user-submitted feedback (false positives / false negatives)
for future model retraining and quality monitoring.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

FEEDBACK_FILE = Path(__file__).parent.parent.parent / "feedback.json"
MAX_FEEDBACK = 1000


class FeedbackStore:
    """Stores and manages user feedback for continuous learning."""

    def __init__(self):
        self.feedback: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        """Load feedback from disk."""
        try:
            if FEEDBACK_FILE.exists():
                with open(FEEDBACK_FILE, "r") as f:
                    self.feedback = json.load(f)
                logger.info(f"[Feedback] Loaded {len(self.feedback)} feedback entries")
        except Exception as e:
            logger.error(f"[Feedback] Failed to load feedback: {e}")
            self.feedback = []

    def _save(self):
        """Persist feedback to disk."""
        try:
            FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(FEEDBACK_FILE, "w") as f:
                json.dump(self.feedback, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"[Feedback] Failed to save feedback: {e}")

    def add_feedback(
        self,
        url: str,
        original_verdict: str,
        original_score: int,
        user_label: str,
        user_id: Optional[str] = None,
        raw_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a user's feedback on a detection result.

        Args:
            url: The URL that was analyzed
            original_verdict: The system's original verdict (e.g., "high_risk")
            original_score: The system's original risk score
            user_label: The user's correction — "safe" or "phishing"
            user_id: Optional anonymous user ID
            raw_text: Optional raw text that was analyzed

        Returns:
            The stored feedback entry
        """
        entry = {
            "id": len(self.feedback) + 1,
            "url": url,
            "original_verdict": original_verdict,
            "original_score": original_score,
            "user_label": user_label,
            "user_id": user_id,
            "raw_text": raw_text[:500] if raw_text else None,
            "timestamp": datetime.utcnow().isoformat(),
            "is_false_positive": (
                original_verdict in ("high_risk", "medium_risk") and user_label == "safe"
            ),
            "is_false_negative": (
                original_verdict in ("safe", "low_risk", "trusted") and user_label == "phishing"
            )
        }

        self.feedback.insert(0, entry)

        # Cap at MAX_FEEDBACK
        if len(self.feedback) > MAX_FEEDBACK:
            self.feedback = self.feedback[:MAX_FEEDBACK]

        self._save()
        logger.info(
            f"[Feedback] Recorded: url={url[:40]}... "
            f"verdict={original_verdict} → user_label={user_label}"
        )

        return entry

    def get_stats(self) -> Dict[str, Any]:
        """
        Compute feedback statistics for the dashboard.

        Returns:
            {
                "total": int,
                "false_positives": int,
                "false_negatives": int,
                "fp_rate": float (0–1),
                "fn_rate": float (0–1),
                "recent_feedback": list (last 10)
            }
        """
        total = len(self.feedback)
        fp = sum(1 for f in self.feedback if f.get("is_false_positive"))
        fn = sum(1 for f in self.feedback if f.get("is_false_negative"))

        return {
            "total": total,
            "false_positives": fp,
            "false_negatives": fn,
            "fp_rate": round(fp / total, 4) if total > 0 else 0.0,
            "fn_rate": round(fn / total, 4) if total > 0 else 0.0,
            "recent_feedback": self.feedback[:10]
        }

    def get_pending_review(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get feedback entries that could be used for model retraining.

        Prioritizes false positives and false negatives.
        """
        actionable = [
            f for f in self.feedback
            if f.get("is_false_positive") or f.get("is_false_negative")
        ]
        return actionable[:limit]


# Global singleton
feedback_store = FeedbackStore()
