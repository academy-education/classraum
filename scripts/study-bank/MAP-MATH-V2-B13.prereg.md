# map-v2 Math batch 13, 2026-10-31: pre-registration (ALL FOUR AREAS, screen in the loop, gate only at n >= 10)

**Written before any b13 item exists.** No b13 mechanism, generator, candidate or item has been written. The only
inputs that exist are the tools named under **Tools** (built and break-tested for this file) and the six b12 stage-A
survivors, whose re-probe is recorded under **The pool carried in** (it was run while building `probe13.mjs`, before
this file, and it is a pool definition, not a gate output: no screener, solver or grader of this batch exists yet).

n11's prereg (`MAP-MATH-V2-N11.prereg.md`, and through it n789, b6, b5 and the batch-1 prereg) governs everything not
changed here: the construction checks in `math-check.mjs`, the screen and its one return, the options-only bar and
its ceiling rules, the with-source graders (R1-R11, EXT-1, F 2-of-3), C and C-prime, insert-prep. **No bar changes.**
Every change is listed under **Changes from n11**.

## Why this batch

MAP Math is the thinnest MAP subject: 218 live, 0 staged, **5 clean forms** (map-form-depth: f6 short OA 5/10,
N 1/10, Geo 7/10, Stats 5/10). The owner floor is 10 forms. The last five MAP Math rounds inserted nothing:
b6 0 kept, n789 held (central-key tell, +42.9), b10 held (+50 to +56), n11 held (unanimity +20.0 at n = 5), b12 stage A
pooled 6 and did not gate. REGISTER 2026-10-30: pool per area until n >= 10, then prereg and gate.

## The pool carried in (b12 survivors, re-probed before this file)

`probe13.mjs` was built because b12's live probe had a query bug: `"ladder&slides?|ladder&slips?"` is split on `&`
into `ladder`, `slides?|ladder`, `slips?`, so it required "slips" and never matched a ladder that "slides". Re-run
with corrected queries (one-term context probe plus `||` conjunctions) over dump-b13, the six b12 picks read:

| b12 pick | area | live / earlier hit | reading | carried in? |
|---|---|---|---|---|
| MB12C-G1-b | G | live SSAT e4ff3033 (25-ft ladder, top slides 4 ft, how far does the foot move); also SSAT 659d8c09, ACT e3ec2642 | the same chain on the same givens to the same asked quantity | **no** (live duplicate) |
| MB12C-O18-a | O | live SAT d5d11698 (two membership structures, one-time fee + monthly; "what is that equal total amount") | the same chain | **no** (live duplicate) |
| MB12C-O29-c | O | live ACT e697bff8 and ISEE 89394804 (cents less per ounce between two package sizes) | the live chain plus one pound/ounce conversion step | **no** (one added step: the D16 precedent, REGISTER 2026-10-29) |
| MB12C-G7-b | G | live ISEE d6eb19c8 (one wall minus a door and two windows, square feet painted) | the live chain plus more faces | **no** (one added step) |
| MB12C-O2-b | O | live SAT f9569cf1, ALG-H4-21 (candle, two readings, height BEFORE burning); SALG3-03 is a prior SAT batch row, not live | rate from two readings, then a different asked quantity (time to zero vs height at zero) | **yes, named borderline for R11** |
| MB12C-D61-a | D | none on chain (pets/percent hits are other chains) | clean | **yes** |

**Carried in: O 1 (MB12C-O2-b), D 1 (MB12C-D61-a), G 0, N 0.** Each is re-issued `MB13-<A><g>-NN` with
`selected_from`, verbatim (the n11 precedent). So b13's stage A must SELECT at least **N 10, O 9, G 10, D 9**.

**Duplicate standard (fixed now, used by every author and the coordinator).** A live or earlier item is a duplicate
of a candidate when it runs the same chain of operations on the same kind of givens to the same asked quantity, OR
that chain with ONE step added or removed (D16, O29, G7). A context-only match (same nouns, different chain) is not.
An inverse (solve for a given of the earlier item) of a one- or two-step chain is a duplicate; of a longer chain it is
named borderline and goes to R11.

## Stage A: authoring (screen in the loop)

### A1. Authors and scope

Eight fresh Claude author subagents, disjoint scopes (no author sees another's files until assembly):

| author | area | scope (CCSS) |
|---|---|---|
| N-a | Real and Complex Number Systems | grades 5-6: decimals and fractions operations, 6.NS (division of fractions, GCF/LCM, signed numbers on the line, absolute value, coordinate distance) |
| N-b | Real and Complex Number Systems | grades 7-8: 7.NS rational operations, 8.NS irrationals/approximation, 8.EE.A exponents, roots, scientific notation |
| O-a | Operations and Algebraic Thinking | grades 5-6: 5.OA, 6.RP ratios/rates/unit rates, 6.EE expressions and one-step equations |
| O-b | Operations and Algebraic Thinking | grades 7-8: 7.RP proportional relationships and percent, 7.EE, 8.EE linear equations, 8.F functions |
| G-a | Geometry | grades 5-6: 5.G coordinate plane, 5.MD volume, 6.G area/surface area/volume, polygons on the plane |
| G-b | Geometry | grades 7-8: 7.G scale drawings, angles, circles, cross-sections, area/volume, 8.G transformations, angles, Pythagorean theorem, volume of cylinders/cones/spheres |
| D-a | Statistics and Probability | grades 5-6: 5.MD line plots and conversions, 6.SP centre, spread, distributions (conventions stated in the stem) |
| D-b | Statistics and Probability | grades 7-8: 7.SP sampling, comparing populations, probability models and compound events, 8.SP scatter plots, lines of fit, two-way tables |

Each author aims at **12 or more probe-clean mechanisms** and writes **2 alternatives per mechanism** (different
parameters and different option sets). Every author reads, before writing anything: this file, CLAUDE.md's numeric
batch rules, the REGISTER §5 MAP Math entries of 2026-10-29..31, `scratchpad/map-v2-math-b12-work/README.md` and its
`scratch/` files (the method being continued), and for N the b7/b8/b9 `MECHANISMS.md` / `FEASIBILITY.md` /
`DROPPED.md` (ideas already ruled out), and must not re-author any mechanism the b12 or b11 READMEs dropped or held.

### A2. The keyword probe runs BEFORE any generator code (mandatory)

For every idea, before a generator is written, the author writes a probe spec and runs
`node scripts/study-bank/map-v2-work/math-b13/probe13.mjs <spec.json> <probes.json>`. probe13 refuses a spec unless
each mechanism has a draft stem, at least one ONE-TERM live query (the broad context probe), at least one map query,
and every query matches its own draft stem. Live = every unarchived maths row in every family, verified or staged
(dump-b13, 4,204 rows) plus the prior SAT batch rows; map = every earlier MAP maths item (mapgrep13, which adds n11,
the b12 candidates and every MAP row in dump-b13 to b12's corpus). **Every hit is read** and dispositioned in
`PROBE-READ.md` (hit id, same chain y/n, why) under the duplicate standard above. A duplicate kills the idea before
any code exists. `math-check`'s near-dup is NOT a duplicate clearance (it missed 9 of 10 live duplicates in b12).
The probe spec, probes.json and PROBE-READ.md are written before the generator file (file mtimes and the README
record the order).

### A3. Generator refusals (engine13)

`scripts/study-bank/map-v2-work/math-b13/engine13.mjs` = engine12 with every **position-conditional** rule removed:
CENT a-e, OUTLIER, and the extreme-key block (ext-stem, ext-far1, ext-noCE, ext-noFD). Everything rank-agnostic
stays: FORM-U, PAIR-ALL, ADJ, CLASS, CLOSEPAIR, SUMOPT, SUM1, ERR=KEY, the kinds/misconception rules, LONE, HUB, RUN,
the printed-option rule, DPAIR/DSUM/KGAP, and the per-mechanism stem-readable legality rules and bounds, whose UNION
may strike at most one distractor. A BAN-word stem (greatest, least, most, maximum, minimum, ...) is refused at every
rank. accept() records `nearMean` (key nearest the mean of the four) and never refuses on it.

**Break-test (run for this file):** on the b12 mechanisms, engine12 vs engine13 accepted sets at ranks 1/2/3/4:
G1 0/0/4/2 vs 9/0/22/8; D61 0/2/2/0 vs 0/16/43/129; O29 0/304/0/0 vs 0/2536/2690/101; O2 141/180/160/21 vs
434/969/673/65. Removing the position rules is what opens ranks 1 and 4.

### A4. Key rank: dealt at base rate, never forbidden or preferred

The REGISTER's two failures were mirror images: b1-b5 extreme keys died on the screen, then n789/b10 interior keys
became the centre of mass (solvers: "central value among the options"). Forbidding either produces the other. So the
key's rank among the four sorted values is **dealt at base rate**:

- Per area, a deck of ranks 1, 2, 3, 4 repeated, shuffled with the area's deck seed, is dealt in order to the
  author's (mechanism, alternative) slots, two per mechanism; when a mechanism's two dealt ranks are equal, the
  second is swapped with the next slot's that differs. The deal is made by
  `node scripts/study-bank/map-v2-work/math-b13/deal13.mjs <author> <n-mechanisms>` (seeded; it prints and writes
  `deal.json`), run once per author after the probe and before generation.
- The generator writes each alternative at its dealt rank. If a dealt rank is unreachable for that mechanism after
  the refusals, the alternative is NOT written at another rank; it is recorded as `rank-unreachable` in the README
  with the refusal counts at that rank (survey output), so the unreachability is measured, not hidden.
- `nearMean` and the rank histogram are recorded per area at candidates, at selection and at freeze, against 25%.

### A5. Per-candidate requirements

Every candidate prints PART OK in `math-check.mjs` with
`--slots <author>/slots.json --prior scratchpad/map-v2-math-work/dump-b13/prior-math.json --families isee,ssat,map`
(the b12 fields: grade, tier, ccss, RIT band, solve, distractor_solve, distractor_meta, plugback, key_rank,
`dup_search`). Statistics with competing conventions state the convention (b6 lesson). No candidate may have a key or
option equal to a number printed in the stem (checked by value for mixed numbers, the n11 math-check bug). Ids
`MB13C-<author>-<mech>-<a|b>`.

### A6. The in-loop instrument and selection

Per area: the candidates in packets of at most 40, one fresh cold screener per packet (the v5 screener brief,
verbatim); three fresh options-only samples over every candidate (options only, relabelled, shuffled; no control).
No stage-A reviewer may take any later role.

**Eligible** = the screener answered the key, `n_struck <= 1`, `key_identifiable_free` false, `option_pair_tell`
null, `plugback_routine` false, and options-only hits <= 1 of 3.

**Selection, per area:** one candidate per mechanism at most. Mechanisms in order of (fewest options-only hits of
their best eligible alternative, fewest strikes, seeded order). For each, take the eligible alternative with the fewest
options-only hits, then fewest strikes, then the rank least represented so far in the area (carried-in items
counted). After the pass, while some rank holds more than ceil(n/4) + 1 of the area's n picks, replace the most
recently chosen pick at that rank by its mechanism's other eligible alternative at a less-represented rank, if there
is one. The final histogram and nearMean share are recorded.

**Named bias (as n11):** selection on the in-loop instrument favours candidates that scored low by chance (three
samples of one model). The gate's options-only uses fresh solvers and a live control, and a pass near the bar is read
with this regression in mind.

### A7. n >= 10 per area, or no gate for that area

An area whose selected + carried-in count is **>= 10** is gated. An area below 10 may run **one top-up stage-A round**
(same rules, new mechanisms, new seeds +100) before the gate. An area still below 10 is NOT gated: its selections stay
pooled, no rate is computed for it, and nothing from it is inserted.

## Gate (stage B): `map-math-v2.mjs --batch b13`

As n11, per area, for the areas that reach 10: build (`map-v2-work/math-b13/build13.mjs`: slots, author files with
`selected_from`, dump-b13-r11 / dump-b13-check, EXCLUSIONS-map-b13.txt), assemble, screen pass 1 (fresh, packets of
<= 40), one return round (revise / withdraw / stand), pass 2, freeze per area, options-only per area against a 1:1
tier-matched live ISEE control (fresh solvers), with-source graders d and e (cold, snapshot + hash + chmod 444, then
keyed), coldcheck, score, tie-break F, insert-prep, insert **staged** (verified=false), read back from the DB.

- **R11 corpus:** every earlier MAP maths item in dump-b13's prior (dump-n11 + n11 + the b11 and b12 candidates)
  plus every MAP row in dump-b13's live pull, **minus all MB13C rows and the two carried-in candidates' own rows and
  their b12 siblings** (the n11 precedent: a candidate's own unselected siblings are self near-duplicates, and none of
  them is ever inserted). The four dropped b12 picks (G1-b, O18-a, O29-c, G7-b) and their siblings STAY in R11.
- **math-check prior** = the same set.
- **A1 pattern threshold (rule 10a/10b/10c of `MAP-SCIENCE-B3-FULL.prereg.md`, carried over).** Each grader may add a
  top-level `"_batch_patterns"` array to stage2.json: `{ "pattern": "<property>", "items": [ids] }`. A pattern counts
  when both graders of an area describe the same property (the coordinator records both quotations and the match
  before applying anything); its items are the intersection. **3 or more items: those items drop. Fewer: recorded
  only.** If the union of qualifying intersections is >= 50% of the area's frozen items, the area is held. Patterns
  about key letter or option order never count (the draw reshuffles choices). Applied through
  `map-v2-work/math-b13/pattern-drops.json`, written before insert-prep, read by score and insert-prep.

### Bars (unchanged from n11)

**A. Options-only.** Hold if candidate - control > +10.0; unanimity hold if candidate unanimous-correct rate -
control's > +15.0 (batch level only). Not measured (held) above a 90.0% control hit rate or an 85.0% control
unanimity. With n = 10 the margin moves 10.0 points per item and 3.3 points per pick (30 picks per arm).

**B. With-source graders d and e:** R1-R11, EXT-1, off-blueprint hold, F 2-of-3, plus A1 above.

**C and C-prime:** measured from 10 scorable kept items per area (key-extremity-gate MIN_N); below 10, no measurement.

**Verdict per area:** PASS iff A passes and >= 1 item is inserted (staged).

### Seeds

| stage | seed |
|---|---|
| A4 rank deck per author | N-a 20262301, N-b 20262302, O-a 20262303, O-b 20262304, G-a 20262305, G-b 20262306, D-a 20262307, D-b 20262308 |
| A6 options-only order / relabel | 20262311 |
| A6 screener packet order and deal | 20262312 / 20262313 |
| A6 selection tie order | 20262321 |
| A7 top-up | the A4 / A6 seeds + 100 |
| 0b screen pass 1 order / deal | 20262401 / 20262402 |
| 0d screen pass 2 order / deal | 20262403 / 20262404 |
| 0e freeze | O 20262411, N 20262412, G 20262413, D 20262414 |
| 1 options-only | O 20262421, N 20262422, G 20262423, D 20262424 |
| 2 with-source (+ part) | O 20262430, N 20262440, G 20262450, D 20262460 |
| C-prime | O 20262471, N 20262472, G 20262473, D 20262474 |

Fresh subagents for every role; Claude only; the v5 brief's hard bans (no process-killing commands, no git, no web,
open only the named folder).

## Insert: staged, never released by this batch

`math-bank-helper.mjs insert ... --staged` (new CLI flag, break-tested before use) writes `verified=false`; without the
flag the helper is unchanged. Staged rows do not count toward the 10-form floor until released. `map-form-depth.ts
--staged` reports what the staged rows would add.

## Pre-registered records (none gates)

- **H1, ranks.** Per area at candidates, selection and freeze: rank histogram vs 25% each, and nearMean share vs 25%.
- **H2, screen.** Prediction: <= 30% of frozen-bound items fail gate screen pass 1 (they passed an in-loop screen).
- **H3, regression.** The gate options-only rate vs the selected candidates' stage-A rate vs all candidates' stage-A
  rate, per area; and the position-only expectation from the frozen ranks (batch-1 N solver picks by rank 0.03 / 0.54
  / 0.37 / 0.07, as b5/n789/n11) against the observed rate.
- **H4, probe yield.** Ideas proposed, killed by the probe, written, selected; per area.

## Changes from n11

1. Four areas, eight authors, written AFTER this file (n11, n789, b6 and b10 were written before their preregs).
2. Key rank dealt at base rate by seed; CENT and every position-conditional refusal removed (engine13). n789's
   "no key may be the median or centroid" is replaced by the deal, not kept.
3. probe13 (one-term context probe, `||` conjunctions, self-match refusal) before any generator; duplicate standard
   fixed above, including the one-added-step rule.
4. Eligibility at selection tightened to options-only <= 1 of 3 and no option-pair tell.
5. Gate only at n >= 10 per area (A7).
6. A1 pattern threshold added to the with-source stage.
7. Staged insert (verified=false) through a new `--staged` flag.

No threshold of A, B or C changes.

## What can't be learned here

At n = 10-12 per area each item is 8-10 points of margin; three samples of one model are not three solvers; the
selection regresses toward the stage-A mean by construction. A pass says the option set alone does not decide these
items on this instrument and that two graders found no free elimination; it does not say a student cannot find one.
