# Items for review, KEYED (19)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MV2-N8-04

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Two points are marked on a number line, one at √40 and one at √50. Which of these decimals is located between the two points?

A. 6.85
B. 6.25
C. 4.45
D. 7.15

KEY: A (6.85)

Worked solution: A number lies between √40 and √50 when its square is between 40 and 50. 6.85^2 = 46.9225, which is between 40 and 50. Check the others: 6.25^2 = 39.0625 (less than 40), 7.15^2 = 51.1225 (more than 50), and 4.45^2 = 19.8025. So 6.85 is the only one between √40 and √50.

Key computation (JS): `const o=[6.25,7.15,4.45,6.85]; return String(o.find(v=>v*v>40&&v*v<50))`

Distractors:
- B (6.25): Knowing only that both roots are between 6 and 7, the student picks the first option in that range without squaring it; 6.25^2 = 39.06 is below 40. | computation: `const o=[4.45,6.25,6.85,7.15]; return String(o.find(v=>v>6&&v<7))`
- C (4.45): The student thinks √40 is about 4 and √50 is about 5, so picks the option between 4 and 5. | computation: `const o=[4.45,6.25,6.85,7.15]; return String(o.find(v=>v>4&&v<5))`
- D (7.15): The student computes 7.15^2 as 49 + 0.0225 = 49.0225, which looks less than 50; the true square is 51.1225. | computation: `const o=[4.45,6.25,6.85,7.15]; return String(o.find(v=>{const w=Math.floor(v), f=Math.round((v-w)*100)/100; const sq=w*w+f*f; return sq>40&&sq<50}))`

---

## MV2-N8-14

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: In the decimal 0.3484848..., the digits 48 repeat forever and the 3 does not repeat. When this decimal is written as a fraction a/b in simplest form, what is a + b?

A. 49
B. 89
C. 589
D. 449

KEY: B (89)

Worked solution: Let n = 0.3484848... Then 1000n = 348.484848... and 10n = 3.484848... Subtract: 990n = 345, so n = 345/990. Divide the top and bottom by 15: n = 23/66. So a + b = 23 + 66 = 89.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const n=345, d=990, k=g(n,d); return String(n/k + d/k)`

Distractors:
- A (49): The student converts 0.484848... = 48/99 = 16/33 and adds 16 + 33 = 49. | computation: `const g=(a,b)=>b?g(b,a%b):a; const k=g(48,99); return String(48/k + 99/k)`
- C (589): The student computes 3/10 + 48/99 = 777/990 = 259/330 and adds 259 + 330 = 589. | computation: `const g=(a,b)=>b?g(b,a%b):a; const n=3*99+48*10, d=990, k=g(n,d); return String(n/k + d/k)`
- D (449): The student writes 348/999 = 116/333 and adds 116 + 333 = 449. | computation: `const g=(a,b)=>b?g(b,a%b):a; const k=g(348,999); return String(348/k + 999/k)`

---

## MV2-N7-18

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: An elevator in a mine starts at a loading platform at an elevation of -6.4 meters. It goes down at 11.5 meters per minute for 4.5 minutes. Then it goes up at 5.6 meters per minute for 2 minutes. What is the elevator's elevation now, in meters?

A. -34.15
B. -44.75
C. -46.95
D. -32.95

KEY: C (-46.95)

Worked solution: Going down: 11.5 x 4.5 = 51.75 meters, so the elevator reaches -6.4 - 51.75 = -58.15 meters. Going up: 5.6 x 2 = 11.2 meters, so it ends at -58.15 + 11.2 = -46.95 meters.

Key computation (JS): `return (-6.4 - 11.5 * 4.5 + 5.6 * 2).toFixed(2);`

Distractors:
- A (-34.15): The student drops the minus sign on the platform: 6.4 - 51.75 + 11.2 = -34.15. | computation: `return (6.4 - 11.5 * 4.5 + 5.6 * 2).toFixed(2);`
- B (-44.75): The student takes 11.5 - 5.6 = 5.9 and multiplies by 4.5 + 2 = 6.5, getting 38.35 down, so -6.4 - 38.35 = -44.75. | computation: `return (-6.4 - (11.5 - 5.6) * (4.5 + 2)).toFixed(2);`
- D (-32.95): The student computes the climb as 5.6 x 4.5 = 25.2, so -6.4 - 51.75 + 25.2 = -32.95. | computation: `return (-6.4 - 11.5 * 4.5 + 5.6 * 4.5).toFixed(2);`

---

## MV2-N8-06

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: The number x makes the equation 3^x = 10 true. What is the value of 9^x + 3^(x + 3)?

A. 130
B. 290
C. 1100
D. 370

KEY: D (370)

Worked solution: Write 9 as 3^2, so 9^x = (3^2)^x = (3^x)^2 = 10^2 = 100. Also 3^(x + 3) = 3^x x 3^3 = 10 x 27 = 270. So 9^x + 3^(x + 3) = 100 + 270 = 370.

Key computation (JS): `return String(10**2 + 10 * 3**3)`

Distractors:
- A (130): The student writes 3^(x+3) = 10 x 3 = 30 and gets 100 + 30 = 130. | computation: `return String(10**2 + 10 * 3)`
- B (290): The student writes 9^x = 2 x 10 = 20 and gets 20 + 270 = 290. | computation: `return String(2 * 10 + 10 * 3**3)`
- C (1100): The student thinks 3^(x+3) = 10^3 = 1000 because 3^x = 10, and gets 100 + 1000 = 1100. | computation: `return String(10**2 + 10**3)`

---

## MV2-N56-23

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Point P is halfway between -11 and 6 on a number line. Point Q is at the opposite of the number at point P. How far is point Q from 9?

A. 6.5
B. 7.5
C. 11.5
D. 9.5

KEY: A (6.5)

Worked solution: The distance from -11 to 6 is 11 + 6 = 17. Half of 17 is 8.5. Moving 8.5 units to the right of -11 gives -2.5, so P is at -2.5. The opposite of -2.5 is 2.5, so Q is at 2.5. Q and 9 are both positive, so the distance is 9 - 2.5 = 6.5.

Key computation (JS): `const P=-11+(6-(-11))/2, Q=-P; return (Math.abs(9-Q)).toFixed(1);`

Distractors:
- B (7.5): the student finds Q = 2.5 correctly and then writes 9 - 2.5 as 7.5, a regrouping slip | computation: `const Q=2.5; return (9-Q+1).toFixed(1);`
- C (11.5): the student finds P = -2.5 and measures from P to 9 across 0: 2.5 + 9 = 11.5 | computation: `const P=-11+(6-(-11))/2; return (Math.abs(9-P)).toFixed(1);`
- D (9.5): the student halves -11 to get -5.5 and adds 6, putting P at 0.5; then Q = -0.5 and the distance from -0.5 to 9 is 9.5 | computation: `const P=-11/2+6, Q=-P; return (Math.abs(9-Q)).toFixed(1);`

---

## MV2-N56-06

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A photo is 2 4/5 inches wide. Ana prints a large copy that is 1 1/2 times as wide as the photo. She also prints a small copy that is 1/3 as wide as the photo. How many inches wider is the large copy than the small copy?

A. 5 2/15
B. 3 4/15
C. 1 13/15
D. 3 13/15

KEY: B (3 4/15)

Worked solution: Large copy: 2 4/5 x 1 1/2 = 14/5 x 3/2 = 42/10 = 4 1/5 inches. Small copy: 2 4/5 x 1/3 = 14/5 x 1/3 = 14/15 inch. Difference: 4 1/5 - 14/15 = 4 3/15 - 14/15 = 3 18/15 - 14/15 = 3 4/15 inches.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const m=(n,d)=>{const k=g(n,d); n/=k; d/=k; return (Math.floor(n/d)?Math.floor(n/d)+" ":"")+(n%d)+"/"+d}; return m(14*3*3 - 14*2, 5*2*3); /* 14/5 x 3/2 - 14/5 x 1/3 */`

Distractors:
- A (5 2/15): the student finds both widths, 4 1/5 and 14/15, and adds them: 5 2/15 | computation: `const g=(a,b)=>b?g(b,a%b):a; const m=(n,d)=>{const k=g(n,d); n/=k; d/=k; return (Math.floor(n/d)?Math.floor(n/d)+" ":"")+(n%d)+"/"+d}; return m(21*3 + 14, 15); /* large + small: 21/5 + 14/15 */`
- C (1 13/15): the student finds the small copy, 14/15 inch, and subtracts it from the photo: 2 4/5 - 14/15 = 1 13/15 | computation: `const g=(a,b)=>b?g(b,a%b):a; const m=(n,d)=>{const k=g(n,d); n/=k; d/=k; return (Math.floor(n/d)?Math.floor(n/d)+" ":"")+(n%d)+"/"+d}; return m(14*3 - 14, 15); /* photo minus small copy: 14/5 - 14/15 */`
- D (3 13/15): the student finds the large copy, 4 1/5 inches, and takes away 1/3 inch: 4 1/5 - 1/3 = 3 13/15 | computation: `const g=(a,b)=>b?g(b,a%b):a; const m=(n,d)=>{const k=g(n,d); n/=k; d/=k; return (Math.floor(n/d)?Math.floor(n/d)+" ":"")+(n%d)+"/"+d}; return m(21*3 - 5, 15); /* large copy minus the bare 1/3: 21/5 - 1/3 */`

---

## MV2-N56-10

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A gym teacher has 63 red mats and 84 blue mats. She stacks them so that every stack has mats of only one color and every stack has the same number of mats. She makes the stacks as tall as she can. How many stacks does she make in all?

A. 49
B. 3
C. 7
D. 21

KEY: C (7)

Worked solution: Every stack must have the same number of mats, and that number must divide both 63 and 84. The stacks are as tall as possible, so use the greatest common factor. 63 = 3 x 21 and 84 = 4 x 21, and 3 and 4 share no factor, so the GCF is 21. There are 63 / 21 = 3 red stacks and 84 / 21 = 4 blue stacks, so 3 + 4 = 7 stacks in all.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+' ':'')+r+'/'+d};const k=g(63,84);return String(63/k+84/k);`

Distractors:
- A (49): the student sees that both 63 and 84 are divisible by 3, makes stacks of 3, and gets 21 + 28 = 49 stacks, ignoring that the stacks must be as tall as possible | computation: `const k=3;return String(63/k+84/k);`
- B (3): the student finds the stack size 21 and divides 63 by it, then stops at 3 red stacks without adding the 4 blue stacks | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+' ':'')+r+'/'+d};const k=g(63,84);return String(63/k);`
- D (21): the student correctly finds the GCF of 63 and 84 and reports it, answering how tall the stacks are rather than how many there are | computation: `const g=(a,b)=>b?g(b,a%b):a;const mx=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return d===1?String(n):(w?w+' ':'')+r+'/'+d};return String(g(63,84));`

---

## MV2-N7-10

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Freezer A is set to -18.6 degrees Celsius, and Freezer B is set to -4.35 degrees Celsius. Then Freezer A is warmed by 3.5 degrees, and Freezer B is cooled by 2.4 degrees. Now how many degrees colder is Freezer A than Freezer B?

A. 13.15
B. 21.85
C. 9.35
D. 8.35

KEY: D (8.35)

Worked solution: Freezer A is now -18.6 + 3.5 = -15.1 degrees. Freezer B is now -4.35 - 2.4 = -6.75 degrees. Freezer A is colder by -6.75 - (-15.1) = -6.75 + 15.1 = 8.35 degrees.

Key computation (JS): `const a = -18.6 + 3.5, b = -4.35 - 2.4; return (b - a).toFixed(2);`

Distractors:
- A (13.15): The student takes Freezer B to -4.35 + 2.4 = -1.95, so the gap is 15.1 - 1.95 = 13.15. | computation: `const a = -18.6 + 3.5, b = -4.35 + 2.4; return (b - a).toFixed(2);`
- B (21.85): The student finds -15.1 and -6.75 correctly and then adds 15.1 + 6.75 = 21.85. | computation: `const a = -18.6 + 3.5, b = -4.35 - 2.4; return (Math.abs(a) + Math.abs(b)).toFixed(2);`
- C (9.35): The student adds 4.35 and 2.40, forgets to carry, writes 5.75, and gets a gap of 15.1 - 5.75 = 9.35. | computation: `return (15.1 - 5.75).toFixed(2);`

---

## MV2-N56-09

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: In a game, a toy car rolls 1.25 meters every second for 2.6 seconds. Then it hits a pillow and bounces straight back 0.4 meter. How many meters from its starting point does the car end up?

A. 2.85
B. 3.65
C. 1.75
D. 2.75

KEY: A (2.85)

Worked solution: First find how far the car rolls: 1.25 x 2.6. Multiply 125 x 26 = 3,250. There are 2 + 1 = 3 decimal places, so 1.25 x 2.6 = 3.250 = 3.25 meters. The car then moves back 0.4 meter, so it ends up 3.25 - 0.4 = 2.85 meters from where it started.

Key computation (JS): `const f=x=>(Math.round(x*100)/100).toFixed(2);return f(1.25*2.6-0.4);`

Distractors:
- B (3.65): the student reads "bounces 0.4 meter" as 0.4 more meter of travel and adds it to 3.25 | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f(1.25*2.6+0.4);`
- C (1.75): the student treats 1.25 x 2.6 like adding, gets 2 + 0.15 = 2.15 and subtracts 0.4, leaving out the cross products 1 x 0.6 and 0.25 x 2 | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f(1*2+0.25*0.6-0.4);`
- D (2.75): the student subtracts first, 2.6 - 0.4 = 2.2, as if the car rolled for less time, and multiplies 1.25 x 2.2 = 2.75 | computation: `const f=x=>(Math.round(x*100)/100).toFixed(2);return f(1.25*(2.6-0.4));`

---

## MV2-N56-18

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A hiking map is drawn on a coordinate plane where each unit stands for 1 kilometer. The ranger station is at (-4.5, 7) and the lookout tower is at (5, 7). The campsite is at the reflection of the lookout tower across the x-axis. A hiker walks in a straight line from the ranger station to the lookout tower, and then in a straight line from the lookout tower to the campsite. How many kilometers does the hiker walk in all?

A. 19.5
B. 23.5
C. 22.5
D. 14.5

KEY: B (23.5)

Worked solution: The ranger station (-4.5, 7) and the lookout tower (5, 7) have the same y-coordinate and are on opposite sides of the y-axis, so the first leg is 4.5 + 5 = 9.5 kilometers. Reflecting (5, 7) across the x-axis keeps the x-coordinate and changes the sign of the y-coordinate, so the campsite is at (5, -7). The tower and the campsite are on opposite sides of the x-axis, so the second leg is 7 + 7 = 14 kilometers. In all, the hiker walks 9.5 + 14 = 23.5 kilometers.

Key computation (JS): `const leg1=5-(-4.5); const camp=[5,-7]; const leg2=Math.abs(7-camp[1]); return (leg1+leg2).toFixed(1);`

Distractors:
- A (19.5): the student puts the campsite at (-5, 7), so the second leg is 5 + 5 = 10 instead of 14: 9.5 + 10 = 19.5 | computation: `const leg1=5+4.5; const wrong=[-5,7]; const leg2=Math.abs(5-wrong[0]); return (leg1+leg2).toFixed(1);`
- C (22.5): the student sets up both legs correctly but writes 4.5 + 5 as 8.5, then 8.5 + 14 = 22.5 | computation: `const leg1=8.5; const leg2=14; return (leg1+leg2).toFixed(1);`
- D (14.5): the student finds the first leg as 5 - 4.5 = 0.5, ignoring that -4.5 and 5 are on opposite sides of the y-axis, then adds the correct 14: 14.5 | computation: `const leg1=Math.abs(5-4.5); const leg2=7+7; return (leg1+leg2).toFixed(1);`

---

## MV2-N56-03

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A science class measured a seedling that was 7.45 centimeters tall. It grew 1.4 centimeters each week for 4 weeks. At the end of the 4 weeks, a rabbit bit 0.5 centimeter off the top. How tall is the seedling now, in centimeters?

A. 12.35
B. 11.05
C. 12.55
D. 11.35

KEY: C (12.55)

Worked solution: In 4 weeks the seedling grew 4 x 1.4 = 5.6 centimeters, so it was 7.45 + 5.6 = 13.05 centimeters tall. The rabbit bit 0.5 centimeter off one time: 13.05 - 0.5 = 12.55 centimeters.

Key computation (JS): `return (7.45+4*1.4-0.5).toFixed(2);`

Distractors:
- A (12.35): the student combines "1.4 each week for 4 weeks" as 1.4 + 4 = 5.4 and gets 7.45 + 5.4 - 0.5 = 12.35 | computation: `return (7.45+1.4+4-0.5).toFixed(2);`
- B (11.05): the student treats the rabbit bite like the growth and takes 0.5 off each week: 7.45 + 5.6 - 2.0 = 11.05 | computation: `return (7.45+4*1.4-4*0.5).toFixed(2);`
- D (11.35): the student works 4 x 1.4 as 4 x 1 = 4 and keeps the .4, getting 4.4 cm of growth: 7.45 + 4.4 - 0.5 = 11.35 | computation: `return (7.45+(1*4+0.4)-0.5).toFixed(2);`

---

## MV2-N56-19

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Kai's bank balance is -$0.75, which means he owes the bank $0.75. Lena owes the bank 5 times as much money as Kai owes. Max has a balance of $12.50. On a number line of balances, how many dollars apart are Lena's balance and Max's balance?

A. 15.25
B. 13.25
C. 18.25
D. 16.25

KEY: D (16.25)

Worked solution: Lena owes 5 x 0.75 = 3.75 dollars, so her balance is -$3.75. Max's balance is $12.50. The two balances are on opposite sides of 0, so the distance between them is 3.75 + 12.50 = 16.25 dollars.

Key computation (JS): `const lena=-5*0.75; return (12.5-lena).toFixed(2);`

Distractors:
- A (15.25): the student finds Lena's balance -3.75 and the opposite-sides idea, but adds 3.75 + 12.50 as 15.25, losing the carried 1 from 0.75 + 0.50 | computation: `const lena=3.75; return (lena+12.5-1).toFixed(2);`
- B (13.25): the student measures from Kai's -0.75 to 12.50, 0.75 + 12.50 = 13.25, never scaling the debt | computation: `return (0.75+12.5).toFixed(2);`
- C (18.25): the student makes Lena's debt 0.75 + 5 = 5.75 and adds 12.50: 18.25 | computation: `const lena=0.75+5; return (lena+12.5).toFixed(2);`

---

## MV2-N7-05

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A ladder hangs straight down into a well. Its top rung is at an elevation of 0.45 meter, and its bottom rung is at an elevation of -4.05 meters. The ladder has 10 rungs in all, and they are equally spaced. What is the elevation of the 4th rung from the top, in meters?

A. -1.05
B. -2.55
C. -1.35
D. -1.55

KEY: A (-1.05)

Worked solution: From the top rung to the bottom rung is 0.45 - (-4.05) = 4.5 meters. Ten rungs have 9 equal spaces between them, so each space is 4.5 / 9 = 0.5 meter. The 4th rung from the top is 3 spaces below the top rung: 0.45 - 3(0.5) = 0.45 - 1.5 = -1.05 meters.

Key computation (JS): `const s = (0.45 - (-4.05)) / 9; return (0.45 - 3 * s).toFixed(2);`

Distractors:
- B (-2.55): The student starts at the bottom rung, -4.05, and goes up 3 spaces: -4.05 + 1.5 = -2.55. | computation: `const s = (0.45 - (-4.05)) / 9; return (-4.05 + 3 * s).toFixed(2);`
- C (-1.35): The student uses 4.5 / 10 = 0.45 for each space and counts 4 of them: 0.45 - 1.8 = -1.35. | computation: `const s = (0.45 - (-4.05)) / 10; return (0.45 - 4 * s).toFixed(2);`
- D (-1.55): The student finds the 0.5-meter spacing but goes down 4 spaces instead of 3, landing on the 5th rung: 0.45 - 2 = -1.55. | computation: `const s = (0.45 - (-4.05)) / 9; return (0.45 - 4 * s).toFixed(2);`

---

## MV2-N56-15

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A bakery has 6,300 cookies to pack. If it packs them in trays that hold 14 cookies, every tray is full. If it packs them in trays that hold 35 cookies, every tray is also full. How many fewer trays does the bakery need with the 35-cookie trays than with the 14-cookie trays?

A. 300
B. 270
C. 350
D. 630

KEY: B (270)

Worked solution: With 14-cookie trays the bakery needs 6,300 / 14 = 450 trays. With 35-cookie trays it needs 6,300 / 35 = 180 trays. The 35-cookie trays need 450 - 180 = 270 fewer trays.

Key computation (JS): `return String(6300/14-6300/35);`

Distractors:
- A (300): the student reads "how many fewer trays" as one division and computes 6,300 / 21 = 300 | computation: `return String(6300/(35-14));`
- C (350): dividing 6,300 by 35 the student gets 63 / 35 = 1, leaves the remainder 28 behind, divides the next digits 0 and 0 by 35 as zeros, and reports 100 trays, so 450 - 100 = 350 | computation: `return String(6300/14-100);`
- D (630): the student finds 450 and 180 correctly and adds them, answering how many trays both ways together | computation: `return String(6300/14+6300/35);`

---

## MV2-N56-22

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Lia writes the expression -(-5) - |-1.5| + |2 - 9| on the board and works it out step by step. What number should she get?

A. 13.5
B. 14.5
C. 10.5
D. 11.5

KEY: C (10.5)

Worked solution: -(-5) is the opposite of -5, which is 5. |-1.5| is the distance of -1.5 from 0, which is 1.5. |2 - 9| is the distance between 2 and 9, which is 7. So the value is 5 - 1.5 + 7 = 10.5.

Key computation (JS): `return (-(-5)-Math.abs(-1.5)+Math.abs(2-9)).toFixed(1);`

Distractors:
- A (13.5): the student sees the two minus signs in - |-1.5| and adds 1.5 instead of subtracting it: 5 + 1.5 + 7 = 13.5 | computation: `return (5+1.5+7).toFixed(1);`
- B (14.5): the student turns |2 - 9| into 2 + 9 = 11, since "absolute value makes everything positive", and gets 5 - 1.5 + 11 = 14.5 | computation: `return (5-1.5+(2+9)).toFixed(1);`
- D (11.5): the student counts the numbers 2 through 9 on the number line as 8 instead of the 7 steps between them, getting 5 - 1.5 + 8 = 11.5 | computation: `return (5-1.5+8).toFixed(1);`

---

## MV2-N56-08

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A toy factory has 3 crates of marbles, and each crate holds 10^3 marbles. It has 19 boxes of marbles, and each box holds 10^2 marbles. It also has 87 bags of marbles, and each bag holds 10^1 marbles. There are also 6 loose marbles. The factory ships 7 of the bags to a store. How many marbles does the factory have left?

A. 5076
B. 4986
C. 3006
D. 5706

KEY: D (5706)

Worked solution: 10^3 = 1,000, 10^2 = 100 and 10^1 = 10. The crates hold 3 x 1,000 = 3,000 marbles and the boxes hold 19 x 100 = 1,900. After shipping, 87 - 7 = 80 bags are left, holding 80 x 10 = 800. With the 6 loose marbles: 3,000 + 1,900 + 800 + 6 = 5,706 marbles.

Key computation (JS): `return String(3*10**3 + 19*10**2 + (87-7)*10**1 + 6);`

Distractors:
- A (5076): the student subtracts the 7 from the 19 boxes instead of the 87 bags: 3,000 + 1,200 + 870 + 6 = 5,076 | computation: `return String(3*10**3 + (19-7)*10**2 + 87*10**1 + 6);`
- B (4986): the student counts each bag as 1 marble: 3,000 + 1,900 + 80 + 6 = 4,986 | computation: `return String(3*10**3 + 19*10**2 + (87-7)*1 + 6);`
- C (3006): the student thinks each crate holds 10^3 = 100 marbles, so the crates hold 300: 300 + 1,900 + 800 + 6 = 3,006 | computation: `return String(3*10**2 + 19*10**2 + (87-7)*10**1 + 6);`

---

## MV2-N7-04

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In golf, a player's score for a round can be written compared with par: a negative score means that many strokes under par, and a positive score means that many strokes over par. Par for each round of a tournament is 70 strokes. Over four rounds, Jin's scores were -8, +1, -7 and +9. How many strokes did Jin take in all four rounds?

A. 275
B. 255
C. 285
D. 305

KEY: A (275)

Worked solution: Par for four rounds is 4 x 70 = 280 strokes. Jin's scores add to -8 + 1 + (-7) + 9 = -5, so he took 5 strokes fewer than par: 280 + (-5) = 275 strokes.

Key computation (JS): `return String(4 * 70 + (-8 + 1 - 7 + 9));`

Distractors:
- B (255): The student reads all four numbers as "under par" and takes 280 - (8 + 1 + 7 + 9) = 255. | computation: `return String(4 * 70 - (8 + 1 + 7 + 9));`
- C (285): The student finds the net -5 correctly but subtracts it, as if under par meant more strokes: 280 - (-5) = 285. | computation: `return String(4 * 70 - (-8 + 1 - 7 + 9));`
- D (305): The student adds 8 + 1 + 7 + 9 = 25 and gets 280 + 25 = 305. | computation: `return String(4 * 70 + (8 + 1 + 7 + 9));`

---

## MV2-N7-09

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In the expression |-7.25 + 1.2| - |3.4 - (-4.6)|, the bars stand for absolute value. Mia simplifies the expression completely. What number does she get?

A. 0.45
B. -1.95
C. -14.05
D. 4.85

KEY: B (-1.95)

Worked solution: First, -7.25 + 1.2 = -6.05, and |-6.05| = 6.05. Next, 3.4 - (-4.6) = 3.4 + 4.6 = 8, and |8| = 8. So the value is 6.05 - 8 = -1.95.

Key computation (JS): `return (Math.abs(-7.25 + 1.2) - Math.abs(3.4 - (-4.6))).toFixed(2);`

Distractors:
- A (0.45): The student rewrites the expression as 7.25 + 1.2 - 3.4 - 4.6 = 0.45, treating the bars as "make every number positive". | computation: `return (7.25 + 1.2 - 3.4 - 4.6).toFixed(2);`
- C (-14.05): The student uses -6.05 instead of 6.05 and gets -6.05 - 8 = -14.05. | computation: `return ((-7.25 + 1.2) - (3.4 - (-4.6))).toFixed(2);`
- D (4.85): The student computes 3.4 - 4.6 = -1.2, whose absolute value is 1.2, so the value is 6.05 - 1.2 = 4.85. | computation: `return (Math.abs(-7.25 + 1.2) - Math.abs(3.4 - 4.6)).toFixed(2);`

---

## MV2-N56-02

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A park trail is 7/8 mile around. Ana walks around it 8 times. Ben walks 2/5 as far as Ana. How many miles farther does Ana walk than Ben?

A. 9 4/5
B. 5 4/5
C. 4 1/5
D. 6 3/5

KEY: C (4 1/5)

Worked solution: Ana walks 8 x 7/8 = 56/8 = 7 miles. Ben walks 2/5 as far: 2/5 x 7 = 14/5 = 2 4/5 miles. Ana walks 7 - 2 4/5 = 4 1/5 miles farther.

Key computation (JS): `const a=8*7/8; const d=a-a*2/5; const w=Math.floor(d+1e-9); const n=Math.round((d-w)*5); return w+" "+n+"/5";`

Distractors:
- A (9 4/5): the student finds both distances, 7 and 2 4/5, and adds them (9 4/5) instead of subtracting | computation: `const a=8*7/8; const d=a+a*2/5; const w=Math.floor(d+1e-9); const n=Math.round((d-w)*5); return w+" "+n+"/5";`
- B (5 4/5): the student finds both distances correctly, 7 and 2 4/5, but works 7 - 2 4/5 as 7 - 2 = 5 and keeps the 4/5, writing 5 4/5 instead of regrouping | computation: `return (7-2)+" "+4+"/5";`
- D (6 3/5): the student reads "2/5 as far" as 2/5 of a mile and subtracts it from Ana's 7 miles: 7 - 2/5 = 6 3/5 | computation: `const d=8*7/8-2/5; const w=Math.floor(d+1e-9); const n=Math.round((d-w)*5); return w+" "+n+"/5";`
