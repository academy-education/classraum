# Items for review, KEYED (10)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM5-N07

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Each of 5 shelves is 2 1/6 feet long. Mr. Diaz cuts 1 1/4 feet off one of the shelves. What is the total length of the 5 shelves now, in feet?

A. 9 7/12
B. 9 1/12
C. 8 11/12
D. 5 5/12

KEY: A (9 7/12)

Worked solution: Before the cut the shelves are 5 x 2 1/6 = 10 + 5/6 = 10 5/6 feet long in all. Rename in twelfths: 10 5/6 = 10 10/12 and 1 1/4 = 1 3/12. Then 10 10/12 - 1 3/12 = 9 7/12. The shelves are 9 7/12 feet long in all.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(5*26-15,12);`

Distractors:
- B (9 1/12): to write 1/4 in twelfths the student adds 8 to both parts, getting 9/12 instead of 3/12, so it subtracts 1 9/12 and lands at 9 1/12 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(5*26-(12+(1+8)),12);`
- C (8 11/12): the student finds 5 x 1/6 as 5/30, which is still 1/6, so the shelves total 10 1/6 instead of 10 5/6, and 10 2/12 - 1 3/12 = 8 11/12 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(10*12+2-15,12);`
- D (5 5/12): the student writes 2 1/6 as (2 x 1 + 6)/6 = 8/6 instead of 13/6, so the 5 shelves come to 40/6 = 6 2/3 and the answer is 5 5/12 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(5*((2*1+6)*2)-15,12);`

---

## MM5-N16

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On a map drawn on a coordinate plane, each unit stands for 1 meter. A rectangular garden has corners at (-10, 5), (22, 5), (22, 23) and (-10, 23). A fence will go all the way around the garden except for a gate that is 4 meters wide. How many meters of fence are needed?

A. 116
B. 96
C. 56
D. 46

KEY: B (96)

Worked solution: The bottom side goes from (-10, 5) to (22, 5). The points are on opposite sides of the y-axis, so its length is 10 + 22 = 32 meters. The right side goes from (22, 5) to (22, 23). Both points are above the x-axis, so its length is 23 - 5 = 18 meters. The distance all the way around is 32 + 18 + 32 + 18 = 100 meters. Leave out the 4-meter gate: 100 - 4 = 96 meters of fence.

Key computation (JS): `return String(2*((22-(-10))+(23-5))-4);`

Distractors:
- A (116): the student has learned 'add the numbers to find a distance' and finds the right side as 5 + 23 = 28, as if one point were below the x-axis | computation: `return String(2*((22+10)+(23+5))-4);`
- C (56): the student finds the bottom side as 22 - 10 = 12, ignoring that -10 and 22 are on opposite sides of the y-axis | computation: `return String(2*((22-10)+(23-5))-4);`
- D (46): the student adds one length and one width, 32 + 18 = 50, and takes off the gate, leaving out the other two sides | computation: `return String(((22+10)+(23-5))-4);`

---

## MM5-N18

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A school has 210 liters of juice for a fair. A store gives the school 30 more liters of juice. All of the juice is poured into bottles that each hold 0.75 liter. The school gives away 60 of the bottles. How many bottles of juice does the school have left?

A. 220
B. 120
C. 260
D. 250

KEY: C (260)

Worked solution: The school has 210 + 30 = 240 liters of juice. Each bottle holds 0.75 liter, so the number of bottles is 240 / 0.75 = 24000 / 75 = 320. After giving away 60 bottles, the school has 320 - 60 = 260 bottles left.

Key computation (JS): `return String(Math.round((210+30)/0.75-60));`

Distractors:
- A (220): the student pours only the first 210 liters into bottles, 210 / 0.75 = 280, and takes away 60, forgetting the 30 liters the store gave | computation: `return String(Math.round(210/0.75-60));`
- B (120): the student expects the number of bottles to be smaller than the number of liters, so finds 240 x 0.75 = 180 bottles and then takes away 60 | computation: `return String(Math.round((210+30)*0.75-60));`
- D (250): the student divides 210 by 0.75 to get 280 bottles, then adds the 30 liters as if they were 30 bottles, then takes away 60 | computation: `return String(Math.round(210/0.75+30-60));`

---

## MM5-N08

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A red board is 2.2 meters long. A blue board is 0.65 meter shorter than twice the length of the red board. What is the total length of the two boards, in meters?

A. 6.45
B. 7.25
C. 5.75
D. 5.95

KEY: D (5.95)

Worked solution: Twice the red board is 2 x 2.2 = 4.4 meters. The blue board is 0.65 meter shorter: 4.40 - 0.65 = 3.75 meters. Together the boards are 2.2 + 3.75 = 5.95 meters long.

Key computation (JS): `return (2.2 + (2*2.2 - 0.65)).toFixed(2);`

Distractors:
- A (6.45): in 4.40 - 0.65 the student does 5 - 0 = 5 hundredths and 6 - 4 = 2 tenths instead of regrouping, getting 4.25 for the blue board and 6.45 in all | computation: `return (2.2 + 4.25).toFixed(2);`
- B (7.25): the student sees 0.65 and 'than' and adds it, making the blue board 4.4 + 0.65 = 5.05 and the total 7.25 | computation: `return (2.2 + (2*2.2 + 0.65)).toFixed(2);`
- C (5.75): the student reads 'twice the length' as 2 more than the length, so the blue board is 2.2 + 2 - 0.65 = 3.55 and the total is 5.75 | computation: `return (2.2 + (2.2 + 2 - 0.65)).toFixed(2);`

---

## MM5-N10

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A school raised $1,520 at a fair and $35 at a bake sale. It spent $480 of that money on supplies. Then it shared the rest of the money equally among 20 classrooms. How many dollars did each classroom get?

A. 53.75
B. 53.25
C. 53.15
D. 50.25

KEY: A (53.75)

Worked solution: The money left after supplies is 1,520 + 35 - 480 = 1,075 dollars. Share it among 20 classrooms: 1,075 / 20 = 53 with 15 left over, and 15 / 20 = 3/4 = 0.75 of a dollar. Each classroom gets $53.75.

Key computation (JS): `return ((1520+35-480)/20).toFixed(2);`

Distractors:
- B (53.25): in 1,555 - 480 the student regroups the tens and then uses 15 - 8 = 6, getting 1,065, and 1,065 / 20 = 53.25 | computation: `return ((1520+35-490)/20).toFixed(2);`
- C (53.15): the student divides 1,075 by 20, gets 53 R15, and writes it as 53.15 instead of changing 15/20 into 0.75 | computation: `const n=1520+35-480; return (Math.floor(n/20) + (n%20)/100).toFixed(2);`
- D (50.25): the student lumps the $35 from the bake sale with the $480 of spending and takes both away: (1,520 - 35 - 480) / 20 = 50.25 | computation: `return ((1520-35-480)/20).toFixed(2);`

---

## MM5-N01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Each bag of rice weighs 1.15 kilograms. Mia puts 7 bags of rice and a box that weighs 2.15 kilograms in a cart. How many kilograms are in the cart?

A. 9.30
B. 10.20
C. 10.10
D. 9.90

KEY: B (10.20)

Worked solution: The rice weighs 7 x 1.15 = 8.05 kilograms (7 x 1 = 7 and 7 x 0.15 = 1.05). Add the box: 8.05 + 2.15 = 10.20. There are 10.20 kilograms in the cart.

Key computation (JS): `return (7*1.15+2.15).toFixed(2);`

Distractors:
- A (9.30): the student does 7 x 1 = 7, writes the 0.15 once as if it belonged to one bag (7.15), and adds the box: 7.15 + 2.15 = 9.30 | computation: `return (7*1+0.15+2.15).toFixed(2);`
- C (10.10): adding 8.05 + 2.15, the student writes 0 for 10 hundredths but forgets to carry the 1 tenth, so the tenths come out 1 instead of 2 and the sum is 10.10 | computation: `return (7*1.15+2.15-0.10).toFixed(2);`
- D (9.90): the student rounds 1.15 down to 1.1, finds 7 x 1.1 = 7.7, adds back the 0.05 only once (7.75) instead of 7 times, and adds the box: 7.75 + 2.15 = 9.90 | computation: `return (7*1.1+0.05+2.15).toFixed(2);`

---

## MM5-N11

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A tank had 9 3/8 gallons of water in it. A pipe drained 3/8 gallon of water out of the tank each minute for 10 minutes. Then Ana poured 1 1/2 gallons of water into the tank. How many gallons of water are in the tank now?

A. 7 7/8
B. 9 5/8
C. 7 1/8
D. 7 3/8

KEY: C (7 1/8)

Worked solution: The pipe drained 10 x 3/8 = 30/8 = 3 6/8 gallons. Regroup 9 3/8 as 8 11/8; then 8 11/8 - 3 6/8 = 5 5/8 gallons. Ana added 1 1/2 = 1 4/8 gallons: 5 5/8 + 1 4/8 = 6 9/8 = 7 1/8. There are 7 1/8 gallons in the tank.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(75-10*3+12,8);`

Distractors:
- A (7 7/8): the student writes 30/8 as 3 0/8, taking the 3 as the wholes and the 0 as eighths, so only 3 gallons are drained instead of 3 3/4 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(75-(3*8+0)+12,8);`
- B (9 5/8): the student finds 10 x 1/8 = 1 2/8 (10 eighths) and forgets that each minute drains 3 eighths, so too little water is taken out | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(75-10+12,8);`
- D (7 3/8): dividing 30 by 8 the student takes 8 x 3 = 24 but then writes 30 - 24 = 4, so the pipe drains 3 4/8 gallons instead of 3 6/8 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(75-(3*8+4)+12,8);`

---

## MM5-N27

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The water level in a pond was measured every morning. Over four days, the level changed by +0.8 cm, -6.3 cm, -9.5 cm and +4.4 cm. What was the mean (average) change per day, in centimeters?

A. -3.05
B. -3.95
C. -2.55
D. -2.65

KEY: D (-2.65)

Worked solution: The mean is the total change divided by the number of days. Total: 0.8 + (-6.3) + (-9.5) + 4.4. The rises add to 0.8 + 4.4 = 5.2 and the drops add to -6.3 + (-9.5) = -15.8, so the total is 5.2 + (-15.8) = -10.6 cm. Mean: -10.6 ÷ 4 = -2.65 cm per day.

Key computation (JS): `const t = 0.8 - 6.3 - 9.5 + 4.4; return (t / 4).toFixed(2);`

Distractors:
- A (-3.05): The student writes the first change as -0.8, so the total is -12.2 and the mean is -3.05. | computation: `const t = -0.8 - 6.3 - 9.5 + 4.4; return (t / 4).toFixed(2);`
- B (-3.95): The student adds only the drops, -6.3 + (-9.5) = -15.8, and divides by 4 to get -3.95, forgetting that the two rises raise the total. | computation: `const t = -6.3 - 9.5; return (t / 4).toFixed(2);`
- C (-2.55): The student takes the largest change, 4.4, and the smallest, -9.5, and finds the number halfway between them: (4.4 + (-9.5)) ÷ 2 = -2.55. | computation: `return ((4.4 + (-9.5)) / 2).toFixed(2);`

---

## MM5-N09

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A box of 6 bottles of juice costs $24.30, and each bottle costs the same amount. Ms. Ray has $50.00. She buys 4 bottles of the juice at that price per bottle. Then her friend gives her $2.50. How many dollars does Ms. Ray have now?

A. 36.30
B. 34.50
C. 28.20
D. 36.10

KEY: A (36.30)

Worked solution: One bottle costs 24.30 / 6. 24 / 6 = 4; 3 tenths cannot be shared by 6, so write 0 tenths and use 30 hundredths: 30 / 6 = 5 hundredths. One bottle costs $4.05. Four bottles cost 4 x 4.05 = $16.20. She has 50.00 - 16.20 = 33.80, and then 33.80 + 2.50 = 36.30. She has $36.30.

Key computation (JS): `return (50 - 4*(24.30/6) + 2.50).toFixed(2);`

Distractors:
- B (34.50): dividing 24.30 by 6 the student writes 4, then 30 / 6 = 5 right after the point, getting $4.50 a bottle; 4 bottles are then $18.00 and she has 34.50 | computation: `return (50 - 4*4.5 + 2.50).toFixed(2);`
- C (28.20): the student subtracts the $24.30 box price as if she bought all 6 bottles, then adds the gift: 50 - 24.30 + 2.50 = 28.20 | computation: `return (50 - 24.30 + 2.50).toFixed(2);`
- D (36.10): the student rounds $4.05 to $4.10 to make the multiplying easier and keeps the rounded price: 4 x 4.10 = 16.40, so she has 36.10 | computation: `return (50 - 4*4.10 + 2.50).toFixed(2);`

---

## MM5-N28

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A game piece starts at -1 1/8 on a number line. It moves 2 1/8 units to the right five times. Then it moves 1 3/8 units to the left. At what number does the game piece stop?

A. 10 7/8
B. 8 1/8
C. 8 3/8
D. 7 5/8

KEY: B (8 1/8)

Worked solution: Five moves of 2 1/8 to the right: 5 × 2 1/8 = 5 × 17/8 = 85/8 = 10 5/8 units to the right. -1 1/8 + 10 5/8 = 9 4/8. Then 1 3/8 units to the left: 9 4/8 - 1 3/8 = 8 1/8.

Key computation (JS): `const e = -9 + 5 * 17 - 11; const w = Math.floor(e / 8); const f = e - 8 * w; return w + ' ' + f + '/8';`

Distractors:
- A (10 7/8): The student adds the last move instead of subtracting it: 9 4/8 + 1 3/8 = 10 7/8. | computation: `const e = -9 + 5 * 17 + 11; const w = Math.floor(e / 8); const f = e - 8 * w; return w + ' ' + f + '/8';`
- C (8 3/8): The student starts at -7/8 instead of -1 1/8, so after 10 5/8 to the right the piece is at 9 6/8 and then 8 3/8. | computation: `const e = (-8 + 1) + 5 * 17 - 11; const w = Math.floor(e / 8); const f = e - 8 * w; return w + ' ' + f + '/8';`
- D (7 5/8): The student finds 5 x 17/8 = 85/8 but writes it as 10 1/8 instead of 10 5/8, so -1 1/8 + 10 1/8 = 9 and 9 - 1 3/8 = 7 5/8. | computation: `const e = -9 + 81 - 11; const w = Math.floor(e / 8); const f = e - 8 * w; return w + ' ' + f + '/8';`
