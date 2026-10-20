# map-math-g58-v5p, 2026-10-20: Number Systems end-position PILOT, pre-registration

Written and committed **before any item exists**, with its tool (`map-math-g58-v5p.mjs`, `--selftest` 94/94)
and briefs (`MAP-MATH-G58-V5P-AUTHOR-BRIEF.md`, `MAP-MATH-G58-V5P-GRADER-BRIEF.md`). A measurement only:
**nothing from this pilot is inserted.** Result in REGISTER §5, one commit.

## Why a pilot, not v5

`map-math-g58-v4` (REGISTER §5, 2026-10-20) fixed Number Systems' guessability (options-only +1.8; v3 +19.4)
and was **held on key position**: kept-set key at an extreme 2/14 = 14.3% against the 40% gate. Measured
per position, before this was written:

| key position | authored | frozen (after screen + one return) | kept by graders |
|---|---|---|---|
| S or L (end) | 24 | 7 (29%) | **2 (8%)** |
| interior | 16 | 12 (75%) | 12 (75%) |

End-position items die at the SCREEN and at GRADING, not at freeze, so the spelling v6 fix (freeze by cell)
does not apply. Reaching 40% end keys among kept items at an 8% survival rate needs roughly 60 end-position
slots per 10 interior ones. Before paying for that, this pilot measures whether a construction aimed at the
two causes raises end-position survival. Causes, from v4's screen rows on its 24 end-position items:
**two options struck without solving (22 rows; mostly digit tells)** and **one-sided error direction (20 rows)**,
then single bound kills all (6), key identifiable free (5), plug-back (4).

## What is built

12 four-choice Number Systems items, **every key at an extreme (6 S / 6 L)**, grades 5-8 x low/mid/high
(3 per grade), ids `MM5P-N01`-`N12`, slots seed 20261230. One Claude author, one run.

Against v4, two changes, both enforced by the part check:
1. **FORM** (new, exact): every option shares the key's surface form: decimal places; fraction denominator in
   lowest terms; last-digit class 0 / 5 / other even / other odd. Break-tested at its margins and through the
   part check on v4's own N05.
2. **The end-position recipe** in the brief (rules 23-25): two directions in the computation; a far-side error
   that lands on the near side; no single estimate past all three distractors; not plug-checkable.
Unchanged: v4's part check (LONE, SLIP, bound screen, PRINTED, near-duplicates now including v4's 69 items).

## Order of work

1. author -> `assemble` (every part PART OK)
2. **screen pass 1**: two fresh cold screeners, one per half (v4's prompt and rules R4-R10). **No return.**
3. `pilot-freeze`: ALL 12 go on (so grading is measured on every item, not only screen survivors)
4. graders D and E, cold then keyed, both halves (v4's prompts); `coldcheck`
5. `pilot-score`

## Measure and decision (fixed now)

**Survive = passes screen pass 1 AND kept by the graders' drop rules**, with a one-grader flag (R6 R7 R8 R10
R11) counted as a drop: no tie-break grader in the pilot (the conservative direction). Baseline: v4's end
position, 2 of 24 (8.3%), and that with one return.

| survivors of 12 | decision |
|---|---|
| **>= 4** (33%) | FEASIBLE: pre-register a full v5 with mostly end-position slots, sized from this rate |
| 1-3 | report to the owner: Number Systems end keys stay rare; options are recorded there |
| 0 | STOP agent-authored Number Systems; recommend human-authored end-position items |

Reported regardless: screen pass rate, grader keep rate, cold answers on key, each item's failure reasons.

## What can't be learned here

n = 12 is coarse (one survivor is 8 points). One author and one screener pair: an author effect cannot be
separated from the recipe. No options-only attack runs in the pilot (guessability was v4's solved problem; a
full v5 re-tests it). Source policy, agent limits (Claude only, at most three at once), neutral commit
messages: as v4.
