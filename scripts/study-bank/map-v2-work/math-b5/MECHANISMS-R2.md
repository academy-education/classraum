# map-v2 Math batch 5 (Number Systems) — ROUND 2 candidates (R01-R30) for the independent chain check

2026-10-26. Same format as MECHANISMS.md, with one change the checker asked for: **every candidate was searched in
BOTH `earlier-N-chains.json` AND the live ISEE / SSAT / MAP rows of `dump-b4` before it was proposed**, and the queries and
every hit are printed under it (live rows and MAP prior rows; SAT/ACT rows are not grade 5-8 canon and are not shown).
A hit count of 0 means only that these keyword queries found nothing; the checker's operation-based search is the test.

Dropped while drafting because the search found the chain already live: absolute-value equations (sum/product of the
solutions: ISEE 7d1c0baf, SSAT 1cc39a79 and four more), telescoping products (ISEE e9968f0b, SSAT 31c64416), alternating
sums (ISEE b5a7e6e8), a system of two exponent equations (ISEE 331af042), "3/8 of a number is 27, find 5/6 of it" (ISEE
36059d98; my first R04), and a repeating decimal to a/b then a + b (MV2-N8-14). Blocked by the checks rather than by
repetition: small-count asks (options are a consecutive run through the key, rule 3), place-value x10 asks (HUB).

Avoided families (checker): signed sum/difference chains, exponent evaluation, mixed-number add/subtract,
nth digit of a repeating decimal, fraction of the remainder, multiply-then-adjust money stories, root closest to.

**Family note for the checker.** Seven candidates are "missing number that makes two expressions equal" (R01, R03,
R12, R16, R19, R22, R30), each with a different operation and property. If the checker treats "missing number" as one
chain, at most two of them should go forward.

**Ratings** (how likely new to MAP AND to live ISEE/SSAT): medium 16, weak 9, WEAKEST 5. None is rated strong: round 1's only "strong" had a twin in a
first-written file, so no rating here claims more than the search shows.

## R01 — grade 5, 5.NBT.B.7 — rating: medium

**Ask:** the missing decimal that makes two decimal sums equal (a + b = n + c)

**Chain:** add the two known decimals on one side -> subtract the known decimal on the other side -> the missing addend

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `= n \+|n \+ \d+(\.\d+)? =|missing number` ; `makes&equal&decimal|same (sum|total) as` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM3-N05 | v3 | file only (never banked) | g5
        chain: line up tenths and hundredths -> subtract with a regroup into the tenths -> add with carries
        prompt: A pitcher has 2.75 liters of juice in it. Lee pours out 0.8 liter of the juice. Then his mom pours 1.45 liters more juice into the pitcher. How many liters of juice are i ...

    MM5-N08 | v5 | file only (never banked) | g5
        chain: double the red length -> subtract 0.65 with regrouping -> add the two lengths
        prompt: A red board is 2.2 meters long. A blue board is 0.65 meter shorter than twice the length of the red board. What is the total length of the two boards, in meters?

    MB4-N5-03 | b4 | withdrawn | g5
        chain: add the two lengths each gift uses -> multiply the decimal by the number of gifts -> subtract the hundredths total from a whole number of meters
        prompt: A roll holds 12 meters of ribbon. Mia wraps 5 gifts. Each gift uses 1.15 meters of ribbon for wrapping and 0.2 meter of ribbon for a bow. How many meters of ribbon are le ...

**Mechanical top 3:** MM4-N24 (0.17), MB4-N5-03 (0.15), MM5P-N01 (0.14)

**Note:** No hit for a missing-addend equality in decimals. MM3-N05 and MM5-N08 do decimal add/subtract with regrouping toward a total; here the unknown sits on the other side of an equals sign. FORM: decimals with a shared last digit come from regrouping slips on the tenths. K4: an estimate brackets the answer to about 1; errors must stay inside that (choose x.4-x.6 terms).

## R02 — grade 5, 5.NF.B.3 — rating: medium

**Ask:** two whole-number divisions written as mixed numbers (7 ÷ 3 and 9 ÷ 4): how much greater one quotient is

**Chain:** read each division as a fraction -> write each as a mixed number -> subtract with a common denominator

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `÷ 3&÷ 4|divided equally among 3` ; `as a mixed number&÷|shared equally&mixed` — **2 hit(s)**

- MAP prior MM4-N23 (map-math-g58-v4.batch.json): Find the quotient (-2 1/4) ÷ (-3/5). Write your answer as a mixed number.
- N-chain MM4-N23 (v4, file only (never banked)): sign of a quotient of two negatives -> multiply by the reciprocal of the divisor

**Closest earlier MAP Number Systems items by my reading:**

    MM3-N02 | v3 | file only (never banked) | g5
        chain: read the sharing as 14 divided by 5 -> find the whole pounds each -> share the leftover pounds as fifths
        prompt: Five friends share 14 pounds of grapes equally. How many pounds of grapes does each friend get?

    MM5-N02 | v5 | LIVE | g5
        chain: multiply the whole number by the numerator -> divide by the denominator -> write the result as a mixed number in lowest terms
        prompt: A ribbon is 16 feet long. Lena uses 5/12 of the ribbon to make a bow. How many feet of ribbon does she use?

    MV2-N56-15 | b1 | LIVE | g6
        chain: divide 6,300 by 14 (450 trays) -> divide 6,300 by 35 (180 trays) -> subtract to find how many fewer
        prompt: A bakery has 6,300 cookies to pack. If it packs them in trays that hold 14 cookies, every tray is full. If it packs them in trays that hold 35 cookies, every tray is also ...

**Mechanical top 3:** MM5-N02 (0.21), MMG-N09 (0.19), MMG-N02 (0.18)

**Note:** No hit. MM3-N02 reads one sharing as division and writes fifths; two divisions compared as mixed numbers is new. FORM needs every option over the same denominator (12): errors such as swapping quotient and remainder (3 1/7) change the denominator and cannot be options, so the author must find same-denominator errors (subtracting the wholes only, dividing the wrong way round in one of them).

## R03 — grade 5, 5.NF.B.4 — rating: medium

**Ask:** a fraction times a sum, written two ways: the missing number n in (3/4)(8 + 2/3) = 6 + n

**Chain:** distribute the fraction over the whole-number part -> distribute over the fraction part -> n is the second partial product

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `distributive` ; `x \(\d+ \+ \d/\d\)|\(\d+ \+ \d/\d\)` — **5 hit(s)**

- MAP prior MM2-N09 (map-math-g58-v2/stage0.assembled.json): Using the distributive property, Kim writes 48 + 72 as a(b + c), where a x b = 48, a x c = 72, and b and c are whole numbers with no common factor other than 1. What is the value of a + b + c?
- MAP prior MV2-N56-25 (map-math-v2 b1 withdrawn): Ana uses the distributive property to rewrite 15 + 105 as a product of two factors. The first factor is the greatest common factor of 15 and 105. The second factor is a sum of two whole numbers. What 
- N-chain MM2-N09 (v2, file only (never banked)): 'no common factor' means a is the GCF -> GCF of 48 and 72 = 24 -> b = 2, c = 3, then add a + b + c
- N-chain MV2-N56-25 (b1, withdrawn): GCF of 15 and 105 is 15 -> divide each addend by 15 -> add the quotients
- N-chain MB4-N7-05 (b4 first-written, revised away): distribute a negative decimal over a difference -> multiply a positive decimal by a negative decimal -> add the two results

**Closest earlier MAP Number Systems items by my reading:**

    MM2-N09 | v2 | file only (never banked) | g6
        chain: 'no common factor' means a is the GCF -> GCF of 48 and 72 = 24 -> b = 2, c = 3, then add a + b + c
        prompt: Using the distributive property, Kim writes 48 + 72 as a(b + c), where a x b = 48, a x c = 72, and b and c are whole numbers with no common factor other than 1. What is t ...

    MV2-N56-25 | b1 | withdrawn | g6
        chain: GCF of 15 and 105 is 15 -> divide each addend by 15 -> add the quotients
        prompt: Ana uses the distributive property to rewrite 15 + 105 as a product of two factors. The first factor is the greatest common factor of 15 and 105. The second factor is a s ...

    MM4-N10 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: area = length x width -> write both mixed numbers as fractions -> multiply and write the product as a mixed number
        prompt: Mr. Ortiz is covering a lawn with sod. The lawn is shaped like a rectangle that measures 4 2/3 yards by 2 1/2 yards. How many square yards of sod does he need to cover th ...

**Mechanical top 3:** MM4-N05 (0.21), MMG-N02 (0.18), MM5-N07 (0.18)

**Note:** MAP's distributive items (MM2-N09, MV2-N56-25) are GCF factorings of whole numbers; a fraction distributed over a mixed sum with the missing second partial product is not in MAP or the ISEE/SSAT hits. Plug-back is routine (compute both sides), so the key must sit at try 3-4.

## R04 — grade 5, 5.NF.B.5 — rating: medium

**Ask:** a mixed-number amount is multiplied by 5/4: how much greater the result is than the amount (the increase is 1/4 of the amount)

**Chain:** see that multiplying by 5/4 adds 1/4 of the amount -> find 1/4 of the mixed number -> (or multiply and subtract)

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `times 5/4|x 5/4|5/4 (of|times)` ; `how much (more|greater|larger) than the (number|original)` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MV2-N56-01 | b1 | LIVE | g5
        chain: 3/4 of 480 = vegetable plots -> 5/12 of the vegetable plots, not of all plots
        prompt: A town has 480 garden plots. Exactly 3/4 of the plots grow vegetables. Of the vegetable plots, 5/12 grow beans. How many of the garden plots grow beans?

    MV2-N56-06 | b1 | LIVE | g5
        chain: multiply a mixed number by a mixed number -> multiply a mixed number by a fraction -> subtract fifths and fifteenths with regrouping
        prompt: A photo is 2 4/5 inches wide. Ana prints a large copy that is 1 1/2 times as wide as the photo. She also prints a small copy that is 1/3 as wide as the photo. How many in ...

    MM4-N07 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: multiply the mixed number 1 1/8 by 6 -> subtract the product from 11 by regrouping a whole as eighths (or fourths)
        prompt: A jug holds 11 cups of lemonade. Mr. Ruiz fills 6 glasses, and he pours 1 1/8 cups into each glass. How many cups of lemonade are left in the jug?

**Mechanical top 3:** MM4-N05 (0.22), MV2-N56-06 (0.22), MMG-N01 (0.21)

**Note:** No hit for 'multiplying by 5/4 adds 1/4'. MV2-N56-01 and -06 scale and multiply; here the ask is the INCREASE, reached by seeing 5/4 = 1 + 1/4. A student who multiplies then subtracts gets the same key, so the chain the checker should judge is 'scale, then compare with the original'.

## R05 — grade 6, 6.NS.C.7 — rating: medium

**Ask:** four negative numbers in mixed forms (-2/3, -0.7, -5/8, -0.65): the second-smallest plus the largest

**Chain:** write each as a decimal -> order negatives by size (larger size is smaller) -> add the two named values

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `order&negative|least to greatest&-` ; `-0\.7|-5/8|-2/3&-0\.` — **4 hit(s)**

- N-chain MM4-N19 (v4 work stage0.pre-return.json, file only (never banked)): write the mixed numbers as decimals -> order the four numbers, including the two negatives -> add the distances from 0 of the least and the greatest
- N-chain MV2-N7-14 (b1, withdrawn): divide first: -7.2 / 2.5 = -2.88 -> then multiply: -2.88 x 4.5 = -12.96 -> subtract a negative: -3.5 - (-12.96)
- MAP prior MMG-N15 (map-math-g58-v1.batch.json): Lena solved two equations. The solution of x^3 = -0.216 is x, and the positive solution of y^2 = 1.69 is y. When she subtracts y from x, what number does she get?
- MAP prior MM4-N17 (map-math-g58-v4 (as first written)): A number line from -3 to 5 is divided into 40 equal parts. Lia starts at -3 and counts 18 parts to the right. At what number on the number line does she stop?

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N15 | v4 | file only (never banked) | g6
        chain: read distance from 0 as absolute value -> compare each absolute value with 6.45 and 7.4 by place value
        prompt: Which number is farther from 0 than -6.45 and closer to 0 than 7.4?

    MM4-N03 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: multiply the whole number by the numerator -> write 18/8 as a mixed number and simplify
        prompt: Each glass holds 3/8 liter of water. Ken fills 6 glasses. How many liters of water are in the 6 glasses?

    MMG-N07 | v1 | file only (never banked) | g6
        chain: evaluate the absolute value of a negative number -> locate the first integer greater than a negative mixed number -> count integers in the interval, including 0
        prompt: How many integers are greater than -3 3/5 and less than |-5 3/5| ?

**Mechanical top 3:** MM5P-N05 (0.21), MM2-N12 (0.19), MMG-N09 (0.18)

**Note:** No hit for ordering negative fractions and decimals and then adding two named ranks. MM4-N15 compares absolute values with bounds; C06 (judged NEW) ranks by absolute value. R05 orders signed values, where -0.7 < -2/3 < -0.65 < -5/8 is the trap. Keep only one of R05 and C06 if the checker sees them as one chain.

## R06 — grade 6, 6.NS.C.8 — rating: medium

**Ask:** a point in quadrant III is 4.5 units from the x-axis and 2.25 units from the y-axis: x - y

**Chain:** distance from the x-axis is |y|, from the y-axis is |x| -> attach the quadrant's signs -> subtract

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `quadrant (II|III|IV)&units` ; `units from the (x|y)-axis|distance (from|to) the (x|y)-axis` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM4-N11 | v4 | file only (never banked) | g6
        chain: see the points share an x-coordinate -> points on the same side of the x-axis: subtract the absolute values of the y-coordinates
        prompt: A town map is drawn on a coordinate plane, and each unit on the map stands for one block. The bus stop is at the point (-3.5, -4), and the school is at the point (-3.5, - ...

    MM5-N16 | v5 | LIVE | g6
        chain: length across the y-axis: add absolute values -> length on one side of the x-axis: subtract -> perimeter of the rectangle -> take off the gate
        prompt: On a map drawn on a coordinate plane, each unit stands for 1 meter. A rectangular garden has corners at (-10, 5), (22, 5), (22, 23) and (-10, 23). A fence will go all the ...

    MV2-N56-18 | b1 | LIVE | g6
        chain: first leg across the y-axis: add 4.5 + 5 -> reflect (5, 7) across the x-axis: (5, -7) -> second leg across the x-axis: 7 + 7 -> add the two legs
        prompt: A hiking map is drawn on a coordinate plane where each unit stands for 1 kilometer. The ranger station is at (-4.5, 7) and the lookout tower is at (5, 7). The campsite is ...

**Mechanical top 3:** MM5P-N05 (0.26), MM4-N14 (0.23), MM4-N11 (0.21)

**Note:** No hit for 'distance from each axis -> coordinates with quadrant signs'. MM4-N11 and MM5-N16 go the other way (coordinates -> distances). FORM: decimals with matching places; sign errors from the wrong quadrant land on both sides of the key.

## R07 — grade 6, 6.NS.C.7 — rating: weak

**Ask:** the sum of all integers strictly between two rational numbers of opposite sign (-3 1/3 and 4.6)

**Chain:** find the least and greatest integers inside the interval -> pair each negative with its opposite -> add the integers left over

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `integers (are )?between|integers greater than -` ; `sum of (all )?(the )?integers` — **4 hit(s)**

- live ssat 696beee0: How many integers between 100 and 400 are divisible by 6 but NOT divisible by 9? (key 33)
- live isee e626a938: How many integers between 100 and 400 are divisible by 7? (key 43)
- live isee eeadd37f: How many integers between 100 and 200 are divisible by both 4 and 6? (key 8)
- live ssat d9090ca9: What is the sum of all the integers x that satisfy |2x + 5| <= 9 ? (key -25)

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N34 | v4 | file only (never banked) | g8
        chain: place -√13 between -4 and -3 -> place √75 between 8 and 9 -> count the integers from -3 to 8, including 0
        prompt: On a number line, point A is at -√13 and point B is at √75. How many integers are on the number line between point A and point B?

    MMG-N07 | v1 | file only (never banked) | g6
        chain: evaluate the absolute value of a negative number -> locate the first integer greater than a negative mixed number -> count integers in the interval, including 0
        prompt: How many integers are greater than -3 3/5 and less than |-5 3/5| ?

    MM3-N26 | v3 | file only (never banked) | g8
        chain: square each decimal bound -> find the whole numbers strictly between the squares -> count them
        prompt: For how many whole numbers n is the square root of n greater than 3.5 and less than 6.6?

**Mechanical top 3:** MMG-N07 (0.18), MM5P-N05 (0.17), MM4-N16 (0.17)

**Note:** SSAT d9090ca9 sums the integers that satisfy |2x + 5| <= 9: once the inequality is solved, that IS the sum of integers in an interval of opposite-sign ends (-7 to 2). R07's interval ends are rationals instead of an inequality, so only the front end differs; downgraded to weak after reading the hit. The other hits count multiples and are unrelated. K1: the key is a small integer; options must share its parity.

## R08 — grade 7, 7.NS.A.1 — rating: medium

**Ask:** a number minus its opposite is a printed negative decimal: the number

**Chain:** a number minus its opposite is twice the number -> halve the printed value, keeping the sign

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `minus its opposite|and its opposite|opposite of a number` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MV2-N56-24 | b1 | LIVE | g6
        chain: opposite of 7.5 is -7.5 -> move 1.5 right: B = -6 -> same side of 0: subtract the sizes
        prompt: Jin marks the opposite of 7.5 on a number line. From that mark he moves 1.5 units to the right and marks point B. He also marks point A at -0.5. How many units long is th ...

    MV2-N56-21 | b1 | withdrawn | g6
        chain: move 8.5 left of -15: -23.5 -> opposite: B = 23.5 -> opposite sides of 0: add 15 + 23.5
        prompt: Start at point A, which is at -15 on a number line. Move 8.5 units to the left. Point B is at the opposite of the number where you stop. How many units apart are points A ...

    MV2-N56-22 | b1 | LIVE | g6
        chain: opposite of -5 is 5 -> absolute value of -1.5 is 1.5 -> |2 - 9| is the distance 7 -> combine 5 - 1.5 + 7
        prompt: Lia writes the expression -(-5) - |-1.5| + |2 - 9| on the board and works it out step by step. What number should she get?

**Mechanical top 3:** MB2-N78-03 (0.21), MM4-N24 (0.21), MM2-N12 (0.19)

**Note:** No hit. 'x - (-x) = 2x' reasoning about opposites is not in MAP: MV2-N56-24/-21/-22 take opposites of given numbers. Weakness: the arithmetic is one halving, so it is low tier at best; a decimal like -4.6 keeps FORM easy (halve: -2.3; errors -4.6, -9.2 are a HUB ratio pair with the key, so the author must use other errors).

## R09 — grade 7, 7.NS.A.2c — rating: medium

**Ask:** the opposite of the reciprocal of the absolute value of a negative mixed number, plus a printed decimal

**Chain:** absolute value of the mixed number -> rename and take the reciprocal -> take the opposite -> add a decimal (convert the fraction)

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `opposite of the reciprocal|reciprocal of the opposite|absolute value of the reciprocal` ; `reciprocal&opposite` — **1 hit(s)**

- N-chain MV2-N8-01 (b1, LIVE): -2^4 is the opposite of 2^4 -> 2^-2 is the reciprocal 1/4 -> 7^0 is 1 -> combine -16 + 14 - 6

**Closest earlier MAP Number Systems items by my reading:**

    MV2-N56-22 | b1 | LIVE | g6
        chain: opposite of -5 is 5 -> absolute value of -1.5 is 1.5 -> |2 - 9| is the distance 7 -> combine 5 - 1.5 + 7
        prompt: Lia writes the expression -(-5) - |-1.5| + |2 - 9| on the board and works it out step by step. What number should she get?

    MM4-N36 | v4 work stage0.pre-return.json | file only (never banked) | g8
        chain: negative exponent means reciprocal: 2/5 -> square the reciprocal: 4/25
        prompt: Write the value of (5/2)^-2 as a fraction or mixed number.

    MM3-N21 | v3 | file only (never banked) | g7
        chain: add a negative fraction and a positive mixed number -> add a negative mixed number and a positive fraction -> divide fractions with unlike signs
        prompt: Jin divides the sum of -1/2 and 1 2/3 by the sum of -2 1/6 and 1/2. In other words, he works out (-1/2 + 1 2/3) ÷ (-2 1/6 + 1/2). What quotient does he get?

**Mechanical top 3:** MM3-N27 (0.36), MM4-N36 (0.32), MM5-N25 (0.25)

**Note:** The reciprocal/opposite/absolute hits are MAP items that apply ONE operator to each of several numbers (MV2-N56-22). R09 composes three operators on one number, where the order matters. Round-1 C13 was borderline on MV2-N56-22; this is its distinct form.

## R10 — grade 7, 7.NS.A.2d — rating: WEAKEST

**Ask:** how many digits a fraction's terminating decimal has after the decimal point, the fraction NOT in lowest terms (21/56, 9/48)

**Chain:** simplify the fraction -> factor the denominator into 2s and 5s -> the larger exponent is the number of digits

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `decimal places|digits after the decimal` ; `terminat` — **5 hit(s)**

- live ssat c45ca0fb: When two sevenths is written as a decimal, the digits after the decimal point repeat in a block of six. What is the 50th digit after the decimal point? (key 8)
- live isee f1e21e9b: For how many positive integers n does the decimal form of 1/n terminate with exactly 4 digits after the decimal point? (For example, 1/8 = 0.125 terminates with exactly 3 digits after the decimal poin (key 9)
- N-chain MM2-N11 (v2 first-written, file only (never banked)): negative times negative is positive -> multiply 34 x 25 and place two decimal places
- N-chain MM3-N09 (v3, file only (never banked)): multiply the digits as whole numbers with partial products -> count decimal places to place the point
- live isee 3b775d60: Ana writes each of the fractions 1/60, 2/60, 3/60, ..., 59/60 as a decimal. How many of these 59 decimals terminate (come to an end) instead of repeating forever? (key 19)

**Closest earlier MAP Number Systems items by my reading:**

    MM2-N11 | v2 | file only (never banked) | g7
        chain: negative times negative is positive -> multiply 45 x 34 and place two decimal places
        prompt: Maya multiplies -4.5 by -3.4 without a calculator. What product should she get?

    MM3-N09 | v3 | file only (never banked) | g6
        chain: multiply the digits as whole numbers with partial products -> count decimal places to place the point
        prompt: Ribbon costs $0.45 for each meter. Ms. Lee buys 4.6 meters of ribbon. How much does she pay, in dollars?

    MV2-N8-14 | b1 | LIVE | g8
        chain: multiply by 1000 and by 10 -> subtract to get 990n = 345 -> simplify 345/990 to 23/66 -> add numerator and denominator
        prompt: In the decimal 0.3484848..., the digits 48 repeat forever and the 3 does not repeat. When this decimal is written as a fraction a/b in simplest form, what is a + b?

**Mechanical top 3:** MV2-N8-14 (0.18), MM3-N27 (0.16), MM4-N36 (0.14)

**Note:** Downgraded to WEAKEST after reading the hits: ISEE f1e21e9b (1/n terminating in exactly 4 digits), ISEE 3b775d60 (how many of 1/60 ... 59/60 terminate) and SSAT bde1402b (which lowest-terms fraction terminates) all use the same 2s-and-5s denominator rule. R10's only extra step is simplifying first.

## R11 — grade 8, 8.NS.A.1 — rating: medium

**Ask:** a repeating decimal used as a multiplier: 0.272727... of 132

**Chain:** write the repeating decimal as a fraction over 99 -> simplify to 3/11 -> multiply by the whole quantity

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `repeat&of \d|repeat&times|repeat&multipl` ; `0\.\(?27|0\.2727` — **3 hit(s)**

- N-chain MV2-N8-14 (b1, LIVE): multiply by 1000 and by 10 -> subtract to get 990n = 345 -> simplify 345/990 to 23/66 -> add numerator and denominator
- live ssat 09826fad: A dripping tap loses 3 millilitres of water every 4 seconds. At this rate, how many LITRES of water does it lose in one hour? (1 litre = 1,000 millilitres) (key 2.7)
- MAP prior MM4-N19 (map-math-g58-v4.batch.json): A store sells markers for $0.37 each. Leo has $11.75. He buys as many markers as he can. How much money, in dollars, does Leo have left?

**Closest earlier MAP Number Systems items by my reading:**

    MV2-N8-14 | b1 | LIVE | g8
        chain: multiply by 1000 and by 10 -> subtract to get 990n = 345 -> simplify 345/990 to 23/66 -> add numerator and denominator
        prompt: In the decimal 0.3484848..., the digits 48 repeat forever and the 3 does not repeat. When this decimal is written as a fraction a/b in simplest form, what is a + b?

    MM4-N35 | v4 | file only (never banked) | g8
        chain: simplify each root (a perfect square or cube under it, or a quotient of roots) -> repeating decimals are rational -> endless non-repeating decimals are irrational
        prompt: Mr. Ortiz writes these eight numbers on the board: √0.49, √0.4, π, ∛(-0.027), √20 ÷ √5, 0.4111... (the digit 1 repeats forever), 0.1010010001... (the runs of 0s keep gett ...

    MV2-N56-01 | b1 | LIVE | g5
        chain: 3/4 of 480 = vegetable plots -> 5/12 of the vegetable plots, not of all plots
        prompt: A town has 480 garden plots. Exactly 3/4 of the plots grow vegetables. Of the vegetable plots, 5/12 grow beans. How many of the garden plots grow beans?

**Mechanical top 3:** MV2-N8-14 (0.22), MV2-N8-19 (0.17), MV2-N8-13 (0.17)

**Note:** SSAT a175b647 converts two repeating decimals and divides them; MM4-N35 classifies repeating decimals as rational. Using one repeating decimal as a multiplier of a whole quantity (3/11 of 132) is not in either. This is the distinct form of round-1 C17.

## R12 — grade 6, 6.NS.B.3 — rating: medium

**Ask:** the missing factor that makes two decimal products equal (4.8 x n = 1.2 x 7.2)

**Chain:** compute the known product -> divide it by the known factor on the other side (or compare factors: 4.8 = 4 x 1.2, so n = 7.2 / 4)

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `x n =|n x \d|missing factor` ; `same product|products are equal` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM4-N12 | v4 | file only (never banked) | g6
        chain: write the comparison as 15.84 / 0.75 -> move both decimal points two places and divide 1584 by 75
        prompt: A puppy weighs 15.84 pounds. A kitten weighs 0.75 pound. How many times as heavy as the kitten is the puppy?

    MM2-N06 | v2 | file only (never banked) | g6
        chain: multiply 475 by 22 with two partial products -> place the decimal point three places from the right
        prompt: Jess buys 2.2 pounds of cheese. The cheese costs $4.75 per pound. How much does Jess pay, in dollars?

    MM3-N09 | v3 | file only (never banked) | g6
        chain: multiply the digits as whole numbers with partial products -> count decimal places to place the point
        prompt: Ribbon costs $0.45 for each meter. Ms. Lee buys 4.6 meters of ribbon. How much does she pay, in dollars?

**Mechanical top 3:** MV2-N56-25 (0.17), MM2-N08 (0.17), MB4-N6-05 (0.16)

**Note:** No hit. MM4-N12 divides one decimal by another; here the equality of two products is the given, and the factor relation (4.8 = 4 x 1.2) is the shortcut. A single quotient is the answer if solved by division, so the bracket rule applies: the key must not be decidable by 'between 1 and 2' (choose factors so the quotient sits mid-interval and errors stay inside).

## R13 — grade 8, 8.EE.A.1 — rating: weak

**Ask:** a product of two powers with the same exponent whose bases multiply to a power of 2 or 10 (0.5^4 x 8^4 = 2^n): n

**Chain:** multiply the bases first (a^n b^n = (ab)^n) -> write the base as a power of 2 -> power of a power

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `\d\^(\d) x \d+\^\1|\(0\.5\)\^|= 10\^n|= 2\^n` ; `25\^|zeros at the end` — **2 hit(s)**

- live isee 331af042: The numbers x and y satisfy both of the equations below. 9^x * 27^y = 3^26 25^x / 5^y = 5^10 What is the value of xy ? (key 28)
- live isee 691faf19: How many zeros are at the end of the number 25^6 x 12^5 when it is written out in full? (key 10)

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N38 | v4 work stage0.pre-return.json | file only (never banked) | g8
        chain: write 8 and 32 as powers of 2 -> power of a power with a negative exponent: (2^3)^-2 = 2^-6 -> quotient rule: -6 - 5
        prompt: Rina rewrites the expression 8^-2 ÷ 32 as a single power of two. What is the exponent of that power of two?

    MM2-N20 | v2 | file only (never banked) | g8
        chain: 2^-2 x 2^6 = 2^4 -> (2^4)^3 = 2^12 -> divide by (2^2)^2 = 2^4
        prompt: Ravi simplifies (2^-2 x 2^6)^3 / (2^2)^2 using the properties of exponents. What is the value of the expression?

    MB2-N78-19 | b2 | LIVE | g8
        chain: product of powers: add the exponents -> set the exponent sum equal to the right-hand exponent -> solve x + 2 - 7 = -2 with negatives
        prompt: Priya multiplies three powers of 2 and writes the product as a single power: (2^x)(2^2)(2^(-7)) = 2^(-2). Which integer did she use for the exponent x?

**Mechanical top 3:** MM3-N23 (0.24), MV2-N8-07 (0.22), MV2-N8-12 (0.22)

**Note:** ISEE 691faf19 counts trailing zeros of 25^6 x 12^5 by pairing 2s and 5s; R13 combines bases with a common exponent ((0.5 x 8)^4 = 4^4 = 2^8). Exponent evaluation is saturated and this sits next to it; I rate it weak.

## R14 — grade 5, 5.NF.A.1 — rating: weak

**Ask:** the fraction with denominator 24 that lies between 5/8 and 3/4 and is in lowest terms: its numerator

**Chain:** rename both bounds in twenty-fourths -> list the numerators strictly between -> keep the one with no common factor with 24

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `between&denominator|numerator&between` ; `lies between&/` — **1 hit(s)**

- live ssat 35b0d52b: Which of the following numbers lies between 5/8 and 7/11 on the number line? (key 0.63)

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N03 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: multiply the whole number by the numerator -> write 18/8 as a mixed number and simplify
        prompt: Each glass holds 3/8 liter of water. Ken fills 6 glasses. How many liters of water are in the 6 glasses?

    MM2-N03 | v2 | file only (never banked) | g5
        chain: rename 1/3 as twelfths -> regroup one whole as 12/12 -> subtract and simplify
        prompt: A water jug holds 6 1/3 liters of water. Sam pours out 2 7/12 liters to fill some bottles. How many liters of water are still in the jug?

    MM4-N02 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: rename both fractions as twelfths -> add wholes and fractions -> carry 12/12 into the wholes
        prompt: Jada practiced piano for 2 5/6 hours on Saturday and 1 3/4 hours on Sunday. How many hours did she practice in all?

**Mechanical top 3:** MM5-N02 (0.16), MM5-N04 (0.13), MM2-N04 (0.13)

**Note:** SSAT 35b0d52b asks which option lies between 5/8 and 7/11; R14 requires a given denominator and lowest terms, so the student renames both bounds and filters by common factors. The selection chain is shared; downgraded to weak after reading the hit. FORM: options are whole-number numerators; keep them one-digit or with a shared last digit.

## R15 — grade 6, 6.NS.C.6 — rating: weak

**Ask:** a point in quadrant IV, 2.4 units from the y-axis, is reflected across the x-axis and lands 7.5 units from where it started: x + y of the original point

**Chain:** reflection across the x-axis moves the point 2|y| -> |y| = 3.75 -> quadrant IV signs -> add the coordinates

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `reflect&x-axis&units` ; `reflected across the x-axis` — **4 hit(s)**

- live isee 1f4b0427: Point P(-3, 5) is reflected across the x-axis, and the image is then translated 4 units to the right, producing point Q. What is the sum of the coordinates of Q? (key -4)
- MAP prior MB3-G6-06 (map-math-v2 b3 LIVE): In the coordinate plane, a rectangle has corners at (-9, 0), (1, 0), (1, 14), and (-9, 14). The rectangle is reflected across the x-axis. The rectangle and its image share one side, and together they 
- N-chain MV2-N56-18 (b1 first-written, revised away): reflect across the x-axis: y changes sign -> same x, opposite sides of the axis: add 7 + 4 -> scale 11 units by 2.5 miles
- live isee 2683f170: The point P(2, 5) is reflected across the line y = x. The image is then reflected across the x-axis, that image is reflected across the line y = x, that image across the x-axis, and so on, alternating (key (-2, -5))

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N14 | v4 work stage0.pre-return.json | file only (never banked) | g6
        chain: reflect across the x-axis: change the sign of y -> reflect the image across the y-axis: change the sign of x -> add the coordinates of the final point
        prompt: In the coordinate plane, point A is at (2, 3.5). Point B is the reflection of point A across the x-axis. Point C is the reflection of point B across the y-axis. What is t ...

    MV2-N56-18 | b1 | LIVE | g6
        chain: first leg across the y-axis: add 4.5 + 5 -> reflect (5, 7) across the x-axis: (5, -7) -> second leg across the x-axis: 7 + 7 -> add the two legs
        prompt: A hiking map is drawn on a coordinate plane where each unit stands for 1 kilometer. The ranger station is at (-4.5, 7) and the lookout tower is at (5, 7). The campsite is ...

    MM4-N11 | v4 | file only (never banked) | g6
        chain: see the points share an x-coordinate -> points on the same side of the x-axis: subtract the absolute values of the y-coordinates
        prompt: A town map is drawn on a coordinate plane, and each unit on the map stands for one block. The bus stop is at the point (-3.5, -4), and the school is at the point (-3.5, - ...

**Mechanical top 3:** MM4-N14 (0.37), MV2-N56-18 (0.21), MV2-N56-21 (0.18)

**Note:** ISEE 1f4b0427 reflects a point across the x-axis, translates it and sums the coordinates; MM4-N14 reflects across both axes and adds coordinates. R15 works backward from the reflection distance, but its last two steps are theirs; weak.

## R16 — grade 6, 6.NS.A.1 — rating: medium

**Ask:** the denominator n that makes 3/4 ÷ 3/n equal to a printed whole number

**Chain:** dividing by 3/n is multiplying by n/3 -> (3/4)(n/3) = n/4 -> n = 4 x the whole number

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `÷ \(?\d/n|denominator n|whole number&÷ \d/` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MMG-N05 | v1 | file only (never banked) | g6
        chain: amount for a whole = amount for the part divided by the part -> divide by a fraction by multiplying by its reciprocal
        prompt: Mia used 2 1/2 cups of flour to make 3/4 of a batch of muffins. At this rate, how many cups of flour are needed to make a full batch?

    MM2-N07 | v2 | file only (never banked) | g6
        chain: servings = amount / serving size -> write 1 1/5 as 6/5 -> multiply by the reciprocal 3/2 and simplify
        prompt: A pitcher holds 1 1/5 liters of lemonade. One serving is 2/3 liter. How many servings of lemonade are in the pitcher?

    MV2-N56-12 | b1 | dropped by graders | g6
        chain: rename the mixed number 2 4/7 as 18/7 -> multiply by the reciprocal 3/2 -> simplify 54/14 to 3 6/7
        prompt: A green rope is 2 4/7 meters long. A blue rope is 2/3 meter long. How many times as long as the blue rope is the green rope?

**Mechanical top 3:** MMG-N05 (0.25), MM3-N12 (0.17), MM4-N36 (0.17)

**Note:** No hit for a missing denominator that makes a fraction quotient whole. MMG-N05 and MM2-N07 divide by a fraction to get an amount. This is a 'missing number' variant (see the family note).

## R17 — grade 5, 5.NBT.A.3 — rating: weak

**Ask:** four decimals with the same digits in different places (0.405, 0.45, 0.4005, 0.054): the greatest plus the least

**Chain:** compare place by place -> pick the greatest and least -> add with the decimal points lined up

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `greatest&least&0\.\d+&sum|0\.405|0\.4005` ; `compare&decimal&greatest` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM4-N03 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: multiply the whole number by the numerator -> write 18/8 as a mixed number and simplify
        prompt: Each glass holds 3/8 liter of water. Ken fills 6 glasses. How many liters of water are in the 6 glasses?

    MM3-N05 | v3 | file only (never banked) | g5
        chain: line up tenths and hundredths -> subtract with a regroup into the tenths -> add with carries
        prompt: A pitcher has 2.75 liters of juice in it. Lee pours out 0.8 liter of the juice. Then his mom pours 1.45 liters more juice into the pitcher. How many liters of juice are i ...

    MM5-N03 | v5 | LIVE | g5
        chain: look at the hundredths digit of each number -> round each to the nearest tenth -> count the numbers that round to 4.7
        prompt: Look at these numbers: 4.643, 4.645, 4.648, 4.65, 4.651, 4.653, 4.655, 4.657, 4.704, 4.741, 4.752. How many of them round to 4.7 when they are rounded to the nearest tent ...

**Mechanical top 3:** MM4-N31 (0.15), MM4-N33 (0.15), MM4-N15 (0.13)

**Note:** No hit for this exact list, but comparing decimals by place value is grade-4/5 canon and MM4-N03 compares decimals with bounds. Weak because the ordering step is easy and the sum is a single addition.

## R18 — grade 8, 8.EE.A.1 — rating: medium

**Ask:** x^-2 = 1/49 and x is negative: x^3

**Chain:** a negative exponent means the reciprocal: x^2 = 49 -> the negative square root -> cube it

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `MM3-N27` ; `MM2-N17` ; `MMG-N15` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM2-N17 | v2 | file only (never banked) | g8
        chain: a negative exponent means the reciprocal: 2^-2 = 1/4 -> write 1/4 as 0.25 and subtract from 6
        prompt: Sam is asked to find 6 - 2^-2 and to write the answer as a decimal. What decimal should he write?

    MM4-N36 | v4 work stage0.pre-return.json | file only (never banked) | g8
        chain: negative exponent means reciprocal: 2/5 -> square the reciprocal: 4/25
        prompt: Write the value of (5/2)^-2 as a fraction or mixed number.

    MMG-N15 | v1 | file only (never banked) | g8
        chain: take the cube root of a negative decimal -> take the positive square root of a decimal -> subtract a positive number from a negative number
        prompt: Lena solved two equations. The solution of x^3 = -0.216 is x, and the positive solution of y^2 = 1.69 is y. When she subtracts y from x, what number does she get?

**Mechanical top 3:** MM4-N36 (0.43), MM3-N27 (0.40), MV2-N8-10 (0.34)

**Note:** MM3-N27 goes from a cube root to x^-2; R18 goes from x^-2 to x (with a sign condition) to x^3, the reverse direction plus a sign choice. MM2-N17 rewrites a negative exponent. FORM: -343 versus the sign error 343 share their digits; other errors (x = -1/7, 1/343) change form and cannot be options, so the author must find same-form errors.

## R19 — grade 6, 6.NS.B.3 — rating: medium

**Ask:** the number n for which dividing 7.2 by n gives the same result as multiplying 7.2 by 0.4

**Chain:** dividing by n equals multiplying by 1/n -> 1/n = 0.4 -> n = 2.5

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `same (result|value) as multiplying|dividing by&multiplying by` ; `reciprocal&decimal` — **5 hit(s)**

- N-chain MMG-N09 (v1, file only (never banked)): divide a negative decimal by a fraction using the reciprocal -> multiply two negative rational numbers in mixed forms -> subtract a negative number
- N-chain MM2-N17 (v2, file only (never banked)): a negative exponent means the reciprocal: 2^-2 = 1/4 -> write 1/4 as 0.25 and subtract from 6
- N-chain MM3-N27 (v3, file only (never banked)): find the cube root of a decimal -> square the decimal -> take the reciprocal for the negative exponent
- N-chain MM4-N36 (v4 work assembled.json, file only (never banked)): a negative exponent is the reciprocal of the positive power -> 2^3 = 8 -> multiply 75 by 1/8
- N-chain MB4-N8-05 (b4, withdrawn): decimal base to a negative exponent as a whole-number power of the reciprocal -> coefficient times a negative power -> zero exponent on a subtracted term -> combine the three terms

**Closest earlier MAP Number Systems items by my reading:**

    MMG-N05 | v1 | file only (never banked) | g6
        chain: amount for a whole = amount for the part divided by the part -> divide by a fraction by multiplying by its reciprocal
        prompt: Mia used 2 1/2 cups of flour to make 3/4 of a batch of muffins. At this rate, how many cups of flour are needed to make a full batch?

    MM4-N12 | v4 | file only (never banked) | g6
        chain: write the comparison as 15.84 / 0.75 -> move both decimal points two places and divide 1584 by 75
        prompt: A puppy weighs 15.84 pounds. A kitten weighs 0.75 pound. How many times as heavy as the kitten is the puppy?

    MM2-N07 | v2 | file only (never banked) | g6
        chain: servings = amount / serving size -> write 1 1/5 as 6/5 -> multiply by the reciprocal 3/2 and simplify
        prompt: A pitcher holds 1 1/5 liters of lemonade. One serving is 2/3 liter. How many servings of lemonade are in the pitcher?

**Mechanical top 3:** MV2-N56-12 (0.19), MMG-N09 (0.18), MV2-N8-07 (0.17)

**Note:** No hit for 'dividing by n equals multiplying by a decimal'. MMG-N05 divides by a fraction using the reciprocal. HUB: the natural wrong answers (0.4, 0.25, 25) form x10 or x4 pairs with the key 2.5, so the option set must avoid those pairs; that may leave too few real errors.

## R20 — grade 6, 6.NS.C.5 — rating: weak

**Ask:** a bird is 12.5 m above sea level and a fish 4.75 m below: how far the bird must descend to be at the fish's opposite height

**Chain:** the fish's height is -4.75 -> its opposite is 4.75 -> the bird's descent is 12.5 - 4.75

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `opposite&(height|elevation|depth)` ; `same distance (above|below)` — **6 hit(s)**

- live ssat 5bfcca31: A rectangular box is 12 inches long and 4 inches wide. The straight-line distance through the inside of the box from one corner to the opposite corner is 13 inches. What is the height of the box, in i (key 3)
- MAP prior MM2-G15 (map-math-g58-v2/stage0.assembled.json): A box for a rolled-up poster is shaped like a triangular prism. Each end of the box is a triangle with sides 16 centimeters, 10 centimeters, and 10 centimeters, and the height of the triangle from the
- MAP prior MM3-G13 (map-math-g58-v3): A rhombus has diagonals that are 24 centimeters and 18 centimeters long, and each of its four sides is 15 centimeters long. The height of the rhombus is the distance between two opposite sides, measur
- MAP prior f9bf8c47-0edb-424d-a205-c9ecf00c532a (DB map-math-g58-v3): A rhombus has diagonals that are 24 centimeters and 18 centimeters long, and each of its four sides is 15 centimeters long. The height of the rhombus is the distance between two opposite sides, measur
- N-chain MM3-N11 (v3 work stage0.pre-return.json, file only (never banked)): find 3/5 of 245 for the diver's depth -> see the two elevations are on opposite sides of 0 -> add the two distances from sea level
- N-chain MM4-N16 (v4 work assembled.json, file only (never banked)): see the elevations are on opposite sides of 0 -> add the absolute values 10.25 and 2.9 with the decimal points lined up

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N16 | v4 work stage0.pre-return.json | file only (never banked) | g6
        chain: find the least common multiple of 4, 6 and 9 -> take the multiple of it that lies between 115 and 150
        prompt: The students in a marching band can line up in equal rows of 4, in equal rows of 6, or in equal rows of 9, with no one left over each time. There are between 115 and 150  ...

    MM3-N11 | v3 | file only (never banked) | g6
        chain: find a fraction of the depth -> write the diver's elevation as a negative number -> add the distances on each side of sea level
        prompt: A submarine is 351 meters below sea level, so its elevation is -351 meters. A diver is at 4/9 of the submarine's depth. A seagull is flying 38 meters above sea level. How ...

    MV2-N56-24 | b1 | LIVE | g6
        chain: opposite of 7.5 is -7.5 -> move 1.5 right: B = -6 -> same side of 0: subtract the sizes
        prompt: Jin marks the opposite of 7.5 on a number line. From that mark he moves 1.5 units to the right and marks point B. He also marks point A at -0.5. How many units long is th ...

**Mechanical top 3:** MM3-N11 (0.24), MV2-N56-23 (0.14), MM5P-N04 (0.12)

**Note:** MM4-N16 and MM3-N11 add distances on opposite sides of 0; R20 takes the OPPOSITE of a depth as a height and subtracts. The arithmetic is one subtraction; weak.

## R21 — grade 5, 5.NF.B.4b — rating: weak

**Ask:** an area model for a mixed number times a mixed number: the sum of the two cross partial products (whole x fraction and fraction x whole)

**Chain:** split each mixed number into whole and fraction -> multiply each whole by the other fraction -> add the two cross products

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `partial product` ; `area model` — **8 hit(s)**

- N-chain MMG-N02 (v1, file only (never banked)): dividend = divisor x quotient + remainder -> multiply 24 x 35 with partial products -> add the remainder
- N-chain MM2-N01 (v2, file only (never banked)): standard algorithm, 46 over 37 -> partial product 46 x 7 with a carry -> partial product 46 x 30 with a carry -> add the partial products
- N-chain MM2-N06 (v2, file only (never banked)): multiply 475 by 22 with two partial products -> place the decimal point three places from the right
- N-chain MM2-N10 (v2, file only (never banked)): 3,276 / 24 = 136.5, so 136 full cases -> 136 x 9.65 by partial products -> add 1224 + 81.6 + 6.8
- N-chain MM3-N09 (v3, file only (never banked)): multiply the digits as whole numbers with partial products -> count decimal places to place the point
- N-chain MM5-N05 (v5, file only (never banked)): multiply 28 x 35 with both partial products -> subtract the empty seats -> regroup across the tens
- ... 2 more (rerun the query)

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N10 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: area = length x width -> write both mixed numbers as fractions -> multiply and write the product as a mixed number
        prompt: Mr. Ortiz is covering a lawn with sod. The lawn is shaped like a rectangle that measures 4 2/3 yards by 2 1/2 yards. How many square yards of sod does he need to cover th ...

    MM2-N01 | v2 | file only (never banked) | g5
        chain: standard algorithm, 46 over 37 -> partial product 46 x 7 with a carry -> partial product 46 x 30 with a carry -> add the partial products
        prompt: A school orders 37 boxes of crayons. Each box holds 46 crayons. How many crayons does the school order in all?

    MM5P-N02 | v5p | file only (never banked) | g5
        chain: convert mixed numbers and multiply for the area -> rename a mixed number in twelfths -> subtract with regrouping
        prompt: A rectangular garden is 2 1/4 meters long and 2 1/3 meters wide. Ben covers 1 2/3 square meters of the garden with stones. How many square meters of the garden are not co ...

**Mechanical top 3:** MMG-N02 (0.26), MM4-N05 (0.26), MM4-N10 (0.23)

**Note:** Partial products appear in MAP only as steps toward a full product (MM4-N10, MM2-N01). Asking for the two cross partial products is new as an ask, but a checker may call it the same chain stopped early; weak.

## R22 — grade 7, 7.NS.A.2b — rating: medium

**Ask:** the integer n that makes -24/n equal to 3.6 / (-0.6)

**Chain:** evaluate the signed decimal quotient -> set -24/n equal to it -> solve for n with the sign rule

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `= .* ÷ \(?-|same (value|quotient) as` ; `-24/n|/n =` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM4-N23 | v4 | file only (never banked) | g7
        chain: sign of a quotient of two negatives -> multiply by the reciprocal of the divisor
        prompt: Find the quotient (-2 1/4) ÷ (-3/5). Write your answer as a mixed number.

    MM4-N26 | v4 work stage0.pre-return.json | file only (never banked) | g7
        chain: two signed decimal products -> add two negatives
        prompt: Without a calculator, Theo finds the value of -3.5(1.6) + 0.4(-5). What value should he get?

    MM4-N27 | v4 work stage0.pre-return.json | file only (never banked) | g7
        chain: difference with regrouping and a negative result -> negative times negative decimal product
        prompt: Lucia simplifies the expression -1.5(1.36 - 4.2) without a calculator. What value does she get if she works correctly?

**Mechanical top 3:** MM4-N23 (0.15), MB2-N78-03 (0.14), MM2-N12 (0.14)

**Note:** No hit. MM4-N23/-26/-27 evaluate signed decimal quotients; R22 then uses the value to solve -24/n = value. 'Missing number' variant.

## R23 — grade 8, 8.NS.A.2 — rating: weak

**Ask:** the sum of the whole-number parts of four square roots (sqrt 15, sqrt 24, sqrt 35, sqrt 48): roots just under a perfect square

**Chain:** bracket each root between consecutive whole numbers -> take the lower whole number (not the rounded one) -> add

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `whole-number part|integer part` ; `between&consecutive&√|between which two` — **3 hit(s)**

- N-chain MM2-N15 (v2 first-written, file only (never banked)): add the whole-number parts of three negatives -> rename thirds, eighths and sixths as 24ths -> keep each fraction part negative
- N-chain MM3-N01 (v3 work stage0.pre-return.json, file only (never banked)): multiply the whole-number part by 3 -> multiply the fraction part by 3 -> simplify and combine
- N-chain MMG-N12 (v1, file only (never banked)): locate √5 between consecutive whole numbers and refine to tenths -> multiply the approximation by 2

**Closest earlier MAP Number Systems items by my reading:**

    MM4-N34 | v4 | file only (never banked) | g8
        chain: place -√13 between -4 and -3 -> place √75 between 8 and 9 -> count the integers from -3 to 8, including 0
        prompt: On a number line, point A is at -√13 and point B is at √75. How many integers are on the number line between point A and point B?

    MM3-N26 | v3 | file only (never banked) | g8
        chain: square each decimal bound -> find the whole numbers strictly between the squares -> count them
        prompt: For how many whole numbers n is the square root of n greater than 3.5 and less than 6.6?

    MM4-N39 | v4 | file only (never banked) | g8
        chain: approximate √50 just above 7 -> approximate √30 just below 5.5 -> subtract the approximations and round only at the end
        prompt: Without a calculator, Lia wants to estimate √50 - √30. Which of these decimals is closest to √50 - √30?

**Mechanical top 3:** MM3-N26 (0.21), MM5-N37 (0.20), MMG-N12 (0.19)

**Note:** MM4-N34 brackets roots between integers and counts; MM3-N26 squares decimal bounds and counts. Summing the lower whole numbers of four roots just under perfect squares (the trap is rounding up) is a small step from both; weak. FORM: two-digit integer keys need errors ending in the same digit (rounding up changes the sum by 4 here, which breaks it unless one root rounds the other way).

## R24 — grade 7, 7.NS.A.1 — rating: WEAKEST

**Ask:** the number that must be added to (-2 3/8 + 1.75) to make the sum zero

**Chain:** combine the signed mixed number and decimal -> take the additive inverse of the result

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `sum (is|equal(s)?) (zero|0)|added to .* to get 0|makes the sum 0` ; `additive inverse` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM2-N12 | v2 | file only (never banked) | g7
        chain: rewrite minus a negative as plus -> add a positive to a negative decimal (borrow) -> add two negatives (carry)
        prompt: Evaluate the expression -6.4 - (-2.7) + (-1.85).

    MM5-N23 | v5 | file only (never banked) | g7
        chain: -90 + 15 -> subtracting -40 is adding 40 -> -75 + 40
        prompt: In a card game, a player's score is the total of the points on all the cards in her pile. Rosa's score is -90 points. She adds a card worth 15 points to her pile. Then sh ...

    MMG-N10 | v1 | file only (never banked) | g7
        chain: write each stage as a signed total change -> combine the totals into a net change -> undo the net change by subtracting a negative
        prompt: The price of one share of a stock went down $1.15 each day for 8 days in a row. Then it went up $0.45 each day for the next 4 days. After these changes, the price was $36 ...

**Mechanical top 3:** MM5-N25 (0.21), MM4-N24 (0.20), MB4-N7-02 (0.17)

**Note:** WEAKEST: a signed sum followed by its additive inverse is the saturated signed-sum family with one extra step.

## R25 — grade 8, 8.NS.A.1 — rating: WEAKEST

**Ask:** 1 minus a repeating decimal (1 - 0.363636...) as a fraction

**Chain:** write the repeating decimal over 99 and simplify -> subtract from 1

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `1 - 0\.|from 1&repeat` ; `repeat&fraction` — **6 hit(s)**

- live isee 24fbd00c: The decimal 0.2454545... has a 2 in the tenths place, followed by the block 45 repeating forever. When this decimal is written as a fraction in lowest terms, what is the numerator? (key 27)
- live isee 3b775d60: Ana writes each of the fractions 1/60, 2/60, 3/60, ..., 59/60 as a decimal. How many of these 59 decimals terminate (come to an end) instead of repeating forever? (key 19)
- live isee 7209630d: The fraction 3/7 written as a decimal is 0.428571428571..., where the block 428571 repeats forever. What is the 100th digit to the right of the decimal point? (key 5)
- live ssat bde1402b: Each fraction below is in lowest terms. Which one is equal to a decimal that ends rather than repeating forever? (key 7/40)
- MAP prior MV2-N8-14 (map-math-v2 b1 LIVE): In the decimal 0.3484848..., the digits 48 repeat forever and the 3 does not repeat. When this decimal is written as a fraction a/b in simplest form, what is a + b?
- N-chain MV2-N8-14 (b1, LIVE): multiply by 1000 and by 10 -> subtract to get 990n = 345 -> simplify 345/990 to 23/66 -> add numerator and denominator

**Closest earlier MAP Number Systems items by my reading:**

    MV2-N8-14 | b1 | LIVE | g8
        chain: multiply by 1000 and by 10 -> subtract to get 990n = 345 -> simplify 345/990 to 23/66 -> add numerator and denominator
        prompt: In the decimal 0.3484848..., the digits 48 repeat forever and the 3 does not repeat. When this decimal is written as a fraction a/b in simplest form, what is a + b?

    MM2-N19 | v2 | file only (never banked) | g8
        chain: 2^-2 = 1/4 and 3^-2 = 1/9 -> 3 x 1/4 = 3/4 -> add 3/4 + 1/9 in 36ths
        prompt: Write the exact value of 3 x 2^-2 + 3^-2 in simplest form.

    MM4-N35 | v4 | file only (never banked) | g8
        chain: simplify each root (a perfect square or cube under it, or a quotient of roots) -> repeating decimals are rational -> endless non-repeating decimals are irrational
        prompt: Mr. Ortiz writes these eight numbers on the board: √0.49, √0.4, π, ∛(-0.027), √20 ÷ √5, 0.4111... (the digit 1 repeats forever), 0.1010010001... (the runs of 0s keep gett ...

**Mechanical top 3:** MV2-N8-14 (0.24), MM2-N17 (0.18), MM3-N27 (0.16)

**Note:** WEAKEST: repeating decimal to a fraction, then one subtraction; MV2-N8-14 and MM2-N19 (first-written) cover both steps.

## R26 — grade 5, 5.NF.B.5 — rating: WEAKEST

**Ask:** which of two fraction-times-mixed-number products is larger, and by how much (5/6 x 3 1/2 vs 7/6 x 2 1/2)

**Chain:** multiply each fraction by its mixed number -> common denominator -> subtract

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `x 3 1/2|x 2 1/2` ; `which is (greater|larger)&/` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MV2-N56-06 | b1 | LIVE | g5
        chain: multiply a mixed number by a mixed number -> multiply a mixed number by a fraction -> subtract fifths and fifteenths with regrouping
        prompt: A photo is 2 4/5 inches wide. Ana prints a large copy that is 1 1/2 times as wide as the photo. She also prints a small copy that is 1/3 as wide as the photo. How many in ...

    MM4-N06 | v4 work stage0.pre-return.json | file only (never banked) | g5
        chain: find 5/6 of 120 -> find 3/8 of 120 -> subtract the two amounts
        prompt: A bookshelf has spaces for 120 books. On Monday the shelf was 5/6 full. On Tuesday the shelf was 3/8 full. How many fewer books were on the shelf on Tuesday than on Monda ...

    MV2-N56-02 | b1 | LIVE | g5
        chain: 8 x 7/8 = Ana's distance -> 2/5 of Ana's distance = Ben's distance -> subtract
        prompt: A park trail is 7/8 mile around. Ana walks around it 8 times. Ben walks 2/5 as far as Ana. How many miles farther does Ana walk than Ben?

**Mechanical top 3:** MV2-N56-06 (0.28), MM4-N05 (0.24), MMG-N01 (0.22)

**Note:** WEAKEST: two fraction-times-mixed products then subtract is MV2-N56-06's two steps plus MM4-N06's comparison.

## R27 — grade 6, 6.NS.B.4 — rating: medium

**Ask:** two runners lap a track in 3/4 minute and 5/6 minute: the first time after the start that both are back at the start

**Chain:** write both lap times over 12 -> least common multiple of the numerators 9 and 10 -> back to minutes

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `laps? in \d/\d|every \d/\d (minute|hour)` ; `least common multiple&/` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM4-N17 | v4 | file only (never banked) | g6
        chain: the lights flash together at the common multiples of 6 and 10 -> find the least common multiple (30) -> take the third multiple after the start
        prompt: A sign has two lights. The red light flashes every 6 seconds, and the blue light flashes every 10 seconds. Both lights flash at the same moment when the sign is turned on ...

    MMG-N06 | v1 | file only (never banked) | g6
        chain: recognize the least common multiple -> LCM of 12 and 8 is 24 -> convert items to packs of each kind and add
        prompt: Paper plates are sold in packs of 12, and paper cups are sold in packs of 8. Mr. Diaz wants to buy exactly the same number of plates as cups, and he wants to buy as few p ...

    MM3-N14 | v3 | file only (never banked) | g6
        chain: find the least common multiple of 15 and 25 -> count the multiples of 75 from 75 to 300 minutes -> leave out the first moment and keep the one at 300
        prompt: Two ferries leave a dock at the same moment. After that, Ferry A leaves again once in 15 minutes, and Ferry B leaves again once in 25 minutes. Not counting the first mome ...

**Mechanical top 3:** MM3-N14 (0.27), MM4-N17 (0.24), MM4-N16 (0.21)

**Note:** No hit for an LCM of fractional times. MAP LCM items (MM4-N17, MMG-N06, MM3-N14) use whole-number periods. HUB risk: the natural wrong answers are multiples of the key (15 vs 7.5) or of the periods; the option set must avoid x2 pairs with the key.

## R28 — grade 8, 8.EE.A.1 — rating: WEAKEST

**Ask:** how many times as large 2^2 is as 2^-3

**Chain:** quotient of powers with the same base subtracts exponents -> 2^5 = 32

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `times as (large|great)&\^` ; `how many times&\^-` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MV2-N8-07 | b1 | withdrawn | g8
        chain: quotient of powers: subtract exponents 3 - (-3) = 6 -> 4^6 = 4096 -> multiply by 5
        prompt: Work out 5 x 4^3 ÷ 4^-3, dividing by the power with the negative exponent, and give the result as a whole number.

    MV2-N8-12 | b1 | withdrawn | g8
        chain: add exponents 5 + (-2) = 3 -> 2^3 = 8 -> multiply by 5
        prompt: Jada works out the product 5 x 2^5 x 2^-2 by combining the powers of 2 first. What whole number does she get?

    MM2-N20 | v2 | file only (never banked) | g8
        chain: 2^-2 x 2^6 = 2^4 -> (2^4)^3 = 2^12 -> divide by (2^2)^2 = 2^4
        prompt: Ravi simplifies (2^-2 x 2^6)^3 / (2^2)^2 using the properties of exponents. What is the value of the expression?

**Mechanical top 3:** MM4-N38 (0.30), MV2-N8-07 (0.30), MM5P-N10 (0.22)

**Note:** WEAKEST: the quotient rule with a negative exponent, asked as 'how many times as large', is MV2-N8-07's chain (subtract exponents, evaluate).

## R29 — grade 5, 5.NBT.B.7 — rating: medium

**Ask:** two items cost a printed decimal total and one costs a printed decimal amount more than the other: the cheaper price

**Chain:** subtract the difference from the total -> halve what is left (decimal division by 2)

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `more than the other&total|costs \$?\d+\.\d+ more than` ; `together&more than the other` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MV2-N56-05 | b1 | LIVE | g5
        chain: divide a decimal by a whole number -> subtract a decimal from one share
        prompt: Ms. Ortiz has a bag with 6.3 kilograms of rice. She splits the rice equally into 3 jars. Then she takes 0.45 kilogram of rice out of one jar to cook dinner. How many kilo ...

    MM3-N04 | v3 | file only (never banked) | g5
        chain: subtract the pen from the total -> divide by the number of notebooks -> multiply the unit price by 7
        prompt: Mia paid $12.40 for 4 notebooks and 1 pen. The pen cost $1.80, and the notebooks all cost the same amount. At that price, how much would 7 of these notebooks cost, in dol ...

    MB4-N5-09 | b4 | LIVE | g5
        chain: subtract the part kept back -> divide the rest by the number of sharers (Ana plus 2 cousins = 3) -> add one share to Ana's amount
        prompt: Grandpa has a 5.7-kilogram bag of birdseed. He keeps 0.9 kilogram for himself and shares the rest equally among Ana and Ana's 2 cousins. Ana already had 2.85 kilograms of ...

**Mechanical top 3:** MM3-N04 (0.26), MM5P-N01 (0.25), MM5P-N04 (0.22)

**Note:** No hit for the sum-and-difference problem with decimals. MV2-N56-05 divides then subtracts; here subtract then halve. It may be judged an Operations item (two unknowns from a sum and a difference) rather than Number Systems; the decimal regrouping is the 5.NBT content.

## R30 — grade 5, 5.NBT.B.5 — rating: weak

**Ask:** the missing factor in 24 x 35 = 12 x n (halve one factor, double the other)

**Chain:** see 12 is half of 24 -> the other factor doubles -> n = 70 (or compute 840 / 12)

**Searches run** (dump-b4 live ISEE/SSAT/MAP + MAP prior + earlier-N-chains): `x n =|= \d+ x n|missing factor` ; `double&half&product` — **0 hit(s)**


**Closest earlier MAP Number Systems items by my reading:**

    MM2-N01 | v2 | file only (never banked) | g5
        chain: standard algorithm, 46 over 37 -> partial product 46 x 7 with a carry -> partial product 46 x 30 with a carry -> add the partial products
        prompt: A school orders 37 boxes of crayons. Each box holds 46 crayons. How many crayons does the school order in all?

    MM5-N05 | v5 | file only (never banked) | g5
        chain: multiply 28 x 35 with both partial products -> subtract the empty seats -> regroup across the tens
        prompt: A school gym has 28 rows of bleacher seats with 35 seats in each row. At a basketball game, 186 of the seats were empty and every other seat had one person in it. How man ...

    MMG-N02 | v1 | file only (never banked) | g5
        chain: dividend = divisor x quotient + remainder -> multiply 24 x 35 with partial products -> add the remainder
        prompt: Kai divided a whole number by 24. His answer was 35 R17, which means the quotient was 35 and the remainder was 17. What number did Kai divide by 24?

**Mechanical top 3:** MM4-N01 (0.17), MM4-N03 (0.14), MM2-N09 (0.13)

**Note:** No hit. Doubling/halving to find a missing factor is a property-of-operations item; the arithmetic fallback (840 / 12) is a single quotient, so the bracket rule applies. 'Missing number' variant; weak.

---

## The 13 round-1 BORDERLINE candidates: which can be made clearly distinct

| round-1 id | can it be made clearly distinct? | how |
|---|---|---|
| C02 | no | The new parts (fractional sides, subtracting the rectangle's area) sit on SSAT 1478005f's whole chain. |
| C03 | no | Sums instead of products is a surface change on MB4-N5-07 / MM3-N08. |
| C05 | no | Distance to a line is a number-line distance; MV2-N7-03 and the reflection items already do it. R06 (axes -> coordinates, the reverse direction) is the distinct coordinate item. |
| C07 | no | The scale-factor story does not change the quotient-then-multiply chain (MM4-N29). |
| C10 | yes | Print the expansion in the stem (no long division) and ask for the digit sum of the first n digits: the chain becomes block counting + summing, which neither the nth-digit items nor MAP have. Do not slot with C09. |
| C13 | yes, as R09 | Compose the reciprocal, opposite and absolute value on ONE number (order matters) instead of applying one operator to each of two numbers. |
| C17 | yes, as R11 | Use ONE repeating decimal as a multiplier of a whole quantity instead of combining two conversions (SSAT a175b647 divides them). |
| C18 | no | MM2-N19 (first-written) is the same repeating-minus-terminating chain. |
| C19 | no | MM4-N33 stage0 approximates and adds two roots; asking for the whole number below is a different read of the same chain. |
| C21 | partly | The substitution step is new; using a negative-exponent condition instead of a cube root (R18) separates it further from MMG-N15. |
| C23 | no | ISEE cf75bfb2 already solves through a power of a power. |
| C26 | maybe | Compare the two unit-fraction quotients by DIVISION (how many times as large) instead of subtraction: two quotients then a quotient of quotients is not in MV2-N56-15/-17. Still borderline; a checker should judge. |
| C28 | no | MMG-N09 has the divide-then-multiply-then-subtract sequence. |
