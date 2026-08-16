-- 086: Camp reports — a camp-specific student report for parents,
-- DISTINCT from academy report cards (student_reports). Built as a
-- SNAPSHOT of Study attempt data: the generate route computes the
-- numbers once and freezes them into payload jsonb; a report is a
-- record, not a live query.
--
-- Write model follows 082: clients READ, the service role WRITES
-- (generation goes through POST /api/camp/reports/generate, which
-- enforces teacher/manager auth — service_role bypasses RLS, so no
-- write policy exists on purpose).
--
-- Parent read access mirrors the student_reports parent policy exactly:
-- get_user_family_students(auth.uid()) resolves the caller's linked
-- children through family_members (parent row + student rows sharing a
-- family_id).

create table if not exists camp_reports (
  id uuid primary key default gen_random_uuid(),
  camp_program_id uuid not null references camp_programs(id) on delete cascade,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  -- auth uid of the student (study_*.student_id IS the auth uid — see
  -- docs/CAMP-MODE-PLAN.md identity bridge). FK to auth.users matches
  -- the camp_assignments.teacher_id precedent.
  student_id uuid not null references auth.users(id),
  period_start date,
  period_end date,
  payload jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_camp_reports_classroom
  on camp_reports(classroom_id) where deleted_at is null;
create index if not exists idx_camp_reports_student
  on camp_reports(student_id) where deleted_at is null;

alter table camp_reports enable row level security;

-- Classroom teacher or academy manager reads (same shape as the 082
-- camp_assignments read policy / canManageClassroom).
create policy "Teachers and managers read camp reports" on camp_reports
  for select using (
    exists (
      select 1 from classrooms c
      where c.id = camp_reports.classroom_id
        and (
          c.teacher_id = auth.uid()
          or exists (
            select 1 from managers m
            where m.user_id = auth.uid() and m.academy_id = c.academy_id
          )
        )
    )
  );

-- Students read their own reports (mirrors student_reports_students_access).
create policy "Students read their camp reports" on camp_reports
  for select using (
    exists (
      select 1 from users
      where users.id = auth.uid() and users.role = 'student'
    )
    and student_id = auth.uid()
  );

-- Parents read reports of their linked children (mirrors
-- student_reports_parents_access).
create policy "Parents read their children camp reports" on camp_reports
  for select using (
    exists (
      select 1 from users
      where users.id = auth.uid() and users.role = 'parent'
    )
    and student_id = any (get_user_family_students(auth.uid()))
  );
