# ResQ AI — 5-Minute Demo Script
**Target Duration:** 4:45 – 5:00  
**URL to open:** https://res-q-ai-psi.vercel.app  
**Mock Data:** Phone: `+919876543210` · OTP: `123456` · Name: `Arjun Sharma` · Blood: `B+` · Age: `26` · Allergies: `Penicillin`

---

## SCENE 1 — Hook (0:00 – 0:20)
**Screen:** Landing page — hero section visible in phone frame

> "Every second matters in an emergency. ResQ AI is an AI-powered voice dispatcher that guides you through any crisis in real time — notifies your contacts, dispatches help, and hands off your medical data to first responders. Let me show you the full app in five minutes."

---

## SCENE 2 — Landing Page (0:20 – 0:40)
**Screen:** Scroll slowly through the landing page

> "When someone opens the app for the first time, they see the landing page — the features, how it works, and a single call to action. Click Get Started."

**ACTION:** Click **"Get Started — It's Free"**

---

## SCENE 3 — Login (0:40 – 1:10)
**Screen:** Auth page — phone entry

> "Phone number login — no passwords. Enter the number and hit Send OTP."

**ACTIONS:**
1. Type `+919876543210` → click **Send OTP**
2. OTP screen appears — point to the **1 2 3 4 5 6** hint
3. Enter `1 2 3 4 5 6` → click **Verify & Sign In**

> "OTP is demo mode — always 1-2-3-4-5-6. Verified. We're in."

---

## SCENE 4 — Profile Setup (1:10 – 2:00)
**Screen:** Profile page

> "Before anything else — profile setup. This data powers the medical QR pass and emergency alerts."

**ACTIONS — do these fast, narrate as you type:**
1. Tap **Profile** in nav
2. Full Name → `Arjun Sharma`
3. Blood Group → `B+`
4. Age → `26`
5. Allergies → `Penicillin`
6. Conditions → `Mild Asthma`

> "Now emergency contacts — these people get an email the moment a crisis is detected."

7. Click **+ Add Contact** → Name: `Priya Sharma`, Email: *(real email)* → **Add**
8. Click **+ Add Contact** → Name: `Dr. Raj Mehta`, Email: *(second email)* → **Add**
9. Click **Save Changes** — button flashes green **✓ Saved!**

> "Profile saved. Blood group, allergies, contacts — all set."

---

## SCENE 5 — First Aid Guides (2:00 – 2:20)
**Screen:** First Aid page

> "The First Aid section has offline guides for the most common emergencies."

**ACTIONS:**
1. Tap **First Aid** in nav
2. Tap **Heavy Bleeding** — show steps briefly
3. Go back

> "No internet needed. Available the moment you open the app."

---

## SCENE 6 — Emergency Session (2:20 – 3:50)
**Screen:** Emergency page

> "Now the core feature — the live AI emergency dispatcher."

**ACTIONS:**
1. Tap **SOS button** or navigate to Emergency
2. Show the Leaflet map with user pin
3. Click **Start AI Dispatcher** — header turns red

> "Connected. The system is live."

4. Press **Hold to Talk** — speak clearly:

> *[Say into mic:]* **"I was in a road accident. I am injured and my leg is bleeding badly."**

5. Release — show transcript appearing
6. AI responds — let it play out loud

> "The AI gives immediate first-aid instructions — apply pressure, elevate the limb — not just 'call 911'."

7. Scroll up to map — show **ambulance emoji** spawning and slowly moving toward the YOU pin with dashed route line

> "An ambulance is dispatched automatically — watch it moving toward the user's location in real time. Fire emergency? Fire brigade. Crime? Police van."

8. Show **green email banner** — "Emergency Alert Sent to Priya Sharma, Dr. Raj Mehta"

> "Simultaneously — both emergency contacts receive an email with the incident details and live GPS location. Fully automatic."

9. Click **End Emergency — View Pass & History**

---

## SCENE 7 — Medical QR Pass (3:50 – 4:30)
**Screen:** QR code appearing after session ends

> "The moment the session ends — a Medical Handover Pass is generated."

**ACTIONS:**
1. Show the QR code on screen
2. Pick up phone — scan the QR code

> "Scan it with any phone..."

3. Show **medical-pass page** opening — scroll through it

> "...and first responders instantly see a full medical report — name, blood group, allergies, the incident summary, GPS coordinates. No app, no login — just scan."

4. Navigate to **History** tab
5. Show the incident saved — expand it — click **Show QR Pass**

> "Every session is permanently saved in history with the QR pass, transcript, and location."

---

## SCENE 8 — Closing (4:30 – 5:00)
**Screen:** Landing page or home dashboard — phone frame visible

> "ResQ AI — voice-guided first aid in 22 Indian languages, instant contact alerts, live vehicle dispatch, and a scannable medical pass for first responders.
>
> Built on Groq AI, Whisper speech recognition, and deployed globally on Vercel and Render.
>
> Because in an emergency — every second counts."

**ACTION:** Show the red SOS button one final time.

---

## Timing Breakdown

| Scene | Time | Duration |
|---|---|---|
| Hook | 0:00 | 20s |
| Landing page | 0:20 | 20s |
| Login | 0:40 | 30s |
| Profile setup | 1:10 | 50s |
| First Aid | 2:00 | 20s |
| Emergency session | 2:20 | 90s |
| QR Pass + History | 3:50 | 40s |
| Closing | 4:30 | 30s |
| **Total** | | **~4:50** |

---

## Quick Tips
- **Speed up** Profile setup section in editing — it's the longest typing section
- **Slow down** on the ambulance moving on the map — it's the most visual moment
- **Cut away** to the email inbox during Scene 6 (email banner) if possible — shows real delivery
- Render backend cold start: visit `https://resq-ai-pnpj.onrender.com/health` **before recording** so voice responds instantly
