"""
Voice History Manager
File-based history storage and management for voice calls.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

VOICE_HISTORY_FILE = Path(__file__).parent.parent.parent / "voice_history.json"

class VoiceHistoryManager:
    """Manages voice history storage and retrieval."""

    def __init__(self):
        self.history: List[Dict[str, Any]] = []
        self._load_history()

    def _load_history(self):
        """Load history from file."""
        try:
            if VOICE_HISTORY_FILE.exists():
                with open(VOICE_HISTORY_FILE, 'r') as f:
                    self.history = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load voice history: {e}")
            self.history = []

    def _save_history(self):
        """Save history to file."""
        try:
            VOICE_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(VOICE_HISTORY_FILE, 'w') as f:
                json.dump(self.history, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save voice history: {e}")

    def add_call(self, summary: Dict[str, Any]) -> None:
        """
        Add a call summary to storage.

        Args:
            summary: Call summary dict
        """
        # add timestamp if not present
        if "timestamp" not in summary:
            summary["timestamp"] = datetime.utcnow().isoformat() + "Z"
            
        self.history.insert(0, summary)  # newest first

        # Keep only last 100 calls in memory/file
        if len(self.history) > 100:
            self.history = self.history[:100]

        self._save_history()

    def get_history(self) -> List[Dict[str, Any]]:
        """
        Get all voice calls.
        """
        return self.history

# Global instance
voice_history_manager = VoiceHistoryManager()
