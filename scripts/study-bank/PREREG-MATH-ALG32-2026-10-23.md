# sat-math-v32-alg — pre-registration (SAT Math, Algebra, authored HARD; the rerun of alg31)

Written 2026-10-23 before any item exists. **Not yet committed, and it may not be committed until
the plant-only probe gate in section 9 has passed** (two consecutive valid plant-only runs, recorded
in section 17 and in `alg32.plugprobe.json`). It is then committed alone, with the tools it names,
before any author runs, and nothing in it changes after an item is seen (anything decided later goes
to REGISTER §5 as a deviation). Ids `SM32L-<slot>`, cohort `sat-math-v32-alg`, tag `alg32`. Claude
only, no GPT model anywhere. Agent runs (up to 4 plant-only probe readers, 3 authors x 2 runs, 1-2
batch probe rounds, 3 solver samples, 3 graders) are launched by the coordinator; the session that
prepared this file launched none.

alg32 is `PREREG-MATH-ALG31-2026-10-23.md` rerun. alg31 **stopped at pre-flight** (its Result
section): 24 parts authored, merged pre-flight and projection PASSED, then the cold plug-back probe
was INVALID twice (both fresh readers missed the positive plant alg26 D6), the strict fallback dropped
the 11 items at natural try 1-2 - which the slot table had put there by design - and the 13
survivors failed R7 (69.2%), R10 (degenerate-parameter bypass 0 above / 5 below) and the projection
(~8.9 kept < 12). Its three recorded causes are fixed here BEFORE any item exists (sections 3, 9, 8):

| alg31 cause | fix in alg32 | evidence and check |
|---|---|---|
| 1. probe calibration hinged on one plant (D6) | D6 removed from the plants; algf27 D13 replaces it; the probe must pass on the 13 plants ALONE, twice consecutively, before this file is committed | section 9; `alg32-plugprobe.mjs --selftest` 19/19, five mutations each caught |
| 2. the fallback could only drop by position, and the slot table required keys there | only AGGREGATE asks (count / sum / difference) may sit at natural try 1-2; the fallback never drops by position | `alg32-fallback-check.mjs`: worst case the fallback allows = 0 drops, R6 / R7 / R10 / projection PASS; the same script reproduces alg31's stop from alg31's parts |
| 3. closure was not checked (author D found it by hand) | CLOSE in `alg32-preflight.mjs` (gating) and its own step in `alg32-part-check.sh` | planted sum / difference / average closures fire on all 24 alg31 parts; clean on the 24 as written |

## 1. Why this batch (re-measured 2026-10-23, read-only; unchanged since alg31's prereg)

`node scripts/study-bank/form-capacity.mjs` (1,666 live SAT Math rows):

    SAT Math     36 full forms (Algebra 548 / 15 binds)
    SAT Math     11 hard forms   capped by Algebra - 92 hard, needs ~8 per form

`npx tsx scripts/study-bank/verify-sat-hard-route.ts math 13`: forms 1-11 ALL-HARD; **form 12 = 18
hard + 4 medium (Algebra 4 hard + 4 medium)**; **form 13 = 14 hard + 8 medium (Algebra 0 hard + 8
medium)**; zero repeats; 11 of 13 all-hard.

    +4  panel-median-HARD Algebra   ->  hard route 12 forms   (96)
    +12                             ->  13 forms              (104)

## 2. Which method, and what changes

The method is alg26 (`PREREG-ALG26-2026-10-08.md`, REGISTER A87) on its three mechanisms that
carried 11 of its 13 hard items, exactly as alg31 section 2 argues (the yield table there is not
repeated). Everything alg31 changed from alg26 is kept. What alg32 changes from alg31:

| change | why (measured) |
|---|---|
| **slot rule: only count / sum / difference at natural try 1-2** (3 slots changed: B7 greatest/r2 -> sum/r2; D6 greatest/r3 -> greatest/r2; D7 least/r2 -> difference/r2) | alg26 graders flagged 0 of 9 aggregate-ask items at try 1-2 (no single grader on any) against 5 of 8 greatest / least / value items there; alg31's two cold readers called all 9 aggregate try-1-2 batch items non-substitutable ("an option cannot be substituted back") |
| **each slot fixes its bypass side** (4 above / 4 below per mechanism) | alg31's survivors had the degenerate-parameter bypass 0 / 5; R10 now holds by construction and the part check refuses the wrong side |
| **fallback: never drops by position** (section 9) | alg31 lesson 1 |
| **probe plants: D6 out, algf27 D13 in; plant-only gate before commit** (section 9) | alg31 lesson 2 |
| **CLOSE** gating in pre-flight and part check | alg31 lesson 3 |
| **PLUG32**: a try-1-2 item must ask an aggregate, declare `substitutable: false`, name `plugback.aggregate_over`, and its question sentence must ask that aggregate (ASKWORD) | the fallback's protection now rests on the ask label, so the label is checked: "how many units of A" (v26 D7) is a single value, not a count; ASKWORD recalls all 18 alg31 aggregate stems and rejects v26 D7's and alg31 D8's |
| reference triples 98 -> 122 (+ alg31's 24 setups) | alg31's parts were seen by two probe readers; never candidates, so their setups are banned |
| `alg32-dump.mjs` prior set widened to v31 | alg31's 24 items appear in the census as BANNED prior items |
| grader brief: natural order descending only when the QUESTION asks a greatest value | the probe already used this (REGISTER 2026-10-23, mf28 DESC); the grader brief still read "a greatest / maximum / largest / most stem", which fires on "at most" conditions |
| `alg32-grade-stage.mjs snap` | alg31's referenced an undefined `h` on a re-snap (would throw instead of refusing); never reached |

**Not changed (kept from alg31 verbatim):** the three mechanisms and their decision points, every
other slot's ask and every rank, the census and idea probe, rules 1-5, the stage-0 checks, stage 1,
stage 2, every bar, the kept-set band, the insert path.

## 3. Commission

**24 items authored as hard, three Claude authors, one mechanism each** (separate subagents, each
writing only its own part files; no author sees another's parts or anything from alg31; the three
may run at once; completion judged by files on disk).

| author | file | mechanism (`mech`) | decision point that must not be bypassable (alg26 verbatim) |
|---|---|---|---|
| B | `sat-math-v32-alg-b.batch.json` | `degenerate-parameter`: a linear equation in x, or a system of two linear equations in x and y, with a constant k such that ONE value of k makes the x-coefficient (or the determinant) vanish | the degenerate k must be treated as its own case (no solution vs every x vs one solution); the generic formula silently fails there |
| C | `sat-math-v32-alg-c.batch.json` | `integer-count-condition`: a one-variable linear inequality or compound inequality with a constant k, and a condition on how many integers (or positive integers) satisfy it | the boundary k values: whether each endpoint is attained, strict vs non-strict, and (where k multiplies x) the direction flip |
| D | `sat-math-v32-alg-d.batch.json` | `integer-optimum`: whole-number quantities x, y under two or three linear constraints, optimise a linear objective (or count / compare optimal plans) | the best LATTICE point is not the rounded corner of the real feasible region |

### Slots (fixed here; `node scripts/study-bank/alg32-slots.mjs` regenerates this table)

Key rank = the key's position by VALUE among the four options (1 smallest .. 4 largest). Natural
plug-back try = the rank, ascending, except on a `greatest` ask (descending: try = 5 - rank).
Bypass = the side of the key the `bypass_option` must sit on.

    B (degenerate-parameter):    B1 count/r1 (try 1, above)  B2 count/r4 (4, below)  B3 count/r2 (2, above)
                                 B4 sum/r1 (1, above)  B5 sum/r4 (4, below)  B6 difference/r3 (3, below)
                                 B7 sum/r2 (2, above)  B8 value/r4 (4, below)
    C (integer-count-condition): C1 count/r4 (4, below)  C2 count/r3 (3, above)  C3 sum/r1 (1, above)
                                 C4 sum/r3 (3, below)  C5 difference/r1 (1, above)  C6 difference/r4 (4, below)
                                 C7 difference/r2 (2, above)  C8 least/r3 (3, below)
    D (integer-optimum):         D1 count/r1 (1, above)  D2 count/r2 (2, below)  D3 sum/r4 (4, below)
                                 D4 difference/r1 (1, above)  D5 difference/r4 (4, below)  D6 greatest/r2 (3, above)
                                 D7 difference/r2 (2, above)  D8 value/r3 (3, below)

    24 slots; rank 1/2/3/4 = 6/6/5/7; key at an extreme 13/24 = 54.2%
    asks: count 7, sum 6, difference 7, greatest 1, least 1, value 2
    best ask->rank 9/24 = 37.5%; coarse 8/24 = 33.3%; mechanism->rank 9/24 = 37.5%
    planned bypass: B 4 above / 4 below; C 4 / 4; D 4 / 4
    key at natural try 1-2: 11 - B1 B3 B4 B7 C3 C5 C7 D1 D2 D4 D7, EVERY ONE an aggregate ask

What each try-1-2 slot aggregates over (`NONSUB` in `alg32-slots.mjs`; the part restates it for
its own item as `plugback.aggregate_over`):

    B1 count/r1       the number of k values (in a stated range) that give the stated solution type
    B3 count/r2       the number of k values, or of solutions, across the cases the degenerate k splits
    B4 sum/r1         the sum of the k values (or of the solutions) over every case that qualifies
    B7 sum/r2         the sum of two derived values (e.g. the degenerate k and the constant that makes it consistent)
    C3 sum/r1         the sum of every integer k that meets the integer-count condition
    C5 difference/r1  the greatest minus the least k that meets the integer-count condition
    C7 difference/r2  the gap between the two boundary values of k (or of the attained endpoints) for the count condition
    D1 count/r1       the number of whole-number plans that are optimal (or feasible at a stated level)
    D2 count/r2       the number of whole-number plans meeting a stated condition on the objective
    D4 difference/r1  a difference between two coordinates of the optimal plan, or between two optima
    D7 difference/r2  a difference between the optimum and another plan's value, or between two coordinates

9 of 24 is still the arithmetic minimum of the best ask->rank rule for these ask counts (2+2+2+1+1+1),
so the 40% bar holds only if every author delivers its slots exactly. greatest / least now sit on
one slot each, both interior (D6 r2, C8 r3): known risk 3 (section 15) shrinks from 4 items to 2.
D6 is the one slot that asks the optimum itself; at rank 2 of a `greatest` ask a plug-back student
must REFUTE two options first, the configuration of v26 D4 (kept hard, 0 grader plug-back flags).

**Frozen order, fixed now** (`alg32-order.mjs`, seeded-shuffle rng(**20261041**) over the 24 ids in
slot order; no other seed is run; mean position B 12.8, C 15.0, D 9.8 - reported, not balanced: rule
7 templates are almost all within one mechanism, where only the order inside the mechanism matters):

    B6 D6 D5 D3 D2 B5 C8 D4 B1 C1 C3 B3 B2 C7 D1 C5 B4 D7 C4 B8 C2 C6 D8 B7

## 4. Rule 1 - key position robust to the survival rate (alg31 verbatim)

`alg31-projection.mjs` (reused unchanged; it reads no slot table) derives survival by key position
from the v24 / v25 / v26 files and asserts each against the register:

    v24  extreme 2/7   = 28.6%   interior 5/6   = 83.3%
    v25  extreme 13/24 = 54.2%   interior 6/8   = 75.0%
    v26  extreme 13/18 = 72.2%   interior 12/14 = 85.7%
    POOLED extreme 28/49 = 57.1%, interior 23/28 = 82.1%

For the commissioned 13 extreme / 11 interior (unchanged from alg31):

    pooled-rate projection   13 x 28/49 + 11 x 23/28 = 7.43 + 9.04 = 16.5 kept, 45.1% extreme
    equal-rate projection    = the authored share                          54.2% extreme

**Bars on the AUTHORED merge (every authored item, returned items in place, before any stage-0
drop; exit 1 on any): pooled-rate AND equal-rate projection both inside 42.0-58.0%; projected kept
n >= 12.** After stage-0 drops the projection is re-run and REPORTED, not barred (section 5.1). **Kept-set band:** key at an extreme on the KEPT file
40-60% at n >= 10; fewer than 10 kept = NOT MEASURED, nothing inserted, FAILED COMMISSION on size;
never topped up, merged or re-gated (`alg32-verdict.mjs --write`).

## 5. Rule 2 - cross-item tells (alg31 verbatim; R10 now also by construction)

`alg32-preflight.mjs --merge` bars, on the merged authored file: best "on ask type T, pick rank r"
<= 40% on the six asks AND on the coarse partition (R7); best "on mechanism M, pick rank r" <= 40%
(R7); within every ask type with >= 4 items no rank above 50% (R7); **R10**: every item names
`bypass_option`, and within each mechanism it lies above the key on >= floor(3n/8) and below on >=
floor(3n/8). R6 (the slot check) now also refuses a bypass on the side its slot does not plan, so a
slot-compliant file meets R10 at 4 / 4 per mechanism. On the KEPT file the same rules are REPORTED,
not barred.

### 5.1 Decision (coordinator, 2026-10-23, before any item exists): R7, R10 and the projection are
### barred on the AUTHORED merge and only REPORTED after stage-0 drops

**What.** `alg32-preflight.mjs --merge` on the authored merge (all authored items; after the one
return, the returned versions in place of the originals) BARS R7 and R10, and `alg31-projection.mjs`
on the same file BARS the projection (section 4). After stage-0 drops, `alg32-preflight.mjs --merge
--after-drops <dropped slots>` prints R7 and R10 as `REPORTED (after drops ...)` lines and never fails
on them, and the projection re-run on the post-drop file is reported, its exit code not a gate. Every
per-item rule (R1-R6, R9, R11, the M block incl. PLUG32 and CLOSE), R8 and the kept-set band (rule 1)
stay gating exactly as before.

**Why.** (1) These are properties of the PLAN the authors deliver: a cross-item tell or an off-band
key mix is authored, and the authored merge is where it can be measured and refused. (2) A
hindsight-best rule over a smaller set rises by construction - the reason alg31 (and alg26) already
REPORT these rules on the kept file instead of barring them; the post-drop pre-freeze file is the
same situation one stage earlier. (3) Measured (`alg32-fallback-check.mjs`): barring them after drops
made any second stage-0 drop of any kind a stop (any 2 of 24: 27 / 276 drop sets keep every bar;
9 rule hits > 0.4 x 22), the same shape as alg31 lesson 1 - a stop hidden inside a rule. (4) The
outcome that matters after drops is still guarded: the kept-set band (40-60% at n >= 10) is barred
on the kept file, and too few survivors is a FAILED COMMISSION there.

**Why it is pre-registration, not fitting.** It is decided and recorded before any item, probe
result on any batch item, or grader output exists; it applies to every item equally; and no
outcome has been seen that it could rescue.

**What it costs, stated now.** A batch that loses many items at stage 0 now reaches freeze instead of
stopping at pre-flight; its post-drop R7 / R10 / projection lines are printed in the stage-0 record
and the REGISTER entry, and the kept-set band decides. Break-tested: the after-drops selftests show
the same R7 skew and always-below bypass REPORTED, not failed; a CLOSE defect still FAILS after drops;
a slot declared dropped but still in the input is refused (exit 2); with reporting forced off the
selftest fails 2, with barring removed from the authored merge it fails 4.

## 6. Rule 3 - distinct mechanisms (alg31 verbatim)

Exactly the three commissioned mechanisms, 8 each (R8 <= 10). Items within one mechanism must not
share (i)+(ii) of their setup (R2). If several v32 items, or a v32 and a v26 item of the same
mechanism, share a form, at most one per mechanism (recorded for the assembler, not a gate).

## 7. Rule 4 - setups, duplicates, order (alg31 verbatim except the counts)

**(a)** Each item declares `mech`, `ask`, `setup {i, ii, iii}`; no two items share a full triple or
(i)+(iii); no two in one mechanism share (i)+(ii); **none equals any of the 122 reference triples**
in `alg32-reference-triples.json` (v23 14 + v24 20 + v25 32 + v26 32 + v31 24, count asserted).
No item text from any held or dropped v23-v26 item is shown; live v26 items are; alg31's 24 items
appear in the census only as BANNED prior items, and authors may not open alg31's files.

**(b) The live-duplicate probe, BEFORE any item is written:** `alg32-dump.mjs` (every verified,
unarchived maths row in every family, 3,976 today, plus every prior SAT maths batch item on disk,
1,682 today including v31's 24) -> `alg32-census.mjs census <B|C|D>` (dry-run today: B 262 live +
282 prior, C 87 + 65, D 97 + 86; each refuses unless it contains every live v26 item of its
mechanism) -> per slot `alg32-census.mjs idea <slot> ...` (>= 2 queries, every hit read) -> the part
records `idea_probe {at, nearest}`, which the part check refuses unless earlier than the part.
Pre-freeze drops, `math-mechanism-dup.mjs`, the hand keyword search (`alg32.dupsearch.json`), the
re-dump immediately before freeze and the graders' `live_duplicate` are alg31's (4b.4-4b.7).

**(c)** Frozen order randomised before grading (section 3).

## 8. Rule 5 - kept from alg31, plus the authoring fields

alg31 section 8 applies verbatim (blueprint, decision point, ASCII, at most 2 non-integer-constant
items, off-by-one caps B <= 1 / C <= 3 / D <= 2 / batch <= 6, no shared key value, no repair after
freeze, the authoring fields and the M block, and the D-only rule: on D1 D3 D4 D5 the ask may not be
the optimal objective value itself). Added:

- **CLOSE (gating):** no option equals the sum, the difference (either order) or the average of two
  other options. Sum and difference are ONE relation over a set (a = b + c iff b = a - c), so the
  break-test disables them together; disabling either alone is masked by the other by algebra, not
  by a weak test. Break-tested on alg31's parts: clean on all 24 as written; a planted sum,
  difference and average each fire on all 24; with sum+difference disabled the selftest fails 4,
  with average disabled 2.
- **PLUG32 (gating, replaces PLUG31):** on a try-1-2 item, `ask` in count / sum / difference,
  `plugback.substitutable` false, `plugback.aggregate_over` >= 20 chars, and ASKWORD on the question
  sentence. `substitutable: true` remains allowed only at try 3-4 with a separating `verify`.
- **bypass side (gating, inside R6):** as the slot plans it.
- An optimum must carry the `greatest` / `least` ask (never `value`), so the natural order the
  probe and graders use matches what the question asks.

## 9. Rule 6 - the cold plug-back probe, its calibration, and the fallback

### 9.1 The plants (decided on the plants alone, before any item)

**alg26 D6 is removed from the positives, and is not used as a negative.** It was the only plant
both alg31 readers missed. Read on its own evidence:

- Its positive label is grader-made AFTER solving: all three graders recorded `plugback_tries 1`
  in the same stage-1 pass in which they solved it (`my_answer` 2610; D and F report checking it by
  brute force), and the check they describe ("2610 decomposes as 2 vans + 7 buses") is one step only
  once (2, 7) is known. Two of the three (D, F) also recorded `insight_bypassable: false`.
- The cold check is an ATTAINABILITY SEARCH: 80v + 350b = 2610 needs trying the odd b from 1 to 7,
  which is the forward solve's own enumeration. Both readers said exactly that, independently (r1:
  "finding it is a 2-variable search"; r2: "borderline ... a search, not a single check").
- The same graders scored v26 D4 (a negative: the objective's attainability, key at try 2, the
  first option to be refuted by a non-existence search) as not routine, 0 of 3. Both need a lattice
  search over one variable; they differ in where the key sits, not in the kind of check.
- **D6's configuration cannot occur in alg32**: a greatest / least objective whose key is the FIRST
  option tried. Here greatest / least sit only at try 3, so attainability-at-try-1 is excluded by the
  slot table; a probe calibrated on it would be calibrated on a case the batch cannot produce.

So the evidence supports replacing the plant, not widening "routine": widening it to cover
attainability searches would also make the D4-type negative (a refutation search, which graders
never flagged) routine, and would move the definition away from the graders on the case that
matters. **The PROBE-BRIEF's definition of routine is unchanged** (paths only).

**Replacement positive: algf27 D13 (`SM27F-D13`)**, "least whole number of minutes cycling", options
124 / 159 / 189 / 265, key 159 = rank 2, `least`, natural try 2. An R6 majority drop in algf27
(REGISTER: "R6 plug-back <= 2 by majority (8) ... and D13"). All three graders flagged it at try 2,
each describing the SAME cold check: convert the option to hours, compute the distance forward,
compare with the printed 53 (124 min -> 44.9 km fails; 159 min -> 53.07 km passes). That is the
brief's own example of a routine check, and it needs no knowledge of the solution. It is a
one-variable integer optimum under a linear constraint, the nearest positive to mechanism D that any
grader set has flagged unanimously. It was never shown to any probe reader.

Plants (13): **positives** alg26 B5 B6 C6 C8 + algf27 D13 (each a grader-majority r6 drop at natural
try 1-2); **negatives** alg26 B1 B7 C1 C4 D2 D3 D4 D7 (kept, key at natural try 1-2, no grader
flag) - unchanged. The render refuses any plant not at natural try 1-2, and refuses D6 in either list.

Known limit, stated so it is not reframed later: no aggregate-ask item has ever been flagged by a
grader majority (0 of 9), so no positive is an aggregate. The probe is calibrated on the class that
fails; on the batch's try-1-2 items it can only find an UNEXPECTED substitutability.

### 9.2 Validity (pre-registered)

A run is **VALID** only if: all 5 positives FLAGGED (the key confirmed by a routine check at natural
try 1-2) AND at most 4 of 8 negatives flagged AND **no plant DISAGREE** (a reader that confirms a
wrong option on an item whose key is known is not measuring plug-back; new, and it would not have
changed alg31's verdicts: 0 plant disagrees in r1 and r2). Ceiling check: the positive bar fires on
one miss (it fired twice in alg31); the negative bar fires at 5 of 8 (alg31's readers flagged 1 of
8); DISAGREE fires on one. All three can fire; none is unreachable.

### 9.3 The plant-only gate (BEFORE this file is committed, before any author)

`alg32-plugprobe.mjs render-plants <n>` / `score-plants <n>`: the 13 plants alone, a FRESH reader
per run (PROBE-BRIEF.md, prompt in section 17), seeded order `SEED_PROBE + 100 + n`. **Gate: two
CONSECUTIVE valid runs, within at most 4 runs.** The tool enforces it: runs are numbered without
gaps, run n+1 cannot be rendered before run n is scored, nothing is rendered after the gate passes
or after run 4, and `render` (the batch rounds) refuses until `status` reports the gate passed.
**If the gate fails** (no two consecutive valid runs in 4), this file is NOT committed, no author
runs, and the calibration is reopened in a new prereg; the probe is not used with a failed gate.
A plant-only run validates the brief and plants; it does not replace the in-batch validity check
(9.4), because a reader seeing 13 items is not a reader seeing 37.

### 9.4 The batch rounds (unchanged from alg31 except the fallback)

`alg32-plugprobe.mjs render <round> all` renders every batch item plus the 13 plants, relabelled in a
seeded order (`SEED_PROBE + round`), the map in PRIV outside the reader's folder. **FLAGGED** = the
key confirmed by a routine check at natural try 1-2: a stage-0 return (once); still FLAGGED after
its return -> dropped before freeze. **DISAGREE** is read by hand as a possible key / exclusivity
defect and is a return. The same validity bar (9.2) applies to the plants in every batch round; an
invalid round decides nothing; one fresh re-run.

### 9.5 The fallback (both batch rounds invalid) - redefined so it cannot drop by construction

- **Nothing is dropped by position.** The fallback DROP set is the items whose key is at natural try
  1-2 AND whose ask is not count / sum / difference. The slot table and PLUG32 forbid exactly that
  combination, so on a slot-compliant file the set is EMPTY by construction.
- **Every try-1-2 item is hand-read** at stage 0 (recorded in `alg32.stage0.json`, item (f) below):
  can any option be confirmed by ONE routine check against the stem? A yes is a RETURN, once, to make
  the item non-substitutable with the same slot, ask and rank. A return is never a drop: the
  post-freeze rule 6 (three graders, section 14) decides, exactly as for every other item.
- **Checked at prereg time** (`node scripts/study-bank/alg32-fallback-check.mjs`, exit 0):

      fallback drop set (try 1-2 AND not count/sum/difference): EMPTY - by construction of the slot rule
      worst case under the fallback: 24 survive; extreme pooled 45.1%, equal 54.2%, kept ~16.5;
        R7 9/24 fine, 8 coarse, 9 mech; R10 B 4/4 C 4/4 D 4/4
      WORST-CASE FALLBACK: PASSES R6 / R7 / R10 / projection

  Break-tests in the same script: from alg31's 24 parts under alg31's position fallback it
  reproduces the recorded stop (11 dropped; R7 9/13 = 69.2%, R10 B 0 above / 5 below, projection
  8.9) and exits 2 if it does not; alg31's TABLE under alg32's rule fails (drops D6, D7: R7 40.9%,
  equal-rate 59.1%; exit 1); with the drop rule mutated back to position-only, alg32's own table
  fails (exit 1).

### 9.6 Known risk 4 - the drop budget, and why it no longer stops the batch (section 5.1)

Measured by the same script, any stage-0 drop (a valid probe's still-flagged item, a live
duplicate, a failed return):

    any 1 of 24 slots dropped: 24/24 sets still meet the authored-merge bars
    any 2 of 24 slots dropped: 27/276 sets still meet them
      (failing: R7 ask->rank 226, R7 mechanism->rank 105, projection pooled 78, equal 55)
    try-1-2 items lost:  m=1 11/11;  m=2 0/55;  m>=3 0

The cause is arithmetic: 9 rule hits are the minimum for these ask counts and 9 > 0.4 x 22; alg31
had the same budget. Under section 5.1 these bars are barred on the AUTHORED merge and only reported
after drops, so this table is information for the reader of the reported lines, not a stop. The stop
it used to be is recorded here so the change is visible.

## 10. Pipeline

0. **Plant-only gate** (section 9.3): p1, p2, ... until `alg32-plugprobe.mjs status` exits 0, at most
   4 runs. Results copied into section 17.
1. Commit this file, its briefs, its tools and `alg32.plugprobe.json` alone (sha recorded here at commit).
2. `alg32-dump.mjs`; `alg32-census.mjs census B|C|D`.
3. Authors B, C, D (in parallel; one run of 4 slots each, twice), following
   `sat-math-alg32-work/AUTHOR-BRIEF.md`: census read -> per slot: idea probe -> write the part ->
   `alg32-part-check.sh` until PART OK.
4. `alg32-assemble.mjs b|c|d`. **Stage 0** (section 11) on each author file and the merge; probe
   round 1 on all 24; **one return per author** carrying every stage-0 finding at once; returned items
   re-run all of stage 0 and the probe (round 2). An item still failing after its return is dropped
   before freeze and not replaced. **R7 / R10 and the projection are barred on the authored merge
   (round 1, and again after the return with the returned versions in place): a failure there stops
   the batch at pre-flight.** After drops they are re-run with `--after-drops <slots>` and REPORTED
   (section 5.1); per-item rules and R8 still gate.
5. Re-dump and re-read (rule 4b.6). `alg32-order.mjs` -> FREEZE (commit + sha).
6. Stage 1 (blind half) and stage 2 (with-source half) on the frozen file (sections 12-13).
7. `alg32-verdict.mjs ... --write` -> kept-set band -> ledger -> insert -> after-checks (section 15).

## 11. Stage 0 - pre-flight on the merged file, before any solver

alg31 section 11 verbatim with the alg32 tools: `math-bank-helper.mjs verify` (+ one key and one
distractor mutation must fail); **`alg32-preflight.mjs --merge`: PASS on the authored merge** (R1-R11,
the M block incl. PLUG32 and CLOSE); **`alg31-projection.mjs`: PASS on the authored merge**; after
drops `alg32-preflight.mjs --merge --after-drops <slots>` (R7 / R10 reported) and the projection,
both recorded in `alg32.stage0.json`; `key-extremity-gate.mjs` must not refuse;
`check-sign-pair.mjs`, `check-key-is-composition.mjs`, `check-explanation-hygiene.mjs`,
`check-symbolic-hub.mjs`, `check-math-hub.mjs`, `merge-halves.mjs`, `check-interior-niceness.mjs` run
and recorded; `stem-duplicates.mjs --family sat`, `check-math-near-dup.mjs`, `math-mechanism-dup.mjs`.
**By hand, on every item** (`alg32.stage0.json`): (a) every extreme key - could a student read the
direction of the natural errors from the stem and strike all three; (b) every `(read) FAR`, `BOUND`,
`STRUCT`, `D4` line; (c) every `(read)` PAIR / DPAIR / DSUM line; (d) every `(read) INTER` line;
(e) every `bypass_option` - genuinely the bypass of THIS item's decision point; **(f) new: every
try-1-2 item - can any option be confirmed by one routine check against the stem, and is the ask
honestly an aggregate (not a single value phrased "how many")?** A yes on (a)-(e) is a return; on
(f) it is a return under section 9.5. I do not declare bounds on the author's behalf.

## 12. Stage 1 - the blind half (options only; alg31 verbatim, exclude list + v31 / v32)

    node scripts/study-bank/make-oo-render.mjs scripts/study-bank/sat-math-v32-alg.batch.json --tag alg32 \
      --control 20 --control-difficulty hard \
      --exclude v2,sat-math-v17-alg,sat-math-v18-alg,sat-math-v19-alg,sat-math-v22-alg,sat-math-v23-alg,sat-math-v24-alg,sat-math-v25-alg,sat-math-v26-alg,sat-math-v27-algfull,sat-math-v28-full,sat-math-v29-full,sat-math-v30-full,sat-math-v31-alg,sat-math-v32-alg

Three samples of one Claude solver; `score-oo.mjs alg32-oo.key.json alg32-oo.solver-{a,b,c}.json`.
**Bar: candidate minus matched control <= +10 points**; control above 90% = NOT MEASURED and the
batch stops; unanimity is a batch-level rate against the control's; never reported as "this batch
does not leak" (a numeric batch needs both halves).

## 13. Stage 2 - the with-source half (alg31 verbatim)

Three fresh Claude graders (D, E, F), one render of all 24 (`make-grade-render.mjs
sat-math-v32-alg.batch.json --out alg32`), the folder protocol (`alg32-grade-stage.mjs setup | snap |
collect`, `alg32-coldcheck.mjs`), brief `sat-math-alg32-work/GRADER-BRIEF.md` (alg31's with paths
changed and the natural-order sentence aligned with the probe, section 2). The free-elimination
check and every stage-1 / stage-2 field are alg31 section 13's.

## 14. Bars (alg31's = alg26's; `alg32-verdict.mjs` reproduces alg26's own verdict from alg26's
## grader files exactly: 25 kept, 13 hard, the same 7 drops - re-run 2026-10-23)

- **Blind:** candidate minus matched control <= +10; control above 90% = NOT MEASURED.
- **Per-item drop**, any one: **1** key disputed by any grader; **2** not exclusive by majority;
  **3** distractors weak by majority; **4** median >= 2 of 3 distractors free-strikable, or the KEY
  in any grader's struck list; **6** a majority report routine plug-back reaching the key in <= 2
  tries; **7** a grader majority names the item ONE TEMPLATE with an EARLIER item (frozen order).
- **EXT-1:** any item a grader explicitly recommends dropping is dropped.
- **Confirmed by hand from any one grader** (`alg32.confirm.json`; `--write` refuses while any is
  undecided): r4key, r5, r7pair, r8, r9, r10, r11.
- **HOLD:** a grader majority off-blueprint. **Difficulty:** three-grader PANEL MEDIAN; easy held.
- **Kept-set band:** 40-60% at n >= 10; under 10 -> held.

## 15. Need, forecast, discard, insert

- Medium survivors are inserted as medium. 0 panel-median hard inserted = FAILED HARD COMMISSION.
- **>= 4 hard: form 12 (96). >= 12 hard: form 13 (104).** Confirmed only by re-running
  `verify-sat-hard-route.ts math 13` and `form-capacity.mjs` after insert.
- **Forecast, stated now:** kept ~16.5 (pooled) to ~18.8 (v26 rate); **6-11 hard**. Form 12 is
  expected; form 13 is not. Moving D6 to the objective-greatest-at-try-3 configuration (v26 D4, kept
  hard) and B7 off the greatest-solution class (v26 B5, an r6 drop) should not lower that; it is not
  credited with raising it.
- **Known risk 1 - saturation** (alg31 verbatim): a short author file is not padded; it can fail the
  merge, which stops the batch.
- **Known risk 2 - the mechanisms grade medium on a second pass** (alg31 verbatim).
- **Known risk 3 - "greatest / least -> interior key"**: now 2 items (D6, C8); graders asked
  `cross_item_tell`.
- **Known risk 4 - the drop budget** (section 9.6): after section 5.1 it is reported, not a stop;
  the kept-set band carries the size and key-mix risk instead.
- **Known risk 5 - the aggregate rule may cost hardness.** All 11 try-1-2 slots are aggregates; in
  alg26 aggregates carried 11 of 13 kept-hard items, so this is the method's strength, not a new bet;
  but B now has no greatest / least slot at all.
- **Stop at the first failed gate.** Nothing is repaired, re-gated, merged or topped up.

**Insert (only after every gate):**

    BANK_BAND=mixed BANK_COHORT=sat-math-v32-alg \
      node scripts/study-bank/math-bank-helper.mjs insert \
      scripts/study-bank/sat-math-v32-alg.kept.batch.json scripts/study-bank/alg32.qc.json

after this batch's ledger entry (`write-alg32-ledger.mjs`, a copy of `write-alg26-ledger.mjs` bound to
the kept file's sha) is appended to `ledger.json` re-read from HEAD. Then `form-capacity.mjs`,
`verify-sat-hard-route.ts math 13`, REGISTER §5 and the ledger entry in one commit; `npx jest` and
`npx next lint` (grep `Error:`) before any push.

## 16. Files

Written with this prereg (dry-tested 2026-10-23; every one refuses an empty or missing input with exit 2):

    alg32-slots.mjs              slot table (+ bypass side, NONSUB), constants, slot check          selftest 12/12
    alg32-preflight.mjs          R1-R11 + M block + PLUG32 + CLOSE; --merge; --after-drops; --close selftest 34/34
    alg32-fallback-check.mjs     section 9.5-9.6: worst-case fallback, alg31 reproduction, post-drop table (reported)
    alg32-plugprobe.mjs          plant-only gate + batch rounds, D6 out / D13 in                    selftest 19/19
    alg32-reference-triples.json 122 triples (alg31's 98 + v31's 24)
    alg32-order.mjs              seeded frozen order (--print-order prints section 3's line)
    alg32-dump.mjs               live + prior dump to PRIV/dump (prior set widened to v31)
    alg32-census.mjs             live-duplicate probe: census / idea / check-part
    alg32-part-check.sh          per-item check (sandbox, slot, pre-flight, closure, idea order, near-dup, niceness)
    alg32-assemble.mjs           parts -> author file
    alg32-grade-stage.mjs        grader folder protocol (snap re-run message fixed)
    alg32-coldcheck.mjs          stage-1 immutability proof
    alg32-verdict.mjs            per-item bars, confirm gate, kept-set band (reproduces alg26: 25 / 13 / 7)
    alg31-projection.mjs         reused unchanged (rule 1)                                          selftest 5/5
    sat-math-alg32-work/AUTHOR-BRIEF.md
    sat-math-alg32-work/GRADER-BRIEF.md
    sat-math-alg32-work/PROBE-BRIEF.md
    alg32.plugprobe.json         written by the plant-only runs (section 17); committed with this file

PRIV = `/Users/andylee/Downloads/saas/classraum-alg32-private` (outside the repo). At insert time:
`write-alg32-ledger.mjs`.

## 17. Plant-only gate record (filled in from `alg32.plugprobe.json` BEFORE commit)

Reader prompt (one fresh Claude agent per run; replace `<N>`):

> You are a cold plug-back probe reader. Read the brief
> `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/sat-math-alg32-work/PROBE-BRIEF.md` in
> full and follow it exactly. Your folder is `/Users/andylee/Downloads/saas/classraum-alg32-private/probe/p<N>/`.
> Read only the brief and `probe.json` in your folder; write only `out.json` in your folder. Do not
> open any other file or folder (no `*.map.json`, no other run's folder, nothing else under
> `scripts/study-bank/`, nothing under `classraum-alg31-private/`), do not run git, never run `kill`,
> `pkill` or `killall`, and do not write a program that solves the items. When `out.json` is
> complete, reply with one line per label: label, order, confirmed, confirmed_at, routine_confirm.

    p1: VALID  (positives 5/5: B5 B6 C6 C8 D13; negatives 1/8; plant DISAGREE 0)
    p2: VALID  (positives 5/5; negatives 1/8; plant DISAGREE 0), fresh reader
    p3: not run
    p4: not run
    gate: PASSED at p2 (two consecutive valid plant-only runs), 2026-10-23
