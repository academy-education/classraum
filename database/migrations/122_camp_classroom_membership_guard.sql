-- 122: a camp classroom, its program, its teacher and its students must
-- all belong to ONE academy.
--
-- NOT APPLIED. Written and tested 2026-10-07 inside a rolled-back
-- transaction (see the bottom of this file); apply after the code on
-- branch camp-study-visibility ships.
--
-- Why. Owner rule (2026-10-07): "Only camp teachers can see the study
-- results ... as long as the teacher and the student is in the same camp."
-- "Camp teacher" is derived from classrooms.teacher_id on a classroom whose
-- camp_program_id is set, and "same camp" from classroom_students. Both
-- rows were writable with no academy check:
--
--   * classrooms_teacher_policy is FOR ALL ... WITH CHECK (teacher_id =
--     auth.uid()) — nothing ties academy_id or camp_program_id to the
--     caller. Measured on the live DB (rolled back): a teacher of the demo
--     academy, with no row in the E2E Camp academy at all, inserted a
--     classroom into that academy pointed at its TOEFL camp program.
--   * classroom_students_teachers_access checks only that the classroom is
--     the caller's — so the same teacher then enrolled that academy's
--     camp student into the forged room.
--
-- That pair made a stranger the "camp teacher" of a student in another
-- school: the per-student drill-down exposed the student's name, email and
-- mock tests, and the assignment builder let them spend the other school's
-- paid question quota. The API now refuses incoherent rows
-- (src/lib/camp/access.ts, canManageClassroom); this migration stops them
-- being written.
--
-- Rules, enforced by BEFORE triggers (RLS WITH CHECK cannot see the
-- program's academy without a subquery per row, and a trigger also covers
-- the manager policy and service-role writes):
--
--   classrooms, when camp_program_id is set:
--     1. the program belongs to the classroom's academy (always);
--     2. a NEWLY chosen program must be live (not soft-deleted);
--     3. teacher_id, when set, is an ACTIVE teacher or manager of that
--        academy;
--     4. a signed-in caller (auth.uid() not null) is an ACTIVE manager or
--        teacher of that academy. Service role (auth.uid() null) skips
--        only this rule.
--   classroom_students, when the classroom is a camp classroom:
--     5. the student has a students row in the classroom's academy.
--
-- Deliberately NOT done here (owner decisions, see the report):
--   * whether a plain academy teacher may wire THEIR OWN classroom to a
--     camp (rule 4 allows any active teacher of the academy, matching the
--     current CampClassroomField UI);
--   * the same academy check for NON-camp classrooms. The write gap exists
--     there too, but no Study data hangs off it.
--
-- Existing data: checked 2026-10-07 — every camp classroom's program is in
-- its own academy, every camp classroom teacher is a teacher/manager of it,
-- and every enrolled camp student has a students row there (0 violations),
-- so no row is invalidated. The triggers only fire on writes.

create or replace function public.guard_camp_classroom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prog_academy uuid;
  prog_deleted timestamptz;
  caller uuid := auth.uid();
begin
  if new.camp_program_id is null then
    return new;
  end if;

  -- Unchanged camp wiring (a rename, a colour change): nothing to check.
  if tg_op = 'UPDATE'
     and new.camp_program_id is not distinct from old.camp_program_id
     and new.academy_id = old.academy_id
     and new.teacher_id is not distinct from old.teacher_id then
    return new;
  end if;

  select academy_id, deleted_at into prog_academy, prog_deleted
    from camp_programs where id = new.camp_program_id;

  if prog_academy is null or prog_academy <> new.academy_id then
    raise exception 'camp program % does not belong to academy %', new.camp_program_id, new.academy_id
      using errcode = '42501';
  end if;

  if prog_deleted is not null
     and (tg_op = 'INSERT' or new.camp_program_id is distinct from old.camp_program_id) then
    raise exception 'camp program % has been deleted', new.camp_program_id
      using errcode = '42501';
  end if;

  if new.teacher_id is not null
     and not exists (select 1 from teachers t
                      where t.user_id = new.teacher_id and t.academy_id = new.academy_id and t.active is true)
     and not exists (select 1 from managers m
                      where m.user_id = new.teacher_id and m.academy_id = new.academy_id and m.active is true) then
    raise exception 'camp classroom teacher must be an active teacher or manager of academy %', new.academy_id
      using errcode = '42501';
  end if;

  if caller is not null
     and not exists (select 1 from teachers t
                      where t.user_id = caller and t.academy_id = new.academy_id and t.active is true)
     and not exists (select 1 from managers m
                      where m.user_id = caller and m.academy_id = new.academy_id and m.active is true) then
    raise exception 'only staff of academy % may wire a classroom to its camp', new.academy_id
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.guard_camp_enrolment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_academy uuid;
  room_camp uuid;
begin
  select academy_id, camp_program_id into room_academy, room_camp
    from classrooms where id = new.classroom_id;

  if room_camp is null then
    return new;
  end if;

  if not exists (select 1 from students s
                  where s.user_id = new.student_id and s.academy_id = room_academy) then
    raise exception 'student % is not a student of academy % and cannot join its camp classroom',
      new.student_id, room_academy
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_camp_classroom() from public, anon, authenticated;
revoke all on function public.guard_camp_enrolment() from public, anon, authenticated;

drop trigger if exists guard_camp_classroom on public.classrooms;
create trigger guard_camp_classroom
  before insert or update of camp_program_id, academy_id, teacher_id on public.classrooms
  for each row execute function public.guard_camp_classroom();

drop trigger if exists guard_camp_enrolment on public.classroom_students;
create trigger guard_camp_enrolment
  before insert or update of classroom_id, student_id on public.classroom_students
  for each row execute function public.guard_camp_enrolment();

-- ── Verification (2026-10-07, live DB, every run ended in RAISE so the whole
-- transaction — migration included — rolled back; afterwards 0 triggers,
-- 0 functions, 0 probe rows remained). The plain teacher was made active
-- inside the transaction, since all 10 non-camp demo teachers are inactive.
--
--                                                  before 122   with 122
--   plain teacher: classroom in the E2E academy
--     wired to its TOEFL camp (A)                  ALLOWED      denied (rule 3)
--   plain teacher: own-academy room on own camp (B) allowed      allowed (rule 4)
--   ... enrol an own-academy student (B2)          allowed      allowed
--   ... enrol the E2E academy's camp student (B3)  ALLOWED      denied (rule 5)
--   camp teacher renames own camp room             allowed      allowed
--   manager: camp room for a deactivated teacher   ALLOWED      denied (rule 3)
--   manager: camp room for an active teacher       allowed      allowed
--   manager: demo room wired to an E2E program (E) (n/a)        denied (rule 1)
-- Rule 2 (newly choosing a soft-deleted program) was not exercised
-- separately: the only deleted programs live in another academy, so rule 1
-- fires first.
