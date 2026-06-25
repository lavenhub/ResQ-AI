"""
Emergency Voice AI Agent — FastAPI Backend
Stack: faster-whisper (STT) + Groq LLM + pyttsx3 (TTS)
"""

from dotenv import load_dotenv
load_dotenv()  # must run before any module reads env vars

import os
import json
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from api.voice import router as voice_router
from api.session import router as session_router
from api.auth import router as auth_router

app = FastAPI(
    title="Emergency Voice AI Agent",
    description="Offline voice assistant for emergency situations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # exposes X-Assistant-Text etc to browser
)

app.include_router(voice_router, prefix="/api/voice", tags=["Voice"])
app.include_router(session_router, prefix="/api/session", tags=["Session"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])


# ── Health / status ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "agent": "Emergency AI", "mode": "offline"}


@app.get("/api/status")
def api_status():
    """Frontend health-check — confirms backend is up and Groq key is set."""
    has_key = bool(os.environ.get("GROQ_API_KEY"))
    return {"status": "ok", "hasApiKey": has_key}


# ── First-responder briefing ───────────────────────────────────────────────────

class BriefingRequest(BaseModel):
    logs: list[dict]  # list of TranscriptEntry: {sender, text, ...}


@app.post("/api/responder-briefing")
def responder_briefing(req: BriefingRequest):
    """
    Generate a structured handover report from the session transcript.
    Uses Groq to extract incident type, victim status, urgency, and timeline.
    """
    from core.llm import get_client

    conversation = "\n".join(
        f"[{e.get('sender', '?').upper()}]: {e.get('text', '')}"
        for e in req.logs
        if e.get("sender") != "system"
    )

    if not conversation.strip():
        return {
            "incidentType": "Unknown",
            "victimStatus": {
                "conscious": "Unknown",
                "breathing": "Unknown",
                "bleeding": "Unknown",
            },
            "location": "Unknown",
            "timelineActions": [],
            "arrivingHazards": "None reported",
            "urgencyLevel": "MEDIUM",
        }

    prompt = f"""You are a medical dispatcher. Based on this emergency conversation, produce a JSON responder briefing.

CONVERSATION:
{conversation}

Reply ONLY with valid JSON matching this exact shape (no markdown, no explanation):
{{
  "incidentType": "short string",
  "victimStatus": {{
    "conscious": "Yes or No or Unknown",
    "breathing": "Yes or No or Unknown",
    "bleeding":  "Yes or No or Unknown"
  }},
  "location": "string",
  "timelineActions": ["action 1", "action 2"],
  "arrivingHazards": "string",
  "urgencyLevel": "CRITICAL or HIGH or MEDIUM"
}}"""

    response = get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
