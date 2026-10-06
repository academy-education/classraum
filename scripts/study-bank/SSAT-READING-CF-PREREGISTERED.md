# SSAT Reading: counterfactual slots, pre-registered 2026-10-06 (before any item exists)

Owner decision 2026-10-06: a paying student has used up the 3-form SSAT Reading bank, so agents
author more. This overrides the A73 stop for **one method**. Every SSAT reading round that failed
(r9 A36, ra A38, the A69/A73 pilot) shared one property: **the author knew the key while writing
the options**. The options-only rate was 80–96%, against a live rate of 24–29%.

## What already exists, and what is new

This is not a new idea in this repo. The live SSAT reading cohorts s2/s3/s4 were authored as
**symmetric worlds**. For each topic there are five whole-passage variants, a seeded RNG picks the
shown one, and verbatim kill spans back each answer (READING-WORLDS-*.md, RW3/RW4-RESULT.md). That is
why the live bank sits at chance blind, with a human sitting at 15.0%. Two defects were measured on
it and carried forward:

1. **Effective n is topics, not items.** One shown world answers all six questions, so a reader
   who finds the world scores about 5/6, and one who misses it scores about 0/6 (RW3-RESULT).
2. **Unnatural prose.** The kill-span brief produced "negation triads" that name and deny every
   sibling ("No spring flows below the rock … Nothing stretches along a line …"). A73's grader
   called its own pilot passages "runs of denials", and the live s4 passages read the same way.

**The new part is per-question independent slots.** Each question owns ONE slot, a sentence or a
short span of the passage. The slot has five versions, and version k makes choice k the only
correct answer. Everything outside the slots is identical across versions. **Each question's
version is drawn independently**, so the six keys in a passage are independent. That removes
defect 1. Defect 2 is addressed by the brief, which allows at most ONE explicit denial per slot
version and asks for exclusion by incompatibility, and it is gated by a naturalness judge.

## Unit of authoring (`*.cf.json`)

```
{ "passage_id": "CF1-P01", "genre": "...",
  "segments": [ "fixed text ...", {"slot":"CF1-P01-2"}, " more fixed text ...", ... ],
  "questions": [ { "qid": "CF1-P01-2", "kind": "detail", "prompt": "...",
      "choices": [c0, c1, c2, c3, c4],
      "versions": [ { "text": "<slot text making choice 0 the answer>",
                      "why": "<verbatim from text>",
                      "kills": { "1": {"quote": "<verbatim from text>", "reason": "..."}, "2": ..., "3": ..., "4": ... } },
                    ... five versions, version k keys choice k ... ] } ] }
```

The passage is `segments` joined, with each slot replaced by that question's drawn version text.

## Draw (fixed now, before authoring)

When authoring is complete, the files are frozen and committed. Then `frozenSha` = sha256 of the
concatenated bytes of the frozen `*.cf.json` files, in sorted path order. For each question,

    k(qid) = parseInt(sha256("ssat-cf-2026-10-06|" + frozenSha + "|" + qid).slice(0, 8), 16) % 5

So the key depends on text that does not exist yet, and no author can know or steer it. The draw
is never re-rolled. An item that fails a gate after the draw is **dropped**, not re-drawn.

## Mechanical gate (`ssat-cf.mjs verify`, refuses on violation)

- 6 questions per passage, 5 distinct choices, 5 versions, and each version has 4 kills (one per
  sibling choice).
- Every `why` and every kill `quote` is verbatim in that version's own `text`. A kill that only
  points at fixed text cannot discriminate, because fixed text is shared by all five versions.
- Version lengths within a slot: max/min ≤ 1.35. Assembled passage 270–380 words, against live
  287–343.
- ≤ 1 negation token per slot version (not / no / never / nothing / nor / none / neither / n't).
  The total is reported against live (3.69 per 100 words).
- No choice's distinctive word appears in another question's stem (`stem_leak` 0).
- Choice length ratio within a question ≤ 1.6. Reported per question.

## Pilot: 2 passages × 6 questions (main-idea, detail, inference, vocabulary-in-context, attitude, purpose)

Two fresh Claude author agents, one passage each. Neither has seen the rejected batches or their
attack notes.

### Bars, fixed now

**A. Options-only, isolated (the A69/A73 instrument).** The 10 non-vocabulary candidate items are
shuffled into the same 48 live control items (`ssat-reading-diag/taskF.json`), with no passage and
no sibling adjacent. Three fresh samples, pooled and treated as about one rater.
- **supports:** candidate ≤ 40% pooled AND control ≤ 40%
- **fails:** candidate ≥ 60%. Stop and record why.
- **between:** run a second pilot.
- **invalid run:** control outside 10–45%. Re-run the control; do not read the candidate.
- **Expected by construction: about 20%** (the key is uniform and independent of option text). A
  result above 40% means something leaked. Before the verdict is accepted, find what: a sibling
  stem, a slot version visible elsewhere in fixed text, or a draw bug.

**B. Options-only, grouped (sibling check).** One passage per file, all six items, no passage.
Three samples. Same bars as A.

**C. With-source exclusivity on the DRAWN passages.** Two independent grader agents see the
assembled passage and the five choices, with the key unmarked. Each returns `pick` and
`second_defensible` (a flagging task; QC-VOTE-INDEPENDENCE.md showed the vote alone does not
discriminate). An item passes if both graders pick the key and neither names a second defensible
choice. **Pilot bar: ≥ 10 of 12 pass.** Failing items are dropped, not repaired.

**D. Cross-version validity (does the method work, not just the draw).** One reviewer reads all 60
slot versions (12 questions × 5) in the context of their passage. For each version it judges
whether the version makes its own choice the unique answer and refutes, not merely fails to
support, each sibling (the s2/s3 lesson). **Bar: ≥ 54 of 60 (90%)**, in line with s3's 93.6% and
s4's 89.3% yields.

**E. Naturalness.** Two independent judges each see four unlabelled passages: the two drawn pilot
passages, one live s4 passage (`rw-RW4-S09`, a known run of denials, used as the positive fixture)
and one live s3 passage (`rw-RW3-S01`). Each passage is rated 1–5 for "would pass as a published SSAT passage"
and flagged if it reads as constructed to supply answer choices.
- A judge that does not flag the s4 fixture is discarded and re-run.
- **Bar:** neither pilot passage is flagged by either valid judge, each pilot passage averages
  ≥ 4.0, and each pilot passage outscores the s4 fixture by ≥ 1.0.

**Pilot passes only if A supports, B ≤ 40%, C ≥ 10/12, D ≥ 54/60, and E passes.** If C, D or E
fails, the method fails on that criterion: stop and record. There is no repair round.

## Batch, if and only if the pilot passes

`admission-form-depth.ts` replay (2026-10-06): SSAT reading is clean for 3 forms (form 4 is 18/40
fresh). **13 new 6-item passages give 5 clean forms**, and so do 14 passages at 5 items. Plan: the
2 pilot passages plus 12 new = 14, authored by at most 2 agents at a time, in rounds. The same gate
applies per round: mechanical, then the draw, then A and B (isolated against the same 48 live
control items, three samples), then C on every drawn item, D on every version, and E on every
passage, with the s4 fixture in each judge file. Items failing C are dropped, and passages left
with fewer than 5 items are dropped. Ledger entry, insert as cohort `ssat-reading-cf1`, then
re-run `admission-form-depth.ts` and report forms before → after. The human sitting stays the
verdict for a verbal cohort (bank-gate §5). It is not run here, because a sitting needs a person.
