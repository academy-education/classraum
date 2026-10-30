# Items for review, KEYED (3)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB10-D7-02

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A quiz has 4 true-or-false questions. Dev guesses the answer to every question at random, so each answer has a 1/2 chance of being correct. What is the probability that Dev gets exactly 2 of the 4 answers correct?

A. 3/8
B. 1/2
C. 11/16
D. 1/5

KEY: A (3/8)

Worked solution: Each question is right or wrong, so there are 2 x 2 x 2 x 2 = 16 equally likely patterns. Exactly 2 correct can happen in 6 ways (RRWW, RWRW, RWWR, WRRW, WRWR, WWRR). The probability is 6/16 = 3/8.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(6,16);`

Distractors:
- B (1/2): 2/4 = 1/2. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(2,4);`
- C (11/16): (6 + 4 + 1)/16 = 11/16. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(6+4+1,16);`
- D (1/5): 1 of 5 scores = 1/5. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(1,5);`

---

## MB10-D6-02

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A data set has 5 values. The mean of the values is 20 and the median is 31. The greatest value is then increased by 44, and no other value changes. What is the mean of the new data set?

A. 24
B. 28.8
C. 31
D. 39.8

KEY: B (28.8)

Worked solution: The sum of the 5 values is 5 x 20 = 100. Increasing one value by 44 makes the sum 144. The new mean is 144 / 5 = 28.8. (The median does not affect the mean.)

Key computation (JS): `return (5*20+44)/5;`

Distractors:
- A (24): (100 + 44) / 6 = 24. | computation: `return (5*20+44)/6;`
- C (31): 31. | computation: `return 31;`
- D (39.8): 31 + 44/5 = 39.8. | computation: `return Math.round((31+44/5)*10)/10;`

---

## MB10-D6-01

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Mr. Lee finds each student's grade by averaging the scores, where the unit test counts twice as much as each quiz. Rosa scored 91, 94, and 66 on three quizzes and 93 on the unit test. What is Rosa's grade?

A. 87.6
B. 87
C. 87.4
D. 86

KEY: C (87.4)

Worked solution: The unit test counts twice, so add it twice and divide by 5 (three quizzes plus two test counts): (91 + 94 + 66 + 93 + 93) / 5 = 437 / 5 = 87.4.

Key computation (JS): `return (91+94+66+2*93)/5;`

Distractors:
- A (87.6): (251 + 94 + 93) / 5 = 87.6. | computation: `return (91+94+66+94+93)/5;`
- B (87): (251 + 91 + 93) / 5 = 87. | computation: `return (91+94+66+91+93)/5;`
- D (86): 344 / 4 = 86. | computation: `return (91+94+66+93)/4;`
