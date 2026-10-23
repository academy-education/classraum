# map-v2 Math batch 1, 2026-10-24: pre-registration (all four MAP maths areas)

Written **before any reviewer output exists** (no screener, solver or grader has seen an item), with its tool
`map-math-v2.mjs` (`--selftest`: 65/65 cases at the margins; 31/31 rules, each reverted on its own, fail at least
one case). The plan is `MAP-PLAN-2026-10-23.md` §2.1 and §3.1; the model is `map-math-g58-v5.mjs` and its prereg.
Nothing here changes after an item is seen. Anything not covered here is decided by v5's prereg, unchanged.

## Inputs

221 items by 11 Claude authors, one (area, grade) cell each, `scratchpad/map-v2-math-work/<cell>/items.json`, slots
seeded in `map-v2-work/math/slots.json` (`map-v2-math-b1-slots-2026-10-24`). `assemble` re-runs `math-check.mjs`
on every file and refuses unless every item prints PART OK. Assembled 2026-10-24: **221 of 221 slots**, sha
`1f66f70e5837d693` (first 16 hex of `WORK/assembled.json`).

| area (each item's own `domain`) | letter | cells | assembled | cohort at insert |
|---|---|---|---|---|
| Operations and Algebraic Thinking | O | O56, O78 | 43 | `map-math-v2-oa` |
| Real and Complex Number Systems | N | N56, N7, N8 | 63 | `map-math-v2-num` |
| Geometry | G | G56, G78 | 51 | `map-math-v2-geo` |
| Statistics and Probability | D | D5, D6, D7, D8 | 64 | `map-math-v2-data` |

## Stages and seeds (WORK = `scratchpad/map-math-v2-work`, results in `scripts/study-bank/map-math-v2/<area>/`)

| stage | what | seed |
|---|---|---|
| 0a assemble | 11 files, math-check PART OK on all 221 | - |
| 0b screen pass 1 | every item, cold (key unmarked), seeded order, key letter A/B/C/D by position, packets of <= 40 (6 packets of 36-37), one fresh screener each | order 20261301, deal 20261302 |
| 0c return | every pass-1 fail goes back to its author ONCE (`returns/needed-<cell>.json`); each is then exactly one of revised (`returns/<id>.json`, must pass math-check), withdrawn (`withdrawn.json`), or stands (`stand.json`, with the author's reason) | - |
| 0d screen pass 2 | the REVISED items only, one fresh screener (not a pass-1 screener) | order 20261303, deal 20261304 |
| 0e freeze | post-return items minus withdrawn, math-check again, **each area frozen as its own batch** (`map-math-v2/<area>/batch.json`) | O 20261311, N 20261312, G 20261313, D 20261314 |
| 1 options-only | per area, the frozen items + a 1:1 matched live ISEE control, options only, three samples | O 20261321, N 20261322, G 20261323, D 20261324 |
| 2 with-source | per area, parts of <= 35; two graders (d, e) per part, cold then keyed | O 20261330+part, N 20261340+part, G 20261350+part, D 20261360+part |
| 3 tie-break | per area, grader F, cold only, over the one-grader flagged items (plus any earlier item an R11 flag names) | - (render order = frozen order) |

Briefs: screener, graders d/e, F and the options-only solvers use `MAP-MATH-G58-V5-GRADER-BRIEF.md` verbatim with
ids `MV2-...` and this batch's paths (`WORK/NEXT.md` carries the screener text as handed over). Claude only; no
GPT; Claude subagents with the hard bans in that brief.

## The screen (stage 0): returns once, never drops on one screener

A screener row fails if `n_struck >= 2` (S-R4), `key_identifiable_free` (S-R5), `plugback_routine` (S-R6), an
`option_pair_tell` (S-R7), on an S/L key `one_sided` (S-R8) or `single_bound_kills_all` (S-R10), the screener's
answer is not the key (S-KEY), or the row is missing or malformed (a string boolean or a null `n_struck` is
malformed, never zero). **A pass-1 fail returns to its author once. A pass-2 fail is recorded and carried to the
area's score record; it is NOT a drop** (plan §2.1: v2 dropped on one screener's strike, stricter than the
two-grader rule it imitated). The only stage-0 drop is an author's withdrawal. **No freeze minimum per area or
batch-wide**: an area that keeps any item freezes.

## Bars, per area (each area is its own batch and passes or is held on its own)

**A. Options-only (stage 1).** Three samples of one Claude solver see only the four options of each candidate and
each control item, forced choice. The control is a 1:1 live ISEE maths control matched by area and by tier
(low -> ISEE `easy`, mid/high -> ISEE `medium`, as v1-v5), 4-choice, numeric, `verified`, unarchived, read with
paging asserted against the server count.
- **Hold if candidate hit rate - control hit rate > +10.0 points.** +10.0 exactly passes.
- **Unanimity is batch level only:** hold if the candidate's unanimous-correct RATE exceeds the control's by more
  than +15.0 points. Never a per-item verdict (the three samples are one solver; CLAUDE.md 2026-09-25). No
  independence expectation, no confidence interval is quoted.
- **The control's attainable range, so the bars can fire.** The margin bar can fire only if the control hit rate
  is <= 90.0% (the candidate cannot exceed 100%); the unanimity bar only if the control's unanimous-correct rate is
  <= 85.0%. Above either, the area is **not measured** and held, never passed, and the instrument is escalated
  (CLAUDE.md 2026-09-21, ceiling twin). The record on this instrument for numeric maths: MAP v1 controls
  15.6-28.9%, v3 matched ISEE 19-39%, so both bars are expected to sit well inside the range. An empty arm is no
  measurement (held).
- **Control shortage, pre-registered substitution.** The live pool (read 2026-10-24, 709 ISEE maths rows) has
  `data/easy` 14 eligible against up to 19 low-tier Statistics items. A short cell takes ALL of its own items and the
  deficit from the **same area's next difficulty up** (easy -> medium -> hard; medium -> hard), after that cell's own
  need is met; never another area. Every substituted control row is printed and recorded (`drawnFrom` in
  `oo.key.json`). If the area's pool is still short the render refuses. Measured at the maximum need: 4 from
  `data/medium`, 1 from `data/hard`; every other cell is covered.
- What it cannot see: the options-only attack withholds the stem, so an options-only pass is reported as "the
  option set alone does not decide it", never as "the batch does not leak" (CLAUDE.md 2026-09-24). The stem-plus-
  options half is bar B.

**B. With-source graders (stage 2), cold then keyed.** Two Claude graders per part. Stage 1 cold (`grade.md`, no
key) -> `stage1.json` snapshotted, hashed, chmod 444; only then `keyed.md` is released; `coldcheck` refuses any
changed stage-1 field. Per-item rules over the two stage-2 rows:

| rule | both graders | one grader |
|---|---|---|
| R1 key disputed (`key_ok` false) | drop | **drop** (v5, kept: keys are sandbox-recomputed, so a dispute is about the stem) |
| R2 not exclusive / second defensible | drop | **tie-break F** (v5 dropped on one; plan §3.1) |
| R4 >= 2 options struck free (stem visible) | drop | **tie-break F** (v5 ignored one; plan §3.1) |
| R5 key identifiable without solving | drop | **tie-break F** (as R4) |
| R6 plug-back routine <= 2, R7 option pair, R8 one-sided extreme key (S/L), R10 single bound kills all (S/L), R11 template of an EARLIER item | drop | tie-break F |
| R3 distractors weak | drop | - |
| EXT-1 `drop_recommend` | drop | drop (v5, kept) |
| off-blueprint (`on_blueprint` false) | hold | - |
| **grade fit** (too_easy / too_hard; offset; tier spread) | **recorded, not a drop rule** | recorded |

F decides a one-grader flag 2 of 3, with no hand decision: F yes -> drop; F no -> no drop on that flag; F's row
missing or its field malformed -> tie -> drop. F is cold only and is not told which items were flagged or why.
v5's D1-D3 difficulty bars are computed and recorded per area; none gates (the model's grade judgment is
uncalibrated: MAP-PLAN §1.3 Stage A).

**C. Kept-set key extremity, per insert batch (= per area).** `key-extremity-gate.mjs` on the area's kept items:
refuse if the share of keys at the largest or smallest option is under 0.8 x the chance derived from the data (40%
at four distinct options). 40.0% exactly passes. **Below 10 scorable items it is no measurement, recorded, and not
a hold** (the plan removed v1's n >= 10 hold; the inserter's own gate measures from n >= 10). Assembled rates: O
72.1%, N 69.8%, G 70.6%, D 70.3%.

**Area verdict.** PASS iff A passes, C does not fail, and at least one item is kept; then the area's kept items are
its insert batch (`verified=true` via `math-bank-helper.mjs insert` with `BANK_FAMILY=map`, plan D2, a separate
change not made here). Otherwise HELD, with the reason. No batch-wide verdict: one area's hold does not touch
another.

## Expected, stated before any reviewer output

Plan §3.1: ~65% keep per cell -> about 28 O / 41 N / 33 G / 42 D. v5 measured 26 authored -> 20 frozen -> 12 kept;
v5 dropped at stage 0 on one screener, which this batch does not, so more items reach the graders and their
rules decide more of the loss. Risk named in advance: R2/R4/R5 by
one grader now go to F rather than being dropped or ignored, so F's file may be large; F's votes are samples of the
same model as d and e, so a 2-of-3 is correlated, and it errs toward dropping (tie -> drop).

## What can't be learned here

No grade or tier label is validated by response data. Three samples of one model are not three solvers; F is a
fourth sample of the same model. Cross-author near-duplicates are printed at assemble (5 pairs at j >= 0.6, the
top one a false positive on short equation stems) and are for the graders' `same_template_as` and the coordinator,
not a gate.
