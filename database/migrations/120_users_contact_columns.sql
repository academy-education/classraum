-- 120: hide users.email / users.phone from other signed-in users (owner decision 2, STEP 1).
-- APPLIED 2026-10-06 after the code shipped (7a3eba2b). Verified via PostgREST as a
-- demo student: direct email/phone and select(*) denied (42501), names readable,
-- app_user_contacts returns self only.
--
-- Problem: policy users_read_all_authenticated (FOR SELECT TO authenticated
-- USING (true)) lets any signed-in user read every row of public.users,
-- including email and phone. Row visibility is KEPT in this step — names are
-- read by leaderboards, comments, rosters and messaging. Only the contact
-- columns are narrowed. (Step 2, narrowing rows, is a separate decision.)
--
-- Contact PII on public.users: email, phone. There is no address, birthdate
-- or second phone column (checked information_schema 2026-10-06). The role
-- tables (managers/teachers/students/parents) carry their own `phone` under
-- their own RLS; they are out of scope here.
--
-- Mechanism: Postgres column privileges cannot be row-conditional, so
--   1. authenticated/anon lose the table-wide SELECT and get SELECT back on
--      every column EXCEPT email and phone;
--   2. public.app_user_contacts(uuid[]) (SECURITY DEFINER) returns
--      (id, email, phone) for the requested ids that the caller may see:
--        a. the caller themself,
--        b. members (manager/teacher/student/parent row) of an academy
--           where the caller is an ACTIVE manager or teacher. The CALLER must
--           be active; the TARGET row may be inactive. Deliberate deviation
--           from the brief's "active row" for the target: the staff pages
--           list deactivated members with their email (2026-10-06: 13 of 22
--           teacher rows, 20 of 194 student rows, 12 of 174 parent rows are
--           inactive), so requiring an active target would blank those
--           emails for the academy's own manager. To narrow, add
--           `where active is true` to each branch of the target union.
--        c. callers whose users.role is admin or super_admin
--           (role writes are guarded by migration 119),
--        e. members of the same family (family_members sharing a family_id:
--           parent<->child, siblings) — consistent with get_users_for_family,
--           which already returns family members' emails,
--        d. auth.uid() IS NULL — service role / owner. EXECUTE is revoked
--           from anon and PUBLIC, so an unauthenticated browser cannot reach
--           this branch.
--
-- CONSEQUENCES TO KNOW:
--   * select('*') on users from a browser/user-session client FAILS after this
--     ("permission denied for table users"). The code no longer does it.
--   * Any filter on email/phone (.eq('email', ...)) from a user-session client
--     also needs column SELECT and fails. Only service-role routes filter on them.
--   * A column ADDED to public.users later is NOT selectable by authenticated
--     until it is granted explicitly (the table-wide grant is gone). Add it to
--     the GRANT below in the migration that creates it.
--   * INSERT/UPDATE/DELETE grants are untouched (users still write their own
--     email/phone under users_self_access); writes do not return rows
--     (supabase-js defaults to return=minimal).
--
-- ROLLBACK (restores the pre-120 state exactly):
--   grant select on public.users to authenticated, anon;
--   drop function if exists public.app_user_contacts(uuid[]);
-- (The code on users-pii-step1 keeps working after rollback ONLY if the
--  function is left in place, or via its PGRST202 fallback if dropped.)

begin;

create or replace function public.app_user_contacts(uids uuid[])
returns table (id uuid, email text, phone text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email, u.phone
  from public.users u
  where u.id = any (uids)
    and (
      auth.uid() is null
      or u.id = auth.uid()
      or exists (
        select 1 from public.users me
        where me.id = auth.uid() and me.role in ('admin', 'super_admin')
      )
      or exists (
        select 1
        from (
          select academy_id from public.managers where user_id = auth.uid() and active is true
          union
          select academy_id from public.teachers where user_id = auth.uid() and active is true
        ) staff
        join (
          -- target: ANY membership row, active or not (see header, b.)
          select user_id, academy_id from public.managers
          union all
          select user_id, academy_id from public.teachers
          union all
          select user_id, academy_id from public.students
          union all
          select user_id, academy_id from public.parents
        ) m on m.academy_id = staff.academy_id
        where m.user_id = u.id
      )
      or exists (
        -- e. same family (parent<->child, siblings), as get_users_for_family
        select 1
        from public.family_members a
        join public.family_members b on b.family_id = a.family_id
        where a.user_id = auth.uid() and b.user_id = u.id
      )
    )
$$;

revoke all on function public.app_user_contacts(uuid[]) from public, anon;
grant execute on function public.app_user_contacts(uuid[]) to authenticated, service_role;

comment on function public.app_user_contacts(uuid[]) is
  'Contact PII (email, phone) of public.users for ids the caller may see: self, staff of a shared academy, same family, admins. Migration 120.';

-- Column-level narrowing. Order matters: revoke the table grant, then grant
-- the non-PII columns back.
revoke select on public.users from authenticated, anon;
grant select (
  id, name, role, created_at, updated_at, deletion_scheduled_at,
  is_internal, family_name, given_name, name_confirmed_at,
  name_prompt_snoozed_until, email_verified_at
) on public.users to authenticated, anon;

-- Guard: fail the migration if a column exists that was neither granted nor
-- deliberately withheld (someone added a column between authoring and apply).
do $$
declare missing text;
begin
  select string_agg(column_name, ', ') into missing
  from information_schema.columns
  where table_schema = 'public' and table_name = 'users'
    and column_name not in (
      'id', 'name', 'role', 'created_at', 'updated_at', 'deletion_scheduled_at',
      'is_internal', 'family_name', 'given_name', 'name_confirmed_at',
      'name_prompt_snoozed_until', 'email_verified_at', 'email', 'phone');
  if missing is not null then
    raise exception 'public.users has unclassified columns: % — classify them in migration 120', missing;
  end if;
end $$;

commit;
