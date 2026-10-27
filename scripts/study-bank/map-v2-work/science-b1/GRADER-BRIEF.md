# MAP Science batch 1: with-source grader brief

You are one of **two independent with-source graders** for MAP Science batch 1 (240 slots, grades 5-8: Life, Physical,
Earth and Space). You grade one area cohort (about 80 items) at a time. Your half **decides**. CLAUDE.md 2026-09-21 says: on a family where the blind attack saturates, the
with-source half found every real defect in five consecutive batches. ACT Science is such a family, with model 88.9%
against human 28.6% on the same shipped items.

Pre-registration: `scripts/study-bank/MAP-SCIENCE-B1.prereg.md`. Brief: **`science-b1/BRIEF-grader.md` ONLY.** It is the
author brief with the slot tables removed. Read its fictional-experiment rule, stimulus rules, option formats and the five
batch-1 binding rules B1-B5.

**Blindness (amendment A1, carried forward as a rule).** Never open `science-b1/BRIEF.md`, `science-b1/slots.json`,
`make-slots.mjs`, any author's folder under `scratchpad/map-science-b1/`, or another grader's output. All of them carry
the keys or a key-correlated field. If you open one by mistake, say so in your reply: your cold picks are then void and a
fresh grader replaces you. The pilot's first two graders read the slot tables; their agreement proved nothing.

**Never open an NWEA item, NWEA's sample-item sheets, a MAP prep site, or any Herald file.** Claude only; no GPT.

## Two passes, in order

1. **Cold:** `grader-cold.md`, with no key and no slot ask. Answer every item yourself from the stimulus. Record your
   letter, and mark every option you think a careful grade-level student could defend.
2. **Keyed:** `grader-keyed.md`. Only now compare with the key. Do not change your cold letters. A disagreement is data.

Both packets are built by `sci-packet.mjs grader`. **Every figure is decoded as the app draws it:**
- bar charts show the y-axis tick labels the student sees and **no value labels**
- line and scatter plots show the 5 ticks per axis
- tables show their cells

Judge readability from what the student sees. A value present in the JSON but impossible to read off the drawn axis is a
defect.

## What to check on every item (answer each field)

| field | values | what it means |
|---|---|---|
| `cold_pick` | A-D | your answer before seeing the key |
| `key_correct` | yes / no / unsure | recompute **every** number the key relies on from the table cells or plotted points; check the trend over **all** points, not two |
| `second_defensible` | none / letter + reason | a distractor a careful student could defend from this stimulus and this stem (co-founder rule A1). "Less complete than the key" is not a defence |
| `fact_error` | none / what | key or stem states real science wrongly; a model-item distractor that is actually TRUE; invented data that break a real law (a heavier cart accelerating more under the same force, a warmer solution dissolving less of a common solid, seasons from distance) |
| `no_source_needed` | yes / no (data and investigation items) | cover the figure and procedure: could a grade-appropriate student pick the key from the stem and general knowledge alone? If yes, the item is a recall item wearing a figure |
| `recognised_real_data` | none / what | you recognise a real published dataset or canonical experiment behind an "invented" system (KNO₃ solubility, peppered moths, Mendel, real planet tables) |
| `free_elimination` | none / letters + how | an option killed without reading the stimulus because of the stem plus the option set: a unit mismatch, a value outside any possible range, the only option that "performs the comparison", the only hedged or only absolute option, a distractor that duplicates and reverses the key's relation |
| `readability` | ok / problem | the student cannot read what the key needs from the drawn figure (ticks too coarse, bars too close, an unlabeled axis, a caption that gives the answer away) |
| `grade_fit` | below / on / above (record only) | for `grade_target` and `tier`. **This is recorded and never decides**: model graders' grade placements failed the live, human-cleared bank (Stage A, REGISTER 2026-10-07) |
| `b1_option_set` | none / what | **B1:** can the option set decide a compare-or-variable item without the stimulus? Look for labels that spell out settings, a lone measured result (outcome ask), or results offered for a setting ask |
| `b1_qualifier` | none / what | **B2:** does one trend option carry a qualifier the others lack (steadily, overall, close to, each year)? |
| `b1_absolute` | none / what | **B3:** is one claim option the lone absolute or the lone hedged one? |
| `b1_stated_law` | none / what | **B4:** does the targeted standard state the relationship the data show, so the figure is decoration? Read the item's `prior_free` claim in the keyed packet and say whether it holds |
| `b1_name_property` | none / what | **B5:** does an invented name announce the property the stem asks about? |
| `cross_item_pattern` | none / what | **asked explicitly:** across all the items you have read, is any key guessable from a pattern (the same key wording, the key always "increases", the controlled variable always the longest option, a cliché keying several items)? |
| `note` | free text | anything else, with the reason |

## Drop rules (pre-registered; the coordinator applies them, not you)

| finding | action |
|---|---|
| `key_correct: no` from **either** grader, confirmed by recomputation | drop (no repair: a repair made in response to the round that caught it is fitting to the instrument) |
| `second_defensible` from **both** graders, naming the same option | drop |
| `second_defensible` from **one** grader | one return to the author with the reason; re-check by a fresh grader; a second hit drops |
| `fact_error` confirmed | drop |
| `no_source_needed: yes` from **both** graders on a data or investigation item | drop |
| `no_source_needed: yes` from one grader **and** the figure-covered attack unanimous on the key | drop (corroborated); otherwise recorded |
| `recognised_real_data` from either grader, confirmed | drop |
| `free_elimination` from both, killing 2+ distractors | drop; killing 1 -> recorded, counts toward the batch's free-elimination rate |
| `readability: problem` confirmed by the coordinator against the renderer | drop |
| `grade_fit`, `cross_item_pattern` | recorded; a cross-item pattern named by both graders holds the batch for the coordinator |
| any `b1_*` field from **both** graders on the same item | drop (the rule is binding; the checker caught only its mechanical part) |
| any `b1_*` field from **one** grader | one return with the reason; a fresh grader re-checks; a second hit drops |

## Output

One JSON array to the path the coordinator gives you, one object per item, holding exactly the fields above plus `id`.
Then reply with:
- counts for each field
- every `key_correct: no`, `second_defensible`, `fact_error` and `no_source_needed: yes`, each with its reason
- your answer to `cross_item_pattern` for the batch as a whole
