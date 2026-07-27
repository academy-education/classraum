-- 062_toefl_rekey_passage_group_id.sql
--
-- Re-key `study_item_bank.item->>'passageGroupId'` for the TOEFL
-- harvest-v1 cohort so a group id means "one passage" again.
--
-- WHY
-- ---
-- The harvested items came out of per-test generated payloads, where
-- passageGroupId is only ever unique WITHIN one generated test
-- ("academic-1", "daily-3", "convo-2", "group-4", ...). Harvesting many
-- tests into one bank made those ids collide globally: e.g. every test's
-- first academic passage landed under the single id "academic-1".
--
-- Damage before this migration (family='toefl', verified, not archived):
--   reading   : 524 items / 34 group ids, 26 of them span >1 passage
--               (worst: academic-1 = 108 items over 28 distinct passages)
--   listening : 141 harvest items / 18 group ids, 15 span >1 passage
-- The assembler (src/lib/study/assemble.ts clusterByPassage) and the test
-- UI (passageGroupInfo in .../test/helpers.tsx) both trust the id, so the
-- UI told students "question 3 of 5 in this passage" while the passage
-- rendered above the question changed underneath them.
--
-- KEY
-- ---
-- The correct grouping key is derivable from existing data: items whose
-- normalized passage text is byte-identical ARE one passage set; items
-- whose text differs are NOT. New id = 'pg-' || md5(normalized passage),
-- which is deterministic, idempotent, and collision-free against the
-- hand-authored cohorts (their ids are 'convo-1' / 'M7-3' style).
--
-- SCOPE
-- -----
-- Only cohort='harvest-v1', sections reading + listening, rows that
-- already carry a non-null passageGroupId and a non-empty passage.
-- Archived/unverified rows are included so they stay correct if they are
-- ever restored. The hand-authored cohort (v3-claude, 325 listening
-- items / 84 groups) is already clean — 0 groups span >1 passage — and is
-- deliberately left untouched. SAT items carry no passageGroupId at all.
--
-- EXPECTED AFTER (verified + not archived):
--   reading   : 524 items -> 209 groups (avg 2.5), max 28 (that one is a
--               genuinely repeated passage, see note below), 0 groups
--               spanning more than one passage
--   listening : 141 harvest items -> 86 groups (avg 1.6), max 2, 0 bad
-- Rows touched including archived/unverified: reading 896, listening 225.
--
-- NOTE (not fixed here): after re-keying, one reading passage carries 28
-- items with only 14 distinct prompts — the harvest let near-duplicate
-- questions through content_hash dedup. That is a dedup problem, not a
-- grouping problem, and is left for a separate pass.

BEGIN;

UPDATE public.study_item_bank
SET item = jsonb_set(
      item,
      '{passageGroupId}',
      to_jsonb('pg-' || md5(regexp_replace(lower(item->>'passage'), '\s+', ' ', 'g'))),
      true
    )
WHERE family = 'toefl'
  AND cohort = 'harvest-v1'
  AND section IN ('reading', 'listening')
  AND item->>'passageGroupId' IS NOT NULL
  AND coalesce(btrim(item->>'passage'), '') <> '';

-- Guard: no surviving group may span more than one passage.
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM (
    SELECT item->>'passageGroupId' AS gid
    FROM public.study_item_bank
    WHERE family = 'toefl'
      AND section IN ('reading', 'listening')
      AND verified AND NOT archived
      AND item->>'passageGroupId' IS NOT NULL
    GROUP BY 1
    HAVING count(DISTINCT md5(regexp_replace(lower(coalesce(item->>'passage','')), '\s+', ' ', 'g'))) > 1
  ) g;
  IF bad > 0 THEN
    RAISE EXCEPTION 'passageGroupId re-key left % group(s) spanning multiple passages', bad;
  END IF;
END $$;

COMMIT;
