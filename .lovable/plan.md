# Kabadiwala Connect

Phase 1: the collector app end-to-end, Screens 1–9. Phase 2: the recycler dashboard. Admin panel, smart matching, offline sync and voice come later.

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

**9. Digital Receipt** — "✓ HANDOVER COMPLETE" with item, final weight, final price, recycler, date, transaction ID (KC-YYYY-NNNNNN), and verification ticks (recycler verified, weight confirmed, price confirmed), "VIEW RECEIPT". This becomes the traceability record.

## Data stored

Mapped from your Firestore sketch to Lovable Cloud (Postgres) tables:

- **users** — managed by Lovable Cloud auth (phone, email, etc.).
- **profiles** — user_id, name, phone, role (collector / recycler / admin), language, location, verified.
- **collectors** — collector_id (links to user), name, phone, location, verified.
- **recyclers** — recycler_id, name, location, materials (array of accepted categories), indicative_rates (per category), verification_status, verification_date, rating.
- **transactions** — transaction_id, collector_id, recycler_id, category, weight, condition, indicative_price, final_price, otp_verified, qr_scanned, status (pending / accepted / completed / cancelled), timestamp, receipt_number, completed_at.

Row-level security: a collector reads and writes only their own transactions and collector profile; recyclers are publicly readable.

## Phase 2 — Recycler Dashboard (desktop web)

Sidebar layout: Dashboard, Requests, Materials, Rates, History, Profile.

- **Dashboard** — today's requests count, pending count, completed count, and a "Collection Requests" list showing category, weight and indicative price (e.g. Laptop 3.5kg ₹420).
- **Requests** — full queue with Accept / Reject; then Confirm weight and price, Handover (scan the collector's QR or issue the OTP), and Complete.
- **Materials** — which e-waste categories this recycler accepts.
- **Rates** — editable indicative ₹/kg per category; feeds the collector price estimate.
- **History** — completed transactions with receipts.
- **Profile** — name, location, verification status.

Status flow on a transaction: pending → accepted → confirmed → completed (or rejected/cancelled). Only the assigned recycler can act on a request.

## Phase 3 — Admin Dashboard (desktop web)

Simple admin console:

- **Collectors** — list collectors, view details, mark as verified.
- **Recyclers** — list recyclers, verify authorization, set verification date and status.
- **Transactions** — monitor all transactions by status, recycler, collector, date.
- **Analytics** — total e-waste collected, formal channelization metric, active collectors count, active recyclers count.

## Phase 4 — AI image classification (only after the basic app works)

Ten categories: Laptop, Mobile, Monitor, Television, Printer, Keyboard, Mouse, Cable, Battery, Other.

Flow: camera → image preprocessing (resize/clean) → model → category + confidence → user confirms (Screen 4).

Your training pipeline (collect → clean/resize → label → train → test → export TensorFlow Lite → embed in the app) targets an on-device Flutter model. In this web build the same contract is served by a vision model called through Lovable AI from a server function, returning one of the ten categories plus a confidence score. If you later train your own model, it can be swapped in behind the same call without touching any screen.

## Phase 5 — Offline mode

The collector app keeps working with no internet.

```text
            INTERNET?
        ┌───────┴───────┐
       YES              NO
        │               │
     Cloud DB      Local device store
        │          (pickup + photo queued)
        └───────┬───────┘
                ↓
        connection returns
                ↓
            AUTO SYNC
                ↓
             Cloud DB
```

- Online/offline indicator in the app header.
- Pickups captured offline (category, photo, weight, condition, price estimate) are saved on the device.
- When the connection returns, queued records and photos upload automatically and the collector sees a "synced" confirmation.
- Recycler list and rates are cached so price estimates still work offline.
- Conflicts resolved by keeping the device record and assigning the transaction id/receipt number at sync time.

Instead of the SQLite/Drift store from your Flutter spec, the web app uses the browser's on-device storage (IndexedDB) with a service worker, which plays the same role.

## Later phases

Smart Matching score (price / distance / material / verification with an overall score and recommendation), Hindi + English voice input and spoken price, full transaction history browse/search.

## Technical notes

- TanStack Start, React, TypeScript, Tailwind; phone-width layout centred on desktop.
- Lovable Cloud for auth, Postgres tables above, and a storage bucket for photos.
- Camera via browser media capture, gallery via file input.
- Category detection: server function calling a vision model through Lovable AI; response constrained to supported categories (laptop, mobile, monitor, television, printer, keyboard, mouse, cable, battery, other) plus a confidence score.
- QR encodes the transaction_id; handover OTP generated and verified server-side.
- Receipt number generated server-side on completion (KC-YYYY-NNNNNN).
- Sample verified recyclers with indicative rates seeded so the demo flow works immediately.
- Recycling-green, high-contrast, large-tap-target design suited to outdoor phone use; I'll propose visual directions before building.

## Open question

Login by mobile OTP needs an SMS provider account (e.g. Twilio) connected to the project. If you don't have one yet, I'll build the same screen with a demo OTP flow for now and swap in real SMS when the provider is ready — tell me which you prefer.
