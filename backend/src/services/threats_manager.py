"""
Threat Manager
File-based threat storage and management for phishing URLs.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

THREATS_FILE = Path(__file__).parent.parent.parent / "threats.json"


class ThreatsManager:
    """Manages threat storage and retrieval."""

    def __init__(self):
        self.threats: List[Dict[str, Any]] = []
        self.threat_id_counter = 1
        self._load_threats()

    def _load_threats(self):
        """Load threats from file."""
        try:
            if THREATS_FILE.exists():
                with open(THREATS_FILE, 'r') as f:
                    self.threats = json.load(f)
                    if self.threats:
                        self.threat_id_counter = max([t.get('id', 0) for t in self.threats]) + 1
        except Exception as e:
            logger.error(f"Failed to load threats: {e}")
            self.threats = []

    def _save_threats(self):
        """Save threats to file."""
        try:
            THREATS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(THREATS_FILE, 'w') as f:
                json.dump(self.threats, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save threats: {e}")

    def add_threat(self, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a threat to storage if it's not safe.

        Args:
            analysis_result: URL analysis result

        Returns:
            Threat with ID or original result
        """
        if analysis_result.get("safe"):
            return {"id": None, **analysis_result}

        threat = {
            "id": self.threat_id_counter,
            **analysis_result
        }
        self.threat_id_counter += 1
        self.threats.insert(0, threat)  # newest first

        # Keep only last 500 threats in memory
        if len(self.threats) > 500:
            self.threats = self.threats[:500]

        self._save_threats()
        return threat

    def get_threats(
        self,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get threats with filtering, pagination, and stats.

        Args:
            limit: Number of threats to return
            offset: Starting offset
            category: Filter by category
            search: Search by URL

        Returns:
            Dictionary with threats, total count, and stats
        """
        filtered = self.threats.copy()

        # Filter by category
        if category and category != "all":
            filtered = [t for t in filtered if t.get("category") == category]

        # Search by URL
        if search:
            search_lower = search.lower()
            filtered = [t for t in filtered if search_lower in t.get("url", "").lower()]

        total = len(filtered)
        paged = filtered[offset : offset + limit]

        # Calculate stats
        stats = {
            "total": len(self.threats),
            "highRisk": len([t for t in self.threats if t.get("category") == "high_risk"]),
            "mediumRisk": len([t for t in self.threats if t.get("category") == "medium_risk"]),
            "lowRisk": len([t for t in self.threats if t.get("category") == "low_risk"]),
            "today": len([
                t for t in self.threats
                if datetime.fromisoformat(t.get("timestamp", "")).date() == datetime.utcnow().date()
            ])
        }

        return {
            "threats": paged,
            "total": total,
            "stats": stats
        }

    def get_threat(self, threat_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a single threat by ID.

        Args:
            threat_id: Threat ID

        Returns:
            Threat or None
        """
        for threat in self.threats:
            if threat.get("id") == threat_id:
                return threat
        return None


# Global instance
threats_manager = ThreatsManager()
