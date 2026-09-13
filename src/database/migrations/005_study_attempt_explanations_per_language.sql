-- Applied 2026-09-13 as migration `study_attempt_explanations_per_language`.
-- Recorded here because the repo keeps a numbered copy; the database is the
-- authority for whether it ran.
--
-- THE DEFECT. Saved on-demand explanations were keyed (student_id, attempt_id)
-- with the language carried in per-mode `steps_lang` / `simpler_lang` /
-- `followup_lang` columns. So a student who generated the English
-- step-by-step and then the Korean one OVERWROTE the English: it was gone on
-- the next wrong-notebook reload, and flipping the toggle re-billed a model
-- call for text that had already been paid for.
--
-- CHECKED BEFORE WRITING, not after: the table held 12 rows and NONE carried
-- two different languages across its mode columns, so the backfill is a
-- straight coalesce with nothing to split. All 12 rows are snapshotted in
-- scripts/study-bank/study-attempt-explanations-snapshot-20260913.json.
--
-- VERIFIED AFTER, against the live table: writing en then ko for one attempt
-- leaves TWO rows with both texts intact; re-writing en updates in place and
-- the row count stays 2; the test rows were deleted and the table returned to
-- its original 12.

alter table study_attempt_explanations
  add column if not exists language text not null default 'en';

update study_attempt_explanations
   set language = coalesce(steps_lang, simpler_lang, followup_lang, 'en')
 where language = 'en';

alter table study_attempt_explanations
  drop constraint study_attempt_explanations_pkey;

alter table study_attempt_explanations
  add constraint study_attempt_explanations_pkey
  primary key (student_id, attempt_id, language);

-- The route writes only 'en' or 'ko'. Pinned at the schema so a typo in a
-- future caller fails loudly instead of creating a third orphan row that the
-- notebook would never read back.
alter table study_attempt_explanations
  add constraint study_attempt_explanations_language_check
  check (language in ('en', 'ko'));

-- The per-mode *_lang columns are now a second source of truth for a fact the
-- key already carries — the exact defect class this migration fixes. Dropped
-- rather than left to drift.
alter table study_attempt_explanations
  drop column if exists steps_lang,
  drop column if exists simpler_lang,
  drop column if exists followup_lang;
