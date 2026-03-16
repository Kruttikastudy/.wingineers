import logging

from fastapi import APIRouter, Request, Response, HTTPException
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse
from ..config import settings
from ..services.ingest import handle_incoming_message

router = APIRouter()
logger = logging.getLogger(__name__)


def _form_data_to_payload(form_data):
    payload = {}
    for key, value in form_data.multi_items():
        if key in payload:
            existing_value = payload[key]
            if isinstance(existing_value, list):
                existing_value.append(value)
            else:
                payload[key] = [existing_value, value]
        else:
            payload[key] = value
    return payload


def _validate_twilio_signature(request: Request, form_data):
    if not settings.TWILIO_VALIDATE_SIGNATURES:
        return

    signature = request.headers.get("X-Twilio-Signature")
    if not signature:
        raise HTTPException(status_code=403, detail="Missing Twilio signature")

    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    payload = _form_data_to_payload(form_data)
    request_url = str(request.url)
    is_valid = validator.validate(request_url, payload, signature)
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")


async def _handle_twilio_webhook(request: Request, channel: str) -> Response:
    form_data = await request.form()
    _validate_twilio_signature(request, form_data)
    response_message = await handle_incoming_message(form_data, channel=channel)

    twiml = MessagingResponse()
    if response_message:
        twiml.message(response_message)

    logger.info("Returning %s TwiML response for channel=%s", "non-empty" if response_message else "empty", channel)
    return Response(content=str(twiml), media_type="application/xml")

@router.post("/twilio/whatsapp")
async def twilio_whatsapp_webhook(request: Request):
    return await _handle_twilio_webhook(request, channel="whatsapp")

@router.post("/twilio/sms")
async def twilio_sms_webhook(request: Request):
    return await _handle_twilio_webhook(request, channel="sms")
