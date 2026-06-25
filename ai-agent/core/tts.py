"""
Text-to-Speech using pyttsx3 (offline, Windows SAPI)
+ optional Groq-based translation to English before speaking.

Strategy:
- pyttsx3 on Windows only speaks English well.
- For non-English sessions, we translate the response to English before TTS.
- The transcript shown to the user still shows the original language text.
- This gives: correct language display + audible English speech.
"""

import os
import re
import tempfile
import pyttsx3
import threading
from typing import Generator

# pyttsx3 is not thread-safe — serialize all calls
_lock = threading.Lock()


def _get_voice_id(engine: pyttsx3.Engine) -> str | None:
    voices = engine.getProperty("voices")
    if not voices:
        return None
    # Prefer index 1 (usually a clearer/female voice on Windows SAPI)
    return voices[min(1, len(voices) - 1)].id


def _render_to_wav(text: str, rate: int, volume: float) -> bytes:
    """Render text → WAV bytes via pyttsx3. Call only while _lock is held."""
    engine = pyttsx3.init()
    engine.setProperty("rate",   rate)
    engine.setProperty("volume", volume)
    vid = _get_voice_id(engine)
    if vid:
        engine.setProperty("voice", vid)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        engine.save_to_file(text, tmp_path)
        engine.runAndWait()
        engine.stop()
        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        os.unlink(tmp_path)


def _translate_to_english(text: str) -> str:
    """
    Translate non-English text to English using Groq LLM (fast, free).
    Falls back to original text on any error.
    """
    try:
        from core.llm import get_client
        client = get_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": (
                    "Translate the following emergency dispatcher message to English. "
                    "Return ONLY the translation, no explanation, no quotes:\n\n"
                    + text
                ),
            }],
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return text


def _prepare_text_for_tts(text: str, language: str = "English") -> str:
    """
    If language is not English, translate to English before speaking.
    pyttsx3 on Windows cannot pronounce non-Latin scripts.
    """
    if language == "English":
        return text
    return _translate_to_english(text)


# ─── Public API ───────────────────────────────────────────────────────────────

def speak_to_bytes(text: str, rate: int = 150, volume: float = 1.0,
                   language: str = "English") -> bytes:
    """Convert text to WAV bytes. Translates to English first if needed."""
    tts_text = _prepare_text_for_tts(text, language)
    with _lock:
        return _render_to_wav(tts_text, rate, volume)


def split_into_sentences(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p.strip() for p in parts if p.strip()]


def stream_sentences_to_wav(
    token_generator: "Generator[str, None, None]",
    rate: int = 150,
    volume: float = 1.0,
    language: str = "English",
) -> Generator[bytes, None, None]:
    """
    Consume LLM token stream → accumulate into sentences →
    translate if needed → yield WAV bytes per sentence.
    """
    buffer       = ""
    sentence_end = re.compile(r'[.!?]')

    for token in token_generator:
        buffer += token

        if sentence_end.search(buffer):
            sentences = split_into_sentences(buffer)

            if len(sentences) > 1:
                complete = sentences[:-1]
                buffer   = sentences[-1]
            else:
                if sentences and sentence_end.search(sentences[0][-1]):
                    complete = sentences
                    buffer   = ""
                else:
                    complete = []

            for sentence in complete:
                if sentence:
                    tts_text = _prepare_text_for_tts(sentence, language)
                    with _lock:
                        yield _render_to_wav(tts_text, rate, volume)

    remainder = buffer.strip()
    if remainder:
        tts_text = _prepare_text_for_tts(remainder, language)
        with _lock:
            yield _render_to_wav(tts_text, rate, volume)


def get_available_voices() -> list[dict]:
    engine = pyttsx3.init()
    voices = engine.getProperty("voices")
    engine.stop()
    return [{"id": v.id, "name": v.name, "lang": v.languages} for v in voices]
