# Kabadiwala Connect — Phase 1: Collector App

Build the collector app only, screen by screen as you share them. Recycler dashboard comes later.

## Technologies note

This builder makes web applications, so Flutter and Firebase aren't possible here. The collector app is a mobile-first web app (looks and works like an app on a phone) with Lovable Cloud providing login, database and storage.

## Screen 1 — Login (as sketched)

- Branded screen: ♻ KABADIWALA CONNECT.
- Mobile number field with +91 prefix, "Send OTP" button.
- Second step: 6-digit OTP box, "Verify" and "Resend".

Phone OTP via Lovable Cloud phone sign-in matches this sketch; SMS sending needs a messaging provider (e.g. Twilio) tied to your account. If that's not available, email login is a drop-in swap — see the open question below.

## Screen 2 — Collector Home (as sketched)

- Greeting: "Hello, Ramesh 👋" (real name from the collector's profile).
- "What are you collecting?" with a 2x2 grid of category cards: 📱 Mobile, 💻 Laptop, 🖥️ Monitor, 🔌 Other — tap to select.
- "ADD E-WASTE" button at the bottom to start a new pickup with the selected category.
- Past requests list below, saved per account.

## Screen 3 — Take Photo (as sketched)

- Header: "Identify E-Waste".
- Large camera preview / placeholder area.
- "TAKE PHOTO" button, plus "Or select from gallery" link.
- Photo is uploaded to storage; in this phase it can be used as-is or fed to the AI in Screen 4.

## Screen 4 — AI Result (as sketched)

- Header: "E-Waste Identified".
- Preview of the captured image.
- AI-detected category (e.g. 💻 Laptop) and confidence percentage.
- User can tap "YES" to confirm or "CHANGE" to pick/enter the correct category.
- AI maps image → category only. Price calculation is separate and happens in the next step.

## Screen 5 — Weight & Condition (as sketched)

- Header: "E-Waste Details".
- Read-only category from Screen 4.
- Weight input with "kg" suffix (numeric).
- Condition radio group: Working, Partially Working, Not Working.
- "CONTINUE" button.

## Profile

- First-time collectors complete a short profile: name, area/pincode.
- Role is stored as "collector" server-side, separate from login credentials.

## Technical notes

- TanStack Start, React, TypeScript, Tailwind; mobile-first layout matching your sketches (centred phone-width card on desktop).
- Lovable Cloud: phone auth (or email fallback), profiles table, pickup requests table, row-level security so each collector only sees their own data.
- Mobile number validated (+91, 10 digits); 6-digit OTP with expiry and resend throttling.
- Camera works from the phone browser via the standard HTML media capture; gallery via file input. Photos are uploaded to Lovable Cloud storage.
- AI image classification: Lovable AI Gateway call from a server function, using a vision model. Returns one of the supported categories and a confidence score.
- Clean, trustworthy recycling-green design in the spirit of the sketch; I'll propose visual directions before building.

## Open questions

1. Phone OTP needs an SMS provider account (e.g. Twilio) — do you have one, or start with email login and add phone OTP later?
2. Keep sharing screen sketches as you make them — I'll fold each into the plan.
