---
title: Messaging channels
description: SMS, email, Telegram, Viber, Discord toggles and how adapters behave for integrators.
section: events
order: 3
---

# Messaging channels

Businesses toggle intended channels under **Config** in the product UI:

- SMS
- Telegram
- Viber
- Discord
- Email
- Guest public signup (separate flag)

## Adapter matrix (today)

| Channel | Adapter behavior |
|---------|------------------|
| email | SMTP when configured; HTML invite templates for team/owner invites |
| sms | Twilio when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_SMS` are set; otherwise console log only |
| telegram / viber / discord / push | Console log only (`loggedOnly`). No live HTTP clients |

## Important gaps for integrators

- Config toggles are **stored** but **not enforced** when ticket SMS is enqueued. Delivery depends on phone presence and platform env, not the checkbox alone.
- There is no webhook from NextUp to your Telegram/Viber/Discord bot. To bridge chat apps, either wait for real adapters or consume SMS/email side effects and your own systems.
- Appointment and ticket guest alerts use SMS `payload.body` strings, not the full HTML email template catalog.

## Hooking in

Practical approaches today:

1. Ensure Twilio + outbox drain are configured if you rely on SMS.
2. Use Twilio status callbacks into `/api/webhooks/twilio`.
3. For chat apps, treat Config flags as product intent and implement your own delivery by reading business processes outside NextUp until native adapters ship.
4. For invites, rely on email template keys `team_invite` / `owner_invite` already sent by the product.
