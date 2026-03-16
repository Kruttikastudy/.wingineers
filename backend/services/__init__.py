"""Services package for KES-Hack backend."""

from .deepfake_detection import DeepfakeDetector, detector

__all__ = ["DeepfakeDetector", "detector"]
