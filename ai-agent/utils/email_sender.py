"""
Emergency contact email notification via Resend.
Free tier: 3,000 emails/month — no SMTP, no domain needed for testing.

Set in .env:
  RESEND_API_KEY  — from resend.com dashboard (starts with re_)
  RESEND_FROM     — sender address (default: onboarding@resend.dev for testing,
                    or your verified domain email for production)
"""

import os
import resend
from typing import List


def send_emergency_alert(
    recipients: List[str],
    incident_type: str,
    summary: str,
    location: dict | None = None,
    victim_name: str = "Unknown",
) -> dict:
    """
    Send an emergency alert email to all contacts via Resend.

    Returns:
        {"sent": [...], "failed": [...]}
    """
    api_key  = os.getenv("RESEND_API_KEY", "")
    from_addr = os.getenv("RESEND_FROM", "ResQ AI <onboarding@resend.dev>")

    if not api_key:
        return {"sent": [], "failed": recipients, "error": "RESEND_API_KEY not set in .env"}

    resend.api_key = api_key

    location_str = "Unknown"
    maps_link    = ""
    if location:
        lat, lng  = location.get("lat"), location.get("lng")
        location_str = f"{lat}, {lng}"
        maps_link    = f"https://maps.google.com/?q={lat},{lng}"

    html_body = f"""
<html>
<body style="font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;border:3px solid #C62828;">
    <div style="background:#C62828;padding:18px 24px;">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px;">🚨 EMERGENCY ALERT</h1>
      <p style="color:#fff;margin:6px 0 0;font-size:13px;opacity:0.9;">Sent automatically by ResQ AI</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:bold;text-transform:uppercase;color:#555;width:140px;">Person</td>
          <td style="padding:8px 0;font-size:15px;font-weight:bold;">{victim_name}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:8px 0;font-size:12px;font-weight:bold;text-transform:uppercase;color:#555;">Incident</td>
          <td style="padding:8px 0;font-size:15px;font-weight:bold;color:#C62828;">{incident_type}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:bold;text-transform:uppercase;color:#555;">Summary</td>
          <td style="padding:8px 0;font-size:14px;">{summary}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:8px 0;font-size:12px;font-weight:bold;text-transform:uppercase;color:#555;">Location</td>
          <td style="padding:8px 0;font-size:14px;">{location_str}</td>
        </tr>
      </table>

      {f'<a href="{maps_link}" style="display:inline-block;margin-top:16px;background:#C62828;color:#fff;padding:10px 20px;text-decoration:none;font-weight:bold;font-size:13px;">📍 View on Google Maps</a>' if maps_link else ''}

      <hr style="margin:24px 0;border:none;border-top:2px solid #eee;">
      <p style="font-size:11px;color:#888;">
        This alert was sent automatically by ResQ AI when the dispatcher identified
        the emergency. Please check on this person immediately or call 112 / 911.
      </p>
    </div>
  </div>
</body>
</html>
"""

    subject = f"🚨 EMERGENCY — {incident_type} | ResQ AI"
    sent, failed = [], []

    for email in recipients:
        try:
            r = resend.Emails.send({
                "from":    from_addr,
                "to":      [email],
                "subject": subject,
                "html":    html_body,
            })
            print(f"[RESEND] Sent to {email} → id: {r.get('id')}")
            sent.append(email)
        except Exception as e:
            print(f"[RESEND] Failed to send to {email}: {e}")
            failed.append({"email": email, "error": str(e)})

    return {"sent": sent, "failed": failed}
