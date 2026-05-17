# Cadence

> Goal Setting & Performance Tracking Portal — built for **AtomQuest Hackathon 1.0**.

Cadence digitizes the full goal-management lifecycle for an enterprise: employees author weighted OKRs with real-time validation, managers review and approve via a structured workflow, quarterly check-ins auto-score against 5 UoM formulas, and HR/Admin governs performance cycles, audits every action, and monitors org-wide analytics. Row-level security enforces the role model directly at the database layer.

**Live Demo:** [cadence-growth.vercel.app](https://cadence-growth.vercel.app)

---

## What We Built

### Core Workflow (End-to-End)

| Step | Actor | Action |
|------|-------|--------|
| 1 | Admin | Opens a performance cycle (e.g., FY 2025-26) |
| 2 | Employee | Creates 3-8 goals across 8 thrust areas with weightage |
| 3 | System | Validates total weightage = 100%, min 10% per goal, max 8 goals |
| 4 | Employee | Submits goal sheet for manager approval |
| 5 | Manager | Reviews goals, approves (locks) or returns for rework |
| 6 | Admin | Advances cycle to Q1/Q2/Q3/Q4 — check-ins open |
| 7 | Employee | Records actual achievement; system auto-computes score |
| 8 | Manager | Reviews quarterly check-ins, adds feedback |
| 9 | Admin | Monitors completion rates, runs escalation nudges, exports reports |

### 5 Auto-Scoring UoM Formulas

| Type | Formula | Example |
|------|---------|---------|
| **Min** (lower is better) | `(Target / Actual) * 100` | Ticket resolution TAT |
| **Max** (higher is better) | `(Actual / Target) * 100` | Revenue, retention rate |
| **Zero** (zero = success) | `100 - (Actual / Target * 100)` | Security incidents |
| **Timeline** (deadline-based) | `% of milestones completed on time` | Certification, project launch |
| **Milestone** (binary gates) | `(Completed milestones / Total) * 100` | Feature rollout phases |

---

## Feature Map

### Phase 1 — Goal Setting
- [x] Weighted OKR creation (8 thrust areas)
- [x] Live weightage tracker with color-coded progress bar
- [x] Auto-validation: total = 100%, min 10% per goal, max 8 goals
- [x] Goal submission + approval workflow
- [x] Manager return-to-draft with comments
- [x] Goal locking on approval

### Phase 2 — Check-ins & Scoring
- [x] Quarterly check-in entry (Q1, Q2, Q3, Q4/Annual)
- [x] 5 UoM formulas with automatic score calculation
- [x] Achievement vs Target visualization
- [x] Manager review + inline comments
- [x] Cross-cycle analytics and trend lines

### Admin & Governance
- [x] Performance cycle management (open, advance phase, reset)
- [x] User management — edit names, emails, roles
- [x] Admin goal reset — force-return locked goals to draft
- [x] Full audit log of every approval, rejection, phase change
- [x] Department-wise analytics with bar charts, pie charts, trend lines
- [x] CSV export of analytics data
- [x] Escalation engine with configurable rules + email notifications (Resend)
- [x] Demo data seeder — one-click populate realistic goals for all users

### UX & Polish
- [x] Beautiful landing page with feature grid
- [x] Role-aware Dashboard with stat cards and quick actions
- [x] Demo view switcher — instantly flip Employee/Manager/Admin without logout
- [x] Role switcher persists across refreshes (localStorage)
- [x] Fast loading with React Query caching (5s staleTime)
- [x] Error states everywhere — no infinite spinners
- [x] Responsive sidebar with zero duplicate nav items

---

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React 18 + Vite + TypeScript | Fast DX, type-safe |
| Styling | TailwindCSS + shadcn/ui primitives | Consistent, accessible |
| State | Zustand (auth) + TanStack Query (server) | Minimal boilerplate, caching |
| Data + Auth | Supabase (Postgres + Auth + RLS) | No backend code, security at DB layer |
| Charts | Recharts | Lightweight, React-native |
| Email | Resend | 100 emails/day free tier |
| Hosting | Vercel | Auto-deploy from GitHub, free tier |

---

## Evaluation Criteria Alignment

| Criteria | How Cadence Delivers |
|----------|----------------------|
| **Functionality** | Full E2E flow: create → submit → approve → check-in → score → analyze |
| **Adherence to BRD** | Weightage = 100%, max 8 goals, min 10%, 5 UoM types, 9 phases, validation enforced |
| **User Friendliness** | Demo switcher, fast navigation, error messages, consistent UX across roles |
| **Bugs** | Error handling on every query, no infinite loaders, deduplicated nav |
| **Good-to-Have** | Escalation engine with Resend email, CSV export, demo seeder, admin user management |
| **Cost Optimisation** | Free tier on every layer: Vercel + Supabase + Resend. Zero server management. Zero backend code.

---

## Quick Start

```powershell
# 1. Install deps
npm install

# 2. Set up Supabase (see supabase/README.md for full steps)
#    - Create project, 4 demo auth users, run SQL migrations.

# 3. Configure env
copy .env.example .env
# Edit .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Run
npm run dev
```

App runs at http://localhost:5173.

---

## Demo Accounts

All passwords: `cadence123`

| Email | Role | Reports To |
|-------|------|------------|
| `admin@cadence.demo` | Admin / HR | — |
| `manager@cadence.demo` | Manager (Rohan) | Admin |
| `priya@cadence.demo` | Employee | Rohan |
| `arjun@cadence.demo` | Employee | Rohan |

**Pro tip for judges:** Log in as **Admin** and use the **Demo View** switcher (top-right) to instantly see Employee, Manager, and Admin dashboards without re-authenticating.

---

## Repo Map

```
supabase/migrations/         # SQL: schema → RLS → triggers → seed
src/
  pages/
    LandingPage.tsx          # Marketing page with feature grid
    LoginPage.tsx            # Auth with demo account shortcuts
  features/
    dashboard/
      DashboardPage.tsx      # Role-aware stats + quick actions
    goals/
      GoalSheetPage.tsx      # Create, edit, submit goals
      WeightageBar.tsx       # Live progress tracker
    checkins/
      CheckinsPage.tsx       # Quarterly progress entry
      TeamCheckinsPage.tsx   # Manager review of team check-ins
    team/
      TeamListPage.tsx       # Manager's direct reports
      TeamReviewPage.tsx     # Approve/return employee goals
    admin/
      CycleAdminPage.tsx     # Open/advance/reset cycles
      UsersAdminPage.tsx     # Edit users, reset goals
      AuditLogPage.tsx       # Full action history
      DemoSeeder.tsx         # One-click demo data
    analytics/
      AnalyticsPage.tsx      # Charts + CSV export
    escalations/
      EscalationsPage.tsx    # Rules + email notifications
  components/
    AppShell.tsx             # Sidebar, header, role switcher
  stores/
    authStore.ts             # Zustand auth + demo role persistence
  lib/
    supabase.ts              # Supabase client
    scoring.ts               # UoM scoring formulas
    export.ts                # CSV download utility
  types/
    database.ts              # Typed Supabase schema mirror
```

---

## Cost

Free-tier on every layer:
- **Vercel** — unlimited static hosting
- **Supabase** — Postgres + Auth + 500 MB storage
- **Resend** — 100 emails/day

Zero server management. Zero backend code.

Built by Aniruddha Saini for AtomQuest.
