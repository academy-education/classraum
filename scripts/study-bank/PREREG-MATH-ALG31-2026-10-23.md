# sat-math-v31-alg — pre-registration (SAT Math, Algebra, authored HARD)

Written 2026-10-23 before any item exists. **Not yet committed**: it must be committed alone, with
the tools it names, before any author runs, and nothing in it changes after an item is seen
(anything decided later goes to REGISTER §5 as a deviation). Ids `SM31L-<slot>`, cohort
`sat-math-v31-alg`, tag `alg31`. **Agents approved 2026-10-23** under the owner's standing
instruction of that day (use as many agents as possible; the earlier 3-at-once limit no longer
applies): 3 authors, 1-2 probe runs, 3 solver samples, 3 graders. Claude only, no GPT model anywhere.

The number follows the `sat-math-vNN` cohort sequence: `PREREG-ALG26` / `sat-math-v26-alg` is the
method being rerun, and v27-v30 are taken (`algf27`, `mf28`, `mf29`, `mf30`).

## 1. Why this batch (measured 2026-10-23, read-only)

`node scripts/study-bank/form-capacity.mjs` (1,666 live SAT Math rows):

    SAT Math     36 full forms (Algebra 548 / 15 binds)
    SAT Math     11 hard forms   capped by Algebra - 92 hard, needs ~8 per form

`npx tsx scripts/study-bank/verify-sat-hard-route.ts math 13` (the real assembler, exposures shimmed):
forms 1-11 ALL-HARD; **form 12 = 18 hard + 4 medium (Algebra 4 hard + 4 medium)**; **form 13 =
14 hard + 8 medium (Algebra 0 hard + 8 medium)**; every other domain already 8 / 3 / 3 hard; zero
repeats; 11 of 13 all-hard.

    +4  panel-median-HARD Algebra   ->  hard route 12 forms   (96)
    +12                             ->  13 forms              (104)

Live hard Algebra by cohort: v2 33, math-v3 15, **sat-math-v26-alg 13**, math-v4 5, sat-math-v12 4,
v27-algfull 3, v22-alg 3, v28-full 2, v30-full 2, v23-alg 2, sat-form24 2, sat-alg-hard-v1 2, and
seven cohorts with 1. v26 is the largest source of hard Algebra any session has produced.

## 2. Which method, and why

Hard Algebra yield of every recent SAT Algebra pipeline (REGISTER entries):

| batch | authored | authored hard | banked HARD (panel median, inserted) | per authored-hard item |
|---|---|---|---|---|
| alg22 | 14 | 14 | 3 | 21% |
| alg23 | 14 | 14 | 2 (+2 held off-blueprint) | 14% |
| alg24 | 20 | 20 | 0 inserted (4 hard held: kept band 28.6%) | 0% |
| alg25 | 32 | 32 | 0 inserted (12 hard held: kept band 68.4%) | 0% |
| **alg26** | **32** | **32** | **13** (25 inserted) | **40.6%** |
| algf27 (full form) | 52 | mixed | 3 | - |
| mf28 (full form) | 60 | Algebra 5 | 2 | 40% of 5 |
| mf29 (full form) | 75 | Algebra 7 | 1 | 14% |
| mf30 (full form) | 65 | Algebra 8 | 2 | 25% |

**alg26 (`PREREG-ALG26-2026-10-08.md`, REGISTER A87) is rerun.** It is the only pipeline that has
produced hard Algebra at volume, and the full-form series that followed banks 1-2 hard Algebra per
batch by design (mostly medium commissions). Within alg26, three of its four mechanisms carried the
batch: **degenerate-parameter 3 hard of 8 authored, integer-count-condition 4 of 8, integer-optimum
4 of 8 = 11 of 24 (45.8%)**; interval-bound gave 2 of 8 (it graded mostly medium). This batch is
those three mechanisms, 8 items each, three authors.

What changes from alg26, each with the measurement that asks for it (everything not listed is
alg26's, restated in full below):

| change | why (measured) |
|---|---|
| 3 mechanisms x 8 = 24; interval-bound dropped | interval-bound 2/7 kept hard (A87); 24 is the size asked |
| slot matrix rebuilt: greatest / least asks only at an interior rank; no greatest / least / value slot at natural plug-back try 1 | A87: 5 of 7 gate drops were greatest / least / value slots (B5 B6 C6 C8 D6, rule 6); the two at try 1 (B5, B6) both died, the two at try 4 (C7, D5) both survived |
| survival pool for rule 1 adds v26 | v26's own rates (extreme 13/18, interior 12/14) are the method's own measurement |
| reference triples 66 -> 98 (+ v26's 32) | v26's setups are now live (25) or dropped (7); R2 refuses them exactly |
| **live-duplicate probe BEFORE writing** (rule 4b) | ISEE s18 (2026-10-22): every scripted duplicate check said 0 and ~44 of 60 items were live duplicates on a hand read; here the 25 live v26 items sit in exactly these mechanisms |
| **cold plug-back probe at stage 0** (rule 6) | mf30 (A93): Algebra r6 drops 6 (mf29) -> 0 with the probe; alg26's main drop class was r6 (5 of 7) |
| bypass-direction rule R10 | A87 grader F: on five two-branch items the single-branch distractor sat BELOW the key every time - a within-mechanism direction tell R7 cannot see |
| post-alg26 stage-0 checks imported (PAIR/RUN, DIR D1-D3 + counter_error, DPAIR, DSUM, FAR, KEYPRINT, INTER) | algf27 (A90): counter_error lifted extreme-key survival 25.0% -> 56.7%; A89-A92 drop classes, each with its own break-tested checker |
| mf30's grader folder protocol + coldcheck | A90 process lesson 2: an algf27 grader edited its stage-1 file after opening the key |
| one part file per item | A90 / A91: long single-file runs stalled; part files made every relaunch resumable |

**Not adopted, with the reason:**
- algf27's D4 ("no greatest / least / sum-of-all / possible-values ask on an extreme key"): it was
  written for full-form MEDIUM items (A88 extreme survival 25.0%). alg26 put sum / count /
  difference asks on extreme keys and they survived 13 of 18. The slot matrix keeps greatest /
  least off the extremes instead; D4 lines are printed `(read)`.
- mf30's STRUCT as a refusal: its regex ("maximum", "minimum", "for every") cannot be satisfied by an
  integer-optimum item at an extreme slot without gaming the wording. It runs `(read)`; a missing
  `structure_check` on an extreme key IS gating, and the D brief forbids the objective value itself
  as the ask on an extreme slot (rule 5).
- the composition-matched control (`make-mf30-oo`): this batch is one band (hard), which is what
  `make-oo-render --control-difficulty hard` matches. alg26's command is kept.

## 3. Commission

**24 items authored as hard, three Claude authors, one mechanism each** (separate subagents, each
writing only its own part files; no author sees another's parts; the three may run at once;
completion judged by files on disk). Author letters keep alg26's mechanism letters.

| author | file | mechanism (`mech`) | decision point that must not be bypassable (alg26 verbatim) |
|---|---|---|---|
| B | `sat-math-v31-alg-b.batch.json` | `degenerate-parameter`: a linear equation in x, or a system of two linear equations in x and y, with a constant k such that ONE value of k makes the x-coefficient (or the determinant) vanish | the degenerate k must be treated as its own case (no solution vs every x vs one solution); the generic formula silently fails there |
| C | `sat-math-v31-alg-c.batch.json` | `integer-count-condition`: a one-variable linear inequality or compound inequality with a constant k, and a condition on how many integers (or positive integers) satisfy it | the boundary k values: whether each endpoint is attained, strict vs non-strict, and (where k multiplies x) the direction flip |
| D | `sat-math-v31-alg-d.batch.json` | `integer-optimum`: whole-number quantities x, y under two or three linear constraints, optimise a linear objective (or count / compare optimal plans) | the best LATTICE point is not the rounded corner of the real feasible region |

### Slots (fixed here; `node scripts/study-bank/alg31-slots.mjs` regenerates this table)

Key rank = the key's position by VALUE among the four options (1 smallest .. 4 largest). Natural
plug-back try = the rank, ascending, except on a `greatest` ask (descending: try = 5 - rank).

    B (degenerate-parameter):    B1 count/r1 (try 1)  B2 count/r4 (4)  B3 count/r2 (2)  B4 sum/r1 (1)
                                 B5 sum/r4 (4)  B6 difference/r3 (3)  B7 greatest/r2 (3)  B8 value/r4 (4)
    C (integer-count-condition): C1 count/r4 (4)  C2 count/r3 (3)  C3 sum/r1 (1)  C4 sum/r3 (3)
                                 C5 difference/r1 (1)  C6 difference/r4 (4)  C7 difference/r2 (2)  C8 least/r3 (3)
    D (integer-optimum):         D1 count/r1 (1)  D2 count/r2 (2)  D3 sum/r4 (4)  D4 difference/r1 (1)
                                 D5 difference/r4 (4)  D6 greatest/r3 (2)  D7 least/r2 (2)  D8 value/r3 (3)

    24 slots; rank 1/2/3/4 = 6/5/6/7; key at an extreme 13/24 = 54.2%
    asks: count 7, sum 5, difference 6, greatest 2, least 2, value 2
    best ask->rank 9/24 = 37.5%; coarse 9/24 = 37.5%; mechanism->rank 8/24 = 33.3%
    key at natural try 1-2 (the cold probe decides): 11 - B1 B3 B4 C3 C5 C7 D1 D2 D4 D6 D7

9 of 24 is the arithmetic minimum of the best ask->rank rule for these ask counts (and of the coarse
one, since greatest / least are confined to ranks 2-3), so the 40% bar holds only if every author
delivers its slots exactly. count / sum / difference carry the extremes because they carried alg26's
hardness (11 of 13 kept-hard items) and are not per-option checkable the way greatest / least are.

**Frozen order, fixed now** (`alg31-order.mjs`, seeded-shuffle rng(**20261031**) over the 24 ids in
slot order; no other seed is run; mean position B 12.9, C 12.6, D 12.0):

    D4 C4 D5 B7 C8 B2 C7 D1 C1 B1 C5 D2 B4 B3 D6 B6 D8 B8 D7 C6 D3 B5 C2 C3

## 4. Rule 1 - key position robust to the survival rate

`alg31-projection.mjs` derives survival by key position from the files and asserts each against the
register (never typed in):

    v24  extreme 2/7   = 28.6%   interior 5/6   = 83.3%
    v25  extreme 13/24 = 54.2%   interior 6/8   = 75.0%
    v26  extreme 13/18 = 72.2%   interior 12/14 = 85.7%
    POOLED extreme 28/49 = 57.1%, interior 23/28 = 82.1%

For the commissioned 13 extreme / 11 interior:

    pooled-rate projection   13 x 28/49 + 11 x 23/28 = 7.43 + 9.04 = 16.5 kept, 45.1% extreme
    equal-rate projection    = the authored share                          54.2% extreme
    (reported) v26-only 18.8 kept, 49.9%;  v25-only 15.3, 46.0%;  v24-only 12.9, 28.8%

**Bars on the merged pre-freeze file (exit 1 on any): pooled-rate AND equal-rate projection both
inside 42.0-58.0%; projected kept n >= 12.** 13 is the only integer that passes: 12 extreme gives a
pooled 41.0% (fails low), 14 gives an equal 58.3% (fails high) - both in the selftest. Break-test:
v25's frozen file FAILS (pooled 67.6%, equal 75.0%); the commissioned-matrix fixture PASSES.

**The kept-set band (alg26, unchanged):** key at an extreme on the KEPT file must be **40-60%**,
else nothing is inserted and nothing is moved. **Fewer than 10 kept: the band is NOT MEASURED,
nothing is inserted**, the kept file is HELD, and the batch is a FAILED COMMISSION on size. It is
not topped up, merged with another batch, or re-gated. (`alg31-verdict.mjs --write` enforces both.)

**Known risk (named so it cannot be reframed):** the v24-only rate (A84's 2.9x differential) would
put the kept set near 28.8% and fail LOW. v25 and v26 did not repeat it.

## 5. Rule 2 - cross-item tells (ask type x key rank, and direction)

`alg31-preflight.mjs --merge` bars, on the merged authored file:
- the best rule "on ask type T, pick rank r" <= 40% of the batch, on the six ask types AND on the
  coarse partition count+difference / sum / greatest+least / value (R7);
- the best rule "on mechanism M, pick rank r" <= 40% (R7);
- within every ask type with >= 4 items, no rank above 50% (R7);
- **R10 (new):** every item names `bypass_option` - the distractor a student gets by skipping the
  mechanism's decision point - and within each mechanism that option lies ABOVE the key on >= 3 of
  8 items and BELOW on >= 3 of 8.

On the KEPT file the same rules and "pick an end" are REPORTED, not barred (a hindsight-best rule
over a smaller set rises by construction). Authors also get alg26's direction rule as a writing
instruction: the slot rank decides which way the named error paths point; a one-sign or
forgot-the-case error must overshoot on some items and undershoot on others.

## 6. Rule 3 - distinct mechanisms

Exactly the three commissioned mechanisms, 8 each (R8: <= 10 per mechanism). Items within one
mechanism must not share (i)+(ii) of their setup (R2), because v25's rule-7 drops were pairs that
differed only in the asked aggregate. **If several v31 items, or a v31 and a v26 item of the same
mechanism, share a form, at most one per mechanism** (A87 lesson; recorded for the assembler, not
a gate here).

## 7. Rule 4 - setups, duplicates, order

**(a) Setup triples.** Each item declares `mech`, `ask`, `setup {i, ii, iii}`: (i) where k / the
constraint sits, (ii) the condition, (iii) the asked quantity. No two items share a full triple or
(i)+(iii); no two in one mechanism share (i)+(ii); **none equals any of the 98 reference triples**
in `alg31-reference-triples.json` (v23 14 + v24 20 + v25 32 + v26 32, count asserted by the
pre-flight). Every author receives the full list of triples as setups to avoid. **No item text from
any held or dropped v23-v26 item is shown**; live v26 items are shown, because they are live.

**(b) The live-duplicate probe - new, BEFORE any item is written** (`alg31-census.mjs`):
1. `alg31-dump.mjs` pulls every verified, unarchived maths row in every family (3,976 today:
   sat 1,666, act 986, isee 709, ssat 615) plus every prior SAT maths batch item on disk
   (sat-math-v12..v30, sat-alg/adv/geo/psda; 1,658 today) into `PRIV/dump/`, outside the repo.
   Refuses a short or slipped read.
2. **Mechanism census.** `alg31-census.mjs census <B|C|D>` writes every live row and prior batch
   item matching the mechanism's fixed signature to `WORK/census-<X>.txt`. Today: B 262 live
   (SAT Algebra 124) + 273 prior; C 87 live (31) + 55 prior; D 97 live (42) + 71 prior. **It refuses
   unless the census contains every live v26 item of that mechanism** (break-tested: dropping one
   alternation from B's signature makes it refuse on v26 B7). **The author reads its whole LIVE
   section before writing anything.**
3. **Idea probe.** Before writing each item, the author runs `alg31-census.mjs idea <slot> --setup
   "i | ii | iii" --q ... --q ...` (>= 2 queries, every hit printed in full; a query with > 40 hits
   does not count as read) and records `idea_probe {at, nearest}` in the part.
   `alg31-part-check.sh` refuses a part whose probe is not a logged attempt or is not EARLIER than the
   part file (a process guard: it proves the order, not the quality of the read).
4. Drop pre-freeze: an exact stem duplicate (`stem-duplicates.mjs --family sat`); an option
   multiset equal to a live Algebra row, or prompt Jaccard >= 0.60 read by hand
   (`check-math-near-dup.mjs`); and, by hand read, an item that is the **same mechanism with the
   same setup** as a live maths row, a prior batch item or another item here - the same item with
   different numbers. Sharing a mechanism's insight is not a duplicate: the commission shares it by
   design; the setup triple distinguishes items.
5. `math-mechanism-dup.mjs 24 <merged>` over all live maths rows: every FLAG and the top 5 NEAR per
   item read by hand. My own hand keyword search per item (`mf30-kw.mjs PRIV/dump "<q>"`), recorded
   in `alg31.dupsearch.json`.
6. **Re-dump immediately before freeze** (other sessions insert maths concurrently): every row added
   since the authoring dump is read against all 24 items, and math-mechanism-dup re-runs.
7. With-source graders also name any item they recognise as a standard published or prep item
   (`live_duplicate`), confirmed by hand (r11).

**(c) Frozen order randomised before grading** (section 3). Rule 7's "earlier item" is earlier in
that order.

## 8. Rule 5 - kept from alg26, plus the authoring fields

- **Blueprint.** SAT Algebra only: linear equations in one or two variables, linear functions,
  systems of two linear equations in two variables, linear inequalities in one or two variables.
  At most two variables (x, y); **no three-unknown systems** (no third equation or "lies on"
  condition on a two-equation system with a constant). One named constant k, except a
  `degenerate-parameter` item may carry a second constant c that the question asks for (v22's live
  hard shape). No k^2 / quadratic step in k, no quadratic in x, no absolute value, no divisibility
  beyond "is an integer". Each grader states `on_blueprint` + reason; a grader majority
  off-blueprint HOLDS the item.
- **The decision point** (section 3) must not be bypassable, and the bypass of it is a named
  distractor (`bypass_option`, rule 2).
- ASCII hyphen-minus only (R3); `≤` `≥` allowed. Four numeric options, distinct values.
- At most 2 non-integer-constant items, declared (`nonint_constant`, `integer_k_answer`), not all
  offering the integer-k answer (R4).
- Off-by-one next to the key (key +- 1, or a declared endpoint / inclusion option adjacent in
  value): B <= 1, C <= 3, D <= 2, batch <= 6 (R5).
- No two items share a key value (R9). **No repair after freeze; nothing re-enters the gate.**
- **New authoring fields** (checked at stage 0, stripped before any reader by `alg31-order.mjs`):
  `distractor_meta` (error_kind, error_sense, direction, stem_predicts_direction=false, why) with
  >= 2 kinds, >= 1 of sign_slip / inverted_rate / wrong_variable / wrong_operation / wrong_base,
  <= 1 omission / partial_answer (DIR D1-D2); on an extreme key `counter_error` (a natural error whose
  JS solve lands strictly past the key and is not an option, D3), `far_distractor` + not all three
  distractors `omits` or all `adds` (FAR0-FAR2), `structure_check`, `cheap_bound_check`;
  `intermediate_check` on every item (INTER); `plugback {substitutable, verify, why}` (PLUG31);
  no option pair joined by a printed number or a multiplier one step from one (PAIR, DPAIR), no
  key and option differing by the sum of two printed numbers (DSUM), no run of three through the
  key (RUN), the key not a number printed in the stem (KEYPRINT); interior parity, no complement
  pair, no shared-denominator singling (`check-interior-niceness.mjs`).
- **D only:** on an extreme slot (D1 D3 D4 D5) the ask may not be the optimal objective value
  itself: the LP-relaxation error always overshoots a maximum and undershoots a minimum, so an
  extreme-ranked optimum is signed by the structure (mf30's STRUCT lesson, applied by construction).

## 9. Rule 6 - the cold plug-back probe (stage 0)

`alg31-plugprobe.mjs` renders **every** item (so the selection is not a signal) plus 13 plants from
sat-math-v26-alg, stem and options only, options ascending, relabelled X01.. in a seeded order
(20261032 + round), the label map held in PRIV outside the probe's folder. A fresh Claude probe
(`sat-math-alg31-work/PROBE-BRIEF.md`, MF30-PROBE-BRIEF.md with the paths changed and the
order rule tied to what the question asks) tries options in the natural order and records the
first one a ROUTINE check confirms.

- **FLAGGED** = the key confirmed by a routine check at natural try 1 or 2: a stage-0 return (once);
  still FLAGGED after its return -> dropped before freeze. **DISAGREE** (a non-key option
  confirmed) is read by hand as a possible key / exclusivity defect and is a return.
- **Valid only if** all 5 positives are flagged (alg26 B5 B6 C6 C8 D6, each an r6 majority drop)
  AND at most 4 of 8 negatives are (alg26 B1 B7 C1 C4 D2 D3 D4 D7: kept, key at natural try 1-2, no
  grader flag). The render refuses any plant not at natural try 1-2. **An invalid probe decides
  nothing**: one fresh re-run; if that is invalid too, the strict fallback - every item at natural
  try 1-2 is treated as substitutable (returned, then dropped if still at try 1-2).
- The natural order is the item's `ask`, not mf28's DESC regex, which also fires on "at most": it
  scored v26 D6 (a `least` item every grader confirmed at try 1) at try 4. **To record in REGISTER §5
  with this prereg's commit.**
- Stage-0 returns made against a same-kind instrument flatter the post-freeze r6 count; that is said
  when it is reported.

## 10. Pipeline

1. Agents approved (2026-10-23). Commit this file, its briefs and its tools alone (sha recorded here at commit).
2. `alg31-dump.mjs`; `alg31-census.mjs census B|C|D`.
3. Authors B, C, D (in parallel; one run of 4 slots each, twice, so a stall loses little),
   following `sat-math-alg31-work/AUTHOR-BRIEF.md`: census read -> per slot: idea probe -> write the
   part -> `alg31-part-check.sh` until PART OK.
4. `alg31-assemble.mjs b|c|d`. **Stage 0** (below) on each author file and the merge; probe round 1
   on all 24; **one return per author** carrying every stage-0 finding at once; returned items re-run
   all of stage 0 and the probe (round 2). An item still failing after its return is dropped before
   freeze and not replaced. If drops leave the merge failing R6 / R7 / R10 or the projection, the
   batch **stops at pre-flight**.
5. Re-dump and re-read (rule 4b.6). `alg31-order.mjs` -> FREEZE (commit + sha). No model reader
   other than the probe sees any item before freeze.
6. **Stage 1, blind half** and **stage 2, with-source half** on the frozen file (sections 12-13).
7. `alg31-verdict.mjs ... --write` -> kept-set band -> ledger -> insert -> after-checks (section 15).

## 11. Stage 0 - pre-flight on the merged file, before any solver

- `math-bank-helper.mjs verify`: every key and `distractor_solve` recomputes; one mutation (a key
  changed by hand, and one distractor body) must fail.
- **`alg31-preflight.mjs --merge`: PASS** (R1-R11 and the M block, section 8).
- **`alg31-projection.mjs`: PASS** (rule 1). `key-extremity-gate.mjs` must not refuse.
- `check-sign-pair.mjs`, `check-key-is-composition.mjs`, `check-explanation-hygiene.mjs`,
  `check-symbolic-hub.mjs`, `check-math-hub.mjs`, `merge-halves.mjs`,
  `check-interior-niceness.mjs`: run and recorded.
- `stem-duplicates.mjs --family sat`, `check-math-near-dup.mjs`, `math-mechanism-dup.mjs`: rule 4b.
- **By hand, on every item** (recorded in `alg31.stage0.json`): (a) every extreme key: could a
  student read the direction of the natural errors from the stem and strike all three without
  solving; (b) every `(read) FAR`, `BOUND`, `STRUCT`, `D4` line; (c) every `(read)` PAIR / DPAIR /
  DSUM line; (d) every `(read) INTER` line against the one-printed-relation rule; (e) every
  `bypass_option` - is it genuinely the bypass of THIS item's decision point. A yes is a return.

A mechanical failure may be fixed by the author before freeze. **I do not declare bounds on the
author's behalf, and an author's declared bounds are not a check** (2026-09-24 corollary: twenty
declared bounds killed zero options); the free-elimination verdict is the graders' (section 13).

## 12. Stage 1 - the blind half (options only)

    node scripts/study-bank/make-oo-render.mjs scripts/study-bank/sat-math-v31-alg.batch.json --tag alg31 \
      --control 20 --control-difficulty hard \
      --exclude v2,sat-math-v17-alg,sat-math-v18-alg,sat-math-v19-alg,sat-math-v22-alg,sat-math-v23-alg,sat-math-v24-alg,sat-math-v25-alg,sat-math-v26-alg,sat-math-v27-algfull,sat-math-v28-full,sat-math-v29-full,sat-math-v30-full,sat-math-v31-alg

Eligible today: **32 live hard Algebra rows** (31 all-numeric; alg26's same command drew from a
pool of the same shape). Keys dealt flat; the realised control line is printed by the script and
copied, never assumed. Three samples of one Claude solver (CLAUDE.md: "three samples", not "three
solvers"); `score-oo.mjs alg31-oo.key.json alg31-oo.solver-{a,b,c}.json`.

- **Bar: candidate minus matched control <= +10 points.** Above it, nothing is inserted.
- Unanimity is a batch-level RATE against the control's rate, never a per-item drop; pairwise
  agreement is printed.
- **Ceiling:** previous non-v2 hard Algebra controls measured 21.4%, 33.3%, 35.7%, 40.5%, 50.0%.
  If the control returns above 90% the blind half is NOT MEASURED and the batch stops. The +10 bar
  can fire anywhere below that (headroom >= 10 points at any control <= 90%).
- **Never reported as "this batch does not leak."** The options-only attack withholds the stem, so
  it cannot see a free elimination that needs one (2026-09-24: a 10-item SAT Algebra batch at +0.0
  had a no-arithmetic kill on 4 of 10 with the stem visible). A numeric batch needs both halves.

## 13. Stage 2 - the with-source half and its free-elimination check

Three fresh Claude graders (D, E, F), each over all 24 frozen items in one render
(`make-grade-render.mjs sat-math-v31-alg.batch.json --out alg31`: stem + options, no key, no
difficulty, no explanation), under the folder protocol (`alg31-grade-stage.mjs setup | snap |
collect`, `alg31-coldcheck.mjs`): the grader's private folder in PRIV holds only the cold render;
stage 1 is written, snapshotted, hashed and made read-only **before** the keyed files are released
into the folder; the coldcheck proves every stage-1 field is unchanged in stage 2 (dry-run: a
changed cold answer is caught). The three graders may run at once. The grader brief is
`sat-math-alg31-work/GRADER-BRIEF.md` (MF30-GRADER-BRIEF.md with the paths, ids and domain changed,
the free-elimination checklist written into `free_elimination`, and `blueprint_reason`,
`cross_item_tell`, `bypass_direction` added); it is committed with this file.

**The free-elimination check (stage 1, cold, stem visible), per item:**

    struck / n_struck       every option a test-wise student strikes WITHOUT solving, stem visible
    free_elimination        how each strike works. Graders are told to look for, at least: a range
                            or sign bound readable off one printed equation or constraint; an option
                            set closed under the asked operation (a "sum" ask with an option = the sum
                            of two others); an adjacency tell (the stem promises "the greatest integer
                            below" / "strictly" and the set holds exactly one adjacent pair); a
                            monotonicity kill (the option that is the no-constraint / no-denominator
                            answer); parity / integrality / divisibility the stem forces; the key
                            printed in the stem; an option illegal for the asked quantity (a count
                            that is not an integer, a value past a stated cap)
    key_identifiable_free   the key can be picked without solving
    plugback_tries / plugback_routine   natural order; a short forward computation counts
    one_sided, extreme_single_bound, single_bound_kills_all   the extreme-key direction checks
    interior_parity / interior_tell, arith_tell, option_pair_tell   the option-set tells (A89-A91)
    cross_item_tell         (alg26) is any answer guessable from a pattern ACROSS items - an
                            ask-type -> key-rank rule, or the bypass option always on one side
    bypass_direction        (new) for this item: the option the decision-point bypass produces,
                            and whether the stem tells a student which side of the key it falls
    same_template_as, live_duplicate, on_blueprint (+ reason), difficulty, my_answer, exclusive

Stage 2 adds key_ok, path_coherent, distractors_weak, drop_recommend (+ reason), difficulty_final.
Drop signals are read from the stage-2 files only.

## 14. Bars (alg26's, restated; `alg31-verdict.mjs` applies them and reproduces alg26's own verdict
## from alg26's grader files exactly: 25 kept, 13 hard, the same 7 drops)

- **Blind:** candidate minus matched control <= +10; control above 90% = NOT MEASURED.
- **Per-item drop**, any one (three graders): **1** key disputed by any grader (key_ok false after
  re-check); **2** not exclusive by majority; **3** distractors weak by majority; **4** median >= 2
  of 3 distractors free-strikable with the stem visible, or the KEY in any grader's struck list;
  **6** a majority report routine plug-back reaching the key in <= 2 tries; **7** a grader majority
  names the item ONE TEMPLATE with an EARLIER item (frozen order) - same setup and same solution
  steps with different numbers or a cosmetic change; sharing a mechanism's insight or the asked
  quantity alone is not one template.
- **EXT-1:** any item a grader explicitly recommends dropping is dropped.
- **Confirmed by hand from any one grader** (each decision with its reason in
  `alg31.confirm.json`; `--write` refuses while any is undecided): r4key key identifiable free;
  r5 a path that does not produce its value; r7pair an option-pair tell; r8 one-sided on an extreme
  key; r9 an interior / arithmetic-class tell; r10 a single bound killing all three on an extreme key;
  r11 a one-grader template or a live duplicate.
- **HOLD:** a grader majority off-blueprint.
- **Difficulty:** banked label = three-grader PANEL MEDIAN; the question verbatim: "hard" = a
  decision point that routine procedure, including Desmos, does not bypass; "medium" = careful
  multi-step procedure reaches the key. Easy is rejected (held), never relabelled.
- **Kept-set band:** 40-60% at n >= 10; under 10 -> held (rule 1).

## 15. Need, forecast, discard, insert

- Medium survivors are inserted as medium; they do not count toward the route.
- 0 panel-median hard inserted = FAILED HARD COMMISSION.
- **>= 4 hard: form 12 (96). >= 12 hard: form 13 (104).** Confirmed only by re-running
  `verify-sat-hard-route.ts math 13` and `form-capacity.mjs` after insert, never inferred.
- **Forecast, stated now:** kept ~16.5 (pooled rate) to ~18.8 (v26 rate). At alg26's per-mechanism
  hard rate (11 of 24) the batch gives ~11 hard; with the census narrowing the free setups and the
  probe removing plug-back-able items, **6-11 hard**. **Form 12 is expected; form 13 is not** - it
  needs 12 of 24, above alg26's own rate in these mechanisms.
- **Known risk 1 - saturation.** These mechanisms already have 25 live v26 items plus the v22
  canon. If the census leaves fewer than 8 clear setups for an author, that author ships fewer
  items; nothing is padded. A short author file can fail R7 / R10 at the merge, which stops the
  batch at pre-flight - the cost of not padding.
- **Known risk 2 - the new mechanisms grade medium on a second pass** (interval-bound did: 12 of 19
  hard in v25, 2 of 7 in v26). That shows as a low hard count, not a gate failure.
- **Known risk 3 - "greatest / least -> interior key".** Confining those asks to ranks 2-3 is a
  50% tell on 4 items; R7 cannot see it (it measures ranks). Graders are asked `cross_item_tell`.
- **Stop at the first failed gate:** a stage-0 batch bar after the return, a stage-1 hold or
  ceiling, or the kept-set band. Nothing is repaired, re-gated, merged or topped up.

**Insert (only after every gate):**

    BANK_BAND=mixed BANK_COHORT=sat-math-v31-alg \
      node scripts/study-bank/math-bank-helper.mjs insert \
      scripts/study-bank/sat-math-v31-alg.kept.batch.json scripts/study-bank/alg31.qc.json

after this batch's ledger entry (`write-alg31-ledger.mjs`, a copy of `write-alg26-ledger.mjs`
bound to the kept file's sha) is appended to `ledger.json` re-read from HEAD. Then
`form-capacity.mjs`, `verify-sat-hard-route.ts math 13`, REGISTER §5 and the ledger entry in one
commit; `npx jest` and `npx next lint` (grep `Error:`) before any push.

## 16. Files

Written with this prereg (dry-tested 2026-10-23, every one refuses an empty or missing input):

    alg31-slots.mjs              slot table, constants (WORK in repo, PRIV outside), slot check   selftest 10/10
    alg31-preflight.mjs          R1-R11 + imported M block; --merge for batch bars               selftest 17/17
    alg31-projection.mjs         rule 1, rates derived from the v24/v25/v26 files                selftest 5/5
    alg31-reference-triples.json 98 triples (alg26's 66 + v26's 32)
    alg31-order.mjs              seeded frozen order (--print-order prints section 3's line)
    alg31-dump.mjs               live + prior dump to PRIV/dump (prior set widened to v30)
    alg31-census.mjs             live-duplicate probe: census / idea / check-part
    alg31-part-check.sh          per-item check (sandbox, slot, pre-flight, idea order, near-dup, niceness)
    alg31-assemble.mjs           parts -> author file
    alg31-plugprobe.mjs          cold plug-back probe with alg26 plants
    alg31-grade-stage.mjs        grader folder protocol (one render, graders d e f)
    alg31-coldcheck.mjs          stage-1 immutability proof
    alg31-verdict.mjs            per-item bars, confirm gate, kept-set band, kept / held / dropped
    sat-math-alg31-work/AUTHOR-BRIEF.md
    sat-math-alg31-work/GRADER-BRIEF.md
    sat-math-alg31-work/PROBE-BRIEF.md

At insert time: `write-alg31-ledger.mjs`.

## Result (2026-10-23): STOPPED AT PRE-FLIGHT under the pre-registered strict fallback. Nothing frozen, nothing inserted.
- **Authoring:**
  - 24 parts, all PART OK.
  - The merged pre-flight first failed R9: the key values 3, 15 and 26 were each used twice. One return per author renumbered D2, D6 and C7.
  - The merged pre-flight then PASSED, with R6 extreme 54.2% and R7 37.5%. The projection PASSED: kept about 16.5.
  - Author D's own extra check found two closure violations (D1, D4) that neither part-check nor pre-flight tests. Both were fixed. B and C were clean on the same check.
- **Plug-back probe:**
  - r1: INVALID. 4 of 5 positives flagged (alg26 D6 missed); negatives 1 of 8.
  - r2 (fresh reader): INVALID for the same reason. D6 was missed again, and again 4 of 5 positives flagged and 1 of 8 negatives.
  - Both rounds flagged 0 of the 24 batch items.
- **Strict fallback (section 9):** every item at natural try 1-2 is treated as substitutable. That is 11 of 24: B1, B3, B4, C3, C5, C7, D1, D2, D4, D6, D7. They sit at try 1-2 BY SLOT, since the r1/r2 key ranks are fixed in the slot table, so no return can move them, and they drop.
- **The 13 survivors fail pre-flight:**
  - R7 ask→rank 69.2% against a 40% bar;
  - R10 degenerate-parameter bypass, 0 above and 5 below;
  - projection about 8.9 kept, against a minimum of 12.
- **Per section 10.4, the batch stops at pre-flight.**
- **Lessons (for any rerun):**
  1. **The fallback and the slot table contradict each other by construction.** The slot plan needs about 11 keys at ranks 1-2 for R6 balance, and the fallback drops every one. A strict fallback that can only be survived by violating the slot plan is a stop condition hidden inside a rule. It should have been checked at prereg time against the planned slots, the way a bar is checked against the control's ceiling (CLAUDE.md).
  2. **The probe's calibration hinges on one plant.** Both fresh readers judged alg26 D6 not routinely confirmable, while the panel had dropped it for plug-back. Either that plant does not belong in the positive set for a probe with this brief, or the brief under-reads what "routine" means for D6's type. Settle that on the plants alone, before any rerun authors a word.
  3. **Closure** (an option equal to the sum, difference or average of two others) needs to be in the part-check. Author D found it by hand.
