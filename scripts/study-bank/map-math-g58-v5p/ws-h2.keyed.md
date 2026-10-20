# Items for review, KEYED (6)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM5P-N03

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ribbon costs $7.25 per meter. Nora buys 0.6 meter of ribbon and 2 bows that cost $1.70 each. How much does Nora spend in all, in dollars?

A. 7.75
B. 7.85
C. 8.05
D. 10.65

KEY: A (7.75)

Worked solution: The ribbon costs 0.6 x 7.25 = 4.35 dollars (6 x 725 = 4350, and the factors have 3 decimal places in all, so 4.350). The bows cost 2 x 1.70 = 3.40 dollars. Nora spends 4.35 + 3.40 = 7.75 dollars.

Key computation (JS): `return (0.6*7.25 + 2*1.70).toFixed(2);`

Distractors:
- B (7.85): The student does 0.6 x 7 = 4.20 and tacks on the 25 cents, 4.45, so the ribbon looks 10 cents dearer: 7.85. | computation: `return (0.6*7 + 0.25 + 2*1.70).toFixed(2);`
- C (8.05): The student writes 2 + 1.70 = 3.70 for the bows, then adds the ribbon: 4.35 + 3.70 = 8.05. | computation: `return (0.6*7.25 + (2 + 1.70)).toFixed(2);`
- D (10.65): The student ignores the 0.6 (or treats any part of a meter as a whole meter) and adds 7.25 + 3.40 = 10.65. | computation: `return (7.25 + 2*1.70).toFixed(2);`

---

## MM5P-N10

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A game saves 9 x 2^7 x 2^(-2) kilobytes of data. Later, 5 x 2^2 kilobytes of that data are deleted. How many kilobytes of data are left?

A. 188
B. 268
C. 238
D. 128

KEY: B (268)

Worked solution: 2^7 x 2^(-2) = 2^(7 + (-2)) = 2^5 = 32, so the first term is 9 x 32 = 288. The second term is 5 x 2^2 = 5 x 4 = 20. The value is 288 - 20 = 268.

Key computation (JS): `return String(9*Math.pow(2,7)*Math.pow(2,-2) - 5*Math.pow(2,2));`

Distractors:
- A (188): The student reads 5 x 2^2 as (5 x 2)^2 = 100, so the value becomes 288 - 100 = 188. | computation: `return String(9*Math.pow(2,7-2) - Math.pow(5*2,2));`
- C (238): The student squares the 5 instead of the 2: 5^2 x 2 = 50, so the value becomes 288 - 50 = 238. | computation: `return String(9*Math.pow(2,7-2) - Math.pow(5,2)*2);`
- D (128): After getting 9 x 2^5, the student subtracts the coefficients as though 9 x 2^5 and 5 x 2^2 were like terms: (9 - 5) x 2^5 = 4 x 32 = 128. | computation: `return String((9-5)*Math.pow(2,7+(-2)));`

---

## MM5P-N11

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Country A has 8.4 x 10^6 people living on 1.2 x 10^4 square kilometers. Country B has 4.2 x 10^6 people living on 1.4 x 10^4 square kilometers. How many more people per square kilometer does Country A have than Country B?

A. 1000
B. 520
C. 400
D. 420

KEY: C (400)

Worked solution: Country A: (8.4 x 10^6) / (1.2 x 10^4) = (8.4 / 1.2) x 10^(6 - 4) = 7 x 10^2 = 700 people per square kilometer. Country B: (4.2 x 10^6) / (1.4 x 10^4) = 3 x 10^2 = 300 people per square kilometer. Country A has 700 - 300 = 400 more people per square kilometer.

Key computation (JS): `return String(Math.round(8.4e6/1.2e4 - 4.2e6/1.4e4));`

Distractors:
- A (1000): The student finds 700 and 300 correctly but adds them, answering the total 1000 instead of how many more. | computation: `return String(Math.round(8.4e6/1.2e4 + 4.2e6/1.4e4));`
- B (520): For Country A the student does 8 / 1 = 8 and 0.4 / 0.2 = 2 and writes 8.2, so A seems to have 820 and the difference is 820 - 300 = 520. | computation: `return String(Math.round((8/1 + (0.4/0.2)/10)*1e2 - 4.2e6/1.4e4));`
- D (420): For Country B the student does 4.2 - 1.4 = 2.8, so B seems to have 280 people per square kilometer and the difference becomes 700 - 280 = 420. | computation: `return String(Math.round(8.4e6/1.2e4 - (4.2-1.4)*1e2));`

---

## MM5P-N02

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A rectangular garden is 2 1/4 meters long and 2 1/3 meters wide. Ben covers 1 2/3 square meters of the garden with stones. How many square meters of the garden are not covered with stones?

A. 3 1/12
B. 3 5/12
C. 2 11/12
D. 3 7/12

KEY: D (3 7/12)

Worked solution: Area = 2 1/4 x 2 1/3 = 9/4 x 7/3 = 63/12 = 5 3/12 square meters. Write 1 2/3 as 1 8/12. To subtract, rename 5 3/12 as 4 15/12. Then 4 15/12 - 1 8/12 = 3 7/12 square meters are not covered.

Key computation (JS): `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} return f(9*7-20,12);`

Distractors:
- A (3 1/12): Splitting 2 1/4 x 2 1/3 into parts, the student adds 2 x 2, 2 x 1/3 and 1/4 x 1/3 but forgets 1/4 x 2, so the area is 4 3/4 and the answer 3 1/12. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} return f(48+8+1-20,12);`
- B (3 5/12): To subtract 1 8/12 from 5 3/12 the student borrows 1 and adds 10 to the numerator, as in base ten: 4 13/12 - 1 8/12 = 3 5/12. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} var whole=4, part=3+10; return f((whole-1)*12+(part-8),12);`
- C (2 11/12): The student finds 2 1/4 + 2 1/3 = 4 7/12 as the 'area', then subtracts 1 2/3 to get 2 11/12. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} return f(27+28-20,12);`

---

## MM5P-N06

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: One lap of a track is 3/5 mile. Jo runs 10 1/2 miles in all, but 1/4 mile of that is on the road to and from the track. The rest is on the track. How many laps of the track does Jo run?

A. 17 1/12
B. 10 5/12
C. 16 11/12
D. 4 7/12

KEY: A (17 1/12)

Worked solution: On the track Jo runs 10 1/2 - 1/4 = 10 1/4 miles. Laps = 10 1/4 / 3/5 = 41/4 x 5/3 = 205/12 = 17 1/12 laps.

Key computation (JS): `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} var R=42-1; return f(R*5,4*3);`

Distractors:
- B (10 5/12): The student keeps the 10 and divides only 1/4 by 3/5 = 5/12, writing 10 5/12. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} return f(10*12 + 1*5, 12);`
- C (16 11/12): The student divides 10 by 3/5 to get 16 2/3 and then tacks on the leftover 1/4 mile unchanged: 16 2/3 + 1/4 = 16 11/12. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} return f(10*5*4 + 1*3, 12);`
- D (4 7/12): The student writes 10 1/4 as (10 + 1)/4 = 11/4, then divides correctly: 11/4 x 5/3 = 55/12 = 4 7/12. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} return f((10+1)*5,4*3);`

---

## MM5P-N05

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On a number line, point P is 1 1/4 units to the left of -6 1/4. Point Q is at -2 7/8. What is the distance between point P and point Q?

A. 4 7/8
B. 4 5/8
C. 5 3/8
D. 6 3/8

KEY: B (4 5/8)

Worked solution: Moving left from -6 1/4 makes the number more negative: P = -6 1/4 - 1 1/4 = -7 1/2. Both points are negative, so the distance is |-7 1/2| - |-2 7/8| = 7 1/2 - 2 7/8 = 7 4/8 - 2 7/8 = 6 12/8 - 2 7/8 = 4 5/8.

Key computation (JS): `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} var P=-(50+10), Q=-23; return f(Q-P,8);`

Distractors:
- A (4 7/8): Subtracting 2 7/8 from 7 4/8, the student borrows 1 and adds 10 to the numerator as in base ten: 6 14/8 - 2 7/8 = 4 7/8. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} var whole=7-1, part=4+10; return f((whole-2)*8+(part-7),8);`
- C (5 3/8): Seeing 4/8 - 7/8, the student does 7/8 - 4/8 = 3/8 and 7 - 2 = 5, writing 5 3/8. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} return f((7-2)*8+(7-4),8);`
- D (6 3/8): The student places Q at -2 + 7/8 = -1 1/8, so the distance becomes 7 1/2 - 1 1/8 = 6 3/8. | computation: `function g(a,b){return b?g(b,a%b):a;} function f(n,d){var k=g(n,d);n/=k;d/=k;var w=Math.floor(n/d),r=n-w*d;return r?(w?w+' '+r+'/'+d:r+'/'+d):String(w);} var P=-60, Qmis=-16+7; return f(Qmis-P,8);`
