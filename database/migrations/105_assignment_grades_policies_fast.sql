-- 105: assignment_grades RLS without nested-policy explosion
--
-- WHY. On 2026-09-03 the student assignments page returned empty lists and a
-- pending count of 0 for the demo student, and the same student showed
-- "pending" counts of 10 / 75 / 170 / 200 / 220 across five page loads. The
-- browser was receiving HTTP 500 "canceling statement due to statement
-- timeout" (57014) from PostgREST on assignment_grades. EXPLAIN as that
-- student: 237 InitPlans, planning 236 ms (3.3 s under load), execution up
-- to 5.4 s for 49 rows - the manager/teacher policies' IN (SELECT ... JOIN
-- assignments JOIN classroom_sessions JOIN classrooms JOIN managers) pulled
-- in every one of those tables' own policies, recursively, for a STUDENT
-- who could never satisfy them. Without RLS the same query plans in 1.6 ms.
--
-- WHAT. The membership tests move into STABLE SECURITY DEFINER functions
-- (they return only booleans, never rows), auth.uid() is wrapped in a
-- scalar subquery so it is evaluated once, and the student policy is the
-- bare equality it always was in effect. Measured in a rolled-back
-- transaction with the app's exact query shape: planning 1.2 ms, execution
-- 104 ms for the same 219-row student. Access semantics are unchanged:
--   students  - own rows
--   parents   - rows of get_user_family_students(uid)
--   managers  - rows whose assignment sits in a classroom of an academy
--               they actively manage (ALL)
--   teachers  - rows whose assignment sits in a classroom they teach (ALL)
--
-- The other tables in that join chain (assignments, classroom_sessions,
-- classrooms, classroom_students, students, managers) still carry the
-- nested-policy pattern and will show the same shape on their own heavy
-- queries; this migration fixes the one that was timing out for students.

create or replace function public.app_user_role(uid uuid)
returns text language sql stable security definer set search_path = public as
$$ select role from users where id = uid $$;

create or replace function public.app_can_manage_assignment(uid uuid, aid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from assignments a
     join classroom_sessions cs on cs.id = a.classroom_session_id
     join classrooms c on c.id = cs.classroom_id
     join managers m on m.academy_id = c.academy_id
     where a.id = aid and m.user_id = uid and m.active = true) $$;

create or replace function public.app_teaches_assignment(uid uuid, aid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from assignments a
     join classroom_sessions cs on cs.id = a.classroom_session_id
     join classrooms c on c.id = cs.classroom_id
     where a.id = aid and c.teacher_id = uid) $$;

revoke all on function public.app_user_role(uuid) from public;
revoke all on function public.app_can_manage_assignment(uuid, uuid) from public;
revoke all on function public.app_teaches_assignment(uuid, uuid) from public;
grant execute on function public.app_user_role(uuid) to authenticated, service_role;
grant execute on function public.app_can_manage_assignment(uuid, uuid) to authenticated, service_role;
grant execute on function public.app_teaches_assignment(uuid, uuid) to authenticated, service_role;

drop policy if exists assignment_grades_managers_access on assignment_grades;
drop policy if exists assignment_grades_teachers_access on assignment_grades;
drop policy if exists assignment_grades_students_access on assignment_grades;
drop policy if exists assignment_grades_parents_access on assignment_grades;

create policy assignment_grades_students_access on assignment_grades
  for select using (student_id = (select auth.uid()));

create policy assignment_grades_parents_access on assignment_grades
  for select using (
    app_user_role((select auth.uid())) = 'parent'
    and student_id = any (get_user_family_students((select auth.uid()))));

create policy assignment_grades_managers_access on assignment_grades
  for all
  using (app_user_role((select auth.uid())) = 'manager' and app_can_manage_assignment((select auth.uid()), assignment_id))
  with check (app_user_role((select auth.uid())) = 'manager' and app_can_manage_assignment((select auth.uid()), assignment_id));

create policy assignment_grades_teachers_access on assignment_grades
  for all
  using (app_user_role((select auth.uid())) = 'teacher' and app_teaches_assignment((select auth.uid()), assignment_id))
  with check (app_user_role((select auth.uid())) = 'teacher' and app_teaches_assignment((select auth.uid()), assignment_id));
