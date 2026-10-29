# Items for review, KEYED (2)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB6-O7-01

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A store pays $54 for a jacket. The store marks up the price by 60% to set its selling price. During a sale, the store takes 25% off the selling price. What is the sale price of the jacket, in dollars?

A. 64.8
B. 61.4
C. 78.3
D. 72.9

KEY: A (64.8)

Worked solution: The markup is 60% of $54, which is $32.40, so the selling price is $54 + $32.40 = $86.40. The discount is 25% of $86.40, which is $21.60, so the sale price is $86.40 - $21.60 = $64.80.

Key computation (JS): `return Math.round(54*1.6*0.75*100)/100;`

Distractors:
- B (61.4): 86.40 - 25 = 61.40. | computation: `return Math.round((54*1.6-25)*100)/100;`
- C (78.3): markup 32.40, 75% of it is 24.30; 54 + 24.30 = 78.30. | computation: `return Math.round((54+0.75*(0.60*54))*100)/100;`
- D (72.9): 54 x 1.35 = 72.90. | computation: `return Math.round(54*(1+0.60-0.25)*100)/100;`

---

## MB6-O8-01

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A plumber charges a fixed fee for each visit plus the same amount for each hour of work. A 3-hour job costs $310, and a 5-hour job costs $390. What is the fixed fee, in dollars?

A. 80
B. 190
C. 40
D. 270

KEY: B (190)

Worked solution: Two more hours cost $390 - $310 = $80, so each hour costs $80 / 2 = $40. Three hours cost 3 x $40 = $120, so the fixed fee is $310 - $120 = $190.

Key computation (JS): `const r=(390-310)/(5-3); return 310-3*r;`

Distractors:
- A (80): 390 - 310 = 80. | computation: `return 390-310;`
- C (40): (390 - 310) / 2 = 40. | computation: `return (390-310)/(5-3);`
- D (270): 310 - 40 = 270. | computation: `const r=(390-310)/(5-3); return 310-r;`
