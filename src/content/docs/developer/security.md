---
title: Security and retries
description: Auth gaps, outbox retry limits, and how to harden cron and Twilio callbacks.
section: events
order: 4
---

# Security and retries

## Current posture

| Endpoint | Protection |
|----------|------------|
| `/api/cron/outbox` | Shared secret header `x-cron-secret` |
| `/api/webhooks/twilio` | **No** Twilio signature validation in current code |
| `/api/realtime/site/{siteId}` | **Unauthenticated**; treat `siteId` as a secret capability |
| `/api/export/analytics` | Session + manager role |
| `/api/uploads/orgs/{key}` | Public asset; key must match upload filename pattern |
| Pairing codes / ticket tokens | Capability URLs; rotate or revoke to invalidate |

## Outbox retries

- Immediate send failure → row stays `pending` with `errorMessage`.
- Cron drain retries pending rows due by `scheduledAt`.
- On drain, after **5 attempts**, status becomes `failed`.
- No separate retry delay algorithm beyond `scheduledAt` (appointment reminders schedule ahead).

## Recommendations for operators

1. Keep `CRON_SECRET` long and rotate when staff change.
2. Restrict who can learn site UUIDs; realtime has no extra auth.
3. Rotate device pairing codes if a kiosk/TV URL leaks; revoke inactive devices.
4. Prefer private networks or edge rules in front of Twilio webhook until signature verification is added.
5. Do not expose manager session cookies to third-party scripts; analytics export is session-bound.

## Rate limits

There is **no** documented public API rate-limit layer for integrator traffic. Realtime reconnects every ~25s by design for serverless. Outbox drain processes at most 50 rows per call. Size your cron accordingly.
