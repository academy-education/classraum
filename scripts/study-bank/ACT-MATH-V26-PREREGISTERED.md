# act-math-v26 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

v25 inserted 50 of 62 and took ACT Math 16 -> 17 forms. It did not buy form 18,
because Algebra kept 7 of 12 against a deficit of 9. `form-capacity.mjs` and
`next-form.mjs act/math` (re-run 2026-10-08 before writing this file): **ACT Math
17 forms (801 items)**, binding Algebra 142 / 8 per form. Form 18 = **Algebra +2**;
every other domain already meets form 18. Form 19 from the per-form quotas:

    domain                        live  /form  form 19  deficit18+19  kept rate v24+v25   authored  rule
    Algebra                        142     8     152         10        20/30 = 66.7%          24    owner brief: ~24, so Algebra gates measure alone
    Integrating Essential Skills   163     9     171          8        15/22 = 68.2%          12    8 / 0.682 = 11.7
    Number and Quantity             90     5      95          5         7/11 = 63.6%           8    5 / 0.636 = 7.9
    Geometry                       147     8     152          5        18/21 = 85.7%           7    5 / 0.857 = 5.8, +1
    Statistics and Probability     110     6     114          4        13/14 = 92.9%           6    4 / 0.929 = 4.3, +1
    Functions                      149     8     152          3        16/23 = 69.6%           6    3 / 0.696 = 4.3, +1
    total                                                    35                                63

(v24's "kept" is its would-be kept 39, from `act-math-v24.verdicts.json`; v24 was
held at stage 4, but its graders' verdicts are the measured survival.)

Five Claude authors (no GPT), every file >= 10 so the per-file gates measure:

    author  file                         items                         smallest  interior  largest
    A1      act-math-v26-a1.batch.json    Algebra 12                        4         5        3
    A2      act-math-v26-a2.batch.json    Algebra 12                        3         5        4
    B       act-math-v26-b.batch.json     N&Q 8 + S&P 6 (14)                4         6        4
    C       act-math-v26-c.batch.json     Geometry 7 + Functions 6 (13)     4         5        4
    D       act-math-v26-d.batch.json     IES 12                            3         6        3
    total                                 63                               18        27       18

A1 and A2 get **disjoint Algebra sub-topic lists**. **A1**: linear equations and
inequalities in context, systems of two linear equations, absolute-value
equations, literal equations and formula rearrangement, linear models and rates of
change, lines (slope, intercepts, parallel/perpendicular as equations). **A2**:
quadratic equations (factoring, completing the square, discriminant, vertex),
polynomial expressions and identities, rational expressions and equations, radical
equations, exponent rules and exponential equations with a common base, nonlinear
systems (line with parabola, two parabolas). Merged `act-math-v26.batch.json`;
ids `AM26{A,N,S,G,F,I}-NN` (A1 numbers A-01..12, A2 A-13..24); cohort
`act-math-v26`; four choices (`act-test.ts` math `choiceCount: 4`). Commissioned
medium/hard; banked difficulty is the graders'. `BANK_BAND=mixed`.

**Off limits:** every item, mechanism and option set of act-math-v21, v22, v23
and v24 (all held) and of v25's 12 drops (`act-math-v25.drops.json`).
Re-submitting a held or dropped item re-decides a finished batch. Authors get a
search dump that holds the 3,102 live maths rows (every family) **plus those 137
held/dropped ACT rows**.

## Carried over unchanged from v25 (and through it v20–v24)

All of `ACT-MATH-V25-PREREGISTERED.md` applies unless replaced below:

- v20's four distractor rules and v21's mechanism-duplicate rule.
- The (a)/(b) bans (incl. evenly spaced runs and multiplicative chains under (a)).
- The (c) one-sided family ban with `distractor_meta`, and the mechanical (c)
  return (an extreme key whose three declared `error_kind`s are one label).
- (d) interior parity and (e) complement / shared-denominator pairs, with
  `check-interior-niceness.mjs` as a mechanical stage-0 return.
- **`key-extremity-projection.mjs` with its v25 bars, unchanged** (v24-rate
  projection in [45.0%, 55.0%], equal-rate interior z >= −1.96, author-kept
  key-extremity-gate PASS, authored per-side z within ±1.96).
- `cheap_bound_check` and **rule 10** (extreme key + a confirmed single bound
  cheaper than the work that kills all three -> drop).
- `trap_check` and **rule 11** (an IES stem that announces its own trap -> drop),
  and my by-hand IES trap-clause read at stage 0.
- **The one-direction field:** both graders fill `error_directions` on every
  item (interior keys included). An output missing it on any item is re-run,
  not scored. Rule 8 is applied from the graders' fields, never from the
  author's `one_sided_check`.
- The self-audit: `self_audit.risk` per item; a found defect is fixed, not marked.
- The stage-1 bars and the stage-2 two-grader design with rules 1–11.
- Difficulty banking.
- The stage-4 rule: a measured gate failing on the kept set holds the batch,
  with no dropping or editing.
- Author fields stripped before grading: `quantity_asked`, `distractor_kind`,
  `distractor_meta`, `bounds`, `mechanism`, `arith_class_check`,
  `one_sided_check`, `interior_parity_check`, `cheap_bound_check`, `trap_check`,
  `self_audit`.

## CHANGED in v26

### 1. The hand keyword duplicate search runs BEFORE FREEZE (v25's lesson)

v25's hand keyword search found two live duplicates that neither script flagged
(`AM25A-08` ~ act db88e25f; `AM25G-10` ~ the held AM23G-10). That made five
batches running where the hand search was the channel that found them. Author A
had grepped the battery row and never read it, because the helper stopped
printing at 6 hits.

v26 fixes the order and the helper:

- **Order.** Authors deliver. Then I run stage 0 and all three duplicate checks
  (Jaccard, `math-mechanism-dup.mjs`, and **my hand keyword search of every
  item**, recorded per item with its terms and hit counts). Within-batch overlaps
  (A1 vs A2 included) and my IES trap read come next. Then the single stage-0
  return, and all of that re-runs on the returned items. **Only then is the batch
  FROZEN**: the five author files and the merge are committed with their sha,
  before any solver or grader sees them. **Nothing is edited after freeze.** A
  duplicate found after freeze drops the item (rule 5). It is not replaced.
- **Helper.** The v26 keyword helper prints every hit up to 40 and says how many
  it did not show. Over 40 means narrow the query and read the rest. It refuses
  a dump under 3,000 rows. The dump is the 3,102 live maths rows plus the 137
  held/dropped ACT rows.

### 2. Survival rates re-derived from v24 AND v25 (v25's lesson 3)

New `act-math-v26-projection.mjs` (selftest 5/5). It runs **beside**
`key-extremity-projection.mjs`, which keeps its v25 bars. It derives the
survival rates by key position from both batches' files and asserts the counts:

    v24   extreme-key 15/28 = 53.6%   interior-key 24/31 = 77.4%
    v25   extreme-key 26/36 = 72.2%   interior-key 24/26 = 92.3%
    pooled          41/64 = 64.1%                 48/57 = 84.2%

Live act/math today (761 scorable of 801): smallest 22.9% / interior 55.3% /
largest 21.8%.

**Bars on the merged 63:**
- the kept extreme share projected at **each of the v24, v25 and pooled rates
  in [45.0%, 55.0%]**;
- equal-rate interior z >= −1.96 at **every** projected kept n (the largest
  binds);
- author-kept key-extremity-gate PASS;
- authored per-side z within ±1.96;
- pooled projected kept n >= 10.

At the commissioned 18/27/18 (36/63 = 57.1% extreme) the projections are v24
48.0%, v25 51.1% and pooled 50.3%, and the equal-rate interior z at the v25 n
(~50.9) is about −1.79.

**Break-tested before this file was committed:**
- v24's merged 59 FAILS all three rates (38.5 / 41.4 / 40.7%).
- v23's merged 55 FAILS all three (40.0 / 43.0 / 42.3%).
- v25's merged 62 PASSES (48.9 / 52.0 / 51.3%, worst equal-rate z −1.90).
- A synthetic overshoot (v25 with 10 interior keys moved to the largest option,
  74.2% extreme) FAILS the band, the equal-rate z (−4.11) and the per-side z.

**Key-position band on the merged 63:** smallest and largest each **15–21**,
interior **24–30**, extreme total **33–39** (52.4–61.9%). Outside the band is a
stage-0 FAIL, back to the author once. Each file must land within ±1 of its
commissioned cell.

`check-key-magnitude` on the AUTHORED set is REPORTED, not gated. It reads low
on interior by construction, as in v25. On the KEPT set at stage 4 it gates.

### 3. Algebra is measured on its own

Algebra is the domain that fails (v25 kept 7 of 12, v24 13 of 18) and the one
form 18 needs. So the Algebra 24 (A1 + A2 merged as `act-math-v26-alg.batch.json`,
a scratch merge) is put through the same gates as the whole batch, on its own:

- **Stage 0:** `act-math-v18-preflight.sh` (key-extremity-gate gates; magnitude
  is reported), `act-math-v26-projection.mjs` with the merged bars above, and the
  key-position band **5–9 / 8–12 / 5–9**. A failure is a stage-0 FAIL.
- **Stage 1 (descriptive):** the Algebra arm against its 24 matched Algebra
  controls, printed as candidate minus control and unanimous rates. At n = 24 one
  item is 4.2 points, so this is a report, not a bar. The whole-batch bars decide.
- **Stage 4:** `key-extremity-gate` and `check-key-magnitude act/math` on the
  **kept Algebra items alone**, both GATING, when they number >= 10 numeric. A
  failure holds the whole batch, exactly as a whole-set failure does. If fewer
  than 10 Algebra items are kept, the Algebra-alone gates are NOT MEASURED. That
  is recorded as such, never as a pass, and the whole-set gates decide.

### 4. Option shapes v25's Algebra lost items to

v25 lost five Algebra items to option-set tells that were visible with the stem
in hand:
- an evenly spaced run with the key at its END (A-02);
- a stem gap read off an option pair (A-11, 43 − 29 = 14 = 2 x 7);
- whole-cent parity (A-09);
- a sum of squares that can only fall when a root is dropped (A-07);
- a containment cut (A-03).

New `act-math-v26-option-shapes.mjs` (selftest 3/3) mechanises the first two,
which no existing checker sees. `check-run-middle.mjs` reports only a run whose
MIDDLE is the key.
- **RUN**: a three-term arithmetic or geometric run among the options that
  contains the key at an end or in the middle.
- **GAP**: the key and another option whose difference or sum equals a number
  printed in the stem, or twice one.

Break-tested on v25's merged 62: RUN through the key on 4 items, 3 of them
dropped by the graders (A-02, A-07, A-11; S-04 kept). GAP on 5 items, 2 of them
dropped (A-07, A-11; A-01, F-14 and I-01 kept, being coincidences of the
numbers). So:

- **RUN through the key is a mechanical stage-0 return.** It is ban (a), now
  checked by a script.
- **GAP is a reading list.** I read every GAP line against its stem. A gap the
  stem forces (as A-11's transfer) is a stage-0 return under ban (e); a numeric
  coincidence is recorded and kept.
- `check-run-middle.mjs`, `check-key-is-sum.mjs` and
  `check-option-pair-constant.mjs` run as reading lists beside it. Every line
  that touches the key is read by hand.
- The other three shapes (parity of a money amount, monotone-in-a-dropped-term,
  containment) are semantic. Authors must address each one by name in
  `self_audit.note` on every Algebra item. The graders' existing fields
  (`arith_class`, `one_sided`, `bounds`) test them.

### 5. IES: no additive-total stems where every omission pushes one way (v25's lesson 2)

Three of v25's four (c) drops were IES additive totals: reimbursement (I-11), net
earnings (I-10) and a cost-sharing plan (I-08). Every omission or misapplication
of a component pushed the total the same way. Rule 11 caught none of them,
because each clause made only one option; the (c) test on every item caught
them. So:

- **Banned:** an IES item whose answer is a total, or a net, of several listed
  components, where two or more distractors come from omitting, double-counting
  or misapplying a component so that they fall on the same side of the key.
  IES difficulty comes from chained ordinary steps (rates, unit conversions,
  percents, proportional reasoning, averages), with distractor errors at
  different steps pushing **both** ways.
- Each author `trap_check` line also lists, for every distractor, the step it
  comes from and its direction. The field is stripped before grading.
- **Stage 0, by hand (mine):** in the same IES read as the trap clauses, I mark
  each IES item additive-total yes/no. For each yes, I record the direction of
  each component-error distractor. Two or more on one side of the key is a
  stage-0 return.

## Stage 0 — structural pre-flight (all of v25's, plus the above)

Run per author file, on the merged 63, and on the Algebra 24:
- `act-math-v18-preflight.sh`: sandbox N/N, distractor_solve 3N/3N, hub
  <= +10, key-extremity-gate PASS, 0 composites, sign-pair / dead-options /
  stem-echo / key-singleton exit 0, stem duplicates and duplicate option sets
  clean. Plurality exit 2 = NOT MEASURED. check-key-magnitude is REPORTED.
- The key-position bands.
- `key-extremity-projection.mjs` (v25 bars) and `act-math-v26-projection.mjs`
  (v26 bars).
- The (c) mechanical check.
- `check-interior-niceness.mjs` (mechanical returns as in v24/v25).
- `act-math-v26-option-shapes.mjs` (RUN returns; GAP is read).
- run-middle, key-is-sum and pair-constant as reading lists.
- `check-key-arith-class.mjs` as a reading list.
- My IES trap-clause and additive-total read.
- **The three duplicate checks (§1).**

A stage-0 failure goes back to that author ONCE (v20's one-return rule). The
returned file re-runs all of stage 0, including the duplicate checks. A failure
after the return drops the item (a gate on an item) or holds the batch (a gate on
the set), with no second return. Then FREEZE.

## Stage 1 — options-only attack (screen), bars unchanged from v25

`act-math-v26-attack-draw.mjs` is v25's renderer with only the names, the v26
exclusion and the seed changed. It interleaves the 63 candidates with 63 live
ACT Math controls matched 1:1 by domain, excludes act-math-v16..v26, and deals
keys flat within each arm. Three blind Claude samples are recorded as **three
samples of one solver**, and scored with `score-oo.mjs`.

- At n = 63: 189 picks per arm; one pick 0.53 points; one item 1.6 points.
- **Batch HOLD** if the candidate margin exceeds the control's by **more than +10**.
- **Batch HOLD** if the candidate unanimous-correct rate exceeds the control's
  by **more than 15 points**.
- Ceiling: live ACT Math arms have measured 26–38% on this instrument (v16 27.2,
  v18 36.2, v19 30.3, v20 37.8, v23 33.9, v24 34.5, v25 29.0). Both bars sit far
  under the attainable top and can fire (v23's did).
- **Instrument-invalid** if the control margin is itself >= +25. The
  with-source half then decides alone.
- Descriptive, as in v25: hit rates split by key position per arm, and the
  Algebra arm alone (§3).
- Per item: a unanimous correct solve drops the item ONLY with with-source
  corroboration (rule 6).

## Stage 2 — with-source grade (decides), unchanged from v25

Two independent Claude graders work on `make-grade-render.mjs` of a stripped
copy. The render summary must name no unrecognised field, and both graders quote
the render sha at start and end. The fields are v25's, with `error_directions`,
`extreme_single_bound` and `announced_trap` required on every item. The
`option_structure` prompt names the two §4 shapes explicitly. Rules 1–11 apply
as in v25.

Difficulty banked = the graders' label (agree -> it; one apart -> the easier;
easy vs hard -> medium).

## Stage 4 — kept set, insert

- The kept set re-runs stage 0 as a set. `key-extremity-gate` and
  `check-key-magnitude act/math` GATE on the kept set (>= 10 numeric) and on the
  kept Algebra items alone (§3).
- A measured gate failing holds the batch, with no dropping or editing.
- Insert with `BANK_FAMILY=act BANK_COHORT=act-math-v26 BANK_BAND=mixed`, then
  run `verify-act-draw.ts`, `form-capacity.mjs` and `next-form.mjs act/math`.
- The REGISTER §5 entry and my own ledger entry go in ONE commit. The ledger
  entry is written onto the `ledger.json` re-read from HEAD, and only my files
  are staged. Commit locally; no push.

## Success

- **ACT Math 17 -> 18 forms** if >= 2 Algebra items are kept.
- **17 -> 19** if the kept items meet every form-19 deficit (Algebra 10, IES 8,
  N&Q 5, Geometry 5, S&P 4, Functions 3).
- Anything less is partial: inserted if it passes, and recorded at its true value
  with denominators and the remaining deficit.
