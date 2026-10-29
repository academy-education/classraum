# map-v2 Math batch 8 (Number Systems only) — writable mechanisms for an independent chain check

Step 1 of 2, 2026-10-30. **No slot, brief or prereg exists yet; nothing here is approved.** MAP Math is capped at 5
forms by Real and Complex Number Systems (51 live, all live, 0 staged; ~10 per form, +9 needed for form 6). Batch 7
yielded one writable item (MB7-N7-01, D33) because 9 of its 10 NEW-or-least-shared chains failed the construction
rules. This round reverses the order: **feasibility was run before this list**, so every mechanism below has at least
one parameter set where the key and three natural errors pass FORM / LONE / HUB / RUN / PAIR / KEYPRINT / DPAIR / DSUM
(`FEASIBILITY.md`). Format follows `../math-b7/MECHANISMS.md`.

**The earlier list** is `earlier-N-chains.json`: **374 entries** = batch 7's 294 (every MAP Number Systems item in the
batch files and work folders, batches 1-5, and every DB row) + batch 7's two written items (MB7-N7-01, kept on disk;
MB7-N6-01, dropped as a near-duplicate of ISEE 5d6f2a16) + **batch 7's 40 checked mechanisms (D01-D40, each with the
checker's verdict)** + **batch 7's 38 probe-dropped drafts**, so a re-proposal collides in the probe. Built by
`collect.mjs` (read-only; it re-read the DB: 51 Number Systems rows, all live, none unmatched by a file entry).

**What was dropped before this list.** 50 drafted (`candidates.json`: g5 13, g6 12, g7 17, g8 8). `probe.mjs` ran
138 `mf30-kw.mjs` queries over `dump-b6` (3,986 live ISEE/SSAT/SAT/ACT + 2,517 prior rows; it refuses if the dump
header does not report those counts) plus a regex over the 374 earlier entries; every hit was read. **14 dropped for a
collision** (`DROPPED.md`): tiered pricing (ACT 05ec1073, SAT 2ca82d13, ACT 743310f5), grid-line paths (MAP Geometry
MMG-G04, MM3-G03, MV2-G56-10), climb-and-slip cycles (ISEE 01199b13), time zones (ISEE 1150b4e2), pooled sharing
(MMG-D04), (x - p)^2 = q (SAT 34ca9c91), x^2 + c = d negative root (MB5-N8-01), cube root of a product (MV2-N8-19),
digit reversal (ISEE 39f67f4e, SSAT e92f6fea), same volume as a cube (MB3-G6-02), and a b7 benchmark re-proposal
(B7-D08). **19 more were not writable** (`FEASIBILITY.md`, 13 of them FORM).

**This list holds only the 17 writable, probe-clean mechanisms.** Grade spread: g5 4, g6 2, g7 10, g8 1.

**Families within this batch** (pairs that share a chain or an ask; slot at most one of each):
- R (repair a total after an entry error): E03 (Q07), E10 (Q20)
- M (magic square): E04 (Q50), E12 (Q23)
- I (interval overlap): E05 (Q14), E11 (Q22)
- F (number-line fold): E06 (Q47), E15 (Q26)
- Z (closest to 0): E08 (Q17), E16 (Q27)

Counting one per family, that is 12 distinct mechanisms (13 if Q17 and Q27 are judged different chains).

**No novelty rating is given.** Batch 7's ratings were the author's own check, which is what failed in batch 4. The
"pointers" in each block list what the probe surfaced and nearby items I noticed while drafting; they are not a
verdict, and the checker should search `earlier-N-chains.json` and `dump-b6` itself.

**Clusters fenced before drafting** (batch 4-7 briefs and checker rounds): single quotients, rounded-value asks,
scientific notation, single roots or powers as end keys, .5 x .5 products, the live signed add/subtract chains,
place-value x10 shifts (HUB), GCF/LCM counts (HUB), decimal roots (FORM), repeating decimals and nth digits, root
bracketing, exponent-law evaluation, the eight batch-5 slots (C06, C11, C25, R06, R08, R18, R27, R30), batch 7's
D01-D40, and count or whole-number keys under ~20 (`../math-b7/FEASIBILITY.md`).

**Area risks to check:** E04/E12 (magic squares may read as Operations and Algebraic Thinking), E02 (fraction of a set
may read as 6.RP), E17 (an equation, 8.EE.A.2; in-area by the MMG-N15 precedent).


## E01 — grade 5, 5.NBT.A.3a

**Ask:** a number given in non-standard place-value units (a ones, t tenths and h hundredths with t and h above 9, u thousandths): its standard decimal

**Chain:** convert each unit count to a decimal (14 tenths = 1.4, 25 hundredths = 0.25) -> add the parts, regrouping into the next place -> standard decimal

**Twist (what makes it non-routine):** unit counts above 9 must be regrouped across places; the no-regroup reading (one digit per place) is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): B7-D09 (b7 mechanism, BORDERLINE: expanded form with fractional place values, next to MV2-N56-08 LIVE, which reads 10^3/10^2/10^1 and combines); MM3-N05, MM5-N01 (carry hundredths into tenths). kw: 0 hits.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `tenths.*hundredths|hundredths.*tenths|expanded form|place value`): `1[0-9] tenths\|twelve tenths\|fourteen tenths\|[2-9][0-9] hundredths` ; `tenths & hundredths & thousandths & ones` ; `ones & tenths & hundredths & (standard form\|what number\|decimal)`

**Feasibility** (`gen8.mjs Q01`, 19683 parameter sets, key ranks reachable 4): 2.211 (key); 1.111 (one digit per place, no regrouping); 2.111 (regroups the tenths only); 1.211 (regroups the hundredths only). Parameters {"ones":1,"tenths":11,"hundredths":11,"thousandths":1}.

**Family within this batch:** none

**Note:** Key is always the greatest option (rank 4 only).

<!-- draft id Q01 -->

## E02 — grade 5, 5.NF.B.3

**Ask:** a bag holds n marbles, r of them red; k more red marbles are added: the fraction of the marbles that are red now

**Chain:** new red count r + k -> new total n + k -> fraction (r + k)/(n + k) in lowest terms

**Twist (what makes it non-routine):** both numerator and denominator change; adding k to the numerator only is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: no chain hit (regex matched only unrelated wording).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `fraction of the .* now|are added`): `(more\|additional) & (added\|put in) & what fraction` ; `fraction of the (marbles\|beads\|cards\|students) (are\|is) now` ; `(red\|blue\|green) & (added\|more) & fraction & (now\|after)`

**Feasibility** (`gen8.mjs Q04`, 9108 parameter sets, key ranks reachable 3, 4): 7/17 (key); 5/17 (added marbles over new total); 2/17 (old red over new total); 10/17 (fraction NOT red now). Parameters {"n":12,"r":2,"k":5}.

**Family within this batch:** none

**Note:** May be read as 6.RP (ratio of a set) rather than 5.NF; the checker should say.

<!-- draft id Q04 -->

## E03 — grade 5, 5.NBT.B.7

**Ask:** a total of several decimals was computed with one entry typed one place off (4.5 instead of 0.45): the correct total

**Chain:** the shown total includes the wrong entry -> subtract the wrong entry -> add the intended entry

**Twist (what makes it non-routine):** repairing a total for a decimal-point entry error, a remove-then-replace step, not a fresh sum

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0 hits. Nearest by operation: MMG-N10 (undo a net change).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `instead of|typed|entered|mistake`): `instead of & (typed\|entered\|wrote\|recorded) & total` ; `(mistake\|by mistake\|accidentally) & decimal point & total` ; `decimal point & (wrong\|misplaced\|forgot\|left out)`

**Feasibility** (`gen8.mjs Q07`, 28998 parameter sets, key ranks reachable 2): 13.65 (key); 14.85 (subtracts the intended entry); 16.35 (adds the wrong entry again); 13.35 (subtracts both entries). Parameters {"shown":15,"typed":"1.5","meant":"0.15"}.

**Family within this batch:** R (repair a total after an entry error): Q07, Q20

**Note:** Rank 2 only.

<!-- draft id Q07 -->

## E04 — grade 5, 5.NF.A.1

**Ask:** a 3-by-3 square of mixed numbers in sevenths in which every row, column and diagonal has the same sum, with two entries missing: one missing entry

**Chain:** find the common sum from a complete line -> a line with one gap gives the first missing entry by subtraction -> a line through it and the target gives the target

**Twist (what makes it non-routine):** two chained missing addends in a magic square; the target cannot be found from its own row first

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw "magic square": 0 hits in 6,503 rows; earlier: 0. Each step is a missing addend (batch-5 R01 BORDERLINE, MM4-N24 stage0).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `magic square|same sum`): `magic square` ; `(each\|every) row & column & same sum` ; `magic`

**Feasibility** (`gen8.mjs Q50`, 2320 parameter sets, key ranks reachable 1, 2): 6/7 (key); 2 1/7 (gives the first-step entry); 5 1/7 (adds the first-step entry instead of subtracting); 1 4/7 (uses the column through the target with its gap as 0). Parameters {"square":[["6/7","15/7","3/7"],["5/7","8/7","11/7"],["13/7","1/7","10/7"]],"sum":"24/7"}.

**Family within this batch:** M (magic square): Q50, Q23

**Note:** Area risk: a magic square may be read as Operations and Algebraic Thinking.

<!-- draft id Q50 -->

## E05 — grade 6, 6.NS.C.7

**Ask:** two intervals on a number line, each from a negative decimal to a positive decimal: the length of the part where they overlap

**Chain:** the overlap starts at the greater left end and stops at the lesser right end -> its length is the distance between those (across 0 if needed)

**Twist (what makes it non-routine):** interval intersection on a signed number line; the union length or the difference of lengths is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0 chain hits. The final step is a distance across 0 (MV2-N7-03 LIVE, MM4-N16).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `overlap|in common`): `overlap & number line` ; `(both\|each) (interval\|segment\|range) & (overlap\|in common\|shared)` ; `interval\|range & both & number line`

**Feasibility** (`gen8.mjs Q14`, 175743 parameter sets, key ranks reachable 1, 2, 3): 9.55 (key); 10.65 (union length); 9.65 (length of the first interval); 10.55 (length of the second interval). Parameters {"first":["-5.9","3.75"],"second":["-5.8","4.75"]}.

**Family within this batch:** I (interval overlap): Q14, Q22

<!-- draft id Q14 -->

## E06 — grade 6, 6.NS.C.6

**Ask:** a number line is folded so that point a lands on point b: where the point c lands

**Chain:** the crease is the point halfway between a and b -> c lands as far beyond the crease as it was before it -> image = a + b - c

**Twist (what makes it non-routine):** folding as reflection about a non-zero point found from two given points

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 fold hits. Near: MV2-N56-23 (halfway, then the opposite), b7 draft K35 (midpoint used backward, dropped: ISEE 7f018ffc, ACT 9513dc73), batch-5 C05 (distance to x = a), MAP Geometry MV2-G78-24 (reflections).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `fold`): `fold & number line` ; `(folded\|fold) & lands on` ; `crease\|folded`

**Feasibility** (`gen8.mjs Q47`, 49000 parameter sets, key ranks reachable 1, 2, 3, 4): -4.4 (key); -0.4 (reflects about 0); 6.4 (translates by b - a instead of reflecting); 2.4 (distance from the crease). Parameters {"a":-5,"b":1,"c":"0.4"}.

**Family within this batch:** F (number-line fold): Q47, Q26

<!-- draft id Q47 -->

## E07 — grade 7, 7.NS.A.2c

**Ask:** from a printed set of signed fractions, the least product of two different numbers

**Chain:** the least product is negative: pair the number greatest in size of one sign with the number greatest in size of the other -> multiply, applying the sign rule

**Twist (what makes it non-routine):** optimising a product over a signed set; multiplying the two least numbers (both negative, a positive product) is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits on "least product"; earlier: 0. Near: batch-5 C06 / MB5-N6-01 (rank by absolute value, add the two largest; slotted), C11 / MB5-N7-01 (sign by counting negatives).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `least product|smallest product`): `(least\|smallest) (possible )?product & two` ; `product of two & (least\|smallest) & negative` ; `(least\|smallest\|greatest\|largest) possible (product\|quotient\|value)`

**Feasibility** (`gen8.mjs Q16d`, 3540 parameter sets, key ranks reachable 1): -63.75 (key); 63.75 (two least numbers); 48.75 (two smallest in size); -48.75 (two greatest numbers). Parameters {"set":["-8.5","-7.5","-6.5","7.5"]}.

**Family within this batch:** none

**Note:** Write with signed x.5 decimals (generator Q16d): every product ends in 25 or 75. The sevenths version passes only on mirrored sets with /49 mixed numbers. Rank 1 by definition.

<!-- draft id Q16 -->

## E08 — grade 7, 7.NS.A.1d

**Ask:** a table of monthly signed changes: the two consecutive months whose combined change is closest to zero, and that combined change

**Chain:** add each pair of consecutive signed changes -> compare the sizes of the sums -> report the sum with the least size, keeping its sign

**Twist (what makes it non-routine):** a closest-to-zero search over signed pair sums; picking the single change closest to zero is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits on "closest to zero"; earlier: 0. Near: b7 D26 (REPEAT: greatest change between consecutive readings, SSAT 632f5043, ISEE f31d1f72), b7 family B (D08/D15/D25, distance from a benchmark).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `closest to zero|closest to 0`): `consecutive & (combined\|together\|total) & closest to (0\|zero)` ; `two (months\|days\|weeks) & closest to zero` ; `closest to (0\|zero)`

**Feasibility** (`gen8.mjs Q17`, 28371 parameter sets, key ranks reachable 2, 3): -1.15 (key); -4.75 (second-closest pair); 1.15 (drops the sign of the sum); 8.85 (greatest combined change). Parameters {"changes":["6.67","-1.02","9.87","-4.02","2.87","-7.62"]}.

**Family within this batch:** Z (closest to 0): Q17, Q27

**Note:** Positives must end in 7 and negatives in 2 (or any fixed pair) so every adjacent sum shares its last digit.

<!-- draft id Q17 -->

## E09 — grade 7, 7.NS.A.2c

**Ask:** the product (-1/2)(-2/3)(-3/4)...(-(n-1)/n): its value

**Chain:** count the negative factors for the sign -> cancel each numerator with the previous denominator -> plus or minus 1/n

**Twist (what makes it non-routine):** telescoping cancellation combined with a sign decided by the count of negative factors

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 9 hits, all products of equation roots (ACT 2314a9de, ISEE 7d1c0baf, ...), none telescoping; earlier: 0. Near: batch-5 C11 / MB5-N7-01 (count negatives for the sign, pair factors into whole products).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `telescop|-1/2.*-2/3`): `\(-1/2\) ?\(-2/3\)\|-1/2 & -2/3 & -3/4` ; `product & -\d/\d & -\d/\d & -\d/\d & -\d/\d` ; `2/3 & 3/4 & 4/5 & 5/6`

**Feasibility** (`gen8.mjs Q18`, 70 parameter sets, key ranks reachable 2, 3): -2/19 (key); 2/19 (wrong sign); -18/19 (last factor only, with the sign); 12/19 (first times last). Parameters {"from":"-2/3","to":"-18/19","factors":17}.

**Family within this batch:** none

<!-- draft id Q18 -->

## E10 — grade 7, 7.NS.A.3

**Ask:** a signed running total was computed with one change entered with the wrong sign: the correct total

**Chain:** the wrong sign moved the total by twice the change -> subtract (or add) twice the change -> correct total

**Twist (what makes it non-routine):** repairing a signed sum: removing the wrong entry AND adding the right one shifts by twice its size

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0. Near: batch-5 R08 / MB5-N7-02 (x - (-x) = 2x, slotted), MMG-N10 (undo a net change).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `wrong sign|should have been|instead of`): `wrong sign\|(should have been\|instead of) (negative\|positive\|-)` ; `(recorded\|entered\|wrote) & (as a gain\|as positive\|instead of) & total` ; `sign & (error\|mistake\|wrong) & total`

**Feasibility** (`gen8.mjs Q20`, 1352 parameter sets, key ranks reachable 1, 2): -9 1/7 (key); 4/7 (moves the wrong way by twice); -1 6/7 (adds the change once); 4 2/7 (flips the sign of the shown total). Parameters {"shown":"-30/7","change":"+17/7 should be -17/7"}.

**Family within this batch:** R: Q07, Q20

<!-- draft id Q20 -->

## E11 — grade 7, 7.NS.A.1c

**Ask:** two intervals on a number line with signed mixed-number ends (one from a negative to a positive, one fully to one side or across 0): the length of their overlap

**Chain:** overlap runs from the greater left end to the lesser right end -> subtract the signed ends (across 0 when they have opposite signs)

**Twist (what makes it non-routine):** interval intersection with signed rational ends; union length or difference of lengths is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): as Q14.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `overlap|in common`): `overlap & number line` ; `(intervals\|segments) & overlap` ; `interval\|range & both & number line`

**Feasibility** (`gen8.mjs Q22`, 27032 parameter sets, key ranks reachable 1, 2, 3): 5 1/7 (key); 6 2/7 (union length); 5 2/7 (length of the first interval); 6 1/7 (length of the second interval). Parameters {"first":["-4 6/7","3/7"],"second":["-4 5/7","1 3/7"]}.

**Family within this batch:** I: Q14, Q22

<!-- draft id Q22 -->

## E12 — grade 7, 7.NS.A.1d

**Ask:** a 3-by-3 magic square of signed fractions (sevenths) with the common sum printed and three entries missing: one missing entry that needs two steps

**Chain:** a line with one gap gives a first missing entry by subtracting a signed sum from the magic sum -> a line through that entry and the target then has one gap -> subtract again

**Twist (what makes it non-routine):** chained missing signed addends; the target cannot be read from its own line

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): as Q50.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `magic square|same sum`): `magic square` ; `(each\|every) row & column & (same\|equal) sum` ; `magic`

**Feasibility** (`gen8.mjs Q23`, 2240 parameter sets, key ranks reachable 1, 2, 3, 4): -2 3/7 (key); -2/7 (gives the first-step entry); -2 1/7 (sign slip on the last step); -5/7 (uses the column through the target with its gap as 0). Parameters {"square":[["-17/7","-2/7","1/7"],["12/7","-6/7","-24/7"],["-13/7","-10/7","5/7"]],"sum":"-18/7"}.

**Family within this batch:** M: Q50, Q23

**Note:** Area risk as Q50.

<!-- draft id Q23 -->

## E13 — grade 7, 7.NS.A.3

**Ask:** a scale reads a signed amount (e.g. -0.4 kg) when empty; it shows readings for n items weighed one at a time: their true total

**Chain:** each reading includes the offset -> the true total is the sum of the readings minus n x offset (subtracting a negative adds) -> total

**Twist (what makes it non-routine):** a zero-offset correction applied once per reading; correcting once for the whole total is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits ("when empty", "zero error", "scale & empty"); earlier: 0. The arithmetic is a signed sum (saturated family); the per-reading correction is the new step.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `when empty|zero error|offset|too low|too high`): `(reads\|shows) & when (empty\|nothing)\|zero error` ; `scale & (too low\|too high\|off by) & true` ; `scale & (empty\|zero) & (kg\|pound\|gram)`

**Feasibility** (`gen8.mjs Q24`, 31500 parameter sets, key ranks reachable 1, 4): 11.58 (key); 12.78 (ignores the offset); 12.48 (corrects once for the whole total); 13.08 (corrects the wrong way once). Parameters {"offset":"0.3","readings":["6.18","3.55","1.71","1.34"]}.

**Family within this batch:** none

**Note:** Offset must have no hundredths digit (e.g. -0.4, +0.3) so every error keeps the key's last digit.

<!-- draft id Q24 -->

## E14 — grade 7, 7.NS.A.2c

**Ask:** a student divided by a signed fraction when the problem said to multiply by it, and got R: the correct answer

**Chain:** undo the division: multiply R by the fraction to recover the original number -> multiply again by the fraction -> R x fraction^2

**Twist (what makes it non-routine):** undoing a wrong signed operation before doing the right one; multiplying R once is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits ("instead of multiplying/dividing"); earlier: 0. Near: batch-5 R19 (÷ n equals × 0.4), the missing-operand family M (R12/R16/R22/R30), MB5-N7-03.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `instead of|mistake`): `(divided\|multiplied) instead of (multiplied\|divided)` ; `(by mistake\|mistakenly) & (divided\|multiplied) & (should\|correct)` ; `instead of (multiplying\|dividing)`

**Feasibility** (`gen8.mjs Q25`, 16100 parameter sets, key ranks reachable 1, 2, 3, 4): -7 5/7 (key); 5 1/7 (multiplies R by f once (recovers the original number)); -3 3/7 (reports R); 7 5/7 (sign slip on f^2). Parameters {"f":"-3/2","R":"-24/7"}.

**Family within this batch:** none

**Note:** f must not share a factor with R's denominator (f = -3/2 with R in sevenths works).

<!-- draft id Q25 -->

## E15 — grade 7, 7.NS.A.1c

**Ask:** a number line is folded so that a negative mixed number lands on a positive one: where another signed point lands

**Chain:** the crease is the point halfway between the two -> the image of c is a + b - c -> evaluate with signed fractions

**Twist (what makes it non-routine):** a reflection about a non-zero, possibly non-integer, crease found from two signed points

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): as Q47.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `fold`): `fold & number line` ; `(folded\|fold) & lands on` ; `crease\|folded`

**Feasibility** (`gen8.mjs Q26`, 10440 parameter sets, key ranks reachable 1, 2, 3, 4): -3 2/7 (key); 1 2/7 (reflects about 0); 3 6/7 (translates by b - a instead of reflecting); -2 2/7 (gives the crease). Parameters {"a":"-4 6/7","b":"2/7","c":"-1 2/7"}.

**Family within this batch:** F: Q47, Q26

<!-- draft id Q26 -->

## E16 — grade 7, 7.NS.A.1d

**Ask:** plus or minus signs placed before each of three signed mixed numbers to make the value as close to 0 as possible: that value

**Chain:** compare the sizes: the largest against the other two -> choose signs so the sum is nearest 0 -> evaluate, keeping the sign

**Twist (what makes it non-routine):** a sign-choice optimisation toward 0; using all plus signs or all minus signs is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier regex hits (46) are the word "sign" in signed-sum chains, none a sign-choice optimisation.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `closest to zero|close to 0|sign`): `(plus\|\+) or (minus\|-) sign & closest to (0\|zero)` ; `(signs\|sign) & (each\|between) & as close to (0\|zero)` ; `closest to (0\|zero)`

**Feasibility** (`gen8.mjs Q27`, 1961 parameter sets, key ranks reachable 2, 3): -5/7 (key); 5 4/7 (all plus); -3 2/7 (plus then minuses); 5/7 (drops the sign of the result). Parameters {"numbers":["8/7","9/7","22/7"]}.

**Family within this batch:** Z: Q17, Q27

**Note:** Fix the first sign as + so the answer is unique.

<!-- draft id Q27 -->

## E17 — grade 8, 8.EE.A.2

**Ask:** x^3 + c = d with c and d fractions over a cube denominator: the value of x

**Chain:** subtract c from d (signed fractions) to isolate x^3 -> cube root of a negative fraction (numerator and denominator separately) -> x

**Twist (what makes it non-routine):** isolating the cube before the cube root; adding c instead of subtracting leads to another perfect cube, the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: MMG-N15 (prior MAP: x^3 = -0.216, then subtract a square root) and MM4-N39 solve x^3 = p directly with no isolation step; ACT c58b6e45 is a different cube-root equation. Near: MB5-N8-01 (LIVE, negative root after a reciprocal), batch-5 C21 (cube root then substitute).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `x\^3 \+|x³ \+|cube root of a negative`): `x\^3 ?\+\|x³ ?\+ & =` ; `cube root & (343\|125\|27\|64)` ; `x\^3 ?= ?-\|x³ ?= ?-\|x\^3 ?= ?\d+/`

**Feasibility** (`gen8.mjs Q31`, 120 parameter sets, key ranks reachable 1, 2): -1 2/3 (key); -1/3 (adds c instead of subtracting); 1 2/3 (drops the sign); 1/3 (adds c and drops the sign). Parameters {"equation":"x^3 + 62/27 = -63/27"}.

**Family within this batch:** none

**Note:** Exactly three natural errors exist (adds c; drops the sign; both). In-area by precedent: MMG-N15 is a MAP Number Systems item.

<!-- draft id Q31 -->
