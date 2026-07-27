-- level_test_assignments.student_id pointed at auth.users, not public.users.
--
-- PostgREST only exposes the `public` schema, so it cannot traverse a
-- foreign key into `auth`. The assignment listing embeds the student:
--
--   .select('id, student_id, ..., users!level_test_assignments_student_id_fkey(id, name, email)')
--
-- which failed with "Could not find a relationship between
-- 'level_test_assignments' and 'users' in the schema cache", and the
-- route returns 500 — so a manager could not see who a level test had
-- been assigned to.
--
-- Every other table in this schema references public.users for this
-- purpose (invoices.student_id, classrooms.teacher_id, and so on). This
-- table was the outlier.
--
-- Safe: the table is empty (0 rows), so nothing can violate the new
-- constraint. `assigned_by` is deliberately left pointing at auth.users
-- — nothing embeds it, and changing it would be churn for its own sake.
begin;

alter table level_test_assignments
  drop constraint level_test_assignments_student_id_fkey;

alter table level_test_assignments
  add constraint level_test_assignments_student_id_fkey
  foreign key (student_id) references public.users(id) on delete cascade;

commit;
