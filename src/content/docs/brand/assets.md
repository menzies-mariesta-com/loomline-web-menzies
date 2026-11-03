---
title: Visual assets
description: Public logo, favicon, Open Graph, and email hero paths, plus absolute URL patterns from ORIGIN.
section: brand
order: 3
---

# Visual assets

Public brand files live under the site root (the SvelteKit `static/` tree). Build absolute URLs from the deployment `ORIGIN` environment variable, with no trailing slash.

## Absolute URL pattern

```
{ORIGIN}{path}
```

Examples (local default `ORIGIN=http://localhost:4001`):

| Asset | Path | Absolute example |
|-------|------|------------------|
| Open Graph PNG | `/og-nextup.png` | `http://localhost:4001/og-nextup.png` |
| Open Graph SVG source | `/og-nextup.svg` | `http://localhost:4001/og-nextup.svg` |
| Favicon SVG | `/favicon.svg` | `http://localhost:4001/favicon.svg` |
| Favicon ICO | `/favicon.ico` | `http://localhost:4001/favicon.ico` |
| Favicon 32 PNG | `/favicon-32.png` | `http://localhost:4001/favicon-32.png` |
| Apple touch icon | `/apple-touch-icon.png` | `http://localhost:4001/apple-touch-icon.png` |
| Email queue hero | `/email/hero-queue.svg` | `http://localhost:4001/email/hero-queue.svg` |

Production must set `ORIGIN` to the canonical public host (for example `https://your-nextup-host`). Marketing pages, docs SEO, sitemap entries, and HTML email all derive absolute links from that value.

## Which file to use

| Use case | Prefer |
|----------|--------|
| Social share / `og:image` / `twitter:image` | `/og-nextup.png` |
| Browser tab / PWA-style mark | `/favicon.svg` (ICO as legacy fallback) |
| Dense email header mark | `/favicon-32.png` |
| Soft Wash email hero under the header | `/email/hero-queue.svg` |
| Editable vector OG layout | `/og-nextup.svg` (ship PNG for crawlers) |

## Wordmark in HTML

When you need the word NextUp as text (partner page, email subject art), use Fraunces semibold and ink `#1c2a28` on a mint or cream field. That matches the marketing nav wordmark.

## Hotlinking and caching

- Prefer copying assets into your own CDN for high-traffic catalogs, and still link attribution to the NextUp home URL.
- If you hotlink production `ORIGIN`, expect cache headers from the host; do not append cache-busting query strings that break social crawlers for OG images.
- Do not hotlink paths under `/uploads/` (tenant org images). Those are customer assets, not NextUp brand.

## Checklist before publish

1. `ORIGIN` is the canonical HTTPS host in that environment.
2. OG and Twitter tags point at `{ORIGIN}/og-nextup.png` and the file returns 200.
3. Favicon link tags resolve on the same origin.
4. Email templates resolve logo and hero through the same origin helper pattern used by NextUp mail (path under site root, not a relative path from the mail client).
