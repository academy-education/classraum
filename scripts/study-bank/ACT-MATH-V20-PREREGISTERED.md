# act-math-v20 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

`form-capacity.mjs` (2026-10-08, after act-math-v19): ACT Math **16 forms** by
domain (715 items; naive 15), binding on Number and Quantity **84 / 5 per
form**. `next-form.mjs act/math`:

    domain                        live   /form   for form 17   deficit   authored
    Algebra                        129       8        136         7          9
    Functions                      129       8        136         7          9
    Geometry                       129       8        136         7         10
    Integrating Essential Skills   147       9        153         6          9
    Statistics and Probability      97       6        102         5          6
    Number and Quantity             84       5         85         1          2
    total                                                        33         45   (+36.4%)

    CHEAPEST NEXT FORM: 33 items -> Algebra +7, Functions +7, Geometry +7, S&P +5, IES +6, N&Q +1

Format read from code: `src/lib/study/act-test.ts` math block
`questions: 45, minutes: 50, choiceCount: 4` — FOUR choices.

**Size.** Asked for ~44 (deficit + ~30%). Per-domain margins are set from the
recent kept rates in each domain, not spread flat, because a short domain buys
NOTHING:

- Algebra 9 (v18 8/9, v16 8/9), Functions 9 (v18 8/9 — its one drop was a
  duplicate — v16 8/9): +2 each.
- Geometry 10 (v18 4/5, v17 6/10, v16 7/10 — the weakest domain): +3.
- IES 9 (v19 4/6, v18 8/12, v16 7/9 — two-thirds): +3.
- S&P 6 (v18 4/4, v16 9/9): +1.
- N&Q 2 (v19 5/5, v18 4/7): +1.

45 = 33 + 36.4%, one over the ~44 asked, because the geometry and IES kept
rates (60–70%) at 9 each would sit at or under their deficits in expectation.

Four Claude authors: **A** = N&Q 2 + Algebra 9 (11), **B** = Functions 9 +
S&P 6 (15), **C** = Geometry 10 (10), **D** = IES 9 (9). Files
`act-math-v20-{a,b,c,d}.batch.json`; ids `AM20{N,A,F,S,G,I}-NN`. Cohort
`act-math-v20`. **Commissioned medium/hard** (no author-easy; roughly 55/45)
as in v18/v19; graders keep banking these mostly medium and that is accepted —
the banked label is always the graders'. `BANK_BAND=mixed` declared here.
No repairs after the attack.

## The four distractor rules this batch is built against

Every distractor carries a `distractor_kind` entry that declares all four
checks. They are stripped before grading; **author declarations are not a
check** (v18: 46 declarations killed nothing the graders did not). The graders
and I decide.

1. **v16 — limiting cases.** The value at a parameter's extreme (additive
   percent, no-last-climb count, equal-tangent midpoint, everyone-splits-
   three-ways) sits ON a bound the stem forces. Rewrite it or do not write it.
2. **v17 — neighbouring setups.** The exact answer to an ADJACENT problem
   (rotate about the other axis, the other median, the other averaging rule,
   the other height) is usually an extreme of the feasible interval.
3. **v18/v19 — the cheapest one-step estimate.** For every distractor state
   the cheapest estimate that brackets the key — one multiplication, one
   containment, one unit-size comparison, one monotonicity — compute its
   interval, and keep every distractor **strictly inside** it. On the edge is
   dead. **New in v20, from v19's AM19I-02: the estimate must bracket the
   WHOLE quantity the stem asks for, not a sub-part of it.** The v19 author ran
   the duty over the 30-km three-person stretch and not Eli's whole 38-km
   ride; the true bracket [6.08, 9.12] put a distractor on its edge. Authors
   must write, per item, the quantity asked in one line and show the estimate
   is over exactly that quantity. And (v19's AM19I-06) check the estimate one
   step finer than the obvious one: if a cap like "under 5 hours" is readable
   from the stem, use it, not a looser "under 6".
4. **v18 — weak distractors** (decided by graders, written in up front): a
   distractor counts as weak ONLY if both graders name it as weak or it sits
   on a bound I confirmed by hand. One grader alone is not counted.

## Stage 0 — structural pre-flight (authors run it; I re-run it on delivery)

`act-math-v18-preflight.sh <file>` unchanged. Re-break-tested before authoring
this batch on 2026-10-08: **PREFLIGHT FAIL on the live
`act-math-v18.kept.batch.json`** (6 of its items found as live stem
duplicates). Per file and on the merged 45: sandbox N/N, distractor_solve
3N/3N, hub margin <= +10, `key-extremity-gate` PASS (>= 40% at k=4, measured
only at >= 10 numeric), `check-key-magnitude` consistent, 0 unique-composite
keys, sign-pair / dead-options / stem-echo / key-singleton exit 0,
stem-duplicates and duplicate-option-sets clean. `check-plurality-key` exit 2 =
NOT MEASURED, reported, not a pass. Author D's 9-item file cannot pass
`check-key-magnitude` alone (n < 10 refuses, v19 finding) — D pre-flights
merged with C's 10 for that check only, and reports it; the decision is on the
merged 45. A failing file goes back to its author ONCE before any attack; after
the attack nothing is edited.

## Stage 1 — options-only attack (screen)

45 candidates interleaved with 45 live ACT Math controls matched 1:1 BY DOMAIN,
width 4, keys dealt flat WITHIN each arm, no act-math-v16..v20 row in the
control (`act-math-v20-attack-draw.mjs` = the v19 renderer with output names,
exclusions and seed changed). Three blind Claude samples, recorded as **three
samples of one solver**. Scored with `score-oo.mjs`.

- **Batch HOLD** if candidate margin exceeds the live arm's margin by **more
  than +10 points**. At n = 45 x 3 one pick is 0.74 points. Ceiling check:
  live arms have measured 27–36% on this instrument (v16 27.2, v18 36.2, v19
  30.3), so the bar sits ~50 points under the ceiling and can fire.
- **Batch HOLD** if candidate unanimous-correct rate exceeds the live arm's by
  **more than 15 points** (rate comparison; at n = 45 one item is 2.2 points,
  7 more unanimous items fires it).
- **Instrument-invalid clause**: if the live arm's margin is itself >= +25,
  the with-source half decides alone.
- **Per item**: unanimous-correct drops ONLY with with-source corroboration.

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` (key, difficulty,
explanation, solve, subskill withheld) of a copy with **`bounds`,
`distractor_kind`, the quantity-asked line and every other author-reasoning
field stripped before rendering**; the render summary must name no
unrecognised field. Per item: pick, second defensible answer, every
stem-forced bound and survivors, free elimination, distractor quality, weak
distractors, difficulty, duplicate note, and three dedicated fields:
`limiting_case`, `neighbouring_setup`, `estimation_bound` (the cheapest
one-step estimate bracketing the key **over the whole quantity asked**, the
interval, and which options it kills or puts ON its edge).

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
   both graders name it as weak or it sits on a bound I confirmed by hand.**
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

Kept set re-runs stage 0 as a set. Key-extremity and magnitude are measured
if >= 10 numeric items are kept. If a measured gate fails, the batch is held —
no dropping or editing items to pass. Insert with `BANK_FAMILY=act
BANK_COHORT=act-math-v20 BANK_BAND=mixed`, then `verify-act-draw.ts` and
`form-capacity.mjs`.

## Success

**ACT Math 16 -> 17 forms**: every one of the six deficits (Algebra 7,
Functions 7, Geometry 7, IES 6, S&P 5, N&Q 1) met by kept items. Anything less
is partial, inserted anyway if it passes, and recorded at its true value with
denominators and the remaining deficit.
