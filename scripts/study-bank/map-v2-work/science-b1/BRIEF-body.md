# MAP Science batch 1: brief (grades 5-8, 240 slots, 12 authors: one per area x grade, 20 slots each)

<!-- BRIEF-BODY: generated into BRIEF.md (authors, with slot tables) and BRIEF-grader.md (graders, NO slot tables) by make-brief.mjs -->

Pre-registration: `scripts/study-bank/MAP-SCIENCE-B1.prereg.md`. Plan: `scripts/study-bank/MAP-SCIENCE-PLAN.md`.
Pilot: `MAP-SCIENCE-PILOT.prereg.md` and REGISTER 2026-10-27. Slots: `science-b1/slots.json` (from `make-slots.mjs`).
Checker: `science-pilot/sci-check.mjs` with the batch-1 rules (its default).

## Why this batch exists, in four lines

MAP Science needs 195 items (65 per area) for five complete 39-item forms, and the whole MAP launch waits on it. The
pilot staged 30. This batch is 240 slots (20 per area x grade cell) and should land about 16 per cell. Each area is a
cohort with one 12-item human spot. **Five binding rules below are new**: the pilot's graders found each pattern, and
six of the pilot's 36 items were dropped for it. You write; the co-founder judges. Nobody edits your items after you
finish. A defect is dropped, not fixed.

## What MAP Science is (public NWEA documentation only)

- Three instructional areas, balanced: **Life Science · Physical Science · Earth and Space Science**. The sub-areas are
  the NGSS disciplinary core ideas (LS1-LS4, PS1-PS4, ESS1-ESS3).
- Grade 5 belongs to NWEA's Science 2-5 test. Write grade-5 items to the **NGSS 3-5 band** (a 3-, 4- or 5- performance
  expectation). Write grades 6-8 to **MS-** performance expectations.
- Four-choice multiple choice, untimed, one point per item.
- **Never open, search for, recall or imitate an NWEA item.** That includes NWEA's "sample items" fact sheets,
  practice.mapnwea.org, any "MAP-style" prep site, and any Herald file or PDF in this repo. These are live items. An
  item that resembles one is dropped and the batch is held.

## How you write

1. Read this brief in full, then `scripts/study-bank/AUTHORING-RULES-FROM-NOTES.md` (pasted at the end). Then grep
   `EXCLUSIONS-science.txt` for every subject and invented name before you use it.
2. Write **only your 20 slots**, exactly as `slots.json` assigns them. A slot fixes area, grade, tier, DCI, kind,
   stimulus, option format, ask, key letter, key rank and whether the system is invented. **Do not swap any field.**
   If you cannot write a slot as assigned, leave it EMPTY (`{"id": "...", "empty": true, "reason": "..."}`). An empty
   slot costs one item; a swapped slot brings back the tells the assignment exists to stop.
3. Put one JSON array in `scratchpad/map-science-b1/<CODE>/items.json` (repo root relative; `<CODE>` = L5 ... E8).
4. From the repo root, run `node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs <your items.json> --slots
   scripts/study-bank/map-v2-work/science-b1/slots.json --exclusions scripts/study-bank/map-v2-work/science-b1/EXCLUSIONS-science.txt`
   until every item prints `ok`. It exits 0 only then. **Grep the exclusions for EVERY subject**: they now include the
   pilot's 36 items as well as ACT Science.

## The fictional-experiment rule (binding for every `invented: yes` slot)

A model, and a strong student, can answer a question about a famous dataset from memory. ACT Science's shipped bank
reads 88.9% to a model with the passage removed and 28.6% to a person: the model was recalling potassium nitrate's
published solubility curve, Hardy-Weinberg, and deflection proportional to 1/thickness³. `act-science-v6/v7` beat this
by INVENTING the system. So:

- **Invent the organism, substance, place or device, and invent every number.** Use names like "plant line R-4",
  "Solution Q", "Lake Tamsin", "a cart with Block M". Record every invented name in `names_used`.
- **No real published dataset, no canonical experiment** (no Mendel's peas, Redi's jars, Galileo's ramps, the
  peppered moth, KNO₃ solubility, Boyle's J-tube, Wegener's fossils, real planet tables). No real named species
  with real measured values.
- **The invention must obey real science.** Invented values follow the real relationship (a heavier cart accelerates
  less under the same force; a warmer solution dissolves more of most solids; a population with more food grows,
  then levels off). Fiction may invent the system. It may not get a real law wrong (co-founder rule A4).
- **The item must NEED the stimulus.** Cover the table or graph: if a grade-appropriate student could still pick the
  key from general knowledge, the item is a `model` item wearing a figure. Rebuild it so the answer depends on
  numbers or labels that exist only in your stimulus. Graders mark `no_source_needed` and it is a drop reason.
- **`model` slots (`invented: no`) test real knowledge** and must be scientifically exact. Each distractor is a named,
  common misconception that is FALSE (heavier objects fall faster; plants get their mass from soil; the seasons come
  from distance to the Sun; the Moon's phases are Earth's shadow). Put the misconception in that distractor's `fault`.

## Stimuli: stored and drawn exactly like ACT Science per-item graphics

`graphic` is the same JSON ACT Science stores in `item.graphic`. The app's `QuestionGraphicView` draws it under the
question. These are the only shapes allowed in this batch (no `svg`):

```json
{"type":"table","rowLabels":["Trial 1","Trial 2"],"colLabels":["Mass (g)","Time (s)"],"cells":[[20,3.1],[40,6.0]],"caption":"Table 1. ..."}
{"type":"bar","bars":[{"label":"Site A","value":12},{"label":"Site B","value":30}],"xLabel":"Site","yLabel":"Seedlings","caption":"..."}
{"type":"line","series":[{"points":[[0,4],[10,9],[20,15]]}],"xLabel":"Time (min)","yLabel":"Temperature (°C)","caption":"..."}
{"type":"scatter","points":[[1,3],[2,5],[3,6],[4,9],[5,10]],"xLabel":"...","yLabel":"...","caption":"..."}
```

What the renderer actually shows, and the rules that follow from it (the checker enforces each):

- **table:** a header row of `colLabels` and a first column of `rowLabels`. `cells` has one row per row label and one
  cell per column label. At most 8 rows and 4 columns, because it must fit a phone.
- **bar:** black bars, **no value labels**. The y-axis has ticks at 0, ¼, ½, ¾ and the maximum value. A student can
  only estimate a bar's height. Ask comparisons, or, for `values`, keep every option at least ⅛ of the axis range from
  every other.
- **line:** every series is drawn black with **no legend**, so **exactly one series**. At least 3 points, x strictly
  increasing. Axes always include 0. There are 5 ticks per axis, so readable values need the same ⅛-of-range spacing.
- **scatter:** one cloud, at least 5 points.
- Every graphic has `xLabel`/`yLabel` (bar/line/scatter) or labels (table) with units, and a `caption`. **The caption
  never contains the key's number or wording** (`check-graphic-leak`'s fatal case).
- `procedure` = the experiment described in `passage` (60-170 words; grades 5-6 at most 130). There is no graphic.
  `procedure+table` = the same plus a table of results.
- `scenario` (model items): the situation goes in `prompt` (at most 70 words). `passage` and `graphic` are null.
- `table`/`bar`/`line`/`scatter` data items may add a `passage` of at most 80 words to set up the experiment.

## Option formats (the axis rule; CLAUDE.md "the one predictor that has held")

An item leaks when **the options differ along the axis the stem names**, readable without the source. So every format
but `claim` keeps the four options in **one frame**, varying only the element the stem asks about. Then every option
satisfies the stem equally and only your stimulus decides.

| format | the four options are | key rank means |
|---|---|---|
| `values` | four numbers, same unit, same decimal places ("12.5 g") | ascending **value** rank: 1 = smallest |
| `conditions` | four trial / group / site / sample labels, each **appearing verbatim in your stimulus** | **length** rank: 1 = shortest |
| `trend` | four descriptions of how a quantity changes, each with a direction word (increases / decreases / stays the same / increases, then stays the same) | length rank |
| `variable` | four quantities, each **named in your procedure** | length rank |
| `term` | four terms or processes of one kind (at most 5 words each) | length rank |
| `claim` | four full statements (at least 6 words each) | length rank |

**Key rank is fixed by your slot.** For length rank, all four option lengths (characters) must differ by at least 2,
so the rank is unambiguous. Build the set so the key lands at its assigned rank by writing all four to fit, never
by padding one distractor. Padding one option inverted the tell on ISEE draft 1 (13/36 longest became 0/36).

**`ask` (also fixed by your slot) is what the stem asks:**

- values: `read` (one value off the stimulus), `difference`, `interpolate` (between two listed values), `ratio`
- conditions: `greatest`, `least`, `meets-criterion` (the one whose result meets a condition stated in the stem),
  `controlled-pair` (the stem names one trial; the key is the ONE other trial that differs from it only in the named variable. Options are single labels from the stimulus, never pairs)
- trend: the direction the **key** describes: `increase`, `decrease`, `no-change`, `increase-then-level`
- variable: the role asked for: `independent`, `dependent`, `controlled`
- term: `process`, `structure`, `quantity`, `example`
- claim: `explains`, `predicts` (model); `supported`, `not-supported` (investigation)

The asks rotate across the batch on purpose, so that "increases", "the controlled variable" or "the greatest" is
not always the answer.

## Item schema (every field required unless marked)

```json
{
  "id": "MSP-L-01",
  "map_area": "Life Science",
  "grade_target": 5, "tier": "low", "difficulty": "easy", "rit_band_target": "RIT 186-195",
  "dci": "LS2", "ngss_pe": "5-LS2-1",
  "kind": "investigation", "stimulus": "procedure+table", "format": "conditions", "ask": "meets-criterion",
  "invented": true,
  "names_used": ["plant line R-4", "Greenhouse 2"],
  "passage": "Students grew ... (procedure; null for scenario)",
  "graphic": { "type": "table", "...": "..." },
  "prompt": "Based on Table 1, which ...?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "key_evidence": { "refs": [[1, 2], [3, 2]], "expr": "v0 - v1" },
  "explanation": "Why the key is right, citing the rows, columns or points it uses. Never name an option by letter or position.",
  "distractor_rationales": [ { "choice": "...", "fault": "the fault that kills it (at least 4 words)" }, "x3" ],
  "real_world_check": "The real principle the item relies on, in one sentence a grader can verify.",
  "option_roles": ["setting", "setting", "result", "result"],
  "prior_free": "Why a student who knows the standard still needs THESE data (invented trend and values items)."
}
```

- **NEW `option_roles`** (required on every `variable` item): one of `setting` | `result` per choice, in choice order. A
  `result` is something the experiment measures or produces; a `setting` is something the experimenter chooses or holds.
  The checker refuses a tag that disagrees with the wording (height, grew, took, rolled, final, counted ... read as results).
- **NEW `prior_free`** (required on every invented `trend` or `values` item, at least 8 words): say why the targeted
  standard does NOT already give the answer. If you cannot, the item is recall with a chart attached. Rebuild it (rule B4).

- `choices` is the **presentation order**. The key sits at your slot's letter (A = index 0).
- `key_evidence` (required for `invented: true`). `refs` point into your graphic:
  - table: `[row, col]`, 0-based into `cells`
  - bar: the bar's label string
  - line/scatter: `[x, y]` exactly as plotted
  - `procedure`: quote the decisive sentence as `{"quote": "..."}`
  For `values` items, `expr` computes the key from the referenced values (`v0` is the first ref's value, and so on;
  only + - * / ( ) and numbers). The checker evaluates it and compares the result to the key at the key's decimal places.
  For `read`, the expr is `v0`.
- `misconception` items: every model-slot distractor's `fault` names the misconception (for example: "misconception:
  heavier objects fall faster").
- Reading level: grade 5-6 sentences of at most 20 words, everyday words plus the DCI's own terms. Grades 7-8 may use
  the MS terms (kinetic energy, allele, convection).

## Rules (binding; sci-check.mjs enforces most of them)

1. **Exactly one defensible answer.** For every distractor write the fault that kills it. "Less complete" is not a fault.
2. **No distractor is true in the world** (model items), and **no distractor is true for these data** (data items).
   Graders check both. A data distractor that would be right for a different row is fine only if the stem rules that
   row out.
3. **No option reconstructs the data.** No two numeric options sum or difference to a third option or to the key. Each
   numeric distractor is a distinct misread: wrong row, wrong column, wrong axis, the interpolation done backwards,
   a unit slip.
4. **No option alone "performs the comparison"** (ACT Science v1). In a comparison stem, all four options compare.
5. **Hedges and absolutes are dealt across options**, never only on the key and never only on distractors. "The key
   is the one hedged option" is a rule solvers use.
6. **Science clichés key at most 2 items across the whole batch**: "a fair test", "repeat the trial", "more data are
   needed", "not enough information", "the variable that was changed", "control group". When you use one as a key,
   use another as a distractor elsewhere. Coordinate in your notes.
7. **The key paraphrases.** It never copies a 4+-word span of the passage that no distractor also uses.
8. **Vary your own key prose.** No two of your keys may share a 4-word phrase. The batch check fails three keys
   sharing one (the TOEFL lectures shipped "the lecturer is committed" as the key 8 times).
9. **No line numbers, no "Figure 2" without a figure**, and no option letters in explanations.
10. **Invented names are yours alone.** Life authors use plant/animal/microbe line codes, Physical authors use
    device/substance codes, Earth authors use place/rock/sample names. **The letters in your invented codes and the first
    letter of your invented proper names come from your grade's range** (grade 5: A-F, grade 6: G-L, grade 7: M-R,
    grade 8: S-Z), so the four
    authors of one area cannot collide. Two authors must not invent the same name; the batch check fails it.
11. **Grade fit.** The item must be answerable by a student of `grade_target` who has met the PE, and hard at `high`
    tier because of the reasoning, never because of vocabulary.

## Batch-1 binding rules (new; from the pilot's graders; sci-check enforces the mechanical part)

The pilot's two blind graders (g3, g4) named three cross-item patterns, and dropped six items for two more. Each rule
below names the pilot items that broke it. Every rule is binding. Where the checker can decide one, it refuses.

**B1. "Which test to compare" and "which variable" items must not be decided by the option set.**
- **Condition labels are opaque names**: a code ("Tray K", "Plot 7", "Track QX-40") or an invented proper name. A label
  never spells out the settings. No commas ("Marlowe, 30°, close": MSP-E-04, dropped), no descriptive words
  ("R-17, watered": MSP-L-03, dropped), no numbers with units, and no word that repeats a setting printed in the table.
  The settings live in table columns or in the procedure. *Checker: LABEL.*
- **Controlled pairs never go on bar charts** (a bar's only text is its label); your slots already respect this.
- **Variable items: tag `option_roles`.** When the ask is for an **outcome** (`dependent`), at least **two** options must be
  measured results. Otherwise the key is the lone result (MSP-E-12, dropped). When the ask is for a **setting**
  (`independent` or `controlled`), **no** option may be a result. "An outcome can never be the controlled variable" killed
  two options free on MSP-L-06 (dropped) and one on MSP-P-07. *Checker: ROLE.*

**B2. Trend options carry a qualifier on all four or on none.** The pilot's trend keys were the only option with an extra
word: "increase **steadily**" (L-10), "rises **with every trial**" (P-04), "decreases **overall**" (P-11), "stayed
**close to** the same" (E-02). Both graders read the qualifier as the key's mark. Qualifiers include steadily, overall,
gradually, slightly, about, close to, a little, each year, with every trial, at every step, no matter. *Checker: QUAL.*

**B3. Claim items never make one option the lone absolute or the lone hedged one, and absolutes must not live only on
distractors across the batch.** The pilot's eight claim items put all eight absolutes on distractors ("always shows",
"can never form", "only the smooth form"), so "reject the absolute" solved them. Either the key may carry an absolute
when it is true ("Every cell comes from another cell"), or the absolutes are spread so each item has 0, 2 or 4 options
with one. Absolutes: always, never, only, all, none, every, any, cannot, must, entirely, completely, solely, nothing,
everywhere, forever. *Checker: ABS per item, ABSDIS across the batch.*

**B4. No data item built on a law the targeted standard states outright.** MS-PS3-4 says the same energy into more mass
gives a smaller temperature rise. A graph showing exactly that (MSP-P-11, dropped) is recall with a chart attached.
"A heavier box takes more force to drag" (MSP-P-04, dropped) and the other two `no_source_needed` drops (E-04, E-12)
failed the same way. Build the data so the standard does not predict the answer:
- an invented organism with an optimum, not a monotone response
- two factors where the stem asks about the weaker one
- a threshold or a plateau
- a comparison of sizes where the direction is obvious but the asked VALUE is not
Write the reason in `prior_free`. The checker requires the field; graders judge it (`no_source_needed`). *Checker: LAW
(presence only).*

**B5. Invented names never encode the property being tested.** "Ardwick Low Meadow" and "Mirefield Bluff" (MSP-E-11)
announced height and slope to a stem that asked for high, gently sloping ground. Use neutral invented names ("Site
Kell", "Lake Tamsin", "Sample R-7"): no low, high, steep, flat, plain, bluff, ridge, valley, meadow, marsh, wet, dry, hot,
cold, sunny, shady, rocky, sandy, deep, shallow, fast, slow, tall, heavy, light, dark, thick, thin or similar.
*Checker: NAMEPROP, on names_used and condition labels.*

**Within your 20: vary the load-bearing element.** Do not let your keys share a form across items: the same
direction word, the same clause shape ("because the ..."), the same variable role, or always the largest option. The
slots rotate the asks. Your wording must not undo that.

## Before you finish

Run sci-check until it exits 0. Then reply with:

- your file path
- the line `sci-check: N ok, M empty`
- each EMPTY slot with its reason
- for each invented system, the real principle it obeys
- any slot where you doubt the key is the only defensible answer (say so; do not hide it)

## What happens next (so you know what is tested)

1. A cold screen.
2. Two with-source graders who decode every table cell and plotted point and recompute every number. They also hunt a
   second defensible answer, check every real-world claim, and try to answer each data item with the figure covered.
3. A co-founder-standard grader pre-screen.
4. Report-only blind attacks: options-only, and figure-covered.
5. The co-founder's blind spot: 12 items per area cohort, drawn at random and by risk score.

Graders read a copy of this brief **without the slot tables** (`BRIEF-grader.md`). The pilot's first two graders were
handed the tables and their agreement proved nothing (amendment A1).

