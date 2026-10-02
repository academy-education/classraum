-- 119: close self-service privilege escalation through public.users.role.
-- APPLIED 2026-10-02 after rolled-back tests (escalation reproduced without the guard; blocked with it; normal sign-up and service-role role flips unaffected).
--
-- Found 2026-10-02 (definer-function review, demonstrated in a rolled-back
-- transaction as a demo student):
--   1. users_self_access (FOR ALL, id = auth.uid()) let any signed-in user
--      UPDATE their own row, including role -> 'super_admin', which passes
--      src/lib/admin-auth.ts and every super_admin RLS policy.
--   2. handle_new_user copies raw_user_meta_data->>'role' verbatim, so a
--      sign-up carrying role=super_admin in its metadata created an admin.
--
-- Legitimate role writes all go through the service role (dbAdmin in
-- /api/academy/join, /api/admin/users, /api/admin/academy-members) or are
-- done by hand as the database owner. The browser only ever INSERTs its own
-- row at sign-up with one of the four surface roles (auth/page.tsx fallback).
--
-- Rule enforced by a BEFORE trigger (runs for every caller, RLS or not):
--   * anon/authenticated may never change an existing role, and may insert
--     only student/parent/teacher/manager;
--   * super_admin/admin may be set only by service_role, or by the owner
--     directly (pg_trigger_depth() = 1) — never from inside another trigger,
--     which is how handle_new_user (SECURITY DEFINER) reaches this table.
-- Rollback: DROP TRIGGER users_role_guard ON public.users;
--           DROP FUNCTION public.users_role_guard();

create or replace function public.users_role_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  changed boolean := tg_op = 'INSERT' or new.role is distinct from old.role;
  privileged constant text[] := array['super_admin', 'admin'];
begin
  if not changed then
    return new;
  end if;

  if current_user in ('anon', 'authenticated') then
    if tg_op = 'UPDATE' then
      raise exception 'users.role cannot be changed by the account holder'
        using errcode = '42501';
    end if;
    if new.role is null or new.role not in ('student', 'parent', 'teacher', 'manager') then
      raise exception 'users.role % is not allowed at sign-up', new.role
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role = any (privileged) then
    if current_user = 'service_role' then
      return new;
    end if;
    if current_user in ('postgres', 'supabase_admin') and pg_trigger_depth() = 1 then
      return new;
    end if;
    raise exception 'users.role % may only be granted by the service role', new.role
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.users_role_guard() from public, anon, authenticated;

drop trigger if exists users_role_guard on public.users;
create trigger users_role_guard
  before insert or update of role on public.users
  for each row execute function public.users_role_guard();
