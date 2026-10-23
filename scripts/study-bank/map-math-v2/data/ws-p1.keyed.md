# Items for review, KEYED (23)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MV2-D7-14

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Two coaches each chose basketball players at random and recorded the points each player scored in one game. The table shows the scores of Coach Lee's four players and Coach Ruiz's five players, but one of Coach Ruiz's scores is missing. The two samples have the same mean. What is the missing score?

Table:

|  | Player 1 | Player 2 | Player 3 | Player 4 | Player 5 |
| --- | --- | --- | --- | --- | --- |
| Coach Lee | 22 | 13 | 19 | 14 |  |
| Coach Ruiz | 8 | 18 | 6 | 20 | ? |

A. 33
B. 16
C. 21
D. 39

KEY: A (33)

Worked solution: Coach Lee's mean is (22 + 13 + 19 + 14) / 4 = 68 / 4 = 17 points. For Coach Ruiz's five players to have a mean of 17, their total must be 5 x 17 = 85. The four known scores add to 8 + 18 + 6 + 20 = 52, so the missing score is 85 - 52 = 33.

Key computation (JS): `const L=[22,13,19,14],R=[8,18,6,20];const sum=a=>a.reduce((s,x)=>s+x,0);const m=sum(L)/L.length;return m*5-sum(R);`

Distractors:
- B (16): 68 - 52 = 16. | computation: `const L=[22,13,19,14],R=[8,18,6,20];const sum=a=>a.reduce((s,x)=>s+x,0);const m=sum(L)/L.length;return sum(L)-sum(R);`
- C (21): 17 + (17 - 13) = 21. | computation: `const L=[22,13,19,14],R=[8,18,6,20];const sum=a=>a.reduce((s,x)=>s+x,0);const m=sum(L)/L.length;return m+(m-sum(R)/R.length);`
- D (39): 85 - (8 + 18 + 20) = 39. | computation: `const L=[22,13,19,14],R=[8,18,6,20];const sum=a=>a.reduce((s,x)=>s+x,0);const m=sum(L)/L.length;return m*5-(8+18+20);`

---

## MV2-D8-03

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A librarian surveyed students in the sixth, seventh and eighth grades and asked each student whether he or she has a library card. The table shows how many students in each grade were surveyed and what percent of those students have a library card. In all, how many of the surveyed students have a library card?

Table (Library card survey):

|  | Number of students surveyed | Percent who have a library card |
| --- | --- | --- |
| Grade 6 | 20 | 25% |
| Grade 7 | 40 | 40% |
| Grade 8 | 80 | 70% |

A. 50
B. 77
C. 71
D. 63

KEY: B (77)

Worked solution: Find the number with a card in each grade, then add. Grade 6: 25% of 20 = 5. Grade 7: 40% of 40 = 16. Grade 8: 70% of 80 = 56. In all, 5 + 16 + 56 = 77 students have a library card.

Key computation (JS): `return String((20*25 + 40*40 + 80*70)/100);`

Distractors:
- A (50): reading the percent column from the bottom up, the student takes 70% of 20, 40% of 40 and 25% of 80: 14 + 16 + 20 = 50 | computation: `return String((20*70 + 40*40 + 80*25)/100);`
- C (71): the student uses the sixth-grade 25% for the seventh graders too (a misread row): 5 + 25% of 40 = 10, plus 56, gives 71 | computation: `return String((20*25 + 40*25 + 80*70)/100);`
- D (63): the student averages 25%, 40% and 70% to get 45% and takes 45% of all 140 students, 63, as if every grade were the same size | computation: `return String((25 + 40 + 70)/3 * (20 + 40 + 80)/100);`

---

## MV2-D7-09

Area: Statistics and Probability | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A school has 900 students. Mr. Diaz asked a random sample of 60 students to name their favorite sport. The table shows the results. Based on the sample, about how many of the 900 students would name basketball as their favorite sport?

Table:

|  | Number of students |
| --- | --- |
| Soccer | 21 |
| Basketball | 18 |
| Swimming | 6 |
| Other | 15 |

A. 162
B. 225
C. 270
D. 360

KEY: C (270)

Worked solution: In the sample, 18 of the 60 students named basketball. 18/60 = 3/10. So about 3/10 of the 900 students, or 3/10 x 900 = 270 students, would name basketball.

Key computation (JS): `const t={soccer:21,basketball:18,swimming:6,other:15};return t.basketball/60*900;`

Distractors:
- A (162): 18% of 900 = 162. | computation: `const t={soccer:21,basketball:18,swimming:6,other:15};return t.basketball/100*900;`
- B (225): 15/60 of 900 = 225. | computation: `const t={soccer:21,basketball:18,swimming:6,other:15};return t.other/60*900;`
- D (360): 18/45 of 900 = 360. | computation: `const t={soccer:21,basketball:18,swimming:6,other:15};return t.basketball/(t.soccer+t.basketball+t.swimming)*900;`

---

## MV2-D7-02

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A gardener measured the heights, in centimeters, of 5 randomly chosen seedlings from each of two trays. The heights are shown in the table. The mean absolute deviation of a data set is the mean of the distances between each value and the mean of the set. How many centimeters greater is the mean absolute deviation of the Tray B heights than the mean absolute deviation of the Tray A heights?

Table:

|  | Seedling 1 | Seedling 2 | Seedling 3 | Seedling 4 | Seedling 5 |
| --- | --- | --- | --- | --- | --- |
| Tray A | 6.3 | 10.3 | 3.5 | 6.4 | 6.0 |
| Tray B | 11.0 | 3.2 | 10.9 | 3.0 | 11.9 |

A. 1.5
B. 1.9
C. 2.1
D. 2.4

KEY: D (2.4)

Worked solution: Tray A: the mean is (6.3 + 10.3 + 3.5 + 6.4 + 6.0) / 5 = 32.5 / 5 = 6.5. The distances from 6.5 are 0.2, 3.8, 3.0, 0.1 and 0.5, which add to 7.6, so the MAD is 7.6 / 5 = 1.52. Tray B: the mean is (11.0 + 3.2 + 10.9 + 3.0 + 11.9) / 5 = 40 / 5 = 8. The distances from 8 are 3.0, 4.8, 2.9, 5.0 and 3.9, which add to 19.6, so the MAD is 19.6 / 5 = 3.92. The difference is 3.92 - 1.52 = 2.4 centimeters.

Key computation (JS): `const A=[6.3,10.3,3.5,6.4,6],B=[11,3.2,10.9,3,11.9];const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;const med=a=>[...a].sort((x,y)=>x-y)[2];const ad=(a,c)=>a.reduce((s,x)=>s+Math.abs(x-c),0);const r=x=>Math.round(x*10)/10;return r(ad(B,mean(B))/5-ad(A,mean(A))/5);`

Distractors:
- A (1.5): The student finds the two means, 6.5 and 8, and subtracts, stopping before any deviation is computed. | computation: `const A=[6.3,10.3,3.5,6.4,6],B=[11,3.2,10.9,3,11.9];const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;const med=a=>[...a].sort((x,y)=>x-y)[2];const ad=(a,c)=>a.reduce((s,x)=>s+Math.abs(x-c),0);const r=x=>Math.round(x*10)/10;return r(mean(B)-mean(A));`
- B (1.9): Using the medians 6.3 and 10.9 as centers gives MADs of 1.44 and 3.34, a difference of 1.9. | computation: `const A=[6.3,10.3,3.5,6.4,6],B=[11,3.2,10.9,3,11.9];const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;const med=a=>[...a].sort((x,y)=>x-y)[2];const ad=(a,c)=>a.reduce((s,x)=>s+Math.abs(x-c),0);const r=x=>Math.round(x*10)/10;return r(ad(B,med(B))/5-ad(A,med(A))/5);`
- C (2.1): Range B 8.9 minus range A 6.8 gives 2.1. | computation: `const A=[6.3,10.3,3.5,6.4,6],B=[11,3.2,10.9,3,11.9];const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;const med=a=>[...a].sort((x,y)=>x-y)[2];const ad=(a,c)=>a.reduce((s,x)=>s+Math.abs(x-c),0);const r=x=>Math.round(x*10)/10;const rg=a=>Math.max(...a)-Math.min(...a);return r(rg(B)-rg(A));`

---

## MV2-D7-13

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A forest covers 90 square miles. To estimate the number of deer in the forest, a ranger chose 6 plots of land at random in the forest. Each plot is 1/4 square mile. The table shows the number of deer the ranger counted in each plot. Based on these plots, about how many deer are in the whole forest?

Table:

|  | Number of deer |
| --- | --- |
| Plot 1 | 5 |
| Plot 2 | 0 |
| Plot 3 | 7 |
| Plot 4 | 2 |
| Plot 5 | 5 |
| Plot 6 | 1 |

A. 1200
B. 1260
C. 1800
D. 1440

KEY: A (1200)

Worked solution: The 6 plots hold 5 + 0 + 7 + 2 + 5 + 1 = 20 deer. Each plot is 1/4 square mile, so the 90-square-mile forest is made of 90 / (1/4) = 360 plots. The mean is 20 / 6 deer per plot, so the estimate is 20 / 6 x 360 = 20 x 60 = 1,200 deer.

Key computation (JS): `const p=[5,0,7,2,5,1];const tot=p.reduce((s,x)=>s+x,0);const plots=90/(1/4);return tot/p.length*plots;`

Distractors:
- B (1260): Ordered counts 0, 1, 2, 5, 5, 7 have median 3.5; 3.5 x 360 = 1,260. | computation: `const p=[5,0,7,2,5,1];const tot=p.reduce((s,x)=>s+x,0);const plots=90/(1/4);const s=[...p].sort((a,b)=>a-b);return (s[2]+s[3])/2*plots;`
- C (1800): Two plots have 5 deer, so the student uses 5 per plot; 5 x 360 = 1,800. | computation: `const p=[5,0,7,2,5,1];const tot=p.reduce((s,x)=>s+x,0);const plots=90/(1/4);const c={};for(const x of p)c[x]=(c[x]||0)+1;const mode=+Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return mode*plots;`
- D (1440): 20 deer over 5 plots is 4 per plot; 4 x 360 = 1,440. | computation: `const p=[5,0,7,2,5,1];const tot=p.reduce((s,x)=>s+x,0);const plots=90/(1/4);return tot/p.filter(x=>x>0).length*plots;`

---

## MV2-D7-17

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: An apartment building has 400 apartments. A manager chose 20 of the apartments at random and counted the bicycles in each one. The table shows how many of the 20 apartments had each number of bicycles. Based on the sample, about how many bicycles are in all 400 apartments?

Table:

|  | Number of apartments |
| --- | --- |
| 0 bicycles | 2 |
| 1 bicycle | 3 |
| 2 bicycles | 7 |
| 3 bicycles | 4 |
| 4 bicycles | 4 |

A. 840
B. 900
C. 855
D. 800

KEY: B (900)

Worked solution: The sample has 0 x 2 + 1 x 3 + 2 x 7 + 3 x 4 + 4 x 4 = 0 + 3 + 14 + 12 + 16 = 45 bicycles in 20 apartments, a mean of 45 / 20 = 2.25 bicycles per apartment. For 400 apartments: 2.25 x 400 = 900 bicycles.

Key computation (JS): `const f=[2,3,7,4,4];const n=f.reduce((s,x)=>s+x,0);const tot=f.reduce((s,x,i)=>s+x*i,0);return tot/n*400;`

Distractors:
- A (840): 42 bicycles over 20 apartments is 2.1; 2.1 x 400 = 840. | computation: `const f=[2,3,7,4,4];const n=f.reduce((s,x)=>s+x,0);const tot=f.reduce((s,x,i)=>s+x*i,0);return (tot-1*f[1])/n*400;`
- C (855): 2.25 x 380 = 855. | computation: `const f=[2,3,7,4,4];const n=f.reduce((s,x)=>s+x,0);const tot=f.reduce((s,x,i)=>s+x*i,0);return tot/n*(400-n);`
- D (800): 2 x 400 = 800. | computation: `const f=[2,3,7,4,4];const n=f.reduce((s,x)=>s+x,0);const tot=f.reduce((s,x,i)=>s+x*i,0);const mode=f.indexOf(Math.max(...f));return mode*400;`

---

## MV2-D6-10

Area: Statistics and Probability | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: The table shows the data from two histograms of how many minutes it takes students to travel to school: one for students who walk and one for students who ride the bus. How many of the students who walk take less than 20 minutes?

Table (Travel time to school (minutes)):

|  | Students who walk | Students who ride the bus |
| --- | --- | --- |
| 0 to 9 | 4 | 9 |
| 10 to 19 | 10 | 12 |
| 20 to 29 | 8 | 12 |
| 30 to 39 | 4 | 9 |
| 40 to 49 | 4 | 4 |

A. 21
B. 25
C. 14
D. 16

KEY: C (14)

Worked solution: Less than 20 minutes means the intervals 0 to 9 and 10 to 19. In the column for students who walk that is 4 + 10 = 14 students.

Key computation (JS): `const c=[4,10,8,4,4];return c[0]+c[1];`

Distractors:
- A (21): the student adds the first two rows correctly but in the bus column, 9 + 12 = 21 | computation: `const c=[9,12,12,9,4];return c[0]+c[1];`
- B (25): the student treats the right-hand column as the one asked about and counts the rows from the bottom of the table up to 20, 12 + 9 + 4 = 25 | computation: `const c=[9,12,12,9,4];return c[2]+c[3]+c[4];`
- D (16): the student adds the walking counts from 20 minutes up, 8 + 4 + 4 = 16, reading "less than 20" as "20 and up" | computation: `const c=[4,10,8,4,4];return c[2]+c[3]+c[4];`

---

## MV2-D6-12

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In a card game, 30 players each scored points in one round. The table shows how many players got each score. What is the median score of the 30 players?

Table (Points scored in one round):

|  | Number of players |
| --- | --- |
| 3 | 3 |
| 4 | 7 |
| 5 | 5 |
| 6 | 2 |
| 7 | 6 |
| 8 | 1 |
| 9 | 1 |
| 10 | 5 |

A. 6.5
B. 6.1
C. 5
D. 5.5

KEY: D (5.5)

Worked solution: With 30 scores the median is the mean of the 15th and 16th scores in order. The first 3 scores are 3, the next 7 are 4 (scores 4 to 10), and the next 5 are 5 (scores 11 to 15). The 16th score is the first 6. The median is (5 + 6) / 2 = 5.5.

Key computation (JS): `const v=[3,4,5,6,7,8,9,10],c=[3,7,5,2,6,1,1,5];const d=v.flatMap((x,i)=>Array(c[i]).fill(x));return (d[14]+d[15])/2;`

Distractors:
- A (6.5): the student sees eight scores listed, 3 to 10, and averages the middle two, (6 + 7) / 2 = 6.5, ignoring how many players got each score | computation: `const v=[3,4,5,6,7,8,9,10];return (v[3]+v[4])/2;`
- B (6.1): the student multiplies each score by its count, adds to 183 and divides by 30, getting 6.1 | computation: `const v=[3,4,5,6,7,8,9,10],c=[3,7,5,2,6,1,1,5];return v.reduce((s,x,i)=>s+x*c[i],0)/30;`
- C (5): the student divides 30 by 2, counts to the 15th score, which is 5, and stops without averaging it with the 16th | computation: `const v=[3,4,5,6,7,8,9,10],c=[3,7,5,2,6,1,1,5];const d=v.flatMap((x,i)=>Array(c[i]).fill(x));return d[14];`

---

## MV2-D7-16

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A farmer weighed nine plums picked at random from each of two trees. The masses, in grams, are shown in the table. For each tree, find the first quartile as the middle of the four masses below the median and the third quartile as the middle of the four masses above the median; the median is left out of both groups of four. How many grams greater is the interquartile range of the Tree B masses than the interquartile range of the Tree A masses?

Table:

|  | Plum A | Plum B | Plum C | Plum D | Plum E | Plum F | Plum G | Plum H | Plum I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tree A | 31 | 40 | 20 | 57 | 29 | 41 | 22 | 34 | 28 |
| Tree B | 40 | 45 | 50 | 22 | 41 | 24 | 57 | 30 | 53 |

A. 9
B. 4
C. 11
D. 8

KEY: A (9)

Worked solution: Tree A in order: 20, 22, 28, 29, 31, 34, 40, 41, 57. The median is 31. Lower four: 20, 22, 28, 29, so Q1 = (22 + 28)/2 = 25. Upper four: 34, 40, 41, 57, so Q3 = (40 + 41)/2 = 40.5. IQR = 40.5 - 25 = 15.5. Tree B in order: 22, 24, 30, 40, 41, 45, 50, 53, 57. The median is 41. Q1 = (24 + 30)/2 = 27 and Q3 = (50 + 53)/2 = 51.5, so IQR = 24.5. The difference is 24.5 - 15.5 = 9 grams.

Key computation (JS): `const A=[31,40,20,57,29,41,22,34,28],B=[40,45,50,22,41,24,57,30,53];const S=a=>[...a].sort((x,y)=>x-y);const md=a=>{const s=S(a),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};const mn=a=>a.reduce((s,x)=>s+x,0)/a.length;const iqr=a=>{const s=S(a);return md(s.slice(5))-md(s.slice(0,4))};return iqr(B)-iqr(A);`

Distractors:
- B (4): Half-means give IQRs of 18.25 for A and 22.25 for B, a difference of 4. | computation: `const A=[31,40,20,57,29,41,22,34,28],B=[40,45,50,22,41,24,57,30,53];const S=a=>[...a].sort((x,y)=>x-y);const md=a=>{const s=S(a),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};const mn=a=>a.reduce((s,x)=>s+x,0)/a.length;const iqr=a=>{const s=S(a);return mn(s.slice(5))-mn(s.slice(0,4))};return Math.round((iqr(B)-iqr(A))*1e6)/1e6;`
- C (11): 51.5 - 40.5 = 11. | computation: `const A=[31,40,20,57,29,41,22,34,28],B=[40,45,50,22,41,24,57,30,53];const S=a=>[...a].sort((x,y)=>x-y);const md=a=>{const s=S(a),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};const mn=a=>a.reduce((s,x)=>s+x,0)/a.length;const q3=a=>md(S(a).slice(5));return q3(B)-q3(A);`
- D (8): Quartiles 28 and 40 for A, 30 and 50 for B: IQRs 12 and 20, a difference of 8. | computation: `const A=[31,40,20,57,29,41,22,34,28],B=[40,45,50,22,41,24,57,30,53];const S=a=>[...a].sort((x,y)=>x-y);const md=a=>{const s=S(a),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};const mn=a=>a.reduce((s,x)=>s+x,0)/a.length;const iqr=a=>{const s=S(a);return md(s.slice(4))-md(s.slice(0,5))};return iqr(B)-iqr(A);`

---

## MV2-D5-11

Area: Statistics and Probability | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Mr. Ford's class measured some leaves. The table shows the line plot data for every leaf except the leaves that are 1/2 inch long: each row gives a length, in inches, and the number of leaves with that length. The total length of all the leaves the class measured, including the 1/2-inch leaves, is 9 inches. How many leaves did the class measure in all?

Table:

|  | Number of leaves |
| --- | --- |
| 1/4 | 2 |
| 3/4 | 2 |
| 1 | 3 |

A. 18
B. 15
C. 11
D. 9

KEY: B (15)

Worked solution: The leaves in the table have a total length of 2 x 1/4 + 2 x 3/4 + 3 x 1 = 1/2 + 1 1/2 + 3 = 5 inches. The 1/2-inch leaves make up 9 - 5 = 4 inches. 4 / (1/2) = 8, so there are 8 half-inch leaves. In all: 2 + 2 + 3 + 8 = 15 leaves.

Key computation (JS): `const known=2*0.25+2*0.75+3*1;return 7+(9-known)/0.5`

Distractors:
- A (18): The student divides the whole 9 inches by 1/2. | computation: `return 9/0.5`
- C (11): The student takes the 4 inches left as 4 leaves: 7 + 4 = 11. | computation: `const known=2*0.25+2*0.75+3*1;return 7+(9-known)`
- D (9): The student turns the 4 remaining inches into 4 x 1/2 = 2 leaves, so 7 + 2 = 9. | computation: `const known=2*0.25+2*0.75+3*1;return 7+(9-known)*0.5`

---

## MV2-D8-02

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Mia measured the depth of the snow in her yard several times on a sunny day and made a scatter plot. A line of fit for the data is y = -1.6x + 20, where x is the number of hours after sunrise and y is the snow depth in centimeters. According to the line of fit, how many hours does it take for the predicted snow depth to go down by 12 centimeters?

A. 10.4
B. 5
C. 7.5
D. 6

KEY: C (7.5)

Worked solution: The slope -1.6 means the predicted depth goes down 1.6 centimeters every hour. To go down 12 centimeters takes 12 / 1.6 = 7.5 hours. (The starting depth, 20 cm, does not matter for how long a 12 cm drop takes.)

Key computation (JS): `return String(120/16);`

Distractors:
- A (10.4): the student combines the two numbers in the question by subtracting, 12 - 1.6 = 10.4, as if one hour of melting were taken off the 12 cm | computation: `return String(Math.round((12 - 1.6)*10)/10);`
- B (5): the student reads "go down by 12" as "go down to 12" and solves -1.6x + 20 = 12, getting x = 5 | computation: `return String((200 - 120)/16);`
- D (6): the student treats 1.6 cm per hour as about 2 cm per hour and divides 12 by 2, getting 6 | computation: `return String(12/2);`

---

## MV2-D6-14

Area: Statistics and Probability | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A box plot shows the prices, in dollars, of the used bikes at a shop. The left whisker starts at 10, the box starts at 18, the line inside the box is at 24, the box ends at 35, and the right whisker ends at 47. What is the interquartile range of the prices, in dollars?

A. 11
B. 25
C. 29
D. 17

KEY: D (17)

Worked solution: The box of a box plot runs from the first quartile to the third quartile. The first quartile is 18 and the third quartile is 35, so the interquartile range is 35 - 18 = 17 dollars.

Key computation (JS): `return 35-18;`

Distractors:
- A (11): the student subtracts the line inside the box from the end of the box, 35 - 24 = 11, measuring only the upper half of the box | computation: `return 35-24;`
- B (25): the student takes the start of the left whisker, 10, as the first quartile and gets 35 - 10 = 25 | computation: `return 35-10;`
- C (29): the student takes the end of the right whisker, 47, as the third quartile and gets 47 - 18 = 29 | computation: `return 47-18;`

---

## MV2-D7-05

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A crate holds 1,200 apples. Dev takes a random sample of 20 apples from the crate and finds 3 bruised apples. Mia takes a different random sample of 30 apples and finds 8 bruised apples. Each of them uses only their own sample to estimate the number of bruised apples in the crate. How much greater is Mia's estimate than Dev's estimate?

A. 140
B. 264
C. 600
D. 200

KEY: A (140)

Worked solution: Dev: 3/20 of 1,200 is 180 bruised apples. Mia: 8/30 of 1,200 is 320 bruised apples. Mia's estimate is 320 - 180 = 140 greater.

Key computation (JS): `return 8/30*1200-3/20*1200;`

Distractors:
- B (264): 11 bruised out of 50 apples, and 11/50 of 1,200 = 264. | computation: `return (8+3)/(30+20)*1200;`
- C (600): (8 - 3)/(30 - 20) = 1/2, and 1/2 of 1,200 = 600. | computation: `return (8-3)/(30-20)*1200;`
- D (200): 8 - 3 = 5 bruised, and 5/30 of 1,200 = 200. | computation: `return (8-3)/30*1200;`

---

## MV2-D7-01

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A basketball player makes 40% of her free throws. Kim uses random digits to simulate sets of 3 free throws. The digits 0 through 3 stand for a made shot, and the digits 4 through 9 stand for a missed shot. Each group of 3 digits in the table is one trial, or one set of 3 free throws. Based on the 20 trials, in what percent of the sets did the player make 1 or more of the 3 shots?

Table:

|  | Digits |
| --- | --- |
| Trial 1 | 582 |
| Trial 2 | 315 |
| Trial 3 | 689 |
| Trial 4 | 301 |
| Trial 5 | 916 |
| Trial 6 | 208 |
| Trial 7 | 374 |
| Trial 8 | 731 |
| Trial 9 | 212 |
| Trial 10 | 608 |
| Trial 11 | 162 |
| Trial 12 | 457 |
| Trial 13 | 249 |
| Trial 14 | 093 |
| Trial 15 | 130 |
| Trial 16 | 651 |
| Trial 17 | 520 |
| Trial 18 | 940 |
| Trial 19 | 023 |
| Trial 20 | 413 |

A. 55
B. 90
C. 80
D. 35

KEY: B (90)

Worked solution: A trial counts if 1 or more of its 3 digits is 0, 1, 2 or 3. Only two trials have no digit from 0 to 3: 689 and 457. So 20 - 2 = 18 of the 20 trials have 1 or more made shots. 18 out of 20 is 18/20 = 90/100, which is 90%.

Key computation (JS): `const t=["582","315","689","301","916","208","374","731","212","608","162","457","249","093","130","651","520","940","023","413"];const n=t.filter(s=>[...s].some(c=>+c<=3)).length;return n/t.length*100;`

Distractors:
- A (55): The student counts only trials with two or three digits from 0 to 3: 11 of 20. | computation: `const t=["582","315","689","301","916","208","374","731","212","608","162","457","249","093","130","651","520","940","023","413"];const n=t.filter(s=>[...s].filter(c=>+c<=3).length>=2).length;return n/t.length*100;`
- C (80): The student counts trials with at least one digit from 4 to 9, i.e. at least one miss: 16 of 20. | computation: `const t=["582","315","689","301","916","208","374","731","212","608","162","457","249","093","130","651","520","940","023","413"];const n=t.filter(s=>[...s].some(c=>+c>=4)).length;return n/t.length*100;`
- D (35): The student treats "at least 1" as "exactly 1": 7 of 20. | computation: `const t=["582","315","689","301","916","208","374","731","212","608","162","457","249","093","130","651","520","940","023","413"];const n=t.filter(s=>[...s].filter(c=>+c<=3).length===1).length;return n/t.length*100;`

---

## MV2-D8-09

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A park ranger asked visitors at two campgrounds whether they had seen a moose that day. The two-way table shows the results. How many percentage points greater is the percent of River Campground visitors who saw a moose than the percent of Lake Campground visitors who saw a moose?

Table (Moose sightings (number of visitors)):

|  | Saw a moose | Did not see a moose | Total |
| --- | --- | --- | --- |
| Lake Campground | 10 | 30 | 40 |
| River Campground | 36 | 54 | 90 |
| Total | 46 | 84 | 130 |

A. 20
B. 60
C. 15
D. 26

KEY: C (15)

Worked solution: Lake Campground: 10 of 40 visitors saw a moose, 10 / 40 = 25%. River Campground: 36 of 90 visitors saw a moose, 36 / 90 = 40%. The difference is 40 - 25 = 15 percentage points.

Key computation (JS): `return String(36*100/90 - 10*100/40);`

Distractors:
- A (20): the student writes 10 and 36 as percents of all 130 visitors and subtracts: (36 - 10) / 130 = 20 percentage points | computation: `return String((36 - 10)*100/130);`
- B (60): the student finds 40 - 25 = 15 and then divides by 25, reporting a 60 percent increase instead of 15 points | computation: `return String((36*100/90 - 10*100/40)*100/(10*100/40));`
- D (26): the student subtracts the numbers who saw a moose, 36 - 10 = 26, and calls it the difference in percent, ignoring that River Campground had more than twice as many visitors | computation: `return String(36 - 10);`

---

## MV2-D6-08

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Twelve students took a quiz. Their scores were 16, 4, 21, 12, 9, 22, 15, 7, 20, 13, 17, and 11. The third quartile is the median of the upper half of the scores. What is the third quartile of the 12 scores?

A. 18
B. 17
C. 14
D. 18.5

KEY: D (18.5)

Worked solution: In order the scores are 4, 7, 9, 11, 12, 13, 15, 16, 17, 20, 21, 22. The upper half is the top 6 scores: 15, 16, 17, 20, 21, 22. Their median is the mean of the 3rd and 4th of these: (17 + 20) / 2 = 18.5.

Key computation (JS): `const a=[16,4,21,12,9,22,15,7,20,13,17,11].sort((x,y)=>x-y);const u=a.slice(6);return (u[2]+u[3])/2;`

Distractors:
- A (18): the student averages the median, 14, and the top score, 22, getting 18 | computation: `const a=[16,4,21,12,9,22,15,7,20,13,17,11].sort((x,y)=>x-y);return ((a[5]+a[6])/2+a[11])/2;`
- B (17): the student takes 3/4 of 12 = 9 and reads the 9th score, 17, as the third quartile | computation: `const a=[16,4,21,12,9,22,15,7,20,13,17,11].sort((x,y)=>x-y);return a[12*3/4-1];`
- C (14): the student finds the middle of all 12 scores, (13 + 15) / 2 = 14, and stops there | computation: `const a=[16,4,21,12,9,22,15,7,20,13,17,11].sort((x,y)=>x-y);return (a[5]+a[6])/2;`

---

## MV2-D8-11

Area: Statistics and Probability | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Two schools have chess clubs. A line of fit for the number of members of the chess club at Hill School is y = 2.5x + 45, where x is the number of years since 2014. A line of fit for the chess club at Park School is y = 3.5x + 20, where x is the number of years since 2010. According to the two lines of fit, the two clubs will at some point have the same predicted number of members. What is that number of members?

A. 72.5
B. 107.5
C. 82.5
D. 97.5

KEY: A (72.5)

Worked solution: Write the Park School line using years since 2014. A year that is x years after 2014 is x + 4 years after 2010, so Park School's prediction is 3.5(x + 4) + 20 = 3.5x + 34. Set the predictions equal: 2.5x + 45 = 3.5x + 34, so x = 11 (the year 2025). Hill School's prediction then is 2.5(11) + 45 = 72.5 members (check: Park School, 15 years after 2010, gives 3.5(15) + 20 = 72.5).

Key computation (JS): `const x=(45 - (3.5*4 + 20))/(3.5 - 2.5); return String(2.5*x + 45);`

Distractors:
- B (107.5): the student sets 2.5x + 45 = 3.5x + 20 as written, gets x = 25, and evaluates 2.5(25) + 45 = 107.5 | computation: `const x=(45 - 20)/(3.5 - 2.5); return String(2.5*x + 45);`
- C (82.5): the student finds x = 11, turns it into 15 years (since 2010), and puts 15 into the Hill School line: 2.5(15) + 45 = 82.5 | computation: `const x=(45 - (3.5*4 + 20))/(3.5 - 2.5) + 4; return String(2.5*x + 45);`
- D (97.5): the student adds 4 to Park School's intercept (3.5x + 24) instead of 14, solves to x = 21, and evaluates 2.5(21) + 45 = 97.5 | computation: `const x=(45 - (20 + 4))/(3.5 - 2.5); return String(2.5*x + 45);`

---

## MV2-D7-12

Area: Statistics and Probability | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Marco wrote down the prices, in dollars, of five notebooks chosen at random at Store A and four notebooks chosen at random at Store B. The prices are shown in the table. How many dollars greater is the mean price at Store B than the mean price at Store A?

Table:

|  | Notebook A | Notebook B | Notebook C | Notebook D | Notebook E |
| --- | --- | --- | --- | --- | --- |
| Store A | 9 | 11 | 10 | 6 | 9 |
| Store B | 13 | 14 | 8 | 17 |  |

A. 6
B. 4
C. 4.5
D. 7

KEY: B (4)

Worked solution: Store A: (9 + 11 + 10 + 6 + 9) / 5 = 45 / 5 = 9 dollars. Store B: (13 + 14 + 8 + 17) / 4 = 52 / 4 = 13 dollars. The mean at Store B is 13 - 9 = 4 dollars greater.

Key computation (JS): `const A=[9,11,10,6,9],B=[13,14,8,17];const sum=a=>a.reduce((s,x)=>s+x,0);return sum(B)/B.length-sum(A)/A.length;`

Distractors:
- A (6): 17 - 11 = 6. | computation: `const A=[9,11,10,6,9],B=[13,14,8,17];const sum=a=>a.reduce((s,x)=>s+x,0);return Math.max(...B)-Math.max(...A);`
- C (4.5): Medians 9 and 13.5 differ by 4.5. | computation: `const A=[9,11,10,6,9],B=[13,14,8,17];const sum=a=>a.reduce((s,x)=>s+x,0);const md=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};return md(B)-md(A);`
- D (7): 52 - 45 = 7. | computation: `const A=[9,11,10,6,9],B=[13,14,8,17];const sum=a=>a.reduce((s,x)=>s+x,0);return sum(B)-sum(A);`

---

## MV2-D7-06

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Jay rolled a number cube with faces numbered 1 through 6 a total of 120 times. The table shows how many times each number came up. Based on Jay's results, how many times should he expect to roll a 5 or a 6 in his next 240 rolls?

Table:

|  | Number of times rolled |
| --- | --- |
| 1 | 18 |
| 2 | 22 |
| 3 | 17 |
| 4 | 21 |
| 5 | 23 |
| 6 | 19 |

A. 70
B. 72
C. 84
D. 80

KEY: C (84)

Worked solution: A 5 came up 23 times and a 6 came up 19 times, so a 5 or a 6 came up 23 + 19 = 42 times in 120 rolls. The experimental probability is 42/120 = 0.35. In 240 rolls, Jay should expect 0.35 x 240 = 84 rolls of a 5 or a 6.

Key computation (JS): `const f={1:18,2:22,3:17,4:21,5:23,6:19};return (f[5]+f[6])/120*240;`

Distractors:
- A (70): 35 per 120 rolls, doubled, gives 70. | computation: `const f={1:18,2:22,3:17,4:21,5:23,6:19};return Math.round((f[5]+f[6])/120*100)*240/120;`
- B (72): 0.3 x 240 = 72. | computation: `const f={1:18,2:22,3:17,4:21,5:23,6:19};return Math.floor((f[5]+f[6])/120*10)/10*240;`
- D (80): 2/6 of 240 = 80; the table is ignored. | computation: `return 2/6*240;`

---

## MV2-D6-07

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A class checked 6 bags of rice that should each weigh 500 grams. They subtracted 500 grams from the weight of each bag. The results were -14, 13, -6, -9, 5, and -7. The mean absolute deviation (MAD) is the mean of the distances between each value and the mean. What is the MAD of these 6 numbers, in grams?

A. 9
B. 12
C. 13.5
D. 8

KEY: D (8)

Worked solution: The mean is (-14 + 13 - 6 - 9 + 5 - 7) / 6 = -18 / 6 = -3. The distances from -3 are 11, 16, 3, 6, 8 and 4, which add to 48. The MAD is 48 / 6 = 8 grams.

Key computation (JS): `const a=[-14,13,-6,-9,5,-7];const m=a.reduce((s,x)=>s+x,0)/6;return a.reduce((s,x)=>s+Math.abs(x-m),0)/6;`

Distractors:
- A (9): the student averages how far each number is from zero (14, 13, 6, 9, 5, 7), getting 54 / 6 = 9 | computation: `const a=[-14,13,-6,-9,5,-7];return a.reduce((s,x)=>s+Math.abs(x),0)/6;`
- B (12): the student finds the mean -3 correctly, but for the negative values takes the distance from -3 to -14 as 14 + 3 = 17 (and 9, 12, 10 for -6, -9, -7), so the distances are 17, 16, 9, 12, 8, 10 and the MAD 72 / 6 = 12 | computation: `const a=[-14,13,-6,-9,5,-7];const m=a.reduce((s,x)=>s+x,0)/6;return a.reduce((s,x)=>s+((x<0&&m<0&&x!==m)?Math.abs(x)+Math.abs(m):Math.abs(x-m)),0)/6;`
- C (13.5): the student remembers that MAD measures spread and takes half the distance from the least to the greatest value, (13 - (-14)) / 2 = 13.5 | computation: `const a=[-14,13,-6,-9,5,-7];return (Math.max(...a)-Math.min(...a))/2;`

---

## MV2-D6-02

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Two science groups measured the heights of their bean plants, in centimeters. Group A's plants are 14, 21, 9, and 17 centimeters tall. Group B's plants are 16, 13, 8, 11, 6, and 12 centimeters tall. What is the median height, in centimeters, of all the plants in both groups together?

A. 12.5
B. 14.5
C. 13
D. 15.5

KEY: A (12.5)

Worked solution: Put all 10 heights in order: 6, 8, 9, 11, 12, 13, 14, 16, 17, 21. There is an even number of values, so the median is the mean of the 5th and 6th values: (12 + 13) / 2 = 12.5 centimeters.

Key computation (JS): `const a=[14,21,9,17,16,13,8,11,6,12].sort((x,y)=>x-y);return (a[4]+a[5])/2;`

Distractors:
- B (14.5): the student writes Group A then Group B as given (14, 21, 9, 17, 16, 13, 8, 11, 6, 12) and averages the 5th and 6th numbers, 16 and 13 | computation: `const a=[14,21,9,17,16,13,8,11,6,12];return (a[4]+a[5])/2;`
- C (13): copying the 10 heights into one list, the student misses the 9, sorts the other 9 and takes the middle (5th) value, 13 | computation: `const a=[14,21,17,16,13,8,11,6,12].sort((x,y)=>x-y);return a[4];`
- D (15.5): the student finds the median of Group A only, (14 + 17) / 2 = 15.5, as if the first group stood for all the plants | computation: `const a=[14,21,9,17].sort((x,y)=>x-y);return (a[1]+a[2])/2;`

---

## MV2-D7-10

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A lunch menu has 5 soups and 7 salads. Two of the soups are served hot, and 4 of the salads have no nuts. Lia picks one soup and one salad at random. What is the probability that she gets a hot soup and a salad with no nuts?

A. 1/2
B. 8/35
C. 6/35
D. 12/35

KEY: B (8/35)

Worked solution: The chance of a hot soup is 2/5. The chance of a salad with no nuts is 4/7. The two picks do not affect each other, so the chance of both is 2/5 x 4/7 = 8/35. (Counting works too: there are 5 x 7 = 35 soup-salad pairs, and 2 x 4 = 8 of them have a hot soup and a no-nut salad.)

Key computation (JS): `return (2/5)*(4/7);`

Distractors:
- A (1/2): (2 + 4)/(5 + 7) = 6/12 = 1/2. | computation: `return (2+4)/(5+7);`
- C (6/35): 2 hot soups + 4 no-nut salads = 6, over 35 pairs. | computation: `return (2+4)/(5*7);`
- D (12/35): 3/5 x 4/7 = 12/35. | computation: `return ((5-2)/5)*(4/7);`

---

## MV2-D7-07

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A reporter asked seven randomly chosen workers in each of two towns how many minutes it takes them to get to work. The table shows the answers. How many minutes greater is the median time for Town B than the median time for Town A?

Table:

|  | Worker A | Worker B | Worker C | Worker D | Worker E | Worker F | Worker G |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Town A | 19 | 15 | 29 | 20 | 10 | 36 | 13 |
| Town B | 22 | 25 | 18 | 36 | 24 | 32 | 34 |

A. 9
B. 16
C. 6
D. 7

KEY: C (6)

Worked solution: Order Town A: 10, 13, 15, 19, 20, 29, 36. The middle (4th) value is 19. Order Town B: 18, 22, 24, 25, 32, 34, 36. The middle (4th) value is 25. The median for Town B is 25 - 19 = 6 minutes greater.

Key computation (JS): `const A=[19,15,29,20,10,36,13],B=[22,25,18,36,24,32,34];const S=a=>[...a].sort((x,y)=>x-y);return S(B)[3]-S(A)[3];`

Distractors:
- A (9): The 3rd ordered values are 15 and 24, which differ by 9. | computation: `const A=[19,15,29,20,10,36,13],B=[22,25,18,36,24,32,34];const S=a=>[...a].sort((x,y)=>x-y);return S(B)[2]-S(A)[2];`
- B (16): The 4th entries are 20 and 36, which differ by 16. | computation: `const A=[19,15,29,20,10,36,13],B=[22,25,18,36,24,32,34];const S=a=>[...a].sort((x,y)=>x-y);return B[3]-A[3];`
- D (7): The means are 142/7 and 191/7, which differ by 49/7 = 7. | computation: `const A=[19,15,29,20,10,36,13],B=[22,25,18,36,24,32,34];const S=a=>[...a].sort((x,y)=>x-y);const m=a=>a.reduce((s,x)=>s+x,0)/a.length;return Math.round((m(B)-m(A))*1e6)/1e6;`
