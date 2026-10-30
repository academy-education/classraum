# MAP Science batch 4: brief, version b4 (grades 5-8, 240 slots: 95 Physical, 75 Life, 70 Earth and Space)

<!-- BRIEF-BODY: generated into BRIEF.md (authors, with slot tables) and BRIEF-grader.md (graders, NO slot tables) by make-brief.mjs -->

Pre-registration: `scripts/study-bank/MAP-SCIENCE-B4.prereg.md`. Previous batch: `MAP-SCIENCE-B3-FULL.prereg.md`.
Plan: `scripts/study-bank/MAP-SCIENCE-PLAN.md`.
Slots: `science-b4/slots.json` (from `science-b4/make-slots.mjs`). Checker: `science-pilot/sci-check.mjs --rules b4`
(every b3f check except the per-item ECHO ban, plus VARPLAN, SHORTLBL, KEYWORD, ECHOBAL, XKEY, LAMARCK and MISCDECL).

## Why batch 4, and what version b4 changes (read this first)

Batch 3 full (230) survived at about 53%: Life 42 of 75, Physical 34 of 75, Earth 46 of 80; 121 are now live. Its graders
named five mechanical cross-item patterns on 3+ shared items (each now has a checker, rules **B33-B37**) and one semantic
pattern that was the largest single drop in EVERY area: **B31, "only one sensible option"** (model distractors absurd, off
category, or denying the stem's own premise; Physical lost 12 items to it). Version b4 rewrites B31 as **B38** (each
distractor a held misconception of the key's category, declared per distractor) and adds **B39** (no need/will/learning
change), plus **B40-B42** from the batch-3 key-visible audit and the coordinator's REGISTER lessons.

What survived and what did not, by format (batch 3 full): data conditions 20/28, investigation conditions 10/12,
investigation values 9/12, data values 29/48, trend 15/24, term 21/36, **model claim 14/46**, investigation claim 4/12,
**variable 0/12**. Model claims and variable items are where your care goes.

This is a multi-author batch: six Claude authors (Life 5-6, Life 7-8, Physical 5-6, Physical 7-8, Earth 5-6, Earth 7-8)
write in parallel from this one brief. **B43** covers working beside the other authors.

## Why the full batch 3, and what it changed (history)

Pilot 2 (24 items) used "randomize at base rate, never forbid" and removed every batch-2 and pilot-1 tell; all 48 cold
picks were on key. It failed only where both graders named a two-item coincidence (both Physical read keys at a chart
extreme; "It remained constant." a distractor in both Life trend items). The full batch keeps pilot 2's method and turns
every pilot-2 grader note into a binding rule (**B26-B32** below). The full batch's rule 10 counts a pattern only when
both graders name the same 3 or more items (prereg, rule 10a), and holds an area only when it covers half the area.

## Why pilot 2 existed

Pilot 1 (24 items, same formats) failed its gate in all three areas, and every pattern its graders named was the
INVERSE of a batch-2 ban: B17 said the asked bar is never the tallest, so the top-tick option was never the key and died
on sight; the trend rules left the key as the only option in the data's direction; Earth's claim keys were still the
shortest. A rule that FORBIDS a key property makes the property mark a distractor. Pilot 2 RANDOMIZED each property at
its natural base rate instead (rules B20-B25 below); the batch checks test the distribution, not the item.

## Why batch 3 exists (from the first pilot's brief)

Batch 2 (224 items) was held in all three areas: both graders of each area named the same cross-item pattern in the
cold pass (the trend key alone carried an "as ..." clause; variable passages stated each option's role; a
definition-in-stem key echoed the defining word; the interpolation key was the only unprinted value; the asked bar was
the tallest; misconception claims carried "because" and "much" while the key was plain). Batch 3 re-authors fresh with
every one of those patterns banned (rules B13-B19 below). Two pilots of 24 items asked the graders' cross_item_pattern question first. Nobody edits an item after it
is written. A defect is dropped, not fixed.

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
2. Write **only your cell's slots**, exactly as `slots.json` assigns them. A slot fixes area, grade, tier, DCI, kind,
   stimulus, option format, ask, key letter, key rank and whether the system is invented. **Do not swap any field.**
   If you cannot write a slot as assigned, leave it EMPTY (`{"id": "...", "empty": true, "reason": "..."}`). An empty
   slot costs one item; a swapped slot brings back the tells the assignment exists to stop.
3. Write one source file per grade cell, `scratchpad/map-science-b4/<AREA>/src-<cell>.mjs` (repo root relative; `<AREA>` =
   L, P or E; cell = L5 ... E8), exporting `ITEMS` in the source-entry shape `science-b4/expand.mjs` documents (the b3-full
   shape plus, on model items, `cat` and per distractor `[choice, fault, misconception, sameCategory]`). Then
   `node scripts/study-bank/map-v2-work/science-b4/expand.mjs <AREA> --partial` writes `items.partial.json` from the cells
   present; the coordinator runs it without `--partial` once all four cells of the area exist.
4. From the repo root, run `node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs <items.partial.json> --rules b4
   --slots scripts/study-bank/map-v2-work/science-b4/slots.json --exclusions scripts/study-bank/map-v2-work/science-b4/EXCLUSIONS-science.txt`
   until every item of YOUR cells prints `ok` (it exits 0 only then). **Grep the exclusions for EVERY subject**: they hold
   ACT Science, every MAP Science item of batches 1, 2, both b3 pilots and batch 3 full (all 230, survivors and drops),
   and every live or staged map/science row.
5. Run `node scripts/study-bank/map-v2-work/science-b4/probe-live-b4.mjs <items.partial.json>`: it compares every item with
   every live and staged MAP Science row (367: pilot, v1, and the 121 just released from batch 3 full) AND every batch-2,
   pilot-1, pilot-2 and batch-3-full item (same topic, same key, same "4 times" form, and XKEY, below). A refusal is
   resolved by rewriting your item to a different system and question, never by rewording until the score drops.
   **Before drafting**, grep the live term and claim keys and the area's used ratio/difference values (they are dense on
   canonical concepts: batch 3 replaced about 30 drafts on probe refusals such as "asexual reproduction" and "natural
   selection").
6. Run the batch checks over every area file that exists (`--batch` with the L, P and E partial files) and fix what
   touches your items (B43).

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
  **NEW (b2, TICK): every x value must sit on an x tick or exactly halfway between two.** The ticks are 0, ¼, ½, ¾ and
  the largest x. Six points at 0, 10, ..., 50 put ticks at 12.5 and 37.5, and the audit dropped MSB1-L8-16 because its
  key turned on whether a bend sat at generation 20, between two ticks. Use 0-40 in steps of 10, 0-8 in steps of 1 or 2,
  0-12 in steps of 3 or 1.5, and so on.
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
- **NEW in b4: `key_category`** (every model item; source field `cat`) and, in each model distractor rationale,
  **`misconception`** (the held student belief, >= 6 words) and **`same_category: true`** (source: the 3rd and 4th
  members of each `d` entry). Checker MISCDECL refuses a model item without them. See B38.
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
    **Batch 4: the grade-letter ranges stay waived** (a letter range per grade is itself a template). With six authors,
    NAMEREUSE and the batch name check refuse a name core in two items; resolve collisions as B43 says.
11. **Grade fit.** The item must be answerable by a student of `grade_target` who has met the PE, and hard at `high`
    tier because of the reasoning, never because of vocabulary.

## Batch-2 binding rules (new; from batch 1's REGISTER findings and the 2026-10-30 key-visible audit)

Batch 1's coordinator recorded seven findings for batch 2, and the audit found four real defects in 245 released MAP
items. Each is binding. `sci-check --rules b2` (and b3) refuses the mechanical part.

**B6. Condition labels share one shape (b1 finding 1, checker LSHAPE).** Batch 1 met the length-rank rule with padded
code ladders (X / X-n / XX-nn / XXX-nnn). They look artificial, and in cell E6 the key was the lone three-letter code
four times. Write four labels of ONE shape, for example four invented names after the same noun ("Plot Avery", "Plot
Bellwin", "Plot Corrimer", "Plot Dunhaven"), and let the names' own lengths give the ranks. The checker refuses any
key whose label shape is unique among the four options, which also refuses every ladder.

**B7. No topic or key twice (b1 finding 2, checkers XDUP / KEYDUP and `probe-live.mjs`).** Batch 1 dropped 12 cross-grade
duplicates no per-author check could see: the same mutualism example, the same volcano-forecast sign, two "4 times"
ratio items. Inside this batch and against every live or staged row: no shared system, no shared concept on the same
PE, no shared term/trend/claim key, and no second `ratio` or `difference` item with the same numeric key. Every
`XDUP-REVIEW` line is answered in writing before grading.

**B8. Stock misconception distractors at most once per cell (b1 finding 3, checker MISC).** "It changed during its
life" and "because they needed it" each appear at most once in a cell. Two of them in one item kill two options on
sight (batch 1 dropped L6-06, L8-06, L8-14).

**B9. The word "invented" never reaches a student (b1 finding 4, checker INVENTED).** The system is fictional to you,
not to the student. "invented", "fictional", "imaginary" and "made-up" are refused in the passage, prompt, options,
labels and caption. (The checker also refuses "students invented four codes"; write "designed".)

**B10. The passage never contradicts its figure (audit, E6-03 and E8-11).** Do not describe the data in the passage
("the town made more trash each year") unless every point obeys it, and every count in the passage (samples, depths,
trials) matches the rows of the table. A sample that was lost is not a row. Graders read this as `fact_error`.

**B11. No correlated twin of the key (audit, E5-13).** "Distance from the Sun" was defensible beside the key "distance
from Earth" because, for stars, the two are the same to within 1 AU. A distractor that changes together with the key
is a second answer. Each distractor must be wrong for a reason a grade-level student can state.

**B12. A figure is not a law the student already knows (audit no_source on data items, MSB1-P5-02 and E8-17).** "A heated
magnet lifts fewer clips" and "orbital period does not depend on the satellite's mass" were answerable without the
graph. This is rule B4 again, and it is still the most common way a data item fails.

Kept from batch 1, with the reasons: findings 5 and 6 are fixed in the tools (the keyed packet now shows `prior_free`
and `option_roles`; each grader gets its own folder), and finding 7 was a records note.

## Batch-3 binding rules (new; from batch 2's rule-10 holds; `sci-check --rules b3` refuses the mechanical part)

Each rule names the batch-2 items both graders of an area cited. Each has a checker that was run on batch 2's 224
items and catches every named item (`science-b3/validate-b3-rules.mjs`).

**B13. Trend options are parallel in form (Life; checker TRENDPAR).** Batch 2's trend key alone carried a trailing
clause: "It increased **as the water got deeper**" beside a bare "It decreased" (L5-14, L6-09, L7-10, L8-08). Write the
four options in ONE frame that differs only in its direction words: "It rose." / "It fell." / "It stayed the same." /
"It rose, then leveled off." The checker strips the direction words and refuses unless what is left is identical in
all four. No subject change ("Plants farther away grew taller"), no "at first", no time or place on the compound option.
Length rank comes from the choice of direction verb (rose / increased / went up; fell / decreased / dropped).

**B14. Variable procedures describe what was done; they never state a role (Life, Physical, Earth; checkers ROLESTATE,
VARTPL).** Every batch-2 variable passage said "the X was the same", "was not the same", "was the variable they
changed", "was 20 cm for every tray", or "they did not record it", so the key was a string lookup. Write the procedure
as actions and numbers ("She poured 150 mL of water into four jars." "Two jars were glass and two were plastic." "The
mass of salt stirred in was 2, 4, 6 or 8 g."). The student infers which quantity was set, held or measured. Refused in
a variable passage: same, constant, kept, held, changed/change, varied/vary, differ/different, variable, unchanged,
identical, equal, every time, each time, for every, in every, always, never, stayed, set at/to, on purpose, did not
count/record/measure. Vary the passage shape across items: no two passages built on one sentence plan.
For an outcome ask, the second measured option is a real second measurement (not a "noticed but not recorded" aside),
and the stem names the question the investigation answers, so only one measurement answers it.

**B15. No stem echo (Life; checker ECHO). REPLACED in b4 by B36 (randomize, never forbid): the per-item ban made the
echoing option a distractor in 95% of batch-3 claim items. Read B15 as history.** "Artificial selection happens when people choose which animals will
**breed**" with the key "**breeding** the calmest dogs" (L6-17; also L6-12 "tiny bones", L7-17 "gene"). In term and
claim items no content word of the stem (or its stem: breed/breeding, gene/genetic, north/northern) may appear in the
key unless a distractor carries it too. A definition in the stem is fine; the key then names the example in other words.

**B16. Interpolation distractors include unprinted values (Life, Physical; checker INTERP).** L7-06 and L8-01 offered
three printed table values and one unprinted key. P8-01's key was the only option that was the mean of two others.
Include at least one unprinted distractor (an estimate in the wrong interval, a continued trend), and make sure the key
is not the lone midpoint of two options (avoid evenly spaced ladders). Printed means anything in the table cells, a
numeric row label, a bar value or a plotted x or y.

**B17 (WITHDRAWN in pilot 2, replaced by B20).** It forbade the asked bar being the chart's extreme. Pilot 1 obeyed it
and both Physical graders read the inverse: the tallest-bar value on the top tick was offered and never the key.

**B18. Claims: reasons and degree words are dealt equally (Earth; checkers CLAIMRAT, CLAIMBAL).** Batch 2's Earth
misconception distractors read "much hotter, **because** ..." and "exactly the same, **since** ..." while the key was the
plain, shortest statement (E5-06, E5-14, E5-20, E7-05, E7-20, E8-05, E8-14). In each claim item a reason ("because",
"since", "so that", ", so", ", as", "due to") appears on 0, 2 or 4 options, never 1 or 3; the same for degree words (much,
far, exactly, very, completely, at all, no effect, even ...). Across an area's claims a marked option must be the key
about one time in four (the checker refuses below 15% or above 40%). The simplest safe form: all four options give a
reason, or none does.

**B19. One name, one item; numeric distractors in no sorted order (Earth; checkers NAMEREUSE, ORDER).** "Sy" named a lake,
a trial, a street and a site in four grade-8 items. An invented name core (the last word of a name) appears in one item
only. In `values` items the three distractors are not written in ascending (or descending) order around the key: batch 2
had them ascending in 59 of 60 numeric items, so the key was the one value out of order.

## Pilot-2 binding rules: randomize, never forbid (`sci-check --rules b3p2` checks the distributions)

**B20. Read items: where the asked bar sits is dealt by the slot (checkers BARPOS, BAREXT).** Your slot's `pos` says
whether the asked bar or point is the `tallest`, the `shortest` or a `middle` one; across the batch each is 2 of 6.
In EVERY read item, both the chart's largest value (the top tick) and its smallest value are among the four options:
as the key when the slot says so, otherwise as distractors. So the top-tick value is the key in 2 of 6 read items and
a distractor in the other 4, and the same for the shortest bar. The fourth option is another bar's value or an
unprinted misread, never always the same kind. Do not keep every key off the ticks or every key on one.

**B21. Trend options come from one shared pool of forms (checkers TRENDFORM, TRENDDIR).** Simple forms ("It rose.",
"It declined.", "It stayed the same.") and compound forms ("It rose, then leveled off.", "It fell, then rose.", "It
leveled off, then fell.") are both used as keys and as distractors: the slot's `ask` makes the key simple
(increase / decrease / no-change) or compound (increase-then-level / decrease-then-level / decrease-then-increase).
Write two simple and two compound options per item where the length rank allows (1 + 3 is allowed when it does not);
the batch check wants compound options to be keys about 1 time in 4, and simple options the same. A compound names two
DIFFERENT directions ("It dropped, then declined" is refused).
**Direction never decides:** every direction the key names is carried by at least one distractor (TRENDDIR refuses a
key that is the only rising, only falling or only flat option). Prefer a WRONG shape in the right direction ("It
leveled off, then rose." beside "It rose, then leveled off.") over an incomplete one ("It rose." beside "It rose, then
leveled off." can be defended).

**B22. Key ranks are dealt per format (checker RANKBAL).** Within one area and one format no key rank repeats, and
batch-wide no rank is over-represented in any format (claim keys are not the shortest twice; values keys are not the
smallest twice). The slots already deal this. Do not pad an option to hit a rank; choose the wording.

**B23. Claims: markers at the same rate on keys and distractors (checkers CLAIMRAT, CLAIMBAL, B18 kept).** A reason
("since", ", as") or a degree word sits on 0, 2 or 4 options per item, and across an area's claims a marked option is
the key about 1 time in 4. "Write all four with a reason, or none" is the safe form. Misconception distractors are
COMMON misconceptions a student holds, not absurd mechanisms ("heat melted the rock into mud"); pilot 1's Earth grader
solved two items by picking the only non-absurd option.

**B24. General knowledge must not pick the key (life-g1, pilot 1).** In a data or investigation item at least two
options must be plausible to a student who knows the topic but has not read the figure, so only the data decide between
them. In a trend item that means two options in the expected direction (B21). In a model item it means at least two
options a student could hold. No checker measures this (an author's own declaration is not a check); graders mark it as
`no_source_needed` and `b3p2_general_knowledge`.

**B25. No shared name template (checker NAMETPL).** Invented name cores in one area do not share a two-letter ending
across three or more items (pilot 1: Field Hesk, Town Marsk, Ward Tesk). Vary the shape of names, not only the letters.


## Full-batch binding rules (from pilot 2's six graders; `sci-check --rules b3f` refuses the mechanical part)

Each rule names the pilot-2 items whose grader notes it answers. Where a checker exists it was break-tested on that item
(`science-b3full/validate-b3full-rules.mjs`).

**B26. No filler distractor reused across items (checker FILLER).** "It remained constant." was a distractor in both
Life trend items and the key in neither (L7-01, L7-02, both Life graders); a reused option dies on sight. Write trend
options about the item's OWN quantity in one frame: "The seed count rose." / "The seed count fell, then rose." The
quantity is the same in all four options of one item (B13 still applies) and differs between items, so no two items share
an option. The same for term, claim and variable options: no option text is a distractor in two items unless it is also
a key somewhere.

**B27. No role statements of any shape (life-g1, life-g2 on L5-02; phys-g2 on P7-01; checker ROLESTATE kept).** L5-02
avoided every banned word and still stated the roles: each option was the subject of its own sentence with its value
("the water volume in each jar: 500 mL"; "the number of snails ran from 0 to 6"), and "in each jar" answered the stem
"one value in all four jars". So:
- Never introduce a quantity with a one-value phrase that answers the stem ("in each jar", "for all of them", "per tray",
  "throughout").
- Name the options inside sentences about what was DONE, several to a sentence, in the order of the work, not one
  sentence per option.
- For a setting ask, infer the role from actions and numbers: the held quantity is stated as an action repeated on each
  object ("She poured a 200 mL cup into the first jar, then the second, the third and the fourth") or as a count of
  identical objects ("four 250 mL jars"), never as a value "in each".
- For an outcome ask, the stem never names the measured quantity in other words (P7-01's "how far" matched "distance"),
  and never names the changed quantity (P7-01's stem said "fins", so "number of fins" died). Ask about the investigation
  ("Which quantity did the students measure to find out whether their idea was right?") and let the passage say what the
  idea was. A second measured quantity that could not answer it (measured BEFORE the change, or unrelated to the idea) is
  the second result option.

**B28. Data items leave two options plausible to a student who knows the topic (B24 kept; life-g2 L7-02; phys-g1/g2
P5-01).** Before writing a trend or values item, cover the figure and ask which options a grade-level student who knows
the standard still finds plausible. If only one, rebuild:
- never a shape that follows from a law the student knows (a ball thrown upward slows, stops, then speeds up: P5-01);
- in a trend item, at least two options in the direction general knowledge expects, differing in SHAPE, and both shapes
  physically or biologically believable for this system (a rise that levels off and a rise that keeps going; a fall then
  a recovery and a fall that levels off). L7-02 offered "remained the same, then increased" for bee visits, which no
  student believes for the first visit;
- systems with an optimum, a threshold, a plateau or two factors are the default for invented data.
- every trend item carries two simple and two compound options (P5-02's key was the lone simple option among three
  compounds, phys-g1 and phys-g2).

**B29. Vary the invented-name TEMPLATE, not only the letters (life-g1, life-g2: every Life system "<organism> line X-n";
phys-g1: every Physical system a Letter-digit code; checkers NAMETPL recalibrated, NAMESHAPE reported).** Across an area
mix: an organism line with a code ("clover line K-7"), a named population or place ("the Orrin Pond snails", "Lake
Dunmere"), a numbered plot or station ("Plot 14", "Station 6"), a person's device or sample ("Mira's sample", "Cart Q"), a
two-word invented proper name, a lettered group ("Group J"). No single template in more than about a third of an area's
invented items. The name ending rule (B25) is now measured against the base rate of English names, so a common ending
(-on, -er) is fine and a repeated rare one (-sk, -ow, -by) is not.

**B30. Read items: the asked bar's position is dealt per AREA (phys-g1, phys-g2: both Physical read keys at chart
extremes).** Each area has 6 drawn-axis read items with `pos` tallest / shortest / middle 2 / 2 / 2 in the slot table.
B20 is unchanged: both the chart's largest and smallest values are options in every read item. The fourth option is
another bar's value in about half the read items and an unprinted misread in the others (`READCAST` reports the split).

**B31. Model items: held misconceptions of one category, no lone shape, no lone polarity (checkers TERMSHAPE, CLAIMPOL;
life-g1/g2 on L6-01, L6-02; phys-g1 on P8-02; earth-g1/g2 on E7-02).**
- Every distractor is a misconception students actually hold, of the same category as the key: four processes that act
  on remains, four parts of one system. Not "spontaneous generation" among fossil processes, not "mutations fade", not
  "dye particles swell", and never a distractor whose own reason contradicts its claim (E7-02: soil that "holds more
  water" yet floods higher).
- Term options: no option alone in its word count (L6-02's key was the only one-word option).
- Yes/No claims: two of each polarity, or all four one way (L6-01's key was the only "No").
- When two options share the key's direction, their reasons differ in substance, not one sensible and one absurd.

**B32. Invented data obey the real law for THAT device or system (phys-g1/g2 on P6-02; earth-g2 on E5-01; life-g2 on L8-01;
phys-g1 on P5-02).** A struck free bar's pitch goes as 1/L^2, not 1/L (strings and air columns go as 1/L). A yearly sky
pattern repeats after 12 months. Do not dress a famous real example (myostatin double-muscled cattle) or a canonical
experiment (Galileo's ramp, mass-independent rolling) as invented. If you are not sure of the real law for the device,
choose a different device.

## Batch-4 binding rules (version b4; from batch 3 full's two graders per area and its key-visible audit)

Each mechanical rule names the batch-3 items BOTH graders of an area cited (rule 10a: 3+ shared items). Each checker was
break-tested on those items (`science-b4/validate-b4-rules.mjs`): it fires on them, and goes quiet when switched off.
Every distribution rule follows the principle three pilots paid for: **randomize a property at its base rate; never forbid
it on keys** (forbidding made the property mark a distractor, every time).

**B33. Variable passages: no shared sentence plan (checker VARPLAN; Life L5-17 L6-03 L7-16 L8-16, Physical P5-17 P6-10
P7-11 P8-02, Earth E6-03 E7-10 E8-12; batch 3 kept 0 of 12 variable items).** Every batch-3 variable passage introduced
its options verbatim after a recording verb, one clause per option ("... and wrote down the amount of salt stirred in",
"noted the cup spot"); the held quantity came as "the first ..., then the second, third and fourth"; the second result
was "X measured first". A student who knows the plan reads each role off its sentence shape. VARPLAN measures four plan
features per passage: REC (two or more options entering right after noted / wrote down / recorded), SERIES (first ...
then the second, third and fourth), ONEVAL (an option introduced by "one" / "a single"), BEFORE (an option named "...
measured first / at rest / before"); it refuses any feature in more than half of an area's variable passages. Write each
variable passage in its own shape: a narrative of the day; a numbered list of steps; a table-free paragraph where the
measured quantity is named only by the question the class asked; a description of the setup that a reader must infer the
roles from. Options enter the passage the way a real lab write-up names things, inside the sentences about the work,
never as the object of a recording verb. **Do not pad options with "measured first".** If a second result is needed, it
is a real second measurement the investigation took for its own reason.

**B34. Condition labels: no outlier-short core (checker SHORTLBL; Earth E5-07 Ux, E7-08 Town Oz, E7-15 Roof Qi, E8-08
Port Uo, E8-17 Run Al).** A label whose distinctive part is one or two letters was a distractor five times and the key
never. SHORTLBL counts short cores per area and refuses unless they are keys 15-40% of the time once four are used. The
simplest safe form: give every label core three or more letters. If you use a short core, it may be a rank-1 key.

**B35. No content word lives on keys (checker KEYWORD; Physical claims P7-17 P7-18 P8-17 P8-18: "energy" on five keys and
one distractor; "heat/warm" only on distractors).** Within one area and one format (claim, term, variable), a content
word must sit on distractors about three times as often as on keys. KEYWORD refuses a word on 3+ keys whose 1-in-4
binomial tail is under 0.01, and a word on 17+ distractors and no key. The fix is to let the scientific word appear in a
wrong option too ("The soft sound carries more energy, so the glass absorbs it.") and to let some keys say it in other
words ("The loud horn's sound pushes harder on the glass.").

**B36. Stem echo dealt at base rate (checker ECHOBAL replaces ECHO; Life term L6-04 pollen -> self-pollination, L6-18 red,
L8-18 four-legged -> legs).** Count, per area and format, the options that ALONE repeat a content word of the stem (or
its stem: pollen/pollination, leg/legged). Among them the key's share must be at most 40% once three keys do it, and at
least 10% once ten options do it. Batch 3's Life term keys were 4 of 7; its claim keys were 1 of 20 in every area (the
old ban inverted). So: in term items, let a distractor repeat the stem word as often as the key; in claim items, let
the key echo the stem about one time in four, like any option.

**B37. No item names another item's term option (checker XKEY, in the batch and in probe-live-b4 against every live row;
Earth E8-04's passage tested "seawalls" and E8-13 keyed "seawall"; E8-07's hikers read "air pressure" on a barometer and
E8-18 asked what a barometer measures).** A term option (key OR distractor: symmetric, so a term seen elsewhere cannot
mark a distractor) may not appear in another item's passage, prompt or figure unless it is everyday vocabulary used in
more than two other items. Before you write a term item, grep the batch files and the live snapshot for each option.

**B38 (replaces B31). Model items: four options a student could actually hold, all of the key's category (checker
MISCDECL for the declarations; graders judge the substance as `b4_one_sensible`).** B31 was the largest drop in EVERY area
of batch 3 (Life 5, Physical 12, Earth 5 shared items): distractors that were absurd ("A fast ball heats up in the air
and turns as hard as a rock", "The lens makes extra light of its own", "wind stored underground"), of another category,
or denying the stem's own premise ("The slow ball is lighter" when the stem says same mass). Then the one sensible option
is the key and no science is tested. So, for every model item:
- **Name the key's category** in `cat` ("a mechanism by which sound affects an object", "a part of a flower", "a cause of
  a seasonal change"). Every option must be a member of that category.
- **Each distractor is a misconception students are documented to hold** about THIS phenomenon: write it in the
  distractor's `misconception` field as the student's belief in their words ("students think a louder sound is a faster
  sound", "students think the Moon makes its own light"), and set `sameCategory` true only if it is. A misconception
  someone would only hold as a joke is not one. If you cannot name a held belief, choose a different phenomenon.
- **Every distractor accepts the stem's premises.** If the stem says the balls have the same mass, no option may claim
  one is lighter; if it says the eye is healthy, no option blames the eye.
- **At least two options must survive a student who knows only everyday experience**, so the science decides between
  them. A good test: would a grade-level student who has NOT learned the standard pick each distractor at least
  sometimes? Write the attractive wrong answer, not the silly one.
- **Distractors are as concrete and as long as the key** (B22 length rank still rules), and the same register: a key
  using a science term means at least one distractor uses a science term (B35).
- The fault field still begins "misconception: ..." (checker SHAPE) and says why the belief is FALSE.

**B39. No need-, will- or learning-driven change on any Life option (checker LAMARCK; L5-06 L6-06 L6-19 L7-13 L8-13).**
"The caterpillars will grow faster to beat the beetles", "The bacterium chose to change its protein", "learn to",
"sprout earlier to get ahead of the frost", "bent its wings by using them" sat on one or two distractors per item and
never on a key. A student who knows one rule (organisms do not change because they need to) kills them on sight. Such an
option can never be a true key, so it cannot be randomized; LAMARCK refuses it on every Life option. Use instead the
misconceptions students hold about variation and selection that are NOT the need rule: "every individual changes a
little", "the trait appears in the next generation because the environment causes it", "mutations always harm",
"individuals evolve within their lifetime", "the strongest always survive", "a trait that is common must be dominant".

**B40. Invented data are physically and biologically plausible in SIZE, not only in direction (audit: L5-16 a bean in
plain water gaining 80 g in six weeks; batch-3 fact errors P5-14 superlinear solar oven, P6-15 rise per gram inverting
MS-PS3-4, P7-08 launcher recoil convex in ball mass).** Check every number against the real system's order of magnitude
and the real law's curvature for THAT device: growth is saturating or linear, not accelerating, unless the real system
accelerates. **No exact textbook law table** (an exact 1/d^2, 2t^2, a = F/m or the standard atmosphere): it is either
answerable without the figure (`no_source_needed`) or recognised data (batch 3 dropped E5-02, P5-10, E8-07, P6-16 on
these). Add the scatter a real measurement has.

**B41. A model distractor must be false EVERYWHERE, and the explanation must describe its own figure (audit and fact
errors: E6-05 "the Sun never sets" is true in the Arctic summer; E7-06 a moraine-dammed lake; P6-06 "diamond is a
molecule" is a framing some textbooks teach (giant covalent molecule); P6-08's explanation called 32 "a little below
halfway" between 20 and 40; E8-10 "four periods" over five points).** Before you keep a distractor, ask where on Earth or
in which textbook it is true. Before you keep an explanation, recompute every position and count it states.

**B42. Plan your systems before you write (batch 3: 14 same-PE same-system pairs inside the batch, named by both graders;
25 more by one).** Grades 6, 7 and 8 share the MS performance expectations, so two authors can write the same system on
the same PE without either seeing it. Before drafting, write your plan (B43) and do not take a system, organism, device
or place another plan already holds for the same PE. Two items on one PE must differ in system AND in the concept the key
turns on.

**B43. Working beside five other authors.**
- First write `scratchpad/map-science-b4/plans/<YOUR-CODE>.md` (one line per slot: id, PE, system, the concept the key
  turns on, and for a model item the key's category). Then read every other plan file that exists and change yours where
  it collides on PE + system or PE + concept. Re-read them once more before you write each cell.
- Invented names: one name core per item across the whole batch. Before you finish, run sci-check `--batch` over every
  area file that exists; on a NAMEREUSE or name collision with another author, the author whose cell has the HIGHER
  grade renames (ties: Physical renames before Life before Earth).
- XDUP, XKEY and PEPAIR lines between your item and another author's: the higher-grade item changes (same tie rule).
- Never edit another author's file. Never read the coordinator's `packets/` folder.

## Batch-1 binding rules (from the pilot's graders; sci-check enforces the mechanical part)

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

**Within your cell: vary the load-bearing element.** Do not let your keys share a form across items: the same
direction word, the same clause shape ("because the ..."), the same variable role, or always the largest option. The
slots rotate the asks. Your wording must not undo that.

## Before you finish

Run sci-check (`--rules b4`) on your cells until every item of yours prints ok, and the probe until it has no
refusal on your items. Then reply with:

- your file path
- the line `sci-check: N ok, M empty`
- each EMPTY slot with its reason
- for each invented system, the real principle it obeys
- any slot where you doubt the key is the only defensible answer (say so; do not hide it)
- for each model item: the key's category and, in one line, the held misconception behind each distractor (B38)

## What happens next (so you know what is tested)

1. Structural pre-flight: `sci-check --rules b4` (and `--rules b3p2`) per area and `--batch` over all three, plus
   `probe-live-b4.mjs`; every REVIEW line is answered in writing before packets.
2. Two fresh with-source graders per area, cold then keyed. They decode every table cell and plotted point, recompute
   every number, hunt a second defensible answer, check every real-world claim, and try to answer each data item with
   the figure covered.
3. A key-visible second audit (two auditors, one adversarial), the pass that found the four batch-1 defects.
4. Release by the owner's 2026-10-30 rule. No co-founder sitting: science left his queue.

Graders read a copy of this brief **without the slot tables** (`science-b4/BRIEF-grader.md`, amendment A1 carried forward).

