# MAP Science: plan (2026-10-27)

This is a plan only. No items were written, nothing was written to the database, and nothing was committed. Claude only.
Bank numbers come from `bank-state.mjs counts|sittings`, run 2026-10-27:

- map/math: 218 drawable
- map/reading: 160 drawable, 96 staged
- map/language: 0 drawable, 253 staged
- **map/science: 0 rows**
- act/science: 120 drawable, 480 staged. It has one human blind sitting, `act-science-cofounder-2026-09-18`: 6/21 = 28.6%.

**Source policy, unchanged.** No NWEA item was opened, whether live, sample or reconstructed. No Herald file or PDF was
opened, and no harvested question was used (memory `map-herald-pdfs-are-live-items`). NWEA publishes three "MAP Growth
Science for use with NGSS **sample items**" fact sheets (grades 3-5, 6-8 and 9-12). They were found in search and
**deliberately not opened**, and no author or grader may open them. Only four structural documents were read:

- the NGSS instructional-area PDF
- the general Science fact sheet
- the 2025 norms quick reference
- the 2024-25 Technical Report

Each was read with `pdftotext -layout` from NWEA's own URL.

---

## 0. Headline

| | |
|---|---|
| per form | **39 = 13 Life Science + 13 Physical Science + 13 Earth and Space Science**: standalone items, one item per group, four choices, untimed |
| bank needed for 5 complete forms | **65 per area = 195 items** (one item per group, so no passage fragments; the replay rule is the same as for Language) |
| authored to reach it | pilot 36 + batch 1 240 = **276 slots** (about 72% expected keep), then a small batch 2 on short cells |
| the gate | structural pre-flight (exact), plus with-source data-decoding graders, plus the **co-founder's blind sitting** (new stratum `map/science/multiple_choice` starts at **L0**). The blind options-only attack is **report-only**: it saturates on ACT Science (model 88.9% vs human 28.6%), and on MAP Science's knowledge items it measures the construct itself |
| co-founder load | 36 (L0 full) + 3 x 12 (L1 spots) = **72 items**, plus about 12-24 for batch 2 |
| agents | about 12 (pilot) + 27 (batch 1) + 14 (batch 2) = **about 53 runs** |
| realistic date | 5 forms about **day 6-9** from start. It is gated by two of his sittings, not by authoring |

---

## 1. What MAP Growth Science tests (public NWEA documentation only)

### 1.1 Verified

| fact | source |
|---|---|
| Science covers **grades 2-12**. Tests: **Science 2-5, Science 6-8, Science 9-12**, plus a course-specific **9-12 Life Science** test | NWEA, *MAP Growth: Instructional Areas, NGSS* (July 2023) [1]; fact sheet [2] |
| **Instructional areas (2-5, 6-8 and 9-12 identical): Life Science · Physical Science · Earth and Space Science** | [1] |
| Life sub-areas: From Molecules to Organisms: Structures and Processes · Ecosystems: Interactions, Energy, and Dynamics · Heredity: Inheritance and Variation of Traits · Biological Evolution: Unity and Diversity | [1] |
| Physical sub-areas: Matter and Its Interactions · Motion and Stability: Forces and Interactions · Energy · Waves and Their Applications in Technologies for Information Transfer | [1] |
| Earth and Space sub-areas: Earth's Place in the Universe · Earth's Systems · Earth and Human Activity | [1] |
| These are the NGSS (2013) disciplinary core ideas: LS1-LS4, PS1-PS4, ESS1-ESS3. State editions rename them (for example, Nebraska) | [1]; search result for the state PDFs (not opened) |
| "The Science, Reading, Spanish Reading, and Language Usage tests have **balanced instructional areas**, with each area having the same number of items" | Technical Report 2024-25, §3.3 [3] |
| "All test events have a maximum of **43 items**, including field test items. Math, **Science**, and Language Usage tests have **up to 3 field test items**" | [3] §3.3 |
| Number of items: MAP Growth **43**; screening assessment 20. Test time **45-55 min**, screener ~30 min, **all untimed**. Fall / winter / spring / optional summer | fact sheet [2] |
| **Composite items** (one stimulus, several parts, all parts must be right for one point) exist in **Science** | [3] Figure 4.12; MAP-RESEARCH §4 |
| Science item pool: mean p-value 0.47 (fall) to 0.50 (spring); mean point-biserial 0.30-0.31; "marginally more lower-discriminating items than other subjects" | [3] §6 item statistics |
| Marginal reliability ~0.93-0.96 by grade; CSEM ~3.3-3.6 RIT at grades 5-8 | [3] reliability tables |
| A "General Science" and a "Concepts and Processes" test existed from 2000; **Concepts and Processes was retired** | [3] §1 |

**2025 general science student achievement norms (fall, mean / SD)**, from the quick reference [4], read from the PDF itself:

| grade | 2 | 3 | 4 | **5** | **6** | **7** | **8** | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| fall mean | 176 | 187 | 195 | **201** | **204** | **207** | **210** | 212 | 213 |
| SD | 14 | 13 | 13 | **13** | **13** | **14** | **14** | 13 | 13 |

Fall-to-spring growth: grade 5 = 6, grades 6-8 = 3 RIT (SD 7-8). The search engine's summary of this same sheet gave
**204 / 209 / 212 / 216**, which is wrong; the PDF says 201 / 204 / 207 / 210. Any RIT figure must be read from the
source, never from a summary. As with Reading, a year of growth (3 RIT) is smaller than the CSEM on a difference
(~4.8). So no RIT gain is ever promised or shown (MAP-RESEARCH §10).

### 1.2 Not verified (marked so; nothing below may be quoted as an NWEA fact)

- **Per-area item count for Science.** The report says the areas are balanced and the event caps at 43 with up to 3 field-test
  items. That allows at most 40 scored items, and **13 x 3 = 39** is our inference. NWEA prints the 13 only for Reading and Language Usage.
- **Item-type mix.** The report confirms composite items in Science. Whether Science uses multiselect, drag-and-drop,
  hot text or shared-stimulus item sets is **unverified**; the report names item sets for Reading only. As for the other MAP
  subjects, we serve four-choice MC only (MAP-RESEARCH §4: six of eight formats unrepresentable).
- **How much of the pool is data/stimulus-based versus concept recall.** Not published. Our mix (§2.3) is a design choice.
- **Whether the science and engineering practices (SEPs) or crosscutting concepts are scored.** Only the DCI-based areas are
  reported. Practices are almost certainly embedded in items (NGSS is three-dimensional), but that is unverified.

### 1.3 Shape we copy, and what we do not claim

We copy a fixed 39-item, untimed, four-choice form drawn to three balanced areas, at grades 5-8 (owner decision Q1). That
spans the 2-5 test (grade 5) and the 6-8 test. We do **not** claim adaptivity, a RIT, a percentile or a grade level, exactly
as for the other three subjects (`SCALE_NOTE.map`). The 9-12 tests and the Life Science course test are out of scope.

---

## 2. Our blueprint

### 2.1 Form

`ADMISSION_BLUEPRINT.map` gains `{ key: 'science', name: 'Science', bankSection: 'science', questions: 39, minutes: 0,
choiceCount: 4, scored: true }`. `MAP_AREA_QUOTAS.science`:

| area (= `study_item_bank.domain`, NWEA's exact string) | count | passages |
|---|---|---|
| Life Science | 13 | false |
| Physical Science | 13 | false |
| Earth and Space Science | 13 | false |

**Why standalone (`passages: false`).** Each item carries its own short stimulus (scenario, table or graph) in
`item.passage` / `item.graphic`, the way Language paragraph items do (`stage-map-language-v2.mjs`). The other option was
ACT-style multi-item stimuli. Under the MAP draw, a non-passage area takes **one item per group**, so siblings would be
wasted. Drawing them by passage at 3 per stimulus would add a fragment per form (Reading needed 19 passages, not 17, for
that reason) and has no NWEA basis. Standalone needs exactly 65 per area, with no fragment loss.

The area names do not collide with any other MAP area, so `mapAreaBreakdown` (which flattens all quotas) picks them up
unchanged.

### 2.2 Grade and tier targets (authoring targets, stored in `verify_meta.map`, never shown, never validated without response data)

Per area, 65 needed: **grade 5: 17, grade 6: 16, grade 7: 16, grade 8: 16**. Authored at 22 per (area, grade) cell
(3 pilot + 19-20 batch 1), which gives about 35% margin.

Grade 5 items target the **3-5 band** DCIs (the MAP 2-5 test spans them, so 3-LS3/3-LS4 and 4-PS4 are fair at grade 5).
Grades 6-8 target **MS-** DCIs, with harder MS performance expectations at grades 7-8.

Tier within grade is low / mid / high = 30 / 40 / 30%. It is stored as `difficulty` easy / medium / hard and as
`rit_band_target`, using bands of 10 around the 2025 fall mean:

| grade | low | mid | high |
|---|---|---|---|
| 5 | 186-195 | 196-205 | 206-215 |
| 6 | 189-198 | 199-208 | 209-218 |
| 7 | 192-201 | 202-211 | 212-221 |
| 8 | 195-204 | 205-214 | 215-224 |

**Sub-area (DCI) spread per area (bank, not per form).** The assembler draws by area only, as it does for every MAP subject:

- Life: LS1 18, LS2 18, LS3 14, LS4 15
- Physical: PS1 18, PS2 17, PS3 18, PS4 12
- Earth and Space: ESS1 20, ESS2 25, ESS3 20

NWEA publishes no sub-area counts (unverified). This is our proportional-to-NGSS-PE-count choice.

### 2.3 Item kinds (our design; the NWEA mix is unverified)

| kind | share | stimulus | what it tests |
|---|---|---|---|
| **D-data** | 45% | `graphic`: table / bar / line / scatter (renderer-native types first; svg only if a figure needs it) | read, compare, interpolate, identify a trend or relationship, pick the conclusion the data support |
| **D-investigation** | 20% | experiment description in `passage` (procedure, variables, trials), optional table | independent/dependent/controlled variable, fair-test design, what a result shows, the next test to run |
| **K-model** | 35% | short scenario in `prompt`, no figure | apply a DCI to a situation (energy transfer in a food web, phase change, Moon phases, plate boundaries) |

D items (65%) are **invented-system** items. They describe a fictional but scientifically consistent experiment with invented
values ("Plant line R", "Solution Q"). That is the route `act-science-v6/v7` used to beat model recall (REGISTER
2026-09-11). It works because a science stimulus may describe a fictional experiment. K items cannot invent: they test
real knowledge, and a knowledgeable student is *supposed* to answer them without a stimulus. No blind number about K items
is evidence of a leak.

### 2.4 Count for five complete forms

| area | per form | 5 forms | grades 5/6/7/8 | authored (pilot + batch 1) |
|---|---|---|---|---|
| Life Science | 13 | **65** | 17/16/16/16 | 12 + 80 = 92 |
| Physical Science | 13 | **65** | 17/16/16/16 | 12 + 80 = 92 |
| Earth and Space Science | 13 | **65** | 17/16/16/16 | 12 + 80 = 92 |
| **total** | 39 | **195** | | **276** |

The minimum is exact for one-item-per-group areas, as `map-form-depth.ts` replays them (Language: 0 -> 65/65/65). Removing
one item from any area gives 4 forms. This must be break-tested with `--add` once the script knows science (§3, item 11).

---

## 3. Wiring checklist (map/science end to end). Do not flip the gate. MAP is still behind `COMING_SOON_EXTRA`.

| # | file | change |
|---|---|---|
| 1 | `src/lib/study/admission-tests.ts` | `ADMISSION_BLUEPRINT.map`: add the `science` block (§2.1). `bankSection` union (line 34): add `'science'`. `MAP_AREA_QUOTAS` type key `'reading' \| 'language' \| 'math'` -> add `'science'`, and the three rows. `ADMISSION_TOPIC_SLUGS`: add `'map-science': { family: 'map', key: 'science' }`. Update the header comment (line 15-25) and the `map` block comment ("Science balanced 13 x 3, inferred") |
| 2 | `src/lib/study/plans.ts` (line 384) | `map: { reading: 2, language: 2, math: 2, science: 2 }`. Without it, science silently costs the 1-credit fallback |
| 3 | `src/lib/study/assemble.ts` | Nothing functional: `drawMapAreas` is generic over `keyof typeof MAP_AREA_QUOTAS`, and `readBankItem` already carries `graphic`. Comment at 1652 only |
| 4 | `src/app/api/study/test/assemble/route.ts` | Nothing: the section key is validated against the blueprint (line 124-140) |
| 5 | `src/lib/study/section-topics.ts` | `SECTION_TOPIC.map.science = '<uuid of map-science>'` **in the same change that creates the row** (MAP-LAUNCH-PLAN §5.5 step 1: never before, or `verify-section-topics.mjs` reports a missing topic) |
| 6 | `study_topics` rows (DB, at launch only) | Child `map-science` under `test-map` (name_en "Science", name_ko "과학"). **Create it only when map/science reaches 5 clean forms.** The row is the reachability switch: if MAP flips first, Science is simply absent rather than refusing. Alternative: add `'map-science'` to `HIDDEN_SUBTOPIC_SLUGS` in `src/app/mobile/study/topic/[slug]/page.tsx:314` |
| 7 | `src/lib/study/shipped-tests.ts` | Nothing extra: the MAP flip (`SHIPPED_TEST_FAMILIES` + remove `test-map` from `COMING_SOON_EXTRA`) covers all four subjects |
| 8 | `src/app/mobile/study/page.tsx` (`TEST_THEMES.map`, ~line 328) | `stat_en: '4 subjects · untimed'`, `stat_ko: '4과목 · 시간 제한 없음'`. Only if Science is reachable at launch; otherwise change it when the row is created |
| 9 | `src/lib/study-prompt-context.ts` (EN ~261, KO ~383) | Add "Science covers life, physical, and earth and space science (NGSS), with data tables, graphs and experiment descriptions" to both language strings |
| 10 | `src/lib/study/test-result.ts` | Nothing: `mapAreaBreakdown` flattens all quotas. `familyFromTopicSlug('map-science')` already returns `'map'` |
| 11 | `scripts/study-bank/map-v2-work/map-form-depth.ts` | `type Sec` += `'science'`; loop list += `'science'`; `one` map += `life`, `phys`, `earth` -> `['science', '<area>']`; usage line. Then break-test: `--add '{"life":65,"phys":65,"earth":65}'` -> 5, and 64 in any one -> 4 |
| 12 | `scripts/study-bank/depth-snapshot.json` | Add `"map/science": { "value": 0, "source": "map-form-depth.ts <date> (0 rows)" }`. Re-measure after every release. `runout-monitor.ts` and the admin usage panel read it (`bank-usage-load.ts`) |
| 13 | Admin bank-qc / supply | `BankUsagePanel.tsx` already labels `science: 'Science'`, so it prints "MAP Science"; `bank-usage.ts` derives sections from rows and `bankRowsPerTest('map','science')` returns 39 from the blueprint. **No code change**; add test rows (item 15). `bank-qc/sweep/route.ts` `FAMILIES = ['ssat','isee']` excludes all of MAP; leave it as is (Reading and Language are not there either) |
| 14 | `src/lib/study/bank-qc.ts` `familyForTask` + `scripts/study-bank/gate.mjs` `familyFor` + `gate-contract.json` | Only if MAP science is inserted through the shared `gate.mjs` path. The family union lacks `'map'`. **Recommend the MAP stager route instead** (item 17), as Language and Reading did |
| 15 | Tests | `map-wiring.test.ts`: block keys `['reading','language','math','science']`, quota sum, "only Literary/Informational by passage" (still true), `map-science` slug, price 2. `admission-topic-slugs.test.ts` fails until the slug is added (good: every blueprint section must map to exactly one slug). `bank-usage.test.ts`: `bankRowsPerTest('map','science') === 39`. `BankUsagePanel.test.tsx`: `sectionLabel({family:'map',section:'science'}) === 'MAP Science'`. Revert each mechanism once to confirm its test fails (CLAUDE.md) |
| 16 | Locales `src/locales/{en,ko}.json` | No MAP subject keys exist (block names and theme strings are inline). Nothing required. If a MAP subject list is ever added there, include Science |
| 17 | New `scripts/study-bank/stage-map-science.mjs` | Built on `stage-map-language-v2.mjs`: `family 'map'`, `section 'science'`, `domain` = area, `subskill` = DCI, `passage_group_id null`, `graphic` kept, `verify_meta.map {area, dci, ngss_pe, grade_target, tier, rit_band_target, kind, stimulus}` + `method_id`. **`content_hash` must include the graphic JSON and the passage** (CLAUDE.md: never key on prompt; two invented-data items can share a stem). One cohort per area; refuses a cohort without its `autonomy-methods.json` entry; re-reads and checks counts |
| 18 | New `scripts/study-bank/map-v2-work/science/` | `BRIEF.md`, `slots.json`, `sci-check.mjs` (§4.4), `EXCLUSIONS-science.txt` (all 600 ACT Science stimuli + every MAP science item ever authored) |
| 19 | `autonomy-methods.json`, `cofounder-queue.json` | Method `map-sci-v1-agents+cfg-v2`; cohorts `map-science-pilot` (route `full`, 36), `map-science-v1-life/-phys/-earth` (route `spot`, 12 each). The stratum `map/science/multiple_choice` is new, so `autonomy-core` starts it at L0 automatically |
| 20 | `scripts/study-bank/form-capacity.mjs` | Has no MAP rows at all (MAP uses `map-form-depth.ts`). No change; recorded so nobody expects it there |
| 21 | `REGISTER.md` §5 | Each batch result, in the same commit as the batch |

Estimate for items 1-2, 9 and 11-15: about half a day including tests. Item 17-18 is part of the authoring work.

---

## 4. Authoring method

### 4.1 Who writes

Agents only (owner rule `no-manual-test-writing`). The co-founder (Daniel) **reviews, never edits**
(`cofounder-reviews-only`). His notes go into the brief for the *next* batch and are measured on fresh items.

### 4.2 Seeded construction per slot (the lesson from map-lu-v6 and map-math-v2)

`slots.json` fixes, per slot: area, DCI, NGSS PE, grade, tier, kind, stimulus type (table / bar / line / scatter /
procedure), **key letter** (flat deal per author and per batch), **key length rank** (1-4, flat), and **option frame**. The
author writes the slot as assigned or leaves it EMPTY; there is no swapping. `sci-check.mjs` refuses any deviation. This is
what stopped the length -> vowels -> corner tell chain in Language. The cure is assignment, not a rule-of-the-week.

**Option frame (the CLAUDE.md axis rule).** An item leaks when the options differ along the axis the stem names.
- D-data and D-investigation options sit in **one frame** and vary only a quantity, a direction or a named variable. Examples: "Trial 2 / Trial 3 / ..."; "increased / decreased / stayed the same / increased then decreased"; four values read off the figure. Every option then satisfies the stem equally, and only the data discriminate (the clean `rsw` shape).
- "Which conclusion is supported" items with four free-standing claims are the leaky shape (rhetorical synthesis v2, cross-text, PSDA prose). They are allowed in at most 1 slot in 10, and each such slot gets a with-source exclusivity check.

### 4.3 The documented tells, and the rule against each

| tell (where recorded) | rule in the brief | checked by |
|---|---|---|
| key uniquely longest (~50% on my own MC: `self-authored-key-too-long`; ISEE draft 1 13/36; ACT Reading) | key length rank seeded per slot; all-world length rules, not lengthening one distractor (that inverted the tell to 0/36) | `sci-check.mjs` rank vs slot; batch histogram vs 25% |
| absolutes vs a hedged key ("the key is the uniquely hedged option": fires on 23%) | hedges and absolutes dealt across options, never only on the key or never only on distractors | `check-absolute-tell.mjs` on the batch file (it must report the batch's own n) |
| distractor families: one concede-then-qualify among absolutes; the key's relation duplicated and reversed; four-role casts; "the only option that performs the comparison" (ACT Science v1) | in D items every option performs the same operation on the data; misconception distractors drawn from a named misconception list per DCI, never a reversed copy of the key | with-source grader question "which option family gives the key away?" |
| two options sharing a number that reconstructs the data (ACT Science v1) | numeric options from distinct misreads (wrong row, wrong axis, interpolation error, unit slip), no pair summing or differencing to another | `sci-check.mjs` pair arithmetic (exact) |
| figure hands over its own answer | the asked value is never printed as a label; trends need at least 2 reads | `check-graphic-leak.mjs`, `check-svg-viewbox.mjs` |
| rigid-brief cross-item tell (identical key prose in 8 TOEFL lectures; slot-A key 73%; ABCD permutation per set) | key wording varies by slot. Known science clichés ("to make the test fair", "repeat the trial", "more data are needed", "the variable that was changed") may key **at most 2 items per batch** and must also appear as distractors | `verify-answer-key-spread.ts` (flat and per author); a grader asked explicitly "is the answer guessable from the pattern across items?" |
| subject recall (the model knows the curve: KNO3 solubility, Hardy-Weinberg, 1/t^3; ACT Science saturation) | D items use invented systems and invented numbers; no real published dataset; no named canonical experiment | grader flag `recognised_real_data` |
| key echoes the stimulus wording (CR keys echo the line) | a key paraphrases; it never copies a 4+ word span that no distractor shares | `check-lexical-anchor.mjs` on the batch (it must refuse a default cohort) |
| concurrent authors collide (wave 7) | each author owns a disjoint DCI and grade cell plus an invented-name namespace; topics files are cross-grepped before freeze | coordinator overlap pass |
| distractor true in the world / key false in the world (with-source finds every real defect on saturated families) | every K distractor is a named misconception that is false; every D distractor is false *for these data* | two with-source graders, H-fact |

### 4.4 Gates, and what each is valid for

| stage | instrument | valid here? | decides |
|---|---|---|---|
| 0 | `sci-check.mjs` per item: fields, area/DCI/PE/grade/tier vs slot, 4 choices, key in choices, key letter and length rank vs slot, renderer-native graphic, the numbers the key cites exist in the graphic and the stated computation reproduces the key (author supplies `key_evidence` with cell refs; exact), pair arithmetic, near-duplicate vs EXCLUSIONS | **exact** | refuse until clean |
| 0b | batch checks: flat key deal (flat and per author), length-rank histogram, absolutes, lexical anchor, graphic leak, cross-author overlap | exact / structural | refuse; structural checks are pre-flight, never a clearance |
| 1 | **with-source graders, 2 per area, cold then keyed.** They decode every graphic (cells, coordinates), recompute every number, and judge exclusivity (second defensible), H-fact, free elimination with the stem, `no_source_needed` on D items, `recognised_real_data`, and grade fit (record only) | **valid: this is the gate on saturated families** (CLAUDE.md 2026-09-21: five batches where only the with-source half found defects) | key wrong -> fix once or drop; second defensible by both -> drop, by one -> one return; D item `no_source_needed` by both -> return once, then drop |
| 1b | co-founder-standard **grader v2** pre-screen (`second_defensible` validated; other checks hold-only) | valid as a screen | flagged -> one return |
| 2 | **figure-covered attack** on D items: stem + options with no graphic or procedure, 3 samples | **partly valid.** It asks whether the item needs its stimulus. On invented-data items the model cannot recall the numbers, so a hit means the item is answerable without the data. A per-item drop needs corroboration from stage 1 (`no_source_needed`); unanimity is three samples of one solver | batch-level only: candidate unanimity rate vs the control's (below) |
| 3 | **options-only attack** (`make-oo-render.mjs`), 3 samples, paired with a control of 24 live ACT Science items | **report-only.** It saturates on ACT Science (model 88.9% vs human 28.6% on the shipped bank) and measures the construct on K items | nothing. Reported as "what it measured", never as "does not leak" or "leaks" |
| 4 | **human blind sitting** (co-founder), L0 then L1 | **the gate** | release |

**Is there an options-only control on live items?** Not for MAP Science: there are 0 rows. The nearest is live ACT Science.
It has a model options-only figure (88.9%, CLAUDE.md 2026-09-21; the REGISTER records 71.3% for v1) and a human figure
(28.6%, n=21). So the control is used **only** to compare unanimity rates and cross-item patterns batch-to-batch, never as
a margin bar. Pre-registered bars must state the control's ceiling: at 88.9% there are 11 points of headroom, so a
"+10 over control" bar would be meaningless (CLAUDE.md ceiling corollary). **That is why no options-only bar is set.**

**Deciding validity for this family.** The L0 sitting runs the model options-only and figure-covered attacks on **the same
36 items** the co-founder sits blind. If the model is far above him, as on ACT Science and MAP Reading, the instrument is
recorded invalid for map/science (`bank-state.mjs sittings` becomes the reference). If they agree, stage 2 can become a
batch-level hold for the D kinds. This is decided once, pre-registered, and not re-decided afterwards.

### 4.5 Batches, prereg and expected yield

- **Pilot `map-science-pilot` (36 slots):** 3 authors, one per area, 12 each (3 per grade, all three kinds), run through every
  stage, then staged and sent to the **L0 full sitting** (all 36, `autonomy` rule: two or more flags send the next batch
  to a full sitting too). Its job: validate the brief, measure model vs human, and seed the co-founder's notes.
- **Batch 1 `map-science-v1` (240 slots):** 12 authors, one per (area x grade) cell, 20 slots each. Staged as **three cohorts
  by area**, each with an **L1 spot of 12** (double sampling on a flag).
- **Batch 2:** only the cells short of 17/16/16/16. Expected 40-60 slots, 4-6 authors.
- **Prereg** (`MAP-SCIENCE-PILOT.prereg.md`, then `-V1`), written before any item exists and committed with its tools. It
  covers: slots and seeds; the drop rules of §4.4 stage 1 verbatim; the figure-covered and options-only runs **declared
  report-only** with their controls and the ceiling stated; the L0 rule; the model-vs-human validity rule; the pre-registered
  predictions (key-length uniquely-longest <= 30%; EMPTY <= 5%; with-source drops <= 20%). Nothing changes after an item is seen.
- **Expected yield.** Authored 95% (EMPTY risk is low-tier K items at grade 5). With-source keep about 80%: ACT Science v5-v9
  pre-screens flagged 0/80 per batch, but MAP Math, whose keys are exact, kept 50-65%, and science has key-rechecks on data,
  so 80% is a middle estimate. Spots clean: about 95%. Overall **about 72% of slots -> about 199 from 276**, against 195
  needed. That is thin, so batch 2 is planned, not contingent.

---

## 5. Order of work and cost

| step | what | agents | blocked on |
|---|---|---|---|
| 0 | owner decisions §6 | 0 | **owner** |
| 1 | wiring items 1-2, 9, 11-15 behind the gate; tests break-tested; `npm run lint` (grep `Error:`) | 0 (in-session) | nothing |
| 2 | brief, `slots.json`, `sci-check.mjs` with `--selftest` (each check fails a planted defect), stager, EXCLUSIONS, pilot prereg | 0 (in-session) | nothing |
| 3 | pilot: 3 authors -> stage 0/0b -> 2 with-source graders (each reads all 36) -> grader v2 -> 3 figure-covered + 3 options-only samples -> stage `verified=false` -> draw L0 | about 12 | — |
| 4 | **L0 full sitting, 36 items** | 0 | **co-founder** |
| 5 | batch 1 authoring may start while step 4 is open; its brief takes his notes before freeze | 12 authors | — |
| 6 | batch 1 gates: 6 graders, 3 grader-v2, 3 + 3 attack samples -> stage as 3 cohorts -> 3 x 12 spots | about 15 | **co-founder** (3 spots) |
| 7 | release clean cohorts (`release-by-shape.mjs`), re-run `map-form-depth.ts`, update `depth-snapshot.json`, REGISTER §5 | 0 | — |
| 8 | batch 2 on short cells, same gates, one spot | about 14 | **co-founder** (1 spot) |
| 9 | create `map-science` topic row + `SECTION_TOPIC` entry + theme stat, together with the MAP flip or after it | 0 | **owner** (MAP launch) |

**Totals:** about 53 agent runs over 3 rounds. The co-founder sits 36 + 36 + 12 = **84 items**. His MAP pace was 0.30 min/item
and his SSAT pace 3.87, so this is roughly 0.5-5.5 hours across three sittings.

**Timeline:** day 0 steps 1-2 and pilot authoring; day 1 pilot gates and L0 draw; day 2-3 batch 1 gates while L0 closes;
day 3-6 spots; batch 2 day 5-8. **5 forms about day 6-9.** Each date assumes his sittings land within a day or two of the draw.

**Queue priority.** By Amendment 3 §3.6, sections under 5 live tests go first, fewest first. map/science would sit at 0
beside map/language (0 drawable, 253 staged, spots queued). MAP is not shipped, so both rank behind sections that have
students. See D3.

---

## 6. Open owner decisions

1. **D1 Blueprint: 39 = 13 Life + 13 Physical + 13 Earth and Space, standalone items, grades 5-8, one launch level.**
   *Recommend yes.* It matches NWEA's stated balance and the Reading/Language shape. The per-area 13 is our inference
   (unverified), and standalone items avoid passage fragments.
2. **D2 Price: 2 credits.** *Recommend 2*, the per-subject MAP price (Q7, 2026-10-20). Leaving it unlisted would charge the
   1-credit fallback.
3. **D3 Validity route and queue slot.** Options-only is report-only. A 36-item pilot goes to his **L0 full sitting** before
   anything scales, and that sitting decides whether the model attack is valid for map/science. *Recommend yes, with map/science
   queued after map/language's spots.* Language is closer to its floor, and both are unshipped.
4. **D4 Launch coupling.** Does MAP wait for Science? *Recommend no.* MAP flips when Reading, Language and Math hold 5 forms.
   Science joins the day it does, by creating its topic row (the row is the switch), so a student never meets a Science entry that refuses.

---

## Decided 2026-10-27

The owner's answers to §6, relayed by the coordinator. These supersede the recommendations above wherever they differ.

1. **D1 Blueprint: decided as recommended.** A form is 39 items = 13 Life Science + 13 Physical Science + 13 Earth and Space
   Science. Items are standalone (one per group), four-choice, untimed, grades 5-8, one launch level.
2. **D2 Price: 2 credits.** `SECTION_CREDIT_COST.map.science = 2`.
3. **D4 (launch coupling): MAP launch WAITS for Science.** This reverses the recommendation. The whole MAP flip
   (`SHIPPED_TEST_FAMILIES` + removing `test-map` from `COMING_SOON_EXTRA`) is held until **all four** subjects hold 5 clean
   forms. Consequences:
   - The `map-science` topic row is created **with** the other three MAP rows at the flip, not later (§3 item 6).
   - `TEST_THEMES.map` reads "4 subjects · untimed" at launch (§3 item 8).
   - Science is now on the critical path for every MAP subject. Math (5 forms) and Reading (3) wait on it.
4. **D3 (queue): the Science pilot goes in Daniel's queue AFTER the MAP Language runs** (`map-language-v2-writing`,
   `-grammar`, `-mechanics` spots and anything they trigger). Authoring and the machine gates may run before then. Only the
   L0 sitting waits. Report-only status for the options-only attack stands as planned (§4.4).

Pilot build: `map-v2-work/science-pilot/` and `MAP-SCIENCE-PILOT.prereg.md` (2026-10-27).

## Sources

1. NWEA, *MAP Growth: Instructional Areas, NGSS, Science* (July 12, 2023): https://www.nwea.org/uploads/NGSS_STANDARDS_2023.pdf
2. NWEA, *MAP Growth Science fact sheet*: https://www.nwea.org/resource-center/fact-sheet/48371/MAP-Growth-Science-Fact-Sheet-1.pdf/
3. NWEA/HMH, *MAP Growth Technical Report 2024-2025* (§3.3 blueprints, Fig. 4.12, §6 item statistics, reliability): https://www.nwea.org/uploads/MAP-Growth-Technical-Report-2025.pdf
4. NWEA, *2025 Norms quick reference*: https://www.nwea.org/resource-center/fact-sheet/87992/MAP-Growth-2025-norms-quick-reference_NWEA_onesheet.pdf/
5. Not opened, by policy: NWEA's "MAP Growth Science for use with NGSS sample items" fact sheets (3-5, 6-8, 9-12).
