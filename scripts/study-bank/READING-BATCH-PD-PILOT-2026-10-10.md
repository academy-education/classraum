# SSAT Upper Reading `ssat-reading-pd-pilot` (2026-10-10): result

**FAILS STAGE 3 (options-only isolated): candidate 80/90 = 88.9% against the in-run live control
43/144 = 29.9%, margin +59.0 (bar: <= +10). STOPPED. NOTHING INSERTED. NO SITTING TO DRAW.
Recommendation on scaling: NO-GO** (the pre-registered rule: any deciding stage fails).

Real public-domain prose fixed the two QUALITY failures that sank every earlier agent route
(naturalness, and most of "dead distractors"). The questions an agent wrote on top of it gave the key
away from the option set alone: 88.9%, in the range of the 2026-09-21 rejected batches (91.5%, 94.4%).

| step | commit |
|---|---|
| pre-registration, brief, `ssat-pd.mjs` (before any passage was chosen) | `061e9501` |
| Stage S: six passages chosen and verified, before any question | `def72555` |
| freeze (36 items, batch sha `15f78971`) | `288e243a` |
| renders, before any grader or solver | `5ef05643` |

## Sources (all verbatim; `srccheck` 6/6, break-tested with two rewritten words)

| set | slot | text | year | why public domain | words |
|---|---|---|---|---|---|
| PD-P1 | fiction | Kenneth Grahame, "The Secret Drawer", *The Golden Age* (Gutenberg #291) | 1895 | US publication before 1930 | 629, 3 trims |
| PD-P2 | memoir | Hamlin Garland, *A Son of the Middle Border*, ch. I (Gutenberg #28791) | 1917 | US publication before 1930 | 607, 2 trims |
| PD-P3 | poetry | Robert Frost, "The Exposed Nest", *Mountain Interval* (Gutenberg #29345) | 1916 | US publication before 1930 | 299, whole poem |
| PD-P4 | history | Jane Addams, *Twenty Years at Hull-House*, ch. XI (Gutenberg #1325) | 1910 | US publication before 1930 | 550, 1 trim |
| PD-P5 | natural science | John Muir, "The Douglas Squirrel", *The Mountains of California* (Gutenberg #10012) | 1894 | US publication before 1930 | 428, first 3 paragraphs |
| PD-P6 | science (federal) | Mike Cappos (USGS HVO gas field engineer), Volcano Watch, "Stick Season in Hawaii?" (usgs.gov) | 2026 | work of a federal employee, 17 U.S.C. 105 | 636, 1 trim (byline) |

Every trim is marked `[...]` in the student text and listed; the only modernization is Gutenberg
`--` to an em dash. URLs, local sources and sha256 are in `ssat-pd-pilot/passages.json`.

## Stages

| stage | measure | candidate | bar | live | verdict |
|---|---|---|---|---|---|
| S | provenance, verbatim | 6/6 | 6/6 | n/a | PASS |
| 0 | pre-flight after one fix round | 36/36, none dropped | >= 24 items, >= 4 passages | n/a | PASS |
| 1 | C exclusivity | **35/36** | >= 34/36 | 33/33 | PASS |
| 1 | F easy | 21/36 | <= 35/36 | 32/33 | PASS |
| 1 | Q distractor >= plausible | **138/288 = 47.9%** | >= 15/288 | 16/264 = 6.1% | PASS |
| 1 | dead-by-both | 8/36 | <= 19/36 | 15/33 | PASS |
| 1 | pilot-pass | 10/36 | >= 1/36 | 1/33 | PASS |
| 2 | E naturalness | **median 5** (n=12; P6 4/4, the rest 5/5) | >= live median | **2** (n=14, same judges) | PASS |
| 3 | A options-only isolated | **80/90 = 88.9%** | <= control + 10 | in-run control 43/144 = 29.9% | **FAIL (+59.0)** |
| 4 | B grouped | not scored as a gate (stop rule) | <= 40% | n/a | not run as a gate |

**Stage 0 detail.** Round 0 had 32 mechanical problems: 25 from the stem-word rule (5-letter stem
match firing on template words such as "nearly", "suggests", "about"), 5 attitude-lexicon problems
(three of them stem collisions such as contemptuous/contents), 1 A1 absent option (P5-4 B, "earlier
writers"). Licensing 12/12 clean by both judges. The checker was not loosened; one fresh fixer per
author file changed 14 items (no key moved). A1 and licensing re-run fresh on the changed items: 0
absent, 5/5 clean. Final verify CLEAN; key uniquely longest 7/36, uniquely shortest 6/36.

**Stage 3 detail.** Unanimity: candidate 27/30 = 90.0% vs control 30/48 = 62.5%. **25 of 30 candidate
items were solved by all three samples.** By kind: main idea 18/18, attitude 18/18, purpose 15/18,
detail 15/18, inference 14/18.

## The pre-registered scale test

| hypothesis | result | bar | live | WV6 |
|---|---|---|---|---|
| H1 not too easy | 21/36 = 58.3% easy | <= 18/36 | 32/33 = 97.0% | 10/12 |
| H2 distractors alive | 8/36 = 22.2% dead-by-both | <= 6/36 | 15/33 = 45.5% | 6/12 |

**Neither is met.** Both are much better than live, and Q (47.9% plausible-or-strong) is the best any
SSAT reading batch has measured. **5 of the 8 dead-by-both items are attitude items**, and the cause is
named below. Without them dead-by-both would be 3/30.

## Why Stage 3 failed: two explanations, measured

**1. Recall of the source texts (a confound of this method, not a defect in the items).** Sample c
said it "used what I know of the source texts" for Frost, Muir and the USGS piece. One grouped sample
said it recognised five of six sources (Grahame, Garland, Frost with the lines, Addams, Muir), all but
USGS. A model can answer from memory of a published text; a student generally cannot. This is the
ACT Science saturation pattern (CLAUDE.md, 2026-09-21).

Measured split, isolated, 3 samples:

| subset | candidate | control |
|---|---|---|
| P3 Frost, P5 Muir, P6 USGS (the three sample c named) | 42/45 = 93.3% | 29.9% |
| P1 Grahame, P2 Garland, P4 Addams | 38/45 = 84.4% | 29.9% |
| **P6 USGS alone (2026, the one source no solver recognised)** | **12/15 = 80.0%; 4 of 5 items unanimous on the key** | 29.9% |

**Recall does not explain the margin.** The 2026 federal article, which no sample recognised, still
scores 80.0%, +50 over control. P6 is 5 items, too small to be a verdict alone. It is consistent with
every other passage, though, and the option sets show why.

**2. The option sets give the key away (a defect in the items).** For example:
- In PD-P1-1 all five main-idea choices share one frame ("how a boy's hunt for riches ..."). The key is
  the only one that resolves into a theme ("ends in a sense of kinship with an unknown child"); the
  others are a moral, a mood, a question, a fact.
- In 5 of 6 attitude items the key is the only warm-class word among four negative or neutral ones.
  Stage 1 grader a and round-1 licensing judge a both said so before Stage 3 ran. The brief's
  five-direction rule (WV6's fix for near-synonym exclusivity failures) forces exactly this shape
  whenever the true attitude is warm. It traded an exclusivity failure for a polarity odd-one-out, the
  ISEE s19 tell in another form. It is also why attitude carries 5 of the 8 dead-by-both items.
- Inference keys are the "most insightful reading" ("wants it to wait there for some later boy to
  discover"; "is struck that their care ended once the screen was built"). Distractors read as
  plainly literal or plainly negative.

The brief said "the key is not the most interesting or most literary claim" and "no option is
uniquely ... sophisticated". The authors' self-check ("cover the passage: could you pick the key?")
was in the brief too. Neither stopped it, and an author's declaration of the constraint is not a check
(CLAUDE.md, 2026-09-24). This is the CLAUDE.md axis rule: on main idea, inference and purpose, the
options differ along exactly the axis the stem names (which reading is the thematic one).

**The sibling-wording channel** that one solver used (Q02/Q17/Q61 print shop, Q08/Q74/Q77 chart-maker
Vane, plus library, mayfly, mural and ice) lies in the **live control** items (`ssat-reading-worlds-s4`),
not the candidate. The control is inflated by it, if anything, which makes the +59.0 margin
conservative.

**Is the instrument valid here?** The SSAT reading instrument discriminates on the live bank (model
21.1%, human 15.0%). It has never been checked against a human on public-domain passages, where recall
is a new channel. So the honest reading is: the margin is too large, and survives the recall-free
passage, so it is a real leak in the items. **Only a human options-only sitting on these items could
settle how much of it a student would see.** The prereg made A deciding regardless, and it stands.

**Grouped (Stage 4), report only, run in parallel before Stage 3 was scored, not a gate:** one sample,
34/36 = 94.4% (P6 5/6). The other two grouped samples were never run.

## What else was learned

- **Naturalness is solved by construction.** Every candidate passage was rated 5 (P6 4) against a live
  median of 2. The live control is weak on this measure: five of the seven Stage A live passages were
  rated 1-2 by both judges. That is a fact about the live bank, and it is the bar used since WV3.
- **Exclusivity holds on real prose:** 35/36. The miss is a vocabulary item (P3-5, "dared not spare":
  neglect vs afford), the one hard item both graders agreed on.
- **Distractor quality improves a lot on real prose** (Q 47.9% vs live 6.1%, WV6 39.6%), except where the
  attitude rule forced the polarity shape.
- **Difficulty improves, but not to the bar:** 21/36 easy (58%) vs live 97% and WV6 83%.

## Recommendation (NO-GO by the pre-registered rule)

Do not scale this method as built. Insertion stops at Stage 3, so nothing is staged and there is no
co-founder sitting to prepare for this cohort. The WV6 read stays open and first in the queue.

If the owner wants another try, the evidence points at the questions, not the passages:
1. **Keep the real-passage half.** It solved naturalness and most of distractor quality.
2. **Choose obscure sources**: period magazines, little-known authors, recent US-government reports.
   Add a pre-flight in which a solver is asked to name the source from the passage's first lines, and
   refuse any passage it names. Frost, Muir, Grahame, Addams and Garland were all recognised.
3. **Drop the five-direction attitude rule when the key is warm**, or make the four distractors include
   a second positive direction. As written, the rule creates the polarity tell every time.
4. **The authoring tell is the same one that sank pilots 1-5:** an agent writes the key as the most
   coherent or insightful reading. Real prose did not change that. The one construction that has ever
   beaten it on SSAT reading is the WV method (one fixed option set, the key drawn after freeze). A
   **hybrid** keeps the real passage and makes the key unknowable from the options. It cannot use the
   WV version draw, because a real passage cannot be rewritten, but a person could write the options.
   Otherwise B10 stands: a person writes or selects SSAT reading items.

## Files

`ssat-pd-pilot/` (passages, items, preflight, renders, grader / judge / solver files, `stage1.json`,
`stage3.json`), `ssat-reading-pd-pilot.batch.json` (frozen), `SSAT-READING-PD-PILOT-PREREGISTERED.md`,
`SSAT-PD-AUTHOR-BRIEF.md`, `ssat-pd.mjs`.
