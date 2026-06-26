"""
Text-to-Speech using gTTS (Google TTS — free, no API key, works on Linux/Windows/Mac)

- gTTS outputs MP3, we convert to WAV using pydub so the browser can play it
- Supports any language Google TTS supports (English, Hindi, Tamil, etc.)
- For non-English: speaks in that language natively (no translation needed)
- Falls back gracefully on any error
"""

import io
import os
import re
import tempfile
import threading
from typing import Generator

from gtts import gTTS
from pydub import AudioSegment

_lock = threading.Lock()

# Maps frontend language name → gTTS language code
GTTS_LANG: dict[str, str] = {
    "English":   "en",
    "Hindi":     "hi",
    "Bengali":   "bn",
    "Telugu":    "te",
    "Marathi":   "mr",
    "Tamil":     "ta",
    "Gujarati":  "gu",
    "Kannada":   "kn",
    "Malayalam": "ml",
    "Odia":      "or",
    "Punjabi":   "pa",
    "Assamese":  "as",
    "Nepali":    "ne",
    "Sindhi":    "sd",
    "Kashmiri":  "ur",   # closest available
    "Sanskrit":  "hi",   # closest available
}


def _text_to_wav_bytes(text: str, language: str = "English") -> bytes:
    """
    Convert text to WAV bytes using gTTS.
    gTTS outputs MP3 → we convert to WAV via pydub.
    """
    lang_code = GTTS_LANG.get(language, "en")

    try:
        tts = gTTS(text=text, lang=lang_code, slow=False)
        mp3_buf = io.BytesIO()
        tts.write_to_fp(mp3_buf)
        mp3_buf.seek(0)

        # Convert MP3 → WAV in memory
        audio = AudioSegment.from_mp3(mp3_buf)
        wav_buf = io.BytesIO()
        audio.export(wav_buf, format="wav")
        return wav_buf.getvalue()

    except Exception as e:
        print(f"[TTS] Error: {e}")
        # Return a silent 0.5s WAV as fallback
        silence = AudioSegment.silent(duration=500)
        buf = io.BytesIO()
        silence.export(buf, format="wav")
        return buf.getvalue()


# ─── Public API ───────────────────────────────────────────────────────────────

def speak_to_bytes(text: str, rate: int = 150, volume: float = 1.0,
                   language: str = "English") -> bytes:
    """Convert text to WAV bytes. Thread-safe."""
    with _lock:
        return _text_to_wav_bytes(text, language)


def split_into_sentences(text: str) -> list[str]:
    """Split text on sentence-ending punctuation."""
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    return [p.strip() for p in parts if p.strip()]


def stream_sentences_to_wav(
    token_generator: "Generator[str, None, None]",
    rate: int = 150,
    volume: float = 1.0,
    language: str = "English",
) -> Generator[bytes, None, None]:
    """
    Consume LLM token stream → accumulate sentences → yield WAV per sentence.
    Yields audio as soon as each sentence is complete for low-latency streaming.
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
                if sentence.strip():
                    with _lock:
                        yield _text_to_wav_bytes(sentence, language)

    remainder = buffer.strip()
    if remainder:
        with _lock:
            yield _text_to_wav_bytes(remainder, language)


def get_available_voices() -> list[dict]:
    """List supported languages."""
    return [{"id": code, "name": name, "lang": [code]}
            for name, code in GTTS_LANG.items()]
