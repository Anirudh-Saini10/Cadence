-- =====================================================================
-- Cadence — 003 Business-rule triggers
-- Run AFTER 002_rls.sql.
-- Enforces:
--   * Max 8 goals per (employee, cycle)
--   * On submit: total weightage per (employee, cycle) must equal 100
--   * On approve: stamp locked_at, propagate to shared goal children
--   * Audit log for any UPDATE on a locked goal
--   * Auto-compute checkins.computed_score from UoM formula
--   * Shared-goal achievement sync from source to children
-- =====================================================================

-- ---------- Max 8 goals per employee per cycle ----------
create or replace function public.tg_goals_max_eight() returns trigger
language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt from public.goals
   where employee_id = new.employee_id
     and cycle_id    = new.cycle_id
     and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
  if cnt >= 8 then
    raise exception 'Max 8 goals per employee per cycle (currently %).', cnt;
  end if;
  return new;
end $$;

drop trigger if exists trg_goals_max_eight on public.goals;
create trigger trg_goals_max_eight
  before insert on public.goals
  for each row execute function public.tg_goals_max_eight();


-- ---------- 100% weightage when submitting / approving ----------
create or replace function public.tg_goals_weightage_sum() returns trigger
language plpgsql as $$
declare total numeric;
begin
  if new.status in ('submitted','approved','locked')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select coalesce(sum(weightage),0) into total
      from public.goals
     where employee_id = new.employee_id
       and cycle_id    = new.cycle_id
       and id <> new.id;
    total := total + new.weightage;
    if total <> 100 then
      raise exception 'Total weightage must equal 100%% (got %).', total;
    end if;
    if new.weightage < 10 then
      raise exception 'Minimum weightage per goal is 10%% (got %).', new.weightage;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_goals_weightage_sum on public.goals;
create trigger trg_goals_weightage_sum
  before insert or update on public.goals
  for each row execute function public.tg_goals_weightage_sum();


-- ---------- Lock stamp + audit on approval ----------
create or replace function public.tg_goals_lock_on_approve() returns trigger
language plpgsql as $$
begin
  -- transition to approved -> set locked_at + write audit
  if (tg_op = 'UPDATE') and old.status is distinct from new.status
     and new.status = 'approved' then
    new.locked_at := now();
    insert into public.audit_logs(goal_id, changed_by, change_type, old_value, new_value)
    values (
      new.id, auth.uid(), 'approve',
      to_jsonb(old), to_jsonb(new)
    );
  end if;

  -- any update of a locked goal -> audit
  if (tg_op = 'UPDATE') and old.locked_at is not null then
    insert into public.audit_logs(goal_id, changed_by, change_type, old_value, new_value)
    values (
      new.id, auth.uid(), 'post_lock_edit',
      to_jsonb(old), to_jsonb(new)
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_goals_lock_on_approve on public.goals;
create trigger trg_goals_lock_on_approve
  before update on public.goals
  for each row execute function public.tg_goals_lock_on_approve();


-- ---------- Auto-compute check-in score from UoM ----------
create or replace function public.tg_checkins_compute_score() returns trigger
language plpgsql as $$
declare g public.goals%rowtype; score numeric;
begin
  select * into g from public.goals where id = new.goal_id;

  case g.uom_type
    when 'min' then
      -- Higher achievement is better
      score := case when g.target = 0 then 0
                    else (new.actual_achievement / g.target) * 100 end;
    when 'max' then
      -- Lower achievement is better
      score := case when new.actual_achievement = 0 then 100
                    else (g.target / new.actual_achievement) * 100 end;
    when 'timeline' then
      -- For demo: treat actual as % completion already
      score := new.actual_achievement;
    when 'zero' then
      score := case when new.actual_achievement = 0 then 100 else 0 end;
  end case;

  if score is null then score := 0; end if;
  if score < 0 then score := 0; end if;
  if score > 150 then score := 150; end if;  -- cap stretch achievement

  new.computed_score := round(score, 2);
  return new;
end $$;

drop trigger if exists trg_checkins_compute_score on public.checkins;
create trigger trg_checkins_compute_score
  before insert or update on public.checkins
  for each row execute function public.tg_checkins_compute_score();


-- ---------- Shared-goal achievement sync ----------
-- When a check-in on a SOURCE goal is upserted, mirror its actual+status
-- to check-ins of all child (shared) goals for the same quarter.
create or replace function public.tg_checkins_shared_sync() returns trigger
language plpgsql as $$
declare child record;
begin
  for child in
    select g.id as goal_id
      from public.goals g
     where g.source_goal_id = new.goal_id
  loop
    insert into public.checkins(goal_id, quarter, actual_achievement, status)
    values (child.goal_id, new.quarter, new.actual_achievement, new.status)
    on conflict (goal_id, quarter) do update
       set actual_achievement = excluded.actual_achievement,
           status             = excluded.status,
           submitted_at       = now();
  end loop;
  return new;
end $$;

drop trigger if exists trg_checkins_shared_sync on public.checkins;
create trigger trg_checkins_shared_sync
  after insert or update on public.checkins
  for each row execute function public.tg_checkins_shared_sync();


-- ---------- Auto-create public.users row on auth signup ----------
create or replace function public.tg_auth_user_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users(id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'employee')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_auth_user_created();
