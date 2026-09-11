# Offline + Voice for the Collector App

## Goal
Make the collector form practical with weak connectivity and easier to fill by speaking in English or Hindi, without changing recycler or admin features.

## Offline collection
- Show a clear online/offline status across collector screens.
- Save the current e-waste form on the device as the collector types.
- When submitted offline, place the pickup in a visible “Waiting to sync” queue instead of losing it.
- Automatically send queued pickups when connectivity returns, while preventing duplicate submissions.
- Show queued pickups separately in History until the database confirms them.
- Keep photo identification online-only for now; when offline, explain that AI is unavailable and retain manual category selection.
- Cache only user-entered drafts and queued pickups—never generate fallback recyclers, rates, prices, or history.

## English and Hindi voice
- Add an English/Hindi selector and microphone control to Add E-Waste.
- Recognize phrases such as “Laptop 3 kilo” and “लैपटॉप 3 किलो,” then fill category and weight for review.
- Keep every field editable; voice input never submits automatically.
- Add a speaker control beside the indicative value. It reads the actual calculated amount only; otherwise it says price information is unavailable.
- Keep manual controls available when the browser lacks speech support or microphone permission is denied.

## Technical details
- Use browser device storage for drafts and a durable pending-pickup queue, scoped to the signed-in collector.
- Give every queued pickup a stable client-generated key and sync sequentially after reconnecting.
- Use the browser Speech Recognition and Speech Synthesis APIs behind client-only capability checks.
- Parse only the approved ten categories and numeric Hindi/English weight phrases; uncertain speech leaves fields unchanged and shows the transcript for correction.
- Reuse the existing transaction service, pricing rules, profile language, and semantic design tokens.

## Verification
- Test online submission, offline queueing, reload persistence, reconnect sync, and duplicate prevention.
- Test English and Hindi speech parsing plus unsupported/denied microphone states.
- Check collector screens at the current mobile viewport and confirm no invented data or prices appear.
