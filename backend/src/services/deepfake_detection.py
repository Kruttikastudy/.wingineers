import os
import torch
import librosa
import numpy as np
import cv2
from pathlib import Path
from typing import Tuple, Dict, Any
import tempfile
import logging

logger = logging.getLogger(__name__)

# Check for GPU availability
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class DeepfakeDetector:
    """Unified service for detecting deepfakes in audio and video files."""

    def __init__(self):
        """Initialize the deepfake detector with pre-trained models."""
        self.audio_model = None
        self.video_model = None
        self.current_frame = None
        self._load_models()

    def _load_models(self):
        """Load deepfake detection models."""
        try:
            # Load audio deepfake detection model
            logger.info("Loading audio deepfake detection model...")
            self.audio_model = self._load_audio_model()

            # Load video deepfake detection model
            logger.info("Loading video deepfake detection model...")
            self.video_model = self._load_video_model()

            if self.audio_model is None:
                logger.warning("Audio model not available")
            if self.video_model is None:
                logger.warning("Video model not available")

        except Exception as e:
            logger.error(f"Error loading models: {e}")
            logger.info("Continuing with available models...")

    def _load_audio_model(self):
        """Load audio deepfake detection model from HuggingFace."""
        try:
            from transformers import pipeline

            model_name = "Hemgg/Deepfake-audio-detection"
            logger.info(f"Loading audio model: {model_name}")

            model = pipeline(
                "audio-classification",
                model=model_name,
                device=0 if torch.cuda.is_available() else -1,
            )
            return model
        except Exception as e:
            logger.warning(f"Could not load audio model: {e}")
            return None

    def _load_video_model(self):
        """Load video deepfake detection model from HuggingFace."""
        try:
            from transformers import AutoImageProcessor, AutoModelForImageClassification

            # Using Deep-Fake-Detector-v2 for frame-based detection
            model_name = "prithivMLmods/Deep-Fake-Detector-v2-Model"
            logger.info(f"Loading video model: {model_name}")

            processor = AutoImageProcessor.from_pretrained(model_name)
            model = AutoModelForImageClassification.from_pretrained(model_name)

            return {
                "processor": processor,
                "model": model.to(DEVICE),
                "model_name": model_name,
            }
        except Exception as e:
            logger.warning(f"Could not load video model: {e}. Trying alternative...")
            return self._load_video_model_fallback()

    def _load_video_model_fallback(self):
        """Load fallback video model."""
        try:
            from transformers import AutoImageProcessor, AutoModelForImageClassification

            model_name = "Wvolf/ViT_Deepfake_Detection"
            logger.info(f"Loading fallback video model: {model_name}")

            processor = AutoImageProcessor.from_pretrained(model_name)
            model = AutoModelForImageClassification.from_pretrained(model_name)

            return {
                "processor": processor,
                "model": model.to(DEVICE),
                "model_name": model_name,
            }
        except Exception as e:
            logger.warning(f"Could not load fallback video model: {e}")
            return None

    def detect_audio_deepfake(self, audio_path: str) -> Dict[str, Any]:
        """
        Detect deepfake in audio file using HuggingFace model.

        Args:
            audio_path: Path to audio file

        Returns:
            Dictionary with detection results
        """
        try:
            if not os.path.exists(audio_path):
                return {
                    "is_deepfake": None,
                    "confidence": 0.0,
                    "error": f"Audio file not found: {audio_path}",
                }

            logger.info(f"Processing audio: {audio_path}")

            # Use HuggingFace model if available
            if self.audio_model:
                try:
                    logger.info("Using HuggingFace audio model for detection")
                    results = self.audio_model(audio_path)

                    # Parse model results
                    deepfake_score = 0.0
                    for result in results:
                        label = result["label"]
                        score = result["score"]
                        logger.info(f"Model output: {label} = {score:.6f}")

                        # Hemgg model uses "AIVoice" vs "HumanVoice"
                        if label == "AIVoice":
                            deepfake_score = score
                        elif label == "HumanVoice":
                            deepfake_score = 1.0 - score
                        # MelodyMachine uses "fake" vs "real"
                        elif label == "fake":
                            deepfake_score = score
                        elif label == "real":
                            deepfake_score = 1.0 - score

                    is_deepfake = bool(deepfake_score > 0.5)
                    confidence = float(deepfake_score)

                    return {
                        "is_deepfake": is_deepfake,
                        "confidence": confidence,
                        "model": "Hemgg/Deepfake-audio-detection",
                        "message": "Audio deepfake detection completed",
                    }
                except Exception as e:
                    logger.warning(f"Model inference failed: {e}. Using fallback...")

            # Fallback to spectral analysis
            logger.info("Using spectral analysis fallback")
            audio, sr = librosa.load(audio_path, sr=16000)

            # Extract features
            spectral_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)
            zero_crossing_rate = librosa.feature.zero_crossing_rate(audio)

            # Anomaly detection
            spectral_anomaly = np.std(spectral_centroid) / np.mean(spectral_centroid)
            zcr_anomaly = np.std(zero_crossing_rate)

            anomaly_score = (spectral_anomaly + zcr_anomaly) / 2
            threshold = 0.5

            is_deepfake = bool(anomaly_score > threshold)
            confidence = min(anomaly_score / 2.0, 1.0)

            return {
                "is_deepfake": is_deepfake,
                "confidence": float(confidence),
                "method": "spectral_analysis_fallback",
                "anomaly_score": float(anomaly_score),
                "message": "Audio deepfake detection completed (fallback)",
            }

        except Exception as e:
            logger.error(f"Error detecting audio deepfake: {e}")
            return {
                "is_deepfake": None,
                "confidence": 0.0,
                "error": str(e),
            }

    def detect_video_deepfake(self, video_path: str, sample_frames: int = 10) -> Dict[str, Any]:
        """
        Detect deepfake in video file using HuggingFace model on frames.

        Args:
            video_path: Path to video file
            sample_frames: Number of frames to sample and analyze

        Returns:
            Dictionary with detection results
        """
        try:
            if not os.path.exists(video_path):
                return {
                    "is_deepfake": None,
                    "confidence": 0.0,
                    "error": f"Video file not found: {video_path}",
                }

            logger.info(f"Processing video: {video_path}")

            # Open video
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return {
                    "is_deepfake": None,
                    "confidence": 0.0,
                    "error": "Could not open video file",
                }

            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)

            # Sample frames evenly
            frame_indices = np.linspace(0, frame_count - 1, sample_frames, dtype=int)

            deepfake_scores = []
            analyzed_frames = 0

            # Use HuggingFace model if available
            use_model = self.video_model is not None

            for frame_idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()

                if not ret or frame is None:
                    continue

                if use_model:
                    # Use HuggingFace model for frame classification
                    try:
                        score = self._classify_frame_with_model(frame)
                        deepfake_scores.append(score)
                        analyzed_frames += 1
                    except Exception as e:
                        logger.warning(f"Model inference failed on frame: {e}")
                        use_model = False  # Fall back to face analysis
                else:
                    # Fallback: Detect and analyze faces
                    faces = self._detect_faces(frame)
                    if len(faces) > 0:
                        for face in faces:
                            score = self._analyze_face(face)
                            deepfake_scores.append(score)
                            analyzed_frames += 1

            cap.release()

            if not deepfake_scores:
                return {
                    "is_deepfake": None,
                    "confidence": 0.0,
                    "message": "No deepfake features detected in video",
                }

            # Calculate statistics
            avg_score = np.mean(deepfake_scores)
            std_score = np.std(deepfake_scores)
            max_score = np.max(deepfake_scores)

            # Threshold for deepfake detection
            threshold = 0.5
            is_deepfake = bool(avg_score > threshold)

            model_name = "prithivMLmods/Deep-Fake-Detector-v2-Model" if use_model else "face_analysis"

            return {
                "is_deepfake": is_deepfake,
                "confidence": float(max(avg_score, 1 - avg_score)),
                "average_score": float(avg_score),
                "max_score": float(max_score),
                "std_score": float(std_score),
                "frames_analyzed": int(analyzed_frames),
                "total_frames": int(frame_count),
                "duration_seconds": float(frame_count / fps if fps > 0 else 0),
                "model": model_name,
                "message": "Video deepfake detection completed",
            }

        except Exception as e:
            logger.error(f"Error detecting video deepfake: {e}")
            return {
                "is_deepfake": None,
                "confidence": 0.0,
                "error": str(e),
            }

    def detect_image_deepfake(self, image_path: str) -> Dict[str, Any]:
        """
        Detect deepfake in a single image file.

        Args:
            image_path: Path to image file

        Returns:
            Dictionary with detection results
        """
        try:
            if not os.path.exists(image_path):
                return {
                    "is_deepfake": None,
                    "confidence": 0.0,
                    "error": f"Image file not found: {image_path}",
                }

            logger.info(f"Processing image: {image_path}")

            # Read image
            frame = cv2.imread(image_path)
            if frame is None:
                return {
                    "is_deepfake": None,
                    "confidence": 0.0,
                    "error": "Could not read image file",
                }

            # Use HuggingFace model if available
            if self.video_model is not None:
                try:
                    score = self._classify_frame_with_model(frame)
                    is_deepfake = bool(score > 0.5)
                    confidence = float(max(score, 1 - score))

                    return {
                        "is_deepfake": is_deepfake,
                        "confidence": confidence,
                        "score": score,
                        "model": self.video_model.get("model_name", "prithivMLmods/Deep-Fake-Detector-v2-Model"),
                        "message": "Image deepfake detection completed",
                    }
                except Exception as e:
                    logger.warning(f"Model inference failed on image: {e}")

            # Fallback: face analysis
            self.set_current_frame(frame)
            faces = self._detect_faces(frame)
            if len(faces) > 0:
                scores = [self._analyze_face(face) for face in faces]
                avg_score = np.mean(scores)
                is_deepfake = bool(avg_score > 0.5)
                confidence = float(max(avg_score, 1 - avg_score))

                return {
                    "is_deepfake": is_deepfake,
                    "confidence": confidence,
                    "average_score": float(avg_score),
                    "faces_detected": len(faces),
                    "method": "face_analysis",
                    "message": "Image deepfake detection completed (face analysis)",
                }

            return {
                "is_deepfake": None,
                "confidence": 0.0,
                "message": "No faces detected in image for fallback analysis",
            }

        except Exception as e:
            logger.error(f"Error detecting image deepfake: {e}")
            return {
                "is_deepfake": None,
                "confidence": 0.0,
                "error": str(e),
            }


    def _classify_frame_with_model(self, frame) -> float:
        """Classify a frame using HuggingFace model."""
        from PIL import Image

        try:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame_rgb)

            # Process with model
            processor = self.video_model["processor"]
            model = self.video_model["model"]

            inputs = processor(images=img, return_tensors="pt").to(DEVICE)

            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits

            # Get probabilities
            probs = torch.softmax(logits, dim=-1)

            # Assuming class 1 is fake, class 0 is real
            fake_prob = probs[0, 1].item()

            return float(fake_prob)
        except Exception as e:
            logger.warning(f"Could not classify frame with model: {e}")
            raise

    def _detect_faces(self, frame):
        """Detect faces in a frame using cascade classifier."""
        try:
            # Load cascade classifier
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path)

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)

            return faces
        except Exception as e:
            logger.warning(f"Error detecting faces: {e}")
            return []

    def _analyze_face(self, face) -> float:
        """
        Analyze a face region for deepfake characteristics.

        Returns:
            Score between 0 and 1 (1 = likely deepfake)
        """
        try:
            # Extract face properties
            x, y, w, h = face

            # Blur detection (deepfakes often have inconsistent blur)
            face_img = self.current_frame[y : y + h, x : x + w]
            if face_img.size == 0:
                return 0.5

            # Calculate Laplacian variance (blur detection)
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

            # Normalize variance to 0-1 score
            # Very low variance indicates blur (possible deepfake artifact)
            blur_score = 1 / (1 + laplacian_var / 100)

            # Frequency analysis
            dft = cv2.dft(np.float32(gray), flags=cv2.DFT_COMPLEX_OUTPUT)
            magnitude = cv2.magnitude(dft[:, :, 0], dft[:, :, 1])
            frequency_score = np.std(magnitude) / (np.mean(magnitude) + 1e-6)
            frequency_score = min(frequency_score / 10, 1.0)

            # Combined score
            combined_score = (blur_score * 0.6 + frequency_score * 0.4) / 2
            return float(combined_score)

        except Exception as e:
            logger.warning(f"Error analyzing face: {e}")
            return 0.5

    def set_current_frame(self, frame):
        """Set the current frame for face analysis."""
        self.current_frame = frame

    def detect_combined(self, file_path: str) -> Dict[str, Any]:
        """
        Automatically detect and analyze file (audio or video).

        Args:
            file_path: Path to file

        Returns:
            Detection results
        """
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}"}

        file_ext = Path(file_path).suffix.lower()

        # Audio formats
        if file_ext in [".mp3", ".wav", ".ogg", ".m4a", ".flac"]:
            return self.detect_audio_deepfake(file_path)

        # Video formats
        elif file_ext in [".mp4", ".avi", ".mkv", ".mov", ".webm"]:
            return self.detect_video_deepfake(file_path)

        # Image formats
        elif file_ext in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
            return self.detect_image_deepfake(file_path)

        else:
            return {
                "error": f"Unsupported file format: {file_ext}",
                "supported_audio": [".mp3", ".wav", ".ogg", ".m4a", ".flac"],
                "supported_video": [".mp4", ".avi", ".mkv", ".mov", ".webm"],
                "supported_image": [".jpg", ".jpeg", ".png", ".webp", ".avif"],
            }


# Initialize detector
try:
    detector = DeepfakeDetector()
except Exception as e:
    logger.error(f"Failed to initialize deepfake detector: {e}")
    detector = None


# Testing functionality
if __name__ == "__main__":
    import argparse
    import json

    def test_audio(file_path):
        """Test audio deepfake detection."""
        print(f"\n🎵 Testing Audio Deepfake Detection")
        print(f"File: {file_path}")
        print("-" * 50)

        if not Path(file_path).exists():
            print(f"❌ File not found: {file_path}")
            return

        result = detector.detect_audio_deepfake(file_path)
        print(json.dumps(result, indent=2))

        if result.get("is_deepfake") is not None:
            status = (
                "⚠️  DEEPFAKE DETECTED"
                if result["is_deepfake"]
                else "✓ AUTHENTIC"
            )
            confidence = result.get("confidence", 0)
            print(f"\n{status} (Confidence: {confidence:.2%})")

    def test_video(file_path):
        """Test video deepfake detection."""
        print(f"\n🎬 Testing Video Deepfake Detection")
        print(f"File: {file_path}")
        print("-" * 50)

        if not Path(file_path).exists():
            print(f"❌ File not found: {file_path}")
            return

        result = detector.detect_video_deepfake(file_path)
        print(json.dumps(result, indent=2))

        if result.get("is_deepfake") is not None:
            status = (
                "⚠️  DEEPFAKE DETECTED"
                if result["is_deepfake"]
                else "✓ AUTHENTIC"
            )
            confidence = result.get("confidence", 0)
            print(f"\n{status} (Confidence: {confidence:.2%})")

    def test_auto_detect(file_path):
        """Auto-detect and test file."""
        print(f"\n🔍 Testing Auto-Detection")
        print(f"File: {file_path}")
        print("-" * 50)

        if not Path(file_path).exists():
            print(f"❌ File not found: {file_path}")
            return

        result = detector.detect_combined(file_path)

        if "error" in result:
            print(f"❌ Error: {result['error']}")
            return

        print(json.dumps(result, indent=2))

        if result.get("is_deepfake") is not None:
            status = (
                "⚠️  DEEPFAKE DETECTED"
                if result["is_deepfake"]
                else "✓ AUTHENTIC"
            )
            confidence = result.get("confidence", 0)
            print(f"\n{status} (Confidence: {confidence:.2%})")

    parser = argparse.ArgumentParser(description="Test deepfake detection service")
    parser.add_argument("--audio", type=str, help="Test audio file")
    parser.add_argument("--video", type=str, help="Test video file")
    parser.add_argument("--file", type=str, help="Test file (auto-detect type)")

    args = parser.parse_args()

    if not detector:
        print("❌ Detector not initialized. Check dependencies.")
        exit(1)

    if args.audio:
        test_audio(args.audio)
    elif args.video:
        test_video(args.video)
    elif args.file:
        test_auto_detect(args.file)
    else:
        print("❌ Please provide --audio, --video, or --file argument")
        parser.print_help()
