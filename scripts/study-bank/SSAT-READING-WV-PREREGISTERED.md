# SSAT Reading pilot 2: whole-passage variants, pre-registered 2026-10-06 (before any item exists)

This is the second pilot that the pilot-1 rule calls for. Pilot 1 (counterfactual per-question
slots, `SSAT-READING-CF-PREREGISTERED.md`, REGISTER A76) landed **between** on A (options-only
isolated 46.7% vs live control 26.4%). It passed C with-source exclusivity (12/12) and failed E
naturalness. Two defects were diagnosed as built into that method:

1. **Independent slots read as asides.** Each slot had to be independent of the others, so slots
   became self-contained facts about unrelated matters.
2. **Every distractor was absent from the passage.** Only the drawn slot was printed, so 10/12
   items were graded easy ("only option the passage mentions at all"). In the live bank, 77.6% of
   distractors are possibilities the passage itself names and rules out (SSAT-READING-DIAGNOSIS §2).

## The design change

**Whole-passage variants.** For each passage the author writes FIVE complete, coherent passages
on one topic (same genre, length and voice), plus ONE fixed set of 6 questions × 5 symmetric
choices. **Version k makes choice k the answer to every question**, so every choice of every
question is correct in exactly one version. The decisive information is woven through one
natural narrative or argument. There are no self-contained asides.

**Rivals appear naturally.** Within each version the passage may mention the other choices: as
possibilities considered, earlier beliefs, other people's views, or minor details. The wrong
options are then things the passage discusses but does not support, which is the live pattern.
**No runs of denials** ("it was not X, nor Y, nor Z"). Allow at most one explicit rejection per
paragraph. The machine proxy is **at most 1 negation token per paragraph**.

This is structurally the live s2/s3/s4 construction (five whole-passage worlds, seeded draw). The
differences are the brief (rivals discussed naturally, no denial runs, no fixed text that lists
candidates) and the gates below. It accepts back defect 1 of the live construction: **effective n
is passages, not items.** One draw keys all six questions of a passage.

## Unit of authoring (`*.wv.json`), checked by `ssat-wv.mjs verify`

```
{ "passage_id": "WV1-P01", "genre": "...",
  "versions": [ {"text": "<complete passage; version k keys choice k everywhere>"} x5 ],
  "questions": [ { "qid": "WV1-P01-1", "kind": "...", "difficulty": "...", "prompt": "...",
      "choices": [c0..c4],
      "support": [ { "why": "<verbatim from versions[k]>",
                     "kills": { "<j>": {"kind": "refute"|"mention", "quote": "<verbatim from versions[k]>", "reason": "..."} x4 } } x5 ] } x6 ] }
```

`verify` refuses on any of the following:
- not exactly 5 versions, or versions that are not distinct
- a version outside 270–380 words, or a max/min word ratio above 1.35
- a version outside 3–6 paragraphs, or **more than 1 negation token in any paragraph**
- not exactly 6 questions, one of each kind (main-idea, detail, inference, vocabulary-in-context,
  attitude, purpose)
- choices that are not 5 and distinct, or a choice length ratio above 1.6
- a vocabulary word that does not appear in every version
- a `why` that is not verbatim in its version
- any kill that is not verbatim in that version, or has no reason, or whose kind is not
  `refute` (the text rules it out) or `mention` (the passage names the rival without supporting it)
- a stem leak (a choice's unique content word appearing in another question's stem)

It reports, without refusing: kills that name the rival (`mention`), and a lexical word-match
solver over all 25 non-vocab question-versions per passage.

## Draw (fixed now)

Once all `*.wv.json` are written and verify OK, they are committed (frozen). Then `frozenSha` =
sha256 of the concatenated bytes in sorted path order, and

    k(passage_id) = parseInt(sha256("ssat-wv-2026-10-06|" + frozenSha + "|" + passage_id).slice(0, 8), 16) % 5

The draw is never re-rolled. An item that fails a gate is dropped, and so is a passage that ends up
with fewer than 5 items.

## Pilot: 2 passages × 6 questions, authored by two fresh Claude author agents

Bars A–E are **pilot 1's bars, the same control, and the same instruments**, so the comparison is
like-for-like. F is new.

- **A. Options-only, isolated.** The 10 non-vocabulary candidate items are shuffled into the same
  48 live control items (`ssat-reading-diag/taskF.json`). Three fresh samples, pooled. **supports:**
  candidate ≤ 40% AND control ≤ 40%. **fails:** candidate ≥ 60%. **invalid:** control outside
  10–45%; re-run the control. **between:** this is the second pilot, so between counts as
  **not passing**. There is no third pilot. `ssat-wv.mjs null` reports the exact null over all
  5^2 draws with the picks held fixed. It is context only: it cannot turn a between into a pass. Known in advance: with one key draw per passage, the 10 candidate items rest on **two draws**, so A's null is much wider than pilot 1's. In a break-test where the solver's picks all coincided, the exact P(> 40%) under a random key was 0.36. A therefore guards against a leak path, and it cannot certify the absence of one at this n. That is the reason B, C, D and F also stand.
- **B. Options-only, grouped.** One passage per file, all 6 items. Three samples pooled, ≤ 40%.
- **C. With-source exclusivity** on the drawn passages. Two independent graders each give
  `pick`, `second_defensible` and `difficulty`. An item passes if both pick the key and neither
  names a second defensible choice. **≥ 10 of 12.**
- **D. Cross-version validity.** One reviewer reads all 5 versions × 6 questions × 2 passages =
  60 question-versions. For each, it judges whether the version makes its claimed choice the unique
  answer and refutes or fails to support every sibling (the passage-supported standard, not "not
  mentioned"). **≥ 54 of 60.**
- **E. Naturalness.** Two blind judges each see four unlabelled passages: the 2 drawn pilot
  passages, live `rw-RW4-S09` (s4, the positive fixture, a known run of denials) and live
  `rw-RW3-S01` (s3). Each rates 1–5 and flags passages that read as constructed to supply answer
  choices. A judge that does not flag the s4 fixture is discarded and re-run. **Bar:** neither pilot
  passage is flagged by a valid judge, each averages ≥ 4.0, and each beats the s4 fixture by ≥ 1.0.
- **F. Difficulty (new).** Taken from the C graders' `difficulty` (easy=1, medium=2, hard=3). An
  item is easy if the mean of the two ratings is ≤ 1.5, so a single "easy" counts unless the other
  grader says hard. **Bar: ≤ 6 of 12 items easy.**

**Pilot 2 passes only if A supports, B ≤ 40%, C ≥ 10/12, D ≥ 54/60, E passes, and F passes.**
Any failure stops the run and gets recorded. There is no repair round and no third pilot.

The solvers, graders and judges are Claude only (never GPT), at most 2 subagents at a time. The
three samples are one solver sampled three times, so they are not independent raters (CLAUDE.md).

## Batch, if and only if pilot 2 passes

The `admission-form-depth.ts` replay (2026-10-06) shows 3 clean SSAT reading forms. Pilot 1's
replay said 13 new 6-item passages give 5 clean forms (+2). Plan: the 2 pilot passages plus 12 new,
authored by at most 2 agents at a time. Each round passes the same gate: verify, freeze, draw, then
A and B against the same 48 live control items (three samples), C+F on every drawn item, D on every
question-version, and E on every passage with the s4 fixture in each judge file. Items failing C are
dropped, and passages left with fewer than 5 items are dropped. Ledger entry, insert as cohort
`ssat-reading-wv1`, then re-run `admission-form-depth.ts` and report forms before → after. The human
sitting stays the verdict for a verbal cohort (bank-gate §5). It is not run here.

## Result (run 2026-10-06): FAILS on E (naturalness). Per the rule, the run stopped: nothing inserted, no batch authored, forms unchanged at 3.

The text was frozen in `26207d7c` (`ssat-wv1-p01/p02.wv.json`, verify OK, 240 kill quotes
verbatim). `frozenSha` is `3c571402…7272`, and the drawn versions were P01 → v3, P02 → v1. Evidence
is in `ssat-wv-pilot/`.

| bar | result | verdict |
|---|---|---|
| E naturalness | s4 fixture rated 1 and 1, flagged by both, so both judges are valid. s3 reference rated 2 and 2, flagged (identical to pilot 1). **P01 rated 4 and 4, FLAGGED by both. P02 rated 3 and 3, FLAGGED by both.** | **FAIL** |
| A, B, C, D, F | not run: E decided the outcome, and the rule is to stop | — |

**What the judges flagged was the design change itself.** Both judges independently quoted the
rival mentions, not the prose. On P01 they quoted "Reverend Coombe had thought the new rasp was ice,
and my mother had blamed the wind", the collector in Brask, and "more useful as a fire alarm". On
P02 they quoted the miller's wheel and the naturalist's toads, both ruled out ("whether the wheel
turned or stood … long after the toads had gone quiet"), and the pump and slab proposals. Their
verdict was that the passage "keeps listing alternatives that get rejected" and that these "look
built for distractors". The ≤ 1-negation-per-paragraph rule did remove the denial runs: neither
judge cited a negation. But rivals raised one at a time and then disposed of still read as
distractor supply.

**The bind is now measured from both sides on the same instrument:**
- Pilot 1 printed only the drawn slot, so the rivals were absent. P01 was rated 4/4 and not flagged,
  but the graders called 10/12 items easy word-matches.
- Pilot 2 named the rivals in the passage, which is the live pattern and the fix for difficulty
  (the lexical word-match solver fell to 5.3/25 on P01 against a 5.0 chance line). Both passages
  were flagged as constructed.
- The live cohorts that name their rivals (s3, s4) are flagged too, and rated 1–2.

A model author can produce natural prose with absent distractors, or present distractors that a
reader can see are distractors. Across two pilots it has not produced both at once.

**Caveat, stated before anyone reads more into it.** The judge prompt lists "names a set of
candidates and rules them out" as an example of constructed text. That is exactly the feature this
design requires, so the judges may be sensitised to it. The calibration matches pilot 1 exactly
(s4 1/1, s3 2/2 on both pilots), and the bar was fixed in advance, so the verdict stands. It is
not, however, evidence that a human reader would flag these passages. A human sitting or a human
naturalness read is the only instrument that could separate "a model judge spots model-made
rivals" from "the passages are unnatural".
