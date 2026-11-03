---
title: Integration overview
description: "How external systems connect to NextUp today: public URLs, HTTP surfaces, and notification outbox."
section: start
order: 1
---

# Integration overview

These guides are for **integrators** who connect business systems, kiosks, displays, and messaging providers to NextUp. They are not contributor docs for cloning or extending the NextUp codebase.

## What you can integrate today

| Surface | Use it for |
|---------|------------|
| Public floor URLs | Embed or open kiosk, TV display, and guest ticket pages with pairing codes or ticket tokens |
| Site realtime HTTP | Poll or stream queue snapshots for a site |
| Notification outbox | SMS and email delivery for ticket and invite events; drain pending rows on a schedule |
| Twilio status webhook | Update SMS delivery status on outbox rows |
| Analytics CSV export | Manager-authenticated download of business metrics |
| Org image uploads URL | Serve cached business logos and similar assets |

## What is not a public REST API yet

NextUp does **not** currently expose org API keys, a signed webhook subscription catalog for your servers, or a public JSON REST API to create tickets and call queues. Ticket lifecycle runs inside the product (staff forms and public kiosk). A ticket source value of `api` exists in the data model for a future path; nothing issues tickets with that source today.

## Honest integration paths

1. **Embed floor surfaces** with pairing codes and guest ticket tokens (see Embedding).
2. **Subscribe to live board state** via the site realtime endpoint (see Public HTTP).
3. **React to guest SMS and invite email** patterns via the notification outbox and channel adapters (see Webhooks and Messaging).
4. **Drive your own UI** by reading guest ticket pages or snapshots, while staff keep calling tickets in NextUp Agent until a ticket API ships.

Continue with Authentication, then Public HTTP and Embedding for the contracts that exist in production code.
