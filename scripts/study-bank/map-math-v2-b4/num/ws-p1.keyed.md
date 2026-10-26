# Items for review, KEYED (11)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB4-N5-09

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Grandpa has a 5.7-kilogram bag of birdseed. He keeps 0.9 kilogram for himself and shares the rest equally among Ana and Ana's 2 cousins. Ana already had 2.85 kilograms of birdseed. How many kilograms of birdseed does Ana have now?

A. 4.45
B. 3.85
C. 2.55
D. 4.05

KEY: A (4.45)

Worked solution: Birdseed Grandpa shares: 5.7 - 0.9 = 4.8 kilograms. It is shared among 3 people (Ana and her 2 cousins): 4.8 / 3 = 1.6 kilograms each. Ana now has 2.85 + 1.6 = 4.45 kilograms.

Key computation (JS): `return (2.85+(5.7-0.9)/3).toFixed(2)`

Distractors:
- B (3.85): The student shares the whole bag (5.7 / 3 = 1.9), then takes Grandpa's 0.9 out of Ana's share alone: 2.85 + 1.9 - 0.9 = 3.85. | computation: `return (2.85+5.7/3-0.9).toFixed(2)`
- C (2.55): The student adds everything first and divides all of it by 3: (2.85 + 4.8) / 3 = 2.55, as if Ana's birdseed were shared too. | computation: `return ((2.85+5.7-0.9)/3).toFixed(2)`
- D (4.05): The student divides the 4.8 kilograms among 4 people (Grandpa, Ana and 2 cousins): 4.8 / 4 = 1.2, so 2.85 + 1.2 = 4.05. | computation: `return (2.85+(5.7-0.9)/4).toFixed(2)`

---

## MB4-N6-04

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: At a fabric store, blue fabric costs $4.15 per meter and green fabric costs $3.65 per meter. Maya buys 5.6 meters of the blue fabric and 1.8 meters of the green fabric. How many more dollars does she spend on the blue fabric than on the green fabric?

A. 15.77
B. 16.67
C. 12.97
D. 16.57

KEY: B (16.67)

Worked solution: Blue fabric: 5.6 x 4.15. Multiply 56 x 415 = 23,240; there are 1 + 2 = 3 decimal places, so the blue fabric costs $23.24. Green fabric: 1.8 x 3.65. Multiply 18 x 365 = 6,570; with 3 decimal places that is $6.57. Difference: 23.24 - 6.57 = 16.67. She spends $16.67 more on the blue fabric.

Key computation (JS): `return (5.6 * 4.15 - 1.8 * 3.65).toFixed(2)`

Distractors:
- A (15.77): She finds how much more blue fabric she bought, 5.6 - 1.8 = 3.8 m, and multiplies by the blue price: 3.8 x 4.15 = 15.77, leaving out that the green fabric is cheaper. | computation: `return ((5.6 - 1.8) * 4.15).toFixed(2)`
- C (12.97): He multiplies the blue length by the green price and the green length by the blue price: 5.6 x 3.65 - 1.8 x 4.15 = 20.44 - 7.47 = 12.97. | computation: `return (5.6 * 3.65 - 1.8 * 4.15).toFixed(2)`
- D (16.57): For each cost he multiplies whole parts and decimal parts separately: blue 5 x 4 + 0.6 x 0.15 = 20.09, green 1 x 3 + 0.8 x 0.65 = 3.52, and 20.09 - 3.52 = 16.57. | computation: `return ((5 * 4 + 0.6 * 0.15) - (1 * 3 + 0.8 * 0.65)).toFixed(2)`

---

## MB4-N6-05

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A board is 241.5 centimeters long. Kai cuts the whole board into equal pieces that are each 16.1 centimeters long, with no wood left over. Then he trims 1.2 centimeters off each piece. What is the total length, in centimeters, of all the trimmed pieces?

A. 224.5
B. 259.5
C. 223.5
D. 226.5

KEY: C (223.5)

Worked solution: Number of pieces: 241.5 / 16.1. Multiply both numbers by 10 to get 2415 / 161 = 15, so there are 15 pieces. Each piece is trimmed by 1.2 cm, so the trims total 15 x 1.2 = 18.0 cm. The trimmed pieces total 241.5 - 18.0 = 223.5 cm. (Or: each trimmed piece is 16.1 - 1.2 = 14.9 cm, and 15 x 14.9 = 223.5 cm.)

Key computation (JS): `const n = Math.round(241.5 / 16.1); return (241.5 - n * 1.2).toFixed(1)`

Distractors:
- A (224.5): He finds the 15 pieces and multiplies 15 x 1.2 as 15 x 12: in the ones row 5 x 2 = 10, he writes 0 but loses the carried 1, so the row is 50 instead of 60; the total trim is 17.0 cm and he gets 241.5 - 17.0 = 224.5. | computation: `const onesRow = ((5 * 2) % 10) + (5 * 1) * 10; const tensRow = 1 * 12 * 10; return (241.5 - (onesRow + tensRow) / 10).toFixed(1)`
- B (259.5): He adds the 1.2 cm to each piece, 16.1 + 1.2 = 17.3 cm, and multiplies by 15 pieces: 259.5, more than the whole board. | computation: `const n = Math.round(241.5 / 16.1); return (n * (16.1 + 1.2)).toFixed(1)`
- D (226.5): She finds each trimmed piece as 16.1 - 1.2; in the tenths column she cannot take 2 from 1, so she takes 1 from 2 and does not regroup, getting 15.1 cm, and 15 x 15.1 = 226.5. | computation: `const top = [1, 6, 1], bot = [0, 1, 2]; const d = top.map((x, i) => Math.abs(x - bot[i])); const piece = d[0] * 10 + d[1] + d[2] / 10; return (15 * piece).toFixed(1)`

---

## MB4-N6-01

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Nia and Omar each borrowed money from their parents. They keep track of what they owe as negative balances. Nia's balance is -$58.45, and Omar's balance is -$15.65. How many dollars more does Nia owe than Omar?

A. 42.10
B. 43.20
C. 74.10
D. 42.80

KEY: D (42.80)

Worked solution: A balance of -$58.45 means Nia owes $58.45, and a balance of -$15.65 means Omar owes $15.65. The size of each debt is the absolute value of the balance: |-58.45| = 58.45 and |-15.65| = 15.65. To find how much more Nia owes, subtract: 58.45 - 15.65 = 42.80. Nia owes $42.80 more than Omar.

Key computation (JS): `return (58.45 - 15.65).toFixed(2)`

Distractors:
- A (42.10): She rounds 15.65 up to 16 and gets 58.45 - 16 = 42.45, then takes away the extra 0.35 instead of adding it back, getting 42.10. | computation: `const r = 58.45 - 16; return (r - (16 - 15.65)).toFixed(2)`
- B (43.20): In the tenths column he cannot take 6 from 4, so he takes 4 from 6 and writes 2, and never borrows from the 8, giving 43.20. | computation: `const top = [5, 8, 4, 5], bot = [1, 5, 6, 5]; const d = top.map((x, i) => Math.abs(x - bot[i])); return (d[0] * 10 + d[1] + d[2] / 10 + d[3] / 100).toFixed(2)`
- C (74.10): Seeing two amounts owed, she adds them, 58.45 + 15.65 = 74.10, which is how much the two owe together, not how much more one owes. | computation: `return (58.45 + 15.65).toFixed(2)`

---

## MB4-N6-02

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A pancake recipe uses 3.15 cups of milk for each batch. Ravi measures out enough milk for 2.2 batches of pancakes. While pouring it into the mixing bowl, he spills 0.25 cup of the milk. How many cups of milk end up in the bowl?

A. 6.68
B. 6.38
C. 7.18
D. 5.78

KEY: A (6.68)

Worked solution: Milk for 2.2 batches: 3.15 x 2.2. Multiply 315 x 22 = 6,930. There are 2 + 1 = 3 decimal places in the factors, so 3.15 x 2.2 = 6.930 = 6.93 cups. He spills 0.25 cup once, so 6.93 - 0.25 = 6.68 cups end up in the bowl.

Key computation (JS): `return (3.15 * 2.2 - 0.25).toFixed(2)`

Distractors:
- B (6.38): She subtracts the spill from the amount for one batch, 3.15 - 0.25 = 2.90, and then multiplies by 2.2 batches, getting 6.38, so the spill is taken out 2.2 times. | computation: `return ((3.15 - 0.25) * 2.2).toFixed(2)`
- C (7.18): He finds 3.15 x 2.2 = 6.93 correctly, then adds the 0.25 cup that was spilled instead of taking it away: 7.18. | computation: `return (3.15 * 2.2 + 0.25).toFixed(2)`
- D (5.78): He multiplies 3 x 2 = 6 and 0.15 x 0.2 = 0.03, adds them to get 6.03 cups, and subtracts the spill: 5.78. The cross products 3 x 0.2 and 0.15 x 2 are lost. | computation: `return (3 * 2 + 0.15 * 0.2 - 0.25).toFixed(2)`

---

## MB4-N5-07

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A science lab has 7 large beakers that each hold 1.9 liters of water and 9 small flasks that each hold 0.15 liter of water. How many fewer liters of water are in all the small flasks than in all the large beakers?

A. 12.05
B. 11.95
C. 13.15
D. 16.05

KEY: B (11.95)

Worked solution: Large beakers: 7 x 1.9 = 13.3 liters. Small flasks: 9 x 0.15 = 1.35 liters. Difference: 13.30 - 1.35 = 11.95. The small flasks hold 11.95 fewer liters than the large beakers.

Key computation (JS): `return (7*1.9-9*0.15).toFixed(2)`

Distractors:
- A (12.05): Lining up 13.3 over 1.35, the student sees nothing above the 5 and writes 5, then 3 - 3 = 0 and 13 - 1 = 12, getting 12.05. | computation: `const f=9*0.15, t=Math.floor(f*10+1e-9)/10;return (7*1.9-t+(f-t)).toFixed(2)`
- C (13.15): The student builds the beaker total (13.3) but subtracts a single flask (0.15) instead of 9 flasks: 13.3 - 0.15 = 13.15. | computation: `return (7*1.9-0.15).toFixed(2)`
- D (16.05): The student multiplies the beaker size by 9 and the flask size by 7: 17.1 - 1.05 = 16.05. | computation: `return (9*1.9-7*0.15).toFixed(2)`

---

## MB4-N7-04

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: In a board game, a player's score can be positive or negative. Landing on a red square multiplies a player's score by -7/8. Landing on a blue square multiplies a player's score by -9/10. Ana's score is -1.2, and she lands on a red square. Ben's score is 9.6, and he lands on a blue square. What is the sum of Ana's new score and Ben's new score?

A. -9.69
B. -8.49
C. -7.59
D. -7.69

KEY: C (-7.59)

Worked solution: Ana's new score: (-1.2)(-7/8). One eighth of 1.2 is 0.15, so seven eighths is 1.05, and a negative times a negative is positive: 1.05. Ben's new score: (9.6)(-9/10). One tenth of 9.6 is 0.96, so nine tenths is 8.64, and a positive times a negative is negative: -8.64. Sum: 1.05 + (-8.64) = -(8.64 - 1.05) = -7.59.

Key computation (JS): `return ((-1.2) * (-7 / 8) + 9.6 * (-9 / 10)).toFixed(2)`

Distractors:
- A (-9.69): The student finds 1.05 and -8.64 correctly but combines them as -(1.05 + 8.64) = -9.69, adding the sizes instead of subtracting them. | computation: `return (-(Math.abs((-1.2) * (-7 / 8)) + Math.abs(9.6 * (-9 / 10)))).toFixed(2)`
- B (-8.49): The student divides 1.2 by 8 to get 0.15 and stops, using 0.15 as Ana's new score, so the sum is 0.15 - 8.64 = -8.49. | computation: `return ((-1.2) * (-1 / 8) + 9.6 * (-9 / 10)).toFixed(2)`
- D (-7.69): Working out 8.64 - 1.05, the student regroups to get 14 - 5 = 9 hundredths but then subtracts 6 - 0 instead of 5 - 0 in the tenths, getting 7.69, so the answer is -7.69. | computation: `return (-(8.64 - 1.05 + 0.1)).toFixed(2)`

---

## MB4-N6-03

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A dolphin is swimming at an elevation of -2.75 meters, which means 2.75 meters below the surface of the water. It dives straight down to an elevation of -4.8 meters. Then it swims straight up and leaps out of the water to an elevation of 2.6 meters. What is the total vertical distance, in meters, that the dolphin travels?

A. 14.95
B. 9.55
C. 10.15
D. 9.45

KEY: D (9.45)

Worked solution: Dive: from -2.75 down to -4.8. Both are below 0, so the distance is 4.80 - 2.75 = 2.05 meters. Climb: from -4.8 up to 2.6. This crosses 0, so the distance is 4.8 + 2.6 = 7.4 meters. Total vertical distance: 2.05 + 7.4 = 9.45 meters.

Key computation (JS): `return ((4.8 - 2.75) + (4.8 + 2.6)).toFixed(2)`

Distractors:
- A (14.95): For the dive from -2.75 to -4.8 she adds 2.75 + 4.8 = 7.55 instead of subtracting, then adds the climb of 7.4: 14.95. | computation: `return ((4.8 + 2.75) + (4.8 + 2.6)).toFixed(2)`
- B (9.55): She writes 4.8 over 2.75, sees nothing above the 5 and brings it down, then 8 - 7 = 1 and 4 - 2 = 2, so the dive is 2.15 m and the total 2.15 + 7.4 = 9.55. | computation: `const top = [4, 8, 0], bot = [2, 7, 5]; const d = top.map((x, i) => Math.abs(x - bot[i])); const dive = d[0] + d[1] / 10 + d[2] / 100; return (dive + 4.8 + 2.6).toFixed(2)`
- C (10.15): He adds the three distances from the surface, 2.75 + 4.8 + 2.6 = 10.15, as if the dolphin had started its dive at the surface. | computation: `return (2.75 + 4.8 + 2.6).toFixed(2)`

---

## MB4-N7-02

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Lena checks her homework. One problem asks her to multiply -2/3 by -1.95, divide -2 1/10 by 2/5, and add the two results. In other words, she must find (-2/3)(-1.95) + (-2 1/10) / (2/5). What number should she get?

A. -3.95
B. -3.45
C. -3.85
D. -6.55

KEY: A (-3.95)

Worked solution: First term: (-2/3)(-1.95). One third of 1.95 is 0.65, so two thirds is 1.30, and a negative times a negative is positive: 1.3. Second term: -2 1/10 = -2.1. Dividing by 2/5 is the same as multiplying by 5/2: -2.1 x 5/2 = -10.5 / 2 = -5.25. Add: 1.3 + (-5.25) = -3.95.

Key computation (JS): `return ((-2 / 3) * (-1.95) + (-2.1) / (2 / 5)).toFixed(2)`

Distractors:
- B (-3.45): The student reads -2 1/10 as -2 + 1/10 = -1.9, so the quotient is -1.9 x 5/2 = -4.75 and the total is 1.3 - 4.75 = -3.45. | computation: `return ((-2 / 3) * (-1.95) + (-2 + 0.1) / (2 / 5)).toFixed(2)`
- C (-3.85): Dividing 1.95 by 3, the student carries the remainder into the tenths and writes 0.70 instead of 0.65, so two thirds becomes 1.40 and the total is 1.40 - 5.25 = -3.85. | computation: `return (1.4 + (-2.1) / (2 / 5)).toFixed(2)`
- D (-6.55): The student finds 2/3 of 1.95 = 1.3 but writes the product of the two negatives as -1.3, so the total is -1.3 - 5.25 = -6.55. | computation: `return ((2 / 3) * (-1.95) + (-2.1) / (2 / 5)).toFixed(2)`

---

## MB4-N7-05

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Omar uses the distributive property to find the value of -1.4(0.55 - 1.25) + 1.5(-0.2). What value should he get?

A. 0.18
B. 0.68
C. 1.28
D. 0.58

KEY: B (0.68)

Worked solution: Distribute -1.4: -1.4(0.55) - (-1.4)(1.25) = -0.77 + 1.75 = 0.98. (Or: 0.55 - 1.25 = -0.70, and -1.4 x (-0.70) = 0.98.) Next, 1.5(-0.2) = -0.3. Add: 0.98 + (-0.3) = 0.68.

Key computation (JS): `return (-1.4 * (0.55 - 1.25) + 1.5 * (-0.2)).toFixed(2)`

Distractors:
- A (0.18): The student writes -1.4(0.55) + 1.25, changing the sign of 1.25 but never multiplying it by 1.4, so the first part is -0.77 + 1.25 = 0.48 and the total is 0.48 - 0.3 = 0.18. | computation: `return (-1.4 * 0.55 + 1.25 + 1.5 * (-0.2)).toFixed(2)`
- C (1.28): The student takes 1.5(-0.2) as +0.3, so the total is 0.98 + 0.3 = 1.28. | computation: `return (-1.4 * (0.55 - 1.25) + 1.5 * 0.2).toFixed(2)`
- D (0.58): Working 1.4 x 0.70 as 14 x 7, the student writes the 8 from 4 x 7 = 28 but adds a carried 1 instead of 2 to 1 x 7, getting 0.88; the total is then 0.88 - 0.3 = 0.58. | computation: `return (0.88 + 1.5 * (-0.2)).toFixed(2)`

---

## MB4-N7-01

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A beekeeper weighs a beehive at the end of each week. Over four weeks, the weight of the hive changed by -3.48 kilograms, -1.40 kilograms, +0.12 kilogram, and +0.28 kilogram. What was the mean (average) weekly change in the weight of the hive, in kilograms?

A. -1.02
B. -0.82
C. -1.12
D. -0.42

KEY: C (-1.12)

Worked solution: Add the four changes: -3.48 + (-1.40) = -4.88. The gains add to 0.12 + 0.28 = 0.40, so the total change is -4.88 + 0.40 = -4.48. The mean is the total divided by the number of weeks: -4.48 / 4 = -1.12. The mean weekly change was -1.12 kilograms.

Key computation (JS): `return ((-348 - 140 + 12 + 28) / 4 / 100).toFixed(2)`

Distractors:
- A (-1.02): The student finds the total -4.48 correctly but, dividing 4.48 by 4 digit by digit, records 0 instead of 1 for the tenths (4 tenths divided by 4), writing -1.02. | computation: `return ((-348 - 140 + 12 + 28 + 40) / 4 / 100).toFixed(2)`
- B (-0.82): The student averages the two losses, (-3.48 - 1.40) / 4 = -1.22, and then adds the two gains in whole, -1.22 + 0.40 = -0.82, as if the division applied only to the first group of numbers. | computation: `return (((-348 - 140) / 4 + 12 + 28) / 100).toFixed(2)`
- D (-0.42): The student adds 1.40 instead of -1.40, so the total is -3.48 + 1.40 + 0.40 = -1.68 and the mean is -0.42. | computation: `return ((-348 + 140 + 12 + 28) / 4 / 100).toFixed(2)`
