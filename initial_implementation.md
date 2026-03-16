# Goal Description
Build a highly available and secure backend to power an opt-in WhatsApp and SMS Cyber Defense chatbot via Twilio. The system will act as a unified intake funnel where users can forward suspicious text messages, links, images, and voice notes. The platform will analyze these via specialized workers—detecting phishing, SMS interceptions, and audio/video deepfakes—and return a fused, easy-to-understand verdict with actionable recommendations.

## Proposed Changes

### Core API & Webhook Ingestion
- **[NEW] `src/api/webhooks.py`**:
  - Implement `POST /webhooks/twilio/whatsapp` and `POST /webhooks/twilio/sms`.
  - Add middleware to validate Twilio signatures (`X-Twilio-Signature`) to block unauthorized spoofing.
  - Implement basic rate limiting (by phone number + IP).

### Orchestration & Normalization Layer
- **[NEW] `src/services/ingest.py`**:
  - Normalize inbound payloads (body, media URLs, sender) into a unified internal schema.
  - Synchronous immediate response: For tasks exceeding 3 seconds (media, deepfake analysis), return an immediate "Received. Analyzing now." acknowledgement.
  - Enqueue extracted components (URL, Image, Audio) to appropriate async queue workers.

### Analysis Workers
- **[NEW] `src/workers/text_phishing_worker.py`**:
  - Sanitize text, detect language.
  - Run DistilBERT-style phishing classification and regex heuristics for social engineering (OTP, UPI urgency).
- **[NEW] `src/workers/url_analysis_worker.py`**:
  - Extract URLs, expand shorteners.
  - Check against Safe Browsing, VirusTotal, and run local ML classifier.
- **[NEW] `src/workers/image_deepfake_worker.py`**:
  - Verify magic bytes, strip EXIF data, store temporarily.
  - Run OCR for text extraction (pass back to text worker) and decode QRs.
  - Execute CNN/EfficientNet artifact detector for GAN/deepfake detection.
- **[NEW] `src/workers/audio_deepfake_worker.py`**:
  - Verify MIME, transcode to 16kHz mono.
  - Run ASR transcription (pass text to phishing worker).
  - Run audio deepfake detector (AASIST/LCNN) and check for voice cloning artifacts.

### Fusion & Response Engine
- **[NEW] `src/services/fusion_engine.py`**:
  - Aggregate scores from all workers for a single `MessageSid`.
  - Pass structured evidence JSON to Explainability LLM to generate plain-language verdicts (English/Hindi/regional).
  - Generate concrete "Next Action" recommendations (e.g., "Do not pay, verify on a live call, report to 1930").
- **[NEW] `src/services/twilio_client.py`**:
  - Send the finalized verdict asynchronously back to the user via Twilio Programmable Messaging API.

### Infrastructure & Setup Guide
- **[NEW] `docs/twilio_whatsapp_setup.md`**:
  - Step 1: Create a Twilio account and start with the WhatsApp Sandbox for development.
  - Step 2: Join the Sandbox from a test phone by sending the sandbox join code in WhatsApp.
  - Step 3: Expose a public HTTPS webhook URL from the backend (e.g., using `ngrok`).
  - Step 4: Configure the Sandbox’s inbound webhook to point to `YOUR_DOMAIN/webhooks/twilio/whatsapp`.
  - Step 5: Validate the Twilio signature in the handler before doing any work. Parse `MessageSid`, `From`, `To`, `Body`, `NumMedia`, etc.
  - Step 6: When async work finishes, send the verdict back via Twilio Programmable Messaging.
  - Step 7: For weekly reports or messages outside the active 24-hour user session, use approved WhatsApp templates.
  - Step 8: Move from Sandbox to production by registering a WhatsApp sender in Twilio, linking Meta Business, and completing business verification.

## Verification Plan
### Automated Tests
- Write unit tests (`pytest`) for Twilio signature validation in `test_webhooks.py`.
- Write unit tests for the ingestion and normalization schema in `test_ingest.py`.
- Apply mock tests to Twilio Messaging API responses for `twilio_client.py` validation.

### Manual Verification
- Deploy backend locally via `ngrok` and link the HTTPS URL to the Twilio WhatsApp Sandbox webhook.
- Join sandbox from a test device.
- **Text/URL Test:** Send a dummy phishing URL -> Verify fast response (< 3s).
- **Voice Test:** Send a 10s voice note -> Verify immediate "Analyzing" TwiML response, followed by asynchronous risk score via Message API callback.
- **Image Test:** Send a known AI-generated deepfake image -> Verify the image worker flags artificial patterns and the fusion engine reports it appropriately.
