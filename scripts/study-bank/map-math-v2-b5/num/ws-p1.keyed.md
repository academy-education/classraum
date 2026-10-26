# Items for review, KEYED (4)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB5-N8-01

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A negative number x satisfies x^-2 = 1/25. Evaluate the expression x^3 - 6x.

A. -95
B. 155
C. 95
D. -155

KEY: A (-95)

Worked solution: A negative exponent means a reciprocal, so x^-2 = 1/x^2. Since 1/x^2 = 1/25, x^2 = 25. The numbers whose square is 25 are 5 and -5, and x is negative, so x = -5. Then x^3 = (-5)(-5)(-5) = -125, and -6x = -6(-5) = 30. So x^3 - 6x = -125 + 30 = -95.

Key computation (JS): `const x = -Math.sqrt(25); return String(x**3 - 6*x);`

Distractors:
- B (155): The student finds x = -5 and gets -6x = 30 right, but writes (-5)^3 = 125 as if the negatives cancel, getting 125 + 30 = 155. | computation: `const x = -5; return String(125 - 6*x);`
- C (95): The student solves x^2 = 25 as x = 5, never uses 'x is negative', and gets 125 - 30 = 95. | computation: `const x = Math.sqrt(25); return String(x**3 - 6*x);`
- D (-155): The student finds x = -5 and x^3 = -125 but writes -6x as -30 instead of +30, getting -125 - 30 = -155. | computation: `const x = -5; return String(x**3 - 30);`

---

## MB5-N7-02

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Lena thinks of a number. When she subtracts the opposite of her number from her number, she gets -7.4. What does she get when she adds -2.65 to her number?

A. -10.05
B. -6.35
C. -5.85
D. -17.45

KEY: B (-6.35)

Worked solution: Subtracting the opposite of a number is the same as adding the number: n - (-n) = n + n = 2n. So 2n = -7.4, and n = -7.4 / 2 = -3.7. Then -3.7 + (-2.65) = -6.35.

Key computation (JS): `const n = -7.4 / 2; return Math.round((n + (-2.65)) * 100) / 100;`

Distractors:
- A (-10.05): The student reads 'the result is -7.4' as 'the number is -7.4' and never halves, so -7.4 + (-2.65) = -10.05. | computation: `const n = -7.4; return Math.round((n + (-2.65)) * 100) / 100;`
- C (-5.85): Halving 7.4, the student takes half of 7 as 3 and half of 4 tenths as 2 tenths, losing the leftover 1 one, so n = -3.2 and -3.2 + (-2.65) = -5.85. | computation: `const n = -3.2; return Math.round((n + (-2.65)) * 100) / 100;`
- D (-17.45): The student sees that n - (-n) is two of the number but doubles -7.4 to -14.8 instead of halving it, then adds -2.65 to get -17.45. | computation: `const n = -7.4 * 2; return Math.round((n + (-2.65)) * 100) / 100;`

---

## MB5-N6-03

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ana uses prime factorization to find the greatest common factor (GCF) and the least common multiple (LCM) of 60 and 80. What is the sum of the GCF and the LCM?

A. 220
B. 490
C. 260
D. 250

KEY: C (260)

Worked solution: 60 = 2 x 2 x 3 x 5 and 80 = 2 x 2 x 2 x 2 x 5. The GCF uses each shared prime the fewest times it appears in either number: 2 twice and 5 once, so the GCF is 2 x 2 x 5 = 20. The LCM uses each prime the most times it appears in either number: 2 x 2 x 2 x 2 x 3 x 5 = 240. The sum is 20 + 240 = 260.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const G=g(60,80); const L=60*80/G; return G+L;`

Distractors:
- A (220): The student finds GCF 20 and LCM 240 correctly but writes 240 - 20 = 220. | computation: `const G=20; const L=240; return L-G;`
- B (490): The student takes GCF = 10, so the leftovers are 6 and 8, multiplies 10 x 6 x 8 = 480 for the LCM, and adds 10 to get 490. | computation: `const G=2*5; const L=G*(60/G)*(80/G); return G+L;`
- D (250): The student sees 2 and 5 in both lists, writes GCF = 2 x 5 = 10, finds the LCM 240 correctly from the highest powers, and adds to get 250. | computation: `const G=2*5; const L=2*2*2*2*3*5; return G+L;`

---

## MB5-N5-01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Tia knows that the equation 60 x 135 = 20 x n is true. What number is n?

A. 175
B. 45
C. 395
D. 405

KEY: D (405)

Worked solution: 20 is one third of 60, because 60 / 3 = 20. When one factor is divided by 3, the other factor must be multiplied by 3 to keep the same product. So n = 135 x 3 = 405. Check: 60 x 135 = 8,100 and 20 x 405 = 8,100.

Key computation (JS): `return String((60*135)/20);`

Distractors:
- A (175): The student says 60 went down by 40, so 135 must go up by 40, and writes 135 + 40 = 175. | computation: `return String(135 + (60-20));`
- B (45): The student sees 60 became 20 (divided by 3) and does the same to 135, getting 45, instead of doing the opposite. | computation: `return String(135/3);`
- C (395): The student finds the rule (triple 135) but writes 3 x 5 = 15 as 5 and then writes 3 x 3 = 9 without adding the carried 1, getting 395. | computation: `return String(100*3 + 3*3*10 + 5);`
