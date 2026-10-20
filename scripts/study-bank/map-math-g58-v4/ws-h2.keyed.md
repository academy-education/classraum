# Items for review, KEYED (9)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM4-N18

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Mia has many rectangular tiles that are each 10 centimeters long and 14 centimeters wide. She places them side by side, all turned the same way, with no gaps or overlaps, to make the smallest possible square. How many tiles does she use?

A. 35
B. 140
C. 12
D. 5

KEY: A (35)

Worked solution: The side of the square must be a multiple of 10 (the tile lengths along one side) and a multiple of 14 (the tile widths along the other side). The least common multiple of 10 and 14 is 70, so the smallest square is 70 cm on each side. Along one side there are 70 ÷ 10 = 7 tiles, and along the other side there are 70 ÷ 14 = 5 tiles. She uses 7 x 5 = 35 tiles.

Key computation (JS): `const g = (a, b) => b ? g(b, a % b) : a; const L = 10 * 14 / g(10, 14); return String((L / 10) * (L / 14));`

Distractors:
- B (140): The student makes the side 10 x 14 = 140 cm, a common multiple but not the least, and gets 14 x 10 = 140 tiles. | computation: `const S = 10 * 14; return String((S / 10) * (S / 14));`
- C (12): The student finds 7 tiles one way and 5 the other, then adds 7 + 5 = 12, counting a border instead of the whole square. | computation: `const g = (a, b) => b ? g(b, a % b) : a; const L = 10 * 14 / g(10, 14); return String(L / 10 + L / 14);`
- D (5): The student finds the 70-cm side and the 5 tiles that fit along it (70 ÷ 14), and stops without filling the rest of the square. | computation: `const g = (a, b) => b ? g(b, a % b) : a; const L = 10 * 14 / g(10, 14); return String(L / 14);`

---

## MM4-N13

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Mr. Diaz buys 2.4 pounds of grapes. The grapes cost $3.15 per pound. He pays with a $10 bill. How much change should he get, in dollars?

A. 4.45
B. 2.44
C. 2.65
D. 2.54

KEY: B (2.44)

Worked solution: First find the cost: 2.4 x 3.15. Multiply 24 x 315 = 7,560. There are 1 + 2 = 3 decimal places in the factors, so the cost is 7.560, or $7.56. Then subtract from $10.00: 10.00 - 7.56 = 2.44. He should get $2.44 in change.

Key computation (JS): `return (10 - 2.4 * 3.15).toFixed(2);`

Distractors:
- A (4.45): The student adds 2.4 + 3.15 = 5.55 as the cost and subtracts it from 10 to get 4.45. | computation: `return (10 - (2.4 + 3.15)).toFixed(2);`
- C (2.65): The student splits $3.15 into $3 and 15 cents, multiplies 2.4 x 3 = 7.20, then just adds the 0.15 instead of multiplying it by 2.4, gets a cost of 7.35 and change of 2.65. | computation: `return (10 - (2.4 * 3 + 0.15)).toFixed(2);`
- D (2.54): The student regroups to subtract the hundredths but then takes 10 - 5 = 5 in the tenths place instead of 9 - 5 = 4, writing 2.54. | computation: `return (10 - 2.4 * 3.15 + 0.1).toFixed(2);`

---

## MM4-N39

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Without a calculator, Lia wants to estimate √50 - √30. Which of these decimals is closest to √50 - √30?

A. 2.00
B. 1.67
C. 1.59
D. 1.61

KEY: C (1.59)

Worked solution: 7^2 = 49, so √50 is a little more than 7: 7.07^2 is about 49.98, so √50 is about 7.07. 5.5^2 = 30.25, so √30 is a little less than 5.5: 5.48^2 is about 30.03, so √30 is about 5.48 (more exactly 5.477). The difference is about 7.071 - 5.477 = 1.594, closest to 1.59.

Key computation (JS): `const v = Math.sqrt(50) - Math.sqrt(30); const opts = [1.59, 1.61, 1.67, 2.00]; let best = opts[0]; for (const o of opts) { if (Math.abs(o - v) < Math.abs(best - v)) best = o; } return best.toFixed(2);`

Distractors:
- A (2.00): The student rounds √50 to 7 and √30 to 5 and subtracts, 7 - 5 = 2.00. | computation: `return (7 - 5).toFixed(2);`
- B (1.67): The student finds 5.4^2 = 29.16 is just below 30 and uses 5.4 for √30 without going on, so the difference is 7.07 - 5.4, about 1.67. | computation: `return (Math.round((Math.sqrt(50) - 5.4) * 100) / 100).toFixed(2);`
- D (1.61): The student puts √50 1/15 of the way from 7 to 8 (7.07) and √30 5/11 of the way from 5 to 6 (5.45), and gets 7.07 - 5.45, about 1.61; the straight-line guess is too low for √30. | computation: `return (Math.round(((7 + 1/15) - (5 + 5/11)) * 100) / 100).toFixed(2);`

---

## MM4-N37

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A cube-shaped storage box holds exactly 5 cubic feet. Which of these is closest to the length of one edge of the box, in feet?

A. 1.57
B. 1.67
C. 1.50
D. 1.71

KEY: D (1.71)

Worked solution: The volume of a cube is edge x edge x edge, so the edge is the cube root of 5. Since 1 x 1 x 1 = 1 and 2 x 2 x 2 = 8, the edge is between 1 and 2. Cube the choices: 1.50^3 = 3.375, 1.57^3 is about 3.87, 1.67^3 is about 4.66, and 1.71^3 is about 5.00. The edge is closest to 1.71 feet.

Key computation (JS): `const v = Math.cbrt(5); const opts = [1.50, 1.57, 1.67, 1.71]; let best = opts[0]; for (const o of opts) { if (Math.abs(o - v) < Math.abs(best - v)) best = o; } return best.toFixed(2);`

Distractors:
- A (1.57): Since 5 is 4/7 of the way from 1 to 8, the student puts the edge 4/7 of the way from 1 to 2 and gets about 1.57, not noticing that cube roots grow more slowly near the top. | computation: `return (Math.round((1 + (5 - 1) / (8 - 1)) * 100) / 100).toFixed(2);`
- B (1.67): The student thinks 'cube' means 3 and divides the volume by 3: 5 / 3 is about 1.67. | computation: `return (Math.round(5 / 3 * 100) / 100).toFixed(2);`
- C (1.50): The student knows the edge is between the cube roots of 1 and 8, that is between 1 and 2, and simply takes the middle, 1.50, without checking 1.5^3. | computation: `return ((1 + 2) / 2).toFixed(2);`

---

## MM4-N12

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A puppy weighs 15.84 pounds. A kitten weighs 0.75 pound. How many times as heavy as the kitten is the puppy?

A. 21.12
B. 20.12
C. 11.88
D. 20.84

KEY: A (21.12)

Worked solution: Divide the puppy's weight by the kitten's weight: 15.84 / 0.75. Move both decimal points two places to the right: 1584 / 75 = 21.12. (Or: 0.75 = 3/4, so divide by 3 and multiply by 4: 15.84 / 3 = 5.28 and 5.28 x 4 = 21.12.) The puppy is 21.12 times as heavy as the kitten. Check: 21.12 x 0.75 = 15.84.

Key computation (JS): `return String(Math.round(1584 / 75 * 100) / 100);`

Distractors:
- B (20.12): The student correctly divides 15.84 by 3 to get 5.28, but when multiplying by 4 forgets the carried 1 into the ones place (5 x 4 = 20 instead of 21), writing 20.12. | computation: `const q = 15.84 / 3; return String(Math.round((q * 4 - 1) * 100) / 100);`
- C (11.88): The student reads 'times as heavy' as a multiplication and works 15.84 x 0.75 = 11.88. | computation: `return String(Math.round(15.84 * 0.75 * 100) / 100);`
- D (20.84): The student splits 15.84 into 15 and 0.84, divides 15 by 0.75 to get 20, and then just adds the 0.84, writing 20.84. | computation: `return String(Math.round((15 / 0.75 + 0.84) * 100) / 100);`

---

## MM4-N22

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Find the product (-1 3/4) x (-2 1/5). Write your answer as a mixed number.

A. 3 19/20
B. 3 17/20
C. 2 3/20
D. 4 1/5

KEY: B (3 17/20)

Worked solution: A negative times a negative is positive. Change each mixed number to a fraction: 1 3/4 = 7/4 and 2 1/5 = 11/5. Multiply: 7/4 x 11/5 = 77/20. Since 77 = 3 x 20 + 17, the product is 3 17/20.

Key computation (JS): `const n = (-7) * (-11), d = 4 * 5; return Math.floor(n / d) + ' ' + (n % d) + '/' + d;`

Distractors:
- A (3 19/20): Remembering only that 'two negatives make a positive', the student adds 1 3/4 and 2 1/5 to get 3 19/20 instead of multiplying. | computation: `const n = 7 * 5 + 11 * 4, d = 20; return Math.floor(n / d) + ' ' + (n % d) + '/' + d;`
- C (2 3/20): The student does 1 x 2 = 2 and 3/4 x 1/5 = 3/20 and writes 2 3/20, leaving out the cross products. | computation: `const w = 1 * 2, fn = 3 * 1, fd = 4 * 5; return w + ' ' + fn + '/' + fd;`
- D (4 1/5): Changing 2 1/5 to a fraction, the student writes 12/5 instead of 11/5, then multiplies 7/4 x 12/5 = 84/20 = 4 1/5. | computation: `const n = 7 * 12, d = 20, w = Math.floor(n / d), r = n % d, g = 4; return w + ' ' + (r / g) + '/' + (d / g);`

---

## MM4-N35

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Mr. Ortiz writes these eight numbers on the board: √0.49, √0.4, π, ∛(-0.027), √20 ÷ √5, 0.4111... (the digit 1 repeats forever), 0.1010010001... (the runs of 0s keep getting longer), and 5.8988988898888... (the runs of 8s keep getting longer). How many of the eight numbers are irrational?

A. 5
B. 7
C. 4
D. 2

KEY: C (4)

Worked solution: √0.49 = 0.7, because 0.7 x 0.7 = 0.49. ∛(-0.027) = -0.3, because (-0.3)^3 = -0.027. √20 ÷ √5 = √(20 ÷ 5) = √4 = 2. 0.4111... repeats, so it is rational (it equals 37/90). These four are rational. √0.4 is irrational: 0.4 = 40/100, and 40 is not a perfect square (0.2 x 0.2 is 0.04, not 0.4). π is irrational. The decimals 0.1010010001... and 5.8988988898888... never end, and because the runs keep getting longer, no block of digits ever repeats, so both are irrational. The irrational numbers are √0.4, π, 0.1010010001... and 5.8988988898888...: 4 numbers.

Key computation (JS): `const list = [{root:true, perfect:true}, {root:true, perfect:false}, {pi:true}, {root:true, perfect:true}, {root:true, perfect:true}, {repeating:true}, {pattern:true}, {pattern:true}]; let c = 0; for (const x of list) { if (x.root && !x.perfect) c++; if (x.pi) c++; if (x.pattern) c++; } return String(c);`

Distractors:
- A (5): The student counts 0.4111... as irrational because its digits go on forever, adding it to the four irrational numbers. | computation: `const list = [{root:true, perfect:true}, {root:true, perfect:false}, {pi:true}, {root:true, perfect:true}, {root:true, perfect:true}, {repeating:true}, {pattern:true}, {pattern:true}]; let c = 0; for (const x of list) { if (x.root && !x.perfect) c++; if (x.pi) c++; if (x.pattern) c++; if (x.repeating) c++; } return String(c);`
- B (7): The student counts every number written with a root sign, so √0.49, ∛(-0.027) and √20 ÷ √5 are added to the four irrational numbers. | computation: `const list = [{root:true, perfect:true}, {root:true, perfect:false}, {pi:true}, {root:true, perfect:true}, {root:true, perfect:true}, {repeating:true}, {pattern:true}, {pattern:true}]; let c = 0; for (const x of list) { if (x.root) c++; if (x.pi) c++; if (x.pattern) c++; } return String(c);`
- D (2): The student sees that 0.1010010001... and 5.8988988898888... follow a rule and calls them repeating, so only √0.4 and π are counted. | computation: `const list = [{root:true, perfect:true}, {root:true, perfect:false}, {pi:true}, {root:true, perfect:true}, {root:true, perfect:true}, {repeating:true}, {pattern:true}, {pattern:true}]; let c = 0; for (const x of list) { if (x.root && !x.perfect) c++; if (x.pi) c++; } return String(c);`

---

## MM4-N09

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ms. Lin has 3 pounds of clay. She cuts 1/2 pound of it into 9 equal pieces and gives 7 of the pieces to her students. How many pounds of clay does Ms. Lin have now?

A. 2 17/18
B. 2 13/18
C. 3 11/18
D. 2 11/18

KEY: D (2 11/18)

Worked solution: Each piece is 1/2 / 9 = 1/18 pound. Seven pieces are 7 x 1/18 = 7/18 pound. Then 3 - 7/18: write 3 as 2 18/18, so 2 18/18 - 7/18 = 2 11/18. Ms. Lin has 2 11/18 pounds of clay.

Key computation (JS): `const n = 3*18 - 7*1; return Math.floor(n/18) + ' ' + (n%18) + '/18';`

Distractors:
- A (2 17/18): The student finds the piece size 1/18 correctly but works out 7 x 1/18 as 7/126 = 1/18, so subtracts only 1/18 and gets 2 17/18. | computation: `const given = (7*1)/(7*18); const n = Math.round((3 - given)*18); return Math.floor(n/18) + ' ' + (n%18) + '/18';`
- B (2 13/18): The student thinks 7 of 9 pieces of a half pound is 7/9 - 1/2 = 5/18 pound, so 3 - 5/18 = 2 13/18. | computation: `const given = 7*2 - 9; const n = 3*18 - given; return Math.floor(n/18) + ' ' + (n%18) + '/18';`
- C (3 11/18): For 3 - 7/18 the student uses 18/18 - 7/18 = 11/18 for the fraction but keeps the 3, getting 3 11/18. | computation: `return 3 + ' ' + (18 - 7) + '/18';`

---

## MM4-N23

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Find the quotient (-2 1/4) ÷ (-3/5). Write your answer as a mixed number.

A. 3 3/4
B. 4 1/6
C. 1 7/20
D. 2 1/2

KEY: A (3 3/4)

Worked solution: A negative divided by a negative is positive. Write 2 1/4 as 9/4. Dividing by 3/5 is the same as multiplying by 5/3: 9/4 x 5/3 = 45/12 = 15/4 = 3 3/4.

Key computation (JS): `const n = 9 * 5, d = 4 * 3, g = 3; const N = n / g, D = d / g; return Math.floor(N / D) + ' ' + (N % D) + '/' + D;`

Distractors:
- B (4 1/6): Changing 2 1/4 to a fraction, the student computes 2 x 4 + 2 = 10 instead of 2 x 4 + 1 = 9, then 10/4 x 5/3 = 50/12 = 4 1/6. | computation: `const n = (2 * 4 + 2) * 5, d = 4 * 3, w = Math.floor(n / d), r = n % d, g = 2; return w + ' ' + (r / g) + '/' + (d / g);`
- C (1 7/20): The student multiplies 9/4 x 3/5 = 27/20 = 1 7/20 without flipping the divisor. | computation: `const n = 9 * 3, d = 4 * 5; return Math.floor(n / d) + ' ' + (n % d) + '/' + d;`
- D (2 1/2): The student writes 2 1/4 as (2 x 1 + 4)/4 = 6/4, then 6/4 x 5/3 = 30/12 = 2 1/2. | computation: `const num = 2 * 1 + 4, n = num * 5, d = 4 * 3; const g = 6; return Math.floor(n / d) + ' ' + ((n % d) / g) + '/' + (d / g);`
