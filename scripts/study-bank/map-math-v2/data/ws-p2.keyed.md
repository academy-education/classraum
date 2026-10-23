# Items for review, KEYED (23)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MV2-D5-01

Area: Statistics and Probability | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Rosa has some pieces of ribbon. The table shows her line plot data: each row gives a length, in yards, and the number of pieces with that length. Rosa sews together, end to end, every piece that is half a yard long or longer, making one long strip with no length lost. Then she cuts the strip into pieces that are each one quarter of a yard long. How many quarter-yard pieces can she cut?

Table:

|  | Number of pieces |
| --- | --- |
| 1/8 | 2 |
| 3/8 | 3 |
| 1/2 | 5 |
| 5/8 | 3 |
| 3/4 | 2 |

A. 23
B. 29
C. 13
D. 22

KEY: A (23)

Worked solution: The pieces that are half a yard or longer are the 1/2-yard, 5/8-yard and 3/4-yard pieces. Their total length is 5 x 1/2 + 3 x 5/8 + 2 x 3/4 = 20/8 + 15/8 + 12/8 = 47/8 = 5 7/8 yards. Each yard makes 4 quarter-yard pieces, so 5 7/8 yards makes 5 7/8 x 4 = 23 1/2. Only whole pieces count, so Rosa can cut 23 pieces.

Key computation (JS): `const n=[1,3,4,5,6],c=[2,3,5,3,2];let t=0;for(let i=0;i<5;i++)if(n[i]>=4)t+=n[i]*c[i];return Math.floor(t*4/8)`

Distractors:
- B (29): The student joins all 15 pieces, 58/8 = 7 1/4 yards, and cuts 29 pieces. | computation: `const n=[1,3,4,5,6],c=[2,3,5,3,2];let t=0;for(let i=0;i<5;i++)t+=n[i]*c[i];return Math.floor(t*4/8)`
- C (13): The student leaves out the five 1/2-yard pieces, gets 27/8 yards and cuts 13 pieces. | computation: `const n=[1,3,4,5,6],c=[2,3,5,3,2];let t=0;for(let i=0;i<5;i++)if(n[i]>4)t+=n[i]*c[i];return Math.floor(t*4/8)`
- D (22): The student cuts quarter-yard pieces from every long piece separately (2, 2 and 3 per piece), so the 1/8-yard leftovers are thrown away and the count is 22. | computation: `const n=[1,3,4,5,6],c=[2,3,5,3,2];let t=0;for(let i=0;i<5;i++)if(n[i]>=4)t+=c[i]*Math.floor(n[i]/2);return t`

---

## MV2-D6-13

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The mean mass of 5 rocks is 40 grams. Four of the rocks have masses of 30, 45, 44, and 31 grams. The mean absolute deviation (MAD) is the mean of the distances between each value and the mean. What is the MAD of the masses of all 5 rocks, in grams?

A. 9.5
B. 7.6
C. 7
D. 5.6

KEY: B (7.6)

Worked solution: The 5 masses add to 5 x 40 = 200 grams. The four known masses add to 150, so the fifth rock is 200 - 150 = 50 grams. The distances from 40 are 10, 5, 4, 9 and 10, which add to 38. The MAD is 38 / 5 = 7.6 grams.

Key computation (JS): `const g=[30,45,44,31];const f=5*40-g.reduce((s,x)=>s+x,0);const a=[...g,f];return a.reduce((s,x)=>s+Math.abs(x-40),0)/5;`

Distractors:
- A (9.5): the student finds the five distances correctly, total 38, but divides by 4 instead of 5 | computation: `const g=[30,45,44,31];const f=5*40-g.reduce((s,x)=>s+x,0);const a=[...g,f];return a.reduce((s,x)=>s+Math.abs(x-40),0)/4;`
- C (7): the student finds the MAD of the four given rocks about their own mean, 37.5: distances 7.5, 7.5, 6.5, 6.5, total 28, divided by 4 is 7 | computation: `const g=[30,45,44,31];const m=g.reduce((s,x)=>s+x,0)/4;return g.reduce((s,x)=>s+Math.abs(x-m),0)/4;`
- D (5.6): the student takes the fifth rock to be 40 grams, so its distance is 0, and gets (10 + 5 + 4 + 9 + 0) / 5 = 5.6 | computation: `const g=[30,45,44,31];return g.reduce((s,x)=>s+Math.abs(x-40),0)/5;`

---

## MV2-D8-04

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Ravi hung different numbers of identical weights on a spring and measured the length of the spring each time. The table shows his results. When the points are graphed, all of them lie on one straight line except one point, which Ravi recorded wrong. If that point followed the same linear pattern as the others, what length, in centimeters, should Ravi have recorded for it?

Table (Number of weights and spring length):

|  | Spring length (centimeters) |
| --- | --- |
| 3 | 27 |
| 4 | 31 |
| 8 | 53 |
| 13 | 67 |
| 15 | 75 |

A. 49
B. 35
C. 47
D. 40

KEY: C (47)

Worked solution: Check the rate between points. From 3 to 4 weights the length grows 31 - 27 = 4 cm for 1 weight. From 13 to 15 weights it grows 75 - 67 = 8 cm for 2 weights, which is also 4 cm per weight. From 4 to 13 weights it grows 67 - 31 = 36 cm for 9 weights, again 4 cm per weight. So the point for 8 weights is the wrong one. Going from 4 weights to 8 weights adds 4 weights, so the length should be 31 + 4 x 4 = 47 centimeters.

Key computation (JS): `const r=(67-31)/(13-4); return String(31 + r*(8-4));`

Distractors:
- A (49): the student averages the lengths on either side, (31 + 67) / 2 = 49, though 8 weights is not halfway between 4 and 13 | computation: `return String((31+67)/2);`
- B (35): the student sees the length grow 4 cm from the first row to the second and adds 4 again for the next row, 31 + 4 = 35, without noticing that the next row is 4 weights later, not 1 | computation: `return String(31 + (31-27));`
- D (40): the student finds 75 / 15 = 5 cm per weight from the last point and multiplies by 8 weights, 40, as if the spring had no length with no weights | computation: `return String(75*8/15);`

---

## MV2-D6-06

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A store sells seven board games. Their prices, in dollars, are 34, 54, 5, 38, 6, 41, and 4. The store adds one new board game. Now the median price of the eight games is 28 dollars. What is the mean price, in dollars, of the eight games?

A. 22.75
B. 25
C. 24
D. 25.5

KEY: D (25.5)

Worked solution: In order the seven prices are 4, 5, 6, 34, 38, 41, 54, and they add to 182. With eight prices the median is the mean of the 4th and 5th prices. The median is now 28, which is less than 34, so the new price is below 34 and the middle two prices are the new price and 34. (new price + 34) / 2 = 28, so the new price is 56 - 34 = 22. The eight prices add to 182 + 22 = 204, and the mean is 204 / 8 = 25.5 dollars.

Key computation (JS): `const a=[34,54,5,38,6,41,4];const S=a.reduce((s,x)=>s+x,0);const v=2*28-34;return (S+v)/8;`

Distractors:
- A (22.75): the student divides the old total by the new number of games, 182 / 8 = 22.75, never adding the new price to the total | computation: `const a=[34,54,5,38,6,41,4];return a.reduce((s,x)=>s+x,0)/8;`
- B (25): the student does not put the prices in order and uses 38, the middle of the list as printed, as the price next to the new one: 56 - 38 = 18, total 200, mean 200 / 8 = 25 | computation: `const a=[34,54,5,38,6,41,4];const S=a.reduce((s,x)=>s+x,0);return (S+2*28-a[3])/8;`
- C (24): the student finds the new price, 22, and the old mean, 182 / 7 = 26, then averages them, (26 + 22) / 2 = 24, giving one new game the same weight as the seven old ones | computation: `const a=[34,54,5,38,6,41,4];const S=a.reduce((s,x)=>s+x,0);const v=2*28-34;return (S/7+v)/2;`

---

## MV2-D6-03

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Eight players scored 31, 8, 25, 64, 15, 33, 10, and 18 points in a video game. The score of 64 was a mistake, so it is removed. By how many points does the median score decrease when the 64 is removed?

A. 3.5
B. 4
C. 5
D. 5.5

KEY: A (3.5)

Worked solution: In order the 8 scores are 8, 10, 15, 18, 25, 31, 33, 64. The median is the mean of the 4th and 5th values: (18 + 25) / 2 = 21.5. Without 64 the 7 scores are 8, 10, 15, 18, 25, 31, 33, and the median is the 4th value, 18. The median decreases by 21.5 - 18 = 3.5 points.

Key computation (JS): `const a=[31,8,25,64,15,33,10,18].sort((x,y)=>x-y);const b=a.slice(0,7);return (a[3]+a[4])/2-b[3];`

Distractors:
- B (4): the student finds the mean of the 8 scores, 25.5, and the median, 21.5, and reports their difference, 4, thinking the outlier's effect is the gap between mean and median | computation: `const a=[31,8,25,64,15,33,10,18].sort((x,y)=>x-y);const mean=a.reduce((s,x)=>s+x,0)/8;return mean-(a[3]+a[4])/2;`
- C (5): for the 7 scores left, the student averages the 3rd and 4th values, (15 + 18) / 2 = 16.5, and gets 21.5 - 16.5 = 5 | computation: `const a=[31,8,25,64,15,33,10,18].sort((x,y)=>x-y);const b=a.slice(0,7);return (a[3]+a[4])/2-(b[2]+b[3])/2;`
- D (5.5): the student finds the mean before (204 / 8 = 25.5) and after (140 / 7 = 20) and reports the drop, 5.5 | computation: `const a=[31,8,25,64,15,33,10,18];const s=a.reduce((t,x)=>t+x,0);return s/8-(s-64)/7;`

---

## MV2-D5-14

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Kim measured shells at the beach. The table shows the line plot data: each row gives a length, in inches, and the number of shells with that length. How many more shells are longer than 1 inch than are shorter than 1 inch?

Table:

|  | Number of shells |
| --- | --- |
| 1/4 | 4 |
| 1/2 | 4 |
| 3/4 | 5 |
| 1 | 10 |
| 1 1/4 | 16 |
| 1 1/2 | 18 |

A. 34
B. 21
C. 24
D. 23

KEY: B (21)

Worked solution: Longer than 1 inch: 16 + 18 = 34 shells. Shorter than 1 inch: 4 + 4 + 5 = 13 shells. The 1-inch shells are in neither group. 34 - 13 = 21 more shells.

Key computation (JS): `return (16+18)-(4+4+5)`

Distractors:
- A (34): The student counts 34 longer shells and forgets to subtract. | computation: `return 16+18`
- C (24): The student does 34 - 10, comparing the longer shells with the 1-inch shells. | computation: `return (16+18)-10`
- D (23): The student counts every shell that is 1 inch or shorter, 4 + 4 + 5 + 10 = 23, and gives that count as the answer. | computation: `return 4+4+5+10`

---

## MV2-D6-04

Area: Statistics and Probability | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Mia's basketball team played 10 games. The table shows the points Mia scored in each game. DNP means Mia did not play in that game. What was Mia's mean number of points per game for the games she played?

Table (Mia's points):

|  | Points scored |
| --- | --- |
| vs. Hawks | 16 |
| vs. Lions | DNP |
| vs. Bears | 8 |
| vs. Eagles | 20 |
| vs. Wolves | DNP |
| vs. Tigers | 11 |
| vs. Sharks | DNP |
| vs. Owls | 25 |
| vs. Foxes | DNP |
| vs. Rams | 10 |

A. 9
B. 14
C. 15
D. 13.5

KEY: C (15)

Worked solution: Mia played in 6 games (the other 4 are DNP). Her points in those games add to 16 + 8 + 20 + 11 + 25 + 10 = 90. Her mean is 90 / 6 = 15 points per game.

Key computation (JS): `const p=[16,8,20,11,25,10];return p.reduce((s,x)=>s+x,0)/p.length;`

Distractors:
- A (9): the student adds the 90 points correctly but divides by all 10 games, counting the DNP games in the number of games | computation: `const p=[16,8,20,11,25,10];return p.reduce((s,x)=>s+x,0)/10;`
- B (14): copying the scores out of the table, the student writes the 8-point game twice, so the total is 98 over 7 games and the mean 98 / 7 = 14 | computation: `const p=[16,8,20,11,25,10];return (p.reduce((s,x)=>s+x,0)+8)/7;`
- D (13.5): the student orders the 6 scores (8, 10, 11, 16, 20, 25) and averages the middle two, (11 + 16) / 2 = 13.5 | computation: `const p=[16,8,20,11,25,10].sort((x,y)=>x-y);return (p[2]+p[3])/2;`

---

## MV2-D5-12

Area: Statistics and Probability | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Students in a class collected cans for recycling. The table shows the line plot data: each row gives a weight of cans, in pounds, and the number of students who collected that weight. The class wants to collect 25 pounds of cans in all. How many more pounds of cans does the class need to collect?

Table:

|  | Number of students |
| --- | --- |
| 1 1/4 | 3 |
| 2 | 2 |
| 2 1/4 | 4 |
| 3 | 1 |

A. 6 1/4
B. 8 1/4
C. 6 1/2
D. 5 1/4

KEY: D (5 1/4)

Worked solution: Total collected: 3 x 1 1/4 = 3 3/4, 2 x 2 = 4, 4 x 2 1/4 = 9 and 1 x 3 = 3, so 3 3/4 + 4 + 9 + 3 = 19 3/4 pounds. Still needed: 25 - 19 3/4 = 5 1/4 pounds.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F(100-(3*5+2*8+4*9+1*12),4)`

Distractors:
- A (6 1/4): In 25 - 19 3/4 the student does 25 - 19 = 6 and writes 1/4 from 4/4 - 3/4 without taking the 1 from the 6. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F((25-19)*4+1,4)`
- B (8 1/4): The student misses the single 3-pound row, so the total is 16 3/4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F(100-(3*5+2*8+4*9),4)`
- C (6 1/2): The student writes 3 x 1 1/4 as 3 1/4 and 4 x 2 1/4 as 8 1/4, so the total is 18 1/2. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F(100-((3*4+1)+16+(4*8+1)+12),4)`

---

## MV2-D8-14

Area: Statistics and Probability | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A city counted its bike-share stations each year and made a scatter plot. A line of fit for the data is y = 4x + 40, where x is the number of years since 2008 and y is the number of stations. Lena wants to rewrite the line of fit so that x is the number of years since 2014 instead, and every prediction stays the same. Her new line is y = 4x + b. What is the value of b?

A. 64
B. 44
C. 34
D. 46

KEY: A (64)

Worked solution: In the new line, x = 0 means the year 2014, so b must be the number of stations the original line predicts for 2014. In the original line, 2014 is x = 2014 - 2008 = 6, so y = 4(6) + 40 = 64. The slope stays 4, so the new line is y = 4x + 64 and b = 64.

Key computation (JS): `return String(4*(2014-2008) + 40);`

Distractors:
- B (44): the student adds the slope once, 40 + 4 = 44, without multiplying by the 6 years between 2008 and 2014 | computation: `return String(40 + 4);`
- C (34): the student reasons that x now starts 6 years later, so b should go down by 6, and writes 40 - 6 = 34 | computation: `return String(40 - (2014-2008));`
- D (46): the student adds the 6 years to 40, getting 46, as if the count grew by 1 station per year rather than 4 | computation: `return String(40 + (2014-2008));`

---

## MV2-D6-11

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Eight sunflower seedlings have heights, in centimeters, of 18, 27, 12, 13, 3, 9, 26, and 10. A ninth seedling that is 33 centimeters tall is added. Use this rule for quartiles: the first quartile is the median of the lower half of the data and the third quartile is the median of the upper half; when the number of values is odd, the median is not included in either half. By how many centimeters does the interquartile range increase when the ninth seedling is added?

A. 3.5
B. 4.5
C. 6
D. 5

KEY: B (4.5)

Worked solution: Before: in order the heights are 3, 9, 10, 12, 13, 18, 26, 27. The lower half 3, 9, 10, 12 has median 9.5 and the upper half 13, 18, 26, 27 has median 22, so the IQR is 22 - 9.5 = 12.5. After: 3, 9, 10, 12, 13, 18, 26, 27, 33. The median is 13 and is left out. The lower half 3, 9, 10, 12 still has median 9.5; the upper half 18, 26, 27, 33 has median 26.5. The IQR is 26.5 - 9.5 = 17. It increases by 17 - 12.5 = 4.5 centimeters.

Key computation (JS): `const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};const iqr=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length,h=Math.floor(n/2);return med(s.slice(n%2?h+1:h))-med(s.slice(0,h))};const a=[18,27,12,13,3,9,26,10];return iqr([...a,33])-iqr(a);`

Distractors:
- A (3.5): with 9 values the student puts 13 in both halves, so the quartiles are 10 and 26, the new IQR is 16, and the increase is 16 - 12.5 = 3.5 | computation: `const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};const a=[18,27,12,13,3,9,26,10].sort((x,y)=>x-y);const b=[...a,33];const old=med(a.slice(4))-med(a.slice(0,4));return (med(b.slice(4))-med(b.slice(0,5)))-old;`
- C (6): the new seedling is 6 centimeters taller than the old tallest one, so the student says the spread, and the IQR, grow by 33 - 27 = 6 | computation: `return 33-27;`
- D (5): the student averages each half: before, 21 - 8.5 = 12.5; after, 26 - 8.5 = 17.5; the increase is 5 | computation: `const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;const a=[18,27,12,13,3,9,26,10].sort((x,y)=>x-y);const b=[...a,33];return (mean(b.slice(5))-mean(b.slice(0,4)))-(mean(a.slice(4))-mean(a.slice(0,4)));`

---

## MV2-D6-15

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Twenty students were asked how many times they rode a bus last week. The table shows the results, but the number of students who rode 3 times is missing. What is the mean number of bus rides for the twenty students?

Table (Bus rides last week):

|  | Number of students |
| --- | --- |
| 0 | 3 |
| 1 | 6 |
| 2 | 1 |
| 3 | ? |
| 4 | 6 |

A. 2.65
B. 1.6
C. 2.2
D. 2

KEY: C (2.2)

Worked solution: The counts shown add to 3 + 6 + 1 + 6 = 16, so 20 - 16 = 4 students rode 3 times. The total number of rides is 0 x 3 + 1 x 6 + 2 x 1 + 3 x 4 + 4 x 6 = 0 + 6 + 2 + 12 + 24 = 44. The mean is 44 / 20 = 2.2 rides.

Key computation (JS): `const v=[0,1,2,3,4],c=[3,6,1,null,6];const k=20-c.filter(x=>x!==null).reduce((s,x)=>s+x,0);c[3]=k;return v.reduce((s,x,i)=>s+x*c[i],0)/20;`

Distractors:
- A (2.65): thinking students with 0 rides do not count, the student finds the missing count as 20 - (6 + 1 + 6) = 7, so the total is 32 + 21 = 53 and 53 / 20 = 2.65 | computation: `const v=[0,1,2,3,4],c=[3,6,1,0,6];const k=20-(6+1+6);c[3]=k;return v.reduce((s,x,i)=>s+x*c[i],0)/20;`
- B (1.6): the student leaves the 3-rides row out of the total, gets 32 rides, and divides by all 20 students | computation: `const v=[0,1,2,3,4],c=[3,6,1,0,6];return v.reduce((s,x,i)=>s+x*c[i],0)/20;`
- D (2): the student skips the missing row entirely and divides the 32 rides by the 16 students shown | computation: `const v=[0,1,2,3,4],c=[3,6,1,0,6];return v.reduce((s,x,i)=>s+x*c[i],0)/16;`

---

## MV2-D7-11

Area: Statistics and Probability | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A park had 1,200 visitors on Saturday. A ranger asked a random sample of 60 of the visitors how they got to the park. The table shows the results. Based on the sample, about how many of the 1,200 visitors rode a bike to the park?

Table:

|  | Number of visitors |
| --- | --- |
| Car | 32 |
| Bus | 18 |
| Bike | 10 |

A. 600
B. 360
C. 240
D. 200

KEY: D (200)

Worked solution: In the sample, 10 of the 60 visitors rode a bike. 10/60 = 1/6. So about 1/6 of the 1,200 visitors, or 1,200 / 6 = 200 visitors, rode a bike.

Key computation (JS): `const t={car:32,bus:18,bike:10};const n=t.car+t.bus+t.bike;return t.bike/n*1200;`

Distractors:
- A (600): 10 x 60 = 600. | computation: `const t={car:32,bus:18,bike:10};const n=t.car+t.bus+t.bike;return t.bike*n;`
- B (360): 18/60 of 1,200 = 360. | computation: `const t={car:32,bus:18,bike:10};const n=t.car+t.bus+t.bike;return t.bus/n*1200;`
- C (240): 10/50 of 1,200 = 240. | computation: `const t={car:32,bus:18,bike:10};const n=t.car+t.bus+t.bike;return t.bike/(t.car+t.bus)*1200;`

---

## MV2-D8-01

Area: Statistics and Probability | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A school asked 75 eighth graders two questions: Are you in the school band? Do you walk to school? The two-way table shows the results. Of the students who walk to school, what percent are in the band?

Table (Band and walking to school (number of students)):

|  | Walks to school | Does not walk | Total |
| --- | --- | --- | --- |
| In the band | 6 | 9 | 15 |
| Not in the band | 24 | 36 | 60 |
| Total | 30 | 45 | 75 |

A. 20
B. 40
C. 8
D. 25

KEY: A (20)

Worked solution: Only the students who walk to school count, so use the "Walks to school" column. 30 students walk, and 6 of them are in the band. 6 / 30 = 0.20, which is 20 percent.

Key computation (JS): `return String(600/30);`

Distractors:
- B (40): the student answers "of the band members, what percent walk": 6 / 15 = 40 percent, using the band row total | computation: `return String(600/15);`
- C (8): the student finds what percent of ALL 75 students are band members who walk: 6 / 75 = 8 percent | computation: `return String(600/75);`
- D (25): the student compares the band walkers with the walkers who are not in the band, 6 to 24, and writes 6 / 24 = 25 percent | computation: `return String(600/24);`

---

## MV2-D8-08

Area: Statistics and Probability | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The table shows the number of hours each of five students practiced the piano in a week and the number of songs the student learned that month. Kai fits a line to the data. His line has a slope of 3 and passes through the point whose x-coordinate is the mean of the five practice times and whose y-coordinate is the mean of the five numbers of songs. According to Kai's line, how many songs would a student who practices 16 hours a week learn?

Table (Practice time (hours per week) and songs learned):

|  | Songs learned |
| --- | --- |
| 1 | 19 |
| 2 | 27 |
| 7 | 28 |
| 8 | 42 |
| 12 | 44 |

A. 60
B. 62
C. 42
D. 55

KEY: B (62)

Worked solution: Mean practice time: (1 + 2 + 7 + 8 + 12) / 5 = 30 / 5 = 6 hours. Mean number of songs: (19 + 27 + 28 + 42 + 44) / 5 = 160 / 5 = 32. So the line passes through (6, 32) with slope 3. From x = 6 to x = 16 is 10 more hours, so the line rises 3 x 10 = 30 songs: 32 + 30 = 62.

Key computation (JS): `const xb=(1+2+7+8+12)/5, yb=(19+27+28+42+44)/5; return String(yb + 3*(16-xb));`

Distractors:
- A (60): the student averages only the first and last values, (1 + 12) / 2 = 6.5 and (19 + 44) / 2 = 31.5, and computes 31.5 + 3(16 - 6.5) = 60 | computation: `return String((19+44)/2 + 3*(16-(1+12)/2));`
- C (42): the student finds the mean point (6, 32) and adds the 10-hour run straight to 32, getting 42, as if the slope were 1 | computation: `const xb=(1+2+7+8+12)/5, yb=(19+27+28+42+44)/5; return String(yb + (16-xb));`
- D (55): the student takes the middle row, (7, 28), as the centre point and computes 28 + 3(16 - 7) = 55 | computation: `return String(28 + 3*(16-7));`

---

## MV2-D6-16

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The table shows the cooking times, in minutes, of 8 recipes in Book A and 8 recipes in Book B. Use this rule for quartiles: the first quartile is the median of the lower half of the data and the third quartile is the median of the upper half. How many minutes greater is the interquartile range of the Book A times than the interquartile range of the Book B times?

Table (Cooking times (minutes)):

|  | Recipe 1 | Recipe 2 | Recipe 3 | Recipe 4 | Recipe 5 | Recipe 6 | Recipe 7 | Recipe 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Book A | 13 | 48 | 19 | 11 | 34 | 49 | 29 | 46 |
| Book B | 28 | 42 | 15 | 29 | 21 | 13 | 32 | 37 |

A. 13
B. 12.5
C. 14.5
D. 9

KEY: C (14.5)

Worked solution: Book A in order: 11, 13, 19, 29, 34, 46, 48, 49. The lower half 11, 13, 19, 29 has median 16 and the upper half 34, 46, 48, 49 has median 47, so the IQR is 47 - 16 = 31. Book B in order: 13, 15, 21, 28, 29, 32, 37, 42. The lower half has median 18 and the upper half has median 34.5, so the IQR is 34.5 - 18 = 16.5. The difference is 31 - 16.5 = 14.5 minutes.

Key computation (JS): `const q=a=>{const s=[...a].sort((x,y)=>x-y);return (s[5]+s[6])/2-(s[1]+s[2])/2};return q([13,48,19,11,34,49,29,46])-q([28,42,15,29,21,13,32,37]);`

Distractors:
- A (13): the student uses the 2nd and 7th times as the quartiles: Book A 48 - 13 = 35 and Book B 37 - 15 = 22, so 35 - 22 = 13 | computation: `const e=a=>{const s=[...a].sort((x,y)=>x-y);return s[6]-s[1]};return e([13,48,19,11,34,49,29,46])-e([28,42,15,29,21,13,32,37]);`
- B (12.5): the student finds the upper quartiles, 47 and 34.5, and subtracts them, forgetting the first quartiles | computation: `const q3=a=>{const s=[...a].sort((x,y)=>x-y);return (s[5]+s[6])/2};return q3([13,48,19,11,34,49,29,46])-q3([28,42,15,29,21,13,32,37]);`
- D (9): the student subtracts the ranges, (49 - 11) - (42 - 13) = 38 - 29 = 9 | computation: `const r=a=>Math.max(...a)-Math.min(...a);return r([13,48,19,11,34,49,29,46])-r([28,42,15,29,21,13,32,37]);`

---

## MV2-D5-07

Area: Statistics and Probability | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A science class measured caterpillars. The table shows the line plot data: each row gives a length, in inches, and the number of caterpillars with that length. How much greater, in inches, is the total length of the caterpillars longer than 2 inches than the total length of the caterpillars shorter than 2 inches?

Table:

|  | Number of caterpillars |
| --- | --- |
| 1 | 3 |
| 1 3/4 | 1 |
| 2 | 2 |
| 2 1/4 | 6 |
| 2 3/4 | 6 |

A. 21 1/4
B. 10 1/4
C. 20 1/4
D. 25 1/4

KEY: D (25 1/4)

Worked solution: Longer than 2 inches: 6 x 2 1/4 = 13 1/2 and 6 x 2 3/4 = 16 1/2, total 30. Shorter than 2 inches: 3 x 1 = 3 and 1 x 1 3/4 = 1 3/4, total 4 3/4. The 2-inch caterpillars are in neither group. 30 - 4 3/4 = 25 1/4 inches.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F((6*9+6*11)-(3*4+1*7),4)`

Distractors:
- A (21 1/4): The student adds 2 x 2 = 4 to the shorter total, so 30 - 8 3/4 = 21 1/4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F((6*9+6*11)-(3*4+1*7+2*8),4)`
- B (10 1/4): The student adds count and length in each row: (6 + 2 1/4) + (6 + 2 3/4) = 17 and (3 + 1) + (1 + 1 3/4) = 6 3/4, so 17 - 6 3/4 = 10 1/4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F((6*4+9+6*4+11)-(3*4+4+1*4+7),4)`
- C (20 1/4): The student writes 6 x 2 1/4 as 12 1/4 and 6 x 2 3/4 as 12 3/4, so the longer total is 25 and 25 - 4 3/4 = 20 1/4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F((6*8+1+6*8+3)-(3*4+1*4+3),4)`

---

## MV2-D8-10

Area: Statistics and Probability | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The table shows the number of hours each of six students spent on a science project and the score each student received. Mr. Ortiz fits a line to the data this way: he finds the mean hours and the mean score of the three students with the fewest hours, finds the same two means for the other three students, and draws the line through those two mean points. According to his line, what score is predicted for a student who spends 0 hours?

Table (Hours spent on the project and score):

|  | Score |
| --- | --- |
| 6 | 39 |
| 7 | 41 |
| 8 | 43 |
| 10 | 55 |
| 11 | 56 |
| 12 | 60 |

A. 13
B. 15
C. 29
D. 18

KEY: A (13)

Worked solution: Fewest hours: 6, 7, 8 hours with scores 39, 41, 43. Means: 21 / 3 = 7 hours and 123 / 3 = 41 points, so one point is (7, 41). Other three: 10, 11, 12 hours with scores 55, 56, 60. Means: 33 / 3 = 11 hours and 171 / 3 = 57 points, so the other point is (11, 57). Slope = (57 - 41) / (11 - 7) = 16 / 4 = 4. Going back from (7, 41) to 0 hours: 41 - 4 x 7 = 41 - 28 = 13. The line predicts a score of 13.

Key computation (JS): `const xL=(6+7+8)/3, yL=(39+41+43)/3, xR=(10+11+12)/3, yR=(55+56+60)/3; const m=(yR-yL)/(xR-xL); return String(yL - m*xL);`

Distractors:
- B (15): the student gets the slope 4 correctly but starts from the first student, (6, 39), and goes back 6 hours: 39 - 24 = 15 | computation: `const xL=(6+7+8)/3, yL=(39+41+43)/3, xR=(10+11+12)/3, yR=(55+56+60)/3; const m=(yR-yL)/(xR-xL); return String(39 - m*6);`
- C (29): the student takes the right group's mean score, 57, with the left group's mean hours, 7, and computes 57 - 4 x 7 = 29 | computation: `const xL=(6+7+8)/3, yL=(39+41+43)/3, xR=(10+11+12)/3, yR=(55+56+60)/3; const m=(yR-yL)/(xR-xL); return String(yR - m*xL);`
- D (18): the student draws the line through (6, 39) and (12, 60): slope 21 / 6 = 3.5, and 39 - 3.5 x 6 = 18 | computation: `const m=(60-39)/(12-6); return String(39 - m*6);`

---

## MV2-D7-03

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Ms. Cole wants to estimate how many of the 1,000 students at her school have a library card. She asks a random sample of 12 students, and 6 of them have a library card. Later she asks a different random sample of 60 students, and 21 of them have a library card. She puts the two samples together into one larger sample. Based on the combined sample, about how many of the 1,000 students have a library card?

A. 350
B. 375
C. 450
D. 425

KEY: B (375)

Worked solution: The combined sample has 12 + 60 = 72 students, and 6 + 21 = 27 of them have a library card. That is 27/72 = 3/8 = 37.5%. Then 37.5% of 1,000 is 0.375 x 1,000 = 375 students.

Key computation (JS): `return (6+21)/(12+60)*1000;`

Distractors:
- A (350): 21/60 = 35%, and 35% of 1,000 is 350. | computation: `return 21/60*1000;`
- C (450): 27 yes answers over 60 students is 45%, and 45% of 1,000 is 450. | computation: `return (6+21)/60*1000;`
- D (425): 50% and 35% average to 42.5%, and 42.5% of 1,000 is 425. | computation: `return ((6/12+21/60)/2)*1000;`

---

## MV2-D8-05

Area: Statistics and Probability | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Jae recorded how much battery charge his tablet had left while he played a video game, and made a scatter plot. A line of fit for the data is y = -30x + 96, where x is the number of hours he has been playing and y is the percent of battery charge left. According to the line of fit, what percent of battery charge is left after Jae plays for 2 hours 30 minutes?

A. 25
B. 27
C. 21
D. 36

KEY: C (21)

Worked solution: 30 minutes is half an hour, so 2 hours 30 minutes is x = 2.5. Then y = -30(2.5) + 96 = -75 + 96 = 21. The line of fit predicts 21 percent of the charge is left.

Key computation (JS): `return String(-30*2.5 + 96);`

Distractors:
- A (25): the student finds the charge used, 30 x 2.5 = 75 points, and subtracts it from a full 100% instead of from the line's starting value 96, getting 25 | computation: `return String(100 - 30*2.5);`
- B (27): the student writes 2 hours 30 minutes as 2.30 hours, so y = -30(2.3) + 96 = 27 | computation: `return String(Math.round((-30*2.3 + 96)*100)/100);`
- D (36): the student uses x = 2 and ignores the 30 minutes: -30(2) + 96 = 36 | computation: `return String(-30*2 + 96);`

---

## MV2-D6-09

Area: Statistics and Probability | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: The numbers of floors in nine buildings on a street are 9, 16, 1, 15, 6, 16, 2, 5, and 16. How much greater is the mode of the numbers of floors than the median?

A. 11
B. 10
C. 7.5
D. 7

KEY: D (7)

Worked solution: In order the numbers are 1, 2, 5, 6, 9, 15, 16, 16, 16. The mode is 16 because it appears three times. There are nine numbers, so the median is the 5th one, 9. The mode is 16 - 9 = 7 floors greater than the median.

Key computation (JS): `const a=[9,16,1,15,6,16,2,5,16].sort((x,y)=>x-y);return 16-a[4];`

Distractors:
- A (11): the student finds the middle position, (9 + 1) / 2 = 5, and uses 5 as the median, so 16 - 5 = 11 | computation: `const n=9;return 16-(n+1)/2;`
- B (10): the student lists the different numbers 1, 2, 5, 6, 9, 15, 16 once each and takes the middle one, 6, so the answer is 16 - 6 = 10 | computation: `const d=[...new Set([9,16,1,15,6,16,2,5,16])].sort((x,y)=>x-y);return 16-d[3];`
- C (7.5): the student finds (1 + 16) / 2 = 8.5 as the "middle" and subtracts, 16 - 8.5 = 7.5 | computation: `const a=[9,16,1,15,6,16,2,5,16];return 16-(Math.min(...a)+Math.max(...a))/2;`

---

## MV2-D6-01

Area: Statistics and Probability | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The table shows the number of points Ana and Bea each scored in 5 basketball games. The mean absolute deviation (MAD) of a data set is the mean of the distances between each value and the mean of that data set. How many points greater is the MAD of Ana's points than the MAD of Bea's points?

Table (Points scored):

|  | Ana | Bea |
| --- | --- | --- |
| Game 1 | 4 | 12 |
| Game 2 | 18 | 17 |
| Game 3 | 5 | 10 |
| Game 4 | 19 | 16 |
| Game 5 | 9 | 15 |

A. 3.6
B. 2.6
C. 3
D. 3.4

KEY: A (3.6)

Worked solution: Ana: the mean is (4 + 18 + 5 + 19 + 9) / 5 = 55 / 5 = 11. The distances from 11 are 7, 7, 6, 8 and 2, which add to 30, so her MAD is 30 / 5 = 6. Bea: the mean is (12 + 17 + 10 + 16 + 15) / 5 = 70 / 5 = 14. The distances from 14 are 2, 3, 4, 2 and 1, which add to 12, so her MAD is 12 / 5 = 2.4. Ana's MAD is 6 - 2.4 = 3.6 points greater.

Key computation (JS): `const A=[4,18,5,19,9],B=[12,17,10,16,15];const m=a=>a.reduce((s,x)=>s+x,0)/a.length;const d=(a,c)=>a.reduce((s,x)=>s+Math.abs(x-c),0)/a.length;return Math.round((d(A,m(A))-d(B,m(B)))*100)/100;`

Distractors:
- B (2.6): the student finds Ana's mean, 11, and uses 11 again for Bea, so Bea's distances are 1, 6, 1, 5 and 4, her MAD comes out 17 / 5 = 3.4, and 6 - 3.4 = 2.6 | computation: `const A=[4,18,5,19,9],B=[12,17,10,16,15];const m=a=>a.reduce((s,x)=>s+x,0)/a.length;const d=(a,c)=>a.reduce((s,x)=>s+Math.abs(x-c),0)/a.length;return Math.round((d(A,m(A))-d(B,m(A)))*100)/100;`
- C (3): the student thinks comparing MADs means comparing how many points each player scores and subtracts the means, 14 - 11 = 3 | computation: `const A=[4,18,5,19,9],B=[12,17,10,16,15];const m=a=>a.reduce((s,x)=>s+x,0)/a.length;return m(B)-m(A);`
- D (3.4): the student uses Ana's median 9 and Bea's median 15 as the centers, getting MADs of 28 / 5 = 5.6 and 11 / 5 = 2.2, and 5.6 - 2.2 = 3.4 | computation: `const A=[4,18,5,19,9],B=[12,17,10,16,15];const md=a=>[...a].sort((x,y)=>x-y)[2];const d=(a,c)=>a.reduce((s,x)=>s+Math.abs(x-c),0)/a.length;return Math.round((d(A,md(A))-d(B,md(B)))*100)/100;`

---

## MV2-D5-06

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A builder is putting trim around 6 windows. Each window needs a strip of trim that is 1 yard 1 foot long. How many inches of trim does the builder need in all?

A. 252
B. 288
C. 248
D. 228

KEY: B (288)

Worked solution: 1 yard 1 foot = 36 + 12 = 48 inches. For 6 windows: 6 x 48 = 288 inches.

Key computation (JS): `return 6*(36+12)`

Distractors:
- A (252): The student gets 6 yards 6 feet, calls the 6 feet one more yard, and does 7 x 36. | computation: `return (6+1)*36`
- C (248): In 6 x 48 the student writes 8, carries 4, then writes 6 x 4 = 24 without adding the carry. | computation: `return 6*4*10+8`
- D (228): The student does 6 x 36 = 216 and then adds 12 for the foot. | computation: `return 6*36+12`

---

## MV2-D5-10

Area: Statistics and Probability | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A builder has some pieces of wood trim. The table shows the line plot data: each row gives a length, in yards, and the number of pieces with that length. The builder uses 2 of the 3/4-yard pieces. What is the total length, in yards, of the pieces that are left?

Table:

|  | Number of pieces |
| --- | --- |
| 1/4 | 2 |
| 1/2 | 3 |
| 3/4 | 5 |
| 1 | 2 |

A. 4 3/4
B. 2 3/4
C. 6 1/4
D. 5

KEY: C (6 1/4)

Worked solution: Total length: 2 x 1/4 + 3 x 1/2 + 5 x 3/4 + 2 x 1 = 1/2 + 1 1/2 + 3 3/4 + 2 = 7 3/4 yards. The 2 pieces used are 2 x 3/4 = 1 1/2 yards. 7 3/4 - 1 1/2 = 6 1/4 yards.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F((2*1+3*2+5*3+2*4)-2*3,4)`

Distractors:
- A (4 3/4): The student leaves out the three 1/2-yard pieces when finding the total, gets 6 1/4 yards, and takes away 1 1/2: 6 1/4 - 1 1/2 = 4 3/4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F(2*1+5*3+2*4-6,4)`
- B (2 3/4): The student writes 5 x 3/4 as 15/20 = 3/4, 3 x 1/2 as 3/6 = 1/2 and so on, so every fraction row counts as just one piece; the two 1-yard pieces stay 2 yards. The used pieces become 3/4 too, so 3 1/2 - 3/4 = 2 3/4. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F((1+2+3+8)-3,4)`
- D (5): The student finds the total, 7 3/4 yards, and takes away 2 3/4 instead of 2 x 3/4 = 1 1/2: 7 3/4 - 2 3/4 = 5. | computation: `const g=(a,b)=>b?g(b,a%b):a;const F=(n,d)=>{const k=g(n,d);n/=k;d/=k;if(d===1)return String(n);const w=Math.floor(n/d),r=n-w*d;return w?w+' '+r+'/'+d:r+'/'+d};return F(2*1+3*2+5*3+2*4-11,4)`
