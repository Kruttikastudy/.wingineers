import asyncio

from starlette.datastructures import FormData

from src.services.ingest import handle_incoming_message


async def _call_ingest(payload: dict, channel: str = "whatsapp"):
    form_data = FormData(payload)
    return await handle_incoming_message(form_data, channel=channel)


def test_ingest_returns_media_ack_for_media_message():
    payload = {
        "From": "whatsapp:+911234567890",
        "NumMedia": "1",
        "MediaUrl0": "https://example.com/image.jpg",
        "MediaContentType0": "image/jpeg",
    }

    response = asyncio.run(_call_ingest(payload))
    assert response == "Received your media. Analyzing for deepfakes and security threats..."


def test_ingest_returns_url_ack_for_url_text():
    payload = {
        "From": "whatsapp:+911234567890",
        "NumMedia": "0",
        "Body": "Is this safe? http://suspicious-link.com",
    }

    response = asyncio.run(_call_ingest(payload))
    assert response == "Extracting URL. Verifying safety against phishing databases..."


def test_ingest_returns_generic_ack_for_plain_text():
    payload = {
        "From": "whatsapp:+911234567890",
        "NumMedia": "0",
        "Body": "Hello, please scan this",
    }

    response = asyncio.run(_call_ingest(payload))
    assert response.startswith("Received text analysis request. Security scan initialized")
