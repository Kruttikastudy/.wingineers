import os
import logging
from pathlib import Path
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .config import settings
from .api import webhooks, phishing, xai, prompt_injection, mitigation
from .services.deepfake_detection import detector
from .services.deepfake_reasoning_engine import analyze_with_reasoning
from .services.event_hub import event_hub
from fastapi.responses import StreamingResponse
import asyncio

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
# Origins are read from CORS_ORIGINS env var (comma-separated)
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
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
    reasoning: str | None = None
    key_factors: list | None = None


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Catch-all: return 500 JSON instead of letting the server crash."""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.on_event("startup")
async def startup_validate_llm():
    """Validate Featherless LLM model availability at startup."""
    try:
        from .services.featherless_llm import validate_model
        await validate_model()
    except Exception as e:
        logger.error(f"LLM model validation error during startup: {e}")


@app.on_event("startup")
async def startup_log_routes():
    """Log all registered routes for debugging webhook issues."""
    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", str(route))
        if methods:
            logger.info("Registered route: %s %s", methods, path)


# Routes - Webhooks
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

# Routes - Phishing Detection
app.include_router(phishing.router, prefix="/api", tags=["phishing"])

# Routes - XAI & Explainability
app.include_router(xai.router, prefix="/api", tags=["xai"])

# Routes - Prompt Injection Detection
app.include_router(prompt_injection.router, prefix="/api", tags=["prompt_injection"])

# Routes - Mitigation Reports
app.include_router(mitigation.router, prefix="/api", tags=["mitigation"])


# Routes - SSE Event Stream
@app.get("/api/events", tags=["Events"])
async def sse_events():
    """Server-Sent Events stream for real-time voice call updates."""
    return StreamingResponse(
        event_hub.subscribe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

from .services.voice_history_manager import voice_history_manager

@app.get("/api/voice/history", tags=["Voice"])
async def get_voice_history():
    """Get recent voice call history."""
    try:
        return voice_history_manager.get_history()
    except Exception as e:
        logger.error(f"Error fetching voice history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch voice history")

# Routes - Authentication
from .api import auth
app.include_router(auth.router, prefix="/auth", tags=["auth"])


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
        raise HTTPException(status_code=500, detail="Internal server error during detection")

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
        raise HTTPException(status_code=500, detail="Internal server error during detection")

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
        raise HTTPException(status_code=500, detail="Internal server error during detection")

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
        raise HTTPException(status_code=500, detail="Internal server error during detection")

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
