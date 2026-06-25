"""
Speech-to-Text using faster-whisper
- Completely free & offline
- Runs on CPU (no GPU needed)
- Model: 'tiny' or 'base' for speed, 'small' for accuracy
"""

import io
import tempfile
import os
from faster_whisper import WhisperModel

# Load once at startup — tiny = fastest, small = more accurate
# Change to "base" or "small" for better accuracy on emergency speech
_model = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        print("[STT] Loading faster-whisper model (base, CPU)...")
        _model = WhisperModel(
            "base",          # base >> tiny for non-English languages
            device="cpu",
            compute_type="int8",
        )
        print("[STT] Model loaded.")
    return _model


def transcribe_audio(audio_bytes: bytes, language: str = "en") -> dict:
    """
    Transcribe raw audio bytes to text.
    - language="en"  → force English (faster, accurate)
    - language=None  → auto-detect (needed for Hindi, Tamil etc.)
    - any ISO code   → force that language
    """
    model = get_model()

    # For non-English languages, let Whisper auto-detect
    # Forcing the wrong language code causes garbled output
    force_language = language if language == "en" else None

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=force_language,   # None = auto-detect
            beam_size=5,               # higher beam = more accurate (base model is fast enough)
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=300,
                speech_pad_ms=100,
            ),
        )

        full_text = " ".join(seg.text.strip() for seg in segments)
        return {
            "text":       full_text.strip(),
            "language":   info.language,
            "confidence": round(info.language_probability, 3),
        }

    finally:
        os.unlink(tmp_path)
