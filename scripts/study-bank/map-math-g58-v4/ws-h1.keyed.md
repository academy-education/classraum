# Items for review, KEYED (10)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM4-N19

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A store sells markers for $0.37 each. Leo has $11.75. He buys as many markers as he can. How much money, in dollars, does Leo have left?

A. 0.28
B. 0.27
C. 0.15
D. 0.76

KEY: A (0.28)

Worked solution: Divide 11.75 by 0.37: 1175 / 37 = 31 with 28 left over, since 37 x 31 = 1,147. So Leo buys 31 markers for 31 x 0.37 = $11.47, and he has 11.75 - 11.47 = $0.28 left.

Key computation (JS): `const q = Math.floor(1175/37); return ((1175 - q*37)/100).toFixed(2);`

Distractors:
- B (0.27): The student works with $11: 11 / 0.37 gives 29 markers, which cost $10.73, leaving $0.27, and never uses the extra 75 cents. | computation: `const q = Math.floor(1100/37); return ((1100 - q*37)/100).toFixed(2);`
- C (0.15): The student uses $0.40 per marker to make the division easier: 11.75 / 0.40 gives 29 markers, which cost $11.60, leaving $0.15. | computation: `const q = Math.floor(1175/40); return ((1175 - q*40)/100).toFixed(2);`
- D (0.76): The student gets 11.75 / 0.37 = 31.76... by long division and takes the .76 as $0.76 left over. | computation: `const x = 1175/37; return (x - Math.floor(x)).toFixed(2);`

---

## MM4-N01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Leo wants to estimate 6.8 x 4.3. He rounds each number to the nearest whole number and then multiplies the rounded numbers. What estimate does Leo get?

A. 29
B. 28
C. 24
D. 35

KEY: B (28)

Worked solution: 6.8 is closer to 7 than to 6, so it rounds to 7. 4.3 is closer to 4 than to 5, so it rounds to 4. Then 7 x 4 = 28. Leo's estimate is 28.

Key computation (JS): `return String(Math.round(6.8) * Math.round(4.3));`

Distractors:
- A (29): The student multiplies 6.8 x 4.3 = 29.24 exactly and rounds that to 29, so the answer is not the estimate the stem describes. | computation: `return String(Math.round(6.8 * 4.3));`
- C (24): The student cuts 6.8 to 6 and 4.3 to 4, as if rounding meant removing the digits after the point, and gets 6 x 4 = 24. | computation: `return String(Math.floor(6.8) * Math.floor(4.3));`
- D (35): The student thinks rounding always goes up, turns 6.8 into 7 and 4.3 into 5, and gets 7 x 5 = 35. | computation: `return String(Math.ceil(6.8) * Math.ceil(4.3));`

---

## MM4-N20

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Rosa has 48 red beads and 180 blue beads. She makes identical bracelets, using all of the beads, and she makes as many bracelets as she can. How many blue beads are on each bracelet?

A. 4
B. 10
C. 15
D. 30

KEY: C (15)

Worked solution: The number of bracelets must divide both 48 and 180, and it should be as large as possible, so it is the greatest common factor. 48 = 2 x 2 x 2 x 2 x 3 and 180 = 2 x 2 x 3 x 3 x 5, so the GCF is 2 x 2 x 3 = 12. Rosa makes 12 bracelets, and each has 180 / 12 = 15 blue beads (and 48 / 12 = 4 red beads).

Key computation (JS): `const g = (a, b) => b ? g(b, a % b) : a; return String(180 / g(48, 180));`

Distractors:
- A (4): The student finds 12 bracelets correctly but then divides the red beads, 48 / 12 = 4, answering for the wrong color. | computation: `const g = (a, b) => b ? g(b, a % b) : a; return String(48 / g(48, 180));`
- B (10): The student looks for a big factor of 180, picks 18 bracelets, and finds 180 / 18 = 10 blue beads each, never checking that 48 red beads cannot be shared among 18 bracelets. | computation: `return String(180 / 18);`
- D (30): The student sees that 48 and 180 are both divisible by 6, makes 6 bracelets, and finds 180 / 6 = 30 blue beads on each. | computation: `return String(180 / 6);`

---

## MM4-N34

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On a number line, point A is at -√13 and point B is at √75. How many integers are on the number line between point A and point B?

A. 9
B. 11
C. 14
D. 12

KEY: D (12)

Worked solution: Since 9 < 13 < 16, √13 is between 3 and 4, so -√13 is between -4 and -3. Since 64 < 75 < 81, √75 is between 8 and 9. The integers between A and B are -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7 and 8. That is 3 negative integers, the integer 0, and 8 positive integers: 12 integers in all.

Key computation (JS): `const lo = -Math.sqrt(13), hi = Math.sqrt(75); let c = 0; for (let n = -20; n <= 20; n++) { if (n > lo && n < hi) c++; } return String(c);`

Distractors:
- A (9): The student counts 0, 1, 2, ..., 8 up to √75 and never counts the negative integers -3, -2 and -1 to the left of zero. | computation: `const hi = Math.sqrt(75); let c = 0; for (let n = 0; n <= 20; n++) { if (n < hi) c++; } return String(c);`
- B (11): The student counts 3 negative integers and 8 positive integers and adds them, forgetting that 0 is also an integer between the two points. | computation: `const lo = -Math.sqrt(13), hi = Math.sqrt(75); let c = 0; for (let n = -20; n <= 20; n++) { if (n !== 0 && n > lo && n < hi) c++; } return String(c);`
- C (14): The student rounds √13 (about 3.6) to 4 and √75 (about 8.7) to 9, then counts every integer from -4 to 9, including both ends. | computation: `const lo = Math.round(-Math.sqrt(13)), hi = Math.round(Math.sqrt(75)); return String(hi - lo + 1);`

---

## MM4-N17

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A sign has two lights. The red light flashes every 6 seconds, and the blue light flashes every 10 seconds. Both lights flash at the same moment when the sign is turned on. How many seconds after the sign is turned on do the two lights flash at the same moment for the third time after that?

A. 90
B. 180
C. 48
D. 60

KEY: A (90)

Worked solution: The lights flash together at every common multiple of 6 and 10. The least common multiple of 6 and 10 is 30, so after the start they flash together at 30, 60 and 90 seconds. The third time after the sign is turned on is 90 seconds.

Key computation (JS): `const g = (a, b) => b ? g(b, a % b) : a; const L = 6 * 10 / g(6, 10); return String(3 * L);`

Distractors:
- B (180): The student uses 6 x 10 = 60 as the time between shared flashes instead of the LCM 30, so the third time is 3 x 60 = 180. | computation: `return String(3 * 6 * 10);`
- C (48): The student thinks the lights meet every 6 + 10 = 16 seconds, so the third time is 3 x 16 = 48. | computation: `return String(3 * (6 + 10));`
- D (60): The student lists 0, 30, 60 as the first, second and third shared flashes, counting the moment the sign is turned on, and answers 60. | computation: `const g = (a, b) => b ? g(b, a % b) : a; const L = 6 * 10 / g(6, 10); return String((3 - 1) * L);`

---

## MM4-N11

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A town map is drawn on a coordinate plane, and each unit on the map stands for one block. The bus stop is at the point (-3.5, -4), and the school is at the point (-3.5, -13). How many blocks apart are the bus stop and the school?

A. 17
B. 9
C. 10
D. 7

KEY: B (9)

Worked solution: Both points have the same x-coordinate, -3.5, so they are on the same up-and-down line. The bus stop is 4 blocks below the x-axis and the school is 13 blocks below it. They are on the same side of the x-axis, so subtract the distances: 13 - 4 = 9 blocks.

Key computation (JS): `return String(Math.abs(-13) - Math.abs(-4));`

Distractors:
- A (17): The student remembers 'add the distances from the axis' from points on opposite sides and works 4 + 13 = 17, though both points are below the x-axis. | computation: `return String(Math.abs(-13) + Math.abs(-4));`
- C (10): The student counts the marks on the line from y = -4 down to y = -13, including both ends, and gets 10 instead of 9 spaces. | computation: `return String(Math.abs(-13) - Math.abs(-4) + 1);`
- D (7): The student adds the absolute values of the two x-coordinates, 3.5 + 3.5 = 7, using the coordinates that are the same instead of the ones that change. | computation: `return String(Math.abs(-3.5) + Math.abs(-3.5));`

---

## MM4-N21

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Lena's bank balance was -$94.25, which means she owed the bank $94.25. Over the next 5 weeks, her balance went up by the same amount each week. At the end of the 5 weeks, her balance was -$36.70. What was her balance, in dollars, at the end of the first week?

A. -81.74
B. -80.54
C. -82.74
D. -68.06

KEY: C (-82.74)

Worked solution: The total change is -36.70 - (-94.25) = -36.70 + 94.25 = 57.55 dollars. Over 5 equal weeks the balance went up 57.55 / 5 = 11.51 dollars each week. At the end of the first week the balance was -94.25 + 11.51 = -82.74 dollars.

Key computation (JS): `const total = (-36.70) - (-94.25); const wk = Math.round(total / 5 * 100) / 100; return (Math.round((-94.25 + wk) * 100) / 100).toFixed(2);`

Distractors:
- A (-81.74): Working 94.25 - 36.70 column by column, the student takes 9-3, 6-4, 7-2 and 5-0 instead of regrouping, gets 62.55, a weekly rise of 12.51 and a first-week balance of -81.74. | computation: `const diff = (9-3)*10 + Math.abs(4-6) + Math.abs(2-7)/10 + Math.abs(5-0)/100; const wk = Math.round(diff / 5 * 100) / 100; return (Math.round((-94.25 + wk) * 100) / 100).toFixed(2);`
- B (-80.54): In 94.25 - 36.70 the student borrows for the tenths and the ones but never lowers the digit borrowed from, gets 68.55, a weekly rise of 13.71 and -80.54. | computation: `const diff = (9-3)*10 + (14-6) + (12-7)/10 + (5-0)/100; const wk = Math.round(diff / 5 * 100) / 100; return (Math.round((-94.25 + wk) * 100) / 100).toFixed(2);`
- D (-68.06): The student sees two debts and adds them, 94.25 + 36.70 = 130.95, so the weekly rise is 26.19 and the balance after one week is -68.06. | computation: `const total = 94.25 + 36.70; const wk = Math.round(total / 5 * 100) / 100; return (Math.round((-94.25 + wk) * 100) / 100).toFixed(2);`

---

## MM4-N04

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A ribbon is 6 1/4 yards long. Mia cuts off a piece that is 2 2/3 yards long. How many yards of ribbon are left?

A. 3 1/3
B. 3 5/12
C. 4 5/12
D. 3 7/12

KEY: D (3 7/12)

Worked solution: Rename both fractions with denominator 12: 6 1/4 = 6 3/12 and 2 2/3 = 2 8/12. Since 3/12 is less than 8/12, regroup one whole: 6 3/12 = 5 15/12. Now subtract: 5 15/12 - 2 8/12 = 3 7/12. So 3 7/12 yards are left.

Key computation (JS): `const n = (6*12 + 3) - (2*12 + 8); return Math.floor(n/12) + ' ' + (n%12) + '/12';`

Distractors:
- A (3 1/3): The student borrows a whole and writes 5 12/12, losing the 3/12 that was already there, then subtracts to get 3 4/12 = 3 1/3. | computation: `const n = (5*12 + 12) - (2*12 + 8); return Math.floor(n/12) + ' 1/3';`
- B (3 5/12): Used to borrowing ten in whole-number subtraction, the student turns 6 3/12 into 5 13/12 and gets 3 5/12. | computation: `const n = (5*12 + 13) - (2*12 + 8); return Math.floor(n/12) + ' ' + (n%12) + '/12';`
- C (4 5/12): The student subtracts the wholes (6 - 2 = 4) and then the fractions the easy way round (8/12 - 3/12 = 5/12), giving 4 5/12. | computation: `return (6 - 2) + ' ' + (8 - 3) + '/12';`

---

## MM4-N15

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Which number is farther from 0 than -6.45 and closer to 0 than 7.4?

A. 6.88
B. -6.4
C. 6.45
D. -6.21

KEY: A (6.88)

Worked solution: A number's distance from 0 is its absolute value. -6.45 is 6.45 from 0 and 7.4 is 7.4 from 0, so we need a number whose distance from 0 is more than 6.45 and less than 7.4. -6.4 is 6.40 from 0, which is less than 6.45. -6.21 is 6.21 from 0, also less than 6.45. 6.45 is exactly as far from 0 as -6.45, not farther. 6.88 is 6.88 from 0, and 6.45 < 6.88 < 7.4. The answer is 6.88.

Key computation (JS): `const o = [-6.4, -6.21, 6.45, 6.88]; return String(o.find(v => Math.abs(v) > 6.45 && Math.abs(v) < 7.4));`

Distractors:
- B (-6.4): The student reasons that tenths are bigger pieces than hundredths, decides 6.4 is more than 6.45, and so takes -6.4 as farther from 0 than -6.45. | computation: `const o = [-6.4, -6.21, 6.45, 6.88]; const places = x => (String(x).split('.')[1] || '').length; return String(o.find(v => v < 0 && Math.trunc(Math.abs(v)) === 6 && places(Math.abs(v)) < places(6.45)));`
- C (6.45): The student treats 6.45 as farther from 0 than -6.45 because it is positive, not noticing that opposites are the same distance from 0. | computation: `const o = [-6.4, -6.21, 6.45, 6.88]; return String(o.find(v => v > 0 && v === Math.abs(-6.45)));`
- D (-6.21): The student reads 'farther from 0 than -6.45' as 'greater than -6.45', sees that -6.21 is to the right of -6.45 on the number line and less than 7.4, and picks it. | computation: `const o = [-6.4, -6.21, 6.45, 6.88]; return String(o.filter(v => v > -6.45 && v < 7.4 && v < 0).sort((a, b) => b - a)[0]);`

---

## MM4-N28

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ana owed her brother $40, so her balance with him was -$40. She paid him $5.20 each week for 5 weeks. Then she borrowed more money from him: 1/4 of the amount she still owed. What is Ana's balance with her brother now, in dollars?

A. -24.00
B. -17.50
C. -10.50
D. -20.50

KEY: B (-17.50)

Worked solution: Ana paid back 5 x 5.20 = 26 dollars, so her balance went from -40 to -40 + 26 = -14. She still owed 14 dollars, and 1/4 of 14 is 3.50. Borrowing 3.50 more makes her balance -14 - 3.50 = -17.50 dollars.

Key computation (JS): `const owed = -40 + 5 * 5.20; return Math.round((owed - Math.abs(owed) / 4) * 100) / 100;`

Distractors:
- A (-24.00): The student reads '1/4 of the amount she owed' as 1/4 of the original 40 dollars, borrows 10 dollars, and gets -14 - 10 = -24. | computation: `const owed = -40 + 5 * 5.20; return Math.round((owed - 40 / 4) * 100) / 100;`
- C (-10.50): The student adds the 3.50 to the balance, -14 + 3.50 = -10.50, as if borrowing were another repayment. | computation: `const owed = -40 + 5 * 5.20; return Math.round((owed + Math.abs(owed) / 4) * 100) / 100;`
- D (-20.50): The student takes 1/4 of the 26 dollars she paid back, 6.50, and gets -14 - 6.50 = -20.50. | computation: `const paid = 5 * 5.20, owed = -40 + paid; return Math.round((owed - paid / 4) * 100) / 100;`
