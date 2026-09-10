# Kabadiwala Connect

A single responsive web app with two sides: a mobile-first collector app and a recycler dashboard, sharing one backend.

## Note on the requested technologies

This builder makes web applications. Flutter, Firebase, SQLite/Drift and a Python/TensorFlow service can't run here. Equivalents used instead:

| You asked for | Built as |
| --- | --- |
| Flutter collector app | Mobile-first web app (installable, works on a phone) |
| React + TypeScript dashboard | Same (React + TypeScript) |
| Firebase / Firestore | Lovable Cloud database + file storage |
| Firebase Auth | Lovable Cloud login (email, optional Google) |
| Python + TensorFlow Lite | AI image classification via Lovable AI |
| Flutter QR + OTP | Web QR code + 6-digit OTP handover |
| Speech-to-Text / TTS | Browser voice input and spoken prompts |
| Firebase Hosting / GitHub | Lovable publishing + GitHub sync |

## Collector side

- Sign up / sign in, pick "Collector".
- New pickup: take or upload a photo of the e-waste.
- AI identifies the category (phone, laptop, battery, cable, appliance, etc.) with a confidence note; collector can correct it.
- Enter weight and condition (working / dead / scrap), with voice input as an option.
- Indicative price shown instantly from the rate table, adjusted for condition.
- Browse verified recyclers nearby, send the request to one.
- Track status: pending, accepted, scheduled, completed.
- Show QR code and OTP at handover; digital receipt afterwards.
- History of all past pickups and earnings.

## Recycler side

- Sign in, pick "Recycler"; profile with verification badge and accepted categories.
- Inbox of incoming requests with photo, category, weight, condition and the collector's asking price.
- Accept or reject; on accept, confirm final weight and price.
- Scan the collector's QR or enter the OTP to confirm the handover.
- Digital receipt generated for both sides.
- Dashboard: volumes by category, totals, completed transactions.

## Data stored

Profiles with role, recycler details, category rate table, pickup requests (photo, AI result, weight, condition, prices, status, OTP), and completed transaction records with receipt numbers. Each person only sees their own records; recyclers see requests sent to them.

## Screens

Landing, sign in / sign up with role, collector home + new pickup flow + request detail + history, recycler dashboard + request detail + handover verification + stats, shared receipt page.

## Technical notes

- TanStack Start, React, TypeScript, Tailwind.
- Lovable Cloud (Postgres) with row-level security; storage bucket for photos.
- AI category detection through the Lovable AI gateway, called from a server function.
- OTP generated server-side per request, verified server-side; QR encodes the request id.
- Voice via the browser Web Speech API where supported, with typed fallback.

## Design

I'll propose three visual directions before building, unless you already have a brand palette in mind.

## Open question

Should the first version include real accounts and saved records (recommended), or a demo with sample data only?
