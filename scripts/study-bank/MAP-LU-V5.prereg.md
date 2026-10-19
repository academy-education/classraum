# map-lu-v5, 2026-10-20: pre-registration

Written and committed **before any item exists**. Results go in `MAP-LU-V5-RESULT.md`. The previous batch
is `MAP-LU-V4.prereg.md` / `MAP-LU-V4-RESULT.md`; plan context `MAP-LAUNCH-PLAN.md`.

## Why this batch

Owner decisions: MAP launches at grades 5-8, and Language Usage waits for **about 20 cleared Spelling
items**. Cleared so far: **0** (v2, v3, v4 all failed Spelling). Owner, 2026-10-20: "Keep going with the
MAP question batches" (taken as lifting the 2026-10-12 agent pause for MAP; at most three agents at once).

v4 got every key right (72/72 cold, 36/36 keyed) and failed Spelling on grade fit (pilot-pass 21/28, bar
23; easier 12/56, bar 9). Its findings, each answered here:

| v4 finding | v5 change |
|---|---|
| **By format: sentence 9/9, word 12/19; every hold was a word item.** The teacher gate flagged 24 of 32 word items (the stacked both-errors option) | **Sentence format only.** No word-format items, so no seeded edit types (L-class) |
| **The reviser leaked the grade:** it replaced the key word on 21 of 24 flagged items; those words carried 4 of 7 holds and 8 of 12 easier calls | **No rewrite.** Any wrong option rated "no" by either teacher **drops** the item. An item failing an exact check is **dropped** (no repairer). Authors run the exact item checks themselves before handing in (`itemchecks`) |
| **The screen kept words the graders placed lower** (*height* 5/5, *professional* 6+/6+): it dropped only when BOTH screeners were below target | **Strict screen:** a tested word below target by **either** screener drops the item |
| Grade 8 words were judged a grade or two low | The brief asks for high-school-level words at grade 8 and names the v4 words that fell short |

Unchanged from v4: the item checks (v2, incl. the dictionary oracle and regional-variant guard), the seeded
key length rank (L-rank, now balanced within each grade as well as overall), T2 and T2-L, E3, one seeded
re-draw at freeze, the options-only attack against a matched live control, the two-stage graders, every bar.

## Source policy (unchanged)

Authors, raters, screeners, solvers and graders work only from their own knowledge of CCSS ELA Language
L.5-L.8. **No NWEA item, live or reconstructed, is opened; the Herald / cloud.dherald.com PDFs are never
opened.** No earlier MAP item file is shown to any agent. Claude subagents only, at most three at once,
each in its own private scratch folder under `scratchpad/map-lu-v5-work/` (git-excluded). Prompts are
fixed in `map-lu-v5/prompts.md`, committed with this file. **Commit messages are neutral** and never name
a rule, a check, a tell or a key.

## What is built

| | per grade | total |
|---|---|---|
| authored (two authors: grades 5-6, grades 7-8) | 12 | **48** |
| frozen (first survivors per grade, id order) | 7 | **28** |

Ids `MLV5-S01`-`S48` (S01-S12 grade 5 ... S37-S48 grade 8). Key length ranks `map-lu-v5/lrank.json`
(seed `map-lu-v5-lrank`): each rank 7 times among the 28 likely-frozen items and 12 times overall, and every
rank once or twice within each grade's first 7. Control `map-lu-v5/control.json` (sha256 856e47e8...): 24
live verified four-choice SAT SEC / ACT CSE items, easy and medium, 12 punctuation + 12 grammar, chosen by
sha256 of `map-lu-v5-control:<id>` from 436 eligible rows **excluding v2's, v3's and v4's controls**.

## Order of work

1. two authors (parallel), each runs `itemchecks` to all-ok; files concatenated unedited
2. `checks` (reported) and the report-only `preflight`
3. teacher gate: two raters; `teacher-merge` -> any "no" drops the item
4. word-grade screen (two screeners, words only) -> `freeze`: teacher drops, exact drops, strict screen drops,
   quotas (7 per grade), pre-flight on the first pick (+ at most one seeded re-draw), Stage 0; **freeze commit**
5. `render`; **render commit**
6. three options-only samples; two with-source graders, cold then keyed (the keyed render enters a grader's
   folder only after its cold file is hashed)
7. `score`; staged insert if it passes; **result commit**

**No change to any item after it is authored. Drops only.**

## Stage 0 (freeze)

The strand freezes only if every grade keeps at least 7 survivors after the teacher gate, the exact checks
and the strict screen; each tested word appears once and never inside another item; neither T2 nor T2-L
fires on the pick (after at most one seeded re-draw); and E3 passes (key uniquely longest and uniquely
shortest each at most 25%). Otherwise it stops: nothing is frozen, nothing inserted, and the result records
how many survived where.

## Bars: the strand PASSES only if all hold (v4's, at n = 28)

| bar | threshold | attainable |
|---|---|---|
| S1-a exact | every item passes the item checks and L-rank; T2, T2-L and E3 pass on the frozen 28 | pass/fail |
| S1-b pilot-pass | **>= 23/28** items pass c1-c5 (both cold picks on key; no cold second defensible; both `grade_fit` fits; no option dead by both; both keyed "correct", no accepted alternative) | 0-28 |
| S1-c calibration | `easier` <= 9/56 AND `harder` < 14/56 | 0-56 each |
| S1-d level | each grader's mean (grade_assigned - target) within +-0.5 | either side |
| S2 options-only | candidate on-key rate >= control - 10; control >= 25% or INVALID | 0-100 |
| T slots | no key slot > 35%, stored order | flat by construction |

Every bar and every new rule is break-tested at its margin by `map-lu-v5.mjs --selftest` (30 checks, all
passing at commit). **S2 tests key recoverability only**: on "which sentence has a spelling error" a high
options-only rate is the construct (the misspelled word is visible), so it is never reported as "the batch
does not leak". At a 100% control the S2 bar is 90%, attainable both ways.

## If it passes

The pilot-pass items are inserted **STAGED** (`verified=false`, `family='map'`, `section='language'`) as
cohort `map-lu-v5-spelling`, choices in the with-source render order, difficulty by mean grade offset.
**Never `verified=true`.** MAP is not shipped; a person releases a staged row. **"Spelling cleared"** = the
inserted count if the strand passes every bar (at least 23, above the owner's ~20); otherwise 0.

Ledger entry `map-lu-v5-spelling-2026-10-20` under the gate's resolved family, written from current HEAD
immediately before the result commit and committed with it. REGISTER §5 gets the numbers in the same commit.

## What can't be learned here

- Whether any grade label is right: graders and screeners are models, not response data.
- Whether students pick the distractors: a human sitting decides.
- Whether a sentence-only Spelling strand represents MAP's mix of spelling formats: it does not fully; the
  word format returns only when a construction for it passes. Stated now, not discovered later.
- Cost, stated: the strict teacher and screen rules throw items away. With 12 authored per grade, 5 drops per
  grade are absorbed; a sixth fails the quota. The direction is conservative: it never ships a rejected item.
