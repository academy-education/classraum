# Items for review, KEYED (7)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB9-N8-01

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A list shows five numbers: π, √(25/81), ∛(-1/125), √10, and 0.888... (the 8 repeats forever). Lena adds together only the numbers in the list that are rational. What sum should she get?

A. 1 11/45
B. 1 7/45
C. 31/45
D. 1 29/45

KEY: A (1 11/45)

Worked solution: π and √10 are irrational (10 is not a perfect square). √(25/81) = 5/9, because (5/9)^2 = 25/81. ∛(-1/125) = -1/5, because (-1/5)^3 = -1/125. 0.888... = 8/9. So the sum is 5/9 + (-1/5) + 8/9 = 25/45 - 9/45 + 40/45 = 56/45 = 1 11/45.

Key computation (JS): `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};return F(25-9+40,45);`

Distractors:
- B (1 7/45): The student adds 5/9 - 1/5 + 8/10 = 5/9 + 3/5 = 25/45 + 27/45 = 52/45 = 1 7/45. | computation: `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};return F(25-9+36,45);`
- C (31/45): The student keeps only ∛(-1/125) and 0.888...: -1/5 + 8/9 = -9/45 + 40/45 = 31/45. | computation: `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};return F(-9+40,45);`
- D (1 29/45): The student adds 5/9 + 1/5 + 8/9 = 25/45 + 9/45 + 40/45 = 74/45 = 1 29/45. | computation: `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};return F(25+9+40,45);`

---

## MB7-N7-01

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A calculator has a key that multiplies the number on the screen by -2 and then adds 5. Mia enters 0.75 and then presses the key three times. What number is on the screen now?

A. 41
B. 9
C. -13
D. -1

KEY: B (9)

Worked solution: Press 1: 0.75 x (-2) + 5 = -1.5 + 5 = 3.5. Press 2: 3.5 x (-2) + 5 = -7 + 5 = -2. Press 3: -2 x (-2) + 5 = 4 + 5 = 9. The screen shows 9.

Key computation (JS): `let x=0.75;for(let i=0;i<3;i++)x=-2*x+5;return String(x);`

Distractors:
- A (41): The student uses 2 instead of -2: 0.75 x 2 + 5 = 6.5, then 6.5 x 2 + 5 = 18, then 18 x 2 + 5 = 41. | computation: `let x=0.75;for(let i=0;i<3;i++)x=2*x+5;return String(x);`
- C (-13): The student does the three presses correctly to reach 9, then presses once more: 9 x (-2) + 5 = -13. | computation: `let x=0.75;for(let i=0;i<4;i++)x=-2*x+5;return String(x);`
- D (-1): The student treats the rule as (-2) x (-2) x (-2) x 0.75 + 5 = -8 x 0.75 + 5 = -6 + 5 = -1, adding 5 once instead of after every press. | computation: `return String((-2)*(-2)*(-2)*0.75+5);`

---

## MB8-N7-03

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Put a plus sign (+) or a minus sign (-) in each box so that the value of 3 1/6 [ ] 3 1/3 [ ] 3 2/3 is as close to 0 as possible. What is that value?

A. -2 5/6
B. 2 1/6
C. 2 5/6
D. -3 5/6

KEY: C (2 5/6)

Worked solution: Write all three in sixths: 3 1/6, 3 2/6, 3 4/6. The four choices are: + + gives 10 1/6; + - gives 3 1/6 + 3 2/6 - 3 4/6 = 6 3/6 - 3 4/6 = 5 9/6 - 3 4/6 = 2 5/6; - + gives 3 1/6 - 3 2/6 + 3 4/6 = 3 3/6 = 3 1/2; - - gives 3 1/6 - 3 2/6 - 3 4/6 = -3 5/6. The value closest to 0 is 2 5/6.

Key computation (JS): `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};let b=null;for(const s1 of [1,-1])for(const s2 of [1,-1]){const v=19+s1*20+s2*22;if(b===null||Math.abs(v)<Math.abs(b))b=v}return F(b,6);`

Distractors:
- A (-2 5/6): The student finds that 6 1/2 and 3 2/3 differ by 2 5/6 and writes it as negative because 3 2/3 is "taken away": -2 5/6. | computation: `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};return F(22-(19+20),6);`
- B (2 1/6): In 6 3/6 - 3 4/6 the student writes 5 - 3 = 2 for the wholes and 4/6 - 3/6 = 1/6 for the fractions: 2 1/6. | computation: `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};const big=19+20,sm=22;const w=Math.floor(big/6)-1-Math.floor(sm/6),f=(sm%6)-(big%6);return F(w*6+f,6);`
- D (-3 5/6): The student writes 3 1/6 - 3 1/3 - 3 2/3 = 3 1/6 - 7 = -3 5/6. | computation: `const F=(n,d)=>{const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d);n/=k;d/=k;const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};return F(19-20-22,6);`

---

## MB9-N6-01

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A rectangle on the coordinate plane has vertices at (-3.25, 0.75), (2.25, 0.75), (2.25, -14.45), and (-3.25, -14.45). A robot starts at the vertex (-3.25, 0.75) and moves clockwise along the sides of the rectangle. After the robot has moved a total of 15.6 units, what is the y-coordinate of its location?

A. -4.35
B. -13.85
C. -14.45
D. -9.35

KEY: D (-9.35)

Worked solution: Moving clockwise from (-3.25, 0.75), the robot first goes right along the top side to (2.25, 0.75). That side is 2.25 - (-3.25) = 5.5 units long. It has 15.6 - 5.5 = 10.1 units left, so it turns the corner and moves 10.1 units down the right side, from y = 0.75 to y = 0.75 - 10.1 = -9.35. (The right side goes down to -14.45, so it is still on that side.)

Key computation (JS): `const D=x=>(Math.round(x*100)/100).toFixed(2);const xl=-3.25,xr=2.25,yt=0.75,d=15.6;return D(yt-(d-(xr-xl)));`

Distractors:
- A (-4.35): The student counts 10.1 up from y = -14.45 and gets -4.35. | computation: `const D=x=>(Math.round(x*100)/100).toFixed(2);return D(-14.45+(15.6-(2.25+3.25)));`
- B (-13.85): The student takes the top side as 3.25 - 2.25 = 1, so 14.6 units are left and y = 0.75 - 14.6 = -13.85. | computation: `const D=x=>(Math.round(x*100)/100).toFixed(2);return D(0.75-(15.6-(3.25-2.25)));`
- C (-14.45): The left side is 0.75 - (-14.45) = 15.2 units, so going down it the robot reaches the bottom corner with 0.4 units left and moves 0.4 along the bottom side, where y = -14.45. | computation: `const D=x=>(Math.round(x*100)/100).toFixed(2);const yt=0.75,yb=-14.45,d=15.6;const H=yt-yb;return d>H?D(yb):D(yt-d);`

---

## MB8-N6-01

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Ella draws a number line on a long strip of paper. She folds the strip so that the point at -2 lands exactly on the point at 8. Where on the number line does the point at -7.5 land?

A. 13.5
B. 17.5
C. 10.5
D. 8.5

KEY: A (13.5)

Worked solution: The fold is halfway between -2 and 8: (-2 + 8) / 2 = 3. The point -7.5 is 3 - (-7.5) = 10.5 units to the left of the fold, so it lands 10.5 units to the right of the fold: 3 + 10.5 = 13.5. (Check: -7.5 is 5.5 to the left of -2, and -2 lands on 8, so -7.5 lands 5.5 to the right of 8, at 13.5.)

Key computation (JS): `const D=x=>String(Math.round(x*10)/10);const a=-2,b=8,c=-7.5;return D(a+b-c);`

Distractors:
- B (17.5): The student takes the fold to be at 5 (half of 10), sees -7.5 is 12.5 left of 5, and lands 12.5 right of it: 17.5. | computation: `const D=x=>String(Math.round(x*10)/10);const a=-2,b=8,c=-7.5,m=(b-a)/2;return D(2*m-c);`
- C (10.5): The student computes 3 - (-7.5) = 10.5, the distance to the fold, and stops without counting it off past the fold. | computation: `const D=x=>String(Math.round(x*10)/10);const a=-2,b=8,c=-7.5,m=(a+b)/2;return D(m-c);`
- D (8.5): The student finds the gap from -7.5 to -2 (5.5) and the fold (3), then counts 5.5 past the fold: 3 + 5.5 = 8.5. | computation: `const D=x=>String(Math.round(x*10)/10);const a=-2,b=8,c=-7.5,m=(a+b)/2;return D(m+(a-c));`

---

## MB9-N5-01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On Monday morning, Priya had $46.33 in her savings account. During the week she made these changes, in this order: she took out $4.40, put in $13.50, took out $18.50, put in $9.50, and took out $6.30. What was the least amount of money, in dollars, that was in the account at any time during the week?

A. 27.83
B. 36.93
C. 35.93
D. 40.13

KEY: B (36.93)

Worked solution: Keep a running balance. 46.33 - 4.40 = 41.93; 41.93 + 13.50 = 55.43; 55.43 - 18.50 = 36.93; 36.93 + 9.50 = 46.43; 46.43 - 6.30 = 40.13. The balances during the week were 41.93, 55.43, 36.93, 46.43 and 40.13 (and 46.33 at the start). The least of these is 36.93, right after the third change. The final balance, 40.13, is not the least.

Key computation (JS): `const D=x=>(Math.round(x*100)/100).toFixed(2);const t=[-4.4,13.5,-18.5,9.5,-6.3];let b=46.33,m=b;for(const x of t){b+=x;m=Math.min(m,b)}return D(m);`

Distractors:
- A (27.83): The student picks the largest withdrawal, 18.50, and computes 46.33 - 18.50 = 27.83, skipping the changes made before it. | computation: `const D=x=>(Math.round(x*100)/100).toFixed(2);return D(46.33-18.5);`
- C (35.93): In 41.93 + 13.50 the tenths give 9 + 5 = 14; the student writes the 4 and drops the carried 1, getting 54.43 instead of 55.43, so the next balance is 54.43 - 18.50 = 35.93. | computation: `const D=x=>(Math.round(x*100)/100).toFixed(2);const b2=46.33-4.4+13.5-1;return D(b2-18.5);`
- D (40.13): The student runs all five changes and reports the final balance, 40.13. | computation: `const D=x=>(Math.round(x*100)/100).toFixed(2);return D(46.33-4.4+13.5-18.5+9.5-6.3);`

---

## MB8-N7-05

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In a magic square, the numbers in every row, every column, and both diagonals add up to the same sum. In this 3-by-3 magic square, that sum is -7 5/7. Top row: A, B, -1 4/7. Middle row: C, -2 4/7, -5 2/7. Bottom row: -3 4/7, -3 2/7, D. What number is A?

A. -6 1/7
B. -7 3/7
C. -4 2/7
D. -1 6/7

KEY: C (-4 2/7)

Worked solution: A's row, column and diagonal each have two unknowns, so find another blank first. The middle column has one unknown: B + (-2 4/7) + (-3 2/7) = -7 5/7, so B = -7 5/7 + 2 4/7 + 3 2/7 = -1 6/7. Now the top row: A + (-1 6/7) + (-1 4/7) = -7 5/7, so A = -7 5/7 + 1 6/7 + 1 4/7 = -4 2/7.

Key computation (JS): `const F=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};const S=-54,B=S-(-18)-(-23);return F(S-B-(-11),7);`

Distractors:
- A (-6 1/7): The student writes A + (-1 4/7) = -7 5/7 and gets A = -6 1/7, ignoring B. | computation: `const F=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};const S=-54;return F(S-(-11),7);`
- B (-7 3/7): The student finds B = -1 6/7 but then computes -7 5/7 + 1 6/7 - 1 4/7 = -7 3/7. | computation: `const F=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};const S=-54,B=S-(-18)-(-23);return F(S-B+(-11),7);`
- D (-1 6/7): The student solves the middle column correctly, gets -1 6/7, and stops. | computation: `const F=(n,d)=>{const s=n<0?'-':'';n=Math.abs(n);const w=Math.floor(n/d),r=n%d;return r?(w?s+w+' '+r+'/'+d:s+r+'/'+d):s+w};const S=-54;return F(S-(-18)-(-23),7);`
