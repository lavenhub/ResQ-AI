"""
Text-to-Speech using gTTS (Google TTS)
- Free, no API key, works on Linux/Windows/Mac
- Outputs MP3 bytes directly — no ffmpeg/pydub needed
- Browser AudioContext.decodeAudioData handles MP3 natively
"""

import io
import re
import threading
from typing import Generator
from gtts import gTTS

_lock = threading.Lock()

# Maps frontend language name → gTTS BCP-47 language code
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
    "Kashmiri":  "ur",
    "Sanskrit":  "hi",
}


def _text_to_mp3_bytes(text: str, language: str = "English") -> bytes:
    """Convert text → MP3 bytes via gTTS. No disk I/O, no ffmpeg."""
    lang_code = GTTS_LANG.get(language, "en")
    try:
        tts = gTTS(text=text.strip(), lang=lang_code, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        return buf.getvalue()
    except Exception as e:
        print(f"[TTS] Error: {e} — returning silence")
        # Return a minimal silent MP3 (44 bytes — valid but silent)
        return (
            b"\xff\xe3\x18\xc4\x00\x00\x00\x03H\x00\x00\x00\x00"
            b"LAME3.100\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
            b"\x00\x00\x00\x00"
        )


# ─── Public API ───────────────────────────────────────────────────────────────

def speak_to_bytes(text: str, rate: int = 150, volume: float = 1.0,
                   language: str = "English") -> bytes:
    """Convert text → MP3 bytes. Thread-safe."""
    with _lock:
        return _text_to_mp3_bytes(text, language)


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
    Consume LLM token stream → sentences → yield MP3 bytes per sentence.
    Named 'stream_sentences_to_wav' for API compatibility but returns MP3.
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
                        yield _text_to_mp3_bytes(sentence, language)

    remainder = buffer.strip()
    if remainder:
        with _lock:
            yield _text_to_mp3_bytes(remainder, language)


def get_available_voices() -> list[dict]:
    return [{"id": code, "name": name, "lang": [code]}
            for name, code in GTTS_LANG.items()]
