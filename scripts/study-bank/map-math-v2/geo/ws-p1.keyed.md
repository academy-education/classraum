# Items for review, KEYED (33)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MV2-G56-05

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A rectangle is drawn on a coordinate grid. Two of its corners are at (7, 1) and (7, 7), and the rest of the rectangle lies to the right of the side joining them. The perimeter of the rectangle is 32 units. What is the x-coordinate of each of the other two corners?

A. 17
B. 13
C. 20
D. 12

KEY: A (17)

Worked solution: The side from (7, 1) to (7, 7) is 7 - 1 = 6 units long, and so is the side across from it. That uses 12 of the 32 units, leaving 20 units for the other two sides, so each is 10 units. Moving 10 units right from x = 7 gives x = 17.

Key computation (JS): `const h = 7-1; const w = (32 - 2*h)/2; return 7 + w`

Distractors:
- B (13): The student sees one side of length 6 and moves 6 to the right, never using the perimeter. | computation: `return 7 + (7-1)`
- C (20): The student does 32 - 6 = 26, halves it to 13 for the width, and lands on 7 + 13 = 20, forgetting the opposite side is also 6. | computation: `return 7 + (32 - (7-1))/2`
- D (12): After 32 - 12 = 20, the student splits it by 4 because a rectangle has four sides, getting a width of 5. | computation: `return 7 + (32 - 2*(7-1))/4`

---

## MV2-G56-13

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A rectangular sandbox is drawn on a coordinate grid. Its corners are at (5, 1), (5, 7), (14, 7), and (14, 1). Each unit on the grid stands for one foot. How many feet long is the shorter side of the sandbox?

A. 19
B. 6
C. 7
D. 9

KEY: B (6)

Worked solution: The side from (5, 1) to (5, 7) is 7 - 1 = 6 feet. The side from (5, 7) to (14, 7) is 14 - 5 = 9 feet. The shorter side is 6 feet.

Key computation (JS): `return Math.min(7-1, 14-5)`

Distractors:
- A (19): The student adds 5 + 14 to get "how long" the side is. | computation: `return 5 + 14`
- C (7): The student sees the side going up to y = 7 and forgets it starts at y = 1, not at 0. | computation: `return 7`
- D (9): The student finds the 9-foot side first and gives it without comparing. | computation: `return 14 - 5`

---

## MV2-G78-12

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A stone mortar is a solid cylinder with a radius of 8 centimeters and a height of 10 centimeters. A bowl shaped like half of a sphere, with a radius of 6 centimeters, is carved into the center of its flat upper face. Using 3.14 for pi, what is the volume of the stone that is left, in cubic centimeters?

A. 1934.24
B. 1670.48
C. 1557.44
D. 1896.56

KEY: C (1557.44)

Worked solution: Cylinder: 3.14 x 8 x 8 x 10 = 2009.6 cubic cm. The bowl is half of a sphere: 1/2 x 4/3 x 3.14 x 6 x 6 x 6 = 2/3 x 3.14 x 216 = 452.16 cubic cm. Stone left: 2009.6 - 452.16 = 1557.44 cubic centimeters.

Key computation (JS): `return Math.round((3.14*8*8*10 - (2/3)*3.14*6*6*6)*100)/100;`

Distractors:
- A (1934.24): The student uses 2/3 x 3.14 x 6 x 6 = 75.36 for the bowl: 1934.24. | computation: `return Math.round((3.14*8*8*10 - (2/3)*3.14*6*6)*100)/100;`
- B (1670.48): The student takes half of 3.14 x 216 = 339.12 for the bowl, dropping the 4/3: 2009.6 - 339.12 = 1670.48. | computation: `return Math.round((3.14*8*8*10 - 3.14*6*6*6/2)*100)/100;`
- D (1896.56): The student subtracts 3.14 x 6 x 6 = 113.04, the flat opening: 1896.56. | computation: `return Math.round((3.14*8*8*10 - 3.14*6*6)*100)/100;`

---

## MV2-G56-11

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two rectangles are drawn on a coordinate grid. Rectangle A has corners at (1, 1), (10, 1), (10, 10), and (1, 10). Rectangle B has corners at (6, 3), (13, 3), (13, 12), and (6, 12). The two rectangles overlap. What is the area, in square units, of the part that is inside both rectangles?

A. 11
B. 36
C. 49
D. 28

KEY: D (28)

Worked solution: Inside both rectangles, x goes from 6 (the left side of B) to 10 (the right side of A), which is 4 units. y goes from 3 (the bottom of B) to 10 (the top of A), which is 7 units. The overlap is a 4-by-7 rectangle, so its area is 4 x 7 = 28 square units.

Key computation (JS): `const w = 10 - 6, h = 10 - 3; return w*h`

Distractors:
- A (11): The student finds 4 and 7 and adds them, giving a length rather than an area. | computation: `return (10-6) + (10-3)`
- B (36): The student finds the 4-unit width correctly but takes A's whole height, 10 - 1 = 9, as if B reached the bottom of A. | computation: `return (10-6)*(10-1)`
- C (49): The student takes B's whole width, 13 - 6 = 7, for the overlap and multiplies by the correct height 7. | computation: `return (13-6)*(10-3)`

---

## MV2-G78-13

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A mailbox is shaped like a rectangular box with half of a cylinder on top. The box part is 40 centimeters long, 20 centimeters wide, and 15 centimeters tall. Above the box is half of a cylinder that is 40 centimeters long, and its flat face, which is 20 centimeters wide, covers the box's upper face exactly. Using 3.14 for pi, what is the volume of the mailbox, in cubic centimeters?

A. 18280
B. 13256
C. 18000
D. 15140

KEY: A (18280)

Worked solution: Box: 40 x 20 x 15 = 12000 cubic cm. The half cylinder has radius 20 / 2 = 10 cm and length 40 cm, so its volume is 1/2 x 3.14 x 10 x 10 x 40 = 6280 cubic cm. Total: 12000 + 6280 = 18280 cubic centimeters.

Key computation (JS): `return 40*20*15 + 3.14*10*10*40/2;`

Distractors:
- B (13256): The student finds half of 2 x 3.14 x 10 x 40 = 1256, an area, and adds it: 13256. | computation: `return 40*20*15 + 2*3.14*10*40/2;`
- C (18000): The student uses 3 for pi: 1/2 x 3 x 100 x 40 = 6000, total 18000. | computation: `return 40*20*15 + 3*10*10*40/2;`
- D (15140): The student uses 20 cm, the width, as the cylinder's length: 1/2 x 3.14 x 100 x 20 = 3140, total 15140. | computation: `return 40*20*15 + 3.14*10*10*20/2;`

---

## MV2-G78-25

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In the coordinate plane, the points (1, 2) and (6, 14) are two corners of a square, and the segment joining them is one side of the square. What is the area of the square, in square units?

A. 193
B. 169
C. 156
D. 232

KEY: B (169)

Worked solution: The side goes 6 - 1 = 5 units across and 14 - 2 = 12 units up. Its length is the square root of (25 + 144) = the square root of 169 = 13. The area of the square is 13 x 13 = 169 square units.

Key computation (JS): `const dx = 6 - 1, dy = 14 - 2; return dx*dx + dy*dy;`

Distractors:
- A (193): The student takes the horizontal change as 6 + 1 = 7: 7 x 7 + 12 x 12 = 193. | computation: `return (6 + 1)**2 + (14 - 2)**2;`
- C (156): The student finds the side, 13, but multiplies it by the 12-unit rise: 13 x 12 = 156. | computation: `return Math.sqrt((6-1)**2 + (14-2)**2)*(14 - 2);`
- D (232): The student uses only the point (6, 14), as if the side started at the origin: 6 x 6 + 14 x 14 = 232. | computation: `return 6*6 + 14*14;`

---

## MV2-G56-19

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A sail is drawn on a map in the coordinate plane, with one unit standing for one foot. The three corners of the sail are at (-2, -4), (5, -4), and (2, 8). How many square feet of cloth does the sail need?

A. 18
B. 28
C. 42
D. 24

KEY: C (42)

Worked solution: The base joins (-2, -4) and (5, -4), so it is 5 - (-2) = 7 units long. The height is the distance from y = -4 up to y = 8, which is 8 - (-4) = 12 units. Area = 1/2 x 7 x 12 = 42 square feet.

Key computation (JS): `const b = 5 - (-2), h = 8 - (-4); return b*h/2`

Distractors:
- A (18): The student does 5 - 2 = 3 for the base, as if both ends were positive. | computation: `return (5 - 2) * (8 - (-4)) / 2`
- B (28): The student takes the height as 8, measuring from the x-axis instead of from the base at y = -4. | computation: `return (5 - (-2)) * 8 / 2`
- D (24): The student reads the base from x = -2 to x = 2 (the top vertex's x) and uses 4. | computation: `return (2 - (-2)) * (8 - (-4)) / 2`

---

## MV2-G78-23

Area: Geometry | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Line DE is drawn through point A of triangle ABC so that DE is parallel to side BC. Point D is on the same side as B, and point E is on the same side as C. Angle DAB measures (3x - 10) degrees, angle BAC measures (2x - 15) degrees, and angle CAE measures (x + 19) degrees. What is the measure of angle ABC, in degrees?

A. 50
B. 77
C. 31
D. 83

KEY: D (83)

Worked solution: D, A and E lie on one line, so the three angles at A add to 180: (3x - 10) + (2x - 15) + (x + 19) = 180, so 6x - 6 = 180, 6x = 186 and x = 31. Because DE is parallel to BC, angle ABC and angle DAB are alternate interior angles, so angle ABC = 3(31) - 10 = 83 degrees.

Key computation (JS): `const x = (180 + 10 + 15 - 19)/6; return 3*x - 10;`

Distractors:
- A (50): The student matches angle ABC with angle CAE instead of angle DAB: 31 + 19 = 50. | computation: `const x = (180 + 10 + 15 - 19)/6; return x + 19;`
- B (77): The student writes 6x = 180 - 6 = 174, so x = 29 and angle DAB = 3(29) - 10 = 77. | computation: `const x = (180 - 10 - 15 + 19)/6; return 3*x - 10;`
- C (31): The student solves 6x - 6 = 180 and reports x = 31 as the angle. | computation: `return (180 + 10 + 15 - 19)/6;`

---

## MV2-G78-05

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A wooden block is a prism that is 12 centimeters long. Each end of the block is shaped like a house: a rectangle 6 centimeters wide and 4 centimeters tall, with a triangle on top whose base is the rectangle's 6-centimeter top edge. The top point of the triangle is 9 centimeters above the bottom of the rectangle. What is the volume of the block, in cubic centimeters?

A. 468
B. 648
C. 408
D. 612

KEY: A (468)

Worked solution: The end is a rectangle plus a triangle. Rectangle: 6 x 4 = 24 square cm. The triangle's height is 9 - 4 = 5 cm, so its area is 1/2 x 6 x 5 = 15 square cm. The end has area 24 + 15 = 39 square cm, and the volume is 39 x 12 = 468 cubic centimeters.

Key computation (JS): `return (6*4 + 6*(9-4)/2)*12;`

Distractors:
- B (648): The student treats the triangle like a rectangle: 6 x 5 = 30, end 54, volume 648. | computation: `return (6*4 + 6*(9-4))*12;`
- C (408): The student uses the rectangle's 4 cm side as the triangle's base: 1/2 x 4 x 5 = 10, so the end is 34 and the volume 408. | computation: `return (6*4 + 4*(9-4)/2)*12;`
- D (612): The student takes the printed 9 cm as the triangle's height: 1/2 x 6 x 9 = 27, end 51, volume 612. | computation: `return (6*4 + 6*9/2)*12;`

---

## MV2-G78-04

Area: Geometry | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A tent is shaped like a triangular prism with no floor. Each of its two triangular ends has a base of 8 feet and a height of 3 feet, and each slanted side of a triangular end is 5 feet long. The tent is 10 feet long. Fabric covers the two triangular ends and the two slanted rectangular sides. How many square feet of fabric are used?

A. 112
B. 124
C. 84
D. 120

KEY: B (124)

Worked solution: Each triangular end has area 1/2 x 8 x 3 = 12 square feet, so the two ends use 24. Each slanted side is a rectangle 5 feet by 10 feet, so the two sides use 2 x 50 = 100. Fabric = 24 + 100 = 124 square feet.

Key computation (JS): `return 2*(8*3/2) + 2*(5*10);`

Distractors:
- A (112): The student adds one end, 12, to the two side panels, 100, and forgets the second end: 112. | computation: `return (8*3/2) + 2*(5*10);`
- C (84): The student makes each side panel 3 by 10 instead of 5 by 10: 24 + 60 = 84. | computation: `return 2*(8*3/2) + 2*(3*10);`
- D (120): The student multiplies the end area by the length, 12 x 10 = 120, the space inside the tent. | computation: `return (8*3/2)*10;`

---

## MV2-G56-20

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A swimming area at a lake is marked off with ropes. On a map in the coordinate plane, with one unit standing for one meter, its corners are at (-2, 7), (3, 7), (3, -3), and (-2, -3). How many square meters of water does the swimming area cover?

A. 20
B. 27
C. 50
D. 30

KEY: C (50)

Worked solution: The width is 3 - (-2) = 5 units and the height is 7 - (-3) = 10 units. The area is 5 x 10 = 50 square meters.

Key computation (JS): `return (3 - (-2)) * (7 - (-3))`

Distractors:
- A (20): The student does 7 - 3 = 4 for the height, as if both y-values were positive. | computation: `return (3 - (-2)) * (7 - 3)`
- B (27): The student splits the rectangle at the axes, finds the 3-by-7 piece and the 2-by-3 piece, and forgets the other two pieces. | computation: `return 3*7 + 2*3`
- D (30): The student adds the four sides, 5 + 10 + 5 + 10, answering how far around rather than how much inside. | computation: `return 2*((3 - (-2)) + (7 - (-3)))`

---

## MV2-G78-10

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A wooden block is a rectangular prism 20 centimeters long, 10 centimeters wide, and 8 centimeters tall. A straight groove is cut into the upper face along the whole 20-centimeter length. The groove is shaped like a triangular prism: each end of the groove is a triangle 4 centimeters wide at the block's upper face and 3 centimeters deep. What is the volume of the wood that is left, in cubic centimeters?

A. 1540
B. 1520
C. 1594
D. 1480

KEY: D (1480)

Worked solution: The block is 20 x 10 x 8 = 1600 cubic cm. The groove is a triangular prism: its end has area 1/2 x 4 x 3 = 6 square cm, and it runs 20 cm, so it removes 6 x 20 = 120 cubic cm. The wood left is 1600 - 120 = 1480 cubic centimeters.

Key computation (JS): `return 20*10*8 - (4*3/2)*20;`

Distractors:
- A (1540): The student multiplies the groove's end area by the block's 10 cm width instead of its 20 cm length, removing only 60: 1540. | computation: `return 20*10*8 - (4*3/2)*10;`
- B (1520): The student finds the triangle as 1/3 x 4 x 3 = 4, so the groove is 4 x 20 = 80 and the wood left is 1600 - 80 = 1520. | computation: `return 20*10*8 - (4*3/3)*20;`
- C (1594): The student subtracts the 6 square cm triangle itself, not the prism, from 1600: 1594. | computation: `return 20*10*8 - (4*3/2);`

---

## MV2-G56-03

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A rectangular garden is drawn on a coordinate grid where each unit stands for one meter. Its corners are at (4, 2), (4, 9), (12, 9), and (12, 2). The side from (4, 2) to (12, 2) runs along a wall, so it needs no fence. A fence goes along the other three sides. How many meters of fence are needed?

A. 22
B. 30
C. 56
D. 23

KEY: A (22)

Worked solution: The sides from (4, 2) to (4, 9) and from (12, 2) to (12, 9) are each 9 - 2 = 7 meters. The side from (4, 9) to (12, 9) is 12 - 4 = 8 meters. The side along the wall is not fenced, so the fence is 7 + 8 + 7 = 22 meters.

Key computation (JS): `return (9-2) + (12-4) + (9-2)`

Distractors:
- B (30): The student finds the whole perimeter 7 + 8 + 7 + 8 and forgets that the side on the wall gets no fence. | computation: `return 2*((9-2)+(12-4))`
- C (56): The student multiplies 7 x 8, answering how much ground is inside rather than how much fence goes around it. | computation: `return (9-2)*(12-4)`
- D (23): The student drops one 7-meter side and fences 8 + 8 + 7, not checking that the wall side runs from (4, 2) to (12, 2), which is 8 meters. | computation: `return (12-4) + (12-4) + (9-2)`

---

## MV2-G78-20

Area: Geometry | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: An ice cream cone is shaped like a cone with a radius of 3 centimeters and a height of 17 centimeters. A scoop of ice cream shaped like a sphere with a radius of 3 centimeters sits on the cone. The scoop melts, and all of it flows into the cone. How many cubic centimeters of the cone are still empty? Use 3.14 for pi.

A. 131.88
B. 47.1
C. 127.17
D. 75.36

KEY: B (47.1)

Worked solution: Cone: 1/3 x 3.14 x 3 x 3 x 17 = 160.14 cubic cm. Scoop: 4/3 x 3.14 x 3 x 3 x 3 = 113.04 cubic cm. The melted ice cream fills 113.04 of the cone, so the empty space is 160.14 - 113.04 = 47.1 cubic centimeters.

Key computation (JS): `return Math.round((3.14*9*17/3 - (4/3)*3.14*27)*100)/100;`

Distractors:
- A (131.88): The student finds the scoop as 1/3 x 3.14 x 27 = 28.26: 160.14 - 28.26 = 131.88. | computation: `return Math.round((3.14*9*17/3 - 3.14*27/3)*100)/100;`
- C (127.17): The student finds the cone as 1/2 x 3.14 x 9 x 17 = 240.21: 240.21 - 113.04 = 127.17. | computation: `return Math.round((3.14*9*17/2 - (4/3)*3.14*27)*100)/100;`
- D (75.36): The student finds the scoop as 3.14 x 27 = 84.78: 160.14 - 84.78 = 75.36. | computation: `return Math.round((3.14*9*17/3 - 3.14*27)*100)/100;`

---

## MV2-G56-25

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A wooden block is a rectangular prism 6 centimeters long, 5 centimeters wide, and 4 centimeters tall. A cube with edges 2 centimeters long is cut out of one corner of the block. What is the surface area of the block that is left, in square centimeters?

A. 112
B. 136
C. 148
D. 172

KEY: C (148)

Worked solution: Before the cut, the surface area is 2 x (6 x 5 + 6 x 4 + 5 x 4) = 2 x 74 = 148 square centimeters. Cutting out the corner cube removes three 2-by-2 squares from the outside, but it uncovers three new 2-by-2 squares inside the notch. The surface area stays 148 square centimeters.

Key computation (JS): `const S = 2*(6*5 + 6*4 + 5*4); return S - 3*4 + 3*4`

Distractors:
- A (112): The student computes 6 x 5 x 4 - 2 x 2 x 2 = 120 - 8. | computation: `return 6*5*4 - 2*2*2`
- B (136): The student takes 3 x 4 = 12 off 148 and stops, missing the inside of the notch. | computation: `return 2*(6*5 + 6*4 + 5*4) - 3*2*2`
- D (172): The student thinks cutting out the cube adds its whole surface, 6 x 4 = 24, to 148. | computation: `return 2*(6*5 + 6*4 + 5*4) + 6*2*2`

---

## MV2-G78-17

Area: Geometry | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A water tank is shaped like a cylinder with a radius of 2 meters and a height of 10 meters. It stands upright, and the water in it is 4.5 meters deep. Using 3.14 for pi, how many cubic meters of the tank are empty?

A. 81.64
B. 113.04
C. 125.6
D. 69.08

KEY: D (69.08)

Worked solution: The empty part is a cylinder above the water. Its height is 10 - 4.5 = 5.5 m and its radius is 2 m. Volume: 3.14 x 2 x 2 x 5.5 = 69.08 cubic meters.

Key computation (JS): `return Math.round(3.14*2*2*(10 - 4.5)*100)/100;`

Distractors:
- A (81.64): The student subtracts 10 - 4.5 as 6.5 instead of 5.5 (a regrouping slip): 3.14 x 4 x 6.5 = 81.64. | computation: `return Math.round(3.14*2*2*6.5*100)/100;`
- B (113.04): The student takes 3.14 x 4 = 12.56 off the full tank: 125.6 - 12.56 = 113.04. | computation: `return Math.round((3.14*2*2*10 - 3.14*2*2)*100)/100;`
- C (125.6): The student computes 3.14 x 4 x 10 = 125.6, the full tank. | computation: `return Math.round(3.14*2*2*10*100)/100;`

---

## MV2-G78-21

Area: Geometry | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A wheelchair ramp rises 1.2 meters over a horizontal distance of 5 meters. How long is the sloped surface of the ramp, to the nearest hundredth of a meter?

A. 5.14
B. 5.12
C. 5.04
D. 5.23

KEY: A (5.14)

Worked solution: The ramp, the ground and the rise form a right triangle with legs 5 and 1.2. The sloped surface is the hypotenuse: the square root of (5 x 5 + 1.2 x 1.2) = the square root of (25 + 1.44) = the square root of 26.44, about 5.142. To the nearest hundredth, 5.14 meters.

Key computation (JS): `return Math.round(Math.sqrt(5*5 + 1.2*1.2)*100)/100;`

Distractors:
- B (5.12): The student adds 25 + 1.2 instead of 25 + 1.44: the square root of 26.2, about 5.12. | computation: `return Math.round(Math.sqrt(5*5 + 1.2)*100)/100;`
- C (5.04): The student splits the rise and uses 0.6 m: the square root of (25 + 0.36), about 5.04. | computation: `return Math.round(Math.sqrt(5*5 + 0.6*0.6)*100)/100;`
- D (5.23): The student writes 1.2 squared as 2.4: the square root of 27.4, about 5.23. | computation: `return Math.round(Math.sqrt(5*5 + 1.2*2)*100)/100;`

---

## MV2-G56-22

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A baker rolls cookie dough into a rectangle 15 inches long and 9 inches wide. She cuts a triangle out of the middle of one long edge. The triangle's base, along that edge, is 6 inches, and its tip is 4 inches in from the edge. What is the area of the dough that is left, in square inches?

A. 135
B. 123
C. 131
D. 125

KEY: B (123)

Worked solution: The whole rectangle of dough is 15 x 9 = 135 square inches. The triangle cut out is 1/2 x 6 x 4 = 12 square inches. The area left is 135 - 12 = 123 square inches.

Key computation (JS): `return 15*9 - 6*4/2`

Distractors:
- A (135): The student finds 15 x 9 and stops, forgetting to take away the triangle. | computation: `return 15*9`
- C (131): The student takes 4 (how far in the cut goes) away from 135. | computation: `return 15*9 - 4`
- D (125): The student takes away 6 + 4 = 10 for the triangle. | computation: `return 15*9 - (6 + 4)`

---

## MV2-G56-12

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A square has a perimeter of 44 centimeters. Each side of an equilateral triangle is 4 centimeters longer than a side of the square. What is the perimeter of the triangle, in centimeters?

A. 60
B. 48
C. 45
D. 56

KEY: C (45)

Worked solution: A square has four equal sides, so each side is 44 / 4 = 11 centimeters. Each side of the triangle is 11 + 4 = 15 centimeters. An equilateral triangle has three equal sides, so its perimeter is 3 x 15 = 45 centimeters.

Key computation (JS): `const s = 44/4 + 4; return 3*s`

Distractors:
- A (60): The student finds 15 correctly but keeps the square's four sides: 4 x 15. | computation: `return 4*(44/4 + 4)`
- B (48): The student reads "4 cm longer" as the triangle being 4 cm longer all the way around: 44 + 4. | computation: `return 44 + 4`
- D (56): The student starts from 44 and adds 4 three times (one for each side of the triangle), never finding a single side. | computation: `return 44 + 3*4`

---

## MV2-G56-04

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A wooden block for a toy train is shaped like a rectangular prism 9 centimeters long, 7 centimeters wide, and 5 centimeters tall. A groove for the track is cut along the whole length of the top of the block. The groove is shaped like a rectangular prism 9 centimeters long, 2 centimeters wide, and 2 centimeters deep. What is the volume of the wood that is left, in cubic centimeters?

A. 297
B. 225
C. 189
D. 279

KEY: D (279)

Worked solution: The whole block is 9 x 7 x 5 = 315 cubic centimeters. The groove is 9 x 2 x 2 = 36 cubic centimeters. The wood left is 315 - 36 = 279 cubic centimeters.

Key computation (JS): `return 9*7*5 - 9*2*2`

Distractors:
- A (297): The student pictures the groove as the 9-by-2 strip on top of the block and takes 18 away from 315, forgetting its 2-cm depth. | computation: `return 9*7*5 - 9*2`
- B (225): The student uses the block's height for the groove's depth, taking away 9 x 2 x 5 = 90. | computation: `return 9*7*5 - 9*2*5`
- C (189): The student takes away a full 9 x 7 x 2 layer (126), as if the groove ran across the entire width of the top. | computation: `return 9*7*5 - 9*7*2`

---

## MV2-G56-09

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: On a trail map drawn on a coordinate grid, each unit stands for 3 kilometers. A campsite is at the point (4, 1) and a lookout tower is at the point (4, 14). How many kilometers apart are the campsite and the tower?

A. 39
B. 12
C. 30
D. 15

KEY: A (39)

Worked solution: Both points have x-coordinate 4, so they are on the same vertical line. They are 14 - 1 = 13 units apart. Each unit is 3 kilometers, so the distance is 13 x 3 = 39 kilometers.

Key computation (JS): `return (14-1)*3`

Distractors:
- B (12): The student sees 4 in both points, treats it as the number of units, and multiplies by 3. | computation: `return 4*3`
- C (30): The student takes 14 - 4 = 10 (mixing an x with a y) and multiplies by 3. | computation: `return (14-4)*3`
- D (15): The student adds 1 + 14 as "how far" and forgets each unit is 3 kilometers. | computation: `return 1 + 14`

---

## MV2-G56-07

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ms. Diaz draws these eight shapes: a square; a rectangle that is not a square; a rhombus that is not a square; a quadrilateral with two pairs of parallel sides and no right angles; a trapezoid with exactly one pair of parallel sides; a kite that is not a rhombus; a quadrilateral with four right angles; and a triangle. How many of the eight shapes are parallelograms?

A. 2
B. 5
C. 6
D. 1

KEY: B (5)

Worked solution: A parallelogram is a quadrilateral with two pairs of parallel sides. The square, the rectangle, the rhombus, the quadrilateral with two pairs of parallel sides, and the quadrilateral with four right angles (a rectangle) all have two pairs of parallel sides. The trapezoid has only one pair, the kite has none, and the triangle is not a quadrilateral. So 5 shapes are parallelograms.

Key computation (JS): `const shapes = [1,1,1,1,0,0,1,0]; return shapes.reduce((a,b)=>a+b,0)`

Distractors:
- A (2): The student keeps only the rhombus and the quadrilateral with no right angles, the "slanted box" picture of a parallelogram. | computation: `return [0,0,1,1,0,0,0,0].reduce((a,b)=>a+b,0)`
- C (6): The student thinks one pair of parallel sides is enough and adds the trapezoid to the five. | computation: `return [1,1,1,1,1,0,1,0].reduce((a,b)=>a+b,0)`
- D (1): The student counts only the shape described as two pairs of parallel sides, since squares, rectangles and rhombuses "are their own shapes". | computation: `return [0,0,0,1,0,0,0,0].reduce((a,b)=>a+b,0)`

---

## MV2-G78-06

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: An open storage bin (it has a bottom and four sides but nothing on top) is 50 centimeters long, 20 centimeters wide, and 12 centimeters high. Inside, a flat divider stands across the 20-centimeter width, from the floor of the bin up to the rim. The bin and the divider are made of cardboard. How many square centimeters of cardboard are needed for the bin and the divider together?

A. 2680
B. 2080
C. 2920
D. 2520

KEY: C (2920)

Worked solution: Bottom: 50 x 20 = 1000. Long walls: 2 x (50 x 12) = 1200. Short walls: 2 x (20 x 12) = 480. There is no lid. The divider goes across the width, so it is 20 x 12 = 240. Total: 1000 + 1200 + 480 + 240 = 2920 square centimeters.

Key computation (JS): `return 50*20 + 2*(50*12) + 2*(20*12) + 20*12;`

Distractors:
- A (2680): The student finds the open box correctly, 2680, and forgets the cardboard divider. | computation: `return 50*20 + 2*(50*12) + 2*(20*12);`
- B (2080): The student adds one long wall and one short wall, as if a box had two walls: 1000 + 600 + 240 + 240 = 2080. | computation: `return 50*20 + 50*12 + 20*12 + 20*12;`
- D (2520): The student takes the bottom as 50 by 12 instead of 50 by 20: 600 + 1680 + 240 = 2520. | computation: `return 50*12 + 2*(50*12) + 2*(20*12) + 20*12;`

---

## MV2-G56-02

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A tower is made of two boxes that do not overlap. The bottom box is 8 inches long, 8 inches wide, and 5 inches tall. The top box is a cube, and each of its edges is half as long as the length of the bottom box. What is the total volume of the tower, in cubic inches?

A. 336
B. 400
C. 480
D. 384

KEY: D (384)

Worked solution: The bottom box is 8 x 8 x 5 = 320 cubic inches. Each edge of the cube is half of 8, which is 4 inches, so the cube is 4 x 4 x 4 = 64 cubic inches. The tower is 320 + 64 = 384 cubic inches.

Key computation (JS): `const e = 8/2; return 8*8*5 + e*e*e`

Distractors:
- A (336): The student finds 4 x 4 = 16 for the top box and adds it, treating the cube as a flat square. | computation: `return 8*8*5 + 4*4`
- B (400): The student uses 4 by 4 for the cube's bottom but keeps 5 inches tall from the first box: 4 x 4 x 5 = 80. | computation: `return 8*8*5 + 4*4*5`
- C (480): The student halves 320 to get 160 for the cube, not seeing that halving every edge makes the volume 8 times smaller. | computation: `return 8*8*5 + (8*8*5)/2`

---

## MV2-G78-24

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Point P has coordinates (-6, 9). First, P is reflected over the line x = 3, giving point Q. Then Q is reflected over the line x = 14, giving point R. What is the first coordinate (the x-coordinate) of R?

A. 16
B. 5
C. 23
D. 12

KEY: A (16)

Worked solution: P is 9 units left of the line x = 3, so its reflection Q is 9 units right of that line, at x = 12. Q is 2 units left of the line x = 14, so its reflection R is 2 units right of that line, at x = 16. (The y-coordinate stays 9.)

Key computation (JS): `const a = 2*3 - (-6); return 2*14 - a;`

Distractors:
- B (5): The student shifts P right by 14 - 3 = 11: -6 + 11 = 5. | computation: `return -6 + (14 - 3);`
- C (23): The student reflects P across x = 8.5: 2(8.5) + 6 = 23. | computation: `return 2*((3 + 14)/2) - (-6);`
- D (12): The student reflects across x = 3 to get 12 and forgets the second reflection. | computation: `return 2*3 - (-6);`

---

## MV2-G78-07

Area: Geometry | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A storage bin is shaped like a rectangular prism that is 27 centimeters long, 20 centimeters wide, and 13 centimeters tall. A solid cube with edges 10 centimeters long is placed inside the bin. How many cubic centimeters of space inside the bin are not filled by the cube?

A. 6920
B. 6020
C. 6990
D. 6420

KEY: B (6020)

Worked solution: The bin holds 27 x 20 x 13 = 7020 cubic centimeters. The cube takes up 10 x 10 x 10 = 1000 cubic centimeters. The space left is 7020 - 1000 = 6020 cubic centimeters.

Key computation (JS): `return 27*20*13 - 10*10*10;`

Distractors:
- A (6920): The student multiplies only two edges, 10 x 10 = 100, leaving out the third, and subtracts 100: 6920. | computation: `return 27*20*13 - 10*10;`
- C (6990): The student writes 10 cubed as 10 x 3 = 30 and subtracts 30: 6990. | computation: `return 27*20*13 - 10*3;`
- D (6420): The student finds the cube's six faces, 6 x 100 = 600, and subtracts that: 7020 - 600 = 6420. | computation: `return 27*20*13 - 6*10*10;`

---

## MV2-G56-23

Area: Geometry | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: In the coordinate plane, the points (-5, 4) and (-5, -5) are the ends of one side of a square. What is the area of the square, in square units?

A. 25
B. 64
C. 81
D. 36

KEY: C (81)

Worked solution: Both points have x-coordinate -5, so the side is vertical. Its length is 4 - (-5) = 9 units. The area of the square is 9 x 9 = 81 square units.

Key computation (JS): `const s = 4 - (-5); return s*s`

Distractors:
- A (25): The student sees -5 in both points and squares 5. | computation: `return 5*5`
- B (64): Counting 4, 3, 2, 1, -1, -2, -3, -4, -5 and leaving out 0, the student gets a side of 8 and squares it. | computation: `return (4 - (-5) - 1)**2`
- D (36): The student multiplies the side 9 by 4. | computation: `return 4*(4 - (-5))`

---

## MV2-G78-22

Area: Geometry | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A drinking glass is a solid cylinder of glass with a cylinder-shaped space hollowed out of it. The outside of the glass is a cylinder with a radius of 7 centimeters and a height of 12 centimeters. The hollow space is a cylinder with a radius of 6 centimeters and a depth of 10 centimeters. Using 3.14 for pi, what is the volume of the glass itself, in cubic centimeters?

A. 1486.32
B. 1130.4
C. 1657.92
D. 715.92

KEY: D (715.92)

Worked solution: Outside cylinder: 3.14 x 7 x 7 x 12 = 1846.32 cubic cm. Hollow space: 3.14 x 6 x 6 x 10 = 1130.4 cubic cm. Glass: 1846.32 - 1130.4 = 715.92 cubic centimeters.

Key computation (JS): `return Math.round((3.14*7*7*12 - 3.14*6*6*10)*100)/100;`

Distractors:
- A (1486.32): The student subtracts 6 x 6 x 10 = 360 without the 3.14: 1846.32 - 360 = 1486.32. | computation: `return Math.round((3.14*7*7*12 - 6*6*10)*100)/100;`
- B (1130.4): The student computes the inside, 3.14 x 36 x 10 = 1130.4, which is how much the glass holds. | computation: `return Math.round(3.14*6*6*10*100)/100;`
- C (1657.92): The student finds the hollow as 3.14 x 6 x 10 = 188.4: 1846.32 - 188.4 = 1657.92. | computation: `return Math.round((3.14*7*7*12 - 3.14*6*10)*100)/100;`

---

## MV2-G78-03

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Angle 1 and angle 2 are vertical angles. Angle 2 and angle 3 are complementary. Angle 1 measures (3x + 5) degrees, and angle 3 measures (2x + 10) degrees. What is the measure of angle 2, in degrees?

A. 50
B. 15
C. 20
D. 104

KEY: A (50)

Worked solution: Vertical angles are equal, so angle 2 = angle 1 = 3x + 5. Complementary angles add to 90 degrees: (3x + 5) + (2x + 10) = 90, so 5x + 15 = 90, 5x = 75, and x = 15. Angle 2 = 3(15) + 5 = 50 degrees.

Key computation (JS): `const x = (90 - 5 - 10)/5; return 3*x + 5;`

Distractors:
- B (15): The student solves 5x + 15 = 90 correctly and reports x = 15 as the angle. | computation: `return (90 - 5 - 10)/5;`
- C (20): The student sets 3x + 5 = 2x + 10, gets x = 5, and finds angle 2 = 3(5) + 5 = 20. | computation: `const x = 10 - 5; return 3*x + 5;`
- D (104): The student sets (3x + 5) + (2x + 10) = 180, gets x = 33, and finds angle 2 = 104. | computation: `const x = (180 - 15)/5; return 3*x + 5;`

---

## MV2-G56-17

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A patio is drawn on a map in the coordinate plane, with one unit standing for one foot. Going around the patio, its four corners are at (-8, -5), (9, -5), (9, 5), and (2, 5). How many square feet does the patio cover?

A. 135
B. 120
C. 145
D. 140

KEY: B (120)

Worked solution: The bottom side runs from x = -8 to x = 9, so it is 17 feet. The top side runs from x = 2 to x = 9, so it is 7 feet. The right side runs from y = -5 to y = 5, so the height is 10 feet. Split the patio into a rectangle 7 by 10 (70 square feet) and a right triangle with legs 10 and 10 (50 square feet): 70 + 50 = 120 square feet.

Key computation (JS): `const b1 = 9 - (-8), b2 = 9 - 2, h = 5 - (-5); return (b1 + b2) / 2 * h`

Distractors:
- A (135): Starting from the 17-by-10 rectangle, the student takes away a triangle 7 by 10 (35), mixing up the top side with the cut-off corner. | computation: `return (9 - (-8)) * (5 - (-5)) - (9 - 2) * (5 - (-5)) / 2`
- C (145): Starting from the 17-by-10 rectangle (170), the student reads the slanted corner as a triangle 5 by 10 and takes away 25. | computation: `return (9 - (-8)) * (5 - (-5)) - 5 * (5 - (-5)) / 2`
- D (140): The student treats the top side like the bottom one (which crosses zero) and adds 9 + 2 = 11. | computation: `return ((9 - (-8)) + (9 + 2)) / 2 * (5 - (-5))`

---

## MV2-G78-15

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A trophy is made of a solid ball resting on a solid cylinder. The ball has a radius of 3 centimeters. The cylinder has a radius of 5 centimeters and a height of 4 centimeters. Using 3.14 for pi, what is the total volume of the trophy, in cubic centimeters?

A. 238.64
B. 351.68
C. 427.04
D. 398.78

KEY: C (427.04)

Worked solution: Ball: 4/3 x 3.14 x 3 x 3 x 3 = 4/3 x 3.14 x 27 = 113.04 cubic cm. Cylinder: 3.14 x 5 x 5 x 4 = 314 cubic cm. Total: 113.04 + 314 = 427.04 cubic centimeters.

Key computation (JS): `return Math.round(((4/3)*3.14*27 + 3.14*25*4)*100)/100;`

Distractors:
- A (238.64): The student finds 2 x 3.14 x 5 x 4 = 125.6 for the cylinder: 113.04 + 125.6 = 238.64. | computation: `return Math.round(((4/3)*3.14*27 + 2*3.14*5*4)*100)/100;`
- B (351.68): The student uses 4/3 x 3.14 x 9 = 37.68 for the ball: 37.68 + 314 = 351.68. | computation: `return Math.round(((4/3)*3.14*9 + 3.14*25*4)*100)/100;`
- D (398.78): The student finds the ball as 3.14 x 27 = 84.78: 84.78 + 314 = 398.78. | computation: `return Math.round((3.14*27 + 3.14*25*4)*100)/100;`

---

## MV2-G78-14

Area: Geometry | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two poles stand straight up on level ground, 14 meters apart. One pole is 15 meters tall and the other is 6 meters tall. A cable is stretched straight from the top of one pole to the top of the other. How long is the cable, to the nearest tenth of a meter?

A. 15.2
B. 14.3
C. 20.5
D. 16.6

KEY: D (16.6)

Worked solution: Draw a horizontal line from the top of the short pole to the tall pole. It is 14 m long, and it meets the tall pole 15 - 6 = 9 m below its top. The cable is the hypotenuse of a right triangle with legs 14 and 9: the square root of (196 + 81) = the square root of 277, about 16.64. To the nearest tenth, 16.6 meters.

Key computation (JS): `return Math.round(Math.sqrt(14*14 + (15-6)*(15-6))*10)/10;`

Distractors:
- A (15.2): The student uses 6 as the vertical leg: the square root of (196 + 36) = the square root of 232, about 15.2. | computation: `return Math.round(Math.sqrt(14*14 + 6*6)*10)/10;`
- B (14.3): The student finds the 9 m leg but adds 9 instead of 81: the square root of 205, about 14.3. | computation: `return Math.round(Math.sqrt(14*14 + (15-6))*10)/10;`
- C (20.5): The student makes the triangle with legs 14 and 15, as if the cable ran to the foot of the short pole: the square root of 421, about 20.5. | computation: `return Math.round(Math.sqrt(14*14 + 15*15)*10)/10;`

---

## MV2-G56-21

Area: Geometry | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: The reading corner of a classroom has a shelf shaped like a right triangle. The two edges that run along the walls are 9 inches and 12 inches long and meet at a right angle. The front edge is 15 inches long. What is the area of the shelf, in square inches?

A. 54
B. 36
C. 90
D. 108

KEY: A (54)

Worked solution: The two edges along the walls are perpendicular, so they are the base and height. Area = 1/2 x 9 x 12 = 54 square inches.

Key computation (JS): `return 9*12/2`

Distractors:
- B (36): The student adds the three edges 9 + 12 + 15. | computation: `return 9 + 12 + 15`
- C (90): The student multiplies 12 by the 15-inch front edge and halves it, picking the two longest sides. | computation: `return 12*15/2`
- D (108): The student multiplies 9 x 12 as if the shelf were a rectangle. | computation: `return 9*12`
