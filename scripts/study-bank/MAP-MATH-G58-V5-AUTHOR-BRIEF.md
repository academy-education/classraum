# map-math-g58-v5 — author brief (Real and Complex Number Systems, 44 items: author A = grades 5-6, slots N01-N22; author B = grades 7-8, slots N23-N44)

You are writing MAP Growth-style maths multiple-choice items for **grades 5-8**: four options, every
option a plain number. They go into a question bank used by real students in a practice product
(not NWEA's test). Repo `/Users/andylee/Downloads/saas/classraum` (absolute paths always). The
pre-registration `scripts/study-bank/MAP-MATH-G58-V5.prereg.md` is binding, together with
`scripts/study-bank/MAP-MATH-G58-V4.prereg.md`, `MAP-MATH-G58-V3.prereg.md` and `MAP-MATH-G58-V2.prereg.md`, which it keeps unchanged except where it says; read all four. Your task
message names your author letter, the slots for THIS run, and the directories below.

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not run
git. No web. Use only your own (Claude) reasoning; no external model calls, no GPT. **Never open any
NWEA item, any file under a "herald" name, or any PDF.** Write from your own knowledge of the public
Common Core grade-level standards.

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-math-g58-v5-work` (git-excluded).
`DUMP` = `WORK/dump` (every live maths row, plus every v1, v2, v3, v4 and pilot MAP maths item, for the duplicate search).

## How you write

**One small file per item.** Write each item, as soon as it is finished, to
`WORK/parts/<id>.json` (one JSON object, not an array). Then immediately run

    cd /Users/andylee/Downloads/saas/classraum
    node scripts/study-bank/map-math-g58-v5.mjs part WORK/parts/<id>.json     (use the absolute path)

and fix the part until it prints `PART OK`. `(read)` lines are not failures; answer each one in the
item's `self_audit.note`. Then go to the next slot. Do only the slots named in your task message.
Do not create any file in the repo; scratch work goes in `WORK/scratch/<your letter>/`.

## Slots

`node scripts/study-bank/map-math-g58-v5.mjs slots` prints them. Each slot fixes the area, the grade,
the **tier** (difficulty within that grade) and where the key sits **by value** among the four
options: S = smallest, L = largest, I = one of the two middle values. You may not change them.

**Tiers.** low = most students in that grade get it right (one or two routine steps on the grade's
standard); mid = about half of the grade gets it right (two real steps, or one step that needs the
grade's key idea); high = only stronger students in the grade get it right (a decision point, a
multi-step setup, a common misconception that is genuinely tempting). **Write to the tier.** Earlier
MAP batches ran EASY for their grade; a high item must be hard *for that grade*, by depth of the
grade's own content, never by borrowing a later grade's content or by puzzle wording.

Target RIT band (copy into `rit_band` exactly as `slots` prints it in the script's RIT table):
grade 5 190-199 / 200-209 / 210-219; grades 6 and 7 200-209 / 210-219 / 220-229; grade 8
210-219 / 220-229 / 230-239 (low / mid / high), written `"RIT 200-209"`.

## Content per area and grade (nothing else; off-blueprint items are held)

**N — Real and Complex Number Systems** (author A: grades 5-6; author B: grades 7-8)
- g5 5.NBT (place value, powers of ten, multi-digit multiplication and division, decimal operations to hundredths) and 5.NF (adding / subtracting unlike fractions and mixed numbers, multiplying and dividing fractions, unit fractions by whole numbers, fraction word problems)
- g6 6.NS (dividing fractions by fractions, multi-digit decimals, GCF and LCM, the distributive property with GCF, integers and absolute value, rational numbers on a number line, distance between points with one shared coordinate)
- g7 7.NS (adding, subtracting, multiplying, dividing rational numbers including negatives; converting fractions to decimals; multistep problems with rational numbers)
- g8 8.NS (irrational numbers, rational approximations, ordering) and 8.EE.A (integer exponents, square and cube roots, scientific notation and operations with it)

Every item carries a grade-level CCSS code in `ccss` (e.g. `"5.NF.B.4"`, `"6.NS.A.1"`, `"8.EE.A.4"`),
from the list above for its grade. Grade-5 items also carry `area_25`: `"Number and Operations"`. Omit
`area_25` on grades 6-8.

## Item schema (every field required unless marked)

    {
     "id": "MM5-N05", "domain": "Real and Complex Number Systems", "map_area": "num",
     "grade_target": 5, "tier": "low" | "mid" | "high", "rit_band": "RIT 200-209",
     "difficulty": "easy" (low) | "medium" (mid) | "hard" (high),
     "ccss": "5.NF.B.4", "area_25": "<grade 5 only: Number and Operations>",
     "subskill": "<short label, < 60 chars>",
     "grade_rationale": "<why this is a <tier> item for grade <g>: which standard, which step is the hard one, what a typical student of that grade does>",
     "prompt": "<stem; plain text; reading level of the grade; ASCII '-' for minus; units in the stem, not the options>",
     "choices": ["..","..","..",".."],      // plain numbers only: integers, decimals, a/b, mixed "2 1/4", negatives "-3"
     "correct_answer": "<exactly one of choices>",
     "explanation": "<student-facing worked solution at the grade's level>",
     "solve": "<JS function body returning the key>",
     "distractor_solve": { "<option>": "<JS body returning exactly that option, rounding included>", ... 3 },
     "mechanism": ["2-4 short phrases naming the chain of steps"],
     "quantity_asked": "<what the stem asks for>",
     "plugback": { "substitutable": true|false, "verify": "<JS body of v: true iff v satisfies the stem; REQUIRED if substitutable>", "why": "<how a student would check an option against the stem, and why it does or does not work>" },
     "distractor_meta": { "<option>": { "error_kind": "<kind>", "error_sense": "omits"|"adds"|"swaps", "direction": "above"|"below", "stem_predicts_direction": false, "slip": true|false, "misconception": "<the named misconception, e.g. 'adds numerators and denominators'>", "why": "<the student's wrong path, in a sentence a teacher would recognise>" }, ... 3 },
     "counter_error": { "error_kind": "<kind>", "solve": "<JS body>", "direction": "above"|"below", "why": "<the natural error>" },   // REQUIRED on S and L slots
     "far_distractor": { "option": "<a distractor>", "natural_side": "above"|"below", "why": "<why an error of this kind, which ordinarily lands past the key, lands on the near side HERE>" },   // REQUIRED on S and L
     "structure_check": "<S/L: does the item's structure tell a student which way EVERY error goes? It must not; say why not>",
     "intermediate_check": "<for EACH distractor: is it a value the key follows from through ONE printed rate, price or relation? each 'no', with the reason>",
     "cheap_bound_check": "<S/L: the cheapest one-sided bound readable from the stem, and which distractor sits on the key's side of it; I: 'interior key'>",
     "shape_check": "<properties the stem hands over (sign, whole number, cap, more/less than a printed amount) and which options survive each; >= 2 survive all together>",
     "interior_parity_check": "<the two middle values: same display form and complexity? the key is not the cleaner one>",
     "arith_class_check": "<is the key alone in a class (whole vs fraction, even, multiple of k, round, negative) the stem implies?>",
     "dup_search": { "queries": ["<mf30-kw.mjs queries you ran>"], "hits_read": <n>, "nearest": "<id + why it is different>" },
     "bound_screen": [ { "kind": "sign"|"magnitude"|"parity"|"units_digit"|"range", "bound": "<the cheapest bound of this kind a student can read from the stem WITHOUT doing the work, or 'none: <why>'>", "strikes": ["<each option that bound rules out; at most ONE distractor, never the key>"] }, ... one entry per kind, all five ],
     "self_audit": { "risk": "low|medium|high", "note": "<what a test-wise student would try, and why it fails; answer every (read) line>" }
    }

`error_kind`: `sign_slip`, `inverted_rate`, `wrong_variable`, `wrong_operation`, `wrong_base`,
`omission`, `partial_answer`, `other`. `error_sense`: `omits` (leaves out a step, term, condition, or
stops early), `adds` (extra step, double count, ignores a reducing condition), `swaps` (sign,
inversion, swapped quantity, wrong operation or base). An `omission` kind is always `omits`.

## Rules (binding; the part check enforces most)

1. **One mechanism per item**, distinct from every other item in this batch and from every live
   maths item (any family). A new story over the same chain of steps IS a duplicate. Before writing
   each item run 2-4 searches and READ every hit:
   `node scripts/study-bank/mf30-kw.mjs <DUMP> "term&term|alt"` (`&` = all, `|` = alternation).
   Record them in `dup_search`. Also do not reuse a chain from your own earlier items in this batch
   (read your own earlier parts in `WORK/parts/` before each run).
2. `solve` recomputes the key from the stem's numbers; `distractor_solve` for **every** distractor.
3. **Distractors are real student errors, from different named wrong paths**, the errors a teacher
   of that grade actually sees (adding numerators and denominators, multiplying by the reciprocal of
   the wrong fraction, mean vs median, area vs perimeter, radius vs diameter, forgetting to convert
   units, a sign error with negatives, percent of the wrong base...). No derivational hub, no option =
   sum / difference / average / product of two others, no +/- pair containing the key, no evenly
   spaced or geometric run of three options through the key, no decimal-shift sibling of the key
   unless it is a genuine place-value error on a place-value item (and then not as the only one).
4. **No one-sided error family.** At least two distinct `error_kind`s, at least one of sign_slip /
   inverted_rate / wrong_variable / wrong_operation / wrong_base, at most one omission /
   partial_answer. `stem_predicts_direction` is honestly false.
5. **Extreme keys (S/L): a real distractor from the far side.** The three distractors may not all be
   `omits` (nor all `adds`). `far_distractor` names a REAL distractor whose error ordinarily lands
   past the key and lands on the near side here because of how the stem is built. `counter_error`
   is a natural error (not an option) that lands strictly past the key. Write the cheapest one-sided
   bound a student can read from the stem in `cheap_bound_check`, and make sure at least one
   distractor sits on the key's side of it.
6. **Banned asks on S/L slots:** greatest / least / maximum / minimum / largest / smallest, "sum of
   all", "possible values". **No "for every / for each / for all / any", vertex, maximum, minimum,
   highest, lowest, peak or "top of" in the stem of an S/L item** (a structure that signs every error).
7. **Option pairs.** The key must not equal another option combined by ONE operation (+, -, x, /)
   with a number printed in the stem (other than 1), nor another option times / divided by a printed
   number +/- 1 or the sum of two printed numbers, nor differ from an option by the sum of two printed
   numbers. These are the "how many MORE", "one extra", "total vs each" distractors: natural, and
   they hand over the key. With grades 5-8's small printed numbers this fires often: build the
   distractors from errors whose values are not one printed step from the key.
8. **Plug-back.** A student tries options in ascending order (descending on a greatest / most
   stem). If an option can be checked against the stem in one routine step, the item is broken when
   that order reaches the key in 1 or 2 tries. If `substitutable` is true, write `verify` (true only
   for the key) and the key must sit at try 3 or 4 (the check enforces it). On an S slot or the
   lower interior value, ask for a quantity a student cannot confirm from the option (not "the value
   of x" in a printed equation; a derived quantity one step past it is fine).
9. **Every option is a legal value** of the quantity asked and survives every property the stem
   hands over (a count is a whole number; a probability is between 0 and 1; a length is positive; a
   value under a stated cap respects it). At least two options survive every property together.
10. **Interior parity:** the two middle values have the same display form (both fractions, both
    one-decimal, both whole) and similar complexity; the key is not the cleaner one. No two options
    summing to 1, 90, 180, 360 or 100 unless the item is about that sum and the key is not in the pair.
11. **The key is not a number printed in the stem** (or in the table).
12. **No solved intermediate as a distractor**: no distractor may be a value from which the key
    follows through ONE printed rate, price or relation (the distance when the stem prints the speed
    and asks the time; the total when it prints the price and asks the count).
13. Within your own items, no key value repeated and no option set repeated; ASCII `-`; "xy-plane"
    only at grade 8 ("coordinate plane" earlier). Language and contexts at the grade's reading level;
    plain everyday contexts; no reviewer-facing text in `explanation`.
14. **Rounding / "closest to" stems**: make every option a rounded value of the same form, or ask an
    exact quantity.
15. **A given condition the answer does not need is a defect**; every number in the stem is used.

16. **NEW IN V2 — no cheap bound strikes more than one distractor.** In v1 the biggest single cause of
    drops (R4, 7 items, plus several drop_recommends) was a bound a student reads off the stem without
    solving — "the answer must be less than the printed 26", "it is a whole number", "it must be even",
    "it ends in 5", "it is negative" — that struck TWO distractors and left a coin flip. In v2, for each
    of the five kinds (sign, magnitude, parity, units digit, range from one printed number) write the
    cheapest such bound in `bound_screen` and list the options it strikes. **Each bound may strike at
    most ONE distractor.** If any bound strikes two, rebuild the distractors (an error path that lands
    on the key's side of the bound), do not argue the bound away. The part check refuses a declared
    bound striking two, and prints a `(read) PRINTED` line for every number printed in the stem with
    two or more distractors beyond it: answer each one honestly in `bound_screen` (range) and in
    `self_audit.note`. **This declaration is your self-check, not the test.** Before freeze a separate
    cold screener, who has not seen your declaration, looks for exactly these strikes the way the
    graders will; an item it can strike two from is returned to you once, and dropped if it still
    fails. Bounds you have already satisfied eliminate nothing; look for the one you have not thought of.
17. **No earlier item re-skinned.** v4 (`map-math-g58-v4`) wrote 40 Number Systems items (plus 29 revisions), and the part check compares against all of them. v1 (`map-math-g58-v1`) wrote 45 items in these three areas, v2
    (`map-math-g58-v2`) wrote 60 and v3 (`map-math-g58-v3`) 84 (plus 42 first drafts); none is reused, and the part check also compares against every v2 and v3 item. The duplicate search includes every v1 item (`DUMP/prior-math.json`,
    file `map-math-g58-v1`), and the part check refuses a prompt near-duplicate of one (`near-dup v1`).
    A new story over a v1 chain of steps is a duplicate even when the check is silent.
18. No graphic: describe everything in words.

19. **NEW IN V4 — why Number Systems was held, and what that asks of you.** v3 wrote 28 Number Systems
    items. The screen failed 19, and the one return rebuilt them so that no cheap bound struck two
    options. The return author's own method, in its words: "on most items one distractor is the
    sacrificial one that a cheap bound strikes. The other two come from real errors that land inside
    every cheap bound." It passed the screen and failed the options-only attack: three samples of a
    solver, seeing **only the four numbers** (no question), picked the key 38.9% of the time against
    19.4% on live ISEE items (bar +10). They said how: drop the far option, then take the middle of the
    three that remain, or the option the others look built from (a dropped carry, a moved decimal, a
    swapped digit). Items with one option far from the other three were solved 66.7% of the time.
    Two consequences, both enforced:
20. **LONE — no option alone by sign or size.** No option may be the only negative (or only positive)
    one, and no option may sit alone in size: at least twice as far (as a ratio) from its nearest
    neighbour as the other three are spread, and at least 2x away. A "sacrificial" distractor is
    exactly this. If a cheap bound would strike one option, let it strike one that sits among the
    others in size (an error that lands on the wrong side of a bound but near the key), not one far
    away. The part check prints `LONE` and refuses.
21. **SLIP — distractors from different misconceptions, at most one computational slip.** Mark every
    distractor `slip: true` if it is a slip on the key's own correct working (dropped or extra carry,
    a miscopied digit, a decimal point misaligned in a sum or product, a misread remainder) and
    `false` if it comes from a wrong IDEA (adds numerators and denominators; divides by the wrong
    fraction or forgets to invert; multiplies the base by the exponent; adds exponents when dividing
    powers of ten; treats a negative times a negative as negative; subtracts the smaller digit from
    the larger in each column; reads a remainder as a decimal; orders decimals by length; takes the
    absolute value of a difference the wrong way round; confuses a square root with half). **At most
    one slip per item, and each distractor names a different `misconception`.** Slips land beside the
    key and make it the centre of the set; misconceptions land wherever the idea takes them, which
    is what a real student does. Where a misconception lands outside a cheap bound, change the
    numbers in the stem so it lands inside, not the misconception.
22. **The cover-the-question test, before you hand in each item.** Cover the stem. Look only at the
    four numbers. Is one of them far from the rest? Is one of them the centre the other three look
    built from (half, double, x10, one digit changed, a carry)? If yes to either, rebuild. Then
    uncover the stem and ask which two a student could cross out from the printed numbers alone.


## Before you finish the run

Every part of this run must print `PART OK`. In `self_audit.note` answer for each S/L item: "covering
the work, could a student tell from the stem which way the errors go and strike all three? Does one
bound from the stem strike all three?"; for each S / lower-interior item: "could a student check an
option in one routine step?"; for every item: "is any distractor a solved intermediate?", "is this
really a <tier> item for grade <g>, not easier?" and "which cheap bound strikes the most distractors, and is
it at most one?" If any answer is wrong, rewrite the item.

Do not edit any file except your own parts and your scratch folder. Do not read any grader / solver
file or the other author's parts. When done, reply with one line per item: id, grade, tier, slot
position, key, quantity asked, PART OK.

23. **Why this batch is shaped this way.** 30 of the 44 slots have the key at an END (S = the smallest option, L = the largest); 14 are interior (I). The MAP maths gate needs about 40% end keys among KEPT items, and end keys die far more often than interior ones. A 12-item pilot (map-math-g58-v5p) with rules 24-25 raised end-key survival from 8% to 25% (42% had two tiers been set right). In v4, end-position items survived screen and grading at **2 of 24 (8%)** against **12 of 16 (75%)** for middle keys, and the MAP maths gate needs about 40% end keys in what is kept. Their failures were nearly all two kinds: (a) **two options struck without solving** (22 cases), mostly by a DIGIT tell: "4 x .35 ends .40 so the cents digit is 0", "a whole percent of 500 is a multiple of 5", "only one option is in 24ths"; and (b) **one-sided** (20 cases): every natural error lands on the same side, which a student can read from the stem, so the end option is the answer.
24. **FORM — every option shares the key's surface form (enforced; the part check prints `FORM` and refuses).** Same number of decimal places; for fractions, the same denominator in lowest terms (whole parts allowed); for integers and decimals, **the same final digit as the key** when the key has two or more digits (a one-digit key: the same class 0 / 5 / other even / other odd). Choose the stem's numbers so that the misconceptions you use land in that form. The pilot's screen still beat a class-only rule on money items ("3 x 4.45 ends .35, so the answer ends in 3"); the exact digit closes it.
25. **The end-position recipe (what the screen will test).**
    - **Two directions in the problem.** The stem's computation must contain a step that raises the answer and a step that lowers it (adding and subtracting, multiplying by a number above 1 and below 1, a negative sign), so that a student cannot read from the stem which way the errors go.
    - **A real error from the far side, landing on the near side.** For an S key, at least one distractor must come from an error that USUALLY makes the answer smaller (dividing by a number below 1 the wrong way, dropping a subtraction, a sign error) but here lands ABOVE the key because of how the numbers are built. For an L key, the mirror. Name it in `far_distractor` and explain the numbers that make it flip.
    - **No single estimate puts all three distractors past the key.** Write the cheapest bound from one printed number or one rough product in `cheap_bound_check`, and make sure at least one distractor sits on the key's side of it, within about 10% of the key.
    - **Not checkable by plugging in.** On an S slot a student tries the smallest option first: ask for a quantity that cannot be confirmed from the option in one routine step.
    - LONE and SLIP still apply: no option alone by sign or size, at most one computational slip, three different named misconceptions.
26. **Tier, set honestly (two of the pilot's five screen survivors died here).** Both graders rated N04 (grade 6 low: divide a price by 0.75) and N05 (grade 6 mid: distance from a negative mixed number) a tier harder than labelled. low = ONE routine step on the grade's standard that most of the grade gets right; mid = two real steps or one step needing the grade's key idea; high = a multi-step setup or a genuinely tempting misconception. Dividing by a decimal or working across zero with mixed numbers is never low; write `grade_rationale` naming the hard step, and if it is harder than the slot's tier, simplify the numbers, not the label.
27. **Do not reuse one wrong idea across your items.** The pilot's author used regrouping slips and "multiplies only the whole part" in four and three items: a pattern across items is a tell even when each item is fine.

