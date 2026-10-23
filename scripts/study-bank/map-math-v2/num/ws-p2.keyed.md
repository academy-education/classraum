# Items for review, KEYED (19)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MV2-N56-01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A town has 480 garden plots. Exactly 3/4 of the plots grow vegetables. Of the vegetable plots, 5/12 grow beans. How many of the garden plots grow beans?

A. 150
B. 210
C. 80
D. 160

KEY: A (150)

Worked solution: First find the vegetable plots: 3/4 of 480 = 480 / 4 x 3 = 360. The beans are 5/12 of the vegetable plots, not of all the plots: 5/12 of 360 = 360 / 12 x 5 = 150. So 150 plots grow beans.

Key computation (JS): `return String(480/4*3/12*5);`

Distractors:
- B (210): the student finds the vegetable plots, 360, and then the vegetable plots that do NOT grow beans, 7/12 of 360 = 210, answering for the other share | computation: `return String(480/4*3/12*7);`
- C (80): the student takes 5/12 of all 480 plots (200) and then subtracts the 120 plots that are not vegetables, as if every non-vegetable plot had been counted among the beans: 200 - 120 = 80 | computation: `return String(480/12*5 - 480/4);`
- D (160): the student finds 3/4 - 5/12 = 4/12 = 1/3 and takes 1/3 of 480 = 160, treating "of the vegetable plots" as taking 5/12 away | computation: `return String(Math.round(480*(3/4-5/12)));`

---

## MV2-N8-15

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Sofia divides the square root of 256 by the cube root of 64, written √256 ÷ ∛64. What quotient does she get?

A. 12
B. 4
C. 2
D. 32

KEY: B (4)

Worked solution: √256 = 16 because 16^2 = 256. ∛64 = 4 because 4^3 = 64. So √256 ÷ ∛64 = 16 ÷ 4 = 4.

Key computation (JS): `return String(Math.sqrt(256) / Math.round(Math.cbrt(64)))`

Distractors:
- A (12): The student finds 16 and 4 but subtracts: 16 - 4 = 12. | computation: `return String(16 - 4)`
- C (2): The student uses √64 = 8, so 16 ÷ 8 = 2. | computation: `return String(16 / Math.sqrt(64))`
- D (32): The student halves 256 to get 128, then 128 ÷ 4 = 32. | computation: `return String(256/2 / 4)`

---

## MV2-N7-03

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: On Monday the temperature in a town went from -7.35 degrees Celsius at dawn to 3.6 degrees Celsius in the afternoon. On Tuesday it went from -2.6 degrees Celsius at dawn to 4.2 degrees Celsius in the afternoon. How many more degrees did the temperature rise on Monday than on Tuesday?

A. 17.75
B. 9.35
C. 4.15
D. 4.75

KEY: C (4.15)

Worked solution: Monday's rise: 3.6 - (-7.35) = 3.6 + 7.35 = 10.95 degrees. Tuesday's rise: 4.2 - (-2.6) = 4.2 + 2.6 = 6.8 degrees. Monday's rise was 10.95 - 6.8 = 4.15 degrees more.

Key computation (JS): `const m = 3.6 - (-7.35), t = 4.2 - (-2.6); return (m - t).toFixed(2);`

Distractors:
- A (17.75): The student finds 10.95 and 6.8 correctly and then adds them: 17.75. | computation: `const m = 3.6 - (-7.35), t = 4.2 - (-2.6); return (m + t).toFixed(2);`
- B (9.35): The student gets Monday's 10.95 but treats Tuesday as 4.2 - 2.6 = 1.6, so the comparison becomes 10.95 - 1.6 = 9.35. | computation: `const m = 3.6 - (-7.35), t = 4.2 - 2.6; return (m - t).toFixed(2);`
- D (4.75): The student looks only at the starting temperatures and finds how much colder Monday's dawn was: 7.35 - 2.6 = 4.75. | computation: `return (7.35 - 2.6).toFixed(2);`

---

## MV2-N56-07

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A farm packs 572 apples into 22 crates, with the same number of apples in each crate. Another farm packs 858 apples into 26 crates, also with the same number in each crate. How many more apples are in 5 crates from the second farm than in 5 crates from the first farm?

A. 85
B. 45
C. 65
D. 35

KEY: D (35)

Worked solution: First farm: 572 / 22 = 26 apples in each crate. Second farm: 858 / 26 = 33 apples in each crate. Each crate at the second farm has 33 - 26 = 7 more apples, so 5 crates have 5 x 7 = 35 more apples.

Key computation (JS): `return String(5*(858/26 - 572/22));`

Distractors:
- A (85): the student pairs 858 with 22 and 572 with 26: 858 / 22 = 39 and 572 / 26 = 22, so 5 x (39 - 22) = 85 | computation: `return String(5*(858/22 - 572/26));`
- B (45): the student takes 22 x 24 = 528 from 572, leaves 44 (which still holds two 22s), writes 24 apples per crate, and gets 5 x (33 - 24) = 45 | computation: `return String(5*(858/26 - 24));`
- C (65): the student finds 858 - 572 = 286 more apples, divides by the first farm's 22 crates to get 13 per crate, and then 5 x 13 = 65 | computation: `return String(5*((858-572)/22));`

---

## MV2-N8-19

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Write the cube root ∛(2^12 x 5^6) as a single whole number.

A. 400
B. 64000
C. 8000
D. 102400

KEY: A (400)

Worked solution: 2^12 = (2^4)^3 and 5^6 = (5^2)^3, so 2^12 x 5^6 = (2^4 x 5^2)^3. Its cube root is 2^4 x 5^2 = 16 x 25 = 400.

Key computation (JS): `return String(2**(12/3) * 5**(6/3))`

Distractors:
- B (64000): The student subtracts 3 from each exponent: 2^9 x 5^3 = 512 x 125 = 64,000. | computation: `return String(2**(12-3) * 5**(6-3))`
- C (8000): The student halves each exponent: 2^6 x 5^3 = 64 x 125 = 8000. | computation: `return String(2**(12/2) * 5**(6/2))`
- D (102400): The student divides the exponent of 5 by 3 but leaves 2^12: 4096 x 25 = 102,400. | computation: `return String(2**12 * 5**(6/3))`

---

## MV2-N56-12

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A green rope is 2 4/7 meters long. A blue rope is 2/3 meter long. How many times as long as the blue rope is the green rope?

A. 3 4/7
B. 3 6/7
C. 2 6/7
D. 1 5/7

KEY: B (3 6/7)

Worked solution: To find how many times as long, divide: 2 4/7 / 2/3. Write 2 4/7 as an improper fraction: 2 4/7 = 18/7. Dividing by 2/3 is the same as multiplying by 3/2: 18/7 x 3/2 = 54/14 = 27/7. As a mixed number, 27/7 = 3 6/7.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+' ':'')+r+'/'+d};return mx(18*3,7*2);`

Distractors:
- A (3 4/7): the student works 2 / 2/3 = 3 and then attaches the 4/7 unchanged, treating the mixed number as two separate pieces | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+' ':'')+r+'/'+d};return String(2*3/2)+" 4/7";`
- C (2 6/7): the student works 4/7 / 2/3 = 12/14 = 6/7 and puts the 2 back in front, never dividing the whole number 2 | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+' ':'')+r+'/'+d};const f=mx(4*3,7*2);return "2 "+f;`
- D (1 5/7): the student writes 18/7 x 2/3 = 36/21 = 1 5/7, forgetting to flip the 2/3 when dividing | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+' ':'')+r+'/'+d};return mx(18*2,7*3);`

---

## MV2-N56-16

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A rowboat moves at 5.65 kilometers per hour in still water. Going downstream, the current makes it go 0.25 kilometer per hour faster. The boat travels downstream for 1.4 hours. Then it turns around and rows back 0.75 kilometer to a dock. How many kilometers is the dock from where the boat started?

A. 7.21
B. 6.81
C. 7.51
D. 7.41

KEY: C (7.51)

Worked solution: Downstream, the boat goes 5.65 + 0.25 = 5.9 kilometers per hour. In 1.4 hours it travels 5.9 x 1.4 = 8.26 kilometers (59 x 14 = 826, with 2 decimal places). Then it rows back 0.75 kilometer, so the dock is 8.26 - 0.75 = 7.51 kilometers from where it started.

Key computation (JS): `const f=x=>(Math.round(x*100)/100).toFixed(2);return f((5.65+0.25)*1.4-0.75);`

Distractors:
- A (7.21): the student takes 0.75 x 1.4 = 1.05 off the 8.26 kilometers, applying the trip back once per hour | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f((5.65+0.25)*1.4-0.75*1.4);`
- B (6.81): the student uses 5.65 - 0.25 = 5.4 kilometers per hour, gets 5.4 x 1.4 = 7.56 and subtracts 0.75 | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f((5.65-0.25)*1.4-0.75);`
- D (7.41): the student finds 5.65 x 1.4 = 7.91, adds 0.25 once and subtracts 0.75, as if the current gave 0.25 kilometer in all | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f(5.65*1.4+0.25-0.75);`

---

## MV2-N8-10

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Find the sum 2√64 + ∛(-729), where 2√64 means 2 times the square root of 64.

A. -227
B. -1
C. 1
D. 7

KEY: D (7)

Worked solution: √64 = 8, so 2√64 = 2 x 8 = 16. The cube root of a negative number is negative: (-9)^3 = -729, so ∛(-729) = -9. Then 16 + (-9) = 7.

Key computation (JS): `return String(2*Math.sqrt(64) + Math.round(Math.cbrt(-729)))`

Distractors:
- A (-227): The student divides 729 by 3 to get 243, so 16 - 243 = -227. | computation: `return String(2*8 - 729/3)`
- B (-1): The student uses ∛64 = 4 for √64, so 2 x 4 - 9 = -1. | computation: `return String(2*Math.round(Math.cbrt(64)) - 9)`
- C (1): The student adds the 2 instead of multiplying: 2 + 8 - 9 = 1. | computation: `return String(2 + 8 - 9)`

---

## MV2-N8-03

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A calculator screen shows the expression 5 x (3^2)^3 ÷ 3^3. Without a calculator, find the number this expression equals.

A. 135
B. 32805
C. 3375
D. 98415

KEY: A (135)

Worked solution: (3^2)^3 = 3^(2 x 3) = 3^6. Dividing powers with the same base subtracts exponents: 3^6 ÷ 3^3 = 3^3 = 27. Then 5 x 27 = 135.

Key computation (JS): `return String(5 * 3**(2*3) / 3**3)`

Distractors:
- B (32805): The student adds all the exponents it sees, 2 + 3 + 3 = 8, so 5 x 3^8 = 5 x 6561 = 32805. | computation: `return String(5 * 3**(2+3+3))`
- C (3375): The student combines 5 x 3 = 15 first and uses 15 as the base: 15^3 = 3375. | computation: `return String((5*3)**(2*3-3))`
- D (98415): The student adds the 3 instead of subtracting it: 3^(6+3) = 3^9 = 19683, and 5 x 19683 = 98415. | computation: `return String(5 * 3**(2*3+3))`

---

## MV2-N7-13

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: In a video game, Mia's score is -12.75 points. She then finishes 3 bonus rounds, and each bonus round adds 1.6 points to her score. What is her score now?

A. -8.15
B. -7.95
C. -17.55
D. -8.95

KEY: B (-7.95)

Worked solution: The three bonus rounds add 3 x 1.6 = 4.8 points. Her score is now -12.75 + 4.8 = -7.95 points.

Key computation (JS): `return (-12.75 + 3 * 1.6).toFixed(2);`

Distractors:
- A (-8.15): The student adds both numbers to the score: -12.75 + 1.6 + 3 = -8.15. | computation: `return (-12.75 + 1.6 + 3).toFixed(2);`
- C (-17.55): The student takes -12.75 - 4.8 = -17.55, thinking that adding to a negative number makes it more negative. | computation: `return (-12.75 - 3 * 1.6).toFixed(2);`
- D (-8.95): The student multiplies 3 x 1.6 and gets 3.8 instead of 4.8, so the score comes out as -8.95. | computation: `return (-12.75 + 3.8).toFixed(2);`

---

## MV2-N56-17

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A tank holds 10 10/11 gallons of water. Pump A, working alone, empties the full tank at a rate of 1 1/5 gallons per minute. Pump B, working alone, empties the full tank at a rate of 1 3/5 gallons per minute. How many more minutes does pump A take to empty the full tank than pump B takes?

A. 4 4/11
B. 3 8/11
C. 2 3/11
D. 15 10/11

KEY: C (2 3/11)

Worked solution: 10 10/11 = 120/11. Pump A takes 120/11 / 6/5 = 120/11 x 5/6 = 100/11 = 9 1/11 minutes. Pump B takes 120/11 / 8/5 = 120/11 x 5/8 = 75/11 = 6 9/11 minutes. Pump A takes 9 1/11 - 6 9/11 = 8 12/11 - 6 9/11 = 2 3/11 more minutes.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{if(n<0)n=-n;const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+" ":"")+r+"/"+d};return mx(100*1-75*1,11);`

Distractors:
- A (4 4/11): the student finds 1 3/5 - 1 1/5 = 2/5 and multiplies 10 10/11 x 2/5 = 4 4/11, treating gallons times gallons per minute as minutes | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{if(n<0)n=-n;const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+" ":"")+r+"/"+d};return mx(120*(8-6),11*5);`
- B (3 8/11): the student finds both times correctly, then works 9 1/11 - 6 9/11 as 9 - 6 = 3 and 9/11 - 1/11 = 8/11, giving 3 8/11 | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{if(n<0)n=-n;const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+" ":"")+r+"/"+d};return mx((9-6)*11+(9-1),11);`
- D (15 10/11): the student finds 9 1/11 and 6 9/11 minutes and adds them to get 15 10/11, reading "how many more" as a total | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{if(n<0)n=-n;const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+" ":"")+r+"/"+d};return mx(100+75,11);`

---

## MV2-N56-05

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Ms. Ortiz has a bag with 6.3 kilograms of rice. She splits the rice equally into 3 jars. Then she takes 0.45 kilogram of rice out of one jar to cook dinner. How many kilograms of rice are left in that jar?

A. 2.55
B. 1.75
C. 1.95
D. 1.65

KEY: D (1.65)

Worked solution: Each jar gets 6.3 / 3 = 2.1 kilograms. Taking 0.45 kilogram out of one jar leaves 2.10 - 0.45 = 1.65 kilograms in that jar.

Key computation (JS): `return (6.3/3 - 0.45).toFixed(2);`

Distractors:
- A (2.55): the student finds 2.1 kilograms in the jar and adds the 0.45 kilogram: 2.1 + 0.45 = 2.55 | computation: `return (6.3/3 + 0.45).toFixed(2);`
- B (1.75): the student shares 6.3 as 2 and 0.3 but writes 0.2 for 0.3 / 3, getting 2.2, and then 2.2 - 0.45 = 1.75 | computation: `return (2.2 - 0.45).toFixed(2);`
- C (1.95): the student does 6.3 - 0.45 = 5.85 first and then shares it: 5.85 / 3 = 1.95, as if the 0.45 kilogram had been taken from all three jars together | computation: `return ((6.3 - 0.45)/3).toFixed(2);`

---

## MV2-N8-01

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Marcus is checking his homework. One problem asks for the value of -2^4 + 56 x 2^-2 - 6 x 7^0. What is the correct value?

A. -8
B. -36
C. -246
D. -44

KEY: A (-8)

Worked solution: -2^4 means -(2^4) = -16. A negative exponent means a reciprocal, so 2^-2 = 1/2^2 = 1/4, and 56 x 1/4 = 14. Any nonzero number to the zero power is 1, so 6 x 7^0 = 6 x 1 = 6. The value is -16 + 14 - 6 = -8.

Key computation (JS): `return String(-(2**4) + 56 * 2**-2 - 6 * 7**0)`

Distractors:
- B (-36): The student takes the reciprocal but keeps the minus sign: 2^-2 = -1/4, so 56 x 2^-2 = -14 and the total is -16 - 14 - 6 = -36. | computation: `return String(-(2**4) - 56 / 4 - 6 * 1)`
- C (-246): The student reads 2^-2 as -2^2 = -4, so 56 x 2^-2 becomes -224 and the total is -16 - 224 - 6 = -246. | computation: `return String(-(2**4) + 56 * -(2**2) - 6 * 1)`
- D (-44): The student treats 7^0 as 7, so 6 x 7^0 = 42 and the total is -16 + 14 - 42 = -44. | computation: `return String(-(2**4) + 56 / 4 - 6 * 7)`

---

## MV2-N7-17

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A baker has 11 1/2 cups of flour. She makes 3 loaves of bread, and each loaf uses 1 2/3 cups of flour. Then she uses 1/4 of the flour that is left to make muffins. How many cups of flour does she have left after making the muffins?

A. 3 5/8
B. 4 7/8
C. 7 3/8
D. 12 3/8

KEY: B (4 7/8)

Worked solution: The loaves use 3 x 1 2/3 = 5 cups, so 11 1/2 - 5 = 6 1/2 cups are left. Using 1/4 of that leaves 3/4 of it: 6 1/2 x 3/4 = 13/2 x 3/4 = 39/8 = 4 7/8 cups.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const fm=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return s+(w?w+(r?' ':''):'')+(r?r+'/'+d:(w?'':'0'))};const left = 69 - 3 * 10; return fm(left * 3, 24);`

Distractors:
- A (3 5/8): The student keeps 3/4 of 11 1/2 (8 5/8) and then subtracts the 5 cups for the loaves: 3 5/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const fm=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return s+(w?w+(r?' ':''):'')+(r?r+'/'+d:(w?'':'0'))};return fm(69 * 3 / 4 * 4 - 30 * 4, 24);`
- C (7 3/8): The student takes 11 1/2 - 1 2/3 = 9 5/6 and keeps 3/4 of it: 7 3/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const fm=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return s+(w?w+(r?' ':''):'')+(r?r+'/'+d:(w?'':'0'))};return fm((69 - 10) * 3, 24);`
- D (12 3/8): The student writes 11 1/2 + 5 = 16 1/2 and keeps 3/4 of it: 12 3/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const fm=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return s+(w?w+(r?' ':''):'')+(r?r+'/'+d:(w?'':'0'))};return fm((69 + 30) * 3, 24);`

---

## MV2-N56-24

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Jin marks the opposite of 7.5 on a number line. From that mark he moves 1.5 units to the right and marks point B. He also marks point A at -0.5. How many units long is the segment from A to B?

A. 8.5
B. 6.5
C. 5.5
D. 9.5

KEY: C (5.5)

Worked solution: The opposite of 7.5 is -7.5. Moving 1.5 units to the right of -7.5 gives -6, so point B is at -6. Point A is at -0.5. Both points are to the left of 0, so the distance between them is 6 - 0.5 = 5.5 units.

Key computation (JS): `const B=-7.5+1.5, A=-0.5; return (Math.abs(A-B)).toFixed(1);`

Distractors:
- A (8.5): the student moves 1.5 to the left of -7.5, to -9, and the distance from -0.5 is 8.5 | computation: `const B=-7.5-1.5, A=-0.5; return (Math.abs(A-B)).toFixed(1);`
- B (6.5): the student finds B = -6 correctly but adds 0.5 + 6 = 6.5, as if A and B were on opposite sides of 0 | computation: `const B=-7.5+1.5; return (0.5+Math.abs(B)).toFixed(1);`
- D (9.5): the student moves 1.5 to the right of 7.5, to 9, and measures from -0.5 across 0: 0.5 + 9 = 9.5 | computation: `const B=7.5+1.5, A=-0.5; return (Math.abs(A-B)).toFixed(1);`

---

## MV2-N7-19

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A scientist measures how the front edge of a glacier moves, using negative numbers for moving back and positive numbers for moving forward. For 5 days in a row the edge moved -2 1/8 meters each day. Then, in one storm, it moved forward 3.35 meters. What was the total change in the position of the edge over the 6 days, in meters?

A. -6.775
B. -6.025
C. -7.175
D. -7.275

KEY: D (-7.275)

Worked solution: Over the 5 days the edge moved 5 x (-2 1/8) = -10 5/8 meters, which is -10.625 meters. The storm moved it 3.35 meters forward, so the total change is -10.625 + 3.35 = -7.275 meters.

Key computation (JS): `return (5 * -2.125 + 3.35).toFixed(3);`

Distractors:
- A (-6.775): The student writes 5 x (-2 1/8) as -10 1/8 = -10.125, then adds 3.35 to get -6.775. | computation: `return (-(2 * 5 + 0.125) + 3.35).toFixed(3);`
- B (-6.025): The student uses -1 7/8 = -1.875 for each day, so 5 days give -9.375 and the total is -9.375 + 3.35 = -6.025. | computation: `return (5 * (-2 + 0.125) + 3.35).toFixed(3);`
- C (-7.175): The student multiplies 2 by 5 correctly but gets 0.525 for 5 x 1/8, so the 5-day change is -10.525 and the total is -7.175. | computation: `return (-(10 + 0.525) + 3.35).toFixed(3);`

---

## MV2-N7-12

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Two divers start at the surface of a lake. Diver A's elevation changes by -1.35 meters each minute for 7 minutes. Diver B's elevation changes by -0.6 meter each minute for 11 minutes. How many meters lower than Diver B is Diver A then?

A. 2.85
B. 7.65
C. 16.05
D. 7.05

KEY: A (2.85)

Worked solution: Diver A is at 7 x (-1.35) = -9.45 meters. Diver B is at 11 x (-0.6) = -6.6 meters. Diver A is lower by -6.6 - (-9.45) = 2.85 meters.

Key computation (JS): `const a = 7 * -1.35, b = 11 * -0.6; return (b - a).toFixed(2);`

Distractors:
- B (7.65): The student finds A gets 0.75 meter lower each minute for 7 minutes (5.25) and then adds B's extra 2.4 meters instead of taking them away: 7.65. | computation: `return (7 * (1.35 - 0.6) + 4 * 0.6).toFixed(2);`
- C (16.05): The student finds 9.45 and 6.6 and adds them to get 16.05. | computation: `return (7 * 1.35 + 11 * 0.6).toFixed(2);`
- D (7.05): The student reasons that B goes 4 minutes longer, takes 0.6 x 4 = 2.4, and subtracts it from A's 9.45 to get 7.05, forgetting B's first 7 minutes. | computation: `return (7 * 1.35 - 4 * 0.6).toFixed(2);`

---

## MV2-N56-11

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A school library packs 5,985 paperback books into boxes that hold 19 books and 1,995 hardcover books into boxes that hold 21 books. Every box is full, and paperbacks and hardcovers are never packed in the same box. How many boxes does the library fill altogether?

A. 380
B. 410
C. 390
D. 220

KEY: B (410)

Worked solution: Find the boxes for each kind of book separately. Paperbacks: 5,985 / 19 = 315 boxes (19 x 315 = 5,985). Hardcovers: 1,995 / 21 = 95 boxes (21 x 95 = 1,995). Altogether the library fills 315 + 95 = 410 boxes.

Key computation (JS): `return String(5985/19+1995/21);`

Distractors:
- A (380): the student combines 5,985 + 1,995 = 7,980 and divides by 21, ignoring that paperbacks go in 19-book boxes | computation: `return String((5985+1995)/21);`
- C (390): the student divides the paperbacks by 21 and the hardcovers by 19, getting 285 + 105 = 390 | computation: `return String(5985/21+1995/19);`
- D (220): the student finds 315 and 95 correctly and then takes 315 - 95 = 220, treating "altogether" as a comparison | computation: `return String(5985/19-1995/21);`

---

## MV2-N56-14

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Each square meter of tile on a wall needs 3.75 kilograms of grout. The wall has 7 square meters to tile, and 0.4 square meter of it is already finished. How many kilograms of grout are needed to finish the rest of the wall?

A. 23.45
B. 20.55
C. 24.75
D. 25.85

KEY: C (24.75)

Worked solution: The part still to tile is 7 - 0.4 = 6.6 square meters. Each square meter needs 3.75 kilograms, so multiply 6.6 x 3.75. 66 x 375 = 24,750, and there are 1 + 2 = 3 decimal places, so 6.6 x 3.75 = 24.750 = 24.75 kilograms.

Key computation (JS): `const f=x=>(Math.round(x*100)/100).toFixed(2);return f((7-0.4)*3.75);`

Distractors:
- A (23.45): the student takes 0.4 off the 3.75 kilograms per square meter and multiplies 3.35 x 7 | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f((3.75-0.4)*7);`
- B (20.55): the student multiplies 3 x 6.6 = 19.8 and then adds 0.75 instead of multiplying 0.75 by 6.6 | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f(3*(7-0.4)+0.75);`
- D (25.85): the student writes 3.75 x 7 - 0.4 = 25.85, forgetting that the 0.4 square meter must also be multiplied by 3.75 before it is taken away | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f(3.75*7-0.4);`
