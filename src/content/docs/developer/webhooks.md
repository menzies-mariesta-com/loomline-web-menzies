---
title: Webhooks and notification outbox
description: How NextUp queues SMS and email, drains the outbox, and receives Twilio status callbacks.
section: events
order: 1
---

# Webhooks and notification outbox

NextUp does not yet push signed business events to *your* HTTPS endpoint. The outbound path is an **internal notification outbox**. The inbound webhook that exists today is Twilio SMS status.

## Outbox row shape

Each queued notification stores roughly:

- `channel`: `sms` | `telegram` | `viber` | `discord` | `email` | `push`
- `toAddress`: phone, email, or chat target string
- `templateKey`: logical template name
- `payload`: JSON object (often `{ body: "…" }` for SMS)
- `status`: `pending` | `sending` | `sent` | `failed` | `cancelled`
- `providerMessageId`, `errorMessage`, `attempts`, `scheduledAt`, `sentAt`

## What enqueues today

| Trigger | Channel | templateKey | Notes |
|---------|---------|-------------|-------|
| Ticket issued with phone | sms | `ticket_issued` | Body includes track URL `/t/{token}` |
| Ticket called with phone | sms | `ticket_called` | |
| Almost your turn with phone | sms | `almost_your_turn` | |
| Appointment created with phone | sms | `appointment_reminder` | Scheduled about 1 hour before start |
| Owner / team invite | email | `owner_invite` / `team_invite` | Invite URL in payload |

Ticket flows use SMS `body` text. Rich HTML ticket email builders exist in the product but are not wired into those guest SMS paths today.

## Delivery and drain

1. Many paths enqueue and attempt immediate send.
2. Failures leave the row `pending` with an error message.
3. `GET`/`POST` `/api/cron/outbox` drains due pending rows (batch of 50).
4. After **5 failed attempts** on drain, status becomes `failed`.

There is no exponential backoff beyond `scheduledAt`.

## Inbound: Twilio

Point Twilio’s messaging status callback to `/api/webhooks/twilio`. See Public HTTP and Security for auth gaps and retry behavior.
