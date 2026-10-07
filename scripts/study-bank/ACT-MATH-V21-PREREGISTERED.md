# act-math-v21 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

`form-capacity.mjs` (2026-10-08, after act-math-v20): **ACT Math 16 forms**
(751 items), binding on **Algebra 135 / 8 per form**. `next-form.mjs act/math`:

    domain                        live   /form   for form 17   deficit
    Algebra                        135       8        136         1
    Geometry                       136       8        136         -
    Integrating Essential Skills   154       9        153         -
    Functions                      137       8        136         -
    Statistics and Probability     103       6        102         -
    Number and Quantity             86       5         85         -
    CHEAPEST NEXT FORM: 1 items  ->  Algebra +1

**Size: 5 Algebra items** (asked: about 4, margin for the 1 needed). Algebra
kept rates: v20 6/9, v18 8/9, v16 8/9 — at ~0.7 each, P(0 of 5 kept) ~ 0.2%,
P(0 of 4) ~ 0.8%. One Claude author; file `act-math-v21.batch.json`; ids
`AM21A-01..05`; cohort `act-math-v21`; four choices (`act-test.ts` math
`choiceCount: 4`). **Commissioned medium/hard** as v18–v20; the banked label
is always the graders'. `BANK_BAND=mixed`. No repairs after the attack.

## Distractor rules (unchanged from v20) — and one new duty

Every distractor carries a `distractor_kind` entry declaring all four checks,
each item a `quantity_asked` line, both stripped before grading; author
declarations are not a check.

1. **v16 limiting case** — a parameter-extreme value ON a stem-forced bound is dead.
2. **v17 neighbouring setup** — the exact answer to an adjacent problem is
   usually an extreme of the feasible interval.
3. **v18/v19/v20 cheapest one-step estimate** — over the WHOLE quantity asked,
   one step finer than the obvious cap; every distractor strictly inside.
4. **v18 weak standard** — weak only if both graders name it or it sits on a
   bound I confirm by hand.

**New in v21 — mechanism duplicates.** v20 lost 3 of 45 to live-row
mechanism duplicates the Jaccard scan could not see. The author receives the
live ACT Algebra + SAT Algebra/Advanced Math mechanism list (951 rows: id,
subskill, prompt head) and must pick mechanisms NOT on it; each item declares
`mechanism: [3-5 short phrases]` (stripped before grading), and the author
runs `math-mechanism-dup.mjs` on its own file before delivery.

## Stage 0 — structural pre-flight

`act-math-v18-preflight.sh` unchanged, my re-run on delivery: sandbox 5/5,
distractor_solve 15/15, hub, composites, sign-pair, dead options, stem echo,
key singleton, stem duplicates, duplicate option sets.

**Key-extremity and magnitude need >= 10 numeric items; v21 has 5.** They are
run on `act-math-v21.batch.json` merged with `act-math-v20.kept.batch.json`
(41 items) **as context, and stated as such** — 36 of the 41 are an already
shipped set, so a merged PASS says the 5 do not break the cohort's
distribution, not that the 5 are clean on their own. The 5-item key-at-extreme
count is reported descriptively (x / 5), not gated. v21 alone is expected to
REFUSE both checks (n < 10); that refusal is reported as NOT MEASURED, not a
pass.

## Stage 1 — options-only attack (screen)

5 candidates interleaved with **15 live ACT Algebra controls (3:1, a larger
control to steady its line)**, act-math-v16..v21 excluded, keys dealt flat
within each arm (at n = 5 the best-fixed slot is at most 2/5), three blind
Claude samples (recorded as three samples of one solver), `score-oo.mjs`.

- At n = 5 x 3 = 15 candidate picks, one pick is 6.7 points; the batch-level
  comparison is coarse and is reported with denominators.
- **Batch HOLD** if candidate margin exceeds the control's by more than **+10**
  (fires at 2 excess picks). Ceiling: live arms have measured 27–38% on this
  instrument, so the bar sits far under the ceiling and can fire.
- **Batch HOLD on unanimity** only if **>= 2 of 5** candidates are
  unanimous-correct AND the candidate rate exceeds the control's by > 15 points
  (one item is 20 points at n = 5; a single unanimous item is a per-item matter).
- **Instrument-invalid** if the control's margin is >= +25: with-source decides alone.
- **Per item**: unanimous-correct drops ONLY with with-source corroboration (rule 6).

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` of a copy with
`bounds`, `distractor_kind`, `quantity_asked` and `mechanism` stripped; render
summary must name no unrecognised field. Same fields as v20 (pick, second
defensible, bounds + survivors, estimation_bound over the whole quantity,
limiting_case, neighbouring_setup, free elimination, quality, weak
distractors, difficulty, duplicate note).

Kept only if all of (v20 rules, unchanged):

1. Both picks equal the key (pure arithmetic slip forgiven after my re-derivation).
2. No second defensible answer named by either grader.
3. >= 3 options survive every stem-forced bound (including estimation), named
   by either grader and confirmed by me; ON a bound is dead; an option
   rejectable only by doing the item's work is kept.
4. Not "weak" quality by both graders; two weak distractors (by both, or on a
   confirmed bound) drops it.
5. No mechanism duplicate of a live maths row (any family) or earlier batch item.
6. Unanimous blind solve + a grader-named shortcut / free elimination -> drop.

Difficulty banked = graders' label (agree -> it; one apart -> easier; easy vs hard -> medium).

## Stage 3 — duplicate checks (both)

`act-math-v16-dupscan.mjs 5 act-math-v21.batch.json` (stem similarity) AND
`math-mechanism-dup.mjs 5 act-math-v21.batch.json` (mechanism keywords +
declared terms + shared setups), both over ALL live maths rows in every
family, paged with the count asserted. Every FLAG read by hand; same mechanism
-> drop (rule 5).

## Stage 4 — kept set, insert

Kept set re-runs stage 0 (extremity/magnitude merged with v20 kept, stated).
A measured gate failing holds the batch — no editing to pass. Insert with
`BANK_FAMILY=act BANK_COHORT=act-math-v21 BANK_BAND=mixed`, then
`verify-act-draw.ts`, `form-capacity.mjs`, `next-form.mjs act/math`.

## Success

**ACT Math 16 -> 17 forms** if >= 1 Algebra item is kept. Zero kept is
recorded at its true value and the form stays 16.
