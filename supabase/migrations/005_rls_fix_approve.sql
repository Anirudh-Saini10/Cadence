-- =====================================================================
-- Cadence — 005 RLS fix: allow manager-approve transition
--
-- Bug: When a manager updates status='submitted' -> 'approved', the
-- BEFORE trigger `tg_goals_lock_on_approve` stamps locked_at = now().
-- The WITH CHECK clause then evaluates the NEW row and saw
-- locked_at IS NOT NULL, rejecting with:
--   "new row violates row-level security policy for table goals"
--
-- Fix: rewrite WITH CHECK to whitelist the legitimate post-state by
-- (employee_id, role, new status) — independent of locked_at, which is
-- managed by trusted trigger code.
-- =====================================================================

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
    -- Employee may end at draft/submitted/returned on their own goals
    or (employee_id = auth.uid() and status in ('draft','submitted','returned'))
    -- Manager may end at approved/returned/submitted on their reports' goals.
    -- We don't re-check locked_at here because the BEFORE trigger
    -- legitimately sets it on the approve transition.
    or (public.is_my_report(employee_id) and status in ('approved','returned','submitted'))
  );
