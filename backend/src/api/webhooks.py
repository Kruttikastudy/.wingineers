import logging
import asyncio

from fastapi import APIRouter, Request, Response, HTTPException
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse
from twilio.twiml.voice_response import VoiceResponse, Gather
from ..config import settings
from ..services.ingest import handle_incoming_message
from ..services.voice_analyzer import analyze_transcript
from ..services.event_hub import event_hub
from ..services.voice_history_manager import voice_history_manager
from ..services.twilio_client import send_whatsapp_alert

router = APIRouter()
logger = logging.getLogger(__name__)

# Track cumulative risk for active calls
# call_sid -> { "reasons": set(), "max_risk": 0, "start_time": float }
call_state = {}


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

@router.post("/twilio/voice")
async def twilio_voice_webhook(request: Request):
    """
    Initial call handler. Greets the caller and starts listening.
    """
    form_data = await request.form()
    _validate_twilio_signature(request, form_data)
    
    vr = VoiceResponse()
    vr.say("Welcome to PhishGuard secure call monitoring. This call is being analyzed for safety.")
    
    # Initialize state for this new call
    call_sid = form_data.get('CallSid', 'unknown')
    if call_sid not in call_state:
        call_state[call_sid] = {
            "reasons": set(),
            "max_risk": 0,
            "from": form_data.get('From', 'unknown'),
            "alert_sent": False
        }
    
    gather = Gather(
        input='speech',
        action='/webhooks/twilio/voice/handle_speech',
        speech_timeout='3'
    )
    vr.append(gather)
    
    # If no speech detected, loop back
    vr.redirect('/webhooks/twilio/voice')
    
    return Response(content=str(vr), media_type="application/xml")

@router.post("/twilio/voice/handle_speech")
async def handle_voice_speech(request: Request):
    """
    Processes the transcript from Twilio Gather.
    """
    form_data = await request.form()
    transcript = form_data.get('SpeechResult', '')
    call_sid = form_data.get('CallSid', 'unknown')
    from_number = form_data.get('From', 'unknown')
    
    if transcript:
        logger.info(f"Call {call_sid} Transcript: {transcript}")
        analysis = analyze_transcript(transcript)
        
        # Update cumulative state
        cumulative_risk = 0
        cumulative_indicators = []
        if call_sid in call_state:
            state = call_state[call_sid]
            # Ensure "reasons" exists and is a set
            if "reasons" not in state or not isinstance(state["reasons"], set):
                state["reasons"] = set()
            
            new_reasons = analysis.get("reasons", [])
            state["reasons"].update(new_reasons)
            state["max_risk"] = max(state.get("max_risk", 0), analysis.get("risk_score", 0))
            
            cumulative_risk = state["max_risk"]
            cumulative_indicators = list(state["reasons"])
            
            # Send WhatsApp Alert if risk is high (>60%) and alert hasn't been sent yet
            if cumulative_risk > 0.6 and not state.get("alert_sent"):
                # Run the alert in a background task so it doesn't block the webhook response
                asyncio.create_task(
                    asyncio.to_thread(
                        send_whatsapp_alert, 
                        cumulative_risk, 
                        call_sid, 
                        cumulative_indicators
                    )
                )
                state["alert_sent"] = True
        
        # Publish event for frontend with cumulative context
        event_hub.publish("VOICE_CALL_TRANSCRIPT", {
            "call_sid": call_sid,
            "from": from_number,
            "text": transcript,
            "analysis": analysis,
            "cumulative": {
                "max_risk": cumulative_risk,
                "all_indicators": cumulative_indicators
            },
            "timestamp": str(int(asyncio.get_event_loop().time()))
        })
        
    # Continue listening
    vr = VoiceResponse()
    gather = Gather(
        input='speech',
        action='/webhooks/twilio/voice/handle_speech',
        speech_timeout='3'
    )
    vr.append(gather)
    vr.redirect('/webhooks/twilio/voice')
    
    return Response(content=str(vr), media_type="application/xml")

@router.post("/twilio/voice/status")
async def handle_voice_status(request: Request):
    """
    Handles call status changes (completed, failed, etc).
    Sends the final overall risk report.
    """
    form_data = await request.form()
    call_sid = form_data.get('CallSid', 'unknown')
    status = form_data.get('CallStatus', 'unknown')
    
    if status in ['completed', 'failed', 'busy', 'no-answer']:
        logger.info(f"Call {call_sid} ended with status: {status}")
        if call_sid in call_state:
            state = call_state[call_sid]
            summary = {
                "call_sid": call_sid,
                "from": state["from"],
                "overall_risk": state["max_risk"],
                "all_indicators": list(state.get("reasons", set())),
                "duration_sec": form_data.get('CallDuration', '0'),
                "status": status
            }
            
            # Publish final summary
            event_hub.publish("VOICE_CALL_ENDED", summary)
            
            # Save to history
            voice_history_manager.add_call(summary)
            
            # Clean up
            call_state.pop(call_sid, None)
            
    return Response(status_code=200)
