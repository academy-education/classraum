# MAP Growth — launch plan

Written 2026-10-12. Builds on `MAP-RESEARCH.md` (§2-§18) and the five MAP
pilots. Every bank number here was measured on the live bank that day. The
re-banding counts come from `node scripts/study-bank/map-reband-count.mjs`
(read-only, paged, selftest 8/8). The drawable counts come from
`bank-state.mjs counts`. Nothing in this file is built yet. The first
authoring batch it calls for, `map-lu-mech-v1`, has its result in §7.

**Source policy, unchanged.** No NWEA item is used, live or reconstructed.
The Herald / cloud.dherald.com PDFs are harvested live NWEA items
(MAP-RESEARCH §9): they are never used to author, validate, calibrate, style
or anchor anything. The citable spec is NWEA's public CCSS instructional-area
PDF and the published norms. We use them for structure only.

---

## 0. Headline

**What can launch first:** an **Upper level** (about grades 9-11 content)
MAP-style practice product in **Language Usage and Math**. It is built almost
entirely from items we already own, re-banded:
- Language Usage: 18 forms
- Math: 24 forms
- Reading: only 3 forms, so it is not part of the first launch

Each form is fixed, untimed and four-option. It reports raw score by
instructional area. It shows **no RIT, no percentile and no band**.

**What blocks it, in order:**

1. **Spelling (and, below grade 7, Capitalization) is 0 in the bank.** A
   Language Usage form without them misrepresents the Mechanics area
   (MAP-RESEARCH §12). They are the cheapest items to author.
   `map-lu-mech-v1` (§7) got every key right but failed on difficulty, and
   it showed that Capitalization cannot be targeted above about grade 6.
2. **The code wiring.** About 17 per-family switches, the same set SSAT/ISEE
   needed (§5). There is also one design question with no precedent: a
   re-banded item is a SAT/ACT row (§5.3).
3. **Owner decisions in §6.** The ones that gate building are Q1, Q2, Q5
   and Q8.
4. **A person releases every staged MAP item.** MAP has no human sitting.
   The re-banded rows already carry their SAT/ACT gate history, so they
   are not blocked by this. Newly authored MAP rows are.

**What is NOT launchable and why:**
- **Grades 5-8 at every subject.** The bank holds no material written below
  grade 8 (§13). The only way in is new items:
  - Mechanics: agents
  - Math: agents with the sandbox key check
  - Reading comprehension: the human-edit draft route the sibling agent runs
  - Vocabulary: a person (two agent rules failed, §17)
- **Reading at any level** until Literary Text exists. It is 40 items, so
  3 forms by division and fewer with whole passages.

---

## 1. What a minimum honest MAP product is

| decision | recommendation | why |
|---|---|---|
| Sections | **Language Usage, Math** first; Reading when Literary Text exists | §2 counts. Korean demand is Reading **and** LU (§9, §11). Math is the cheapest to make honest: options-only discriminates there, and keys are recomputed. |
| Levels | Label forms by **content level**: Upper (gr 9-11), then Middle (gr 7-8), then Lower (gr 5-6). Do not label them by enrolled grade. | Andy's thirteen students were grade 7-9 at RIT 216-251, all above median (§9). Upper content fits that cohort whatever their grade. Labelling by level lets a strong 7th grader take Upper without us claiming a grade equivalent. |
| Items per form | **39 for R and LU (13 per area), 40 for Math (10 per area)** | MAP is "max 43 incl. field test", so ~39-40 scored (§2). Its R and LU blueprints are balanced at 13 per area (§5). Math 6+ per-area counts are not published, so we use balanced 10s. |
| Time | **Untimed**, with elapsed time shown and "about 45-60 minutes" stated | MAP 2-12 is untimed (§2). A countdown would teach the wrong pacing. |
| Adaptive vs fixed | **Fixed forms.** No adaptivity at launch. | MAP is a Rasch CAT (§2). Running a CAT on uncalibrated, author-labelled difficulties prints false precision. Our `study_attempts` data is internal testing, not students (memory: attempts-data-contaminated). Revisit only once real response data supports provisional difficulties. |
| Formats | 4-option MC only, disclosed | MC is the large majority of an event; multiselect and drag-and-drop are about 1 each per event (§9, §11, uncitable source). Text entry (Math) and multiselect are the cheap next formats (§4). |
| Score shown | **Raw correct per instructional area plus the list of missed skills.** No RIT, no percentile, no band, no predicted score, no gain. | RIT is defined by NWEA's item bank and norms and cannot be produced (research conclusion, §10). The SSAT/ISEE precedent (bank-register A15) is that `scaleNote` is shown and no band is printed. MAP needs a `SCALE_NOTE.map` that says why. |
| Framing copy | The 50%-correct expectation, the non-affiliation disclaimer, and "practice and diagnosis, not a score prediction" | §"minimum honest product", §10 (a year's growth is smaller than the noise), §8 (trademark pattern). |
| Subscores | Show area raw counts but no "weak in X" verdict from one form | NWEA's own 13-item subscores run reliability 0.75-0.91 (§3). Ours are 13 items with no reliability data at all. |

---

## 2. What already exists: re-banding (MAP-RESEARCH §12-§13 READY), measured

**Population:** 9,635 live verified rows, of which 5,249 are four-choice
rows that map to a MAP strand. Excluded:
- 765 SSAT reading and math rows: five choices. Removing a distractor is an
  edit, not a re-band.
- 1,233 ISEE/SSAT verbal rows: synonyms and analogies are not a MAP format.

**The mapping is a judgement**, written out in
`map-reband-count.mjs classify()`. Rows with no strand signal are counted
UNTAGGED and never guessed into a strand. All of this lands in the **Upper
band only**: "easy" here means easy for an upper-level test-taker and must
never be relabelled as grade-5 material (§13).

### Language Usage (13 per area per form)

| MAP strand | items | easy / med / hard | from |
|---|---|---|---|
| Writing: Purpose and Audience | **424** | 69 / 255 / 100 | SAT Expression of Ideas 244, ACT PoW + KoL 180 |
| Grammar and Usage | **378** | 110 / 207 / 61 | SAT SEC 267, ACT CSE 111 |
| Mechanics: Punctuation | **238** | 53 / 138 / 47 | SAT SEC 139, ACT CSE 99 |
| Mechanics: Capitalization | **0** | | |
| Mechanics: Spelling | **0** | | |

Forms: **26 by division, 18 by thinnest area** (Mechanics, which is
punctuation-only). If each form had to carry its share of Capitalization and
Spelling, the count is **0** until those are authored.

Punctuation versus grammar is decided by subskill text, and it is a
judgement. Fragments go to grammar (CCSS L.1). Choosing a mark between
clauses goes to punctuation (CCSS L.2). §12 quoted Punctuation "~56"; the
bank's SEC grew since then and the split rule is now explicit.

### Reading (13 per area per form)

| MAP strand | items | easy / med / hard | from |
|---|---|---|---|
| Informational Text | **602** | 36 / 427 / 139 | SAT I&I + C&S (non-WIC) 499, ACT reading non-literary 103 |
| Vocabulary | **105** | 7 / 80 / 18 | SAT WIC 70, ACT 19, ISEE 16 |
| Literary Text | **40** | 10 / 25 / 5 | ACT `literary_narrative` only |
| UNTAGGED | 101 | 23 / 45 / 33 | ISEE reading: no genre field, so a person must tag literary vs informational |

Forms: **19 by division, 3 by thinnest area** (Literary). Passage cohesion
is not modelled: MAP draws ~4 items per passage, and SAT passages carry one
item each. Mixing passage sets and single-item stimuli is itself a fidelity
choice (Q9). Tagging the 101 ISEE rows could add up to ~2 Literary forms.

### Math (10 per area per form)

| MAP strand | items | easy / med / hard | from |
|---|---|---|---|
| Operations and Algebraic Thinking | **1,757** | 170 / 1,232 / 355 | SAT Algebra + Advanced, ACT Algebra + Functions, ISEE (keyword) |
| Geometry | **626** | 85 / 396 / 145 | SAT G&T, ACT Geometry, ISEE (keyword) |
| Statistics and Probability | **528** | 81 / 342 / 105 | SAT PSDA, ACT S&P, ISEE (keyword) |
| Real and Complex Number Systems | **244** | 57 / 135 / 52 | ACT N&Q 111, ISEE (keyword) 133 |
| UNTAGGED (ACT Integrating Essential Skills) | 206 | 51 / 123 / 32 | spans every area |

Forms: **78 by division, 24 by thinnest area** (Number Systems). ISEE maths
is split by keyword over free-text subskills, which is the weakest mapping
in this file. 132 ISEE easy items across strands are reported as
**grade-8 candidates**; a person decides that, not the script.

**Caveat on all three:** these rows were gated for SAT/ACT/ISEE, not for
MAP. Re-banding moves a label. It does not re-measure difficulty, and per
§10 a band label is unvalidated until response data exists.

---

## 3. What must be authored, per strand

Three product levels × subject. "Agent" means an agent pipeline has
evidence of working on this strand. "Human" means two or more agent methods
failed and the register says a person writes or selects.

| strand | Upper (9-11) | Middle (7-8) | Lower (5-6) | route |
|---|---|---|---|---|
| Capitalization | **not targeted** (no grade 9-11 standard) | a few, at most | author | **Agent.** Pilots 3 and 4 held 9/10 and 8/10, but `map-lu-mech-v1` found 10 of 15 `easier` calls on Capitalization: target it at grades 5-6 (§7) |
| Spelling | **author ~20** | author | author | **Agent**, with the macOS spellchecker E4 caveat (§17): some commonest misspellings pass the dictionary and cannot be distractors |
| Punctuation | re-band 238 | author | author | **Agent** (2x2 grid, E9) |
| Grammar and Usage | re-band 378 | author | author | **Agent, partly.** Pilot 4 usage held 3/8; `map-lu-mech-v1` tests a 2x2-grid version |
| Writing: Purpose and Audience | re-band 424 | author | author | **Unproven.** Pilot 4 writing items played easy. Run a small pilot before committing |
| Vocabulary | re-band 105 | **human** | **human** | **Human.** "Genuine meanings" gave dead options and "surface fit" leaked at 88.9% (§17). No third agent rule |
| Literary Text | **human** (40 held) | **human** | **human** | **Human-edit draft route** (sibling agent; B11; owner closed agent MAP comprehension 2026-10-07) |
| Informational Text | re-band 602 | **human** | **human** | same |
| Math, all 4 areas | re-band 3,155 | **author** | **author** | **Agent + sandbox key recompute** (bank-sat-math pipeline). Options-only discriminates on numeric maths, and a with-source free-elimination read is required (CLAUDE.md 2026-09-24) |

**Minimum volume for a launch level:** 2 forms per subject per level (one
diagnostic, one retest), the SSAT/ISEE launch precedent. Per new level:

- **Language Usage:** 2 × 39 = 78 items, about 26 per area. Mechanics splits
  roughly 9 Capitalization, 9 Punctuation, 8 Spelling.
- **Math:** 2 × 40 = 80 items.
- **Reading:** 78 items, which is about 20 passages of 4.

Author ~30% over these targets for gate losses. Recent batches lose 15-40%.

---

## 4. Order of work (what needs no decision is marked "now")

1. **now** — `map-lu-mech-v1`: 24 grade 5-8 Mechanics and grammar items
   through the full gate, staged (§7).
2. **now** — An Upper-level Spelling batch (about 20 items; Capitalization
   is a Lower-band strand, §7). This unblocks LU Upper.
3. after Q1/Q2 — Code wiring for `family='map'` (§5). A test pins the
   no-band rule.
4. after Q8 — A person tags the 101 ISEE reading rows as literary or
   informational, and the 206 ACT IES rows by MAP area.
5. after Q6 — A human sitting on each staged MAP cohort, using the bank-gate
   §5 rule.
6. later — Middle and Lower Math (agent); Middle and Lower LU (agent
   Mechanics and grammar, Writing pilot); Reading (human-edit route).

---

## 5. Code needed (BUILT 2026-10-19 behind the gate, except the launch list below)

**Built 2026-10-19, MAP still not shipped.** `'map'` is an `AdmissionFamily`
with three untimed blocks (Reading 39, Language Usage 39, Math 40) drawn to
`MAP_AREA_QUOTAS` by `drawMapAreas` in `assemble.ts`. Owner answers used:
Q1 grades 5-8, Q2 Math in. Recommendations taken where the owner had not
answered, all reversible before launch:
- **Q3 score:** percentage, right/wrong/blank and the scale note. No RIT
  range, though the owner asked (2026-10-12): a range computed from
  percent-correct would be a fabricated RIT. Revisit with real-score
  calibration.
- **Q4 untimed:** blocks carry 0 minutes. The runner counts elapsed time up
  (`isUntimedTest`), and auto-submit already needed a limit above zero.
- **Q5 moot:** grades 5-8 is all newly authored `family='map'` rows, so no
  re-banded SAT/ACT rows are drawn.
- **Q7 credits: 2 per subject, PROVISIONAL.** The owner has not priced MAP.
- **Q8 level: no column yet.** One launch level (grades 5-8), so the draw
  takes every verified MAP row. New rows keep `verify_meta.map.grade_target`.

Checked against the staged rows (read-only, 2026-10-19): every MAP row's
domain names a quota area (0 unknown); Reading fills 39/39 from the drafts;
Language and Math fill 11 each, one area apiece. `map-wiring.test.ts` pins
the blueprint, the gate, the prices, the score and the draw; each mechanism
was reverted once to confirm its test fails.

**Still to do at launch, in order:**
1. `study_topics` rows: `test-map`, `map-reading`, `map-language`,
   `map-math`, then their ids in `SECTION_TOPIC` (`section-topics.ts`).
2. Landing card (`mobile/study/page.tsx` `TEST_THEMES`, `admissionStat`)
   and onboarding `available`.
3. ~~A per-area breakdown on the result screen~~ DONE 2026-10-19
   (`mapAreaBreakdown`; the draw stamps the area onto each question, since
   most MAP item JSON has no `domain`). No "weak in X" verdict.
4. Confirm the price, then add `test-map` / `map` to `SHIPPED_TEST_SLUGS` /
   `SHIPPED_TEST_FAMILIES` and drop it from `COMING_SOON_EXTRA`. This is
   the flip, and it goes last.

### Original scope (2026-10-12)

**No migration is needed for the family itself.** `study_item_bank` has no
CHECK constraint on `family`, `section` or `domain`
(`database/migrations/038_study_item_bank.sql`). The sibling agent's Drafts
work already uses `family='map'`, `section='reading'`, cohorts
`map-reading-draft-*` (`src/lib/study/__tests__/draft-families.test.ts`).
This plan uses `family='map'` and sections `reading` / `language` / `math`.

### 5.1 Blueprint and scoring
- `src/lib/study/admission-tests.ts`:
  - `AdmissionFamily` (line 14) gains `'map'`, or MAP gets its own file as ACT
    has `act-test.ts`. **Recommend its own file:** MAP has levels, which
    SSAT/ISEE do not.
  - `AdmissionSection.bankSection` (16-33) must widen to include
    `'language'`.
  - `SCALE_NOTE` (152) needs a `map` entry: no RIT, no percentile, why.
  - `ITEMS_PER_PASSAGE` (267) needs a `map` entry: 4.
  - `ADMISSION_TOPIC_SLUGS` (445) gains `map-language`, `map-math`, later
    `map-reading`, one per level.
- `scoreAdmission` (121) already scores rights-only for non-SSAT families,
  which is correct for MAP.
- Blueprint entries: Language Usage 39 = 13 + 13 + 13, Math 40 = 10 × 4,
  Reading 39 = 13 × 3. `choiceCount: 4`. `minutes`: untimed needs either a
  `null` the runner understands or a generous cap (Q4). The runner was not
  checked for `null` support; that is part of the build.

### 5.2 Assembly
- `src/lib/study/assemble.ts` `assembleAdmissionSection` (1628-1789)
  currently filters on family, section and verified only. It has no per-area
  quota and no level. MAP needs:
  - per-area quotas (13/13/13). Today only verbal draws type-by-type.
  - a level filter
- `src/app/api/study/test/assemble/route.ts` 91-97 hard-codes the family
  list (anything unknown becomes `'sat'`). `isAdmission` and the casts at
  115/133/357 are `'ssat'|'isee'`.

### 5.3 The design question with no precedent: re-banded rows are SAT/ACT rows

`content_hash` is unique (038:76), so a re-banded item cannot be copied as
a `family='map'` row without altering it. Two options:
- **(a) Draw by mapping (recommended).** The MAP assembler queries the
  source families with the strand mapping from `map-reband-count.mjs`,
  moved into `src/lib/study/`. No copies and one row per item. Exposure
  tracking is per item id, so a student who already met an item in SAT
  practice does not get it again as "MAP".
- (b) Copy rows with a MAP-specific hash suffix. That duplicates content and
  splits review history.

Either way, the mapping becomes product code and needs its own test.

### 5.4 Level (grade band) storage

There is no grade or level column. "Upper Level" exists only as copy
(`test-specs.ts:1038`, `:1240`). Options:
- a nullable `level` column. Recommended: SSAT Middle and ISEE Lower/Middle
  will need it too.
- encode the level in `cohort`/`topic_tag`. Fragile.
- one section key per level

New MAP rows carry `verify_meta.map.grade_target` and `ccss` now, so any
choice can be backfilled.

### 5.5 Topic routing and the coming-soon flag (the SSAT/ISEE list, bank-register FOUND_WHILE_FIXING "SERVABLE BY API AND UNREACHABLE")

- `src/lib/study/shipped-tests.ts` `SHIPPED_TEST_SLUGS` (21) and
  `SHIPPED_TEST_FAMILIES` (81). Remove `test-map` from `COMING_SOON_EXTRA`
  (121). **This is the flip, and it goes last.**
- `src/app/mobile/study/page.tsx` `admissionStat` (223) and `TEST_THEMES`
  (232-345).
- `src/app/mobile/study/topic/[slug]/page.tsx`:
  - `parseTestSlug` (1239)
  - `startAdmissionSection` (567)
  - `startBankTest` (651-683)
  - the family check at 1137
- `src/lib/study-prompt-context.ts` `TestFamily`/`mapTestFamily` (32-42,
  113-125). `src/lib/test-specs.ts` `TEST_SPECS`.
- `src/lib/study/section-topics.ts` `SECTION_TOPIC`. The `study_topics` rows
  must exist first.
- `src/lib/study/plans.ts` `SECTION_CREDIT_COST` (366-382). An unlisted
  family silently costs 1 credit (Q7).
- `src/lib/study/plan-copy.ts` `FAMILY_ORDER`.
- `src/lib/study/test-result.ts` `TestFamily` (296, 341) and
  `familyFromTopicSlug` (356-371). Otherwise MAP shows as `'other'`.
- `src/app/mobile/study/session/[id]/test/TestResultView.tsx` (150, 310,
  420-446): raw score plus `scaleNote`, no band.
- `src/lib/study/bank-qc.ts` (108), `src/app/api/admin/bank-qc/sweep/route.ts`
  (28), `src/lib/study/hardening.ts` (290, 298).
- Onboarding: `OnboardingWizard.tsx:66`, `preferences/page.tsx:40`
  (`available: false`). `target-tests.ts` is not required for launch.
  SSAT/ISEE are not in it either.
- Scripts:
  - `form-capacity.mjs` `SECTIONS` (46-61) needs MAP rows. It should read
    the mapping for re-banded strands.
  - `math-bank-helper.mjs:556` refuses families outside sat/ssat/isee/act.
- Tests to extend: `admission-wiring`, `admission-topic-slugs`,
  `section-topic-family`, `admission-tests`, `admission-result`. Add one
  test that a MAP result renders **no** band, percentile or RIT.

Estimate: comparable to the SSAT/ISEE wiring (one day of code plus tests),
plus the per-area quota and level filter in the assembler, which SSAT/ISEE
did not need.

---

## 6. Owner decisions

Each is a question with a recommendation. Q1, Q2, Q5 and Q8 gate building.

1. **Launch order: Upper LU and Math first, or wait for grades 5-8?**
   *Recommend Upper first, labelled by level, not grade.* It is buildable
   from owned material and fits the above-median cohort Andy described
   (§9). Grades 5-8 is the bigger market (§13) and follows as authored
   material clears.
2. **Is Math in scope?** MAP-RESEARCH §11 scoped Reading and LU only; this
   brief names Math. *Recommend yes.* It is the strongest-gated subject we
   have, and 24 Upper forms exist today.
3. **Score display: raw per area, with no RIT, percentile or band. Agreed?**
   *Recommend yes, exactly as SSAT/ISEE (A15).* A percentile is especially
   tempting and especially false: our forms are not normed, and MAP is an
   admissions gate in Korea (§11).
4. **Untimed?** *Recommend untimed with elapsed time shown.* If the runner
   cannot do untimed, use a 90-minute soft cap that never auto-submits.
5. **Re-banded items: draw SAT/ACT rows by mapping, or copy them?**
   *Recommend draw by mapping* (§5.3). It needs no duplicates and exposure
   tracking stays correct.
6. **Who releases staged MAP items?** *Recommend the co-founder sits
   `map-lu-mech-v1`* (24 items, about 15 minutes) under the bank-gate rule:
   at or below 40% blind is clean, at or above 60% archives, and in between
   goes to a second reader. Note that for whole-sentence Mechanics a person
   solving them is the construct, so the human number here measures
   **key correctness and difficulty**, not guessability. The decision rule
   should be set for that before the run is drawn.
7. **Credits per MAP section?** *Recommend the SSAT/ISEE per-section cost.*
   Never the silent fallback of 1.
8. **Level storage: add a `level` column?** *Recommend yes, nullable.* It is
   reused by SSAT Middle and ISEE Lower later.
9. **Reading fidelity: allow single-item SAT stimuli in a MAP Reading form,
   or require 4-item passage sets?** *Recommend passage sets for
   Literary/Informational and single items for Vocabulary only.* Decide
   before Reading, not before LU or Math.
10. **Mechanics at launch: block LU Upper until Spelling exists, or launch
    punctuation-only with a disclosure?** *Recommend block until an Upper
    Spelling batch (~20 items) clears.* Revised after `map-lu-mech-v1`
    (§7): Capitalization has no grade 9-11 standard, so Upper Mechanics
    should be Punctuation plus Spelling. Capitalization appears in the
    Middle and Lower levels.
11. **Disclaimer and naming:** "MAP-style practice", with NWEA/HMH
    non-affiliation on every MAP screen? *Recommend yes* (MAP-RESEARCH §8:
    the industry pattern, and the one that keeps the trademark exposure
    nominative).

---

## 7. First authoring batch: `map-lu-mech-v1` (result)

Pre-registered in `MAP-LU-MECH-V1.prereg.md`. Full result in
`MAP-LU-MECH-V1-RESULT.md`.

**FAIL, nothing inserted.**

**Keys were right everywhere:** 48/48 cold picks on key, 24/24 keyed
"correct", and options-only found no unanimous non-key pick.

**It failed on difficulty:**
- pilot-pass 17/24 (bar 20)
- `easier` 15/48 (bar 8)

10 of the 15 `easier` calls are Capitalization, because CCSS has no
capitalization rule after grade 4. Grammar fit its grade on 14/16
judgements.

**Its new count-balance rule (T1) created a cross-item tell:** in a 2x2 grid
the key became the "mixed" option. On Capitalization that is worth 50%
against 25% chance. Both graders found it, and it was confirmed by exact
count.

**What this changes in the plan:**
- **Capitalization is a Lower-band strand.** Target it at grades 5-6 only.
- **Q10 changes.** The Upper Mechanics area should be served by punctuation
  (238 re-banded) plus Spelling, not by grade 9-11 Capitalization, which
  has no standard to anchor to.
- **The next Mechanics batch** changes the site construction (no binary
  count-balance rule) and measures the mixed-key and extreme-key rates
  exactly before freeze.

---

## 8. Second authoring batch: `map-lu-v2` (result)

Owner decisions of 2026-10-12: grades 5-8 come first, and Language Usage
waits for about 20 cleared Spelling items. Pre-registered in
`MAP-LU-V2.prereg.md`; full result in `MAP-LU-V2-RESULT.md`.

**FAIL on every strand, nothing inserted. Spelling cleared: 0.** The
Language Usage gate is not met.

- **Spelling (24):**
  - pilot-pass 20/24, exactly at the bar
  - `easier` 11/48 against a bar of 8, so it fails
  - **Grade 5 passed 2/6**: the list words tomorrow, answer, finally and
    beautiful
  - **Grades 6-8 passed 18/18**, with every key right and no structural tell
    left
- **Capitalization (grades 5-6):** 6/8. It is now slightly too hard at
  grade 5, no longer too easy.
- **Punctuation and Grammar:** stopped at Stage 0 by the per-strand E3 bar
  (3/10 each). The batch-level structural check, T2, was clear on both. The
  bar was a design error, and it is recorded.
- **The next Spelling batch** keeps the method and changes the grade-5 words
  (or starts at grade 6). It is the shortest path to the owner's 20.

## 9. Third authoring batch: `map-lu-v3` (result)

Pre-registered in `MAP-LU-V3.prereg.md`; full result in `MAP-LU-V3-RESULT.md`.

**Punctuation passes: 11 grades 5-8 items inserted staged** (cohort
`map-lu-v3-punctuation`), the first MAP Language Usage items in the bank.
**Spelling cleared: 0 (cumulative 0 of ~20).** The Language Usage gate is
not met.

- **Spelling:** stopped at Stage 0 by the structural-predictor check (a
  vowel-count tell that the batch's own length fix created). Not graded.
- **Capitalization:** grade 6 4/4, grade 5 0/4 (too easy). Grade-5
  Capitalization has now missed in both directions; target grade 6 only.
- **Grammar:** grades 7-8 6/6, grades 5-6 too easy; fails S1-b and S1-c.
- **Next Spelling batch:** v3's words and screen, seeded edit profiles plus a
  fixed letter class per edit, and the structural check run on the
  likely-frozen subset before the teacher gate.

