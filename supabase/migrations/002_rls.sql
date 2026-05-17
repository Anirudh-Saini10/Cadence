-- =====================================================================
-- Cadence — 002 RLS policies
-- Run AFTER 001_schema.sql.
-- Role checks via the public.users.role column for the current auth.uid().
-- =====================================================================

-- Helper: current user's role
create or replace function public.current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

-- Helper: is the given employee a direct report of the current user?
create or replace function public.is_my_report(p_employee_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = p_employee_id and manager_id = auth.uid()
  )
$$;

-- Enable RLS
alter table public.users             enable row level security;
alter table public.cycles            enable row level security;
alter table public.goals             enable row level security;
alter table public.checkins          enable row level security;
alter table public.checkin_comments  enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.escalation_rules  enable row level security;
alter table public.escalation_logs   enable row level security;

-- ---------------- users ----------------
drop policy if exists users_select on public.users;
create policy users_select on public.users for select
  using (
    id = auth.uid()
    or manager_id = auth.uid()
    or public.current_role() = 'admin'
  );

drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists users_insert_admin on public.users;
create policy users_insert_admin on public.users for insert
  with check (public.current_role() = 'admin' or auth.uid() = id);

-- ---------------- cycles ----------------
drop policy if exists cycles_select_all on public.cycles;
create policy cycles_select_all on public.cycles for select using (auth.uid() is not null);

drop policy if exists cycles_write_admin on public.cycles;
create policy cycles_write_admin on public.cycles for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------------- goals ----------------
drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals for select
  using (
    employee_id = auth.uid()
    or public.is_my_report(employee_id)
    or public.current_role() = 'admin'
  );

-- Employees insert their own draft goals.
drop policy if exists goals_insert on public.goals;
create policy goals_insert on public.goals for insert
  with check (
    employee_id = auth.uid()
    or public.current_role() in ('manager','admin')
  );

-- Update rules:
--   - Employee can update own goals while status in ('draft','returned').
--   - Manager can update direct reports' goals while status = 'submitted' (approval/inline edits).
--   - Admin can always update.
--   - Once locked_at is set, only admin may update.
drop policy if exists goals_update on public.goals;
create policy goals_update on public.goals for update
  using (
    public.current_role() = 'admin'
    or (
      locked_at is null and (
        (employee_id = auth.uid() and status in ('draft','returned','submitted'))
        or (public.is_my_report(employee_id) and status in ('submitted','returned','approved'))
      )
    )
  )
  with check (
    public.current_role() = 'admin'
    or locked_at is null
    or public.current_role() = 'admin'
  );

drop policy if exists goals_delete on public.goals;
create policy goals_delete on public.goals for delete
  using (
    public.current_role() = 'admin'
    or (employee_id = auth.uid() and status = 'draft')
  );

-- ---------------- checkins ----------------
drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins for select
  using (
    exists (
      select 1 from public.goals g
      where g.id = checkins.goal_id
        and (
          g.employee_id = auth.uid()
          or public.is_my_report(g.employee_id)
          or public.current_role() = 'admin'
        )
    )
  );

drop policy if exists checkins_write on public.checkins;
create policy checkins_write on public.checkins for all
  using (
    exists (
      select 1 from public.goals g
      where g.id = checkins.goal_id
        and (g.employee_id = auth.uid() or public.current_role() = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.goals g
      where g.id = checkins.goal_id
        and (g.employee_id = auth.uid() or public.current_role() = 'admin')
    )
  );

-- ---------------- checkin_comments ----------------
drop policy if exists ckc_select on public.checkin_comments;
create policy ckc_select on public.checkin_comments for select
  using (
    exists (
      select 1 from public.checkins c join public.goals g on g.id = c.goal_id
      where c.id = checkin_comments.checkin_id
        and (
          g.employee_id = auth.uid()
          or public.is_my_report(g.employee_id)
          or public.current_role() = 'admin'
        )
    )
  );

drop policy if exists ckc_insert on public.checkin_comments;
create policy ckc_insert on public.checkin_comments for insert
  with check (
    manager_id = auth.uid()
    and public.current_role() in ('manager','admin')
  );

-- ---------------- audit_logs ----------------
drop policy if exists audit_select_admin on public.audit_logs;
create policy audit_select_admin on public.audit_logs for select
  using (public.current_role() = 'admin');

drop policy if exists audit_insert_any on public.audit_logs;
create policy audit_insert_any on public.audit_logs for insert
  with check (auth.uid() is not null);

-- ---------------- escalation_rules ----------------
drop policy if exists esc_rules_select on public.escalation_rules;
create policy esc_rules_select on public.escalation_rules for select
  using (public.current_role() in ('admin','manager'));

drop policy if exists esc_rules_write on public.escalation_rules;
create policy esc_rules_write on public.escalation_rules for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ---------------- escalation_logs ----------------
drop policy if exists esc_logs_select on public.escalation_logs;
create policy esc_logs_select on public.escalation_logs for select
  using (
    public.current_role() = 'admin'
    or target_user_id = auth.uid()
  );

drop policy if exists esc_logs_write_admin on public.escalation_logs;
create policy esc_logs_write_admin on public.escalation_logs for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
