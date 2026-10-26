# map-v2 Math, batch 4 — NUMBER SYSTEMS + STATISTICS — author brief (grades 5-8, 5 authors, 36 slots)

You are writing MAP Growth-style maths multiple-choice items for **grades 5-8** in two areas, **Real and Complex
Number Systems** and **Statistics and Probability**: four options, every option a plain number. They go into a
question bank used by real students in a practice product (not NWEA's test). Repo
`/Users/andylee/Downloads/saas/classraum` (absolute paths always). Your task message names your **author code**
(N5, N6, N7, N8, D). Write ONLY your own slots (tables at the end).

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command, and never start a search
or loop with no bound. Do not run git. No web. Use only your own (Claude) reasoning; no external model calls, no GPT.
**Never open any NWEA item, any file with "herald" in its name, or any PDF.** Write from your own knowledge of the
public Common Core grade-level standards. Do not touch the database. Do not open another author's folder. Do not
spawn agents.

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-b4-work/<your code>/` (git-excluded; create it).
`DUMP` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b4` (every live maths row in every
family, every earlier MAP and SAT batch item, and every batch-1, -2 and -3 item with its outcome).

## Why this batch exists

Live MAP maths is 207 items = 4 complete forms. Form 5 is short **Number Systems 6/10 and Statistics 9/10** (live N
46, D 49). This batch needs at least 4 live Number Systems and 1 live Statistics survivor, and is sized for about 8
and 4. Number Systems has the lowest yield of any area: batch 1 kept 32 of 63 (grade 5-6 author 18/25, grade 7
8/19, grade 8 6/19), batch 2 kept 2 of 13 core slots (4 EMPTY, 5 withdrawn, 2 dropped by graders).

Batch 3 (Geometry) fixed the key's rank per slot and passed the options-only bar 15.9% vs 37.7%: the solvers kept
picking the second-smallest option and lost. This batch uses the same design.

## The options-only solvers in these two areas (measured on batches 1 and 2, before deciding the rank spread)

    picks by key rank 1/2/3/4 (1 = smallest)      candidate keys at rank 1/2/3/4    candidate hits (from rank-2 keys)
    Number Systems b1 (38 items)  3 / 61 / 42 / 8     15 / 8 / 5 / 10                 25 (12)
    Statistics     b1 (46 items)  5 / 68 / 59 / 6     16 / 6 / 9 / 15                 32 (13)
    Statistics     b2 (11 items)  0 / 19 / 14 / 0      4 / 3 / 2 / 2                   9 (7)

Statistics shows the same pattern as Geometry: picks go to the two middle options, the second-smallest first, and
in batch 2 three rank-2 keys produced 7 of the 9 candidate hits. Number Systems is the same. So both areas take
**equal ranks: Number Systems 6 / 6 / 6 / 6, Statistics 3 / 3 / 3 / 3**, end keys 50%.

## Anti-tell rules (computed by math-check.mjs on every item; RANK and HUB refuse)

1. **RANK — the slot fixes the key's rank** 1-4 among the four values. math-check refuses a mismatch.
2. **HUB — no derivation centre.** No option x2, x3, x4, x1.5 or x10 of two or more others; the key in no such ratio
   pair; the key not the midpoint of two options. In Number Systems a x10 / x0.1 place-value sibling of the key is
   therefore never an option (it was already LONE-risky).
3. **DOWN-ERRORS for rank-3 and rank-4 keys (author-computed, in `self_audit.note`):** name the distractors below
   the key and the real error behind each. If you cannot name two, change the numbers or swap the mechanism.
4. **Cover-the-question by rank (author-computed):** cover the stem, sort your four numbers; "pick the second-
   smallest" and "pick the one the others are built from" must both fail. No option is key +/- a printed number;
   no two distractors are key + x and key + 2x.

## Number Systems: where FORM and the estimate bracket can both be met (read before writing any N item)

Two rules have killed Number Systems slots for two batches: **FORM** (refused in this area: every option in the key's
surface form — same decimal places, same lowest-terms denominator, and the key's exact final digit when the key has
two or more digits) and **K4** (a student's one-line rounded estimate may strike at most one distractor). Reading every
batch-1 and batch-2 Number Systems withdrawal and drop, both rules can be met by real errors in exactly these shapes:

- **Decimal keys where the final digit comes from a term every path uses unchanged, and the errors act on OTHER
  terms that have a zero in that place.** An omitted step, a repeated step counted once too few or too many, or a sign
  on a small term shifts the answer by a tenth or a whole number and keeps the final digit (batch-1 survivors
  MV2-N56-03 seedling, MV2-N56-05 rice, MV2-N7-13 game score, MV2-N7-19 glacier: all four kept as end keys).
- **The error-bearing term is the SMALL term.** Errors on the big terms move the answer by more than the estimate's
  slack, and the estimate strikes them (batch 1 withdrew six grade-7 items for this alone: MV2-N7-02, -06, -11, -14,
  -15, -16). Errors on a small term stay inside the slack. Choose big terms that do not round cleanly (x.4-x.6), so
  the estimate itself is loose.
- **Fraction and mixed-number keys where every error keeps the denominator:** errors on the whole-number part
  (regrouping across a whole), a wrong count of a repeated fraction, a fraction taken of the whole instead of the
  rest. "Add across numerators and denominators" and "invert the wrong fraction" change the denominator and cannot be
  options (MV2-N7-17, MV2-N56-02, MV2-N56-17 survived this way).
- **One-digit integer keys** escape the final-digit rule, but then K1 (parity, class) and LONE decide: use them only
  where the four values share a class.

**Clusters that cannot meet both rules with real errors. No slot is placed in them; do not swap into them:**

- **A single quotient as the answer** — fraction-by-fraction "how many servings/bags", GCF/LCM counts, "how many
  pieces". The divisor times two consecutive whole numbers brackets the answer for free, and FORM leaves one real
  error inside the bracket (MB2-N56-16; MV2-N56-13, -25). A quotient may be a PART of a chain whose answer is not the
  quotient (slot MB4-N6-05).
- **Rounded-value asks** — a square root to the nearest tenth, a fraction to a rounded decimal, "closest integer to".
  FORM plus rounding leaves no real distractor set (MB2-N78-04 and MB2-N78-15 were EMPTY; an integer-closest ask with
  two-digit options fails the final-digit rule outright).
- **Scientific notation x, /, - and "how many times greater"** — every natural error changes the power of ten, which
  K4's order-of-magnitude bound strikes, and dividing by a number below 1 is a free one-sided bound (MB2-N78-14, -16,
  -18; MV2-N8-05, -07, -11, -12).
- **A single root or power evaluated as an end key** — every natural root/exponent error overshoots (MV2-N8-02, -09,
  -12, -13, -16, -17, -18). Roots appear here only as decimals inside a difference or a sum (N8).
- **Products of two decimals ending in 5** (a .5 x .5 product must end in .25 or .75: MB2-N78-03).
- **Signed add/subtract chains of the elevator / glacier / divers / temperature-rise type** are not impossible, they
  are TAKEN: MV2-N7-03, -05, -12, -13, -18, -19 and MB2-N78-02 are live, so another is an R11 template drop. Grade-7
  slots here use means, products by negative fractions, distribution and exact fraction-decimal conversion instead.

That is why Number Systems' slots lean to grade 5 (9 of 24; batch-1 grade-5/6 keep 72%) although grades 7 and 8 are
thinner live (10 and 8): the forms draw by area, not grade, and the grade-7/8 clusters left are the narrow ones above.

## Statistics: what is taken

Line-plot totals, differences, cut-offs and equal shares (grade 5); unit conversion with length and mass; MAD and
IQR comparisons; sample-to-population estimates (single, pooled, by plots); predicted values from a line of fit
(forward, backward, re-based, unit-changed); two-way relative frequencies of every kind; a code-probability chain
(ISEE). All are in `EXCLUSIONS-map-num-stat-b4.txt` or the live ISEE bank. The D slots avoid them: capacity units, a
re-recorded line-plot value, effects of shifting every score, range versus IQR, mean versus mode, combined means,
probabilities from decimals and models, residual differences, points above a fit line, the mean of predictions.

## How you write

Write your items as ONE JSON array in `WORK/items.json`, in slot order, adding each item as soon as it is finished.
After each item (or every few) run, from the repo root:

    node scripts/study-bank/map-v2-work/math/math-check.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-b4-work/<code>/items.json --slots scripts/study-bank/map-v2-work/math-b4/slots.json --prior /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b4/prior-math.json --families isee,ssat,map

**All three flags, every time.** Without `--slots` every item fails "not a slot" and RANK/HUB never run; without
`--prior` and `--families ...,map` the check cannot see batches 1-3 (a verbatim copy of live MV2-N7-19 in a batch-4
slot fails only because of them; tested 2026-10-26). Fix every `PART FAIL` until every item prints `PART OK`.
`(read)` lines are not failures: answer each in `self_audit.note`. The check cannot see a re-skinned mechanism; you
must (rule 1, K7).

Scratch work goes in `WORK/scratch/`. Do not create any file in the repo outside `WORK`.

## Slots

Each slot fixes grade, **tier**, the key's **rank** (S = rank 1, I = rank 2 or 3, L = rank 4), the **mechanism** and,
on rank 1 and 4, the **two-sided class** (DIFF, SIGNED, DIVISOR, NEGTERM: at least one distractor from an error in the
part that pushes the answer the OTHER way, named in `far_distractor`). You may not change grade, tier or rank.

**Every mechanism was checked against every earlier MAP chain in its area** (v1-v5, all batch-1 and batch-2 Number
Systems and Statistics items — `scripts/study-bank/map-v2-work/math-b4/EXCLUSIONS-map-num-stat-b4.txt` — and the
live ISEE / SSAT bank by keyword). Three first drafts were replaced because ISEE already holds them (a debt with a
fraction charged on it, rows-of-seats differences, a code probability) and one because it repeated a batch-3
Geometry chain (a rectangle's perimeter from coordinates). R11 was batch 2's main drop (Statistics lost 5 of 7 drops
to it), so run the dup search anyway and READ every hit. If a mechanism cannot meet the rules in its slot, replace it
with a different mechanism **of the same class and grade, in no table and no exclusion entry, and not in a cluster
listed above as unable to meet FORM and K4**; record `MECHANISM SWAP: <old> -> <new>, because <reason>`.

**Tiers.** low = most students in that grade get it right; mid = about half; high = only stronger students, by depth
of the grade's own content. No end key sits at low tier. `rit_band` (copy exactly): grade 5 low/mid/high
`"RIT 190-199"` / `"RIT 200-209"` / `"RIT 210-219"`; grades 6 and 7 `"RIT 200-209"` / `"RIT 210-219"` /
`"RIT 220-229"`; grade 8 `"RIT 210-219"` / `"RIT 220-229"` / `"RIT 230-239"`. `difficulty`: low = `"easy"`, mid =
`"medium"`, high = `"hard"`. Number Systems: `domain` `"Real and Complex Number Systems"`, `map_area` `"num"`, grade-5
`area_25` `"Number and Operations"`. Statistics: `"Statistics and Probability"`, `"data"`, grade-5 `area_25`
`"Measurement and Data"`.

## Content per area and grade (nothing else; off-blueprint items are dropped)

**N — Real and Complex Number Systems**
- g5 5.NBT (place value, powers of ten, multi-digit multiplication and division, decimal operations to hundredths) and 5.NF (adding / subtracting unlike fractions and mixed numbers, multiplying and dividing fractions, unit fractions by whole numbers, fraction word problems)
- g6 6.NS (dividing fractions by fractions, multi-digit decimals, GCF and LCM, the distributive property with GCF, integers and absolute value, rational numbers on a number line, distance between points with one shared coordinate)
- g7 7.NS (adding, subtracting, multiplying, dividing rational numbers including negatives; converting fractions to decimals; multistep problems with rational numbers)
- g8 8.NS (irrational numbers, rational approximations, ordering) and 8.EE.A (integer exponents, square and cube roots, scientific notation and operations with it)

**D — Statistics and Probability** (author D, all four grades)
- g5 5.MD.A-B (converting among units within one measurement system; line plots of fractional measurements and operations on that data). Give a line plot as a `graphic` `{"type":"table","rowLabels":[...values],"colLabels":["Number of ..."],"cells":[[n],...]}`.
- g6 6.SP (mean, median, mode, range, interquartile range, mean absolute deviation, effect of one value on a measure, reading a dot plot / histogram / frequency table given as a table)
- g7 7.SP (random samples and inference from a sample, comparing two populations, probability of simple and compound events, sample spaces, experimental vs theoretical probability)
- g8 8.SP (scatter plots and a line of fit given as an equation, predicted values, slope / intercept meaning numerically, two-way tables and relative frequencies). A percent-of-a-number item is Operations, not Statistics.
- D items may carry a `graphic` (table, twowaytable, bar) when the item needs data; the graphic must be NEEDED
  (cover it and the item must become unanswerable). Number Systems items: no graphic.

Use each context family (money, recipe, sport, travel, school, building, nature, science measurement, games) at most
twice in your file.

## Item schema (every field required unless marked) — unchanged from batches 1-3

    {
     "id": "MB4-N7-02", "domain": "<the area's full name, exactly as above>", "map_area": "oa"|"num"|"geo"|"data",
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

## Rules (binding; math-check.mjs enforces most of rules 1-20, plus RANK and HUB above)

1. **One mechanism per item, new to the bank.** Before writing each item run 2-4 searches and READ every hit:
   `node scripts/study-bank/mf30-kw.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b4 "term&term|alt"`
   (`&` = all terms, `|` = alternation). Record them in `dup_search`. **The 709 live ISEE maths rows already hold
   the standard grade 5-8 canon**, and batches 1-3 (323 items) now sit beside them. A new story over the same chain of
   steps IS a duplicate — of a withdrawn batch-1 item as much as of a live one. Read
   `scripts/study-bank/map-v2-work/math-b4/EXCLUSIONS-map-num-stat-b4.txt` for your area and grade before you start:
   every MAP Number Systems and Statistics item ever authored, banked or not, batches 1 and 2 included, with its outcome.
2. `solve` recomputes the key from the stem's numbers; `distractor_solve` for **every** distractor.
3. **Distractors are real student errors from different named wrong paths**, the errors a teacher of that grade
   actually sees. No derivational hub; no option = sum / difference / average / product of two others; no +/- pair
   containing the key; no evenly spaced or geometric run of three options through the key; no decimal-shift
   sibling of the key unless it is a genuine place-value error on a place-value item.
4. **No one-sided error family.** At least two distinct `error_kind`s, at least one of sign_slip / inverted_rate /
   wrong_variable / wrong_operation / wrong_base, at most one omission / partial_answer.
5. **Extreme keys (rank 1 / rank 4): a real distractor from the far side, from the slot's class.** The three distractors may not
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

### K-rules: the free eliminations that killed batches 1-3 (compute each one; answer each in `self_audit.note`)

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

Every item prints `PART OK` with all three flags. In `self_audit.note` answer, per item: "the key is rank r: which
distractors sit below it and which real error puts each there?"; "covering the stem, does the second-smallest or a
derivation centre pick it?"; K1-K5 each in one line (Number Systems: K4 as the computed estimate E and each
distractor's distance from it); "is any distractor a solved intermediate?"; "is this really a <tier> item for grade
<g>?"; "which cheap bound strikes the most distractors, and is it at most one?". Per rank-1/rank-4 item also: "which
two parts push the answer opposite ways, and which distractor comes from the far part?". Reply with one line per
slot: id, grade, tier, key rank, class, key, quantity asked, PART OK (or EMPTY and why, or MECHANISM SWAP and why).

## What happens next (so you know what the screen tests)

A cold screener (no access to your notes) looks for free eliminations and returns failing items to you ONCE; on a
return you either revise, withdraw with a reason, or stand with a reason. An options-only attack (three samples,
four numbers and no stem) is compared, per area, against matched live ISEE items. Two graders solve every item cold,
then check key, exclusivity, free elimination, template (against every earlier MAP item) and grade fit. Each area
passes or is held on its own. Passing items are inserted live.

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

## Slot tables (map-v2-math-b4-slots-2026-10-26; also in slots.json). Key ranks: Number Systems 6 / 6 / 6 / 6, Statistics 3 / 3 / 3 / 3.

### Author N5 — Real and Complex Number Systems, 5.NBT.B, 5.NF: grade 5 x9 (9 slots)

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP chain in this area) |
|---|---|---|---|---|---|---|
| MB4-N5-01 | 5 | low | 2 | I | - | n bags of a decimal mass plus one box of a decimal mass: total (n x a + b) |
| MB4-N5-02 | 5 | low | 3 | I | - | three unlike fractions (halves, thirds, sixths or quarters, eighths) added in a recipe; every option over the key's denominator |
| MB4-N5-03 | 5 | mid | 1 | S | NEGTERM | a decimal length minus n equal decimal pieces minus a decimal scrap: what is left (a - n x b - c) |
| MB4-N5-04 | 5 | mid | 2 | I | - | each of n boxes holds a decimal mass and loses a decimal mass of packing: total product ((a - b) x n) |
| MB4-N5-05 | 5 | mid | 4 | L | DIFF | two walkers, laps of two mixed-number lengths, different lap counts: how much farther one walks |
| MB4-N5-06 | 5 | mid | 3 | I | - | a fraction of a fraction-sized block, shared equally among n people: each share (5.NF.B.4 then B.7) |
| MB4-N5-07 | 5 | high | 1 | S | DIFF | n bottles of one decimal volume vs m bottles of another: how many fewer litres (not seats, not rows) |
| MB4-N5-08 | 5 | high | 4 | L | NEGTERM | a mixed-number duration: one fraction of the whole for one part, a fraction of THE REST for the next: the second part |
| MB4-N5-09 | 5 | high | 4 | L | DIVISOR | a unit-fraction amount split equally into n parts, then k of those parts: their total (5.NF.B.7a then a product) |

key ranks 1/2/3/4: 2 / 2 / 2 / 3 (end 5 of 9); tiers low 2 / mid 4 / high 3

### Author N6 — Real and Complex Number Systems, 6.NS: grade 6 x5 (5 slots)

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP chain in this area) |
|---|---|---|---|---|---|---|
| MB4-N6-01 | 6 | low | 2 | I | - | two debts written as negative balances: how many dollars more one owes (|a| - |b|, 6.NS.C.7) |
| MB4-N6-02 | 6 | mid | 3 | I | - | multi-digit decimals: cups per batch x a decimal number of batches, minus a spill (6.NS.B.3) |
| MB4-N6-03 | 6 | mid | 1 | S | SIGNED | from a signed starting elevation, down to a printed low point and then up to a printed high point: total vertical distance travelled (absolute value as distance, 6.NS.C.7c) |
| MB4-N6-04 | 6 | high | 4 | L | DIFF | two lengths of material at two decimal prices per metre: how much more one costs (6.NS.B.3) |
| MB4-N6-05 | 6 | high | 1 | S | NEGTERM | a board cut into equal decimal pieces (exact division), each piece then trimmed by a decimal amount: total trimmed length |

key ranks 1/2/3/4: 2 / 1 / 1 / 1 (end 3 of 5); tiers low 1 / mid 2 / high 2

### Author N7 — Real and Complex Number Systems, 7.NS: grade 7 x5 (5 slots)

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP chain in this area) |
|---|---|---|---|---|---|---|
| MB4-N7-01 | 7 | mid | 1 | S | SIGNED | the mean of four signed weekly changes in hundredths (two negative, two positive) |
| MB4-N7-02 | 7 | mid | 2 | I | - | an expression mixing a negative fraction times a negative decimal and a negative mixed number divided by a fraction, magnitudes chosen so no rounded estimate decides it |
| MB4-N7-03 | 7 | mid | 3 | I | - | a terminating fraction (sixteenths or fortieths) converted exactly and combined with a decimal and another fraction (7.NS.A.2d; no rounding) |
| MB4-N7-04 | 7 | high | 4 | L | SIGNED | two signed quantities each multiplied by a different negative fraction, then added (not a balance with a fraction charged: ISEE holds that) |
| MB4-N7-05 | 7 | high | 3 | I | - | distribution over a difference with negatives, -a(b - c) + d(-e), decimals |

key ranks 1/2/3/4: 1 / 1 / 2 / 1 (end 2 of 5); tiers low 0 / mid 3 / high 2

### Author N8 — Real and Complex Number Systems, 8.EE.A.2 (roots), 8.EE.A.1 (integer exponents): grade 8 x5 (5 slots)

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP chain in this area) |
|---|---|---|---|---|---|---|
| MB4-N8-01 | 8 | low | 2 | I | - | side of a square from a decimal area that is a perfect square of a tenth (2.25, 6.25, 1.69) |
| MB4-N8-02 | 8 | mid | 3 | I | - | x^2 = a decimal square and y^3 = a negative decimal cube: x + y with the positive root |
| MB4-N8-03 | 8 | mid | 2 | I | - | the two solutions of x^2 = a decimal square: how far apart they are on a number line |
| MB4-N8-04 | 8 | high | 1 | S | DIFF | a square of decimal area and a cube of decimal volume: how much longer the square's side is than the cube's edge |
| MB4-N8-05 | 8 | high | 4 | L | NEGTERM | one expression with negative integer exponents on decimal bases (0.2, 0.5) and a zero exponent |

key ranks 1/2/3/4: 1 / 2 / 1 / 1 (end 2 of 5); tiers low 1 / mid 2 / high 2

### Author D — Statistics and Probability, 5.MD.A-B, 6.SP, 7.SP, 8.SP: grade 5 x2, grade 6 x4, grade 7 x3, grade 8 x3 (12 slots)

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP chain in this area) |
|---|---|---|---|---|---|---|
| MB4-D-01 | 5 | mid | 1 | S | DIFF | line plot: every measurement of one value is re-recorded as another value: by how much the total changes |
| MB4-D-02 | 5 | high | 4 | L | DIFF | two jars in quarts-pints-cups: how many more cups one holds (capacity; the unit system no MAP item uses) |
| MB4-D-03 | 6 | low | 2 | I | - | every score in a list is raised by the same number of points: the new mean |
| MB4-D-04 | 6 | mid | 3 | I | - | eleven values: how much greater the range is than the interquartile range |
| MB4-D-05 | 6 | high | 1 | S | DIFF | a frequency table: how much greater the mean is than the mode |
| MB4-D-06 | 6 | high | 4 | L | DIFF | two groups of different sizes with printed means combined: how much greater the combined mean is than the smaller group's mean |
| MB4-D-07 | 7 | mid | 2 | I | - | two independent events given as decimals, one as a complement: P(A and B) as a percent |
| MB4-D-08 | 7 | high | 4 | L | DIVISOR | a spinner with n equal numbered sections spun twice: probability the second number is greater than the first, as a fraction (not a code: ISEE holds that) |
| MB4-D-09 | 7 | mid | 3 | I | - | a probability model with one outcome's probability missing: the expected count of that outcome in n trials |
| MB4-D-10 | 8 | mid | 1 | S | DIFF | two points and a printed line of fit: how much larger one residual is than the other (signed residuals) |
| MB4-D-11 | 8 | low | 2 | I | - | a table of six points and a printed line of fit: how many points lie above the line |
| MB4-D-12 | 8 | mid | 3 | I | - | a line of fit and a list of x values: the mean of the predicted values (equals the prediction at the mean x) |

key ranks 1/2/3/4: 3 / 3 / 3 / 3 (end 6 of 12); tiers low 2 / mid 6 / high 4

