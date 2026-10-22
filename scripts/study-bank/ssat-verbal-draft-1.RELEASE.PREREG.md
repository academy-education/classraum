# SSAT Verbal draft 1 (48 analogies + 18 synonyms): co-founder RELEASE sittings, pre-registered (2026-10-22)

**Committed with the staged insert, before any run is drawn.**

## Why
SSAT Verbal has 10 clean forms (`ssat-verbal-replay.ts`): form 11 is short 14 analogies, and form 12 is short
30 analogies and 13 synonyms. One real student has taken 8 (`runout-monitor.ts`: 2 left). The in-band word pool
was spent under the s21 rule ("new words only"). **Owner, 2026-10-22: "Yes, allow live words in new pairs."**

## The batch
`ssat-verbal-draft-1.batch.json`: 66 five-choice items, written in-session by Claude (no agents).
- **Pairs are new, words need not be.** Every analogy stem pair, key pair and distractor pair is absent, in either
  order, from all 665 SSAT verbal rows (live, staged and archived; a trailing plural folded). 77 pair collisions
  in the first draft were rewritten over five passes; the bank holds nearly every natural pairing, so several
  keys are less common (preamble/constitution, flotilla/boat, glassblower/blowpipe).
- Synonym headwords are unused as headwords anywhere in SSAT or ISEE verbal (470 live headwords checked), so no
  student meets the same prompt word twice; keys and distractors may be live words.
- Each analogy distractor instantiates a different, named relation. An author read for distractors sharing the
  key's relation replaced 7 (tire/wheel against pedal/bicycle, stage/theater against inning/game, whisk/egg
  against sieve/flour, crutch/limp against ointment/rash, liar/deceit, editor/newspaper, current/river).
- Key uniquely longest: analogies 19/48 as built -> 9/48 (one distractor lengthened on 10 items); shortest 2 -> 6.
  Synonyms 7/18 -> 4/18, shortest 2/18. Key slots flat (10/10/10/9/9, 4/4/4/3/3); serving reshuffles anyway.
- Difficulty is the author's grade (analogies 26 medium / 22 hard; synonyms 3 easy / 12 medium / 3 hard).
**Not run:** the options-only attack against a live control and the two-grader stage that gated s17-s21 (no agents).

## Runs and rule
Runs of 12 (5 x 12 + 6), `DRAW_COHORT=ssat-verbal-draft-1 DRAW_FAMILY=ssat draw-review-run.mjs Verbal 12 <co-founder>`,
flat five-wide deal, control 20%. Queue: run 1 after cr-v11 run 1; later runs alternate with the TOEFL queue.
Release with `release-toefl-conv-runs.mjs ssat-verbal-draft-1` (cohort-generic; every item is a set of one):
1. Batch guard per run and pooled: blind >= 50% (2.5x the 20% control) holds everything not yet released.
2. Per item: "Only defensible" -> `verified=true`; any other verdict -> `archived=true`, not repaired.
3. After release: `ssat-verbal-replay.ts`; report clean SSAT verbal forms.

## Known limits, stated before the number exists
- The s20/s21 finding that the cluster sibling reads as an obviously different relation still applies; expect
  him to grade many analogies easier than authored. That is recorded, not a gate.
- Less common key pairs can be "above band" for SSAT Upper Level. His verdicts and notes are the only check.
- One reader; the blind score per run is coarse.
