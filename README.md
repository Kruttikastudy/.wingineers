# 🛡️ Cryptix — AI-Powered Cyber Defense Platform

> **Built for a hackathon.** A full-stack, real-time cyber defense platform that combines ML-based threat detection, explainable AI, and a Chrome extension into a unified security dashboard.

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| **Frontend Dashboard** | [wingineers.vercel.app](https://wingineers.vercel.app) |
| **Backend API** | Hosted on Hugging Face Spaces |
| **API Docs** | `/docs` (Swagger UI) |

---

## 📖 Overview

Cryptix is a multi-layered cyber defense platform targeting everyday digital threats that affect individuals and organizations — phishing URLs, deepfake media, voice scam calls, malicious emails, and prompt injection attacks on AI systems.

The platform consists of three tightly integrated components:

```
┌─────────────────────────────────────────────────────────────┐
│                     CRYPTIX PLATFORM                        │
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   Frontend   │  │    Backend    │  │Chrome Extension │  │
│  │  React SPA   │◄─►  FastAPI +   │◄─►  PhishGuard     │  │
│  │  Dashboard   │  │  ML Models   │  │  Browser Guard  │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🔗 Phishing Detection
- Rule-based URL analysis (14+ heuristic checks: suspicious TLDs, homoglyphs, URL shorteners, encoding abuse, etc.)
- Optional PhishTank database cross-reference
- Email analysis combining DistilBERT intent scoring, embedded URL analysis, and header anomaly detection
- Threat history storage with filtering, pagination, and stats

### 🎭 Deepfake Detection
- **Audio**: HuggingFace `Hemgg/Deepfake-audio-detection` model (AI vs. Human voice classification)
- **Video**: Frame-sampled analysis using `prithivMLmods/Deep-Fake-Detector-v2-Model` with robust scoring (mean + median blend, outlier resistance)
- **Image**: Single-frame classification with face detection fallback
- Adaptive sigmoid-based confidence mapping with signal quality multipliers
- LLM-powered reasoning via Featherless.ai (non-decision, explanation only)

### 📞 Voice Scam Interception
- Real-time Twilio webhook integration for live call monitoring
- Pattern-based transcript analysis (urgency tactics, sensitive info requests, payment pressure, authority impersonation)
- Server-Sent Events (SSE) stream for live dashboard updates
- Automatic WhatsApp alert dispatch on high-risk calls
- Full call history with cumulative risk scoring

### 🧠 Explainable AI (XAI)
- SHAP token-level attribution using DistilBERT phishing detection model
- Per-token heatmap visualization (red = suspicious, green = benign)
- Score fusion engine: rule-based (40%) + ML model (60%) + user history boost
- User vulnerability scoring based on 30-day threat-to-scan ratio
- False positive / false negative feedback collection for continuous learning

### 💉 Prompt Injection Detection
- 40+ regex patterns across 5 attack categories:
  - Role Manipulation (DAN, system prompt override, persona hijacking)
  - Information Extraction (system prompt leaking, credential dumping)
  - Jailbreaking (developer mode, no-restrictions, evil twin)
  - Encoding Tricks (Base64 payloads, zero-width characters, token smuggling)
  - Command Injection (SQL, shell, path traversal, ransomware patterns)
- Severity scoring (0–100) with classification: safe / suspicious / dangerous / critical

### 📊 Mitigation Reports
- Aggregates threats across all detection channels
- LLM-generated executive summary, risk trend analysis, and prioritized recommendations
- Fallback template-based report when LLM is unavailable
- Downloadable PDF export (FPDF2, fully branded)

### 🔐 Authentication
- Google OAuth via credential token verification
- Manual email/password login with bcrypt hashing
- MongoDB user profiles with subscription management
- Razorpay payment integration for Premium plan upgrade

---

## 🏗️ Architecture

### Backend (`/backend`)

```
FastAPI application
├── /api
│   ├── auth.py           — Google OAuth + manual login, MongoDB upsert
│   ├── phishing.py       — URL & email analysis endpoints
│   ├── xai.py            — SHAP explain, user profiles, feedback
│   ├── prompt_injection.py — Prompt guard analysis
│   ├── mitigation.py     — Report generation + PDF export
│   └── webhooks.py       — Twilio voice/SMS/WhatsApp webhooks
└── /services
    ├── deepfake_detection.py       — Audio/video/image ML detection
    ├── deepfake_reasoning_engine.py — Adaptive scoring + LLM nudge
    ├── phishing_analyzer.py        — Rule-based URL heuristics
    ├── email_analyzer.py           — Three-signal email analysis
    ├── prompt_injection_analyzer.py — Regex pattern engine
    ├── xai_engine.py               — SHAP explainer wrapper
    ├── fusion_engine.py            — Multi-signal score fusion
    ├── featherless_llm.py          — LLM reasoning (Featherless.ai)
    ├── voice_analyzer.py           — Call transcript risk scoring
    ├── event_hub.py                — SSE broadcast manager
    ├── threats_manager.py          — File-based threat persistence
    ├── feedback_store.py           — User feedback persistence
    ├── user_profile.py             — Behavioral profiling
    ├── pdf_generator.py            — FPDF2 report generation
    └── twilio_client.py            — WhatsApp/SMS alert dispatch
```

**Key endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analyze-url` | Phishing URL analysis |
| `POST` | `/api/analyze-email` | Email threat analysis |
| `POST` | `/detect/audio` | Audio deepfake detection |
| `POST` | `/detect/video` | Video deepfake detection |
| `POST` | `/detect/image` | Image deepfake detection |
| `POST` | `/api/xai/explain` | SHAP token attribution |
| `POST` | `/api/analyze-prompt` | Prompt injection detection |
| `POST` | `/api/mitigation/report` | Generate threat report |
| `POST` | `/api/mitigation/pdf` | Download PDF report |
| `GET`  | `/api/events` | SSE stream for live voice data |
| `GET`  | `/api/voice/history` | Voice call history |
| `POST` | `/webhooks/twilio/voice` | Twilio voice webhook |
| `POST` | `/auth/google` | Google OAuth login |

### Frontend (`/frontend`)

React SPA with Vite, React Router, and Tailwind CSS.

```
/src
├── components/
│   ├── dashboard/     — MetricCard, RiskGauge
│   ├── phishing/      — DiagnosticReport, SaaSStatCard
│   ├── email/         — EmailAnalysisCard
│   ├── voice/         — StatCard
│   ├── xai/           — TokenHeatmap
│   ├── promptInjection/ — PatternCard
│   ├── mitigation/    — StatusRow
│   ├── login/         — LoginForm, LoginHero
│   └── shared/        — Sidebar, LandingPricing
└── context/
    └── AuthContext    — Google OAuth + manual auth state
```

**Dashboard pages:** Overview · Phishing · Voice · Email · Deepfake · XAI · Prompt Guard · Mitigation · Pricing

### Chrome Extension (`/extension`)

Manifest V3 extension — **PhishGuard**.

| Script | Role |
|--------|------|
| `background.js` | Service worker: URL interception, deepfake analysis, prompt guard orchestration |
| `content.js` | Link click monitoring on all pages |
| `gmail_content.js` | Gmail DOM parsing + email threat banner injection |
| `prompt_guard_content.js` | Real-time textarea/input monitoring, overlay injection |
| `deepfake_content.js` | Context menu deepfake analysis for media elements |

**Extension features:**
- Intercepts navigation to risky URLs → redirects to `warning.html`
- Right-click any video/audio/image → deepfake analysis popup
- Monitors all text inputs in real-time for prompt injection patterns
- Analyzes Gmail emails automatically when opened
- Per-user anonymous ID for feedback tracking

---

## 🤖 ML Models Used

| Model | Source | Purpose |
|-------|--------|---------|
| `cybersectony/phishing-email-detection-distilbert_v2.4.1` | HuggingFace | Email intent classification |
| `CrabInHoney/urlbert-tiny-v3-malicious-url-classifier` | HuggingFace | URL malice scoring |
| `Hemgg/Deepfake-audio-detection` | HuggingFace | AI vs. human voice |
| `prithivMLmods/Deep-Fake-Detector-v2-Model` | HuggingFace | Image/video frame classification |
| `Wvolf/ViT_Deepfake_Detection` | HuggingFace | Fallback video model |
| SHAP + DistilBERT | Local | Token-level explainability |
| Featherless.ai LLM | API | Reasoning & mitigation reports |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (optional — for user auth)
- Twilio account (optional — for voice interception)
- Featherless.ai API key (optional — for LLM features)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Create .env file (see Environment Variables below)
cp .env.example .env

uvicorn src.main:app --host 0.0.0.0 --port 7860 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `/extension` folder

---

## ⚙️ Environment Variables

```env
# Backend LLM
FEATHERLESS_API_KEY=your_key
FEATHERLESS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct

# Twilio (voice interception)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
TWILIO_WHATSAPP_NUMBER=...
ALERT_RECIPIENT_NUMBER=...     # WhatsApp number to receive scam alerts
TWILIO_VALIDATE_SIGNATURES=true

# PhishTank
PHISHTANK_API_KEY=...

# MongoDB (user auth)
MONGO_CONNECTION_STRING=mongodb+srv://...

# CORS (comma-separated origins)
CORS_ORIGINS=https://yourfrontend.vercel.app,chrome-extension://*
```

```env
# Frontend (.env)
VITE_API_URL=https://your-backend.hf.space
VITE_GOOGLE_CLIENT_ID=...
VITE_RAZORPAY_ID=rzp_live_...
```

---

## 🧪 Tests

```bash
cd backend
pytest tests/

# Specific test files:
# tests/test_ingest.py       — Webhook message routing
# tests/test_webhooks.py     — Twilio signature validation
# tests/test_xai_engine.py   — SHAP engine fallback/cache behavior
# tests/test_fusion_engine.py — Score fusion weights & severity mapping
```

---

## 📦 Deployment

### Backend → Hugging Face Spaces

The backend includes a `Dockerfile` for containerized deployment. The app runs on port `7860` (HF Spaces default). System dependencies `ffmpeg` and `libsndfile1` are pre-installed for audio/video processing.

### Frontend → Vercel

Standard Vite React deploy. Set all `VITE_*` environment variables in the Vercel project settings.

### Extension → Chrome Web Store *(or sideloaded)*

Pack the `/extension` directory. Ensure `manifest.json` `host_permissions` and `CORS_ORIGINS` on the backend both include your production URLs.

---

## 🗂️ Project Structure

```
/
├── backend/               # FastAPI + ML services
│   ├── src/
│   │   ├── api/           # Route handlers
│   │   ├── services/      # Business logic & ML
│   │   └── config.py      # Pydantic settings
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/              # React + Vite dashboard
│   └── src/
│       ├── components/
│       └── context/
└── extension/             # Chrome MV3 extension
    ├── background.js
    ├── content.js
    ├── gmail_content.js
    ├── prompt_guard_content.js
    └── manifest.json
```

---

## 🛡️ Security Notes

- Twilio webhook signatures are validated in production (`TWILIO_VALIDATE_SIGNATURES=true`)
- The extension's `ALLOW_URL` message handler validates sender identity against `chrome.runtime.id`
- All media downloads in the extension enforce HTTPS only
- No API keys are exposed to the frontend or extension — all sensitive calls go through the backend
- Passwords are bcrypt-hashed (10 rounds) before storage

---

## 🤝 Team

Built in ~24 hours for a hackathon by the **Wingineers** team.
Bhargavi Naik
Akshat Singh
Ayush Patel 
Kruttika Hebbar

---

## 📄 License

This project was built for a hackathon. All rights reserved by the Wingineers team.
