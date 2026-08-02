-- Consolidate the two facts that study_item_bank currently stores more than
-- one way. ADDITIVE ONLY — nothing is dropped, nothing is renamed, and every
-- backfill is asserted before the migration is allowed to commit.
--
-- APPLIED 2026-08-02. Verified after: task mismatch 0, task nulls 0,
-- passage_group_id column 1,723 = JSON 1,723 (was 48 - 1,675 rows filled).
--
--
-- WHY
--
-- Two facts about an item are each stored in several places, and the copies
-- disagree. Every hour lost to bank QC on 2026-08-01 traces to one of them.
--
-- 1. WHAT KIND OF QUESTION IS THIS — four representations:
--        domain                    (text column)
--        item->>'listeningTask'    (json)
--        item->>'readingTask'      (json)
--        item->>'type'             (json)
--    The draw reads the JSON. Half the QC scripts read `domain`. They
--    disagree: d937e3f9 has listeningTask='choose_response' but
--    domain='multiple_choice', so it is served in real tests but was skipped
--    by an audit that selected on domain. A defect that is live and
--    invisible to the check watching for it.
--
-- 2. WHICH PASSAGE/AUDIO A QUESTION BELONGS TO — two representations:
--        passage_group_id          (column, 48 rows)
--        item->>'passageGroupId'   (json, 1,675 rows)
--    assemble.ts:923 groups on the JSON. The column is written only by
--    scripts/seed-interview-sets.ts and read by nothing at runtime. All 48
--    column values also exist in the JSON and are byte-identical, so the
--    column is a strict, stale subset.
--
--
-- WHAT THIS MIGRATION DOES
--
--   * adds `task`, backfilled from the JSON, as the single answer to "what
--     kind of question is this"
--   * completes `passage_group_id` from the JSON so the column is no longer
--     a partial copy
--   * indexes both, because every QC query this week filtered on them
--   * asserts both backfills are total, and ABORTS if not
--
-- WHAT IT DELIBERATELY DOES NOT DO
--
--   * does not drop `domain`. Still read by QC scripts; drop only once those
--     are moved to `task`, in a separate migration.
--   * does not drop the JSON keys. assemble.ts and the session UI read them
--     at runtime; the columns are a queryable mirror until that code moves.
--   * does not rename `verified`. Its name implies quality but it means
--     "well-formed and drawable", and every read of it is a draw filter,
--     including the pool-size precheck. Miss one write site and new items
--     go NULL in the new column, vanish from the draw, and students get
--     409 bank_empty — silently, with no test failing.
--     Counted afterwards: 28 files reference it against this table, 9 of
--     them in src/. Migration 070 makes the case for NOT renaming it and
--     documents the column instead.
--   * does not add a quality/readiness column. Readiness is derived from the
--     QC ledger on purpose — a stored flag is exactly how `verified` came to
--     assert something untrue about 3,365 rows, and a boolean cannot survive
--     a threshold change (2026-08-01 moved two cohorts in each direction
--     with no item edited).

begin;

-- ── 1. `task` ──────────────────────────────────────────────────────────
-- The single field naming what kind of question this is. Mirrors exactly
-- what the draw resolves today, so it cannot disagree with what is served.

alter table study_item_bank add column if not exists task text;

update study_item_bank
   set task = coalesce(item->>'listeningTask', item->>'readingTask', item->>'type')
 where task is null;

-- Verified before writing this migration: all 4,838 rows (archived included)
-- resolve. If a future row does not, that is a genuinely new shape and the
-- migration must stop rather than leave a silent null the draw would skip.
do $$
declare missing int;
begin
  select count(*) into missing from study_item_bank where task is null;
  if missing > 0 then
    raise exception
      'task backfill incomplete: % row(s) have no listeningTask/readingTask/type. Resolve before migrating.', missing;
  end if;
end $$;

alter table study_item_bank alter column task set not null;

create index if not exists idx_bank_task on study_item_bank (family, section, task)
  where archived = false;

comment on column study_item_bank.task is
  'What kind of question this is — the single source of truth. Mirrors coalesce(item->>listeningTask, item->>readingTask, item->>type), which is what assemble.ts draws on. Prefer this over `domain`, which disagrees with it on some rows.';

comment on column study_item_bank.domain is
  'DEPRECATED as a task identifier — disagrees with `task` on some rows and caused a live item to be missed by a QC audit. Retained only until QC scripts move to `task`. Still meaningful for SAT, where it names the College Board blueprint domain.';


-- ── 2. `passage_group_id` ─────────────────────────────────────────────
-- Complete the column from the JSON so it stops being a partial copy.
-- Checked before writing: of 48 rows with the column set, all 48 also carry
-- the JSON key and every value is identical — so this only ever fills gaps,
-- and can never overwrite a differing value.

update study_item_bank
   set passage_group_id = item->>'passageGroupId'
 where item->>'passageGroupId' is not null
   and passage_group_id is distinct from item->>'passageGroupId';

do $$
declare mismatched int;
begin
  select count(*) into mismatched
    from study_item_bank
   where item->>'passageGroupId' is not null
     and passage_group_id is distinct from item->>'passageGroupId';
  if mismatched > 0 then
    raise exception
      'passage_group_id backfill left % row(s) disagreeing with the JSON.', mismatched;
  end if;
end $$;

-- Set-based draws and the cross-item leakage checks both scan by group.
create index if not exists idx_bank_passage_group on study_item_bank (passage_group_id)
  where passage_group_id is not null and archived = false;

comment on column study_item_bank.passage_group_id is
  'Questions sharing one passage or recording. Kept in step with item->>passageGroupId, which assemble.ts still groups on at runtime. Use this column for analysis — the JSON cannot be indexed.';

commit;


-- ── Verify after applying ─────────────────────────────────────────────
-- Expect: mismatch 0, task_nulls 0, and group_col == group_json.
--
--   select
--     count(*) filter (where task is distinct from
--       coalesce(item->>'listeningTask', item->>'readingTask', item->>'type')) as mismatch,
--     count(*) filter (where task is null) as task_nulls,
--     count(*) filter (where passage_group_id is not null) as group_col,
--     count(*) filter (where item->>'passageGroupId' is not null) as group_json
--   from study_item_bank;
