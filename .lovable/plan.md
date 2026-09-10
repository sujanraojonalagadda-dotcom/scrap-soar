# Kabadiwala Connect — Collector App (Phase 1)

Build the collector app end-to-end, Screens 1–10. Recycler dashboard, admin panel, smart matching, offline sync and voice come in later phases.

## Technologies note

This builder makes web applications, so Flutter, Firebase, SQLite/Drift and an on-device TensorFlow Lite model aren't possible here. Equivalents used:

| Spec | Built as |
| --- | --- |
| Flutter app | Mobile-first web app (works like an app on a phone) |
| Firebase Auth / Firestore / Storage / Hosting | Lovable Cloud + Lovable publishing |
| TensorFlow Lite on device | Vision AI category detection via Lovable AI |
| SQLite offline + auto sync | Later phase: browser offline storage with sync on reconnect |
| Speech-to-Text / Text-to-Speech | Later phase: browser voice input and spoken price |

## Screens

**1. Login** — ♻ KABADIWALA CONNECT branding, +91 mobile number field, "SEND OTP", then a 6-digit OTP step with Verify and Resend.

**2. Collector Home** — "Hello, Ramesh 👋", "What are you collecting?" with a 2x2 category grid (📱 Mobile, 💻 Laptop, 🖥️ Monitor, 🔌 Other), "ADD E-WASTE" button, and recent pickups below.

**3. Take Photo** — "Identify E-Waste", camera area, "TAKE PHOTO" and "Or select from gallery".

**4. AI Result** — "E-Waste Identified", photo preview, detected category with confidence %, "YES" / "CHANGE". AI returns category only, never price.

**5. Weight & Condition** — "E-Waste Details", category shown, weight in kg, condition radio (Working / Partially Working / Not Working), "CONTINUE".

**6. Price Estimate** — summary of category, weight, condition; indicative value = weight × category rate, adjusted by condition; note "*Final price confirmed during handover"; "FIND RECYCLERS".

**7. Verified Recyclers** — cards with name + verified tick, rating, ₹/kg, distance, "SELECT". Selecting creates a pending pickup request.

**8. Handover** — recycler name, expected weight, indicative price, a QR code for the recycler to scan, or a 6-digit OTP entry, "CONFIRM HANDOVER".

**9. Digital Receipt** — "✓ HANDOVER COMPLETE" with item, final weight, final price, recycler, date, transaction ID (KC-YYYY-NNNNNN), and the verified/weight/price confirmation ticks, "VIEW RECEIPT".

**10. History** — list of past transactions with receipts, reachable from Home.

## Data stored

- **profiles** — name, phone, role, language, area, verified.
- **recyclers** — name, location, accepted materials, indicative rates, verification status and date, rating.
- **rates** — indicative ₹/kg per category.
- **transactions** — collector, recycler, category, weight, condition, indicative price, final price, OTP verified, status, timestamp, receipt number.

Row-level security: a collector reads and writes only their own transactions; recyclers and rates are publicly readable.

## Later phases (planned, not in Phase 1)

Smart Matching score (price / distance / material / verification with an overall score and recommendation), recycler dashboard, admin verification and analytics, offline capture with auto-sync, Hindi + English voice input and spoken price.

## Technical notes

- TanStack Start, React, TypeScript, Tailwind; phone-width layout centred on desktop.
- Lovable Cloud for auth, Postgres tables above, and a storage bucket for photos.
- Camera via browser media capture, gallery via file input.
- Category detection: server function calling a vision model through Lovable AI; response constrained to the ten categories in the spec (laptop, mobile, monitor, television, printer, keyboard, mouse, cable, battery, other) plus a confidence score.
- OTP for handover generated and verified server-side; QR encodes the transaction id.
- Sample verified recyclers and rate table seeded so the demo flow works immediately.
- Recycling-green, high-contrast, large-tap-target design suited to outdoor phone use; I'll propose visual directions before building.

## Open question

Login by mobile OTP needs an SMS provider account (e.g. Twilio) connected to the project. If you don't have one yet, I'll build the same screen with a demo OTP flow for now and swap in real SMS when the provider is ready — tell me which you prefer.
