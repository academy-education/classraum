-- 063_study_attempts_item_id.sql
--
-- Make per-item difficulty CALIBRATION possible.
--
-- WHY
-- ---
-- Every difficulty label in study_item_bank is currently either a model
-- estimate (the listening CEFR pass) or a computed proxy (word count for
-- Listen-and-Repeat, token count for Build-a-Sentence). None of them is a
-- measurement. The only thing that would make them measurements is student
-- response data: p-value per item, computed from real attempts.
--
-- That was blocked by something more basic than the known test-account
-- contamination: study_attempts has NO reference to the bank row. It stores
-- `question` as jsonb and links only to a session. There is no item_id, so
-- "how often do students get item X wrong" is not answerable at all.
--
-- Matching on question CONTENT is not a workaround. Choice order is now
-- randomised per session at draw time (see shuffleDrawnChoices in
-- src/lib/study/assemble.ts), so the served question's `choices` array
-- deliberately differs from the bank's and from other sessions'. Any
-- content hash over the served item would scatter one bank item across
-- many keys.
--
-- So: carry the bank row id on the attempt.
--
-- NULLABLE, and no foreign key
-- ----------------------------
-- Nullable because attempts from AI-generated tests have no bank row, and
-- every attempt already recorded predates this column. A NOT NULL would
-- reject exactly the traffic this is meant to observe.
--
-- No FK to study_item_bank: an item can be archived or replaced (133
-- Listen-and-Repeat rows were archived on 2026-07-28), and losing the
-- historical attempt record because its item was retired would destroy the
-- calibration history this column exists to build. The id is a pointer for
-- analysis, not a relational guarantee.

BEGIN;

ALTER TABLE public.study_attempts
  ADD COLUMN IF NOT EXISTS item_id uuid;

COMMENT ON COLUMN public.study_attempts.item_id IS
  'study_item_bank.id when this question came from the bank; NULL for '
  'AI-generated questions and for attempts recorded before 2026-07-28. '
  'Deliberately not a foreign key so archiving an item does not erase its '
  'response history. Feeds per-item p-value calibration.';

-- The calibration query is "all attempts for item X", so the index leads
-- with item_id. Partial, because the NULL rows (generated questions) are
-- never the subject of that query and today are the majority.
CREATE INDEX IF NOT EXISTS idx_study_attempts_item_id
  ON public.study_attempts (item_id, is_correct)
  WHERE item_id IS NOT NULL;

COMMIT;
