# Items for review, KEYED (2)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB10-G6-01

Area: Geometry | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A park lawn is shaped like a parallelogram. Its base is 13 meters, its height is 10 meters, and each slanted side is 24 meters long. A square flower bed with sides 4 meters long sits inside the lawn. How many square meters of the lawn are not covered by the flower bed?

A. 114
B. 54
C. 122
D. 296

KEY: A (114)

Worked solution: The area of a parallelogram is base x height: 13 x 10 = 130 square meters (the slanted side is not the height). The flower bed covers 4 x 4 = 16 square meters. The part not covered is 130 - 16 = 114 square meters.

Key computation (JS): `return 13*10-4*4;`

Distractors:
- B (54): (13 - 4) x (10 - 4) = 9 x 6 = 54. | computation: `return (13-4)*(10-4);`
- C (122): 130 - 8 = 122. | computation: `return 13*10-4*2;`
- D (296): 13 x 24 - 16 = 296. | computation: `return 13*24-4*4;`

---

## MB10-G7-01

Area: Geometry | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A raised garden bed is shaped like a rectangular prism 7 feet long and 4 feet wide. Mo will fill it with soil to a depth of 20 inches. Soil is sold in bags that each hold 0.75 cubic foot. What is the least number of bags Mo must buy?

A. 47
B. 63
C. 38
D. 68

KEY: B (63)

Worked solution: The depth is 20 inches = 20 / 12 feet. The volume of soil is 7 x 4 x 20/12 = 140/3 cubic feet, about 46.67 cubic feet. The number of bags is (140/3) / 0.75 = 560/9, about 62.2. Mo cannot buy part of a bag, and 62 bags would not hold enough, so the least number is 63 bags.

Key computation (JS): `return Math.ceil(7*4*(20/12)/0.75);`

Distractors:
- A (47): 46.67 rounded up to 47. | computation: `return Math.ceil(7*4*(20/12));`
- C (38): 28 / 0.75 = 37.3, rounded up to 38. | computation: `return Math.ceil(7*4/0.75);`
- D (68): 7 x 4 x 1.8 / 0.75 = 67.2, rounded up to 68. | computation: `return Math.ceil(7*4*1.8/0.75);`
