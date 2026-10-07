# SSAT Reading pilot 5: axis-aligned single-passage sets, built the SAT R&W way. Pre-registered 2026-10-07 (before any item exists)

Owner idea, 2026-10-07: SSAT Upper reading is SAT-level content, only easier, so build it the way SAT
R&W succeeded. Pilots 1-4 (REGISTER A76, A77, A78, A80) all used passage VERSIONS with a randomised
key to kill the options-only leak, and every one then failed on quality: naturalness (1, 2),
difficulty (3, 4), exclusivity (4). This pilot drops versions entirely and takes the leak control from
the option FRAME instead (CLAUDE.md: "an item leaks when the options differ along the axis the stem
names"; the clean `rsw` sets hold every option in one frame varying only a fact).

## 1. What SSAT Upper Reading is, in code and in the official source

**In code** (`src/lib/study/admission-tests.ts`): `ADMISSION_BLUEPRINT.ssat` reading = **40 questions,
40 minutes, `choiceCount: 5`**; `ITEMS_PER_PASSAGE.ssat = 6`; `drawByPassage` spreads 40 over 7
passages as 6,6,6,6,6,5,5. `src/lib/test-specs.ts` (SSAT Upper Level, grades 8-11) describes ~7
passages of 250-350 words, half literary. Live passages measure 303-340 words (the six frozen in
`ssat-wv3-pilot/natlive.json`). **Blueprint question counts are not changed by this pilot.**

**Official question-type mix.** The Enrollment Management Association, *2022-2023 Interpretive Guide
for the Middle & Upper Level SSATs*, https://info.enrollment.org/hubfs/SSAT/PDF/2022-2023%20EMA%20M-U%20Interpretive%20Guide.pdf
(retrieved 2026-10-07, read with `pdftotext -layout`):

- p. 6, Reading Comprehension Section: 40 questions; passages narrative (literary fiction, poems,
  essays) and argument; "typically 100 to 350 words"; questions ask the taker to recognise the main
  idea, locate details, make inferences, derive the meaning of a word or phrase from context,
  determine the author's purpose, determine attitude and tone, understand and evaluate
  opinions/arguments, and make predictions.
- pp. 8 and 11 (sample school and family score reports) and p. 14 (definitions): Reading has exactly two reported subscores, **"Reading Main Idea
  & Content Total: 20"** and **"Reading Higher Order & Interpretation Total: 20"**. Main Idea and
  Content = main-idea statement or title questions plus "details from a passage that support the
  author's thesis". Higher Order and Interpretation = "reason, draw inferences, and apply
  information, recognize meaning not directly stated in a passage, and identify such elements of the
  passage as the author's logic, style, and tone".

So the real mix is **20 / 20 (50% / 50%)**. The guide does not say which side vocabulary-in-context
falls on; this document counts it as Higher Order ("meaning not directly stated"), which is the
assignment that gives the *clean* types the least room, so it cannot flatter the design. No
finer-grained official percentages exist; third-party "13% each" tables were found and not used.

**The live bank leans the other way.** 138 drawable items (bank-state 2026-10-07): main-idea 21,
detail-family 31, cause 2 (Main Idea and Content, about 54 = 39%) against inference 22, attitude 20,
purpose 19, vocabulary 23 (Higher Order, 84 = 61%).

## 2. The design (how it differs from pilots 1-4)

| | pilots 1-4 | pilot 5 |
|---|---|---|
| passage | 5 versions, one drawn by hash after freeze | ONE passage |
| key | randomised by the draw | authored |
| leak control | key independent of option text by construction | option FRAME: all five options satisfy the stem equally; only the passage decides |
| question mix | 1 each of main-idea, detail, inference, vocab, attitude, purpose (pilot 4: weighted to inference) | official 50/50: per passage main-idea 1, **evidence 1, detail 1** (MI&C 3); **vocab 1**, structure 1, attitude-or-inference 1 (HO&I 3) |
| attitude | five feeling words (pilot 4: near-synonym second answers) | the feeling is in the stem; the OBJECT varies (five passage entities) |
| absent options | pilot 4 rule A (lexical, pre-flight), recorded by a reviewer | lexical pre-flight AND a deciding reviewer bar (G) |
| detail | free | declared slots; every slot value in the passage and in exactly one option (no slot-mode tell) |
| evidence | not used | five verbatim passage sentences; the claim uses a referent only the passage defines |
| source material | invented | P01 newly written fiction; P02 nonfiction built from a public-domain text (pre-1931 or U.S. federal) |
| SAT reuse | none | each unit adapts >= 1 clean-stratum SAT R&W item (offered list frozen in `ssat-ax1-pilot/sat-sources.json`: 4 words-in-context from `rw-v15/16-wic`, 3 one-frame "notes" items from `rsw-v1`/`rsw2`), source id and changes recorded |
| options-only attack | non-vocabulary items only | **all 12 items, vocabulary included** (`ssat-wv.mjs build --iso-all`) |
| cross-version D | yes | not applicable (no versions); replaced by G |

**Caveat recorded before running.** The "evidence" type has no measured clean result in this repo:
CLAUDE.md's clean strata are transitions, words in context and numeric/one-frame items. Evidence
items are inherently at risk because "supports" is a relation between stem and option; the brief's
mitigation (a claim whose referent only the passage defines) is untested. And the words-in-context
**gloss** shape (several dictionary senses of one headword) measured 88.9% options-only on SAT
(A64); the brief asks for >= 3 non-dominant senses so the "unusual sense" prior cannot single out the
key, which is also untested. Including vocabulary in A can only raise the candidate's rate, never
lower it.

## 3. Authoring protocol

- Brief `SSAT-AX1-AUTHOR-BRIEF.md` (committed with this file). Two **fresh** Claude author agents:
  **P01 narrative fiction, newly written, `attitude`**; **P02 nonfiction from a public-domain text,
  `inference`**. Files `ssat-ax1-p01.ax.json`, `ssat-ax1-p02.ax.json`, ids `AX1-P01`, `AX1-P02`.
- Each author gets ONLY the brief and the SAT source items in its prompt, writes to the scratchpad,
  and is told not to open `scripts/study-bank/` or run anything there. Authors never see this file,
  any checker, or any pilot 1-4 item. The orchestrator runs `ssat-ax.mjs check` and returns its
  PROBLEM lines verbatim (mechanical only; the deciding bars are never shown). At most one fix round,
  by a fresh agent given only the PROBLEM lines, the brief and the file.
- Each author states at the end whether it opened any other file.

### Pre-flight (`node ssat-ax.mjs check`, refuses on any problem; `selftest` break-tests 14 refusals)

Passage 280-380 words, >= 3 paragraphs; source recorded; exactly the mix above; 5 distinct choices;
explanation and every kill quote verbatim; vocabulary word present in the passage; evidence choices
verbatim passage sentences (length ratio <= 2.0); other choices length ratio <= 1.6; no absent
option (pilot 4 rule A: >= ceil(n/2) of a choice's distinctive words stem-matched in the passage);
detail slots: 5 distinct values each, every value in the passage and in exactly one choice; key
uniquely longest on <= 2 of 6; key's distinctive words never in another question's stem; >= 1
`adapted_from` whose id is in `sat-sources.json`. Reported, not deciding: a lexical word-match solver
and MIC/HOI counts.

### Freeze

After `check` passes, the two `.ax.json` files are committed, then `ssat-ax.mjs batch
ssat-ax1-pilot <files>` records `frozenSha` (sha256 over the bytes in sorted path order) and
`ssat-wv.mjs build ssat-ax1-pilot --iso-all --natlive ssat-wv3-pilot/natlive.json` renders every
instrument (letters dealt by the build's seeded RNG, so authors' letter choices do not reach any
file). Renders are committed before any grader or solver runs. No text changes after the freeze.

## 4. Instruments (prompts frozen now)

- **A (iso, three samples) and B (grouped, three samples)**, each a fresh agent, pilot 4's prompt
  verbatim:
  > The passages for these reading-test questions have been removed. For each question, pick the
  > answer letter (A-E) you think is most likely correct. Each question has exactly one correct
  > answer. Give a pick for every question. Return JSON {"labels": {"<qid>": {"pick": "<letter>"}, ...}}.
  A: `iso.json` = all 12 candidate items shuffled into the same 48 live control items
  (`ssat-reading-diag/taskF.json`), no sibling adjacent. B: `grp-1.json` + `grp-2.json`.
- **C+F (two graders)** on `withsource.json`, pilot 4's prompt verbatim:
  > Below are reading passages, each followed by five-choice questions. Answer each question as a
  > careful expert test-taker. For each give: "pick" (A-E); "second_defensible" (the letter of any
  > other choice a careful reader could also defend from the passage, or "none"); "difficulty"
  > ("easy", "medium" or "hard" for a strong upper-level SSAT student reading this passage); and a
  > one-sentence "note" giving your reason. Return JSON {"labels": {"<qid>": {...}}}.
- **G (one reviewer)** on `withsource.json`:
  > Below are reading passages, each followed by five-choice questions. For each question, list in
  > "absent" the letters of any answer choices that concern something the passage never mentions or
  > discusses at all (a person, thing, event, number or idea that does not appear in the passage). A
  > choice the passage mentions but shows to be wrong is NOT absent. For questions that ask what a
  > word means, return an empty list. Give a one-sentence "note". Return JSON
  > {"labels": {"<qid>": {"absent": [...], "note": "..."}}}.
- **E (two judges)**: pilot 3's neutral prompt verbatim (SSAT-READING-WV3-PREREGISTERED.md bar E) on
  the 2 candidate passages + the 6 frozen live passages, shuffled by `build --natlive`.

Claude subagents only (never GPT), at most 2 at a time, each fresh. The A/B samples are one solver
sampled three times, not three raters.

## 5. Bars (pilot 5 passes only if ALL pass)

| bar | pass | range check |
|---|---|---|
| **A** options-only isolated, 3 samples pooled (36 candidate picks, 144 control picks) | **supports:** candidate <= 40% (<= 14/36) AND control <= 40%. **fails:** candidate >= 60%. **between:** not passing. **invalid:** control outside 10-45% (re-run the control, do not read the candidate). | Control measured 24.3% (A69) and 26.4% (A76); shipped bank 21.1% model / 15.0% human (`bank-state sittings`: `ssat-cofounder-2026-09-12` 15.0%, n=20); five-choice chance 20%. The control sits 13.6+ points under the 40% line and inside its validity window, so both bars are reachable; the candidate spans 0-100%. Unlike pilots 1-4 the key is authored, so a high number here is a real leak, not draw noise. |
| **B** options-only grouped, 3 samples pooled (36 picks) | **<= 40%** | 0-100%, chance 20% |
| **C** with-source exclusivity, 2 graders | item passes if both pick the key and neither names a second defensible choice; **>= 10 of 12** | 0-12 |
| **F** difficulty, from the C graders (easy 1, medium 2, hard 3) | item easy if mean <= 1.5; **<= 6 of 12 easy** (the pilot-4 bar) | 0-12 |
| **G** absent option, 1 reviewer | non-vocabulary items with any choice flagged absent **<= 1 of 10** | 0-10 |
| **E** relative naturalness, 2 judges | pooled candidate median (n=4) **>=** pooled live median (n=12); judge with a missing rating/reason or all-identical ratings is discarded and replaced; live median 1 = INVALID, re-run once | live median measured 2 on this frozen set in pilot 3 (pilot 4 never ran E), so E can pass and fail |

Scored by `ssat-wv.mjs score ssat-ax1-pilot --ws ... / --nat3 ... / --iso ... / --grp ...` and
`ssat-ax.mjs absent ssat-ax1-pilot <G file>`. Recorded, not deciding: per-kind A rates (vocabulary
and evidence separately), the candidate's unanimous-correct rate against the control's through the
same samples, the graders' notes.

**Order (cheapest decisive first): C+F, G, E, A, B. Stop at the first failure. No repair round.**

## 6. If and only if every bar passes

Insert the 12 items **STAGED (`verified=false`)** as cohort `ssat-reading-ax1`, passage groups
`ax1-P01`, `ax1-P02`, `source='hand'`, with `verify_meta` naming this file, the bars and the
adapted SAT ids. Not verified: SSAT Reading is a family where the model attack discriminates, but
bank-gate §5 still makes a human sitting the verdict for a verbal cohort, so the recommendation is a
human sitting before release. Forms are unchanged by a staged insert.

If it fails: nothing is inserted, the failure and its mechanism go to REGISTER §5 and B10 in the same
commit.
