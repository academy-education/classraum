-- 081: Camp mode — schools run SAT/TOEFL camp programs on top of
-- classrooms, with teacher assignments drawn from the study item bank
-- and delivered to students in Study mode.
--
-- Design decisions (Andy, 2026-08-15):
--   * every student in the classroom gets the SAME item set per
--     assignment (class review + fair comparison), so item_ids live on
--     the assignment, not per student
--   * the paid question quota counts PER ASSIGNMENT (20 questions
--     assigned to 15 students = 20 used); student_cap is a separate,
--     manually enforced ceiling
--   * billing is manual for v1 — quota is set by us when the school pays
--
-- Per-student progress is NOT a table here: a student's session is a
-- study_sessions row tagged config.campAssignmentId (the same pattern
-- the daily challenge uses), so completion is queried from study data.

create table if not exists camp_programs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  name text not null,
  test_family text not null check (test_family in ('sat', 'toefl')),
  starts_on date,
  ends_on date,
  question_quota integer not null default 0,
  questions_used integer not null default 0,
  student_cap integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- A classroom opts into a camp program. Nullable: normal classrooms
-- are untouched. One program can span many classrooms (a school with
-- several sections), matching how international schools run cohorts.
alter table classrooms add column if not exists camp_program_id uuid
  references camp_programs(id) on delete set null;

create table if not exists camp_assignments (
  id uuid primary key default gen_random_uuid(),
  camp_program_id uuid not null references camp_programs(id) on delete cascade,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  teacher_id uuid not null references auth.users(id),
  title text not null,
  -- what was drawn: family/section/domain filters as picked by the teacher
  section text,
  domain text,
  question_count integer not null,
  -- the fixed, shared item set (uuid[] of study_item_bank ids)
  item_ids jsonb not null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_camp_assignments_classroom
  on camp_assignments(classroom_id) where deleted_at is null;
create index if not exists idx_camp_programs_academy
  on camp_programs(academy_id) where deleted_at is null;

-- ── RLS, following the 010_create_schedule_breaks pattern ───────────
alter table camp_programs enable row level security;
alter table camp_assignments enable row level security;

-- Managers of the academy manage programs.
create policy "Academy managers manage camp programs" on camp_programs
  for all using (
    exists (
      select 1 from managers m
      where m.user_id = auth.uid() and m.academy_id = camp_programs.academy_id
    )
  ) with check (
    exists (
      select 1 from managers m
      where m.user_id = auth.uid() and m.academy_id = camp_programs.academy_id
    )
  );

-- Teachers of the academy can read programs (to assign against them).
create policy "Academy teachers read camp programs" on camp_programs
  for select using (
    exists (
      select 1 from teachers t
      where t.user_id = auth.uid() and t.academy_id = camp_programs.academy_id
    )
  );

-- Classroom teacher or academy manager manages assignments.
create policy "Teachers and managers manage camp assignments" on camp_assignments
  for all using (
    exists (
      select 1 from classrooms c
      where c.id = camp_assignments.classroom_id
        and (
          c.teacher_id = auth.uid()
          or exists (
            select 1 from managers m
            where m.user_id = auth.uid() and m.academy_id = c.academy_id
          )
        )
    )
  ) with check (
    exists (
      select 1 from classrooms c
      where c.id = camp_assignments.classroom_id
        and (
          c.teacher_id = auth.uid()
          or exists (
            select 1 from managers m
            where m.user_id = auth.uid() and m.academy_id = c.academy_id
          )
        )
    )
  );

-- Students read the assignments of classrooms they belong to (the
-- Study-mode shelf reads through the API with the student's own auth).
create policy "Students read their camp assignments" on camp_assignments
  for select using (
    exists (
      select 1 from classroom_students cs
      where cs.classroom_id = camp_assignments.classroom_id
        and cs.student_id = auth.uid()
    )
  );
