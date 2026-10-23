# Items for review, KEYED (18)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB2-G5-14

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A game piece starts at the point (13, 4) on a coordinate grid. It moves 5 units up. Next, it moves right twice as many units as it moved up. Then it moves straight down until it reaches the x-axis. Last, it moves left as many units as it just moved down. What is the x-coordinate of the point where the game piece ends?

A. 14
B. 22
C. 11
D. 12

KEY: A (14)

Worked solution: Moving 5 units up from (13, 4) gives (13, 9). Moving right twice 5, which is 10 units, gives (23, 9). Moving straight down to the x-axis is 9 units, giving (23, 0). Moving left 9 units gives (14, 0). The x-coordinate is 14.

Key computation (JS): `var x = 13, y = 4; y = y + 5; x = x + 2 * 5; var down = y; y = 0; x = x - down; return x`

Distractors:
- B (22): The student doubles 9 instead of 5, moves right 18 to x = 31, then left 9, ending at 22. | computation: `var y = 4 + 5; var x = 13 + 2 * y; x = x - y; return x`
- C (11): The student moves right 5 + 2 = 7 to x = 20, then left 9, ending at 11. | computation: `var y = 4 + 5; var x = 13 + (5 + 2); x = x - y; return x`
- D (12): The student moves left 10 to x = 3 and then right 9, ending at 12. | computation: `var y = 4 + 5; var x = 13 - 2 * 5; x = x + y; return x`

---

## MB2-G8-05

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Triangle JKL has angle J = 33 degrees and angle K = (2x + 6) degrees. Side KL is continued in a straight line past L. The angle between that continuation and side LJ measures (5x - 6) degrees. What is the measure, in degrees, of angle JLK inside the triangle?

A. 81
B. 111
C. 166
D. 131

KEY: B (111)

Worked solution: The angle between the continuation of KL and side LJ is an exterior angle at L. An exterior angle of a triangle equals the sum of the two interior angles that are not next to it. So 5x - 6 = 33 + (2x + 6). Then 5x - 6 = 2x + 39, so 3x = 45 and x = 15. The exterior angle at L = 5(15) - 6 = 69 degrees. Angle JLK and the exterior angle form a straight line, so angle JLK = 180 - 69 = 111 degrees. Check: angle K = 2(15) + 6 = 36, and 33 + 36 + 111 = 180.

Key computation (JS): `const x=(33+6+6)/(5-2); const ext=5*x-6; return 180-ext;`

Distractors:
- A (81): The student writes 33 + (2x + 6) + (5x - 6) = 180, gets x = 21 and an exterior angle of 99, then takes 180 - 99 = 81. | computation: `const x=(180-33-6+6)/(5+2); const ext=5*x-6; return 180-ext;`
- C (166): The student sets 5x - 6 equal to angle K alone, 2x + 6, gets x = 4 and an exterior angle of 14, then takes 180 - 14 = 166. | computation: `const x=(6+6)/(5-2); const ext=5*x-6; return 180-ext;`
- D (131): From 5x - 6 = 2x + 39 the student moves the -6 as -6, getting 3x = 33 and x = 11, so the exterior angle is 49 and the inside angle 131. | computation: `const x=(33+6-6)/(5-2); const ext=5*x-6; return 180-ext;`

---

## MB2-G5-03

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Nora has a tissue box with a flat bottom that measures 9 inches by 6 inches, and the box stands 8 inches high. She also has a small gift box with a flat bottom that measures 7 inches by 2 inches, and it stands 3 inches high. Both boxes are rectangular prisms. What is the difference between the volumes of the two boxes, in cubic inches?

A. 200
B. 320
C. 390
D. 270

KEY: C (390)

Worked solution: Tissue box: 9 x 6 x 8 = 432 cubic inches. Gift box: 7 x 2 x 3 = 42 cubic inches. The difference between the volumes is 432 - 42 = 390 cubic inches.

Key computation (JS): `return 9 * 6 * 8 - 7 * 2 * 3`

Distractors:
- A (200): The student finds 54 - 14 = 40 and 8 - 3 = 5 and multiplies, 40 x 5 = 200, which is not a difference of volumes. | computation: `return (9 * 6 - 7 * 2) * (8 - 3)`
- B (320): The student subtracts the bottom areas, 54 - 14 = 40 square inches, and multiplies by 8, as if the gift box were also 8 inches tall. | computation: `return (9 * 6 - 7 * 2) * 8`
- D (270): The student finds how much taller the tissue box is, 8 - 3 = 5 inches, and multiplies by the tissue box's bottom, 9 x 6 = 54. | computation: `return 9 * 6 * (8 - 3)`

---

## MB2-G6-15

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A park map is drawn on a coordinate grid in which each unit stands for 1 meter. A straight path runs from (-6, 3) to (8, 3). Two flower beds are shaped like triangles, and each has the path as one of its sides. The third corner of the first bed is at (3, 17). The third corner of the second bed is at (-1, -2). How many more square meters does the first bed cover than the second bed?

A. 105
B. 91
C. 133
D. 63

KEY: D (63)

Worked solution: The path is the base of both triangles. It runs from x = -6 to x = 8, so its length is 6 + 8 = 14 meters. The height of a triangle is the straight up-and-down distance from its third corner to the line of the path, y = 3. First bed: from y = 3 up to y = 17 is 17 - 3 = 14 meters, so its area is (14 x 14) / 2 = 98 square meters. Second bed: from y = 3 down to y = -2 crosses the x-axis, so the distance is 3 + 2 = 5 meters, and its area is (14 x 5) / 2 = 35 square meters. The difference is 98 - 35 = 63 square meters.

Key computation (JS): `const x1=-6,x2=8,yb=3,yp=17,yq=-2; const b=x2-x1; const A=b*(yp-yb)/2, B=b*(yb-yq)/2; return String(A-B);`

Distractors:
- A (105): The student uses 17 and 2 as the heights, so the areas are 119 and 14 and the difference is 105. | computation: `const x1=-6,x2=8,yp=17,yq=-2; const b=x2-x1; return String(b*yp/2 - b*Math.abs(yq)/2);`
- B (91): For the second bed the student takes the height from y = 3 to y = -2 as 3 - 2 = 1, so that bed's area is 7 and the difference is 98 - 7 = 91. | computation: `const x1=-6,x2=8,yb=3,yp=17,yq=-2; const b=x2-x1; return String(b*(yp-yb)/2 - b*(yb-Math.abs(yq))/2);`
- C (133): The student finds 84 and 30 correctly but combines them as 98 + 35 = 133, the area of the whole four-sided region. | computation: `const x1=-6,x2=8,yb=3,yp=17,yq=-2; const b=x2-x1; return String(b*(yp-yb)/2 + b*(yb-yq)/2);`

---

## MB2-G7B-05

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The distance around a circular flower bed is 50 meters. Using 3.14 for pi, what is the area of the flower bed, to the nearest tenth of a square meter?

A. 199.0
B. 201.0
C. 253.6
D. 190.2

KEY: A (199.0)

Worked solution: The distance around is the circumference, C = 2 x 3.14 x r. So r = 50 / 6.28, which is about 7.9618 meters. Area = 3.14 x r x r = 3.14 x 63.390... = 199.04..., which rounds to 199.0 square meters. (Keep the unrounded radius until the end.)

Key computation (JS): `const r = 50/6.28; return Math.round(3.14*r*r*10)/10;`

Distractors:
- B (201.0): The student rounds 7.96 to 8 and finds 3.14 x 64 = 200.96, so 201.0. | computation: `const r = Math.round(50/6.28); return Math.round(3.14*r*r*10)/10;`
- C (253.6): The student divides 50 by 3.14 to get the diameter 15.92 and squares it: 253.6, the area of the square that just fits around the bed. | computation: `const d = 50/3.14; return Math.round(d*d*10)/10;`
- D (190.2): The student finds r = 50 / 6.28 correctly but then multiplies by 3 instead of 3.14: 3 x 63.39 = 190.2. | computation: `const r = 50/6.28; return Math.round(3*r*r*10)/10;`

---

## MB2-G7B-09

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A flat round metal plate has a diameter of 30 centimeters. Two round holes are cut out of the plate, and each hole has a diameter one-third as long as the diameter of the plate. The holes do not overlap. Using 3.14 for pi, what is the area of the metal that is left, in square centimeters?

A. 628
B. 549.5
C. 1256
D. 675.1

KEY: B (549.5)

Worked solution: Plate: radius 30 / 2 = 15 cm, area 3.14 x 15 x 15 = 706.5 square cm. Each hole has diameter 30 / 3 = 10 cm, so radius 5 cm and area 3.14 x 5 x 5 = 78.5 square cm. Two holes: 2 x 78.5 = 157 square cm. Metal left: 706.5 - 157 = 549.5 square centimeters.

Key computation (JS): `const R = 30/2, r = (30/3)/2; return Math.round((3.14*R*R - 2*3.14*r*r)*10)/10;`

Distractors:
- A (628): The student removes one 78.5 hole: 706.5 - 78.5 = 628. | computation: `const R = 30/2, r = (30/3)/2; return Math.round((3.14*R*R - 3.14*r*r)*10)/10;`
- C (1256): The student writes the plate as 3.14 x 30 x 30 / 2 = 1413 instead of 3.14 x 15 x 15 = 706.5, then removes the two correct holes (157): 1413 - 157 = 1256. | computation: `const d = 30, r = (30/3)/2; return Math.round((3.14*d*d/2 - 2*3.14*r*r)*10)/10;`
- D (675.1): The student finds each hole as 3.14 x 5 = 15.7 and removes 31.4: 706.5 - 31.4 = 675.1. | computation: `const R = 30/2, r = (30/3)/2; return Math.round((3.14*R*R - 2*3.14*r)*10)/10;`

---

## MB2-G5-07

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A box shaped like a rectangular prism is 7 inches long, 6 inches wide, and 12 inches tall. It is filled with sand up to 2 inches below its rim, and the sand is level. Ravi digs a hole straight down into the sand from its surface and takes out all the sand from the hole. The hole is shaped like a rectangular prism with a square opening 5 inches on each side, and its flat bottom is 4 inches above the floor of the box. What is the volume of the sand left in the box, in cubic inches?

A. 354
B. 320
C. 270
D. 360

KEY: C (270)

Worked solution: The sand is 12 - 2 = 10 inches deep, so before the hole there are 7 x 6 x 10 = 420 cubic inches of sand. The hole goes from the sand's surface down to 4 inches above the floor, so it is 10 - 4 = 6 inches deep. Its opening is 5 x 5 = 25 square inches, so the hole is 25 x 6 = 150 cubic inches. The sand left is 420 - 150 = 270 cubic inches.

Key computation (JS): `return 7 * 6 * (12 - 2) - 5 * 5 * ((12 - 2) - 4)`

Distractors:
- A (354): The student finds 7 x 6 x 12 = 504 for the sand, as if the box were full, then subtracts the correct hole: 504 - 150 = 354. | computation: `return 7 * 6 * 12 - 5 * 5 * ((12 - 2) - 4)`
- B (320): The hole is 10 - 4 = 6 inches deep, but the student uses the printed 4, removes 5 x 5 x 4 = 100, and gets 420 - 100 = 320. | computation: `return 7 * 6 * (12 - 2) - 5 * 5 * 4`
- D (360): The student doubles the side of the square, 5 x 2 = 10 square inches, so the hole is 10 x 6 = 60 instead of 150, and gets 420 - 60 = 360. | computation: `return 7 * 6 * (12 - 2) - (5 * 2) * ((12 - 2) - 4)`

---

## MB2-G7B-11

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A garden bed is made of two parts that share one 16-foot edge and do not overlap. One part is a quarter circle with a radius of 16 feet; one of its two straight edges is the shared edge. The other part is a triangle whose base is the shared 16-foot edge. The triangle's other two sides are each 10 feet long, and its top corner is 6 feet from the base. Using 3.14 for pi, what is the area of the garden bed, in square feet?

A. 280.96
B. 224.96
C. 296.96
D. 248.96

KEY: D (248.96)

Worked solution: Quarter circle: one-fourth of 3.14 x 16 x 16 = 1/4 x 803.84 = 200.96 square feet. Triangle: base 16 and height 6 (the distance from the top corner to the base), so 1/2 x 16 x 6 = 48 square feet. The 10-foot sides are slanted and are not the height. Total: 200.96 + 48 = 248.96 square feet.

Key computation (JS): `return Math.round((3.14*16*16/4 + 16*6/2)*100)/100;`

Distractors:
- A (280.96): The student finds the triangle as 1/2 x 16 x 10 = 80 and adds 200.96: 280.96. | computation: `return Math.round((3.14*16*16/4 + 16*10/2)*100)/100;`
- B (224.96): The student uses half the base, 8, with the height 6: 1/2 x 8 x 6 = 24, and adds 200.96: 224.96. | computation: `return Math.round((3.14*16*16/4 + (16/2)*6/2)*100)/100;`
- C (296.96): The student finds the triangle as 16 x 6 = 96 and adds 200.96: 296.96. | computation: `return Math.round((3.14*16*16/4 + 16*6)*100)/100;`

---

## MB2-G6-08

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A school garden is drawn on a coordinate grid in which each unit stands for 1 meter. The garden is a rectangle. Its bottom edge runs from (-3, 5) to (10, 5), and the rest of the garden lies above this edge. The area of the garden is 182 square meters. How many meters of fence are needed to go all the way around the garden?

A. 54
B. 40
C. 66
D. 82

KEY: A (54)

Worked solution: The bottom edge goes from x = -3 to x = 10. These are on opposite sides of the y-axis, so its length is 3 + 10 = 13 meters. The area of a rectangle is length times width, so the other side is 182 / 13 = 14 meters. The fence goes around all four sides: 13 + 14 + 13 + 14 = 54 meters.

Key computation (JS): `const x1=-3,x2=10,A=182; const w=x2-x1; const h=A/w; return String(2*(w+h));`

Distractors:
- B (40): The student finds 13 and 14 correctly but adds 13 + 13 + 14 = 40, leaving one 14-meter side out of the fence. | computation: `const x1=-3,x2=10,A=182; const w=x2-x1; const h=A/w; return String(2*w+h);`
- C (66): The student ignores the negative sign and takes the bottom edge as 10 - 3 = 7, so the other side becomes 182 / 7 = 26 and the perimeter 2 x (7 + 26) = 66. | computation: `const x1=-3,x2=10,A=182; const w=Math.abs(x2)-Math.abs(x1); const h=A/w; return String(2*(w+h));`
- D (82): Fresh from triangle work, the student solves 182 = (1/2)(13)h, gets h = 28, and the perimeter 2 x (13 + 28) = 82. | computation: `const x1=-3,x2=10,A=182; const w=x2-x1; const h=2*A/w; return String(2*(w+h));`

---

## MB2-G5-06

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On a warehouse floor map drawn on a coordinate grid, each unit is 1 meter. A delivery robot starts at the point (2, 3). It drives straight up to the point (2, 22), then turns around and drives straight back down to the point (2, 15). Then it drives straight right to the point (14, 15). How many meters does the robot drive in all?

A. 31
B. 38
C. 50
D. 46

KEY: B (38)

Worked solution: Up from (2, 3) to (2, 22) is 22 - 3 = 19 meters. Back down from (2, 22) to (2, 15) is 22 - 15 = 7 meters. Right from (2, 15) to (14, 15) is 14 - 2 = 12 meters. In all, the robot drives 19 + 7 + 12 = 38 meters.

Key computation (JS): `return (22 - 3) + (22 - 15) + (14 - 2)`

Distractors:
- A (31): The student sees that the robot covered part of the line twice and adds only the climb and the drive right, 19 + 12 = 31. | computation: `return (22 - 3) + (14 - 2)`
- C (50): The student counts the drive down as the full 19 meters it climbed, 19 + 19 + 12 = 50. | computation: `return (22 - 3) + (22 - 3) + (14 - 2)`
- D (46): The robot stops at y = 15, and the student counts 15 meters for the drive down instead of 22 - 15 = 7: 19 + 15 + 12 = 46. | computation: `return (22 - 3) + 15 + (14 - 2)`

---

## MB2-G7A-11

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: An isosceles triangle has a perimeter of 87 centimeters. One of its sides is 27 centimeters longer than another of its sides. How long is the longest side of the triangle, in centimeters?

A. 47
B. 30
C. 38
D. 33

KEY: C (38)

Worked solution: Two sides are equal, so either the two equal sides are the longer ones or the odd side is the longer one. Case 1: sides s, s + 27 and s + 27. Then 3s + 54 = 87, so s = 11 and the sides are 11, 38 and 38. Check: 11 + 38 > 38, so this triangle exists. Case 2: sides t, t and t + 27. Then 3t + 27 = 87, so t = 20 and the sides would be 20, 20 and 47. But 20 + 20 = 40 is less than 47, so these sides cannot make a triangle. The triangle is 11, 38, 38, and its longest side is 38 centimeters.

Key computation (JS): `const s=(87-54)/3; return s+27;`

Distractors:
- A (47): The student makes the odd side the longer one: t + t + (t + 27) = 87 gives t = 20 and a longest side of 47, without noticing 20 + 20 < 47. | computation: `const t=(87-27)/3; return t+27;`
- B (30): With a 27-cm base, the equal sides are (87 - 27) / 2 = 30 each, so the student reports 30. | computation: `return (87-27)/2;`
- D (33): From s + (s + 27) + (s + 27) = 87 the student gets 3s = 87 - 54 = 33 and gives 33 as the side. | computation: `return 87-2*27;`

---

## MB2-G7A-04

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: An architect made a scale drawing of a school gym using the scale 3 centimeters = 8 meters. Later she made a new, larger drawing of the same gym using the scale 7 centimeters = 10 meters. The real gym is 48 meters long. How many centimeters longer is the length of the gym on the new drawing than on the first drawing?

A. 24
B. 19.2
C. 27.6
D. 15.6

KEY: D (15.6)

Worked solution: First drawing: 48 meters is 48 / 8 = 6 groups of 8 meters, and each group is 3 cm, so the length is 6 x 3 = 18 cm. New drawing: 48 meters is 48 / 10 = 4.8 groups of 10 meters, and each group is 7 cm, so the length is 4.8 x 7 = 33.6 cm. Difference: 33.6 - 18 = 15.6 centimeters.

Key computation (JS): `return Math.round((48/10*7 - 48/8*3)*10)/10;`

Distractors:
- A (24): The student says the new drawing uses 7 cm where the old one used 3 cm, so 18 x 7/3 = 42 cm; 42 - 18 = 24. | computation: `return Math.round((48/8*3*7/3 - 48/8*3)*10)/10;`
- B (19.2): The student pairs 3 cm with 10 m for the first drawing: 48 / 10 x 3 = 14.4 cm; 33.6 - 14.4 = 19.2. | computation: `return Math.round((48/10*7 - 48/10*3)*10)/10;`
- C (27.6): The student divides 48 by 8 and stops, so the first drawing is 6 cm instead of 18 cm; 33.6 - 6 = 27.6. | computation: `return Math.round((48/10*7 - 48/8)*10)/10;`

---

## MB2-G7A-06

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Three angles, angle J, angle K, and angle L, are adjacent and together form a straight angle. Angle J measures 42 degrees, angle K measures (x + 10) degrees, and angle L measures (2x - 13) degrees. What is the measure of angle L, in degrees?

A. 81
B. 109
C. 77
D. 57

KEY: A (81)

Worked solution: The three angles make a straight angle, so 42 + (x + 10) + (2x - 13) = 180. Combine: 3x + 39 = 180, so 3x = 141 and x = 47. Angle L = 2(47) - 13 = 94 - 13 = 81 degrees. Check: angle K = 57, and 42 + 57 + 81 = 180.

Key computation (JS): `const x=(180-42-10+13)/3; return 2*x-13;`

Distractors:
- B (109): x + 10 + 2x - 13 = 180 gives 3x = 183, x = 61, and angle L = 109. | computation: `const x=(180+3)/3; return 2*x-13;`
- C (77): After subtracting 42 the student has 3x - 3 = 138 and writes 3x = 138 - 3 = 135, so x = 45 and angle L = 77. | computation: `const x=(180-42-3)/3; return 2*x-13;`
- D (57): x = 47 is right, but the student substitutes into x + 10 and reports 57. | computation: `const x=(180-42-10+13)/3; return x+10;`

---

## MB2-G7A-09

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two lines cross at point P. Angle J and angle K are vertical angles at P. Angle J measures (5x + 3) degrees and angle K measures (3x + 17) degrees. At a different point, Q, angle M and angle N are adjacent angles whose outer sides form a straight line. Angle M measures (2y + 14) degrees and angle N measures (3y - 19) degrees. How many degrees larger is angle N than angle J?

A. 39
B. 54
C. 42
D. 50

KEY: B (54)

Worked solution: Vertical angles are equal: 5x + 3 = 3x + 17, so 2x = 14 and x = 7. Angle J = 5(7) + 3 = 38 degrees. Angles M and N form a straight line, so they add to 180: (2y + 14) + (3y - 19) = 180, so 5y - 5 = 180, 5y = 185 and y = 37. Angle N = 3(37) - 19 = 92 degrees. Angle N is 92 - 38 = 54 degrees larger than angle J.

Key computation (JS): `const x=(17-3)/(5-3); const J=5*x+3; const y=(180-14+19)/5; const N=3*y-19; return N-J;`

Distractors:
- A (39): 5x + 3 = 3x + 17 becomes 2x = 17 + 3 = 20, so x = 10 and angle J = 53; 92 - 53 = 39. | computation: `const x=(17+3)/(5-3); const J=5*x+3; const y=(180-14+19)/5; return 3*y-19-J;`
- C (42): The student sets 2y + 14 = 3y - 19, gets y = 33 and angle N = 80; 80 - 38 = 42. | computation: `const x=(17-3)/2; const J=5*x+3; const y=(14+19)/(3-2); return 3*y-19-J;`
- D (50): y = 37 is right, but 2(37) + 14 = 88 is angle M; 88 - 38 = 50. | computation: `const x=(17-3)/2; const J=5*x+3; const y=(180-14+19)/5; return 2*y+14-J;`

---

## MB2-G7B-04

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A school running track has an inside edge made of two straight sides, each 85 meters long, and two half-circle ends. Along the inside edge, each half-circle end has a diameter of 76 meters. The track is 10 meters wide all the way around. A fence shaped like a rectangle goes around the track, and each of its four sides just touches the outside edge of the track. How many meters longer is the fence than one lap along the inside edge of the track? Use 3.14 for pi.

A. 82.56
B. 49.36
C. 145.36
D. 105.36

KEY: C (145.36)

Worked solution: Inside lap: the two half-circle ends make one whole circle with diameter 76, so the curved part is 3.14 x 76 = 238.64 meters. One inside lap is 85 + 85 + 238.64 = 408.64 meters. Fence: the outside edge is 10 meters farther out on every side, so the outside half-circles have diameter 76 + 10 + 10 = 96 meters. The fence is 96 meters wide, and its length is the straight side plus a half-circle radius of 48 meters at each end: 85 + 48 + 48 = 181 meters. Fence length all the way around: 181 + 96 + 181 + 96 = 554 meters. Difference: 554 - 408.64 = 145.36 meters.

Key computation (JS): `const lap = 2*85 + 3.14*76; const D = 76 + 2*10; const fence = 2*(85 + D) + 2*D; return Math.round((fence - lap)*100)/100;`

Distractors:
- A (82.56): The student uses the outside diameter 96 for the lap: 170 + 301.44 = 471.44, so 554 - 471.44 = 82.56. | computation: `const D = 76 + 2*10; const lapOut = 2*85 + 3.14*D; const fence = 2*(85 + D) + 2*D; return Math.round((fence - lapOut)*100)/100;`
- B (49.36): The student adds 181 + 96 + 181 = 458 for the fence, leaving out one 96-meter end, so 458 - 408.64 = 49.36. | computation: `const lap = 2*85 + 3.14*76; const D = 76 + 2*10; const fence3 = 2*(85 + D) + D; return Math.round((fence3 - lap)*100)/100;`
- D (105.36): The student makes the fence 85 + 76 + 10 = 171 by 76 + 10 = 86, a perimeter of 514, so 514 - 408.64 = 105.36. | computation: `const lap = 2*85 + 3.14*76; const fence = 2*(85 + 76 + 10) + 2*(76 + 10); return Math.round((fence - lap)*100)/100;`

---

## MB2-G5-05

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A wooden block for a toy stairway starts as a rectangular prism 11 inches long, 5 inches wide, and 8 inches tall. A box-shaped notch is cut out of one top corner, all the way across the width of the block, so the side of the block is shaped like an L. After the cut, the tall part of the block is 4 inches long, and the low step is 3 inches tall. What is the volume of the block after the cut, in cubic inches?

A. 405
B. 325
C. 340
D. 265

KEY: D (265)

Worked solution: The notch is 11 - 4 = 7 inches long, 5 inches wide, and 8 - 3 = 5 inches deep, so it is 7 x 5 x 5 = 175 cubic inches. The block before the cut was 11 x 5 x 8 = 440 cubic inches. 440 - 175 = 265 cubic inches. Check by splitting the L into two boxes: the tall part is 4 x 5 x 8 = 160 and the low step is 7 x 5 x 3 = 105, and 160 + 105 = 265.

Key computation (JS): `return 11 * 5 * 8 - (11 - 4) * 5 * (8 - 3)`

Distractors:
- A (405): The student subtracts only 7 x 5 = 35 for the notch (its side), leaving out the 5-inch width, and gets 440 - 35 = 405. | computation: `return 11 * 5 * 8 - (11 - 4) * (8 - 3)`
- B (325): The student adds the tall part, 4 x 5 x 8 = 160, to a low step measured along the whole 11 inches, 11 x 5 x 3 = 165, so the 4 x 5 x 3 piece under the tall part is in both boxes. | computation: `return 4 * 5 * 8 + 11 * 5 * 3`
- C (340): The notch is 11 - 4 = 7 inches long, but the student uses the printed 4, removes 4 x 5 x 5 = 100, and gets 440 - 100 = 340. | computation: `return 11 * 5 * 8 - 4 * 5 * (8 - 3)`

---

## MB2-G5-12

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two flower vases are each shaped like a rectangular prism, and each one holds 1,170 cubic centimeters of water when full. The bottom of vase A is 10 centimeters by 3 centimeters. The bottom of vase B is 13 centimeters by 5 centimeters. How many centimeters taller is vase A than vase B?

A. 21
B. 35
C. 25
D. 27

KEY: A (21)

Worked solution: Vase A: its bottom is 10 x 3 = 30 square centimeters, so its height is 1,170 / 30 = 39 centimeters. Vase B: its bottom is 13 x 5 = 65 square centimeters, so its height is 1,170 / 65 = 18 centimeters. Vase A is 39 - 18 = 21 centimeters taller.

Key computation (JS): `return 1170 / (10 * 3) - 1170 / (13 * 5)`

Distractors:
- B (35): The student finds 65 - 30 = 35 square centimeters, how much bigger vase B's bottom is, and gives that as the difference in height. | computation: `return 13 * 5 - 10 * 3`
- C (25): The student uses 10 + 3 = 13 and 13 + 5 = 18 as the bottoms, so the heights come out 90 and 65, and 90 - 65 = 25. | computation: `return 1170 / (10 + 3) - 1170 / (13 + 5)`
- D (27): The student divides 1,170 by the lengths only, 1,170 / 10 = 117 and 1,170 / 13 = 90, and subtracts: 117 - 90 = 27. | computation: `return 1170 / 10 - 1170 / 13`

---

## MB2-G5-01

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: On a hiking map drawn on a coordinate grid, every 2 units stand for 3 kilometers. A ranger station is at the point (10, 14), and a waterfall is at the point (10, 32). How many kilometers apart are the ranger station and the waterfall?

A. 12
B. 27
C. 48
D. 33

KEY: B (27)

Worked solution: Both points have the same x-coordinate, 10, so they lie on the same up-and-down grid line. The distance between them is the difference of the y-coordinates: 32 - 14 = 18 units. Every 2 units stand for 3 kilometers, and 18 units is 18 / 2 = 9 groups of 2 units. 9 x 3 = 27, so the ranger station and the waterfall are 27 kilometers apart.

Key computation (JS): `return (32 - 14) / 2 * 3`

Distractors:
- A (12): The student finds 18 units correctly but divides by 3 and multiplies by 2, as if every 3 units stood for 2 km, and gets 12. | computation: `return (32 - 14) / 3 * 2`
- C (48): The student scales only the waterfall's y-coordinate, 32 units, to 48 km, as if the trip started on the x-axis rather than at (10, 14). | computation: `return 32 / 2 * 3`
- D (33): The student sees 10 at the front of both points, takes 32 - 10 = 22 units, and scales 22 units to 33 km. | computation: `return (32 - 10) / 2 * 3`
