# MAP Science batch 3 PILOT 2: with-source grader brief

You are one of **two independent with-source graders** for the MAP Science batch-3 pilot 2 (24 items, grades 5-8: 8 Life,
8 Physical, 8 Earth and Space). You grade one area. Your half **decides**. CLAUDE.md 2026-09-21 says: on a family where the blind attack saturates, the
with-source half found every real defect in five consecutive batches. ACT Science is such a family, with model 88.9%
against human 28.6% on the same shipped items.

Pre-registration: `scripts/study-bank/MAP-SCIENCE-B3.prereg.md` (amendment P2). Brief: **`science-b3p2/BRIEF-grader.md` ONLY.** It is the
author brief with the slot tables removed. Read its fictional-experiment rule, stimulus rules, option formats, the
batch-1 binding rules B1-B5, the batch-2 binding rules B6-B12, the batch-3 binding rules B13-B19 (B17 withdrawn) and
the pilot-2 rules B20-B25 (randomize, never forbid).

**Why pilot 2.** The first pilot's graders found INVERSE tells: a rule that forbade a key property (the asked bar is never
the tallest; the trend key's form) made the property mark a distractor instead (the top-tick option is never the key;
the key is the only option in the data's direction). So look for both directions of every pattern: a property that is
ALWAYS on the key, and one that is NEVER on the key.

**Blindness (amendment A1, carried forward as a rule).** Never open `science-b3p2/BRIEF.md`, `science-b3p2/slots.json`,
`science-b3p2/make-slots.mjs`, any area folder under `scratchpad/map-science-b3p2/` (L, P, E), `packets/hold/`, any other
grader's folder, anything under `scratchpad/map-science-b2/` or `scratchpad/map-science-b3/`, or any batch-1, batch-2 or
pilot-1 grade file. All of them carry the keys or a key-correlated field.
**Your folder (b1 finding 6):** read and write ONLY inside `scratchpad/map-science-b3p2/packets/<area>-g<N>/`, the
folder your prompt names. Two batch-1 graders shared a scratch folder and overwrote each other. If you open one by mistake, say so in your reply: your cold picks are then void and a
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
| `second_defensible` | none / letter + reason | a distractor a careful student could defend from this stimulus and this stem (co-founder rule A1). "Less complete than the key" is not a defence. **Check for a correlated twin** (b2 rule B11): a distractor that changes together with the key, like "distance from the Sun" beside "distance from Earth" for a star |
| `fact_error` | none / what | key or stem states real science wrongly; a model-item distractor that is actually TRUE; invented data that break a real law (a heavier cart accelerating more under the same force, a warmer solution dissolving less of a common solid, seasons from distance); **the passage contradicting its own figure** (b2 rule B10: "more trash each year" over data that do not rise every year; "five depths" beside a table of five tested samples plus one lost) |
| `no_source_needed` | yes / no (data and investigation items) | cover the figure and procedure: could a grade-appropriate student pick the key from the stem and general knowledge alone? If yes, the item is a recall item wearing a figure |
| `recognised_real_data` | none / what | you recognise a real published dataset or canonical experiment behind an "invented" system (KNO₃ solubility, peppered moths, Mendel, real planet tables) |
| `free_elimination` | none / letters + how | an option killed without reading the stimulus because of the stem plus the option set: a unit mismatch, a value outside any possible range, the only option that "performs the comparison", the only hedged or only absolute option, a distractor that duplicates and reverses the key's relation |
| `readability` | ok / problem | the student cannot read what the key needs from the drawn figure (ticks too coarse, bars too close, an unlabeled axis, a caption that gives the answer away, **a bend or point the key turns on that sits between two x ticks**, as in batch 1's L8-16) |
| `grade_fit` | below / on / above (record only) | for `grade_target` and `tier`. **This is recorded and never decides**: model graders' grade placements failed the live, human-cleared bank (Stage A, REGISTER 2026-10-07) |
| `b1_option_set` | none / what | **B1:** can the option set decide a compare-or-variable item without the stimulus? Look for labels that spell out settings, a lone measured result (outcome ask), or results offered for a setting ask |
| `b1_qualifier` | none / what | **B2:** does one trend option carry a qualifier the others lack (steadily, overall, close to, each year)? |
| `b1_absolute` | none / what | **B3:** is one claim option the lone absolute or the lone hedged one? |
| `b1_stated_law` | none / what | **B4:** does the targeted standard state the relationship the data show, so the figure is decoration? Read the item's `prior_free` claim in the keyed packet and say whether it holds |
| `b1_name_property` | none / what | **B5:** does an invented name announce the property the stem asks about? |
| `b2_label_shape` | none / what | **B6:** in a compare item, does the key's label look different from the others (a longer code, the only name among codes)? |
| `b2_duplicate` | none / which ids | **B7:** does this item test the same system, concept or key as another item in your packet? Name both ids |
| `b3_trend_parallel` | none / what | **B13:** does one trend option carry a clause, subject, qualifier or time phrase the others lack? |
| `b3_role_statement` | none / what | **B14:** does the procedure state a quantity's role (same / changed / for every / did not record ...), so the variable key is a word lookup? Or does it share a sentence plan with another variable item? |
| `b3_stem_echo` | none / what | **B15:** does the key alone repeat a word (or word stem) from the stem? |
| `b3_interp_cast` | none / what | **B16:** in an interpolation item, is the key the only unprinted option, or the only option that is the midpoint of two others? |
| `b3_bar_extreme` | none / what | **B20 (replaces B17):** in a read item, can the position of the options on the chart decide it without reading the asked bar: the key the only option on a tick label, the only option equal to a bar, the only one NOT equal to the tallest/shortest bar? (The asked bar being the tallest or shortest is allowed; it is dealt at the base rate across the batch) |
| `b3_claim_marker` | none / what | **B18 / B23:** in a claim item, does a reason (because / since / , so) or a degree word (much / exactly / no effect) sit on one option, or on all but one? Are the misconception distractors absurd, so the one sensible option is the key? |
| `b3p2_direction` | none / what | **B21:** in a trend item, is the key the only option carrying the data's direction, or the only compound / only simple option? Is a distractor merely an incomplete version of the key (defensible)? |
| `b3p2_general_knowledge` | none / what | **B24:** in a data or investigation item, is the key the only option a student who knows the topic would find plausible without the figure? (Two or more plausible options are required, so only the data decide) |
| `cross_item_pattern` | none / what | **asked explicitly, and the reason this pilot exists:** across all the items you have read, is any key guessable from a pattern (the same key wording or clause shape, the key always the plain / longest / shortest / only unprinted / tallest option, OR a property NEVER on the key (never the tallest bar, never the top tick, never the plain option, never the simple trend form), one passage template, a name template, a reused name, distractors in sorted order, a cliché keying several items)? Name the pattern and every item it touches. Answer it in the COLD pass, before any key |
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
| any `b1_*`, `b2_*`, `b3_*` or `b3p2_*` field from **both** graders on the same item | drop (the rule is binding; the checker caught only its mechanical part). For `b2_duplicate` both graders naming the same pair drops the higher-grade item of the pair (B1-A2's rule) |
| any `b1_*`, `b2_*`, `b3_*` or `b3p2_*` field from **one** grader | one return with the reason; a fresh grader re-checks; a second hit drops |

## Output

One JSON array to the path the coordinator gives you, one object per item, holding exactly the fields above plus `id`.
Then reply with:
- counts for each field
- every `key_correct: no`, `second_defensible`, `fact_error` and `no_source_needed: yes`, each with its reason
- your answer to `cross_item_pattern` for the batch as a whole
