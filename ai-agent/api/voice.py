"""
/api/voice — Voice pipeline endpoints

POST /api/voice/transcribe        — Audio bytes → text (STT only)
POST /api/voice/pipeline          — Full pipeline: audio in → audio out (HTTP, one turn)
POST /api/voice/respond-text      — Text in → audio out (HTTP, if frontend does its own STT)
GET  /api/voice/voices            — List available TTS voices
WS   /api/voice/ws/{session_id}   — WebSocket: real-time streaming conversation
"""

import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel
from groq import Groq

from core.stt import transcribe_audio
from core.llm import get_emergency_response, stream_emergency_response, get_client
from core.tts import speak_to_bytes, stream_sentences_to_wav, get_available_voices
from utils.session_manager import get_session, append_message
from utils.email_sender import send_emergency_alert

router = APIRouter()

# Thread pool for blocking STT / TTS calls
_executor = ThreadPoolExecutor(max_workers=4)


# ─── 1. Transcribe audio → text ───────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    return transcribe_audio(audio_bytes, language=language)


# ─── 2. Full HTTP pipeline: audio → LLM → audio ──────────────────────────────

@router.post("/pipeline")
async def full_pipeline(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio")

    loop = asyncio.get_event_loop()
    stt_result = await loop.run_in_executor(
        _executor, lambda: transcribe_audio(audio_bytes, language=language)
    )
    user_text = stt_result["text"]
    if not user_text:
        raise HTTPException(status_code=422, detail="Could not transcribe audio.")

    append_message(session_id, "user", user_text)
    prior_history = list(session["history"][:-1])
    lang = session.get("language", "English")

    assistant_text = await loop.run_in_executor(
        _executor,
        lambda: get_emergency_response(
            conversation_history=prior_history,
            user_message=user_text,
            location=session.get("location"),
            language=lang,
        ),
    )
    append_message(session_id, "assistant", assistant_text)
    audio_response = await loop.run_in_executor(
        _executor, lambda: speak_to_bytes(assistant_text, rate=145, language=lang)
    )

    return Response(
        content=audio_response,
        media_type="audio/wav",
        headers={
            "X-User-Text": user_text,
            "X-Assistant-Text": assistant_text,
            "X-Session-Id": session_id,
        },
    )


# ─── 3. Text-only respond ─────────────────────────────────────────────────────

class TextRequest(BaseModel):
    session_id: str
    text: str


@router.post("/respond-text")
async def respond_text(req: TextRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    append_message(req.session_id, "user", req.text)
    prior_history = list(session["history"][:-1])
    lang = session.get("language", "English")
    loop = asyncio.get_event_loop()

    assistant_text = await loop.run_in_executor(
        _executor,
        lambda: get_emergency_response(
            conversation_history=prior_history,
            user_message=req.text,
            location=session.get("location"),
            language=lang,
        ),
    )
    append_message(req.session_id, "assistant", assistant_text)
    audio_response = await loop.run_in_executor(
        _executor, lambda: speak_to_bytes(assistant_text)
    )

    return Response(
        content=audio_response,
        media_type="audio/wav",
        headers={"X-Assistant-Text": assistant_text},
    )


# ─── 4. List TTS voices ───────────────────────────────────────────────────────

@router.get("/voices")
def list_voices():
    return {"voices": get_available_voices()}


# ─── 5. WebSocket: real-time push-to-talk conversation ────────────────────────

@router.websocket("/ws/{session_id}")
async def websocket_voice(websocket: WebSocket, session_id: str):
    """
    Binary frame  → WAV audio → STT → LLM (in session language) → TTS → WAV back
    JSON {"type":"text","text":"..."}  → text turn (skips STT)
    JSON {"type":"config","mode":"..."}  → ack config
    """
    await websocket.accept()

    session = get_session(session_id)
    if not session:
        await websocket.send_json({
            "type": "error",
            "detail": "Session not found. Call /api/session/start first."
        })
        await websocket.close()
        return

    loop = asyncio.get_event_loop()

    try:
        while True:
            message = await websocket.receive()

            # ── JSON frames ──────────────────────────────────────────────────
            if "text" in message:
                data = json.loads(message["text"])

                if data.get("type") == "config":
                    await websocket.send_json({"type": "ready", "mode": data.get("mode", "audio")})
                    continue

                if data.get("type") == "text":
                    user_text = data.get("text", "").strip()
                    if not user_text:
                        await websocket.send_json({"type": "error", "detail": "Empty text"})
                        continue
                    await _stream_response(websocket, session, session_id, user_text, loop)
                continue

            # ── Binary audio frames (WAV) ─────────────────────────────────
            if "bytes" in message:
                audio_bytes = message["bytes"]
                if not audio_bytes:
                    await websocket.send_json({"type": "error", "detail": "Empty audio frame"})
                    continue

                lang_code = _language_to_whisper_code(session.get("language", "English"))
                stt_result = await loop.run_in_executor(
                    _executor,
                    lambda b=audio_bytes: transcribe_audio(b, language=lang_code),
                )
                user_text = stt_result.get("text", "").strip()

                if not user_text:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Could not transcribe. Please speak clearly."
                    })
                    continue

                await websocket.send_json({"type": "transcript", "text": user_text})
                await _stream_response(websocket, session, session_id, user_text, loop)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "detail": str(e)})
        except Exception:
            pass


def _language_to_whisper_code(language: str) -> str:
    """Map frontend language name to faster-whisper language code."""
    mapping = {
        "English": "en", "Hindi": "hi", "Bengali": "bn", "Telugu": "te",
        "Marathi": "mr", "Tamil": "ta", "Gujarati": "gu", "Kannada": "kn",
        "Malayalam": "ml", "Odia": "or", "Punjabi": "pa", "Assamese": "as",
        "Maithili": "mai", "Nepali": "ne", "Sindhi": "sd", "Konkani": "kok",
        "Kashmiri": "ks", "Sanskrit": "sa", "Manipuri": "mni",
    }
    return mapping.get(language, "en")


async def _stream_response(
    websocket: WebSocket,
    session: dict,
    session_id: str,
    user_text: str,
    loop: asyncio.AbstractEventLoop,
):
    """LLM stream → TTS sentences → WAV chunks → WebSocket client.
    After reply, checks if emergency type is clear and sends contact emails once."""
    prior_history = list(session["history"])
    append_message(session_id, "user", user_text)
    lang = session.get("language", "English")

    def _blocking_stream() -> tuple[list[bytes], str]:
        token_gen = stream_emergency_response(
            conversation_history=prior_history,
            user_message=user_text,
            location=session.get("location"),
            language=lang,
        )
        collected: list[str] = []

        def _capture():
            for token in token_gen:
                collected.append(token)
                yield token

        wav_chunks = list(stream_sentences_to_wav(_capture(), rate=145, language=lang))
        return wav_chunks, "".join(collected).strip()

    wav_chunks, assistant_text = await loop.run_in_executor(_executor, _blocking_stream)

    for i, wav_bytes in enumerate(wav_chunks, start=1):
        await websocket.send_json({"type": "tts_chunk", "index": i})
        await websocket.send_bytes(wav_bytes)

    append_message(session_id, "assistant", assistant_text)
    await websocket.send_json({"type": "done", "full_text": assistant_text})

    # ── Emergency detection + one-time email ─────────────────────────────────
    # Trigger immediately if user's message contains first-person emergency phrases
    if not session.get("email_sent") and session.get("contacts"):
        if _is_emergency_trigger(user_text):
            # Get a concise incident summary from the assistant's reply
            incident_type = await loop.run_in_executor(
                _executor,
                lambda: _extract_incident_type(prior_history, user_text, assistant_text),
            )
            summary  = assistant_text[:300]
            emails   = [c["email"] for c in session["contacts"] if c.get("email")]

            if emails:
                result = await loop.run_in_executor(
                    _executor,
                    lambda: send_emergency_alert(
                        recipients=emails,
                        incident_type=incident_type,
                        summary=summary,
                        location=session.get("location"),
                        victim_name=session.get("victim_name", "Unknown"),
                    ),
                )
                session["email_sent"] = True
                print(f"[EMAIL] Sent to {result.get('sent')} | Failed: {result.get('failed')}")
                await websocket.send_json({
                    "type":          "email_sent",
                    "incident_type": incident_type,
                    "sent_to":       result.get("sent", []),
                    "failed":        result.get("failed", []),
                })

            # ── Vehicle dispatch (always fires once per session on trigger) ──
            if not session.get("vehicle_dispatched"):
                vehicle_type, vehicle_label = _get_vehicle_type(incident_type)
                session["vehicle_dispatched"] = True
                location = session.get("location")
                await websocket.send_json({
                    "type":          "vehicle_dispatch",
                    "vehicle_type":  vehicle_type,
                    "vehicle_label": vehicle_label,
                    "incident_type": incident_type,
                    "user_coords":   location or {},
                })


def _is_emergency_trigger(user_text: str) -> bool:
    """
    Returns True if the user's message contains first-person emergency phrases.
    Triggers email immediately — no LLM call needed.
    """
    import re
    text = user_text.lower()
    patterns = [
        r"\bi am\b", r"\bi'm\b", r"\bi was\b",
        r"\bi have\b", r"\bi've\b", r"\bi had\b",
        r"\bhelp\b", r"\binjured\b", r"\bhurt\b",
        r"\bbleeding\b", r"\baccident\b", r"\bcrash\b",
        r"\bfire\b", r"\bburning\b", r"\bchest pain\b",
        r"\bcan't breathe\b", r"\bcannot breathe\b",
        r"\bfalling\b", r"\bfell\b", r"\bstuck\b",
        r"\bemergency\b", r"\bsos\b", r"\bplease\b",
    ]
    return any(re.search(p, text) for p in patterns)


def _extract_incident_type(
    history: list[dict],
    user_text: str,
    assistant_text: str,
) -> str:
    """
    Quick LLM call to extract a short incident label from the conversation.
    Falls back to 'Emergency' if it fails.
    """
    prompt = (
        f"User said: \"{user_text}\"\n"
        f"Dispatcher replied: \"{assistant_text}\"\n\n"
        "In 3 words or less, what is the incident type? "
        "Examples: Heart Attack, Road Accident, Fire, Choking, Fall, Bleeding. "
        "Reply with ONLY the incident label, nothing else."
    )
    try:
        response = get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return "Emergency"


def _get_vehicle_type(incident_type: str) -> tuple[str, str]:
    """
    Returns (vehicle_type, display_label) based on incident type.
    - Medical incidents  → ambulance
    - Fire/evacuation   → fire brigade
    - Crime/theft/threat → police
    """
    inc = incident_type.lower()

    fire_keywords    = ["fire", "burn", "smoke", "evacuate", "evacuation", "gas leak", "explosion"]
    police_keywords  = ["theft", "robbery", "assault", "attack", "threat", "intruder",
                        "violence", "shooting", "knife", "weapon", "kidnap", "crime"]

    if any(k in inc for k in fire_keywords):
        return ("fire", "🚒 Fire Brigade")
    if any(k in inc for k in police_keywords):
        return ("police", "🚔 Police Van")
    # Default to ambulance for medical, accident, fall, etc.
    return ("ambulance", "🚑 Ambulance")
