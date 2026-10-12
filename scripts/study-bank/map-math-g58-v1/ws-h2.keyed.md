# Items for review, KEYED (29)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MMG-N13

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A square patio has an area of 18.49 square meters. A square rug has sides that are 1.7 meters shorter than the sides of the patio. What is the area of the rug, in square meters?

A. 6.76
B. 15.6
C. 10.4
D. 16.79

KEY: A (6.76)

Worked solution: The side of the patio is √18.49 = 4.3 meters, because 4.3 x 4.3 = 18.49. The rug's side is 4.3 - 1.7 = 2.6 meters. The rug's area is 2.6 x 2.6 = 6.76 square meters.

Key computation (JS): `const s = Math.sqrt(18.49) - 1.7; return Math.round(s * s * 100) / 100;`

Distractors:
- B (15.6): Thinks the new area is the old area minus 1.7 squared: 18.49 - 2.89, treating (4.3 - 1.7)^2 as 4.3^2 - 1.7^2. | computation: `return Math.round((18.49 - 1.7 * 1.7) * 100) / 100;`
- C (10.4): Finds the rug's side, 2.6 meters, correctly but then gives its perimeter, 4 x 2.6, instead of its area. | computation: `const s = Math.sqrt(18.49) - 1.7; return Math.round(4 * s * 100) / 100;`
- D (16.79): Subtracts the 1.7 meters from the area instead of from the side length: 18.49 - 1.7. | computation: `return Math.round((18.49 - 1.7) * 100) / 100;`

---

## MMG-O14

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In the xy-plane, the graph of the bottles y that Machine A fills in x minutes is a line through the origin and the point (3.5, 84). Machine B fills bottles at a rate given by the equation y = 30x. How many more minutes does Machine A take than Machine B to fill 360 bottles?

A. 15
B. 3
C. 60
D. 6

KEY: B (3)

Worked solution: Machine A's rate is the slope of its line: 84 / 3.5 = 24 bottles per minute. Machine B's rate is 30 bottles per minute. To fill 360 bottles, Machine A takes 360 / 24 = 15 minutes and Machine B takes 360 / 30 = 12 minutes. Machine A takes 15 - 12 = 3 more minutes.

Key computation (JS): `return 360 / (84 / 3.5) - 360 / 30;`

Distractors:
- A (15): Finds Machine A's time for 360 bottles and stops, without subtracting Machine B's time. | computation: `return 360 / (84 / 3.5);`
- C (60): Divides 360 by the difference of the rates, as if the gap in rates filled the bottles, instead of finding each machine's time. | computation: `return 360 / (30 - 84 / 3.5);`
- D (6): Finds both rates and answers with the difference in bottles per minute (30 - 24) instead of the difference in minutes. | computation: `return 30 - 84 / 3.5;`

---

## MMG-N02

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Kai divided a whole number by 24. His answer was 35 R17, which means the quotient was 35 and the remainder was 17. What number did Kai divide by 24?

A. 1248
B. 227
C. 857
D. 619

KEY: C (857)

Worked solution: Division and multiplication undo each other. The number Kai divided is 24 groups of 35 with 17 more: 24 x 35 = 840, and 840 + 17 = 857. Check: 857 / 24 = 35 R17, because 24 x 35 = 840 and 857 - 840 = 17.

Key computation (JS): `return 24 * 35 + 17;`

Distractors:
- A (1248): Adds the remainder to the quotient first, as if 35 R17 meant 52 groups, and then multiplies by 24. | computation: `return (35 + 17) * 24;`
- B (227): Sets up 24 x 35 + 17 correctly but forgets the placeholder zero in the tens partial product, writing 35 x 2 = 70 instead of 35 x 20 = 700, so 140 + 70 + 17 = 227. | computation: `return 35 * 4 + 35 * 2 + 17;`
- D (619): Mixes up the roles of the numbers and multiplies the quotient by the remainder, then adds the divisor: 35 x 17 + 24. | computation: `return 35 * 17 + 24;`

---

## MMG-G12

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The minute hand of a clock is 6 centimeters long. How many centimeters does the tip of the minute hand travel from 8:05 to 9:55? Use 3.14 for pi.

A. 31.4
B. 56.52
C. 34.54
D. 69.08

KEY: D (69.08)

Worked solution: The tip of the minute hand moves around a circle whose radius is the length of the hand, 6 cm. One full turn is the circumference: 2 x 3.14 x 6 = 37.68 cm. The minute hand makes one full turn every hour. From 8:05 to 9:55 is 1 hour 50 minutes. Fifty minutes is 50/60 = 5/6 of a turn, so the hand makes 1 5/6 turns. One turn is 37.68 cm and 5/6 of a turn is 37.68 x 5 / 6 = 31.4 cm, so the tip travels 37.68 + 31.4 = 69.08 cm.

Key computation (JS): `const lap = 2 * 3.14 * 6; const turns = 1 + 50 / 60; return Math.round(turns * lap * 100) / 100;`

Distractors:
- A (31.4): Compares where the hand points (at the 1 at 8:05, at the 11 at 9:55) and counts only those 50 minutes of a turn, missing the full turn in between: 37.68 x 5/6 = 31.4. | computation: `const lap = 2 * 3.14 * 6; return Math.round((50 / 60) * lap * 100) / 100;`
- B (56.52): Writes 1 hour 50 minutes as 1.50 hours, as if an hour had 100 minutes, and multiplies 1.5 x 37.68 = 56.52. | computation: `const lap = 2 * 3.14 * 6; return Math.round(1.5 * lap * 100) / 100;`
- C (34.54): Treats the 6 cm hand as the diameter, so one turn is 3.14 x 6 = 18.84 cm, then multiplies by 1 5/6 turns: 34.54. | computation: `const lap = 3.14 * 6; const turns = 1 + 50 / 60; return Math.round(turns * lap * 100) / 100;`

---

## MMG-N05

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Mia used 2 1/2 cups of flour to make 3/4 of a batch of muffins. At this rate, how many cups of flour are needed to make a full batch?

A. 3 1/3
B. 1 7/8
C. 3 1/8
D. 3 1/6

KEY: A (3 1/3)

Worked solution: The flour for a full batch is the flour used divided by the part of the batch made: 2 1/2 / (3/4) = 5/2 x 4/3 = 20/6 = 10/3 = 3 1/3 cups. Check: 3/4 of 3 1/3 is 3/4 x 10/3 = 30/12 = 2 1/2.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(5*4, 2*3);`

Distractors:
- B (1 7/8): Multiplies 2 1/2 by 3/4 instead of dividing, finding 3/4 of the flour already used. | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(5*3, 2*4);`
- C (3 1/8): Reasons that a full batch is 1/4 of a batch more, so adds 1/4 of the 2 1/2 cups (5/8 cup) instead of 1/3 of it. | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(5*8 + 5*2, 2*8);`
- D (3 1/6): Divides only the whole-number part by 3/4 (2 x 4/3 = 2 2/3) and then tacks the 1/2 back on unchanged, getting 3 1/6 instead of dividing all of 2 1/2. | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(2*4*2 + 1*3, 3*2);`

---

## MMG-O07

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ana took two tests. The first test had 40 questions, and she answered 85% of them correctly. The second test had 50 questions, and she got the same number of questions wrong as on the first test. What percent of the questions on the second test did Ana answer correctly?

A. 94
B. 88
C. 85
D. 68

KEY: B (88)

Worked solution: On the first test she answered 85% of 40 = 34 correctly, so she got 40 - 34 = 6 wrong. On the second test she also got 6 wrong, so she answered 50 - 6 = 44 correctly. 44 out of 50 is 44 / 50 = 0.88 = 88%.

Key computation (JS): `const wrong = 40 - 0.85 * 40; return (50 - wrong) / 50 * 100;`

Distractors:
- A (94): Finds 6 wrong but subtracts 6 from 100, treating the 6 questions as 6 percent of the second test. | computation: `const wrong = 40 - 0.85 * 40; return 100 - wrong;`
- C (85): Assumes that the same number wrong means the same percent correct, and keeps 85%. | computation: `return 85;`
- D (68): Carries the number CORRECT (34) to the second test instead of the number wrong, and writes 34 out of 50 as a percent. | computation: `return 0.85 * 40 / 50 * 100;`

---

## MMG-G13

Area: Geometry | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: In the xy-plane, point P is at (-21, -24). Point P is dilated by a scale factor of 1.5 with the center of dilation at the origin. What is the y-coordinate of the image of point P?

A. -25.5
B. -16
C. -36
D. -31.5

KEY: C (-36)

Worked solution: A dilation centered at the origin with scale factor 1.5 multiplies both coordinates by 1.5. The image of (-21, -24) is (-21 x 1.5, -24 x 1.5) = (-31.5, -36). Its y-coordinate is -36.

Key computation (JS): `return -24 * 1.5;`

Distractors:
- A (-25.5): Thinks a dilation by 1.5 moves the point 1.5 units farther from the origin, so the y-coordinate goes from -24 to -24 - 1.5 = -25.5. | computation: `return -24 - 1.5;`
- B (-16): Divides by the scale factor instead of multiplying: -24 / 1.5 = -16. | computation: `return -24 / 1.5;`
- D (-31.5): Dilates correctly but reports the x-coordinate of the image, -21 x 1.5 = -31.5. | computation: `return -21 * 1.5;`

---

## MMG-D15

Area: Statistics and Probability | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A survey asked 96 students two questions: Do you have a curfew? Do you do chores at home? Of the 96 students, 3/8 have a curfew. Of the students who have a curfew, 3/4 do chores at home. In all, 35 of the 96 students do chores at home. How many of the students who do NOT have a curfew also do NOT do chores at home?

A. 33
B. 25
C. 8
D. 52

KEY: D (52)

Worked solution: Make a two-way table. Curfew: 3/8 of 96 = 36 students, so 96 - 36 = 60 have no curfew. Curfew and chores: 3/4 of 36 = 27. Chores in all is 35, so no curfew and chores: 35 - 27 = 8. No curfew and no chores: 60 - 8 = 52 students.

Key computation (JS): `const N = 96, C = N * 3 / 8, CC = C * 3 / 4, T = 35; return (N - C) - (T - CC);`

Distractors:
- A (33): Subtracts the curfew group's chores count, 27, from the no-curfew row total, 60 - 27 = 33, mixing up which row's chores count belongs there. | computation: `const N = 96, C = N * 3 / 8, CC = C * 3 / 4; return (N - C) - CC;`
- B (25): Subtracts the whole chores column, 35, from the no-curfew row total, 60 - 35 = 25, as if every student who does chores had no curfew. | computation: `const N = 96, C = N * 3 / 8, T = 35; return (N - C) - T;`
- C (8): Finds the no-curfew students who DO chores (35 - 27 = 8) and stops, giving the wrong cell of the no-curfew row. | computation: `const N = 96, C = N * 3 / 8, CC = C * 3 / 4, T = 35; return T - CC;`

---

## MMG-D02

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Students measured some worms. The line plot data are shown in the table: each row gives a length, in inches, and the number of worms with that length. What is the total length, in inches, of all the worms that are 1 1/4 inches long or 1 3/4 inches long?

Table (Worm lengths (inches)):

|  | Number of worms |
| --- | --- |
| 1/2 | 5 |
| 3/4 | 3 |
| 1 1/4 | 4 |
| 1 3/4 | 2 |

A. 8 1/2
B. 7
C. 6
D. 3

KEY: A (8 1/2)

Worked solution: There are 4 worms that are 1 1/4 inches long: 4 x 1 1/4 = 4 x 5/4 = 20/4 = 5 inches. There are 2 worms that are 1 3/4 inches long: 2 x 1 3/4 = 2 x 7/4 = 14/4 = 3 1/2 inches. Together: 5 + 3 1/2 = 8 1/2 inches.

Key computation (JS): `const v = 4 * (5 / 4) + 2 * (7 / 4); const D = 4; const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, dd = D; const k = g(r, dd) || 1; r /= k; dd /= k; return r ? (w ? w + ' ' + r + '/' + dd : r + '/' + dd) : String(w);`

Distractors:
- B (7): Multiplies only the whole-number part by the count (4 x 1 and 2 x 1) and adds each fraction once: 4 1/4 + 2 3/4 = 7. | computation: `return (4 * 1 + 1 / 4) + (2 * 1 + 3 / 4);`
- C (6): Adds the numbers of worms (4 + 2) instead of their lengths, answering how many worms rather than how long. | computation: `return 4 + 2;`
- D (3): Ignores the counts and adds one of each length, 1 1/4 + 1 3/4 = 3, as if each row were one worm. | computation: `return (5 / 4) + (7 / 4);`

---

## MMG-N03

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A baker has 6 bags of flour, and each bag holds 3 3/4 pounds. She saves 2 1/2 pounds of the flour for later. She uses the rest to bake loaves of bread. Each loaf needs 1/4 pound of flour. How many loaves can she bake?

A. 65
B. 80
C. 5
D. 30

KEY: B (80)

Worked solution: The bags hold 6 x 3 3/4 = 18 + 4 1/2 = 22 1/2 pounds of flour. She saves 2 1/2 pounds, so she uses 22 1/2 - 2 1/2 = 20 pounds. Each loaf needs 1/4 pound, so each pound makes 4 loaves: 20 / (1/4) = 20 x 4 = 80 loaves.

Key computation (JS): `return (6 * 3.75 - 2.5) * 4;`

Distractors:
- A (65): Multiplies only the whole part of 3 3/4 by 6 and keeps the 3/4: 18 3/4 pounds, minus 2 1/2 is 16 1/4, and 16 1/4 x 4 = 65. | computation: `return (6 * 3 + 0.75 - 2.5) * 4;`
- C (5): Finds the 20 pounds correctly but multiplies by 1/4 (or divides by 4) instead of dividing by 1/4. | computation: `return (6 * 3.75 - 2.5) / 4;`
- D (30): Saves 2 1/2 pounds from every bag instead of from the flour in all: (3 3/4 - 2 1/2) x 6 = 7 1/2 pounds, then 7 1/2 x 4 = 30. | computation: `return (3.75 - 2.5) * 6 * 4;`

---

## MMG-D08

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The table shows the ages, in years, of the 25 children at a summer camp and how many children are each age. The mean absolute deviation is the mean of the distances between each value and the mean of the data. What is the mean absolute deviation of the 25 ages, in years?

Table (Ages of children at camp (years)):

|  | Number of children |
| --- | --- |
| 6 | 4 |
| 7 | 6 |
| 8 | 7 |
| 9 | 2 |
| 10 | 6 |

A. 1.2
B. 5.6
C. 1.12
D. 8

KEY: C (1.12)

Worked solution: First find the mean age. Total of the ages: 4 x 6 + 6 x 7 + 7 x 8 + 2 x 9 + 6 x 10 = 24 + 42 + 56 + 18 + 60 = 200, so the mean is 200 / 25 = 8 years. Distances from 8: age 6 is 2 away (4 children: 8), age 7 is 1 away (6 children: 6), age 8 is 0 away, age 9 is 1 away (2 children: 2), age 10 is 2 away (6 children: 12). Total distance: 8 + 6 + 0 + 2 + 12 = 28. Mean absolute deviation: 28 / 25 = 1.12 years.

Key computation (JS): `const a = [6,7,8,9,10], c = [4,6,7,2,6]; const n = c.reduce((s, x) => s + x, 0); const m = a.reduce((s, v, i) => s + v * c[i], 0) / n; return a.reduce((s, v, i) => s + Math.abs(v - m) * c[i], 0) / n;`

Distractors:
- A (1.2): Finds the mean 8 but then averages the five listed distances once each, (2 + 1 + 0 + 1 + 2) / 5 = 1.2, treating the rows as the data instead of the 25 children. | computation: `const a = [6,7,8,9,10], c = [4,6,7,2,6]; const n = c.reduce((s, x) => s + x, 0); const m = a.reduce((s, v, i) => s + v * c[i], 0) / n; return a.reduce((s, v) => s + Math.abs(v - m), 0) / a.length;`
- B (5.6): Gets the weighted total distance 28 right but divides by the 5 rows of the table instead of the 25 children: 28 / 5 = 5.6. | computation: `const a = [6,7,8,9,10], c = [4,6,7,2,6]; const n = c.reduce((s, x) => s + x, 0); const m = a.reduce((s, v, i) => s + v * c[i], 0) / n; return a.reduce((s, v, i) => s + Math.abs(v - m) * c[i], 0) / a.length;`
- D (8): Stops after the first stage and reports the mean age, 8, as the answer. | computation: `const a = [6,7,8,9,10], c = [4,6,7,2,6]; const n = c.reduce((s, x) => s + x, 0); return a.reduce((s, v, i) => s + v * c[i], 0) / n;`

---

## MMG-O08

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Jo mows 3 2/3 acres of lawn in 2 3/4 hours, working at a steady rate. At this rate, how many minutes does it take Jo to mow 1 acre?

A. 75
B. 80
C. 55
D. 45

KEY: D (45)

Worked solution: Time for 1 acre = hours / acres = 2 3/4 / 3 2/3 = 11/4 / 11/3 = 11/4 x 3/11 = 3/4 hour. 3/4 of 60 minutes is 45 minutes.

Key computation (JS): `return (2.75 / (11 / 3)) * 60;`

Distractors:
- A (75): Finds 0.75 hour and reads it as 75 minutes, as if an hour had 100 minutes. | computation: `return (2.75 / (11 / 3)) * 100;`
- B (80): Divides acres by hours (4/3 acre per hour) and treats that as hours per acre: 4/3 x 60. | computation: `return ((11 / 3) / 2.75) * 60;`
- C (55): Drops the fraction part of 3 2/3 and divides 2 3/4 hours by 3 acres: 165 minutes / 3. | computation: `return (2.75 / 3) * 60;`

---

## MMG-O11

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A school club spent 1/4 of its budget on T-shirts. Then it spent $30 on snacks. After that, the club had 1/3 of its budget left. What was the club's budget, in dollars?

A. 72
B. 45
C. 60
D. 90

KEY: A (72)

Worked solution: Let b be the budget. T-shirts used (1/4)b and 1/3 of b is left, so the snacks were the rest: 1 - 1/4 - 1/3 = 12/12 - 3/12 - 4/12 = 5/12 of the budget. So (5/12)b = 30 and b = 30 x 12/5 = 72. Check: 18 on T-shirts, 30 on snacks, 24 left, and 24 is 1/3 of 72.

Key computation (JS): `return 30 / (1 - 1/4 - 1/3);`

Distractors:
- B (45): Leaves out the T-shirt spending and treats the $30 as everything except the 1/3 left: (2/3)b = 30. | computation: `return 30 / (1 - 1/3);`
- C (60): Reads 'had 1/3 of its budget left' as 1/3 of the money left after the T-shirts, so the snacks are 2/3 of 3/4 = 1/2 of the budget: (1/2)b = 30. | computation: `return 30 / ((1 - 1/4) * (1 - 1/3));`
- D (90): Attaches the $30 to the wrong part: treats the snack money as the 1/3 of the budget, so b = 30 x 3. | computation: `return 30 / (1/3);`

---

## MMG-O06

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: In the expression 3(3x - k) + 15x, the letter k stands for a number. The expression is equivalent to 24x - 36. What is the value of k?

A. 33
B. 12
C. 7
D. 1.5

KEY: B (12)

Worked solution: Distribute the 3: 3(3x - k) = 9x - 3k. Add 15x: 9x + 15x - 3k = 24x - 3k. For this to equal 24x - 36, the constants must match: 3k = 36, so k = 36 / 3 = 12.

Key computation (JS): `return 36 / 3;`

Distractors:
- A (33): Gets 3k = 36 but subtracts 3 instead of dividing by 3. | computation: `return 36 - 3;`
- C (7): Combines the 15 from 15x with the constant, writing 3k + 15 = 36, so k = 21 / 3. | computation: `return (36 - 15) / 3;`
- D (1.5): Divides the constant 36 by the x-coefficient 24 instead of by the 3 that multiplies k. | computation: `return 36 / 24;`

---

## MMG-N12

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Leo needs to estimate 2√5 without a calculator. Which of these numbers is closest to the value of 2√5 ?

A. 5.0
B. 3.2
C. 4.5
D. 4.2

KEY: C (4.5)

Worked solution: Since 2^2 = 4 and 3^2 = 9, √5 is between 2 and 3, and it is much closer to 2. Closer in: 2.2^2 = 4.84 and 2.3^2 = 5.29, so √5 is about 2.24. Then 2√5 is about 2 x 2.24 = 4.48, and of the choices 4.5 is closest. (Check: (2√5)^2 = 4 x 5 = 20, and 4.5^2 = 20.25 is close to 20.)

Key computation (JS): `return (Math.round(2 * Math.sqrt(5) * 10) / 10).toFixed(1);`

Distractors:
- A (5.0): Treats the square root of 5 as half of 5, so √5 = 2.5 and 2√5 = 5.0. | computation: `return (2 * (5 / 2)).toFixed(1);`
- B (3.2): Moves the 2 under the square root without squaring it, treating 2√5 as √10, which is about 3.2. | computation: `return (Math.round(Math.sqrt(2 * 5) * 10) / 10).toFixed(1);`
- D (4.2): Reads 2√5 the way a mixed number is read, as 2 + √5, and gets about 2 + 2.24 = 4.2. | computation: `return (Math.round((2 + Math.sqrt(5)) * 10) / 10).toFixed(1);`

---

## MMG-N10

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The price of one share of a stock went down $1.15 each day for 8 days in a row. Then it went up $0.45 each day for the next 4 days. After these changes, the price was $36.15. What was the price, in dollars, before the changes began?

A. 28.75
B. 36.85
C. 41.75
D. 43.55

KEY: D (43.55)

Worked solution: The 8 days of drops change the price by 8 x (-1.15) = -9.20. The 4 days of gains change it by 4 x 0.45 = +1.80. The total change is -9.20 + 1.80 = -7.40. So the starting price minus 7.40 equals 36.15, and the starting price is 36.15 - (-7.40) = 36.15 + 7.40 = 43.55 dollars.

Key computation (JS): `const net = -1.15 * 8 + 0.45 * 4; return (Math.round((36.15 - net) * 100) / 100).toFixed(2);`

Distractors:
- A (28.75): Applies the changes to the ending price instead of undoing them: 36.15 - 9.20 + 1.80. | computation: `const net = -1.15 * 8 + 0.45 * 4; return (Math.round((36.15 + net) * 100) / 100).toFixed(2);`
- B (36.85): Combines the daily changes into -0.70 but forgets to multiply each by its number of days, then undoes -0.70. | computation: `const net = -1.15 + 0.45; return (Math.round((36.15 - net) * 100) / 100).toFixed(2);`
- C (41.75): Uses 8 days for both stages, so the gains total 3.60 instead of 1.80, then undoes a net change of -5.60. | computation: `const net = -1.15 * 8 + 0.45 * 8; return (Math.round((36.15 - net) * 100) / 100).toFixed(2);`

---

## MMG-O02

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Lena's teacher wrote 4 x [50 - (14 + 6) / 5] on the board and asked the class to find its value, using the correct order of operations. What value should Lena get?

A. 184
B. 36
C. 24
D. 196

KEY: A (184)

Worked solution: Start inside the parentheses: 14 + 6 = 20. Inside the brackets, divide before subtracting: 20 / 5 = 4, then 50 - 4 = 46. Last, multiply: 4 x 46 = 184.

Key computation (JS): `return 4 * (50 - (14 + 6) / 5);`

Distractors:
- B (36): Ignores the brackets and goes left to right: 4 x 50 = 200, 200 - 20 = 180, 180 / 5 = 36. | computation: `return (4 * 50 - (14 + 6)) / 5;`
- C (24): Inside the brackets works left to right: 50 - 20 = 30, then 30 / 5 = 6, then 4 x 6. | computation: `return 4 * ((50 - (14 + 6)) / 5);`
- D (196): Multiplies 4 by the 50 only and then subtracts 20 / 5 = 4, as if the brackets were not there. | computation: `return 4 * 50 - (14 + 6) / 5;`

---

## MMG-G09

Area: Geometry | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A circular running track has a diameter of 50 meters. Ana runs complete laps around the track until she has run at least 1000 meters. Using 3.14 for pi, what is the fewest number of complete laps she can run?

A. 4
B. 7
C. 20
D. 6

KEY: B (7)

Worked solution: One lap is the circumference of the circle: C = 3.14 x 50 = 157 meters. Divide: 1000 / 157 is about 6.37. Six laps are only 6 x 157 = 942 meters, which is less than 1000. Seven laps are 7 x 157 = 1099 meters, which is at least 1000. So Ana must run 7 complete laps.

Key computation (JS): `const lap = 3.14 * 50; return Math.ceil(1000 / lap);`

Distractors:
- A (4): Uses C = 2 x 3.14 x r with the diameter 50 in place of the radius, so one lap looks like 314 m and 1000 / 314 = 3.2 rounds up to 4 laps. | computation: `const lap = 2 * 3.14 * 50; return Math.ceil(1000 / lap);`
- C (20): Leaves out pi and treats the diameter as the distance around, so one lap is 50 m and 1000 / 50 = 20 laps. | computation: `const lap = 50; return Math.ceil(1000 / lap);`
- D (6): Finds 1000 / 157 = 6.37 and drops the decimal, not noticing that 6 laps (942 m) do not reach 1000 m. | computation: `const lap = 3.14 * 50; return Math.floor(1000 / lap);`

---

## MMG-N01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A rope is 3 1/3 meters long. Ben cuts off 4/5 of the rope to use for a swing. How many meters long is the piece that Ben cuts off?

A. 3 4/15
B. 4 1/6
C. 2 2/3
D. 2 11/15

KEY: C (2 2/3)

Worked solution: Write the mixed number as a fraction: 3 1/3 = 10/3. Then 4/5 of 10/3 is 4/5 x 10/3 = 40/15 = 8/3. As a mixed number, 8/3 = 2 2/3. The piece Ben cuts off is 2 2/3 meters long.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(4*10, 5*3);`

Distractors:
- A (3 4/15): Keeps the whole number 3 and multiplies only the fraction parts, 4/5 x 1/3 = 4/15, giving 3 4/15. | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(3*5*3 + 4*1, 5*3);`
- B (4 1/6): Divides 3 1/3 by 4/5 instead of multiplying, flipping the 4/5 as in a division problem. | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(10*5, 3*4);`
- D (2 11/15): Multiplies only the whole part, 4/5 x 3 = 2 2/5, and then adds the 1/3 without multiplying it. | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;return Math.floor(n/d)+' '+(n%d)+'/'+d;}; return f(4*3*3 + 1*5, 5*3);`

---

## MMG-G03

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Jon builds an open box with no lid out of 1-centimeter cubes. On the outside, the box is 7 centimeters long, 5 centimeters wide, and 4 centimeters tall. The bottom and the four walls are each 1 cube thick, and the inside is empty. How many cubes does Jon use?

A. 140
B. 166
C. 110
D. 95

KEY: D (95)

Worked solution: If the box were solid it would hold 7 x 5 x 4 = 140 cubes. The empty inside space is a smaller box. There is a wall at each end and at each side, so the inside is 7 - 2 = 5 cm long and 5 - 2 = 3 cm wide. There is a bottom but no lid, so the inside is 4 - 1 = 3 cm tall. The inside holds 5 x 3 x 3 = 45 cubes' worth of space. Jon uses 140 - 45 = 95 cubes.

Key computation (JS): `const outside = 7 * 5 * 4; const inside = (7 - 2) * (5 - 2) * (4 - 1); return outside - inside;`

Distractors:
- A (140): Multiplies the outside measurements, 7 x 5 x 4 = 140, and forgets that the inside is empty. | computation: `return 7 * 5 * 4;`
- B (166): Counts the square faces on the outside of a 7 by 5 by 4 box, 2 x (35 + 28 + 20) = 166, thinking each face square is one cube; this counts the edge and corner cubes two or three times. | computation: `return 2 * (7 * 5 + 7 * 4 + 5 * 4);`
- C (110): Treats the box as closed, taking 2 off the height as well (a bottom and a lid), so the inside is 5 x 3 x 2 = 30 and 140 - 30 = 110. | computation: `const outside = 7 * 5 * 4; const inside = (7 - 2) * (5 - 2) * (4 - 2); return outside - inside;`

---

## MMG-D13

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A typing teacher made a scatter plot of x, the number of minutes each student practiced typing per day, and y, the student's typing speed in words per minute. A line of fit for the data is y = 0.8x + 6. According to the line of fit, how many minutes per day of practice go with a typing speed of 48 words per minute?

A. 52.5
B. 60
C. 44.4
D. 33.6

KEY: A (52.5)

Worked solution: A typing speed of 48 words per minute is a y-value, so set y = 48 and solve for x: 0.8x + 6 = 48, so 0.8x = 42, and x = 42 / 0.8 = 52.5. The line of fit predicts 52.5 minutes of practice per day.

Key computation (JS): `return (48 - 6) / 0.8;`

Distractors:
- B (60): Ignores the intercept 6 and divides the speed by the slope as if the line went through the origin: 48 / 0.8 = 60. | computation: `return 48 / 0.8;`
- C (44.4): Treats 48 as the x-value and substitutes it into the equation: 0.8 x 48 + 6 = 44.4, which is a typing speed, not minutes of practice. | computation: `return Math.round((0.8 * 48 + 6) * 10) / 10;`
- D (33.6): Subtracts the intercept correctly (48 - 6 = 42) but then multiplies by the slope instead of dividing: 42 x 0.8 = 33.6. | computation: `return Math.round((48 - 6) * 0.8 * 10) / 10;`

---

## MMG-G11

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Points A, B and C lie on a straight line, with B between A and C. Ray BD is perpendicular to line AC. Ray BE lies inside angle DBC. The measure of angle DBE is 18 degrees more than twice the measure of angle EBC. What is the measure of angle ABE, in degrees?

A. 144
B. 156
C. 126
D. 114

KEY: B (156)

Worked solution: Ray BD is perpendicular to the line, so angle DBC is a right angle, and angles DBE and EBC together make it. Let angle EBC = x. Then (2x + 18) + x = 90, so 3x = 72 and x = 24. Angle ABE and angle EBC together make the straight angle ABC, so angle ABE = 180 - 24 = 156 degrees. (Check: angle DBE = 2 x 24 + 18 = 66, and angle ABE = 90 + 66 = 156.)

Key computation (JS): `const x = (90 - 18) / 3; return 180 - x;`

Distractors:
- A (144): Adds 18 instead of subtracting it when solving: 3x = 90 + 18, x = 36, then 180 - 36 = 144. | computation: `const x = (90 + 18) / 3; return 180 - x;`
- C (126): Does not use the perpendicular ray and treats angles DBE and EBC as supplementary: 3x + 18 = 180, x = 54, then 180 - 54 = 126. | computation: `const x = (180 - 18) / 3; return 180 - x;`
- D (114): Solves correctly (EBC = 24, DBE = 66) but takes the supplement of angle DBE instead of angle EBC: 180 - 66 = 114. | computation: `const x = (90 - 18) / 3; const dbe = 2 * x + 18; return 180 - dbe;`

---

## MMG-G01

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A square garden is drawn on a coordinate plane where each unit is 1 meter. Two of its corners are at (4, 6) and (4, 13), and the side joining them is one side of the square. What is the area of the garden in square meters?

A. 64
B. 361
C. 49
D. 169

KEY: C (49)

Worked solution: Both corners have x-coordinate 4, so the side between them runs straight up and down. Its length is the difference of the y-coordinates: 13 - 6 = 7 meters. All four sides of a square are equal, so the area is 7 x 7 = 49 square meters.

Key computation (JS): `const side = 13 - 6; return side * side;`

Distractors:
- A (64): Counts the grid points from y = 6 to y = 13 (6, 7, ..., 13 is eight points) instead of the units between them, so the side is 8 and the area 64. | computation: `const side = 13 - 6 + 1; return side * side;`
- B (361): Adds the two y-coordinates instead of subtracting them (6 + 13 = 19) and squares 19. | computation: `const side = 13 + 6; return side * side;`
- D (169): Reads the y-coordinate 13 of the upper corner as the side length and forgets to subtract where the side starts, so 13 x 13 = 169. | computation: `const side = 13; return side * side;`

---

## MMG-G08

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A garden plot is drawn on a coordinate plane in which each unit is 1 meter. Its corners, in order, are (-2, -4), (5, -4), (5, 1), (1, 9), and (-2, 9). What is the area of the garden plot in square meters?

A. 19
B. 23
C. 59
D. 75

KEY: D (75)

Worked solution: Draw the rectangle around the plot: it runs from x = -2 to x = 5, a width of 5 - (-2) = 7, and from y = -4 to y = 9, a height of 9 - (-4) = 13. Its area is 7 x 13 = 91. The plot is this rectangle with the top right corner cut off along the side from (5, 1) to (1, 9). The cut-off piece is a right triangle with legs 5 - 1 = 4 (across the top) and 9 - 1 = 8 (down the right side), so its area is 1/2 x 4 x 8 = 16. The plot's area is 91 - 16 = 75 square meters.

Key computation (JS): `const W = 5 - (-2); const H = 9 - (-4); const tri = (5 - 1) * (9 - 1) / 2; return W * H - tri;`

Distractors:
- A (19): Finds the height as 9 - 4 = 5, ignoring that -4 is below the x-axis, so the rectangle is 7 x 5 = 35 and 35 - 16 = 19. | computation: `const W = 5 - (-2); const H = 9 - 4; const tri = (5 - 1) * (9 - 1) / 2; return W * H - tri;`
- B (23): Finds the width as 5 - 2 = 3, ignoring that -2 is left of the y-axis, so the rectangle is 3 x 13 = 39 and 39 - 16 = 23. | computation: `const W = 5 - 2; const H = 9 - (-4); const tri = (5 - 1) * (9 - 1) / 2; return W * H - tri;`
- C (59): Uses the rectangle method correctly but forgets the one half on the corner triangle, subtracting 4 x 8 = 32: 91 - 32 = 59. | computation: `const W = 5 - (-2); const H = 9 - (-4); const tri = (5 - 1) * (9 - 1); return W * H - tri;`

---

## MMG-D14

Area: Statistics and Probability | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Students in a school were asked whether they have a cell phone and whether they ride the bus to school. The table shows the results, where each entry is a percent of ALL the students surveyed. Of the students who have a cell phone, what percent ride the bus to school?

Table (Percent of all students surveyed):

|  | Rides the bus | Does not ride the bus |
| --- | --- | --- |
| Has a cell phone | 24% | 56% |
| Does not have a cell phone | 8% | 12% |

A. 30
B. 32
C. 40
D. 75

KEY: A (30)

Worked solution: Students with a cell phone make up 24% + 56% = 80% of everyone surveyed. Of those, 24% of everyone ride the bus. So the percent of phone owners who ride the bus is 24 / 80 = 0.3 = 30%.

Key computation (JS): `const p = 24, q = 56; return 100 * p / (p + q);`

Distractors:
- B (32): Ignores the condition 'of the students who have a cell phone' and adds the bus column: 24% + 8% = 32% of all students ride the bus. | computation: `const p = 24, r = 8; return p + r;`
- C (40): Does the row calculation correctly but on the wrong row, the students WITHOUT a phone: 8 / (8 + 12) = 40%. | computation: `const r = 8, s = 12; return 100 * r / (r + s);`
- D (75): Divides by the bus column total instead of the phone row total, 24 / 32 = 75%, which answers 'of the bus riders, what percent have a phone?' | computation: `const p = 24, r = 8; return 100 * p / (p + r);`

---

## MMG-D04

Area: Statistics and Probability | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A science class put water in some beakers. The table shows the line plot data: each row gives an amount of water, in liters, and the number of beakers that held that amount. All the water is poured together and then shared equally among all of the beakers. How many liters of water will be in each beaker?

Table (Water in each beaker (liters)):

|  | Number of beakers |
| --- | --- |
| 1/8 | 1 |
| 1/4 | 2 |
| 3/8 | 4 |
| 3/4 | 3 |

A. 1 3/32
B. 7/16
C. 3/8
D. 3/20

KEY: B (7/16)

Worked solution: First find the total amount of water. 1 beaker x 1/8 = 1/8, 2 beakers x 1/4 = 4/8, 4 beakers x 3/8 = 12/8, and 3 beakers x 3/4 = 18/8. Total: 1/8 + 4/8 + 12/8 + 18/8 = 35/8 liters. There are 1 + 2 + 4 + 3 = 10 beakers. Sharing equally: 35/8 / 10 = 35/8 x 1/10 = 35/80 = 7/16 liter in each beaker.

Key computation (JS): `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; return F((1*1/8 + 2*1/4 + 4*3/8 + 3*3/4) / (1+2+4+3), 80);`

Distractors:
- A (1 3/32): Finds the correct total 35/8 but divides by the 4 rows of the table instead of the 10 beakers: 35/32 = 1 3/32. | computation: `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; return F((1*1/8 + 2*1/4 + 4*3/8 + 3*3/4) / 4, 64);`
- C (3/8): Averages the four amounts in the table, (12/8) / 4 = 3/8, treating the four rows as the data instead of the ten beakers. | computation: `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; return F((1/8 + 1/4 + 3/8 + 3/4) / 4, 64);`
- D (3/20): Adds each listed amount once (1/8 + 1/4 + 3/8 + 3/4 = 12/8), ignoring how many beakers held it, then divides by the 10 beakers: 12/80 = 3/20. | computation: `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; return F((1/8 + 1/4 + 3/8 + 3/4) / (1+2+4+3), 80);`

---

## MMG-D03

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On Monday, Sam ran 4 laps around a track. One lap is 400 meters. On Tuesday, Sam ran 2.45 kilometers. How many kilometers did Sam run on the two days in all?

A. 2.85
B. 2.61
C. 4.05
D. 18.45

KEY: C (4.05)

Worked solution: On Monday Sam ran 4 x 400 = 1,600 meters. There are 1,000 meters in 1 kilometer, so 1,600 meters = 1,600 / 1,000 = 1.6 kilometers. In all: 1.6 + 2.45 = 4.05 kilometers. (Line up the decimal points: 1.60 + 2.45 = 4.05.)

Key computation (JS): `const mon = 4 * 400 / 1000; return Math.round((mon + 2.45) * 100) / 100;`

Distractors:
- A (2.85): Converts one lap, 400 m = 0.4 km, and forgets that Sam ran 4 laps: 0.4 + 2.45 = 2.85. | computation: `return Math.round((400 / 1000 + 2.45) * 100) / 100;`
- B (2.61): Gets 1.6 but adds it to 2.45 by lining up the last digits (2.45 + 0.16), the classic decimal-alignment slip: 2.61. | computation: `return Math.round((0.16 + 2.45) * 100) / 100;`
- D (18.45): Divides 1,600 meters by 100 instead of 1,000 (mixing up meters-to-kilometers with centimeters-to-meters): 16 + 2.45 = 18.45. | computation: `return Math.round((4 * 400 / 100 + 2.45) * 100) / 100;`

---

## MMG-G07

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A small storage box is shaped like a rectangular prism. It is 2/3 meter long and 1/2 meter wide. Its height is 4/5 of its length. What is the volume of the box in cubic meters?

A. 1 7/10
B. 5/18
C. 13/15
D. 8/45

KEY: D (8/45)

Worked solution: First find the height: 4/5 of 2/3 is 4/5 x 2/3 = 8/15 meter. Then multiply the three edge lengths: V = 2/3 x 1/2 x 8/15. 2/3 x 1/2 = 2/6 = 1/3, and 1/3 x 8/15 = 8/45. The volume is 8/45 cubic meter.

Key computation (JS): `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; const h = 4 / 5 * (2 / 3); return F(2 / 3 * (1 / 2) * h, 45);`

Distractors:
- A (1 7/10): Finds the height 8/15 and then adds the three edge lengths instead of multiplying: 2/3 + 1/2 + 8/15 = 51/30 = 1 7/10. | computation: `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; const h = 4 / 5 * (2 / 3); return F(2 / 3 + 1 / 2 + h, 10);`
- B (5/18): Finds '4/5 of the length' by dividing instead of multiplying (2/3 / 4/5 = 5/6), then multiplies correctly: 2/3 x 1/2 x 5/6 = 10/36 = 5/18. | computation: `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; const h = (2 / 3) / (4 / 5); return F(2 / 3 * (1 / 2) * h, 18);`
- C (13/15): Finds the height 8/15 and the base 2/3 x 1/2 = 1/3, then adds them instead of multiplying: 1/3 + 8/15 = 13/15. | computation: `const F = (v, D) => { const g = (a, b) => b ? g(b, a % b) : a; const n = Math.round(v * D); const w = Math.floor(n / D); let r = n % D, d = D; const k = g(r, d) || 1; r /= k; d /= k; return r ? (w ? w + ' ' + r + '/' + d : r + '/' + d) : String(w); }; const h = 4 / 5 * (2 / 3); return F(2 / 3 * (1 / 2) + h, 15);`

---

## MMG-G04

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: On a park map drawn on a coordinate plane, each unit stands for 20 meters. Tara starts at the gate at (2, 1) and walks along grid lines. She walks straight right to the pond, which is directly below the tower at (8, 13). Then she walks straight up to the tower, and then straight left to the picnic area at (3, 13). How many meters does Tara walk in all?

A. 460
B. 260
C. 320
D. 220

KEY: A (460)

Worked solution: The pond is straight right of the gate, so it has the gate's y-coordinate 1, and it is directly below the tower, so it has the tower's x-coordinate 8: the pond is at (8, 1). Gate to pond: 8 - 2 = 6 units. Pond to tower: 13 - 1 = 12 units. Tower to picnic area: 8 - 3 = 5 units. In all, 6 + 12 + 5 = 23 units. Each unit is 20 meters, so Tara walks 23 x 20 = 460 meters.

Key computation (JS): `const units = (8 - 2) + (13 - 1) + (8 - 3); return units * 20;`

Distractors:
- B (260): Finds how far the picnic area is from the gate along grid lines (1 unit right and 12 up, 13 units, 260 meters) instead of how far Tara actually walked. | computation: `const units = (3 - 2) + (13 - 1); return units * 20;`
- C (320): Reads the picnic area's coordinates (3, 13) as the distance walked: 3 + 13 = 16 units, 320 meters. | computation: `const units = 3 + 13; return units * 20;`
- D (220): Adds only the two left-right legs (6 + 5 = 11 units, 220 meters) and leaves out the walk up to the tower, since the pond's position had to be worked out. | computation: `const units = (8 - 2) + (8 - 3); return units * 20;`
