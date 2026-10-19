# Items for review, KEYED (37)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM3-G03

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A town map is drawn on a coordinate grid, and each unit on the grid is one block. Maya's home is at (2, 3), Joe's home is at (11, 13), and the school is at (11, 34). Maya walks along grid lines from her home straight right to the point below the school, then straight up to the school. Joe walks straight up from his home to the school. How many more blocks does Maya walk than Joe?

A. 19
B. 29
C. 27
D. 40

KEY: A (19)

Worked solution: Maya walks right from x = 2 to x = 11, which is 11 - 2 = 9 blocks, then up from y = 3 to y = 34, which is 34 - 3 = 31 blocks. She walks 9 + 31 = 40 blocks. Joe walks up from y = 13 to y = 34, which is 34 - 13 = 21 blocks. Maya walks 40 - 21 = 19 more blocks than Joe.

Key computation (JS): `return ((11 - 2) + (34 - 3)) - (34 - 13);`

Distractors:
- B (29): Finds each of Maya's legs by adding the two coordinates (2 + 11 and 3 + 34) instead of subtracting them. | computation: `return ((2 + 11) + (3 + 34)) - (34 - 13);`
- C (27): Reads Joe's y-coordinate 13 as the number of blocks he walks, instead of 34 - 13. | computation: `return ((11 - 2) + (34 - 3)) - 13;`
- D (40): Finds how far Maya walks and stops, without comparing with Joe's walk. | computation: `return (11 - 2) + (34 - 3);`

---

## MM3-O17

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Jo has $120. She buys 3 shirts. Each shirt has a regular price of $18.50, and every shirt is on sale for 20% off. How many dollars does Jo have left after she pays for the 3 shirts?

A. 66.9
B. 75.6
C. 53.4
D. 68.2

KEY: B (75.6)

Worked solution: 20% of $18.50 is 0.20 x 18.50 = $3.70, so each shirt costs 18.50 - 3.70 = $14.80 (that is, 80% of $18.50). Three shirts cost 3 x 14.80 = $44.40. Jo has 120 - 44.40 = $75.60 left.

Key computation (JS): `return String(Math.round((120 - 3 * 18.5 * 0.8) * 100) / 100);`

Distractors:
- A (66.9): The student knows Jo pays 80% but subtracts 80 cents from each price (18.50 - 0.80 = 17.70), so the shirts cost 53.10 and 120 - 53.10 = 66.90. | computation: `return String(Math.round((120 - 3 * (18.5 - 0.8)) * 100) / 100);`
- C (53.4): The student adds 20% to the price instead of taking it off (1.2 x 18.50 = 22.20 per shirt), so the shirts cost 66.60 and 120 - 66.60 = 53.40. | computation: `return String(Math.round((120 - 3 * 18.5 * 1.2) * 100) / 100);`
- D (68.2): The student takes the $3.70 discount off only once, from the 3-shirt total 55.50, so the shirts cost 51.80 and 120 - 51.80 = 68.20. | computation: `return String(Math.round((120 - (3 * 18.5 - 0.2 * 18.5)) * 100) / 100);`

---

## MM3-N08

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Pencils cost $0.45 each and erasers cost $0.80 each. Ana buys 7 pencils and 5 erasers. How much more money does she spend on the erasers than on the pencils, in dollars?

A. 1.15
B. 3.35
C. 0.85
D. 0.95

KEY: C (0.85)

Worked solution: The pencils cost 7 x 0.45 = 3.15 dollars. The erasers cost 5 x 0.80 = 4.00 dollars. The difference is 4.00 - 3.15 = 0.85 dollars, so she spends $0.85 more on the erasers.

Key computation (JS): `return (5*0.80 - 7*0.45).toFixed(2);`

Distractors:
- A (1.15): In 7 x 0.45 writes 5 for 7 x 5 = 35 but forgets to add the carried 3 to 7 x 4 = 28, so the pencils come to 2.85 instead of 3.15; then 4.00 - 2.85 = 1.15. | computation: `var u=(5*7)%10, t=4*7; var pencils=(u+10*t)/100; return (5*0.80 - pencils).toFixed(2);`
- B (3.35): Swaps the counts, multiplying the eraser price by 7 and the pencil price by 5: 5.60 - 2.25 = 3.35. | computation: `return (7*0.80 - 5*0.45).toFixed(2);`
- D (0.95): Subtracts 4.00 - 3.15 by borrowing across the zeros wrongly, turning each 0 into 10 (3.10 10) instead of 3.9 10, so gets 10 - 5 = 5, 10 - 1 = 9 and 3 - 3 = 0: 0.95. | computation: `var e=Math.round(5*0.80*100), p=Math.round(7*0.45*100); var h=(10-p%10)%10, t=(10-Math.floor(p/10)%10)%10, o=(Math.floor(e/100)-1)-Math.floor(p/100); return (o + t/10 + h/100).toFixed(2);`

---

## MM3-O12

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Garden A has 60 tulips. The ratio of red tulips to yellow tulips in Garden A is 3 to 7. Garden B has 40 tulips, and its ratio of red tulips to yellow tulips is 1 to 3. How many more yellow tulips does Garden A have than Garden B?

A. 14
B. 20
C. 32
D. 12

KEY: D (12)

Worked solution: Garden A: 3 + 7 = 10 parts, so each part is 60 / 10 = 6 tulips and there are 7 x 6 = 42 yellow tulips. Garden B: 1 + 3 = 4 parts, so each part is 40 / 4 = 10 tulips and there are 3 x 10 = 30 yellow tulips. Garden A has 42 - 30 = 12 more yellow tulips.

Key computation (JS): `return String(60 * 7 / (3 + 7) - 40 * 3 / (1 + 3));`

Distractors:
- A (14): The student finds 42 yellow tulips in Garden A, then uses Garden A's fraction 7/10 for Garden B too: 7/10 of 40 = 28, and 42 - 28 = 14. | computation: `return String(60 * 7 / (3 + 7) - 40 * 7 / (3 + 7));`
- B (20): The student compares the garden totals instead of the yellow tulips: 60 - 40 = 20. | computation: `return String(60 - 40);`
- C (32): The student finds 42 yellow tulips in Garden A but subtracts Garden B's 10 red tulips instead of its yellow ones: 42 - 10 = 32. | computation: `return String(60 * 7 / (3 + 7) - 40 * 1 / (1 + 3));`

---

## MM3-N14

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two ferries leave a dock at the same moment. After that, Ferry A leaves again once in 15 minutes, and Ferry B leaves again once in 25 minutes. Not counting the first moment, how many more times do the two ferries leave at the same time during the next 300 minutes, counting a departure at the end of the 300 minutes?

A. 4
B. 20
C. 7
D. 6

KEY: A (4)

Worked solution: The ferries leave together when the time since the first moment is a common multiple of 15 and 25 minutes. The least common multiple of 15 and 25 is 75, so they leave together 75, 150, 225 and 300 minutes after the first moment. 300 / 75 = 4, so they leave together 4 more times.

Key computation (JS): `var g=function(a,b){return b?g(b,a%b):a}; var l=15*25/g(15,25); return String(Math.floor(300/l));`

Distractors:
- B (20): Counts only Ferry A's departures in the 300 minutes, 300 / 15 = 20, instead of the shared ones. | computation: `return String(300/15);`
- C (7): Adds the intervals, 15 + 25 = 40 minutes, as the time between shared departures and counts 300 / 40 = 7.5, so 7 times. | computation: `return String(Math.floor(300/(15+25)));`
- D (6): Skip-counts Ferry A's times as 15, 30, 50 (a slip for 45), sees 50 in Ferry B's list too, and uses 50 minutes as the time between shared departures: 300 / 50 = 6. | computation: `var aList=[15,30,50]; var gap=aList.filter(function(t){return t%25===0;})[0]; return String(Math.floor(300/gap));`

---

## MM3-N17

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Over five days, the price of one share of a stock changed by -$0.85, +$1.20, -$2.45, +$0.60 and -$1.10. Ali owns 12 shares of this stock. What was the total change in the value of Ali's 12 shares over the five days, in dollars?

A. -4.80
B. -31.20
C. -52.80
D. -45.60

KEY: B (-31.20)

Worked solution: Add the changes for one share: the falls are -0.85 + (-2.45) + (-1.10) = -4.40 and the rises are 1.20 + 0.60 = 1.80, so one share changed by -4.40 + 1.80 = -2.60 dollars. For 12 shares the change is 12 x (-2.60) = -31.20 dollars.

Key computation (JS): `var s=-0.85+1.20-2.45+0.60-1.10; return (s*12).toFixed(2);`

Distractors:
- A (-4.80): Reads the last change, -1.10, as a rise of 1.10, so one share changes by only -0.40, then multiplies by 12. | computation: `var s=-0.85+1.20-2.45+0.60+1.10; return (s*12).toFixed(2);`
- C (-52.80): Adds only the three falls (-4.40) and leaves out the two rises, then multiplies by 12. | computation: `var s=-0.85-2.45-1.10; return (s*12).toFixed(2);`
- D (-45.60): Reads the +0.60 rise as a fall, so one share changes by -3.80, then multiplies by 12. | computation: `var s=-0.85+1.20-2.45-0.60-1.10; return (s*12).toFixed(2);`

---

## MM3-O18

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A farm stand sold 160 pounds of apples on Saturday. On Sunday it sold 20% more pounds of apples than on Saturday. On Monday it sold 25% fewer pounds of apples than on Sunday. How many pounds of apples did the farm stand sell on the three days in all?

A. 472
B. 400
C. 496
D. 475

KEY: C (496)

Worked solution: Sunday: 20% of 160 is 32, so Sunday's sales were 160 + 32 = 192 pounds. Monday: 25% of 192 is 48, so Monday's sales were 192 - 48 = 144 pounds. Total: 160 + 192 + 144 = 496 pounds.

Key computation (JS): `const sun = 160 * 1.2; const mon = sun * 0.75; return String(Math.round(160 + sun + mon));`

Distractors:
- A (472): The student takes Monday's 25% off Saturday's 160 instead of Sunday's 192, so Monday is 120 and the total is 160 + 192 + 120 = 472. | computation: `const sun = 160 * 1.2; const mon = 160 * 0.75; return String(Math.round(160 + sun + mon));`
- B (400): The student reads '25% fewer than Sunday' as '25% of Sunday' and uses 48 for Monday: 160 + 192 + 48 = 400. | computation: `const sun = 160 * 1.2; const mon = sun * 0.25; return String(Math.round(160 + sun + mon));`
- D (475): The student adds the 20 as pounds instead of 20%, so Sunday is 180; then Monday is 25% fewer, 135, and the total is 160 + 180 + 135 = 475. | computation: `const sun = 160 + 20; const mon = sun * 0.75; return String(Math.round(160 + sun + mon));`

---

## MM3-O01

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: On a quiz, Jada must simplify 90 / (2 + 4) x 3, following the order of operations. What number should she get?

A. 57
B. 5
C. 147
D. 45

KEY: D (45)

Worked solution: First work inside the parentheses: 2 + 4 = 6. The expression becomes 90 / 6 x 3. Division and multiplication are done in order from left to right: 90 / 6 = 15, then 15 x 3 = 45.

Key computation (JS): `return String(90 / (2 + 4) * 3);`

Distractors:
- A (57): The student ignores the parentheses and uses the usual order: 90 / 2 = 45 and 4 x 3 = 12, then 45 + 12 = 57. | computation: `return String(90 / 2 + 4 * 3);`
- B (5): The student multiplies 6 x 3 = 18 first because multiplication 'comes before' division, then finds 90 / 18 = 5. | computation: `return String(90 / ((2 + 4) * 3));`
- C (147): The student ignores the parentheses and simply works from left to right: 90 / 2 = 45, 45 + 4 = 49, 49 x 3 = 147. | computation: `return String((90 / 2 + 4) * 3);`

---

## MM3-G16

Area: Geometry | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Points A, O and D lie on a straight line, with O between A and D. Rays OB and OC are drawn on the same side of the line, and ray OB is closer to ray OA. Angle AOB measures 44 degrees, and angles BOC and COD have the same measure. What is the measure of angle AOC, in degrees?

A. 112
B. 88
C. 67
D. 134

KEY: A (112)

Worked solution: Angles AOB, BOC and COD together make the straight angle AOD, which is 180 degrees. So angles BOC and COD together are 180 - 44 = 136 degrees, and each one is 136 / 2 = 68 degrees. Angle AOC is angle AOB plus angle BOC: 44 + 68 = 112 degrees.

Key computation (JS): `return 44 + (180 - 44) / 2;`

Distractors:
- B (88): Takes angle BOC to be equal to angle AOB instead of angle COD, so adds 44 + 44. | computation: `return 44 + 44;`
- C (67): Uses 90 degrees instead of 180 for the angle the three angles fill, so each equal angle is (90 - 44) / 2 = 23 and angle AOC is 67. | computation: `return 44 + (90 - 44) / 2;`
- D (134): Splits the whole straight angle in half (90) without first taking away angle AOB, then adds 44. | computation: `return 44 + 180 / 2;`

---

## MM3-N22

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A grain of sand is about 5 x 10^-4 meter wide. A speck of dust is about 2 x 10^-6 meter wide. How many specks of dust, lined up side by side, would make a row as long as the grain of sand is wide?

A. 300
B. 250
C. 700
D. 25000000000

KEY: B (250)

Worked solution: Divide the width of the sand grain by the width of a dust speck: (5 x 10^-4) / (2 x 10^-6) = (5 / 2) x 10^(-4 - (-6)) = 2.5 x 10^2 = 250. So 250 specks of dust make a row as long as the grain is wide.

Key computation (JS): `return String(Math.round((5/2)*Math.pow(10,-4-(-6))));`

Distractors:
- A (300): Subtracts the exponents correctly but also subtracts the coefficients, 5 - 2 = 3, instead of dividing them: 3 x 10^2. | computation: `return String(Math.round((5-2)*Math.pow(10,-4-(-6))));`
- C (700): Adds the coefficients, 5 + 2 = 7, as if combining the two widths, then uses 10^2: 7 x 10^2. | computation: `return String(Math.round((5+2)*Math.pow(10,-4-(-6))));`
- D (25000000000): Works out the exponent -4 - (-6) as 4 + 6 = 10, losing the negative sign on -4, so the answer becomes 2.5 x 10^10. | computation: `return String(Math.round((5/2)*Math.pow(10,4+6)));`

---

## MM3-G15

Area: Geometry | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: On a floor plan, 4 centimeters represent 7 meters. A hallway is 9.6 centimeters long on the floor plan. How long is the real hallway, in meters?

A. 15.6
B. 12.6
C. 16.8
D. 14.8

KEY: C (16.8)

Worked solution: Every 4 centimeters on the plan stand for 7 meters. The hallway is 9.6 / 4 = 2.4 groups of 4 centimeters, so it is 2.4 x 7 = 16.8 meters long.

Key computation (JS): `return 9.6 / 4 * 7;`

Distractors:
- A (15.6): Scales the two whole groups of 4 centimeters (8 cm = 14 m) but adds the leftover 1.6 centimeters as 1.6 meters without scaling them: 14 + 1.6 = 15.6. | computation: `return 2 * 7 + (9.6 - 8);`
- B (12.6): Thinks of the scale additively: 7 meters is 3 more than 4 centimeters, so adds 3 to 9.6. | computation: `return 9.6 + (7 - 4);`
- D (14.8): Finds 2.4 groups correctly, but in 2.4 x 7 writes the 8 from 4 x 7 = 28 and forgets to carry the 2, so 2 x 7 gives 14 and the answer reads 14.8. | computation: `return 2 * 7 + 0.4 * 7 - 2;`

---

## MM3-G13

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A rhombus has diagonals that are 24 centimeters and 18 centimeters long, and each of its four sides is 15 centimeters long. The height of the rhombus is the distance between two opposite sides, measured at a right angle to them. What is the height of the rhombus, in centimeters?

A. 12
B. 7.2
C. 9
D. 14.4

KEY: D (14.4)

Worked solution: The diagonals of a rhombus cut it into four right triangles, so its area is half of 24 x 18 = 216 square centimeters. A rhombus is also a parallelogram, so its area is base x height, with a side of 15 centimeters as the base: 15 x height = 216. The height is 216 / 15 = 14.4 centimeters.

Key computation (JS): `return (24*18/2) / 15;`

Distractors:
- A (12): Finds the area 216 correctly but divides by the short diagonal 18 instead of the side 15. | computation: `return (24*18/2) / 18;`
- B (7.2): Uses half of the long diagonal (12) in the area, getting half of 12 x 18 = 108, then divides by the side 15. | computation: `return (12*18/2) / 15;`
- C (9): Finds the area 216 correctly but divides by the long diagonal 24 instead of the side, as if the height were drawn to a diagonal. | computation: `return (24*18/2) / 24;`

---

## MM3-O03

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Mia writes two number patterns. Pattern A begins with 1, and each number after that is 3 more than the number before it. Pattern B begins with 20, and each number after that is 8 more than the number before it. How much greater is the 9th number in Pattern B than the 9th number in Pattern A?

A. 59
B. 57
C. 43
D. 45

KEY: A (59)

Worked solution: The 1st numbers are 1 and 20, so Pattern B starts 19 ahead. Each step adds 8 to Pattern B but only 3 to Pattern A, so the gap grows by 5 each step. The 9th number comes after 8 steps, so the gap is 19 + 8 x 5 = 59. Check: the 9th number in Pattern B is 20 + 8 x 8 = 84, the 9th number in Pattern A is 1 + 8 x 3 = 25, and 84 - 25 = 59.

Key computation (JS): `const b = 20 + 8 * 8; const a = 1 + 8 * 3; return String(b - a);`

Distractors:
- B (57): The student builds Pattern B correctly (84) but treats Pattern A as the multiples of 3 (3, 6, 9, ..., 27), using the wrong starting number, and gets 84 - 27 = 57. | computation: `const b = 20 + 8 * 8; const a = 9 * 3; return String(b - a);`
- C (43): The student starts the gap at 19 correctly but then grows it by Pattern A's rule, 3, each step instead of by the difference of the rules: 19 + 8 x 3 = 43. | computation: `return String((20 - 1) + 8 * 3);`
- D (45): The student finds each 9th number by multiplying the rule by 9 (9 x 8 = 72 and 9 x 3 = 27), as if the patterns were the multiples of 8 and 3, and subtracts to get 45. | computation: `return String(9 * 8 - 9 * 3);`

---

## MM3-N01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A fruit stand gets 24 large crates and 14 small crates of apples. A small crate holds 33 apples, and a large crate holds 36 apples. How many apples does the stand get in all?

A. 1306
B. 1326
C. 678
D. 1296

KEY: B (1326)

Worked solution: The large crates hold 24 x 36 = 864 apples. The small crates hold 14 x 33 = 462 apples. In all, 864 + 462 = 1,326 apples.

Key computation (JS): `return String(24*36 + 14*33);`

Distractors:
- A (1306): In 36 x 4 forgets to add the carried 2 (6 x 4 = 24, writes 4, then 3 x 4 = 12), so gets 124 instead of 144; 124 + 720 = 844, and 844 + 462 = 1,306. | computation: `var p = (6*4)%10 + 10*(3*4) + 36*20; return String(p + 14*33);`
- C (678): In 36 x 24 writes the second partial product as 72 instead of 720, leaving out the zero for the tens place: 144 + 72 = 216, then 216 + 462 = 678. | computation: `var p1 = 36*4 + 36*2; return String(p1 + 14*33);`
- D (1296): Pairs each count with the wrong crate size, because the stem names the small crate's size first: 24 x 33 + 14 x 36 = 792 + 504 = 1,296. | computation: `return String(24*33 + 14*36);`

---

## MM3-O25

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Each day Ana runs 6 laps around a small track. One lap of the small track is 80 meters shorter than one lap of the big track. Ben runs 4 laps around the big track and then runs 100 more meters. Ana and Ben run the same distance. How many meters long is one lap of the big track?

A. 90
B. 240
C. 290
D. 440

KEY: C (290)

Worked solution: Let x be the length of one lap of the big track, in meters. One small lap is x - 80 meters, so Ana runs 6(x - 80) meters. Ben runs 4x + 100 meters. Set them equal: 6(x - 80) = 4x + 100. Distribute: 6x - 480 = 4x + 100. Subtract 4x from both sides: 2x - 480 = 100. Add 480: 2x = 580. Divide by 2: x = 290. One lap of the big track is 290 meters.

Key computation (JS): `return String((100 + 6 * 80) / (6 - 4));`

Distractors:
- A (90): The student writes 6x - 80 = 4x + 100, taking the 80 meters off only once instead of off each of the 6 laps, and gets 2x = 180. | computation: `return String((100 + 80) / (6 - 4));`
- B (240): The student leaves out Ben's extra 100 meters, solves 6(x - 80) = 4x, and gets 2x = 480. | computation: `return String((6 * 80) / (6 - 4));`
- D (440): The student attaches the 100 meters to every one of Ben's laps, 6(x - 80) = 4(x + 100), and gets 2x = 880. | computation: `return String((4 * 100 + 6 * 80) / (6 - 4));`

---

## MM3-G07

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A box shaped like a rectangular prism is 15 inches long, 8 inches wide, and 6 inches tall. Ana turns the box onto one of its sides so that it now stands 8 inches tall. Then she pours sand into the box until the sand is 5 inches deep. How many cubic inches of sand are in the box?

A. 540
B. 600
C. 240
D. 450

KEY: D (450)

Worked solution: When the box stands 8 inches tall, the 8-inch edge points up, so the bottom of the box is the face that is 15 inches by 6 inches. Its area is 15 x 6 = 90 square inches. The sand is 5 inches deep, so its volume is 90 x 5 = 450 cubic inches.

Key computation (JS): `return 15*6*5;`

Distractors:
- A (540): Finds the new 15-by-6 bottom but fills it to the old height of 6 inches instead of the 5-inch sand depth: 15 x 6 x 6. | computation: `return 15*6*6;`
- B (600): Keeps the old 15-by-8 bottom, as if the box had not been turned: 15 x 8 x 5. | computation: `return 15*8*5;`
- C (240): Builds the bottom from the two edges named in the turn, 8 and 6, leaving out the 15-inch length: 8 x 6 x 5. | computation: `return 8*6*5;`

---

## MM3-N09

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Ribbon costs $0.45 for each meter. Ms. Lee buys 4.6 meters of ribbon. How much does she pay, in dollars?

A. 2.07
B. 1.87
C. 1.63
D. 2.1

KEY: A (2.07)

Worked solution: Multiply 4.6 x 0.45. First 46 x 45: 46 x 5 = 230 and 46 x 40 = 1,840, so 46 x 45 = 2,070. There are 1 + 2 = 3 decimal places, so 4.6 x 0.45 = 2.070 = 2.07 dollars.

Key computation (JS): `return (46*45/1000).toFixed(2);`

Distractors:
- B (1.87): In the partial product 46 x 4, writes 4 for 6 x 4 = 24 but forgets to add the carried 2 to 4 x 4 = 16, getting 164 instead of 184; then 1,640 + 230 = 1,870, so 1.87. | computation: `var p=(6*4)%10 + 10*(4*4); return ((p*10 + 46*5)/1000).toFixed(2);`
- C (1.63): Multiplies the numbers place by place instead of finding partial products: 4 x 0.4 = 1.6 and 0.6 x 0.05 = 0.03, then adds them: 1.63. | computation: `return (4*0.4 + 0.6*0.05).toFixed(2);`
- D (2.1): In the partial product 46 x 5, adds the carried 3 twice (4 x 5 + 3 + 3 = 26), getting 260 instead of 230; then 1,840 + 260 = 2,100, so 2.1. | computation: `var p=(6*5)%10 + 10*(4*5 + 3 + 3); return String((46*40 + p)/1000);`

---

## MM3-N03

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A teacher has 315 markers. She puts them into boxes that hold 24 markers each, filling as many boxes as she can. How many markers are left over?

A. 7
B. 3
C. 13
D. 15

KEY: B (3)

Worked solution: Divide 315 by 24. 24 goes into 31 one time (24), leaving 7. Bring down the 5 to make 75. 24 goes into 75 three times (72), leaving 3. So 315 = 24 x 13 + 3: the teacher fills 13 boxes and 3 markers are left over.

Key computation (JS): `return String(315 % 24);`

Distractors:
- A (7): Stops after the first step of the long division and reports the first remainder, 31 - 24 = 7, without bringing down the 5. | computation: `return String(31 - 24);`
- C (13): Answers with the quotient, the number of full boxes, instead of the markers left over. | computation: `return String(Math.floor(315/24));`
- D (15): Rounds the divisor 24 down to 20 to make the division easier, and reports the remainder of 315 divided by 20. | computation: `return String(315 % 20);`

---

## MM3-N16

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: On Monday the price of one share of a stock changed by -$4.35. On Tuesday the price fell again, by 2/5 as much as it fell on Monday. What was the total change in the price over the two days, in dollars?

A. -5.99
B. -5.97
C. -6.09
D. -4.75

KEY: C (-6.09)

Worked solution: On Tuesday the price fell 2/5 of 4.35: 4.35 / 5 = 0.87 and 0.87 x 2 = 1.74, so Tuesday's change was -1.74. The total change is -4.35 + (-1.74) = -6.09 dollars.

Key computation (JS): `var tue=4.35/5*2; return (-4.35 - tue).toFixed(2);`

Distractors:
- A (-5.99): Finds 4.35 / 5 = 0.87 correctly, but in 0.87 x 2 writes 4 for 7 x 2 = 14 and forgets to carry the 1 into 8 x 2 = 16, getting 1.64; then -4.35 - 1.64 = -5.99. | computation: `var fifth=87; var p=(7*2)%10 + 10*(8*2); return (-4.35 - p/100).toFixed(2);`
- B (-5.97): In 4.35 / 5, gets 43 / 5 = 8 remainder 3 but drops the remainder and divides only the 5 that is brought down, so 1/5 of 4.35 comes out 0.81; then 2 x 0.81 = 1.62 and -4.35 - 1.62 = -5.97. | computation: `var fifth = Math.floor(43/5)/10 + (5/5)/100; return (-4.35 - 2*fifth).toFixed(2);`
- D (-4.75): Takes away the fraction itself, 2/5 = 0.40, instead of 2/5 of Monday's fall: -4.35 - 0.40. | computation: `return (-4.35 - 2/5).toFixed(2);`

---

## MM3-G19

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A wooden pencil is shaped like a prism that is 148 millimeters long. Each end of the pencil is a six-sided shape made of 6 identical triangles that meet at the center, and each triangle has a base of 4 millimeters and a height of 3.5 millimeters. What is the volume of the pencil, in cubic millimeters?

A. 3552
B. 3636
C. 12432
D. 6216

KEY: D (6216)

Worked solution: Each triangle has area 4 x 3.5 / 2 = 7 square millimeters, so each end has area 6 x 7 = 42 square millimeters. The volume of a prism is the area of its base times its length: 42 x 148 = 6216 cubic millimeters.

Key computation (JS): `return 6 * (4 * 3.5 / 2) * 148;`

Distractors:
- A (3552): Finds the area of the six long side faces (6 x 4 x 148), the paint on the sides, instead of the volume. | computation: `return 6 * 4 * 148;`
- B (3636): Finds the whole surface area, the six side faces plus the two ends (3552 + 84), instead of the volume. | computation: `return 6 * 4 * 148 + 2 * (6 * 4 * 3.5 / 2);`
- C (12432): Uses base x height for each triangle without the half, so the end has area 84 and the volume is doubled. | computation: `return 6 * 4 * 3.5 * 148;`

---

## MM3-G01

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Liam has a bag of 100 one-centimeter cubes. He uses some of them to fill a box that is 6 centimeters long, 3 centimeters wide, and 4 centimeters tall, with no gaps. How many cubes are left in the bag?

A. 28
B. 87
C. 82
D. 46

KEY: A (28)

Worked solution: The box holds 6 x 3 x 4 cubes. One layer is 6 x 3 = 18 cubes, and there are 4 layers, so the box holds 18 x 4 = 72 cubes. Liam started with 100 cubes, so 100 - 72 = 28 cubes are left in the bag.

Key computation (JS): `return 100 - 6*3*4;`

Distractors:
- B (87): Adds the three edge lengths (6 + 3 + 4 = 13) instead of multiplying them, then subtracts 13 from 100. | computation: `return 100 - (6 + 3 + 4);`
- C (82): Fills only the bottom layer of 6 x 3 = 18 cubes and forgets the box is 4 layers tall. | computation: `return 100 - 6*3;`
- D (46): Adds the areas of the bottom, front and side faces (18 + 24 + 12 = 54) as if those were the cubes in the box, then subtracts from 100. | computation: `return 100 - (6*3 + 6*4 + 3*4);`

---

## MM3-O02

Area: Operations and Algebraic Thinking | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Ana shares 168 stickers equally among her 8 friends. Ben shares 56 stickers equally among his 7 friends. How many more stickers does each of Ana's friends get than each of Ben's friends?

A. 14
B. 13
C. 17
D. 16

KEY: B (13)

Worked solution: Each of Ana's friends gets 168 / 8 = 21 stickers. Each of Ben's friends gets 56 / 7 = 8 stickers. The expression is 168 / 8 - 56 / 7 = 21 - 8 = 13. Each of Ana's friends gets 13 more stickers.

Key computation (JS): `return String(168 / 8 - 56 / 7);`

Distractors:
- A (14): The student divides both totals by Ana's 8 friends: 21 - 56 / 8 = 21 - 7 = 14. | computation: `return String(168 / 8 - 56 / 8);`
- C (17): The student pairs each total with the other child's number of friends: 168 / 7 - 56 / 8 = 24 - 7 = 17. | computation: `return String(168 / 7 - 56 / 8);`
- D (16): The student divides both totals by Ben's 7 friends: 168 / 7 - 8 = 24 - 8 = 16. | computation: `return String(168 / 7 - 56 / 7);`

---

## MM3-G17

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A wooden block is shaped like a prism. Each of its two ends is a trapezoid whose parallel sides are 3 centimeters and 9 centimeters long, whose height is 4 centimeters, and whose two slanted sides are each 5 centimeters long. The block is 14 centimeters long from one end to the other. What is the total surface area of the block, in square centimeters?

A. 328
B. 286
C. 356
D. 336

KEY: C (356)

Worked solution: Each trapezoid end has area (3 + 9) / 2 x 4 = 24 square centimeters, so the two ends have 48. The other four faces are rectangles 14 centimeters long; their widths are the four sides of the trapezoid, 3 + 9 + 5 + 5 = 22 centimeters, so together they have 22 x 14 = 308 square centimeters. The total surface area is 48 + 308 = 356 square centimeters.

Key computation (JS): `return 2*((3+9)/2*4) + (3+9+5+5)*14;`

Distractors:
- A (328): Uses the trapezoid's 4-centimeter height as the width of the two slanted faces instead of the 5-centimeter slanted sides: (3 + 9 + 4 + 4) x 14 + 48. | computation: `return 2*((3+9)/2*4) + (3+9+4+4)*14;`
- B (286): Counts only one of the two 5-centimeter slanted faces, as if the trapezoid had three sides around it: (3 + 9 + 5) x 14 + 48. | computation: `return 2*((3+9)/2*4) + (3+9+5)*14;`
- D (336): Finds the volume, the end area 24 times the length 14, instead of the surface area. | computation: `return ((3+9)/2*4)*14;`

---

## MM3-O28

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A pool is drained at a constant rate, starting at 8:30 a.m. At 9:45 a.m. the pool holds 11830 gallons of water, and at 11:15 a.m. it holds 9490 gallons. How many gallons of water did the pool hold at 8:30 a.m., when the draining started?

A. 13180
B. 14080
C. 11440
D. 13780

KEY: D (13780)

Worked solution: From 9:45 to 11:15 is 1 hour 30 minutes, or 90 minutes. In that time the pool lost 11830 - 9490 = 2340 gallons, so it drains 2340 / 90 = 26 gallons per minute. From 8:30 to 9:45 is 1 hour 15 minutes, or 75 minutes. During those 75 minutes the pool lost 26 x 75 = 1950 gallons. So at 8:30 it held 11830 + 1950 = 13780 gallons.

Key computation (JS): `const rate = (11830 - 9490) / 90; return String(11830 + rate * 75);`

Distractors:
- A (13180): The student subtracts the clock times as base-ten numbers, 1115 - 945 = 170, reads it as 1 hour 70 minutes = 130 minutes, and gets a rate of 2340 / 130 = 18 gallons per minute. | computation: `const rate = (11830 - 9490) / 130; return String(11830 + rate * 75);`
- B (14080): The student finds 1 hour 30 minutes but writes it as 1.30 hours = 78 minutes, so the rate is 2340 / 78 = 30 gallons per minute. | computation: `const rate = (11830 - 9490) / 78; return String(11830 + rate * 75);`
- C (11440): The student finds the rate correctly but works back 75 minutes from the 11:15 reading, 9490 + 1950, as if 9490 were the 9:45 amount. | computation: `const rate = (11830 - 9490) / 90; return String(9490 + rate * 75);`

---

## MM3-G22

Area: Geometry | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A computer screen is shaped like a rectangle. The diagonal of the screen is 20 inches long, and the screen is 12 inches tall. What is the area of the screen, in square inches?

A. 192
B. 200
C. 96
D. 120

KEY: A (192)

Worked solution: The diagonal, the height and the width make a right triangle with the diagonal as the hypotenuse. So width x width + 12 x 12 = 20 x 20, which gives width x width = 400 - 144 = 256, and the width is 16 inches. The area is 16 x 12 = 192 square inches.

Key computation (JS): `var w = Math.sqrt(20*20 - 12*12); return w * 12;`

Distractors:
- B (200): Uses half the diagonal squared, the area rule for a square from its diagonal, as if the screen were a square. | computation: `return 20 * 20 / 2;`
- C (96): Finds the width by subtracting the lengths, 20 - 12 = 8, instead of subtracting their squares, then multiplies by 12. | computation: `return (20 - 12) * 12;`
- D (120): Takes half of the diagonal times the height, as if the screen were a triangle with the diagonal as its base. | computation: `return 20 * 12 / 2;`

---

## MM3-G23

Area: Geometry | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A globe is shaped like a sphere with a diameter of 12 inches. Using 3.14 for pi, what is the volume of the globe, in cubic inches?

A. 678.24
B. 904.32
C. 150.72
D. 7234.56

KEY: B (904.32)

Worked solution: The radius is half the diameter: 12 / 2 = 6 inches. The volume of a sphere is 4/3 x pi x r x r x r = 4/3 x 3.14 x 6 x 6 x 6 = 4/3 x 3.14 x 216 = 904.32 cubic inches.

Key computation (JS): `var r = 12 / 2; return Math.round(4 / 3 * 3.14 * r * r * r * 100) / 100;`

Distractors:
- A (678.24): Leaves out the 4/3 in the formula: 3.14 x 6 x 6 x 6. | computation: `var r = 12 / 2; return Math.round(3.14 * r * r * r * 100) / 100;`
- C (150.72): Squares the radius instead of cubing it: 4/3 x 3.14 x 6 x 6. | computation: `var r = 12 / 2; return Math.round(4 / 3 * 3.14 * r * r * 100) / 100;`
- D (7234.56): Uses the diameter, 12, as the radius in the formula. | computation: `var r = 12; return Math.round(4 / 3 * 3.14 * r * r * r * 100) / 100;`

---

## MM3-O24

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: At a deli, every sandwich has the same price and every juice has the same price. Two sandwiches and 1 juice cost $12.75. Two sandwiches and 2 juices cost $16.00. How many dollars more does one sandwich cost than one juice?

A. 8.00
B. 6.25
C. 1.50
D. 3.25

KEY: C (1.50)

Worked solution: Let s be the price of a sandwich and j the price of a juice. Then 2s + j = 12.75 and 2s + 2j = 16.00. Subtract the first equation from the second: j = 3.25. Then 2s = 12.75 - 3.25 = 9.50, so s = 4.75. A sandwich costs 4.75 - 3.25 = $1.50 more than a juice.

Key computation (JS): `const j = 16.00 - 12.75; const s = (12.75 - j) / 2; return (s - j).toFixed(2);`

Distractors:
- A (8.00): The student finds both prices but adds them, 4.75 + 3.25 = 8.00, instead of subtracting. | computation: `const j = 16.00 - 12.75; const s = (12.75 - j) / 2; return (s + j).toFixed(2);`
- B (6.25): The student finds j = 3.25 and 2s = 9.50 but forgets to divide by 2, so 9.50 - 3.25 = 6.25. | computation: `const j = 16.00 - 12.75; const s2 = 12.75 - j; return (s2 - j).toFixed(2);`
- D (3.25): The student reads 'how much more' and subtracts the two totals, 16.00 - 12.75 = 3.25, giving the difference of the orders instead of the difference of the prices. | computation: `return (16.00 - 12.75).toFixed(2);`

---

## MM3-G09

Area: Geometry | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A sign is shaped like a hexagon. It is made of a rectangle that is 6 inches wide and 11 inches tall, with one triangle attached to its left side and another triangle attached to its right side. For each triangle, the base is the 11-inch side of the rectangle and the height is 8 inches. What is the area of the sign, in square inches?

A. 187
B. 110
C. 114
D. 154

KEY: D (154)

Worked solution: The rectangle's area is 6 x 11 = 66 square inches. Each triangle has base 11 and height 8, so its area is (11 x 8) / 2 = 44 square inches. There are two triangles, so the sign's area is 66 + 44 + 44 = 154 square inches.

Key computation (JS): `return 6*11 + 2*(11*8/2);`

Distractors:
- A (187): Uses the 11-inch side as both the base and the height of each triangle, ignoring the printed height of 8 inches. | computation: `return 6*11 + 2*(11*11/2);`
- B (110): Adds the rectangle and only one triangle, forgetting the triangle on the other side. | computation: `return 6*11 + 11*8/2;`
- C (114): Uses the rectangle's 6-inch width as each triangle's base instead of the 11-inch side the triangle is attached to. | computation: `return 6*11 + 2*(6*8/2);`

---

## MM3-O13

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: At Lakeview School, 30% of the students are in sixth grade. Of the sixth graders, 25% walk to school. Exactly 36 sixth graders walk to school. How many students are at Lakeview School?

A. 480
B. 400
C. 720
D. 30

KEY: A (480)

Worked solution: 36 is 25% of the sixth graders, so there are 36 / 0.25 = 144 sixth graders. 144 is 30% of the school, so the school has 144 / 0.30 = 480 students. Check: 30% of 480 is 144, and 25% of 144 is 36.

Key computation (JS): `const g6 = 36 / 0.25; return String(Math.round(g6 / 0.30));`

Distractors:
- B (400): The student uses the 30% for both steps (36 / 0.30 = 120, then 120 / 0.30 = 400), applying the sixth-grade percent to the walkers as well. | computation: `return String(Math.round(36 / 0.30 / 0.30));`
- C (720): The student subtracts the percents (30% - 25% = 5%) and treats 36 as 5% of the school: 36 / 0.05 = 720. | computation: `return String(Math.round(36 / ((30 - 25) / 100)));`
- D (30): The student multiplies by one percent and divides by the other (36 x 0.25 / 0.30 = 30), mixing up which way each percent should be undone. | computation: `return String(Math.round(36 * 0.25 / 0.30));`

---

## MM3-O22

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A truck drives along a straight highway, away from a city, at a steady speed. Two hours after noon, the truck is 168 kilometers from the city. Seven hours after noon, it is 483 kilometers from the city. What is the truck's speed, in kilometers per hour?

A. 45
B. 63
C. 35
D. 69

KEY: B (63)

Worked solution: The speed is the rate of change of the distance. From 2 hours to 7 hours after noon is 7 - 2 = 5 hours. In that time the distance grows by 483 - 168 = 315 kilometers. The speed is 315 / 5 = 63 kilometers per hour.

Key computation (JS): `return String((483 - 168) / (7 - 2));`

Distractors:
- A (45): The student finds the change in distance, 315, but divides by the later time, 7 hours, instead of by the 5 hours between the readings. | computation: `return String((483 - 168) / 7);`
- C (35): The student finds the change in distance, 315, but adds the two times instead of subtracting them, 315 / (7 + 2) = 35. | computation: `return String((483 - 168) / (7 + 2));`
- D (69): The student treats the distance as proportional to the time and divides 483 by 7, ignoring that the truck was already some distance from the city at noon. | computation: `return String(483 / 7);`

---

## MM3-N23

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Ana works out the product (-2)^3 x 3^-2 and writes her answer as a fraction or mixed number. What is the product?

A. -7 8/9
B. -1 1/3
C. -8/9
D. -72

KEY: C (-8/9)

Worked solution: (-2)^3 = (-2)(-2)(-2) = -8. 3^-2 = 1 / 3^2 = 1/9. So (-2)^3 x 3^-2 = -8 x 1/9 = -8/9.

Key computation (JS): `var v=Math.pow(-2,3)*Math.pow(3,-2); return '-'+Math.round(Math.abs(v)*9)+'/9';`

Distractors:
- A (-7 8/9): Finds -8 and 1/9 correctly but adds them instead of multiplying: -8 + 1/9 = -7 8/9. | computation: `var v=Math.pow(-2,3)+Math.pow(3,-2); var w=Math.trunc(v); return '-'+Math.abs(w)+' '+Math.round(Math.abs(v-w)*9)+'/9';`
- B (-1 1/3): Reads 3^-2 as 1/(3 x 2) = 1/6, multiplying the base by the exponent, so the product is -8/6 = -1 1/3. | computation: `var v=Math.pow(-2,3)*(1/(3*2)); var w=Math.trunc(v); return '-'+Math.abs(w)+' '+Math.round(Math.abs(v-w)*3)+'/3';`
- D (-72): Ignores the negative sign in the exponent and uses 3^2 = 9 instead of 1/9: -8 x 9 = -72. | computation: `return String(Math.pow(-2,3)*Math.pow(3,2));`

---

## MM3-O10

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A box on a slow conveyor belt moves at a steady speed of 90 feet per hour. What is the box's speed in inches per minute?

A. 15
B. 17
C. 1.5
D. 18

KEY: D (18)

Worked solution: In one hour the box moves 90 feet, so in one minute it moves 90 / 60 = 1.5 feet. One foot is 12 inches, so 1.5 feet = 1.5 x 12 = 18 inches. The speed is 18 inches per minute.

Key computation (JS): `return String(90 / 60 * 12);`

Distractors:
- A (15): The student uses 10 inches in a foot: 1.5 x 10 = 15. | computation: `return String(90 / 60 * 10);`
- B (17): The student reads 1.5 feet as 1 foot 5 inches, the way '1.5' can look like a feet-and-inches reading, and gets 12 + 5 = 17 inches. | computation: `return String(Math.floor(90 / 60) * 12 + 5);`
- C (1.5): The student changes hours to minutes but forgets to change feet to inches, giving 1.5 (feet per minute). | computation: `return String(90 / 60);`

---

## MM3-O20

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A weather balloon is 160 meters above the ground and is coming down at a steady rate of 7.5 meters per minute. After how many whole minutes will the balloon first be lower than 25 meters above the ground?

A. 19
B. 4
C. 21
D. 18

KEY: A (19)

Worked solution: After t minutes the balloon's height is 160 - 7.5t meters. It is lower than 25 meters when 160 - 7.5t < 25. Subtract 160: -7.5t < -135. Divide by -7.5 and flip the inequality sign: t > 18. At exactly 18 minutes the height is 160 - 135 = 25 meters, which is not lower than 25. The first whole number of minutes greater than 18 is 19 (height 17.5 meters).

Key computation (JS): `const t = (160 - 25) / 7.5; return String(Number.isInteger(t) ? t + 1 : Math.ceil(t));`

Distractors:
- B (4): The student divides the target height by the rate, 25 / 7.5 = 3.3, and rounds up to 4, as if the balloon started at the ground. | computation: `return String(Math.ceil(25 / 7.5));`
- C (21): The student ignores the 25 meters and works out how long the balloon takes to come down 160 meters, 160 / 7.5 = 21.3, giving 21 whole minutes. | computation: `return String(Math.floor(160 / 7.5));`
- D (18): The student solves 160 - 7.5t = 25 and gets t = 18, without noticing that at 18 minutes the balloon is exactly 25 meters high, not lower. | computation: `return String((160 - 25) / 7.5);`

---

## MM3-N05

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A pitcher has 2.75 liters of juice in it. Lee pours out 0.8 liter of the juice. Then his mom pours 1.45 liters more juice into the pitcher. How many liters of juice are in the pitcher now?

A. 4.12
B. 3.4
C. 3.3
D. 3.6

KEY: B (3.4)

Worked solution: First subtract: 2.75 - 0.80 = 1.95 liters (regroup 1 one as 10 tenths: 17 tenths - 8 tenths = 9 tenths). Then add: 1.95 + 1.45 = 3.40 liters. So there are 3.4 liters in the pitcher.

Key computation (JS): `return String(Math.round((2.75 - 0.8 + 1.45)*100)/100);`

Distractors:
- A (4.12): Lines 0.8 up under the hundredths digit, as if it were 0.08: 2.75 - 0.08 = 2.67, then 2.67 + 1.45 = 4.12. | computation: `return String(Math.round((2.75 - 0.08 + 1.45)*100)/100);`
- C (3.3): Gets 1.95 correctly, then in 1.95 + 1.45 writes 0 for 5 + 5 but forgets to carry the 1 into the tenths: 3.30. | computation: `var a = 195, b = 145; var h = (5+5)%10; var t = 9 + 4; var tc = Math.floor(t/10); var o = 1 + 1 + tc; return String((o*100 + (t%10)*10 + h)/100);`
- D (3.6): In 2.75 - 0.80, subtracts the smaller tenths digit from the larger (8 - 7 = 1) instead of regrouping, so gets 2.15; then 2.15 + 1.45 = 3.60. | computation: `var step1 = 2 + (8-7)/10 + 0.05; return String(Math.round((step1 + 1.45)*100)/100);`

---

## MM3-N13

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A school needs 1,300 pencils and 1,450 erasers. Pencils are sold only in boxes of 32, and erasers only in boxes of 45. The school buys just enough whole boxes of each to have all the pencils and erasers it needs. How many pencils and erasers will be left over in all?

A. 22
B. 37
C. 47
D. 35

KEY: C (47)

Worked solution: 1,300 / 32 = 40 remainder 20, so the school needs 41 boxes of pencils: 41 x 32 = 1,312 pencils, and 1,312 - 1,300 = 12 are left over. 1,450 / 45 = 32 remainder 10, so it needs 33 boxes of erasers: 33 x 45 = 1,485 erasers, and 1,485 - 1,450 = 35 are left over. In all, 12 + 35 = 47 are left over.

Key computation (JS): `var p=Math.ceil(1300/32)*32-1300, e=Math.ceil(1450/45)*45-1450; return String(p+e);`

Distractors:
- A (22): Finds the pencil leftover correctly (12) but for the erasers reports the division remainder, 1,450 / 45 = 32 remainder 10, instead of the unused part of the last box: 12 + 10 = 22. | computation: `var p=Math.ceil(1300/32)*32-1300, r=1450%45; return String(p+r);`
- B (37): Finds 41 boxes of pencils (12 left) and 33 boxes of erasers, but in 33 x 5 writes 5 for 3 x 5 = 15 and forgets to carry the 1 into the next 3 x 5, getting 1,475 instead of 1,485; so 25 erasers left and 12 + 25 = 37. | computation: `var p=Math.ceil(1300/32)*32-1300; var b=Math.ceil(1450/45); var t=(3*5)%10 + 10*(3*5) + b*40; return String(p + (t-1450));`
- D (35): Works out only the erasers (33 x 45 - 1,450 = 35) and leaves out the pencils left over. | computation: `var e=Math.ceil(1450/45)*45-1450; return String(e);`

---

## MM3-N19

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A pan of water is put in a freezer when its temperature is 4.7 degrees Celsius. In the freezer, its temperature drops 0.8 degree every 2.5 minutes. What is its temperature 20 minutes after it is put in the freezer, in degrees Celsius?

A. -11.3
B. -2.7
C. -1.3
D. -1.7

KEY: D (-1.7)

Worked solution: 20 minutes is 20 / 2.5 = 8 periods of 2.5 minutes. In 8 periods the temperature drops 8 x 0.8 = 6.4 degrees. So the temperature is 4.7 - 6.4 = -1.7 degrees Celsius.

Key computation (JS): `var n=20/2.5; return String(Math.round((4.7 - n*0.8)*10)/10);`

Distractors:
- A (-11.3): Uses 0.8 degree every minute instead of every 2.5 minutes: 20 x 0.8 = 16, and 4.7 - 16 = -11.3. | computation: `return String(Math.round((4.7 - 20*0.8)*10)/10);`
- B (-2.7): Finds the drop 6.4 correctly and works out 4.7 - 6.4 as -(6.4 - 4.7), but after regrouping the tenths (14 - 7 = 7) forgets to take 1 from the 6 ones (6 - 4 = 2): -2.7. | computation: `var d=Math.round(20/2.5*0.8*10), s=47; var t=(d%10)+10-(s%10); var o=Math.floor(d/10)-Math.floor(s/10); return String(-(o + (t%10)/10));`
- C (-1.3): Finds the drop per minute as 0.8 / 2.5 but stops the division at 0.3 instead of 0.32, so the drop in 20 minutes is 20 x 0.3 = 6 and 4.7 - 6 = -1.3. | computation: `var r=Math.floor(0.8/2.5*10)/10; return String(Math.round((4.7 - 20*r)*10)/10);`

---

## MM3-G05

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A toy box is shaped like a rectangular prism. It is 5 inches wide. Its length is twice its width, and its height is 3 inches less than its length. What is the volume of the toy box, in cubic inches?

A. 350
B. 100
C. 650
D. 150

KEY: A (350)

Worked solution: The width is 5 inches. The length is twice the width: 2 x 5 = 10 inches. The height is 3 inches less than the length: 10 - 3 = 7 inches. The volume is 5 x 10 x 7 = 50 x 7 = 350 cubic inches.

Key computation (JS): `const w = 5; const l = 2*w; const h = l - 3; return w*l*h;`

Distractors:
- B (100): Takes the 3 inches away from the width instead of the length, so the height is 5 - 3 = 2: 5 x 10 x 2 = 100. | computation: `const w = 5; const l = 2*w; const h = w - 3; return w*l*h;`
- C (650): Adds 3 to the length instead of taking 3 away, so the height is 13: 5 x 10 x 13 = 650. | computation: `const w = 5; const l = 2*w; const h = l + 3; return w*l*h;`
- D (150): Uses the printed 3 inches as the height instead of 3 less than the length: 5 x 10 x 3 = 150. | computation: `const w = 5; const l = 2*w; return w*l*3;`
