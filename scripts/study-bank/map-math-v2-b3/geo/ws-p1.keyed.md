# Items for review, KEYED (23)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB3-G6-01

Area: Geometry | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Leo cut out a net that folds into a closed box shaped like a cube. The net is made of six squares, and each square is 1 1/4 inches long on each side. What is the surface area of the box, in square inches?

A. 9 3/8
B. 6 3/8
C. 30
D. 15

KEY: A (9 3/8)

Worked solution: The surface area is the total area of the six squares in the net. One square has area 1 1/4 x 1 1/4 = 5/4 x 5/4 = 25/16 square inches. Six squares: 6 x 25/16 = 150/16 = 9 3/8 square inches.

Key computation (JS): `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const n=5,d=4;return mx(6*n*n,d*d);`

Distractors:
- B (6 3/8): The student squares 1 1/4 as 1 x 1 + 1/4 x 1/4 = 1 1/16, dropping the two cross terms, then multiplies by 6 to get 6 3/8. | computation: `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const fn=1*16+1,fd=16;return mx(6*fn,fd);`
- C (30): The student uses each square's perimeter, 4 x 1 1/4 = 5, as if it were the area, and then 6 x 5 = 30. | computation: `const e=1.25;return String(6*(4*e));`
- D (15): The student finds a square's area as 2 x 1 1/4 = 2 1/2, treating squaring as doubling, and then 6 x 2 1/2 = 15. | computation: `const e=1.25;return String(6*(2*e));`

---

## MB3-G7-04

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A planter box is shaped like a prism that is 15 inches long. Each end of the box is a trapezoid. The two parallel sides of each trapezoid are 6 inches and 16 inches long, and the distance between them is 5 inches. What is the volume of the planter box, in cubic inches?

A. 1050
B. 825
C. 1200
D. 750

KEY: B (825)

Worked solution: Area of one trapezoid end: (6 + 16) / 2 x 5 = 11 x 5 = 55 square inches. Volume of the prism: base area x length = 55 x 15 = 825 cubic inches.

Key computation (JS): `return (6+16)/2*5*15;`

Distractors:
- A (1050): Computes 6 + 16 / 2 = 14 instead of (6 + 16) / 2 = 11, so the end area is 70. | computation: `return (6+16/2)*5*15;`
- C (1200): Uses 16 x 5 = 80 for the end area, ignoring that the top is shorter. | computation: `return 16*5*15;`
- D (750): Takes the difference 16 - 6 = 10 as the trapezoid's width, so the end area is 10 x 5 = 50. | computation: `return (16-6)*5*15;`

---

## MB3-G7-01

Area: Geometry | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A floor plan of a classroom uses the scale 3 centimeters = 5 meters. On the floor plan, the classroom is a rectangle 12 centimeters long and 4.5 centimeters wide. What is the actual area of the classroom, in square meters?

A. 1350
B. 270
C. 150
D. 90

KEY: C (150)

Worked solution: Every 3 centimeters on the plan stand for 5 meters. The length 12 cm is 4 groups of 3 cm, so it stands for 4 x 5 = 20 meters. The width 4.5 cm is 1.5 groups of 3 cm, so it stands for 1.5 x 5 = 7.5 meters. The actual area is 20 x 7.5 = 150 square meters.

Key computation (JS): `const L=12*5/3, W=4.5*5/3; return L*W;`

Distractors:
- A (1350): Multiplies each length by 5 (60 m and 22.5 m) and multiplies, never dividing by 3. | computation: `return (12*5)*(4.5*5);`
- B (270): Finds the plan's area 54 and multiplies by 5, reading the scale as 1 square cm of plan = 5 square meters. | computation: `return 12*4.5*5;`
- D (90): Finds the plan's area 12 x 4.5 = 54 square cm and multiplies by 5/3 once, as if area scaled like length. | computation: `return 12*4.5*5/3;`

---

## MB3-G8-04

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A glass tube used in a science lab is shaped like a cylinder. Its inside diameter is 1.8 centimeters, and it holds 55 cubic centimeters of liquid when it is full. Using 3.14 for pi, what is the inside height of the tube, to the nearest tenth of a centimeter?

A. 18.3
B. 19.5
C. 9.7
D. 21.6

KEY: D (21.6)

Worked solution: The radius is half the diameter: 1.8 / 2 = 0.9 cm. The base area is pi x r^2 = 3.14 x 0.9 x 0.9 = 2.5434 square centimeters. Volume = base area x height, so the height is 55 / 2.5434, which is about 21.6 cm.

Key computation (JS): `const r = 1.8 / 2; const h = 55 / (3.14 * r * r); return (Math.round(h * 10) / 10).toFixed(1);`

Distractors:
- A (18.3): The student rounds 2.5434 square centimeters to 3 to make the division easier, and 55 / 3 is about 18.3. | computation: `const base = Math.round(3.14 * 0.9 * 0.9); return (Math.round(55 / base * 10) / 10).toFixed(1);`
- B (19.5): The student uses 3.14 x 0.9 = 2.826 for the base area and divides: 55 / 2.826 is about 19.5. | computation: `const r = 1.8 / 2; return (Math.round(55 / (3.14 * r) * 10) / 10).toFixed(1);`
- C (9.7): The student mixes up the circle formulas, divides 55 by 3.14 x 1.8 = 5.652, and gets about 9.7. | computation: `return (Math.round(55 / (3.14 * 1.8) * 10) / 10).toFixed(1);`

---

## MB3-G5-01

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Maria draws the bottom of a jewelry box on a coordinate grid where each unit stands for 1 inch. The bottom is the rectangle with corners at (2, 1), (9, 1), (9, 4), and (2, 4). The box is shaped like a rectangular prism and is 5 inches tall. What is the volume of the box, in cubic inches?

A. 105
B. 45
C. 160
D. 275

KEY: A (105)

Worked solution: The bottom goes from x = 2 to x = 9, so it is 9 - 2 = 7 inches long. It goes from y = 1 to y = 4, so it is 4 - 1 = 3 inches wide. Volume = length x width x height = 7 x 3 x 5 = 105 cubic inches.

Key computation (JS): `const L = 9 - 2, W = 4 - 1, H = 5; return L * W * H;`

Distractors:
- B (45): Finds the 3-inch side and uses it twice, as if the bottom were a square: 3 x 3 x 5 = 45. | computation: `const s = Math.min(9 - 2, 4 - 1); return s * s * 5;`
- C (160): Counts the grid points 2, 3, ..., 9 (8 of them) and 1, 2, 3, 4 (4 of them): 8 x 4 x 5 = 160. | computation: `return (9 - 2 + 1) * (4 - 1 + 1) * 5;`
- D (275): Adds 2 + 9 = 11 and 1 + 4 = 5 for the sides: 11 x 5 x 5 = 275. | computation: `return (2 + 9) * (1 + 4) * 5;`

---

## MB3-G6-07

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A park map is drawn in the coordinate plane, and each unit stands for 1 meter. A straight fence runs from (7, -3) to (7, 24). A straight path runs from (-9, -5) to (4, -5). How many meters longer is the fence than the path?

A. 40
B. 14
C. 20
D. 16

KEY: B (14)

Worked solution: The fence is vertical: from y = -3 to y = 24 is 3 + 24 = 27 meters. The path is horizontal: from x = -9 to x = 4 is 9 + 4 = 13 meters. The fence is 27 - 13 = 14 meters longer.

Key computation (JS): `const V=Math.abs(24-(-3)),H=Math.abs(4-(-9));return String(V-H);`

Distractors:
- A (40): The student finds 27 and 13 correctly and adds them, 27 + 13 = 40. | computation: `const V=24+3,H=9+4;return String(V+H);`
- C (20): The student counts the fence from 0 to 24 and the path from 0 to 4, so 24 - 4 = 20. | computation: `return String(24-4);`
- D (16): The student finds the fence as 24 - 3 = 21 and the path as 9 - 4 = 5, then 21 - 5 = 16. | computation: `const V=24-3,H=9-4;return String(V-H);`

---

## MB3-G6-02

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A block of clay is shaped like a rectangular prism that is 5 centimeters wide, 8 centimeters long, and 25 centimeters tall. Mai reshapes all of the clay into a cube, so the cube has the same volume as the prism. How many square centimeters less surface area does the cube have than the prism?

A. 330
B. 280
C. 130
D. 670

KEY: C (130)

Worked solution: Volume of the prism: 5 x 8 x 25 = 1,000 cubic cm, so the cube's edge is 10 cm (10 x 10 x 10 = 1,000). Prism surface area: 2 x (5 x 8 + 5 x 25 + 8 x 25) = 2 x (40 + 125 + 200) = 730 square cm. Cube surface area: 6 x 10 x 10 = 600 square cm. Difference: 730 - 600 = 130 square cm.

Key computation (JS): `const l=5,w=8,h=25;const A=2*(l*w+l*h+w*h);const e=Math.round(Math.cbrt(l*w*h));return String(A-6*e*e);`

Distractors:
- A (330): The student finds the cube's surface area as 4 x 100 = 400, leaving out the top and bottom, and 730 - 400 = 330. | computation: `const l=5,w=8,h=25;const A=2*(l*w+l*h+w*h);return String(A-4*10*10);`
- B (280): The student counts the top and bottom (5 x 8) twice but takes all four side faces as 8 x 25, getting 880 for the prism, and 880 - 600 = 280. | computation: `const l=5,w=8,h=25;const A=2*l*w+4*w*h;return String(A-6*10*10);`
- D (670): The student writes the cube's surface area as 6 x 10 = 60 instead of 6 x 10 x 10, and 730 - 60 = 670. | computation: `const l=5,w=8,h=25;const A=2*(l*w+l*h+w*h);return String(A-6*10);`

---

## MB3-G5-06

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Two rectangular gardens are drawn on a coordinate grid where each unit stands for 1 meter. Garden A has corners at (3, 1), (24, 1), (24, 3), and (3, 3). Garden B has corners at (4, 5), (9, 5), (9, 9), and (4, 9). A fence goes all the way around each garden. How many more meters of fence does Garden A need than Garden B?

A. 22
B. 12
C. 18
D. 28

KEY: D (28)

Worked solution: Garden A is 24 - 3 = 21 meters long and 3 - 1 = 2 meters wide, so its perimeter is 21 + 2 + 21 + 2 = 46 meters. Garden B is 9 - 4 = 5 meters long and 9 - 5 = 4 meters wide, so its perimeter is 5 + 4 + 5 + 4 = 18 meters. Garden A needs 46 - 18 = 28 more meters of fence.

Key computation (JS): `const pA = 2 * ((24 - 3) + (3 - 1)), pB = 2 * ((9 - 4) + (9 - 5)); return pA - pB;`

Distractors:
- A (22): Finds the areas 21 x 2 = 42 and 5 x 4 = 20: 42 - 20 = 22. | computation: `return (24 - 3) * (3 - 1) - (9 - 4) * (9 - 5);`
- B (12): Adds 21 + 2 + 2 = 25 for A and 5 + 4 + 4 = 13 for B: 25 - 13 = 12. | computation: `const a = (24 - 3) + 2 * (3 - 1), b = (9 - 4) + 2 * (9 - 5); return a - b;`
- C (18): Treats A as 24 by 3 (perimeter 54) and B as 9 by 9 (perimeter 36): 54 - 36 = 18. | computation: `return 2 * (24 + 3) - 2 * (9 + 9);`

---

## MB3-G7-08

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A carpenter makes a stand to hold a round pipe. The stand is a wooden block 12 centimeters long with a half-circle groove cut along its whole length. Each end of the stand is the same shape: a rectangle with a half-circle cut out of the middle of its top edge. The half-circle has a diameter of 18 centimeters. The rectangle is just wide enough to leave 2 centimeters of wood on each side of the half-circle, and just tall enough to leave 1.5 centimeters of wood below the bottom of the half-circle. Using 3.14 for pi, what is the volume of the wood in the stand, in cubic centimeters?

A. 1245.96
B. 2432.88
C. 849.96
D. 993.96

KEY: A (1245.96)

Worked solution: The rectangle is 18 + 2 + 2 = 22 cm wide. The half-circle's radius is 18 / 2 = 9 cm, so the rectangle is 9 + 1.5 = 10.5 cm tall. Rectangle area: 22 x 10.5 = 231 square cm. Half-circle area: 3.14 x 9 x 9 / 2 = 127.17 square cm. End area: 231 - 127.17 = 103.83 square cm. Volume: 103.83 x 12 = 1245.96 cubic centimeters.

Key computation (JS): `const W=18+2*2, H=18/2+1.5; return Math.round((W*H-3.14*9*9/2)*12*100)/100;`

Distractors:
- B (2432.88): Subtracts 3.14 x 9 = 28.26 (half the circumference) instead of 127.17 square cm. | computation: `const W=18+2*2, H=18/2+1.5; return Math.round((W*H-3.14*9)*12*100)/100;`
- C (849.96): Uses a height of 9 cm instead of 9 + 1.5 = 10.5 cm. | computation: `const W=18+2*2, H=18/2; return Math.round((W*H-3.14*9*9/2)*12*100)/100;`
- D (993.96): Uses a width of 18 + 2 = 20 cm instead of 22 cm. | computation: `const W=18+2, H=18/2+1.5; return Math.round((W*H-3.14*9*9/2)*12*100)/100;`

---

## MB3-G5-07

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A toy maker packs 2-centimeter cubes into a box shaped like a rectangular prism. The inside of the box is 20 centimeters long, 16 centimeters wide, and 24 centimeters tall. The cubes fill the box with no gaps. How many 2-centimeter cubes are in the box?

A. 120
B. 960
C. 30
D. 160

KEY: B (960)

Worked solution: Along the length, 20 / 2 = 10 cubes fit. Along the width, 16 / 2 = 8 cubes fit. Along the height, 24 / 2 = 12 cubes fit. Number of cubes = 10 x 8 x 12 = 960.

Key computation (JS): `return (20 / 2) * (16 / 2) * (24 / 2);`

Distractors:
- A (120): Divides each edge by 4: 5 x 4 x 6 = 120. | computation: `return (20 / 4) * (16 / 4) * (24 / 4);`
- C (30): Finds 10, 8 and 12 cubes along the edges and adds them: 30. | computation: `return 20 / 2 + 16 / 2 + 24 / 2;`
- D (160): Finds the bottom's area 20 x 16 = 320 and divides by 2: 160. | computation: `return 20 * 16 / 2;`

---

## MB3-G5-05

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Carlos builds a wooden storage box shaped like a rectangular prism. The bottom of the box is a rectangle with a perimeter of 72 inches, and one side of the bottom is 8 inches long. The box is 3 inches tall. What is the volume of the box, in cubic inches?

A. 192
B. 216
C. 672
D. 768

KEY: C (672)

Worked solution: The bottom has two sides of 8 inches and two equal sides of unknown length. 72 - 8 - 8 = 56, and 56 / 2 = 28, so the bottom is 8 inches by 28 inches. Volume = 8 x 28 x 3 = 672 cubic inches.

Key computation (JS): `const w = (72 - 2 * 8) / 2; return 8 * w * 3;`

Distractors:
- A (192): Takes the bottom as 8 by 8: 8 x 8 x 3 = 192. | computation: `return 8 * 8 * 3;`
- B (216): Multiplies 72 by the height: 72 x 3 = 216. | computation: `return 72 * 3;`
- D (768): Finds (72 - 8) / 2 = 32 for the other side: 8 x 32 x 3 = 768. | computation: `const w = (72 - 8) / 2; return 8 * w * 3;`

---

## MB3-G5-03

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Box A is 8 centimeters long, 7 centimeters wide, and 10 centimeters tall. Box B has the same width and the same height as Box A, but it is 2 centimeters longer. Both boxes can be filled exactly with 1-centimeter cubes. How many more cubes does Box B hold than Box A?

A. 160
B. 700
C. 520
D. 140

KEY: D (140)

Worked solution: Box B is 8 + 2 = 10 cm long, so it holds 10 x 7 x 10 = 700 cubes. Box A holds 8 x 7 x 10 = 560 cubes. Box B holds 700 - 560 = 140 more cubes. (Shortcut: the extra part is 2 cm long, 7 cm wide, and 10 cm tall: 2 x 7 x 10 = 140.)

Key computation (JS): `const A = 8 * 7 * 10, B = (8 + 2) * 7 * 10; return B - A;`

Distractors:
- A (160): Pictures the extra part on the long side: 2 x 8 x 10 = 160. | computation: `return 2 * 8 * 10;`
- B (700): Computes 10 x 7 x 10 = 700 and stops. | computation: `return (8 + 2) * 7 * 10;`
- C (520): Makes Box B 10 by 9 by 12 (1,080 cubes) and subtracts Box A's 560: 520. | computation: `return (8 + 2) * (7 + 2) * (10 + 2) - 8 * 7 * 10;`

---

## MB3-G7-03

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A cart used on a building site has a large back wheel and a small front wheel. The back wheel has a diameter of 32 inches. The front wheel has a radius of 3 inches. How many inches farther does the back wheel roll in one full turn than the front wheel rolls in one full turn? Use 3.14 for pi.

A. 81.64
B. 119.32
C. 94.48
D. 91.06

KEY: A (81.64)

Worked solution: In one full turn a wheel rolls a distance equal to its circumference. Back wheel: 3.14 x 32 = 100.48 inches. The front wheel's diameter is 2 x 3 = 6 inches, so its circumference is 3.14 x 6 = 18.84 inches. The difference is 100.48 - 18.84 = 81.64 inches.

Key computation (JS): `return Math.round((3.14*32-3.14*2*3)*100)/100;`

Distractors:
- B (119.32): Finds both circumferences correctly and adds them: 100.48 + 18.84. | computation: `return Math.round((3.14*32+3.14*2*3)*100)/100;`
- C (94.48): Finds the back wheel's circumference 100.48 and subtracts the front wheel's diameter 6, never finding the front wheel's circumference. | computation: `return Math.round((3.14*32-2*3)*100)/100;`
- D (91.06): Finds 3.14 x 3 = 9.42 for the front wheel and subtracts it from 100.48. | computation: `return Math.round((3.14*32-3.14*3)*100)/100;`

---

## MB3-G5-04

Area: Geometry | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A flower vase is shaped like a rectangular prism. Its bottom is a rectangle 3 inches by 5 inches. Ana draws the front of the vase on a coordinate grid where each unit stands for 1 inch. One tall edge of the vase goes from the point (9, 4) straight up to the point (9, 19). What is the volume of the vase, in cubic inches?

A. 135
B. 225
C. 285
D. 240

KEY: B (225)

Worked solution: Both points have x-coordinate 9, so the edge is vertical. Its length is 19 - 4 = 15 units, so the vase is 15 inches tall. The bottom has area 3 x 5 = 15 square inches. Volume = 15 x 15 = 225 cubic inches.

Key computation (JS): `const h = 19 - 4; return 3 * 5 * h;`

Distractors:
- A (135): Sees both points at x = 9 and takes 9 inches as the height: 3 x 5 x 9 = 135. | computation: `return 3 * 5 * 9;`
- C (285): Takes 19 as the height: 3 x 5 x 19 = 285. | computation: `return 3 * 5 * 19;`
- D (240): Uses the bottom's perimeter 2 x (3 + 5) = 16 in place of its area: 16 x 15 = 240. | computation: `return 2 * (3 + 5) * (19 - 4);`

---

## MB3-G6-06

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: In the coordinate plane, a rectangle has corners at (-9, 0), (1, 0), (1, 14), and (-9, 14). The rectangle is reflected across the x-axis. The rectangle and its image share one side, and together they form one larger shape. What is the perimeter of the larger shape, in units?

A. 68
B. 64
C. 76
D. 56

KEY: C (76)

Worked solution: The image has corners at (-9, 0), (1, 0), (1, -14), and (-9, -14), so the two rectangles share the side from (-9, 0) to (1, 0). Together they make a rectangle from y = -14 to y = 14 (28 units tall) and from x = -9 to x = 1 (10 units wide). Perimeter = 2 x (10 + 28) = 76 units.

Key computation (JS): `const w=1-(-9),h=14;return String(2*(w+2*h));`

Distractors:
- A (68): Reading 'across the x-axis' as 'along the x-axis', the student makes the shape 20 wide and 14 tall: 2 x (20 + 14) = 68. | computation: `const w=1-(-9),h=14;return String(2*(2*w+h));`
- B (64): The student's image runs from x = -1 to x = 9, overlapping the original; the outline of both runs from x = -9 to 9 and y = 0 to 14: 2 x (18 + 14) = 64. | computation: `const h=14;const m=Math.max(9,1);return String(2*(2*m+h));`
- D (56): The student adds both perimeters, 48 + 48 = 96, and then takes the shared 10-unit side off twice for each rectangle, 96 - 40 = 56, instead of once for each. | computation: `const w=1-(-9),h=14;return String(2*(2*w+2*h)-4*w);`

---

## MB3-G8-03

Area: Geometry | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A ball is shaped like a sphere. The distance around the ball at its widest part (its circumference) is 17.27 centimeters. Using 3.14 for pi, what is the volume of the ball, in cubic centimeters? Round to the nearest hundredth.

A. 94.99
B. 65.30
C. 31.66
D. 87.07

KEY: D (87.07)

Worked solution: The distance around the widest part is 2 x pi x r, so r = 17.27 / (2 x 3.14) = 17.27 / 6.28 = 2.75 cm. The volume of a sphere is (4/3) x pi x r^3 = (4/3) x 3.14 x 2.75^3 = (4/3) x 3.14 x 20.796875, which is about 87.07 cubic centimeters.

Key computation (JS): `const r = 17.27 / (2 * 3.14); const v = (4 / 3) * 3.14 * r ** 3; return (Math.round(v * 100) / 100).toFixed(2);`

Distractors:
- A (94.99): The student remembers a sphere formula with a 4 and pi in it, uses 4 x 3.14 x 2.75^2 = 94.985, and rounds to 94.99. | computation: `const r100 = 275; return (Math.round(4 * 314 * r100 * r100 / 10000) / 100).toFixed(2);`
- B (65.30): The student finds r = 2.75 and computes pi x r^3 = 65.30, forgetting the factor 4/3. | computation: `const r = 17.27 / (2 * 3.14); return (Math.round(3.14 * r ** 3 * 100) / 100).toFixed(2);`
- C (31.66): The student mixes the area power into the volume formula and computes (4/3) x 3.14 x 2.75^2 = 31.66. | computation: `const r = 17.27 / (2 * 3.14); return (Math.round((4 / 3) * 3.14 * r ** 2 * 100) / 100).toFixed(2);`

---

## MB3-G5-02

Area: Geometry | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Leo fills two boxes with 1-centimeter cubes, with no gaps. In Box A, the cubes are stacked in 8 layers, and each layer has 14 cubes. In Box B, the cubes are stacked in 3 layers, and each layer has 20 cubes. How many cubes are in the two boxes altogether?

A. 172
B. 202
C. 132
D. 102

KEY: A (172)

Worked solution: Box A holds 8 layers of 14 cubes: 8 x 14 = 112 cubes. Box B holds 3 layers of 20 cubes: 3 x 20 = 60 cubes. Together: 112 + 60 = 172 cubes.

Key computation (JS): `return 8 * 14 + 3 * 20;`

Distractors:
- B (202): Mixes up which box has 8 layers: 3 x 14 + 8 x 20 = 42 + 160 = 202. | computation: `return 3 * 14 + 8 * 20;`
- C (132): Gets Box A right (112) but adds just one layer of Box B (20): 112 + 20 = 132. | computation: `return 8 * 14 + 20;`
- D (102): Adds 14 + 20 = 34 cubes per layer and multiplies by Box B's 3 layers for both boxes: 34 x 3 = 102. | computation: `return (14 + 20) * 3;`

---

## MB3-G7-06

Area: Geometry | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The scale of a road map is the ratio 1 : 600,000. This means 1 centimeter on the map equals 600,000 centimeters of real ground. On this map, a lake resort is 24 centimeters from a city. A tour bus covers the real distance from the city to the resort at an average speed of 40 kilometers per hour. For how many minutes is the bus driving?

A. 96
B. 216
C. 36
D. 186

KEY: B (216)

Worked solution: 600,000 centimeters = 6,000 meters = 6 kilometers, so 1 cm on the map stands for 6 km. The towns are 24 x 6 = 144 km apart. At 40 km per hour the trip takes 144 / 40 = 3.6 hours. In minutes: 3.6 x 60 = 216 minutes.

Key computation (JS): `const km=24*600000/100000; return km/40*60;`

Distractors:
- A (96): Changes 40 km per hour to 2/3 km per minute and multiplies: 144 x 2/3 = 96. | computation: `const km=24*6; return km*(40/60);`
- C (36): Treats 24 cm as 24 km, so the time is 24 / 40 = 0.6 h = 36 min. | computation: `return 24/40*60;`
- D (186): Finds 3.6 hours correctly and writes it as 3 h 6 min = 186 minutes. | computation: `const t=24*6/40; return Math.floor(t)*60+Math.round((t-Math.floor(t))*10);`

---

## MB3-G6-04

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On a map in the coordinate plane, each unit stands for 1 meter. A flower bed is shaped like a triangle with corners at (-1, -4), (8, -1), and (2, 6). None of its sides runs along a grid line. What is the area of the flower bed, in square meters?

A. 30
B. 31.5
C. 40.5
D. 45

KEY: C (40.5)

Worked solution: Draw the rectangle around the triangle: x from -1 to 8 (9 units) and y from -4 to 6 (10 units), area 90. Cut off three right triangles: between (-1, -4) and (8, -1), legs 9 and 3, area 13.5; between (8, -1) and (2, 6), legs 6 and 7, area 21; between (2, 6) and (-1, -4), legs 3 and 10, area 15. Area of the flower bed = 90 - 13.5 - 21 - 15 = 40.5 square meters.

Key computation (JS): `const A=[-1,-4],B=[8,-1],C=[2,6];const xs=[A[0],B[0],C[0]],ys=[A[1],B[1],C[1]];const R=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));const t=(P,Q)=>Math.abs(P[0]-Q[0])*Math.abs(P[1]-Q[1])/2;return String(R-t(A,B)-t(B,C)-t(C,A));`

Distractors:
- A (30): For the top-right corner triangle the student takes the horizontal leg as the full width 9 (from x = -1) instead of 6 (from x = 2), so that triangle is 31.5, and 90 - 13.5 - 31.5 - 15 = 30. | computation: `return String(90-13.5-7*9/2-15);`
- B (31.5): For the corner triangle below (8, -1), the student reads the vertical leg from -4 to -1 as 4 + 1 = 5 instead of 3, so that triangle is 22.5, and 90 - 22.5 - 21 - 15 = 31.5. | computation: `return String(90-9*(4+1)/2-21-15);`
- D (45): The student halves the enclosing rectangle, 90 / 2 = 45, which is true only when two sides of the triangle lie along the rectangle. | computation: `return String(9*10/2);`

---

## MB3-G7-02

Area: Geometry | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A block of cheese is a rectangular prism 14 centimeters long, 9 centimeters wide, and 5 centimeters tall. Leo slices it once with a flat knife held straight up and down. The slice goes from the top of the block to the bottom, runs the full 14-centimeter length, and is parallel to the two long sides of the block. The slice leaves two new flat faces, one on each piece. What is the area of each new flat face, in square centimeters?

A. 126
B. 45
C. 38
D. 70

KEY: D (70)

Worked solution: The slice goes straight down from top to bottom, so each new face is as tall as the block, 5 cm. It runs the whole length, so each new face is 14 cm long. Each new face is a rectangle 14 cm by 5 cm, with area 14 x 5 = 70 square centimeters.

Key computation (JS): `return 14*5;`

Distractors:
- A (126): Multiplies length by width, 14 x 9, as if the cut were parallel to the top and bottom. | computation: `return 14*9;`
- B (45): Uses the width and height, 9 x 5, as if the cut ran across the 9-cm width instead of along the length. | computation: `return 9*5;`
- C (38): Sees the 14 by 5 rectangle but adds its sides: 2 x (14 + 5) = 38. | computation: `return 2*(14+5);`

---

## MB3-G7-07

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Three straight lines cross at point O and form six angles around O. Going around O in order, the angles are angle 1, angle 2, angle 3, angle 4, angle 5, and angle 6, so angle 1 and angle 4 are vertical angles, angle 2 and angle 5 are vertical angles, and angle 3 and angle 6 are vertical angles. Angle 1 measures (4x - 14) degrees, angle 4 measures (2x + 22) degrees, and angle 2 measures 47 degrees. What is the measure of angle 6, in degrees?

A. 75
B. 115
C. 131
D. 197

KEY: A (75)

Worked solution: Vertical angles are equal, so 4x - 14 = 2x + 22. Then 2x = 36 and x = 18, so angle 1 = 4(18) - 14 = 58 degrees and angle 4 = 58 degrees. Angle 5 = angle 2 = 47 degrees. The six angles make 360 degrees: angle 3 + angle 6 = 360 - (58 + 47 + 58 + 47) = 150, and angles 3 and 6 are equal, so angle 6 = 75 degrees. (Check: angles 5, 6 and 1 lie along one straight line, and 47 + 75 + 58 = 180.)

Key computation (JS): `const x=(22+14)/(4-2); const a1=4*x-14; return (360-2*a1-2*47)/2;`

Distractors:
- B (115): Solves x = 18 correctly but subtracts 18 instead of 58: 180 - 18 - 47. | computation: `const x=(22+14)/(4-2); return 180-x-47;`
- C (131): Writes 2x = 22 - 14 = 8, so x = 4 and angle 1 = 2 degrees, then 180 - 2 - 47. | computation: `const x=(22-14)/(4-2); return 180-(4*x-14)-47;`
- D (197): Finds angle 1 = angle 4 = 58 and does 360 - 58 - 47 - 58, leaving out angle 5 and treating what is left as angle 6 alone. | computation: `const x=(22+14)/(4-2); const a1=4*x-14; return 360-a1-47-a1;`

---

## MB3-G6-08

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A box shaped like a rectangular prism is filled completely, with no gaps, with 3,168 cubes that are each 1/4 inch long on every edge. The box is 4 inches long and 1 1/2 inches wide. How tall is the box, in inches?

A. 11
B. 8 1/4
C. 9
D. 4 1/2

KEY: B (8 1/4)

Worked solution: Each inch holds 4 cubes along an edge. Along the length: 4 x 4 = 16 cubes; along the width: 1 1/2 x 4 = 6 cubes; so one layer has 16 x 6 = 96 cubes. Number of layers: 3,168 / 96 = 33. Each layer is 1/4 inch tall, so the box is 33 x 1/4 = 8 1/4 inches tall.

Key computation (JS): `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const N=3168,a=4,b=1.5;const layer=(4*a)*(4*b);const layers=N/layer;return mx(layers,4);`

Distractors:
- A (11): The student counts the cubes along the width as 4 x 1 + 1/2 = 4 1/2, so a layer is 16 x 4 1/2 = 72 cubes, 3,168 / 72 = 44 layers, and 44 / 4 = 11 inches. | computation: `const along=4*1+1/2;const layer=16*along;return String(3168/layer/4);`
- C (9): The student finds the volume 3,168 / 64 = 49 1/2 cubic inches and divides by 4 + 1 1/2 = 5 1/2 instead of 4 x 1 1/2 = 6, getting 9. | computation: `const V=3168/64;return String(V/(4+1.5));`
- D (4 1/2): The student divides 49 1/2 by the perimeter of the bottom, 2 x (4 + 1 1/2) = 11, getting 4 1/2. | computation: `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const V=3168/64;const q=V/(2*(4+1.5));return mx(Math.round(q*2),2);`

---

## MB3-G7-09

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A candy shop packs fudge in two kinds of boxes that are both 20 centimeters long. The first box is a rectangular prism whose ends are rectangles 15 centimeters wide and 12 centimeters tall. The second box is a triangular prism whose ends are triangles with a base of 13 centimeters and a height of 7 centimeters. How many more cubic centimeters does the rectangular box hold than the triangular box?

A. 2040
B. 1780
C. 2690
D. 2550

KEY: C (2690)

Worked solution: Rectangular box: 15 x 12 x 20 = 3600 cubic cm. Triangular end: 13 x 7 / 2 = 45.5 square cm, so the triangular box holds 45.5 x 20 = 910 cubic cm. Difference: 3600 - 910 = 2690 cubic centimeters.

Key computation (JS): `return 15*12*20-13*7/2*20;`

Distractors:
- A (2040): Finds the triangle's area as 13 x 12 / 2 = 78, mixing up which height belongs to which box. | computation: `return 15*12*20-13*12/2*20;`
- B (1780): Uses 13 x 7 = 91 for the triangular end, so the triangular box seems to hold 1820. | computation: `return 15*12*20-13*7*20;`
- D (2550): Finds the triangle's area as 15 x 7 / 2 = 52.5, using the wrong box's base length. | computation: `return 15*12*20-15*7/2*20;`
