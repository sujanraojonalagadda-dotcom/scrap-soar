# Kabadiwala Connect — Phase 1: Collector App

Build the collector app only. The recycler dashboard, AI image classification and the rest of the earlier flow come later.

## Technologies note

This builder makes web applications, so Flutter and Firebase aren't possible here. The collector app is built as a mobile-first web app (looks and works like an app on a phone) with Lovable Cloud providing login, database and storage. For login with mobile number, see "Login" below.

## Login — Screen 1 (as sketched)

- Branded screen: ♻ KABADIWALA CONNECT.
- Single field: mobile number with +91 prefix.
- "Send OTP" button, then a second step with a 6-digit OTP box and "Verify" + "Resend".

Two ways to power the OTP:

1. **Email/password instead (no SMS cost)** — simplest and free, but doesn't match the sketch.
2. **Phone OTP via Lovable Cloud phone sign-in** — matches the sketch; SMS sending needs a messaging provider (Twilio/MessageBird) configured, which involves cost and your own provider account.

I'll plan for option 2 (phone OTP) since it matches your design. If SMS setup turns out to be unavailable or you change your mind, option 1 is a drop-in swap and takes minutes.

## After login

- First-time collectors create a profile: name, area/pincode.
- Home screen: "New Pickup" button and a list of past requests (saved per account).
- Everything else from the original flow (photo upload, weight, price, recycler matching, QR/OTP handover, receipts) is deferred to later phases.

## Technical notes

- TanStack Start, React, TypeScript, Tailwind; mobile-first layout sized like your sketch.
- Lovable Cloud: phone auth, a profiles table (name, area, role=collector), row-level security so each collector sees only their own data.
- Mobile number validated (+91, 10 digits); OTP is 6 digits with expiry and resend throttling.
- Clean, trustworthy design in the spirit of the sketch (recycling green); I'll propose visual directions before building.

## Open questions

1. Phone OTP needs an SMS provider account (e.g. Twilio) — do you have one, or should we start with email login for now and add phone OTP later?
2. OK that AI photo classification is postponed to a later phase?
