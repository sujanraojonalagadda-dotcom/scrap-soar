# Kabadiwala Connect

Built in the phase order you set — nothing all at once. Collector app first, then handover, then AI, then offline + voice, then the recycler dashboard, then admin and demo polish.

## Technologies note

This builder makes web applications, so Flutter, Firebase, SQLite/Drift and an on-device TensorFlow Lite model aren't possible here. Equivalents used:

| Spec | Built as |
| --- | --- |
| Flutter app | Mobile-first web app (works like an app on a phone) |
| Firebase Auth / Firestore / Storage / Hosting | Lovable Cloud + Lovable publishing |
| TensorFlow Lite on device | Vision AI category detection via Lovable AI |
| SQLite offline + auto sync | Browser on-device storage (IndexedDB) with sync on reconnect |
| Speech-to-Text / Text-to-Speech | Voice input and spoken price via Lovable AI |
| React recycler dashboard | Same app, desktop layout |

## Build order

### Phase 1 — Basic application

- Login: ♻ KABADIWALA CONNECT branding, +91 mobile number field, "SEND OTP", then a 6-digit OTP step with Verify and Resend.
- Registration / first-time profile: name, area.
- Collector Home: "Hello, Ramesh 👋", "What are you collecting?" with a 2x2 category grid (📱 Mobile, 💻 Laptop, 🖥️ Monitor, 🔌 Other), "ADD E-WASTE" button, recent pickups below.
- Navigation between screens.

### Phase 2 — Core transaction

- Add e-waste flow: Take Photo screen ("Identify E-Waste", camera area, "TAKE PHOTO", "Or select from gallery").
- Category confirm screen (manual for now; AI fills it in Phase 5).
- Weight & Condition: weight in kg, condition radio (Working / Partially Working / Not Working).
- Price Estimate: indicative value = weight × category rate, adjusted by condition; "*Final price confirmed during handover"; "FIND RECYCLERS".
- Verified Recyclers list: name + verified tick, rating, ₹/kg, distance, "SELECT".

### Phase 3 — Backend

- Lovable Cloud auth, database tables and photo storage.
- Collector data, recycler data, transactions; row-level security.
- Sample verified recyclers and rates seeded so the flow works immediately.

### Phase 4 — Handover

- Handover screen: recycler name, expected weight, indicative price, QR code for the recycler to scan, or a 6-digit OTP entry, "CONFIRM HANDOVER".
- Digital Receipt: "✓ HANDOVER COMPLETE" with item, final weight, final price, recycler, date, transaction ID (KC-YYYY-NNNNNN), and verification ticks (recycler verified, weight confirmed, price confirmed), "VIEW RECEIPT".
- Transaction history.

### Phase 5 — AI

Ten categories: Laptop, Mobile, Monitor, Television, Printer, Keyboard, Mouse, Cable, Battery, Other.

Flow: camera → image preprocessing → model → category + confidence → user confirms ("YES" / "CHANGE"). AI returns category only, never price.

Your pipeline (collect → clean/resize → label → train → test → export TensorFlow Lite → embed in the app) targets an on-device Flutter model. Here the same contract is served by a vision model called through Lovable AI from a server function. A model you train later can be swapped in behind the same call without touching any screen.

### Phase 6 — Offline + Voice

```text
            INTERNET?
        ┌───────┴───────┐
       YES              NO
        │               │
     Cloud DB      Local device store
        └───────┬───────┘
                ↓
        connection returns → AUTO SYNC → Cloud DB
```

- Online/offline indicator; pickups and photos captured offline are stored on the device and upload automatically when the connection returns.
- Recycler list and rates cached so price estimates work offline.
- Voice: 🎤 "Laptop 3 kilo hai" → speech-to-text → form fills with category Laptop, weight 3 kg (collector can correct).
- The app speaks back: 🔊 "Aapka estimated price ₹420 hai."
- Hindi and English first; regional languages later.

### Phase 7 — Recycler dashboard (desktop web)

Sidebar: Dashboard, Requests, Materials, Rates, History, Profile.

- Dashboard: today's requests, pending, completed, and a Collection Requests list (Laptop 3.5kg ₹420, Mobile 8kg ₹960, Monitor 12kg ₹720).
- Requests: Accept → Confirm weight and price → Handover (scan QR or issue OTP) → Complete.
- Materials: accepted categories. Rates: editable ₹/kg per category, feeding the collector estimate.
- History and Profile.

### Phase 8 — Admin, testing and demo

- Admin: view/verify collectors; verify recycler authorization and set verification date; monitor transactions; analytics (total e-waste, formal channelization, active collectors, active recyclers).
- Bug fixing, UI polish, demo data, deployment, prototype URL and QR code.

## The demo it has to deliver

Everything above exists to make this one walkthrough run live, with no code talk:

1. Collector logs in.
2. Takes a photo of a laptop.
3. AI: 💻 Laptop — 94% confidence.
4. Collector enters 3.5 kg, Not working.
5. App shows indicative value ₹420.
6. App recommends Verified Recycler A — ₹120/kg — 5.2 km.
7. Collector selects the recycler.
8. QR / OTP handover.
9. Recycler confirms 3.4 kg, ₹408.
10. Digital receipt KC-2026-000124.
11. Dashboard updates: E-waste formally channelized ✓.

Demo data is seeded so every step works on stage. Step 6 wording ("recommends") means the Smart Matching score below is worth having ready for the demo, even if it starts as a simple best-match pick.

## Data stored

Mapped from your Firestore sketch to Lovable Cloud (Postgres) tables:

- **users** — managed by Lovable Cloud auth.
- **profiles** — user_id, name, phone, role (collector / recycler / admin), language, location, verified.
- **collectors** — collector_id, name, phone, location, verified.
- **recyclers** — recycler_id, name, location, materials, indicative_rates, verification_status, verification_date, rating.
- **transactions** — transaction_id, collector_id, recycler_id, category, weight, condition, indicative_price, final_price, otp_verified, status, timestamp, receipt_number.

Row-level security: a collector reads and writes only their own transactions; recyclers are publicly readable; admin actions are role-checked server-side.

## Later, if time allows

Smart Matching score (price / distance / material / verification with an overall score and a recommended recycler), regional languages.

## Technical notes

- TanStack Start, React, TypeScript, Tailwind; phone-width layout for the collector, full-width for the dashboards.
- Camera via browser media capture, gallery via file input; photos in Lovable Cloud storage.
- QR encodes the transaction id; handover OTP generated and verified server-side.
- Receipt number generated server-side on completion (KC-YYYY-NNNNNN).
- Recycling-green, high-contrast, large-tap-target design suited to outdoor phone use; I'll propose visual directions before building.

## Open question

Login by mobile OTP needs an SMS provider account (e.g. Twilio) connected to the project. If you don't have one yet, I'll build the same screen with a demo OTP flow and swap in real SMS when the provider is ready — tell me which you prefer.
