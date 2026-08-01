-- Document what `verified` actually means. NO RENAME — see below.
--
-- NOT APPLIED. This migration changes zero rows and zero column types; it
-- writes comments only, so it is safe to run at any point in the sequence.
--
--
-- THE ORIGINAL PLAN WAS TO RENAME THIS COLUMN. DON'T.
--
-- `verified` reads like a quality signal and is not one. It means: this row
-- is well-formed and may be drawn. It is set true at insert by the seeding
-- helpers, and it is true on 4,734 of 4,838 rows — including every cohort
-- that later failed a QC gate. Reading it as "this item is good" is what
-- made 3,365 items look reviewed when only one of five gates had ever run
-- against any of them.
--
-- The fix for that is this comment, not a rename. Measured 2026-08-01:
--
--   * 28 files reference `verified` alongside study_item_bank — 9 in src/
--     (the draw, the assemble route, practice generate, bank-counts, the
--     admin bank browser, its API, test-verify, a blueprint test, and the
--     generated database.types.ts) and 19 in scripts/, several of which
--     WRITE it (seed-interview-sets, bank-helper.mjs, math-bank-helper.mjs,
--     toefl-bank-helper.mjs).
--   * An earlier note in migration 068 put this at "five call sites". That
--     was wrong by a factor of five, and it is the whole argument: the
--     rename was scoped against a number nobody had checked.
--
-- The failure mode is silent and expensive. Every read is a filter —
-- `.eq('verified', true)`. Miss one WRITE site and new items insert with the
-- old column, land NULL in the new one, and are invisible to the draw: the
-- pool-size precheck sees an empty bank and students get no_bank_coverage /
-- 409 bank_empty. Nothing throws. No test fails, because a test asserting a
-- non-empty draw passes on the items already there.
--
-- Weighed against that: the benefit is a better name for a column whose
-- behaviour is correct. That is not a trade worth making, and it is the
-- opposite of "don't keep changing".
--
-- If it is ever renamed, the only safe shape is: add `drawable`, dual-write
-- both columns, move all 28 readers, verify the draw over a full release,
-- and only then drop `verified`. A single-deploy rename is not on the table.
--
--
-- SEPARATELY: `verified` IS NOT READINESS, AND READINESS IS NOT A COLUMN
--
-- Readiness — "has this item passed the gates its family requires" — is
-- derived from the QC ledger (src/lib/study/bank-qc.ts, bank-ledger.ts) and
-- deliberately not stored. A stored boolean cannot survive a threshold
-- change: on 2026-08-01 recalibrating against published-item baselines moved
-- two cohorts to passing and two to failing with no item edited. A column
-- would have been wrong in four places and looked authoritative in all four.

begin;

comment on column study_item_bank.verified is
  'STRUCTURAL, NOT QUALITY. True means: well-formed and eligible to be drawn — set at insert by the seeding helpers, true on 4,734 of 4,838 rows including every cohort that later failed a QC gate. It says nothing about whether an item is answerable, correctly keyed, or appropriately hard. For that, see the QC ledger (scripts/study-bank/ledger.json) and the derived readiness in src/lib/study/bank-ledger.ts. Every read of this column is a draw filter — renaming it needs a dual-write migration across 28 files, not a single deploy (see migration 070).';

comment on column study_item_bank.archived is
  'Excluded from every draw. The counterpart to `verified`: `verified=false` means never was drawable, `archived=true` means no longer drawable. Both are structural — neither records a QC result.';

commit;
