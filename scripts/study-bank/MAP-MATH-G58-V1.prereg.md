# map-math-g58-v1, 2026-10-12: pre-registration

Written and committed **before any item exists**, with its tools and briefs. The result goes in
REGISTER §5 and the ledger entry `map-math-g58-v1-2026-10-12`, in one commit. Nothing here is
changed after an item is seen; anything decided later is recorded in REGISTER §5 as a deviation.
Plan context: `MAP-LAUNCH-PLAN.md` §3 ("Math, all 4 areas: author, agent + sandbox key recompute")
and the owner decisions of 2026-10-12 (grades 5-8 before any MAP launch; Math in scope).

## Why this batch

The bank holds no maths written below grade 8 (`bank-state.mjs counts`, 2026-10-12: map/math 0
rows, staged or drawable; MAP-RESEARCH §13). Grades 5-8 are the MAP product and do not exist.
This is the first MAP maths batch, and it may insert STAGED rows only.

## Source policy

Authors, solvers and graders work only from their own knowledge of the public CCSS Mathematics
grade-level standards (grades 5-8) and NWEA's public instructional-area names (MAP-RESEARCH §5).
**No NWEA item, live or reconstructed, is opened. The Herald / cloud.dherald.com PDFs are never
opened** (MAP-RESEARCH §9). No web. Claude subagents only, at most three at once; never GPT.
Every solver and grader prompt names its one render file (in a private folder for graders) and
forbids opening anything else. Commit messages in this run carry no authoring rule and no tell.

## What is built

**60 four-choice items, all options plain numbers**, ids `MMG-<area><NN>`, slots fixed by
`map-math-g58-v1.mjs slots` (seed 20261070) before authoring:

| area (stored `domain`) | letter | grade-5 name (`area_25`) | CCSS clusters |
|---|---|---|---|
| Operations and Algebraic Thinking | O | Operations and Algebraic Thinking | 5.OA; 6.RP 6.EE; 7.RP 7.EE; 8.EE.B-C 8.F |
| Real and Complex Number Systems | N | Number and Operations | 5.NBT 5.NF; 6.NS; 7.NS; 8.NS 8.EE.A |
| Statistics and Probability | D | Measurement and Data | 5.MD.A-B; 6.SP; 7.SP; 8.SP |
| Geometry | G | Geometry (Measurement and Data for 5.MD.C volume) | 5.G 5.MD.C; 6.G; 7.G; 8.G |

- `domain` is the **Math 6+** area name for every grade, so a level's form draws four areas, as
  `MAP-LAUNCH-PLAN.md` §1-§2 assume. Grade-5 rows also carry `verify_meta.map.area_25`, the Math 2-5
  name. **The cluster-to-area table is our judgement** (NWEA's sub-strand lists were not recorded in
  MAP-RESEARCH): RP and F under Operations and Algebraic Thinking, 8.EE.A (exponents, roots,
  scientific notation) under Number Systems, 5.MD.C volume under Geometry.
- Per area 15 slots: grades 5-8 x tiers low / mid / high (12) plus three extra slots (O: 6 high,
  7 high, 8 mid; N: 5 high, 7 mid, 8 high; D: 5 mid, 6 high, 8 high; G: 5 high, 6 mid, 7 high), so
  each grade has 15 and tiers are low 16 / mid 20 / high 24 — tilted up because MAP pilots ran easy.
- **Tier** is difficulty within the grade: low = most students in that grade answer correctly, mid
  = about half, high = only stronger students. Author tier maps to `difficulty` easy / medium / hard.
- **Target RIT band** per grade x tier, 10-point bands around the 2025 fall norm means (MAP-RESEARCH
  §3: grade 5 206.2, grade 8 222.1; 6 and 7 interpolated): grade 5 190-199 / 200-209 / 210-219;
  grades 6 and 7 200-209 / 210-219 / 220-229; grade 8 210-219 / 220-229 / 230-239. **A target
  label, never a measurement**; no student sees it (MAP-LAUNCH-PLAN Q3).
- **Key position by value** per slot: 9 extreme (S/L) and 6 interior per area (60% extreme;
  extreme keys drop more at the graders, A93).
- Plain-text maths; no figure (geometry is described in words; MAP-LAUNCH-PLAN asks plain text unless
  the sandbox supports figures, and 80.6% of maths figures were decorative). Data items may carry one
  `table` graphic, the shape the runner renders.

The item schema and authoring rules are mf30's (`MF30-AUTHOR-BRIEF.md`, PREREG-MF30 / A93) adapted
to grades 5-8, in `MAP-MATH-G58-V1-AUTHOR-BRIEF.md`.

## Commission

**Two Claude authors on disjoint strands**: author **N** writes O and N (30 slots), author **G**
writes D and G (30). Each author works in runs of 7-8 slots, one part file per item, each part
checked the moment it is written (`map-math-g58-v1.mjs part`: sandbox key and distractor recompute,
slot, stage-0 checks, near-duplicate search against live ISEE and SSAT maths, interior niceness).
Duplicate search by hand over a dump of every live maths row (`mf30-dump.mjs` / `mf30-kw.mjs`).
At most two authors at once. A subagent idle 15+ minutes (transcript mtime) is relaunched from the
parts on disk.

## Stage 0 (before freeze)

`map-math-g58-v1.mjs assemble`, then I read every `(read)` line (PLUG, FAR, BOUND, STRUCT, INTER,
PAIR soft) and every item. One return per author; an item still failing after its return is
dropped before freeze (`stage0-drops.json`). **Freeze only if every area keeps >= 12 of 15** and
every frozen item passes every gating check; otherwise the batch stops. Range 0-15 per area; the
bar sits inside it. Frozen order seeded 20261071; the freeze commit carries the sha.

## Stage 1 — options-only attack (the blind half), PER AREA

`map-math-g58-v1.mjs oo`: every frozen candidate plus **one matched live control per candidate**:
live verified four-choice numeric **ISEE maths** (the lowest-level live maths), same MAP area by the
ISEE keyword rule of `map-reband-count.mjs`, candidate tier low -> ISEE easy, mid / high -> ISEE
medium, drawn with seed 20261072. Keys dealt flat per arm, interleaved, renumbered. Three samples of
one Claude solver answer the whole render (options only; the stem is withheld). Renders committed
before any solver.

Per area: **HOLD the area** if candidate minus control > **+10** points, or the candidate
unanimous-correct rate exceeds the control's by > **15** points. **Ceiling: the +10 bar can fire
only while the control is <= 90%**; above that the area's blind half is NOT MEASURED and the area
stops (attainable candidate range 0-100%). Three samples of one solver are correlated, so unanimity
is a batch / area comparison and never drops an item. An options-only result is reported as what it
measured — whether the option SET alone decides the item — and never as "does not leak".

## Stage 2 — with-source graders, cold then keyed (decides per item)

Two fresh Claude graders (D, E), each over every frozen item in two runs (halves h1 / h2 of the
frozen order), each run in a private folder outside the repo holding only the cold render. Stage 1
(cold, key unmarked) is written, snapshotted, hashed and made read-only before the keyed render
(key, worked solution, every distractor's stated path) is released; stage 2 copies every stage-1
field unchanged (`coldcheck`). Fields: mf30's free-elimination fields (my_answer, exclusive,
second_defensible, struck / n_struck, key_identifiable_free, plugback_tries / plugback_routine,
error_directions, one_sided, extreme_single_bound / single_bound_kills_all, interior parity,
arith_tell, option_pair_tell, same_template_as, live_duplicate, area_judged / on_blueprint) plus
**grade fit**: `grade_fit` (fits / too_easy / too_hard for the stated grade AND tier),
`grade_assigned` (the grade at which this would be a typical, mid-tier item), `tier_assigned` for
the stated grade (below_grade / low / mid / high / above_grade). Brief: `MAP-MATH-G58-V1-GRADER-BRIEF.md`.

**Drop rules** (`itemVerdict`, written before any grader runs):
R1 key disputed by either; R2 not exclusive or a second defensible answer by either; R3 distractors
weak by both; R4 two or more free strikes by both; R5 key identifiable without solving by both;
R6 plug-back routine in <= 2 tries; R8 one-sided extreme key; R10 a single cheap bound kills all
three (extreme key); R11 same template as an EARLIER item (frozen order) — each of R6 / R8 / R10 /
R11 drops on both graders and is **decided by me by hand, recorded in `confirm.json`, on one**;
R7 an option-pair tell named by either, decided by hand; EXT-1 drop_recommend by either;
**G1 too_easy by both, or too_hard by both** (a grade mislabel is dropped, never relabelled);
OFF off-blueprint by both = held. Drop signals are read from the stage-2 files only.

## The difficulty bar (pre-registered; the known MAP weakness is items running easy)

Over **all frozen items**, from the graders' COLD (stage-1) grade fields, **the batch fails and
nothing is inserted** unless all three hold (`difficultyBars`, break-tested at each margin):

| bar | threshold | attainable range | reason |
|---|---|---|---|
| D1 calibration | `too_easy` <= **15.0%** of judgments AND `too_hard` <= 25.0% | 0-100% each | map-lu-mech-v1 failed at 31% too easy (15/48 vs bar 8/48 = 16.7%); the bar is a little stricter |
| D2 level | each grader's mean (grade_assigned − (target grade + tier shift)) within **[−0.5, +0.5]**, shift low −1 / mid 0 / high +1 | unbounded both sides | a low item for grade g is a typical item for grade g−1; a high item for g+1 |
| D3 spread | each grader's mean tier rank (below 0, low 1, mid 2, high 3, above 4) of authored-high items minus authored-low items **>= +0.5** | −4 to +4 | difficulty must actually be spread within each grade, not all mid |

Graders are not response data: these bars test our labels against two model readers, never a RIT
(MAP-RESEARCH §10). Banked `difficulty` = the two graders' cold tier_assigned (below/low = 1, mid 2,
high/above 3), mean <= 1.5 easy, >= 2.5 hard, else medium — relative to the item's grade, which is
stored in `verify_meta.map.grade_target`.

## Stage 4 — kept set, per-area gates, insert

An area is **inserted only if** its options-only result is PASS (not held, not above the ceiling)
**and its kept set passes `key-extremity-gate`** (>= 0.8 x derived chance, i.e. >= 40.0% on four
choices) **with >= 10 scorable items** — fewer is no measurement, not a pass, and holds the area
whole. Nothing is moved, edited or re-authored to pass a gate after freeze; no override.

If the batch passes D1-D3, the kept items of passing areas are inserted **STAGED**:
`verified=false`, `family='map'`, `section='math'`, cohort `map-math-g58-v1`, `domain` = the area,
`difficulty` = banked difficulty, `topic_tag` = CCSS code, choices in the with-source render order,
`verify_meta.map` = { area, area_25, grade_target, tier, rit_band_target, ccss, author_difficulty }.
**Never `verified=true`.** MAP is not a shipped family; a person releases (MAP-LAUNCH-PLAN Q6), with
the decision rule fixed before that sitting is drawn. Inserter: `map-math-g58-v1.mjs build` then
`insert --commit`, behind `gate.mjs` (section math resolves to `mc_stem_source`: shape, withsource,
nosource, tells) and the ledger entry.

## Forecast, stated so the outcome cannot be reframed

mf30 (same item machinery): 76.9% of authored inserted; per domain 10-15 of 15. **Forecast: 60
authored, 57 frozen (range 52-60), 44 kept (range 36-50), every area 10-12 kept; at least one area
at risk of falling under 10.** Difficulty: unknown for this machinery at grades 5-8; the pilots'
pattern (MAP-RESEARCH §14-17, map-lu-mech-v1) predicts too_easy near the bar, so **D1 is the bar
most likely to fail.**

## Stop rule

Stop at the first failed gate: stage-0 freeze bar; then per area at stage 1 (hold or ceiling) and
stage 4 (extremity or n < 10); D1-D3 fail the whole batch. On a stop nothing in that scope is
inserted and nothing is repaired; the result is recorded with denominators.

## What can't be learned here

- Whether any grade label or RIT band is right (graders are not students).
- Whether the options-only control is the right difficulty match: ISEE is an upper-level test, so
  the control's items are harder in content; options-only reads only the option set, so the mismatch
  matters less than it would for a with-source measure, but it is not zero.
- Whether students choose the distractors. A person releases MAP items.
