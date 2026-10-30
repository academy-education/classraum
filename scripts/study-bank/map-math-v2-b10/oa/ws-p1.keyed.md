# Items for review, KEYED (5)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB10-O7-01

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: An old printer prints 50 pages per minute. A new printer prints 60% faster than the old printer. How many fewer minutes does the new printer take than the old printer to print 11,000 pages?

A. 82.5
B. 88
C. 120
D. 80

KEY: A (82.5)

Worked solution: The old printer takes 11,000 / 50 = 220 minutes. The new printer prints 60% faster: 50 x 1.6 = 80 pages per minute, so it takes 11,000 / 80 = 137.5 minutes. It takes 220 - 137.5 = 82.5 fewer minutes.

Key computation (JS): `return 11000/50-11000/(50*1.6);`

Distractors:
- B (88): 220 x (1 - 0.6) = 88. | computation: `return 11000/50*(1-0.6);`
- C (120): new rate 110; 220 - 11,000/110 = 220 - 100 = 120. | computation: `return 11000/50-11000/(50+60);`
- D (80): 50 x 1.6 = 80. | computation: `return 50*1.6;`

---

## MB10-O6-01

Area: Operations and Algebraic Thinking | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The formula F = (9/5)C + 32 changes a temperature of C degrees Celsius to F degrees Fahrenheit. A pot of water was heated from 1 degree Celsius to 50 degrees Celsius. By how many degrees Fahrenheit did the temperature of the water rise?

A. 91.8
B. 88.2
C. 81
D. 122

KEY: B (88.2)

Worked solution: At 1 degree Celsius, F = (9/5)(1) + 32 = 1.8 + 32 = 33.8. At 50 degrees Celsius, F = (9/5)(50) + 32 = 90 + 32 = 122. The rise is 122 - 33.8 = 88.2 degrees Fahrenheit. (The +32 is in both temperatures, so the rise is (9/5)(50 - 1) = (9/5)(49) = 88.2.)

Key computation (JS): `return Math.round(((9/5)*50+32-((9/5)*1+32))*10)/10;`

Distractors:
- A (91.8): (9/5)(50 + 1) = (9/5)(51) = 91.8. | computation: `return Math.round((9/5)*(50+1)*10)/10;`
- C (81): (50 - 1) + 32 = 81. | computation: `return (50-1)+32;`
- D (122): (9/5)(50) + 32 = 122. | computation: `return Math.round(((9/5)*50+32)*10)/10;`

---

## MB10-O8-01

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: Ana has $760 in a savings account and adds $6 to it each week. Ben has $240 in his account and adds $7 to it each week. Neither of them takes any money out. After how many weeks will Ana have exactly twice as much money in her account as Ben has in his?

A. 65
B. 14
C. 35
D. 20

KEY: C (35)

Worked solution: After w weeks Ana has 760 + 6w and Ben has 240 + 7w. Set 760 + 6w = 2(240 + 7w) = 480 + 14w. Then 280 = 8w, so w = 35. Check: Ana has 760 + 210 = 970 and Ben has 240 + 245 = 485, and 970 = 2 x 485.

Key computation (JS): `return (760-2*240)/(2*7-6);`

Distractors:
- A (65): (760 - 240) / 8 = 65. | computation: `return (760-240)/(2*7-6);`
- B (14): 280 / (14 + 6) = 14. | computation: `return (760-2*240)/(2*7+6);`
- D (20): 280 / 14 = 20. | computation: `return (760-2*240)/(2*7);`

---

## MB10-O8-02

Area: Operations and Algebraic Thinking | Target grade: 8 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The area A, in square centimeters, of a square with sides s centimeters long is A = s^2. As the side length grows from 14 centimeters to 49 centimeters, by how many square centimeters does the area grow, on average, for each 1-centimeter increase in side length?

A. 45
B. 157.5
C. 74.2
D. 63

KEY: D (63)

Worked solution: At s = 14 the area is 196 square centimeters, and at s = 49 it is 2,401 square centimeters. The area grows by 2,401 - 196 = 2,205 square centimeters while the side grows by 49 - 14 = 35 centimeters, so on average it grows 2,205 / 35 = 63 square centimeters per centimeter.

Key computation (JS): `return (49*49-14*14)/(49-14);`

Distractors:
- A (45): 2,205 / 49 = 45. | computation: `return (49*49-14*14)/49;`
- B (157.5): 2,205 / 14 = 157.5. | computation: `return (49*49-14*14)/14;`
- C (74.2): (2,401 + 196) / 35 = 2,597 / 35 = 74.2. | computation: `return Math.round((49*49+14*14)/(49-14)*10)/10;`

---

## MB10-O7-02

Area: Operations and Algebraic Thinking | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A tank holds a drink made only of juice and water, and 15% of the drink is juice. Ella adds 24 liters of juice and nothing else. Now 25% of the drink in the tank is juice. How many liters of drink were in the tank before Ella added the juice?

A. 180
B. 96
C. 216
D. 136

KEY: A (180)

Worked solution: Let N be the liters of drink before. The juice was 0.15N. After adding 24 liters of juice there are 0.15N + 24 liters of juice in N + 24 liters of drink, and this is 25%: 0.15N + 24 = 0.25(N + 24) = 0.25N + 6. So 0.10N = 18 and N = 180. Check: 27 + 24 = 51 liters of juice in 204 liters, and 51 / 204 = 25%.

Key computation (JS): `return Math.round((24-0.25*24)/(0.25-0.15)*100)/100;`

Distractors:
- B (96): 24 / 0.25 = 96. | computation: `return 24/0.25;`
- C (216): 240 - 24 = 216. | computation: `return Math.round((24/(0.25-0.15)-24)*100)/100;`
- D (136): 24 / 0.15 = 160; 160 - 24 = 136. | computation: `return Math.round((24/0.15-24)*100)/100;`
