-- 123: only an ACTIVE MANAGER of the academy may set or change
-- classrooms.camp_program_id.
--
-- APPLIED 2026-10-07 after 0e71a9dc deployed; break-tested live (teacher
-- attaching a camp classroom denied, manager allowed; rolled back).
-- Originally written and tested 2026-10-07 inside a rolled-back
-- transaction (see the bottom of this file). Apply after the branch that
-- makes CampClassroomField read-only for teachers ships, so a teacher never
-- sees an enabled control the database then refuses.
--
-- Why. Owner decision (2026-10-07): "only managers may attach a classroom
-- to a camp". Wiring a classroom to a camp makes its teacher_id a camp
-- teacher, who sees every camp student's Study results across the program
-- (src/lib/camp/access.ts). Under 122's rule 4 any ACTIVE TEACHER of the
-- academy could wire their own classroom to a camp, i.e. grant themselves
-- that visibility. A teacher may still BE the camp classroom's teacher_id
-- when a manager assigns them (rule 3 is unchanged).
--
-- What changes, relative to 122 (everything else is carried over verbatim):
--
--   4a. NEW. A signed-in caller (auth.uid() not null) whose write SETS or
--       CHANGES camp_program_id — an INSERT with a program, or an UPDATE
--       where the value is distinct from the old one, including clearing it
--       — must be an ACTIVE manager of the classroom's academy (and of the
--       old academy too, when an UPDATE takes a classroom off a camp while
--       also moving it). Checked BEFORE the early "not a camp classroom"
--       return, because clearing the camp leaves new.camp_program_id null.
--   4b. 122's rule 4, unchanged in effect: any other write to a camp
--       classroom's academy_id / teacher_id by a signed-in caller needs an
--       active teacher or manager of the academy.
--
--   Service role (auth.uid() null) is exempt from 4a and 4b, as before.
--   An UPDATE that resends the SAME camp_program_id (the edit modal always
--   sends the column) is not a change, so a teacher renaming their camp
--   classroom still works.
--
-- Existing rows are unaffected — the trigger fires only on writes. Checked
-- 2026-10-07: 6 live camp classrooms, every teacher_id an active teacher
-- (none a manager); they stay valid and their teachers stay camp teachers.
-- guard_camp_enrolment (rule 5) is not touched.

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
  camp_changed boolean;
begin
  camp_changed := (tg_op = 'INSERT' and new.camp_program_id is not null)
               or (tg_op = 'UPDATE' and new.camp_program_id is distinct from old.camp_program_id);

  -- 4a: setting, re-pointing or clearing the camp is a manager's call.
  if caller is not null and camp_changed then
    if not exists (select 1 from managers m
                    where m.user_id = caller and m.academy_id = new.academy_id and m.active is true) then
      raise exception 'only an active manager of academy % may attach a classroom to a camp', new.academy_id
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.camp_program_id is not null and old.academy_id <> new.academy_id
       and not exists (select 1 from managers m
                        where m.user_id = caller and m.academy_id = old.academy_id and m.active is true) then
      raise exception 'only an active manager of academy % may detach a classroom from its camp', old.academy_id
        using errcode = '42501';
    end if;
  end if;

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

  -- 1
  if prog_academy is null or prog_academy <> new.academy_id then
    raise exception 'camp program % does not belong to academy %', new.camp_program_id, new.academy_id
      using errcode = '42501';
  end if;

  -- 2
  if prog_deleted is not null
     and (tg_op = 'INSERT' or new.camp_program_id is distinct from old.camp_program_id) then
    raise exception 'camp program % has been deleted', new.camp_program_id
      using errcode = '42501';
  end if;

  -- 3
  if new.teacher_id is not null
     and not exists (select 1 from teachers t
                      where t.user_id = new.teacher_id and t.academy_id = new.academy_id and t.active is true)
     and not exists (select 1 from managers m
                      where m.user_id = new.teacher_id and m.academy_id = new.academy_id and m.active is true) then
    raise exception 'camp classroom teacher must be an active teacher or manager of academy %', new.academy_id
      using errcode = '42501';
  end if;

  -- 4b
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

revoke all on function public.guard_camp_classroom() from public, anon, authenticated;

-- The trigger itself (before insert or update of camp_program_id,
-- academy_id, teacher_id on classrooms) is unchanged from 122 and keeps
-- pointing at this function; re-created here only so the migration is
-- self-contained if 122's trigger was ever dropped.
drop trigger if exists guard_camp_classroom on public.classrooms;
create trigger guard_camp_classroom
  before insert or update of camp_program_id, academy_id, teacher_id on public.classrooms
  for each row execute function public.guard_camp_classroom();

-- ── Verification (2026-10-07, live DB). One DO block: probes under the
-- live 122 function, then this file's function + trigger via EXECUTE, then
-- the same probes again, then RAISE — so the migration and every probe row
-- rolled back. Afterwards the live function's md5 was unchanged
-- (fa16e2ab...), 0 probe rows remained and the renamed room's name was
-- untouched. Callers were simulated with SET LOCAL ROLE authenticated and
-- request.jwt.claims, so RLS applied as in the app. Academy 2d521157
-- (demo), its active manager, an active teacher (who teaches a live camp
-- room), and a deactivated teacher.
--
--                                                      122        123
--   A teacher INSERTs own room wired to a camp         ALLOWED    denied (4a)
--   B teacher INSERTs own plain room                   allowed    allowed
--   C teacher renames own camp room, resends same camp allowed    allowed
--   D teacher re-points own camp room to another camp  ALLOWED    denied (4a)
--   E teacher clears the camp on own camp room         ALLOWED    denied (4a)
--   L teacher wires own existing plain room to a camp  ALLOWED    denied (4a)
--   F manager INSERTs camp room, teacher_id = teacher  allowed    allowed
--   G manager re-points the teacher's camp room        allowed    allowed
--   G2 manager wires the teacher's plain room to camp  allowed    allowed
--   H manager camp room for a deactivated teacher      denied (3) denied (3)
--   J manager room on another academy's program        denied (1) denied (1)
--   I service role INSERTs a camp room                 allowed    allowed
--   K service role clears a camp                       allowed    allowed
--
-- Every ALLOWED probe reported rows=1, so none passed by matching nothing.
-- The 4a message reads "attach" for E (a clear) too; left as tested.
