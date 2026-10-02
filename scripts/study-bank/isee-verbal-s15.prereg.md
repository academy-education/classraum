# isee-verbal-s15 — pre-registration (written 2026-10-02, before any item or result exists)

## Why this batch
ISEE verbal = 193 live items, 4 clean forms (admission-form-depth.ts). Measured by
type through the real `replay()` at 20 per type per form, one item per group:

    synonym              101 items / 89 groups  -> 5 clean forms (1 spare)
    sentence completion   92 items / 80 groups  -> 4 clean forms, form 5 = 12/20 fresh

Sentence completion BINDS. 5 forms needs >= 100 drawable SC; deficit 8. This batch is
sentence completions only, single blank, 4 choices (ISEE width, enforced by the inserter).

## Instrument
`make-oo-render.mjs isee-verbal-s15.batch.json --control 30 --control-subskill
sentence_completion --exclude isee-verbal-s4` — options only, keys dealt flat, a
TYPE-MATCHED live control (sentence completions only) interleaved in the same file.
`isee-verbal-s4` is excluded because its 16 SC rows are bijective clone sets whose shared
option pools are information-free (A33/13o); the remaining 76 live SC have unique sets.
Three blind samples of one solver prompt (one model, so: three samples, not three solvers).
Controls are DERIVED from each arm's own deal, never a literal 25.

## Bars (fixed now)
Let M_c = candidate rate - candidate best-fixed-letter, M_l = live rate - live best-fixed-letter,
both pooled over the three samples. Excess E = M_c - M_l.

- **PASS (stratum ships):** E <= +10.
- **HOLD (nothing inserts):** E > +10.
- **Ceiling check:** the bar fires when the candidate exceeds the live rate by 10 points, so
  it is reachable only while the live rate is below 90%. A34 measured live SC at +9.5 over
  25% (~35%), leaving ~55 points of headroom. If the live arm comes back >= 85% the blind
  half is SATURATED for this run and returns no verdict; stop and report instead of passing.
- **Floor check:** if the live arm comes back below its own best-fixed-letter, the floor is
  noise at this n; report the candidate against the letter control as well and do not claim
  "better than the bank".

## Per-item rules (fixed now)
Unanimity is a BATCH comparison (candidate unanimous-correct rate vs the live arm's), never a
per-item verdict alone. An item is dropped only on with-source corroboration, gathered
independently of the blind samples:
- a with-source grader picks a different answer, or names a second defensible option;
- a grader marks a word above the ISEE middle/upper band;
- a grader names a free elimination (an option rejectable without the sentence because it is
  self-contradictory or fits no plausible sentence) AND at least two blind samples rejected that
  same option as "certain";
- stem or key duplicates the live bank or the other author (pre-flight).
No repairs after the attack. A dropped item stays dropped.

## Batch-level tells checked before the attack
Key slot flat; key strictly longest/shortest no more than ~chance; no opposed (antonym) pair
that contains the key in more than a quarter of items; `check-recycled-distractor.mjs` on the
merged file; no two items sharing a stem template or a key.

## Amendment 1 (2026-10-02 ~11:00, after the render, before any solver ran)
The render drew 30 live SC controls, of which **12 are two-blank** (`frozen ... narrow`);
the candidate is all single-blank (39 items after ISC-B-06 was dropped at pre-flight for
being typed `analogy` by `verbalKind` — its gloss "which is to say" matches `\bis to\b`).
So the control is type-matched but not shape-matched. Rule added now: the primary bar is
computed against the full 30, AND against the 18 single-blank controls alone; the stratum
ships only if it passes BOTH. If they disagree, HOLD.
