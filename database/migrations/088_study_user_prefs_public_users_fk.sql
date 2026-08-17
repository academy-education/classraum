-- study_user_prefs.student_id pointed at auth.users, not public.users.
--
-- The admin "mark as test user" toggle (PATCH /api/admin/study/user) upserts
-- study_user_prefs for any student in the directory — and the directory is
-- built from public.users (role = 'student'). Seven of the 221 students in
-- public.users have no auth.users row (seeded demo/test accounts such as
-- john@student.com, test.student@danielkim.academy), so the upsert failed the
-- FK (23503) and the route returned 500 "update failed". Those are exactly
-- the accounts an operator wants to flag as test users.
--
-- The core study tables that key off the same directory already reference
-- public.users (study_subscriptions, study_sessions, study_mastery,
-- study_entitlements, study_question_reports); study_user_prefs was in the
-- auth.users camp. Repoint it to public.users, same as migration 057 did for
-- level_test_assignments.
--
-- Safe: all 192 existing study_user_prefs rows have a matching public.users
-- row (verified before applying), so nothing violates the new constraint.
-- ON DELETE CASCADE is preserved — account deletion removes the public.users
-- row (migration 027), which now cascades here directly.
begin;

alter table study_user_prefs
  drop constraint study_user_prefs_student_id_fkey;

alter table study_user_prefs
  add constraint study_user_prefs_student_id_fkey
  foreign key (student_id) references public.users(id) on delete cascade;

commit;
