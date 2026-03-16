import logging
from fastapi.datastructures import FormData

logger = logging.getLogger(__name__)


def _safe_int(value, fallback=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback

async def handle_incoming_message(form_data: FormData, channel: str) -> str:
    """
    Normalizes the inbound webhook and routes it to analysis workers.
    Returns the immediate message to send back to the user via TwiML.
    """
    sender = str(form_data.get("From", "")).strip()
    message_sid = str(form_data.get("MessageSid", "")).strip()
    body = str(form_data.get("Body", "")).strip()
    num_media = _safe_int(form_data.get("NumMedia", 0), fallback=0)

    logger.info(
        "Received inbound message channel=%s sender=%s sid=%s num_media=%s",
        channel,
        sender,
        message_sid,
        num_media,
    )
    
    # Extract Media URLs
    media_urls = []
    media_types = []
    for i in range(num_media):
        media_urls.append(form_data.get(f"MediaUrl{i}"))
        media_types.append(form_data.get(f"MediaContentType{i}"))
    
    # Minimal Sync response logic
    if num_media > 0:
        # e.g., Image or Audio -> Route to Image/Audio workers async here
        return "Received your media. Analyzing for deepfakes and security threats..."
    
    if body and "http" in body.lower():
        # URL detected -> Route to URL phishing worker
        return "Extracting URL. Verifying safety against phishing databases..."
        
    if body:
        # Standard text -> Route to Text phishing worker
        # Fast sync response or immediate analysis ack
        # For scaffolding, let's just return a placeholder response
        return f"Received text analysis request. Security scan initialized for: {body[:20]}..."
    
    return "CyberShield received your message but could not parse the content."
