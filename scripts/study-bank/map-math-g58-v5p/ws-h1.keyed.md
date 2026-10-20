# Items for review, KEYED (6)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM5P-N12

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A factory makes 5.13 x 10^5 grams of candy. Each piece of candy has a mass of 1.35 x 10^(-1) gram. Then 2.6 x 10^4 of the pieces are thrown away, and 4.5 x 10^3 pieces made the day before are added. How many pieces of candy are there now?

A. 3778500
B. 3769500
C. 3544500
D. 3758500

KEY: A (3778500)

Worked solution: Number of pieces made: (5.13 x 10^5) / (1.35 x 10^-1) = (5.13 / 1.35) x 10^(5 - (-1)) = 3.8 x 10^6 = 3,800,000. Throwing away 2.6 x 10^4 = 26,000 pieces leaves 3,774,000. Adding 4.5 x 10^3 = 4,500 pieces gives 3,778,500 pieces.

Key computation (JS): `return String(Math.round(5.13e5/1.35e-1 - 2.6e4 + 4.5e3));`

Distractors:
- B (3769500): The student takes both 26,000 and 4,500 away: 3,800,000 - 26,000 - 4,500 = 3,769,500. | computation: `return String(Math.round(5.13e5/1.35e-1 - 2.6e4 - 4.5e3));`
- C (3544500): The student writes 2.6 x 10^4 as 260,000, so 3,800,000 - 260,000 + 4,500 = 3,544,500. | computation: `return String(Math.round(5.13e5/1.35e-1 - 2.6e5 + 4.5e3));`
- D (3758500): The student does 5.13 - 1.35 = 3.78 with 10^6, so there seem to be 3,780,000 pieces, then 3,780,000 - 26,000 + 4,500 = 3,758,500. | computation: `return String(Math.round((5.13-1.35)*1e6 - 2.6e4 + 4.5e3));`

---

## MM5P-N08

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A diver's elevation is -8.8 meters (8.8 meters below the surface). Her elevation changes by -0.9 meter each minute for 7 minutes. Then it changes by +1.5 meters each minute for 3 minutes. How many meters below the surface is the diver now?

A. 12.2
B. 10.6
C. 19.6
D. 11.6

KEY: B (10.6)

Worked solution: First 7 minutes: 7 x (-0.9) = -6.3, so the elevation is -8.8 + (-6.3) = -15.1. Next 3 minutes: 3 x 1.5 = 4.5, so the elevation is -15.1 + 4.5 = -10.6. An elevation of -10.6 meters means the diver is 10.6 meters below the surface.

Key computation (JS): `return (-(-8.8 + 7*(-0.9) + 3*1.5)).toFixed(1);`

Distractors:
- A (12.2): The student writes the first change as -(0.9 + 7) = -7.9, so the elevation becomes -16.7 and then -16.7 + 4.5 = -12.2. | computation: `return (-(-8.8 - (0.9 + 7) + 3*1.5)).toFixed(1);`
- C (19.6): At -15.1 + 4.5 the student adds 15.1 + 4.5 = 19.6 and keeps the negative sign, as if rising took her deeper. | computation: `var e1 = -8.8 + 7*(-0.9); return (Math.abs(e1) + 3*1.5).toFixed(1);`
- D (11.6): The student writes 3 x 1.5 as 3 x 1 = 3 with the .5 tacked on, 3.5, so the rise looks smaller: -15.1 + 3.5 = -11.6. | computation: `return (-(-8.8 + 7*(-0.9) + (3*1 + 0.5))).toFixed(1);`

---

## MM5P-N09

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Mia's bank balance is -$6.40. She deposits 2/5 of her $45 paycheck into the account. How much more money, in dollars, must she deposit to bring her balance up to $60?

A. 47.60
B. 35.60
C. 48.40
D. 47.40

KEY: C (48.40)

Worked solution: 2/5 of 45 is 45 / 5 x 2 = 18 dollars. Her balance becomes -6.40 + 18 = 18.00 - 6.40 = 11.60 dollars. To reach 60 dollars she needs 60 - 11.60 = 48.40 dollars more.

Key computation (JS): `return (60 - (-6.40 + 45*2/5)).toFixed(2);`

Distractors:
- A (47.60): For 18.00 - 6.40 the student writes 4 - 0 = 4 in the tenths instead of regrouping, getting 12.40 for the balance and 60 - 12.40 = 47.60. | computation: `var a=Math.round(45*2/5*100), b=640, r=0, p=1; while(a>0||b>0){ r+=Math.abs(a%10-b%10)*p; a=Math.floor(a/10); b=Math.floor(b/10); p*=10; } return (60 - r/100).toFixed(2);`
- B (35.60): The student drops the negative sign, so the balance after the deposit is 6.40 + 18 = 24.40 and she seems to need 60 - 24.40 = 35.60. | computation: `return (60 - (6.40 + 45*2/5)).toFixed(2);`
- D (47.40): For 18.00 - 6.40 the student borrows to make 10 tenths but leaves the 8 ones as 8, getting 12.60 for the balance and 60 - 12.60 = 47.40. | computation: `var a=Math.round(45*2/5*100), b=640, r=0, p=1; while(a>0||b>0){ var t=a%10, u=b%10; r+=(t>=u? t-u : t+10-u)*p; a=Math.floor(a/10); b=Math.floor(b/10); p*=10; } return (60 - r/100).toFixed(2);`

---

## MM5P-N01

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Maya has $50.00. She buys 3 notebooks that cost $4.45 each and 1 pen that costs $2.62. How much money, in dollars, does Maya have left?

A. 37.69
B. 34.93
C. 35.13
D. 34.03

KEY: D (34.03)

Worked solution: The 3 notebooks cost 3 x 4.45 = 13.35 dollars. Together with the pen, Maya spends 13.35 + 2.62 = 15.97 dollars. She has 50.00 - 15.97 = 34.03 dollars left.

Key computation (JS): `return (50 - 3*4.45 - 2.62).toFixed(2);`

Distractors:
- A (37.69): The student multiplies the pen price by 3 and adds one notebook: 3 x 2.62 + 4.45 = 12.31, then 50.00 - 12.31 = 37.69. | computation: `return (50 - (3*2.62 + 4.45)).toFixed(2);`
- B (34.93): The student writes 3 x 4.45 as 3 x 4 = 12 with the .45 tacked on, 12.45, so the notebooks look cheaper and more money seems left. | computation: `return (50 - (3*4 + 0.45) - 2.62).toFixed(2);`
- C (35.13): Subtracting 15.97 from 50.00, the student borrows and makes every zero a 10 instead of 9, 9, 10, so the tenths and ones each come out one too big: 35.13. | computation: `var b=Math.round((3*4.45+2.62)*100), bd=[], i; for(i=0;i<4;i++){bd.push(b%10); b=Math.floor(b/10);} var top=[10,10,10,4]; var r=0, p=1; for(i=0;i<4;i++){ r+=(top[i]-bd[i])*p; p*=10; } return (r/100).toFixed(2);`

---

## MM5P-N04

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: At a deli, 0.75 pound of cheddar cheese costs $4.80. Swiss cheese costs $0.90 less per pound than cheddar cheese. What is the price of 1 pound of Swiss cheese, in dollars?

A. 5.50
B. 2.70
C. 5.40
D. 5.10

KEY: A (5.50)

Worked solution: Cheddar costs 4.80 / 0.75 = 6.40 dollars per pound (480 / 75 = 6.4). Swiss costs 0.90 less: 6.40 - 0.90 = 5.50 dollars per pound.

Key computation (JS): `return (4.80/0.75 - 0.90).toFixed(2);`

Distractors:
- B (2.70): The student computes 4.80 x 0.75 = 3.60 as the price per pound, then subtracts 0.90 to get 2.70. | computation: `return (4.80*0.75 - 0.90).toFixed(2);`
- C (5.40): Dividing 480 by 75 the student gets 6 remainder 30 and writes 6.30, then subtracts 0.90: 5.40. | computation: `var q = Math.floor(480/75), r = 480 - 75*q; return (q + r/100 - 0.90).toFixed(2);`
- D (5.10): The student adds a quarter of 4.80 (1.20) to get 6.00 for a pound, a percent of the wrong base, then subtracts 0.90: 5.10. | computation: `return (4.80*1.25 - 0.90).toFixed(2);`

---

## MM5P-N07

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Kai's bank account balance is -$23.46. The bank charges him an $8.75 fee. Then a $2.60 refund is added to his account. How much money, in dollars, does Kai owe the bank now?

A. 30.41
B. 29.61
C. 30.61
D. 34.81

KEY: B (29.61)

Worked solution: The fee makes the balance -23.46 - 8.75 = -32.21. The refund adds 2.60: -32.21 + 2.60 = -29.61. A balance of -29.61 dollars means Kai owes the bank 29.61 dollars.

Key computation (JS): `return (-(-23.46 - 8.75 + 2.60)).toFixed(2);`

Distractors:
- A (30.41): For 32.21 - 2.60 the student writes 6 - 2 = 4 in the tenths instead of regrouping, getting 30.41. | computation: `var a=Math.round((23.46+8.75)*100), b=260, r=0, p=1; while(a>0||b>0){ r+=Math.abs(a%10-b%10)*p; a=Math.floor(a/10); b=Math.floor(b/10); p*=10; } return (r/100).toFixed(2);`
- C (30.61): For 32.21 - 2.60 the student borrows to make 12 tenths but leaves the ones digit at 2, so the ones place comes out one too big: 30.61. | computation: `var a=Math.round((23.46+8.75)*100), b=260, r=0, p=1; while(a>0||b>0){ var t=a%10, u=b%10; r+=(t>=u? t-u : t+10-u)*p; a=Math.floor(a/10); b=Math.floor(b/10); p*=10; } return (r/100).toFixed(2);`
- D (34.81): The student thinks adding 2.60 to -32.21 makes it -34.81 (adds the sizes and keeps the negative sign), so Kai seems to owe 34.81. | computation: `return (-(-23.46 - 8.75 - 2.60)).toFixed(2);`
