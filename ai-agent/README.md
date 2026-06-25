# Emergency Voice AI Agent — Backend

100% free, offline voice AI backend for emergency situations.
Stack: FastAPI + faster-whisper (STT) + Claude Haiku (LLM) + pyttsx3 (TTS)

---

## Setup

### 1. Install system dependency (Linux only)
```bash
sudo apt install espeak -y
```
On Windows/Mac: pyttsx3 uses built-in OS TTS — no extra install needed.

### 2. Install Python packages
```bash
pip install -r requirements.txt
```

### 3. Add your API key
```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
# Free at: https://console.anthropic.com
```

### 4. Run the server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs available at: http://localhost:8000/docs

---

## API Flow (Mobile App)

```
1. User taps SOS
        ↓
2. POST /api/session/start  { lat, lng }
        ↓ returns session_id
3. GET  /api/session/opening/{session_id}
        ↓ returns WAV audio → play it ("Emergency assistant active. What is happening?")
4. Record user voice → POST /api/voice/pipeline  { session_id, audio }
        ↓ returns WAV audio → play it (Claude's response)
5. Repeat step 4 until resolved
        ↓
6. POST /api/session/end/{session_id}
```

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/session/start | Start emergency session (pass GPS) |
| GET | /api/session/opening/{id} | Get agent's first voice message |
| POST | /api/session/end/{id} | End session |
| POST | /api/voice/pipeline | Main: audio in → audio out |
| POST | /api/voice/transcribe | STT only |
| POST | /api/voice/respond-text | Text in → audio out |
| GET | /api/voice/voices | List TTS voices |

---

## Cost Breakdown

| Component | Cost |
|-----------|------|
| faster-whisper (STT) | Free, offline |
| pyttsx3 (TTS) | Free, offline |
| Claude Haiku (LLM) | ~$0.00025 per emergency call |
| FastAPI + uvicorn | Free |

One emergency session ≈ 10 turns ≈ less than $0.01 total.

---

## Whisper Model Options

Edit `core/stt.py` → `WhisperModel("tiny", ...)` to change:

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | 75 MB | Fastest | Good |
| base | 145 MB | Fast | Better |
| small | 465 MB | Medium | Best for emergencies |

Recommended: `small` for production emergency use.
