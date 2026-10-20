# map-lu-v6, 2026-10-20: pre-registration

Written and committed **before any item exists**, with its tools (`map-lu-v6.mjs`, `--selftest` all passing),
brief (`MAP-LU-V6-BRIEF-SPELLING.md`) and fixed prompts (`map-lu-v6/prompts.md`). Results go in
`MAP-LU-V6-RESULT.md`. The previous batch is `MAP-LU-V5.prereg.md` / `MAP-LU-V5-RESULT.md`.

## Why this batch

Language Usage waits for **about 20 cleared Spelling items** (owner). Cleared so far: **0** (v2-v5). Owner,
2026-10-20: "Keep going". v5 stopped at Stage 0 on **E3, key uniquely longest 8/28 against a cap of 7**:
its seeded key-length ranks were balanced over the 28 items EXPECTED to freeze, and ten drops (9 teacher,
1 screen; 4 of them rank-4 items) changed which 28 froze, so the pick came out 8/8/7/5 by rank. Nothing
about grade fit, keys or guessability was measured. v6 fixes the construction and changes nothing else
that could move a bar.

## What changes against v5 (everything else is v5's, unchanged)

| v5 finding | v6 change |
|---|---|
| Rank balance held on the planned 28, not the frozen 28 | **The freeze fills a fixed grade x rank quota** (`cellQuota`, seed `map-lu-v6-quota`: each grade 2 of each rank except one rank once, a different one per grade; every rank exactly 7 of 28). First survivors in id order within each cell. **A cell that cannot fill fails Stage 0.** E3's "uniquely longest" is then at most 7/28 by construction |
| 12 per grade left 5 drops of slack per grade, and grade 5 kept exactly 7 | **16 per grade (64)**, each rank exactly 4 times per grade: up to 2-3 drops per (grade, rank) cell |
| The one seeded re-draw (pre-flight T2 / T2-L) re-drew whole grades | **Re-draws within cells**, so it keeps the quota |
| Two authors clashed on 9 tested words (Amendment 1) | **Author 1 (grades 5-6) target words start a-m; author 2 (grades 7-8) n-z**, enforced by `itemchecks` |
| Teacher B's 9 NO calls were plain, phonetic correctly-spelled targets; it also noted grade 7-8 correctly-spelled targets harder than the key word | The brief names the 9 words, and asks for all four targets at the item's grade (none below, none more than one above). **Teacher prompt unchanged** |

Unchanged from v5: sentence format only; no rewrite (any teacher "no" drops; an exact-check failure drops);
the strict screen (either screener below target drops); the item checks incl. dictionary guard and variants;
T2, T2-L, E3; the options-only attack against a matched live control; the two-stage graders; every bar.

## Source policy (unchanged)

Claude subagents only, at most three at once, own private folders under `scratchpad/map-lu-v6-work/`.
No NWEA item, no Herald / cloud.dherald.com PDF, no earlier MAP item file shown to any agent. Commit
messages neutral: never a rule, a check, a tell or a key.

## What is built

| | per grade | total |
|---|---|---|
| authored (author 1: grades 5-6; author 2: grades 7-8) | 16 | **64** |
| frozen (cell quota, first survivors by id within each cell) | 7 | **28** |

Ids `MLV6-S01`-`S64`. Ranks `map-lu-v6/lrank.json` (seed `map-lu-v6-lrank`; quota stored alongside).
Control `map-lu-v6/control.json` (sha256 0d724d9a1c218479cf3530d2e2829fbea299c0f6922b8eebc721efd369778726):
24 live verified four-choice SAT SEC / ACT CSE items, easy and medium, 12 punctuation + 12 grammar, chosen by
sha256 of `map-lu-v6-control:<id>` from 412 eligible rows **excluding v2's-v5's controls** (0 overlap with v5).

## Order of work

1. two authors (parallel), each runs `itemchecks` to all-ok; files concatenated unedited
2. `checks` (reported) and the report-only `preflight`
3. teacher gate: two raters (prompt 2); `teacher-merge` -> any "no" drops the item
4. word-grade screen (two screeners, prompt 8) -> `freeze`: teacher drops, exact drops, strict screen drops,
   **cell quota**, pre-flight on the first pick (+ at most one seeded re-draw within cells), Stage 0;
   **freeze commit**
5. `render`; **render commit**
6. three options-only samples; two with-source graders, cold then keyed
7. `score`; staged insert if it passes; **result commit**

**No change to any item after it is authored. Drops only.**

## Stage 0 (freeze)

Freezes only if every (grade, rank) cell fills its quota after the teacher gate, the exact checks and the
strict screen; each tested word appears once and never inside another item; neither T2 nor T2-L fires on the
pick (after at most one seeded re-draw within cells); and E3 passes (key uniquely longest and uniquely
shortest each at most 25%). Otherwise it stops; the result records which cells were short.

## Bars: v5's, at n = 28, unchanged

| bar | threshold |
|---|---|
| S1-a exact | every item passes the item checks and L-rank; T2, T2-L and E3 pass on the frozen 28 |
| S1-b pilot-pass | **>= 23/28** (both cold picks on key; no cold second defensible; both `grade_fit` fits; no option dead by both; both keyed "correct", no accepted alternative) |
| S1-c calibration | `easier` <= 9/56 AND `harder` < 14/56 |
| S1-d level | each grader's mean (grade_assigned - target) within +-0.5 |
| S2 options-only | candidate on-key rate >= control - 10; control >= 25% or INVALID (key recoverability only, never "does not leak") |
| T slots | no key slot > 35%, stored order |

## If it passes

Pilot-pass items inserted **STAGED** (`verified=false`, `family='map'`, `section='language'`), cohort
`map-lu-v6-spelling`. **"Spelling cleared"** = the inserted count if every bar passes, else 0. Ledger entry
`map-lu-v6-spelling-2026-10-20`, REGISTER §5, result doc, one commit.

## What can't be learned here

As v5: no grade label validated by response data; a human sitting decides whether students pick the
distractors; sentence-only Spelling does not represent MAP's full mix of spelling formats. And the a-m / n-z
split narrows each author's word pool; stated now, not discovered later.
