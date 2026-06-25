"""
/api/auth — Phone OTP authentication via Twilio SMS

POST /api/auth/send-otp    — Send a 6-digit OTP to the given phone number
POST /api/auth/verify-otp  — Verify the OTP code entered by the user
"""

import os
import random
import time
from threading import Lock

from fastapi import APIRouter
from pydantic import BaseModel
from twilio.rest import Client

router = APIRouter()

# ── In-memory OTP store ────────────────────────────────────────────────────────
# { phone: { "code": "123456", "expires_at": <unix ts>, "attempts": 0 } }
_store: dict[str, dict] = {}
_lock = Lock()

OTP_TTL_SECONDS = 300   # OTP expires after 5 minutes
MAX_ATTEMPTS    = 5     # lock out after 5 wrong guesses


def _get_twilio_client() -> Client:
    return Client(
        os.environ["TWILIO_ACCOUNT_SID"],
        os.environ["TWILIO_AUTH_TOKEN"],
    )


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


# ── Request / response models ─────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    phone: str   # e.g. "+919876543210"


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(req: SendOtpRequest):
    """
    Generate a 6-digit OTP, store it in memory with a 5-minute TTL,
    and send it to the user's phone via Twilio SMS.
    """
    phone = req.phone.strip()
    if not phone:
        return {"error": "Phone number is required"}

    # Normalise: ensure it starts with +
    if not phone.startswith("+"):
        return {"error": "Phone number must include country code (e.g. +919876543210)"}

    code = _generate_otp()
    expires_at = time.time() + OTP_TTL_SECONDS

    with _lock:
        _store[phone] = {"code": code, "expires_at": expires_at, "attempts": 0}

    try:
        client = _get_twilio_client()
        client.messages.create(
            body=f"Your ResQ AI verification code is: {code}. Valid for 5 minutes.",
            from_=os.environ["TWILIO_PHONE_NUMBER"],
            to=phone,
        )
    except Exception as e:
        # Remove the stored OTP so user can retry
        with _lock:
            _store.pop(phone, None)
        return {"error": f"Failed to send SMS: {str(e)}"}

    return {"success": True, "message": f"OTP sent to {phone}"}


@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest):
    """
    Check the submitted OTP code against the stored one.
    Returns success + phone on match, error on mismatch / expiry.
    """
    phone = req.phone.strip()
    code  = req.code.strip()

    with _lock:
        entry = _store.get(phone)

        if not entry:
            return {"error": "No OTP found for this number. Please request a new one."}

        if time.time() > entry["expires_at"]:
            del _store[phone]
            return {"error": "OTP has expired. Please request a new one."}

        if entry["attempts"] >= MAX_ATTEMPTS:
            del _store[phone]
            return {"error": "Too many incorrect attempts. Please request a new OTP."}

        if entry["code"] != code:
            entry["attempts"] += 1
            remaining = MAX_ATTEMPTS - entry["attempts"]
            return {"error": f"Incorrect code. {remaining} attempt(s) remaining."}

        # ✅ Correct — clean up and confirm
        del _store[phone]

    return {"success": True, "phone": phone}
