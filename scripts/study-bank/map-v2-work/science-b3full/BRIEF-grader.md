# MAP Science batch 3 FULL: brief (grades 5-8, 230 slots: 75 Life, 75 Physical, 80 Earth and Space)

<!-- BRIEF-BODY: generated into BRIEF.md (authors, with slot tables) and BRIEF-grader.md (graders, NO slot tables) by make-brief.mjs -->

Pre-registration: `scripts/study-bank/MAP-SCIENCE-B3-FULL.prereg.md`. Pilots: `MAP-SCIENCE-B3.prereg.md` (pilot 1 and
amendment P2). Plan: `scripts/study-bank/MAP-SCIENCE-PLAN.md`.
Slots: `science-b3full/slots.json` (from `science-b3full/make-slots.mjs`). Checker: `science-pilot/sci-check.mjs --rules b3f`
(every b3p2 check, RANKBAL and NAMETPL recalibrated, plus the full-batch checks TERMSHAPE, CLAIMPOL and FILLER).

## Why the full batch, and what it changes

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
3. Put one JSON array in `scratchpad/map-science-b3full/<AREA>/items.json` (repo root relative; `<AREA>` = L, P or E; ids name the grade cell L5 ... E8).
4. From the repo root, run `node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs <your items.json> --rules b3f
   --slots scripts/study-bank/map-v2-work/science-b3full/slots.json --exclusions scripts/study-bank/map-v2-work/science-b3full/EXCLUSIONS-science.txt`
   (and the same with `--rules b3p2`)
   until every item prints `ok`. It exits 0 only then. **Grep the exclusions for EVERY subject**: they now hold ACT
   Science, the pilot's 36, all 240 batch-1 items, all 224 batch-2 items, both b3 pilots' 48, and every live or staged
   map/science row.
5. Run `node scripts/study-bank/map-v2-work/science-b3full/probe-live.mjs <your items.json>`: it compares every item with
   every live and staged MAP Science row AND every batch-2, pilot-1 and pilot-2 item (same topic, same key, same "4 times" form); all of their topics stay excluded. A refusal is resolved by
   rewriting your item to a different system and question, never by rewording until the score drops.

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
    **Full batch: one author writes every cell, so the grade-letter ranges are waived** (they existed to stop four
    authors colliding, and a letter range per grade is itself a template). NAMEREUSE still refuses a name core in two items.
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

**B15. No stem echo (Life; checker ECHO).** "Artificial selection happens when people choose which animals will
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

Run sci-check (`--rules b3f`, and `--rules b3p2`) until it exits 0. Then reply with:

- your file path
- the line `sci-check: N ok, M empty`
- each EMPTY slot with its reason
- for each invented system, the real principle it obeys
- any slot where you doubt the key is the only defensible answer (say so; do not hide it)

## What happens next (so you know what is tested)

1. Structural pre-flight: `sci-check --rules b3p2` and `--rules b3f` per area and `--batch` over all three, plus `probe-live.mjs`.
2. Two fresh with-source graders per area, cold then keyed. They decode every table cell and plotted point, recompute
   every number, hunt a second defensible answer, check every real-world claim, and try to answer each data item with
   the figure covered.
3. A key-visible second audit (two auditors, one adversarial), the pass that found the four batch-1 defects.
4. Release by the owner's 2026-10-30 rule. No co-founder sitting: science left his queue.

Graders read a copy of this brief **without the slot tables** (`BRIEF-grader.md`, amendment A1 carried forward).


## Slot tables: NOT IN THE GRADER COPY

They carry every key letter and key rank (pilot amendment A1). Grade from the packets only.

## Pasted: AUTHORING-RULES-FROM-NOTES.md (binding; reading-specific rules apply where they fit)

# Authoring rules from the co-founder's notes

<!-- AUTHORING-RULES-FROM-NOTES v1 -->

**Every author brief for the question bank must include this file** (paste it, or link it and copy the version
marker above into the brief so `node scripts/study-bank/apply-notes.mjs --check-brief <brief>` passes). The rules
come from `cofounder-notes.json` (his human reviews; ids in brackets are the first 8 characters of `review_id`, or a
`REG-` id for a REGISTER catch). Rules are appended by `apply-notes.mjs`, never rewritten; a superseded rule is
struck through with the reason, not deleted.

He judges; he never writes. These rules record what he caught so the next batch does not need him to catch it again.
Their effect is measured only as his flag and note rate on fresh batches, never on items he has seen.

## A. Release-blocking (an item that breaks one of these does not ship)

1. **Exactly one defensible answer** (`second_defensible`, 42 notes, 41 blocking). For every distractor, write the fault that
   kills it: it contradicts the source, answers a different question, mistakes the register, or refers to something
   the source rules out. "It is not as good as the key" is not a fault. He flags an option that is "not completely
   wrong", "sort of correct", "also plausible". [2c7311fb, 9dc86ebd, 87fede75, a82a66d4, …]
2. **The source must decide on its own** (`source_underspecified`, 5). A Choose a Response line, or any short
   source, must contain the facts the key relies on. If the key works only by assuming a setting the line does not
   state, rewrite the line until the other replies are contradicted, not merely unmentioned. [25cbdd60, eacf3e55,
   a4674f2b, 6a5163ed, 9d0f956a]
3. **The key states only what the source states, about the right person** (`key_wrong`, 2). Check who does what to
   whom in every key; a key that adds an inference the speakers never make is wrong, even if it is the closest
   option. [4cec146d, 80a73085]
4. **Check every real-world claim** (`factual_error`, 1 + REG-offside). A passage about a real sport, game, law,
   procedure, place or named science gets its rule checked against an authoritative source before staging, not
   just its story logic. Fiction may invent people; it may not get a real rule wrong. [8dd87249, REG-offside]
5. **The source must not contradict itself** (`self_contradiction`, 3 + REG-goldfish, REG-v6-04, REG-v6-12). Before
   staging, read each passage or transcript line by line for dates, names, numbers, who-knows-what-when and
   explanations, and confirm the ending does not assert something an earlier line denies ("origin is a mystery" vs.
   "invented to justify"). [237a4f2f, 2f3a84af, 2dca0772]
6. **Transcripts sound like speech** (`unnatural_speech`, 4 + REG-v6-contractions). Use contractions throughout
   ("I don't", "it's", "won't"); no "Let us do that"; every line follows from the previous turn, none exists only to
   set up a question; establish a speaker's gender in the transcript before any option says "he"/"she"; keep
   speaker labels consistent across the set (student = A). [c1307ad6, 2dca0772, eb494e08, d2cfedbb, 4eca5525]
7. **No cross-item key pattern** (`batch_pattern`, 2 + REG-abcd-deal). Across a batch, vary key position (never a
   repeating A-B-C-D run), key form (a dash, semicolon or hedge must not appear only in keys), key prose (the same
   wording or claim type must not key many items), and construction (let different parties be the committed one).
   [4d2b87e1, 120b33a2, REG-abcd-deal]

## B. Quality (he accepts the item but asks for better; these make his next sitting shorter)

8. **Closer distractors on main-idea, purpose and attitude items** (`distractor_too_easy`, 14). At least two
   distractors should be tempting: a real part of the passage that is not the whole, a central point stated too
   narrowly, an overstatement of a hedged claim. He: "All four are easy to eliminate." [f7cacf39, e46b72a0, …]
9. **Tailor attitude option sets to the passage** (`option_set_reused`, 1 + REG-attitude-sets). Do not reuse
   amused / critical / uneasy / admiring / regretful; include near-neighbours of the key (nostalgic, resigned,
   indifferent, skeptical, detached). [7c8aab32, 26ae474d]
10. **The key uses the passage's own sense** (`key_imprecise`, 12). No narrower or regional synonym ("stall" for
    fail, "queue" for loose lines), no detail the passage does not give ("village pond"), no "settings" where the
    passage means what is controlled. [b3cf68ab, b30f004e, f7330481, 32985a85]
11. **The skill label matches the item** (`skill_mislabel`, 2). A purpose or inference item whose answer is stated
    almost word for word is a detail item: relabel it or make it a real inference. [7163deb4, 56bf4092]
12. **The key must not stand out** (`key_stands_out`, 46). Not uniquely longest, not the only option outside a shared
    category, wording or polarity. (Bank-side caps already enforce length.)
13. **Options are grammatical and do not copy the passage** (`option_wording`, 5). [cf2d90b9, 1544b368, d9e34532]
14. **Display**: paragraph and stanza breaks must survive into the item; a stem that says "the final paragraph" is
    unanswerable without them (`formatting`). [d3fd0c01, 45af4dc8]
