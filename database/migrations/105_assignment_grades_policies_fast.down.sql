-- Rollback for 105: restores the pre-2026-09-04 assignment_grades policies verbatim.
drop policy if exists assignment_grades_managers_access on assignment_grades;
drop policy if exists assignment_grades_teachers_access on assignment_grades;
drop policy if exists assignment_grades_students_access on assignment_grades;
drop policy if exists assignment_grades_parents_access on assignment_grades;
create policy assignment_grades_students_access on assignment_grades for select using (
  (exists (select 1 from users where users.id = auth.uid() and users.role = 'student')) and student_id = auth.uid());
create policy assignment_grades_parents_access on assignment_grades for select using (
  (exists (select 1 from users where users.id = auth.uid() and users.role = 'parent')) and student_id = any (get_user_family_students(auth.uid())));
create policy assignment_grades_managers_access on assignment_grades for all using (
  (exists (select 1 from users where users.id = auth.uid() and users.role = 'manager')) and assignment_id in (
    select a.id from assignments a join classroom_sessions cs on a.classroom_session_id = cs.id join classrooms c on cs.classroom_id = c.id join managers m on c.academy_id = m.academy_id
    where m.user_id = auth.uid() and m.active = true)) with check (
  (exists (select 1 from users where users.id = auth.uid() and users.role = 'manager')) and assignment_id in (
    select a.id from assignments a join classroom_sessions cs on a.classroom_session_id = cs.id join classrooms c on cs.classroom_id = c.id join managers m on c.academy_id = m.academy_id
    where m.user_id = auth.uid() and m.active = true));
create policy assignment_grades_teachers_access on assignment_grades for all using (
  (exists (select 1 from users where users.id = auth.uid() and users.role = 'teacher')) and assignment_id in (
    select a.id from assignments a join classroom_sessions cs on a.classroom_session_id = cs.id join classrooms c on cs.classroom_id = c.id where c.teacher_id = auth.uid())) with check (
  (exists (select 1 from users where users.id = auth.uid() and users.role = 'teacher')) and assignment_id in (
    select a.id from assignments a join classroom_sessions cs on a.classroom_session_id = cs.id join classrooms c on cs.classroom_id = c.id where c.teacher_id = auth.uid()));
drop function if exists public.app_can_manage_assignment(uuid, uuid);
drop function if exists public.app_teaches_assignment(uuid, uuid);
drop function if exists public.app_user_role(uuid);
