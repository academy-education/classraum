# Items for review, KEYED (8)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB4-D-07

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The probability that Jun wins his chess match on Saturday is 0.35. The probability that Mei wins her tennis match on Saturday is 0.3. The two results do not affect each other. What is the probability, as a percent, that Jun does NOT win his match and Mei wins her match?

A. 19.5
B. 24.5
C. 10.5
D. 45.5

KEY: A (19.5)

Worked solution: The probability that Jun does not win is 1 - 0.35 = 0.65. Because the results do not affect each other, multiply: 0.65 x 0.3 = 0.195, which is 19.5%.

Key computation (JS): `return String(Math.round((1-0.35)*0.3*1000)/10);`

Distractors:
- B (24.5): The student complements Mei's probability instead of Jun's: 0.35 x 0.7 = 0.245, the chance that Jun wins and Mei does not: 24.5%. | computation: `return String(Math.round(0.35*(1-0.3)*1000)/10);`
- C (10.5): The student multiplies the two printed probabilities, 0.35 x 0.3 = 0.105, which is the chance that both win: 10.5%. | computation: `return String(Math.round(0.35*0.3*1000)/10);`
- D (45.5): Seeing one 'not', the student complements both probabilities: 0.65 x 0.7 = 0.455, the chance that neither wins: 45.5%. | computation: `return String(Math.round((1-0.35)*(1-0.3)*1000)/10);`

---

## MB4-D-12

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A painter made a scatter plot of x, the length of a fence section in meters, and y, the time in minutes it took to paint the section. A line of fit for the data is y = 2.5x + 6. The painter has five more fence sections to paint, with lengths of 21, 22, 24, 28, and 29 meters. What is the mean of the five predicted painting times, in minutes?

A. 66
B. 68
C. 63.2
D. 77

KEY: B (68)

Worked solution: The predicted times are 2.5 x 21 + 6 = 58.5, 61, 66, 76 and 78.5 minutes. Their sum is 340, and 340 / 5 = 68. (Equivalently, the mean length is 124 / 5 = 24.8 meters, and 2.5 x 24.8 + 6 = 68.)

Key computation (JS): `const xs=[21,22,24,28,29];const p=xs.map(x=>2.5*x+6);return String(p.reduce((a,b)=>a+b,0)/5);`

Distractors:
- A (66): The student takes the middle length, 24 meters, as the typical section and gives its prediction, 2.5 x 24 + 6 = 66. | computation: `const xs=[21,22,24,28,29];return String(2.5*xs[2]+6);`
- C (63.2): The student computes 2.5 x (21 + 22 + 24 + 28 + 29) + 6 = 316 as the total of the predictions and divides by 5 to get 63.2. | computation: `const xs=[21,22,24,28,29];const s=xs.reduce((a,b)=>a+b,0);return String(Math.round((2.5*s+6)/5*10)/10);`
- D (77): With the mean length 24.8, the student computes 2.5 x (24.8 + 6) = 77 instead of 2.5 x 24.8 + 6. | computation: `const xs=[21,22,24,28,29];const m=xs.reduce((a,b)=>a+b,0)/5;return String(Math.round(2.5*(m+6)*10)/10);`

---

## MB4-D-05

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A basketball player recorded how many points she scored in each of ten games. The table shows the results: each row gives a number of points and the number of games in which she scored that many points. How much greater is the mean number of points per game than the mode?

Table:

|  | Number of Games |
| --- | --- |
| 6 | 4 |
| 8 | 1 |
| 10 | 3 |
| 11 | 1 |
| 12 | 1 |

A. 4.5
B. 3
C. 2.5
D. 3.4

KEY: C (2.5)

Worked solution: The total number of points is 6 x 4 + 8 x 1 + 10 x 3 + 11 x 1 + 12 x 1 = 24 + 8 + 30 + 11 + 12 = 85, so the mean is 85 / 10 = 8.5 points. The mode is the number of points scored in the most games: 6 points (4 games). The mean is 8.5 - 6 = 2.5 points greater than the mode.

Key computation (JS): `const v=[6,8,10,11,12],f=[4,1,3,1,1];const n=f.reduce((a,b)=>a+b,0);const mean=v.reduce((a,x,i)=>a+x*f[i],0)/n;const mode=v[f.indexOf(Math.max(...f))];return String(Math.round((mean-mode)*100)/100);`

Distractors:
- A (4.5): The student finds the mean 8.5 correctly but reports the mode as 4, the largest number in the Number of Games column, so 8.5 - 4 = 4.5. | computation: `const v=[6,8,10,11,12],f=[4,1,3,1,1];const mean=v.reduce((a,x,i)=>a+x*f[i],0)/10;return String(Math.round((mean-Math.max(...f))*100)/100);`
- B (3): The student lists the ten scores in order, takes the middle value (8 + 10) / 2 = 9 as the 'average', and 9 - 6 = 3. | computation: `const d=[6,6,6,6,8,10,10,10,11,12];return String((d[4]+d[5])/2-6);`
- D (3.4): The student finds the mean of 6, 8, 10, 11 and 12 (47 / 5 = 9.4) as if each value appeared once, and 9.4 - 6 = 3.4. | computation: `const v=[6,8,10,11,12];return String(Math.round((v.reduce((a,b)=>a+b,0)/v.length-6)*100)/100);`

---

## MB4-D-10

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A scientist made a scatter plot of x, the grams of plant food given to each tomato plant, and y, the height of the plant in centimeters. A line of fit for the data is y = 0.8x + 12. The table shows the data for two of the plants. The residual for a plant is its actual height minus the height predicted by the line of fit. What is the residual for Plant Q minus the residual for Plant P?

Table:

|  | Plant Food (grams) | Height (cm) |
| --- | --- | --- |
| Plant P | 17 | 33.5 |
| Plant Q | 4 | 8.7 |

A. -6.5
B. -10.4
C. -1.4
D. -14.4

KEY: D (-14.4)

Worked solution: Plant P: predicted 0.8 x 17 + 12 = 25.6, so its residual is 33.5 - 25.6 = 7.9. Plant Q: predicted 0.8 x 4 + 12 = 15.2, so its residual is 8.7 - 15.2 = -6.5. Residual for Q minus residual for P: -6.5 - 7.9 = -14.4.

Key computation (JS): `const p=0.8*17+12,q=0.8*4+12;const rP=33.5-p,rQ=8.7-q;return String(Math.round((rQ-rP)*10)/10);`

Distractors:
- A (-6.5): The student computes Q's residual, 8.7 - 15.2 = -6.5, and gives it as the answer without subtracting P's residual. | computation: `const q=0.8*4+12;return String(Math.round((8.7-q)*10)/10);`
- B (-10.4): The student finds the two predictions, 15.2 and 25.6, and subtracts them, 15.2 - 25.6 = -10.4, never using the actual heights. | computation: `const p=0.8*17+12,q=0.8*4+12;return String(Math.round((q-p)*10)/10);`
- C (-1.4): The student finds Q's residual as 6.5 instead of -6.5 (the size of the gap) and computes 6.5 - 7.9 = -1.4. | computation: `const p=0.8*17+12,q=0.8*4+12;const rP=33.5-p,rQ=8.7-q;return String(Math.round((Math.abs(rQ)-rP)*10)/10);`

---

## MB4-D-09

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A prize machine gives out red, blue, green, or yellow balls. The table shows the probability model for the color of one ball, but the probability for yellow is missing. Mason will get 200 balls from the machine. Based on the model, how many yellow balls should he expect to get?

Table:

|  | Probability |
| --- | --- |
| Red | 0.25 |
| Blue | 0.3 |
| Green | 1/8 |
| Yellow | ? |

A. 65
B. 50
C. 54
D. 119

KEY: A (65)

Worked solution: The four probabilities add to 1. Green is 1/8 = 0.125. So yellow is 1 - 0.25 - 0.3 - 0.125 = 0.325. In 200 balls, Mason should expect 0.325 x 200 = 65 yellow balls.

Key computation (JS): `const y=1-0.25-0.3-1/8;return String(Math.round(y*200));`

Distractors:
- B (50): Ignoring the model, the student gives each of the 4 colors a chance of 1/4 and expects 200 / 4 = 50 yellow balls. | computation: `return String(200/4);`
- C (54): The student writes 1/8 as 0.18, so yellow is 1 - 0.25 - 0.3 - 0.18 = 0.27, and 0.27 x 200 = 54. | computation: `const y=1-0.25-0.3-0.18;return String(Math.round(y*200));`
- D (119): Adding 0.25 and 0.3 with the right ends lined up, the student gets 0.28; then 1 - 0.28 - 0.125 = 0.595 and 0.595 x 200 = 119. | computation: `const y=1-(0.25+0.03)-1/8;return String(Math.round(y*200));`

---

## MB4-D-01

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Students measured the lengths of some shells, in inches. The table shows the line plot data: each row gives a length and the number of shells with that length. Later the students found that every shell recorded as 1 3/4 inches long was really 2 3/8 inches long. When those lengths are corrected, by how many inches does the total length of all the shells increase?

Table:

|  | Number of Shells |
| --- | --- |
| 1 1/2 | 5 |
| 1 3/4 | 3 |
| 2 1/8 | 6 |
| 2 3/8 | 4 |

A. 2 5/8
B. 1 7/8
C. 2 1/2
D. 4 1/8

KEY: B (1 7/8)

Worked solution: Only the 3 shells recorded as 1 3/4 inches change. Each one is really 2 3/8 inches, so each grows by 2 3/8 - 1 3/4 = 2 3/8 - 1 6/8 = 1 11/8 - 1 6/8 = 5/8 inch. Three shells grow by 3 x 5/8 = 15/8 = 1 7/8 inches, so the total length increases by 1 7/8 inches.

Key computation (JS): `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const per=(2*8+3)-(1*8+6);return mx(3*per,8);`

Distractors:
- A (2 5/8): To subtract 1 6/8 from 2 3/8 the student borrows 1 whole as 10/8, making 1 13/8, so each shell grows 13/8 - 6/8 = 7/8 and 3 shells give 21/8 = 2 5/8. | computation: `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const per=10+3-6;return mx(3*per,8);`
- C (2 1/2): The student finds the 5/8 growth per shell correctly but multiplies by 4, the number of shells already in the 2 3/8 row, getting 20/8 = 2 1/2. | computation: `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const per=(2*8+3)-(1*8+6);return mx(4*per,8);`
- D (4 1/8): Faced with 3/8 - 6/8, the student takes 6/8 - 3/8 = 3/8 and 2 - 1 = 1, so each shell grows 1 3/8 and 3 shells give 33/8 = 4 1/8. | computation: `const mx=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const w=Math.floor(n/d),r=n-w*d;return r===0?String(w):(w?w+' '+r+'/'+d:r+'/'+d);};const per=8*(2-1)+(6-3);return mx(3*per,8);`

---

## MB4-D-04

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The numbers of minutes that eleven bus trips took were 61, 35, 56, 17, 13, 15, 31, 19, 33, 23, and 16. Use this rule for quartiles: the first quartile is the median of the five values below the median, and the third quartile is the median of the five values above the median; the median itself is left out of both groups. How many minutes greater is the range of the trip times than the interquartile range?

A. 26
B. 25
C. 29
D. 30.5

KEY: C (29)

Worked solution: In order the times are 13, 15, 16, 17, 19, 23, 31, 33, 35, 56, 61. The range is 61 - 13 = 48. The median is 23. The five values below it are 13, 15, 16, 17, 19, so the first quartile is 16; the five above it are 31, 33, 35, 56, 61, so the third quartile is 35. The interquartile range is 35 - 16 = 19. The range is 48 - 19 = 29 minutes greater.

Key computation (JS): `const v=[61,35,56,17,13,15,31,19,33,23,16];const s=[...v].sort((a,b)=>a-b);return String((s[10]-s[0])-(s[8]-s[2]));`

Distractors:
- A (26): Without ordering, the student uses the first and last numbers in the list, 61 and 16, as the extremes, so the range is 45 and 45 - 19 = 26. | computation: `const v=[61,35,56,17,13,15,31,19,33,23,16];const s=[...v].sort((a,b)=>a-b);return String(Math.abs(v[10]-v[0])-(s[8]-s[2]));`
- B (25): The student finds the range correctly but takes the 3rd and 9th numbers as written, 56 and 33, as the quartiles, so the interquartile range is 23 and 48 - 23 = 25. | computation: `const v=[61,35,56,17,13,15,31,19,33,23,16];const s=[...v].sort((a,b)=>a-b);return String((s[10]-s[0])-Math.abs(v[8]-v[2]));`
- D (30.5): Ignoring the rule, the student splits the eleven values into two groups of six that share 23, so the quartiles are 16.5 and 34, the interquartile range is 17.5, and 48 - 17.5 = 30.5. | computation: `const s=[61,35,56,17,13,15,31,19,33,23,16].sort((a,b)=>a-b);return String((s[10]-s[0])-((s[7]+s[8])/2-(s[2]+s[3])/2));`

---

## MB4-D-03

Area: Statistics and Probability | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Five students took a quiz. Their scores were 62, 85, 80, 85, and 78. The teacher then added 6 points to every score. What is the mean of the new scores?

A. 79.2
B. 86
C. 105
D. 84

KEY: D (84)

Worked solution: The new scores are 68, 91, 86, 91, and 84. Their sum is 420, and 420 / 5 = 84. (The old mean is 390 / 5 = 78, and adding 6 to every score adds 6 to the mean: 78 + 6 = 84.)

Key computation (JS): `const s=[62,85,80,85,78].map(x=>x+6);return String(s.reduce((a,b)=>a+b,0)/s.length);`

Distractors:
- A (79.2): The student adds the five old scores (390), adds 6 only once to get 396, and divides by 5 to get 79.2. | computation: `const s=[62,85,80,85,78];return String((s.reduce((a,b)=>a+b,0)+6)/5);`
- B (86): The student puts the scores in order, takes the middle score 80, and adds 6 to get 86. | computation: `const s=[62,85,80,85,78].sort((a,b)=>a-b);return String(s[2]+6);`
- C (105): The student adds 6 to every score (sum 420) but divides by 4, counting the two 85s as one score, and gets 105. | computation: `const s=[62,85,80,85,78];return String((s.reduce((a,b)=>a+b,0)+6*5)/4);`
