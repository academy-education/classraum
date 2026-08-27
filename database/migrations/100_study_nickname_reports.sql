-- Reporting a study nickname.
--
-- The nickname is the one string a student picks that other students see
-- — leaderboards, friend search, duels. Migration-time content rules
-- (src/lib/study/nickname-moderation.ts) catch the obvious cases, but no
-- word list is complete and Korean profanity overlaps ordinary words, so
-- that list is deliberately conservative. This is the path for the tail:
-- a human says "that one is not okay".
--
-- FOUR DESIGN POINTS, each guarding a specific failure:
--
--  1. THE NICKNAME IS SNAPSHOT, not just referenced. A handle can be
--     changed (once) and a moderator can clear it, so a report that only
--     pointed at a user would become unreadable the moment either
--     happened — "reported for their nickname" with no way to know which
--     nickname. reported_nickname preserves the evidence.
--
--  2. NO SELF-REPORTS. Cheap to enforce, and a self-report is either a
--     mistake or an attempt to pollute the queue.
--
--  3. ONE OPEN REPORT PER REPORTER PER TARGET. Without this, one student
--     can file the same complaint fifty times and bury the queue — or
--     make a target look far worse than the evidence supports. Resolved
--     reports do not block a NEW one, so a repeat offender can be
--     reported again after a moderator has acted.
--
--  4. REPORTERS CANNOT READ THE QUEUE. They may insert, and read back
--     only their own rows. Letting a reporter see status would leak how
--     moderation treated another user.

CREATE TABLE IF NOT EXISTS public.study_nickname_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  reported_student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Evidence, not a pointer. See design point 1.
  reported_nickname   text NOT NULL,

  reporter_student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Optional, and bounded: a free-text box with no cap is a place to
  -- paste abuse into a moderator's screen.
  reason              text CHECK (reason IS NULL OR char_length(reason) <= 500),

  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'actioned', 'dismissed')),

  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  resolved_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_note     text CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 1000),

  CONSTRAINT study_nickname_reports_no_self
    CHECK (reported_student_id <> reporter_student_id)
);

-- Design point 3. Partial, so only OPEN reports collide.
CREATE UNIQUE INDEX IF NOT EXISTS study_nickname_reports_one_open_per_pair
  ON public.study_nickname_reports (reporter_student_id, reported_student_id)
  WHERE status = 'pending';

-- The moderation queue reads pending-first, newest-first.
CREATE INDEX IF NOT EXISTS study_nickname_reports_queue
  ON public.study_nickname_reports (status, created_at DESC);

-- Counting open reports against one student is the signal a moderator
-- actually acts on, so it gets its own index.
CREATE INDEX IF NOT EXISTS study_nickname_reports_by_target
  ON public.study_nickname_reports (reported_student_id, status);

ALTER TABLE public.study_nickname_reports ENABLE ROW LEVEL SECURITY;

-- A student may file a report AS THEMSELVES. The reporter id is pinned
-- to auth.uid() so a report cannot be filed in someone else's name.
DROP POLICY IF EXISTS "study_nickname_reports insert own" ON public.study_nickname_reports;
CREATE POLICY "study_nickname_reports insert own"
  ON public.study_nickname_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_student_id = auth.uid());

-- ...and read back only their own. Design point 4: no visibility into
-- the queue, or into how another user's report was handled.
DROP POLICY IF EXISTS "study_nickname_reports select own" ON public.study_nickname_reports;
CREATE POLICY "study_nickname_reports select own"
  ON public.study_nickname_reports
  FOR SELECT TO authenticated
  USING (reporter_student_id = auth.uid());

-- No UPDATE or DELETE policy exists, deliberately: a reporter must not
-- be able to withdraw or edit a report after filing, and moderation runs
-- through the service role in /api/admin/*, which bypasses RLS. Adding a
-- policy here would widen that surface for no gain.

COMMENT ON TABLE public.study_nickname_reports IS
  'Student-filed reports about another student''s public study nickname. '
  'reported_nickname is a snapshot: the handle can change and a moderator '
  'can clear it, and the report must still be readable afterwards.';
