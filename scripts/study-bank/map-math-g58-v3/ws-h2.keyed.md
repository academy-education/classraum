# Items for review, KEYED (37)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM3-O05

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Jin wrote two expressions. Expression P is 2 x (30 + 18). Expression Q is (30 + 18) / 8. The value of expression P is how many times the value of expression Q?

A. 16
B. 12
C. 0.25
D. 13

KEY: A (16)

Worked solution: P = 2 x (30 + 18) = 2 x 48 = 96. Q = (30 + 18) / 8 = 48 / 8 = 6. To find how many times as large P is, divide: 96 / 6 = 16. (P is 2 groups of 48 and Q is one eighth of 48, so P is 2 x 8 = 16 times Q.)

Key computation (JS): `const P = 2 * (30 + 18); const Q = (30 + 18) / 8; return String(P / Q);`

Distractors:
- B (12): The student divides P by the 8 printed in Q instead of by the value of Q: 96 / 8 = 12. | computation: `const P = 2 * (30 + 18); return String(P / 8);`
- C (0.25): The student reads (30 + 18) / 8 as 48 x 8 = 384, so P / Q = 96 / 384 = 0.25. | computation: `const P = 2 * (30 + 18); const Q = (30 + 18) * 8; return String(P / Q);`
- D (13): The student ignores the parentheses in P and computes 2 x 30 + 18 = 78, then 78 / 6 = 13. | computation: `const P = 2 * 30 + 18; const Q = (30 + 18) / 8; return String(P / Q);`

---

## MM3-G21

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Angle P and angle Q are complementary. The supplement of angle P is 40 degrees greater than the supplement of angle Q. What is the measure of the supplement of angle Q, in degrees?

A. 110
B. 115
C. 95
D. 130

KEY: B (115)

Worked solution: The supplement of P is 180 - P and the supplement of Q is 180 - Q. If (180 - P) is 40 more than (180 - Q), then Q is 40 more than P. Complementary angles add to 90, so P + Q = 90 and Q - P = 40. Adding the two facts: 2Q = 130, so Q = 65 degrees (and P = 25). The supplement of Q is 180 - 65 = 115 degrees. Check: the supplement of P is 155, and 155 - 115 = 40.

Key computation (JS): `return 180 - (90 + 40) / 2;`

Distractors:
- A (110): Halves the 40 correctly but takes the 20 away from 90 instead of adding it to 45, so Q = 70 and its supplement is 110. | computation: `return 180 - (90 - 40 / 2);`
- C (95): Starts from two equal angles of 45 and adds the whole 40 to Q instead of splitting the difference, so Q = 85 and its supplement is 95. | computation: `return 180 - (90 / 2 + 40);`
- D (130): Treats the 40-degree difference as angle P itself, so Q = 90 - 40 = 50 and its supplement is 130. | computation: `return 180 - (90 - 40);`

---

## MM3-N15

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: In a quiz game, each right answer scores 4 points and each wrong answer scores -1.5 points. Kim answered 16 questions and got 4 of them wrong. What was Kim's total score?

A. 24
B. 30
C. 42
D. 32

KEY: C (42)

Worked solution: Kim got 16 - 4 = 12 answers right. The right answers score 12 x 4 = 48 points. The wrong answers score 4 x (-1.5) = -6 points. Her total score is 48 + (-6) = 42 points.

Key computation (JS): `var right=16-4; return String(right*4 + 4*(-1.5));`

Distractors:
- A (24): Scores -1.5 for every one of the 16 questions Kim answered, not only the 4 wrong ones: 48 - 24 = 24. | computation: `var right=16-4; return String(right*4 + 16*(-1.5));`
- B (30): Combines the two scores into one net score, 4 - 1.5 = 2.5, and multiplies it by the 12 right answers, as if every right answer came with a wrong one. | computation: `var right=16-4; return String(right*(4-1.5));`
- D (32): Takes away the value of a right answer, 4 points, for each wrong answer instead of 1.5 points: 48 - 16 = 32. | computation: `var right=16-4; return String(right*4 - 4*4);`

---

## MM3-G08

Area: Geometry | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A rectangular wall is 30 inches wide and 28 inches tall. It is covered completely, with no gaps or overlaps, by tiles shaped like right triangles. On each tile the two sides that meet at the right angle are 5 inches and 4 inches long. How many tiles cover the wall?

A. 42
B. 60
C. 70
D. 84

KEY: D (84)

Worked solution: The wall's area is 30 x 28 = 840 square inches. Each tile is a right triangle, so its area is half of 5 x 4: (5 x 4) / 2 = 10 square inches. The number of tiles is 840 / 10 = 84. (Two tiles together make a 5-by-4 rectangle; 6 of those fit across the 30 inches and 7 fit up the 28 inches, so 42 rectangles, which is 84 tiles.)

Key computation (JS): `return (30*28) / (5*4/2);`

Distractors:
- A (42): Uses 5 x 4 = 20 as the area of a triangle tile, the rectangle formula without the half, so divides 840 by 20. | computation: `return (30*28) / (5*4);`
- B (60): Treats the tiles as '5-inch tiles' and uses the 5-inch leg in both directions: 6 rectangles fit across the 30 inches and 5 whole ones up the 28 inches (28/5 = 5.6), so 2 x 6 x 5 = 60. | computation: `return 2*Math.floor(30/5)*Math.floor(28/5);`
- C (70): Lays the 5-inch side up the wall and the 4-inch side across, so only 7 rectangles fit across (30/4 = 7.5) and 5 up (28/5 = 5.6), and counts 2 x 7 x 5 = 70 whole tiles. | computation: `return 2*Math.floor(30/4)*Math.floor(28/5);`

---

## MM3-G25

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A toy rocket is a solid made of a cylinder and a cone. The cylinder has a radius of 3 centimeters and a height of 4 centimeters. A cone with the same radius and a height of 11 centimeters is attached to one end of the cylinder, so that the cone's base covers that end exactly. Using 3.14 for pi, what is the volume of the toy rocket, in cubic centimeters?

A. 216.66
B. 113.04
C. 147.58
D. 150.72

KEY: A (216.66)

Worked solution: Cylinder: 3.14 x 3 x 3 x 4 = 113.04 cubic centimeters. Cone: 1/3 x 3.14 x 3 x 3 x 11 = 103.62 cubic centimeters. The rocket's volume is 113.04 + 103.62 = 216.66 cubic centimeters.

Key computation (JS): `return Math.round((3.14*3*3*4 + 3.14*3*3*11/3) * 100) / 100;`

Distractors:
- B (113.04): Finds the cylinder's volume and leaves out the cone. | computation: `return Math.round(3.14*3*3*4 * 100) / 100;`
- C (147.58): In the cone formula multiplies by the radius once instead of squaring it: 1/3 x 3.14 x 3 x 11 = 34.54. | computation: `return Math.round((3.14*3*3*4 + 3.14*3*11/3) * 100) / 100;`
- D (150.72): Uses the cylinder's height, 4, for the cone too: 1/3 x 3.14 x 9 x 4 = 37.68. | computation: `return Math.round((3.14*3*3*4 + 3.14*3*3*4/3) * 100) / 100;`

---

## MM3-G11

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Parallelogram ABCD is drawn in the coordinate plane with vertices A(-5, -5), B(4, -5), C(9, 9), and D(0, 9). Each unit on the grid is 1 meter. What is the area of the parallelogram, in square meters?

A. 150
B. 126
C. 36
D. 63

KEY: B (126)

Worked solution: Side AB is horizontal, from x = -5 to x = 4, so the base is 4 - (-5) = 9 meters. Side DC is on the line y = 9 and side AB is on the line y = -5, so the height between them is 9 - (-5) = 14 meters. The area of a parallelogram is base x height: 9 x 14 = 126 square meters.

Key computation (JS): `return (4 - (-5)) * (9 - (-5));`

Distractors:
- A (150): Counts grid points instead of units along each side (10 across and 15 up), so multiplies 10 x 15. | computation: `return (4 - (-5) + 1) * (9 - (-5) + 1);`
- C (36): Finds the height as 9 - 5 = 4, ignoring that -5 is below the x-axis, so 9 x 4 = 36. | computation: `return (4 - (-5)) * (9 - 5);`
- D (63): Uses the triangle formula, half of base x height, for the parallelogram. | computation: `return (4 - (-5)) * (9 - (-5)) / 2;`

---

## MM3-N21

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Jin divides the sum of -1/2 and 1 2/3 by the sum of -2 1/6 and 1/2. In other words, he works out (-1/2 + 1 2/3) ÷ (-2 1/6 + 1/2). What quotient does he get?

A. -1 3/7
B. -7/16
C. -7/10
D. -7/8

KEY: C (-7/10)

Worked solution: First part: -1/2 + 1 2/3 = -3/6 + 10/6 = 7/6. Second part: -2 1/6 + 1/2 = -13/6 + 3/6 = -10/6 = -5/3. Divide: 7/6 ÷ (-5/3) = 7/6 x (-3/5) = -21/30 = -7/10. A positive divided by a negative is negative.

Key computation (JS): `var a=-1/2+(1+2/3), b=-(2+1/6)+1/2, v=a/b; var n=Math.round(v*10); return (n<0?'-':'')+Math.abs(n)+'/10';`

Distractors:
- A (-1 3/7): Finds 7/6 and -5/3 correctly but divides the second by the first, -5/3 ÷ 7/6 = -10/7. | computation: `var a=-1/2+(1+2/3), b=-(2+1/6)+1/2, v=b/a; var w=Math.trunc(v), f=Math.round(Math.abs(v-w)*7); return '-'+Math.abs(w)+' '+f+'/7';`
- B (-7/16): Subtracts in the second part, -2 1/6 - 1/2 = -8/3, as if both numbers were negative, and 7/6 ÷ (-8/3) = -7/16. | computation: `var a=-1/2+(1+2/3), b=-(2+1/6)-1/2, v=a/b; return '-'+Math.round(Math.abs(v)*16)+'/16';`
- D (-7/8): Reads -2 1/6 as -2 + 1/6 = -11/6, so the second part is -4/3, and 7/6 ÷ (-4/3) = -7/8. | computation: `var a=-1/2+(1+2/3), b=(-2+1/6)+1/2, v=a/b; return '-'+Math.round(Math.abs(v)*8)+'/8';`

---

## MM3-G14

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Kai wants to make a closed box shaped like a rectangular prism that is 10 inches long, 7 inches wide, and 5 inches tall. He will cut its net from cardboard, with no flaps or overlaps. He has one rectangular piece of cardboard that is 12 inches long and 10 inches wide, which is not enough. How many more square inches of cardboard does he need?

A. 230
B. 300
C. 220
D. 190

KEY: D (190)

Worked solution: The net is made of the box's six faces. Two faces are 10 by 7 (70 square inches each), two are 10 by 5 (50 each), and two are 7 by 5 (35 each). The net's area is 2 x (70 + 50 + 35) = 2 x 155 = 310 square inches. Kai has 12 x 10 = 120 square inches, so he needs 310 - 120 = 190 more square inches.

Key computation (JS): `return 2*(10*7 + 10*5 + 7*5) - 12*10;`

Distractors:
- A (230): Uses the box's volume (10 x 7 x 5 = 350) as the area of the net, then takes away 120. | computation: `return 10*7*5 - 12*10;`
- B (300): Uses the biggest face, 10 by 7, for all six faces of the net (6 x 70 = 420), then takes away 120. | computation: `return 6*10*7 - 12*10;`
- C (220): Uses the 10-by-5 front face for all four side faces (2 x 70 + 4 x 50 = 340) instead of two 10-by-5 faces and two 7-by-5 faces, then takes away 120. | computation: `return 2*10*7 + 4*10*5 - 12*10;`

---

## MM3-O08

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A bag of flour weighs 5 pounds. A bag of sugar weighs 73 ounces. How many ounces heavier is the heavier bag?

A. 7
B. 68
C. 13
D. 23

KEY: A (7)

Worked solution: There are 16 ounces in 1 pound, so the flour weighs 5 x 16 = 80 ounces. The flour is heavier, by 80 - 73 = 7 ounces.

Key computation (JS): `return String(Math.abs(5 * 16 - 73));`

Distractors:
- B (68): The student subtracts the two printed numbers without converting pounds to ounces: 73 - 5 = 68. | computation: `return String(73 - 5);`
- C (13): The student uses 12 ounces in a pound (mixing it up with 12 inches in a foot): 5 x 12 = 60 ounces, so the sugar looks heavier by 73 - 60 = 13. | computation: `return String(Math.abs(5 * 12 - 73));`
- D (23): The student uses 10 ounces in a pound: 5 x 10 = 50 ounces, so the sugar looks heavier by 73 - 50 = 23. | computation: `return String(Math.abs(5 * 10 - 73));`

---

## MM3-O15

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Four friends each bought one concert ticket at the regular price. Each friend used an $8 coupon on their ticket. Together, they paid $60 after the coupons. What was the regular price, in dollars, of one ticket?

A. 17
B. 23
C. 47
D. 13

KEY: B (23)

Worked solution: Let x be the regular price. Each friend paid x - 8, and four friends paid 4(x - 8) = 60. Divide both sides by 4: x - 8 = 15. Add 8: x = 23. The regular price was $23.

Key computation (JS): `return String(60 / 4 + 8);`

Distractors:
- A (17): The student writes 4x - 8 = 60, counting the $8 coupon once instead of once per friend: 4x = 68, x = 17. | computation: `return String((60 + 8) / 4);`
- C (47): The student finds 15 paid per ticket but then adds back all four coupons (4 x 8 = 32) to one ticket: 15 + 32 = 47. | computation: `return String(60 / 4 + 4 * 8);`
- D (13): The student writes 4x + 8 = 60 (one coupon, and on the wrong side) and gets x = 52 / 4 = 13. | computation: `return String((60 - 8) / 4);`

---

## MM3-O19

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Shop A sells a bike helmet for $80 and is taking 30% off. Shop B sells the same helmet for $70 and is taking 15% off. After the discounts, how many dollars less does the helmet cost at Shop A than at Shop B?

A. 13.5
B. 15
C. 3.5
D. 9.5

KEY: C (3.5)

Worked solution: Shop A: 30% of $80 is $24, so the sale price is 80 - 24 = $56. Shop B: 15% of $70 is $10.50, so the sale price is 70 - 10.50 = $59.50. The helmet costs 59.50 - 56 = $3.50 less at Shop A.

Key computation (JS): `return String((70 - 70 * 0.15) - (80 - 80 * 0.30));`

Distractors:
- A (13.5): The student compares the discount amounts, $24 and $10.50, instead of the sale prices: 24 - 10.50 = 13.50. | computation: `return String(80 * 0.30 - 70 * 0.15);`
- B (15): The student subtracts the percents, 30% - 15% = 15, and gives 15 as the dollar difference. | computation: `return String(30 - 15);`
- D (9.5): The student reads Shop A's 30% off as $30 off, so Shop A's price is 50, and 59.50 - 50 = 9.50. | computation: `return String((70 - 70 * 0.15) - (80 - 30));`

---

## MM3-N26

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: For how many whole numbers n is the square root of n greater than 3.5 and less than 6.6?

A. 6
B. 27
C. 34
D. 31

KEY: D (31)

Worked solution: The square root of n is greater than 3.5 exactly when n is greater than 3.5^2 = 12.25, and less than 6.6 exactly when n is less than 6.6^2 = 43.56. So n can be 13, 14, ..., 43. That is 43 - 13 + 1 = 31 whole numbers.

Key computation (JS): `var c=0; for(var n=0;n<200;n++){ if(n>3.5*3.5 && n<6.6*6.6) c++; } return String(c);`

Distractors:
- A (6): Doubles the decimals instead of squaring them, 3.5 x 2 = 7 and 6.6 x 2 = 13.2, and counts 8 through 13. | computation: `var c=0; for(var n=0;n<200;n++){ if(n>3.5*2 && n<6.6*2) c++; } return String(c);`
- B (27): Squares each decimal by squaring its parts, 3.5^2 as 9 + 0.25 = 9.25 and 6.6^2 as 36 + 0.36 = 36.36, and counts 10 through 36. | computation: `var lo=3*3+0.5*0.5, hi=6*6+0.6*0.6, c=0; for(var n=0;n<200;n++){ if(n>lo && n<hi) c++; } return String(c);`
- C (34): Rounds the roots to whole numbers, 4 and 7, and counts every n from 4^2 = 16 to 7^2 = 49. | computation: `var c=0; for(var n=0;n<200;n++){ if(n>=4*4 && n<=7*7) c++; } return String(c);`

---

## MM3-O26

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Function A is linear. When x = 0, the output of function A is 15, and when x = 2, its output is 25. Function B is defined by the equation y = 6x - 12. For what value of x is the output of function B 40 more than the output of function A?

A. 67
B. 37
C. -8
D. 77

KEY: A (67)

Worked solution: Function A goes up 25 - 15 = 10 while x goes up 2, so its rate of change is 10 / 2 = 5, and its initial value is 15: y = 5x + 15. Function B's output minus function A's output is (6x - 12) - (5x + 15) = x - 27. Set this equal to 40: x - 27 = 40, so x = 67. Check: A gives 5(67) + 15 = 350, B gives 6(67) - 12 = 390, and 390 - 350 = 40.

Key computation (JS): `const mA = (25 - 15) / 2; return String((40 + 15 + 12) / (6 - mA));`

Distractors:
- B (37): The student subtracts A's x-term but adds A's initial value, writing 6x - 12 - 5x + 15 = x + 3, so x + 3 = 40 and x = 37. | computation: `const mA = (25 - 15) / 2; return String((40 - 15 + 12) / (6 - mA));`
- C (-8): The student treats A as proportional, using 25 / 2 = 12.5 as its rate and no initial value, so 6x - 12 - 12.5x = 40, -6.5x = 52 and x = -8. | computation: `const mA = 25 / 2; return String((40 + 12) / (6 - mA));`
- D (77): The student takes A's output at x = 2, which is 25, as A's initial value, writing A as 5x + 25, so x - 37 = 40 and x = 77. | computation: `const mA = (25 - 15) / 2; return String((40 + 25 + 12) / (6 - mA));`

---

## MM3-O14

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ana can fold 9 letters per minute, and Ben can fold 7 letters per minute. They work together, each at a steady rate, to fold a stack of 24 letters. How many seconds does it take them to fold all 24 letters?

A. 40
B. 90
C. 110
D. 80

KEY: B (90)

Worked solution: Working together they fold 9 + 7 = 16 letters per minute. The time for 24 letters is 24 / 16 = 1.5 minutes. One minute is 60 seconds, so 1.5 minutes is 1.5 x 60 = 90 seconds.

Key computation (JS): `const rate = 9 + 7; return String(24 / rate * 60);`

Distractors:
- A (40): The student divides the wrong way, 16 / 24 of a minute, and converts that to 40 seconds. | computation: `const rate = 9 + 7; return String(rate / 24 * 60);`
- C (110): The student finds 1.5 minutes correctly but reads it as 1 minute 50 seconds, so 60 + 50 = 110 seconds. | computation: `const t = 24 / (9 + 7); const m = Math.floor(t); return String(60 * m + Math.round((t - m) * 10) * 10);`
- D (80): The student finds Ana's time alone (24 / 9 of a minute = 160 seconds) and halves it, thinking two workers take half the time of one. | computation: `return String((24 / 9) * 60 / 2);`

---

## MM3-O04

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Ben wrote two expressions: 8 x (39 + 20) and 5 x (39 + 20). How much greater is the value of Ben's first expression than the value of his second expression?

A. 767
B. 137
C. 177
D. 117

KEY: C (177)

Worked solution: Both expressions use the same sum, 39 + 20 = 59. The first is 8 groups of 59 and the second is 5 groups of 59, so the first is 3 groups of 59 greater: 3 x 59 = 177. Check: 8 x 59 = 472 and 5 x 59 = 295, and 472 - 295 = 177.

Key computation (JS): `return String(8 * (39 + 20) - 5 * (39 + 20));`

Distractors:
- A (767): The student adds the two values, 472 + 295 = 767, instead of subtracting to find how much greater. | computation: `return String(8 * (39 + 20) + 5 * (39 + 20));`
- B (137): The student sees that 8 - 5 = 3 but then writes 3 x 39 + 20, multiplying only the 39 by 3 instead of the whole sum. | computation: `return String((8 - 5) * 39 + 20);`
- D (117): The student ignores the parentheses in both expressions (8 x 39 + 20 = 332 and 5 x 39 + 20 = 215), so the 20 is added once to each and cancels: 332 - 215 = 117. | computation: `return String((8 * 39 + 20) - (5 * 39 + 20));`

---

## MM3-G26

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A pitcher shaped like a cylinder has an inside radius of 6 centimeters and is filled with water to a height of 17 centimeters. Each glass is shaped like a cylinder with an inside radius of 3 centimeters and a height of 5 centimeters. How many glasses can be filled completely with the water in the pitcher?

A. 6
B. 3
C. 54
D. 13

KEY: D (13)

Worked solution: Water in the pitcher: pi x 6 x 6 x 17 = 612 x pi cubic centimeters. One glass holds pi x 3 x 3 x 5 = 45 x pi cubic centimeters. 612 / 45 = 13.6, so the water fills 13 glasses completely, with some left over for a 14th glass that is not full.

Key computation (JS): `return Math.floor((6*6*17) / (3*3*5));`

Distractors:
- A (6): Uses the radii without squaring them: (6 x 17) / (3 x 5) = 6.8, so 6 glasses. | computation: `return Math.floor((6*17) / (3*5));`
- B (3): Compares only the heights, 17 / 5 = 3.4, and ignores that the pitcher is wider than a glass. | computation: `return Math.floor(17 / 5);`
- C (54): Treats the glass's 3 centimeters as its diameter, so uses a radius of 1.5 and gets 612 / 11.25 = 54.4, so 54 glasses. | computation: `return Math.floor((6*6*17) / (1.5*1.5*5));`

---

## MM3-N06

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A rectangular floor is 3 1/2 meters long and 2 2/3 meters wide. It is covered with no gaps or overlaps by tiles that are each 1/2 meter long and 1/3 meter wide. All the tiles face the same way, with the 1/2-meter side along the length of the floor. How many tiles cover the floor?

A. 56
B. 64
C. 42
D. 30

KEY: A (56)

Worked solution: Along the length, count how many 1/2-meter tiles fit in 3 1/2 meters: 3 1/2 = 7/2, so 7 tiles. Along the width, count how many 1/3-meter tiles fit in 2 2/3 meters: 2 2/3 = 8/3, so 8 tiles. The tiles make 7 columns and 8 rows, so there are 7 x 8 = 56 tiles.

Key computation (JS): `var along=(3*2+1), across=(2*3+2); return String(along*across);`

Distractors:
- B (64): Along the length counts the marks at 0, 1/2, 1, ..., 3 1/2 (8 marks) instead of the 7 spaces between them, then multiplies 8 x 8. | computation: `var along=(3*2+1)+1, across=(2*3+2); return String(along*across);`
- C (42): Counts 6 thirds in the width, using only the whole 2 meters and forgetting the extra 2/3 meter, then multiplies 7 x 6. | computation: `var along=(3*2+1), across=(2*3); return String(along*across);`
- D (30): Counts the tiles along the four sides of the floor, 7 + 8 + 7 + 8 = 30, counting each corner tile twice and mixing up covering the floor with going around it. | computation: `var along=(3*2+1), across=(2*3+2); return String(2*along + 2*across);`

---

## MM3-N24

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The numbers a and b are integers. 4 raised to the power a equals 1/1024, and 5 raised to the power b equals 625. In symbols, 4^a = 1/1024 and 5^b = 625. What is b - a?

A. 7
B. 9
C. 6
D. 130

KEY: B (9)

Worked solution: 1024 = 4 x 4 x 4 x 4 x 4 = 4^5, so 1/1024 = 4^-5 and a = -5. 625 = 5 x 5 x 5 x 5 = 5^4, so b = 4. Then b - a = 4 - (-5) = 4 + 5 = 9.

Key computation (JS): `var a=-Math.round(Math.log(1024)/Math.log(4)), b=Math.round(Math.log(625)/Math.log(5)); return String(b-a);`

Distractors:
- A (7): Recognizes 625 = 25 x 25 and takes b = 2, using the base 25 instead of the base 5; b - a = 2 + 5 = 7. | computation: `var a=-Math.round(Math.log(1024)/Math.log(4)), b=Math.round(Math.log(625)/Math.log(25)); return String(b-a);`
- C (6): Recognizes 1024 = 32 x 32 and writes 1/1024 = 32^-2, then takes a = -2 without going back to the base 4; b - a = 4 + 2 = 6. | computation: `var a=-Math.round(Math.log(1024)/Math.log(32)), b=Math.round(Math.log(625)/Math.log(5)); return String(b-a);`
- D (130): Finds b by dividing, 625 / 5 = 125, so b - a = 125 + 5 = 130. | computation: `var a=-Math.round(Math.log(1024)/Math.log(4)), b=625/5; return String(b-a);`

---

## MM3-N02

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Five friends share 14 pounds of grapes equally. How many pounds of grapes does each friend get?

A. 2 2/5
B. 5/14
C. 2 4/5
D. 2 1/5

KEY: C (2 4/5)

Worked solution: Sharing 14 pounds among 5 friends means 14 divided by 5, which is 14/5. Since 5 x 2 = 10, each friend gets 2 whole pounds and the 4 pounds left over are shared 5 ways, 4/5 pound each. So each friend gets 2 4/5 pounds.

Key computation (JS): `var w=Math.floor(14/5), r=14%5; return w+' '+r+'/5';`

Distractors:
- A (2 2/5): Gets 2 remainder 4 and writes it as the decimal 2.4, which is 2 4/10 = 2 2/5, instead of 4 fifths. | computation: `var w=Math.floor(14/5), r=14%5; var tenths=r; var g=function(a,b){return b?g(b,a%b):a}; var k=g(tenths,10); return w+' '+(tenths/k)+'/'+(10/k);`
- B (5/14): Divides the wrong way, writing the number of friends over the number of pounds: 5/14. | computation: `return '5/14';`
- D (2 1/5): Gives each friend 2 pounds, then splits the leftover into 5 parts and calls each part 1/5 of a pound, as if only 1 pound were left instead of 4. | computation: `var w=Math.floor(14/5); return w+' 1/5';`

---

## MM3-O23

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Two elevators start from the ground floor at the same time and rise at constant speeds. Elevator A rises 24 feet in 3 seconds. The height y, in feet, of Elevator B after x seconds is given by y = 12x. After 32 seconds, how many feet higher is Elevator B than Elevator A?

A. 360
B. 8
C. 288
D. 128

KEY: D (128)

Worked solution: Elevator A rises 24 / 3 = 8 feet each second, so after 32 seconds it is 8 x 32 = 256 feet high. Elevator B rises 12 feet each second, so after 32 seconds it is 12 x 32 = 384 feet high. Elevator B is 384 - 256 = 128 feet higher. (Or: B gains 12 - 8 = 4 feet on A each second, and 4 x 32 = 128.)

Key computation (JS): `return String(12 * 32 - (24 / 3) * 32);`

Distractors:
- A (360): The student finds B's height at 32 seconds, 384, but subtracts A's printed 24 feet, which is A's height at 3 seconds, not at 32 seconds. | computation: `return String(12 * 32 - 24);`
- B (8): The student finds the difference in speeds, 12 - 8 = 4 feet per second, and then divides the 32 seconds by it instead of multiplying. | computation: `return String(32 / (12 - 24 / 3));`
- C (288): The student takes Elevator A's speed to be the printed 3 (the seconds, not the feet per second) and computes (12 - 3) x 32. | computation: `return String((12 - 3) * 32);`

---

## MM3-N25

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A grain of rice has a mass of about 3.5 x 10^-2 gram. A sack holds about 4.6 x 10^6 grains of rice. Using these numbers, what is the total mass of the rice in the sack, in grams?

A. 161000
B. 140300
C. 1610000000
D. 151000

KEY: A (161000)

Worked solution: Multiply the numbers: (3.5 x 10^-2) x (4.6 x 10^6) = (3.5 x 4.6) x 10^(-2 + 6) = 16.1 x 10^4. In standard form, 16.1 x 10^4 = 161,000 grams.

Key computation (JS): `var c = Math.round(3.5*4.6*10)/10; return String(Math.round(c*Math.pow(10,-2+6)));`

Distractors:
- B (140300): Multiplies 3.5 x 4.6 in two parts, 3 x 4.6 = 13.8 and 0.5 x 4.6 = 2.3, but writes the second part as 0.23 with the decimal point one place off: 13.8 + 0.23 = 14.03, so 14.03 x 10^4 = 140,300. | computation: `var c = 3*4.6 + (0.5*4.6)/10; return String(Math.round(c*Math.pow(10,4)));`
- C (1610000000): Multiplies the coefficients correctly but drops the negative sign on 10^-2, adding 2 + 6 = 8 for the exponent: 16.1 x 10^8 = 1,610,000,000. | computation: `var c = Math.round(3.5*4.6*10)/10; return String(Math.round(c*Math.pow(10,2+6)));`
- D (151000): In 3 x 4.6 writes 8 for 3 x 6 = 18 but forgets to carry the 1 into 3 x 4 = 12, getting 12.8 instead of 13.8; then 12.8 + 2.3 = 15.1, and 15.1 x 10^4 = 151,000. | computation: `var p = (3*6)%10 + 10*(3*4); var c = p/10 + 0.5*4.6; return String(Math.round(c*Math.pow(10,4)));`

---

## MM3-O21

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A pair of shoes costs $65. The shoes can be bought in two ways. Plan 1: take 20% off the price, then add 8% sales tax. Plan 2: add 8% sales tax to the price, then take $13 off. How many dollars more does Plan 2 cost than Plan 1?

A. 8.60
B. 1.04
C. 4.91
D. 4.78

KEY: B (1.04)

Worked solution: Plan 1: 20% of $65 is $13, so the sale price is $52; with 8% tax, 52 x 1.08 = $56.16. Plan 2: with 8% tax the price is 65 x 1.08 = $70.20; then $13 off gives $57.20. Plan 2 costs 57.20 - 56.16 = $1.04 more. (In Plan 2 the $13 is taken off after tax, so the buyer pays tax on that $13: 8% of $13 = $1.04.)

Key computation (JS): `const p1 = 65 * 0.80 * 1.08; const p2 = 65 * 1.08 - 13; return (Math.round((p2 - p1) * 100) / 100).toFixed(2);`

Distractors:
- A (8.60): The student takes 20% off as $20 off, so Plan 1 is 45 x 1.08 = 48.60, and 57.20 - 48.60 = 8.60. | computation: `const p1 = (65 - 20) * 1.08; const p2 = 65 * 1.08 - 13; return (Math.round(Math.abs(p2 - p1) * 100) / 100).toFixed(2);`
- C (4.91): The student reads Plan 2's $13 off as 13% off, so Plan 2 is 70.20 x 0.87 = 61.07 (to the cent), and gives the gap between 61.07 and 56.16 as 4.91. | computation: `const p1 = 65 * 0.80 * 1.08; const p2 = Math.round(65 * 1.08 * 0.87 * 100) / 100; return (Math.round(Math.abs(p2 - p1) * 100) / 100).toFixed(2);`
- D (4.78): The student writes Plan 1's 8% tax as 0.008, so Plan 1 is 52 x 1.008 = 52.42 (to the cent), and 57.20 - 52.42 = 4.78. | computation: `const p1 = Math.round(65 * 0.80 * 1.008 * 100) / 100; const p2 = 65 * 1.08 - 13; return (Math.round((p2 - p1) * 100) / 100).toFixed(2);`

---

## MM3-O16

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Mia simplifies the expression 4(3x - 8) - 3(x - 7) as far as she can. Her answer has an x-term and a number term. What is the number term?

A. -39
B. -53
C. -11
D. 13

KEY: C (-11)

Worked solution: 4(3x - 8) = 12x - 32. -3(x - 7) = -3x + 21, because -3 times -7 is +21. Combine: 12x - 3x = 9x and -32 + 21 = -11. The simplified expression is 9x - 11, so the number term is -11.

Key computation (JS): `return String(-4 * 8 + 3 * 7);`

Distractors:
- A (-39): The student writes -3(x - 7) as -3x - 7: it multiplies only the x by 3 and keeps the minus sign, so -32 - 7 = -39. | computation: `return String(-4 * 8 - 7);`
- B (-53): The student takes -3 times -7 as -21, so the number term is -32 - 21 = -53. | computation: `return String(-4 * 8 - 3 * 7);`
- D (13): The student writes 4(3x - 8) as 12x - 8, multiplying only the first term by 4, so -8 + 21 = 13. | computation: `return String(-8 + 3 * 7);`

---

## MM3-N11

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A submarine is 351 meters below sea level, so its elevation is -351 meters. A diver is at 4/9 of the submarine's depth. A seagull is flying 38 meters above sea level. How many meters apart are the diver and the seagull?

A. 184
B. 164
C. 233
D. 194

KEY: D (194)

Worked solution: The diver's depth is 4/9 of 351: 351 / 9 = 39 and 39 x 4 = 156, so the diver is at -156 meters. The seagull is at 38 meters. They are on opposite sides of sea level, so the distance between them is 156 + 38 = 194 meters.

Key computation (JS): `return String(351/9*4 + 38);`

Distractors:
- A (184): Finds the diver at 156 meters deep, but in 156 + 38 writes 4 for 6 + 8 = 14 and forgets to carry the 1 into the tens: 184. | computation: `var d=351/9*4; var s=(d%10 + 8)%10 + 10*(Math.floor(d/10)%10 + 3) + 100*Math.floor(d/100); return String(s);`
- B (164): Finds 351 / 9 = 39, but in 39 x 4 writes 6 for 9 x 4 = 36 and forgets to carry the 3 into 3 x 4 = 12, getting 126 instead of 156; then 126 + 38 = 164. | computation: `var u=351/9; var m=(u%10*4)%10 + 10*(Math.floor(u/10)*4); return String(m + 38);`
- C (233): Takes the other part of the depth, 5/9 of 351 = 195 (the distance from the diver down to the submarine), as the diver's depth, then adds 38: 233. | computation: `return String(351/9*5 + 38);`

---

## MM3-G27

Area: Geometry | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A ball is placed inside a closed box shaped like a cube with inside edges 6 inches long. The ball just fits: it touches all six faces of the box. Using 3.14 for pi, how many cubic inches of space inside the box are not taken up by the ball?

A. 102.96
B. 113.04
C. 131.22
D. 178.32

KEY: A (102.96)

Worked solution: The ball touches all six faces, so its diameter equals the edge of the cube, 6 inches, and its radius is 3 inches. The ball's volume is 4/3 x 3.14 x 3 x 3 x 3 = 113.04 cubic inches. The box holds 6 x 6 x 6 = 216 cubic inches. The space not taken up by the ball is 216 - 113.04 = 102.96 cubic inches.

Key computation (JS): `return Math.round((6*6*6 - 4/3*3.14*3*3*3) * 100) / 100;`

Distractors:
- B (113.04): Finds the ball's volume correctly and gives it as the answer, the space the ball takes up instead of the space it leaves. | computation: `return Math.round(4/3*3.14*3*3*3 * 100) / 100;`
- C (131.22): Leaves the 4/3 out of the sphere formula, so takes away only 3.14 x 27 = 84.78. | computation: `return Math.round((6*6*6 - 3.14*3*3*3) * 100) / 100;`
- D (178.32): Squares the radius instead of cubing it in the sphere formula, so takes away only 4/3 x 3.14 x 9 = 37.68. | computation: `return Math.round((6*6*6 - 4/3*3.14*3*3) * 100) / 100;`

---

## MM3-N27

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The number x is the cube root of 0.216, so x^3 = 0.216. What is the value of x^-2? Give the answer as a fraction or mixed number.

A. 2 7/25
B. 2 7/9
C. 1 4/9
D. 2 14/25

KEY: B (2 7/9)

Worked solution: Since 0.6 x 0.6 x 0.6 = 0.216, x = 0.6 = 3/5. Then x^-2 = 1 / x^2 = 1 / (3/5)^2 = 1 / (9/25) = 25/9 = 2 7/9.

Key computation (JS): `var x=Math.cbrt(0.216), v=Math.pow(x,-2); var w=Math.floor(v+1e-9); return w+' '+Math.round((v-w)*9)+'/9';`

Distractors:
- A (2 7/25): Finds x^2 = 0.36 and works out 1 / 0.36 as 100 / 36 = 2 remainder 28, then writes the remainder as decimal digits, 2.28 = 2 7/25, instead of 2 28/36. | computation: `var x=Math.round(Math.cbrt(0.216)*10)/10; var n=100, d=Math.round(x*x*100); var q=Math.floor(n/d), r=n%d; var dec=q + r/100; var w=Math.floor(dec), num=Math.round((dec-w)*100); var g=function(a,b){return b?g(b,a%b):a}; var k=g(num,100); return w+' '+(num/k)+'/'+(100/k);`
- C (1 4/9): Finds 1/x = 1 2/3 and squares it part by part, 1^2 + (2/3)^2 = 1 4/9, instead of squaring the whole number 5/3. | computation: `var x=Math.cbrt(0.216); var r=1/x; var w=Math.floor(r+1e-9), f=r-w; var v=w*w+f*f; var W=Math.floor(v+1e-9); return W+' '+Math.round((v-W)*9)+'/9';`
- D (2 14/25): Takes the reciprocal of 0.6 as 1.6 (1 + 0.6) instead of 1 / 0.6 = 1 2/3, then squares it: 1.6^2 = 2.56 = 2 14/25. | computation: `var x=Math.round(Math.cbrt(0.216)*10)/10; var r=1+x; var v=r*r; var w=Math.floor(v+1e-9), num=Math.round((v-w)*100); var g=function(a,b){return b?g(b,a%b):a}; var k=g(num,100); return w+' '+(num/k)+'/'+(100/k);`

---

## MM3-O06

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Nia needs 180 beads for a project. She has 6 bags with 13 beads in each bag. She also has 5 bags that each hold 3 fewer beads than one of the first bags. How many more beads does Nia need?

A. 42
B. 22
C. 52
D. 40

KEY: C (52)

Worked solution: Each of the 5 smaller bags holds 13 - 3 = 10 beads. Nia has 6 x 13 + 5 x 10 = 78 + 50 = 128 beads. She needs 180 - 128 = 52 more beads.

Key computation (JS): `return String(180 - (6 * 13 + 5 * (13 - 3)));`

Distractors:
- A (42): The student uses the 6 for both kinds of bag, 6 x (13 + 10) = 138, and gets 180 - 138 = 42. | computation: `return String(180 - 6 * (13 + (13 - 3)));`
- B (22): The student reads '3 fewer' as 3 more, so each small bag holds 16 beads; she seems to have 158 beads and need only 22. | computation: `return String(180 - (6 * 13 + 5 * (13 + 3)));`
- D (40): The student takes the 3 away only once from all five bags (5 x 13 - 3 = 62) instead of 3 from each bag, so she seems to have 140 and need 40. | computation: `return String(180 - (6 * 13 + (5 * 13 - 3)));`

---

## MM3-O07

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A theater has 31 rows with 21 seats in each row. For the afternoon show, 5 of the rows are closed, and every seat in the other rows can be used. For the evening show, every row is open, but 2 seats in each row are saved for the crew and cannot be used. How many more seats can be used for the evening show than for the afternoon show?

A. 93
B. 103
C. 63
D. 43

KEY: D (43)

Worked solution: Afternoon: 31 - 5 = 26 open rows, so 26 x 21 = 546 seats can be used. Evening: each row has 21 - 2 = 19 usable seats, so 31 x 19 = 589 seats can be used. The evening show has 589 - 546 = 43 more usable seats.

Key computation (JS): `return String(31 * (21 - 2) - (31 - 5) * 21);`

Distractors:
- A (93): For the afternoon the student closes 5 seats in every row instead of 5 whole rows: 31 x 16 = 496, and 589 - 496 = 93. | computation: `return String(31 * (21 - 2) - 31 * (21 - 5));`
- B (103): For the evening the student subtracts the 2 crew seats only once, not once in every row: 651 - 2 = 649, and 649 - 546 = 103. | computation: `return String((31 * 21 - 2) - (31 - 5) * 21);`
- C (63): For the evening the student takes away 2 whole rows instead of 2 seats in each row: 29 x 21 = 609, and 609 - 546 = 63. | computation: `return String((31 - 2) * 21 - (31 - 5) * 21);`

---

## MM3-G18

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Line AB and line CD cross at point E. Angle AEC measures (3x + 5) degrees, and angle BED measures (5x - 31) degrees. What is the measure of angle AED, in degrees?

A. 121
B. 136
C. 18
D. 31

KEY: A (121)

Worked solution: Angles AEC and BED are across from each other where the lines cross, so they are vertical angles and are equal: 3x + 5 = 5x - 31. Then 36 = 2x, so x = 18, and angle AEC = 3(18) + 5 = 59 degrees. Angle AED is next to angle AEC along line CD, so the two add to 180: angle AED = 180 - 59 = 121 degrees.

Key computation (JS): `var x = (5 + 31) / (5 - 3); return 180 - (3 * x + 5);`

Distractors:
- B (136): Moving the numbers, writes 31 - 5 = 26 instead of 31 + 5 = 36, so x = 13, angle AEC = 44, and angle AED = 136. | computation: `var x = (31 - 5) / (5 - 3); return 180 - (3 * x + 5);`
- C (18): Solves the equation for x = 18 and gives x as the angle's measure. | computation: `return (5 + 31) / (5 - 3);`
- D (31): Finds angle AEC = 59 correctly, then subtracts from 90 as if angles next to each other were complementary. | computation: `var x = (5 + 31) / (5 - 3); return 90 - (3 * x + 5);`

---

## MM3-N04

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Mia paid $12.40 for 4 notebooks and 1 pen. The pen cost $1.80, and the notebooks all cost the same amount. At that price, how much would 7 of these notebooks cost, in dollars?

A. 15.05
B. 18.55
C. 17.36
D. 9.10

KEY: B (18.55)

Worked solution: First take away the pen: 12.40 - 1.80 = 10.60 dollars for the 4 notebooks. One notebook costs 10.60 / 4 = 2.65 dollars. Then 7 notebooks cost 7 x 2.65 = 18.55 dollars.

Key computation (JS): `var c = Math.round((12.40-1.80)/4*100); return (7*c/100).toFixed(2);`

Distractors:
- A (15.05): In 10.60 / 4, 4 goes into 10 two times but the remainder 2 is not carried, so only 0.60 / 4 = 0.15 is added: 2.15 per notebook, and 7 x 2.15 = 15.05. | computation: `var c = 200 + Math.round(0.60/4*100); return (7*c/100).toFixed(2);`
- C (17.36): Treats the pen as a fifth notebook and shares the whole 12.40 among 5 items: 2.48 each, and 7 x 2.48 = 17.36. | computation: `var c = Math.round(12.40/5*100); return (7*c/100).toFixed(2);`
- D (9.10): Does the operations in the wrong order: divides 12.40 by 4 to get 3.10, takes away the whole 1.80 to get 1.30, then 7 x 1.30 = 9.10. | computation: `var c = Math.round((12.40/4 - 1.80)*100); return (7*c/100).toFixed(2);`

---

## MM3-O09

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A paint color is made by mixing blue paint and white paint in the ratio 2.5 liters of blue to 2 liters of white. Kai uses 7 liters of white paint. How many liters of blue paint does he need to make the same color?

A. 7.5
B. 5.6
C. 8.75
D. 8.5

KEY: C (8.75)

Worked solution: 7 liters of white paint is 7 / 2 = 3.5 groups of 2 liters. Each group needs 2.5 liters of blue, so Kai needs 3.5 x 2.5 = 8.75 liters of blue. (Or: 2.5 / 2 = 1.25 liters of blue for each liter of white, and 1.25 x 7 = 8.75.)

Key computation (JS): `return String(7 / 2 * 2.5);`

Distractors:
- A (7.5): The student reasons additively: the mix has 0.5 liter more blue than white, so 7 + 0.5 = 7.5. | computation: `return String(7 + (2.5 - 2));`
- B (5.6): The student flips the ratio, using 2 liters of blue for every 2.5 liters of white: 7 x 2 / 2.5 = 5.6. | computation: `return String(7 * 2 / 2.5);`
- D (8.5): The student counts 3 full groups of 2 liters (6 liters) and 1 liter left over: 3 x 2.5 = 7.5 for the groups, then adds just 1 liter of blue for the extra liter, 7.5 + 1 = 8.5. | computation: `return String(3 * 2.5 + 1);`

---

## MM3-G12

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A wooden block shaped like a rectangular prism is 12 centimeters long, 7 centimeters wide, and 5 centimeters tall. Ana cuts it into two blocks of the same size with one straight cut that is parallel to the faces that are 7 centimeters by 5 centimeters. What is the total surface area of the two new blocks, in square centimeters?

A. 478
B. 526
C. 358
D. 428

KEY: D (428)

Worked solution: The cut is parallel to the 7-by-5 faces, so it splits the 12-centimeter length: each new block is 6 by 7 by 5. One new block has surface area 2 x (6 x 7 + 6 x 5 + 7 x 5) = 2 x (42 + 30 + 35) = 214 square centimeters. The two blocks together have 2 x 214 = 428 square centimeters. (Check: the old block had 358 square centimeters, and the cut added two new 7-by-5 faces, 70 more.)

Key computation (JS): `return 2 * (2*(6*7 + 6*5 + 7*5));`

Distractors:
- A (478): Halves the 7-centimeter width instead of the length, so each half is 12 by 3.5 by 5 and the new faces are 12 by 5. | computation: `return 2 * (2*(12*3.5 + 12*5 + 3.5*5));`
- B (526): Halves the 5-centimeter height instead of the length, so each half is 12 by 7 by 2.5 and the new faces are 12 by 7. | computation: `return 2 * (2*(12*7 + 12*2.5 + 7*2.5));`
- C (358): Gives the old block's surface area, forgetting that the cut makes two new faces. | computation: `return 2*(12*7 + 12*5 + 7*5);`

---

## MM3-G10

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A triangle has a base of 16 centimeters and a height of 9 centimeters. A parallelogram has the same area as the triangle. The sides of the parallelogram are 15 centimeters and 10 centimeters long. What is the distance between the two 10-centimeter sides of the parallelogram, in centimeters?

A. 7.2
B. 4.5
C. 3.6
D. 4.8

KEY: A (7.2)

Worked solution: The triangle's area is 1/2 x 16 x 9 = 72 square centimeters, so the parallelogram's area is also 72. The distance between the two 10-centimeter sides is the height when a 10-centimeter side is the base: 72 = 10 x height, so the height is 72 / 10 = 7.2 centimeters.

Key computation (JS): `return (16*9/2) / 10;`

Distractors:
- B (4.5): Divides the area 72 by the triangle's base, 16, instead of by the parallelogram's 10-centimeter side. | computation: `return (16*9/2) / 16;`
- C (3.6): Finds the triangle's area, 72, then takes half of it a second time before dividing by 10 (halving once for the formula and again out of habit), so 36 / 10 = 3.6. | computation: `return (16*9/2) / 2 / 10;`
- D (4.8): Divides the area 72 by the 15-centimeter side, which gives the distance between the two 15-centimeter sides, not between the 10-centimeter sides. | computation: `return (16*9/2) / 15;`

---

## MM3-O11

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Lena simplified 3(6x + 5) + 8x as far as possible. Her answer had one term with x and one number term without x. When she subtracts the number term from the coefficient of x, what does she get?

A. 27
B. 11
C. 41
D. 21

KEY: B (11)

Worked solution: Distribute the 3 to both terms: 3(6x + 5) = 18x + 15. Then combine like terms: 18x + 15 + 8x = 26x + 15. So a = 26 and b = 15, and a - b = 26 - 15 = 11.

Key computation (JS): `const a = 3 * 6 + 8; const b = 3 * 5; return String(a - b);`

Distractors:
- A (27): The student adds 8x to 6x inside the parentheses before distributing, 3(14x + 5) = 42x + 15, so a - b = 42 - 15 = 27. | computation: `const a = 3 * (6 + 8); const b = 3 * 5; return String(a - b);`
- C (41): The student simplifies correctly to 26x + 15 but adds a and b instead of subtracting: 26 + 15 = 41. | computation: `const a = 3 * 6 + 8; const b = 3 * 5; return String(a + b);`
- D (21): The student multiplies only the first term by 3, writing 18x + 5 + 8x = 26x + 5, so a - b = 26 - 5 = 21. | computation: `const a = 3 * 6 + 8; const b = 5; return String(a - b);`

---

## MM3-N20

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A small submarine is at an elevation of -17.4 meters. It rises 2/3 of the way to the surface of the water (elevation 0). Then it dives 4.8 meters. What is its elevation now, in meters?

A. -7.4
B. -16.4
C. -10.6
D. -33.8

KEY: C (-10.6)

Worked solution: The way to the surface is 17.4 meters. Two thirds of that is 17.4 / 3 x 2 = 11.6 meters, so the submarine rises 11.6 meters to -17.4 + 11.6 = -5.8 meters. Then it dives 4.8 meters: -5.8 + (-4.8) = -10.6 meters.

Key computation (JS): `var up=17.4/3*2; return String(Math.round((-17.4 + up - 4.8)*10)/10);`

Distractors:
- A (-7.4): Does the moves in the wrong order: dives first to -22.2, then rises 2/3 of the way to the surface from there, ending at -22.2 / 3. | computation: `var pos=-17.4-4.8; return String(Math.round((pos/3)*10)/10);`
- B (-16.4): Puts the submarine at 2/3 of its depth, -11.6 meters, instead of 2/3 of the way up (which leaves 1/3 of the depth), then dives 4.8. | computation: `var pos=-17.4/3*2; return String(Math.round((pos - 4.8)*10)/10);`
- D (-33.8): Finds the 11.6 meters correctly but moves the submarine 11.6 meters down instead of up, then dives 4.8: -17.4 - 11.6 - 4.8. | computation: `var up=17.4/3*2; return String(Math.round((-17.4 - up - 4.8)*10)/10);`

---

## MM3-N07

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A walking path around a park is 6/7 mile long. It is marked off into 5 sections of equal length. Mia starts at the beginning of the path, walks around it, and stops when she has walked 9 sections. How many miles has she walked?

A. 1 23/35
B. 1 24/35
C. 1 1/5
D. 1 19/35

KEY: D (1 19/35)

Worked solution: One section is 1/5 of 6/7 mile: 1/5 x 6/7 = 6/35 mile. So 9 sections are 9 x 6/35 = 54/35 miles. Since 35 x 1 = 35, 54/35 = 1 19/35 miles.

Key computation (JS): `var n=9*6, d=35; return Math.floor(n/d)+' '+(n%d)+'/'+d;`

Distractors:
- A (1 23/35): Gets the full lap right (6/7 mile) but treats each of the 4 extra sections as 1/5 of a mile instead of 1/5 of the path: 6/7 + 4/5 = 1 23/35. | computation: `var n = 6*5 + 4*7, d = 35; return Math.floor(n/d)+' '+(n%d)+'/'+d;`
- B (1 24/35): Finds a section correctly (6/35 mile) and the 4 extra sections (24/35), but counts the full lap as 1 mile instead of 6/7 mile: 1 + 24/35. | computation: `var n = 4*6, d = 35; return '1 '+n+'/'+d;`
- C (1 1/5): Divides 9 sections by 5 to get 1 remainder 4, writes it as 1.4 laps instead of 1 4/5 laps, then 1.4 x 6/7 = 1.2 = 1 1/5. | computation: `var n = 14*6, d = 10*7; var g=function(a,b){return b?g(b,a%b):a}; var k=g(n,d); n/=k; d/=k; return Math.floor(n/d)+' '+(n%d)+'/'+d;`

---

## MM3-O27

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Barrel A is being drained at a constant rate. It holds 340 liters of water 2 minutes after draining starts and 250 liters 5 minutes after draining starts. Barrel B is being filled, and the number of liters in it t minutes after the start is V = 180 + 25t. How many liters of water are in the two barrels in all 8 minutes after the start?

A. 540
B. 480
C. 450
D. 390

KEY: A (540)

Worked solution: Barrel A loses 340 - 250 = 90 liters in 5 - 2 = 3 minutes, so it drains 30 liters per minute. At the start it held 340 + 2 x 30 = 400 liters, so A = 400 - 30t. At t = 8, A holds 400 - 240 = 160 liters. Barrel B holds 180 + 25 x 8 = 380 liters. In all: 160 + 380 = 540 liters.

Key computation (JS): `const r = (340 - 250) / (5 - 2); const a0 = 340 + 2 * r; return String((a0 - r * 8) + (180 + 25 * 8));`

Distractors:
- B (480): The student finds the rate correctly but treats the 2-minute reading, 340, as the starting amount: 340 - 240 = 100, so the total is 100 + 380 = 480. | computation: `const r = (340 - 250) / (5 - 2); return String((340 - r * 8) + (180 + 25 * 8));`
- C (450): The student divides the 90-liter drop by the first time, 2 minutes, instead of the 3 minutes between readings, so A drains 45 per minute, starts at 430 and holds 70 at 8 minutes: 70 + 380 = 450. | computation: `const r = (340 - 250) / 2; const a0 = 340 + 2 * r; return String((a0 - r * 8) + (180 + 25 * 8));`
- D (390): The student finds the rate, 30 liters per minute, but treats the 5-minute reading, 250, as the starting amount and subtracts 8 minutes of draining: 250 - 240 = 10, so the total is 10 + 380 = 390. | computation: `const r = (340 - 250) / (5 - 2); return String((250 - r * 8) + (180 + 25 * 8));`
