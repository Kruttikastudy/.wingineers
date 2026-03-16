"""
User Profile Service

Per-user behavioral profiling and vulnerability scoring.
Tracks scan history, domain patterns, and computes a rolling vulnerability score.
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import Counter

logger = logging.getLogger(__name__)

PROFILES_FILE = Path(__file__).parent.parent.parent / "user_profiles.json"

# Global average threat ratio (bootstrap value — can be updated periodically)
GLOBAL_AVG_THREAT_RATIO = 0.12  # 12% of scans are threats on average


class UserProfileManager:
    """Manages per-user scan history, vulnerability scoring, and anomaly detection."""

    def __init__(self):
        self.profiles: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        """Load profiles from disk."""
        try:
            if PROFILES_FILE.exists():
                with open(PROFILES_FILE, "r") as f:
                    self.profiles = json.load(f)
                logger.info(f"[UserProfile] Loaded {len(self.profiles)} user profiles")
        except Exception as e:
            logger.error(f"[UserProfile] Failed to load profiles: {e}")
            self.profiles = {}

    def _save(self):
        """Persist profiles to disk."""
        try:
            PROFILES_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(PROFILES_FILE, "w") as f:
                json.dump(self.profiles, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"[UserProfile] Failed to save profiles: {e}")

    def _ensure_profile(self, user_id: str) -> Dict[str, Any]:
        """Create a profile if it doesn't exist."""
        if user_id not in self.profiles:
            self.profiles[user_id] = {
                "user_id": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "total_scans": 0,
                "total_threats": 0,
                "domain_history": [],  # list of {domain, timestamp, risk_score}
                "daily_scores": [],     # list of {date, avg_score, scan_count, threat_count}
                "top_domains": [],      # top 10 most visited domains
            }
        return self.profiles[user_id]

    def record_scan(
        self,
        user_id: str,
        domain: str,
        risk_score: int,
        category: str
    ) -> None:
        """
        Record a scan event for a user.

        Args:
            user_id: Anonymous user identifier
            domain: The domain scanned
            risk_score: Risk score from the analysis
            category: Risk category (high_risk, medium_risk, etc.)
        """
        profile = self._ensure_profile(user_id)
        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")

        profile["total_scans"] += 1
        is_threat = category in ("high_risk", "medium_risk")
        if is_threat:
            profile["total_threats"] += 1

        # Add to domain history (keep last 500)
        profile["domain_history"].append({
            "domain": domain,
            "timestamp": now.isoformat(),
            "risk_score": risk_score,
            "category": category
        })
        if len(profile["domain_history"]) > 500:
            profile["domain_history"] = profile["domain_history"][-500:]

        # Update daily scores
        daily = profile["daily_scores"]
        if daily and daily[-1].get("date") == today_str:
            entry = daily[-1]
            n = entry["scan_count"]
            entry["avg_score"] = round(
                (entry["avg_score"] * n + risk_score) / (n + 1), 2
            )
            entry["scan_count"] += 1
            if is_threat:
                entry["threat_count"] += 1
        else:
            daily.append({
                "date": today_str,
                "avg_score": risk_score,
                "scan_count": 1,
                "threat_count": 1 if is_threat else 0
            })

        # Keep only last 90 days of daily data
        if len(daily) > 90:
            profile["daily_scores"] = daily[-90:]

        # Update top domains
        all_domains = [d["domain"] for d in profile["domain_history"]]
        counter = Counter(all_domains)
        profile["top_domains"] = [d for d, _ in counter.most_common(10)]

        self._save()

    def get_vulnerability_score(self, user_id: str) -> float:
        """
        Compute a vulnerability score (0–100) for a user.

        Based on their threat-to-scan ratio over the last 30 days,
        relative to the global average.
        """
        profile = self._ensure_profile(user_id)
        now = datetime.utcnow()
        cutoff = now - timedelta(days=30)

        # Count recent threats and scans
        recent = [
            d for d in profile["domain_history"]
            if datetime.fromisoformat(d["timestamp"]) > cutoff
        ]

        if not recent:
            return 0.0

        scans_30d = len(recent)
        threats_30d = sum(
            1 for d in recent if d["category"] in ("high_risk", "medium_risk")
        )

        user_ratio = threats_30d / scans_30d if scans_30d > 0 else 0.0

        # Score relative to global average
        # If user_ratio == global_avg → score ~50
        # If user_ratio >> global_avg → score → 100
        # If user_ratio << global_avg → score → 0
        if GLOBAL_AVG_THREAT_RATIO > 0:
            relative = user_ratio / GLOBAL_AVG_THREAT_RATIO
        else:
            relative = 0.0

        score = min(relative * 50, 100.0)
        return round(score, 1)

    def get_history_anomaly_boost(self, user_id: str, domain: str) -> float:
        """
        Check if a domain is anomalous for this user.

        Returns a risk boost (0–20) if the domain is dissimilar
        from the user's top-10 visited domains.
        """
        profile = self._ensure_profile(user_id)
        top_domains = profile.get("top_domains", [])

        if not top_domains:
            return 0.0

        # If domain is in user's top-10, no anomaly
        if domain in top_domains:
            return 0.0

        # Check partial match (subdomain awareness)
        for known in top_domains:
            if domain.endswith(known) or known.endswith(domain):
                return 0.0

        # Domain is unfamiliar — boost
        return 15.0

    def get_prediction_trend(self, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
        """
        Return the daily risk score trend for the last N days.

        Returns list of {date, avg_score, scan_count, threat_count}.
        """
        profile = self._ensure_profile(user_id)
        daily = profile.get("daily_scores", [])
        return daily[-days:] if daily else []

    def get_profile_summary(self, user_id: str) -> Dict[str, Any]:
        """Return a summary of the user's profile for the dashboard."""
        profile = self._ensure_profile(user_id)
        vuln_score = self.get_vulnerability_score(user_id)
        trend = self.get_prediction_trend(user_id, 30)

        return {
            "user_id": user_id,
            "vulnerability_score": vuln_score,
            "total_scans": profile["total_scans"],
            "total_threats": profile["total_threats"],
            "top_domains": profile.get("top_domains", []),
            "daily_trend": trend,
            "member_since": profile.get("created_at", "")
        }


# Global singleton
user_profile_manager = UserProfileManager()
