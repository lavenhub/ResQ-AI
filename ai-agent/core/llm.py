"""
LLM Brain using Groq API
- Free tier available at console.groq.com
- llama-3.3-70b-versatile used — fast & capable on Groq's free tier
- Keeps full conversation history for context
- Supports both blocking and streaming responses
- Multilingual: responds in the user's chosen language
"""

import os
from typing import Generator
from groq import Groq

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    return _client


# Maps the frontend language label → native name for the system prompt
LANGUAGE_NATIVE: dict[str, str] = {
    "English":    "English",
    "Hindi":      "Hindi (हिन्दी)",
    "Bengali":    "Bengali (বাংলা)",
    "Telugu":     "Telugu (తెలుగు)",
    "Marathi":    "Marathi (मराठी)",
    "Tamil":      "Tamil (தமிழ்)",
    "Gujarati":   "Gujarati (ગુજરાતી)",
    "Kannada":    "Kannada (ಕನ್ನಡ)",
    "Malayalam":  "Malayalam (മലയാളം)",
    "Odia":       "Odia (ଓଡ଼ିଆ)",
    "Punjabi":    "Punjabi (ਪੰਜਾਬੀ)",
    "Assamese":   "Assamese (অসমীয়া)",
    "Maithili":   "Maithili (मैथिली)",
    "Santali":    "Santali (ᱥᱟᱱᱛᱟᱲᱤ)",
    "Kashmiri":   "Kashmiri (کٲشُر)",
    "Nepali":     "Nepali (नेपाली)",
    "Sindhi":     "Sindhi (سنڌي)",
    "Konkani":    "Konkani (कोंकणी)",
    "Dogri":      "Dogri (डोगरी)",
    "Manipuri":   "Manipuri (মৈতৈলোন্)",
    "Bodo":       "Bodo (बड़ो)",
    "Sanskrit":   "Sanskrit (संस्कृत)",
}

EMERGENCY_SYSTEM_PROMPT = """You are a calm, expert emergency first-aid dispatcher. The user is in danger or injured right now.

YOUR ONLY JOB: Give immediate, practical, step-by-step actions to minimize harm and keep the person alive until help arrives.

STRICT RULES:
- Respond in 1-3 SHORT sentences only. Spoken aloud — NO markdown, NO lists, NO bullet points.
- NEVER say "call 911" or "call 112" as your main response. They already know emergency services exist. Help them NOW with what to DO.
- Give concrete physical actions: apply pressure, lay flat, tilt head, stay low, etc.
- Ask ONE clarifying question at a time only if you genuinely need more info to give better advice.
- Stay calm, direct, and reassuring at all times.
- NEVER say "I'm an AI" — just help.
- Do NOT repeat GPS or location info more than once.
- LANGUAGE: Respond ENTIRELY in {language}. Always.

EMERGENCY FIRST-AID GUIDANCE by type:
- Bleeding: Apply firm direct pressure with cloth, elevate limb above heart, do not remove cloth.
- Heart attack: Have them sit or lie down, loosen tight clothing, keep them calm and still.
- Choking: 5 back blows between shoulder blades, then 5 abdominal thrusts (Heimlich).
- Burns: Cool with running water for 10 minutes, do not apply ice or butter.
- Fracture: Immobilize the limb, do not try to straighten it, keep them still.
- Unconscious but breathing: Recovery position — roll onto side, tilt head back, keep airway open.
- Not breathing: Start CPR — 30 chest compressions, 2 rescue breaths, repeat.
- Fire/smoke: Stay low below smoke, cover mouth, crawl to exit, do not use lift.
- Electric shock: Do NOT touch them — cut power first, then check breathing.
- Seizure: Clear area of hard objects, do not restrain, place soft support under head.
- Allergic reaction: If EpiPen available, use outer thigh immediately. Keep them lying down.
- Road accident: Do not move them unless in immediate danger. Keep them still and conscious.
- Drowning/near-drowning: Get them out of water, lay flat, start CPR if not breathing.
- Earthquake: Drop, cover, hold. Stay under sturdy table. Away from windows.
- Flood: Move to highest ground, do not walk through moving water.
"""


def _build_messages(
    conversation_history: list[dict],
    user_message: str,
    location: dict | None = None,
    language: str = "English",
) -> list[dict]:
    """Build the messages list for the Groq API."""
    native = LANGUAGE_NATIVE.get(language, language)
    system = EMERGENCY_SYSTEM_PROMPT.replace("{language}", native)

    if location and not conversation_history:
        system += (
            f"\nUSER LOCATION (GPS): {location.get('lat')}, {location.get('lng')}"
            " — acknowledge this ONCE then focus on their emergency."
        )

    return (
        [{"role": "system", "content": system}]
        + conversation_history
        + [{"role": "user", "content": user_message}]
    )


def get_emergency_response(
    conversation_history: list[dict],
    user_message: str,
    location: dict | None = None,
    language: str = "English",
) -> str:
    """Blocking call — used by HTTP REST endpoints."""
    messages = _build_messages(conversation_history, user_message, location, language)

    response = get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=150,
        messages=messages,
    )
    return response.choices[0].message.content.strip()


def stream_emergency_response(
    conversation_history: list[dict],
    user_message: str,
    location: dict | None = None,
    language: str = "English",
) -> Generator[str, None, None]:
    """Streaming call — yields tokens. Used by the WebSocket endpoint."""
    messages = _build_messages(conversation_history, user_message, location, language)

    stream = get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=150,
        messages=messages,
        stream=True,
    )
    for chunk in stream:
        token = chunk.choices[0].delta.content if chunk.choices else None
        if token:
            yield token


def get_opening_message(language: str = "English") -> str:
    """Returns the agent's first spoken message when session starts."""
    if language == "English":
        return "Emergency assistant active. What is happening?"
    # Ask the LLM to translate the opening line into the target language
    native = LANGUAGE_NATIVE.get(language, language)
    response = get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=40,
        messages=[{
            "role": "user",
            "content": (
                f"Translate this emergency dispatcher greeting into {native}. "
                "Return ONLY the translation, no explanation:\n"
                "\"Emergency assistant active. What is happening?\""
            ),
        }],
    )
    return response.choices[0].message.content.strip()
