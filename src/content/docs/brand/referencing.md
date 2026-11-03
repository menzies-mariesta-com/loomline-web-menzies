---
title: How to reference NextUp
description: Website details, naming, official site links, docs paths, and attribution when you mention NextUp in partner or integrator materials.
section: brand
order: 2
---

# How to reference NextUp

This page is for integrators and partners who mention NextUp in apps, docs, README files, or press. Use the public site origin from your deployment `ORIGIN` (no trailing slash), then append the paths below. For Soft Wash colors, type, and logo rules, see Brand guidelines. For file paths, see Visual assets.

## Website details

Share these facts when a directory, partner page, or press kit needs a short product blurb:

| Field | Value |
|-------|-------|
| Product name | NextUp |
| Full name | NextUp QMS |
| Design language | Soft Wash |
| Parent context | <a href="https://menzies.mariesta.com/" class="link-inherit" target="_blank" rel="noopener noreferrer">Menzies</a> (corporate only; lead with NextUp for customers) |
| Home URL | `{ORIGIN}/` |
| Docs hub | `{ORIGIN}/docs` |
| Brand guidelines | `{ORIGIN}/docs/brand/overview` |
| Social / OG image | `{ORIGIN}/og-nextup.png` |
| Favicon | `{ORIGIN}/favicon.svg` |

Replace `{ORIGIN}` with the canonical host (for example `https://your-nextup-host`). Never invent a third-party mirror as the official site.

## Naming in prose

- First mention: **NextUp** (or **NextUp QMS** if the queue context is unclear).
- Later mentions: NextUp is enough.
- Soft Wash describes the look and feel, not a second product name.
- <a href="https://menzies.mariesta.com/" class="link-inherit" target="_blank" rel="noopener noreferrer">Menzies</a> is parent brand context only when you need corporate attribution; customer-facing floor copy should lead with NextUp.

## Official URLs

Replace `https://example.com` with your real `ORIGIN`.

| Intent | Path | Example |
|--------|------|---------|
| Home / product | `/` | `https://example.com/` |
| Pricing | `/pricing` | `https://example.com/pricing` |
| Docs hub | `/docs` | `https://example.com/docs` |
| Business docs | `/docs/business/...` | `https://example.com/docs/business/overview` |
| Developer docs | `/docs/developer/...` | `https://example.com/docs/developer/overview` |
| Brand guidelines | `/docs/brand/overview` | `https://example.com/docs/brand/overview` |
| How to reference | `/docs/brand/referencing` | `https://example.com/docs/brand/referencing` |
| Visual assets | `/docs/brand/assets` | `https://example.com/docs/brand/assets` |
| Sponsors and partners | `/docs/partners/overview` | `https://example.com/docs/partners/overview` |
| Investor materials | `/docs/investors/overview` | `https://example.com/docs/investors/overview` |
| Privacy | `/privacy` | `https://example.com/privacy` |
| Terms | `/terms` | `https://example.com/terms` |
| Sign in | `/auth/login` | `https://example.com/auth/login` |

Do not deep-link guests into private console paths (`/admin`, `/b/{id}`, `/workspaces`) as if they were marketing pages. Those require a signed-in session.

Floor surfaces (kiosk, display, guest ticket) are operational URLs with pairing codes or tokens. Treat them as product runtime, not brand collateral. See Embedding floor surfaces.

## Attribution line

When you need a short credit:

> Powered by NextUp. Soft Wash QMS for calm queues.

Or a link-only line:

> Learn more at [NextUp](https://example.com/).

If you reuse the OG image or favicon in a directory listing, keep the link to the home or docs URL next to the mark.

## Link style

- Prefer descriptive anchors: "NextUp pricing", "NextUp developer docs".
- Avoid "click here".
- Use HTTPS absolute URLs in email, PDFs, and third-party catalogs so the destination survives copy-paste.

## What not to claim

- Do not claim an official partnership unless NextUp has agreed in writing.
- Do not imply that a public ticket API or org API keys exist if you are only embedding floor URLs today.
- Do not point "NextUp docs" at a third-party mirror as the canonical source.
