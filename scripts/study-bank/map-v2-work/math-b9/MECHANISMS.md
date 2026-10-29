# map-v2 Math batch 9 (Number Systems only) — writable mechanisms for an independent chain check

Step 1 of 2, 2026-10-30. **No slot, brief or prereg exists yet; nothing here is approved.** MAP Math needs +9 Number
Systems items for a sixth form; the pool holds 6 (b8's five PART OK items, all grade 6-7, plus MB7-N7-01). Grades 5
and 8 are empty, so this round aimed there. As in batch 8, **feasibility was run before this list**, so every
mechanism below has at least one parameter set where the key and three natural errors pass FORM / LONE / HUB / RUN /
PAIR / KEYPRINT / DPAIR / DSUM **and the batch-9 refusals** (`FEASIBILITY.md`): SIGN (every option shares the key's
sign), KGAP (the key is not n x a key-option gap for a printed n), DIR (under a least/greatest stem the key is not the
extreme option), NEAR (closest-to-T stems; unused here) and RANGE (a bound readable off the stem strikes at most one
distractor; batch 8 did not model the bound screen and lost E09 and E17 to it). Format follows `../math-b8/MECHANISMS.md`.

**The earlier list** is `earlier-N-chains.json`: **431 entries** = batch 8's 374 (every earlier MAP Number Systems
item, batch 7's items, 40 mechanisms and 38 dropped drafts) + **batch 8's 7 written items** (MB8-N7-01/02/03/05 and
MB8-N6-01 kept; MB8-N7-04 and MB8-N8-01 dropped) + **batch 8's 17 checked mechanisms (B8-E01..E17, each with the
checker's verdict)** + **batch 8's 33 other drafts** (14 probe-dropped, 19 not writable), so a re-proposal collides in
the probe. Built by `collect.mjs` (read-only; it re-read the DB: 51 Number Systems rows, all live, none unmatched).

**What was dropped before this list.** 51 drafted (`candidates.json`: g5 18, g6 13, g7 1, g8 19). `probe.mjs`
ran 153 `mf30-kw.mjs` queries (3 per draft) over `dump-b6` (3,986 live ISEE/SSAT/SAT/ACT + 2,517 prior rows; it refuses if the dump
header does not report those counts) plus a regex over the 431 earlier entries; every hit was read. **15 dropped for a
collision or a binding earlier verdict** (`DROPPED.md`). **23 more were not writable** (`FEASIBILITY.md`).

**This list holds only the 13 writable, probe-clean mechanisms.** Grade spread: g5 6, g6 3, g7 1, g8 3.

**Families within this batch** (share a chain; slot at most one of each):
- W (fraction of a whole made of parts with different fractions): F01 (S02), F02 (S47)
- R (extreme of a running total): F04 (S15), F05 (S48), F10 (S21)
- P (walk around a rectangle on the coordinate plane): F08 (S16), F09 (S49)
- C (classify rational / irrational, then compute with the rationals): F11 (S33), F12 (S51)
- F06 (S43) and F13 (S55) share only an ask shape ("keep the ones that pass a test, then add"); their tests differ
  (benchmark comparison vs evaluating zero and negative powers).

Counting one per family, that is **8 distinct mechanisms**: g5 4 (W, F03, R, F06), g6 2 (F07, P), g8 2 (C, F13); R
also covers g7 through F10.

**No novelty rating is given.** The "pointers" in each block list what the probe surfaced and nearby items I noticed
while drafting; they are not a verdict, and the checker should search `earlier-N-chains.json` and `dump-b6` itself.

**Clusters fenced before drafting** (batch 4-8 briefs and checker rounds): single quotients, rounded-value asks,
scientific notation (all three b9 sci-notation drafts collided with MM2-N16 / MM2-N18 and were dropped), single roots or
powers as end keys, .5 x .5 products, the live signed add/subtract chains, place-value x10 shifts (HUB), GCF/LCM counts
(HUB), decimal roots (FORM), repeating-decimal conversion (four b9 drafts dropped as batch-5 C17 / R25 or MV2-N8-14
re-proposals), nth digits, root bracketing, exponent-law evaluation, the eight batch-5 slots, batch 7's D01-D40, batch
8's E01-E17 and its dropped drafts, and count or whole-number keys under ~20.

**Area risks to check:** F01/F02 (weighted fraction of a whole may read as 6.RP / 7.SP), F03 (inclusion-exclusion may
read as 7.SP), F13 (zero/negative exponent evaluation, a fenced cluster), F08/F09 (a walk on the coordinate plane is
6.NS.C.8 but may read as Geometry).


## F01 — grade 5, 5.NF.B.6

**Ask:** g/h of a class are girls; p/q of the girls and r/s of the boys walk to school: the fraction of the whole class that walks

**Chain:** girls who walk = g/h x p/q -> boys are 1 - g/h, boys who walk = (1 - g/h) x r/s -> add the two products over a common denominator

**Twist (what makes it non-routine):** each walking fraction is of a different part; using r/s of the class (or g/h for the boys too) is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0. Near: B8-E02 (fraction of a set after a change; b8 checker: wrong area, 6.RP), MMG-N04 / MM4-N05 (a fraction of a remainder).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `of the girls|of the boys|fraction of the class`): `(girls\|boys) & walk & fraction of (the\|all)` ; `of the girls & of the boys & fraction` ; `(3/4\|2/3\|1/2\|2/5) of the (girls\|boys)`

**Feasibility** (`gen9.mjs S02`, 8820 parameter sets, key ranks reachable 1, 2, 3, 4): 16/45 (key); 19/45 (uses r/s of the whole class for the boys); 29/45 (fraction that does NOT walk); 23/45 (swaps the two walking fractions). Parameters {"girls":"1/3","girlsWalk":"2/3","boysWalk":"1/5"}.

**Family within this batch:** W (fraction of a whole made of parts with different fractions): S02, S47

**Note:** Area risk: a weighted part-of-part fraction may read as 6.RP or 7.SP rather than 5.NF.B.6. The weighted-average range [min rate, max rate] was modelled as a bound.

<!-- draft id S02 -->

## F02 — grade 5, 5.NF.B.6

**Ask:** a school's students are split into three grades by fractions; a different fraction of each grade rides the bus: the fraction of all the students who ride

**Chain:** third grade's share = 1 - the other two -> each grade's riders = grade fraction x its riding fraction -> add the three products

**Twist (what makes it non-routine):** each riding fraction is of a different part; the third share must be found first

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0. As S02, with the third part found by subtraction first.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `ride the bus|of the .*graders`): `(of the\|of all) (students\|children) & (ride\|take) the bus & fraction` ; `(fourth\|fifth\|sixth) (grade\|graders) & (ride\|walk) & fraction of (all\|the)` ; `of the (fourth\|fifth\|sixth) graders & fraction`

**Feasibility** (`gen9.mjs S47`, 51480 parameter sets, key ranks reachable 1, 2, 3, 4): 37/80 (key); 61/80 (uses the third riding fraction of the whole school); 43/80 (fraction that does NOT ride); 41/80 (uses the first grade's riding fraction for the third grade). Parameters {"grades":["1/2","1/4","rest"],"ride":["3/5","1/4","2/5"]}.

**Family within this batch:** W: S02, S47

**Note:** Area risk as S02.

<!-- draft id S47 -->

## F03 — grade 5, 5.NF.B.4b

**Ask:** a unit square has a vertical strip a wide and a horizontal strip b tall shaded (fractions): the area shaded by EXACTLY one strip

**Chain:** overlap = a x b (fraction x fraction area) -> area covered at least once = a + b - ab -> exactly once = a + b - 2ab

**Twist (what makes it non-routine):** the overlap is removed twice: once because it is counted twice, once because it is shaded by both

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier regex hits are interval overlaps (B8-E05/E11, REPEAT; a different operation). Near: SSAT e3f3f363 (live: the lawn NOT covered by two crossing paths); its twin S12 ("not shaded") was dropped for it. S10 asks for "exactly one", which removes the overlap twice.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `overlap|strip|exactly one`): `(strip\|band\|stripe) & (overlap\|both) & (area\|square)` ; `shaded by (exactly\|only) one` ; `(overlap\|overlapping) & (fraction\|area) & (square\|rectangle) & (shaded\|painted)`

**Feasibility** (`gen9.mjs S10`, 729 parameter sets, key ranks reachable 2, 3): 23/81 (key); 79/81 (shaded at least once (removes the overlap once)); 56/81 (shaded by both (the overlap)); 2/81 (not shaded). Parameters {"a":"7/9","b":"8/9"}.

**Family within this batch:** none

**Note:** Writable only with fraction strips (ninths gave 81sts; thirds and ninths gave 27ths). Area: 5.NF.B.4b area model; inclusion-exclusion may read as 7.SP.

<!-- draft id S10 -->

## F04 — grade 5, 5.NBT.B.7

**Ask:** an account starts at a decimal balance; five deposits and withdrawals follow: the lowest balance at any time during the week

**Chain:** running balance after each transaction (decimal add/subtract) -> compare the running balances -> the least

**Twist (what makes it non-routine):** the question is about an intermediate state, not the end; the final balance and start-minus-all-withdrawals are the natural errors

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits ("lowest balance", "running balance", "least ... during"); earlier: B7-D31 (BORDERLINE: cumulative signed sums, first crossing), B8-E10.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `lowest balance|running (balance|total)|least .* during`): `lowest balance` ; `(least\|smallest\|lowest) (amount\|balance) & (during\|at any time\|any point)` ; `running (balance\|total)`

**Feasibility** (`gen9.mjs S15`, 35519 parameter sets, key ranks reachable 2, 3): 47.89 (key); 70.89 (final balance); 38.69 (start minus all the withdrawals); 59.49 (second-lowest balance). Parameters {"start":"58.49","transactions":["-10.6",16,"-4.4","16.2","-4.8"]}.

**Family within this batch:** R (extreme of a running total): S15, S48, S21

**Note:** Transactions carry no hundredths, so every running balance keeps the start's hundredths digit. Stem asks for the least: an error below the key is required (DIR), and "start minus all the withdrawals" supplies it.

<!-- draft id S15 -->

## F05 — grade 5, 5.NF.A.2

**Ask:** a tank's water level starts at a mixed number of feet and changes by five rises and drops in mixed numbers with unlike denominators: the lowest level during the day

**Chain:** running level after each change (unlike-denominator add/subtract, eighths) -> compare -> least

**Twist (what makes it non-routine):** the lowest point is an intermediate level, not the end; start-minus-all-drops and the final level are the natural errors

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): as S15.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `lowest|least .*during`): `lowest (level\|point\|depth) & (during\|any time)` ; `(water level\|level) & (rose\|rises\|fell\|drops) & lowest` ; `(tank\|pond\|lake) & level & (1/2\|1/4\|3/8\|5/8\|3/4) & (lowest\|least)`

**Feasibility** (`gen9.mjs S48`, 31804 parameter sets, key ranks reachable 2, 3): 8.125 (key); 10.125 (final level); 5.625 (start minus all the drops); 8.625 (second-lowest level). Parameters {"start":9,"changes":["-0.375","1.75","-2.25","2.75","-0.75"]}.

**Family within this batch:** R: S15, S48, S21

**Note:** Eighths (terminating, so options print as 3-place decimals or as mixed numbers in eighths).

<!-- draft id S48 -->

## F06 — grade 5, 5.NF.A.2

**Ask:** five fractions with denominators 3, 4, 6 and 12 (one of them equal to 1/2): the sum of the ones GREATER than 1/2

**Chain:** compare each fraction with the benchmark 1/2 (rename or compare numerator with half the denominator) -> keep those strictly greater -> add them over twelfths

**Twist (what makes it non-routine):** the fraction equal to 1/2 must be left out, and the sum of the kept ones is the answer, not their count

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: B7-D04 (BORDERLINE: count decimals above a fraction benchmark), B7-D08 / B7-D15 (distance from a benchmark), batch-5 family K / C06 (select, then add).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `greater than 1/2|benchmark`): `greater than 1/2 & (sum\|add\|total)` ; `(add\|sum) (of )?(all )?(the )?(fractions\|numbers) (that are )?(greater\|more\|less) than` ; `(benchmark\|half) & (fractions\|numbers) & (sum\|add)`

**Feasibility** (`gen9.mjs S43`, 450 parameter sets, key ranks reachable 2, 3): 1 7/12 (key); 2 1/12 (includes the fraction equal to 1/2); 11/12 (leaves out the kept fraction nearest 1/2); 1 11/12 (keeps the left-out fraction nearest 1/2 as well). Parameters {"list":["2/4","1/3","2/3","1/4","11/12"]}.

**Family within this batch:** none (shares only the "keep those meeting a test, then add" ask shape with S55)

**Note:** One listed fraction equals 1/2 (2/4, 3/6 or 6/12) and must be left out.

<!-- draft id S43 -->

## F07 — grade 6, 6.NS.C.7

**Ask:** four signed points on a number line (mixed numbers): the least possible total distance from one point to all four

**Chain:** any point between the two middle points gives the least total -> total = (greatest - least) + (third - second)

**Twist (what makes it non-routine):** with four points the best place is a whole interval; distances across 0 add

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits ("least total distance", "meeting point", "sum of distances"); earlier: B8-Q21 (not writable). Near: MV2-N7-03 (LIVE: distance across 0), MM4-N19.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `total distance|sum of .*distances`): `(least\|smallest\|minimum) (possible )?(total\|sum) & distance & (four\|4) (points\|houses\|friends)` ; `(stand\|choose) a point & total distance` ; `sum of (the )?distances (to\|from) (all\|each)`

**Feasibility** (`gen9.mjs S14`, 1499 parameter sets, key ranks reachable 2): 10.75 (key); 6.25 (outer span only (the three-point habit)); 12.25 (total from the leftmost point); 12.75 (total from the rightmost point). Parameters {"points":["-45/8","-39/8","-3/8","5/8"]}.

**Family within this batch:** none (S13 and S41, the three-point versions, are not writable)

**Note:** Rank 2 only. Points in eighths; the key prints as a 2-place decimal.

<!-- draft id S14 -->

## F08 — grade 6, 6.NS.C.8

**Ask:** a robot walks clockwise along the sides of a rectangle with signed decimal vertices, starting at the top-left vertex: the y-coordinate after it has walked d units

**Chain:** top side length = difference of the x-coordinates across the y-axis -> the remaining distance goes down the right side -> y = top y minus the remaining distance

**Twist (what makes it non-routine):** the walk turns a corner, so the distance splits between two sides; ignoring the corner is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0. Near: MM5-N16 (LIVE: side lengths across the axes, then the perimeter), MV2-N56-18 (LIVE).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `clockwise|along the (sides|edges)`): `(walks\|travels\|moves) & along the (sides\|edges\|perimeter) & coordinate` ; `clockwise & (rectangle\|square) & (vertex\|corner)` ; `(ant\|robot\|bug) & (rectangle\|perimeter) & (coordinate\|point)`

**Feasibility** (`gen9.mjs S16`, 235432 parameter sets, key ranks reachable 3): 5.85 (key); 0.35 (ignores the corner (goes straight down d)); 1.35 (top side as |xr| - |xl| (sizes subtracted across 0)); 6.15 (goes up instead of down after the corner). Parameters {"xl":"-3.25","xr":"2.25","yt":6,"yb":"-6.5","d":"5.65"}.

**Family within this batch:** P (walk around a rectangle on the coordinate plane): S16, S49

**Note:** Rank 3 only. The range [yb, yt] was modelled as a bound ("goes up after the corner" is struck by it).

<!-- draft id S16 -->

## F09 — grade 6, 6.NS.C.8

**Ask:** a robot walks clockwise around a rectangle with signed decimal vertices starting at the bottom-left vertex: the x-coordinate after d units

**Chain:** left side length = difference of the y-coordinates across the x-axis -> the remaining distance goes right along the top -> x = left x plus the remaining distance

**Twist (what makes it non-routine):** the walk turns a corner; ignoring it, or measuring a side across 0 by subtracting sizes, are the natural errors

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): as S16.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `clockwise|along the (sides|edges)`): `(walks\|travels\|moves) & along the (sides\|edges\|perimeter) & coordinate` ; `clockwise & (rectangle\|square) & (vertex\|corner)` ; `(ant\|robot\|bug) & (rectangle\|perimeter) & (coordinate\|point)`

**Feasibility** (`gen9.mjs S49`, 235432 parameter sets, key ranks reachable 2): -6.35 (key); -0.85 (ignores the corner (goes straight on d)); -1.85 (left side as |yt| - |yb| (sizes subtracted across 0)); -6.65 (goes left instead of right after the corner). Parameters {"xl":"-6.5","xr":"1.5","yt":"2.25","yb":"-3.25","d":"5.65"}.

**Family within this batch:** P: S16, S49

**Note:** Rank 2 only. The range [xl, xr] was modelled as a bound.

<!-- draft id S49 -->

## F10 — grade 7, 7.NS.A.1

**Ask:** a hiker's signed elevation changes over five legs from a printed starting elevation: the highest elevation reached

**Chain:** running elevation after each leg (signed decimal sums) -> compare -> the greatest

**Twist (what makes it non-routine):** an intermediate maximum, not the end; the final elevation and start-plus-all-climbs are the natural errors

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0. Signed version of S15; signed running sums are the saturated grade-7 family (MV2-N7-03, MM3-N18), the intermediate maximum is the new step.

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `highest (point|elevation)|greatest elevation`): `highest (point\|elevation) & (reached\|during)` ; `(greatest\|highest) (elevation\|height\|altitude) & (during\|at any (time\|point))` ; `(climbs\|rises) & (descends\|drops) & highest`

**Feasibility** (`gen9.mjs S21`, 36767 parameter sets, key ranks reachable 2, 3): -31.19 (key); -35.79 (final elevation); -12.99 (start plus all the climbs); -24.59 (start plus the largest climb). Parameters {"start":"-34.59","changes":["3.4",-17,"8.2","-5.8",10]}.

**Family within this batch:** R: S15, S48, S21

**Note:** Every option negative (SIGN). Stem asks for the greatest: an error above the key is required (DIR).

<!-- draft id S21 -->

## F11 — grade 8, 8.NS.A.1

**Ask:** a list of six numbers mixing perfect-square roots, a cube root, a repeating decimal and two irrationals: the sum of the rational numbers in the list

**Chain:** classify each (perfect-square or perfect-cube root -> rational; repeating decimal -> rational, as a fraction; non-perfect root and pi -> irrational) -> convert the rationals to fractions -> add

**Twist (what makes it non-routine):** a repeating decimal is rational and must be converted; dropping it (or keeping a non-perfect root) is the natural error

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: B7-K17 (convert, order, take the third; b7 probe-dropped), B7-D29. Near: MM4-N35 (prior MAP v4: classify eight numbers and COUNT the irrational ones; the count ask is fenced).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `rational.*sum|sum of the rational`): `(rational\|irrational) & sum` ; `sum of (all )?the rational` ; `(rational numbers) & (list\|these) & (add\|sum\|total)`

**Feasibility** (`gen9.mjs S33`, 2952 parameter sets, key ranks reachable 3, 4): 17/18 (key); 1/18 (leaves out the repeating decimal (thinks it irrational)); 7/18 (leaves out the square root (thinks every root irrational)); 1 17/18 (drops the cube root sign). Parameters {"sqrt":"√(25/81)","cbrt":"∛(-1/8)","repeating":"0.888..."}.

**Family within this batch:** C (classify rational / irrational, then compute with the rationals): S33, S51

**Note:** Ranks 3 and 4 (an extreme rank is reachable).

<!-- draft id S33 -->

## F12 — grade 8, 8.NS.A.1

**Ask:** a list of roots of fractions, a cube root, a repeating decimal and two irrationals: the greatest rational number in the list minus the least rational number

**Chain:** classify each as rational or irrational -> write the rationals as fractions -> order them -> greatest minus least

**Twist (what makes it non-routine):** the classification decides which numbers compete; a repeating decimal or a perfect-square root left out changes the extremes

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier: 0. Near: MM4-N35 (classification front end), B7-D34 (BORDERLINE: evaluate, rank, greatest minus least: the back half).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `rational.*(greatest|least)|greatest rational`): `(rational\|irrational) & (greatest\|least\|largest\|smallest) & (difference\|minus\|subtract)` ; `greatest rational` ; `(rational numbers) & (list\|these) & (greatest\|least)`

**Feasibility** (`gen9.mjs S51`, 26240 parameter sets, key ranks reachable 4): 1 2/9 (key); 1 1/9 (leaves out the repeating decimal); 2/9 (leaves out the cube root); 5/9 (drops the cube root sign). Parameters {"sqrt":"√(4/9)","cbrt":"∛(-1/27)","repeating":"0.888...","fraction":"7/9"}.

**Family within this batch:** C: S33, S51

**Note:** Rank 4 only.

<!-- draft id S51 -->

## F13 — grade 8, 8.EE.A.1

**Ask:** five powers with whole-number and fraction bases and zero or negative exponents: the sum of the ones whose value is less than 1

**Chain:** evaluate each power (a negative exponent flips the base; a zero power is 1) -> keep the values less than 1 -> add them as fractions

**Twist (what makes it non-routine):** which powers count depends on evaluating them: a fraction base with a negative exponent is greater than 1, and a zero power is not less than 1

**Pointers for the checker** (probe hits and items I noticed; not a novelty verdict): kw: 0 hits; earlier regex hits are noise (MB2-N78-16/18). Near: MV2-N8-01 (LIVE: evaluates -2^4, 2^-2 and 7^0 and combines them), B7-D34 (BORDERLINE), batch-5 C16 (REPEAT, SSAT f2276aab).

**Probe** (mf30-kw over dump-b6, 3 queries; earlier-N regex `less than 1.*exponent|negative exponent.*sum`): `(less\|greater) than 1 & (\^ ?\(?-[0-9]\|negative exponent) & (sum\|add\|total)` ; `(\^-[0-9]\|\^\(-[0-9]\)) & (\^0\|zero exponent) & (sum\|add\|which)` ; `(powers\|expressions) & (less than 1\|greater than 1) & exponent`

**Feasibility** (`gen9.mjs S55`, 14999 parameter sets, key ranks reachable 2): 9/64 (key); 57/64 (does not flip a fraction base with a negative exponent); 1 9/64 (includes the zero powers (reads less than 1 as at most 1)); 1/64 (does not flip a whole-number base with a negative exponent). Parameters {"powers":["(2)^-3","(0.25)^3","(2)^0","(0.5)^-1","(0.5)^-2"]}.

**Family within this batch:** none (ask shape shared with S43 only)

**Note:** Fragile: one list of five powers passed (2^-3, (1/4)^3, 2^0, (1/2)^-1, (1/2)^-2; key 9/64), rank 2 only. Area/cluster risk: zero and negative exponent evaluation (8.EE.A.1) was fenced as "exponent-law evaluation" in b8; the selection step is what is new.

<!-- draft id S55 -->
