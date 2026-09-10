# Kabadiwala Connect

Built in your phase order, one phase at a time. Governing rule above everything else: **nothing invented is ever shown as real.** An empty screen beats a fabricated one.

## Audit of what exists today

Nothing has been built yet — there are no app files. So: no working features, no test data in place, no real service connected, nothing incomplete to repair. The rules below are baked in from the first line of code rather than retro-fitted.

Impossible in this environment: Firebase (SDK, Firestore, Firebase console). Real phone OTP will use Lovable Cloud's built-in phone sign-in instead. Requires your configuration: an SMS sending account inside Cloud settings before real OTP can send; I'll give you the exact steps when we reach it.

## Honesty rules (apply to every screen)

- No invented recyclers, ratings, distances, authorization or CPCB numbers, reviews, partnerships, or government verification.
- No invented market rates. No invented AI confidence.
- No invented analytics numbers.
- Anything not wired up says so plainly: "AI classification not connected", "Recycler directory not connected", "Live rates not connected".
- Empty means empty: "No verified recyclers available yet.", "Price rate unavailable", "AI classification unavailable", counts of 0, rate N/A.
- Research statistics, if shown, carry their source and sit visually apart from app-generated data.

### Real data vs test data

REAL: authenticated users, their profile, actual transactions, uploaded images, recycler records once genuinely verified, recycler rates once genuinely provided.

TEST: explicitly labelled, never presented as real, only to demonstrate that the flow works.

- **TEST DATA MODE** — an amber badge visible whenever it's on. Any test recycler card carries "TEST DATA — NOT A REAL RECYCLER" and never looks like an authorized organisation.
- **GUIDED TEST MODE** — for the stage demo: a banner reading "🧪 GUIDED TEST MODE — This uses test records only. No real recycler/price claim is being made."
- Test rates entered by hand; the calculation runs for real and the result is labelled "TEST CALCULATION — NOT A MARKET PRICE".
- The same price service later consumes real recycler rates with no rewrite.

## Design system

Colours, used exactly: primary green #16A34A (main actions, add e-waste, success, completed), dark green #166534 (headings, logo accents, active nav), light green #DCFCE7 (success backgrounds, completed cards, selected states), primary blue #2563EB (technology, information, status, links, verification), dark blue #1E3A8A (sparingly, secondary/technical headings), light blue #DBEAFE (informational and AI/process cards), white #FFFFFF (dominant background), text #111827 and #4B5563, border #E5E7EB, light background #F9FAFB, warning #F59E0B, error #DC2626.

Ratio roughly 70% white/neutral, 20% green, 10% blue. Not an all-green site — clean, professional, trustworthy, modern.

Buttons: primary green with white text; secondary white with a green or blue border; red only for destructive actions. No other colours.

- **Collector**: mobile-first, very simple, large tap targets and icons, minimal typing, high contrast, readable outdoors, usable with low digital literacy. "+ ADD E-WASTE" is the strongest thing on the screen.
- **Recycler**: professional desktop dashboard, white background, dark green navigation; green completed, blue information/verification, amber pending, red error/rejection.
- **Admin**: clean and data-oriented, no rainbow charts, green/blue/neutral only.

## Build order

### Phase 1 — Basic application, with REAL mobile OTP

Real SMS OTP only. The code is never displayed, never generated in the app, never stored in front-end code, and there is no mock login.

- Login: ♻ KABADIWALA CONNECT, +91 mobile number, "SEND OTP" → a real SMS arrives → 6-digit entry with Verify and Resend.
- Every state handled: loading, OTP sent, verifying, success, wrong OTP, too many requests, invalid number, no network.
- New number → collector registration (name, preferred language, location). Existing → Collector Home.
- Collector profile stored: user id, name, phone, preferred language, location, created date.
- Protected pages: home, add e-waste, history, profile. Signed-out visitors go back to login.
- Logout.
- Collector Home: greeting with the collector's own name, "What are you collecting?" 2x2 category grid, "+ ADD E-WASTE", recent pickups (empty state until there are any).
- If the SMS account isn't configured yet, I stop and tell you exactly what to set — I don't substitute a fake code.
- Nothing further is built until you've signed in with your own phone and confirmed it worked.

### Phase 2 — Core transaction

- Take Photo: camera, or choose from gallery.
- Category: manual selection from Laptop, Mobile, Monitor, Television, Printer, Keyboard, Mouse, Cable, Battery, Other. Shows "AI classification not connected" until Phase 5.
- Weight in kg; condition Working / Partially Working / Not Working.
- Price: weight × rate × condition factor. With no connected rate source it shows "Live rates not connected" and "Price rate unavailable"; in TEST DATA MODE you enter a test rate and the result is labelled as a test calculation.
- Recyclers: real records if any exist, otherwise "No verified recyclers available yet." Test recyclers appear only in TEST DATA MODE, clearly labelled.

### Phase 3 — Backend

Lovable Cloud auth, tables and photo storage; collector, recycler and transaction records; row-level security. No seeded pretend organisations — the recycler table starts empty apart from clearly labelled test rows behind test mode.

### Phase 4 — Handover

- Handover: recycler name, expected weight, indicative value, a QR code for the recycler to scan, or a 6-digit handover OTP, "CONFIRM HANDOVER".
- Digital Receipt: "✓ HANDOVER COMPLETE" with item, confirmed weight, confirmed price, recycler, date, transaction ID (KC-YYYY-NNNNNN), and ticks that reflect what actually happened.
- Transaction history.

### Phase 5 — AI

Camera → preprocessing → vision model → the model's own category and its own confidence, displayed verbatim. No invented percentage; if no result comes back, "AI classification unavailable" and manual selection from the ten categories. Collector always confirms or changes it. AI never produces a price.

Your Flutter/TensorFlow Lite training pipeline maps onto the same contract here — a model you train later can replace the call without touching a screen.

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

- Online/offline indicator; pickups and photos captured offline upload automatically on reconnect.
- Rates and recycler list cached, still labelled honestly when unverified.
- Voice: 🎤 "Laptop 3 kilo hai" → speech-to-text → fills category and weight, correctable.
- Speaks back: if a real calculated price exists, the actual amount (e.g. "Aapka estimated price ₹420 hai"); otherwise "Price information is currently unavailable." Hindi and English first.

### Phase 7 — Recycler dashboard

Sidebar: Dashboard, Requests, Materials, Rates, History, Profile. Counts and lists come from real stored records, zero when there are none. Requests: Accept → Confirm weight and price → Handover (QR or OTP) → Complete. Rates entered by the recycler themselves become the real rates the collector estimate uses.

### Phase 8 — Admin, testing and demo

- Admin: view/verify collectors; verify recycler authorization and set the verification date; monitor transactions; analytics computed only from stored records — Total Transactions 0, Total E-Waste 0 kg, Formal Channelization Rate N/A, Active Collectors and Verified Recyclers as actual counts.
- Bug fixing, UI polish, deployment, prototype URL and QR code.

## The stage demo

Runs end to end under the GUIDED TEST MODE banner, with test records labelled as such:

1. Collector logs in (real OTP). 2. Photographs a laptop. 3. AI returns its own category and its own confidence (no invented percentages shown). 4. Enters weight and condition. 5. Test calculation shows the indicative value. 6. A labelled test recycler is matched. 7. Collector selects it. 8. QR/OTP handover. 9. Recycler confirms weight and price. 10. Digital receipt with its transaction ID. 11. Dashboard counts update from those real stored records.

## Data stored

- **users** — Lovable Cloud auth.
- **profiles** — user id, name, phone, role (collector / recycler / admin), language, location, verified.
- **collectors** — collector id, name, phone, location, verified.
- **recyclers** — id, name, location, accepted materials, rates, verification status, verification date, plus an `is_test` flag driving the test label.
- **transactions** — id, collector, recycler, category, weight, condition, indicative price, final price, otp verified, status, timestamps, receipt number, `is_test` flag.

Row-level security: collectors read and write only their own records; admin actions role-checked server-side.

## Code structure

Business logic lives in separate services, never in the screens: authService, ewasteClassifier, priceService, matchingService, transactionService, offlineService, notificationService.

## Later, if time allows

Smart Matching score (price / distance / material / verification, with an overall score) — only using real recycler attributes, never invented ones. Regional languages.
