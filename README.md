# NextUp

Multi-tenant **queue management system (QMS)** for lobbies, counters, and guest journeys. Guests take a number at a kiosk or via QR, agents call tickets from a desk, and TVs announce who is next. One SaaS, many businesses, clear roles.

This repo is the **NextUp web app**: Soft Wash UI on **SvelteKit**, deployed to **Netlify**, with **Neon Postgres**, **Drizzle ORM**, and **better-auth**.

## Table of contents

- [What is NextUp](#what-is-nextup)
- [Stack](#stack)
- [Features](#features)
- [Roles](#roles)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Key URLs](#key-urls)
- [Floor test happy path](#floor-test-happy-path)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Deploy (Netlify)](#deploy-netlify)
- [i18n and theme](#i18n-and-theme)

---

## What is NextUp

NextUp is a multi-industry queue and appointment product:

- **Marketing site** for product and pricing
- **Platform admin** for tenants, industry templates, invites, and platform config
- **Business console** for sites, services, queues, counters, team, devices, and messaging/voice
- **Floor surfaces**: kiosk (take a number), TV display (now serving + voice), agent desk (call / serve / complete)
- **Guest ticket page** at a public token URL (`/t/{token}`)

UI uses **Soft Wash** (`@menzies-mariesta-com/menzies-design-wash-ui`) with daisyUI 5 and Tailwind 4. Auth is **better-auth** (email/password). Data lives on **Neon Postgres** via Drizzle. Hosting target is **Netlify** (`@sveltejs/adapter-netlify`).

---

## Stack

| Area | Choice |
|------|--------|
| App | SvelteKit 3 (`@sveltejs/kit` next / 3.x), Svelte 5 (runes) |
| UI | daisyUI **5.7.9**, Tailwind CSS **4**, Soft Wash (`menzies-design-wash-ui`) |
| Icons | `@lucide/svelte` **1.28.0** |
| Charts | Local `WashChart` wrapper; dynamic **ApexCharts** on business Home |
| Data | Drizzle ORM, Neon serverless Postgres (`@neondatabase/serverless`) |
| Auth | better-auth (+ `auth` CLI for schema generation) |
| i18n | Paraglide (`en`, `my`, `ja`) via `@inlang/paraglide-js` |
| Forms / dates | Cally date ranges in CRUD tables |
| Deploy | Netlify adapter, `netlify.toml` |
| Optional | Twilio SMS, SMTP invites, Neon Object Storage (S3) for org images |

Dev and preview bind to port **4001** (`vite.config.ts`, `strictPort: true`).

---

## Features

### Marketing (public)

- Home (`/`) and pricing (`/pricing`)
- Auth: login, logout, accept invite
- Floor public surfaces: kiosk, TV display, guest ticket status

### Platform admin (`/admin`)

- Overview, businesses, industry templates, invites, platform team, platform config
- Account under `/admin/account`
- Legacy paths `/admin/packs` and `/admin/settings` **301** to templates/config

### Business console (`/b/{businessId}/…`)

- **Home**: KPIs and analytics charts (volume, status, queue, service, wait, source)
- Floor setup: sites, departments, destinations, timelines, counters, services, queues
- Operations: tickets, appointments, agent desk
- Devices: TV, kiosk, agent station accounts
- Team invites and memberships (owners/managers)
- Config: messaging channels (SMS, Telegram, Viber, Discord, email, etc.) and multi-locale voice announce templates
- Account: `/b/{businessId}/account` (also `/account`)

### Workspaces

- `/workspaces` lists businesses the signed-in user can open (by membership)

### Floor / guest

- **Kiosk** `/kiosk/{code}`: take a number
- **Display** `/display/{code}`: now serving, voice announce
- **Ticket** `/t/{token}`: public guest status link
- Agent desk under the business console (`/b/{id}/agent`)

---

## Roles

Membership roles (see `membership_role` enum and `src/lib/server/qms/guards.ts`):

| Role | Who | What they see |
|------|-----|----------------|
| `platform_admin` | NextUp operators | `/admin/*` after login. Can open any business. Full business nav when inside `/b/{id}`. |
| `business_owner` | Tenant owner | Full business console: setup CRUD, team, config, tickets, appointments, devices, agent desk, Home analytics. |
| `manager` | Tenant manager | Same console setup and operations as owner for that business (manager-gated routes). |
| `counter_agent` | Station / desk staff | Narrow nav: **Home** + **Agent** only. Agent devices get a dedicated station login (not a public pairing URL). |
| `guest` | Signed-in guest | **Home** + **Guest** area only (`/b/{id}/guest`). Walk-in guests often use kiosk/QR without staff login. |

Post-login default: platform admins → `/admin`; everyone else → `/workspaces`. Deep links are honored when safe.

Staff roles for floor ops: `business_owner`, `manager`, `counter_agent`. Setup CRUD uses `requireManager` (owner/manager, or platform admin).

---

## Local setup

### Prerequisites

- **Node.js 20+** (repo developed on Node 22)
- A **Neon** (or other Postgres) database URL
- npm

### Steps

```sh
# 1. Install
npm install

# 2. Env
cp .env.example .env
# Edit .env: set DATABASE_URL, ORIGIN=http://localhost:4001, BETTER_AUTH_SECRET, etc.

# 3. Schema
# Prefer migrate when using checked-in SQL under drizzle/
npm run db:migrate
# Or push schema directly (prototyping / empty DB):
# npm run db:push

# 4. Seed platform admin (uses SEED_PLATFORM_ADMIN_* from .env)
npm run seed:platform-admin

# 5. Dev server (port 4001)
npm run dev
```

Open [http://localhost:4001](http://localhost:4001). Log in with the seeded platform admin email/password from `.env`.

Optional: regenerate better-auth tables with `npm run auth:schema` after auth config changes, then migrate/push again.

---

## Environment variables

Summarized from `.env.example` (never commit real secrets):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon/Postgres connection string |
| `ORIGIN` | App base URL (local: `http://localhost:4001`) |
| `BETTER_AUTH_SECRET` | Auth token signing secret (long random in production) |
| `SEED_PLATFORM_ADMIN_EMAIL` | Seed admin email |
| `SEED_PLATFORM_ADMIN_PASSWORD` | Seed admin password |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_SMS` | Optional SMS; console adapter when unset |
| `CRON_SECRET` | Shared secret for cron/outbox endpoints |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional invite email; logs to console when unset |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION` / `AWS_ENDPOINT_URL_S3` | Neon Object Storage (S3-compatible) for org images |
| `ORG_IMAGE_BUCKET` | Bucket name (example default: `uploads`) |

Typed env declarations live in `src/env.ts`.

---

## Key URLs

Assume local origin `http://localhost:4001`. `{id}` is a business UUID. `{code}` is a device pairing code. `{token}` is a public ticket token.

### Public

| Path | Purpose |
|------|---------|
| `/` | Marketing home |
| `/pricing` | Plans |
| `/auth/login` | Sign in |
| `/auth/logout` | Sign out |
| `/auth/accept-invite` | Accept team invite |
| `/kiosk/{code}` | Lobby take-a-number |
| `/display/{code}` | TV / now-serving display |
| `/t/{token}` | Guest ticket status |

### Private (auth)

| Path | Purpose |
|------|---------|
| `/workspaces` | Pick a business |
| `/account` | Account |
| `/admin` | Platform overview |
| `/admin/businesses` | Tenants |
| `/admin/templates` | Industry templates |
| `/admin/invites` | Platform invites |
| `/admin/team` | Platform team |
| `/admin/config` | Platform config |
| `/admin/account` | Admin account |
| `/b/{id}` | Business Home (analytics) |
| `/b/{id}/sites` … `/queues` | Floor setup |
| `/b/{id}/tickets` | Tickets |
| `/b/{id}/appointments` | Appointments |
| `/b/{id}/devices` | TV / kiosk / agent stations |
| `/b/{id}/team` | Team |
| `/b/{id}/config` | Messaging + voice |
| `/b/{id}/agent` | Agent desk |
| `/b/{id}/guest` | Guest area |
| `/b/{id}/account` | Business-scoped account |

`/kiosk/*`, `/display/*`, `/t/*`, `/admin/*`, `/b/*`, `/auth/*`, and related app shells are `noindex` via Netlify headers and/or page meta.

---

## Floor test happy path

Short ordered path to prove the floor loop:

1. Sign in as owner/manager (or platform admin) and open a business from `/workspaces` (or create one in `/admin/businesses`).
2. **Sites**: ensure at least one site exists (Home may offer industry-pack bootstrap).
3. **Services** and **queues**: create or confirm services and queues for that site.
4. **Counters**: open a counter linked to the floor.
5. **Devices**:
   - Create a **kiosk** device → open `/kiosk/{pairingCode}`
   - Create a **TV** device → open `/display/{pairingCode}`
   - Create an **agent** station with email/password → sign in as that station and open `/b/{id}/agent`
6. On the **kiosk**, issue a ticket (note the public `/t/{token}` link if shown).
7. On the **agent** desk, call the waiting ticket (then serve / complete as needed).
8. On the **display**, confirm the called number and voice announce (browser speech; multi-locale from **Config → voice**).

Optional: flip messaging flags under `/b/{id}/config` and verify channel behavior when Twilio/SMTP (or adapters) are configured.

---

## Project structure

High-level layout (SvelteKit + local conventions):

```text
src/
  routes/
    (public)/          # Marketing, auth, kiosk, display, ticket token
    (private)/         # Workspaces, admin, /b/{id}/*, account
    api/               # HTTP handlers (cron, realtime, uploads, webhooks, export)
    sitemap.xml/
  lib/
    asset/             # font, style, image
    attachments/       # e.g. dropdown outside-close
    component/         # App UI (shells, tables, WashChart, marketing)
    server/            # auth, db (Drizzle), qms domain, uploads
    store/             # state, local-storage, cookie helpers
    tool/              # App-only helpers (nav, form submit, pricing)
    util/              # Shared helpers (format, voice, timezones, …)
    remotes/           # SvelteKit remote functions
    paraglide/         # Generated i18n (do not hand-edit; source in messages/)
  env.ts               # Explicit environment variable declarations
  hooks.server.ts
  hooks.ts
messages/              # Paraglide source: en.json, my.json, ja.json
drizzle/               # SQL migrations
scripts/               # e.g. seed-platform-admin.ts
project.inlang/        # Paraglide / inlang project settings
netlify.toml
```

Import alias: `#lib/*` → `src/lib/*`.

---

## Scripts

From `package.json`:

| Script | Command purpose |
|--------|-----------------|
| `npm run dev` | Vite dev server (port **4001**) |
| `npm run build` | Production build |
| `npm run preview` | Preview build (port **4001**) |
| `npm run prepare` | `svelte-kit sync` |
| `npm run check` / `check:watch` | `svelte-check` |
| `npm run lint` | Prettier check + ESLint |
| `npm run format` | Prettier write |
| `npm run test:unit` | Vitest |
| `npm run test:e2e` | Playwright (installs browsers then runs) |
| `npm run test` | Unit then e2e |
| `npm run db:push` | Drizzle push schema to DB |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run auth:schema` | Regenerate better-auth Drizzle schema |
| `npm run seed:platform-admin` | Create/link platform admin user |

---

## Deploy (Netlify)

`netlify.toml`:

- **Build**: `npm run build`
- **Publish**: `build`
- **Functions**: `esbuild` bundler
- **Redirects**: `/admin/packs` → `/admin/templates`, `/admin/settings` → `/admin/config` (301)
- **Headers**: `X-Robots-Tag: noindex, nofollow` on admin, workspaces, `/b/*`, auth, kiosk, display, ticket, and related private shells

Set the same env vars in the Netlify site settings (especially `DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`). Point `ORIGIN` at the production URL. Run migrations against Neon before or as part of your release process (`db:migrate` / `db:push` as appropriate).

Adapter: `@sveltejs/adapter-netlify` (configured in Vite / SvelteKit config).

---

## i18n and theme

### Paraglide

- Locales: **`en`** (base), **`my`**, **`ja`**
- Message sources: `messages/{locale}.json`
- Generated runtime under `src/lib/paraglide/`
- UI language switcher: `LanguageMenu` in admin/client shells

### Soft Wash appearance

- Package: `@menzies-mariesta-com/menzies-design-wash-ui`
- Appearance menu: light/dark mode + pigment themes (e.g. mineral, indigo, celadon, vermilion, …)
- Charts on business Home use Soft Wash styled ApexCharts via `WashChart`
- daisyUI themes follow the selected Wash pigment

---

## License / status

Private package (`"private": true`). Version `0.0.1`.
