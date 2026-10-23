# sat-ii-hard-v23 author brief (Digital SAT Information and Ideas, Command of Evidence, hard)

You write EIGHT Digital SAT Reading & Writing **Command of Evidence** items for a test-prep app that real
students use. They target the module-2 HARD route. The pre-registration is
`scripts/study-bank/PREREG-II23-2026-10-23.md`; read it. Items 01-05 are textual ("Which finding, if true, would
most directly support/weaken ..."); items 06-08 are quantitative (a table, "Which choice most effectively uses data
from the table to complete the text?"). The format is exactly that of
`scripts/study-bank/sat-ii-hard-v22.kept.batch.json` plus a `meta` object (below).

Work only in `scripts/study-bank/sat-ii-v23-work/<YOUR LETTER>/`. Do not touch the database, git, npm, or any other
file. Write `items.json`, a JSON array of 8 items with ids `II23<L>-01` … `II23<L>-08`. Save after every 2 items.

This brief is built from what the three graders of II21 and II22 actually wrote about the 18 items they kept as
HARD versus the 12 they kept as medium and the 18 they dropped. Read section 1 before you write anything.

---

## 1. What the panel rewarded (II21 + II22, 48 items x 3 graders)

| | What the hard items have | Evidence |
|---|---|---|
| P1 | **Every wrong option has its own reason to be picked.** Each distractor is accurate or plausible on a surface read and fails only on the passage's logic. | `distractor_quality: strong` from all three graders on **16 of 18** panel-hard items, **1 of 12** kept-medium, **0 of 18** dropped |
| P2 | **Nothing is strikable on sight.** | No grader gave `n_struck` >= 2 on **any** of the 18 hard items; **every one** of the 18 drops had a grader at >= 2 |
| P3 | **No single sentence or table cell decides it.** The claim and the discriminating fact sit in different sentences; on tables the deciding criterion is in the PASSAGE or is a derived quantity the options do not print. | `key_from_one_sentence` false from every grader on **18 of 18** hard; true from at least one grader on **6 of 12** kept-medium |
| P4 | **The strongest distractor uses the hypothesis's own group but is confounded** (textual), or **a raw-value reading points away from the key** (quantitative). | "B is the strong lure: Wyrlow vs Tamsby but confounded by damp vs dry" (II21D-03); "raw-mass readers reject the key" (II21A-06) |
| P5 | **No template across the batch.** | II21: 7 of 7 restated-pattern items dropped once graders saw the cast; II22: all three graders named the four-group cast across 12 items |

**What the panel called medium or easy, in their words:**
- "C is the only option in which the July/rain month is the larger" (II22B-01, medium): the key was the only option
  whose winner pointed the stem's way. The slot table now prevents this structurally (section 3); do not
  reintroduce it in wording.
- "every other mill is exactly 0.70 ... the odd one out" (II22D-04, medium): three distractors shared one derived
  value. The merge refuses two distractors with the same derived value to 2 significant figures.
- "Garvik is deepest (64 m) ... student must find the deepest lake" (II22B-04, medium): the key was a single max
  lookup.
- "D's 90 in salt is struck on sight" (II22A-04, medium): one option visibly failed a printed threshold.
- "35/64 is the only ratio above one-half ... Fallow 15/40 is visibly under half" (II22A-05, medium).
- "the one non-monotone pair in the column is visible on a scan" (II22B-06, EASY): the trend-break design. **Banned.**
- "Only C crosses the backswimmer condition" (II21A-05, EASY): the only option crossing the group label. **Banned.**
- "the key is always the strongest member of Y, with one or two off-class options" (II21 C-04, C-05, D-05, D-06,
  all dropped): group-best with an off-class lure. **Not in this table.**
- "strike the 'has both vs has neither' option on sight and look for the crossed pair on a weaken stem" (II22, 12
  items): the four-group cast. **At most one four-group (4G) item per author, support only** (the table does this).

---

## 2. Four kept-hard items, verbatim (all of their words are spent; do not reuse topics, names or frames)

### II21A-02 (textual, weaken; three groups; panel hhh, struck 1/1/1, distractors strong x3)
> In Dunbarrow Creek, a small freshwater snail often crawls out of the water at night and returns before dawn.
> Ecologist Corinne Dufresne hypothesizes that the snails are escaping crayfish, which forage mainly at night. Aldo
> Barreto proposes instead that the snails are escaping low oxygen: after dark, algae stop photosynthesizing but keep
> respiring, so dissolved oxygen falls in still water. The creek offers three habitats. Its slow pools and its fast
> riffles hold similar numbers of crayfish, but churning riffle water stays well aerated around the clock. Its
> marshy backwaters, which a beaver dam has cut off from the main channel, are as still as the pools but hold no
> crayfish at all.
>
> Which finding, if true, would most directly weaken Dufresne's hypothesis?
> - **(key)** Snails in pools at night left the water more often than snails in riffles at night did.
> - Snails in pools at night left the water more often than snails in pools at midday did.
> - Snails in riffles at night left the water more often than snails in backwaters at night did.
> - Snails in pools at night left the water more often than snails in backwaters at night did.

Graders: "Three habitats must be combined: pools vs riffles holds crayfish constant and varies oxygen ... D (pools vs
backwaters) is the most tempting because it shares the 'pools' anchor but actually supports Dufresne; C weakens
Barreto, not Dufresne." "There is no reversed pair; the student has to map three habitats onto two variables."

### II22D-03 (textual, support; places x decades; panel hhh)
> During the 1700s, houses in the towns of the Tessel valley began to be built with much larger windows.
> Architectural historian Ulla Varga argues that cheaper glass caused the change. A glassworks opened at Svarte in
> 1735, and because panes broke easily on the valley's rutted roads, its glass was shipped only by barge to towns on
> the Tessel River. Historian Viggo Tamsen contends instead that larger windows were a fashion copied from the
> capital, spread by builders' pattern books that circulated throughout the valley from about 1720. Tolvik and
> Wennor stand on the river, while Saltrup and Yvenby lie in the hills, far from any navigable water.
>
> Which finding, if true, would most directly support Varga's claim?
> - Houses built in Saltrup in the 1720s had larger windows than houses built in Saltrup in the 1710s.
> - Houses built in Wennor in the 1740s had larger windows than houses built in Yvenby in the 1710s.
> - Houses built in Yvenby in the 1740s had larger windows than houses built in Tolvik in the 1720s.
> - **(key)** Houses built in Tolvik in the 1740s had larger windows than houses built in Saltrup in the 1740s.

Graders: "Same decade (1740s), both with pattern books, only river access differs." "B is tempting (river 1740s vs
hill 1710s) but confounded by the 1720 pattern books." One grader also wrote: "B and C's mismatched decades are a
visible tell" - so in this round every item has at least one wrong option that ALSO holds the condition equal (the
table guarantees it); "strike the mismatched one" never leaves only the key.

### II21B-06 (quantitative, threshold stated in the PASSAGE; panel hhh, struck 1/1/1)
> On clear, calm winter nights, cold, dense air drains down the slopes of the Gannet Basin and pools on its floor
> beneath warmer air. The top of this cold pool usually sits about 1,400 meters above sea level. Climatologist Greer
> Lowell claims that a station above the cold pool can record milder winter nights than a station within it, despite
> sitting higher on the slope. Lowell's claim is supported by the fact that ______
>
> Table "Average January overnight minimum at six Gannet Basin stations": Gessel 960 m, −15.0°C; Halvern 1,140 m,
> −13.4°C; Ilbury 1,240 m, −11.6°C; Jessmont 1,580 m, −8.2°C; Kestow 1,870 m, −9.5°C; Lunder 2,260 m, −12.4°C.
> - the average minimum at Jessmont was −8.2°C, compared with −12.4°C at Lunder.
> - the average minimum at Ilbury was −11.6°C, compared with −15.0°C at Gessel.
> - the average minimum at Ilbury was −11.6°C, compared with −12.4°C at Lunder.
> - **(key)** the average minimum at Kestow was −9.5°C, compared with −13.4°C at Halvern.

Graders: "Requires classifying stations against the 1,400 m pool top." "B (Ilbury warmer than lower Gessel) shows an
inversion but entirely within the pool, which makes it the strongest lure. C runs the wrong way." Note: the options
print no elevations, so every option needs a lookup AND the passage's boundary.

### II22C-05 (quantitative, two conditions, the deciding column omitted from the options; panel h m h, struck 0/0/0)
> Economist Priya Okonkwo studied five weekly farmers markets in the Penwick region, where some vendors accept card
> payments and others take only cash. Many market organizers believe that a market where most vendors refuse cards
> cannot draw a large crowd. Okonkwo argues that accepting cards is not essential: at one market where fewer than
> half of the vendors accepted cards, there were more than 40 shoppers per vendor in an average week. ______
>
> Table "Five Penwick farmers markets in an average week" (Vendors / Shoppers / Vendors accepting cards %): Medlow
> 30 / 1,350 / 40; Nevin 25 / 1,150 / 72; Ossiter 40 / 1,400 / 35; Pollard 20 / 700 / 65; Rushmere 50 / 2,100 / 58.
> - Nevin drew 1,150 shoppers in an average week to its 25 vendors.
> - Rushmere drew 2,100 shoppers in an average week to its 50 vendors.
> - Ossiter drew 1,400 shoppers in an average week to its 40 vendors.
> - **(key)** Medlow drew 1,350 shoppers in an average week to its 30 vendors.

Graders: "Options omit the card column, so students must bring in a third cell; C (Ossiter, 35% cards) passes the
card test but has only 35 per vendor, and B (Rushmere, 42 per vendor) passes the ratio but not the card test."

---

## 3. Your rows: the slot table

The whole batch is built from `sat-ii-v23-work/SLOTS.json` (32 rows; yours are the 8 starting with your letter).
**The table fixes, for each of your items: the design, the stem (support / weaken), the key's ROLE, the three
distractor ROLES, the direction word, which option's two groups the passage's LAST sentence names, which options
compare one unit with itself, and the key LETTER.** You may not change any of them. You choose the topic, the
mechanism, the names, the numbers and the wording.

Why the table is this strict: in SEC v25 the construction table itself built a cross-item rule (every key paired
opposite numbers), graders found it in 10 of 10 items, and 20 of 29 kept items were held. This table was checked
before you started by `ii23-tellsim.mjs`, which plays a test-wise student applying any single or two-feature rule
over the roles across the whole batch; no such rule beats 0.50 (single) or 0.65 (pair) expected accuracy, and no
rule picks the key alone in more than 60% of items of a type. **Your job is to keep wording from re-creating the
rules the table removed**: do not make the key the only option that names a particular group, the only one with a
matched condition, the only one whose groups were introduced last, or the only one using a particular verb.

### Textual roles
Every textual passage names three factors:
- **T**: the factor of the person whose hypothesis the stem names;
- **R**: the factor of the rival account;
- **C**: a background condition the passage says affects the outcome by itself and that both accounts accept (an
  age, a season, an elevation, a decade, a size). On 4G rows there is no C.

"Winner" = the group the finding says shows MORE of the effect the hypothesis attributes to T, whatever the surface
wording ("more", "fewer", "earlier", "later"; the slot's `dir` is the word your four options use).

| Role | The comparison the option states |
|---|---|
| K-ISO | two groups that differ ONLY in T; the T group wins (support key) |
| K-CROSS | a T-only group against an R-only group, C equal; the T-only group wins (support key) |
| K-ISO-W | two groups that differ ONLY in T; the T group does NOT win (weaken key) |
| K-CROSS-W | T-only against R-only, C equal; the R-only group wins (weaken key) |
| CONF-R | both-T-and-R against neither; the both group wins (fits both accounts) |
| CONF-C | differ in T AND in C, R equal; the T group wins (C could explain it) |
| CONF-CW | differ in T AND in C, R equal; the T group does NOT win (C could explain it) |
| CONF-CX | T-only against R-only, but C differs; the T-only group wins |
| CONF-CXW | T-only against R-only, but C differs; the R-only group wins |
| RIV | differ ONLY in R; the R group wins (supports the rival, says nothing about T) |
| NEUT-C | differ ONLY in C; the group C favours wins (both accounts expect it) |
| WKR | differ ONLY in R; the R group does NOT win (weakens the rival: the wrong person) - weaken rows only |
| SUP / SUPX | as K-ISO / K-CROSS: supports T, the wrong direction - weaken rows only |
| WKN / WKNX | as K-ISO-W / K-CROSS-W: weakens T, the wrong direction - support rows only |

Designs (passage architecture):
- **4G**: four named groups crossing T and R. Support only; at most one per author (the table has one each).
- **3G**: three named groups plus C, which differs between some groups or is a condition one group is observed under.
- **3x2**: three named units, each observed under two conditions (six cells).
- **TIME**: units observed across periods; T (or R) begins at a stated date; C is the general trend over time.
- **DOSE**: three or more graded levels of T across groups, R present in some; C a background difference.

Rules for the comparisons:
- **No two options compare the same two groups**, and never the same pair in opposite directions (merge refuses a
  reversed pair through `meta.compare`). If your design cannot host your four roles on four different pairs, stop
  and say so in your reply; do not swap a role.
- **One frame**: all four options share one sentence frame and one vocabulary, and use the row's direction word. If
  one names a condition (season, decade), all do.
- **C must be stated as mattering on its own** somewhere in the passage, in a sentence that does not also name the
  key's groups.
- Every option is a finding that could be true; none contradicts a stated fact.
- No option restates the pattern the passage says both accounts already fit.

### Quantitative roles
Each quantitative claim has two criteria: **c1** a derived criterion (a ratio, a difference, a per-unit rate, or a
boundary stated in the passage), and **c2** a grouping or second condition (the claim's group, the second
condition, or the right side of the boundary). Every option is an ACCURATE reading of the table.

| Role | |
|---|---|
| QK | meets c1 AND c2 (the key) |
| Q-C1 | meets c1, fails c2 |
| Q-WITHIN | right direction, but both rows on one side of the passage's boundary (a c1-pass, c2-fail) |
| Q-C2 | meets c2, fails c1 |
| Q-RAW | the largest headline number of the four, fails c1 (the raw-value trap) |
| Q-NEAR | meets c2; its derived value just misses c1 (only arithmetic shows it) |
| Q-REV | compares the right kind of rows, in the wrong direction |
| Q-NONE | fails both, but never visibly: a student must look it up to see it |

Your row's `ranks` give each role's **headline number rank** among the four options (1 = smallest number printed in
the option; the "headline" number is the one the option leads with). Quantitative rules:
- **The options do not print the column that decides c2** (or, for a boundary design, the boundary value). The
  student must look it up (II21B-06, II22C-05).
- **At most one option visibly fails on the numbers it prints** (`meta.visible_fail` 0 or 1). Aim for 0.
- **No two distractors share a derived value** to 2 significant figures.
- **No option is the only one that crosses the claim's group label**, and no option is ruled out by a printed label.
- The table has 4-6 rows and 2-4 columns; numbers invented but plausible; explicit units; no real-world statistics.
- **Designs:** ratio, two-condition, threshold-text (the boundary is stated in the passage, not the table), change
  (across columns). Trend-break / exception is banned; group-best is not in this table.

---

## 4. Item format
- `id`, `domain` "Information and Ideas", `difficulty` "hard", `passage`, `prompt`, `choices` (4 strings),
  `correct_answer` (exactly one of the choices, at your row's letter), `explanation`, `topic_tag`.
- `subskill`: textual "Command of Textual Evidence"; quantitative "Command of Evidence" (the live labels).
- Quantitative only: `graphic` `{type:"table", title, colLabels, rowLabels, cells}`; cells is rows x cols of strings.
- Textual passage 90-150 words; quantitative passage 60-120 words ending in a claim and `______` (six underscores).
- Textual prompt: "Which finding, if true, would most directly support / weaken <person>'s hypothesis/claim?" with
  your row's stem.

`meta` (stripped before banking; the merge checks every field):

```json
{
  "design": "3G",                      // your row's design
  "stem": "weaken",                    // textual: your row's stem
  "dir": "less",                       // textual: your row's direction word
  "roles": ["SUP", "K-CROSS-W", "WKR", "CONF-CW"],   // the role of each choice, in choice order
  "compare": [["Ardley", "Corve"], ["Corve", "Ardley Fen"], ...],  // per choice: the 1-2 groups/rows it compares,
                                       // winner first, each string exactly as it appears in that choice's text
  "profiles": [{"win":[1,0,0],"lose":[0,0,0]}, ...],  // textual: per choice, winner and loser as [T,R,C] 0/1
  "last": "SUP",                       // textual: your row's last-sentence role (or null)
  "su": [],                            // textual: your row's same-unit roles
  "ranks": [2, 1, 4, 3],               // quantitative: per choice, its headline-number rank (from your row)
  "derived": [0.80, 0.75, 0.60, 0.65], // quantitative: per choice, its derived value (ratio, rate, difference)
  "visible_fail": 0,                   // quantitative: options that fail visibly on their printed numbers
  "table_design": "ratio",             // quantitative: = design
  "names": ["Ardley Fen", "Corinne ..."],  // every invented proper noun
  "distractor_pulls": {"<choice text start>": "why a strong student picks it", ...},  // one per distractor, 15+ chars
  "why_hard": "the combining step a strong student must make"
}
```

## 5. Everyone
- **Exactly one defensible answer.** For each distractor the explanation names the passage or table fact that kills
  it. If you cannot point at one, it is a second answer; rewrite it.
- **Explanations** quote choices in double quotes, never say "choice B", and quote passage text verbatim.
- **Length.** The key may be strictly the longest option in at most 2 of your 8 items and strictly the shortest in at
  most 2. Longest option <= 1.4 x the shortest.
- **Proper nouns.** Invented names only, given name and surname in YOUR range: A: A-F, B: G-L, C: M-R, D: S-Z. Never
  reuse a name across your items, or any name used in II21 or II22 (the merge checks their files). Places are
  invented too. Never attach an invented finding to a real named person or place.
- **Topics.** Your area (A life sciences; B earth, space and physical sciences; C social sciences and economics; D
  humanities, history and the arts). No `topic_tag` and no mechanism from v17, v21 or v22 (see
  `sat-ii-hard-v17.batch.json`, `sat-ii-hard-v21.batch.json`, `sat-ii-hard-v22.batch.json`).
- **Facts.** Real science and history stay correct; hedge where needed. A false background fact is worse than a dull
  passage.
- Academic register, American punctuation, double quotes.

## 6. Before you finish
Run, from the repository root:
- `node scripts/study-bank/ii23-exclusion.mjs scripts/study-bank/sat-ii-v23-work/<L>/items.json` - change anything
  flagged (a passage too close to a live I&I item or any II21/II22 candidate, an identical option set, 3+ shared
  options, an identical table);
- `node scripts/study-bank/ii23-merge.mjs` - fix every problem line that names your items (lines about missing
  authors are expected until everyone has delivered).

Then re-read every item as a hostile student who has seen the other seven: with the passage covered, can I pick the
key from the options alone? Which option would I strike first, and why? Is there anything the key alone does?

Reply with: each id and its role list in choice order; the key letters; the items you are least sure are uniquely
answerable, with why; any row you could not build without changing a role; the path of `items.json`.

## 7. After the probe (one revision round)
Two independent readers will answer the graders' own questions about every item before the batch is frozen. You
will receive `sat-ii-v23-work/<L>/PROBE-FEEDBACK.json`. **Every item marked `must_revise` must change in its words**
(a whitespace or punctuation edit does not count; `ii23-sprobe.mjs verify` checks this). Keep the row: letter,
roles, design, stem, ranks. Act on the readers' `not_hard_because`, their `struck_options` and any template partner.
Re-run the exclusion check and the merge after revising.
