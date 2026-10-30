# Items for review, KEYED (5)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB11-N7-01

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A calculator has a key that multiplies the number on the screen by -3 and then subtracts 3. Mia enters -1.25 and then presses the key two times. What number is on the screen now?

A. -5.25
B. -14.25
C. 12.75
D. 0.75

KEY: A (-5.25)

Worked solution: Press 1: -1.25 x (-3) - 3 = 0.75. Press 2: 0.75 x (-3) - 3 = -5.25. The screen shows -5.25.

Key computation (JS): `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};let x=(-1.25);for(let i=0;i<2;i++)x=(-3)*x+(-3);return FM(x);`

Distractors:
- B (-14.25): The student computes -1.25 x (-3)^2 and then subtracts 3 once. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM(9*(-1.25)+(-3));`
- C (12.75): The student applies the rule 3 times. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};let x=(-1.25);for(let i=0;i<3;i++)x=(-3)*x+(-3);return FM(x);`
- D (0.75): The student applies the rule 1 times. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};let x=(-1.25);for(let i=0;i<1;i++)x=(-3)*x+(-3);return FM(x);`

---

## MB11-N7-02

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: In a magic square, the numbers in every row, every column, and both diagonals add up to the same sum. In this 3-by-3 magic square, that sum is -2 4/7. Top row: A, B, 1/7. Middle row: C, -6/7, -3 3/7. Bottom row: -1 6/7, -1 3/7, D. What number is A?

A. -5/7
B. -2 3/7
C. -2/7
D. -2 1/7

KEY: B (-2 3/7)

Worked solution: The top row has two blanks, so first find B from the middle column: B = -2 4/7 - (-6/7) - (-1 3/7) = -2/7. Then the top row gives A = -2 4/7 - (-2/7) - (1/7) = -2 3/7.

Key computation (JS): `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const S=-18/7,ctr=-6/7,r32=-10/7,r13=1/7;const B=S-ctr-r32;return FM(S-B-r13);`

Distractors:
- A (-5/7): -2 4/7 - (-1 6/7). | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM(-18/7-(-13/7));`
- C (-2/7): B = -2 4/7 - (-6/7) - (-1 3/7) = -2/7. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM(-18/7-(-6/7)-(-10/7));`
- D (-2 1/7): -2 4/7 - (-2/7) + (1/7). | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM(-18/7-(-2/7)+(1/7));`

---

## MB11-N7-03

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Put a plus sign (+) or a minus sign (-) in each box so that the value of 4 1/11 [ ] 3 3/11 [ ] 3 5/11 is as close to 0 as possible. What is that value?

A. -2 3/11
B. -3 4/11
C. -2 7/11
D. -1 2/11

KEY: C (-2 7/11)

Worked solution: There are four choices: 4 1/11 + 3 3/11 + 3 5/11 = 10 9/11; 4 1/11 + 3 3/11 - 3 5/11 = 3 10/11; 4 1/11 - 3 3/11 + 3 5/11 = 4 3/11; 4 1/11 - 3 3/11 - 3 5/11 = -2 7/11. The one closest to 0 is -2 7/11.

Key computation (JS): `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const a=45/11,b=36/11,c=38/11;const v=[a+b+c,a+b-c,a-b+c,a-b-c];let k=v[0];for(const t of v)if(Math.abs(t)<Math.abs(k))k=t;return FM(k);`

Distractors:
- A (-2 3/11): The student uses the signs - then - but subtracts the fraction parts backwards when regrouping is needed, getting -2 3/11. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const W=v=>Math.floor(v+1e-9);const S=(A,B,sl)=>{if(!sl)return A-B;const g=A>=B?1:-1,X=A>=B?A:B,Y=A>=B?B:A,fx=X-W(X),fy=Y-W(Y);return g*(fx+1e-9<fy?(W(X)-W(Y))+(fy-fx):X-Y)};const a=45/11,b=36/11,c=38/11;const s1=S(a,b,true);return FM(S(s1,c,true));`
- B (-3 4/11): The student gets the first step right but subtracts the fraction parts backwards in the second step, getting -3 4/11. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const W=v=>Math.floor(v+1e-9);const S=(A,B,sl)=>{if(!sl)return A-B;const g=A>=B?1:-1,X=A>=B?A:B,Y=A>=B?B:A,fx=X-W(X),fy=Y-W(Y);return g*(fx+1e-9<fy?(W(X)-W(Y))+(fy-fx):X-Y)};const a=45/11,b=36/11,c=38/11;const s1=S(a,b,false);return FM(S(s1,c,true));`
- D (-1 2/11): The student combines the whole numbers with the chosen signs and then adds all three fraction parts, getting -1 2/11. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const W=v=>Math.floor(v+1e-9),F=v=>v-W(v);const a=45/11,b=36/11,c=38/11;return FM(W(a)-W(b)-W(c)+F(a)+F(b)+F(c));`

---

## MB11-N6-01

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A rectangle on the coordinate plane has vertices at (-1.25, 0.5), (2.25, 0.5), (2.25, -8.5), and (-1.25, -8.5). An ant starts at the corner (2.25, -8.5) and moves clockwise along the sides of the rectangle. After it has moved a total of 9.15 units, what is the y-coordinate of its location?

A. -8.35
B. -2.05
C. -5.15
D. -2.85

KEY: D (-2.85)

Worked solution: Moving clockwise from (2.25, -8.5), it first goes left along the bottom side to (-1.25, -8.5). That side is 2.25 - (-1.25) = 3.5 units long. It has 9.15 - 3.5 = 5.65 units left, so it turns the corner and moves 5.65 units up the left side, from y = -8.5 to y = -2.85. (The left side goes up to 0.5, so it is still on that side.)

Key computation (JS): `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const xl=(-1.25),xr=2.25,yb=(-8.5),d=9.15;return FM(yb+(d-(xr-xl)));`

Distractors:
- A (-8.35): The student subtracts the left side's 9 from 9.15, leaving 0.15. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM((-8.5)+(9.15-(0.5-((-8.5)))));`
- B (-2.05): The student gets 6.45 for 9.15 - 3.5, so moves 6.45 up from -8.5. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const bug=(a,b)=>{const A=String(Math.round(a*100)).padStart(6,'0'),B=String(Math.round(b*100)).padStart(6,'0');let r='';for(let k=0;k<6;k++)r+=Math.abs(+A[k]-+B[k]);return +r/100};return FM((-8.5)+bug(9.15,2.25-(-1.25)));`
- C (-5.15): The student finds the 5.65 units left correctly but counts them down from (-1.25, 0.5). | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM(0.5-(9.15-(2.25-(-1.25))));`

---

## MB11-N5-01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On Monday morning, Jun had $46.33 in a savings account. During the week Jun made these changes, in this order: took out $8.80, put in $9.60, took out $13.80, put in $11.20, and took out $7.40. What was the least amount of money, in dollars, that was in the account at any time during the week?

A. 33.33
B. 37.13
C. 32.53
D. 34.73

KEY: A (33.33)

Worked solution: Keep a running balance: 37.53, 47.13, 33.33, 44.53, 37.13 (and 46.33 at the start). The least of these is 33.33, right after the third change. The final balance, 37.13, is not the least.

Key computation (JS): `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const t=[-8.8,9.6,-13.8,11.2,-7.4];let b=46.33,m=b;for(const x of t){b+=x;m=Math.min(m,b)}return FM(Math.round(m*100)/100);`

Distractors:
- B (37.13): The student does all five changes and reports the end result. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM(46.33-8.8+9.6-13.8+11.2-7.4);`
- C (32.53): 46.33 - 13.80. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};return FM(46.33-13.8);`
- D (34.73): 47.13 - 13.80 done column by column, smaller digit from larger. | computation: `const FM=v=>{for(const p of [0,1,2,3]){const m=Math.round(v*10**p);if(Math.abs(m/10**p-v)<1e-9)return String(+(m/10**p).toFixed(p))}for(let d=2;d<=200;d++){const n=Math.round(v*d);if(Math.abs(n/d-v)<1e-9){const g=(a,b)=>b?g(b,a%b):a;const k=g(Math.abs(n),d),a=n/k,b=d/k,w=Math.trunc(Math.abs(a)/b),r=Math.abs(a)%b,s=a<0?'-':'';return w?s+w+' '+r+'/'+b:s+r+'/'+b}}return String(v)};const C=(A,B)=>{let r=0,k=1;A=Math.round(A*100);B=Math.round(B*100);while(A>0||B>0){r+=Math.abs(A%10-B%10)*k;A=Math.floor(A/10);B=Math.floor(B/10);k*=10}return r/100};return FM(C(47.13,13.8));`
