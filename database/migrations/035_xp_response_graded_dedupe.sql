-- XP-farming guard for rubric grading (applied to prod 2026-07-03 via
-- Supabase MCP as "xp_response_graded_dedupe").
--
-- /api/study/response/grade now derives a DETERMINISTIC source_id from
-- md5(session_id + prompt_text) instead of the per-call submission id,
-- so re-grading the same task in the same session collides on this
-- index instead of minting +20 XP per call. The unique violation aborts
-- the whole award_study_xp statement, rolling back the weekly
-- xp_this_week increment too.
--
-- Historic rows used per-submission ids (all unique — verified before
-- applying) and are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS study_xp_events_response_graded_once
  ON public.study_xp_events (student_id, source_id)
  WHERE event_type = 'response_graded' AND source_id IS NOT NULL;
