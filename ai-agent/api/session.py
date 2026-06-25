"""
/api/session — Session lifecycle endpoints

POST /api/session/start    — Start a new emergency session
POST /api/session/end      — End a session
GET  /api/session/opening  — Get the opening audio (agent speaks first)
GET  /api/session/active   — List active sessions (admin/debug)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from core.llm import get_opening_message
from core.tts import speak_to_bytes
from utils.session_manager import (
    create_session,
    end_session,
    get_session,
    get_all_active,
)

router = APIRouter()


from typing import Optional

class Contact(BaseModel):
    name: str
    email: str

class StartSessionRequest(BaseModel):
    lat: float | None = None
    lng: float | None = None
    language: str = "English"
    victim_name: str = ""
    contacts: list[Contact] = []


@router.post("/start")
def start_session(req: StartSessionRequest):
    """
    Call this when user hits the SOS button.
    Pass GPS coordinates, language, victim name and emergency contacts.
    Returns a session_id to use in all subsequent calls.
    """
    location = None
    if req.lat is not None and req.lng is not None:
        location = {"lat": req.lat, "lng": req.lng}

    contacts = [{"name": c.name, "email": c.email} for c in req.contacts]

    session_id = create_session(
        location=location,
        language=req.language,
        victim_name=req.victim_name,
        contacts=contacts,
    )

    return {
        "session_id": session_id,
        "message": "Session started.",
        "location_received": location is not None,
        "language": req.language,
        "contacts_received": len(contacts),
    }


@router.get("/opening/{session_id}")
def get_opening_audio(session_id: str):
    """
    After starting a session, call this to get the agent's opening
    voice message as a WAV file. Play this on the mobile app immediately.

    Returns: WAV audio bytes
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    opening_text = get_opening_message()
    audio_bytes = speak_to_bytes(opening_text, rate=145)

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"X-Opening-Text": opening_text},
    )


@router.post("/end/{session_id}")
def end_session_route(session_id: str):
    """End the emergency session."""
    success = end_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session ended", "session_id": session_id}


@router.get("/active")
def list_active_sessions():
    """Debug endpoint — list all active emergency sessions."""
    return {"active_sessions": get_all_active()}
