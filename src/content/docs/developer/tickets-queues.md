---
title: Tickets and queues
description: How tickets move today, and how integrators should work without a public ticket REST API.
section: events
order: 2
---

# Tickets and queues

## No public ticket REST API

Creating tickets, calling next, serving, hold, no-show, transfer, and redirect run as **same-origin staff and kiosk form actions** inside NextUp. There is no documented JSON RPC or OpenAPI for external systems to call these operations with an API key.

The data model allows ticket `source` values including `kiosk`, `web`, `agent`, `appointment`, `api`, and `qr`. Live issuers today use kiosk, web, agent, and appointment. **`api` and `qr` are not issued by any current code path.**

## Integration options that work now

1. **Guest-facing status**: after a ticket exists, open or deep-link `/t/{publicToken}` (QR on the guest page). Read-only; no actions.
2. **Board state**: poll or SSE `/api/realtime/site/{siteId}` for now serving and waiting counts.
3. **SMS side effects**: if a phone is collected when issuing, NextUp enqueues SMS templates (`ticket_issued`, `ticket_called`, `almost_your_turn`). Watch delivery via Twilio webhook + outbox.
4. **Staff operations stay in-product**: keep Agent / kiosk as the system of record until a ticket API ships.

## Planned direction (not available)

A future authenticated ticket API would likely:

- Issue with `source: 'api'`
- Accept queue / service identifiers and optional phone
- Return ticket number + `publicToken`
- Optionally expose call-next and status transitions

Do not build against invented endpoints. Prefer Embedding + realtime + SMS outbox until that lands.
