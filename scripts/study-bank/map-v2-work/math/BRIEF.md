# map-v2 Math, batch 1 — author brief (grades 5-8, all four MAP maths areas, 11 authors, 221 slots)

You are writing MAP Growth-style maths multiple-choice items for **grades 5-8**: four options, every option a
plain number. They go into a question bank used by real students in a practice product (not NWEA's test).
Repo `/Users/andylee/Downloads/saas/classraum` (absolute paths always). Your task message names your
**author code** (O56, O78, G56, G78, N56, N7, N8, D5, D6, D7, D8). Write ONLY your own slots (tables at the end).

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not run git. No
web. Use only your own (Claude) reasoning; no external model calls, no GPT. **Never open any NWEA item, any
file with "herald" in its name, or any PDF.** Write from your own knowledge of the public Common Core
grade-level standards. Do not touch the database. Do not open another author's folder.

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/<your code>/` (git-excluded; create it).
`DUMP` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump` (every live maths row in every
family, 3,986, plus every earlier MAP and SAT batch item, for the duplicate search).

## Why this batch exists, in three lines

MAP maths has 68 staged items and 0 complete forms; 5 forms need 50 per area. Earlier MAP batches got every key
right (cold graders on key 40/40, 148/148) and lost items on **free elimination** and on **authoring yield**:
in v5 two authors filled 26 of 44 slots. Write every slot; a slot left empty costs more than an item the
screen returns to you.

## How you write

Write your items as ONE JSON array in `WORK/items.json`, in slot order, adding each item as soon as it is
finished. After each item (or every few) run, from the repo root:

    node scripts/study-bank/map-v2-work/math/math-check.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/<code>/items.json

Fix every `PART FAIL` until every item prints `PART OK`. `(read)` lines are not failures: answer each one in
the item's `self_audit.note`. The check runs the sandbox (your `solve` and every `distractor_solve` are
executed), your slot, the construction rules below, and a near-duplicate search against live ISEE and SSAT
maths and every earlier MAP item. It cannot see a re-skinned mechanism; you must (rule 1).

Scratch work goes in `WORK/scratch/`. Do not create any file in the repo outside `WORK`.

## Slots

Each slot fixes the area, grade, **tier** and where the key sits **by value** among the four options:
S = smallest, L = largest, I = one of the two middle values. You may not change them. About 70% of slots are
S or L on purpose: end-position keys die far more often than interior ones (v4: 2 of 24 survived; v5 with
rules 20-26: 6 of 15), and the inserter refuses a batch whose kept keys sit at an extreme under 40% of the time.

**Tiers.** low = most students in that grade get it right (one or two routine steps on the grade's standard);
mid = about half of the grade gets it right (two real steps, or one step that needs the grade's key idea);
high = only stronger students in the grade get it right (a decision point, a multi-step setup, a common
misconception that is genuinely tempting). A high item is hard *for that grade* by depth of the grade's own
content, never by borrowing a later grade's content or by puzzle wording. Earlier MAP batches ran easy.

`rit_band` (copy exactly): grade 5 low/mid/high `"RIT 190-199"` / `"RIT 200-209"` / `"RIT 210-219"`; grades
6 and 7 `"RIT 200-209"` / `"RIT 210-219"` / `"RIT 220-229"`; grade 8 `"RIT 210-219"` / `"RIT 220-229"` /
`"RIT 230-239"`. `difficulty`: low = `"easy"`, mid = `"medium"`, high = `"hard"`.

## Content per area and grade (nothing else; off-blueprint items are dropped)

**O — Operations and Algebraic Thinking** (O56: grades 5-6; O78: grades 7-8)
- g5 5.OA: numerical expressions with parentheses / brackets, writing and evaluating expressions from words, two numerical patterns and their relationship
- g6 6.RP (ratios, unit rates, percent of a quantity, ratio tables, unit conversion by ratio) and 6.EE (exponents in expressions, evaluating expressions, equivalent expressions, one-step equations and inequalities, dependent / independent variables)
- g7 7.RP (proportional relationships, constant of proportionality, multistep ratio and percent problems: tax, markup, discount, interest, percent error) and 7.EE (px + q = r, p(x + q) = r, inequalities px + q > r, rewriting expressions)
- g8 8.EE.B-C (proportional relationships and slope, linear equations in one variable including ones with no / infinitely many solutions, systems of two linear equations) and 8.F (functions, rate of change and initial value from a table / description / two points, comparing functions). 8.EE.A belongs to N.

**N — Real and Complex Number Systems** (N56: grades 5-6; N7: grade 7; N8: grade 8)
- g5 5.NBT (place value, powers of ten, multi-digit multiplication and division, decimal operations to hundredths) and 5.NF (adding / subtracting unlike fractions and mixed numbers, multiplying and dividing fractions, unit fractions by whole numbers, fraction word problems)
- g6 6.NS (dividing fractions by fractions, multi-digit decimals, GCF and LCM, the distributive property with GCF, integers and absolute value, rational numbers on a number line, distance between points with one shared coordinate)
- g7 7.NS (adding, subtracting, multiplying, dividing rational numbers including negatives; converting fractions to decimals; multistep problems with rational numbers)
- g8 8.NS (irrational numbers, rational approximations, ordering) and 8.EE.A (integer exponents, square and cube roots, scientific notation and operations with it)

**G — Geometry** (G56: grades 5-6; G78: grades 7-8). No figure: describe it completely in words.
- g5 5.G (coordinate plane first quadrant, distances along grid lines, classifying two-dimensional figures by properties) and 5.MD.C (volume of right rectangular prisms, unit cubes, volumes of two non-overlapping prisms)
- g6 6.G (area of right triangles, triangles, special quadrilaterals and composite polygons; volume with fractional edge lengths; surface area from nets; polygons in the coordinate plane)
- g7 7.G (scale drawings, angle relationships: supplementary, complementary, vertical, adjacent; circle area and circumference with 3.14; area, volume and surface area of composite figures; triangle conditions)
- g8 8.G (Pythagorean theorem and its converse, distance in the coordinate plane, volume of cylinders, cones and spheres with 3.14, angle sums and exterior angles, angles from parallel lines cut by a transversal, the effect of a dilation / translation / reflection / rotation on coordinates)

**D — Statistics and Probability** (D5, D6, D7, D8: one grade each)
- g5 5.MD.A-B (converting among units within one measurement system; line plots of fractional measurements and operations on that data). Give a line plot as a `graphic` `{"type":"table","rowLabels":[...values],"colLabels":["Number of ..."],"cells":[[n],...]}`.
- g6 6.SP (mean, median, mode, range, interquartile range, mean absolute deviation, effect of one value on a measure, reading a dot plot / histogram / frequency table given as a table)
- g7 7.SP (random samples and inference from a sample, comparing two populations, probability of simple and compound events, sample spaces, experimental vs theoretical probability)
- g8 8.SP (scatter plots and a line of fit given as an equation, predicted values, slope / intercept meaning numerically, two-way tables and relative frequencies)
- D items may carry a `graphic` (table, twowaytable, bar) when the item needs data; the graphic must be NEEDED
  (cover it and the item must become unanswerable). Every other area: no graphic.

**Distinct sub-assignments, so no two authors converge.** Each author owns a distinct (area, grade) cell; nobody
else writes your grade in your area. Inside your cell, spread your items over EVERY cluster listed for your grade
(no cluster more than 40% of your items) and use each context family (money, recipe, sport, travel, school,
building, nature, science measurement, games) at most three times.

## Item schema (every field required unless marked)

    {
     "id": "MV2-N7-04", "domain": "<the area's full name, exactly as above>", "map_area": "oa"|"num"|"geo"|"data",
     "grade_target": 7, "tier": "low"|"mid"|"high", "rit_band": "RIT 210-219", "difficulty": "easy"|"medium"|"hard",
     "ccss": "7.NS.A.3", "area_25": "<grade 5 only: Operations and Algebraic Thinking | Number and Operations | Geometry | Measurement and Data>",
     "subskill": "<short label, < 60 chars>",
     "grade_rationale": "<why this is a <tier> item for grade <g>: which standard, which step is the hard one, what a typical student of that grade does>",
     "prompt": "<stem; plain text; reading level of the grade; ASCII '-' for minus; units in the stem, not the options>",
     "graphic": <D only, optional, as above>,
     "choices": ["..","..","..",".."],   // plain numbers only: integers, decimals, a/b, mixed "2 1/4", negatives "-3"
     "correct_answer": "<exactly one of choices>",
     "explanation": "<student-facing worked solution at the grade's level>",
     "solve": "<JS function body returning the key>",
     "distractor_solve": { "<option>": "<JS body returning exactly that option, rounding included>", ... 3 },
     "mechanism": ["2-4 short phrases naming the chain of steps"],
     "quantity_asked": "<what the stem asks for>",
     "plugback": { "substitutable": true|false, "verify": "<JS body of v: true iff v satisfies the stem; REQUIRED if substitutable>", "why": "<how a student would check an option against the stem>" },
     "distractor_meta": { "<option>": { "error_kind": "<kind>", "error_sense": "omits"|"adds"|"swaps", "direction": "above"|"below", "stem_predicts_direction": false, "slip": true|false, "misconception": "<the named misconception>", "why": "<the student's wrong path, in a sentence a teacher would recognise>" }, ... 3 },
     "counter_error": { "error_kind": "<kind>", "solve": "<JS body>", "direction": "above"|"below", "why": "<the natural error>" },   // REQUIRED on S and L slots
     "far_distractor": { "option": "<a distractor>", "natural_side": "above"|"below", "why": "<why an error of this kind, which ordinarily lands past the key, lands on the near side HERE>" },   // REQUIRED on S and L
     "structure_check": "<S/L: does the stem tell a student which way EVERY error goes? It must not; say why not>",
     "intermediate_check": "<for EACH distractor: is it a value the key follows from through ONE printed rate, price or relation? each 'no', with the reason>",
     "cheap_bound_check": "<S/L: the cheapest one-sided bound readable from the stem, and which distractor sits on the key's side of it; I: 'interior key'>",
     "shape_check": "<properties the stem hands over (sign, whole number, cap, more/less than a printed amount) and which options survive each; >= 2 survive all together>",
     "interior_parity_check": "<the two middle values: same display form and complexity? the key is not the cleaner one>",
     "arith_class_check": "<is the key alone in a class (whole vs fraction, even, multiple of k, round, negative) the stem implies?>",
     "dup_search": { "queries": ["<mf30-kw.mjs queries you ran>"], "hits_read": <n>, "nearest": "<id + why it is different>" },
     "bound_screen": [ { "kind": "sign"|"magnitude"|"parity"|"units_digit"|"range", "bound": "<the cheapest bound of this kind a student can read from the stem WITHOUT doing the work, or 'none: <why>'>", "strikes": ["<options it rules out; at most ONE distractor, never the key>"] }, ... all five kinds ],
     "self_audit": { "risk": "low|medium|high", "note": "<what a test-wise student would try, and why it fails; answer every (read) line>" }
    }

`error_kind`: `sign_slip`, `inverted_rate`, `wrong_variable`, `wrong_operation`, `wrong_base`, `omission`,
`partial_answer`, `other`. `error_sense`: `omits` (leaves out a step, term or condition, or stops early), `adds`
(extra step, double count, ignores a reducing condition), `swaps` (sign, inversion, swapped quantity, wrong
operation or base). An `omission` is always `omits`.

## Rules (binding; math-check.mjs enforces most of them)

1. **One mechanism per item, new to the bank.** Before writing each item run 2-4 searches and READ every hit:
   `node scripts/study-bank/mf30-kw.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump "term&term|alt"`
   (`&` = all terms, `|` = alternation). Record them in `dup_search`. **The 709 live ISEE maths rows already hold
   the standard grade 5-8 canon** (isee-math-s18 found ~44 of 60 in-session items duplicating live ones while the
   scripted checks reported 0). A new story over the same chain of steps IS a duplicate. Also read
   `scripts/study-bank/map-v2-work/math/EXCLUSIONS-map-math.txt` for your area and grade before you start: every
   MAP maths item ever authored, banked or not.
2. `solve` recomputes the key from the stem's numbers; `distractor_solve` for **every** distractor.
3. **Distractors are real student errors from different named wrong paths**, the errors a teacher of that grade
   actually sees. No derivational hub; no option = sum / difference / average / product of two others; no +/- pair
   containing the key; no evenly spaced or geometric run of three options through the key; no decimal-shift
   sibling of the key unless it is a genuine place-value error on a place-value item.
4. **No one-sided error family.** At least two distinct `error_kind`s, at least one of sign_slip / inverted_rate /
   wrong_variable / wrong_operation / wrong_base, at most one omission / partial_answer.
5. **Extreme keys (S/L): a real distractor from the far side.** The three distractors may not all be `omits` (nor
   all `adds`). `far_distractor` names a REAL distractor whose error ordinarily lands past the key and lands on the
   near side here; `counter_error` is a natural error (not an option) that lands strictly past the key.
6. **Banned asks on S/L slots:** greatest / least / maximum / minimum / largest / smallest, "sum of all", "possible
   values", "for every / each / all / any", vertex, peak, highest, lowest, "top of".
7. **Option pairs.** The key must not equal another option combined by ONE operation (+, -, x, /) with a number
   printed in the stem (other than 1), nor differ from an option by the sum of two printed numbers. "How many
   MORE", "one extra", "total vs each" distractors hand over the key.
8. **Plug-back.** If an option can be checked against the stem in one routine step, set `substitutable` true,
   write `verify`, and the key must sit at try 3 or 4 in ascending order (descending on a "most" stem). On an S
   slot ask for a quantity a student cannot confirm from the option.
9. **Every option is a legal value** of the quantity asked; at least two options survive every property the stem
   hands over.
10. **Interior parity:** the two middle values share display form and complexity; the key is not the cleaner one.
    No two options summing to 1, 90, 180, 360 or 100 unless that sum is the point and the key is not in the pair.
11. **The key is not a number printed in the stem** (or in the graphic).
12. **No solved intermediate as a distractor** (the distance when the stem prints the speed and asks the time).
13. Within your own items: no key value repeated, no option set repeated, no wrong idea reused (rule 27).
14. **Rounding / "closest to" stems:** every option a rounded value of the same form, or ask an exact quantity.
15. **Every number in the stem is used.**
16. **No cheap bound strikes more than one distractor** (`bound_screen`, all five kinds). If one would strike two,
    rebuild the distractors. Your declaration is a self-check, not the test: a separate cold screener looks for
    the bound you did not think of, and returns the item to you once.
17. **LONE — no option alone by sign or size** (all areas, refused by the check).
18. **SLIP — three different named misconceptions; at most one computational slip** (refused in Number Systems,
    advised elsewhere). Slips land beside the key and make it the centre of the set.
19. **FORM — every option in the key's surface form** (same decimal places; same lowest-terms denominator; the key's
    exact final digit when the key has two or more digits). Refused in Number Systems, where its absence produced
    the digit tells that held v4; advised elsewhere: if an option's last digit or denominator alone would rule it
    out, fix it.
20. **The cover-the-question test, before you hand in each item.** Cover the stem. Is one number far from the rest?
    Is one the centre the other three look built from (half, double, x10, one digit changed, a carry)? If yes,
    rebuild. Then uncover the stem: which two could a student cross out from the printed numbers alone?
21. **End-position recipe (S/L).** Two directions in the problem (a step that raises the answer and one that lowers
    it); a real error from the far side landing on the near side; no single estimate puts all three distractors past
    the key (one sits within about 10% of the key on its side of the bound); not checkable by plugging in.
22. **Tier, set honestly.** Dividing by a decimal or working across zero with mixed numbers is never low. If the item
    is harder than its slot's tier, simplify the numbers, not the label.
23. ASCII `-`; "xy-plane" only at grade 8 ("coordinate plane" earlier); plain everyday contexts at the grade's
    reading level; no reviewer-facing text in `explanation`.

## Before you finish

Every item prints `PART OK`. In `self_audit.note` answer, per S/L item: "covering the work, could a student tell
which way the errors go and strike all three? does one bound strike all three?"; per S / lower-interior item:
"could a student check an option in one routine step?"; per item: "is any distractor a solved intermediate?", "is
this really a <tier> item for grade <g>?" and "which cheap bound strikes the most distractors, and is it at most
one?" Reply with one line per slot: id, grade, tier, key position, key, quantity asked, PART OK (or EMPTY and why).

## What happens next (so you know what the screen tests)

A cold screener (no access to your notes) looks for free eliminations and returns failing items to you ONCE; an
options-only attack (three samples, four numbers and no stem) is compared against matched live ISEE items; two
graders solve every item cold, then check key, exclusivity, free elimination and grade fit. Items both graders
can eliminate to a coin flip are dropped. Passing items are inserted live.

---

## Pasted: AUTHORING-RULES-FROM-NOTES.md (binding; written for every bank brief, most items are reading rules, all apply where they fit maths: one defensible answer, check every real-world claim, no cross-item key pattern, the key must not stand out)

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

---

## Slot tables (seeded, map-v2-math-b1-slots-2026-10-24; also in slots.json)

### Author O56 — Operations and Algebraic Thinking, grade 5 x11, grade 6 x11 (22 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-O56-01 | 5 | low | S |
| MV2-O56-02 | 5 | high | I |
| MV2-O56-03 | 5 | low | L |
| MV2-O56-04 | 5 | mid | S |
| MV2-O56-05 | 5 | mid | I |
| MV2-O56-06 | 5 | high | L |
| MV2-O56-07 | 5 | mid | I |
| MV2-O56-08 | 5 | mid | S |
| MV2-O56-09 | 5 | mid | L |
| MV2-O56-10 | 5 | high | S |
| MV2-O56-11 | 5 | low | L |
| MV2-O56-12 | 6 | high | L |
| MV2-O56-13 | 6 | low | S |
| MV2-O56-14 | 6 | mid | L |
| MV2-O56-15 | 6 | high | S |
| MV2-O56-16 | 6 | low | L |
| MV2-O56-17 | 6 | mid | I |
| MV2-O56-18 | 6 | mid | L |
| MV2-O56-19 | 6 | mid | I |
| MV2-O56-20 | 6 | high | S |
| MV2-O56-21 | 6 | mid | I |
| MV2-O56-22 | 6 | low | S |

key positions: S 8 / L 8 / I 6; tiers low 6 / mid 10 / high 6

### Author O78 — Operations and Algebraic Thinking, grade 7 x11, grade 8 x10 (21 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-O78-01 | 7 | low | S |
| MV2-O78-02 | 7 | high | L |
| MV2-O78-03 | 7 | high | S |
| MV2-O78-04 | 7 | low | L |
| MV2-O78-05 | 7 | mid | I |
| MV2-O78-06 | 7 | mid | L |
| MV2-O78-07 | 7 | mid | I |
| MV2-O78-08 | 7 | mid | L |
| MV2-O78-09 | 7 | low | S |
| MV2-O78-10 | 7 | mid | I |
| MV2-O78-11 | 7 | high | S |
| MV2-O78-12 | 8 | high | L |
| MV2-O78-13 | 8 | mid | S |
| MV2-O78-14 | 8 | mid | L |
| MV2-O78-15 | 8 | mid | I |
| MV2-O78-16 | 8 | high | S |
| MV2-O78-17 | 8 | low | I |
| MV2-O78-18 | 8 | mid | S |
| MV2-O78-19 | 8 | high | I |
| MV2-O78-20 | 8 | low | S |
| MV2-O78-21 | 8 | low | L |

key positions: S 8 / L 7 / I 6; tiers low 6 / mid 9 / high 6

### Author G56 — Geometry, grade 5 x16, grade 6 x10 (26 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-G56-01 | 5 | low | L |
| MV2-G56-02 | 5 | high | I |
| MV2-G56-03 | 5 | mid | S |
| MV2-G56-04 | 5 | mid | I |
| MV2-G56-05 | 5 | mid | I |
| MV2-G56-06 | 5 | low | L |
| MV2-G56-07 | 5 | high | I |
| MV2-G56-08 | 5 | mid | L |
| MV2-G56-09 | 5 | low | L |
| MV2-G56-10 | 5 | high | S |
| MV2-G56-11 | 5 | high | I |
| MV2-G56-12 | 5 | low | S |
| MV2-G56-13 | 5 | low | S |
| MV2-G56-14 | 5 | high | L |
| MV2-G56-15 | 5 | mid | S |
| MV2-G56-16 | 5 | mid | S |
| MV2-G56-17 | 6 | high | S |
| MV2-G56-18 | 6 | mid | I |
| MV2-G56-19 | 6 | mid | L |
| MV2-G56-20 | 6 | mid | L |
| MV2-G56-21 | 6 | low | I |
| MV2-G56-22 | 6 | mid | S |
| MV2-G56-23 | 6 | low | L |
| MV2-G56-24 | 6 | high | S |
| MV2-G56-25 | 6 | high | I |
| MV2-G56-26 | 6 | low | S |

key positions: S 10 / L 8 / I 8; tiers low 8 / mid 10 / high 8

### Author G78 — Geometry, grade 7 x11, grade 8 x14 (25 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-G78-01 | 7 | high | L |
| MV2-G78-02 | 7 | low | L |
| MV2-G78-03 | 7 | high | I |
| MV2-G78-04 | 7 | low | L |
| MV2-G78-05 | 7 | high | I |
| MV2-G78-06 | 7 | mid | L |
| MV2-G78-07 | 7 | low | S |
| MV2-G78-08 | 7 | mid | I |
| MV2-G78-09 | 7 | mid | S |
| MV2-G78-10 | 7 | mid | S |
| MV2-G78-11 | 7 | mid | S |
| MV2-G78-12 | 8 | mid | S |
| MV2-G78-13 | 8 | mid | L |
| MV2-G78-14 | 8 | high | I |
| MV2-G78-15 | 8 | mid | L |
| MV2-G78-16 | 8 | mid | L |
| MV2-G78-17 | 8 | low | S |
| MV2-G78-18 | 8 | high | S |
| MV2-G78-19 | 8 | low | L |
| MV2-G78-20 | 8 | high | S |
| MV2-G78-21 | 8 | low | I |
| MV2-G78-22 | 8 | low | S |
| MV2-G78-23 | 8 | high | L |
| MV2-G78-24 | 8 | mid | I |
| MV2-G78-25 | 8 | mid | I |

key positions: S 9 / L 9 / I 7; tiers low 7 / mid 11 / high 7

### Author N56 — Real and Complex Number Systems, grade 5 x8, grade 6 x17 (25 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-N56-01 | 5 | mid | I |
| MV2-N56-02 | 5 | high | S |
| MV2-N56-03 | 5 | mid | L |
| MV2-N56-04 | 5 | low | L |
| MV2-N56-05 | 5 | low | S |
| MV2-N56-06 | 5 | mid | I |
| MV2-N56-07 | 5 | high | S |
| MV2-N56-08 | 5 | mid | L |
| MV2-N56-09 | 6 | low | I |
| MV2-N56-10 | 6 | mid | I |
| MV2-N56-11 | 6 | high | L |
| MV2-N56-12 | 6 | mid | L |
| MV2-N56-13 | 6 | low | S |
| MV2-N56-14 | 6 | low | I |
| MV2-N56-15 | 6 | mid | S |
| MV2-N56-16 | 6 | mid | L |
| MV2-N56-17 | 6 | high | S |
| MV2-N56-18 | 6 | high | L |
| MV2-N56-19 | 6 | high | I |
| MV2-N56-20 | 6 | mid | L |
| MV2-N56-21 | 6 | mid | L |
| MV2-N56-22 | 6 | low | S |
| MV2-N56-23 | 6 | high | S |
| MV2-N56-24 | 6 | mid | S |
| MV2-N56-25 | 6 | low | I |

key positions: S 9 / L 9 / I 7; tiers low 7 / mid 11 / high 7

### Author N7 — Real and Complex Number Systems, grade 7 x19 (19 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-N7-01 | 7 | low | I |
| MV2-N7-02 | 7 | mid | L |
| MV2-N7-03 | 7 | high | S |
| MV2-N7-04 | 7 | mid | I |
| MV2-N7-05 | 7 | mid | L |
| MV2-N7-06 | 7 | mid | L |
| MV2-N7-07 | 7 | high | I |
| MV2-N7-08 | 7 | mid | I |
| MV2-N7-09 | 7 | mid | I |
| MV2-N7-10 | 7 | low | S |
| MV2-N7-11 | 7 | low | L |
| MV2-N7-12 | 7 | low | S |
| MV2-N7-13 | 7 | low | L |
| MV2-N7-14 | 7 | high | L |
| MV2-N7-15 | 7 | mid | S |
| MV2-N7-16 | 7 | low | S |
| MV2-N7-17 | 7 | mid | I |
| MV2-N7-18 | 7 | high | S |
| MV2-N7-19 | 7 | high | S |

key positions: S 7 / L 6 / I 6; tiers low 6 / mid 8 / high 5

### Author N8 — Real and Complex Number Systems, grade 8 x19 (19 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-N8-01 | 8 | mid | L |
| MV2-N8-02 | 8 | high | S |
| MV2-N8-03 | 8 | high | S |
| MV2-N8-04 | 8 | mid | I |
| MV2-N8-05 | 8 | mid | L |
| MV2-N8-06 | 8 | high | I |
| MV2-N8-07 | 8 | mid | L |
| MV2-N8-08 | 8 | mid | L |
| MV2-N8-09 | 8 | low | S |
| MV2-N8-10 | 8 | low | L |
| MV2-N8-11 | 8 | low | I |
| MV2-N8-12 | 8 | mid | S |
| MV2-N8-13 | 8 | mid | I |
| MV2-N8-14 | 8 | high | I |
| MV2-N8-15 | 8 | low | I |
| MV2-N8-16 | 8 | low | S |
| MV2-N8-17 | 8 | low | L |
| MV2-N8-18 | 8 | high | S |
| MV2-N8-19 | 8 | mid | S |

key positions: S 7 / L 6 / I 6; tiers low 6 / mid 8 / high 5

### Author D5 — Statistics and Probability, grade 5 x17 (17 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-D5-01 | 5 | high | I |
| MV2-D5-02 | 5 | low | I |
| MV2-D5-03 | 5 | low | L |
| MV2-D5-04 | 5 | low | S |
| MV2-D5-05 | 5 | mid | L |
| MV2-D5-06 | 5 | mid | L |
| MV2-D5-07 | 5 | high | L |
| MV2-D5-08 | 5 | mid | I |
| MV2-D5-09 | 5 | low | S |
| MV2-D5-10 | 5 | mid | L |
| MV2-D5-11 | 5 | high | I |
| MV2-D5-12 | 5 | high | S |
| MV2-D5-13 | 5 | mid | L |
| MV2-D5-14 | 5 | mid | S |
| MV2-D5-15 | 5 | high | S |
| MV2-D5-16 | 5 | low | I |
| MV2-D5-17 | 5 | mid | S |

key positions: S 6 / L 6 / I 5; tiers low 5 / mid 7 / high 5

### Author D6 — Statistics and Probability, grade 6 x16 (16 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-D6-01 | 6 | high | L |
| MV2-D6-02 | 6 | mid | S |
| MV2-D6-03 | 6 | mid | S |
| MV2-D6-04 | 6 | low | L |
| MV2-D6-05 | 6 | low | S |
| MV2-D6-06 | 6 | high | L |
| MV2-D6-07 | 6 | mid | S |
| MV2-D6-08 | 6 | mid | L |
| MV2-D6-09 | 6 | low | S |
| MV2-D6-10 | 6 | low | S |
| MV2-D6-11 | 6 | high | I |
| MV2-D6-12 | 6 | mid | I |
| MV2-D6-13 | 6 | high | I |
| MV2-D6-14 | 6 | low | I |
| MV2-D6-15 | 6 | mid | I |
| MV2-D6-16 | 6 | high | L |

key positions: S 6 / L 5 / I 5; tiers low 5 / mid 6 / high 5

### Author D7 — Statistics and Probability, grade 7 x17 (17 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-D7-01 | 7 | high | L |
| MV2-D7-02 | 7 | high | L |
| MV2-D7-03 | 7 | mid | I |
| MV2-D7-04 | 7 | high | S |
| MV2-D7-05 | 7 | mid | S |
| MV2-D7-06 | 7 | mid | L |
| MV2-D7-07 | 7 | mid | S |
| MV2-D7-08 | 7 | low | L |
| MV2-D7-09 | 7 | low | I |
| MV2-D7-10 | 7 | mid | I |
| MV2-D7-11 | 7 | low | S |
| MV2-D7-12 | 7 | low | S |
| MV2-D7-13 | 7 | high | S |
| MV2-D7-14 | 7 | mid | I |
| MV2-D7-15 | 7 | low | L |
| MV2-D7-16 | 7 | high | I |
| MV2-D7-17 | 7 | mid | L |

key positions: S 6 / L 6 / I 5; tiers low 5 / mid 7 / high 5

### Author D8 — Statistics and Probability, grade 8 x14 (14 slots)

| id | grade | tier | key position |
|---|---|---|---|
| MV2-D8-01 | 8 | low | I |
| MV2-D8-02 | 8 | mid | I |
| MV2-D8-03 | 8 | mid | L |
| MV2-D8-04 | 8 | mid | I |
| MV2-D8-05 | 8 | low | S |
| MV2-D8-06 | 8 | low | L |
| MV2-D8-07 | 8 | low | L |
| MV2-D8-08 | 8 | mid | L |
| MV2-D8-09 | 8 | mid | S |
| MV2-D8-10 | 8 | high | S |
| MV2-D8-11 | 8 | high | S |
| MV2-D8-12 | 8 | high | I |
| MV2-D8-13 | 8 | mid | S |
| MV2-D8-14 | 8 | high | L |

key positions: S 5 / L 5 / I 4; tiers low 4 / mid 6 / high 4
