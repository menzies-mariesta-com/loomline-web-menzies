---
title: Authentication and secrets
description: Session auth, cron secret, pairing codes, and ticket tokens. No org API keys today.
section: connect
order: 1
---

# Authentication and secrets

## Staff and browser sessions

Owners, managers, counter staff, and guests use **session cookies** (better-auth). Sign-in is email and password through the product login flows. There is no documented bearer token or OAuth client for third-party apps to act as a business.

Manager-only HTTP today (analytics CSV export) requires a logged-in session cookie and manager access to the business.

## Secrets that matter for integrators

| Secret / token | Who holds it | Purpose |
|----------------|--------------|---------|
| Session cookie | Browser / same-origin client | Staff and guest authenticated pages |
| `CRON_SECRET` | Platform ops | Header `x-cron-secret` for outbox drain |
| Twilio account credentials | Platform env | SMS send |
| SMTP settings | Platform env | Invite and transactional email |
| Device pairing code | Business Devices UI | Capability URL for `/kiosk/{code}` and `/display/{code}` |
| Ticket public token | Issued with the ticket | Capability URL for `/t/{token}` |
| Invite token | Email link query | Accept invite (not an API key) |

## Org API keys

**Not implemented.** There is no per-business API key, webhook signing secret for outbound events to your server, or integrator OAuth app registration in the product.

If you need machine-to-machine ticket create or call-next, treat that as a planned capability: design against Embedding + realtime + outbound SMS for now, and expect a future authenticated ticket API.
