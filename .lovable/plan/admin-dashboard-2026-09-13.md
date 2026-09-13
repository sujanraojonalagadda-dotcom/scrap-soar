# Admin Dashboard

## Goal
Build the final management area for Kabadiwala Connect so the authorized administrator can verify collectors and recyclers, monitor handovers, and view real platform totals.

## What will be built
- Add a protected administrator dashboard with totals for e-waste collected, formal channelization, active collectors, active recyclers, pending verifications, and recent transactions.
- Add Collector management with search, verification status, and verify/unverify actions.
- Add Recycler management with authorization status, accepted materials, rates, and verification date; verification records the real date.
- Add Transaction monitoring with receipt number, participants, category, weights, price, payment, verification, and status.
- Route the currently signed-in mobile account to the administrator area after login while preserving normal collector and recycler routing for everyone else.
- Provide clear empty, loading, forbidden, and failure states without sample records or fabricated analytics.

## Security and data rules
- Keep roles in the dedicated role table, not profiles or browser storage.
- Enforce administrator access in database policies and authenticated server operations, not only by hiding navigation.
- Calculate every metric from stored records. Formal channelization will be `completed transaction weight ÷ all transaction weight × 100`; if there is no recorded weight, show no percentage rather than inventing one.
- Keep personal and transaction data unavailable to non-admin accounts.

## Technical details
- Add authenticated admin server functions for dashboard reads and verification updates.
- Add a reusable admin layout and the dashboard, collectors, recyclers, and transactions pages.
- Use the existing visual tokens and responsive controls so the dashboard works on the current mobile viewport and desktop.
- Test direct unauthorized access, administrator routing, verification actions, transaction visibility, empty states, and responsive layout.
