# iTEP SLATE / SLATE-Plus: blueprint and integration plan

Status: research only (2026-10-31). Nothing has been written to the DB, no items have been authored, and nothing is committed.
Owner request: add iTEP SLATE as a Study test. The version 싱가로유학 lists is **SLATE-Plus**. Singapore international
schools such as SAIS publish "iTEP SLATE Plus" testing rules. I could not find the 싱가로유학 page itself.

**Harvest rule (same rule as MAP):** the references below contain real iTEP items. They were read ONLY for format:
task types, counts, timings, option counts, lengths, levels and categories. No real item is quoted, paraphrased,
authored from or validated against anywhere in this file or in the briefs. Grammar categories are given as labels only.

## 0. Sources

| tag | source | date / status |
|---|---|---|
| **B** | iTEP SLATE Brochure, https://academiclanguagesolutions.com/hubfs/iTEP-SLATE-Brochure-1.pdf (byte-for-byte the same text as the official https://itepexam.com/wp-content/uploads/2022/05/iTEP-SLATE-Brochure.pdf) | 2022, official. **Primary source.** |
| **O** | iTEP SLATE Orientation Guide, https://www.itepexam.com/wp-content/uploads/2013/10/SLATE-Orientation-Guide1.pdf | created 2012, modified 2014, official, SLATE-specific |
| **D** | Live demo, https://www.iteptest.com/SLATE_demo, read 2026-10-31 in the built-in browser. I went through the intro and the Grammar section only. I stopped at "Choose Yes to finish this section", per the no-submit instruction. | current |
| **P** | https://www.itepexam.com/product/slate-plus/ and https://www.itepexam.com/products/itep-slate/ | current |
| **G** | iTEP Preparation Guide, 3rd ed., https://www.itepexam.com/wp-content/uploads/2013/10/iTEP-Preparation-Guide-3rd-Edition-22JUN12.pdf. Page numbers below are the guide's printed numbers; PDF page = printed + 4. | 2012. It covers iTEP Academic, Business and SLATE together, and most worked examples are **Academic**. |
| x | Scribd "ITEP Practice Test II" (https://www.scribd.com/document/427314062) | **Unreachable.** Only the metadata loads: "Practice test for ITEP core", 13 pages. It is also adult iTEP Core, not SLATE. |

Local copies of B, G, O and the 2022 brochure, with their text extracts: `/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/itep-ref/`.

## 1. SLATE-Core vs SLATE-Plus (vs "Junior")

| | SLATE-Core | **SLATE-Plus** |
|---|---|---|
| Sections | Grammar, Listening, Reading | Grammar, Listening, Reading, **Writing, Speaking** |
| Time | 50 min + 10 min pre-test | 80 min + 10 min pre-test. Marketed as "90 minutes (one sitting)". |
| Delivery | online; **also on paper** | online / at home / at a test centre; no paper version |
| Price | — | $129 + $12 proctoring = $141 (P) |
| Results | MC auto-scored | Writing and Speaking rated by humans; results within 24 h (P), older guide says 5 business days (G p.88) |

Sources: B p.3; O p.1; G p.1, p.4; P.
The same MC sections appear in both versions. Plus is Core with two productive sections added, so **a SLATE-Plus
build contains a SLATE-Core build** and nothing in the MC sections differs between them.

**SLATE Junior:** I found nothing in any official iTEP source. The only age statement is "middle and high school
students" (B p.3) and "High school age students (and younger)" (B p.8). No numeric age range is published. Treat
"Junior" as not existing until someone produces a source.

## 2. Format (SLATE-Plus, current)

Every MC question in every section has **four options** (O p.2; B p.3; D). There is no guessing penalty and every
question is worth the same (O p.2; B p.5). Part 1 of each section is easier than Parts 2 and 3 (G p.4; O p.2).

**Section order is Grammar, Listening, Reading, Writing, Speaking** (D, 2026). The 2012 guide gives Reading,
Listening, Grammar, Writing, Speaking (G p.5). The live demo is the current order; use it.

### A. Grammar (Structure): 10 min, 25 questions, MC, bank-able

| part | n | task | level | source |
|---|---|---|---|---|
| 1 | **13** | sentence with one blank; choose the word or phrase that correctly completes it | beginner to advanced | B p.4; O p.1; D; G p.45 |
| 2 | **12** | sentence with four marked words or phrases; choose the one that is NOT correct (error identification) | elementary to advanced | B p.4; D; G p.45, p.51 |

- The split is settled as 13/12 by B, O, D and G p.45. G's own summary table (p.6) says 12/13, which is a typo inside G.
- Back and review are allowed within the 10 minutes (G p.46; D).
- One single sentence per item. No passage.
- Categories tested (labels from the answer key, G pp.76-77): verb tense and form, subject-verb agreement, pronoun case,
  relative pronouns, comparatives, parallelism, correlatives and idioms (neither/nor, no sooner...than),
  adjective vs adverb, count/non-count nouns, transitions and conjunctions, prepositions, commonly confused words,
  modifier reference.
- Pace: 24 s per question. Items are short and quick.

### B. Listening: 20 min, 14 questions, MC, bank-able (needs audio)

| part | n | stimulus | level | source |
|---|---|---|---|---|
| 1 | **4** | 4 short two-speaker conversations of 2-3 sentences (typically man and woman), **1 question each** | high-beginning to low-intermediate | B p.4; O p.1; G p.6, p.34 |
| 2 | **4** | one 2-3 minute conversation, 4 questions | intermediate | same |
| 3 | **6** | one ~4 minute lecture, 6 questions | upper-level | same |

- Audio plays **once** and there is no replay (G p.7). Each question is heard once and also shown on screen. Notes are allowed.
  Once "Confirm Answer" is clicked the answer is locked (G p.34, p.37; O p.5).
- Answer windows: Part 1 has **80 seconds for all 4 questions**. Part 3 has **3 minutes for 6 questions** (G p.33, p.40; O p.5).
- Question kinds (categories only, from G pp.33-43): what a speaker will do or intends, the speakers' relationship,
  what happens next, inference about a speaker, main idea, why a speaker mentions X, detail.
- The lecture is "slightly more formal" than the conversations (G p.40). No prior topic knowledge is needed (G p.31).

### C. Reading: 20 min, 12 questions, MC, bank-able

| part | n | passage | level | source |
|---|---|---|---|---|
| 1 | **2** | ~50-word text(s) | low-intermediate | B p.4; O p.1; G p.6, p.13-14 |
| 2 | **4** | one ~200-word passage | intermediate | B p.4; O p.1; G p.13-14 |
| 3 | **6** | one ~500-word passage | low-advanced (to advanced, G p.6) | same |

- **UNCERTAIN, Part 1 shape.** B (2022) says "Two ... passages of approximately 50 words, followed by two
  multiple-choice questions". O and G say ONE 50-word passage with 2 questions. The count is 2 either way.
  The worked SLATE samples are also longer than 50 words: G p.15 is about 95 words and O p.4 is about 330.
  My recommendation is to model Part 1 as **two short standalone texts of 50-100 words with 1 question each**,
  following the newest source, and to confirm in the demo's Reading section. Reaching it means finishing the demo
  Grammar and Listening sections, which the owner can click through.
- Part 2 length: 200 words (B, O, G p.14). G p.6 says 250, which conflicts with G's own p.14.
- Back and review are allowed (G p.13).
- Question kinds (categories): literal detail, vocabulary in context, main idea / the writer's problem, NOT/EXCEPT,
  purpose of mention, inference. "Multiple-choice questions typically focus on literal meaning" (G p.15, Part 1).
- **Not SLATE:** G's "insert a sentence" (p.19) and "choose 3 of 6 summary sentences" (p.28) are labelled iTEP
  Academic. Every SLATE source says each MC item is one of four answers (O p.2; B p.3). Exclude both.
- The topics suit high school ("typical material that will be encountered in high school", G p.13). Narrative,
  first-person school life, and informational history and science all appear in the SLATE samples.

### D. Writing: 25 min, 2 tasks, productive (rubric-graded)

| part | time | task | source |
|---|---|---|---|
| 1 | 5 min | a 50-75 word note or letter on a simple supplied situation, low-intermediate | B p.4; O p.6; G p.7, p.57 |
| 2 | 20 min | a 175-225 word opinion essay (**maximum 250 words**, O p.7) on an upper-level written topic; give reasons and examples | B p.4; O p.7 |

- Each part has its own fixed limit and cannot be revisited after "Confirm Answer" (G p.56).
- Officially listed criteria (O p.6): overall ability/fluency, grammar, vocabulary, cultural/stylistic
  appropriateness, and **effort required by the reader**. G p.57 lists appropriateness to purpose, vocabulary,
  organization and focus, development, and grammar and mechanics.

### E. Speaking: 5 min, 2 tasks plus a 1 min unscored warm-up, productive

| part | prep | speak | task | source |
|---|---|---|---|---|
| warm-up | — | ~1 min | unscored | B p.4 |
| 1 | 30 s | 45 s | hears **and reads** a short personal question, low-intermediate | B p.4; O p.8; G p.65 |
| 2 | 45 s | 60 s | **hears only** (not shown) a 60-90 s statement giving two sides of an issue, then gives and supports an opinion | B p.4; G p.68; O p.9 |

- Officially listed criteria (O p.8): overall ability/fluency, grammar, vocabulary, cultural/stylistic
  appropriateness, and **pronunciation**. G p.63 adds organization and focus, development, ease and tone.
- **The Writing and Speaking criteria lists differ** ("effort required by reader" vs "pronunciation"). Per the
  CLAUDE.md TOEFL lesson, each skill needs its own rubric from its own source, never one shared between them.

## 3. Score scale and levels

- Overall level **0.0-6.0 in tenths**. Each skill (and sub-skill) is also reported 0-6. Sections are weighted
  equally (B p.5; O p.3). G p.10 says half-levels; that is the 2012 rule, now replaced by tenths.
- MC sections are machine-scored to an "index score" and then an iTEP level (G p.10). **The raw-to-level conversion
  is not published.** Writing and Speaking are rated by trained ESL raters against a rubric that is **not
  published**; only the criteria lists above and the Ability Guide are public.
- Bands, with their CEFR alignment (B p.6 Ability Guide; O p.3):

| iTEP | band | CEFR |
|---|---|---|
| 0.0 (0.1)-2.4 | Beginner | A1 |
| 2.5-3.9 | Elementary | A2 |
| 4.0-4.9 | Intermediate | B1 |
| 5.0-5.9 | Upper Intermediate | B2 |
| 6.0 | Advanced | C1 |

  The 2012 guide (p.11) used seven named levels instead: 0 Beginning to 6 Advanced. That scheme is superseded.
- B p.6 gives per-skill "real world" descriptors for each band (Listening, Reading, Writing, Speaking columns).
  These are the only public, skill-specific level text.
- B p.7 gives equivalency tables to KET, SLEP, PET and TOEFL Jr. These are iTEP's own claims and ETS and Cambridge
  disclaim them on the same page. Do not show them as conversions.

**What we can honestly show.** The MAP precedent applies: no conversion is published, so a SLATE level computed
from our percent-correct would be an invented number that a parent reads as real. Recommended `SCALE_NOTE`:
"Practice percentage only. The real iTEP SLATE reports a level from 0.0 to 6.0 using a conversion iTEP does not
publish, so no iTEP level is shown." Revisit only once students report real SLATE levels next to their practice score.

## 4. Bank-able vs productive

| section | type | gate | blocker |
|---|---|---|---|
| Grammar | MC, single sentence | full `bank-gate`: structural pre-flight, options-only blind attack, with-source exclusivity grade, QC ledger, human sitting | none |
| Reading | MC, passages | full `bank-gate`; split attack by passage cohort | Part 1 shape (§2C) |
| Listening | MC, audio | the TOEFL path: `blind-listening` render, no-source attack, `insert-listening`, TTS pre-warm | the runner's listening branch is keyed on `family === 'toefl'` (§5) |
| Writing | productive | rubric grader | **no published iTEP rubric** (§3) |
| Speaking | productive | rubric grader + audio | same, plus speaking UI keyed on `'toefl'` |

**Productive sections and the rubric lesson.** CLAUDE.md requires each skill's rubric to come from that skill's
official guide. iTEP publishes no band rubric for either skill. The only official text is:
- the per-skill criteria lists (Writing O p.6, Speaking O p.8);
- the per-skill Ability Guide columns (B p.6).

A rubric built from those would be **our reading of a descriptor table, not iTEP's rubric**. It could also only
be calibrated against the single unscored sample response per task in O, and the samples carry no level. So:
1. ship Writing and Speaking as **practice feedback** (the SSAT/ISEE essay pattern: `scored: false`, no level);
2. if a rubric is built anyway, write separate `itep_writing` and `itep_speaking` rubrics, each citing B p.6 and its
   own O page, and add an `itep` block to `rubric-fidelity.test.ts` that pins the wording to those sources;
3. never fold rubric marks into an overall 0-6 figure (the same rule as the uncalibrated TOEFL grader).

## 5. Integration plan

### 5.1 Shape decision

iTEP has two halves:
- **Grammar and Reading** are fixed four-choice blocks, which the **admission-family** path (SSAT/ISEE/MAP) already
  handles: block pricing, `SECTION_TOPIC`, the shipped gate, raw scoring, `choiceCount`, `drawByPassage`.
- **Listening, Writing and Speaking** are TOEFL-shaped.

Recommendation: add `'itep'` as an `AdmissionFamily` for the MC sections. Then generalise the TOEFL-only listening
and speaking branches through a helper (`isListeningFamily(family)`) instead of copy-pasting `|| 'itep'` at eight sites.

One real gap: `ITEMS_PER_PASSAGE` is a single number per family, and iTEP Reading needs **1 or 2, 4 and 6** per
part, in part order. Grammar likewise needs Part 1 (13 completion) before Part 2 (12 error-ID). Fix this by
generalising `MAP_AREA_QUOTAS` + `drawMapAreas` into an area-quota table with a per-area `itemsPerGroup` and a fixed
order, for example:

```ts
ITEP_PART_QUOTAS.grammar = [
  { area: 'Part 1: Sentence Completion', count: 13, passages: false },
  { area: 'Part 2: Error Identification', count: 12, passages: false }
]
ITEP_PART_QUOTAS.reading = [
  { area: 'Part 1: Short Text', count: 2, itemsPerGroup: 1 },
  { area: 'Part 2: Intermediate Passage', count: 4, itemsPerGroup: 4 },
  { area: 'Part 3: Advanced Passage', count: 6, itemsPerGroup: 6 }
]
```

`domain` on each bank row is the part label, spelled exactly as in the table.

### 5.2 Files to change, in order. Phase 1 = Grammar pilot; nothing student-visible until the shipped flip.

**Registry and blueprint**
- `src/lib/study/admission-tests.ts`:
  - add `'itep'` to `AdmissionFamily` (L30);
  - add `'grammar' | 'listening' | 'speaking'` to the `bankSection` union (L38);
  - add an `ADMISSION_BLUEPRINT.itep` block list in demo order (below);
  - add `ITEP_PART_QUOTAS`;
  - add an `itep` entry to `SCALE_NOTE` (L224, text in §3), `VERBAL_TYPES` (`[]`) and `ITEMS_PER_PASSAGE` (unused
    once part quotas exist; set to 6);
  - add the slugs to `ADMISSION_TOPIC_SLUGS` (L527).

  The blueprint blocks:

  ```
  { key:'grammar',   name:'Grammar',   bankSection:'grammar',   questions:25, minutes:10, choiceCount:4, scored:true }
  { key:'listening', name:'Listening', bankSection:'listening', questions:14, minutes:20, choiceCount:4, scored:true }
  { key:'reading',   name:'Reading',   bankSection:'reading',   questions:12, minutes:20, choiceCount:4, scored:true }
  { key:'writing',   name:'Writing',   bankSection:'writing',   questions:2,  minutes:25, choiceCount:0, scored:false }
  { key:'speaking',  name:'Speaking',  bankSection:'speaking',  questions:2,  minutes:5,  choiceCount:0, scored:false }
  ```
- `src/lib/study/assemble.ts`: in `assembleAdmissionSection` (L1636-1800), route `family==='itep'` to the
  generalised area-quota draw (`drawMapAreas` L1816 becomes `drawAreaQuotas(quotas, ...)`). Keep MAP's behaviour
  byte-identical; `map-wiring.test.ts` must stay green.
- `src/lib/test-specs.ts`: add `TEST_SPECS.itep` (the official names and timings from §2).
- `src/lib/study-prompt-context.ts`: add to the `TestFamily` union (L32-43), `mapTestFamily` (L113-126) and both switches (L245/261, L367/383).
- `src/lib/study/test-result.ts`: add to `TestFamily` (L370) and `familyFromTopicSlug` (L391). Without this, results show as `other`.
- `src/lib/study/bank-test-size.ts` L36: add `itep` to the admission branch.
- `src/lib/study/bank-targets.ts`: add the new domain names (the part labels) to `TARGETS`.

**Gate and routing**
- `src/lib/study/section-topics.ts`: add `SECTION_TOPIC.itep` (block key → topic uuid, with a `// slug` comment; `verify-section-topics.mjs` parses it).
- `src/app/api/study/test/assemble/route.ts`: add to the family ladder (L91-98; an unknown family becomes `sat`) and to `isAdmission` (L100).
- `src/app/mobile/study/topic/[slug]/page.tsx`:
  - add to `parseTestSlug` `FAMILIES` (L1239);
  - add to the bank-start family checks (L510, L1137) and `startBankTest` (L651-700);
  - add unready iTEP sections to `HIDDEN_SUBTOPIC_SLUGS` (L314). It **must stay a one-line literal**, because
    `bank-state.mjs`, `form-capacity.mjs`, `next-form.mjs` and `bank-integrity-sweep.mjs` regex it.
  - `LOCKED_TOPIC_SLUGS` (L89).
- `src/app/mobile/study/builder/page.tsx` L37: this holds a copy of `HIDDEN_SUBTOPIC_SLUGS`; keep it in sync.
- `src/lib/study/shipped-tests.ts`: add to `SHIPPED_TEST_SLUGS` (L21) and `SHIPPED_TEST_FAMILIES` (L81). **Flip last.** Until then use `COMING_SOON_EXTRA` (L120).
- `src/app/mobile/study/page.tsx`: add a `TEST_THEMES.itep` entry (~L232-345) and widen `admissionStat` (L223, typed `'ssat'|'isee'`).
- `OnboardingWizard.tsx` `TESTS` (L60-70) and `preferences/page.tsx` `available` (L35-40).

**Pricing (owner decision)**
- `src/lib/study/plans.ts` `SECTION_CREDIT_COST` (L366-386): add `itep: { grammar, listening, reading, writing, speaking }`.
  An unlisted key silently costs 1, which is below every real price. Suggested: 2 for every section (the
  SSAT/ISEE/MAP price; Grammar is only 10 minutes, so 1 is defensible if listed explicitly).
- `src/lib/study/plan-copy.ts` `FAMILY_ORDER` / `FAMILY_NAME` (L20-26).

**Session UI (phase 2: Listening and Speaking)**
- `src/app/mobile/study/session/[id]/TestSession.tsx`: the `test.family === 'toefl'` checks at L640, 709, 804-807,
  1055, 1136, 1916, 1988 and 2118 move to `isListeningFamily`.
- Listening behaviour that differs from TOEFL:
  - play once with no replay;
  - the question is heard and shown;
  - the answer locks on confirm;
  - per-part answer windows (Part 1: 80 s for 4 questions; Part 3: 3 min for 6).
- `test/TestResultView.tsx`: the admission branch (L178) and per-family display (L466).

**Grading (phase 3: Writing and Speaking)**
- `src/lib/study/responseRubrics.ts`: `ResponseTestFamily` (L39), `RUBRICS`, `RUBRIC_VARIANTS`, `ANCHORS`, with separate writing and speaking rubrics (§4).
- `src/lib/study/openResponse.ts` `RESPONSE_SKILL_BY_TYPE` (L19): new item types `itep_note`, `itep_opinion_essay`, `itep_speak_personal`, `itep_speak_two_sides`.
- `src/lib/study/gradeBatchTargets.ts` `rubricFamilyForSlug` (L30): add the `itep-` prefix.
- `src/app/api/study/test/submit/route.ts` L390 (`startsWith('toefl-')`) and `src/app/api/study/response/grades/route.ts` L82.
- **Migration**: widen `study_response_submissions_test_family_check` (from `database/migrations/128_practice_essay_families.sql`, which allows only toefl/ielts/ssat/isee) to include `'itep'`. Without it, every Writing and Speaking grade insert fails.
- `src/lib/__tests__/rubric-fidelity.test.ts`: add an `itep` block if a rubric is built.

**Admin, QC and scripts**
- Family unions and lists to extend:
  - `bank-qc.ts` `familyForTask` (L108);
  - `hardening.ts` L290/298;
  - `api/admin/bank-qc/sweep/route.ts` `FAMILIES` (L28);
  - `bank-usage.ts` L467;
  - `BankUsagePanel.tsx` L27;
  - `ItemSweepPanel.tsx` L338.
- `scripts/study-bank/form-capacity.mjs` `SECTIONS` (L46-60): add iTEP rows with part quotas.
- `verify-admission-forms.mjs`: has its own `BLUEPRINT` copy (L37-51).
- `bank-integrity-sweep.mjs`: family lists at L653, 834 and 905.
- `bank-state.mjs` and `next-form.mjs` are generic and need no change.
- Insert path:
  - `verbal-bank-helper.mjs` sets choice counts per family (L51); add `itep: 4`. Grammar and Reading go through it.
    The alternative is a small `itep-bank-helper.mjs` modelled on `act-bank-helper.mjs`, with the structural refusals in §6 of the brief.
  - Listening: `toefl-bank-helper.mjs` hard-codes `family:'toefl'` (L254/318/354/379/397); parameterise it.
  - `prewarm-toefl-audio.mjs` L90 filters on `family='toefl'`.
  - Every insert goes through `gate.mjs` `gateBatch` with a QC ledger entry.

**Tests that enumerate families** (each must be updated, or it fails):
- `admission-wiring.test.ts` `FAMILIES` (L20), which also asserts the credit literals;
- `plan-copy-drift.test.ts` `SERVED_SECTIONS` (L33). At the shipped flip this throws until every "SAT, ACT, TOEFL,
  SSAT and ISEE" copy list in en/ko and the checked screens names iTEP;
- `admission-topic-slugs`, `section-topic-family`, `admission-tests`, `draft-families`, `test-submit-all-types`;
- a new `itep-wiring.test.ts` modelled on `map-wiring.test.ts`.

Before any push, run full jest and `npx next lint`, and grep for `Error:`. `tsc` is not the build.

### 5.3 DB rows

There are no CHECK constraints on `study_item_bank` family, section or domain, so no bank migration is needed.

`study_topics` rows, matching the live `test-isee` pattern (level 1, `category='test_prep'`, `parent=test-prep`;
children level 2). Create them at the same time as `SECTION_TOPIC` and the hidden list:

| slug | level | parent | name_en | name_ko | sort |
|---|---|---|---|---|---|
| `test-itep` | 1 | `test-prep` | iTEP SLATE | iTEP SLATE | 97 |
| `itep-grammar` | 2 | `test-itep` | Grammar | 문법 | 10 |
| `itep-listening` | 2 | `test-itep` | Listening | 듣기 | 20 |
| `itep-reading` | 2 | `test-itep` | Reading | 독해 | 30 |
| `itep-writing` | 2 | `test-itep` | Writing | 쓰기 | 40 |
| `itep-speaking` | 2 | `test-itep` | Speaking | 말하기 | 50 |

Plus the migration for `study_response_submissions_test_family_check` (phase 3 only).

Bank rows use `family='itep'`; `section` is `grammar`, `listening` or `reading`; `domain` is the part label from
`ITEP_PART_QUOTAS`; `difficulty` is easy/medium/hard. Map the iTEP level targets as follows:
- easy = A1-A2 (iTEP ≤ 3.9);
- medium = B1 (4.0-4.9);
- hard = B2-C1 (≥ 5.0).

Rows carry `task`, `item_type`, `cohort`, `content_hash`, `verify_meta` and `verified`. Stage them with `verified=false`.

### 5.4 Questions needed for the 10-test floor

| section | per form | × 10 | stimuli |
|---|---|---|---|
| Grammar | 13 P1 + 12 P2 = 25 | **250** (130 completion + 120 error-ID) | — |
| Listening | 4 + 4 + 6 = 14 | **140** | 40 short dialogues + 10 conversations + 10 lectures = 60 audio scripts |
| Reading | 2 + 4 + 6 = 12 | **120** | 20 short texts (or 10, see §2C) + 10 × 200-word + 10 × 500-word passages |
| **MC total** | 51 | **510** | |
| Writing | 2 | 20 prompts (10 note + 10 opinion) | |
| Speaking | 2 | 20 prompts (10 personal + 10 two-sided audio statements) | |
| **All** | | **550** | |

These are clean, released counts. `form-capacity.mjs` binds on the thinnest PART, not the section total, so each
part pool must reach its own count. Authoring has to run ahead of the gate's yield. Within a part, keep the
difficulty spread: Part 1 skews easy, and Parts 2-3 run medium to hard.

### 5.5 Recommended pilot: Grammar

- **No audio and no passages.** It is the cheapest section per item and it reuses the MAP Language Usage and SAT SEC
  experience: four-option sentence grammar, and the same "no disputable errors" list.
- **It is the largest pool (250, 49% of the MC need)**, so it dominates the timeline and should start first.
- **Risks to pre-register:**
  1. The demo's own Part 1 sample has options that are ungrammatical in ANY sentence. Those options are dead without
     the stem, so the options-only attack would flag them. Our items must make every option well-formed in some
     context (the brief requires this).
  2. Error-ID options are positional. The key's position in the sentence must be at base rate (randomise the slot
     before authoring; never forbid a slot).
  3. The options-only instrument may **saturate** on grammar, as it did on ACT Reading, because the model knows the
     construct. There is no shipped iTEP control, so use the live MAP Language Usage grammar rows (also four-option)
     as the matched control. Check the control's ceiling before fixing the bars (CLAUDE.md).
  4. The with-source half decides exclusivity: exactly one completion is correct, and exactly one marked segment is
     wrong. Daniel's sitting is the human gate.
- **After Grammar:** Reading (Part 2 and 3 passages through the split attack), then Listening (reuses the TOEFL TTS
  pipeline once the runner helper exists), then Writing and Speaking as unscored practice.

Draft pilot brief: `scripts/study-bank/briefs/itep-slate-grammar-v1.md`.

## 6. Open items for the owner

1. **Pricing per section.** Suggested 2 each; Grammar possibly 1.
2. **Show Writing and Speaking as unscored practice feedback** until there is calibration data (recommended).
3. **The Reading Part 1 shape**: one text with 2 questions, or two texts with 1 each. Finish the demo's Grammar and
   Listening to see Reading, or ask an iTEP partner.
4. **The 싱가로유학 listing.** If it states a required level (for example 4.5+), that becomes the target band for our
   difficulty mix.
