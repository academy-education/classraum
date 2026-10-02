-- NOT YET APPLIED. Apply BEFORE deploying the code that reads/writes `more`:
-- the notebook loader selects it (without the column PostgREST errors and the
-- notebook shows no saved explanations) and every "Explain more" save fails.
--
-- "Explain simply" was replaced by "Explain more" on 2026-10-01 (e2bafd45) —
-- a different prompt (every choice by letter, polite Korean) — but the new
-- mode kept writing to `simpler`. The wrong-answer notebook therefore
-- re-showed 7 pre-change "Explain simply" texts (4 in 반말) under the new
-- "Explain more" label.
--
-- The cache is prompt-versioned by column: the new mode gets its own column.
-- `simpler` is left in place, untouched and unread — no data is deleted.
-- Additive and nullable: no backfill, no CHECK constraint involved (the table
-- has none on mode; modes are columns), no RLS change.

alter table study_attempt_explanations
  add column if not exists more text;

comment on column study_attempt_explanations.simpler is
  'RETIRED 2026-10-01: output of the old "Explain simply" prompt. Not read or written by the app; kept for history. See column more.';
comment on column study_attempt_explanations.more is
  '"Explain more" output (every choice by letter, polite Korean), from 2026-10-01.';
