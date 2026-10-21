# Items for review, KEYED (10)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MM5-N03

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: Look at these numbers: 4.643, 4.645, 4.648, 4.65, 4.651, 4.653, 4.655, 4.657, 4.704, 4.741, 4.752. How many of them round to 4.7 when they are rounded to the nearest tenth?

A. 7
B. 1
C. 9
D. 3

KEY: A (7)

Worked solution: To round to the nearest tenth, look at the hundredths digit. 4.643, 4.645 and 4.648 have 4 hundredths, so they round down to 4.6. 4.65, 4.651, 4.653, 4.655 and 4.657 have 5 hundredths, so they round up to 4.7. 4.704 and 4.741 have 0 and 4 hundredths, so they round down to 4.7. 4.752 has 5 hundredths, so it rounds up to 4.8. Seven numbers round to 4.7: 4.65, 4.651, 4.653, 4.655, 4.657, 4.704 and 4.741.

Key computation (JS): `const L=[4.643,4.645,4.648,4.65,4.651,4.653,4.655,4.657,4.704,4.741,4.752]; return String(L.filter(x=>Math.abs(Math.round(x*10+1e-9)/10-4.7)<1e-9).length);`

Distractors:
- B (1): the student rounds each number to two decimal places and counts only those that become 4.70; only 4.704 does | computation: `const L=[4.643,4.645,4.648,4.65,4.651,4.653,4.655,4.657,4.704,4.741,4.752]; return String(L.filter(x=>Math.abs(Math.round(x*100+1e-9)/100-4.7)<1e-9).length);`
- C (9): the student rounds 4.645 to 4.65 and then to 4.7, and 4.648 the same way, so both are counted along with the seven correct ones, giving 9 | computation: `const S=['4.643','4.645','4.648','4.65','4.651','4.653','4.655','4.657','4.704','4.741','4.752']; const ch=s=>{let d=s.split('.')[1].length; let x=parseFloat(s); while(d>1){x=Math.round(x*Math.pow(10,d-1)+1e-9)/Math.pow(10,d-1); d--;} return x;}; return String(S.filter(s=>Math.abs(ch(s)-4.7)<1e-9).length);`
- D (3): the student cuts each number off after the tenths digit, so only numbers that start with 4.7 count: 4.704, 4.741 and 4.752 | computation: `const L=[4.643,4.645,4.648,4.65,4.651,4.653,4.655,4.657,4.704,4.741,4.752]; return String(L.filter(x=>Math.abs(Math.floor(x*10+1e-9)/10-4.7)<1e-9).length);`

---

## MM5-N26

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The temperature inside a lab freezer changes by -2.35 degrees Celsius every hour. Right now the temperature inside the freezer is -30.6 degrees Celsius. What was the temperature inside the freezer 7 hours ago, in degrees Celsius?

A. -16.15
B. -14.15
C. -21.25
D. -16.25

KEY: B (-14.15)

Worked solution: Each hour the temperature goes down 2.35 degrees. Going back 7 hours undoes 7 of those changes, so the temperature 7 hours ago was higher by 7 x 2.35 = 16.45 degrees. -30.6 + 16.45 = -14.15. Check: -14.15 + 7(-2.35) = -14.15 - 16.45 = -30.6.

Key computation (JS): `return (-30.6 - 7 * (-2.35)).toFixed(2);`

Distractors:
- A (-16.15): Working 7 x 2.35 digit by digit, 7 x 3 + 3 = 24 writes 4 but the 2 is not carried into 7 x 2, giving 14.45; then -30.6 + 14.45 = -16.15. | computation: `return (-30.6 + 14.45).toFixed(2);`
- C (-21.25): The student combines 7 and 2.35 by adding, gets a change of 9.35, and finds -30.6 + 9.35 = -21.25. | computation: `return (-30.6 + (7 + 2.35)).toFixed(2);`
- D (-16.25): The student finds 7 x 2.35 as 7 x 2 = 14 and tacks on the .35, getting 14.35 instead of 16.45; then -30.6 + 14.35 = -16.25. | computation: `return (-30.6 + (7 * 2 + 0.35)).toFixed(2);`

---

## MM5-N02

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: A ribbon is 16 feet long. Lena uses 5/12 of the ribbon to make a bow. How many feet of ribbon does she use?

A. 5 2/3
B. 7 1/3
C. 6 2/3
D. 6 1/3

KEY: C (6 2/3)

Worked solution: Find 5/12 of 16 by multiplying: 5/12 x 16 = 80/12. 80 divided by 12 is 6 with 8 left over, so 80/12 = 6 8/12 = 6 2/3. Lena uses 6 2/3 feet of ribbon.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(5*16,12);`

Distractors:
- A (5 2/3): the student finds 1/12 of 16 as 1 4/12, multiplies by 5 to get 5 20/12, then writes 20/12 as 8/12 and loses the whole it contains, getting 5 8/12 = 5 2/3 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; const q=Math.floor(16/12), r=16%12; return f(q*5*12+((r*5)%12),12);`
- B (7 1/3): dividing 80 by 12, the student picks 7 (12 x 7 = 84) and writes the 4 between 84 and 80 as the remainder, getting 7 4/12 = 7 1/3 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; const N=5*16; const q=Math.ceil(N/12); return f(q*12+(q*12-N),12);`
- D (6 1/3): the student finds 1/12 of 16 = 1 1/3 and then adds 5 instead of taking 5 of those twelfths, getting 6 1/3 | computation: `const g=(a,b)=>b?g(b,a%b):a; const f=(n,d)=>{const k=g(n,d);n/=k;d/=k;const w=Math.floor(n/d),r=n%d;return (w?w+(r?' ':''):'')+(r?r+'/'+d:'');}; return f(16+5*12,12);`

---

## MM5-N37

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: On a quiz, Jun must evaluate -4^2 + √(225 + 400), using the rules for exponents, square roots and the order of operations. What number should Jun get?

A. 19
B. 41
C. 17
D. 9

KEY: D (9)

Worked solution: Work the power first: 4^2 = 16, and the minus sign in front makes it -16 (the exponent applies only to the 4). Inside the square root, add first: 225 + 400 = 625, and √625 = 25 because 25 x 25 = 625. So -16 + 25 = 9.

Key computation (JS): `return String(-(Math.pow(4, 2)) + Math.sqrt(225 + 400));`

Distractors:
- A (19): The student writes √(225 + 400) as √225 + √400 = 15 + 20 = 35, so the expression becomes -16 + 35 = 19. | computation: `return String(-(Math.pow(4, 2)) + Math.sqrt(225) + Math.sqrt(400));`
- B (41): The student thinks the exponent applies to -4, so -4^2 = 16, and 16 + 25 = 41. | computation: `return String(Math.pow(-4, 2) + Math.sqrt(225 + 400));`
- C (17): The student reads 4^2 as 4 x 2 = 8, so the expression becomes -8 + 25 = 17. | computation: `return String(-(4 * 2) + Math.sqrt(225 + 400));`

---

## MM5-N22

Area: Real and Complex Number Systems | Target grade: 6 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: At a store, 2.5 kilograms of white rice cost $9.50. Brown rice costs $0.40 more per kilogram than white rice. Mr. Lee buys the 2.5 kilograms of white rice and 4.5 kilograms of brown rice. How much does he pay in all, in dollars?

A. 28.40
B. 27.60
C. 29.40
D. 27.00

KEY: A (28.40)

Worked solution: White rice costs 9.50 / 2.5 = 3.80 dollars per kilogram. Brown rice costs 3.80 + 0.40 = 4.20 dollars per kilogram. The brown rice costs 4.5 x 4.20 = 18.90 dollars. In all he pays 9.50 + 18.90 = 28.40 dollars.

Key computation (JS): `const w=9.50/2.5; const b=(w+0.40)*4.5; return (9.50+b).toFixed(2);`

Distractors:
- B (27.60): the student prices the brown rice at 3.80 per kilogram and then adds the extra 0.40 for 2.5 kilograms, the white-rice weight, instead of 4.5: 9.50 + 17.10 + 1.00 = 27.60 | computation: `const w=9.50/2.5; return (9.50+w*4.5+0.40*2.5).toFixed(2);`
- C (29.40): the student finds the brown-rice price of 4.20 per kilogram and multiplies it by all 7 kilograms, so the white rice is charged the higher price too: 7 x 4.20 = 29.40 | computation: `const w=9.50/2.5; return ((w+0.40)*(2.5+4.5)).toFixed(2);`
- D (27.00): the student prices 4.5 kilograms at the white-rice price, 4.5 x 3.80 = 17.10, and then adds $0.40 one time instead of $0.40 for each kilogram: 9.50 + 17.10 + 0.40 = 27.00 | computation: `const w=9.50/2.5; return (9.50+w*4.5+0.40).toFixed(2);`

---

## MM5-N05

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A school gym has 28 rows of bleacher seats with 35 seats in each row. At a basketball game, 186 of the seats were empty and every other seat had one person in it. How many people were sitting in the seats?

A. 694
B. 794
C. 864
D. 804

KEY: B (794)

Worked solution: First find the number of seats: 28 x 35 = 28 x 30 + 28 x 5 = 840 + 140 = 980. Then take away the empty seats: 980 - 186 = 794. There were 794 people in the seats.

Key computation (JS): `return String(28*35-186);`

Distractors:
- A (694): the student multiplies 28 by the 30 but then only the 8 by the 5 (840 + 40 = 880), leaving out 20 x 5, and gets 880 - 186 = 694 | computation: `return String(28*30 + 8*5 - 186);`
- C (864): the student rounds 28 rows to 30 to make the multiplying easier, finds 30 x 35 = 1,050 and never takes the extra 2 rows back off: 1,050 - 186 = 864 | computation: `return String(30*35 - 186);`
- D (804): in 980 - 186 the student borrows a ten for the ones (10 - 6 = 4) but leaves the tens digit at 8, so 8 - 8 = 0 and the answer is 804 | computation: `return String(800 + 0 + 4);`

---

## MM5-N06

Area: Real and Complex Number Systems | Target grade: 5 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: Leo buys a book for $6.24, a cap for $2.63, a snack for $3.95, and a toy for $1.61. To estimate the total, he rounds each price to the nearest ten cents and then adds the rounded prices. What estimate does he get, in dollars?

A. 14.70
B. 14.30
C. 14.40
D. 14.60

KEY: C (14.40)

Worked solution: Round each price to the nearest ten cents by looking at the hundredths digit. $6.24 rounds down to $6.20 (4 is less than 5). $2.63 rounds down to $2.60 (3 is less than 5). $3.95 rounds up: 9 tenths and 1 more tenth make 10 tenths, which is 1 whole dollar, so $3.95 rounds to $4.00. $1.61 rounds down to $1.60. Add: 6.20 + 2.60 + 4.00 + 1.60 = 14.40. His estimate is $14.40.

Key computation (JS): `const r=c=>Math.floor((c+5)/10)*10; const P=[624,263,395,161]; return (P.reduce((a,c)=>a+r(c),0)/100).toFixed(2);`

Distractors:
- A (14.70): the student rounds every price up to the next ten cents (6.30, 2.70, 4.00, 1.70), including the three that should go down, and gets 14.70 | computation: `const P=[624,263,395,161]; return (P.reduce((a,c)=>a+Math.ceil(c/10)*10,0)/100).toFixed(2);`
- B (14.30): the student thinks a 5 is exactly halfway and should round down, so $3.95 becomes $3.90 and the total is 6.20 + 2.60 + 3.90 + 1.60 = 14.30 | computation: `const P=[624,263,395,161]; const r=c=>(c%10===5)?c-5:Math.floor((c+5)/10)*10; return (P.reduce((a,c)=>a+r(c),0)/100).toFixed(2);`
- D (14.60): the student looks at the tenths digit to decide: 6.24 has 2 tenths so it goes down to 6.20, but 2.63 and 1.61 have 6 tenths so they go up to 2.70 and 1.70, and 3.95 goes up to 4.00, giving 14.60 | computation: `const P=[624,263,395,161]; const r=c=>{const t=Math.floor(c/10)%10; return t>=5?Math.floor(c/10)*10+10:Math.floor(c/10)*10;}; return (P.reduce((a,c)=>a+r(c),0)/100).toFixed(2);`

---

## MM5-N33

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A club's bank account balance is -$36.40, which means the club owes the bank $36.40. First, the bank adds a service charge equal to 1/4 of the amount the club owes. Then, from week 3 through week 9, the club pays a fee of $3.50 out of the account each week. The club also deposits $27.70 into the account. What is the account balance after all of these changes, in dollars?

A. -41.50
B. -41.30
C. -24.10
D. -42.30

KEY: D (-42.30)

Worked solution: The service charge is 1/4 of $36.40, which is $9.10, and it is added to what the club owes: -36.40 - 9.10 = -45.50. Weeks 3 through 9 are 7 weeks (3, 4, 5, 6, 7, 8, 9), so the fees are 7 × 3.50 = $24.50: -45.50 - 24.50 = -70.00. The deposit raises the balance: -70.00 + 27.70 = -42.30. The balance is -$42.30.

Key computation (JS): `const after = -36.40 * 5 / 4; const fees = 7 * 3.50; return (after - fees + 27.70).toFixed(2);`

Distractors:
- A (-41.50): The student works out -36.40 - 24.50 + 27.70 = -33.20 first and then adds 1/4 of 33.20 to what is owed: -33.20 - 8.30 = -41.50. | computation: `const base = -36.40 - 7 * 3.50 + 27.70; return (base * 5 / 4).toFixed(2);`
- B (-41.30): The student counts the 7 weeks and handles the charge correctly but slips in the multiplication, 7 x 3.50 = 23.50, so -45.50 - 23.50 + 27.70 = -41.30. | computation: `return (-36.40 * 5 / 4 - 23.50 + 27.70).toFixed(2);`
- C (-24.10): The student adds 9.10 to the balance as if it were money coming in: -36.40 + 9.10 - 24.50 + 27.70 = -24.10. | computation: `return (-36.40 + 36.40 / 4 - 7 * 3.50 + 27.70).toFixed(2);`

---

## MM5-N23

Area: Real and Complex Number Systems | Target grade: 7 | Target tier: low (easier than typical for this grade: most students in the grade answer it correctly)

Question: In a card game, a player's score is the total of the points on all the cards in her pile. Rosa's score is -90 points. She adds a card worth 15 points to her pile. Then she must give away one card from her pile, and the card she gives away is worth -40 points. What is Rosa's score now?

A. -35
B. -45
C. -115
D. -65

KEY: A (-35)

Worked solution: Adding the 15-point card: -90 + 15 = -75. Giving away a card worth -40 subtracts -40 from the total: -75 - (-40) = -75 + 40 = -35. Rosa's score is -35 points.

Key computation (JS): `return String(-90 + 15 - (-40));`

Distractors:
- B (-45): Working 90 - 15 in columns, the student writes 10 - 5 = 5 but does not reduce the 9, getting 85, so -90 + 15 becomes -85; then -85 + 40 = -45. | computation: `return String(-85 + 40);`
- C (-115): The student thinks giving away the -40 card costs 40 points and computes -75 - 40 = -115. | computation: `return String(-90 + 15 - 40);`
- D (-65): The student combines -90 and 15 as -105 (adding the sizes and keeping the minus sign), then handles the -40 card correctly: -105 + 40 = -65. | computation: `return String(-90 - 15 + 40);`

---

## MM5-N38

Area: Real and Complex Number Systems | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The populations of three towns are shown in scientific notation. Town A: 3.284 x 10^5 people. Town B: 1.9 x 10^4 people. Town C: 1.68 x 10^5 people. What is the mean population of the three towns?

A. 168000
B. 171800
C. 228800
D. 166100

KEY: B (171800)

Worked solution: Write each population in standard form: 3.284 x 10^5 = 328,400; 1.9 x 10^4 = 19,000; 1.68 x 10^5 = 168,000. Add them: 328,400 + 19,000 + 168,000 = 515,400. Divide by the number of towns: 515,400 / 3 = 171,800. The mean population is 171,800 people.

Key computation (JS): `return String((328400 + 19000 + 168000) / 3);`

Distractors:
- A (168000): The student puts the three populations in order and takes the middle one, 168,000, instead of adding and dividing. | computation: `var v = [328400, 19000, 168000].sort(function(a, b) { return a - b; }); return String(v[1]);`
- C (228800): The student adds 3.284 + 1.9 + 1.68 = 6.864, divides by 3 to get 2.288 and attaches 10^5, treating 1.9 x 10^4 as if it were 1.9 x 10^5. | computation: `return String(Math.round((3.284 + 1.9 + 1.68) / 3 * 100000));`
- D (166100): The student writes 1.9 x 10^4 as 1,900, a four-digit number, instead of 19,000, then finds (328,400 + 1,900 + 168,000) / 3 = 166,100. | computation: `return String((328400 + 1900 + 168000) / 3);`
