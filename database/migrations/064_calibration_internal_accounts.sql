-- 064_calibration_internal_accounts.sql
--
-- Applied via MCP on 2026-07-28; recorded here so the repo carries the DDL.
--
-- Completes what 063 started. 063 added study_attempts.item_id, making
-- per-item accuracy JOINABLE. This makes it MEANINGFUL, by excluding the
-- accounts whose responses describe a tester checking a UI rather than a
-- student answering a question.
--
-- users.is_internal is set EXPLICITLY, never inferred. A heuristic on the
-- email address misclassifies in both directions: a real student on a gmail
-- address looks like a tester, and a teammate on a school domain looks like
-- a student. Marking is knowledge the team has and SQL does not.
--
-- study_item_calibration reports `attempts` next to `p_value`, and leaves
-- measured_difficulty NULL below 30 attempts. That threshold is the point:
-- every difficulty label in this bank is currently an estimate or a proxy,
-- and replacing one with a p-value computed over six responses would swap an
-- honest estimate for a confident wrong number.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_internal
  ON public.users (is_internal) WHERE is_internal;

UPDATE public.users SET is_internal = true
WHERE email LIKE '%@demo.classraum.com'
   OR id = '153e9944-59f5-4c4e-9807-4d429b2539f5';

-- View definition: see migration applied via MCP (study_item_calibration).
-- Left out of this file to avoid two diverging copies of the SQL; query
-- pg_get_viewdef('public.study_item_calibration') for the live definition.
