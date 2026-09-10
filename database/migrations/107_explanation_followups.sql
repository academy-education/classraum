-- 107: study_attempt_explanations.followup / followup_lang / followup_question
--
-- APPLIED 2026-09-10. Additive: three nullable columns, no default, on a
-- 7-row table. No rewrite, no backfill, nothing to undo but a DROP.
--
-- Restores the free-text "ask about this question" follow-up, which shipped
-- on 2026-07-14 (4795a2a8, the Qanda-style per-question loop) and was hidden
-- a week later in a3cbff44 — "hide the free-form follow-up for now". That is
-- the same commit that created this table, which is exactly why it has
-- columns for steps and simpler and none for followup: the feature was being
-- parked as the table was designed.
--
-- THREE columns, not two. steps and simpler are re-readable explanations of
-- the question itself, so the answer alone is enough to show later. A
-- follow-up answers something the student typed once, and stored on its own
-- it reads as a reply to nothing — "It's because the comma joins two
-- independent clauses" is useless in the notebook a week later unless you
-- can see that they asked "why isn't C right?". So the question is stored
-- beside the answer.

alter table study_attempt_explanations
  add column if not exists followup          text,
  add column if not exists followup_lang     text,
  add column if not exists followup_question text;

comment on column study_attempt_explanations.followup is
  'The model''s answer to the student''s own typed question about this item.';
comment on column study_attempt_explanations.followup_lang is
  'Language the follow-up answer was generated in: ''en'' or ''ko''.';
comment on column study_attempt_explanations.followup_question is
  'What the student actually asked. Stored so the saved answer is legible later; clamped to 500 chars by the API.';

-- RLS is unchanged: the existing policies are per-row on student_id and these
-- columns add no new access path. The route writes with the service role and
-- checks ownership itself (the attempt's session must belong to the caller),
-- which is what the steps/simpler writes already do.
