# Items for review, KEYED (30)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MMG-N11

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A bakery records a profit as a positive number and a loss as a negative number. Its result for week 1 was -$360. Its result for week 2 was 2/3 of its result for week 1. In week 3, the bakery made a profit that was 1 3/4 times its total loss for weeks 1 and 2. What was the bakery's total result, in dollars, for the three weeks?

A. 450
B. 690
C. -180
D. -1650

KEY: A (450)

Worked solution: Week 2: 2/3 x (-360) = -240, a loss of $240. The total loss for weeks 1 and 2 is 360 + 240 = 600 dollars. Week 3: a profit of 1 3/4 x 600 = 1050, so its result is +1050. Total: -360 + (-240) + 1050 = 450 dollars.

Key computation (JS): `const w1 = -360; const w2 = (2/3) * w1; const w3 = 1.75 * Math.abs(w1 + w2); return Math.round(w1 + w2 + w3);`

Distractors:
- B (690): Finds week 3 correctly but leaves week 2 out of the final total: -360 + 1050. | computation: `const w1 = -360; const w2 = (2/3) * w1; const w3 = 1.75 * Math.abs(w1 + w2); return Math.round(w1 + w3);`
- C (-180): Bases week 3 on week 2's loss only (1 3/4 x 240 = 420), then adds -360 - 240 + 420. | computation: `const w1 = -360; const w2 = (2/3) * w1; const w3 = 1.75 * Math.abs(w2); return Math.round(w1 + w2 + w3);`
- D (-1650): Multiplies 1 3/4 by the combined result -600 and keeps the negative sign, so week 3 becomes -1050 instead of a profit of 1050. | computation: `const w1 = -360; const w2 = (2/3) * w1; const w3 = 1.75 * (w1 + w2); return Math.round(w1 + w2 + w3);`

---

## MMG-D01

Area: Statistics and Probability | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Each bag of rice weighs 1 pound 4 ounces. Mr. Diaz buys 6 bags of rice. What is the total weight of the rice, in pounds?

A. 120
B. 7.5
C. 8.4
D. 7.8

KEY: B (7.5)

Worked solution: There are 16 ounces in 1 pound, so each bag weighs 16 + 4 = 20 ounces. Six bags weigh 6 x 20 = 120 ounces. To change ounces to pounds, divide by 16: 120 / 16 = 7 with 8 ounces left over, and 8 ounces is 8/16 = 1/2 of a pound. So the rice weighs 7 1/2 = 7.5 pounds.

Key computation (JS): `const oz = 6 * (16 + 4); return oz / 16;`

Distractors:
- A (120): Finds the total in ounces, 6 x 20 = 120, and stops without changing back to pounds as the question asks. | computation: `return 6 * (16 + 4);`
- C (8.4): Reads 1 pound 4 ounces as 1.4 pounds, as if a pound had 10 ounces, and multiplies: 6 x 1.4 = 8.4. | computation: `return Math.round(6 * 1.4 * 10) / 10;`
- D (7.8): Gets 120 ounces = 7 pounds 8 ounces and writes the 8 ounces as the decimal digit: 7.8 pounds. | computation: `const oz = 6 * (16 + 4); const q = Math.floor(oz / 16); const r = oz % 16; return Number(q + '.' + r);`

---

## MMG-G10

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A garden bed is shaped like one fourth of a circle. Its two straight edges are each 6 meters long and meet at a right angle at the center of the circle, and its curved edge is one fourth of the circle. A plastic border will go all the way around the edge of the bed. Using 3.14 for pi, how many meters of border are needed?

A. 28.26
B. 16.71
C. 21.42
D. 30.84

KEY: C (21.42)

Worked solution: The straight edges are radii, so the radius is 6 meters. A full circle would have circumference 2 x 3.14 x 6 = 37.68 meters, so the curved edge is 37.68 / 4 = 9.42 meters. The border also runs along both straight edges: 9.42 + 6 + 6 = 21.42 meters.

Key computation (JS): `const r = 6; return Math.round((2 * 3.14 * r / 4 + 2 * r) * 100) / 100;`

Distractors:
- A (28.26): Finds the area of the quarter circle, 3.14 x 6 x 6 / 4 = 28.26, instead of the length around it. | computation: `const r = 6; return Math.round((3.14 * r * r / 4) * 100) / 100;`
- B (16.71): Treats 6 m as the diameter in C = 3.14 x d, so the curved edge is 18.84 / 4 = 4.71 m, then adds the two straight edges: 16.71. | computation: `const d = 6; return Math.round((3.14 * d / 4 + 2 * 6) * 100) / 100;`
- D (30.84): Takes half of the circumference (18.84) as the curved edge, as if the bed were a half circle, then adds 6 + 6. | computation: `const r = 6; return Math.round((2 * 3.14 * r / 2 + 2 * r) * 100) / 100;`

---

## MMG-O10

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Nadia puts $2,000 in a savings account that pays 4% simple interest per year. She makes no other deposits or withdrawals. After how many months will the account have earned $200 in interest?

A. 25
B. 29
C. 4.8
D. 30

KEY: D (30)

Worked solution: Interest for one year is 4% of $2,000 = 0.04 x 2,000 = $80. To earn $200 takes 200 / 80 = 2.5 years. 2.5 years = 2.5 x 12 = 30 months.

Key computation (JS): `return 200 / (2000 * 0.04) * 12;`

Distractors:
- A (25): Gets 2.5 years and changes it to months by moving the decimal point, as if a year had 10 months. | computation: `return 200 / (2000 * 0.04) * 10;`
- B (29): Gets 2.5 years and reads it as 2 years 5 months, which is 29 months. | computation: `var y = 200 / (2000 * 0.04); var whole = Math.floor(y); var tenths = Math.round((y - whole) * 10); return whole * 12 + tenths;`
- C (4.8): Divides the yearly interest by the target interest (80 / 200 = 0.4 year) instead of the other way round, then changes 0.4 year to 4.8 months. | computation: `return Math.round((2000 * 0.04) / 200 * 12 * 10) / 10;`

---

## MMG-O09

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Leo guessed that his walk to the park would take 48 minutes. The walk actually took 1 hour. What was the percent error of Leo's guess?

A. 20
B. 25
C. 125
D. 52

KEY: A (20)

Worked solution: 1 hour = 60 minutes. The guess was off by 60 - 48 = 12 minutes. Percent error compares the error with the actual value: 12 / 60 = 0.2 = 20%.

Key computation (JS): `return (60 - 48) / 60 * 100;`

Distractors:
- B (25): Divides the 12-minute error by the guess (48) instead of by the actual time (60). | computation: `return (60 - 48) / 48 * 100;`
- C (125): Divides the actual time by the guess (60 / 48) and reports that ratio as the percent instead of finding the difference first. | computation: `return 60 / 48 * 100;`
- D (52): Treats 1 hour as 100 minutes, as if time were a decimal, so the error is 52 out of 100. | computation: `return (100 - 48) / 100 * 100;`

---

## MMG-O05

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A sign shop uses the formula C = 4s^2 + 13 to find the cost C, in dollars, of a square sign with sides s feet long. What is the cost, in dollars, of a square sign with sides 0.5 foot long?

A. 23
B. 14
C. 17
D. 15

KEY: B (14)

Worked solution: Square first: s^2 = 0.5 x 0.5 = 0.25. Then multiply: 4 x 0.25 = 1. Then add: 1 + 13 = 14. The sign costs $14.

Key computation (JS): `return 4 * 0.5 ** 2 + 13;`

Distractors:
- A (23): Multiplies 5 x 5 = 25 and puts in one decimal place, so 0.5 x 0.5 becomes 2.5 and 4 x 2.5 + 13 = 23. | computation: `return 4 * 2.5 + 13;`
- C (17): Reads s^2 as 2 x s, so 4 x 1 + 13 (the same value comes from squaring 4 x 0.5). | computation: `return 4 * (2 * 0.5) + 13;`
- D (15): Ignores the exponent and computes 4 x 0.5 + 13. | computation: `return 4 * 0.5 + 13;`

---

## MMG-N14

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A sample of 7 × 10^7 bacteria has a total mass of 1.4 × 10^-1 milligram, and each bacterium has the same mass. The mass of one bacterium, in kilograms, can be written as a × 10^n, where 1 ≤ a < 10. What is the value of n? (1 gram = 1,000 milligrams and 1 kilogram = 1,000 grams.)

A. -14
B. -3
C. -15
D. -12

KEY: C (-15)

Worked solution: Divide the total mass by the number of bacteria: (1.4 × 10^-1) ÷ (7 × 10^7) = (1.4 ÷ 7) × 10^(-1 - 7) = 0.2 × 10^-8 milligram. Since 0.2 is less than 1, rewrite it: 0.2 × 10^-8 = 2 × 10^-9 milligram. A kilogram is 1,000 x 1,000 = 10^6 milligrams, so divide by 10^6: 2 × 10^-9 × 10^-6 = 2 × 10^-15 kilogram. So n = -15.

Key computation (JS): `const kg = (1.4e-1 / 7e7) * 1e-6; return Math.floor(Math.log10(kg) + 1e-9);`

Distractors:
- A (-14): Leaves the quotient as 0.2 × 10^-8 and converts to 0.2 × 10^-14, forgetting that a must be at least 1, so 0.2 × 10^-14 has to become 2 × 10^-15. | computation: `const m = -1 - 7; return m - 6;`
- B (-3): Converts in the wrong direction, multiplying by 10^6 instead of dividing, because kilograms are 'bigger': 2 × 10^-9 × 10^6 = 2 × 10^-3. | computation: `const kg = (1.4e-1 / 7e7) * 1e6; return Math.floor(Math.log10(kg) + 1e-9);`
- D (-12): Converts milligrams to grams (dividing by 1,000) and stops, giving the mass in grams, 2 × 10^-12, instead of kilograms. | computation: `const kg = (1.4e-1 / 7e7) * 1e-3; return Math.floor(Math.log10(kg) + 1e-9);`

---

## MMG-N06

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Paper plates are sold in packs of 12, and paper cups are sold in packs of 8. Mr. Diaz wants to buy exactly the same number of plates as cups, and he wants to buy as few packs as possible. How many packs will he buy in all?

A. 20
B. 24
C. 2
D. 5

KEY: D (5)

Worked solution: The number of plates must be a multiple of 12, and the number of cups must be a multiple of 8. The smallest number that is a multiple of both is the least common multiple: multiples of 12 are 12, 24, ..., and 24 is the first one that 8 divides. So he buys 24 plates (24 / 12 = 2 packs) and 24 cups (24 / 8 = 3 packs), for 2 + 3 = 5 packs in all.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const L=12*8/g(12,8); return L/12 + L/8;`

Distractors:
- A (20): Uses the product 12 x 8 = 96 as the common number instead of the least common multiple, so buys 96 / 12 = 8 packs of plates and 96 / 8 = 12 packs of cups. | computation: `const P=12*8; return P/12 + P/8;`
- B (24): Finds the LCM, 24, and gives the number of plates (or cups) instead of the number of packs. | computation: `const g=(a,b)=>b?g(b,a%b):a; return 12*8/g(12,8);`
- C (2): Finds the LCM and the 2 packs of plates, then forgets to add the 3 packs of cups. | computation: `const g=(a,b)=>b?g(b,a%b):a; const L=12*8/g(12,8); return L/12;`

---

## MMG-O01

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Ana had 46 stickers. She bought 4 packs with 6 stickers in each pack. Then she gave half of all her stickers to her brother. How many stickers does Ana have now?

A. 35
B. 47
C. 26
D. 58

KEY: A (35)

Worked solution: The packs hold 4 x 6 = 24 stickers. Ana then has 46 + 24 = 70 stickers in all. She gives away half, so she keeps 70 / 2 = 35 stickers. The expression is (46 + 4 x 6) / 2 = 35.

Key computation (JS): `return (46 + 4 * 6) / 2;`

Distractors:
- B (47): Halves only the 46 stickers she started with and keeps all 24 new ones. | computation: `return 46 / 2 + 4 * 6;`
- C (26): Adds only one pack of 6 instead of 4 packs, then halves. | computation: `return (46 + 6) / 2;`
- D (58): Writes 46 + 4 x 6 / 2 without parentheses and halves only the 24 new stickers. | computation: `return 46 + (4 * 6) / 2;`

---

## MMG-D12

Area: Statistics and Probability | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A scatter plot shows the average price of a movie ticket in a town, in dollars, for several years. A line of fit for the data is y = 0.5x + 12.4, where x is the number of years since 2016 and y is the average ticket price in dollars. According to the line of fit, what is the predicted average ticket price, in dollars, in the year 2025?

A. 30.4
B. 16.9
C. 10.7
D. 24.9

KEY: B (16.9)

Worked solution: The year 2025 is 2025 - 2016 = 9 years after 2016, so x = 9. Then y = 0.5(9) + 12.4 = 4.5 + 12.4 = 16.9. The predicted average ticket price is 16.9 dollars.

Key computation (JS): `const x = 2025 - 2016; return 0.5 * x + 12.4;`

Distractors:
- A (30.4): Finds x = 9 but divides by 0.5 instead of multiplying, treating 0.5x as 'x halved' the wrong way: 9 / 0.5 + 12.4 = 18 + 12.4 = 30.4. | computation: `const x = 2025 - 2016; return Math.round((x / 0.5 + 12.4) * 10) / 10;`
- C (10.7): Reads 0.5x + 12.4 as 0.5(x + 12.4), adding the intercept to x before multiplying: 0.5 x 21.4 = 10.7. | computation: `const x = 2025 - 2016; return Math.round(0.5 * (x + 12.4) * 10) / 10;`
- D (24.9): Uses the last two digits of the year as x (x = 25) instead of the number of years since 2016: 0.5 x 25 + 12.4 = 24.9. | computation: `const x = 25; return 0.5 * x + 12.4;`

---

## MMG-G14

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A paper cup is shaped like a cone with a radius of 6 centimeters and a height of 10 centimeters. The cup is filled to the top with water, and all of the water is poured into an empty glass shaped like a cylinder with a radius of 5 centimeters. How deep is the water in the glass, in centimeters?

A. 14.4
B. 7.2
C. 4.8
D. 4

KEY: C (4.8)

Worked solution: Volume of the cone: (1/3) x pi x 6 x 6 x 10 = 120 pi cubic centimeters. The same water fills the cylinder to a depth d, so pi x 5 x 5 x d = 120 pi, which gives 25d = 120 and d = 4.8 centimeters.

Key computation (JS): `const v = (1 / 3) * Math.PI * 6 * 6 * 10; return Math.round(v / (Math.PI * 5 * 5) * 100) / 100;`

Distractors:
- A (14.4): Leaves out the 1/3 and finds the cone's volume as if it were a cylinder: 36 x 10 = 360 (times pi), and 360 / 25 = 14.4. | computation: `const v = Math.PI * 6 * 6 * 10; return Math.round(v / (Math.PI * 5 * 5) * 100) / 100;`
- B (7.2): Uses 1/2 instead of 1/3 in the cone formula, as for the area of a triangle: (1/2) x 36 x 10 = 180, and 180 / 25 = 7.2. | computation: `const v = (1 / 2) * Math.PI * 6 * 6 * 10; return Math.round(v / (Math.PI * 5 * 5) * 100) / 100;`
- D (4): Takes the cone as one third of a cylinder of height 10 (10/3) and then scales by the ratio of the radii, 6/5, instead of the ratio of the base areas, 36/25: (10/3) x (6/5) = 4. | computation: `return Math.round((10 / 3) * (6 / 5) * 100) / 100;`

---

## MMG-N07

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: How many integers are greater than -3 3/5 and less than |-5 3/5| ?

A. 5
B. 8
C. 2
D. 9

KEY: D (9)

Worked solution: First, |-5 3/5| = 5 3/5, because absolute value is the distance from 0. The integers greater than -3 3/5 start at -3 (since -3 is to the right of -3 3/5 on the number line and -4 is to the left). The integers less than 5 3/5 end at 5. So the integers are -3, -2, -1, 0, 1, 2, 3, 4, 5. That is 9 integers.

Key computation (JS): `let n = 0; for (let k = -10; k <= 10; k++) if (k > -3.6 && k < Math.abs(-5.6)) n++; return n;`

Distractors:
- A (5): Counts only the positive integers 1 to 5, as if 'integers' meant counting numbers. | computation: `let n = 0; for (let k = 1; k <= 10; k++) if (k > -3.6 && k < 5.6) n++; return n;`
- B (8): Lists -3 through 5 but skips 0, treating 0 as neither positive nor negative and so not counted. | computation: `let n = 0; for (let k = -10; k <= 10; k++) if (k > -3.6 && k < 5.6 && k !== 0) n++; return n;`
- C (2): Reads |-5 3/5| as -5 3/5 and counts the integers between -5 3/5 and -3 3/5, which are -5 and -4. | computation: `let n = 0; for (let k = -10; k <= 10; k++) if (k > -5.6 && k < -3.6) n++; return n;`

---

## MMG-O13

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A pet store mixes millet that costs $2 per pound with sunflower seed that costs $5 per pound. It makes 60 pounds of birdseed mix that is worth $4 per pound. How many pounds of sunflower seed are in the mix?

A. 40
B. 30
C. 48
D. 24

KEY: A (40)

Worked solution: Let m be the pounds of millet and s the pounds of sunflower seed. Then m + s = 60, and the cost is 2m + 5s = 4 x 60 = 240. Substitute m = 60 - s: 2(60 - s) + 5s = 240, so 120 + 3s = 240, 3s = 120, and s = 40.

Key computation (JS): `return (4 * 60 - 2 * 60) / (5 - 2);`

Distractors:
- B (30): Assumes the mix is half and half, without checking that equal amounts would be worth $3.50 per pound, not $4. | computation: `return 60 / 2;`
- C (48): Divides the whole $240 by the sunflower price, as if all of the money were spent on sunflower seed. | computation: `return (4 * 60) / 5;`
- D (24): Prices all 60 pounds as millet and then adds sunflower seed on top (2 x 60 + 5s = 240), forgetting that each pound of sunflower seed takes the place of a pound of millet. | computation: `return (4 * 60 - 2 * 60) / 5;`

---

## MMG-O04

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Ribbon at a craft store costs $0.80 per foot. Tara spends $26 on ribbon. How many feet of ribbon does she buy?

A. 20.8
B. 32.5
C. 31.2
D. 32.4

KEY: B (32.5)

Worked solution: Each foot costs $0.80, so divide the money by the price per foot: 26 / 0.8 = 260 / 8 = 32.5 (32 remainder 4, and 4/8 = 0.5). Check: 5 feet cost $4, and $26 is 6.5 groups of $4, so Tara buys 6.5 x 5 = 32.5 feet. Also 32.5 x 0.80 = 26.

Key computation (JS): `return 26 / 0.8;`

Distractors:
- A (20.8): Multiplies the money by the price per foot instead of dividing. | computation: `return 26 * 0.8;`
- C (31.2): Reasons that ribbon is 20% cheaper than $1 a foot, so she gets 20% more feet than 26, and computes 26 x 1.2 instead of 26 / 0.8. | computation: `return 26 * 1.2;`
- D (32.4): Sets up 26 / 0.8 correctly as 260 / 8, gets 32 remainder 4, and writes the remainder as the decimal part, 32.4, instead of 4/8 = 0.5. | computation: `const q = Math.floor(260 / 8), r = 260 % 8; return Number(q + '.' + r);`

---

## MMG-O12

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A tap drains water from a rain barrel at a steady rate, lowering the water level 0.4 inch every 5 minutes. Fifty minutes after the tap was opened, the water was 17 inches deep. How deep, in inches, was the water 10 minutes after the tap was opened?

A. 18.6
B. 12.2
C. 20.2
D. 17.8

KEY: C (20.2)

Worked solution: The level falls 0.4 inch every 5 minutes. From 10 minutes to 50 minutes is 40 minutes, or 40 / 5 = 8 intervals, so the level fell 8 x 0.4 = 3.2 inches in that time. Ten minutes after opening, the water was 3.2 inches higher than at 50 minutes: 17 + 3.2 = 20.2 inches.

Key computation (JS): `return Math.round((17 + 0.4 * (50 - 10) / 5) * 10) / 10;`

Distractors:
- A (18.6): Counts the 40 minutes in tens (4 steps) instead of in the stated 5-minute steps (8 steps): 17 + 4 x 0.4. | computation: `return Math.round((17 + 0.4 * (50 - 10) / 10) * 10) / 10;`
- B (12.2): Writes the depth as d = b - 0.08t and solves for the starting depth with the wrong sign (b = 17 - 4 = 13 instead of 17 + 4 = 21), then finds 13 - 0.8. | computation: `var m = -0.4 / 5; var b = 17 + m * 50; return Math.round((b + m * 10) * 10) / 10;`
- D (17.8): Uses the 10 minutes in the question as the time between the two readings instead of 50 - 10 = 40 minutes: 17 + 2 x 0.4. | computation: `return Math.round((17 + 0.4 * 10 / 5) * 10) / 10;`

---

## MMG-G06

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A paper net folds up into a pyramid. The net is made of one square with sides 9 centimeters long and four triangles that are all the same size. Each triangle has a base of 9 centimeters, which is one side of the square, and a height of 12 centimeters. What is the total area of the net in square centimeters?

A. 252
B. 216
C. 189
D. 297

KEY: D (297)

Worked solution: The square has area 9 x 9 = 81 square centimeters. Each triangle has area 1/2 x 9 x 12 = 54 square centimeters, so the four triangles have 4 x 54 = 216 square centimeters. The whole net has 81 + 216 = 297 square centimeters.

Key computation (JS): `const square = 9 * 9; const tri = 9 * 12 / 2; return square + 4 * tri;`

Distractors:
- A (252): Uses the perimeter of the square (4 x 9 = 36) instead of its area, then adds the triangles: 36 + 216 = 252. | computation: `const tri = 9 * 12 / 2; return 4 * 9 + 4 * tri;`
- B (216): Adds the four triangles (4 x 54 = 216) and forgets that the square base is part of the net. | computation: `const tri = 9 * 12 / 2; return 4 * tri;`
- C (189): Pictures the pyramid from the front and counts only two triangles with the base: 81 + 2 x 54 = 189. | computation: `const square = 9 * 9; const tri = 9 * 12 / 2; return square + 2 * tri;`

---

## MMG-D11

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The table shows the number of sit-ups each student in two exercise groups did in one minute. The two groups have the same mean absolute deviation. The difference between the mean of Group B and the mean of Group A is how many times that mean absolute deviation?

Table (Sit-ups in one minute):

|  | Student 1 | Student 2 | Student 3 | Student 4 | Student 5 |
| --- | --- | --- | --- | --- | --- |
| Group A | 10 | 14 | 15 | 16 | 20 |
| Group B | 17 | 19 | 21 | 22 | 26 |

A. 2.5
B. 0.5
C. 0.4
D. 6

KEY: A (2.5)

Worked solution: Mean of Group A: (10 + 14 + 15 + 16 + 20) / 5 = 75 / 5 = 15. Mean of Group B: (17 + 19 + 21 + 22 + 26) / 5 = 105 / 5 = 21. The difference of the means is 21 - 15 = 6. Mean absolute deviation of Group A: the distances from 15 are 5, 1, 0, 1 and 5, which add to 12, so the MAD is 12 / 5 = 2.4. (Group B's distances from 21 are 4, 2, 0, 1 and 5, also 12 in all, so its MAD is 2.4 too.) The difference is 6 / 2.4 = 2.5 times the mean absolute deviation.

Key computation (JS): `const A = [10,14,15,16,20], B = [17,19,21,22,26]; const mean = d => d.reduce((s, x) => s + x, 0) / d.length; const mad = d => { const m = mean(d); return d.reduce((s, x) => s + Math.abs(x - m), 0) / d.length; }; return (mean(B) - mean(A)) / mad(A);`

Distractors:
- B (0.5): Adds the distances from the mean (12) but forgets to divide by the number of values, so uses the total distance as the MAD: 6 / 12 = 0.5. | computation: `const A = [10,14,15,16,20], B = [17,19,21,22,26]; const mean = d => d.reduce((s, x) => s + x, 0) / d.length; const m = mean(A); const total = A.reduce((s, x) => s + Math.abs(x - m), 0); return (mean(B) - mean(A)) / total;`
- C (0.4): Gets the difference 6 and the MAD 2.4 right but divides the wrong way, 2.4 / 6 = 0.4, answering how many times the difference the MAD is. | computation: `const A = [10,14,15,16,20], B = [17,19,21,22,26]; const mean = d => d.reduce((s, x) => s + x, 0) / d.length; const mad = d => { const m = mean(d); return d.reduce((s, x) => s + Math.abs(x - m), 0) / d.length; }; return mad(A) / (mean(B) - mean(A));`
- D (6): Finds the difference of the means, 21 - 15 = 6, and stops without comparing it to the mean absolute deviation. | computation: `const A = [10,14,15,16,20], B = [17,19,21,22,26]; const mean = d => d.reduce((s, x) => s + x, 0) / d.length; return mean(B) - mean(A);`

---

## MMG-D06

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The low temperatures, in degrees Celsius, in a town for 6 days in a row were -12, -6, -8, 0, 12, and -7. What was the mean low temperature, in degrees Celsius, for the 6 days?

A. -7.5
B. -3.5
C. -4.2
D. -6.5

KEY: B (-3.5)

Worked solution: Add the six temperatures. The negative ones: -12 + -6 + -8 + -7 = -33. The positive one is 12. The 0 adds nothing. Total: -33 + 12 = -21. There are 6 days (the day at 0 counts as a day), so the mean is -21 / 6 = -3.5 degrees Celsius.

Key computation (JS): `const t = [-12, -6, -8, 0, 12, -7]; return t.reduce((a, b) => a + b, 0) / t.length;`

Distractors:
- A (-7.5): Adds the positive 12 to the negatives as if it had the same sign (33 + 12 = 45, kept negative), so -45 / 6 = -7.5. | computation: `const neg = 12 + 6 + 8 + 7, pos = 12; return -(neg + pos) / 6;`
- C (-4.2): Leaves the 0 day out of the count, thinking a 0 does not count as a value: -21 / 5 = -4.2. | computation: `const t = [-12, -6, -8, 12, -7]; return t.reduce((a, b) => a + b, 0) / t.length;`
- D (-6.5): Orders the temperatures and gives the middle value, (-7 + -6) / 2 = -6.5: the median, not the mean. | computation: `const s = [-12, -6, -8, 0, 12, -7].sort((a, b) => a - b); return (s[2] + s[3]) / 2;`

---

## MMG-N15

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Lena solved two equations. The solution of x^3 = -0.216 is x, and the positive solution of y^2 = 1.69 is y. When she subtracts y from x, what number does she get?

A. -1.36
B. -0.73
C. -1.9
D. -0.7

KEY: C (-1.9)

Worked solution: Since 0.6 x 0.6 x 0.6 = 0.216, and a negative number cubed is negative, x = -0.6. Since 1.3 x 1.3 = 1.69, the positive solution is y = 1.3. Then x - y = -0.6 - 1.3 = -1.9.

Key computation (JS): `const x = -Math.cbrt(0.216); const y = Math.sqrt(1.69); return Math.round((x - y) * 100) / 100;`

Distractors:
- A (-1.36): Misplaces the decimal in the cube root, thinking 0.06 cubed is 0.216, so uses x = -0.06. | computation: `const x = -Math.cbrt(0.216) / 10; const y = Math.sqrt(1.69); return Math.round((x - y) * 100) / 100;`
- B (-0.73): Misplaces the decimal in the square root, thinking 0.13 squared is 1.69, so uses y = 0.13. | computation: `const x = -Math.cbrt(0.216); const y = Math.sqrt(1.69) / 10; return Math.round((x - y) * 100) / 100;`
- D (-0.7): Takes the cube root of -0.216 as positive 0.6, as if roots were always positive, then computes 0.6 - 1.3. | computation: `const x = Math.cbrt(0.216); const y = Math.sqrt(1.69); return Math.round((x - y) * 100) / 100;`

---

## MMG-N04

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A farmer has 168 acres of land. He plants corn on 2/7 of the land. He plants wheat on 5/8 of the remaining land. He leaves the rest of the land empty. How many acres does he plant with wheat?

A. 45
B. 57
C. 30
D. 75

KEY: D (75)

Worked solution: Corn uses 2/7 of 168 acres: 168 / 7 x 2 = 48 acres. The remaining land is 168 - 48 = 120 acres. Wheat uses 5/8 of the remaining 120 acres: 120 / 8 x 5 = 75 acres.

Key computation (JS): `return (168 - 168 * 2 / 7) * 5 / 8;`

Distractors:
- A (45): Does every step correctly but answers for the empty land, 120 - 75 = 45 (3/8 of the remaining land), instead of the wheat. | computation: `return (168 - 168 * 2 / 7) * 3 / 8;`
- B (57): Subtracts the fractions, 5/8 - 2/7 = 19/56, and takes 19/56 of all 168 acres, treating 'of the remaining land' as 'minus the corn fraction'. | computation: `return 168 * (5 / 8 - 2 / 7);`
- C (30): Takes 5/8 of the corn land (48 acres) instead of 5/8 of the remaining land. | computation: `return (168 * 2 / 7) * 5 / 8;`

---

## MMG-D10

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A spinner has 5 equal sections numbered 1 through 5. A fair number cube has faces numbered 1 through 6. Lena spins the spinner once and rolls the number cube once, then adds the two numbers. What is the probability that the sum is greater than 7?

A. 1/3
B. 1/2
C. 10/11
D. 2/5

KEY: A (1/3)

Worked solution: There are 5 x 6 = 30 equally likely outcomes. List the outcomes with a sum greater than 7 by the spinner number: spinner 2 needs a 6 (1 outcome); spinner 3 needs 5 or 6 (2); spinner 4 needs 4, 5 or 6 (3); spinner 5 needs 3, 4, 5 or 6 (4). That is 1 + 2 + 3 + 4 = 10 outcomes, so the probability is 10/30 = 1/3.

Key computation (JS): `let c = 0, t = 0; for (let a = 1; a <= 5; a++) for (let b = 1; b <= 6; b++) { t++; if (a + b > 7) c++; } return c / t;`

Distractors:
- B (1/2): Counts sums of 7 or more instead of greater than 7, adding the five outcomes with sum 7: 15/30 = 1/2. | computation: `let c = 0; for (let a = 1; a <= 5; a++) for (let b = 1; b <= 6; b++) if (a + b >= 7) c++; return c / 30;`
- C (10/11): Finds the 10 favorable outcomes but adds 5 + 6 = 11 for the number of outcomes instead of multiplying: 10/11. | computation: `let c = 0; for (let a = 1; a <= 5; a++) for (let b = 1; b <= 6; b++) if (a + b > 7) c++; return c / (5 + 6);`
- D (2/5): Lists the possible sums 2 through 11 (ten sums), treats them as equally likely, and counts 8, 9, 10 and 11: 4/10 = 2/5. | computation: `const sums = []; for (let s = 2; s <= 11; s++) sums.push(s); return sums.filter(s => s > 7).length / sums.length;`

---

## MMG-G15

Area: Geometry | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: In the xy-plane, point A is at (-9, -5). Point A is rotated 90 degrees clockwise about the origin. The image is then translated 2 units to the left and 6 units up. What is the x-coordinate of the final image?

A. 3
B. -7
C. -11
D. 15

KEY: B (-7)

Worked solution: A 90-degree clockwise rotation about the origin sends (x, y) to (y, -x). So (-9, -5) goes to (-5, 9). (Check: A is in the third quadrant; a quarter turn clockwise moves it into the second quadrant, where x is negative and y is positive.) Translating 2 units left and 6 units up gives (-5 - 2, 9 + 6) = (-7, 15). The x-coordinate is -7.

Key computation (JS): `const x = -9, y = -5; const rx = y, ry = -x; return rx - 2;`

Distractors:
- A (3): Uses the counterclockwise rule (x, y) -> (-y, x), giving (5, -9), then translates: (3, -3), x-coordinate 3. | computation: `const x = -9, y = -5; const rx = -y, ry = x; return rx - 2;`
- C (-11): Treats the turn as a reflection across the x-axis, (x, y) -> (x, -y), giving (-9, 5), then translates: (-11, 11), x-coordinate -11. | computation: `const x = -9, y = -5; const rx = x, ry = -y; return rx - 2;`
- D (15): Rotates and translates correctly to (-7, 15) but reports the y-coordinate, 15. | computation: `const x = -9, y = -5; const rx = y, ry = -x; return ry + 6;`

---

## MMG-G05

Area: Geometry | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A rectangular piece of cloth is 14 inches long and 5 inches wide. It is cut along a diagonal into two triangles that are the same size. What is the area of one triangle in square inches?

A. 19
B. 38
C. 35
D. 70

KEY: C (35)

Worked solution: The whole rectangle has area 14 x 5 = 70 square inches. Cutting along a diagonal splits it into two triangles of the same size, so each triangle has half the area: 70 / 2 = 35 square inches. (This is the same as one half x base x height, with base 14 and height 5.)

Key computation (JS): `return 14 * 5 / 2;`

Distractors:
- A (19): Adds the two side lengths, 14 + 5 = 19, instead of multiplying them for an area. | computation: `return 14 + 5;`
- B (38): Finds the perimeter of the rectangle, 2 x (14 + 5) = 38, mixing up area and perimeter. | computation: `return 2 * (14 + 5);`
- D (70): Finds the area of the whole rectangle, 14 x 5 = 70, and forgets that the cut makes two triangles, so one triangle is half. | computation: `return 14 * 5;`

---

## MMG-D09

Area: Statistics and Probability | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: There are 500 students at a school. Three students each took a different random sample of 20 students at the school and asked whether they bring lunch from home. The table shows how many students in each sample said yes. Use the mean of the three sample results to estimate how many of the 500 students at the school bring lunch from home.

Table (Students who bring lunch from home):

|  | Number who said yes (out of 20) |
| --- | --- |
| Sample 1 | 19 |
| Sample 2 | 9 |
| Sample 3 | 11 |

A. 475
B. 65
C. 275
D. 325

KEY: D (325)

Worked solution: The mean of the three sample results is (19 + 9 + 11) / 3 = 39 / 3 = 13 students out of 20. That is 13/20 = 65% of the students in a sample. Estimate for the school: 65% of 500 = 0.65 x 500 = 325 students.

Key computation (JS): `const s = [19, 9, 11]; const m = s.reduce((a, b) => a + b, 0) / s.length; return m / 20 * 500;`

Distractors:
- A (475): Uses only the first sample, 19 out of 20, and ignores the other two: 19/20 of 500 = 475. | computation: `return 19 / 20 * 500;`
- B (65): Finds the mean count 13 correctly but reads it as 13 percent instead of 13 out of 20, and takes 13% of 500 = 65. | computation: `const s = [19, 9, 11]; const m = s.reduce((a, b) => a + b, 0) / s.length; return m / 100 * 500;`
- C (275): Uses the median of the three samples (11) instead of the mean the stem asks for: 11/20 of 500 = 275. | computation: `const s = [19, 9, 11].sort((a, b) => a - b); return s[1] / 20 * 500;`

---

## MMG-N08

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A diver is 8 feet below the surface of a lake, so her position is -8 feet. She swims straight down at a steady rate of 1.5 feet per second for 14 seconds. What is her position, in feet, after the 14 seconds?

A. -29
B. -133
C. -22
D. 13

KEY: A (-29)

Worked solution: Swimming down is a negative change. In 14 seconds her position changes by (-1.5)(14) = -21 feet. Her new position is -8 + (-21) = -29 feet, which is 29 feet below the surface.

Key computation (JS): `return -8 + (-1.5) * 14;`

Distractors:
- B (-133): Combines the start and the rate first, (-8 - 1.5) x 14, so the starting depth is multiplied by the time as well. | computation: `return (-8 - 1.5) * 14;`
- C (-22): Multiplies only the whole-number part of the rate, 1 x 14 = 14, and drops the 0.5 x 14 = 7, so the change is -14 feet instead of -21 feet. | computation: `return -8 - 1 * 14;`
- D (13): Treats swimming down as a positive change, -8 + 1.5 x 14 = 13, which would put the diver above the surface. | computation: `return -8 + 1.5 * 14;`

---

## MMG-N09

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Without a calculator, Nora works out -3.6 ÷ (4/5) - (-1 1/4)(2.2). What number should she get?

A. -0.13
B. -1.75
C. -2.85
D. -7.15

KEY: B (-1.75)

Worked solution: Divide first: -3.6 ÷ (4/5) = -3.6 × (5/4) = -4.5. Next multiply: -1 1/4 is -1.25, and (-1.25)(2.2) = -2.75. Now subtract: -4.5 - (-2.75) = -4.5 + 2.75 = -1.75.

Key computation (JS): `const q = -3.6 / (4/5); const p = (-1.25) * 2.2; return Math.round((q - p) * 100) / 100;`

Distractors:
- A (-0.13): Multiplies -3.6 by 4/5 instead of by its reciprocal 5/4, getting -2.88, then adds 2.75. | computation: `const q = -3.6 * (4/5); const p = (-1.25) * 2.2; return Math.round((q - p) * 100) / 100;`
- C (-2.85): Reads -1 1/4 as -1 + 1/4 = -0.75 instead of -1.25, so the product is -1.65, and -4.5 - (-1.65) = -2.85. | computation: `const q = -3.6 / (4/5); const p = (-1 + 0.25) * 2.2; return Math.round((q - p) * 100) / 100;`
- D (-7.15): Works left to right: finds -4.5 - (-1 1/4) = -3.25 first and then multiplies by 2.2, instead of multiplying before subtracting. | computation: `const q = -3.6 / (4/5); return Math.round(((q - (-1.25)) * 2.2) * 100) / 100;`

---

## MMG-O03

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ravi read these directions: "Multiply the difference of 44 and 11 by 6. Then divide that product by the sum of 3 and 8." He must write one expression for the directions and find its value. What value should he get?

A. 74
B. 38
C. 18
D. 30

KEY: C (18)

Worked solution: The difference of 44 and 11 is 44 - 11 = 33. Multiply by 6: 33 x 6 = 198. The sum of 3 and 8 is 11. Divide: 198 / 11 = 18. The expression is (44 - 11) x 6 / (3 + 8) = 18.

Key computation (JS): `return (44 - 11) * 6 / (3 + 8);`

Distractors:
- A (74): Groups the difference but not the sum, so 198 is divided by 3 only and 8 is added afterwards. | computation: `return (44 - 11) * 6 / 3 + 8;`
- B (38): Groups the sum but not the difference, so only 11 is multiplied by 6: 44 - 66 / 11. | computation: `return 44 - 11 * 6 / (3 + 8);`
- D (30): Writes the numbers in order with no parentheses, 44 - 11 x 6 / 3 + 8, and follows the order of operations on that. | computation: `return 44 - 11 * 6 / 3 + 8;`

---

## MMG-D07

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A teacher asked 13 students how many books they read over the summer. The table shows how many students gave each answer. Use this rule for quartiles: the first quartile is the median of the lower half of the data and the third quartile is the median of the upper half, and when the number of values is odd, the median itself is not included in either half. What is the interquartile range of the 13 answers?

Table (Books read over the summer):

|  | Number of students |
| --- | --- |
| 2 | 3 |
| 3 | 1 |
| 4 | 1 |
| 5 | 1 |
| 6 | 2 |
| 7 | 5 |

A. 2
B. 4
C. 1
D. 4.5

KEY: D (4.5)

Worked solution: List the 13 answers in order: 2, 2, 2, 3, 4, 5, 6, 6, 7, 7, 7, 7, 7. The median is the 7th value, 6. The lower half is the 6 values before it: 2, 2, 2, 3, 4, 5, so the first quartile is (2 + 3) / 2 = 2.5. The upper half is the 6 values after it: 6, 7, 7, 7, 7, 7, so the third quartile is (7 + 7) / 2 = 7. The interquartile range is 7 - 2.5 = 4.5 books.

Key computation (JS): `const v = [2,2,2,3,4,5,6,6,7,7,7,7,7]; const med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; return med(v.slice(7)) - med(v.slice(0, 6));`

Distractors:
- A (2): Works on the 'Number of students' column as if it were the data: ordered counts 1, 1, 1, 2, 3, 5 give quartiles 1 and 3, so 3 - 1 = 2. | computation: `const c = [1,1,1,2,3,5]; const med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; return med(c.slice(3)) - med(c.slice(0, 3));`
- B (4): Keeps the median 6 in both halves (7 values each), so Q1 = 3 and Q3 = 7, and the IQR comes out 4. | computation: `const v = [2,2,2,3,4,5,6,6,7,7,7,7,7]; const med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; return med(v.slice(6)) - med(v.slice(0, 7));`
- C (1): Finds Q3 = 7 and subtracts the median 6 instead of Q1, giving only the upper part of the box: 7 - 6 = 1. | computation: `const v = [2,2,2,3,4,5,6,6,7,7,7,7,7]; const med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; return med(v.slice(7)) - med(v);`

---

## MMG-G02

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A display stand is made of two rectangular blocks that do not overlap. The bottom block is 7 inches long, 4 inches wide, and 3 inches tall. The top block is 5 inches long and 4 inches wide. It sits on the bottom block, and the top of the stand is 9 inches above the floor. What is the volume of the stand in cubic inches?

A. 204
B. 114
C. 264
D. 252

KEY: A (204)

Worked solution: Bottom block: 7 x 4 x 3 = 84 cubic inches. The top of the stand is 9 inches above the floor and the bottom block is 3 inches tall, so the top block is 9 - 3 = 6 inches tall. Top block: 5 x 4 x 6 = 120 cubic inches. The blocks do not overlap, so add: 84 + 120 = 204 cubic inches.

Key computation (JS): `const bottom = 7 * 4 * 3; const top = 5 * 4 * (9 - 3); return bottom + top;`

Distractors:
- B (114): Finds the top block's height 6 but multiplies only 5 x 6 = 30, leaving out the width, then adds 84 + 30 = 114. | computation: `const bottom = 7 * 4 * 3; const top = 5 * (9 - 3); return bottom + top;`
- C (264): Uses the height of the whole stand, 9 inches, as the height of the top block: 84 + 5 x 4 x 9 = 84 + 180 = 264. | computation: `const bottom = 7 * 4 * 3; const top = 5 * 4 * 9; return bottom + top;`
- D (252): Treats the stand as one box 7 by 4 by 9 inches, counting the empty space beside the top block: 7 x 4 x 9 = 252. | computation: `return 7 * 4 * 9;`

---

## MMG-D05

Area: Statistics and Probability | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: The histogram data below show the ages, in whole years, of all the people at a park one afternoon. What percent of the people at the park were younger than 12 years old?

Table (Ages of people at the park (years)):

|  | Number of people |
| --- | --- |
| 0 to 11 | 50 |
| 12 to 23 | 85 |
| 24 to 35 | 70 |
| 36 to 47 | 45 |

A. 50
B. 20
C. 25
D. 34

KEY: B (20)

Worked solution: People younger than 12 are in the 0 to 11 bar: 50 people. Altogether there are 50 + 85 + 70 + 45 = 250 people. Out of all 250 people, that is 50/250 = 1/5 = 0.20, which is 20%.

Key computation (JS): `const total = 50 + 85 + 70 + 45; return 50 / total * 100;`

Distractors:
- A (50): Reads the count of 50 people as the answer, reporting the number in the bar instead of the percent. | computation: `return 50;`
- C (25): Compares the children with everyone else, 50 out of 200 (part to part), instead of 50 out of all 250 people. | computation: `return 50 / (85 + 70 + 45) * 100;`
- D (34): Uses the bar whose label contains 12 (the 12 to 23 bar, 85 people), so 85/250 = 34%. | computation: `return 85 / (50 + 85 + 70 + 45) * 100;`
