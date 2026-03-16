import logging
from twilio.rest import Client
from ..config import settings

logger = logging.getLogger(__name__)


def _is_placeholder(value: str) -> bool:
    return not value or value.startswith("your_twilio_")


def _ensure_whatsapp_address(number: str) -> str:
    cleaned = str(number).strip()
    if cleaned.startswith("whatsapp:"):
        return cleaned
    return f"whatsapp:{cleaned}"

def get_twilio_client():
    if _is_placeholder(settings.TWILIO_ACCOUNT_SID) or _is_placeholder(settings.TWILIO_AUTH_TOKEN):
        return None
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

async def send_async_verdict_reply(to_number: str, text_message: str):
    """
    Sends the completed analysis report back to the user via Programmable SMS/WhatsApp.
    """
    client = get_twilio_client()
    if not client:
        logger.warning(f"Twilio not configured. Would have sent directly to {to_number}: {text_message}")
        return

    use_whatsapp = str(to_number).strip().startswith("whatsapp:") or str(settings.TWILIO_PHONE_NUMBER).strip().startswith("whatsapp:")
    from_number = _ensure_whatsapp_address(settings.TWILIO_PHONE_NUMBER) if use_whatsapp else settings.TWILIO_PHONE_NUMBER
    to_target = _ensure_whatsapp_address(to_number) if use_whatsapp else to_number
        
    try:
        message = client.messages.create(
            from_=from_number,
            body=text_message,
            to=to_target
        )
        logger.info(f"Sent Async Twilio reply: {message.sid}")
    except Exception as e:
        logger.error(f"Failed to send async reply: {e}")
