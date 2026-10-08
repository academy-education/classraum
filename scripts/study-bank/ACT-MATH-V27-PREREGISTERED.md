# act-math-v27 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

v26 inserted 52 of 62 frozen and took ACT Math 17 -> 18 forms. It did not buy form
19, because IES kept 7 of 12 against a deficit of 8. `form-capacity.mjs` and
`next-form.mjs act/math` (re-run 2026-10-08 before writing this file): **ACT Math
18 forms (853 items)**, binding IES 170 / 9 per form. Form 19 = **IES +1**; every
other domain already meets form 19. Form 20 from the per-form quotas:

    domain                        live  /form  form 20  deficit19+20  kept rate v24+v25+v26   authored  rule
    Integrating Essential Skills   170     9     180         10        22/34 = 64.7%            20    owner brief: ~20, double-sized, so IES gates measure alone
    Geometry                       153     8     160          7        24/26 = 92.3%             9    7 / 0.923 = 7.6, +1
    Statistics and Probability     114     6     120          6        17/20 = 85.0%             8    6 / 0.850 = 7.1, +1
    Functions                      155     8     160          5        22/29 = 75.9%             7    5 / 0.759 = 6.6
    Number and Quantity             98     5     100          2        15/19 = 78.9%             4    2 / 0.789 = 2.5, +1
    Algebra                        163     8     160          -               -                  0    already meets form 20
    total                                                    30                                 48

(v24's kept is its would-be kept 39 from `act-math-v24.verdicts.json`; v26's
Geometry denominator is the 6 frozen, its G-03 having been dropped before freeze.)

Four Claude authors (no GPT), every file >= 10 so the per-file gates measure:

    author  file                         items                          smallest  interior  largest
    D1      act-math-v27-d1.batch.json    IES 10                             4         3        3
    D2      act-math-v27-d2.batch.json    IES 10                             3         3        4
    B       act-math-v27-b.batch.json     S&P 8 + Functions 7 (15)           4         7        4
    C       act-math-v27-c.batch.json     Geometry 9 + N&Q 4 (13)            3         7        3
    total                                 48                                14        20       14

D1 and D2 get **disjoint IES sub-topic lists**. **D1**: rates and unit
conversions (speed / time / distance, work and flow or fill rates, unit price and
best buy, currency exchange, density and concentration / mixtures, map and drawing
scale). **D2**: percents (successive or compound change, percent of a changed
base, markup / discount / tax / commission, percent error), averages (weighted
mean, the score needed for a target mean, median from a frequency table),
proportional reasoning in context (splitting by a ratio, direct and inverse
variation), and applied area / volume (coverage, fill, material). Merged
`act-math-v27.batch.json`; ids `AM27{I,S,F,G,N}-NN` (D1 I-01..10, D2 I-11..20; B
S-01..08, F-01..07; C G-01..09, N-01..04); cohort `act-math-v27`; four choices.
Commissioned medium/hard; banked difficulty is the graders'. `BANK_BAND=mixed`.

**Off limits:** every item, mechanism and option set of act-math-v21, v22, v23 and
v24 (all held), v25's 12 drops and v26's 10 drops plus its frozen-then-dropped
G-03. v26's 52 kept are live, so they are duplicates like any live row. The
search dump holds the **3,217 live maths rows (every family) plus those 148
held/dropped ACT rows** (3,365).

## Carried over unchanged from v26 (and through it v20–v25)

All of `ACT-MATH-V26-PREREGISTERED.md` applies unless replaced below:

- v20's four distractor rules, v21's mechanism-duplicate rule, the (a)/(b) bans
  (evenly spaced runs and multiplicative chains under (a)), the (c) one-sided ban
  with `distractor_meta` and its mechanical return, (d) interior parity and (e)
  complement / shared-denominator pairs with `check-interior-niceness.mjs` as a
  mechanical return.
- **`key-extremity-projection.mjs` with its v25 bars** (run read-only; it is not
  edited by this batch, and its sha is printed each time it runs, because another
  session has edits in flight).
- **`act-math-v26-projection.mjs` with its v26 bars** (v24, v25 and pooled-rate
  kept extreme share each in [45.0%, 55.0%], equal-rate z >= −1.96, author-kept
  gate PASS, authored per-side z within ±1.96, pooled kept n >= 10).
- **`act-math-v26-option-shapes.mjs`**: RUN through the key is a mechanical
  return; GAP is a reading list.
- `cheap_bound_check` and rule 10; `trap_check` and rule 11; the v26 IES
  additive-total ban; `error_directions` required from both graders on every item;
  rule 8 applied from the graders' fields, never from the author's declaration.
- The self-audit (`self_audit.risk`; a found defect is fixed, not marked).
- **The hand keyword duplicate search BEFORE FREEZE, with the full-hit helper**
  (v27 copy of v26's: every hit up to 40 with the count not shown, plus `--full`,
  which prints every hit untruncated so a hit is READ, not judged from a 220-char
  cut; refuses a dump under 3,300 rows). Jaccard (`act-math-v16-dupscan.mjs`) and
  `math-mechanism-dup.mjs` run beside it. Every FLAG is read. The dump is re-pulled
  if another session inserts maths mid-run.
- The stage-1 bars, the stage-2 two-grader design with rules 1–11, difficulty
  banking, and the stage-4 rule (a measured gate failing on the kept set holds
  the batch, with no dropping or editing).
- Author fields stripped before grading: `quantity_asked`, `distractor_kind`,
  `distractor_meta`, `bounds`, `mechanism`, `arith_class_check`,
  `one_sided_check`, `interior_parity_check`, `cheap_bound_check`, `trap_check`,
  `self_audit`, and the new `direction_declaration`.

## CHANGED in v27

### 1. IES: both-way error setups, declared per distractor and verified by the graders

v26's IES lost 4 of 5 drops to rule 8 on conversion chains where each stated rule
(1,024 MB per GB, the 90% data share, an inclusive day count, the 3/4 measures)
moved the answer one readable way. The additive-total ban held (0 additive stems
were authored) and did not help: "a bigger denominator lowers it" is readable.
Errors at different steps are not enough; the natural errors must push BOTH ways.

**Brief (both IES authors).** Build IES setups whose natural errors go both ways:
mix **sign slips** (a decrease read as an increase, a loss as a gain), **inverted
rates** (dividing where one multiplies, minutes per mile for miles per minute),
and **wrong base** (a percent of the new value for the old, the wrong reference
group) with at most one omission. Banned outright:
- the v26 additive total ("total of listed parts" where omissions push one way);
- **"every stated rule adds"**: a chain whose stated rules or conversions, each
  neglected, all move the answer the same way (v26 I-03, I-07, I-08, I-09);
- an announced trap (rule 11);
- a distractor that is the KEY re-read in another display (v26 A-08 9.37/9.62,
  I-09 32.37/32.62); and more than one min:sec display-slip distractor per file.

**Declaration (author field `direction_declaration`, stripped before grading).**
Per distractor: `{ step, error_type, direction }`, with `error_type` one of sign
slip / inverted rate / wrong base / omission / other. When the key is extreme, a
`counter_error` `{ step, error_type, solve, direction }`: a natural error whose
JS `solve` lands strictly on the OTHER side of the key and is not an option. And
`stated_rules`: every stated rule, conversion or condition in the stem with the
direction its neglect pushes.

**Stage 0, mechanical: `act-math-v27-ies-directions.mjs` (new; selftest 9/9).**
D1 every distractor declared and its direction matching its value against the
key; D2 >= 2 distinct error types, at least one of sign slip / inverted rate /
wrong base, at most one omission; D3 an extreme key carries a `counter_error`
whose solve evaluates strictly on the other side of the key; D4 >= 2 stated rules
may not all push one way. **A D1–D4 failure is a stage-0 return.** D5 (every
item, every domain): a distractor equal to the key re-read as h.mm or the reverse.
Break-tested on v24–v26: 7 D5 hits, 2 real (v26 A-08 and I-09, both dropped by the
graders) and 5 coincidences on non-time quantities, so **D5 is a reading list**:
on an item whose quantity is in hours/minutes/seconds it is a return. D4 fires on
v26's I-09 declaration in the selftest.

**Stage 2, the graders verify the declaration without seeing it.** New required
grader field on every IES item, `ies_counter`: `{ error, direction, as_natural }`
— the most natural student error that moves the answer the OTHER way from the
three wrong options (extreme key), or a confirmation that wrong options sit on
both sides (interior key), and whether that error is as natural as the errors that
made the options. `act-math-v27-ies-verify.mjs` (new) lines up, per IES
distractor, the author's declared step / type / direction beside each grader's
`error_directions` entry, and the declared counter-error beside each `ies_counter`.
It prints **declarations whose direction both graders reproduce, out of all IES
distractor declarations**, and **extreme-key IES items with a counter-direction
error rated natural by >= 1 grader, out of all extreme-key IES items**. It refuses
an output missing `ies_counter` on any IES item (re-run, not scored).

**Rule 12 (new):** an IES item with an EXTREME key on which BOTH graders find no
counter-direction error as natural as the option errors (`as_natural` false or no
error named), confirmed by me against the author's declared counter-error -> drop.
A grader naming a different error for an option is recorded, not a drop. Rule 8
still applies to every item exactly as before.

### 2. Key position commissioned from IES's OWN survival (A88's lesson)

A88 failed its kept-set extremity gate because it commissioned key position from
another domain's measured survival. Measured over v24+v25+v26 by domain class:

    IES        extreme-key  6/17 = 35.3%   interior-key 16/17 = 94.1%
    non-IES    extreme-key 63/83 = 75.9%   interior-key 56/66 = 84.8%

**New `act-math-v27-projection.mjs` (selftest 5/5: derives both classes from the
three batches' files and asserts the counts; reproduces v26's kept IES split 2
extreme of 7 exactly).** It runs beside the v25 and v26 projections. Bars:

- **Merged 48:** kept extreme share in **[45.0%, 55.0%]** at the SPLIT rates (IES
  at IES's, the rest at non-IES's), at the pooled v24–v26 rates and at v26's
  rates; equal-rate interior z >= −1.96 at every projected n; authored per-side z
  within ±1.96; pooled projected kept n >= 10.
- **IES 20 alone:** kept extreme share at IES's own rates in **[45.0%, 55.0%]**,
  and projected kept IES n >= 10.
- **Reported, not gated:** IES alone at the non-IES rates (the brief works) and at
  equal rates (overshoot).

At the commissioned 14/20/14 with IES 7/6/7 (70% extreme): split 47.0%, pooled
52.7%, v26 54.1%, equal-rate z >= −1.67; the v26 projection's v24/v25/pooled
49.2 / 52.3 / 51.6%; IES alone at its own rates 46.7% at kept n 10.6. **Break-
tested before this file was committed:** v24, v25 and v26 merged all FAIL the IES
bar (20.0%, 34.4%, 27.3%; kept IES n 7.1–7.8); a synthetic IES 13/7 fails it
(41.1%); a synthetic 75%-extreme overshoot fails every merged bar; the target
passes.

**Why IES-alone magnitude is REPORTED, not gated.** No IES composition passes
both the IES-rate band and the equal-rate interior z at n ~ 17: 14/6 reads −2.05
if IES extremes stop dying, 13/7 fails the band. The IES failure actually observed
is the LOW side (v24 kept IES extremes 0 of 4, v26 2 of 6), which the IES-alone
`key-extremity-gate` measures. `check-key-magnitude` gates on the whole kept set,
where the brief-works case reads about −1.75.

**Key-position band:** merged smallest and largest each **12–16**, interior
**18–22** (extreme 26–30); IES 20 extreme **14–15**; each file within ±1 of its
cell. Outside the band is a stage-0 FAIL, back to the author once.

### 3. The return round gets every reading the graders will apply (A88's process lesson)

A88 (SAT Algebra full-form v26) applied the "direction predictable from the stem"
read to one author's items only; 9 of its 15 one-sided drops came from the three
files that went to the graders unread on that axis. And merge-halves ran only after
the returns were spent, so two evenly spaced runs could only be dropped. So:

- **My stem-readable error-direction read runs on EVERY extreme-key item in EVERY
  author file during stage 0, before the return.** Per item I record: the natural
  errors, which way each pushes, and whether a student can tell from the stem
  without solving. "Readable, all one way" is a stage-0 return. The same read on
  IES interior keys checks the declaration.
- **`act-math-v26-option-shapes.mjs` and `merge-halves.mjs` run per author file
  AND on the D1+D2, B+C and full merges before the return.** RUN through the key
  and CLOSURE ON THE KEY (the key is the sum, average or product of two options)
  are mechanical returns; GAP lines, closure among distractors (including a
  closure in which the key is an ADDEND, which `merge-halves.mjs` labels "among
  distractors": the dry run on v26's files printed AM26A-14 −0.67 = −0.42 + −0.25
  with −0.42 the key), shared key values and shared option values across items
  are read.
- All of this is in `act-math-v27-stage0.sh`.

## Stage 0 — structural pre-flight (all of v26's, plus the above)

Per author file, on the merged 48 and on the IES 20: `act-math-v18-preflight.sh`
(sandbox N/N, distractor_solve 3N/3N, hub <= +10, key-extremity-gate PASS, 0
composites, sign-pair / dead-options / stem-echo / key-singleton exit 0, stem
duplicates and duplicate option sets clean; plurality exit 2 = NOT MEASURED;
check-key-magnitude REPORTED on the authored set); the key-position bands; the
three projections; the (c) mechanical check; `act-math-v27-ies-directions.mjs`;
`check-interior-niceness.mjs`; option shapes; merge checks; run-middle, key-is-sum,
pair-constant and `check-key-arith-class.mjs` as reading lists; my IES
trap / additive-total / stated-rule read; my error-direction read on every
extreme key; and the three duplicate checks.

A stage-0 failure goes back to that author ONCE. The returned file re-runs all of
stage 0, including the duplicate checks. A failure after the return drops the item
(a gate on an item) or holds the batch (a gate on the set), with no second return.
Then **FREEZE**: the four author files and the merge are committed with their sha
before any solver or grader sees them. Nothing is edited after freeze.

## Stage 1 — options-only attack (screen), bars unchanged

`act-math-v27-attack-draw.mjs` is v26's renderer with only the names, the v27
exclusion (act-math-v16..v27) and the seed (20261037) changed. 48 candidates
interleaved with 48 live ACT Math controls matched 1:1 by domain, keys flat within
each arm, three blind Claude samples recorded as three samples of one solver,
`score-oo.mjs`.

- At n = 48: 144 picks per arm; one pick 0.69 points; one item 2.1 points.
- **Batch HOLD** if the candidate margin exceeds the control's by **more than +10**.
- **Batch HOLD** if the candidate unanimous-correct rate exceeds the control's by
  **more than 15 points**.
- Ceiling: live ACT Math arms have measured 26–38% (v26 control 31.2%). Both bars
  sit far under the attainable top and can fire.
- **Instrument-invalid** if the control margin is itself >= +25.
- Descriptive: hit rates by key position per arm, and the IES arm alone.
- Per item: a unanimous correct solve drops only with with-source corroboration
  (rule 6).

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` of a stripped copy; the
render summary names no unrecognised field; both quote the render sha at start
and end. v26's fields (incl. `error_directions`, `extreme_single_bound`,
`announced_trap` on every item) plus `ies_counter` on every IES item. An output
missing a required field is re-run, not scored. Rules 1–11 as in v26, plus rule 12
(§1). Difficulty banked = the graders' label (agree -> it; one apart -> the
easier; easy vs hard -> medium).

## Stage 4 — kept set, insert

- The kept set re-runs stage 0 as a set. `key-extremity-gate` and
  `check-key-magnitude act/math` GATE on the whole kept set (>= 10 numeric).
- **IES kept alone (>= 10 numeric): `key-extremity-gate` GATES**; magnitude is
  reported (§2). A failure holds the whole batch. Fewer than 10 IES kept: NOT
  MEASURED, recorded as such, never as a pass; the whole-set gates decide.
- A measured gate failing holds the batch, with no dropping or editing.
- Insert with `BANK_FAMILY=act BANK_COHORT=act-math-v27 BANK_BAND=mixed`, then run
  `verify-act-draw.ts`, `form-capacity.mjs` and `next-form.mjs act/math`.
- REGISTER §5 and my own ledger entry in ONE commit, the entry written onto the
  `ledger.json` re-read from HEAD, only my files staged. Commit locally; no push.

## Success

- **ACT Math 18 -> 19 forms** if >= 1 IES item is kept and inserted.
- **18 -> 20** if the kept items meet every form-20 deficit (IES 10, Geometry 7,
  S&P 6, Functions 5, N&Q 2; Algebra already 163 / 160).
- Anything less is partial: inserted if it passes, recorded at its true value with
  denominators and the remaining deficit.
