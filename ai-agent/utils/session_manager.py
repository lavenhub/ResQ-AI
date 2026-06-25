"""
In-memory session manager.
Stores conversation history per session_id so Claude has full context.
"""

import uuid
from datetime import datetime, timedelta
from threading import Lock

_sessions: dict[str, dict] = {}
_lock = Lock()

SESSION_TIMEOUT_MINUTES = 30


def create_session(
    location: dict | None = None,
    language: str = "English",
    victim_name: str = "",
    contacts: list[dict] | None = None,
) -> str:
    """Create a new emergency session, return session_id."""
    session_id = str(uuid.uuid4())
    with _lock:
        _sessions[session_id] = {
            "id": session_id,
            "created_at": datetime.utcnow(),
            "last_active": datetime.utcnow(),
            "history": [],
            "location": location,
            "language": language,
            "victim_name": victim_name,
            "contacts": contacts or [],       # [{"name": ..., "email": ...}]
            "email_sent": False,              # only send once per session
            "vehicle_dispatched": False,       # only dispatch once per session
            "active": True,
        }
    return session_id


def get_session(session_id: str) -> dict | None:
    """Retrieve session or None if expired/missing."""
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            return None
        # Auto-expire after 30 min of inactivity
        if datetime.utcnow() - session["last_active"] > timedelta(minutes=SESSION_TIMEOUT_MINUTES):
            del _sessions[session_id]
            return None
        return session


def append_message(session_id: str, role: str, content: str) -> bool:
    """Append a message to conversation history. Returns False if session missing."""
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            return False
        session["history"].append({"role": role, "content": content})
        session["last_active"] = datetime.utcnow()
        return True


def end_session(session_id: str) -> bool:
    """Mark session as ended."""
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            return False
        session["active"] = False
        return True


def get_all_active() -> list[dict]:
    """Return summary of all active sessions (for monitoring)."""
    with _lock:
        return [
            {
                "id": s["id"],
                "created_at": s["created_at"].isoformat(),
                "turns": len(s["history"]),
                "location": s["location"],
            }
            for s in _sessions.values()
            if s["active"]
        ]
