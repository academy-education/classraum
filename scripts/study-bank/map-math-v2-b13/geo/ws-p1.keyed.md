# Items for review, KEYED (9)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB13-G6-06

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A net that folds into a cube is made of six squares joined edge to edge, with no gaps or overlaps. The perimeter of the whole net is 168 centimeters. What is the surface area of the cube, in square centimeters?

A. 864
B. 294
C. 10584
D. 1176

KEY: A (864)

Worked solution: Six squares have 24 sides in all. The net has 5 places where two squares share an edge, and each shared edge hides 2 sides, so the outline of the net is 24 - 10 = 14 sides. Each side is 168 / 14 = 12 cm, each face has area 144, and the surface area is 6 x 144 = 864 square centimeters.

Key computation (JS): `const s=168/14;return 6*s*s;`

Distractors:
- B (294): side 168 / 24. | computation: `return 6*(168/24)*(168/24);`
- C (10584): side 168 / 4. | computation: `return 6*(168/4)*(168/4);`
- D (1176): side 168 / 12. | computation: `return 6*(168/12)*(168/12);`

---

## MB13-G8-01

Area: Geometry | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A roll of clay is shaped like a cylinder with a radius of 29 centimeters and a length of 20 centimeters. It is cut lengthwise by one flat cut that is parallel to the center line of the cylinder and 21 centimeters from it. The cut surface is a rectangle. What is the area of the cut surface, in square centimeters?

A. 160
B. 800
C. 580
D. 320

KEY: B (800)

Worked solution: Half the width of the cut is the leg of a right triangle whose hypotenuse is the radius 29 and whose other leg is 21: sqrt(29^2 - 21^2) = sqrt(400) = 20. The cut is 40 centimeters wide and 20 centimeters long, so its area is 40 x 20 = 800 square centimeters.

Key computation (JS): `const h=Math.sqrt(29**2-21**2);return 2*h*20;`

Distractors:
- A (160): (29 - 21) x 20. | computation: `return (29-21)*20;`
- C (580): 29 x 20. | computation: `return 29*20;`
- D (320): 2 x (29 - 21) x 20. | computation: `return 2*(29-21)*20;`

---

## MB13-G6-03

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A box is shaped like a rectangular prism. Its three different faces have areas of 10, 6, and 15 square centimeters. What is the total surface area of the box, in square centimeters?

A. 36
B. 40
C. 62
D. 90

KEY: C (62)

Worked solution: A box has two faces of each of the three sizes, so the surface area is 2 x (10 + 6 + 15) = 2 x 31 = 62 square centimeters.

Key computation (JS): `return 2*(10+6+15);`

Distractors:
- A (36): 6 x 6. | computation: `return 6*6;`
- B (40): edges 5, 3, 2; 4 x 10. | computation: `return 4*(5+3+2);`
- D (90): 6 x 15. | computation: `return 6*15;`

---

## MB13-G8-02

Area: Geometry | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A solid ball has a radius of 10 centimeters. It is cut by one flat cut that is 8 centimeters from the center of the ball. The cut surface is a circle. Using 3.14 for pi, what is the area of the cut surface, in square centimeters?

A. 200.96
B. 18.84
C. 514.96
D. 113.04

KEY: D (113.04)

Worked solution: The radius of the cut circle is a leg of a right triangle whose hypotenuse is the ball's radius 10 and whose other leg is 8: r^2 = 10^2 - 8^2 = 36, so r = 6. The area is 3.14 x 36 = 113.04 square centimeters.

Key computation (JS): `const r2=10**2-8**2;return 3.14*r2;`

Distractors:
- A (200.96): 3.14 x 8^2. | computation: `return 3.14*8*8;`
- B (18.84): 3.14 x 6. | computation: `return 3.14*6;`
- C (514.96): 3.14 x (100 + 64). | computation: `return 3.14*(10*10+8*8);`

---

## MB13-G6-04

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A rectangle is drawn in the coordinate plane with its sides horizontal and vertical. The center of the rectangle is at (-7, 7), and one corner of the rectangle is at (1, 5). What is the area of the rectangle, in square units?

A. 64
B. 40
C. 20
D. 48

KEY: A (64)

Worked solution: From the center (-7, 7) to the corner (1, 5) is 8 units across and 2 units up or down. The center is halfway across the rectangle, so the sides are 2 x 8 = 16 and 2 x 2 = 4 units long, and the area is 16 x 4 = 64 square units.

Key computation (JS): `return (2*Math.abs(1-(-7)))*(2*Math.abs(5-(7)));`

Distractors:
- B (40): 2 x (16 + 4). | computation: `return 4*(8+2);`
- C (20): 4 x 1 x 5. | computation: `return 4*1*5;`
- D (48): |1 - 7| = 6; 4 x 6 x 2. | computation: `return 4*6*2;`

---

## MB13-G5-01

Area: Geometry | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Mia has a box shaped like a rectangular prism with a square base. The perimeter of the base is 36 centimeters, and the box is 2 centimeters tall. What is the volume of the box, in cubic centimeters?

A. 72
B. 162
C. 18
D. 729

KEY: B (162)

Worked solution: A square has four equal sides, so each side of the base is 36 / 4 = 9 cm. The base has area 9 x 9 = 81 square centimeters, and the volume is 81 x 2 = 162 cubic centimeters.

Key computation (JS): `const s=36/4;return s*s*2;`

Distractors:
- A (72): 36 x 2. | computation: `return 36*2;`
- C (18): 9 x 2. | computation: `return 36/4*2;`
- D (729): 9 x 9 x 9. | computation: `return (36/4)*(36/4)*(36/4);`

---

## MB13-G6-05

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A net for a closed box is made of six rectangles. Two of the rectangles are 16 centimeters by 8 centimeters, two are 16 centimeters by 2 centimeters, and two are 8 centimeters by 2 centimeters. The net is folded into the box. What is the volume of the box, in cubic centimeters?

A. 176
B. 104
C. 256
D. 320

KEY: C (256)

Worked solution: Each edge of the box appears in the net as a side of four of the rectangles, so the three different edge lengths are 16, 8 and 2 centimeters. The volume is 16 x 8 x 2 = 256 cubic centimeters.

Key computation (JS): `return 16*8*2;`

Distractors:
- A (176): 128 + 32 + 16. | computation: `return 16*8+16*2+8*2;`
- B (104): 4 x (16 + 8 + 2). | computation: `return 4*(16+8+2);`
- D (320): 2 x 128 + 2 x 32. | computation: `return 2*16*8+2*16*2;`

---

## MB13-G6-01

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A yard is shaped like a right triangle. The two sides that meet at the right angle are 16 feet and 30 feet long, and the third side is 34 feet long. Fencing costs $5 per foot, and sod costs $3 per square foot. How many dollars does it cost in all to put a fence all the way around the yard and cover the whole yard with sod?

A. 1440
B. 1930
C. 1670
D. 1120

KEY: D (1120)

Worked solution: The fence goes around all three sides: 16 + 30 + 34 = 80 feet, costing 80 x 5 = 400 dollars. The yard's area is half of 16 x 30, which is 240 square feet, so the sod costs 240 x 3 = 720 dollars. In all: 400 + 720 = 1120.

Key computation (JS): `return (16+30+34)*5+16*30/2*3;`

Distractors:
- A (1440): 80 x 3 + 240 x 5. | computation: `return (16+30+34)*3+16*30/2*5;`
- B (1930): area 30 x 34 / 2. | computation: `return (16+30+34)*5+30*34/2*3;`
- C (1670): fence 46, area 480. | computation: `return (16+30)*5+16*30*3;`

---

## MB13-G6-02

Area: Geometry | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Theo measures a closed carton shaped like a rectangular prism. Adding its length and width gives 21 inches, adding its width and height gives 10 inches, and adding its length and height gives 19 inches. How many cubic inches of space does the carton take up?

A. 360
B. 348
C. 198
D. 210

KEY: A (360)

Worked solution: Adding the three sums counts each edge twice: 21 + 10 + 19 = 50, so length + width + height = 25. Then the height is 25 - 21 = 4, the length is 25 - 10 = 15, and the width is 25 - 19 = 6. The volume is 15 x 6 x 4 = 360 cubic inches.

Key computation (JS): `const H=(21+10+19)/2;return (H-10)*(H-19)*(H-21);`

Distractors:
- B (348): 2(lw + wh + lh). | computation: `return 2*(15*6+6*4+15*4);`
- C (198): 11 x 9 x 2. | computation: `return (21-10)*(19-10)*(21-19);`
- D (210): 21 x 10. | computation: `return 21*10;`
