-- =====================================================================
-- Cadence — 001 Schema
-- AtomQuest Hackathon 1.0
-- Run this FIRST in the Supabase SQL editor.
-- =====================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type user_role        as enum ('employee','manager','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cycle_phase      as enum ('goal_setting','q1','q2','q3','q4_annual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cycle_status     as enum ('upcoming','active','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type uom_type         as enum ('min','max','timeline','zero');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status      as enum ('draft','submitted','approved','locked','returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkin_status   as enum ('not_started','on_track','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type escalation_status as enum ('open','resolved');
exception when duplicate_object then null; end $$;


-- ---------- Tables ----------

-- users: extends Supabase auth.users 1:1 via id
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  role          user_role not null default 'employee',
  manager_id    uuid references public.users(id) on delete set null,
  department    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_users_manager on public.users(manager_id);
create index if not exists idx_users_role on public.users(role);

-- cycles: org-wide goal-setting/check-in windows
create table if not exists public.cycles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phase       cycle_phase not null default 'goal_setting',
  open_date   date not null,
  close_date  date not null,
  status      cycle_status not null default 'upcoming',
  created_at  timestamptz not null default now()
);
create index if not exists idx_cycles_status on public.cycles(status);

-- goals: the heart of the app
create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.users(id) on delete cascade,
  cycle_id        uuid not null references public.cycles(id) on delete cascade,
  thrust_area     text not null,
  title           text not null,
  description     text,
  uom_type        uom_type not null,
  target          numeric not null check (target >= 0),
  weightage       numeric not null check (weightage >= 0 and weightage <= 100),
  status          goal_status not null default 'draft',
  is_shared       boolean not null default false,
  source_goal_id  uuid references public.goals(id) on delete set null,
  locked_at       timestamptz,
  returned_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_goals_employee on public.goals(employee_id);
create index if not exists idx_goals_cycle on public.goals(cycle_id);
create index if not exists idx_goals_status on public.goals(status);
create index if not exists idx_goals_source on public.goals(source_goal_id);

-- checkins: quarterly actuals
create table if not exists public.checkins (
  id                  uuid primary key default gen_random_uuid(),
  goal_id             uuid not null references public.goals(id) on delete cascade,
  quarter             cycle_phase not null check (quarter in ('q1','q2','q3','q4_annual')),
  actual_achievement  numeric not null default 0,
  status              checkin_status not null default 'not_started',
  computed_score      numeric not null default 0,
  submitted_at        timestamptz not null default now(),
  unique(goal_id, quarter)
);
create index if not exists idx_checkins_goal on public.checkins(goal_id);

-- check-in comments by manager
create table if not exists public.checkin_comments (
  id          uuid primary key default gen_random_uuid(),
  checkin_id  uuid not null references public.checkins(id) on delete cascade,
  manager_id  uuid not null references public.users(id) on delete cascade,
  comment     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_ckcomments_checkin on public.checkin_comments(checkin_id);

-- audit_logs: every post-lock change
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid references public.goals(id) on delete set null,
  changed_by  uuid references public.users(id) on delete set null,
  change_type text not null,
  old_value   jsonb,
  new_value   jsonb,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_goal on public.audit_logs(goal_id);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

-- escalation_rules: admin-configurable
create table if not exists public.escalation_rules (
  id              uuid primary key default gen_random_uuid(),
  rule_type       text not null,           -- 'goal_not_submitted' | 'goal_not_approved' | 'checkin_overdue'
  threshold_days  int  not null check (threshold_days > 0),
  target_role     user_role not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- escalation_logs: every rule firing
create table if not exists public.escalation_logs (
  id              uuid primary key default gen_random_uuid(),
  rule_id         uuid not null references public.escalation_rules(id) on delete cascade,
  target_user_id  uuid not null references public.users(id) on delete cascade,
  triggered_at    timestamptz not null default now(),
  resolved_at     timestamptz,
  status          escalation_status not null default 'open',
  detail          jsonb
);
create index if not exists idx_esclogs_status on public.escalation_logs(status);
create index if not exists idx_esclogs_user on public.escalation_logs(target_user_id);

-- updated_at trigger helper
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.tg_set_updated_at();
