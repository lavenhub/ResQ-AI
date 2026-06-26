"""
/api/auth — Demo phone OTP authentication

POST /api/auth/send-otp    — Accepts any phone number, always "sends" OTP 123456
POST /api/auth/verify-otp  — Verifies against fixed demo code 123456

No Twilio, no SMS, no external service needed.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

DEMO_OTP = "123456"


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


@router.post("/send-otp")
def send_otp(req: SendOtpRequest):
    phone = req.phone.strip()
    if not phone:
        return {"error": "Phone number is required"}
    if not phone.startswith("+"):
        return {"error": "Phone number must include country code (e.g. +919876543210)"}

    # Demo mode — no SMS sent, OTP is always 123456
    print(f"[AUTH] Demo OTP requested for {phone} — code is always {DEMO_OTP}")
    return {"success": True, "message": f"Demo OTP sent to {phone}. Use code: {DEMO_OTP}"}


@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest):
    phone = req.phone.strip()
    code  = req.code.strip()

    if not phone:
        return {"error": "Phone number is required"}

    if code != DEMO_OTP:
        return {"error": f"Incorrect code. Demo OTP is always {DEMO_OTP}"}

    return {"success": True, "phone": phone}
