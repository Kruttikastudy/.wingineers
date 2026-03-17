import logging

from fastapi import APIRouter, Request, Response, HTTPException
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse
from twilio.twiml.voice_response import VoiceResponse
from ..config import settings
from ..services.ingest import handle_incoming_message
from ..services.event_hub import event_hub
from ..services.voice_history_manager import voice_history_manager
from ..services.voice_analyzer import analyze_transcript
from ..services.twilio_client import send_async_verdict_reply

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Per-call accumulator: tracks risk across speech chunks ──
_call_state: dict[str, dict] = {}


def _accumulate_analysis(call_sid: str, analysis: dict):
    """Accumulate threat indicators across multiple speech chunks for a call."""
    if call_sid not in _call_state:
        _call_state[call_sid] = {"max_risk": 0, "all_indicators": set(), "transcripts": []}
    state = _call_state[call_sid]
    state["max_risk"] = max(state["max_risk"], analysis.get("risk_score", 0))
    for reason in analysis.get("reasons", []):
        state["all_indicators"].add(reason)


def _pop_call_state(call_sid: str) -> dict:
    """Retrieve and remove accumulated state for a finished call."""
    state = _call_state.pop(call_sid, None)
    if not state:
        return {"max_risk": 0, "all_indicators": []}
    return {"max_risk": state["max_risk"], "all_indicators": sorted(state["all_indicators"])}


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
    """Handle incoming Twilio voice calls. Returns TwiML to record/gather speech."""
    try:
        form_data = await request.form()
        _validate_twilio_signature(request, form_data)

        call_sid = form_data.get("CallSid", "unknown")
        caller = form_data.get("From", "unknown")
        speech_result = form_data.get("SpeechResult")

        logger.info("Voice webhook: CallSid=%s From=%s SpeechResult=%s", call_sid, caller, speech_result)

        if speech_result:
            # We got a transcript chunk — analyse, accumulate, and broadcast via SSE
            try:
                analysis = analyze_transcript(speech_result)
                _accumulate_analysis(call_sid, analysis)
                payload = {
                    "call_sid": call_sid,
                    "from": caller,
                    "text": speech_result,
                    "analysis": analysis,
                }
                event_hub.publish("VOICE_CALL_TRANSCRIPT", payload)
            except Exception as analysis_err:
                logger.error("Voice transcript analysis failed: %s", analysis_err)

        # Always respond with <Gather>. If there is no speech, redirect back to
        # this webhook so the call does not end at end-of-TwiML.
        vr = VoiceResponse()
        gather = vr.gather(
            input="speech",
            action="/webhooks/twilio/voice",
            method="POST",
            speech_timeout="auto",
            action_on_empty_result=True,
            language="en-IN",
        )
        gather.say("Please tell me what the caller is saying.", voice="alice")

        # Twilio hangs up when it reaches the end of a document after <Gather>.
        # Redirecting gives us another gather cycle when no input was captured.
        vr.pause(length=1)
        vr.redirect("/webhooks/twilio/voice", method="POST")

        return Response(content=str(vr), media_type="application/xml")

    except HTTPException:
        raise  # Re-raise auth failures (403)
    except Exception as e:
        logger.error("Voice webhook unhandled error: %s", e, exc_info=True)
        # Return minimal valid TwiML so Twilio doesn't get a 5xx
        fallback = VoiceResponse()
        fallback.say("An error occurred. Please try again later.", voice="alice")
        return Response(content=str(fallback), media_type="application/xml")


@router.post("/twilio/voice/status")
async def twilio_voice_status_webhook(request: Request):
    """Handle Twilio voice call status callbacks (completed, busy, no-answer, etc.)."""
    try:
        form_data = await request.form()
        _validate_twilio_signature(request, form_data)

        call_sid = form_data.get("CallSid", "unknown")
        call_status = form_data.get("CallStatus", "unknown")
        caller = form_data.get("From", "unknown")
        duration = form_data.get("CallDuration", "0")

        logger.info("Voice status: CallSid=%s Status=%s Duration=%s", call_sid, call_status, duration)

        if call_status in ("completed", "busy", "no-answer", "failed", "canceled"):
            accumulated = _pop_call_state(call_sid)
            summary = {
                "call_sid": call_sid,
                "from": caller,
                "status": call_status,
                "duration_sec": duration,
                "overall_risk": accumulated["max_risk"],
                "all_indicators": accumulated["all_indicators"],
            }
            event_hub.publish("VOICE_CALL_ENDED", summary)
            voice_history_manager.add_call(summary)

            # Send WhatsApp alert if risk is non-trivial
            if accumulated["max_risk"] >= 20 and settings.ALERT_RECIPIENT_NUMBER:
                try:
                    indicators_str = ", ".join(accumulated["all_indicators"]) or "None"
                    alert_msg = (
                        f"🚨 *WinGineers Scam Alert*\n\n"
                        f"Call from {caller} flagged.\n"
                        f"Risk Score: {accumulated['max_risk']}/100\n"
                        f"Indicators: {indicators_str}\n"
                        f"Duration: {duration}s | Status: {call_status}"
                    )
                    wa_number = settings.TWILIO_WHATSAPP_NUMBER or settings.TWILIO_PHONE_NUMBER
                    await send_async_verdict_reply(
                        to_number=f"whatsapp:{settings.ALERT_RECIPIENT_NUMBER}",
                        text_message=alert_msg,
                    )
                except Exception as wa_err:
                    logger.error("Failed to send WhatsApp alert: %s", wa_err)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Voice status webhook error: %s", e, exc_info=True)

    # Always return 200 with valid TwiML for status callbacks
    return Response(content="<Response/>", media_type="application/xml")

