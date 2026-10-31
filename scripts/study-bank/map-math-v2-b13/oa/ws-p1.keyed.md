# Items for review, KEYED (10)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB13-O7-04

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A quiz has 16 questions worth 3 points each and 11 questions worth 5 points each. Ivy gets 3 of the 3-point questions wrong and 4 of the 5-point questions wrong, and all the others right. To the nearest tenth of a percent, what percent of the total points does Ivy earn?

A. 71.8
B. 74.1
C. 72.4
D. 73.8

KEY: A (71.8)

Worked solution: Total points: 16 x 3 + 11 x 5 = 103. Points lost: 3 x 3 + 4 x 5 = 29. Points earned: 74. 74 / 103 = 0.7184, about 71.8%.

Key computation (JS): `const T=16*3+11*5;const lost=3*3+4*5;return Math.round((T-lost)/T*1000)/10;`

Distractors:
- B (74.1): 20 / 27. | computation: `return (Math.round(((16+11-3-4)/(16+11)*100)*10)/10);`
- C (72.4): (13/16 + 7/11) / 2. | computation: `return (Math.round((((16-3)/16+(11-4)/11)/2*100)*10)/10);`
- D (73.8): (103 - 27) / 103. | computation: `return (Math.round(((103-(3*5+4*3))/103*100)*10)/10);`

---

## MB13-O7-05

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A sandwich has 8 grams of fat, 30 grams of carbohydrate, and 9 grams of protein. Each gram of fat has 9 Calories, and each gram of carbohydrate or protein has 4 Calories. To the nearest whole percent, what percent of its Calories come from fat?

A. 21
B. 32
C. 26
D. 46

KEY: B (32)

Worked solution: Fat: 8 x 9 = 72 Calories. Carbohydrate and protein: (30 + 9) x 4 = 156 Calories. Total: 228. 72 / 228 = 0.3158, about 32%.

Key computation (JS): `const fat=9*8;const all=fat+4*30+4*9;return Math.round(fat/all*100);`

Distractors:
- A (21): 8 / 38. | computation: `return Math.round(8/(8+30)*100);`
- C (26): 72 / 273. | computation: `return Math.round(9*8/(9*8+4*30+9*9)*100);`
- D (46): 72 / 156. | computation: `return Math.round(9*8/(4*30+4*9)*100);`

---

## MB13-O8-01

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A candle burns down at a steady rate. 1 hour after it was lit, the candle was 7.5 centimeters tall. 5 hours after it was lit, it was 5.5 centimeters tall. How many hours after it was lit will the candle have burned down completely?

A. 12
B. 18.75
C. 16
D. 7.75

KEY: C (16)

Worked solution: Between hour 1 and hour 5 the candle got 7.5 - 5.5 = 2 cm shorter in 4 hours, so it burns 0.5 cm per hour. At hour 5 it has 5.5 cm left, which takes 5.5 / 0.5 = 11 more hours. It burns out 5 + 11 = 16 hours after it was lit.

Key computation (JS): `const r=(7.5-5.5)/(5-1);return 5+5.5/r;`

Distractors:
- A (12): 11 + 1. | computation: `return 5.5/((7.5-5.5)/(5-1))+1;`
- B (18.75): rate 2 / 5, then 5.5 / rate + 5. | computation: `return 5.5/((7.5-5.5)/5)+5;`
- D (7.75): 5.5 x 0.5 + 5. | computation: `return 5.5*((7.5-5.5)/(5-1))+5;`

---

## MB13-O6-01

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Mia painted 5/8 of a deck in 1 hour 50 minutes. Mia keeps painting at the same rate. How many more minutes will it take Mia to paint the rest of the deck?

A. 54
B. 36
C. 90
D. 66

KEY: D (66)

Worked solution: 1 hour 50 minutes is 110 minutes for 5/8 of the deck. The rest is 3/8, which is 3/5 times as much work, so it takes 110 x 3/5 = 66 minutes.

Key computation (JS): `return (60*1+50)*(8-5)/5;`

Distractors:
- A (54): writes 1 hours 50 minutes as 1.50 hours and multiplies by 60: (60 x 1+0.6 x 50) x (8-5)/5. | computation: `return (60*1+0.6*50)*(8-5)/5;`
- B (36): ignores the 50 minutes: 60 x 1 x (8-5)/5. | computation: `return 60*1*(8-5)/5;`
- C (90): reads 1 hours 50 minutes as 150 minutes: (100 x 1+50) x (8-5)/5. | computation: `return (100*1+50)*(8-5)/5;`

---

## MB13-O6-02

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A game box holds only gold tokens and silver tokens, and it has the same number of each. A gold token is worth 25 cents and weighs 7.5 grams. A silver token is worth 5 cents and weighs 5 grams. The tokens weigh 0.9 kilograms in all. How many dollars are the tokens worth?

A. 21.60
B. 19.50
C. 18.00
D. 9.00

KEY: A (21.60)

Worked solution: One gold token and one silver token weigh 7.5 + 5 = 12.5 grams and are worth 30 cents. 0.9 kilograms is 900 grams, which is 900 / 12.5 = 72 pairs. They are worth 72 x 30 = 2,160 cents = $21.60.

Key computation (JS): `return 900/(7.5+5)*(25+5)/100;`

Distractors:
- B (19.50): splits the 900 grams equally between the two kinds instead of using equal numbers of tokens: (900/2/7.5 x 25+900/2/5 x 5)/100. | computation: `return (900/2/7.5*25+900/2/5*5)/100;`
- C (18.00): finds the 72 pairs but counts only the gold tokens' value: 72 x 25/100. | computation: `return 72*25/100;`
- D (9.00): treats every token as a silver token: 900/5 x 5/100. | computation: `return 900/5*5/100;`

---

## MB13-O7-03

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A typing test counts every 5 characters as one word. Net speed is the number of words typed minus the number of errors, divided by the number of minutes. Hana typed 1,140 characters in 4 minutes and made 10 errors. What was Hana's net speed, in words per minute?

A. 57.0
B. 54.5
C. 55.0
D. 56.5

KEY: B (54.5)

Worked solution: 1,140 characters is 1,140 / 5 = 228 words. Subtract the errors: 228 - 10 = 218. 4 minutes is 4 minutes, so the net speed is 218 / 4 = 54.5 words per minute.

Key computation (JS): `const words=1140/5;const minutes=4;return (words-10)/minutes;`

Distractors:
- A (57.0): 228 / 4. | computation: `return 1140/5/4;`
- C (55.0): (1140 / 4 - 10) / 5. | computation: `return (1140/4-10)/5;`
- D (56.5): (1140 - 10) / 5 / 4. | computation: `return (1140-10)/5/4;`

---

## MB13-O6-03

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Omar and Sara each run laps of a track at a steady pace. In the time it takes Sara to run 4 laps, Omar runs 5 laps. Sara takes 1 minute 10 seconds to run one lap. How many seconds does Omar take to run one lap?

A. 52.5
B. 69
C. 56
D. 52.8

KEY: C (56)

Worked solution: Sara's lap is 1 x 60 + 10 = 70 seconds, so 4 laps take Sara 4 x 70 = 280 seconds. Omar runs 5 laps in those 280 seconds, so one lap takes Omar 280 / 5 = 56 seconds.

Key computation (JS): `return (60*1+10)*4/5;`

Distractors:
- A (52.5): takes away 1/4 of Sara's lap time for the extra lap: 70-70 x (5-4)/4. | computation: `return 70-70*(5-4)/4;`
- B (69): takes 1 second off for the 1 extra lap: 70-(5-4). | computation: `return 70-(5-4);`
- D (52.8): writes 1 min 10 s as 1.10 minutes and multiplies by 60: (1+10/100) x 60 x 4/5. | computation: `return (1+10/100)*60*4/5;`

---

## MB13-O7-01

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A trainer uses this rule: a person's heart-rate limit, in beats per minute, is 220 minus the person's age. Diego is 27 years old, and Diego's target heart rate during exercise is 80% of that limit. To the nearest whole beat, how many beats should Diego count in 15 seconds at the target heart rate?

A. 37
B. 23
C. 28
D. 39

KEY: D (39)

Worked solution: Diego's limit is 220 - 27 = 193 beats per minute. The target is 80% of that: 193 x 0.8 = 154.4 beats per minute. 15 seconds is 15/60 of a minute, so Diego should count 154.4 x 15/60 = 38.6, about 39 beats.

Key computation (JS): `const lim=220-27;const bpm=lim*80/100;return Math.round(bpm*15/60);`

Distractors:
- A (37): (176 - 27) x 15/60. | computation: `return Math.round((220*80/100-27)*15/60);`
- B (23): 154.4 x 15/100. | computation: `return Math.round((220-27)*80/100*15/100);`
- C (28): (193 - 80) x 15/60. | computation: `return Math.round((220-27-80)*15/60);`

---

## MB13-O7-07

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: At 7 p.m. there were 6.5 inches of snow on the ground at Nina's house. Snow fell at 0.8 inches per hour until 10 p.m., and then it stopped. Starting at 9 a.m. the next morning, the snow melted at 0.3 inch per hour. How many inches deep was the snow at 4 p.m.?

A. 6.8
B. 3.5
C. 5.9
D. 7.4

KEY: A (6.8)

Worked solution: From 7 p.m. to 10 p.m. is 3 hours, so 0.8 x 3 = 2.4 inches fell, and the depth reached 6.5 + 2.4 = 8.9 inches. From 9 a.m. to 4 p.m. is 7 hours, so 0.3 x 7 = 2.1 inches melted. 8.9 - 2.1 = 6.8 inches.

Key computation (JS): `const fell=0.8*3;const melted=0.3*7;return Math.round((6.5+fell-melted)*10)/10;`

Distractors:
- B (3.5): 0.3 x 18 hours. | computation: `return 6.5+0.8*3-0.3*18;`
- C (5.9): 6.5 + (0.8 - 0.3) x 3 - 0.3 x 7. | computation: `return 6.5+(0.8-0.3)*3-0.3*7;`
- D (7.4): 5 hours instead of 7. | computation: `return 6.5+0.8*3-0.3*5;`

---

## MB13-O6-04

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A knitting pattern has 18 rows for every 4 inches of length. Ella's headband will be 10 inches long, and each row takes Ella 35 seconds to knit. How many minutes will it take Ella to knit the headband?

A. 15.75
B. 26.25
C. 45
D. 14

KEY: B (26.25)

Worked solution: 10 inches at 18 rows for every 4 inches is 10 x 18 / 4 = 45 rows. At 35 seconds a row that is 45 x 35 = 1,575 seconds, and 1575 / 60 = 26.25 minutes.

Key computation (JS): `return 10*18/4*35/60;`

Distractors:
- A (15.75): treats 35 seconds as 0.35 of a minute: 10 x 18/4 x 35/100. | computation: `return 10*18/4*35/100;`
- C (45): gives the number of rows instead of the minutes: 10 x 18/4. | computation: `return 10*18/4;`
- D (14): adds 14 rows to the length instead of scaling it: (10+18-4) x 35/60. | computation: `return (10+18-4)*35/60;`
