# Items for review, KEYED (11)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB2-D5-06

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A craft store has a roll of trim that is 5 3/4 yards long. A worker cuts off one piece that is 3 1/4 feet long and another piece that is 1 3/4 feet long. How many inches of trim are left on the roll?

A. 147
B. 129
C. 153
D. 192

KEY: A (147)

Worked solution: Change the roll to inches: 5 yards = 5 x 36 = 180 inches and 3/4 yard = 3/4 x 36 = 27 inches, so the roll is 207 inches. The pieces together are 3 1/4 + 1 3/4 = 5 feet = 5 x 12 = 60 inches. Trim left: 207 - 60 = 147 inches.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((5*36+3*36/4)-((3*12+12/4)+(1*12+3*12/4)),1)`

Distractors:
- B (129): The student gets 5 yards = 180 inches but turns the 3/4 yard into 3/4 of 12 inches = 9, so the roll is 189 inches and 189 - 60 = 129. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((5*36+3*12/4)-((3*12+12/4)+(1*12+3*12/4)),1)`
- C (153): Adding the pieces first, the student writes 1/4 + 3/4 = 4/8 = 1/2, so the pieces total 4 1/2 feet = 54 inches and 207 - 54 = 153. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((5*36+3*36/4)-((3+1)*12+12*(1+3)/(4+4)),1)`
- D (192): The student uses 3 for the pieces as well: 5 feet x 3 = 15 inches, and 207 - 15 = 192. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((5*36+3*36/4)-3*(3+1/4+1+3/4),1)`

---

## MB2-D5-05

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A group of hikers each carried one water bottle. The table shows the line plot data: each row gives an amount of water, in liters, and the number of bottles that held that amount. At a rest stop, the hikers pour all of their water into a big pot. Then they fill the bottles again so that every bottle holds the same amount, using all of the water. How many liters of water are in each bottle now?

Table:

|  | Number of bottles |
| --- | --- |
| 1/4 | 1 |
| 1 | 2 |
| 1 1/4 | 5 |
| 1 3/4 | 2 |
| 2 | 2 |

A. 3/4
B. 1 1/3
C. 1 1/8
D. 1 1/4

KEY: B (1 1/3)

Worked solution: Total water: 1 x 1/4 = 1/4, 2 x 1 = 2, 5 x 1 1/4 = 6 1/4, 2 x 1 3/4 = 3 1/2, 2 x 2 = 4. Total = 1/4 + 2 + 6 1/4 + 3 1/2 + 4 = 16 liters. Number of bottles: 1 + 2 + 5 + 2 + 2 = 12. Each bottle gets 16 / 12 = 4/3 = 1 1/3 liters.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(1*1+2*4+5*5+2*7+2*8,4*12)`

Distractors:
- A (3/4): The student finds 16 liters and 12 bottles but divides 12 by 16, getting 3/4 of a liter. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(4*12,1*1+2*4+5*5+2*7+2*8)`
- C (1 1/8): The student evens out only the smallest and largest amounts, 1/4 and 2, and takes halfway between them: (1/4 + 2) / 2 = 1 1/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(1+8,4*2)`
- D (1 1/4): Five bottles held 1 1/4 liters, the tallest stack of X's, so the student picks 1 1/4 as the amount every bottle 'usually' has. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(5,4)`

---

## MB2-D67-08

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: At a school fair, Box A holds 12 red tickets, 9 blue tickets, and 7 green tickets. Box B holds 30 tickets, and 5 of them are red. Lena will pick one ticket at random from Box A. Omar will pick one ticket at random from Box B. How much greater is the probability that Lena picks a red ticket than the probability that Omar picks a red ticket?

A. 17/42
B. 25/42
C. 11/42
D. 2/7

KEY: C (11/42)

Worked solution: Box A has 12 + 9 + 7 = 28 tickets, so the probability Lena picks red is 12/28 = 3/7. Box B has 30 tickets in all, so the probability Omar picks red is 5/30 = 1/6. The difference is 3/7 - 1/6 = 18/42 - 7/42 = 11/42.

Key computation (JS): `const A=12/(12+9+7); const B=5/30; return A-B;`

Distractors:
- A (17/42): The student uses only the first two colours, 12/(12 + 9) = 4/7, which inflates A and raises the difference. | computation: `const A=12/(12+9); const B=5/30; return A-B;`
- B (25/42): The student finds 3/7 and 1/6 correctly and then adds them. | computation: `const A=12/(12+9+7); const B=5/30; return A+B;`
- D (2/7): The student reads '30 tickets, 5 red' as 30 others plus 5 red and uses 5/35 for Box B, which shrinks B and raises the difference. | computation: `const A=12/(12+9+7); const B=5/(30+5); return A-B;`

---

## MB2-D8-05

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Every eighth grader at Pine Hill Middle School answered two survey questions: Do you have a pet? Do you live in a house or in an apartment? The table shows the results for all 120 students, but two of the entries are missing. What percent of the students who live in an apartment have a pet?

Table (Pets and type of home):

|  | House | Apartment | Total |
| --- | --- | --- | --- |
| Has a pet | 32 | ? | 50 |
| No pet | 13 | 57 | 70 |
| Total | 45 | ? | 120 |

A. 15
B. 40
C. 36
D. 24

KEY: D (24)

Worked solution: First fill in the missing numbers. Students with a pet who live in an apartment: 50 - 32 = 18. Total living in an apartment: 18 + 57 = 75 (or 120 - 45 = 75). The question is about students who live in an apartment, so divide by the apartment total: 18 / 75 = 0.24, which is 24%.

Key computation (JS): `const pet = 50 - 32; const apt = pet + 57; return Math.round(100 * pet / apt);`

Distractors:
- A (15): The student divides 18 by all 120 students: 18 / 120 = 15%. | computation: `const pet = 50 - 32; return Math.round(100 * pet / 120);`
- B (40): The apartment total is blank, so the student uses the printed 45 (houses): 18 / 45 = 40%. | computation: `const pet = 50 - 32; return Math.round(100 * pet / 45);`
- C (36): The student finds what percent of pet owners live in an apartment: 18 / 50 = 36%, answering the reversed question. | computation: `const pet = 50 - 32; return Math.round(100 * pet / 50);`

---

## MB2-D8-03

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A ranger measured the depth of the water at the end of a dock every summer and made a scatter plot. A line of fit for the data is y = -0.4x + 17.5, where x is the number of years since 2010 and y is the depth of the water in feet. In 2019, the ranger's measuring pole showed a depth of 147 inches. The residual for 2019 is the actual depth minus the depth predicted by the line of fit. What is the residual for 2019, in feet?

A. -1.65
B. 2.35
C. -0.35
D. 0.80

KEY: A (-1.65)

Worked solution: First find x: 2019 is 2019 - 2010 = 9 years after 2010. The line predicts y = -0.4(9) + 17.5 = -3.6 + 17.5 = 13.9 feet. Next change the actual depth to feet: 147 inches / 12 = 12.25 feet. The residual is actual minus predicted: 12.25 - 13.9 = -1.65 feet. The negative residual means the water was 1.65 feet shallower than the line predicted.

Key computation (JS): `const x = 2019 - 2010; const pred = -0.4 * x + 17.5; const actual = 147 / 12; return Math.round((actual - pred) * 100) / 100;`

Distractors:
- B (2.35): The student plugs in x = 19 for 2019, so the line predicts 17.5 - 7.6 = 9.9 and the residual is 12.25 - 9.9 = 2.35. | computation: `const pred = -0.4 * 19 + 17.5; return Math.round((147 / 12 - pred) * 100) / 100;`
- C (-0.35): The student treats the point as if its depth were the input: y = -0.4(12.25) + 17.5 = 12.6, so the residual comes out 12.25 - 12.6 = -0.35. | computation: `const actual = 147 / 12; const pred = -0.4 * actual + 17.5; return Math.round((actual - pred) * 100) / 100;`
- D (0.80): The student divides 147 by 10 to get 14.7 feet, then 14.7 - 13.9 = 0.8. | computation: `const pred = -0.4 * (2019 - 2010) + 17.5; return Math.round((147 / 10 - pred) * 100) / 100;`

---

## MB2-D5-04

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Students filled their cups from a cooler that held 24 cups of lemonade at a school picnic. The table shows the line plot data: each row gives an amount poured, in cups, and the number of students who poured that amount. No other lemonade was taken out of the cooler. How many cups of lemonade are left in the cooler?

Table:

|  | Number of students |
| --- | --- |
| 1/4 | 5 |
| 1/2 | 2 |
| 1 1/4 | 5 |
| 2 1/2 | 5 |

A. 7
B. 3
C. 6
D. 4

KEY: B (3)

Worked solution: Find the total poured. 5 x 1/4 = 1 1/4 cups. 2 x 1/2 = 1 cup. 5 x 1 1/4 = 6 1/4 cups. 5 x 2 1/2 = 12 1/2 cups. Total: 1 1/4 + 1 + 6 1/4 + 12 1/2 = 20 + 1/4 + 1/4 + 1/2 = 21 cups. Left in the cooler: 24 - 21 = 3 cups.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(24*4-(5*1+2*2+5*5+5*10),4)`

Distractors:
- A (7): The student adds the counts (5 + 2 + 5 + 5 = 17) as if every X on the line plot were 1 cup, and gets 24 - 17 = 7. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(24-(5+2+5+5),1)`
- C (6): The student writes 5 x 1 1/4 as 5 1/4 and 5 x 2 1/2 as 10 1/2, so the total poured is 18 cups and the answer is 24 - 18 = 6. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(24*4-(5*1+2*2+(5*4+1)+(5*8+2)),4)`
- D (4): Adding 1 1/4 + 1 + 6 1/4 + 12 1/2, the student gets 20 wholes and 1/4 + 1/4 + 1/2 = 4/4, writes 20 without carrying the extra whole, and subtracts 24 - 20 = 4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(24-(1+1+6+12),1)`

---

## MB2-D5-01

Area: Statistics and Probability | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: The ceiling in Mia's bedroom is 8 feet 4 inches high. Her bookcase is 5 feet 9 inches tall. How many inches are there from the top of the bookcase to the ceiling?

A. 29
B. 25
C. 31
D. 41

KEY: C (31)

Worked solution: Change both heights to inches. 8 feet 4 inches = 8 x 12 + 4 = 96 + 4 = 100 inches. 5 feet 9 inches = 5 x 12 + 9 = 60 + 9 = 69 inches. The space between them is 100 - 69 = 31 inches.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((8*12+4)-(5*12+9),1)`

Distractors:
- A (29): The student subtracts in feet and inches, borrows a foot from 8 feet but adds 10 inches to the 4 (14 inches), gets 2 feet 5 inches and writes 2 x 12 + 5 = 29. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(((8-1)-5)*12+((4+10)-9),1)`
- B (25): The student writes 8 feet 4 inches as 84 inches and 5 feet 9 inches as 59 inches, as if feet and inches were tens and ones, and gets 84 - 59 = 25. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((8*10+4)-(5*10+9),1)`
- D (41): Seeing 4 - 9, the student takes 9 - 4 = 5 inches, keeps 8 - 5 = 3 feet, and changes 3 feet 5 inches to 41 inches. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((8-5)*12+(9-4),1)`

---

## MB2-D67-07

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A spinner has four sections colored red, blue, green, and yellow. Kai spun the spinner 96 times and recorded the color it landed on each time. The table shows his results. Based on Kai's results, how many times should he expect the spinner NOT to land on red in his next 200 spins?

Table:

|  | Number of spins |
| --- | --- |
| Red | 12 |
| Blue | 31 |
| Green | 29 |
| Yellow | 24 |

A. 168
B. 150
C. 188
D. 175

KEY: D (175)

Worked solution: The spinner did not land on red in 96 - 12 = 84 of Kai's 96 spins, so the experimental probability of not red is 84/96 = 7/8. In 200 more spins, Kai should expect about 7/8 x 200 = 175 spins that do not land on red.

Key computation (JS): `const n=12+31+29+24; const notRed=n-12; return notRed/n*200;`

Distractors:
- A (168): The student finds 84 not-red spins and treats it as 84%, taking 0.84 x 200. | computation: `const n=12+31+29+24; return (n-12)/100*200;`
- B (150): The student sees four colours, assumes each is equally likely, and takes 3/4 of 200, ignoring Kai's data. | computation: `return 3/4*200;`
- C (188): The student reasons 'red came up 12 times, so the other 200 - 12 are not red'. | computation: `return 200-12;`

---

## MB2-D5-09

Area: Statistics and Probability | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: At a fishing derby, a club weighed every fish it caught. The table shows the line plot data: each row gives a weight, in pounds, and the number of fish with that weight. The club put back every fish that weighed less than 1/2 pound and kept the rest. What is the total weight, in pounds, of the fish the club kept?

Table:

|  | Number of fish |
| --- | --- |
| 1/8 | 1 |
| 3/8 | 3 |
| 7/8 | 2 |
| 1 3/8 | 3 |
| 1 1/2 | 2 |

A. 8 7/8
B. 7 5/8
C. 5 13/16
D. 8 1/8

KEY: A (8 7/8)

Worked solution: The fish under 1/2 pound (1/8 and 3/8 pound) go back. The kept fish: 2 x 7/8 = 14/8 = 1 3/4 pounds, 3 x 1 3/8 = 3 9/8 = 4 1/8 pounds, 2 x 1 1/2 = 3 pounds. Total kept: 1 3/4 + 4 1/8 + 3 = 8 7/8 pounds. (Check: all the fish weigh 10 1/8 pounds and the fish put back weigh 1/8 + 9/8 = 1 1/4 pounds; 10 1/8 - 1 1/4 = 8 7/8.)

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(2*7+3*11+2*12,8)`

Distractors:
- B (7 5/8): The student adds up the kept rows (8 7/8) and then also subtracts the fish put back (1 1/4), because the question says they were removed: 8 7/8 - 1 1/4 = 7 5/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((2*7+3*11+2*12)-(1*1+3*3),8)`
- C (5 13/16): The student writes 2 x 7/8 = 7/16, 3 x 1 3/8 = 3 3/24 = 3 1/8 and 2 x 1 1/2 = 2 1/4, and adds them: 5 13/16. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(7+(3*16+2)+(2*16+4),16)`
- D (8 1/8): The student totals all the fish (10 1/8 pounds), counts the 4 small fish, and takes away 1/2 pound for each: 10 1/8 - 2 = 8 1/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((1*1+3*3+2*7+3*11+2*12)-(1+3)*4,8)`

---

## MB2-D5-07

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Two classes dug up earthworms in the school garden and measured them. For both classes, the table lists each length found, in inches, and how many worms of that length each class measured, as on a line plot. How many inches greater is the total length of Class A's worms than the total length of Class B's worms?

Table:

|  | Worms measured by Class A | Worms measured by Class B |
| --- | --- | --- |
| 1/4 | 1 | 5 |
| 1 | 3 | 0 |
| 1 1/2 | 3 | 4 |
| 2 3/4 | 1 | 0 |

A. 4
B. 3 1/4
C. 3 3/4
D. 5 3/4

KEY: B (3 1/4)

Worked solution: Class A: 1 x 1/4 + 3 x 1 + 3 x 1 1/2 + 1 x 2 3/4 = 1/4 + 3 + 4 1/2 + 2 3/4 = 10 1/2 inches. Class B: 5 x 1/4 + 4 x 1 1/2 = 1 1/4 + 6 = 7 1/4 inches. Difference: 10 1/2 - 7 1/4 = 3 1/4 inches.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((1*1+3*4+3*6+1*11)-(5*1+4*6),4)`

Distractors:
- A (4): The student counts only whole inches: Class A 0 + 3 + 3 + 2 = 8, Class B 0 + 4 = 4, and 8 - 4 = 4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((0+3*1+3*1+1*2)-(0+4*1),1)`
- C (3 3/4): The student adds the lengths that appear for each class without the counts: Class A 1/4 + 1 + 1 1/2 + 2 3/4 = 5 1/2, Class B 1/4 + 1 1/2 = 1 3/4, and 5 1/2 - 1 3/4 = 3 3/4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((1+4+6+11)-(1+6),4)`
- D (5 3/4): The student matches worms row by row, keeps Class A's extra worms (3 at 1 inch and 1 at 2 3/4 inches, 5 3/4 inches) and drops the rows where Class B has more (four extra 1/4-inch worms and one extra 1 1/2-inch worm). | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(3*4+1*11,4)`

---

## MB2-D5-11

Area: Statistics and Probability | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A scout troop made bags of trail mix in different sizes. The table shows the line plot data: each row gives a weight of trail mix, in pounds, and the number of bags with that weight. The troop pours all of the trail mix together and then packs it equally into 10 new bags. How many pounds of trail mix go into each new bag?

Table:

|  | Number of bags |
| --- | --- |
| 1/4 | 2 |
| 1/2 | 4 |
| 1 1/2 | 2 |
| 2 | 4 |

A. 1 4/5
B. 1 1/8
C. 1 7/20
D. 1 5/8

KEY: C (1 7/20)

Worked solution: Total trail mix: 2 x 1/4 + 4 x 1/2 + 2 x 1 1/2 + 4 x 2 = 1/2 + 2 + 3 + 8 = 13 1/2 pounds. Each of the 10 new bags gets 13 1/2 / 10 = 27/2 / 10 = 27/20 = 1 7/20 pounds.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(2*1+4*2+2*6+4*8,4*10)`

Distractors:
- A (1 4/5): The student divides 13 by 10 to get 1 3/10 and then keeps the 1/2 as it is: 1 3/10 + 1/2 = 1 4/5. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(13+5,10)`
- B (1 1/8): The student divides 13 1/2 by the 12 bags counted in the table instead of the 10 new bags: 13 1/2 / 12 = 9/8 = 1 1/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F(2*1+4*2+2*6+4*8,4*(2+4+2+4))`
- D (1 5/8): The student totals (2 + 1/4) + (4 + 1/2) + (2 + 1 1/2) + (4 + 2) = 16 1/4 pounds and divides by 10: 1 5/8. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{if(d<0){n=-n;d=-d}const s=n<0?'-':'';n=Math.abs(n);const k=g(n,d);n/=k;d/=k;if(d===1)return s+String(n);const w=Math.floor(n/d),r=n-w*d;return s+(w?w+' '+r+'/'+d:r+'/'+d)};return F((2+4+2+4)*4+(1+2+6+8),4*10)`
