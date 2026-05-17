-- =====================================================================
-- Cadence — 004 Demo seed
-- Run AFTER 003_triggers.sql AND AFTER you've created auth users via the
-- Supabase dashboard (Authentication → Users → Add user).
--
-- Required demo auth users (create these in the dashboard with these emails
-- and any password, then update the UUIDs below):
--   1. admin@cadence.demo       — role: admin
--   2. manager@cadence.demo     — role: manager
--   3. priya@cadence.demo       — role: employee  (reports to manager)
--   4. arjun@cadence.demo       — role: employee  (reports to manager)
--
-- The auth signup trigger (003) will auto-create public.users rows. This
-- file then UPDATEs them with correct role/department/manager hierarchy
-- and seeds a cycle, shared goal, and a few demo goals.
-- =====================================================================

-- ---- Promote demo users to correct roles ----
update public.users set role = 'admin',    name = 'Aanya (Admin)',   department = 'HR'         where email = 'admin@cadence.demo';
update public.users set role = 'manager',  name = 'Rohan (Manager)', department = 'Operations' where email = 'manager@cadence.demo';
update public.users set role = 'employee', name = 'Priya Singh',     department = 'Operations' where email = 'priya@cadence.demo';
update public.users set role = 'employee', name = 'Arjun Mehta',     department = 'Operations' where email = 'arjun@cadence.demo';

-- ---- Reporting hierarchy: employees → manager ----
update public.users
   set manager_id = (select id from public.users where email = 'manager@cadence.demo')
 where email in ('priya@cadence.demo','arjun@cadence.demo');

-- ---- Active cycle in goal-setting phase ----
insert into public.cycles (id, name, phase, open_date, close_date, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'FY 2025-26',
  'goal_setting',
  current_date - interval '7 days',
  current_date + interval '60 days',
  'active'
)
on conflict (id) do nothing;

-- ---- Shared KPI pushed from admin to both employees ----
-- Source (template) goal owned by manager
with src as (
  insert into public.goals (
    id, employee_id, cycle_id, thrust_area, title, description,
    uom_type, target, weightage, status, is_shared, source_goal_id
  )
  select
    '22222222-2222-2222-2222-222222222222',
    (select id from public.users where email = 'manager@cadence.demo'),
    '11111111-1111-1111-1111-111111111111',
    'Customer Excellence',
    'Reduce average ticket resolution TAT to 24h',
    'Org-wide KPI cascaded by HR. Achievement auto-syncs from team lead.',
    'max', 24, 20, 'draft', true, null
  on conflict (id) do nothing
  returning id
)
select 1;

-- Linked child goals (one per employee) — Title/Target locked, weightage editable
insert into public.goals (
  employee_id, cycle_id, thrust_area, title, description,
  uom_type, target, weightage, status, is_shared, source_goal_id
)
select
  u.id,
  '11111111-1111-1111-1111-111111111111',
  'Customer Excellence',
  'Reduce average ticket resolution TAT to 24h',
  'Org-wide KPI cascaded by HR. Achievement auto-syncs from team lead.',
  'max', 24, 15, 'draft', true,
  '22222222-2222-2222-2222-222222222222'
from public.users u
where u.email in ('priya@cadence.demo','arjun@cadence.demo')
  and not exists (
    select 1 from public.goals g
    where g.employee_id = u.id
      and g.source_goal_id = '22222222-2222-2222-2222-222222222222'
  );

-- ---- A couple of draft personal goals for Priya, to make weightage = 100 demo-ready ----
insert into public.goals (
  employee_id, cycle_id, thrust_area, title, description,
  uom_type, target, weightage, status
)
select
  (select id from public.users where email = 'priya@cadence.demo'),
  '11111111-1111-1111-1111-111111111111',
  v.thrust, v.title, v.descr, v.uom, v.target, v.weight, 'draft'
from (values
  ('Revenue Growth',     'Achieve quarterly revenue of ₹50L',  'Net new and expansion combined.', 'min'::uom_type,  50, 35),
  ('Operational Quality','Maintain zero P1 incidents',         'Production hot-fixes during release weeks.', 'zero'::uom_type, 0, 25),
  ('People Development', 'Complete cloud certification',       'AWS Solutions Architect Associate by Q3.',   'timeline'::uom_type, 100, 25)
) as v(thrust,title,descr,uom,target,weight)
where not exists (
  select 1 from public.goals g
  where g.employee_id = (select id from public.users where email='priya@cadence.demo')
    and g.title = v.title
);

-- ---- Default escalation rules ----
insert into public.escalation_rules (rule_type, threshold_days, target_role, is_active) values
  ('goal_not_submitted', 7,  'employee', true),
  ('goal_not_approved',  5,  'manager',  true),
  ('checkin_overdue',    10, 'employee', true)
on conflict do nothing;
