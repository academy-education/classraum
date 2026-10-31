# Items for review, KEYED (10)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB13-D6-05

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A list is made of consecutive whole numbers, starting with 6. The mean of the numbers in the list is 22. How many numbers are in the list?

A. 33
B. 28
C. 31
D. 17

KEY: A (33)

Worked solution: In a list of consecutive numbers the mean is halfway between the first and last numbers, so the last number is 2 x 22 - 6 = 38. From 6 to 38 there are 38 - 6 + 1 = 33 numbers.

Key computation (JS): `const last=2*22-6;return last-6+1;`

Distractors:
- B (28): 22 + 6. | computation: `return 22+6;`
- C (31): 2 x 16 - 1. | computation: `return 2*(22-6)-1;`
- D (17): 22 - 6 + 1. | computation: `return 22-6+1;`

---

## MB13-D7-04

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A school has 800 students, and 80 of them walk to school. Before knowing this, Ella asked a random sample of 80 of the students, and 12 of them walk to school. Ella used the sample to estimate how many of the 800 students walk to school. By what percent is the estimate greater than the actual number? Round to the nearest whole percent.

A. 40
B. 50
C. 6
D. 15

KEY: B (50)

Worked solution: The sample rate is 12/80, so the estimate is 12/80 x 800 = 120. That is 120 - 80 = 40 more than the actual number, and 40 / 80 = 50% exactly (no rounding is needed).

Key computation (JS): `const e=800*12/80;return (e-80)/80*100;`

Distractors:
- A (40): 120 - 80. | computation: `return 800*12/80-80;`
- C (6): 40 / 720. | computation: `return Math.round((800*12/80-80)/(800-80)*100);`
- D (15): 12/80 as a percent. | computation: `return Math.round(12/80*100);`

---

## MB13-D6-02

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In a survey of 12 students, 50% chose purple as their favorite color. Then 28 more students were surveyed, and all of them chose purple. What percent of all the students surveyed chose purple?

A. 78
B. 70
C. 85
D. 75

KEY: C (85)

Worked solution: At first 50% of 12 is 6 students. After the new students, 6 + 28 = 34 of 40 students chose purple, which is 85%.

Key computation (JS): `return 100*(50*12/100+28)/(12+28);`

Distractors:
- A (78): 50 + 28. | computation: `return 50+28;`
- B (70): 28 / 40. | computation: `return 100*28/(12+28);`
- D (75): (50 + 100) / 2. | computation: `return (50+100)/2;`

---

## MB13-D6-06

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Mia did push-ups every day. After 5 days, Mia's mean was 31 push-ups per day. After 6 days, the mean was 36 push-ups per day. After 7 days, the mean was 34 push-ups per day. How many more push-ups did Mia do on day 6 than on day 7?

A. 22
B. 49
C. 30
D. 39

KEY: D (39)

Worked solution: The totals are 5 x 31 = 155, 6 x 36 = 216 and 7 x 34 = 238. Day 6 was 216 - 155 = 61 push-ups and day 7 was 238 - 216 = 22. Day 6 had 61 - 22 = 39 more.

Key computation (JS): `const d6=6*36-5*31;const d7=7*34-6*36;return d6-d7;`

Distractors:
- A (22): 7 x 34 - 6 x 36 = 22. | computation: `return 7*34-6*36;`
- B (49): 7 x (5 - (-2)). | computation: `return 7*((36-31)-(34-36));`
- C (30): 6 x 5. | computation: `return 6*(36-31);`

---

## MB13-D7-03

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Ella writes each integer from -8 to 15 on its own card and mixes the cards. Ella then draws one card without looking, and x is the number on it. What is the probability that 2x - 7 > 5?

A. 3/8
B. 2/3
C. 7/12
D. 13/24

KEY: A (3/8)

Worked solution: 2x - 7 > 5 means 2x > 12, so x > 6. From -8 through 15 there are 24 integers, and 7 through 15 is 9 of them. The probability is 9/24 = 3/8.

Key computation (JS): `let n=0;for(let x=-8;x<=15;x++) if(2*x-7>5) n++;return n/24;`

Distractors:
- B (2/3): x > -1. | computation: `return (15-Math.floor((5-7)/2))/24;`
- C (7/12): 14/24. | computation: `return (6-(-8))/24;`
- D (13/24): x > 2.5. | computation: `return (15-Math.floor(5/2))/24;`

---

## MB13-D6-01

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: In a survey of families in a town, 20% of the families have no pets, 35% have 1 pet, 35% have 2 pets, and the rest have 3 pets. What is the mean number of pets per family for the families in the survey?

A. 1.05
B. 1.35
C. 0.8
D. 1.5

KEY: B (1.35)

Worked solution: Think of 100 families: 20 have 0 pets, 35 have 1, 35 have 2, and 10 have 3. They have 35 + 70 + 30 = 135 pets in all, so the mean is 135 / 100 = 1.35 pets per family.

Key computation (JS): `return (35+2*35+3*(100-20-35-35))/100;`

Distractors:
- A (1.05): (35 + 70) / 100. | computation: `return (35+2*35)/100;`
- C (0.8): 80%. | computation: `return (35+35+(100-20-35-35))/100;`
- D (1.5): (0 + 1 + 2 + 3) / 4 = 1.5. | computation: `return (0+1+2+3)/4;`

---

## MB13-D7-01

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A spinner lands on red, blue, green, or yellow. The probability that it lands on yellow is 1/4. The probability that it lands on red is twice the probability that it lands on blue, and the probability that it lands on green is three times the probability that it lands on blue. What is the probability that the spinner lands on green?

A. 9/20
B. 1/2
C. 3/8
D. 9/28

KEY: C (3/8)

Worked solution: The probabilities add to 1, so red, blue and green share 1 - 1/4 = 3/4. If blue is one part, red is 2 parts and green is 3 parts, 6 parts in all, so one part is 3/4 / 6 = 1/8. Green is 3 x 1/8 = 3/8.

Key computation (JS): `const b=(1-1/4)/(1+2+3);return 3*b;`

Distractors:
- A (9/20): 3/4 x 3/5. | computation: `return (1-(1/4))*3/(2+3);`
- B (1/2): 3/6. | computation: `return 3/(1+2+3);`
- D (9/28): 3/7 of 3/4. | computation: `return (1-(1/4))*3/(2+3+2);`

---

## MB13-D7-02

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A spinner lands on 1, 2, 3, or 4. The probability that it lands on 1 is 0.3, the probability that it lands on 2 is 0.1, and the probability that it lands on 3 is 0.3. Noor spins the spinner two times and adds the two numbers. What is the probability that the sum is 6?

A. 0.36
B. 0.24
C. 0.23
D. 0.15

KEY: D (0.15)

Worked solution: The probability of 4 is 1 - 0.3 - 0.1 - 0.3 = 0.3. A sum of 6 comes from 2 then 4, 4 then 2, or 3 then 3: 0.1 x 0.3 + 0.3 x 0.1 + 0.3 x 0.3 = 0.15.

Key computation (JS): `const p4=1-0.3-0.1-0.3;return 2*0.1*p4+0.3*0.3;`

Distractors:
- A (0.36): 2 x 0.1 x 0.3 + 0.3. | computation: `return 2*0.1*(1-0.3-0.1-0.3)+0.3;`
- B (0.24): 2 x 0.1 x 0.3 + 2 x 0.3 x 0.3. | computation: `return 2*0.1*(1-0.3-0.1-0.3)+2*0.3*0.3;`
- C (0.23): P(4) taken as 0.7. | computation: `return 2*0.1*(0.3+0.1+0.3)+0.3*0.3;`

---

## MB13-D6-03

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Nine players in a game scored 10, 25, 14, 35, 22, 18, 21, 23, and 19 points. What is the mean score of the players who scored more than the median score?

A. 26.25
B. 28
C. 24
D. 20.25

KEY: A (26.25)

Worked solution: In order the scores are 10, 14, 18, 19, 21, 22, 23, 25, 35. The median is the 5th score, 21. The four scores above it are 22, 23, 25, 35, which add to 105, so their mean is 105 / 4 = 26.25.

Key computation (JS): `const v=[10,25,14,35,22,18,21,23,19].sort((a,b)=>a-b);return (v[5]+v[6]+v[7]+v[8])/4;`

Distractors:
- B (28): (21 + 35) / 2. | computation: `return (21+35)/2;`
- C (24): (23 + 25) / 2. | computation: `return (23+25)/2;`
- D (20.25): 81 / 4. | computation: `return (18+21+23+19)/4;`

---

## MB13-D7-05

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A store gets a shipment of 4,800 phone cases. Lena checks a random sample of 150 of the cases and finds 25 that are scratched. The store sends a shipment back if more than 4% of its cases are scratched. Based on the sample, how many more cases in the shipment are estimated to be scratched than the 4% limit allows?

A. 794
B. 608
C. 768
D. 775

KEY: B (608)

Worked solution: In the sample, 25 of 150 are scratched, so the estimate for the shipment is 25/150 x 4800 = 800. The 4% limit is 4% of 4800 = 192. The estimate is 800 - 192 = 608 more than the limit.

Key computation (JS): `return 4800*25/150-4800*4/100;`

Distractors:
- A (794): 800 - 4% of 150. | computation: `return 4800*25/150-150*4/100;`
- C (768): 800 - 4% of 800. | computation: `return 4800*25/150*(1-4/100);`
- D (775): 800 - 25. | computation: `return 4800*25/150-25;`
