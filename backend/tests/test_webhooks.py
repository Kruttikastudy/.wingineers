from fastapi.testclient import TestClient

from src.config import settings
from src.main import app


client = TestClient(app)


def test_whatsapp_webhook_rejects_missing_signature_when_enabled():
    original = settings.TWILIO_VALIDATE_SIGNATURES
    settings.TWILIO_VALIDATE_SIGNATURES = True
    try:
        response = client.post(
            "/webhooks/twilio/whatsapp",
            data={
                "From": "whatsapp:+911234567890",
                "NumMedia": "0",
                "Body": "Is this safe? http://suspicious-link.com",
            },
        )
    finally:
        settings.TWILIO_VALIDATE_SIGNATURES = original

    assert response.status_code == 403
    assert response.json()["detail"] == "Missing Twilio signature"


def test_whatsapp_webhook_accepts_valid_signature(monkeypatch):
    original = settings.TWILIO_VALIDATE_SIGNATURES
    settings.TWILIO_VALIDATE_SIGNATURES = True

    monkeypatch.setattr(
        "src.api.webhooks.RequestValidator.validate",
        lambda self, url, payload, signature: True,
    )

    try:
        response = client.post(
            "/webhooks/twilio/whatsapp",
            headers={"X-Twilio-Signature": "valid-signature"},
            data={
                "From": "whatsapp:+911234567890",
                "NumMedia": "1",
                "MediaUrl0": "https://example.com/image.jpg",
                "MediaContentType0": "image/jpeg",
            },
        )
    finally:
        settings.TWILIO_VALIDATE_SIGNATURES = original

    assert response.status_code == 200
    assert "Received your media. Analyzing for deepfakes and security threats..." in response.text


def test_whatsapp_webhook_url_message_ack_when_signature_validation_disabled():
    original = settings.TWILIO_VALIDATE_SIGNATURES
    settings.TWILIO_VALIDATE_SIGNATURES = False
    try:
        response = client.post(
            "/webhooks/twilio/whatsapp",
            data={
                "From": "whatsapp:+911234567890",
                "NumMedia": "0",
                "Body": "Is this safe? http://suspicious-link.com",
            },
        )
    finally:
        settings.TWILIO_VALIDATE_SIGNATURES = original

    assert response.status_code == 200
    assert "Extracting URL. Verifying safety against phishing databases..." in response.text
