# map-math-g58-v2, 2026-10-12: pre-registration

Written and committed **before any item exists**, with its tools (`map-math-g58-v2.mjs`, `--selftest`
75/75) and briefs (`MAP-MATH-G58-V2-AUTHOR-BRIEF.md`, `MAP-MATH-G58-V2-GRADER-BRIEF.md`). The result
goes in REGISTER §5 and the ledger entry `map-math-g58-v2-2026-10-12`, in one commit. Nothing here is
changed after an item is seen; anything decided later is recorded in REGISTER §5 as a deviation.

## Why this batch

`map-math-g58-v1` (REGISTER §5, ledger `map-math-g58-v1-2026-10-12`) inserted 11 STAGED items, all
Statistics and Probability. Operations and Algebraic Thinking, Real and Complex Number Systems and
Geometry each kept 9, under the key-extremity gate's n >= 10, and were held whole. `bank-state.mjs
counts`, 2026-10-12: map/math 0 drawable, 11 staged. A grades 5-8 MAP maths form draws 10 per area
(`MAP-LAUNCH-PLAN.md` §1), so without these three areas there is no form at all. v2 fills them.
**No Statistics and Probability is authored this round.**

v1's lessons, each turned into a rule fixed here:
1. The largest cause of drops was a cheap bound (sign, magnitude, parity, units digit, a range read off
   one printed number) that let a student strike two distractors without solving (R4: 7 items, plus
   several EXT-1). v1's brief allowed a bound to strike two as long as one distractor sat on the key's
   side. **v2 rule: no cheap bound may strike more than one distractor.**
2. Three single-grader flags were decided by hand and decided two areas. **v2: a fixed 2-of-3 rule.**
3. 15 per area left no margin above n >= 10. **v2 authors 20 per area, target >= 12 kept per area.**

## Source policy (unchanged from v1)

Authors, screeners, solvers and graders work only from their own knowledge of the public CCSS
Mathematics grade-level standards (grades 5-8) and NWEA's public instructional-area names. **No NWEA
item, live or reconstructed, is opened. The Herald / cloud.dherald.com PDFs are never opened.** No web.
Claude subagents only, at most three at once; never GPT. Every screener, solver and grader prompt names
its one render file and forbids opening anything else, the web, other repo files, git status and commit
messages. Commit messages in this run carry no authoring rule, no key and no tell.

## What is built

**60 four-choice items, all options plain numbers, no graphic**, ids `MM2-<area><NN>`, slots fixed by
`map-math-g58-v2.mjs slots` (seed 20261080) before authoring:

| area (stored `domain`) | letter | grade-5 name (`area_25`) | CCSS clusters |
|---|---|---|---|
| Operations and Algebraic Thinking | O | Operations and Algebraic Thinking | 5.OA; 6.RP 6.EE; 7.RP 7.EE; 8.EE.B-C 8.F |
| Real and Complex Number Systems | N | Number and Operations | 5.NBT 5.NF; 6.NS; 7.NS; 8.NS 8.EE.A |
| Geometry | G | Geometry (Measurement and Data for 5.MD.C volume) | 5.G 5.MD.C; 6.G; 7.G; 8.G |

- Cluster-to-area table, `domain`, `area_25`, tier meaning, target RIT bands, plain-text maths: exactly
  as v1's prereg.
- Per area **20 slots**: grades 5-8 x low / mid / high (12) plus 8 extras, the same in every area
  (5 mid, 5 high, 6 mid, 6 high, 7 low, 7 high, 8 low, 8 mid): **5 per grade per area**; tiers low 6 /
  mid 7 / high 7 per area.
- **Key position by value** per slot: 12 extreme (6 S, 6 L) and 8 interior per area (60%, as v1).

## Commission

**Three Claude authors, one per area** (O, N, G), each in two runs of 10 slots, one part file per item,
each part checked the moment it is written (`map-math-g58-v2.mjs part`): sandbox key and distractor
recompute, slot, v1's stage-0 mechanical checks (PAIR RUN DIR DPAIR PLUG DSUM FAR KEYPRINT STRUCT INTER),
interior niceness, near-duplicate search against live ISEE and SSAT maths **and against every v1 item
(j >= 0.6 refuses)**, plus the two v2 checks below. Duplicate search by hand over a fresh dump of every
live maths row plus every v1 MAP maths item (`mf30-dump.mjs` / `mf30-kw.mjs`). At most three subagents
at once. A subagent idle 15+ minutes is relaunched from the parts on disk.

### New author rule: no cheap bound strikes more than one distractor

Every item carries `bound_screen`: for each of the five kinds (sign, magnitude, parity, units digit,
range from one printed number), the cheapest bound of that kind a student can read from the stem
without solving, and the options it strikes. **The part check refuses an item missing a kind, or with
a declared bound that strikes more than one distractor or strikes the key.** It also prints `(read)
PRINTED` for every number printed in the stem with two or more distractors beyond it from the key,
which the author answers. This is the author's self-check only: an author declares the bounds it has
already satisfied (CLAUDE.md 2026-09-24), so the **screen** below is the test.

## Stage 0 (before freeze)

1. `assemble`; every part PART OK.
2. **The pre-freeze screen applies the graders' own test.** `screen-render 1` writes every assembled
   item, cold (key unmarked, seeded letters), in two halves; two fresh Claude screeners (one per half)
   fill the graders' stage-1 free-elimination fields (`my_answer`, `struck` / `n_struck`,
   `free_elimination`, `key_identifiable_free`, `plugback_tries` / `plugback_routine`, `one_sided`,
   `extreme_single_bound` / `single_bound_kills_all`, `option_pair_tell`). `screen-score 1`: an item
   **fails the screen** if `n_struck >= 2` (R4), `key_identifiable_free` (R5), `plugback_routine` (R6),
   a non-null `option_pair_tell` (R7), on an extreme key `one_sided` (R8) or `single_bound_kills_all`
   (R10), or the screener's answer is not the key; a missing or malformed row also fails.
3. **Each failing item is returned to its author once**, with the screener's named strikes. The author
   revises it (PART OK again). `screen-render 2` renders only the returned items for **one fresh
   screener** (not either pass-1 screener); `screen-score 2` writes every item that still fails to
   `stage0-drops.json`. No second return.
4. A near-duplicate of a live or v1 item found by the re-dump at freeze is dropped (no return).
5. **Freeze only if every area keeps >= 15 of 20** and every frozen item passes every gating check;
   otherwise the batch stops. Range 0-20 per area. Frozen order seeded 20261081; the freeze commit
   carries the sha; `stage0-drops.json` and the screen files are committed with it.

## Stage 1 — options-only attack (the blind half), PER AREA (as v1)

`oo`: every frozen candidate plus one matched live control per candidate: live verified four-choice
numeric ISEE maths, same MAP area by v1's ISEE keyword rule, candidate low -> ISEE easy, mid / high ->
ISEE medium, seed 20261082 (eligible pool 2026-10-12: oa easy 51 / medium 164, num 25 / 66, geo 36 /
100; each area needs at most 6 easy and 14 medium). Keys dealt flat per arm, interleaved. Three samples
of one Claude solver, options only. Renders committed before any solver.

Per area: **HOLD the area** if candidate minus control > **+10** points, or the candidate
unanimous-correct rate exceeds the control's by > **15** points. **Ceiling: the +10 bar can fire only
while the control is <= 90%**; above that the area's blind half is NOT MEASURED and the area stops.
Three samples of one solver are correlated: unanimity is an area comparison and never drops an item.
Reported as what it measured (whether the option set alone decides an item), never as "does not leak".

## Stage 2 — with-source graders, cold then keyed (as v1)

Two fresh Claude graders (D, E), each over every frozen item in two runs (halves h1 / h2), each run in a
private folder holding only the cold render. Stage 1 is written, snapshotted, hashed and made read-only
before the keyed render is released; stage 2 copies every stage-1 field unchanged (`coldcheck`). Fields
and brief: v1's (`MAP-MATH-G58-V2-GRADER-BRIEF.md`). Renders committed before any grader.

**Drop rules** (`itemVerdict`): R1 key disputed by either; R2 not exclusive or a second defensible
answer by either; R3 distractors weak by both; R4 two or more free strikes by both; R5 key identifiable
without solving by both; EXT-1 drop_recommend by either; G1 too_easy by both or too_hard by both;
OFF off-blueprint by both = held. R6 plug-back routine; R7 option-pair tell; R8 one-sided extreme key
(extreme keys only); R10 single bound kills all (extreme keys only); R11 same template as an EARLIER
item (frozen order) — **each drops when both graders flag it.**

### The single-grader rule, fixed in advance (replaces v1's hand decisions)

When exactly one of D / E raises R6, R7, R8, R10 or R11 on an item no other rule drops:
- `score` lists those items; `tiebreak` renders them cold (the letters of the with-source render) for a
  **third fresh Claude grader F**, plus, for an R11 flag, the earlier item(s) the flagging grader named.
  F is not told which items were flagged or why, fills **every stage-1 field** for every item, and never
  sees a key. The render is committed before F runs. F runs once.
- **F's own field is the third vote**: R6 `plugback_routine`, R7 a non-null `option_pair_tell`, R8
  `one_sided`, R10 `single_bound_kills_all`, R11 `same_template_as` naming one of those earlier items.
  **2 of 3 drops; 1 of 3 keeps.**
- **Tie:** a tie can arise only when F casts no vote — its row is missing, or the field is absent or
  malformed (a non-boolean, or no `same_template_as` array). That 1-1 is settled as **DROP**: dropping
  is the error that cannot put a bad item in front of a student.
- No hand decision, no `confirm.json`, no exception for a grader's stage-2 self-correction.

## The difficulty bar (as v1; the batch fails and nothing is inserted unless all three hold)

| bar | threshold | attainable range |
|---|---|---|
| D1 calibration | `too_easy` <= **15.0%** of cold judgments AND `too_hard` <= 25.0% | 0-100% each |
| D2 level | each grader's mean (grade_assigned − (target grade + tier shift)) within **[−0.5, +0.5]**, shift low −1 / mid 0 / high +1 | unbounded |
| D3 spread | each grader's mean tier rank of authored-high minus authored-low items **>= +0.5** | −4 to +4 |

Over all frozen items, from the graders' COLD grade fields. Banked `difficulty` from the two graders'
cold tier_assigned, relative to the item's grade (as v1).

## Stage 4 — kept set, per-area gates, insert (as v1)

An area is inserted only if its options-only result is PASS **and its kept set passes
`key-extremity-gate` (>= 40.0% on four choices) with >= 10 scorable items**; fewer is no measurement
and holds the area whole. Nothing moved, edited or re-authored after freeze; no override.

If the batch passes D1-D3, the kept items of passing areas are inserted **STAGED**: `verified=false`,
`family='map'`, `section='math'`, cohort `map-math-g58-v2`, `domain` = the area, `difficulty` = banked
difficulty, `topic_tag` = CCSS code, choices in the with-source render order, `verify_meta.map` =
{ area, area_25, grade_target, tier, rit_band_target, ccss, author_difficulty }. **Never
`verified=true`.** Inserter `build` then `insert --commit`, behind `gate.mjs` and the ledger entry.

## Forms projection (reported, not a gate)

`forms`: from the staged rows of cohorts `map-math-g58-v1` and `map-math-g58-v2`, per grade, per level
(Lower 5-6, Middle 7-8, `MAP-LAUNCH-PLAN.md` §3) and pooled 5-8: forms of 40 = 10 per area, the
thinnest of the four areas binding, no item reused across forms. **Stated now so it cannot be
reframed: Statistics and Probability holds 11 staged rows (grade 5: 2, 6: 3, 7: 2, 8: 4), so the
projection is at most 1 form pooled over grades 5-8 and 0 for either level, whatever v2 does.** v2 can
only move the other three areas; the binding area afterwards is Statistics and Probability.

## Forecast

v1, same machinery: 45 authored in these three areas -> 44 frozen -> 27 kept (61%). If the bound rule
and the screen remove most R4 drops (R4 by both graders on 9 of the 17 drops in these areas), survival rises to ~70%. **Forecast: 60
authored; 55 frozen (range 50-60); 38 kept (range 30-46); each area 12-14 kept (range 9-16); at least
two of three areas pass.** D1 has the most room (v1 too_easy 1.7%); the screen may push authors toward
harder-looking items, so too_hard is the difficulty bar to watch.

## Stop rule

Stop at the first failed gate: stage-0 freeze bar; per area at stage 1 (hold or ceiling) and stage 4
(extremity or n < 10); D1-D3 fail the whole batch. On a stop nothing in that scope is inserted and
nothing is repaired; the result is recorded with denominators.

## What can't be learned here

- Whether any grade label or RIT band is right (graders are not students).
- Whether the screen helps or simply moves the same strikes to a place the graders find instead: the
  screener and the graders are samples of one model, so a screen pass makes a grader pass more likely by
  correlation, not only by quality. The with-source graders still decide; a screened item that the
  graders strike is dropped exactly as in v1.
- Whether the ISEE control is the right difficulty match, and whether students choose the distractors.
  A person releases MAP items.
