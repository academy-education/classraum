# act-math-v25 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

v24 (59 items) passed stage 0, the options-only screen (candidate 27.7% vs
control 34.5%, −6.8 against a +10 bar) and the with-source grade (kept 39),
and was HELD at stage 4: the kept 39 had the key at an extreme on 15/39 =
38.5% against the 40.0% gate. The graders drop extreme-key items more often
than interior-key items, and the gate was only ever run on what was authored.
`key-extremity-projection.mjs` (below) derives the v24 survival rates from
v24's own files: **extreme-key 15/28 = 53.6% kept, interior-key 24/31 =
77.4%**; IES extreme-key items kept 0 of 4. The owner chose to keep v24 held.
**No v24 item, mechanism or option set is inserted or reused** (nor any
v21/v22/v23 one): re-submitting a held item re-decides a finished batch.

`form-capacity.mjs` and `next-form.mjs act/math` (2026-10-08, re-run after v24
was held, before writing this file): **ACT Math 16 forms** (751 items),
binding Algebra 135 / 8 per form; form 17 = Algebra +1. Form 18 from the
per-form quotas:

    domain                        live  /form  form 18  deficit17+18  v24 kept   authored  rule
    Algebra                        135     8     144          9        13/18       12      9 / 0.72 = 12.5
    Geometry                       136     8     144          8         7/10       11      8 / 0.70 = 11.4
    Integrating Essential Skills   154     9     162          8         6/10       12      8 / 0.60 = 13.3, less for the trap ban
    Functions                      137     8     144          7         4/9        14      double-sized arm (2 x 7)
    Statistics and Probability     103     6     108          5         6/7         7      5 / 0.86 = 5.8, +1
    Number and Quantity             86     5      90          4         3/5         6      4 / 0.60 = 6.7
    total                                                    41        39/59       62

Five Claude authors (no GPT), every file >= 10 so the per-file gates measure:

    author  file                         items                         smallest  interior  largest
    A       act-math-v25-a.batch.json     Algebra 12                        4         5        3
    B1      act-math-v25-b1.batch.json    Functions 7 + N&Q 6 (13)          4         5        4
    B2      act-math-v25-b2.batch.json    Functions 7 + S&P 7 (14)          4         6        4
    C       act-math-v25-c.batch.json     Geometry 11                       3         5        3
    D       act-math-v25-d.batch.json     IES 12                            3         5        4
    total                                 62                               18        26       18

B1 and B2 get **disjoint Functions sub-topic lists** (B1: composition and
inverses, exponential and logarithmic models, piecewise and absolute value,
transformations of graphs given by equations; B2: polynomial and rational
functions, trigonometric functions and the unit circle, sequences as
functions, quadratic modelling and vertex form, functions given by tables).
Merged `act-math-v25.batch.json`; ids `AM25{A,F,N,S,G,I}-NN` (B1 numbers
F-01..07, B2 F-08..14); cohort `act-math-v25`; four choices (`act-test.ts`
math `choiceCount: 4`). Commissioned medium/hard; banked difficulty is the
graders'. `BANK_BAND=mixed`. **No repairs after the attack.**

## Carried over unchanged from v24 (and through it v20–v23)

All of `ACT-MATH-V24-PREREGISTERED.md` applies unless replaced below: v20's
four distractor rules and v21's mechanism-duplicate rule; the (a)/(b) bans
(incl. evenly spaced runs and multiplicative chains under (a)); the (c)
one-sided error family ban with `distractor_meta` and the mechanical (c)
return (an extreme key whose three declared `error_kind`s are one label);
**(d) interior parity and (e) complement / shared-denominator pairs, with
`check-interior-niceness.mjs` as a mechanical stage-0 return (parity,
KEY-CLEANER, complement, denominators), and its asymmetric-share report**;
the hand keyword search (mandatory, by me, recorded per item); the stage-1
bars; the stage-2 two-grader design and rules 1–9; difficulty banking; the
stage-4 rule that a measured gate failing on the kept set holds the batch with
no dropping or editing. Author fields `quantity_asked`, `distractor_kind`,
`distractor_meta`, `mechanism`, `arith_class_check`, `one_sided_check`,
`interior_parity_check`, and the new `self_audit`, `cheap_bound_check`,
`trap_check` are all stripped before grading.

## CHANGED in v25

### 1. Extreme keys: commissioned at ~58%, and the gate is run on the PROJECTED kept set

v24 authored 28/59 = 47.5% at an extreme and kept 15/39 = 38.5%. v25
commissions **36 of 62 = 58.1% at an extreme** (18 smallest, 18 largest, 26
interior; per file above). Why 58% and not 60–65%: the kept set must also pass
`check-key-magnitude` (interior share vs live 55.8%), so overshoot fails at
stage 4 just as undershoot did. If the graders dropped both positions at the
same rate, a 60% authored set would keep ~60% at an extreme and fail the
magnitude interior z (about −2.0 at n ≈ 40); 58.1% keeps it at about −1.8.

`key-extremity-projection.mjs` (new; selftest 3/3, which includes reproducing
v24's kept 15/39 from its authored 14/31/14 at its own rates). **Break-tested
before this file was committed: it FAILS v24's merged 59 (v24-rate projection
38.5%) and v23's merged 55 (40.0%)** — both outside the band below, and v24 is
exactly the batch the stage-4 gate then held. Stage-0 bars on the merged 62
(per file: printed, a report):

- **v24-rate projection** (extreme-key items survive at 53.6%, interior at
  77.4%, derived from v24's files): kept extreme share in **[45.0%, 55.0%]**.
  At 18/26/18 it is ~49%.
- **equal-rate projection** (no differential drop: the overshoot case): the
  kept set's interior z against live act/math at the projected kept n must be
  >= −1.96.
- **author-kept**: `key-extremity-gate` PASS on the file minus every item the
  author marks `self_audit.risk = "at-risk"` (below).
- **authored per side**: smallest z and largest z against live within ±1.96.

**Key-position band on the merged 62 (replaces v24's 15–32 / 42–62 / 15–32,
which a 58% commission cannot meet):** smallest and largest each **15–21**,
interior **24–28**, extreme total **34–38** (54.8–61.3%). Outside = stage-0
FAIL, back to the author once. Per file: within ±1 of its commissioned cell.

**`check-key-magnitude` on the AUTHORED set:** its interior z is expected to
read low by construction (26/62 = 41.9% vs live 55.8%, z about −2.2), so on
the merged 62 and per file the magnitude line is **REPORTED, not a stage-0
gate**; its per-side z is gated through the projection above. On the KEPT set
at stage 4 it gates exactly as before — that is the set that ships.
`key-extremity-gate` still gates on the authored set (it will pass at 58%).

**Self-audit (authors, before delivery).** Each author grades its own file in
the stage-2 grader's format (every field below, every item) and records per
item `self_audit: { risk: "low" | "at-risk", note }`. Any defect it finds is
FIXED or the item replaced, not marked. `at-risk` is residual doubt only. The
author then runs `key-extremity-projection.mjs` on its own file and must see
author-kept PASS and a v24-rate projection >= 40% on the file. Self-audits are
not a check (declarations killed nothing in v23 or v24); they exist to make
the author look, and the projection is computed from measured rates, not from
the audit.

Stage 1 additionally prints, descriptively, the blind hit rate split by key
position (extreme-key / interior-key) for each arm, because the candidate arm
now has more extreme keys than the control and the solvers' interior prior
(v23: interior picked on 147/165) favours the control on position alone. The
bars are unchanged; this is so a pass riding on position is visible.

### 2. One-direction error families: declarations are not a check

v24: all 28 `one_sided_check` lines said "no"; the graders confirmed (c) on 7,
four of them IES stems that announced their own trap (I-01 descents add
nothing, I-02 two LOWEST dropped, I-03 retake replaces D, I-04 rider on every
leg). So:

- **The with-source graders test (c) on EVERY item, interior keys included**,
  through a new required field `error_directions`: for each of the three
  distractors, does its error push the answer up or down relative to the key,
  and can a student predict that direction from the stem without solving? Then
  `one_sided` as before. A grader output missing `error_directions` on any item
  is incomplete and is re-run, not scored. `one_sided_check` remains an author
  field, is stripped, and is given no weight.
- **No IES stem may announce its own trap.** Banned: an IES stem whose
  difficulty is one stated special condition (an exception, an exclusion, a
  "replaces", a "does not count", a "lowest / highest k dropped", an "applies
  to every ...") such that ignoring it generates two or more distractors in the
  same direction. IES difficulty must come from chaining steps, not from
  noticing one clause. Author field `trap_check` per IES item (stripped).
  **Stage 0, mechanical-by-hand (mine):** I read every IES stem before the
  attack and list every special-condition clause with the direction ignoring
  it pushes; an item where ignoring it gives >= 2 same-direction distractors
  goes back in the single stage-0 return. **Stage 2:** new grader field
  `announced_trap`; **rule 11** below.

### 3. No cheap bound on an extreme key

v24: when the key was the extreme, one cheap one-sided bound (a8 < 3a6; |y| >
120/13; sin²/cos > 2; x = 4 overshoots) killed all three distractors at once.
For an extreme key the three distractors all sit on one side, so any bound
falling between the key and the nearest distractor kills all three.

- **Authoring:** for every extreme-key item, `cheap_bound_check` names the
  cheapest one-sided bound a student can read off the stem (monotonicity,
  containment, sign, a one-step estimate over the whole quantity asked, one
  step finer than the obvious cap) and shows that **at least one distractor
  lies on the key's side of it** — i.e. the nearest distractor is within the
  resolution of every cheap estimate. Stripped before grading.
- **Grading:** new required field `extreme_single_bound`: if the key is the
  largest or smallest option, the cheapest single bound that separates the key
  from all three distractors, and whether it is cheaper than the item's work.
- **Rule 10:** an extreme key with a confirmed single bound, cheaper than the
  item's own work, that puts all three distractors ON or beyond it -> drop.
  (Rule 3 already drops these; rule 10 is counted separately so the measure
  of this defect is visible.)

### 4. Size

62 items (above): Functions a double-sized arm (14, two authors, disjoint
sub-topics); IES 12; Algebra 12 (v24 kept 13/18).

## Stage 0 — structural pre-flight (all of v24's, plus)

Per author file and on the merged 62: `act-math-v18-preflight.sh` (sandbox N/N,
distractor_solve 3N/3N, hub <= +10, key-extremity-gate PASS, 0 composites,
sign-pair / dead-options / stem-echo / key-singleton exit 0, stem duplicates
and duplicate option sets clean; plurality exit 2 = NOT MEASURED;
check-key-magnitude REPORTED on the authored set, see above); the new key-
position band; `key-extremity-projection.mjs` (merged bars above); the (c)
mechanical check; `check-interior-niceness.mjs` (mechanical returns as v24);
`check-key-arith-class.mjs` as a reading list; my IES trap-clause read. A
stage-0 failure goes back to that author ONCE (v20's one-return rule), and the
returned file re-runs all of stage 0 and stage 3.

## Stage 3 — duplicate checks, BEFORE the attack (as v24)

`act-math-v16-dupscan.mjs 62`, `math-mechanism-dup.mjs 62` (both over all live
maths rows, paged, count asserted; every FLAG read by hand) and the hand
keyword search of the full live maths dump per candidate mechanism, by me,
recorded per item. Within-batch overlaps (incl. between B1 and B2) are
checked the same way. A duplicate found here goes back inside the single
stage-0 return; one found after the return or after the attack drops (rule 5).

## Stage 1 — options-only attack (screen), bars unchanged from v24

`act-math-v25-attack-draw.mjs` (v24's renderer; only names, the v25 exclusion
and the seed changed): 62 candidates interleaved with 62 live ACT Math
controls matched 1:1 by domain, act-math-v16..v25 excluded, keys dealt flat
within each arm. Three blind Claude samples, recorded as **three samples of
one solver**. `score-oo.mjs`.

- At n = 62: 186 picks per arm; one pick 0.54 points; one item 1.6 points.
- **Batch HOLD** if candidate margin exceeds the control's by **more than +10**.
- **Batch HOLD** if the candidate unanimous-correct rate exceeds the control's
  by **more than 15 points** (~9–10 excess items).
- Ceiling: live ACT Math arms have measured 26–38% on this instrument (v16
  27.2, v18 36.2, v19 30.3, v20 37.8, v23 33.9, v24 34.5); both bars sit far
  under the top of the attainable range and can fire (v23's did).
- **Instrument-invalid** if the control margin is itself >= +25: the
  with-source half decides alone.
- Per item: unanimous-correct drops ONLY with with-source corroboration
  (rule 6).

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` of a copy with every
author field above stripped; the render summary must name no unrecognised
field; both quote the render sha at start and end. v24's grader fields, plus
**`error_directions`** and **`announced_trap`** on every item and
**`extreme_single_bound`** on every item (null when the grader finds the key
interior).

Kept only if all of v24's rules 1–9 (rule 8 now applied to every item from the
graders' `error_directions` / `one_sided`, never from the author's
declaration), plus:

10. **New:** extreme key + a confirmed single bound cheaper than the item's
    work that puts all three distractors ON or beyond it -> drop.
11. **New:** an IES stem that announces its own trap (a stated special
    condition whose neglect generates >= 2 same-direction distractors), named
    by either grader and confirmed by me -> drop.

Difficulty banked = graders' label (agree -> it; one apart -> the easier;
easy vs hard -> medium).

## Stage 4 — kept set, insert (unchanged from v24)

The kept set re-runs stage 0 as a set; `key-extremity-gate` and
`check-key-magnitude act/math` are measured on the kept set alone (>= 10
numeric) and both GATE. A measured gate failing holds the batch — no dropping
or editing items to pass. Ledger entry, then insert with `BANK_FAMILY=act
BANK_COHORT=act-math-v25 BANK_BAND=mixed`, then `verify-act-draw.ts`,
`form-capacity.mjs`, `next-form.mjs act/math`. REGISTER §5 and the ledger entry
in the same commit, the ledger entry written onto the CURRENT HEAD
`ledger.json` (not a copy from before another batch's commit). Commit locally;
no push.

## Success

**ACT Math 16 -> 18 forms** if kept items meet all six form-18 deficits
(Algebra 9, Geometry 8, IES 8, Functions 7, S&P 5, N&Q 4). **16 -> 17** needs
only Algebra >= 1. Anything less is partial, inserted if it passes, recorded at
its true value with denominators and the remaining deficit.
