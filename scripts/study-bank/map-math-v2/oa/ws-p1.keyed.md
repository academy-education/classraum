# Items for review, KEYED (18)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MV2-O78-07

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Lena has $50 to spend at a fair. She pays $14.75 to get in, and each ride costs $2.50. What is the greatest number of rides she can go on?

A. 14
B. 20
C. 15
D. 11

KEY: A (14)

Worked solution: After paying to get in, Lena has 50 - 14.75 = 35.25 dollars. Each ride costs 2.50, and 35.25 / 2.50 = 14.1. She cannot go on part of a ride, so the greatest number is 14 rides (14 x 2.50 = 35, and 15 rides would cost 37.50).

Key computation (JS): `return Math.floor((50 - 14.75) / 2.5)`

Distractors:
- B (20): The student divides the whole $50 by 2.50. | computation: `return Math.floor(50 / 2.5)`
- C (15): The student finds 14.1 and rounds up, though the 15th ride costs more than she has left. | computation: `return Math.ceil((50 - 14.75) / 2.5)`
- D (11): The student estimates with $15 to get in and $3 a ride: 35 / 3 = 11.7, so 11. | computation: `return Math.floor((50 - 15) / 3)`

---

## MV2-O56-19

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A school store sells 10 pens for $3.50 and 6 glue sticks for $2.70. Ella buys 4 pens and 4 glue sticks at these unit prices. How many dollars does she spend?

A. 2.48
B. 3.20
C. 3.60
D. 4.10

KEY: B (3.20)

Worked solution: One pen costs 3.50 / 10 = 0.35 dollars and one glue stick costs 2.70 / 6 = 0.45 dollars. Ella spends 4 x 0.35 + 4 x 0.45 = 1.40 + 1.80 = 3.20 dollars.

Key computation (JS): `return Math.round((4 * 3.50 / 10 + 4 * 2.70 / 6) * 100) / 100`

Distractors:
- A (2.48): Uses 0.35 for a pen and 2.70 / 10 = 0.27 for a glue stick: 1.40 + 1.08 = 2.48. | computation: `return Math.round((4 * 3.50 / 10 + 4 * 2.70 / 10) * 100) / 100`
- C (3.60): Uses the glue-stick price, 0.45, for all 8 items: 3.60. | computation: `return Math.round((8 * 2.70 / 6) * 100) / 100`
- D (4.10): Pays 1.40 for the pens and the full 2.70 for the glue sticks: 4.10. | computation: `return Math.round((4 * 3.50 / 10 + 2.70) * 100) / 100`

---

## MV2-O78-12

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two lines are graphed: y = -2x + 24 and y = mx - 20. They meet at a point that is 16 units above the x-axis. Find m.

A. 4
B. 1.8
C. 9
D. 2.25

KEY: C (9)

Worked solution: At the crossing point y = 16. On the first line, 16 = -2x + 24, so -2x = -8 and x = 4. The point (4, 16) is also on the second line: 16 = 4m - 20, so 4m = 36 and m = 9.

Key computation (JS): `const x = (24 - 16) / 2; return (16 + 20) / x`

Distractors:
- A (4): The student finds x = 4 and writes 16 = 4m. | computation: `return 16 / ((24 - 16) / 2)`
- B (1.8): The student adds 16 instead of subtracting it and gets x = 20. | computation: `return (16 + 20) / ((24 + 16) / 2)`
- D (2.25): The student substitutes x = 16 into 16 = 16m - 20. | computation: `return (16 + 20) / 16`

---

## MV2-O56-21

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Jae substitutes a = 4 and b = 5 into the expression 3a^2 - 2b. Remember that 3a^2 means 3 times a^2. What number does Jae get?

A. 134
B. 14
C. 6
D. 38

KEY: D (38)

Worked solution: a^2 = 4^2 = 16, so 3a^2 = 3 x 16 = 48. 2b = 2 x 5 = 10. So 3a^2 - 2b = 48 - 10 = 38.

Key computation (JS): `const a = 4, b = 5; return 3 * a ** 2 - 2 * b`

Distractors:
- A (134): Works (3 x 4)^2 = 144, then 144 - 10 = 134. | computation: `const a = 4, b = 5; return (3 * a) ** 2 - 2 * b`
- B (14): Writes a^2 as 2 x 4 = 8, so 3 x 8 - 10 = 14. | computation: `const a = 4, b = 5; return 3 * (2 * a) - 2 * b`
- C (6): Uses a^2 - 2b = 16 - 10 = 6. | computation: `const a = 4, b = 5; return a ** 2 - 2 * b`

---

## MV2-O56-10

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Leo's homework has one problem: find 94 - [72 / (4 + 2) x 3 + 4]. He must use the correct order for the brackets, parentheses and operations. What is the correct answer?

A. 54
B. 63
C. 66
D. 86

KEY: A (54)

Worked solution: Parentheses first: 4 + 2 = 6. Inside the brackets, work left to right: 72 / 6 = 12, then 12 x 3 = 36, then 36 + 4 = 40. Last, 94 - 40 = 54.

Key computation (JS): `return 94 - (72 / (4 + 2) * 3 + 4)`

Distractors:
- B (63): Works 4 x 2 = 8, so 72 / 8 = 9, 9 x 3 + 4 = 31 and 94 - 31 = 63. | computation: `return 94 - (72 / (4 * 2) * 3 + 4)`
- C (66): Works 72 / 4 + 2 x 3 + 4 = 18 + 6 + 4 = 28, then 94 - 28 = 66. | computation: `return 94 - (72 / 4 + 2 * 3 + 4)`
- D (86): Works 6 x 3 = 18 first, so 72 / 18 = 4, 4 + 4 = 8 and 94 - 8 = 86. | computation: `return 94 - (72 / ((4 + 2) * 3) + 4)`

---

## MV2-O56-05

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Omar makes two lists of numbers. List A begins with 21, and he adds 4 to get each new number. List B begins with 5, and he adds 8 to get each new number. He writes the lists side by side, so the 1st numbers are together, the 2nd numbers are together, and so on. Which number in List B is beside the number 61 in List A?

A. 122
B. 85
C. 69
D. 45

KEY: B (85)

Worked solution: From 21 to 61 is 40, and 40 / 4 = 10, so 4 was added 10 times to reach 61. List B adds 8 the same 10 times: 5 + 10 x 8 = 5 + 80 = 85.

Key computation (JS): `const jumps = (61 - 21) / 4; return 5 + 8 * jumps`

Distractors:
- A (122): Notes that 8 is twice 4 and doubles 61: 122. | computation: `return 2 * 61`
- C (69): Takes the 61 from List A and adds one 8: 69. | computation: `return 61 + 8`
- D (45): Sees that 21 and 5 differ by 16 and subtracts 16 from 61: 45. | computation: `return 61 - (21 - 5)`

---

## MV2-O56-04

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Lina has 6 bags with 39 marbles in each bag. She keeps 18 marbles for a game. She shares the rest of the marbles equally among herself and 8 friends. After the sharing, how many marbles does Lina have in all, counting her share and the marbles she kept?

A. 45
B. 46
C. 42
D. 54

KEY: C (42)

Worked solution: Lina has 6 x 39 = 234 marbles. After keeping 18, she shares 234 - 18 = 216 marbles among 9 people (herself and 8 friends). Each person gets 216 / 9 = 24. Lina has her share plus the 18 she kept: 24 + 18 = 42.

Key computation (JS): `return (6 * 39 - 18) / 9 + 18`

Distractors:
- A (45): Shares 216 among 8 people (27 each) and adds 18: 45. | computation: `return (6 * 39 - 18) / 8 + 18`
- B (46): Shares 234 + 18 = 252 among 9 (28 each) and adds 18: 46. | computation: `return (6 * 39 + 18) / 9 + 18`
- D (54): Divides 216 by the 6 bags (36) and adds 18: 54. | computation: `return (6 * 39 - 18) / 6 + 18`

---

## MV2-O78-05

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Mia estimated that a rock had a mass of 102 grams. Her estimate was more than the actual mass, and the percent error of her estimate was 20%. What is the actual mass of the rock, in grams?

A. 81.6
B. 82
C. 122.4
D. 85

KEY: D (85)

Worked solution: Percent error compares the error with the actual mass. The estimate was 20% more than the actual mass, so 102 is 120% of the actual mass: actual = 102 / 1.2 = 85 grams. Check: the error is 102 - 85 = 17, and 17 / 85 = 0.20.

Key computation (JS): `return 102 / 1.2`

Distractors:
- A (81.6): The student subtracts 20% of 102 from 102. | computation: `return Math.round(102 * 0.8 * 10) / 10`
- B (82): The student subtracts 20 from 102. | computation: `return 102 - 20`
- C (122.4): The student increases 102 by 20% even though the estimate was too high. | computation: `return Math.round(102 * 1.2 * 10) / 10`

---

## MV2-O78-10

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A triangle has two sides of equal length. The third side is 4.5 centimeters shorter than each of the equal sides. The perimeter of the triangle is 32.4 centimeters. How long is each of the equal sides, in centimeters?

A. 12.3
B. 13.95
C. 11.7
D. 11.3

KEY: A (12.3)

Worked solution: Let s be the length of each equal side. The third side is s - 4.5. The perimeter is s + s + (s - 4.5) = 3s - 4.5 = 32.4, so 3s = 36.9 and s = 12.3 centimeters. (The sides are 12.3, 12.3 and 7.8.)

Key computation (JS): `return Math.round((32.4 + 4.5) / 3 * 100) / 100`

Distractors:
- B (13.95): The student writes s + s + 4.5 = 32.4. | computation: `return Math.round((32.4 - 4.5) / 2 * 100) / 100`
- C (11.7): The student divides 32.4 by 2 and subtracts 4.5. | computation: `return Math.round((32.4 / 2 - 4.5) * 100) / 100`
- D (11.3): The student adds 4.5/3 = 1.5 to the perimeter and divides 33.9 by 3. | computation: `return Math.round((32.4 + 4.5 / 3) / 3 * 100) / 100`

---

## MV2-O78-15

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The point (x, y) is on both of these lines: y = 3x - 2 and 2x + y = 23. What is y at that point?

A. 5
B. 13
C. 10.6
D. 17

KEY: B (13)

Worked solution: Put 3x - 2 in place of y in the second equation: 2x + 3x - 2 = 23, so 5x = 25 and x = 5. Then y = 3(5) - 2 = 13. Check: 2(5) + 13 = 23.

Key computation (JS): `const x = (23 + 2) / 5; return 3 * x - 2`

Distractors:
- A (5): The student solves 5x = 25 and stops at x = 5. | computation: `return (23 + 2) / 5`
- C (10.6): From 5x - 2 = 23 the student writes 5x = 21. | computation: `const x = (23 - 2) / 5; return Math.round((3 * x - 2) * 10) / 10`
- D (17): The student evaluates 3(5) + 2. | computation: `const x = (23 + 2) / 5; return 3 * x + 2`

---

## MV2-O56-20

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Store A sells rice in 2-pound bags for $2.20 each. Store B sells rice in 4-pound bags for $4.00 each. Mia needs exactly 12 pounds of rice. How many dollars does she save by buying all of it at Store B instead of Store A?

A. 5.40
B. 2.20
C. 1.20
D. 1.80

KEY: C (1.20)

Worked solution: At Store A, 12 pounds is 6 bags: 6 x 2.20 = 13.20 dollars. At Store B, 12 pounds is 3 bags: 3 x 4.00 = 12.00 dollars. She saves 13.20 - 12.00 = 1.20 dollars. (Per pound: 1.10 at A and 1.00 at B, so 0.10 x 12 = 1.20.)

Key computation (JS): `return Math.round((12 / 2 * 2.20 - 12 / 4 * 4.00) * 100) / 100`

Distractors:
- A (5.40): Takes 1.80 per bag and multiplies by 3 bags: 5.40. | computation: `return Math.round((12 / 4 * (4.00 - 2.20)) * 100) / 100`
- B (2.20): Sees that Store B needs fewer bags and counts the saving as one Store A bag: 2.20. | computation: `const bagA = 2.20; return bagA`
- D (1.80): Subtracts the bag prices: 4.00 - 2.20 = 1.80. | computation: `return Math.round((4.00 - 2.20) * 100) / 100`

---

## MV2-O78-19

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Line f goes through (-6, 21) and (1, 7). Line g crosses the y-axis where line f does, and g drops 1.25 units for every 1 unit it moves to the right. Where does line g cross the x-axis? Give the x-coordinate.

A. 11.25
B. 4.5
C. 16.8
D. 7.2

KEY: D (7.2)

Worked solution: The slope of f is (7 - 21)/(1 - (-6)) = -14/7 = -2. Using (1, 7): 7 = -2(1) + b, so b = 9. So g(x) = 9 - 1.25x. Set 9 - 1.25x = 0: 1.25x = 9, so x = 7.2.

Key computation (JS): `const m = (7 - 21) / 7; const b = 7 - m * 1; return b / 1.25`

Distractors:
- A (11.25): The student computes 9 x 1.25. | computation: `return 9 * 1.25`
- B (4.5): The student finds where f, with slope -2, crosses zero: 9/2. | computation: `return 9 / 2`
- C (16.8): The student takes 21 as g's starting value. | computation: `return 21 / 1.25`

---

## MV2-O78-13

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On the line 3x + 5y = 55, as x increases from 7 to 37, by how much does y decrease?

A. 18
B. 50
C. 29
D. 22.2

KEY: A (18)

Worked solution: Solve for y: 5y = 55 - 3x, so y = 11 - (3/5)x. The slope is -3/5, so y goes down 3/5 for each 1 that x goes up. From x = 7 to x = 37, x increases by 30, so y decreases by (3/5)(30) = 18. (Check: y = 6.8 at x = 7 and y = -11.2 at x = 37.)

Key computation (JS): `return 3 / 5 * (37 - 7)`

Distractors:
- B (50): The student divides the coefficients the wrong way round. | computation: `return 5 / 3 * (37 - 7)`
- C (29): The student finds 18 and then adds the intercept 11. | computation: `return 3 / 5 * (37 - 7) + 55 / 5`
- D (22.2): The student multiplies 3/5 by 37, leaving out the starting 7. | computation: `return Math.round(3 / 5 * 37 * 10) / 10`

---

## MV2-O78-16

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The pair (x, y) makes both x + 4y = 7 and 5x - 4y = 59 true. Find x + y for this pair.

A. 15.5
B. 10
C. 11.5
D. 11

KEY: B (10)

Worked solution: Add the equations: the y-terms cancel, so 6x = 66 and x = 11. Then 11 + 4y = 7, so 4y = -4 and y = -1. So x + y = 11 + (-1) = 10.

Key computation (JS): `const x = (7 + 59) / 6; const y = (7 - x) / 4; return x + y`

Distractors:
- A (15.5): The student finds x = 11 and then gets y = 4.5. | computation: `const x = (7 + 59) / 6; return x + (7 + x) / 4`
- C (11.5): The student writes -4x = -52, x = 13, then y = -1.5. | computation: `const x = (7 - 59) / (1 - 5); return x + (7 - x) / 4`
- D (11): The student gives x = 11 as the answer. | computation: `return (7 + 59) / 6`

---

## MV2-O56-01

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: In a math card game, each card shows an expression, and a player scores the value of the expression on the card. Tia draws the card 144 / (4 + 5) - 3. How many points does Tia score?

A. 15
B. 38
C. 13
D. 24

KEY: C (13)

Worked solution: Work inside the parentheses first: 4 + 5 = 9. Then divide: 144 / 9 = 16. Last, subtract: 16 - 3 = 13.

Key computation (JS): `return 144 / (4 + 5) - 3`

Distractors:
- A (15): Adds 4 + 5 as 8, so 144 / 8 = 18 and 18 - 3 = 15. | computation: `return 144 / (4 + 4) - 3`
- B (38): Divides 144 by 4 first, then adds 5 and subtracts 3: 36 + 5 - 3 = 38. | computation: `return 144 / 4 + 5 - 3`
- D (24): Reads the divisor as (4 + 5 - 3) = 6, so 144 / 6 = 24. | computation: `return 144 / (4 + 5 - 3)`

---

## MV2-O56-02

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Wen writes two number patterns. Each pattern keeps going in the same way.
Pattern A: 68, 65, 62, 59, ...
Pattern B: 8, 15, 22, 29, ...
At one position (the same term number in both lists), Pattern A and Pattern B have the same number. What is that number?

A. 57
B. 47
C. 38
D. 50

KEY: D (50)

Worked solution: Pattern A goes down by 3 each time and Pattern B goes up by 7. Keep both lists going: A is 68, 65, 62, 59, 56, 53, 50 and B is 8, 15, 22, 29, 36, 43, 50. In the 7th position both patterns show 50.

Key computation (JS): `let a = 68, b = 8; while (a !== b) { a -= 3; b += 7 } return a`

Distractors:
- A (57): Looks for where B becomes larger than A and gives B's 8th number, 57. | computation: `let a = 68, b = 8; while (a !== b) { a -= 3; b += 7 } return b + 7`
- B (47): Keeps going one step past the match and reports Pattern A's 8th number, 47. | computation: `let a = 68, b = 8; while (a !== b) { a -= 3; b += 7 } return a - 3`
- C (38): Averages 68 and 8 to get 38, as if both patterns changed by the same amount each step. | computation: `return (68 + 8) / 2`

---

## MV2-O78-17

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: What value of x makes the equation 8(x - 9) = 2x + 24 true?

A. 16
B. 36
C. 9.6
D. 5.5

KEY: A (16)

Worked solution: Distribute: 8x - 72 = 2x + 24. Subtract 2x from both sides: 6x - 72 = 24. Add 72: 6x = 96. Divide by 6: x = 16.

Key computation (JS): `return (24 + 72) / 6`

Distractors:
- B (36): The student writes x = 24 + 72/6. | computation: `return 24 + 72 / 6`
- C (9.6): The student writes 8x + 2x = 96. | computation: `return (24 + 72) / (8 + 2)`
- D (5.5): The student writes 8x - 9 = 2x + 24. | computation: `return (24 + 9) / 6`

---

## MV2-O78-14

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Find the number x for which (x + 7)/3 and (2x - 8)/4 are equal.

A. 7.5
B. 26
C. 2
D. 10.6

KEY: B (26)

Worked solution: Multiply both sides by 12: 4(x + 7) = 3(2x - 8), so 4x + 28 = 6x - 24. Subtract 4x and add 24: 52 = 2x, so x = 26. Check: (26 + 7)/3 = 11 and (52 - 8)/4 = 11.

Key computation (JS): `return (4 * 7 + 3 * 8) / (3 * 2 - 4)`

Distractors:
- A (7.5): The student writes 4x + 7 = 6x - 8 and gets 2x = 15. | computation: `return (7 + 8) / (3 * 2 - 4)`
- C (2): From 4x + 28 = 6x - 24 the student writes 2x = 28 - 24. | computation: `return (4 * 7 - 3 * 8) / (3 * 2 - 4)`
- D (10.6): The student writes 3(x + 7) = 4(2x - 8) and gets 5x = 53. | computation: `return (3 * 7 + 4 * 8) / (4 * 2 - 3)`
