-- 128_practice_essay_families.sql — let SSAT / ISEE practice-essay grades be stored.
--
-- Owner request 2026-10-27: the SSAT Writing Sample (essay_choice) and the
-- ISEE Essay (essay) now get AI feedback and a 1-5 PRACTICE band after
-- submit, graded by the same whole-test batch as TOEFL writing
-- (/api/study/response/grade-batch -> gradeAndPersistResponse) on OUR
-- practice rubric (src/lib/study/practiceEssay.ts). The rows go in
-- study_response_submissions / study_response_grades like every other
-- grade, so test_family must admit the two families.
--
-- Nothing else changes: the practice band never enters a score (the types
-- stay out of RESPONSE_SKILL_BY_TYPE), and the migration-115 unique guards
-- apply to these rows unchanged.
--
-- DEPLOY ORDER: apply this BEFORE the code ships. Without it every practice
-- insert fails the CHECK (23514); the batch reports the item as a persist
-- failure and the result screen shows "feedback unavailable / retry" — loud,
-- but nobody gets feedback until this is applied.
--
-- APPLIED 2026-10-27 (apply_migration 128_practice_essay_families), before the code shipped.

ALTER TABLE public.study_response_submissions
  DROP CONSTRAINT IF EXISTS study_response_submissions_test_family_check;

ALTER TABLE public.study_response_submissions
  ADD CONSTRAINT study_response_submissions_test_family_check
  CHECK (test_family = ANY (ARRAY['toefl'::text, 'ielts'::text, 'ssat'::text, 'isee'::text]));
