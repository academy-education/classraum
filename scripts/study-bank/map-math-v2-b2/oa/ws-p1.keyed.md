# Items for review, KEYED (24)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB2-O5-12

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: In a card game, Rosa's final score is 252 - [4 x (23 - 3) - 32 / 2]. What is Rosa's final score?

A. 188
B. 248
C. 228
D. 298

KEY: A (188)

Worked solution: Start with the parentheses: 23 - 3 = 20. Inside the bracket, multiply and divide before subtracting: 4 x 20 = 80 and 32 / 2 = 16, so the bracket is 80 - 16 = 64. Then 252 - 64 = 188.

Key computation (JS): `return 252 - (4 * (23 - 3) - 32 / 2)`

Distractors:
- B (248): Uses 23 - 3 = 20 without multiplying by 4: 20 - 16 = 4, and 252 - 4 = 248. | computation: `return 252 - ((23 - 3) - 32 / 2)`
- C (228): Inside the bracket finds 80 - 32 = 48 and then divides by 2 to get 24, so 252 - 24 = 228. | computation: `return 252 - (4 * (23 - 3) - 32) / 2`
- D (298): Subtracts 252 - 64 by borrowing twice without crossing out: 12 - 4 = 8, 15 - 6 = 9, and the 2 hundreds stay: 298. | computation: `const d = 4 * (23 - 3) - 32 / 2; const u = 12 - d % 10, t = 15 - Math.floor(d / 10); return 2 * 100 + t * 10 + u`

---

## MB2-O6E-08

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In a video game, a gold chest is worth 9^3 coins and a silver chest is worth 5^3 coins. How many more coins is a gold chest worth than a silver chest?

A. 704
B. 604
C. 714
D. 486

KEY: B (604)

Worked solution: Find each power first. 9^3 = 9 x 9 x 9 = 81 x 9 = 729. 5^3 = 5 x 5 x 5 = 25 x 5 = 125. Then subtract: 729 - 125 = 604. A gold chest is worth 604 more coins.

Key computation (JS): `return 9 ** 3 - 5 ** 3;`

Distractors:
- A (704): The student counts the exponent as the number of multiplication signs and writes 5 x 5 x... as 25, so 729 - 25 = 704. | computation: `return 9 ** 3 - 5 ** 2;`
- C (714): The student works out 5^3 as 5 x 3 = 15, so 729 - 15 = 714. | computation: `return 9 ** 3 - 5 * 3;`
- D (486): The student finds 3^5 = 243 instead of 5^3 = 125, so subtracts too much: 729 - 243 = 486. | computation: `return 9 ** 3 - 3 ** 5;`

---

## MB2-O7R-06

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A bike shop sold a helmet for $90. The shop raised the price of the helmet by 20%. Later, the shop put the helmet on sale for 30% off the raised price. How many dollars less than the original $90 price is the sale price?

A. 11.25
B. 13
C. 14.4
D. 9

KEY: C (14.4)

Worked solution: Raised price: 90 + 0.20 x 90 = 108 dollars. Sale price: 108 - 0.30 x 108 = 108 - 32.40 = 75.60 dollars. The sale price is 90 - 75.60 = 14.40 dollars less than the original price.

Key computation (JS): `const raised = 90 * 1.2; const sale = raised * 0.7; return Math.round((90 - sale) * 100) / 100;`

Distractors:
- A (11.25): The student finds the raised price by dividing 90 by 0.8 to get 112.50, takes 30% off to get 78.75, and finds 90 - 78.75. | computation: `const raised = 90 / 0.8; return Math.round((90 - raised * 0.7) * 100) / 100;`
- B (13): The student raises the price by 20 dollars instead of 20% of 90 (18 dollars), takes 30% off $110 to get $77, and finds 90 - 77. The raise is too big, so the dollars-less amount comes out too small. | computation: `const raised = 90 + 20; return Math.round((90 - raised * 0.7) * 100) / 100;`
- D (9): The student treats a 20% raise followed by 30% off as a single 10% decrease of $90, leaving out that the 30% is taken from the larger raised price. | computation: `return Math.round(90 * (0.30 - 0.20) * 100) / 100;`

---

## MB2-O5-01

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: On a puzzle sheet, Noor has to find the value of 32 + (54 - 20) / 2. What value should Noor get?

A. 39
B. 33
C. 76
D. 49

KEY: D (49)

Worked solution: Work inside the parentheses first: 54 - 20 = 34. Divide next: 34 / 2 = 17. Add last: 32 + 17 = 49.

Key computation (JS): `return 32 + (54 - 20) / 2`

Distractors:
- A (39): Divides 54 by 2 to get 27 but subtracts the 20 without dividing it: 32 + 27 - 20 = 39. | computation: `return 32 + 54 / 2 - 20`
- B (33): Finds 54 - 20 = 34, adds 32 to get 66, and only then divides: 66 / 2 = 33. | computation: `return (32 + (54 - 20)) / 2`
- C (76): Reads 32 + 54 - 20 / 2 with no parentheses: 20 / 2 = 10, so 32 + 54 - 10 = 76. | computation: `return 32 + 54 - 20 / 2`

---

## MB2-O5-14

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Pattern A starts at 39, and each number after that is 3 more than the number before it. Each number in Pattern B is 30 less than its partner in Pattern A. (The first numbers of the two patterns are partners, the second numbers are partners, and so on.) The number 72 is in Pattern B. Counting 39 as the first number of Pattern A, what is the position number of the partner of 72?

A. 22
B. 34
C. 12
D. 21

KEY: A (22)

Worked solution: Each B number is 30 less than its partner, so the partner of 72 is 72 + 30 = 102. In Pattern A, 102 is 102 - 39 = 63 more than the first number, and 63 / 3 = 21 steps of 3. Twenty-one steps after the first number is position 21 + 1 = 22.

Key computation (JS): `const a = 72 + 30; return (a - 39) / 3 + 1`

Distractors:
- B (34): Finds the partner 72 + 30 = 102 and divides by the step: 102 / 3 = 34, forgetting that Pattern A starts at 39. | computation: `return (72 + 30) / 3`
- C (12): Looks for 72 itself in Pattern A: 72 - 39 = 33, which is 11 steps, so position 12. | computation: `return (72 - 39) / 3 + 1`
- D (21): Finds 102 - 39 = 63 and 63 / 3 = 21 steps after the first number, and gives 21 instead of 22. | computation: `return (72 + 30 - 39) / 3`

---

## MB2-O7R-16

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A family orders 4 meals that cost $18.75 each and 2 drinks that cost $4.50 each. A sales tax of 7% is charged on the cost of the food and drinks. The family also leaves a tip of 15% of the cost of the food and drinks before tax. How many dollars does the family pay in all, including the tax and the tip?

A. 104.88
B. 102.48
C. 91.14
D. 103.36

KEY: B (102.48)

Worked solution: Food and drinks: 4 x 18.75 + 2 x 4.50 = 75 + 9 = 84 dollars. Tax: 0.07 x 84 = 5.88 dollars. Tip (on the pre-tax 84): 0.15 x 84 = 12.60 dollars. Total: 84 + 5.88 + 12.60 = 102.48 dollars.

Key computation (JS): `const f = 4 * 18.75 + 2 * 4.5; return Math.round((f + 0.07 * f + 0.15 * f) * 100) / 100;`

Distractors:
- A (104.88): The student computes the tax correctly but adds a tip of 15 dollars instead of 15% of $84. | computation: `const f = 4 * 18.75 + 2 * 4.5; return Math.round((f + 0.07 * f + 15) * 100) / 100;`
- C (91.14): The student totals 84 and the tax 5.88 correctly but converts the 15% tip to 0.015, so the tip is only $1.26. | computation: `const f = 4 * 18.75 + 2 * 4.5; return Math.round((f + 0.07 * f + 0.015 * f) * 100) / 100;`
- D (103.36): The student adds the tax first ($89.88) and then takes 15% of $89.88 for the tip, though the tip is on the cost before tax. | computation: `const f = 4 * 18.75 + 2 * 4.5; const withTax = Math.round(f * 1.07 * 100) / 100; const tip = Math.round(withTax * 0.15 * 100) / 100; return Math.round((withTax + tip) * 100) / 100;`

---

## MB2-O7R-01

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: At the same time of day, the length of the shadow of an object standing straight up on flat ground is proportional to the object's height. A class measured three poles at the same time and recorded the results. Height of pole (feet): 6, 10, 16. Length of shadow (feet): 7.5, 12.5, 20. At that time, how long is the shadow of a 26-foot tree standing straight up on the same flat ground, in feet?

A. 27.5
B. 31.2
C. 32.5
D. 52

KEY: C (32.5)

Worked solution: Find the constant of proportionality: shadow / height = 7.5 / 6 = 1.25. Check: 12.5 / 10 = 1.25 and 20 / 16 = 1.25. So shadow = 1.25 x height. For the 26-foot tree: 1.25 x 26 = 32.5 feet.

Key computation (JS): `const k = 7.5 / 6; return Math.round(k * 26 * 100) / 100;`

Distractors:
- A (27.5): The student sees the 6-foot pole has a shadow 1.5 feet longer and adds 1.5 feet to 26, treating the relationship as "add a fixed amount" instead of "multiply by a fixed number". | computation: `return 26 + (7.5 - 6);`
- B (31.2): The student divides 7.5 by 6, drops the final digit to get 1.2, and multiplies 1.2 x 26. | computation: `return Math.round(1.2 * 26 * 100) / 100;`
- D (52): The student forms the ratio from mismatched cells (the 20-foot shadow over the 10-foot height), gets 2, and doubles 26. | computation: `return (20 / 10) * 26;`

---

## MB2-O7E-16

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Lucia spent 3/8 of her money on a phone case. Then she spent $3.65 on a snack. After that, she had $20.05 left. How much money did Lucia have at first?

A. 35.73
B. 63.20
C. 26.24
D. 37.92

KEY: D (37.92)

Worked solution: Before the snack she had 20.05 + 3.65 = 23.70 dollars. After spending 3/8 of her money on the case she had 5/8 of it left, so 5/8 of her money is 23.70. Her money was 23.70 / (5/8) = 23.70 x 8/5 = 37.92 dollars. Check: 3/8 of 37.92 is 14.22; 37.92 - 14.22 = 23.70; 23.70 - 3.65 = 20.05.

Key computation (JS): `return (20.05 + 3.65) / (5 / 8)`

Distractors:
- A (35.73): The student divides the 20.05 left by 5/8 to get 32.08 and only then adds the 3.65, so the snack is never scaled up with the rest. | computation: `return 20.05 / (5 / 8) + 3.65`
- B (63.20): The student treats 23.70 as 3/8 of her money (the part spent) and computes 23.70 / (3/8) = 63.20. | computation: `return (20.05 + 3.65) / (3 / 8)`
- C (26.24): The student works backward but takes the snack off again: 20.05 - 3.65 = 16.40, then 16.40 / (5/8) = 26.24. | computation: `return (20.05 - 3.65) / (5 / 8)`

---

## MB2-O5-03

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Mrs. Lee has 522 sheets of paper. Mr. Kim uses 260 sheets of paper for a project. Mrs. Lee uses 110 fewer sheets than Mr. Kim for her project. How many sheets of paper does Mrs. Lee have left?

A. 372
B. 432
C. 472
D. 412

KEY: A (372)

Worked solution: Mrs. Lee uses 110 fewer sheets than Mr. Kim: 260 - 110 = 150 sheets. She started with 522, so she has 522 - 150 = 372 sheets left. As one expression: 522 - (260 - 110) = 372.

Key computation (JS): `return 522 - (260 - 110)`

Distractors:
- B (432): In 522 - 150 the tens column is 2 - 5, so the student takes 5 - 2 = 3 instead of regrouping: 432. | computation: `const d = 260 - 110; return (5 - Math.floor(d / 100)) * 100 + Math.abs(2 - Math.floor(d / 10) % 10) * 10 + (2 - d % 10)`
- C (472): Works 522 - 150: borrows to make 12 - 5 = 7 tens but leaves the 5 hundreds as 5, so 5 - 1 = 4 hundreds: 472. | computation: `const d = 260 - 110; const h = 5 - Math.floor(d / 100), t = 12 - Math.floor(d / 10) % 10, u = 2 - d % 10; return h * 100 + t * 10 + u`
- D (412): Reads "110 fewer" as the number of sheets Mrs. Lee uses and finds 522 - 110 = 412, never working out 260 - 110. | computation: `return 522 - 110`

---

## MB2-O6R-06

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A painter mixes two shades of green paint. In Shade A, the ratio of yellow paint to blue paint is 4 to 5. In Shade B, the ratio of yellow paint to blue paint is 1 to 4. She makes each shade with 60 liters of blue paint. How many more liters of yellow paint does she use for Shade A than for Shade B?

A. 36
B. 33
C. 44
D. 47

KEY: B (33)

Worked solution: Shade A: 60 liters of blue is 12 groups of 5 liters, so the yellow is 12 x 4 = 48 liters. Shade B: 60 liters of blue is 15 groups of 4 liters, so the yellow is 15 x 1 = 15 liters. The difference is 48 - 15 = 33 liters.

Key computation (JS): `return String(60 / 5 * 4 - 60 / 4 * 1);`

Distractors:
- A (36): The student finds 60 / 5 = 12 groups for Shade A and reuses 12 groups for Shade B, so Shade B's yellow is 12 x 1 = 12 instead of 15, and 48 - 12 = 36. | computation: `return String(60 / 5 * 4 - 60 / 5 * 1);`
- C (44): The student reasons that blue went up by 55 liters (5 to 60), so yellow also goes up by 55 (4 to 59), and subtracts Shade B's correct 15: 59 - 15 = 44. | computation: `return String((4 + (60 - 5)) - 60 / 4 * 1);`
- D (47): The student scales Shade A to 48 liters but subtracts Shade B's ratio number, 1 liter, without scaling it to 60 liters of blue. | computation: `return String(60 / 5 * 4 - 1);`

---

## MB2-O6E-14

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two input-output tables each follow a rule. In each table, the output changes by the same amount every time the input goes up by 1. In Table A, the inputs 1, 2, 3, and 4 give the outputs 6, 19, 32, and 45. In Table B, the inputs 1, 2, 3, and 4 give the outputs 31, 39, 47, and 55. When the input is 21, how much greater is the output of Table A than the output of Table B?

A. 89
B. 95
C. 75
D. 105

KEY: C (75)

Worked solution: Table A goes up by 13 each time. Going back one step from input 1 gives 6 - 13 = -7, so the rule is output = 13 x input - 7. At input 21: 13 x 21 - 7 = 273 - 7 = 266. Table B goes up by 8 each time. Going back one step gives 31 - 8 = 23, so the rule is output = 8 x input + 23. At input 21: 8 x 21 + 23 = 168 + 23 = 191. The difference is 266 - 191 = 75.

Key computation (JS): `const A = 13 * 21 - 7, B = 8 * 21 + 23; return A - B;`

Distractors:
- A (89): Going back from 6 by 13, the student writes 13 - 6 = 7 and uses output = 13 x input + 7, so A comes out 14 too big: 280 - 191 = 89. | computation: `const A = 13 * 21 + 7, B = 8 * 21 + 23; return A - B;`
- B (95): The student starts at input 4 and adds the step 21 times: 45 + 273 = 318 and 55 + 168 = 223, so 318 - 223 = 95. | computation: `const A = 45 + 13 * 21, B = 55 + 8 * 21; return A - B;`
- D (105): The student writes output = 13 x input and output = 8 x input, so finds 273 - 168 = 105. | computation: `const A = 13 * 21, B = 8 * 21; return A - B;`

---

## MB2-O6E-16

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A table top is shaped like a hexagon. Two of its sides are each 1.4 feet long. Three other sides are each 1.15 feet longer than one of those two sides. The sixth side is x feet long. The perimeter of the table top is 14.1 feet. How long is the sixth side, in feet?

A. 7.85
B. 5.95
C. 2.35
D. 3.65

KEY: D (3.65)

Worked solution: Each of the three longer sides is 1.4 + 1.15 = 2.55 feet. Add the five known sides: 3 x 2.55 + 2 x 1.4 = 7.65 + 2.8 = 10.45 feet. The perimeter gives x + 10.45 = 14.1, so x = 14.1 - 10.45 = 3.65. The sixth side is 3.65 feet long.

Key computation (JS): `const known = 3 * (1.4 + 1.15) + 2 * 1.4; return Math.round((14.1 - known) * 100) / 100;`

Distractors:
- A (7.85): The student reads '1.15 feet longer' as '1.15 feet long': 3 x 1.15 + 2.8 = 6.25, so x = 14.1 - 6.25 = 7.85. | computation: `const known = 3 * 1.15 + 2 * 1.4; return Math.round((14.1 - known) * 100) / 100;`
- B (5.95): The student takes five sides of 1.4 and adds 1.15 one time: 7 + 1.15 = 8.15, so x = 14.1 - 8.15 = 5.95. | computation: `const known = 5 * 1.4 + 1.15; return Math.round((14.1 - known) * 100) / 100;`
- C (2.35): The student sees 'hexagon' and 'perimeter' and finds one side as 14.1 / 6 = 2.35, ignoring the given side lengths. | computation: `return Math.round(14.1 / 6 * 100) / 100;`

---

## MB2-O6E-01

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: An artist makes mosaic designs out of small square tiles. Design number n uses 5n^2 + 9 tiles. How many tiles does design number 6 use?

A. 189
B. 909
C. 225
D. 69

KEY: A (189)

Worked solution: Put 6 in for n. First find the power: 6^2 = 6 x 6 = 36. Then multiply: 5 x 36 = 180. Then add: 180 + 9 = 189. Design number 6 uses 189 tiles.

Key computation (JS): `const n = 6; return 5 * n ** 2 + 9;`

Distractors:
- B (909): The student treats 5n^2 as (5n)^2, so finds 30 x 30 = 900 and adds 9. | computation: `const n = 6; return (5 * n) ** 2 + 9;`
- C (225): The student adds 36 + 9 = 45 first and then multiplies by 5, ignoring that multiplication comes before addition. | computation: `const n = 6; return 5 * (n ** 2 + 9);`
- D (69): The student works out 6^2 as 6 x 2 = 12, then 5 x 12 + 9 = 69. | computation: `const n = 6; return 5 * (2 * n) + 9;`

---

## MB2-O6R-03

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A car drives 204 kilometers in 3 hours. A cyclist rides 120 kilometers in 5 hours. Each one moves at a steady speed. How many more kilometers per hour does the car travel than the cyclist?

A. 28
B. 44
C. 37
D. 42

KEY: B (44)

Worked solution: The car's speed is 204 / 3 = 68 kilometers per hour. The cyclist's speed is 120 / 5 = 24 kilometers per hour. The difference is 68 - 24 = 44 kilometers per hour.

Key computation (JS): `return String(204 / 3 - 120 / 5);`

Distractors:
- A (28): The student subtracts the distances, 204 - 120 = 84, and divides by the car's 3 hours, as if the cyclist had also ridden for 3 hours; that makes the cyclist's speed too big. | computation: `return String((204 - 120) / 3);`
- C (37): Dividing 204 by 3, the student gets 6 r 2 in the tens, forgets the 2, divides 4 by 3 and writes the car's speed as 61, then 61 - 24 = 37. | computation: `const car = Math.floor(20 / 3) * 10 + Math.floor(4 / 3); return String(car - 120 / 5);`
- D (42): The student finds the differences first, 84 kilometers and 2 hours, and divides them, 84 / 2 = 42, instead of finding each speed and then subtracting. | computation: `return String((204 - 120) / (5 - 3));`

---

## MB2-O7E-08

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The width of a rectangular garden bed is 3 feet less than 2/3 of its length. The perimeter of the garden bed is 41 feet. What is the length of the garden bed, in feet?

A. 10.5
B. 16.5
C. 14.1
D. 13.2

KEY: C (14.1)

Worked solution: Let L be the length. The width is (2/3)L - 3. Perimeter: 2(L + (2/3)L - 3) = 41, so (5/3)L - 3 = 20.5, (5/3)L = 23.5 and L = 23.5 x 3/5 = 14.1. Check: the width is (2/3)(14.1) - 3 = 9.4 - 3 = 6.4, and 2(14.1 + 6.4) = 2(20.5) = 41.

Key computation (JS): `return (41 / 2 + 3) / (5 / 3)`

Distractors:
- A (10.5): The student turns "3 feet less than" into + 3, so 2((5/3)L + 3) = 41 and (5/3)L = 17.5. | computation: `return (41 / 2 - 3) / (5 / 3)`
- B (16.5): The student writes the perimeter as 2L + w = 2L + (2/3)L - 3 = 41, leaving out the second width, so (8/3)L = 44. | computation: `return (41 + 3) / (8 / 3)`
- D (13.2): The student writes 2(L + (2/3)L - 3) as (10/3)L - 3 = 41, doubling L and (2/3)L but subtracting 3 only once, so (10/3)L = 44. | computation: `return (41 + 3) / (10 / 3)`

---

## MB2-O7R-08

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Rosa puts $5,000 in a savings account that earns 4.5% simple interest per year. She leaves the money in the account for 20 months and makes no other deposits or withdrawals. How many dollars of interest does the account earn in the 20 months?

A. 360
B. 225
C. 405
D. 375

KEY: D (375)

Worked solution: One year of interest is 4.5% of 5,000 = 0.045 x 5,000 = 225 dollars. 20 months is 20/12 = 5/3 years. Interest = 225 x 5/3 = 375 dollars.

Key computation (JS): `return Math.round(5000 * 0.045 * 20 / 12 * 100) / 100;`

Distractors:
- A (360): The student divides 20 by 12, writes 1.6 instead of 1 2/3, and multiplies 225 x 1.6. | computation: `return Math.round(5000 * 0.045 * 1.6 * 100) / 100;`
- B (225): The student sees 20 months as "1 year and some months" and computes one year of interest, 225, leaving out the 8 months. | computation: `return Math.round(5000 * 0.045 * 1 * 100) / 100;`
- C (405): The student converts 20 months to 1 year 8 months and writes it as 1.8 years, as if a year had 10 months, then multiplies 225 x 1.8. | computation: `return Math.round(5000 * 0.045 * 1.8 * 100) / 100;`

---

## MB2-O6R-08

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Mia has saved $27 for a new bike. The amount she has saved is 15% of the price of the bike. What is the price of the bike, in dollars?

A. 180
B. 162
C. 90
D. 405

KEY: A (180)

Worked solution: 15% of the price is $27. Then 5% of the price is 27 / 3 = 9 dollars, and 100% is 20 x 9 = 180 dollars. (Or: 27 / 0.15 = 180.) Check: 15% of 180 is 0.15 x 180 = 27.

Key computation (JS): `return String(Math.round(27 / 0.15));`

Distractors:
- B (162): The student sees that 15% fits into 100% about 6 times (15, 30, 45, 60, 75, 90) and multiplies 27 by 6, stopping at 90% of the price. | computation: `return String(27 * Math.floor(100 / 15));`
- C (90): The student finds 5% = 27 / 3 = 9 but then multiplies by 10, as if 9 were 10% of the price, getting 90. | computation: `return String(27 / 3 * 10);`
- D (405): The student thinks $27 is one fifteenth of the price and multiplies 27 x 15 = 405 instead of dividing by 0.15. | computation: `return String(27 * 15);`

---

## MB2-O7R-14

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A nature reserve had 8,000 birds. The number of birds rose 20% in one year and then fell 15% the next year. To predict the final number, Kai found one net percent change by adding the two changes, counting the fall as negative, and applied that one change to 8,000. How many more birds does Kai's method predict than the actual number of birds at the end of the two years?

A. 2640
B. 240
C. 1040
D. 300

KEY: B (240)

Worked solution: Actual: after the rise, 8,000 x 1.20 = 9,600 birds. After the fall, 9,600 x 0.85 = 8,160 birds. Kai: 20% - 15% = 5%, and 8,000 x 1.05 = 8,400 birds. Kai's method predicts 8,400 - 8,160 = 240 more birds.

Key computation (JS): `const actual = 8000 * 1.2 * 0.85; const kai = 8000 * (1 + 0.20 - 0.15); return Math.round(kai - actual);`

Distractors:
- A (2640): The student forgets to count the fall as negative, so Kai's prediction becomes 8,000 x 1.35 = 10,800, and subtracts the actual 8,160. | computation: `const actual = 8000 * 1.2 * 0.85; const kai = 8000 * (1 + 0.20 + 0.15); return Math.round(kai - actual);`
- C (1040): For the actual count the student lowers 8,000 by 20% and then raises it by 15% (8,000 x 0.8 x 1.15 = 7,360), and subtracts that from Kai's 8,400. | computation: `const actual = 8000 * 0.8 * 1.15; const kai = 8000 * 1.05; return Math.round(kai - actual);`
- D (300): The student takes 15% of 10,000 = 1,500 instead of 15% of 9,600 = 1,440, so the actual count comes out 8,100, and finds 8,400 - 8,100. | computation: `const actual = 8000 * 1.2 - 0.15 * 10000; return Math.round(8000 * 1.05 - actual);`

---

## MB2-O6R-01

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A bakery sells muffins in packs of 6 for $7.44. Sam wants 9 muffins, and the bakery will sell them to him at the same price for each muffin. How many dollars will Sam pay for 9 muffins?

A. 14.88
B. 9.92
C. 11.16
D. 10.50

KEY: C (11.16)

Worked solution: First find the price of one muffin: 7.44 / 6 = 1.24 dollars. Then multiply by the number of muffins: 9 x 1.24 = 11.16. Sam pays $11.16.

Key computation (JS): `const unit = 7.44 / 6; return (Math.round(unit * 9 * 100) / 100).toFixed(2);`

Distractors:
- A (14.88): The student thinks 9 muffins need 2 packs and pays 2 x 7.44 = 14.88, ignoring that the stem sells each muffin at the same price. | computation: `return (Math.round(7.44 * Math.ceil(9 / 6) * 100) / 100).toFixed(2);`
- B (9.92): The student sees 3 more muffins and divides $7.44 by 3 to price them (2.48) instead of by 2 for half a pack, giving 7.44 + 2.48 = 9.92. | computation: `return (Math.round((7.44 + 7.44 / 3) * 100) / 100).toFixed(2);`
- D (10.50): The student uses $7 instead of $7.44 because the cents look small, so one muffin costs 7 / 6 and 9 muffins cost 1.5 x 7 = 10.50. | computation: `return (Math.round(Math.floor(7.44) / 6 * 9 * 100) / 100).toFixed(2);`

---

## MB2-O6R-16

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: On a library shelf, the ratio of mystery books to all books is 3 to 10. The librarian removes 40 mystery books and no other books. Now the ratio of mystery books to all books on the shelf is 1 to 5. How many books were on the shelf before any were removed?

A. 250
B. 200
C. 400
D. 320

KEY: D (320)

Worked solution: Before: mysteries are 3 units and other books are 7 units (10 units in all). The other books do not change. After: mysteries to all is 1 to 5, so mysteries to other books is 1 to 4, and the other books (7 units) are 4 times the mysteries left. So 7 units = 4 x (3 units - 40), which gives 7 units = 12 units - 160, so 5 units = 160 and 1 unit = 32. The shelf had 10 x 32 = 320 books. Check: 96 mysteries, remove 40 to get 56 of 280 books, and 56 / 280 = 1/5.

Key computation (JS): `const u = 4 * 40 / (4 * 3 - 7); return String(10 * u);`

Distractors:
- A (250): The student sets the other books (7 units) equal to 5 times the mysteries left instead of 4 times, so 7 units = 5 x (3 units - 40), 1 unit = 25, total 250. | computation: `const u = 5 * 40 / (5 * 3 - 7); return String(10 * u);`
- B (200): The student sees mysteries go from 3 parts to 1 part, decides the 40 books are 2 parts (1 part = 20), and multiplies by 10 parts to get 200, not noticing the parts change size. | computation: `return String(10 * 40 / (3 - 1));`
- C (400): The student keeps the total at 10 units after the removal, so (3 units - 40) / 10 units = 1/5, which gives 1 unit = 40 and 400 books. | computation: `const u = 5 * 40 / (5 * 3 - 10); return String(10 * u);`

---

## MB2-O6R-14

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A family buys 4 concert tickets that cost $78 each. The ticket website offers two deals, and the family can use only one. Deal A takes 15% off the total cost of the tickets. Deal B takes $7 off the price of each ticket. What is the difference, in dollars, between the total cost with Deal A and the total cost with Deal B?

A. 18.80
B. 16.30
C. 13.00
D. 14.60

KEY: A (18.80)

Worked solution: The tickets cost 4 x 78 = 312 dollars. Deal A saves 15% of 312 = 0.15 x 312 = 46.80, so the cost is 312 - 46.80 = 265.20. Deal B saves 4 x 7 = 28, so the cost is 312 - 28 = 284. The difference is 284 - 265.20 = 18.80 dollars.

Key computation (JS): `const t = 4 * 78; const a = t - 0.15 * t; const b = t - 4 * 7; return (Math.round((b - a) * 100) / 100).toFixed(2);`

Distractors:
- B (16.30): The student finds 15% of one $78 ticket (11.70) and compares it with Deal B's $28 for all four tickets, 28 - 11.70 = 16.30. | computation: `return (Math.round(Math.abs(0.15 * 78 - 4 * 7) * 100) / 100).toFixed(2);`
- C (13.00): The student treats Deal A as $15 off the order and compares it with Deal B's $28 off, so the difference is 28 - 15 = 13. | computation: `return (Math.abs(15 - 4 * 7)).toFixed(2);`
- D (14.60): The student applies the $7 coupons first (312 - 28 = 284) and then takes 15% of 284 = 42.60 as Deal A's saving, so 42.60 - 28 = 14.60, mixing the two deals. | computation: `const t = 4 * 78; return (Math.round((0.15 * (t - 4 * 7) - 4 * 7) * 100) / 100).toFixed(2);`

---

## MB2-O5-09

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A coach buys 6 boxes with 21 tennis balls in each box and 8 boxes with 6 tennis balls in each box. She shares all the tennis balls equally among 3 teams. How many tennis balls does each team get?

A. 90
B. 58
C. 28
D. 68

KEY: B (58)

Worked solution: The large boxes hold 6 x 21 = 126 balls and the small boxes hold 8 x 6 = 48 balls, so there are 126 + 48 = 174 balls. Shared among 3 teams: 174 / 3 = 58. As one expression: (6 x 21 + 8 x 6) / 3 = 58.

Key computation (JS): `return (6 * 21 + 8 * 6) / 3`

Distractors:
- A (90): Writes 6 x 21 / 3 + 8 x 6: 126 / 3 = 42, then adds all 48 small-box balls: 42 + 48 = 90. | computation: `return 6 * 21 / 3 + 8 * 6`
- C (28): Adds the boxes, 6 + 8 = 14, and uses 6 balls for each: 14 x 6 = 84, and 84 / 3 = 28. | computation: `return (6 + 8) * 6 / 3`
- D (68): Uses 6 boxes of 6 and 8 boxes of 21: 36 + 168 = 204, and 204 / 3 = 68. | computation: `return (6 * 6 + 8 * 21) / 3`

---

## MB2-O7R-03

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Maya and Leo each ride a bike at a steady speed. Maya rides 5 3/4 miles in 1/2 hour. Leo rides 7 1/2 miles in 3/4 hour. How many more miles per hour does Maya ride than Leo?

A. 4
B. 2 1/8
C. 1 1/2
D. 1 3/4

KEY: C (1 1/2)

Worked solution: Maya: 5 3/4 / (1/2) = 5 3/4 x 2 = 11 1/2 miles per hour. Leo: 7 1/2 / (3/4) = 15/2 x 4/3 = 10 miles per hour. Difference: 11 1/2 - 10 = 1 1/2 miles per hour.

Key computation (JS): `const m = 5.75 / 0.5, l = 7.5 / 0.75; const d = m - l; return Math.abs(d - 1.5) < 1e-9 ? "1 1/2" : String(d);`

Distractors:
- A (4): The student doubles Maya's half-hour distance to 11 1/2 but uses Leo's 7 1/2 miles as if it were already per hour. | computation: `return 5.75 * 2 - 7.5;`
- B (2 1/8): Since 3/4 + 1/4 = 1, the student adds 1/4 of 7 1/2 to get 9 3/8 miles per hour for Leo, instead of adding 1/3 of it, then subtracts from 11 1/2. | computation: `const d = 5.75 * 2 - 7.5 * 5 / 4; return Math.abs(d - 2.125) < 1e-9 ? "2 1/8" : String(d);`
- D (1 3/4): The student subtracts the two distances, 7 1/2 - 5 3/4, as if both were per-hour amounts, and reports the size of the gap. | computation: `const d = 7.5 - 5.75; return Math.abs(d - 1.75) < 1e-9 ? "1 3/4" : String(d);`

---

## MB2-O7E-01

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A music center rents out practice rooms. It charges a one-time booking fee of $4 plus $5 for each hour, and part of an hour is charged at the same rate. Jae's bill was $31.50. For how many hours did Jae rent a practice room?

A. 6.3
B. 3.5
C. 2.3
D. 5.5

KEY: D (5.5)

Worked solution: The hours cost 31.50 - 4 = 27.50 dollars. Each hour costs 5 dollars, so the number of hours is 27.50 / 5 = 5.5. Check: 4 + 5 x 5.5 = 4 + 27.50 = 31.50 dollars.

Key computation (JS): `return (31.5 - 4) / 5`

Distractors:
- A (6.3): The student divides 31.50 by 5 and never takes off the $4 booking fee, so every dollar of the bill is counted as rental time. | computation: `return 31.5 / 5`
- B (3.5): The student adds the fee to the hourly rate (5 + 4 = 9 dollars per hour) and divides 31.50 by 9, as if the $4 were part of each hour's price. | computation: `return 31.5 / (5 + 4)`
- C (2.3): The student divides 31.50 by 5 to get 6.3 and then subtracts the $4 fee from the number of hours, mixing dollars with hours. | computation: `return 31.5 / 5 - 4`
