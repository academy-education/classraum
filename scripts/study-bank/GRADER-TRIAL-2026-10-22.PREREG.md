# AI exclusivity grader trial: can it stand in for the co-founder's per-item check? (pre-registered 2026-10-22)

**Written before any grader runs.** Owner, 2026-10-22: asked how to scale "without him checking every single
question", then "Try it first".

## Question
His per-item job in a release sitting is the with-source check: given passage, question, options and key, is
exactly one answer defensible ("unique"), is another also defensible ("alternative"), or is the item broken? If an
independent model grader makes the same call reliably, it can take over that check, and he moves to auditing a
sample per batch. The options-only attack is NOT this instrument; it saturates on these families and is not used.

## Test set (`scratchpad/grader-trial/`, seeded 'grader-trial-2026-10-22')
- **Real rejects, 29:** every human review with verdict alternative/broken whose item is unchanged since the review
  (fresh). 25 TOEFL Listening, 2 TOEFL Reading, 1 SAT R&W, 1 ACT English. **No SSAT/ISEE reading reject exists**,
  so this arm cannot speak for those families.
- **Planted defects, 40:** accepted items (not in the control set), each altered by a separate agent to carry one
  defect: a distractor made defensible, the key made wrong, or the item made unanswerable. The planter's record is
  withheld from graders. 14 SSAT reading, 6 SSAT verbal, 3 ISEE reading, 5 SAT R&W, 4 ACT English, 2 ACT reading,
  4 TOEFL Listening, 2 TOEFL Reading.
- **Controls, 120:** items he judged "unique", fresh, stratified: SSAT reading 36, SSAT verbal 8, ISEE reading 8,
  SAT R&W 16, ACT English 12, ACT reading 6, TOEFL Listening 22, TOEFL Reading 8, MAP 4.
All 189 are shuffled and anonymised into grader packets; graders see no ids, cohorts, verdicts or notes.

## Graders
Claude agents (no GPT), each given the co-founder's panel definitions and asked for unique / alternative / broken
plus a one-line reason naming the second answer or the fault. Each item is graded once; 24 items are graded twice
by different graders to report consistency (report only, not a bar).

## Bars (all three must hold; fixed now)
1. **Planted recall >= 32/40 (80%).**
2. **Real-reject recall >= 18/29 (62%).** His flags include subtle Choose-a-Response pragmatics; this bar is lower
   because his own reads of those items were sometimes contested.
3. **False flags on controls <= 18/120 (15%).** A flag on a control counts against the grader even if, on reading,
   the grader turns out to be right; such cases are listed separately for the owner, not used to move the number.
Ceiling/floor check: each bar is reachable (0-100% of its arm is attainable) and none is at an arm's edge.

## If it passes
Propose (do not apply) a new release route for FUTURE batches only: grader on every item + co-founder audit of one
passage (or 12 items) per batch; any grader flag or audit flag sends the batch to a full sitting. Batches already
pre-registered keep their rules.

## If it fails
Report which arm failed and stop. The per-item sitting remains the gate.

## Also reported (not bars)
Per-family numbers, with SSAT reading/verbal shown separately (planted 20, controls 44): a pass overall with a weak
SSAT arm is not a pass for SSAT.
