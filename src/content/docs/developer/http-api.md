---
title: Public HTTP surfaces
description: The five HTTP endpoints NextUp exposes today, with auth and response shapes.
section: connect
order: 2
---

# Public HTTP surfaces

NextUp’s HTTP API is intentionally thin. These are the routes under `/api` that exist in the app today.

## Outbox drain

`POST` or `GET` `/api/cron/outbox`

| | |
|---|---|
| Auth | Header `x-cron-secret` must match `CRON_SECRET` |
| Effect | Processes up to 50 pending notification outbox rows; also runs trial expiry |
| Response | JSON `{ processed, sent, failed, trials: { businesses, memberships } }` |

Call this from your scheduler (platform cron is not bundled in-repo). Unauthorized requests return `401`.

## Trial expiry

`POST` or `GET` `/api/cron/trials`

| | |
|---|---|
| Auth | Header `x-cron-secret` must match `CRON_SECRET` |
| Effect | Marks businesses with past `trial_ends_at` as `trial_expired`, suspends their memberships, purges expired trial OTP rows |
| Response | JSON `{ businesses, memberships, otpsPurged }` |

Console access is also blocked on load via `enforceTrialAccess` when a trial has ended.

## Twilio SMS status

`POST` `/api/webhooks/twilio`

| | |
|---|---|
| Auth | None in current code (no signature validation) |
| Body | `application/x-www-form-urlencoded` Twilio fields: `MessageSid`, `MessageStatus`, optional `ErrorMessage` |
| Effect | Updates matching outbox row by `providerMessageId` |
| Response | Plain text `ok` |

Map: `delivered` / `sent` → sent; `failed` / `undelivered` → failed.

## Site realtime snapshot

`GET` `/api/realtime/site/{siteId}`

| | |
|---|---|
| Auth | None (anyone with the site UUID can read) |
| `?once=1` | Single JSON snapshot |
| Omit query | SSE `text/event-stream`; snapshot every ~2s; connection closes after ~25s (reconnect) |

Snapshot fields include active queues, now serving, waiting list, waiting counts by queue, today’s missed (no-show) tickets, and `updatedAt`.

TV displays use this endpoint (SSE plus a short poll fallback).

## Analytics CSV

`GET` `/api/export/analytics?businessId=…&days=7`

| | |
|---|---|
| Auth | Session cookie; caller must be a manager for that business |
| Response | CSV attachment (`metric,value` rows) |

## Org upload asset

`GET` `/api/uploads/orgs/{key}`

| | |
|---|---|
| Auth | Public, cacheable |
| Key | Pattern like `org-…-….jpg` / `.png` / `.webp` / `.gif` |
| Cache | Long `Cache-Control` with stale-while-revalidate |

## Auth HTTP

better-auth also mounts its usual `/api/auth/*` handlers for the product session. Integrators should use the documented login UI, not treat that surface as a QMS API.
