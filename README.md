# Material Consumption Intelligence System

A ledger-based inventory, consumption, and forecasting system for a manufacturing
plant — built with Next.js 15, TypeScript, Tailwind, ShadCN UI, Prisma, and
SQLite. Runs entirely on your own machine; nothing calls out to the internet
at runtime.

## ⚠️ Please read before you run it

This codebase was written in a sandboxed environment with **no internet
access**, so I could not run `npm install`, `next build`, or the app itself
before handing it to you. Every file is real, complete, production-style
code — not a stub — but this is the first time it will actually be compiled
and executed. The very first `npm run dev` or `npm run build` may surface a
small issue (a typo, a mismatched import) that a normal build-and-fix loop
would have already caught. If that happens, it's normal for a project this
size and quick to fix — paste the error back to me (or into Claude Code,
which is a great fit for iterating on a project like this one) and it can
be resolved in a turn or two.

**Double-check these seed rows against your paper register** — a few entries
were genuinely hard to read by hand and I flagged them rather than guess
silently:
- **Elastomer** — colour "565 Red" vs. its neighbouring "EPDM (Rubber)" label; I split these into two materials, but confirm that's right.
- **DCP** — could be "DCP" (dicumyl peroxide, a common curing agent) or "DLP"; I went with DCP as the chemically plausible reading.
- **Silica 52 / "Silka"** — read as Silica; confirm the grade code "52".
- **Foaming A**, **Curing Powder**, **Sheet** — opening balance was blank/illegible in the photo; seeded as 0, fix in the Materials screen.

None of this is hardcoded into the app — it's all in `prisma/seed.ts` as
plain starter data. Edit, delete, or replace any of it from the **Materials**
screen with zero code changes, or just empty out the `materialSeed` array
before seeding if you'd rather start from a blank slate.

## What's implemented

- **Ledger engine**: stock is never stored directly — every number on screen
  is computed live by summing signed transactions (`src/lib/stock.ts`).
- **Material master**: categories, colours, units, minimum stock, add/edit/
  deactivate/archive/restore — 100% UI-driven, nothing material-specific in code.
- **Transaction entry**: Usage, Purchase, Wastage, Adjustment, Return, Transfer
  — one fast mobile-friendly form (`/entry`), optimistic stock updates via
  React Query, no full-page reload.
- **Stock ledger**: bank-statement style history per material (`/materials/[id]`).
- **Dashboard**: current inventory, today/week/month consumption, low-stock
  and running-out-soon alerts, top consumed, recent movements, wastage summary.
- **Intelligence** (`/analytics`): month-over-month comparison, 3-month trend
  classification, a local rules-based insights feed, stock-out forecasting,
  abnormal-consumption detection, dead-stock detection, fast/slow movers.
- **Reports** (`/reports`): daily/weekly/monthly/quarterly/yearly and batch
  summaries, with CSV, Excel, and PDF export.
- **Executive dashboard** (`/executive`): inventory value, biggest movers,
  wastage %, forecasted stock-outs.
- **Settings**: categories, shifts, reason codes, and user management —
  role-gated (Admin / Supervisor / Operator).
- **Audit log**: every material and transaction change, who/when/old→new.
- **Auth**: simple username/password login with hashed passwords and a
  signed session cookie — sized for a plant running on a local network, not
  a public-internet SaaS product.
- **Dark mode**, mobile-responsive throughout, Docker support.

### One deliberate naming note: "AI Insights"

The insights feed (`generateInsights()` in `src/lib/analytics.ts`) is a
**local, deterministic rules engine** — it computes real percentages and
trends from your ledger and turns them into sentences like "POE consumption
increased by 24% compared to last month." It does **not** call any external
AI/LLM API. That's intentional: it matches your "no cloud services required"
requirement, needs no API key, costs nothing to run, and works offline. If
you ever want actual LLM-generated prose on top of these numbers, that's a
clean extension point — swap the template strings for a call to any LLM
API of your choice.

## Local setup (no Docker)

1. Install **Node.js 20+**.
2. `cd material-intelligence-system && npm install`
3. `cp .env.example .env` — then open `.env` and set `SESSION_SECRET` to a
   long random string (you can generate one with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. `npx prisma migrate dev --name init` — this reads `prisma/schema.prisma`
   and both generates the migration files **and** creates `prisma/dev.db`.
   (Migration files are always machine-generated from the schema, never
   hand-written — this is the normal Prisma workflow.)
5. `npm run db:seed` — loads categories, shifts, reason codes, three demo
   users, and the materials transcribed from your photo with July 2026
   opening balances.
6. `npm run dev` — open http://localhost:3000
7. Sign in with `admin` / `admin123` (also `supervisor`/`supervisor123` and
   `operator`/`operator123`). **Change these passwords from Settings → Users
   before this touches anything you care about.**

## Docker

Docker needs the migration files to already exist on disk (step 4 above),
since the image just copies your repo and runs `prisma migrate deploy`
(apply-only, no generation) at startup.

1. Run steps 1–4 from "Local setup" once, locally, so `prisma/migrations/`
   exists.
2. `docker compose up --build`
3. First run only — seed the freshly-created container database:
   `docker compose exec app npx tsx prisma/seed.ts`
4. Open http://localhost:3000

The SQLite file lives at `./data/production.db` on your host machine (via
the volume mount in `docker-compose.yml`), so it survives container
restarts and rebuilds. Set a real `SESSION_SECRET` environment variable
before exposing this beyond your own machine.

## Project structure

```
prisma/schema.prisma       Single source of truth for the data model
prisma/seed.ts             Starter categories/shifts/reasons/users/materials
src/lib/stock.ts           Ledger math — the only place stock is computed
src/lib/analytics.ts       Trends, MoM, insights, forecasting, alerts
src/lib/export.ts          CSV / Excel / PDF export helpers
src/app/api/**             Route handlers (all business logic enforcement)
src/app/**/page.tsx        Thin server shells that render the matching *-client
src/components/**/*-client.tsx   The actual interactive screens (React Query)
src/components/ui/**       Hand-built ShadCN-style primitives
```

## Extending this later (per the "no redesign needed" requirement)

- **Multi-location**: add a `Location` model, add `locationId` to
  `Transaction`, and give `TRANSFER` a `toLocationId`.
- **Postgres instead of SQLite**: change `provider` in `schema.prisma` to
  `"postgresql"`, point `DATABASE_URL` at your server, rerun `migrate dev`.
- **Vendors as real records**: add a `Vendor` model, swap the free-text
  `vendor` field on `Transaction` for a `vendorId` relation.
- **Production orders / BOM**: add `ProductionOrder` and `BillOfMaterial`
  models that generate `USAGE` transactions automatically per finished unit.

None of these require touching the existing ledger logic.

## Production deployment notes

- Put this behind HTTPS (a reverse proxy like Caddy or Nginx in front of the
  container is the simplest route) — the session cookie is only marked
  `secure` when `NODE_ENV=production` and will otherwise be sent over plain
  HTTP.
- Back up `data/production.db` on a schedule; it's the entire database.
- If you outgrow single-writer SQLite (many simultaneous users hitting
  `/entry` at once), migrate to Postgres as noted above — the ledger and API
  logic don't change, only `schema.prisma`'s datasource block does.
