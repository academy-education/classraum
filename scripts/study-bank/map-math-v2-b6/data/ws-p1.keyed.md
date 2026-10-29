# Items for review, KEYED (3)

The same items in the same order with the same option letters, now with the key, the worked solution and the stated wrong path behind each distractor.

---

## MB6-D7-02

Area: Statistics and Probability | Target grade: 7 | Target tier: high (harder than typical for this grade: only stronger students in the grade answer it correctly)

Question: A spinner has 10 equal sections, and 3 of them are red. A number cube has faces numbered 1 to 6. Kenji spins the spinner once and rolls the number cube once. He wins a prize if the spinner lands on red, or the cube shows 5 or 6, or both. What is the probability that Kenji wins a prize?

A. 8/15
B. 7/15
C. 19/30
D. 9/10

KEY: A (8/15)

Worked solution: The spinner is red with probability 3/10 and the cube shows 5 or 6 with probability 2/6 = 1/3. Kenji loses only if neither happens: (7/10) x (2/3) = 14/30 = 7/15. So the probability that he wins is 1 - 7/15 = 8/15.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(30-14,30);`

Distractors:
- B (7/15): (7/10) x (2/3) = 7/15, the losing probability. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(7*2,10*3);`
- C (19/30): 3/10 + 1/3 = 9/30 + 10/30 = 19/30. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(3*3+1*10,30);`
- D (9/10): 1 - (3/10)(1/3) = 1 - 1/10 = 9/10. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(30-3*1,30);`

---

## MB6-D7-03

Area: Statistics and Probability | Target grade: 7 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: A game code is made of one letter chosen at random from the 8 letters of the word COMPUTER, followed by one digit chosen at random from 0 to 9. What is the probability that the code has a vowel and an even digit? (The vowels are A, E, I, O, and U. Count 0 as an even digit.)

A. 1/4
B. 3/16
C. 3/20
D. 4/9

KEY: B (3/16)

Worked solution: COMPUTER has 8 letters and 3 of them are vowels (O, U, E), so the letter is a vowel with probability 3/8. The even digits are 0, 2, 4, 6 and 8: probability 5/10 = 1/2. The two choices are independent, so the probability of both is 3/8 x 1/2 = 3/16.

Key computation (JS): `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(3*5,8*10);`

Distractors:
- A (1/4): 1/2 x 1/2 = 1/4. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(1*1,2*2);`
- C (3/20): 3/8 x 4/10 = 12/80 = 3/20. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(3*4,8*10);`
- D (4/9): (3 + 5) / (8 + 10) = 8/18 = 4/9. | computation: `const g=(a,b)=>b?g(b,a%b):a; const fr=(n,d)=>{const k=g(Math.abs(n),Math.abs(d)); return (n/k)+'/'+(d/k)}; return fr(3+5,8+10);`

---

## MB6-D6-01

Area: Statistics and Probability | Target grade: 6 | Target tier: mid (typical for this grade: about half of students in the grade answer it correctly)

Question: The numbers of minutes that a group of students spent reading last night were 9, 12, 15, 17, 20, 23, 26, 30, 34, 41, and 53. What is the interquartile range of the data?

A. 44
B. 8
C. 19
D. 16

KEY: C (19)

Worked solution: There are 11 values, so the median is the 6th value, 23. The lower half is 9, 12, 15, 17, 20, with median Q1 = 15. The upper half is 26, 30, 34, 41, 53, with median Q3 = 34. The interquartile range is Q3 - Q1 = 34 - 15 = 19.

Key computation (JS): `const d=[9,12,15,17,20,23,26,30,34,41,53]; const lo=d.slice(0,5), hi=d.slice(6); return hi[2]-lo[2];`

Distractors:
- A (44): 53 - 9 = 44. | computation: `const d=[9,12,15,17,20,23,26,30,34,41,53]; return d[10]-d[0];`
- B (8): 23 - 15 = 8. | computation: `const d=[9,12,15,17,20,23,26,30,34,41,53]; return d[5]-d.slice(0,5)[2];`
- D (16): Lower six 9..23 give Q1 = 16, upper six 23..53 give Q3 = 32; 32 - 16 = 16. | computation: `const d=[9,12,15,17,20,23,26,30,34,41,53]; const lo=d.slice(0,6), hi=d.slice(5); return (hi[2]+hi[3])/2-(lo[2]+lo[3])/2;`
