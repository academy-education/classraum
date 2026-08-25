-- Camp assignments can hang off a classroom session, like ordinary ones.
--
-- NULLABLE, deliberately. Two shapes of camp exist: one that runs to a
-- fixed timetable (a partner school slotting camp work into its normal
-- periods) and a vacation intensive that has no timetable at all.
-- Requiring a session would force a teacher to create one before they
-- could set any homework, which is friction for the second shape and no
-- benefit to the first.
--
-- NOT a merge into public.assignments. Camp assignments are bank-drawn,
-- quota-charged and auto-graded; ordinary ones are teacher-authored and
-- hand-graded. One table for both means every ordinary-assignment screen
-- grows camp-only conditionals.
--
-- ON DELETE SET NULL: deleting a session must not delete the camp work
-- that referenced it. The quota was already charged for those questions,
-- so the assignment has to survive and simply lose its session.

ALTER TABLE public.camp_assignments
  ADD COLUMN IF NOT EXISTS classroom_session_id uuid
    REFERENCES public.classroom_sessions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.camp_assignments.classroom_session_id IS
  'Optional link to the classroom session this camp assignment belongs to. '
  'NULL means the assignment is not tied to a scheduled session — valid, and '
  'the norm for vacation camps that run without a timetable.';

-- Looking up "what work belongs to this session" is the read this column
-- exists for, so index it. Partial: most rows are expected to be NULL.
CREATE INDEX IF NOT EXISTS camp_assignments_session_idx
  ON public.camp_assignments (classroom_session_id)
  WHERE classroom_session_id IS NOT NULL;
