-- Double-submit guard for full-test submissions (applied to prod
-- 2026-07-03 via Supabase MCP as "study_attempts_position_unique").
--
-- position = the question's 0-based index within its test. Written by
-- /api/study/test/submit on the bulk insert; NULL on legacy rows and
-- on practice-mode attempts (which legitimately re-attempt the same
-- question). The PARTIAL unique index therefore:
--   * needs no backfill or dedupe (verified: zero duplicate-question
--     full_test sessions in prod before applying),
--   * closes the race where two rapid Submit taps both pass the
--     "already has attempts?" check and both bulk-insert — the second
--     insert now fails atomically (whole statement, so no partial
--     rows) and the route replays the stored result instead.
-- Also fixes replay ordering: ids are gen_random_uuid(), so the old
-- ORDER BY id returned verdicts in arbitrary order on replay.
ALTER TABLE public.study_attempts ADD COLUMN IF NOT EXISTS position integer;

CREATE UNIQUE INDEX IF NOT EXISTS study_attempts_session_position_once
  ON public.study_attempts (session_id, position)
  WHERE position IS NOT NULL;
