# Live SAT Standard English Conventions + Expression of Ideas — no-source blind attack, 2026-09-04

**Question.** C&S `v2` (210 items, 97.5% blind) and I&I `v2` (240 items, 91.9%) are both
broken in bulk. The `v2` label spans 740 live R&W items. Measuring the remaining two v2
domains — SEC 224 and EoI 66 — decides whether the defect covers ~450 items or ~740.

**Answer: neither. The `v2` label is not the unit of the defect, and the two remaining
domains fail in two different ways and at two different magnitudes.**

    EoI  :: v2  Rhetorical Synthesis   65 items   100.0% blind, 30 of 30 all-3
               -> the worst stratum measured anywhere in this bank. Deterministic.
    SEC  :: v2                        224 items    66.7% on the 45 genuinely-blind
               items measured, and 48 of the 224 have NO SOURCE TEXT AT ALL.

And the more useful half of the result: **the newer EoI cohorts contain 126 live items
that are genuinely clean and must be spared.** That is the first substantial clean
sub-population found in live R&W, and sparing it is the point of having measured.

---

## 1. Population (paged past the PostgREST 1000-row cap; filtered on DOMAIN, not cohort)

### Standard English Conventions — 287 live (316 rows total; 29 archived/staged)

| cohort | items | form/agreement | punctuation/boundaries | created |
|---|---|---|---|---|
| `v2` | 224 | 178 | 46 | 2026-07-08 → 07-21 |
| `rw-v6-sec-hard` | 40 | 24 | 16 | 2026-09-03 |
| `rw-v7-sec-hard` | 23 | 15 | 8 | 2026-09-04 |

Difficulty: medium 181, easy 86, hard 20. 70 distinct subskill strings, most of them
one-item free text on the two newer cohorts; the families above are the analysable unit.

### Expression of Ideas — 244 live (295 rows total; 51 archived/staged)

| cohort | items | subskill |
|---|---|---|
| `v2` | 66 | 65 Rhetorical Synthesis + 1 Transitions |
| `eoi-v6` | 52 | Transitions |
| `eoi-v5` | 42 | Transitions |
| `eoi-v4` | 28 | Transitions |
| `eoi-v3` | 27 | Transitions |
| `rsw2` | 22 | Rhetorical Synthesis |
| `rsw-v1` | 7 | Rhetorical Synthesis |

**The first thing the population says is that the assignment as framed could not be
answered from `v2` alone.** EoI `v2` holds exactly ONE Transitions item. Every one of the
150 live Transitions items sits in `eoi-v3..v6`. So testing the Transitions prediction
required drawing the newer cohorts as live rows, which was done, and that is where the
clean sub-population turned up.

---

## 2. Matching the previously-attacked items — and a second identification error of
   exactly the kind CLAUDE.md already documents

**EoI matched cleanly.** `prompt+passage` is unique across all 244 live EoI items. The 178
newer-cohort items trace to their authoring batches; **the 66 `v2` items appear in no
batch file in this directory and have never been attacked at any stage.**

**SEC could not be matched on prompt+passage, for a reason that is itself a finding.** Only
50 distinct prompts across 287 items, and the 24-item live SEC control
(`live-sec-control.batch.json`) carries no `passage` field at all. Matching fell back to
option-set + key. That resolved 20 of 24 uniquely; **4 were ambiguous because SEC option
grids repeat.** Those 4 were left in the pool rather than excluding all 40 of their
candidates; up to 4 items may therefore have been re-attacked, which costs an independent
measurement, not a contaminated one.

**Correction to the register.** The register reads
`rw-v6/v7-sec-hard 63 — v7 held at 69.4%, v6 passed 61.1%`. Matched on passage prefix
against every SEC batch file:

    sat-sec-hard-v1a  22 items -> 13 live in rw-v6-sec-hard
    sat-sec-hard-v1b  22       -> 11 live in rw-v6-sec-hard
    sat-sec-hard-v2   24       -> 16 live in rw-v6-sec-hard
    sat-sec-hard-v3   24       -> 23 live in rw-v7-sec-hard
    sat-sec-hard-v4/v5/v6/v7   -> ZERO live rows each

**The batches labelled v6 and v7 in `SAT-RW-ATTACK-RESULT-2026-09-04.md` were never
inserted.** The live cohorts named `rw-v6-sec-hard` and `rw-v7-sec-hard` are the v1a/v1b/v2
and v3 batches respectively. So 69.4% and 61.1% describe no live item, and the
`sat-sec-hard-v7` punctuation split (85.7% vs 62.7%) that prediction 3 rests on is a
property of an uninserted candidate. This is the C&S `rw-v7-cs-hard` mis-identification
happening a second time, in the same week, on the neighbouring domain.

---

## 3. The draw

Keys dealt exactly 6/6/6/6 per 24-item file, so a constant-letter solver scores exactly
25.0%. Three fresh solvers per file, one blind file in and one answer file out each.

| file | composition | dealt ctl | solvers | pooled | identical strings |
|---|---|---|---|---|---|
| `seclive-f1` | 20 v2 / 4 newer | 25.0 | 58.3 / 66.7 / 62.5 | **62.5%** | no |
| `seclive-f2` | 20 v2 / 4 newer | 25.0 | 70.8 / 83.3 / 87.5 | **80.6%** | no |
| `seclive-f3` | 20 v2 / 4 newer | 25.0 | 70.8 / 70.8 / 75.0 | **72.2%** | no |
| `eoilive-f1` | 11 v2 / 13 newer | 25.0 | 54.2 / 54.2 / 54.2 | **54.2%** | no |
| `eoilive-f2` | 10 v2 / 14 newer | 25.0 | 79.2 / 79.2 / 83.3 | **80.6%** | no |
| `eoilive-f3` | 10 v2 / 14 newer | 25.0 | 50.0 / 54.2 / 50.0 | **51.4%** | no |
| `eoilive-f4` a/b/c | 17 eoi-v6 / 7 rsw2 | 25.0 | 37.5 / 37.5 / 25.0 | 33.3% | **a and b byte-identical** |
| `eoilive-f4` d/e/f (re-run) | same items | 25.0 | 33.3 / 33.3 / 37.5 | **34.7%** | no |

`eoilive-f4` was drawn as a confirmation file after `eoi-v6` transitions came back at
66.7% on n=8 — the one stratum that refused the prediction — and rsw2 at n=5 was the
thinnest RS stratum. **Two of its three solvers returned byte-identical 24-letter
pick-strings.** The pre-registered void condition is all three, so this did not strictly
trip it, but the file was re-run with fresh solvers d/e/f rather than reported. The re-run
landed within 1.4 points (34.7% vs 33.3%) and is the verdict-bearing number everywhere
below. On the fuller data `eoi-v6` fell from 66.7% (n=8) to **48.0% (n=25)** — the 66.7%
was small-n noise, and the confirmation file is the only reason that is known.

No other file in either run had even a pairwise collision.

---

## 4. Results

### Standard English Conventions — 72 items, 9 solvers, 25.0% dealt control

**Headline, and it needs a caveat before the number: 71.8% pooled — but 15 of the 72
drawn items are not blind at all.**

Three solvers independently reported that some stems print the sentence they are asking
about. They are right, and it is a population-scale data defect:

    live SEC items whose item.passage is EMPTY and whose
    item.prompt carries the blanked sentence:   48 of 287   ALL IN v2
      of those:  29 form/agreement, 19 punctuation
    same check on EoI, C&S, I&I:                 0 of 738

Those 48 items have no source to withhold. They scored **15 of 15 at 100.0%** in the draw,
which is trivially true and tells you nothing about authoring. Every SEC number below is
therefore given twice.

| stratum | n | blind | all-3 | fixed-letter ceiling |
|---|---|---|---|---|
| **all 72 drawn** | 72 | 71.8% | 43 | — |
| stem carries the sentence | 15 | **100.0%** | 15 | — |
| **genuinely blind** | **57** | **64.3%** | 28 | — |

Genuinely-blind only, by cohort and family:

| cohort :: family | pop | n | blind | all-3 | ceiling |
|---|---|---|---|---|---|
| `v2` :: form/agreement | 149 (+29 no-passage) | 32 | **64.6%** | 14 | 35.7% |
| `v2` :: punctuation | 27 (+19 no-passage) | 13 | **71.8%** | 8 | 33.3% |
| `rw-v6-sec-hard` | 40 | 5 | 80.0% | 4 | — |
| `rw-v7-sec-hard` | 23 | 7 | **38.1%** | 2 | — |

Per-item split, all 72: 3/3 = 43, 2/3 = 10, 1/3 = 6, 0/3 = 13. `v2` only: 37 / 9 / 6 / 8.
By difficulty: medium 77.0%, easy 65.2%, hard 50.0% (n=4).

### Expression of Ideas — 96 items, 12 solvers, 25.0% dealt control

| cohort :: subskill | pop | n | blind | all-3 | none | fixed-letter ceiling |
|---|---|---|---|---|---|---|
| **`v2` :: Rhetorical Synthesis** | 65 | 30 | **100.0%** | **30/30** | 0 | 46.7% |
| `v2` :: Transitions | 1 | 1 | 33.3% | 0 | 0 | — |
| `eoi-v6` :: Transitions | 52 | 25 | 48.0% | 7 | 8 | 32.0% |
| `eoi-v4` :: Transitions | 28 | 7 | 38.1% | 2 | 3 | 42.9% |
| `rsw2` :: Rhetorical Synthesis | 22 | 12 | 30.6% | 2 | 7 | 33.3% |
| `eoi-v3` :: Transitions | 27 | 7 | 28.6% | 2 | 5 | 57.1% |
| **`rsw-v1` :: Rhetorical Synthesis** | 7 | **7 (100%)** | 19.0% | 1 | 5 | 42.9% |
| `eoi-v5` :: Transitions | 42 | 7 | 14.3% | 0 | 5 | 42.9% |

Pooled 55.2%. By family: Rhetorical Synthesis 71.4% (n=49), Transitions 38.3% (n=47).
Per-item split: 3/3 = 44, 2/3 = 8, 1/3 = 11, 0/3 = 33. **`v2` only: 30 / 0 / 1 / 0.**

Letters are flat per FILE, not per stratum, so the per-stratum fixed-letter ceiling is the
honest control for a small stratum and is quoted above. **Five of the seven newer strata
score at or BELOW their own fixed-letter ceiling.**

---

## 5. The three predictions — one holds, one holds only in the direction stated, one fails

### Prediction 1 — "EoI Transitions should be comparatively CLEAN." **HOLDS.**

Transitions 38.3% against Rhetorical Synthesis 71.4%, a 33-point gap on 47 vs 49 items.
Three of the four Transitions cohorts sit at or below their own fixed-letter ceiling
(`eoi-v5` 14.3% vs 42.9%, `eoi-v3` 28.6% vs 57.1%, `eoi-v4` 38.1% vs 42.9%). Twenty-one of
the 47 Transitions items were solved by NO solver. Every solver said the same thing
unprompted: with both sentences withheld a bare connective carries nothing.

**One exception, and it is the reason the confirmation file was drawn:** `eoi-v6` at 48.0%
against a 32.0% ceiling, +16. Elevated, replicated on n=25, and not chance — but a
different order of magnitude from the leaky strata. Three solvers named the mechanism and
it is not comprehension: `"Meanwhile,"` appears as an option in six of sixteen sets and is
never the key, and the antecedent-requiring connectives (`"If so,"`, `"In that case,"`,
`"Otherwise,"`, `"Even then,"`) are systematic filler. That is a distractor-pool habit, not
a passage leak — the fix is at the brief (foils must each be individually licensed), and it
is a HOLD, not a rewrite.

### Prediction 2 — "EoI Rhetorical Synthesis should be LEAKY." **HOLDS FOR `v2` AND FAILS AS A STATEMENT ABOUT THE SUBSKILL — and the failure is the more valuable half.**

    v2       :: Rhetorical Synthesis   30 of 30 items, 3 of 3 solvers   100.0%
    rsw2     :: Rhetorical Synthesis   12 items                          30.6%   (ceiling 33.3%)
    rsw-v1   :: Rhetorical Synthesis    7 items, FULLY ENUMERATED        19.0%   (ceiling 42.9%)

Same subskill, same task type, same stem wording, same option shape — **a 70 to 80 point
spread by COHORT.** The 29 `rsw` items are at or below their fixed-letter ceilings; 12 of
those 19 items were solved by no solver at all. If Rhetorical Synthesis were intrinsically
leaky because "options are full prose claims", `rsw-v1` and `rsw2` would leak too, and they
do not.

So the predictor's route 1 — *the options carry propositional content* — **is not
sufficient**. What separates the two is what the four options are allowed to differ in.
Solvers described the `rsw` items in the same words each time: four options in an identical
frame varying only a number or one named cause (*"chute damage comes down to bin lining /
drop height / emptying interval / belt speed"*, 71/62/53/44 percent), all four equally
satisfying the stem's stated goal. Solvers called these *"the best-built items in the
form"*. In `v2`, by contrast, the four options perform four DIFFERENT rhetorical acts and
only one performs the act the stem names.

**The corrected rule, which fits all six strata measured today:** an item leaks not when
its options carry content, but **when the options differ along the axis the stem names.**
Prose options are safe when the stem's demand is satisfied by all four and only the source
picks between them. That is a sharper statement than "several options remain legal", and it
is testable: it predicts the `rsw` items clean and the `v2` items broken, which is the
observed 80-point split that the original formulation does not explain.

### Prediction 3 — "SEC punctuation LEAKY, SEC form/agreement less so (85.7% vs 62.7%)." **FAILS.**

    genuinely blind, v2 :: punctuation   13 items   71.8%   (ceiling 33.3%)
    genuinely blind, v2 :: form          32 items   64.6%   (ceiling 35.7%)
                                                    -----
                                                     7.2 points, not 23

Directionally correct, magnitude gone, and it does not survive at all outside `v2`:

    rw-v7-sec-hard :: punctuation   3 items   22.2%      vs   form 4 items  50.0%
    rw-v6-sec-hard :: punctuation   3 items  100.0%      vs   form 2 items  50.0%

The two newer cohorts point in opposite directions on n=3. On 39 vs 96 picks a 7-point gap
is not a finding. **Both families leak, at roughly the same rate, and both leak badly** —
64.6% against a 35.7% ceiling is 29 points over, which is the actual result and is worse
news than a clean form/agreement stratum would have been.

Two further reasons the prediction should not be revived. First, the 85.7%/62.7% split it
came from is a property of `sat-sec-hard-v7`, **which was never inserted** (§2). Second,
punctuation is only 46 of the 224 `v2` items — 20% — so even had it held it would have
scoped a fifth of the domain.

**What the SEC solvers actually named, nine for nine, is not punctuation-specific.** It is
option-set arithmetic that applies to both families equally:

- **The three-of-one-number, one-of-the-other grid.** `{are, have been, was, were}`,
  `{is, has been, was, were}` — three plural against one singular. Six such sets in one
  24-item file. "If the item were testing tense you would not need three singulars; the
  lone plural is therefore the thing being tested."
- **The non-word distractor.** `"herds's"`, `"its'"`, `"specie's"`, `"students's"` — not
  English in any sentence, so a four-way choice collapses to two before reading anything.
- **The verbal ladder** — infinitive / gerund / bare nominal / finite clause, used four
  times in one file with the verb swapped, the finite clause a giveaway every time.
- **The dangling-modifier family**, where the key is simply the option with a person in
  subject position and the distractors are an expletive, a nominalisation and a
  thing-subject, every time.

### One structural fact that no prediction anticipated

    SEC live items sharing an option grid with >=1 other item     64 of 287
      the grid {are, have been, is, were} alone                   19 items
      {has been, is, was, were}                                   11 items
    SEC live items in a >=0.50 passage/stem near-clone pair        74 of 287
    SEC topic-twin pairs at Jaccard >= 0.20   50 pairs, 55 items (19.2%)
      compare:  I&I 9.2%,  C&S 0.9%,  EoI 3.3%

Solvers found this from inside the files without being told: *"items 15 and 16 are the same
four options in a different order"*, *"Having studied the region's bird migration patterns"*
beside *"Having studied the region's fault lines"*. This is item cloning rather than the
topic-twin leakage found in I&I, and it has a second consequence: it inflates the SEC
contribution to form capacity, since two clones cannot appear on the same form.

---

## 6. Scope of repair

### EoI `v2` — unambiguous

| reading | rule | items |
|---|---|---|
| strict | project measured all-3 onto the population | **65 of 66** |
| conservative | repair only strata at or above 95% blind | **65 of 66** |

30 of 65 measured, 30 of 30 solved by all three solvers, against a 46.7% fixed-letter
ceiling. The two readings agree because there is nothing to disagree about. The single
`v2` Transitions item is not worth a decision.

### SEC `v2` — two separate problems with two separate fixes

| class | items | what is wrong | fix |
|---|---|---|---|
| no source text | **48** | `passage` empty, sentence in `prompt` | re-packaging, not authoring |
| genuinely blind, form | 149 | 43.8% all-3 measured → **~65** | distractor rewrite |
| genuinely blind, punctuation | 27 | 61.5% all-3 measured → **~17** | distractor rewrite |

    strict         ~130 of 224   (48 re-packaging + ~82 distractor rewrite)
    conservative     48 of 224   (no genuinely-blind SEC stratum reaches 95%)

The gap between the two readings is wide here, and honestly so: SEC at 64.6% blind is a
real defect and a much smaller one than C&S at 97.5% or EoI `v2` RS at 100.0%. **SEC `v2`
is not a rewrite-the-cohort finding.** The 48 no-passage items should be fixed regardless,
because an item with no source is not testing the skill its domain claims.

### The newer EoI cohorts — 126 items to SPARE, and this is the point of the exercise

| cohort | items | blind | ceiling | verdict |
|---|---|---|---|---|
| `eoi-v5` | 42 | 14.3% | 42.9% | **SPARE** |
| `eoi-v4` | 28 | 38.1% | 42.9% | **SPARE** |
| `eoi-v3` | 27 | 28.6% | 57.1% | **SPARE** |
| `rsw2` | 22 | 30.6% | 33.3% | **SPARE** |
| `rsw-v1` | 7 | 19.0% | 42.9% | **SPARE** (fully enumerated) |
| `eoi-v6` | 52 | 48.0% | 32.0% | **HOLD** — distractor-pool tell, not a passage leak |

This is the first clean sub-population of any size found in live SAT R&W. In C&S the clean
stratum was one third of an 18-item cohort; in I&I there was none. Here it is 126 items
across five cohorts, and `rsw-v1` is a population fact rather than a sample. **A repair
programme scoped to "EoI" or to "Rhetorical Synthesis" would rewrite all of it**, and by
the Math-hub precedent the rewrite is itself the risk — every touched item is a chance to
introduce the next tell.

### Bank-wide, updating the register's sizing

    MEASURED, REWRITE-SCALE
      Craft and Structure   :: v2     210    97.5%
      Information and Ideas :: v2     240    91.9%
      Expression of Ideas   :: v2      65   100.0%   <- new
                                      ---
                                      515 items

    MEASURED, REAL BUT SMALLER AND DIFFERENTLY CAUSED
      Standard English Conv :: v2     224    64.6% genuinely blind; 48 with no source
                                             ~130 strict / 48 conservative

    MEASURED CLEAN — DO NOT TOUCH
      eoi-v3/v4/v5 + rsw-v1/rsw2      126    at or below their own fixed-letter ceilings

    ELEVATED, HOLD
      eoi-v6                           52    48.0% vs 32.0%

So the answer to "~450 or ~740" is **515 rewrite-scale, ~130 more at a lower grade, and 126
that must be protected from the repair.** The `v2` label predicted the defect in three
domains and over-predicted it in the fourth; cohort is a better unit than label, and within
EoI even cohort splits a single subskill 80 points.

---

## 7. Method — what was broken before it was believed

**The scorer, before any solver was dispatched**, on real drawn data:

    synthetic perfect x3         -> 100.0%, margin +75.0, trips the identical-string detector
    synthetic always-A x3        -> exactly 25.0%, margin 0.0
    synthetic marginal (33.3%)   -> 33.3%, margin +8.3   [the band that matters, per CLAUDE.md]
    a file missing one answer    -> REFUSING, exit 2
    a non-ABCD pick              -> REFUSING, exit 2

The marginal case was constructed deliberately: a blowout fires under a broken control and
a correct one alike, and the exposure in the previous sweep was at 33.3%.

**Denominators read before verdicts.** Every file reports `n=24`; every aggregate reports
its item count; the population scripts print the row count before and after the
verified/archived filter and warn if paging returned an unexpected total. The two runs
report 72 and 96 items, which match the files.

**All 24 solver transcripts audited from the raw JSONL.** Exactly two tool calls each
(1 Read, 1 Write), and the only `study-bank/` paths appearing in any transcript are that
solver's own blind file and its own answer file. Zero reads of any `.key.json`,
`.meta.json`, `.batch.json`, sibling answer file, `.env`, database or web page.

**Known limitation of this scorer, stated rather than hidden.** Answer files carry no file
tag, so a solver file written against the wrong blind file would score near chance
silently. The transcript audit is what rules that out here; a tag field in the answer
schema would make it structural.

**Nothing was written to the database.** No item was modified, inserted, archived or
re-keyed.

## Artifacts

`seclive-pop.mjs`, `secliv-match.mjs`, `seclive-draw.mjs`, `eoilive-draw.mjs`,
`eoilive-f4-draw.mjs`, `rwlive2-agg.mjs`, `seceoi-twins.mjs`, `seclive-prior.json`;
`seclive-f{1,2,3}.{blind,key,meta}.json` + `.solver-{a,b,c}.json`;
`eoilive-f{1,2,3,4}.{blind,key,meta}.json` + `.solver-{a,b,c}.json` and
`eoilive-f4.solver-{d,e,f}.json`. Scoring reuses `iilive-score.mjs` unmodified.
