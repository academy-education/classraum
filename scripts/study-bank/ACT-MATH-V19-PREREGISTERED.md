# act-math-v19 — pre-registered bars (written 2026-10-07, BEFORE any item is authored)

## Why this batch, and its size

`form-capacity.mjs` (2026-10-07, after act-math-v18): ACT Math **15 forms** by
domain (706 items), binding on Number and Quantity **79 / 5 per form**.
`next-form.mjs act/math`:

    domain                        live   /form   for form 16   deficit   authored
    Number and Quantity             79       5         80         1          5
    Integrating Essential Skills   143       9        144         1          6
    Algebra                        129       8        128         -          -
    Functions                      129       8        128         -          -
    Geometry                       129       8        128         -          -
    Statistics and Probability      97       6         96         -          -

    CHEAPEST NEXT FORM: 2 items -> Number and Quantity +1, Integrating Essential Skills +1

Format read from code: `src/lib/study/act-test.ts` math block
`questions: 45, choiceCount: 4` — FOUR choices.

**Size.** Commission asked for "about 4 N&Q and 5 IES". Recent kept rates in
these two domains: v18 N&Q 4/7, IES 8/12; v16 N&Q 6/8, IES 7/9. Authored
**5 N&Q + 6 IES = 11** — one more each than the floor of the ask so the
authored set is >= 10 numeric items and the key-extremity gate MEASURES
rather than reporting NOT MEASURED. Every kept item beyond the first in each
domain counts toward form 17 (N&Q needs 85, IES 153); form 17 is NOT a goal
of this batch and will not be claimed.

Two Claude authors: **A** = N&Q 5, **B** = IES 6. Files
`act-math-v19-{a,b}.batch.json`; ids `AM19N-NN`, `AM19I-NN`. Cohort
`act-math-v19`. Medium/hard commission as v18 (no author-easy; banked label is
the graders'). `BANK_BAND=mixed` declared here. No repairs after the attack.

## The three lessons this batch is built against

1. **v16 — limiting-case distractors** (§8c / §13b): the value at a
   parameter's extreme sits ON a bound the stem forces.
2. **v17 — neighbouring-setup distractors**: the exact answer to an adjacent
   problem (other axis, other median, other averaging rule) is usually an
   extreme of the feasible interval.
3. **v18 — the one-multiplication estimation bound (NEW, the main killer).**
   All four of v18's IES drops and two N&Q drops died on a bound a student gets
   from ONE multiplication, comparison or containment, without doing the item:
   "314.4 / 130.7 < 2.5, so the price < $6.25", "a 9-in circle fits inside a
   9 x 9 square, so flour < 4.5", "a Celsius degree is larger than a
   Fahrenheit degree, so time < 70.5", "1/0.9 > 1.1, so the key is just above
   270", "log8 x < log2 x for x > 1, so x > 16". **For every distractor the
   author must state the cheapest estimate that brackets the key (one
   multiplication, one containment, one unit-size comparison, one
   monotonicity), compute the interval it gives, and keep every distractor
   strictly INSIDE that interval.** A distractor outside or ON it is rewritten
   before delivery or the item is not written. This is on top of the v16 and
   v17 checks; all three are declared per distractor in `distractor_kind`.

**Author declarations are still not a check** (v18: 46 declarations killed
nothing the graders did not). They are stripped before grading. The graders
and I decide.

## Stage 0 — structural pre-flight (authors run it; I re-run it on delivery)

`act-math-v18-preflight.sh <file>` unchanged (break-tested on 2026-10-07: it
FAILS on the live `act-math-v17.kept.batch.json` through `stem-duplicates`;
re-break-tested before authoring this batch: PREFLIGHT FAIL on the live
`act-math-v18.kept.batch.json`, 6 of its items found as live stem duplicates). Per file and on the merged 11:
sandbox N/N, distractor_solve 3N/3N, hub margin <= +10, `key-extremity-gate`
PASS (>= 40% at k=4, measured only at >= 10 numeric), `check-key-magnitude`
consistent, 0 unique-composite keys, sign-pair / dead-options / stem-echo /
key-singleton exit 0, stem-duplicates and duplicate-option-sets clean.
`check-plurality-key` exit 2 = NOT MEASURED, reported, not a pass. A failing
file goes back to its author ONCE before any attack; after the attack nothing
is edited.

## Stage 1 — options-only attack (screen)

11 candidates interleaved with 11 live ACT Math controls matched 1:1 BY DOMAIN
(N&Q 5, IES 6), width 4, keys dealt flat WITHIN each arm, no
act-math-v16..v19 row in the control (`act-math-v19-attack-draw.mjs` = the v18
renderer with output names, exclusions and seed changed). Three blind Claude
samples, recorded as **three samples of one solver**. Scored with `score-oo.mjs`.

- **Batch HOLD** if candidate margin exceeds the live arm's margin by **more
  than +10 points**. At n = 11 x 3 one item-pick is 3.0 points; a single
  unanimous item is 9.1 points. Ceiling check: live arms have measured
  27–36% on this instrument, so the bar sits ~55 points under the ceiling and
  can fire.
- **Batch HOLD** if candidate unanimous-correct rate exceeds the live arm's by
  **more than 15 points** (rate comparison; at n = 11, two more unanimous
  items = 18.2 points fires it — stated here, before the number exists).
- **Instrument-invalid clause**: if the live arm's margin is itself >= +25,
  the with-source half decides alone.
- **Per item**: unanimous-correct drops ONLY with with-source corroboration.

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` (key, difficulty,
explanation, solve, subskill withheld) of a copy with **`bounds`,
`distractor_kind` and every other author-reasoning field stripped before
rendering**; the render's summary must name no unrecognised field. Per item:
pick, second defensible answer, every stem-forced bound and survivors, free
elimination, distractor quality, weak distractors, difficulty, duplicate note,
and three dedicated fields: `limiting_case`, `neighbouring_setup`, and
**`estimation_bound`** (the cheapest one-step estimate that brackets the key,
the interval it gives, and which options it kills or puts ON its edge).

Kept only if all of:

1. Both picks equal the key (a pure arithmetic slip with the stem read the same
   way is forgiven after my re-derivation; a stem-reading split drops).
2. No second defensible answer named by either grader.
3. **>= 3 options survive every stem-forced bound, including any estimation
   bound**, named by either grader and confirmed by me by hand. An option ON a
   bound is dead. A limiting-case, neighbouring-setup or estimation-bound
   option named by either grader drops the item **if I confirm it sits on or
   beyond the bound**; an option a student can reject only by doing the
   item's own work is a good distractor and is kept (§8a "where the rule
   stops").
4. Not graded "weak" distractor quality by both graders. **Two weak
   distractors in one item drops it, where a distractor counts as weak ONLY if
   both graders name it as weak or it sits on a bound I confirmed by hand**
   (v18's after-the-fact standard, written in here up front). A distractor one
   grader alone calls weak is not counted.
5. No mechanism duplicate of a live maths row (any family) or of an earlier
   item in this batch (later item drops).
6. Unanimous blind solve + a grader-named shortcut / free elimination -> drop.

**Difficulty banked** = graders' label: agree -> that; one band apart -> the
easier; easy vs hard -> medium. Never the author's.

## Stage 3 — duplicate scan

All candidates against ALL live maths rows across every family, paged with
ORDER BY and a distinct-id assertion (`act-math-v16-dupscan.mjs`, unchanged):
flags read by hand; same mechanism -> drop.

## Stage 4 — kept-set gates, then insert

Kept set re-runs stage 0 as a set. Key-extremity is measured only if >= 10
numeric items are kept; below that it is reported NOT MEASURED (as v17's 6),
not a pass. If a measured gate fails, the batch is held — no dropping or
editing items to pass. Insert with `BANK_FAMILY=act BANK_COHORT=act-math-v19
BANK_BAND=mixed`, then `verify-act-draw.ts` and `form-capacity.mjs`.

## Success

**ACT Math 15 -> 16 forms**: at least one N&Q and one IES item kept. Either
domain at zero kept = form 16 not bought; inserted anyway if the rest pass,
recorded at its true value with denominators and the remaining deficit.
