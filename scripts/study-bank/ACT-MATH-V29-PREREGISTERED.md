# act-math-v29 — pre-registered bars (written 2026-10-10, BEFORE any item is authored)

## Why this batch, and its size

v28 inserted 40 of 50 frozen and took ACT Math 18 -> 20 forms. `form-capacity.mjs` and
`next-form.mjs act/math`, re-run 2026-10-10 before writing this file: **ACT Math 20 forms
(893 items)**, binding N&Q 101 / 5 per form.

    domain                         live  /form   form 21  deficit   form 22  deficit (forms 21+22)
    Functions                       160     8      168       8        176      16
    Number and Quantity             101     5      105       4        110       9
    Geometry                        162     8      168       6        176      14
    Statistics and Probability      122     6      126       4        132      10
    Algebra                         163     8      168       5        176      13
    Integrating Essential Skills    185     9      189       4        198      13
    total                                                    31                75

**Goal: forms 21 and 22, 75 kept items across all six domains.** Commissioned per domain
so each domain meets its form-22 deficit with probability >= 0.87 at its own pooled
v24-v28 survival by key class (`pmeet` in my notes; two binomials per domain, rates capped
at 0.95). Form 21 is met with probability ~1.000 if the batch is not held.

    domain   core  extreme/interior  mean kept  P(>= form-22 deficit)
    Algebra    21      11 / 10          15.9          0.957
    Functions  25      12 / 13          19.3          0.959
    Geometry   18       9 / 9           16.0          0.960
    S&P        14       7 / 7           12.1          0.973
    N&Q        14       8 / 6           11.0          0.956
    IES        24      16 / 8           14.9          0.873
    core      116      63 / 53          89.2          all six (independent): 0.715

These probabilities assume the batch is not held by a set gate; a held batch inserts nothing.

**Ten arms, two spares each (one extreme, one interior): 116 core + 20 spares = 136 slots.**
The slot table is code (`act-math-v29-assemble.mjs`, selftest 10/10, mutation-tested):

    arm  domain     core  positions (s smallest, m interior, l largest; core ids in order)   spares
    d1   IES   I-01..12   s l m s l m s l m s l m                                          I-X1 s, I-X2 m
    d2   IES   I-13..24   l s m l s m l s m l s m                                          I-X3 l, I-X4 m
    a1   Alg   A-01..11   s m l m s l m s m l m                                            A-X1 l, A-X2 m
    a2   Alg   A-12..21   l m s m l m s m l m                                              A-X3 s, A-X4 m
    f1   Fn    F-01..13   s m l m s m l m s m l m m                                        F-X1 s, F-X2 m
    f2   Fn    F-14..25   l m s m l m s m l m s m                                          F-X3 l, F-X4 m
    g1   Geo   G-01..09   s m l m s m l m s                                                G-X1 l, G-X2 m
    g2   Geo   G-10..18   l m s m l m s m m                                                G-X3 s, G-X4 m
    s    S&P   S-01..14   s m l m s m l m s m l m s m                                      S-X1 s, S-X2 m
    n    N&Q   N-01..14   l m s m l s m l m s l m s m                                      N-X1 l, N-X2 m
    core 116: smallest 32 / interior 53 / largest 31; IES 16/8, non-IES 47/45

Ids `AM29{I,A,F,G,S,N}-NN` and `AM29x-Xn`; cohort `act-math-v29`; four choices;
commissioned medium/hard; banked difficulty is the graders'. `BANK_BAND=mixed`.

**Sub-topics per arm (disjoint within a domain):**
- **d1 (IES)** rates and unit conversions: speed / time / distance, work and flow or fill
  rates, unit price and best buy, currency exchange, density and concentration / mixtures,
  map and drawing scale.
- **d2 (IES)** percents (successive or compound change, percent of a changed base, markup /
  discount / tax / commission, percent error), averages (weighted mean, the score needed
  for a target mean, median from a frequency table), proportional reasoning (splitting by
  a ratio, direct and inverse variation), applied area / volume (coverage, fill, material).
- **a1 (Algebra, linear)** linear equations and inequalities in context, systems of two
  linear equations, absolute-value equations and inequalities, linear models (meaning of
  slope / intercept), literal equations.
- **a2 (Algebra, nonlinear)** quadratics (factoring, vertex form, discriminant, sum and
  product of roots), exponent and radical rules, rational expressions and equations,
  polynomial operations and remainders, a system with one nonlinear equation.
- **f1 (Functions)** notation and evaluation, composition, inverses, graph
  transformations, piecewise functions, domain and range, average rate of change.
- **f2 (Functions)** exponential growth / decay models, logarithms, polynomial and
  rational function behaviour (zeros, asymptotes, end behaviour), trigonometric functions
  (amplitude, period, unit-circle values), arithmetic and geometric sequences.
- **g1 (Geometry, plane)** triangles (similarity, Pythagorean, special right triangles),
  circles (arcs, sectors, chords, tangents, inscribed angles), polygons (interior angles,
  areas), composite figures.
- **g2 (Geometry, coordinate / solid / trig)** distance, midpoint, parallel and
  perpendicular slopes, circle equations, volume and surface area of solids, right-triangle
  trigonometry, the laws of sines and cosines.
- **s (S&P)** counting (permutations, combinations), probability (compound, conditional,
  two-way tables), expected value, measures of centre and spread, data displays.
- **n (N&Q)** **NOT number properties** (divisibility, primes, factors, GCF / LCM, parity,
  digits, remainders of integers): v28 found them exhausted in the live bank — two authors
  could not write one. N&Q comes from **vectors** (components, magnitude, sums, scalar
  multiples), **matrices** (sums, scalar and matrix products, 2x2 determinants and
  inverses), **complex numbers** (arithmetic, powers of i, modulus, conjugates), and
  **units and precision** (unit-analysis chains, precision and significant figures of
  measurements, scientific-notation magnitudes).

**Off limits:** every item, mechanism and option set of act-math-v21–v24 (held), v25's
12 drops, v26's 10 drops and its G-03, all 62 act-math-v27 items, and **every act-math-v28
item version that is not live** (round-1 originals that were returned, the 5 failed
replacements, the 10 post-freeze drops, the 5 unpromoted spares: 45 rows). The search dump
(`dump.mjs` in my scratch) holds every live maths row (3,593 at 2026-10-10 01:39 KST) plus
those 255 held/dropped ACT rows (3,848).

## Carried over unchanged from v28 (and through it v20–v27)

All of `ACT-MATH-V28-PREREGISTERED.md` applies unless replaced below, in particular:

- v20's four distractor rules, v21's mechanism-duplicate rule, the (a)–(e) bans and their
  mechanical returns, rules 8–12, `cheap_bound_check`, `trap_check`, the IES additive-total
  ban, the self-audit, and the author fields stripped before grading (v28's list).
- **The both-way IES design**: the IES direction declarations and
  `act-math-v27-ies-directions.mjs` D1–D4 as a stage-0 return (D5 read); every extreme-key
  IES item carries a natural counter-direction error.
- **My stem-readable error-direction read on EVERY extreme-key item of EVERY author file
  (and every extreme-key spare) during stage 0, before the return.** "Readable, all one
  way" is a return. The same read on IES interior keys checks the declaration.
- Option-shape and merge checks before the return (RUN through the key and CLOSURE ON
  THE KEY mechanical; GAP, closure among distractors, shared values read).
- The hand keyword duplicate search with the full-hit helper (`kw.mjs`, v29 copy: refuses
  a dump under 3,800 rows), beside Jaccard (`act-math-v16-dupscan.mjs`) and
  `math-mechanism-dup.mjs`; every FLAG and every hand hit read. The standard that held in
  v28: **an item whose working contains a live or held item's whole mechanism is a
  duplicate, even when it adds a step.**
- **One file per item, 5–7 items per run, at most 2 subagents at a time**, completion
  judged by the files on disk; a run that writes nothing for 6 minutes is relaunched from
  its disk state. All agents Claude; no GPT; no process-killing command in any agent.
- **Spares and the promotion rule** exactly as v28 §2 (same arm, same key position; else
  the arm's lowest-numbered remaining spare of the same class; else no promotion; drops in
  id order; applied mechanically by `act-math-v29-assemble.mjs` and recorded BEFORE any
  projection is re-run; unpromoted spares are committed at freeze and never attacked,
  graded or inserted). With one spare per class per arm, the exact-position and
  same-class branches pick the same spare in every case (stated in the selftest).
- Stage 1, stage 2 (two graders, rules 1–12, `ies_counter`, `act-math-v27-ies-verify.mjs`),
  difficulty banking, and stage 4 (a measured gate failing on the kept set holds the
  batch, with no dropping or editing).

## CHANGED in v29

### 1. Planning rates re-derived with v28 included

v28's both-way brief moved IES extreme-key survival from 6/17 = 35.3% (v24–v26) to 9/16 =
56.3%. Planning at 35.3% would commission too many extreme IES keys: the v29 IES 16/8
reads 42.9% at the old rate, outside its own band. **The planning rates are pooled over
every graded batch, v24 + v25 + v26 + v28** (v27 was held at stage 0, never graded),
derived from the batch and verdict files and asserted by the selftest:

    IES       extreme 15/33 = 45.5%   interior 22/23 = 95.7%
    non-IES   extreme 74/97 = 76.3%   interior 70/80 = 87.5%
    reported: v28-alone IES 9/16 and 6/6; domain-blind v24, v28 and pooled4

### 2. At v29's size, G2 binds, and key-extremity-projection is reported

G2 (equal-rate interior z at the projected kept n) grows with n: at ~90 kept the authored
interior share must sit close to live act/math's 54.5%. That cannot coexist with
`key-extremity-projection.mjs`'s v25 bar (v24-rate share in [45, 55]) held with 2.5 points
of headroom: over every composition at IES 24 / non-IES 92, the selftest finds 2 that meet
G1–G8 with C1, and **0** of those have a v24-rate share >= 47.5%. So:

- `key-extremity-projection.mjs` still runs on every stage-0 pass (read-only, sha
  printed) and is **REPORTED** (at the target it reads 45.1%, inside its band by 0.1).
- The v24 rates stay as the steep-differential LOW-SIDE case, gated against the bar
  that actually decides at stage 4, key-extremity-gate's 40.0%: **G8 v24-rate kept
  extreme share >= 40.0%**, and >= 42.5% at commission.
- `act-math-v28-projection.mjs` (v24–v26 rates) is reported.

**New `act-math-v29-projection.mjs` (selftest 12/12; five mutations each fail it).** Gates
G1–G7 as v28 at the new rates, plus G8; `--commission` adds C1 (split and IES shares
each >= 2.5 points inside [45, 55]; G8 >= 42.5%) and C2 (dropping any ONE item of each
class keeps G1–G8). Break-tests in the selftest: a 56%-extreme overshoot fails G2; IES at
3:1 fails C1; an interior-heavy batch fails G8; the target passes with pinned numbers.

**At the commissioned target (mock run on the slot table):**

    gated                          value     headroom / bar     (n)
    split-rate (merged)            47.8%     2.84 pts           kept ~90.2
    IES-rate (IES 24)              48.7%     3.73 pts           kept ~14.92
    G8 v24-rate                    45.1%     bar 40.0 (42.5)
    equal-rate interior z at split n   -1.68
    authored per-side z            1.15 / 1.12
    reported: key-extremity-projection 45.1% PASS | domain-blind v28 44.2% | pooled4 47.7%
    reported: authored-set check-key-magnitude interior z -1.91

    drop one             split    IES       IES kept n   zEq     all gates
    IES extreme          47.6%    47.1%     14.47        -1.60   hold
    IES interior         48.4%    52.1%     13.97        -1.76   hold
    non-IES extreme      47.4%    48.7%     14.92        -1.60   hold
    non-IES interior     48.3%    48.7%     14.92        -1.76   hold

### 3. Three cross-item tells, mechanised (`act-math-v29-cross-tells.mjs`, selftest 8/8)

REGISTER §5's v28 entry names three tells that repeated across v28's kept items. Each is
now a check, with its rate measured on live act/math:

- **CONV — option runs that close in on the key.** The key is the smallest or largest
  option and the gaps, walked toward the key, each shrink to <= 0.67 of the previous
  (3.91 / 4.04 / 4.11 / 4.15). On live act/math before v28 (813 scorable), of 173 option
  sets that close in on one end, the key sits at the closing end on 69 (39.9%) and at the
  far end on 16 (9.2%); v28's kept 40 did it on 8 of 11. **Mechanical RETURN.**
- **WB — an x / x/(1−p) wrong-base pair containing the key**, p a percent printed in the
  stem. **Read** against the distractor_solve body; **confirmed = RETURN**.
- **PCT2 — the ÷(1−p) vs ×(1+p) wrong-percent distractor** (or ×(1−p) vs ÷(1+p)): the key
  and another option in ratio 1/(1−p²). In v28's 50 frozen it sat on 10 items with the key
  in all 12 flagged pairs. **Read; at most ONE confirmed item per batch** (merged core +
  promoted spares); every confirmed item after the lowest id is a RETURN (after the return,
  a drop with the spare rule).

The selftest reproduces v28's frozen 50 (CONV 8, WB 2, PCT2 10) and three mutations each
fail it. (REGISTER's v28 prose counts — 5 base-swap items, 6 wrong-percent items — came
from a hand read; these are the checker's operational definitions, fixed here before any
v29 item exists.) Authors are briefed against all three and run the checker on their own
files.

### 4. Dumps

The search dump is re-pulled **before every author wave, before each of my hand-search
passes, and immediately before freeze**. Every live maths row added between pulls is
hand-searched against every core item and promoted spare, and Jaccard and
`math-mechanism-dup` are re-run on the merged set against the live table at freeze.

## Stage 0 — structural pre-flight

`act-math-v29-stage0.sh` (v28's with v29 names, ten arms, the v29 projection as the GATE,
key-extremity-projection and the v28 projection reported, and the cross-tells check). Per
arm core file, merged core, IES 24 and spares file: `act-math-v18-preflight.sh` (sandbox
N/N, distractor_solve 3N/3N, hub <= +10, key-extremity-gate PASS, 0 composites, sign-pair /
dead-options / stem-echo / key-singleton exit 0, stem duplicates and duplicate option sets
clean; plurality exit 2 = NOT MEASURED; magnitude REPORTED on the authored set); key
position exactly per the slot table (round 1: a mismatch is a return); the v29 projection
(`--commission` on round 1; G1–G8 after) as the GATE; cross-tells; the (c) check;
`act-math-v27-ies-directions.mjs`; interior niceness; option shapes; merge checks;
run-middle, key-is-sum, pair-constant and arith class as reading lists; my IES trap /
additive-total / stated-rule read; my error-direction read on every extreme key; the three
duplicate checks.

A stage-0 failure goes back to that arm ONCE (one return run per arm, 5–7 items; an arm
with more returned items gets two runs). Returned items re-run all of stage 0, including
the duplicate checks. After the return, a per-item failure drops the item (spare rule); a
set-gate failure holds the batch, with no second return. Then **FREEZE**: the ten arm
files, the merge and the spares file committed with their sha before any solver or grader
sees them. Nothing is edited after freeze.

## Stage 1 — options-only attack (screen), bars unchanged

`act-math-v29-attack-draw.mjs` is v28's renderer with only the names, the exclusion
(act-math-v16..v29) and the seed (20261061) changed. 116 candidates interleaved with 116
live ACT Math controls matched 1:1 by domain (pool after exclusion: Algebra 113, IES 128,
Functions 113, Geometry 112, N&Q 69, S&P 84), three blind Claude samples of one solver
(each sample may be split into two halves of the blind file, both halves by the same
brief), `score-oo.mjs`. At n = 116: 348 picks per arm. **HOLD** if the candidate margin
exceeds the control's by more than +10, or the candidate unanimous-correct rate exceeds
the control's by more than 15 points. Instrument-invalid if the control margin is itself
>= +25.

## Stage 2 — with-source grade (decides)

As v28: two independent Claude graders on `make-grade-render.mjs` of a stripped copy plus
an `ies` flag. At 116 items each grader grades **four parts of 29** (four render files,
each with its own sha, quoted at start and end; a grader part sees only its own render).
Every v28 field plus `ies_counter` on every IES item; rules 1–12;
`act-math-v27-ies-verify.mjs` prints its two lines. An output missing a required field is
re-run, not scored. Difficulty banked = the graders' label (agree → it; one apart → the
easier; easy vs hard → medium).

## Stage 4 — kept set, insert

- The kept set re-runs stage 0 as a set. `key-extremity-gate` and `check-key-magnitude
  act/math` GATE on the whole kept set (>= 10 numeric).
- **IES kept alone (>= 10 numeric): `key-extremity-gate` GATES**; magnitude reported.
  Fewer than 10 IES kept: NOT MEASURED, recorded as such, never a pass.
- Cross-tells on the kept set: reported (nothing is dropped or edited after freeze).
- A measured gate failing holds the batch, with no dropping or editing.
- Insert with `BANK_FAMILY=act BANK_COHORT=act-math-v29 BANK_BAND=mixed`, then
  `verify-act-draw.ts`, `form-capacity.mjs` and `next-form.mjs act/math`.
- REGISTER §5 and my own ledger entry in ONE commit, the entry written onto the
  `ledger.json` re-read from HEAD, only my files staged. Commit locally; no push.

## Success

- **ACT Math 20 → 21 forms** if the kept items meet every form-21 deficit (Functions 8,
  Geometry 6, Algebra 5, N&Q 4, S&P 4, IES 4).
- **20 → 22** if they meet every form-22 deficit (Functions 16, Geometry 14, Algebra 13,
  S&P 10, IES 13, N&Q 9).
- Anything less is partial: inserted if it passes, recorded at its true value with
  denominators and the remaining deficit.
