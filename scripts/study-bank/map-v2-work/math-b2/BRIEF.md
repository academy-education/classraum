# map-v2 Math, batch 2 — author brief (grades 5-8, all four MAP maths areas, 16 authors, 254 slots)

You are writing MAP Growth-style maths multiple-choice items for **grades 5-8**: four options, every option a
plain number. They go into a question bank used by real students in a practice product (not NWEA's test).
Repo `/Users/andylee/Downloads/saas/classraum` (absolute paths always). Your task message names your
**author code** (O5, O6R, O6E, O7R, O7E, O8, G5, G6, G7A, G7B, G8, N56, N78, D5, D67, D8) and whether you write
**ALL** your slots or **CORE** slots only (rows marked `core` in your table). Write ONLY your own slots.

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command, and never start a
search or loop with no bound (batch 1: one author left an unbounded search running). Do not run git. No web. Use
only your own (Claude) reasoning; no external model calls, no GPT. **Never open any NWEA item, any file with
"herald" in its name, or any PDF.** Write from your own knowledge of the public Common Core grade-level standards.
Do not touch the database. Do not open another author's folder.

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-b2-work/<your code>/` (git-excluded; create it).
`DUMP` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b2` (every live maths row in every
family, plus every earlier MAP and SAT batch item, **plus all 221 map-math-v2 batch-1 items**: 103 now live, 118
withdrawn or dropped).

## Why this batch exists, and what batch 1 taught

Live MAP maths is 103 items (Operations 15, Number Systems 32, Geometry 22, Statistics 34): one complete form.
Five forms need 50 per area. Batch 1 kept 103 of 221 (47%) and got every key right (cold answers 270/270). It lost
items in one place above all others:

    batch 1, kept / authored     end key (S or L)    interior key (I)
    all areas                      59/156  38%          44/65  68%
    Operations                      6/31   19%           9/12  75%
    end keys at low tier           11/51   22%
    end keys at mid / high         25/61 41% / 23/44 52%

On a bare computation every natural error falls on one side of the key (a product, a scale-up, a total, a single
root: every slip makes it smaller, or every slip makes it bigger). A key at the end of that set is "pick the end",
the cold screener struck it (`one-sided`, `single bound kills all`), and 72 of the 86 withdrawals were end-key
slots whose authors could find no real error on the other side. **Batch 2 keeps end keys only where real errors fall
on BOTH sides**, and has about half end keys instead of 70%.

The end keys that survived share one shape. Reading the 59 survivors: the answer is a **difference of two computed
amounts**, a **signed chain that moves both ways**, an input that sits in a **divisor**, or a **subtracted term
inside the chain**. Errors in the first part push the answer one way and errors in the second part push it the
other. Measured on batch 1 (in-sample, a hypothesis this batch tests, not a law): end keys on stems of that shape
kept **31/57 (54%)**; end keys on every other stem kept **28/99 (28%)**.

## How you write

Write your items as ONE JSON array in `WORK/items.json`, in slot order, adding each item as soon as it is finished.
After each item (or every few) run, from the repo root:

    node scripts/study-bank/map-v2-work/math/math-check.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-b2-work/<code>/items.json --slots scripts/study-bank/map-v2-work/math-b2/slots.json --prior /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b2/prior-math.json --families isee,ssat,map

**All three flags, every time.** Without `--slots` every item fails "not a slot"; without `--prior` and
`--families ...,map` the check cannot see batch 1, and a verbatim copy of a LIVE batch-1 item prints PART OK (tested
2026-10-24). Fix every `PART FAIL` until every item prints `PART OK`. `(read)` lines are not failures: answer each
one in the item's `self_audit.note`. The check runs the sandbox (your `solve` and every `distractor_solve` are
executed), your slot, the construction rules below, and a near-duplicate search against live ISEE, SSAT and MAP
maths and every earlier MAP item. It cannot see a re-skinned mechanism; you must (rule 1).

Scratch work goes in `WORK/scratch/`. Do not create any file in the repo outside `WORK`.

## Slots

Each slot fixes the area, grade, **tier**, where the key sits **by value** among the four options (S = smallest,
L = largest, I = one of the two middle values), the **mechanism** (the chain of steps) and, on S and L slots, the
**two-sided class**. You may not change grade, tier or key position.

**The mechanism is yours alone.** Every mechanism in every table below is different, so no two authors (and no two
of your own slots) converge on one template: batch 1 lost 8 items to "template of an earlier item", 6 of them in
Geometry and most inside one author's own file (composite volumes, a Pythagorean slope distance twice, angle
equations twice). Write the slot's mechanism with your own context and numbers. If after a real attempt the
mechanism cannot meet the rules in its slot, you may replace it with a different mechanism **of the same class, the
same cluster, and appearing in no table of this brief**; record it in `self_audit.note` as `MECHANISM SWAP: <old> ->
<new>, because <reason>`. Never borrow a mechanism from another author's table.

**About half the slots are S or L (127 of 254), and they sit where they survive:** about 1 in 5 low-tier slots (12 of 62), about
3 in 5 mid-tier (66 of 111) and 3 in 5 high-tier (49 of 81). The inserter refuses an area whose kept keys sit at an end under 40% of the
time, so end-key items that survive are what lets the interior ones go live; an end-key slot left empty costs the
area more than any other.

**Tiers.** low = most students in that grade get it right (one or two routine steps on the grade's standard);
mid = about half of the grade gets it right (two real steps, or one step that needs the grade's key idea);
high = only stronger students in the grade get it right (a decision point, a multi-step setup, a common
misconception that is genuinely tempting). A high item is hard *for that grade* by depth of the grade's own
content, never by borrowing a later grade's content or by puzzle wording. A low item is still the grade's own
content: "add two table cells" at grade 6 and "box minus a cube" at grade 7 were dropped as below grade.

`rit_band` (copy exactly): grade 5 low/mid/high `"RIT 190-199"` / `"RIT 200-209"` / `"RIT 210-219"`; grades
6 and 7 `"RIT 200-209"` / `"RIT 210-219"` / `"RIT 220-229"`; grade 8 `"RIT 210-219"` / `"RIT 220-229"` /
`"RIT 230-239"`. `difficulty`: low = `"easy"`, mid = `"medium"`, high = `"hard"`.

## End keys: the two-sided classes (S and L slots only)

Your S/L slot names one class. The item must actually have it: **at least one distractor comes from an error in
the part that pushes the answer the other way**, and that distractor sits on the near side of the key.

| class | what makes errors fall on both sides | batch-1 survivors (live; read them, do not copy them) |
|---|---|---|
| DIFF | the answer is A - B with A and B both computed: an error that inflates A raises the answer, one that inflates B lowers it | O: MV2-O78-13 (decrease in y over an interval). N: MV2-N56-07 (two farms, per-crate difference), MV2-N7-03 (two temperature rises). G: MV2-G78-12 (cylinder minus hemisphere), MV2-G56-22 (dough minus triangle). D: MV2-D7-05 (two sample estimates), MV2-D6-16 (IQR difference) |
| SIGNED | moves in both directions on a signed scale: a sign or direction slip on the down move and one on the up move land on opposite sides | N: MV2-N7-18 (elevator down then up), MV2-N7-19 (glacier), MV2-N56-24 (opposite, then move right). O: MV2-O78-16 (x + y with negative y) |
| DIVISOR | a quantity sits in a divisor: dividing by the wrong, larger count lowers the answer, by a smaller one raises it; inverting a rate flips the side | O: MV2-O56-04 (share among 9 people vs the 6 bags), MV2-O78-12 (x in the divisor). N: MV2-N56-17 (two pump times). D: MV2-D7-13 (plots of 1/4 square mile) |
| NEGTERM | a term is subtracted inside the chain: under-removing raises the answer, over-removing lowers it, and a dropped grouping can do either | O: MV2-O56-10 (94 minus a bracket), MV2-O78-14 (constants on both sides). N: MV2-N8-01 (negative-exponent terms), MV2-N56-05 (split the rice, then take some out), MV2-N56-03 (growth, then a piece bitten off). (Geometry and Statistics kept no clean NEGTERM end key in batch 1: their survivors are DIFF; MV2-G78-06 survived with every distractor an omission and is not a model) |

Write the class into the item: `distractor_meta` must show at least one distractor whose error acts on the part
that pushes the OTHER way (`far_distractor` names it), and `counter_error` is a natural error that lands strictly
past the key. "All my errors under-remove" is not a class, it is the one-sided failure in a new coat (batch 1
withdrew MV2-G78-09, G78-11, G78-18 for exactly that: removal items where every natural error removed too little).

**Interior slots take the one-sided mechanisms** (products, scale-ups, single roots, a single percent of a
quantity, totals, unit conversion upward). That is why the end keys are scarce: do not try to turn a one-sided
mechanism into an end key by adding an invented slip.

## Content per area and grade (nothing else; off-blueprint items are dropped)

**O — Operations and Algebraic Thinking** (O5: grade 5; O6R, O6E: grade 6; O7R, O7E: grade 7; O8: grade 8)
- g5 5.OA: numerical expressions with parentheses / brackets, writing and evaluating expressions from words, two numerical patterns and their relationship
- g6 6.RP (ratios, unit rates, percent of a quantity, ratio tables, unit conversion by ratio) [O6R] and 6.EE (exponents in expressions, evaluating expressions, equivalent expressions, one-step equations and inequalities, dependent / independent variables) [O6E]
- g7 7.RP (proportional relationships, constant of proportionality, multistep ratio and percent problems: tax, markup, discount, interest, percent error) [O7R] and 7.EE (px + q = r, p(x + q) = r, inequalities px + q > r, rewriting expressions) [O7E]
- g8 8.EE.B-C (proportional relationships and slope, linear equations in one variable including ones with no / infinitely many solutions, systems of two linear equations) and 8.F (functions, rate of change and initial value from a table / description / two points, comparing functions). 8.EE.A belongs to N.

**N — Real and Complex Number Systems** (N56: grades 5-6; N78: grades 7-8)
- g5 5.NBT (place value, powers of ten, multi-digit multiplication and division, decimal operations to hundredths) and 5.NF (adding / subtracting unlike fractions and mixed numbers, multiplying and dividing fractions, unit fractions by whole numbers, fraction word problems)
- g6 6.NS (dividing fractions by fractions, multi-digit decimals, GCF and LCM, the distributive property with GCF, integers and absolute value, rational numbers on a number line, distance between points with one shared coordinate)
- g7 7.NS (adding, subtracting, multiplying, dividing rational numbers including negatives; converting fractions to decimals; multistep problems with rational numbers)
- g8 8.NS (irrational numbers, rational approximations, ordering) and 8.EE.A (integer exponents, square and cube roots, scientific notation and operations with it)

**G — Geometry** (G5, G6, G7A, G7B, G8: one grade each; G7A and G7B split grade 7 by cluster). No figure: describe it completely in words.
- g5 5.G (coordinate plane first quadrant, distances along grid lines, classifying two-dimensional figures by properties) and 5.MD.C (volume of right rectangular prisms, unit cubes, volumes of two non-overlapping prisms)
- g6 6.G (area of right triangles, triangles, special quadrilaterals and composite polygons; volume with fractional edge lengths; surface area from nets; polygons in the coordinate plane)
- g7 7.G (G7A: scale drawings, angle relationships: supplementary, complementary, vertical, adjacent; triangle conditions. G7B: circle area and circumference with 3.14; area, volume and surface area of composite figures)
- g8 8.G (Pythagorean theorem and its converse, distance in the coordinate plane, volume of cylinders, cones and spheres with 3.14, angle sums and exterior angles, angles from parallel lines cut by a transversal, the effect of a dilation / translation / reflection / rotation on coordinates)

**D — Statistics and Probability** (D5: grade 5; D67: grades 6-7; D8: grade 8)
- g5 5.MD.A-B (converting among units within one measurement system; line plots of fractional measurements and operations on that data). Give a line plot as a `graphic` `{"type":"table","rowLabels":[...values],"colLabels":["Number of ..."],"cells":[[n],...]}`.
- g6 6.SP (mean, median, mode, range, interquartile range, mean absolute deviation, effect of one value on a measure, reading a dot plot / histogram / frequency table given as a table)
- g7 7.SP (random samples and inference from a sample, comparing two populations, probability of simple and compound events, sample spaces, experimental vs theoretical probability)
- g8 8.SP (scatter plots and a line of fit given as an equation, predicted values, slope / intercept meaning numerically, two-way tables and relative frequencies). A percent-of-a-number item is Operations, not Statistics (batch 1 dropped one as off blueprint).
- D items may carry a `graphic` (table, twowaytable, bar) when the item needs data; the graphic must be NEEDED
  (cover it and the item must become unanswerable). Every other area: no graphic.

Use each context family (money, recipe, sport, travel, school, building, nature, science measurement, games) at most
three times in your file.

## Item schema (every field required unless marked) — unchanged from batch 1

    {
     "id": "MB2-N78-04", "domain": "<the area's full name, exactly as above>", "map_area": "oa"|"num"|"geo"|"data",
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
     "far_distractor": { "option": "<a distractor>", "natural_side": "above"|"below", "why": "<which part of the class pushes it the other way HERE>" },   // REQUIRED on S and L
     "structure_check": "<S/L: does the stem tell a student which way EVERY error goes? It must not; name the two parts that push opposite ways>",
     "intermediate_check": "<for EACH distractor: is it a value the key follows from through ONE printed rate, price or relation? each 'no', with the reason>",
     "cheap_bound_check": "<S/L: the cheapest one-sided bound readable from the stem, and which distractor sits on the key's side of it; I: 'interior key'>",
     "shape_check": "<properties the stem hands over (sign, whole number, cap, more/less than a printed amount) and which options survive each; >= 2 survive all together>",
     "interior_parity_check": "<the two middle values: same display form and complexity? the key is not the cleaner one>",
     "arith_class_check": "<is the key alone in a class (whole vs fraction, even, multiple of k, round, negative, perfect square) the stem implies? (rule K1)>",
     "dup_search": { "queries": ["<mf30-kw.mjs queries you ran>"], "hits_read": <n>, "nearest": "<id + why it is different>" },
     "bound_screen": [ { "kind": "sign"|"magnitude"|"parity"|"units_digit"|"range", "bound": "<the cheapest bound of this kind a student can read from the stem WITHOUT doing the work, or 'none: <why>'>", "strikes": ["<options it rules out; at most ONE distractor, never the key>"] }, ... all five kinds ],
     "self_audit": { "risk": "low|medium|high", "note": "<what a test-wise student would try, and why it fails; answer every (read) line; the K-rule answers; any MECHANISM SWAP>" }
    }

`error_kind`: `sign_slip`, `inverted_rate`, `wrong_variable`, `wrong_operation`, `wrong_base`, `omission`,
`partial_answer`, `other`. `error_sense`: `omits` (leaves out a step, term or condition, or stops early), `adds`
(extra step, double count, ignores a reducing condition), `swaps` (sign, inversion, swapped quantity, wrong
operation or base). An `omission` is always `omits`.

## Rules (binding; math-check.mjs enforces most of rules 1-20)

1. **One mechanism per item, new to the bank.** Before writing each item run 2-4 searches and READ every hit:
   `node scripts/study-bank/mf30-kw.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b2 "term&term|alt"`
   (`&` = all terms, `|` = alternation). Record them in `dup_search`. **The 709 live ISEE maths rows already hold
   the standard grade 5-8 canon**, and batch 1's 221 items now sit beside them. A new story over the same chain of
   steps IS a duplicate — of a withdrawn batch-1 item as much as of a live one. Read
   `scripts/study-bank/map-v2-work/math-b2/EXCLUSIONS-map-math-b2.txt` for your area and grade before you start:
   every MAP maths item ever authored, banked or not, batch 1 included, with its outcome.
2. `solve` recomputes the key from the stem's numbers; `distractor_solve` for **every** distractor.
3. **Distractors are real student errors from different named wrong paths**, the errors a teacher of that grade
   actually sees. No derivational hub; no option = sum / difference / average / product of two others; no +/- pair
   containing the key; no evenly spaced or geometric run of three options through the key; no decimal-shift
   sibling of the key unless it is a genuine place-value error on a place-value item.
4. **No one-sided error family.** At least two distinct `error_kind`s, at least one of sign_slip / inverted_rate /
   wrong_variable / wrong_operation / wrong_base, at most one omission / partial_answer.
5. **Extreme keys (S/L): a real distractor from the far side, from the slot's class.** The three distractors may not
   all be `omits` (nor all `adds`). `far_distractor` names a REAL distractor whose error acts on the part of the
   chain that pushes the answer the other way; `counter_error` is a natural error (not an option) that lands
   strictly past the key.
6. **Banned asks on S/L slots:** greatest / least / maximum / minimum / largest / smallest, "sum of all", "possible
   values", "for every / each / all / any", vertex, peak, highest, lowest, "top of".
7. **Option pairs.** The key must not equal another option combined by ONE operation (+, -, x, /) with a number
   printed in the stem (other than 1), nor differ from an option by the sum of two printed numbers. "How many
   MORE", "one extra", "total vs each" distractors hand over the key. On a DIFF item the two parts themselves (A
   and B) are solved intermediates, never options.
8. **Plug-back.** If an option can be checked against the stem in one routine step, set `substitutable` true,
   write `verify`, and the key must sit at try 3 or 4 in ascending order (descending on a "most" stem). An S slot
   never asks for the starting value of a backward chain, or for anything a student can confirm by running the story
   forward from an option (batch 1 withdrew MV2-O56-08 and MV2-O78-03 for exactly that: key at try 1).
9. **Every option is a legal value** of the quantity asked; at least two options survive every property the stem
   hands over.
10. **Interior parity:** the two middle values share display form and complexity; the key is not the cleaner one.
    No two options summing to 1, 90, 180, 360 or 100 unless that sum is the point and the key is not in the pair.
11. **The key is not a number printed in the stem** (or in the graphic).
12. **No solved intermediate as a distractor** (the distance when the stem prints the speed and asks the time).
13. Within your own items: no key value repeated, no option set repeated, no wrong idea reused.
14. **Rounding / "closest to" stems:** every option a rounded value of the same form, or ask an exact quantity.
15. **Every number in the stem is used.**
16. **No cheap bound strikes more than one distractor** (`bound_screen`, all five kinds). If one would strike two,
    rebuild the distractors. Your declaration is a self-check, not the test: a separate cold screener looks for
    the bound you did not think of, and returns the item to you once. **The live eliminations are always in the
    bounds you did not declare** (CLAUDE.md 2026-09-24: twenty declared bounds killed zero options), so run the
    K-rules below as computations, not as statements.
17. **LONE — no option alone by sign or size** (all areas, refused by the check).
18. **SLIP — three different named misconceptions; at most one computational slip** (refused in Number Systems,
    advised elsewhere). Slips land beside the key and make it the centre of the set.
19. **FORM — every option in the key's surface form** (same decimal places; same lowest-terms denominator; the key's
    exact final digit when the key has two or more digits). Refused in Number Systems; advised elsewhere: if an
    option's last digit or denominator alone would rule it out, fix it.
20. **The cover-the-question test, before you hand in each item.** Cover the stem. Is one number far from the rest?
    Is one the centre the other three look built from (half, double, x10, one digit changed, a carry)? If yes,
    rebuild. Then uncover the stem: which two could a student cross out from the printed numbers alone?
21. **Tier, set honestly.** Dividing by a decimal or working across zero with mixed numbers is never low. If the item
    is harder than its slot's tier, simplify the numbers, not the label.
22. ASCII `-`; "xy-plane" only at grade 8 ("coordinate plane" earlier); plain everyday contexts at the grade's
    reading level; no reviewer-facing text in `explanation`.

### K-rules: the free eliminations that killed batch 1 (compute each one; answer each in `self_audit.note`)

Every K-rule below is a bound a cold screener used in batch 1 and an author's declarations missed.

- **K1 Forced class (parity, units digit, multiple of k, denominator, perfect square).** If the stem forces the key
  into a class — whole dollars that make savings a multiple of 20, a product with an even factor, inches from whole
  feet (multiple of 12), y = -3x + 48 at whole x (multiple of 3), an odd number plus an even one, sixteenths from
  whole ounces, a square's area from whole sides — **every distractor must be in that class too.** If real errors
  cannot all be, choose numbers that force no class (decimals, mixed parities), or make the slot's errors ones that
  stay in the class. The key must not be the only perfect square, only whole number, only terminating decimal or
  only multiple of 10 among the options when the question makes that property expected (dropped: MV2-G78-25, 169
  the only perfect square for a square's area). Withdrawn for K1: O56-11, O56-13, O56-18, O56-22, O78-02, O78-20,
  G56-01, G56-06, G78-02, D5-03, D5-09, D5-17, D7-08, D8-07.
- **K2 Benchmark bounds.** For every printed percent or fraction within about 10 points of 10%, 1/4, 1/3, 1/2, 2/3 or
  3/4, write the bound it gives ("30% < 1/3, so more than 54 tulips"; "35% > 1/3, so under 40 left"; "more than half
  are teens, so under 30") and for every printed total, floor or cap ("x + 42 > 42", "more than 60 minutes",
  "1.5 x 60 < 100") the bound it gives. **At most one distractor may fall outside any one of them, and the key's
  side of each bound must keep a band wide enough for two real errors** (batch 1 withdrew seven O78 items whose band
  beside the key was too narrow, 3-5% on three of them: O78-01, 06, 08, 09, 11, 18, 21; also O56-03, O56-12, O56-17, N56-21).
- **K3 Pi bracket.** On any circle, cylinder, cone or sphere item compute the answer with pi = 3 and with pi = 4.
  Every option outside that window is struck by a student who knows "pi is a bit more than 3"; **at most one may
  be.** Radius-for-diameter and squared-vs-doubled errors usually leave the window, so put a pi item's key interior
  unless the pi term is subtracted (DIFF) and errors in the subtracted solid stay inside the window (withdrawn:
  MV2-G78-08, G78-19; G78-01 lost its overshooting error to LONE).
- **K4 The rounded estimate (Number Systems above all; every area with decimals).** Round every printed number to
  the nearest whole number (or friendly number) and compute the one-line estimate E. A student strikes any option
  much farther from E than the key is. **At most one distractor may sit more than twice the key's own distance from
  E** (or more than one rounding step when E is almost exact). If the decimals round cleanly, the estimate decides
  the item: choose numbers whose roundings do not cancel, or errors that act on the small parts (a sign on the small
  term, a misplaced hundredths). Batch 1 withdrew six N7 items for this alone (N7-02, 06, 11, 14, 15, 16).
  **Scientific notation and roots:** at most one distractor may differ from the key's power of ten / order of
  magnitude, and a printed bound like "edge > 10" or "40^2 = 1600 < 2000" must not strike two (N8 kept 6 of 19, 2 of
  13 on end keys; withdrawn N8-05, 07, 08, 11, 12, 13, 16, 17, 18).
- **K5 Printed-count pairs (tables and line plots).** No distractor may differ from the key by one printed table entry
  or row count, and no distractor may be a partial sum of printed cells. Boundary errors (a row included or left out)
  do exactly that, so they are not distractors here (withdrawn: D5-04, D5-15, D8-06).
- **K6 Backward chains.** A starting value found by undoing steps is plug-back checkable: it takes an interior slot
  and the key at try 3 or 4 (rule 8), never an S slot.
- **K7 Template.** Your slot's mechanism is not in any other row of any table here, and no two of your items share a
  chain of steps, even with different numbers, contexts or a different unknown (rule 1; R11).

## Before you finish

Every item prints `PART OK` with all three flags. In `self_audit.note` answer, per S/L item: "which two parts of
the chain push the answer opposite ways, and which distractor comes from the far part?" and "covering the work,
could a student tell which way the errors go and strike all three? does one bound strike all three?"; per S /
lower-interior item: "could a student check an option in one routine step?"; per item: K1-K5 each in one line,
"is any distractor a solved intermediate?", "is this really a <tier> item for grade <g>?" and "which cheap bound
strikes the most distractors, and is it at most one?". Reply with one line per slot: id, grade, tier, key position,
class, key, quantity asked, PART OK (or EMPTY and why, or MECHANISM SWAP and why).

## What happens next (so you know what the screen tests)

A cold screener (no access to your notes) looks for free eliminations and returns failing items to you ONCE; on a
return you either revise, withdraw with a reason, or stand with a reason. An options-only attack (three samples,
four numbers and no stem) is compared against matched live ISEE items; two graders solve every item cold, then
check key, exclusivity, free elimination, template and grade fit. Items both graders can eliminate to a coin flip
are dropped. Passing items are inserted live.

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

## Slot tables (map-v2-math-b2-slots-2026-10-24; also in slots.json). `core` = the rows written if the 68 staged MAP maths items are released (77 slots); otherwise write every row (254).

### Author O5 — Operations and Algebraic Thinking, 5.OA (all three clusters): grade 5 x16 (16 slots; 8 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-O5-01 | 5 | low | I | - | evaluate an expression with one pair of parentheses and a division, no brackets | core |
| MB2-O5-02 | 5 | low | I | - | write "k times the sum of a and b" from words and evaluate it |  |
| MB2-O5-03 | 5 | low | S | NEGTERM | a total minus a parenthesised difference, a - (b - c), in a context | core |
| MB2-O5-04 | 5 | low | I | - | two numerical patterns with different add-rules: the B-term paired with a given A-term |  |
| MB2-O5-05 | 5 | mid | S | NEGTERM | a total minus a bracket [ (a + b) x c / d ] from a word description | core |
| MB2-O5-06 | 5 | mid | L | DIVISOR | a division by a parenthesised product, n / (a x b) + c, where left-to-right and product-first errors fall on opposite sides | core |
| MB2-O5-07 | 5 | mid | I | - | pattern B is k times pattern A: find the A-term for a given B-term | core |
| MB2-O5-08 | 5 | mid | S | DIFF | difference between the 9th terms of two patterns with different starts and rules |  |
| MB2-O5-09 | 5 | mid | I | - | one expression for a multi-step story (buy n packs of p, share among k), evaluated | core |
| MB2-O5-10 | 5 | mid | L | DIVISOR | "divide the sum of A and B by the difference of C and D", evaluated |  |
| MB2-O5-11 | 5 | mid | I | - | nested brackets and braces with a product inside, evaluated |  |
| MB2-O5-12 | 5 | high | S | NEGTERM | nested brackets: a total minus [ k x (a - b) - c / d ] | core |
| MB2-O5-13 | 5 | high | L | DIVISOR | share a total among (a + b) teams after first removing c: grouping is the decision |  |
| MB2-O5-14 | 5 | high | I | - | two patterns: which term number of A pairs with a given value of B (inverse reading) | core |
| MB2-O5-15 | 5 | high | I | - | "three times as large as the difference of" nested phrase, written and evaluated |  |
| MB2-O5-16 | 5 | high | I | - | expression with brackets where one pair of parentheses is moved: value of the new expression |  |

key positions: S 4 / L 3 / I 9 (end 44%; ends by tier low 1/4, mid 4/7, high 2/5); tiers low 4 / mid 7 / high 5

### Author O6R — Operations and Algebraic Thinking, 6.RP: grade 6 x19 (19 slots; 6 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-O6R-01 | 6 | low | I | - | unit price from a total for n items, then the cost of m items | core |
| MB2-O6R-02 | 6 | low | I | - | ratio table with a non-integer scale factor (4:6 to 10:?) |  |
| MB2-O6R-03 | 6 | low | L | DIFF | two unit speeds from distance and time; how much faster one is | core |
| MB2-O6R-04 | 6 | low | I | - | percent of a quantity (e.g. 35% of 260) in a context |  |
| MB2-O6R-05 | 6 | low | I | - | unit conversion by a ratio table, one step |  |
| MB2-O6R-06 | 6 | mid | S | DIFF | part-to-part ratio with the total given; how many more of the larger part | core |
| MB2-O6R-07 | 6 | mid | L | DIVISOR | best buy: difference in unit prices where dividing the wrong way (items per dollar) is the error |  |
| MB2-O6R-08 | 6 | mid | I | - | the whole from a part and its percent (24 is 15% of what) | core |
| MB2-O6R-09 | 6 | mid | S | NEGTERM | amount left after spending a percent and then a fixed amount |  |
| MB2-O6R-10 | 6 | mid | I | - | ratio changes after some people join; new count of one group |  |
| MB2-O6R-11 | 6 | mid | L | DIVISOR | rate per hour applied to a time given in minutes |  |
| MB2-O6R-12 | 6 | mid | I | - | mixing ratio (3:5): amount of the second part for a given total |  |
| MB2-O6R-13 | 6 | mid | S | DIFF | two rows of one ratio table: how many more of B the larger batch needs |  |
| MB2-O6R-14 | 6 | high | L | DIFF | percent off versus a fixed coupon on the same price: difference in final prices | core |
| MB2-O6R-15 | 6 | high | S | DIVISOR | time to finish a job from a unit rate given as a ratio (rate inverted is the error) |  |
| MB2-O6R-16 | 6 | high | I | - | tape-diagram ratio of part to total with a change; the original amount | core |
| MB2-O6R-17 | 6 | high | L | NEGTERM | rope in yards, pieces cut in feet: inches left (conversion chain with a subtraction) |  |
| MB2-O6R-18 | 6 | high | I | - | three-part ratio a:b:c with the total given; one share |  |
| MB2-O6R-19 | 6 | high | S | NEGTERM | give away a number, then a percent of the rest: how many are kept |  |

key positions: S 5 / L 5 / I 9 (end 53%; ends by tier low 1/5, mid 5/8, high 4/6); tiers low 5 / mid 8 / high 6

### Author O6E — Operations and Algebraic Thinking, 6.EE: grade 6 x19 (19 slots; 6 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-O6E-01 | 6 | low | I | - | evaluate a coefficient times a squared variable plus a constant | core |
| MB2-O6E-02 | 6 | low | I | - | one-step equation x / k = n from a word context |  |
| MB2-O6E-03 | 6 | low | S | NEGTERM | evaluate a - b x c for given values (subtraction of a product) | core |
| MB2-O6E-04 | 6 | low | I | - | dependent variable from a rule y = 3x + 2 given in a table heading |  |
| MB2-O6E-05 | 6 | low | I | - | greatest whole-number solution of x + a < b (interior slot) |  |
| MB2-O6E-06 | 6 | mid | L | DIVISOR | evaluate (a + b) / c where dividing only b is the error | core |
| MB2-O6E-07 | 6 | mid | S | NEGTERM | evaluate 3(x - 4) - 2x at a value: distribution errors fall on both sides |  |
| MB2-O6E-08 | 6 | mid | I | - | difference of two powers, 4^3 - 2^5 style, in a context | core |
| MB2-O6E-09 | 6 | mid | L | DIFF | two cost expressions (fee plus rate) evaluated at n; the difference |  |
| MB2-O6E-10 | 6 | mid | I | - | one-step equation with decimals, 0.6x = 4.2, in a context |  |
| MB2-O6E-11 | 6 | mid | S | DIVISOR | d = rt solved for t, with r stated as a ratio |  |
| MB2-O6E-12 | 6 | mid | I | - | independent/dependent from "each week adds 4": value after w weeks |  |
| MB2-O6E-13 | 6 | mid | L | NEGTERM | combine like terms in 7y - 2(y - 3), then evaluate |  |
| MB2-O6E-14 | 6 | high | S | DIFF | two rules y = ax + b given as tables: difference of their outputs at one input | core |
| MB2-O6E-15 | 6 | high | L | DIVISOR | area formula A = bh / 2 solved for h, then used in a second step |  |
| MB2-O6E-16 | 6 | high | I | - | perimeter with one variable side: one-step equation after combining | core |
| MB2-O6E-17 | 6 | high | S | NEGTERM | 2^4 - (3^2 - 5) x 2 style: an exponent and a subtracted product of a group |  |
| MB2-O6E-18 | 6 | high | I | - | how many whole numbers satisfy two inequalities together (interior slot) |  |
| MB2-O6E-19 | 6 | high | I | - | evaluate an expression with fractional coefficients, (3/4)x + x/2, at a value |  |

key positions: S 5 / L 4 / I 10 (end 47%; ends by tier low 1/5, mid 5/8, high 3/6); tiers low 5 / mid 8 / high 6

### Author O7R — Operations and Algebraic Thinking, 7.RP: grade 7 x19 (19 slots; 6 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-O7R-01 | 7 | low | I | - | constant of proportionality from a table, then a new value | core |
| MB2-O7R-02 | 7 | low | I | - | sales tax on one price |  |
| MB2-O7R-03 | 7 | low | S | DIFF | two unit rates with fractions (miles per 1/2 hour vs per 3/4 hour): how many more per hour | core |
| MB2-O7R-04 | 7 | low | I | - | percent error from measured and actual values |  |
| MB2-O7R-05 | 7 | low | I | - | k from a described proportional relationship, then y for a new x |  |
| MB2-O7R-06 | 7 | mid | L | DIFF | markup then discount on one item: final price minus the original | core |
| MB2-O7R-07 | 7 | mid | S | NEGTERM | coupon applied before vs after a percent discount: amount saved by the better order |  |
| MB2-O7R-08 | 7 | mid | I | - | simple interest over a number of months | core |
| MB2-O7R-09 | 7 | mid | L | DIVISOR | complex-fraction unit rate (2/3 cup per 3/4 batch): cups per batch |  |
| MB2-O7R-10 | 7 | mid | I | - | percent increase from an old and a new value |  |
| MB2-O7R-11 | 7 | mid | S | DIFF | commissions of two salespeople at different rates: the difference |  |
| MB2-O7R-12 | 7 | mid | I | - | k from a point on a described graph, then y at another x |  |
| MB2-O7R-13 | 7 | mid | L | DIVISOR | percent decrease where the wrong base (the new value) is the error |  |
| MB2-O7R-14 | 7 | high | S | DIFF | two successive percent changes vs their naive sum: difference in final amounts | core |
| MB2-O7R-15 | 7 | high | L | DIVISOR | original price from a price including tax (divide by 1.08, not multiply by 0.92) |  |
| MB2-O7R-16 | 7 | high | I | - | tip and tax on a bill, tip computed on the pre-tax amount: total paid | core |
| MB2-O7R-17 | 7 | high | S | NEGTERM | percent error where the measurement is under the actual value, against the actual |  |
| MB2-O7R-18 | 7 | high | I | - | recipe scaled by a ratio and converted to another unit |  |
| MB2-O7R-19 | 7 | high | L | DIFF | interest earned by two accounts at different rates and times: the difference |  |

key positions: S 5 / L 5 / I 9 (end 53%; ends by tier low 1/5, mid 5/8, high 4/6); tiers low 5 / mid 8 / high 6

### Author O7E — Operations and Algebraic Thinking, 7.EE: grade 7 x19 (19 slots; 6 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-O7E-01 | 7 | low | I | - | px + q = r from a fee-plus-rate context | core |
| MB2-O7E-02 | 7 | low | I | - | combine 0.4x + 0.15x: the single coefficient |  |
| MB2-O7E-03 | 7 | low | S | NEGTERM | p(x - q) = r with q subtracted | core |
| MB2-O7E-04 | 7 | low | I | - | px + q > r: least whole-number solution (interior slot) |  |
| MB2-O7E-05 | 7 | low | I | - | evaluate an expression with rational coefficients at a value |  |
| MB2-O7E-06 | 7 | mid | L | DIVISOR | x / p + q = r | core |
| MB2-O7E-07 | 7 | mid | S | SIGNED | px + q = r with a negative p |  |
| MB2-O7E-08 | 7 | mid | I | - | perimeter 2(L + w) with a stated relation between L and w | core |
| MB2-O7E-09 | 7 | mid | L | NEGTERM | 5(x - 2) - 3 = 22 style: distribution across a subtraction |  |
| MB2-O7E-10 | 7 | mid | I | - | savings goal with a starting amount: least number of weeks |  |
| MB2-O7E-11 | 7 | mid | S | DIFF | two people each solve an equation from a story: how much greater one solution is |  |
| MB2-O7E-12 | 7 | mid | I | - | a + 0.06a rewritten as one product: the multiplier times a price |  |
| MB2-O7E-13 | 7 | mid | L | SIGNED | -k(x + a) = -b + c style equation with negatives on both sides |  |
| MB2-O7E-14 | 7 | high | S | NEGTERM | (2/3)(x - 6) = 10: a fraction times a group with a subtraction | core |
| MB2-O7E-15 | 7 | high | L | DIFF | two two-step wage equations: how much more one earns per hour |  |
| MB2-O7E-16 | 7 | high | I | - | backward chain (spent a fraction, then an amount, has n left): the original | core |
| MB2-O7E-17 | 7 | high | S | SIGNED | px + q = r with negative rational p and q |  |
| MB2-O7E-18 | 7 | high | I | - | px + q <= r with decimal p: the greatest number of items (interior slot) |  |
| MB2-O7E-19 | 7 | high | L | NEGTERM | perimeter of a figure with expression sides minus a shared side, evaluated |  |

key positions: S 5 / L 5 / I 9 (end 53%; ends by tier low 1/5, mid 5/8, high 4/6); tiers low 5 / mid 8 / high 6

### Author O8 — Operations and Algebraic Thinking, 8.EE.B-C, 8.F: grade 8 x18 (18 slots; 0 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-O8-01 | 8 | low | I | - | slope from two points given in a context |  |
| MB2-O8-02 | 8 | low | I | - | initial value from a table of a linear function |  |
| MB2-O8-03 | 8 | low | I | - | linear equation with variables on both sides, integer solution |  |
| MB2-O8-04 | 8 | low | L | DIVISOR | unit rates of two proportional relationships (one equation, one table): how much greater |  |
| MB2-O8-05 | 8 | mid | S | DIFF | rates of change of two functions given in different forms: the difference |  |
| MB2-O8-06 | 8 | mid | I | - | system by substitution: the value of x |  |
| MB2-O8-07 | 8 | mid | L | NEGTERM | equation with distribution and subtraction on both sides, rational solution |  |
| MB2-O8-08 | 8 | mid | I | - | function value from "starts at 12, decreases 1.5 per hour" |  |
| MB2-O8-09 | 8 | mid | S | SIGNED | y-intercept from a slope and a point with negative coordinates |  |
| MB2-O8-10 | 8 | mid | I | - | k that makes an equation have infinitely many solutions |  |
| MB2-O8-11 | 8 | mid | L | DIVISOR | x-intercept of a line through two points (division by the slope) |  |
| MB2-O8-12 | 8 | mid | I | - | input where two linear functions given in words are equal |  |
| MB2-O8-13 | 8 | high | S | DIFF | tickets system (two prices, two totals): how many more of one type |  |
| MB2-O8-14 | 8 | high | L | DIVISOR | line through a point with a given slope: x when y is a given value |  |
| MB2-O8-15 | 8 | high | I | - | rate of change from a table with uneven x steps |  |
| MB2-O8-16 | 8 | high | S | NEGTERM | rate of change from a verbal situation with a fee subtracted first |  |
| MB2-O8-17 | 8 | high | L | SIGNED | parameter so two lines meet at a given x (not y: distinct from live MV2-O78-12) |  |
| MB2-O8-18 | 8 | high | I | - | function from two points: output at a non-integer input |  |

key positions: S 4 / L 5 / I 9 (end 50%; ends by tier low 1/4, mid 4/8, high 4/6); tiers low 4 / mid 8 / high 6

### Author G5 — Geometry, 5.G, 5.MD.C: grade 5 x16 (16 slots; 7 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-G5-01 | 5 | low | I | - | grid-line distance between two points sharing an x-coordinate, with a map scale | core |
| MB2-G5-02 | 5 | low | I | - | volume of a prism from described layers of unit cubes |  |
| MB2-G5-03 | 5 | low | L | DIFF | volumes of two boxes: how much more one holds | core |
| MB2-G5-04 | 5 | low | I | - | classifying: how many of a described list of figures always have a property |  |
| MB2-G5-05 | 5 | mid | S | DIFF | L-shaped solid as two non-overlapping prisms, given as a box minus a notch | core |
| MB2-G5-06 | 5 | mid | I | - | grid path with a backtrack: total length walked | core |
| MB2-G5-07 | 5 | mid | S | NEGTERM | volume left in a box after a smaller prism is removed (over-removal is natural too) | core |
| MB2-G5-08 | 5 | mid | L | DIVISOR | how many 2-unit cubes fit in a box (volume / volume vs per-edge) |  |
| MB2-G5-09 | 5 | mid | I | - | rectangle from three vertices on a grid: a coordinate of the fourth |  |
| MB2-G5-10 | 5 | mid | L | DIVISOR | height of a prism from its volume and base edges |  |
| MB2-G5-11 | 5 | mid | I | - | volume with the base area given and the height described by a relation |  |
| MB2-G5-12 | 5 | high | S | DIFF | two boxes with equal volume and different bases: the difference in heights | core |
| MB2-G5-13 | 5 | high | L | DIFF | one edge doubled and another halved: how much more the new box holds |  |
| MB2-G5-14 | 5 | high | I | - | point after a sequence of grid moves: its x-coordinate | core |
| MB2-G5-15 | 5 | high | S | DIVISOR | layers of cubes needed to reach a volume (volume / layer) |  |
| MB2-G5-16 | 5 | high | I | - | perimeter of a figure built from a rhombus and a square, from their properties |  |

key positions: S 4 / L 4 / I 8 (end 50%; ends by tier low 1/4, mid 4/7, high 3/5); tiers low 4 / mid 7 / high 5

### Author G6 — Geometry, 6.G: grade 6 x20 (20 slots; 3 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-G6-01 | 6 | low | I | - | area of a right triangle from its legs in a context |  |
| MB2-G6-02 | 6 | low | I | - | area of a parallelogram with a slanted side printed as a decoy |  |
| MB2-G6-03 | 6 | low | S | DIFF | two rectangles on the coordinate plane: how much greater one area is |  |
| MB2-G6-04 | 6 | low | I | - | cubes of edge 1/2 packed in a prism: volume |  |
| MB2-G6-05 | 6 | low | I | - | surface area of a rectangular prism from a described net |  |
| MB2-G6-06 | 6 | mid | S | NEGTERM | trapezoid as a rectangle minus two right-triangle corners | core |
| MB2-G6-07 | 6 | mid | L | DIFF | surface areas of two nets sharing dimensions: the difference |  |
| MB2-G6-08 | 6 | mid | I | - | perimeter of a rectangle with vertices in two quadrants | core |
| MB2-G6-09 | 6 | mid | S | DIVISOR | number of 1/4-unit cubes in a prism (dividing by a small volume) |  |
| MB2-G6-10 | 6 | mid | L | DIFF | L-shaped polygon area from coordinates |  |
| MB2-G6-11 | 6 | mid | I | - | area of a rhombus from its described diagonals |  |
| MB2-G6-12 | 6 | mid | S | NEGTERM | open box (no top) surface area, where removing the wrong face is the error |  |
| MB2-G6-13 | 6 | mid | I | - | triangle with its base on a horizontal line and its apex in another quadrant: area |  |
| MB2-G6-14 | 6 | mid | L | DIVISOR | height of a prism from a volume with a fractional base |  |
| MB2-G6-15 | 6 | high | S | DIFF | two triangles with one base and different heights on the plane: area difference | core |
| MB2-G6-16 | 6 | high | L | NEGTERM | trapezoid from coordinates after one vertex is moved: new area |  |
| MB2-G6-17 | 6 | high | I | - | stack of boxes with fractional edges: total volume |  |
| MB2-G6-18 | 6 | high | S | DIVISOR | paper from a net divided across boxes: square units per box |  |
| MB2-G6-19 | 6 | high | I | - | surface area of a triangular prism from a described net |  |
| MB2-G6-20 | 6 | high | I | - | pentagon (house shape) on the plane by decomposition: area |  |

key positions: S 6 / L 4 / I 10 (end 50%; ends by tier low 1/5, mid 6/9, high 3/6); tiers low 5 / mid 9 / high 6

### Author G7A — Geometry, 7.G.A (scale drawings, triangle conditions), 7.G.B.5 (angles): grade 7 x11 (11 slots; 4 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-G7A-01 | 7 | low | I | - | actual length from a scale and a drawing length |  |
| MB2-G7A-02 | 7 | low | I | - | complementary angles, one described relative to the other |  |
| MB2-G7A-03 | 7 | low | I | - | vertical angles given as expressions: the angle |  |
| MB2-G7A-04 | 7 | mid | S | DIFF | a drawing redrawn at a new scale: new minus old length | core |
| MB2-G7A-05 | 7 | mid | L | DIVISOR | area on a drawing to actual area (scale squared; linear-scale errors fall both ways) |  |
| MB2-G7A-06 | 7 | mid | I | - | three adjacent angles on a line: the unknown one | core |
| MB2-G7A-07 | 7 | mid | S | NEGTERM | angles around a point with a right angle among them |  |
| MB2-G7A-08 | 7 | mid | I | - | how many whole-number lengths can the third side have (interior slot) |  |
| MB2-G7A-09 | 7 | high | L | DIFF | supplementary and vertical expressions: how much larger one angle is than the other | core |
| MB2-G7A-10 | 7 | high | S | DIVISOR | map A to map B scale factor, then the actual distance |  |
| MB2-G7A-11 | 7 | high | I | - | triangle conditions with a perimeter constraint: a side length | core |

key positions: S 3 / L 2 / I 6 (end 45%; ends by tier low 0/3, mid 3/5, high 2/3); tiers low 3 / mid 5 / high 3

### Author G7B — Geometry, 7.G.B.4, 7.G.B.6 (circles; composite area, volume, surface area): grade 7 x11 (11 slots; 4 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-G7B-01 | 7 | low | I | - | circumference from a diameter with 3.14 |  |
| MB2-G7B-02 | 7 | low | S | DIFF | area of a ring: outer circle minus inner circle |  |
| MB2-G7B-03 | 7 | low | I | - | volume of a prism with a triangular base |  |
| MB2-G7B-04 | 7 | mid | L | DIFF | track of two semicircles and two straights: perimeter (full circle vs semicircle errors both ways) | core |
| MB2-G7B-05 | 7 | mid | I | - | circle area from its circumference | core |
| MB2-G7B-06 | 7 | mid | S | NEGTERM | prism with a square hole through it: surface area (faces removed, inner walls added) |  |
| MB2-G7B-07 | 7 | mid | L | DIVISOR | wheel revolutions to cover a distance (distance / circumference) |  |
| MB2-G7B-08 | 7 | mid | I | - | two prisms stacked: total volume |  |
| MB2-G7B-09 | 7 | high | S | DIFF | square minus its inscribed circle: area of the corners | core |
| MB2-G7B-10 | 7 | high | L | NEGTERM | two cubes glued face to face: surface area (hidden faces) |  |
| MB2-G7B-11 | 7 | high | I | - | quarter circle plus a triangle: composite area | core |

key positions: S 3 / L 3 / I 5 (end 55%; ends by tier low 1/3, mid 3/5, high 2/3); tiers low 3 / mid 5 / high 3

### Author G8 — Geometry, 8.G: grade 8 x14 (14 slots; 3 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-G8-01 | 8 | low | I | - | hypotenuse from two legs in a context |  |
| MB2-G8-02 | 8 | low | I | - | volume of a cylinder with 3.14 |  |
| MB2-G8-03 | 8 | low | S | NEGTERM | third angle of a triangle from two angle expressions, 180 - (a + b) |  |
| MB2-G8-04 | 8 | mid | L | DIFF | grid-line distance minus straight-line distance between two points | core |
| MB2-G8-05 | 8 | mid | I | - | exterior angle as the sum of two remote interior expressions | core |
| MB2-G8-06 | 8 | mid | S | NEGTERM | cylinder minus a cone on the same base: the volume left |  |
| MB2-G8-07 | 8 | mid | I | - | dilation about the origin by a fraction: a coordinate of the image |  |
| MB2-G8-08 | 8 | mid | L | DIVISOR | height of a cylinder from its volume and radius |  |
| MB2-G8-09 | 8 | mid | I | - | translation then reflection: a coordinate of the image |  |
| MB2-G8-10 | 8 | high | S | SIGNED | reflection across an axis then a translation, from a point with negative coordinates: a coordinate | core |
| MB2-G8-11 | 8 | high | L | NEGTERM | missing leg from hypotenuse and leg (subtract squares), then the triangle area |  |
| MB2-G8-12 | 8 | high | I | - | parallel lines and a transversal with angle expressions: an angle |  |
| MB2-G8-13 | 8 | high | S | DIVISOR | cone height from its volume (the 1/3 and the radius-diameter errors fall both ways) |  |
| MB2-G8-14 | 8 | high | I | - | distance between two points in different quadrants |  |

key positions: S 4 / L 3 / I 7 (end 50%; ends by tier low 1/3, mid 3/6, high 3/5); tiers low 3 / mid 6 / high 5

### Author N56 — Real and Complex Number Systems, 5.NBT, 5.NF (grade 5); 6.NS (grade 6): grade 5 x13, grade 6 x6 (19 slots; 3 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-N56-01 | 5 | low | I | - | multiply a decimal by a power of ten in a context |  |
| MB2-N56-02 | 5 | low | S | NEGTERM | decimal subtraction: money left after two purchases (hundredths) |  |
| MB2-N56-03 | 5 | low | I | - | add unlike fractions in a recipe |  |
| MB2-N56-04 | 5 | mid | L | DIFF | two mixed-number totals with unlike denominators: how much longer one is |  |
| MB2-N56-05 | 5 | mid | I | - | a fraction times a whole number, then a subtraction |  |
| MB2-N56-06 | 5 | mid | S | DIVISOR | a whole divided by a unit fraction (1/4-cup servings), then some removed |  |
| MB2-N56-07 | 5 | mid | I | - | multi-digit division by a two-digit divisor in equal groups |  |
| MB2-N56-08 | 5 | mid | L | NEGTERM | decimal price times quantity minus a coupon |  |
| MB2-N56-09 | 5 | mid | I | - | a fraction of a fraction (2/3 of 3/4 of a pan) |  |
| MB2-N56-10 | 5 | high | L | DIVISOR | a unit fraction divided by a whole number, then multiplied by a count |  |
| MB2-N56-11 | 5 | high | I | - | 3.2 x 10^3 - 450 in a place-value context |  |
| MB2-N56-12 | 5 | high | S | DIFF | two divisions with remainders interpreted (vans needed): how many more for one group |  |
| MB2-N56-13 | 5 | high | L | NEGTERM | mixed numbers: subtract with regrouping across a whole, then add |  |
| MB2-N56-14 | 6 | low | I | - | GCF word problem (largest equal groups) |  |
| MB2-N56-15 | 6 | mid | S | SIGNED | distance between two points with one shared coordinate in different quadrants | core |
| MB2-N56-16 | 6 | mid | I | - | fraction divided by fraction (how many 3/8-lb bags from 4 1/2 lb) | core |
| MB2-N56-17 | 6 | mid | L | DIVISOR | multi-digit decimal divided by a decimal, then compared with a second amount |  |
| MB2-N56-18 | 6 | high | I | - | LCM of two repeating events: how many times one happens before they coincide |  |
| MB2-N56-19 | 6 | high | L | SIGNED | how many degrees warmer one reading is than another, both may be negative | core |

key positions: S 4 / L 6 / I 9 (end 53%; ends by tier low 1/4, mid 5/9, high 4/6); tiers low 4 / mid 9 / high 6

### Author N78 — Real and Complex Number Systems, 7.NS (grade 7); 8.NS, 8.EE.A (grade 8): grade 7 x10, grade 8 x10 (20 slots; 10 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-N78-01 | 7 | low | I | - | add and subtract rationals with negatives (a bank balance) |  |
| MB2-N78-02 | 7 | low | S | SIGNED | elevation after a descent and an ascent (integer and decimal) | core |
| MB2-N78-03 | 7 | mid | L | SIGNED | a negative rational times a difference, -1.5 x (4 - 7.2) | core |
| MB2-N78-04 | 7 | mid | I | - | a fraction as a decimal, rounded to the thousandth (every option a rounded value) | core |
| MB2-N78-05 | 7 | mid | S | DIFF | two temperature drops at different rates and times: the difference |  |
| MB2-N78-06 | 7 | mid | I | - | a negative fraction divided by days: the average change per day |  |
| MB2-N78-07 | 7 | mid | L | NEGTERM | an account starting negative, with deposits and fees |  |
| MB2-N78-08 | 7 | high | S | DIVISOR | average change: a negative total divided by the number of days | core |
| MB2-N78-09 | 7 | high | I | - | complex fraction with negatives, -3/4 / (1/2 - 2/3) | core |
| MB2-N78-10 | 7 | high | L | SIGNED | two points on a number line both move: the distance between them |  |
| MB2-N78-11 | 8 | low | I | - | integer exponents, 3^-2 x 3^4 |  |
| MB2-N78-12 | 8 | low | I | - | between which two whole numbers a square root lies: the smaller one |  |
| MB2-N78-13 | 8 | low | I | - | scientific notation times a whole number, written in standard form |  |
| MB2-N78-14 | 8 | mid | S | DIFF | difference of two quantities in scientific notation with different powers | core |
| MB2-N78-15 | 8 | mid | I | - | square root to the nearest tenth (every option a rounded value) | core |
| MB2-N78-16 | 8 | mid | L | DIVISOR | a quotient in scientific notation whose coefficient needs adjusting | core |
| MB2-N78-17 | 8 | mid | I | - | cube root of a volume for an edge, then the perimeter of a face |  |
| MB2-N78-18 | 8 | high | S | DIVISOR | how many times greater one scientific-notation number is (coefficient ratio < 1) | core |
| MB2-N78-19 | 8 | high | I | - | 2^x x 2^3 = 2^-4: the exponent x | core |
| MB2-N78-20 | 8 | high | L | NEGTERM | (10^-2)(3 x 10^5) - 4 x 10^2 in standard form |  |

key positions: S 5 / L 5 / I 10 (end 50%; ends by tier low 1/5, mid 5/9, high 4/6); tiers low 5 / mid 9 / high 6

### Author D5 — Statistics and Probability, 5.MD.A-B: grade 5 x12 (12 slots; 7 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-D5-01 | 5 | low | I | - | feet and inches to inches (mixed units) | core |
| MB2-D5-02 | 5 | low | I | - | line plot: total of one fractional row (count x value) |  |
| MB2-D5-03 | 5 | low | I | - | centimetres to metres within a total |  |
| MB2-D5-04 | 5 | mid | S | NEGTERM | line plot: container amount minus everything poured out | core |
| MB2-D5-05 | 5 | mid | L | DIVISOR | line plot: total redistributed equally among the beakers | core |
| MB2-D5-06 | 5 | mid | I | - | rope in yards minus two pieces in feet, answer in inches | core |
| MB2-D5-07 | 5 | mid | S | DIFF | two line plots (class A and class B): difference of their totals | core |
| MB2-D5-08 | 5 | mid | I | - | pounds-and-ounces total of several packages |  |
| MB2-D5-09 | 5 | high | L | NEGTERM | line plot: total weight left after the measurements under a cut-off are removed | core |
| MB2-D5-10 | 5 | high | S | DIVISOR | line-plot total converted (pints to gallons), then shared |  |
| MB2-D5-11 | 5 | high | I | - | line plot: equal share with a fractional answer | core |
| MB2-D5-12 | 5 | high | L | DIFF | two elapsed durations in hours and minutes: the difference in minutes |  |

key positions: S 3 / L 3 / I 6 (end 50%; ends by tier low 0/3, mid 3/5, high 3/4); tiers low 3 / mid 5 / high 4

### Author D67 — Statistics and Probability, 6.SP (grade 6); 7.SP (grade 7): grade 6 x5, grade 7 x6 (11 slots; 2 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-D67-01 | 6 | low | I | - | median of an even-sized unsorted list |  |
| MB2-D67-02 | 6 | mid | S | DIFF | mean minus median of a set with an outlier |  |
| MB2-D67-03 | 6 | mid | L | NEGTERM | new mean after one value is removed |  |
| MB2-D67-04 | 6 | high | I | - | MAD of a five-value set (one set, not a comparison) |  |
| MB2-D67-05 | 6 | high | S | DIFF | a frequency table with one wrong entry corrected: by how much the mean drops |  |
| MB2-D67-06 | 7 | low | I | - | probability of a simple event from a described bag |  |
| MB2-D67-07 | 7 | mid | I | - | expected count of a "not" event from an experimental frequency table | core |
| MB2-D67-08 | 7 | mid | S | DIFF | two dice: how much greater P(sum = a) is than P(sum = b) | core |
| MB2-D67-09 | 7 | high | L | DIFF | two samples from two populations: difference of their estimated totals |  |
| MB2-D67-10 | 7 | high | I | - | sample space count with one combination excluded |  |
| MB2-D67-11 | 7 | mid | I | - | expected count from theoretical probability compared with the observed count |  |

key positions: S 3 / L 2 / I 6 (end 45%; ends by tier low 0/2, mid 3/5, high 2/4); tiers low 2 / mid 5 / high 4

### Author D8 — Statistics and Probability, 8.SP: grade 8 x10 (10 slots; 2 marked core)

| id | grade | tier | key | class | mechanism (yours alone in this batch) | core |
|---|---|---|---|---|---|---|
| MB2-D8-01 | 8 | low | I | - | predicted value from a line-of-fit equation |  |
| MB2-D8-02 | 8 | low | I | - | two-way table: row relative frequency as a percent |  |
| MB2-D8-03 | 8 | mid | S | DIFF | residual: actual minus predicted for one point (signed) | core |
| MB2-D8-04 | 8 | mid | L | DIVISOR | slope of a fit line from two of its points, then the change over k units |  |
| MB2-D8-05 | 8 | mid | I | - | two-way table: column relative frequency (conditional) | core |
| MB2-D8-06 | 8 | mid | S | NEGTERM | fit line with a negative slope: prediction a number of years later |  |
| MB2-D8-07 | 8 | high | L | DIFF | two groups with two fit lines: difference of predictions at one x |  |
| MB2-D8-08 | 8 | high | I | - | two-way table: joint relative frequency of one cell |  |
| MB2-D8-09 | 8 | high | S | SIGNED | fit line through two given points with a negative intercept: the prediction at x = 0 |  |
| MB2-D8-10 | 8 | high | I | - | fit line in hours used with an input given in minutes |  |

key positions: S 3 / L 2 / I 5 (end 50%; ends by tier low 0/2, mid 3/4, high 2/4); tiers low 2 / mid 4 / high 4

