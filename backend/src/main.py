import os
import logging
from pathlib import Path
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .config import settings
from .api import webhooks, phishing
from .services.deepfake_detection import detector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cyber Defense Chatbot API",
    description="Webhook ingest and analysis processing for Deepfake, Phishing and SMS intercepting WhatsApp bot.",
    version="1.0.0",
)

# CORS middleware for Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class DeepfakeResponse(BaseModel):
    is_deepfake: bool | None
    confidence: float
    message: str | None = None
    error: str | None = None
    details: dict | None = None


# Routes - Webhooks
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

# Routes - Phishing Detection
app.include_router(phishing.router, prefix="/api", tags=["phishing"])


# Routes - Deepfake Detection
@app.post("/detect/audio", response_model=DeepfakeResponse, tags=["Detection"])
async def detect_audio_deepfake(file: UploadFile = File(...)):
    """
    Detect deepfake in audio file.

    Supports: MP3, WAV, OGG, M4A, FLAC
    """
    if detector is None:
        raise HTTPException(
            status_code=503, detail="Deepfake detector not initialized"
        )

    # Validate file type
    valid_audio_types = {
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/flac",
        "application/octet-stream",
    }
    if file.content_type not in valid_audio_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid audio format. Supported: MP3, WAV, OGG, M4A, FLAC",
        )

    temp_file = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".audio") as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_file = tmp.name

        # Detect deepfake
        logger.info(f"Analyzing audio file: {file.filename}")
        result = detector.detect_audio_deepfake(temp_file)

        return DeepfakeResponse(
            is_deepfake=result.get("is_deepfake"),
            confidence=result.get("confidence", 0.0),
            message=result.get("message"),
            error=result.get("error"),
            details={
                k: v
                for k, v in result.items()
                if k not in ["is_deepfake", "confidence", "message", "error"]
            },
        )

    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception as e:
                logger.warning(f"Could not delete temp file: {e}")


@app.post("/detect/video", response_model=DeepfakeResponse, tags=["Detection"])
async def detect_video_deepfake(file: UploadFile = File(...)):
    """
    Detect deepfake in video file.

    Supports: MP4, AVI, MKV, MOV, WEBM
    """
    if detector is None:
        raise HTTPException(
            status_code=503, detail="Deepfake detector not initialized"
        )

    # Validate file type
    valid_video_types = {
        "video/mp4",
        "video/x-msvideo",
        "video/x-matroska",
        "video/quicktime",
        "video/webm",
        "application/octet-stream",
    }
    if file.content_type not in valid_video_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video format. Supported: MP4, AVI, MKV, MOV, WEBM",
        )

    temp_file = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".video") as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_file = tmp.name

        # Detect deepfake
        logger.info(f"Analyzing video file: {file.filename}")
        result = detector.detect_video_deepfake(temp_file)

        return DeepfakeResponse(
            is_deepfake=result.get("is_deepfake"),
            confidence=result.get("confidence", 0.0),
            message=result.get("message"),
            error=result.get("error"),
            details={
                k: v
                for k, v in result.items()
                if k not in ["is_deepfake", "confidence", "message", "error"]
            },
        )

    except Exception as e:
        logger.error(f"Error processing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception as e:
                logger.warning(f"Could not delete temp file: {e}")


@app.post("/detect/image", response_model=DeepfakeResponse, tags=["Detection"])
async def detect_image_deepfake(file: UploadFile = File(...)):
    """
    Detect deepfake in an image file.

    Supports: JPG, JPEG, PNG, WEBP, AVIF
    """
    if detector is None:
        raise HTTPException(
            status_code=503, detail="Deepfake detector not initialized"
        )

    # Validate file type
    valid_image_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "application/octet-stream",
    }
    if file.content_type not in valid_image_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image format. Supported: JPG, JPEG, PNG, WEBP, AVIF",
        )

    temp_file = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".image") as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_file = tmp.name

        # Detect deepfake
        logger.info(f"Analyzing image file: {file.filename}")
        result = detector.detect_image_deepfake(temp_file)

        return DeepfakeResponse(
            is_deepfake=result.get("is_deepfake"),
            confidence=result.get("confidence", 0.0),
            message=result.get("message"),
            error=result.get("error"),
            details={
                k: v
                for k, v in result.items()
                if k not in ["is_deepfake", "confidence", "message", "error"]
            },
        )

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception as e:
                logger.warning(f"Could not delete temp file: {e}")



@app.post("/detect", response_model=DeepfakeResponse, tags=["Detection"])
async def detect_deepfake(file: UploadFile = File(...)):
    """
    Auto-detect and analyze file (audio or video).

    Automatically determines file type and applies appropriate detection.
    """
    if detector is None:
        raise HTTPException(
            status_code=503, detail="Deepfake detector not initialized"
        )

    temp_file = None
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            contents = await file.read()
            tmp.write(contents)
            temp_file = tmp.name

        # Auto-detect based on file extension
        file_ext = Path(file.filename).suffix.lower()
        logger.info(f"Detecting type for: {file.filename} ({file_ext})")

        if file_ext in [".mp3", ".wav", ".ogg", ".m4a", ".flac"]:
            result = detector.detect_audio_deepfake(temp_file)
        elif file_ext in [".mp4", ".avi", ".mkv", ".mov", ".webm"]:
            result = detector.detect_video_deepfake(temp_file)
        elif file_ext in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
            result = detector.detect_image_deepfake(temp_file)
        else:
            return DeepfakeResponse(
                is_deepfake=None,
                confidence=0.0,
                error=f"Unsupported file format: {file_ext}",
            )


        return DeepfakeResponse(
            is_deepfake=result.get("is_deepfake"),
            confidence=result.get("confidence", 0.0),
            message=result.get("message"),
            error=result.get("error"),
            details={
                k: v
                for k, v in result.items()
                if k not in ["is_deepfake", "confidence", "message", "error"]
            },
        )

    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception as e:
                logger.warning(f"Could not delete temp file: {e}")


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "device": settings.DEVICE,
        "environment": settings.API_HOST,
        "detector_initialized": detector is not None,
    }


# API information endpoint
@app.get("/", tags=["Info"])
async def root():
    """API information endpoint."""
    return {
        "name": "Cyber Defense Chatbot API",
        "version": "1.0.0",
        "description": "Unified API for deepfake detection, phishing detection, and webhook processing",
        "endpoints": {
            "health": "/health",
            "detect_audio": "/detect/audio",
            "detect_video": "/detect/video",
            "detect_image": "/detect/image",
            "auto_detect": "/detect",
            "webhooks": "/webhooks",
        },
        "supported_formats": {
            "audio": [".mp3", ".wav", ".ogg", ".m4a", ".flac"],
            "video": [".mp4", ".avi", ".mkv", ".mov", ".webm"],
            "image": [".jpg", ".jpeg", ".png", ".webp", ".avif"],
        },

    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
