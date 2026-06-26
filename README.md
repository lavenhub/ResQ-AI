# 🚨 ResQ AI — Emergency Assistance System

An AI-powered emergency voice assistant that guides users through crises in real time using multilingual speech-to-text, LLM-based first-aid advice, and text-to-speech responses.

---

## Features

- **Voice Emergency Dispatcher** — Push-to-talk, speak your emergency, get instant AI guidance
- **Multilingual** — Supports 22 Indian languages via Whisper STT auto-detection
- **Medical Handover QR Pass** — Auto-generated QR after each session; scan to open a printable PDF medical report
- **Emergency Contact Alerts** — Auto-emails your saved contacts when emergency is detected
- **Vehicle Simulation** — Animated ambulance / fire brigade / police van dispatched on the map
- **Demo OTP Auth** — Phone number login with fixed OTP `123456` for demo
- **Mobile-First UI** — Phone frame on desktop, full-screen on mobile
- **Emergency History** — All past sessions saved with QR codes and transcripts

---

## Tech Stack

### Frontend
- React + TypeScript + TanStack Start (SSR)
- Tailwind CSS + shadcn/ui
- Web Audio API (push-to-talk, audio playback)
- QRCode.js (medical pass generation)
- OpenStreetMap (live map with vehicle overlay)

### Backend
- FastAPI + Python 3.11+
- faster-whisper (offline STT — base model)
- Groq LLM API (llama-3.3-70b-versatile)
- gTTS (Google Text-to-Speech, multilingual)
- Resend (emergency email alerts)

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- Python 3.11+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/lavenhub/ResQ-AI.git
cd ResQ-AI
```

### 2. Start the backend
```bash
cd ai-agent
cp .env.example .env
# Fill in GROQ_API_KEY and RESEND_API_KEY in .env
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### 3. Start the frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:8080
```

### 4. Open the app
Go to **http://localhost:8080**

Login with any phone number — OTP is always **`123456`**

---

## Environment Variables

### Backend (`ai-agent/.env`)
| Variable | Description | Get it at |
|---|---|---|
| `GROQ_API_KEY` | Groq LLM API key | [console.groq.com](https://console.groq.com) |
| `RESEND_API_KEY` | Email alert API key | [resend.com](https://resend.com) |
| `RESEND_FROM` | Sender address | `ResQ AI <onboarding@resend.dev>` |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (empty = localhost proxy) |

---

## Deployment

### Backend → Render
1. Go to [render.com](https://render.com) → New Web Service
2. Connect `lavenhub/ResQ-AI`
3. Root Directory: `ai-agent`
4. Build: `pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt`
5. Start: `python main.py`
6. Add env vars: `GROQ_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`

### Frontend → Netlify
1. Go to [netlify.com](https://netlify.com) → Add new site → GitHub
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/dist/client`
5. Add env var: `VITE_API_URL` = your Render backend URL

---

## Project Structure

```
ResQ-AI/
├── ai-agent/               # FastAPI backend
│   ├── api/
│   │   ├── auth.py         # Demo OTP auth (always 123456)
│   │   ├── session.py      # Session management
│   │   └── voice.py        # WebSocket voice pipeline + email dispatch
│   ├── core/
│   │   ├── llm.py          # Groq LLM (multilingual system prompt)
│   │   ├── stt.py          # faster-whisper STT
│   │   └── tts.py          # gTTS multilingual TTS
│   ├── utils/
│   │   ├── email_sender.py # Resend email alerts
│   │   └── session_manager.py
│   ├── main.py             # FastAPI app entry point
│   └── requirements.txt
│
└── frontend/               # React + TanStack Start
    └── src/
        ├── components/
        │   ├── BottomNav.tsx
        │   └── VehicleSimulation.tsx
        ├── hooks/
        │   ├── useVoiceAgent.ts   # Core voice agent hook
        │   └── useBottomBarPos.ts
        └── routes/
            ├── auth.tsx           # OTP login
            ├── emergency.tsx      # Main emergency page
            ├── history.tsx        # Past sessions + QR codes
            ├── profile.tsx        # Medical profile + contacts
            ├── medical-pass.tsx   # QR scan → PDF report page
            └── first-aid.tsx      # First aid guides
```

---

## Demo

- **OTP**: Any phone number, code is always `123456`
- **Voice**: Click "Start AI Dispatcher" → hold "Hold to Talk" → speak your emergency
- **Test**: Say "I am having chest pain" — watch the agent respond, email fire, ambulance dispatch

---

## License

MIT
