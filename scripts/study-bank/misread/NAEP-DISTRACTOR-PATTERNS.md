# NAEP Reading: how the wrong options are built (a model for our writers)

Built 2026-10-07 from the NAEP Questions Tool (NQT). This is a **guide to how
NAEP's distractors work**, not a copy of NAEP. No passage text appears here.
NAEP question and option text is public domain (NCES), but it is quoted only
in short fragments, where an example needs one. The licence review is in
`docs/research/reading-item-sources-2026-10-07.md`.

> SOURCE (for every NAEP fragment and statistic below): U.S. Department of
> Education, Institute of Education Sciences, National Center for Education
> Statistics, National Assessment of Educational Progress (NAEP), 1992, 2000,
> 2003, 2011 and 2013 Reading Assessments.

Taxonomy ids H1-H10 are the ones in `prompts.md` §1. Codes X1-X4 and V1-V4
were added for this analysis and are defined in §1.

---

## 0. What was measured, and how far to trust it

**Data.** The NQT endpoints listed in the research doc work as of 2026-10-07
(the reproduction recipe is in §6). All 330 grade-4 and grade-8
selected-response items were requested one at a time, about 1 s apart. For
each item that has data, `GetItemPerformanceData` returns the **national
percent choosing every option**, not just percent correct. That is the most
useful thing in the NQT for us, because it shows which wrong option pulled
students, and how hard.

| | count |
|---|---|
| G4+G8 selected-response items | 330 |
| options hidden in the NQT (`hideMCDistractors=1`; every 2017+ digitally based block) | 146. **Not usable**: no option text |
| 4 visible options + key + national per-option % | 240 |
| …of which the block's passage (or its summary) is in the item HTML | **206 items, 618 distractors, 41 blocks**. This is the coded set. |
| …passage only as a PDF link | 34. Used only in the mechanical stats (length, letter) |

Coded set: G4 108 items (57 literary, 51 informational), G8 98 items (37
literary, 61 informational), covering 1992-2013. Every item has exactly **4
options**. Two blocks were given at both grades with the same items (the
2013 shark article and "La Ñapa"). Those 13 items are counted once per
administration, because their statistics differ.

**Coding.** Six fresh Claude agents coded about 34 items each against a fixed
scheme. Each read the passage and coded each wrong option's misreading type,
the question category, inference distance, evidence location, whether the
key is the most general option, and whether one passage sentence kills the
distractor. Option lengths, key letters and all percentages were **computed,
not coded**. 29 items come from blocks where NAEP withheld the passage and
shows only a summary. They are flagged `low_confidence`.

**Agreement check.** A seventh agent recoded a random 36 items (108
distractors) blind:

| field | agreement |
|---|---|
| distractor type, exact | 72% (κ = 0.69) |
| type, matching either coder's primary or secondary code | 86% |
| type, coarse family (scope / unsupported / lifted / mismatch / contradicted / partial / vocab) | 80% |
| single-sentence kill | 96% |
| question category | 31/36 |
| inference distance | 30/36 |

The commonest disagreements were **V3 vs X3** (a vocab distractor that is
"just a different meaning" vs "not supported") and **H7 vs H9** (a detail
attached to the wrong thing vs words lifted from nearby). **Both coders are
the same model** (see CLAUDE.md, "three solvers are one solver"), so 72%
overstates real reliability. Treat counts within a few of each other as ties.
Trust the big contrasts in §3, not the rank order of the small types.

**Hard items are scarce.** Only **10** coded items are below 40% correct.
The §3 contrasts therefore pool <40 with 40-49 (27 items) wherever n matters.

---

## 1. Distractor types: counts

Codes (one primary code per distractor):

| code | type |
|---|---|
| H1 | detail-as-main-idea |
| H2 | over-generalisation / one step too far |
| H3 | author/character conflation |
| H4 | first/last-section only |
| H5 | literal reading of figurative language |
| H6 | prior knowledge over the text |
| H7 | wrong referent: a real detail attached to the wrong person, thing, time or device |
| H8 | reversed cause/sequence |
| H9 | keyword match: lifts salient words from near the target spot, does not answer |
| H10 | literal only: restates the surface event, stops short of the needed inference |
| X1 | true-but-not-answering |
| X2 | partial truth: one element right, one wrong |
| X3 | unsupported: plausible, but the text never addresses it |
| X4 | contradicted: the text says the opposite |
| V1 | another real dictionary sense of the word |
| V2 | sense of a look-alike or related word |
| V3 | contextually plausible substitute that fits the sentence but not the author's sense |
| V4 | right semantic field, wrong shade (too strong, wrong valence) |

### 1.1 Overall (618 distractors)

| type | n | share | mean % of students choosing it | times it was the item's strongest distractor |
|---|---|---|---|---|
| X3 unsupported | 106 | 17% | **7.4** (weakest) | 20 |
| H9 keyword match | 92 | 15% | 10.9 | **37** |
| X4 contradicted | 57 | 9% | 9.8 | 17 |
| H7 wrong referent | 52 | 8% | 11.9 | 24 |
| V3 context-fit substitute | 52 | 8% | 12.2 | 22 |
| H6 prior knowledge | 46 | 7% | 11.6 | 20 |
| H1 detail-as-main | 35 | 6% | 12.3 | 14 |
| X2 partial truth | 28 | 5% | 13.1 | 16 |
| X1 true-not-answering | 28 | 5% | 11.2 | 10 |
| H2 over-generalisation | 25 | 4% | 12.2 | 11 |
| V4 wrong shade | 20 | 3% | 11.4 | 7 |
| H4 first/last section | 19 | 3% | 8.3 | 4 |
| H10 literal only | 15 | 2% | **16.3** (strongest) | 11 |
| V1 other dictionary sense | 14 | 2% | 10.7 | 7 |
| H8 reversed cause/sequence | 13 | 2% | 14.0 | 6 |
| H5 literal figurative | 12 | 2% | 9.1 | 3 |
| V2 look-alike word | 4 | 1% | 11.0 | 2 |
| H3 author/character conflation | **0** | 0% | n/a | n/a |

**Two things to take from this table:**

- **NAEP's commonest distractor is also its weakest.** About a sixth of all
  NAEP wrong options are "plausible but not in the text" (X3). Students choose
  them least, and they make up most of the dead options on easy items. They are
  filler.
- **The options that actually pull students are anchored in the passage.**
  H10, H8, X2, H1, H2 and V3 each average 12-16%. In every one of them, the
  wrong option is built from something the text really says.

**H3 never occurs.** No NAEP G4/G8 MC item tests author vs character
viewpoint. That is a gap in the NAEP model, not evidence that the error is
rare.

### 1.2 By question category

The category is the coder's label for what the stem asks. "Detail" means
locate/recall of stated information. "Character" means trait, feeling or
motive.

| category | items | distractors | most common types (n) |
|---|---|---|---|
| detail | 59 | 177 | H9 40, X3 29, H6 27, H7 25, X4 24, X1 9, H2 8, X2 6, H8 6 |
| vocab in context | 49 | 147 | **V3 52**, V4 20, H9 15, X3 14, V1 14, H5 10, H7 7, V2 4 |
| inference | 22 | 66 | X3 18, H7 9, X4 9, H6 9, H9 6, H10 4 |
| character | 18 | 54 | X3 13, H7 9, X4 8, X2 7, H9 5 |
| main idea | 16 | 48 | **H1 16**, H4 9, X3 8, H9 6 |
| author's purpose | 16 | 48 | H9 11, H1 9, X3 9, H10 5, H2 5, H4 4 |
| text structure | 10 | 30 | X3 7, H1 5, then 2-3 each of X4, H6, H9, X2, H8 |
| evaluate (best support, technique) | 7 | 21 | **X1 8**, X3 4, H1 3, X4 3 |
| theme | 5 | 15 | X2 4, spread |
| perspective / tone | 4 | 12 | X4 4, H9 3 |

Each category has a recipe:

- **Main idea:** 13 of 16 items carry at least one **H1 or H4** option: a real
  section or vivid detail presented as the whole.
- **Detail:** the lures are **H9** (the words are right next to the answer),
  **H7** (a real fact from the passage, attached to the wrong thing) and **H6**
  (what you would expect from life, not what this text says).
- **Vocab:** the lures are overwhelmingly **V3**, meanings that fit the
  sentence and its mood. A different dictionary sense (V1) is uncommon; see §2.4.
- **Evaluate ("which statement is supported"):** the lures are **X1**, true
  things that do not answer the specific question.

---

## 2. Structural habits

### 2.1 Length parity: there is no length tell

Computed over all 240 items with options and statistics:

| key length rank (1 = longest of 4) | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| items | 57 (24%) | 72 (30%) | 66 (28%) | 45 (19%) |

- The key is **longest only 24% of the time**, below the 25% you would get by
  chance. Compare our own 74.3% (CLAUDE.md, "key length rank").
- Within an item, the median ratio of longest to shortest option is **1.38**.
  Only 7.5% of items have an option more than twice another's length.
- NAEP writes all four options in **one grammatical frame**: every option
  completes the stem's sentence, in the same part of speech and at roughly the
  same length. For example, a "planets where…" stem gets four "living things /
  life …" clauses.
- Key letters: A 56, B 65, C 67, D 52. Balanced.

### 2.2 How often the key is the most general option

Overall 42/206 (20%). It depends entirely on the question type:

| category | key is most general |
|---|---|
| main idea | **13/16** |
| purpose | 7/16 |
| structure | 4/10 |
| theme | 3/5 |
| evaluate | 3/7 |
| inference | 4/22 |
| character | 3/18 |
| detail | 2/59 |
| vocab | 2/49 |

So on main-idea items **the most abstract option is usually right**, and the
distractors are narrower true pieces (H1/H4). This is a real, learnable tell
inside NAEP: a test-wise student who picks "the broadest option" on a
"mostly about" stem wins about 80% of the time. **Do not copy it.** For our
items, at least one main-idea distractor should be as broad as the key but
wrong (an H2 over-generalisation, or a broad statement of the wrong topic),
so that breadth stops deciding the item.

### 2.3 Plausible yet provably wrong: how NAEP does it

- **Most distractors are not in the text.** Only 37% (233/618) have content
  that actually appears in, or is true of, the passage. But **139/206 items
  (67%) carry at least one in-text distractor**, and students choose in-text
  distractors more (12.9% vs 9.5% on average). The usual mix is **one
  in-text lure plus one or two out-of-text fillers**. Only 24 items have
  three in-text distractors.
- **Variety inside an item.** 96 items use three different misreading types
  for their three distractors, 102 use two, and only 8 repeat one type three
  times.
- **What makes a distractor wrong:**
  - **in-text lures** (H7, H9, X1, H1) are wrong because they are *misplaced*:
    wrong referent, wrong moment, wrong scope, or they answer a different
    question.
  - **out-of-text lures** (X3, H6) are wrong because nothing supports them.
    NAEP accepts "unsupported" as "provably wrong" at G4/G8.
  - **X4** distractors are wrong because one line of the passage contradicts
    them.

### 2.4 Vocabulary in context: how the wrong meanings are chosen

- **The stem is phrase-level, not dictionary-level.** 36 of 49 vocab items use
  "On page N, the article says … X … This means that …". Students choose a
  paraphrase of the whole clause. Only 4 of 49 have one- or two-word options (for
  example "ingenuity" → cleverness / fame / stubbornness / gratitude).
- **Most distractors are context-fit substitutes (V3), not other dictionary
  senses.** V3 accounts for 52 of 147 vocab distractors. V1 accounts for 14,
  and only 11 of 49 items contain a V1 at all. The V3 option is built to fit
  **both the sentence's grammar and the passage's mood.** For example, in a
  segregation article, "prestigious locations" drew 34% to "open to people of
  all races" against 29% for the key (2011 G4). In an essay about fun, "treat
  fun reverently" drew 40% to "look forward to having fun" against 49% (2013
  G8).
- **When NAEP does use V1, it is the commonest everyday sense of the word.**
  "Just punishment" drew 29% to the *only/merely* reading, "only for a short
  time" (2013 G4). "Puritans" offers the historical senses (lived long ago;
  plain dark clothing) against the figurative "serious and reserved" (2013 G8,
  74%).
- **V2 (look-alike) is rare but strong when it fits.** A word that looks
  like "urban" pulled 26% to a city-life meaning (2011 G8, key 36%).

### 2.5 Can one sentence kill a distractor?

Rarely: **49/618 distractors (8%)**, spread over 38 items.

| category | distractors killable by one sentence |
|---|---|
| detail | 25/177 |
| inference | 7/66 |
| vocab | 6/147 |
| evaluate | 5/21 |
| main idea | 1/48 |
| purpose | 0/48 |
| structure | 0/30 |
| theme | 0/15 |

They are not weaker than other distractors (11.7% vs 10.7% chosen): a G4/G8
reader often does not go back to find the killing sentence. This is a
**permissive** NAEP habit. Our own assembler rule (`prompts.md` §5,
`single-sentence-kill` ineligible) is stricter, and should stay so, because
SSAT/MAP upper-band readers do scan back.

---

## 3. Difficulty anchors

### 3.1 Distribution (national % correct, the 206 coded items)

| % correct | <30 | 30-39 | 40-49 | 50-59 | 60-69 | 70-79 | 80-89 | 90+ |
|---|---|---|---|---|---|---|---|---|
| items (all 240) | 2 | 8 | 20 | 40 | 57 | 58 | 44 | 11 |

| band | coded items | G4 / G8 | mean % correct |
|---|---|---|---|
| hard <40 | 10 | 5 / 5 | 34.4 |
| 40-49 | 17 | 13 / 4 | 45.0 |
| 50-75 | 111 | 61 / 50 | 63.6 |
| easy >75 | 68 | 29 / 39 | 83.1 |

### 3.2 What does NOT separate hard from easy

Most of what we would expect to matter barely moves the mean. Coded means:

| | mean % correct |
|---|---|
| question category | 58-71 for every category; perspective 58 and evaluate 62 are lowest, character 71 highest |
| inference distance 0 / 1 / 2 / 3 | 70 / 67 / 68 / 65, so r = −0.08 |
| evidence early / middle / late / whole | 67 / 66 / 67 / 69 |
| G4 informational | 63 |
| G4 literary | 66 |
| G8 informational | 69 |
| G8 literary | 71 |

The hard band is not made of "deep inference" items. Its 10 items are 3
detail, 2 vocab, 2 main idea, 1 inference, 1 perspective and 1 evaluate.
Five of them have inference distance 1, and four have their evidence
**early** in the passage.

### 3.3 What DOES separate them: the strongest distractor

| band | strongest / 2nd / 3rd distractor, mean % choosing | items with a dead (≤3%) distractor | strongest distractor is in-text |
|---|---|---|---|
| <50 (27) | **30.9 / 17.4 / 10.0** | **0** | 60% (hard <40 only) |
| 50-75 (111) | 18.8 / 10.9 / 6.1 | 19 | 51% |
| >75 (68) | 8.5 / 5.0 / 3.0 | **46** | 49% |

Some of this is arithmetic: if fewer students get the item right, more choose
wrong options. The point is **where** those wrong answers go. In hard items
they concentrate on **one** lure, which averages a third of the cohort.
**In 8 of the 27 items under 50%, the top distractor came within 5 points of
the key, or beat it.** Easy items have a dead option in two thirds of cases.

**The ten hard items, by what pulled students:**

| item | % correct | category | what pulled students | lure type |
|---|---|---|---|---|
| 1992 G4 | 25 | evaluate ("which statement is supported") | 47% chose a statement reusing a passage name with the wrong relation (she was *honoured by* a hall of fame, not *its founder*) | **H9** |
| 2011 G4 | 29 | vocab | 34% chose a meaning matching the article's theme rather than the word | **V3** |
| 2003 G8 | 31 | detail, two rules combined | 48% chose an option with one rule right and the other wrong | **X2** |
| 1994 G8 | 36 | perspective | 32% chose a stereotype of the character type | H9/H6 |
| 2000 G4 | 36 | inference | 33% matched the right object to the wrong setting (two heating devices described side by side) | **H7** |
| 2011 G8 | 36 | vocab, rare word | 26% chose a look-alike meaning | **V2** |
| 1992 G8 | 37 | detail | 34% chose what everyone knows about the topic, which also appears in the same sentence | **H6** |
| 2003 G4 | 37 | main idea | 28% chose one long, vivid section as the whole; the key is abstract | **H1** |
| 2013 G4 | 38 | detail | 39% chose the vivid scene a moment later than the one asked | **H7** |
| 2011 G8 | 39 | main idea | 32% chose what readers already believe about the famous subject, which the sketch argues against | **H6** |

**Recipe for a hard item, from these ten:** keep the question short and
local, and build **one** distractor from **real passage content placed
wrongly** (wrong referent, wrong moment, wrong relation), or from **the
reader's prior belief, which the passage corrects**. Then make the other two
distractors live (≥10%), not filler. None of the hard items gets its
difficulty from an obscure key or a long inference chain.

### 3.4 Which lures attract

| band | strongest-distractor type, by frequency |
|---|---|
| hard <40 | H9 2, H6 2, H7 2, V3, V2, H1, X2 |
| 40-49 | V3 4, H9 2, X4 2, H10 2, H6 2, … |
| 50-75 | H9 19, V3 9, H2 9, X4 8, H7 8, H6 8, X1 7, H1 7 |
| easy >75 | H7 11, H9 11, X3 9, V3 6 |

On easy items the second and third options are mostly **X3 filler**: 45 of
the 204 easy-item distractors are X3, and 68 of those 204 are chosen by 3%
or fewer.

### 3.5 The lure belongs to the item, not to the grade

The 13 items given at both grades rose by **0 to 32 points** from G4 to G8,
mostly +20 to +30. **The same wrong option stayed the strongest lure in 9 of
13**; it just drew fewer students. The one item that did not move at all
(62% → 62%) was a "main purpose" item whose lure is H1: a true sub-topic
offered as the purpose. **Detail-as-purpose does not fade with two more
years of schooling.** That is one item, so treat it as a hint, not a finding.

For us: difficulty comes from which wrong option is in the set. A stronger
reader just resists the same lure more often. Calibrate the lure, not the
passage.

---

## 4. Checklist for distractor selectors and graders

Apply this per item. "Live" means we expect at least 10% of the target cohort
to choose it.

**Structure**

1. All four options complete the stem in one grammatical frame, and the
   longest is under about 1.5× the shortest. The key must not be the longest
   more than about a quarter of the time across a batch (NAEP: 24%).
2. **Main-idea / purpose / theme:** at least one distractor is **as broad as
   the key** (H2, or a broad statement of the wrong topic). NAEP's key is the
   most general option on 13/16 main-idea items. Do not inherit that tell.
3. The three distractors use **at least two different misreading types**.
   NAEP: 198/206 items.

**Each distractor**

4. Name its type (§1 codes) and say in one line **why a real reader picks
   it**. "It is plausible" is not a reason; that is X3, the weakest type
   (7.4% mean).
5. At most **one X3 / unsupported filler** per item. If an item has two, swap
   one for a passage-anchored lure (H7, H9, H10, X2, H1).
6. It is wrong by **one checkable fact**: wrong referent, wrong moment, wrong
   relation, wrong scope, one element false (X2), or contradicted (X4). It
   must not be "arguably also right".
7. **Single-sentence kill:** if one passage sentence negates its exact words,
   it is too easy for our upper bands. Reject it (NAEP tolerates this on 8%;
   we do not).

**Vocabulary in context**

8. Ask about the phrase in use ("This means that…"), with clause-level
   options.
9. At least one **V3**: a meaning that fits the sentence **and the passage's
   mood or theme**, but is not the word's sense. This is NAEP's strongest
   vocab lure: it beat the key on one hard item (34% vs 29%) and drew 40%
   against 49% on another.
10. Use a **V1** (another real sense) only when it is the word's commonest
    everyday sense. Rare dictionary senses are filler.

**Difficulty targeting (to aim an item at <50%)**

11. The hardness comes from **one strong lure built from real passage
    content placed wrongly** (H7 / H9 / X2), or from **prior belief the
    passage corrects** (H6). Not from a long inference chain: in NAEP,
    inference distance does not predict difficulty (r = −0.08).
12. No dead options: in every NAEP item under 50%, all three distractors
    drew more than 3%.
13. After piloting, read the **option-level** percentages, not just percent
    correct. If one distractor is ≥ the key, it is either a great lure or a
    second correct answer. Re-check exclusivity before keeping it.

**What NAEP cannot teach us**

14. Author/character conflation (H3) appears **zero** times in NAEP G4/G8 MC.
    Write it from our own taxonomy.
15. NAEP's hard items are rare (10/206), and these are national,
    low-stakes, all-student percentages. An "easy" NAEP G8 item (>75%) is not
    an easy SSAT item. Use NAEP for **how lures are built**, not for where our
    difficulty cut-points sit.

---

## 5. Limits

- Every coding is a model judgement, from one model family. Agreement on a
  blind recode was 72% exact (κ 0.69). The two coders are correlated, so real
  inter-rater reliability is lower. Counts within ~3 of each other are ties.
- 29 coded items (the "La Ñapa", "Hungry Spider" and "Flying Machine" blocks,
  plus a few items that depend on photographs or ad-placement rules) were
  coded from NAEP's passage summary. They are flagged `low_confidence`.
- Every 2017+ digitally based item hides its options in the NQT, so this
  describes **1992-2013 paper-era items only**.
- Percent correct is national, all students, from the item's own
  administration year. NQT's own bands are easy >60, medium 40-60, hard <40.
  This file uses <40 and >75, as requested.

## 6. Reproduction (polite: one request at a time, ≥1 s apart)

Base `https://www.nationsreportcard.gov/nqt/api/`. Python's bundled certs
failed TLS here, so use `curl`.

1. `POST querypanel/subjectgradeinfo` with
   `{"subjectCode":"RED","gradeStr":"8","systemID":"1"}`. Set every
   `yearsInfo[].isSelected=true` in the response and `POST` the whole object
   to `queryresults/getTabular`. That returns all 317 G8 items (286 for G4)
   with `difficulty`, `hideMCDistractors` and `itemTableIDAsInt`. The
   item-type filter in the payload is ignored, so filter `type` in
   (`MC`,`SR`) yourself.
2. `GET queryresults/GetItem?tableID=<id>` returns item HTML (passage, stem,
   `<div class="distractors">`). The key is in
   `GET queryresults/GetItemScoreGuide?tableID=<id>`.
3. `POST queryresults/GetItemPerformanceData` with
   `{"itemTableID":<id>,"ndeSystemId":"1","subjectCode":"RED","jurisdictionsSelected":"NT","output":0,"showStandardError":false,"statistics":["MN","RP"],"variablesSelected":"TOTAL"}`
   returns the national percent per option. The key's label carries `*`.

The harvested JSON, the per-item codings and the scripts are in the session
scratchpad, not the repo, because they contain passage text.
