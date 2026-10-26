# map-v2 Math, batch 3 — GEOMETRY ONLY — author brief (grades 5-8, 4 authors, 32 slots)

You are writing MAP Growth-style **Geometry** multiple-choice items for **grades 5-8**: four options, every option a
plain number. They go into a question bank used by real students in a practice product (not NWEA's test).
Repo `/Users/andylee/Downloads/saas/classraum` (absolute paths always). Your task message names your **author
code** (G5, G6, G7, G8: one grade each). Write ONLY your own slots (tables at the end).

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command, and never start a
search or loop with no bound. Do not run git. No web. Use only your own (Claude) reasoning; no external model
calls, no GPT. **Never open any NWEA item, any file with "herald" in its name, or any PDF.** Write from your own
knowledge of the public Common Core grade-level standards. Do not touch the database. Do not open another author's
folder. Do not spawn agents.

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-b3-work/<your code>/` (git-excluded; create it).
`DUMP` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b3` (every live maths row in every
family, every earlier MAP and SAT batch item, all 221 batch-1 items and all 72 batch-2 items with their outcomes).

## Why this batch exists

Live MAP maths is 192 items = 4 complete forms. **Geometry binds at 42 live; 5 forms need 50**, so this batch needs
8 live Geometry survivors and aims for 12. Batch 2's Geometry (18 frozen, 12 passed the graders) was **held on the
options-only bar**: three solvers who saw only the four numbers hit the key 38.9% of the time against 27.8% on
matched live ISEE items (+11.1, bar +10), unanimously right on 27.8% vs 11.1%. Those 12 items are never revised or
resubmitted, and no batch-3 item may be a new story over one of their chains. Batch 3 is fresh mechanisms.

## What the options-only solvers actually used (read this before you build a single option set)

The solvers' own notes name "middle value" and "the value the others derive from". Their picks, against the keys:

    batch-2 Geometry, 18 candidates (54 picks)   key rank 1/2/3/4 = 6/6/3/3   picks by rank = 2/39/12/1
    matched live control, 18 items (54 picks)    key rank 1/2/3/4 = 3/2/8/5   picks by rank = 5/25/15/9
    (rank 1 = smallest option ... rank 4 = largest)

- **The tell was the SECOND-SMALLEST option.** The solvers picked it 39 times out of 54. Six candidate keys sat
  there (the control had two), and those six drew 16 of their 18 picks; four of the five unanimous hits were among
  them. Every one of the 21 candidate hits was a middle pick.
- **Why the keys sat there:** Geometry's natural errors mostly INFLATE (forgetting the 1/2 doubles a triangle,
  radius-for-diameter quadruples an area, a hidden face counted twice). A set built from real errors therefore
  piles its distractors above the key, and an interior key slides to rank 2.
- **The hub ("the value the others derive from") did not key a single batch-2 candidate** — 0 of 18 — but it keyed 5
  of the 17 numeric controls and drew hits on two of them (104 among 26 and 130; 44 among 11, 22 and 121). It is the next tell, so it is guarded too.
- The same pattern across every MAP maths area so far: the share of frozen keys at rank 2 was 13-21% in every area
  that passed (batch 1: Geometry 15%, Number 21%, Statistics 13%, Operations 17%; batch 2 Operations 21%, margin
  +8.3) and 33% in the one that failed. Small samples; it is the best measurement there is.

## Anti-tell rules (computed by math-check.mjs on every item; the first two refuse)

1. **RANK — the slot fixes the key's rank**, 1 (smallest), 2, 3 or 4 (largest) among the four values, not only
   S / I / L. The batch's 32 slots are exactly 8 / 8 / 8 / 8, so no position pays above chance. math-check prints
   `RANK key is rank r of 4 ascending, slot rank s` and refuses a mismatch. Rank-3 keys are the hard ones: they
   need TWO distractors below the key (rule 3).
2. **HUB — no derivation centre.** No option may be x2, x3, x4, x1.5 or x10 of two or more others (either way); the
   key may not be x2, x3, x4, x1.5 or x10 of ANY option; the key may not be the midpoint of two other options.
   math-check prints `HUB ...` and refuses. This removes the most natural Geometry distractor of all — "forgot the
   1/2", which is exactly 2 x key — whenever it would pair with the key: use it only where the item has no 1/2, or
   choose a different named error.
3. **DOWN-ERRORS for rank-3 and rank-4 keys (author-computed, answer in `self_audit.note`).** Name the distractors
   below the key and the error that puts each there. Errors that DEFLATE a Geometry answer: halving twice (1/2 on a
   rectangle as well as the triangle), radius used where the diameter belongs in a sum (circumference vs half),
   leaving out a face, a part or a layer, using the shorter of two printed dimensions twice, subtracting a shared
   edge or overlap twice, dividing by a larger wrong count (faces 6 vs 4, cubes per edge vs per volume), applying
   a scale factor linearly where it should be squared or cubed (when the factor is a fraction, linear is the BIG
   error — check the side), 1/3 applied to a cylinder. If you cannot name two real down-errors, the item is not
   a rank-3 item: change the mechanism's numbers or swap the mechanism (see Slots), never invent a slip.
4. **Cover-the-question, by rank (author-computed).** Cover the stem and look at your four numbers sorted. Would
   "pick the second-smallest" or "pick the one the others are built from" get it? If your key is rank 2, the other
   three must not look built from it (rule 2 checks ratios; you check sums and differences: no option is key +/- a
   printed number, and no two distractors are key + x and key + 2x).

## How you write

Write your items as ONE JSON array in `WORK/items.json`, in slot order, adding each item as soon as it is finished.
After each item (or every few) run, from the repo root:

    node scripts/study-bank/map-v2-work/math/math-check.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-b3-work/<code>/items.json --slots scripts/study-bank/map-v2-work/math-b3/slots.json --prior /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b3/prior-math.json --families isee,ssat,map

**All three flags, every time.** Without `--slots` every item fails "not a slot" and RANK/HUB are never run; without
`--prior` and `--families ...,map` the check cannot see batch 1 or 2. Fix every `PART FAIL` until every item prints
`PART OK`. `(read)` lines are not failures: answer each one in `self_audit.note`. The check cannot see a re-skinned
mechanism; you must (rule 1 below, and rule K7).

Scratch work goes in `WORK/scratch/`. Do not create any file in the repo outside `WORK`.

## Slots

Each slot fixes grade, **tier**, the key's **rank** (and so S = rank 1, I = rank 2 or 3, L = rank 4), the
**mechanism** and, on rank 1 and 4, the **two-sided class**. You may not change grade, tier or rank.

**Every mechanism was checked against every earlier MAP Geometry chain** (v1-v5 files and banked rows, all 51 batch-1
and all 21 batch-2 Geometry items — `scripts/study-bank/map-v2-work/math-b3/EXCLUSIONS-map-geometry-b3.txt`) and
searched in the live ISEE / SSAT bank; five first-draft mechanisms were replaced because ISEE already holds them
(triangle angles in a ratio, longest rod in a box, square tiles on a floor, circle minus inscribed square, trapezoid
height from area) and three because they repeated a batch-1/2 chain (pyramid net, shape-hierarchy counts, feet-to-
cubic-inch volume). Batch 2 still lost 2 of its 6 Geometry grader drops to "template of an earlier item"
(MB2-G5-01 repeated MV2-G56-09, a scaled grid distance; MB2-G5-05 repeated MV2-G56-04, a block minus a box-shaped
cut), so run the dup search anyway and READ every hit. If after a real attempt the mechanism cannot meet the rules
in its slot, replace it with a different mechanism **of the same class and grade, appearing in no table here and in
no exclusion entry**; record it as `MECHANISM SWAP: <old> -> <new>, because <reason>` in `self_audit.note`.

**Tiers.** low = most students in that grade get it right; mid = about half; high = only stronger students, by depth
of the grade's own content (never a later grade's content or puzzle wording). A low item is still the grade's own
content. No end key (rank 1 or 4) sits at low tier: batch 1 kept 4 of 13 low-tier Geometry end keys.

`rit_band` (copy exactly): grade 5 low/mid/high `"RIT 190-199"` / `"RIT 200-209"` / `"RIT 210-219"`; grades
6 and 7 `"RIT 200-209"` / `"RIT 210-219"` / `"RIT 220-229"`; grade 8 `"RIT 210-219"` / `"RIT 220-229"` /
`"RIT 230-239"`. `difficulty`: low = `"easy"`, mid = `"medium"`, high = `"hard"`. `domain` = `"Geometry"`,
`map_area` = `"geo"`; grade 5 `area_25` = `"Geometry"` (5.MD.C items: `"Measurement and Data"`).

## End keys in Geometry (rank 1 and rank 4 slots)

Your rank-1/rank-4 slot names a class (DIFF, DIVISOR, NEGTERM). At least one distractor must come from an error in
the part that pushes the answer the OTHER way, and sit on the near side of the key (`far_distractor`).

What survived as a Geometry end key, batch 1 and 2: **two independently computed measures compared** — MB2-G5-12
(equal volumes, different bases: height difference), MB2-G6-15 (two triangles on one path), MB2-G7A-04 (one length at
two scales), MB2-G7A-09 (two angle relationships), MV2-G78-12 (cylinder minus hemisphere, where over-removal is as
natural as under-removal), MV2-G56-22 (dough minus a triangle). What died: **removal composites where every natural
error removes too little** (MB2-G5-05, MB2-G5-07, MB2-G6-06, MB2-G7B-09; batch 1 MV2-G78-09, -11, -18), **perimeters
and laps where every error undercounts** (MB2-G7B-04), a **Pythagorean length bracketed by two integers** against a
whole-number grid length (MB2-G8-04: 3 options struck), and **reflect-then-translate** (MB2-G8-10: the answer is
always +/- a coordinate plus a shift, so the errors are one-sided). The held batch-2 items are listed in the
exclusions file; do not read them as models.

## Content per grade (nothing else; off-blueprint items are dropped). No figure: describe it completely in words.

- g5 5.G (coordinate plane first quadrant, distances along grid lines, classifying two-dimensional figures by properties) and 5.MD.C (volume of right rectangular prisms, unit cubes, volumes of two non-overlapping prisms)
- g6 6.G (area of right triangles, triangles, special quadrilaterals and composite polygons; volume with fractional edge lengths; surface area from nets; polygons in the coordinate plane)
- g7 7.G (scale drawings; angle relationships: supplementary, complementary, vertical, adjacent; triangle conditions; circle area and circumference with 3.14; area, volume and surface area of composite figures)
- g8 8.G (Pythagorean theorem and its converse, in two and three dimensions; distance in the coordinate plane; volume of cylinders, cones and spheres with 3.14; angle sums and exterior angles; angles from parallel lines cut by a transversal; the effect of a dilation / translation / reflection / rotation on coordinates)

No `graphic`. Use each context family (money, recipe, sport, travel, school, building, nature, science measurement,
games) at most twice in your file.

## Item schema (every field required unless marked) — unchanged from batches 1 and 2

    {
     "id": "MB3-G7-04", "domain": "Geometry", "map_area": "geo",
     "grade_target": 7, "tier": "low"|"mid"|"high", "rit_band": "RIT 210-219", "difficulty": "easy"|"medium"|"hard",
     "ccss": "7.G.B.6", "area_25": "<grade 5 only: Geometry | Measurement and Data (5.MD.C)>",
     "subskill": "<short label, < 60 chars>",
     "grade_rationale": "<why this is a <tier> item for grade <g>: which standard, which step is the hard one, what a typical student of that grade does>",
     "prompt": "<stem; plain text; reading level of the grade; ASCII '-' for minus; units in the stem, not the options>",
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
   `node scripts/study-bank/mf30-kw.mjs /Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-math-work/dump-b3 "term&term|alt"`
   (`&` = all terms, `|` = alternation). Record them in `dup_search`. **The 709 live ISEE maths rows already hold
   the standard grade 5-8 canon**, and batches 1 and 2 (293 items) now sit beside them. A new story over the same chain of
   steps IS a duplicate — of a withdrawn batch-1 item as much as of a live one. Read
   `scripts/study-bank/map-v2-work/math-b3/EXCLUSIONS-map-geometry-b3.txt` for your grade before you start:
   every MAP Geometry item ever authored, banked or not, batches 1 and 2 included, with its outcome.
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

### K-rules: the free eliminations that killed batches 1 and 2 (compute each one; answer each in `self_audit.note`)

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
distractors sit below it and which real error puts each there?" (anti-tell rule 3); "covering the stem, does the
second-smallest or a derivation centre pick it?" (rule 4); K1-K5 each in one line; "is any distractor a solved
intermediate?"; "is this really a <tier> item for grade <g>?"; "which cheap bound strikes the most distractors, and
is it at most one?". Per rank-1/rank-4 item also: "which two parts push the answer opposite ways, and which
distractor comes from the far part?". Reply with one line per slot: id, grade, tier, key rank, class, key, quantity
asked, PART OK (or EMPTY and why, or MECHANISM SWAP and why).

## What happens next (so you know what the screen tests)

A cold screener (no access to your notes) looks for free eliminations and returns failing items to you ONCE; on a
return you either revise, withdraw with a reason, or stand with a reason. An options-only attack (three samples,
four numbers and no stem) is compared against matched live ISEE Geometry items — the instrument that held batch 2.
Two graders solve every item cold, then check key, exclusivity, free elimination, template (against batches 1 and
2 as well) and grade fit. Passing items are inserted live.

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

## Slot tables (map-v2-math-b3-slots-2026-10-26; also in slots.json). Key ranks across the batch: 8 / 8 / 8 / 8.

### Author G5 — Geometry, 5.G, 5.MD.C: grade 5 x7

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP Geometry chain) |
|---|---|---|---|---|---|---|
| MB3-G5-01 | 5 | low | 2 | I | - | box whose base rectangle is given by four grid corners (first quadrant) and a printed height: volume |
| MB3-G5-02 | 5 | low | 3 | I | - | box filled with 1-cm cubes: cubes in one layer and the box length printed: the width (5.MD.C.5a) |
| MB3-G5-03 | 5 | mid | 1 | S | DIFF | box B is k cubes longer than box A, same width and height: how many more unit cubes B holds |
| MB3-G5-04 | 5 | mid | 2 | I | - | box whose height is the grid distance between two printed points: volume |
| MB3-G5-05 | 5 | high | 3 | I | - | a cube with the same volume as a printed box: the cube's edge (64, 216, 512 by whole-number trial) |
| MB3-G5-06 | 5 | mid | 4 | L | DIFF | two rectangles given by grid corners: how much longer one perimeter is than the other |
| MB3-G5-07 | 5 | high | 4 | L | DIVISOR | how many 2-cm cubes fill a box with even edges (per-edge counting vs dividing the volume by 2) |

key ranks 1/2/3/4: 1 / 2 / 2 / 2 (end 3 of 7); tiers low 2 / mid 3 / high 2

### Author G6 — Geometry, 6.G: grade 6 x8

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP Geometry chain) |
|---|---|---|---|---|---|---|
| MB3-G6-01 | 6 | low | 2 | I | - | surface area of a cube from its net, edge a mixed number |
| MB3-G6-02 | 6 | mid | 1 | S | DIFF | a cube and a rectangular prism with the same volume: how much less surface area the cube has |
| MB3-G6-03 | 6 | mid | 4 | L | DIVISOR | prism with a fractional volume and a fractional rectangular base: its height |
| MB3-G6-04 | 6 | mid | 3 | I | - | triangle in the coordinate plane with no side on a grid line: enclosing rectangle minus three right triangles |
| MB3-G6-05 | 6 | high | 1 | S | DIVISOR | closed box: total surface area, length and width printed: the height (surface area worked backward) |
| MB3-G6-06 | 6 | high | 4 | L | NEGTERM | a rectangle in the coordinate plane and its reflection across the x-axis touch along an edge: perimeter of the combined shape |
| MB3-G6-07 | 6 | mid | 1 | S | DIFF | a vertical segment crossing the x-axis and a horizontal segment crossing the y-axis, from coordinates: how much longer one is |
| MB3-G6-08 | 6 | high | 2 | I | - | the number of 1/4-inch cubes that fill a box and two of its edges printed: the third edge |

key ranks 1/2/3/4: 3 / 2 / 1 / 2 (end 5 of 8); tiers low 1 / mid 4 / high 3

### Author G7 — Geometry, 7.G: grade 7 x9

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP Geometry chain) |
|---|---|---|---|---|---|---|
| MB3-G7-01 | 7 | low | 2 | I | - | actual area of a room from a scale drawing with a linear scale (the scale squared) |
| MB3-G7-02 | 7 | low | 3 | I | - | two complementary angles in a ratio p:q: the larger angle |
| MB3-G7-03 | 7 | mid | 1 | S | DIFF | two wheels with printed diameters: how much farther the larger rolls in one full turn |
| MB3-G7-04 | 7 | mid | 2 | I | - | volume of a right prism whose base is a trapezoid |
| MB3-G7-05 | 7 | mid | 3 | I | - | a scale drawing photocopied at a percent enlargement: actual length from a length on the copy |
| MB3-G7-06 | 7 | mid | 4 | L | DIVISOR | map distance at a ratio scale, then travel time at a printed speed (scale conversion and division by speed) |
| MB3-G7-07 | 7 | high | 1 | S | NEGTERM | three lines through one point with angle expressions: an angle found as 360 minus a sum |
| MB3-G7-08 | 7 | high | 3 | I | - | block whose cross-section is a rectangle with a half-circle cut from one side, times its length: volume |
| MB3-G7-09 | 7 | high | 4 | L | DIFF | triangular-base prism and rectangular-base prism of the same length: how much more one holds |

key ranks 1/2/3/4: 2 / 2 / 3 / 2 (end 4 of 9); tiers low 2 / mid 4 / high 3

### Author G8 — Geometry, 8.G: grade 8 x8

| id | grade | tier | key rank (1 = smallest .. 4 = largest) | pos | class | mechanism (yours alone; checked against every earlier MAP Geometry chain) |
|---|---|---|---|---|---|---|
| MB3-G8-01 | 8 | low | 2 | I | - | two parallel lines and a transversal: an angle reached from a printed angle through one vertical and one same-side interior step |
| MB3-G8-02 | 8 | mid | 1 | S | DIFF | segment between two points, then the same segment after a dilation by k about the origin: how much longer the image is |
| MB3-G8-03 | 8 | mid | 3 | I | - | sphere whose great-circle circumference is printed: its volume (3.14) |
| MB3-G8-04 | 8 | mid | 4 | L | DIVISOR | height of a cylinder from its volume and diameter (3.14) |
| MB3-G8-05 | 8 | high | 1 | S | DIVISOR | radius of a cone from its volume and height (3.14; the 1/3 and the diameter errors fall both ways) |
| MB3-G8-06 | 8 | high | 4 | L | DIFF | a cone and a cylinder with the same volume and the same radius: how much taller the cone is |
| MB3-G8-07 | 8 | high | 2 | I | - | perimeter of a triangle in the xy-plane with one side off the grid lines (one Pythagorean side) |
| MB3-G8-08 | 8 | mid | 3 | I | - | box whose base is a rectangle with a printed diagonal and one printed side, and a printed height: volume (Pythagoras, then volume) |

key ranks 1/2/3/4: 2 / 2 / 2 / 2 (end 4 of 8); tiers low 1 / mid 4 / high 3

