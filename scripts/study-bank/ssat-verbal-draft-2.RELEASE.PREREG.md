# SSAT Verbal draft 2 (80 analogies + 80 synonyms): co-founder RELEASE sittings, pre-registered (2026-10-22)

**Committed with the staged insert, before any run is drawn.**

## Why
`ssat-verbal-replay.ts` 2026-10-22: 10 clean forms; analogies run short at form 11, synonyms at form 12. Verbal
draft 1 (66, staged) reaches about 11. Owner: "We should not have any bottleneck questions. Use many agents as
needed." 80 + 80 takes analogies to about 14 forms and synonyms to about 14.

## The batch
`ssat-verbal-draft-2.batch.json`, 160 five-choice items, written by two Claude agents (one analogies, one synonyms)
and reviewed item by item in-session. Work and records: `ssat-verbal-draft-2-work/`.
- **Analogies:** every stem, key and distractor pair is absent, in either order, from all 366 SSAT analogy rows
  ever written (3,962 pair entries; live, staged and archived) and unrepeated in the batch; distractor relations
  differ from the key's and each other's; 15 relations, none over 6 items. Review replaced 5 keys: architect:
  skyscraper had a maker key for a designer stem (now engineer:dam); poke:jab was not clearly degree (now sprinkle:
  drench); clergy:priest was loose (now regiment:soldier); hourglass:minutes was weak and doubled stopwatch:time (now
  barometer:air pressure); auspicious:promising was the exact answer to the batch's AUSPICIOUS synonym item (now
  fortunate:lucky). One distractor (humble:modest) leaked the HUMBLE item's key; replaced. A cross-check now
  confirms no analogy pair is a synonym item's headword+key.
- **Synonyms:** headwords unused as headwords anywhere in SSAT or ISEE verbal (546 checked), unrepeated keys,
  distractors in four different sense-families. Review changed one distractor (PELLUCID: "fresh" -> "rough").
- Keys dealt 16/16/16/16/16 per subtype (seeded). Key uniquely longest: analogies 17/80, synonyms 9/80; shortest
  7/80 and 10/80. Difficulty: analogies 20/40/20, synonyms 15/40/25 (easy/medium/hard).

## Runs and rule (verbal draft 1's rule, unchanged)
Runs of 12, `draw-next.mjs` entry after verbal draft 1's last run, flat five-wide deal, control 20%.
Release with `release-toefl-conv-runs.mjs ssat-verbal-draft-2` (every item is a set of one):
1. Batch guard per run and pooled: blind >= 50% holds everything not yet released.
2. Per item: "Only defensible" -> `verified=true`; any other verdict -> `archived=true`, not repaired.
3. After release: `ssat-verbal-replay.ts`; report clean SSAT verbal forms.

## Known limits
Agent-authored; no AI attack or grader. Some keys are less common pairings because the bank holds nearly every
natural one. One reader; per-run blind scores are coarse.
