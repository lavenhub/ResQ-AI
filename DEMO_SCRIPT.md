# ResQ AI — Demo Video Script
**Total Duration:** ~8–10 minutes  
**Format:** Screen recording with voiceover  
**URL:** https://res-q-ai-psi.vercel.app

---

## Pre-Demo Checklist (Do Before Recording)

- [ ] Open the app in a clean browser (Chrome/Edge recommended)
- [ ] Clear localStorage: DevTools → Application → Storage → Clear All
- [ ] Add a real contact email in Profile so the email alert fires live
- [ ] Make sure backend is awake: visit https://resq-ai-pnpj.onrender.com/health
- [ ] Set screen to 1080p, browser zoom at 100%
- [ ] Have mock data ready (listed below)
- [ ] Microphone working and tested
- [ ] Phone/tablet nearby for QR scanning demo

---

## Mock Data to Use

| Field | Value |
|---|---|
| Phone Number | `+919876543210` |
| OTP | `123456` |
| Full Name | `Arjun Sharma` |
| Blood Group | `B+` |
| Age | `26` |
| Allergies | `Penicillin` |
| Chronic Conditions | `Mild Asthma` |
| Language | `English` |
| Contact 1 Name | `Priya Sharma` |
| Contact 1 Email | *(use a real email you can check live)* |
| Contact 2 Name | `Dr. Raj Mehta` |
| Contact 2 Email | *(use a second real email)* |
| Emergency phrase | `"I was in a road accident and I am injured"` |

---

## SCENE 1 — Introduction (0:00 – 0:30)

**Screen:** App landing page / auth screen  
**What to show:** Full desktop view with phone frame visible

> **VOICEOVER:**
> "This is ResQ AI — an AI-powered emergency assistance system built to help people in crisis get real-time voice-guided first aid, notify their loved ones instantly, and generate a medical handover pass for first responders.
>
> Let me walk you through the entire experience — from signing up to an actual emergency simulation."

---

## SCENE 2 — User Onboarding / OTP Login (0:30 – 1:30)

**Screen:** Auth page — phone number entry

> **VOICEOVER:**
> "The app starts with a simple phone number login. No passwords — just your number and a one-time code."

**ACTIONS:**
1. Show the auth screen with the RESQ AI logo
2. Click the phone input
3. Type: `+919876543210`
4. Click **"Send OTP →"**
5. Show the OTP entry screen — point to the demo hint showing **1 2 3 4 5 6**

> **VOICEOVER:**
> "For this demo, the OTP is always 1-2-3-4-5-6. In production, this would be a real SMS."

6. Enter `1`, `2`, `3`, `4`, `5`, `6` in the boxes one by one
7. Click **"Verify & Sign In →"**
8. App redirects to the Home screen

> **VOICEOVER:**
> "And we're in. The app recognises us and takes us to the home dashboard."

---

## SCENE 3 — Home Dashboard (1:30 – 2:00)

**Screen:** Home page

> **VOICEOVER:**
> "The home screen is the command center. You can see the SOS button at the bottom right — a long press activates the emergency flow. At the top, the navigation gives you access to First Aid guides, History, and your Profile."

**ACTIONS:**
1. Show the home screen — pan slowly
2. Point to the red SOS floating button
3. Point to the bottom navigation bar
4. Point to the greeting with the phone number

---

## SCENE 4 — Profile Setup (2:00 – 3:30)

**Screen:** Profile page

> **VOICEOVER:**
> "Before using the emergency features, let's set up the profile. This is critical — the app uses this data to generate the medical handover pass and notify emergency contacts."

**ACTIONS:**
1. Tap **Profile** in the bottom nav
2. Show the profile page loading

**Personal Info section:**
3. Click Full Name → type `Arjun Sharma`
4. Show the phone number is pre-filled and locked (verified via OTP)

> **VOICEOVER:**
> "The phone number is already verified and locked. We just need to fill in the name."

**Medical Profile section:**
5. Blood Group → select `B+`
6. Age → type `26`
7. Allergies → type `Penicillin`
8. Chronic Conditions → type `Mild Asthma`

> **VOICEOVER:**
> "The medical profile stores your blood group, age, allergies, and chronic conditions. This data is embedded in the QR code generated at the end of every emergency session — so first responders can scan it and instantly know your medical history."

**Emergency Contacts section:**
9. Click **"+ Add Contact"**
10. Contact modal opens — type:
    - Name: `Priya Sharma`
    - Email: *(your real email)*
11. Click **Add**
12. Click **"+ Add Contact"** again
    - Name: `Dr. Raj Mehta`
    - Email: *(second email)*
13. Click **Add**
14. Show both contacts listed

> **VOICEOVER:**
> "Emergency contacts are notified automatically when the AI detects a crisis. We've added two contacts — a family member and a doctor."

**Preferences section:**
15. Language → keep `English`
16. Show the push notifications toggle

17. Click **"Save Changes"** — button turns green showing **"✓ Saved!"**

> **VOICEOVER:**
> "All data is saved locally and securely on the device. Hit Save — and the profile is ready."

---

## SCENE 5 — First Aid Guides (3:30 – 4:00)

**Screen:** First Aid page

> **VOICEOVER:**
> "The First Aid section gives offline access to critical guides — from heavy bleeding to snakebites. These work without any internet connection."

**ACTIONS:**
1. Tap **First Aid** in the bottom nav
2. Scroll through the guide cards
3. Tap on **"Heavy Bleeding"** — show the steps, precautions, and warnings
4. Go back

> **VOICEOVER:**
> "Step-by-step instructions written for real emergencies — not textbook language."

---

## SCENE 6 — Emergency Session (4:00 – 7:00)

**Screen:** Emergency page

> **VOICEOVER:**
> "Now the core feature — the AI emergency dispatcher. Let me simulate a real scenario."

**ACTIONS:**
1. Tap the **SOS button** or navigate to Emergency tab
2. Show the emergency page — map loading, language selector, dispatcher standby

> **VOICEOVER:**
> "The map shows your live GPS location. The language selector lets you speak in any of 22 Indian languages. The AI dispatcher is on standby."

3. Keep language as **English**
4. Click **"Start AI Dispatcher"**
5. Show the connecting animation (amber wave bars)
6. Connection established — header turns red, "Emergency Active"

> **VOICEOVER:**
> "Connected. The AI dispatcher is live. Notice the header turns red — the system is now in emergency mode."

7. Press and hold **"Hold to Talk"** button

**Speak clearly into the microphone:**
> *"I was in a road accident and I am injured. My leg is bleeding badly."*

8. Release the button
9. Show the transcript appearing: **YOU:** "I was in a road accident and I am injured..."

> **VOICEOVER:**
> "The speech is transcribed in real time using Whisper AI. Watch the dispatcher respond..."

10. Show the AI response appearing in the transcript and being spoken aloud

> **VOICEOVER:**
> "The AI gives immediate first-aid guidance — not just 'call 911', but actual actionable steps to minimise harm right now."

**Email Alert:**
11. Show the green **"Emergency Alert Sent"** banner appearing below
12. Zoom in on the banner showing contact names

> **VOICEOVER:**
> "Simultaneously, the system detects this is an emergency and fires email alerts to both contacts — Priya Sharma and Dr. Raj Mehta — with the incident details and GPS location."

**Vehicle Simulation:**
13. Scroll up to the map
14. Show the ambulance emoji spawning on the map and slowly moving toward the user pin

> **VOICEOVER:**
> "And an ambulance is dispatched — you can watch it moving toward your location in real time on the map. For a fire emergency it dispatches a fire brigade, for a crime it dispatches a police van."

15. Show the dashed route line shrinking as the ambulance approaches

16. Do a second voice turn — press hold to talk:
> *"I applied pressure on the wound. The bleeding is slowing down."*

17. Show AI responding with next steps

> **VOICEOVER:**
> "The conversation is context-aware — the AI remembers the whole session and adapts its guidance."

18. Click **"End Emergency — View Pass & History"**

> **VOICEOVER:**
> "When the emergency is resolved, we end the session."

---

## SCENE 7 — Medical Handover QR Pass (7:00 – 8:00)

**Screen:** Emergency page (after ending) → History page

> **VOICEOVER:**
> "The moment the session ends, a Medical Handover Pass is automatically generated."

**ACTIONS:**
1. Show the QR code appearing on screen after ending the session
2. Point to the QR code

> **VOICEOVER:**
> "This QR code encodes everything — the patient's name, blood group, age, allergies, conditions, the incident type, GPS location, and a summary of the AI conversation."

3. Take out a phone
4. Scan the QR code with the phone camera

> **VOICEOVER:**
> "When a first responder scans this QR code..."

5. Show the **medical-pass page** opening on the phone — full PDF-style report

> **VOICEOVER:**
> "...they instantly see a clean medical handover report. No app needed, no login — just scan and read. They can also save it as a PDF."

6. Scroll through the report on the phone — show patient details, incident, location, summary

**History Page:**
7. Navigate to **History** tab
8. Show the incident saved with date, duration, and incident type

> **VOICEOVER:**
> "Every session is saved to history. You can expand any incident to see the full transcript, re-view the QR pass, or open the GPS location in Google Maps."

9. Tap the incident to expand it
10. Click **"Show QR Pass"** — QR appears
11. Click **"Download QR"**
12. Show the location link

---

## SCENE 8 — Email Demo (live) (8:00 – 8:30)

**Screen:** Phone/email app (side by side or cut to phone)

> **VOICEOVER:**
> "Let me show you the email that was sent to the contacts."

**ACTIONS:**
1. Open the email inbox on a phone or second screen
2. Show the emergency alert email
3. Scroll through — show victim name, incident type, summary, GPS link
4. Click the **"View on Google Maps"** button — maps opens to the exact location

> **VOICEOVER:**
> "The email includes all the critical details — who, what, where — and a one-click link to the exact GPS location. This arrives within seconds of the emergency being detected."

---

## SCENE 9 — Closing (8:30 – 9:00)

**Screen:** Home page — mobile phone frame visible on desktop

> **VOICEOVER:**
> "ResQ AI works as a mobile app on your phone and as a phone-frame interface on desktop. It's deployed and live — the frontend on Vercel, the AI backend on Render.
>
> To summarise what we just saw:
> — Phone OTP onboarding
> — Full medical profile setup
> — Live AI voice emergency dispatcher in 22 languages
> — Real-time email alerts to emergency contacts
> — Animated vehicle dispatch on live map
> — Medical Handover QR Pass scanned by first responders
> — Full emergency history with transcripts
>
> ResQ AI — because in an emergency, every second counts."

---

## Recording Tips

- **Speak slowly and clearly** — especially during the voice emergency scene
- **Pause 1–2 seconds** after each major action before speaking the next line
- **Zoom in** on the transcript area when the AI responds so text is readable
- **Show the phone frame** on desktop — it makes the UI look intentional and polished
- If the Render backend is sleeping, **wait 30 seconds** for the first response — mention it's a cold start on the free tier
- Record in **1920×1080** minimum
- Use **OBS** or **Loom** for clean screen recording with picture-in-picture webcam optional

---

*Script version 1.0 — ResQ AI Demo*
