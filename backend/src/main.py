from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api import webhooks

app = FastAPI(
    title="Cyber Defense Chatbot API",
    description="Webhook ingest and analysis processing for Deepfake, Phishing and SMS intercepting WhatsApp bot.",
    version="1.0.0",
)

# CORS middleware for Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "device": settings.DEVICE, "environment": settings.API_HOST}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
