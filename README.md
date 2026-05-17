# Cadence


> Goal Setting & Performance Tracking Portal — built for **AtomQuest Hackathon 1.0**.

Cadence digitizes the full goal-management lifecycle for an enterprise: employees author goal sheets with weightage validation, managers approve and check in quarterly, and HR/admin governs cycles, audits, and analytics. The entire stack runs on free tiers — Supabase + Vercel — with row-level security enforcing the role model at the database layer.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript + TailwindCSS + shadcn-style UI |
| Data + Auth | Supabase (Postgres + Auth + RLS) — no custom backend |
| Charts | Recharts |
| Email (escalation) | Resend |
| Hosting | Vercel (frontend) + Supabase Cloud |

## Quick start

```powershell
# 1. Install deps
npm install

# 2. Set up Supabase (see supabase/README.md for full steps)
#    - Create project, 4 demo auth users, run 4 SQL migrations.

# 3. Configure env
copy .env.example .env
# Edit .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Run
npm run dev
```

App runs at http://localhost:5173.

## Demo accounts

All passwords: `cadence123`

| Email | Role |
|---|---|
| `admin@cadence.demo`   | Admin / HR |
| `manager@cadence.demo` | L1 Manager (Rohan) |
| `priya@cadence.demo`   | Employee (reports to Rohan) |
| `arjun@cadence.demo`   | Employee (reports to Rohan) |

When logged in as **admin**, a **Demo view** switcher appears in the header so judges can flip between Employee / Manager / Admin dashboards without re-authenticating. RLS still enforces the real role for any data writes.

## Repo map

```
supabase/migrations/   # SQL: schema → RLS → triggers → seed (run in order)
src/lib/               # Supabase client, utils, UoM scoring
src/components/        # AppShell, RoleSwitcher, StatusBadge, UI primitives
src/stores/            # Zustand auth store
src/hooks/             # TanStack Query hooks
src/pages/             # Login + role-specific pages
src/types/database.ts  # Hand-typed Supabase schema mirror
```

## Build phases

See `/C:/Users/markw/.windsurf/plans/cadence-build-plan-c2ead5.md` for the full phased roadmap. Currently shipped: **Phase 1 (Infra)** + **Phase 2 (Auth + Shell + Role Switcher)**.

## Cost

Free-tier on every layer: Vercel hosting, Supabase Postgres + Auth + 500 MB, Resend 100 emails/day. Zero server management.
