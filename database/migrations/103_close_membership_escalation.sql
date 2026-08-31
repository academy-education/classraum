-- 103: close the self-serve membership escalation.
--
--
-- WHAT WAS WRONG, DEMONSTRATED RATHER THAN ARGUED
--
-- The signup form let anyone pick "manager" from a dropdown and type an
-- academy UUID. `users.role` was set from that dropdown, and the
-- managers_self_insert policy authorised on exactly that self-declared
-- role while saying nothing about academy_id:
--
--   WITH CHECK (user_id = auth.uid() AND EXISTS(
--     SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'manager'))
--
-- Proven in a rolled-back transaction on 2026-08-29: a fresh account
-- with role='manager' inserted a managers row for HERALD, an academy it
-- had no relationship to, and could then read HERALD's 6 students, 1
-- parent and 3 teachers. teachers_self_insert had the identical shape
-- and the identical result.
--
-- Academy UUIDs travel in every invite link, so the id was never secret.
--
-- A NOTE ON HOW NEARLY THIS WAS MISSED: the first probe used
-- INSERT..SELECT to pick the academy AFTER dropping to the attacker's
-- role. The subquery returned nothing, the insert wrote 0 rows, and the
-- result looked exactly like RLS blocking the attack. A probe that
-- cannot distinguish "blocked" from "inserted nothing" is not evidence.
--
--
-- WHAT REPLACES IT
--
-- There is no academies INSERT anywhere in the codebase — academies are
-- provisioned out of band. So the only legitimate shapes are:
--
--   * BOOTSTRAP: the first manager of an academy that has none yet.
--   * DELEGATION: an existing active manager adds someone to their own
--     academy.
--
-- Teachers lose self-insert entirely. teachers_managers_access already
-- lets a manager add teachers to their own academy, so the capability
-- exists; only the self-serve route is removed.
--
--
-- THE POLICY THAT WAS ACTUALLY AT FAULT
--
-- The first fix attempted here tightened managers_self_insert and
-- dropped teachers_self_insert, and BOTH ATTACKS STILL SUCCEEDED. The
-- reason is that `managers_self_access` and `teachers_self_access` are
-- FOR ALL policies whose WITH CHECK is only `user_id = auth.uid()`.
-- Permissive RLS policies are OR-ed, so a FOR ALL policy grants INSERT
-- regardless of what any INSERT-specific policy says. Tightening the
-- narrow policy while the broad one stood was theatre.
--
-- That is why the *_self_access policies are split below into
-- SELECT/UPDATE/DELETE, leaving INSERT governed by exactly one rule.
--
-- UPDATE is constrained too, and for the same reason: a self-update
-- policy checking only `user_id = auth.uid()` lets a legitimate manager
-- of academy A rewrite their own row's academy_id to academy B. The
-- check requires the NEW academy to be one the caller already actively
-- manages, so A→A passes and A→B does not.
--
--
-- WHY SECURITY DEFINER HELPERS
--
-- A policy on `managers` that sub-queries `managers` re-enters the same
-- policy and recurses. The helpers below run as the definer, so the
-- lookup is not itself subject to RLS.

begin;

create or replace function public.academy_has_active_manager(a uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.managers where academy_id = a and active is true)
$$;

create or replace function public.is_active_manager_of(a uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.managers
    where academy_id = a and user_id = auth.uid() and active is true)
$$;

/** Every academy the caller belongs to, in any capacity. Used to scope
 *  the directory reads below to the caller's own tenant. */
create or replace function public.caller_academy_ids()
returns setof uuid language sql security definer stable
set search_path = public as $$
  select academy_id from public.managers where user_id = auth.uid() and active is true
  union
  select academy_id from public.teachers where user_id = auth.uid() and active is true
  union
  select academy_id from public.students where user_id = auth.uid() and active is true
  union
  select academy_id from public.parents  where user_id = auth.uid() and active is true
$$;

revoke all on function public.academy_has_active_manager(uuid) from public;
revoke all on function public.is_active_manager_of(uuid) from public;
revoke all on function public.caller_academy_ids() from public;
grant execute on function public.academy_has_active_manager(uuid) to authenticated;
grant execute on function public.is_active_manager_of(uuid) to authenticated;
grant execute on function public.caller_academy_ids() to authenticated;

-- ── managers ────────────────────────────────────────────────────────
drop policy if exists managers_self_insert on public.managers;
create policy managers_self_insert on public.managers
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'manager')
    and (
      -- bootstrap an academy that has no manager yet …
      not public.academy_has_active_manager(academy_id)
      -- … or re-add yourself to one you already manage
      or public.is_active_manager_of(academy_id)
    )
  );

-- Delegation: an active manager may add ANOTHER user to their own academy.
-- This is what replaces the self-serve route for a second manager.
drop policy if exists managers_added_by_manager on public.managers;
create policy managers_added_by_manager on public.managers
  for insert to authenticated
  with check (public.is_active_manager_of(academy_id));

-- Split the FOR ALL self-access policy. This is the load-bearing change:
-- while it existed, INSERT was permitted by `user_id = auth.uid()` alone.
drop policy if exists managers_self_access on public.managers;
create policy managers_self_select on public.managers
  for select to authenticated using (user_id = auth.uid());
create policy managers_self_delete on public.managers
  for delete to authenticated using (user_id = auth.uid());
create policy managers_self_update on public.managers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_active_manager_of(academy_id));

-- ── teachers ────────────────────────────────────────────────────────
-- No self-insert at all. teachers_managers_access already lets a manager
-- add a teacher to their own academy, so the capability is not lost.
drop policy if exists teachers_self_insert on public.teachers;
drop policy if exists teachers_self_access on public.teachers;
create policy teachers_self_select on public.teachers
  for select to authenticated using (user_id = auth.uid());
create policy teachers_self_update on public.teachers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
    and academy_id in (select academy_id from public.teachers t
                        where t.user_id = auth.uid() and t.active is true));

-- ── cross-tenant directory reads ────────────────────────────────────
--
-- parents_read_all and managers_read_all let ANY authenticated
-- student/parent/teacher/manager read EVERY row in those tables. Counted
-- 2026-08-29: 174 parent rows spanning 4 academies, visible to any
-- signed-in user before any escalation at all. Scoped to the caller's
-- own academies.
drop policy if exists parents_read_all on public.parents;
create policy parents_read_all on public.parents
  for select to authenticated
  using (academy_id in (select public.caller_academy_ids()));

drop policy if exists managers_read_all on public.managers;
create policy managers_read_all on public.managers
  for select to authenticated
  using (academy_id in (select public.caller_academy_ids()));

commit;
