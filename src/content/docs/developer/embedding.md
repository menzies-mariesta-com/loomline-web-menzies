---
title: Embedding floor surfaces
description: Kiosk, TV display, and guest ticket URLs with pairing codes and public tokens.
section: surfaces
order: 1
---

# Embedding floor surfaces

Public floor URLs are the main way to integrate screens and guest status into your venue or partner apps.

## URL patterns

| Surface | Path | Capability |
|---------|------|------------|
| Kiosk | `/kiosk/{pairingCode}` | Take a number for bound (or all site) queues |
| TV display | `/display/{pairingCode}` | Now serving / upcoming / missed + optional voice |
| Guest ticket | `/t/{publicToken}` | Read-only status + QR for one ticket |

Pairing codes are created under **Devices** in the business UI (8-character uppercase hex). Regenerating a code invalidates the previous kiosk/TV URL immediately. Revoking a device makes public URLs fail until reactivation.

## Kiosk

- Device type must be **kiosk** and active.
- Guests pick a service/queue and issue a ticket (`source: kiosk`).
- Optional phone can be accepted server-side; the default kiosk UI may not collect it.
- Response includes ticket number and `publicToken` for `/t/…`.

## Display

- Device type must be **tv** and active.
- Loads site snapshot; filters by bound queues when set.
- Client uses `/api/realtime/site/{siteId}` (SSE + short poll).
- Voice uses the business voice profile from Config.

## Guest ticket

- No query parameters.
- Shows number, status, queue position, counter label when relevant, and a QR of the same URL.
- Read-only (no cancel or transfer from this page).

## Agent stations

Agent desks are **not** public pairing URLs. Create an Agent device with station email/password; staff sign in and open Agent in the product. Optional `?counterId=` prefills the counter for signed-in staff.

## Embedding tips

- Prefer iframe or dedicated browser kiosk mode on locked-down devices.
- Store pairing codes in your MDM or device config; rotate via Devices when a unit is reassigned.
- Deep-link guests to `/t/{token}` from SMS bodies NextUp already sends when a phone is present.
