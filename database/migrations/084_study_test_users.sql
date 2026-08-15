-- 084: study test-user flag + last-activity aggregate for the admin directory
--
-- 1. is_test_user on study_user_prefs — operator-set flag (admin console only).
--    study_user_prefs is service-role-written (RLS blocks direct client writes;
--    /api/study/prefs whitelists mutable keys and is_test_user is NOT in that
--    whitelist), so a student cannot set or clear this about themselves.
-- 2. admin_study_last_activity() — max(study_sessions.last_active_at) per
--    student, so the admin user directory can default-sort by "most recently
--    active" without fetching every session row.

alter table public.study_user_prefs
  add column if not exists is_test_user boolean not null default false;

comment on column public.study_user_prefs.is_test_user is
  'Operator-set flag: internal/test account. Set only via the admin console (service role). Display-only for now — not yet wired into analytics exclusion.';

create or replace function public.admin_study_last_activity()
returns table (student_id uuid, last_active timestamptz)
language sql
stable
set search_path = public
as $$
  select student_id, max(last_active_at)
  from public.study_sessions
  group by student_id;
$$;

revoke all on function public.admin_study_last_activity() from public, anon, authenticated;
grant execute on function public.admin_study_last_activity() to service_role;
