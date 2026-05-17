# Cadence — Supabase Setup

One-time, ~10 minutes.

## 1. Create the project

1. Go to https://supabase.com → **New project**.
2. Name it `cadence`, pick any region, save the DB password.
3. Once provisioned: **Project Settings → API** — copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
4. Paste both into a new `.env` file at the repo root (copy `.env.example`).

## 2. Create the 4 demo auth users

**Authentication → Users → Add user** (use *"Auto Confirm User"* on each):

| Email | Password | Purpose |
|---|---|---|
| `admin@cadence.demo`   | `cadence123` | Admin / HR |
| `manager@cadence.demo` | `cadence123` | L1 Manager (Rohan) |
| `priya@cadence.demo`   | `cadence123` | Employee (reports to Rohan) |
| `arjun@cadence.demo`   | `cadence123` | Employee (reports to Rohan) |

## 3. Run the migrations IN ORDER

Open **SQL Editor** in the Supabase dashboard and run each file's contents as a separate query:

1. `migrations/001_schema.sql`  — tables, enums, indexes
2. `migrations/002_rls.sql`     — row-level security policies
3. `migrations/003_triggers.sql`— business rules (100% weightage, max 8 goals, lock on approve, score compute, shared-goal sync, auth → public.users bridge)
4. `migrations/004_seed.sql`    — promotes the 4 auth users to correct roles, builds reporting hierarchy, creates the active cycle, the shared goal, and a few draft goals for Priya

> The order matters. Triggers reference tables, seed references triggers (the auth → public.users trigger must exist before you ran the user creation step; if you created users *before* running 003, just re-run 004 — it's idempotent and will UPDATE the existing rows).

## 4. Verify

In SQL editor:

```sql
select email, role, manager_id is not null as has_manager from public.users order by role;
select count(*) as goals_seeded from public.goals;
select * from public.cycles;
```

Expected: 4 users (1 admin, 1 manager, 2 employees with `has_manager=true`), ≥ 6 goals (1 source + 2 children + 3 Priya drafts), 1 active cycle.

## 5. Start the app

```powershell
npm install
npm run dev
```

Login with any of the 4 demo accounts above.
