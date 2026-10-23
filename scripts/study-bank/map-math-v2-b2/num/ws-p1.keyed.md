# Items for review, KEYED (4)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB2-N56-19

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: At 10 p.m., the temperature at a mountain campsite was -0.35 degree Celsius. After that, the temperature at the campsite fell 0.5 degree each hour until 4 a.m. At 4 a.m., the temperature in a town in the valley was 2.2 degrees Celsius. At 4 a.m., how many degrees warmer was the town than the campsite?

A. 5.55
B. 4.55
C. 2.55
D. 4.85

KEY: A (5.55)

Worked solution: From 10 p.m. to midnight is 2 hours, and from midnight to 4 a.m. is 4 hours, so the temperature fell for 6 hours. It fell 0.5 x 6 = 3 degrees. The campsite started 0.35 degree below zero and fell 3 more degrees, so at 4 a.m. it was 3.35 degrees below zero, or -3.35 degrees. The town was 2.2 degrees above zero. On a thermometer, the distance from -3.35 up to 0 is 3.35 degrees, and from 0 up to 2.2 is 2.2 degrees, so the town was 3.35 + 2.2 = 5.55 degrees warmer.

Key computation (JS): `const hours = (12 - 10) + 4; const camp = -0.35 - 0.5 * hours; return (2.2 - camp).toFixed(2)`

Distractors:
- B (4.55): The student counts 12 a.m. to 4 a.m. as the whole night (4 hours), so the fall is 2 degrees and the campsite is at -2.35, giving 2.2 + 2.35. | computation: `const hours = 4; const camp = -0.35 - 0.5 * hours; return (2.2 - camp).toFixed(2)`
- C (2.55): The student uses the only campsite temperature printed, -0.35, and finds 2.2 + 0.35, leaving out the 3 degrees the campsite fell. | computation: `return (2.2 - (-0.35)).toFixed(2)`
- D (4.85): The student writes the 4 a.m. campsite reading as -(3 - 0.35) = -2.65, as if the start below zero helped, then finds 2.2 + 2.65. | computation: `const hours = 6; const camp = -((0.5 * hours) - 0.35); return (2.2 - camp).toFixed(2)`

---

## MB2-N78-19

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Priya multiplies three powers of 2 and writes the product as a single power: (2^x)(2^2)(2^(-7)) = 2^(-2). Which integer did she use for the exponent x?

A. -7
B. 3
C. 7
D. -11

KEY: B (3)

Worked solution: When powers of the same base are multiplied, the exponents add: x + 2 + (-7) = -2, so x - 5 = -2 and x = 3. Check: 2^3 x 2^2 x 2^(-7) = 2^(3 + 2 - 7) = 2^(-2).

Key computation (JS): `return -2 - 2 - (-7)`

Distractors:
- A (-7): The student carries the 2 and the -7 to the right as they are: x = -2 + 2 + (-7) = -7. | computation: `return -2 + 2 + (-7)`
- C (7): The student reads 2^(-2) as 2^2 and solves x + 2 - 7 = 2 correctly from there, getting 7. | computation: `return 2 - 2 - (-7)`
- D (-11): The student moves both known exponents across, x = -2 - 2 - 7, writing "- 7" where taking away -7 should give + 7. | computation: `return -2 - 2 - 7`

---

## MB2-N78-08

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: On the morning of June 3, Lena's bank account balance was $14.80. Her balance went down by the same amount every day. On the morning of June 7, her balance was -$43.20. By how many dollars did her balance change each day? (Give the change as a negative number.)

A. -10.80
B. -14.20
C. -14.50
D. -11.60

KEY: C (-14.50)

Worked solution: Total change: -43.20 - 14.80 = -58.00. From the morning of June 3 to the morning of June 7 there are 4 days of change (June 3 to 4, 4 to 5, 5 to 6, 6 to 7). Change each day: -58.00 / 4 = -14.50 dollars.

Key computation (JS): `const total = -43.20 - 14.80; const days = 7 - 3; return (total / days).toFixed(2)`

Distractors:
- A (-10.80): The student takes the change to be -43.20 (the ending balance), as if the balance started at 0, and divides by 4. | computation: `return (-43.20 / 4).toFixed(2)`
- B (-14.20): The student averages the two balances, (14.80 + -43.20) / 2 = -14.20, instead of dividing the change by the number of days. | computation: `return ((14.80 + -43.20) / 2).toFixed(2)`
- D (-11.60): The student counts June 3, 4, 5, 6 and 7 as five days and divides the correct total -58.00 by 5. | computation: `return ((-43.20 - 14.80) / 5).toFixed(2)`

---

## MB2-N78-02

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A caver starts at an elevation of -31 meters, which means 31 meters below the cave entrance. She climbs down a rope, and her elevation changes by -8.35 meters. Then she climbs up a slope, and her elevation changes by +3.6 meters. What is her elevation now, in meters?

A. -19.05
B. -35.05
C. -35.65
D. -35.75

KEY: D (-35.75)

Worked solution: Add the changes to the starting elevation. -31 + (-8.35) = -39.35. Then -39.35 + 3.6 = -35.75, because 39.35 - 3.60 = 35.75 and the larger part is negative. Her elevation is -35.75 meters.

Key computation (JS): `const e = -31 + (-8.35) + 3.6; return Math.round(e * 100) / 100`

Distractors:
- A (-19.05): The student reads "climbs down ... changes by -8.35" as a move of 8.35 and adds it, so both changes go up: -31 + 8.35 + 3.6 = -19.05. | computation: `const e = -31 + 8.35 + 3.6; return Math.round(e * 100) / 100`
- B (-35.05): The student treats -8.35 as -8 + 0.35 (the decimal part kept positive), so the drop is only 7.65: -31 - 8 + 0.35 + 3.6 = -35.05. | computation: `const e = -31 - 8 + 0.35 + 3.6; return Math.round(e * 100) / 100`
- C (-35.65): The student works 39.35 - 3.60 correctly up to the tenths column, where 13 - 6 is written as 6, giving 35.65 and the answer -35.65. | computation: `const a = 39.35; /* 39.35 - 3.60 with the tenths fact 13 - 6 written as 6 */ return -(35 + 0.65)`
