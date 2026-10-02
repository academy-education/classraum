# B8 held items — proposed two-distractor fixes (NOT APPLIED)

2026-10-02. The owner decides; nothing here has been written to the bank.

The 26 held = 22 printed `HELD` by `node scripts/study-bank/b8/check-repairs.mjs`
plus the 4 part-3 entries it prints as `FAIL` (`new = key op printed(2)`), which
were never applied and are still live with their ±pair.

Every PROPOSED/WEAK set below passes a two-replacement version of
check-repairs.mjs's rules, run against the live option sets: no ±pair
anywhere, no new value that is a printed number or key ± × ÷ a printed number,
no new value that is a sum/difference/product/ratio/AM/GM/HM of two other
options, the key not such a combination of two distractors (including
pre-existing ones), format class shared, the key not the unique
odd/even/negative/non-integer/round-ten value. The negated-key distractor is
always one of the two replaced.

Labels: **PROPOSED** = both new values have a nameable error path.
**WEAK** = passes the rules but one value has no honest error path — a
placeholder, not a distractor; prefer re-authoring. **RE-AUTHOR** = no legal
two-value edit with honest paths was found; the stem constants need changing.

Why so many are weak: the rule "new ≠ key op printed" bans almost every natural
slip, because natural slips usually ARE key ± a stem number. That is the tell
the rule exists for, so the fix is at the stem, not the options.

| id | key | live set | proposed set (replaced → new) | label | error paths |
|---|---|---|---|---|---|
| 6ea409c5 | −1 | −6, 6, −1, 1 | −12, 6, −1, −5 (−6→−12, 1→−5) | WEAK | −12: quadratic formula on x²−5x−6 with b's sign flipped and ÷2 dropped (−5−7). −5: reads the x-coefficient as a root (weak). Also: the stem asks for the NEGATIVE solution, so 6 (and live 1) are dead options; a re-author should make all four negative. |
| e92b3c49 | 2 | −2, 2, 3, 4 | −4, 2, 3, −5 (−2→−4, 4→−5) | WEAK | −4: treats x²−9 as (x−3)², so x−3 = 2x+1. −5: no honest path. Live set is also a FULL derivational hub (check-math-hub: key 2 → −2, 3, 4). |
| a387ac1b | 5 | 1, −5, 5, 2 | 1, −2, 5, 8 (−5→−2, 2→8) | WEAK | −2: sets (x+1)/(x−1) = 9/27 inverted. 8: no honest path, and it removes the strong "forgot to distribute" 2. Prefer re-author. |
| 1fca5f69 | −13 | 13, −5, 3, −13 | −3, −5, −7, −13 (13→−3, 3→−7) | WEAK | −3: x = 5 − 8 (moves −5 with the wrong sign). −7: no honest path. |
| cd086230 | −3 | −3, 3, −9, 9 | — | RE-AUTHOR | Set is a pure sign-and-scale family of 3; every honest slip (−27, −1, −6, 9) is key op a printed number. Change the second equation's constants. |
| c0ede046 | −2 | 2, −2, 8, −8 | −1, −2, 8, 11 (2→−1, −8→11) | WEAK | −1: a/4 = −3/12 (pairs the y-coefficient with the constant). 11: no honest path. |
| 09032fe9 | −12 | −12, 12, −4/3, 4/3 | — | RE-AUTHOR | Natural slips (−36, −27/4, 3/4, −8/7) either hit key op printed or leave −12 the unique even/integer value. |
| 7e51987d | 4 | 12, 4, −4, 1 | — | RE-AUTHOR | All stem numbers (2, 3, 6, 9, 18) are small multiples of each other; every slip lands on key op printed. |
| 078d81e4 | −4 | −8, −4, 4, 8 | — | RE-AUTHOR | x² = 16 makes the extraneous root the exact negation of the key by construction; the ±pair IS the item. Change the right side so the roots are not ±, e.g. (3x+4)/(x−4): roots 4 (extraneous) and −1. |
| 3d7a3f09 | 10 | 10, −2, 4, −10 | — | RE-AUTHOR | Only legal pairs are (−4,0), (0,1), (0,11); none has an error path. |
| b78dd8c2 | −5/3 | −3/4, 5/3, −5/3, 3/4 | −3/4, 5/2, −5/3, 2/3 (5/3→5/2, 3/4→2/3) | PROPOSED | 5/2: uses ℓ's slope −3/4 for m (1 + 3/2). 2/3: point-slope with the point's coordinates swapped (y−2 = (4/3)(x−1) at x=0). |
| 57fafa53 | −2 | −2, 2, 5, −5 | — | RE-AUTHOR | Legal space is only (≤−11, 6). Sum 5 and product −2 with sign variants is the whole set; change the numerators so sum/product are not sign-symmetric. |
| a0cd79de | 8 | −8, −22, 8, 22 | −15, −22, 8, −4 (−8→−15, 22→−4) | PROPOSED | −4: expands 5(2x−3) as 10x−3, so −3 + k = −7. −15: reports the left side's constant term (weaker). |
| 89ce1b79 | −14 | −14, −7, 7, 14 | −14, −7, −20, −10 (7→−20, 14→−10) | WEAK | −20: sets −b/2 equal to the product 10. −10: sets −b equal to the product (weak). |
| 8a9f227f | −15 | 15, −15, −5, 5 | — | RE-AUTHOR | The natural product slip (−b/3 = 4 → −12) is key + 3; no legal pair with paths. |
| e4c2abe3 | 8/3 | 5, 8/3, −7/3, −8/3 | 5, 8/3, −2, 38/3 (−7/3→−2, −8/3→38/3) | PROPOSED | −2: forgets to divide by 3 in the second case (5 + (−7)). 38/3: forgets to divide by 3 in the first case (15 − 7/3). |
| bd17e673 | −7 | 2, −7, 7, −2 | 2, −7, −6, 5 (7→−6, −2→5) | WEAK | −6: clears denominators but drops the 8 (x²+5x−6 = 0). 5: no honest path. |
| 2b645128 | 9/2 | 6, 9/2, −9/2, 3 | 6, 9/2, −3, 20/3 (−9/2→−3, 3→20/3) | PROPOSED | −3: reports the new line's y-intercept. 20/3: uses the perpendicular slope −3/2. |
| 49b75ef8 | 5 | −5, 2, 5, 20 | — | RE-AUTHOR | Best legal pair (4, 13) has no paths. |
| 03574cad | 1 | −6, 1, 6, −1 | −6, 1, −9, 0 (6→−9, −1→0) | WEAK | −9: forgets to square the right side (3x+22 = x+4). 0: no honest path. |
| b905500f | −4 | −4, −3, 3, 4 | −4, −25, 3, 8 (−3→−25, 4→8) | WEAK | −25: forgets the square root (2a+1 = −49). 8: no honest path. (24, the twin slip, is a closure of −4 and 3.) |
| 4ed0332b | −4 | −4, 4, −5/2, 1 | −4, −9/2, −5/2, −12 (4→−9/2, 1→−12) | WEAK | −9/2: sets k = 0 and reports a solution of \|2x+5\| = 4. −12: no honest path. |
| 3a55f1ba | 5 | 5, 1, −5, 7 | 5, 1, −7, 11 (−5→−7, 7→11) | WEAK | −7: collects constants with a sign slip (−x = 6 + 1). 11: no honest path. Same mechanism and option set as 1de34236 (base 3 vs 5) — re-author one regardless. |
| b2c9ec89 | 4 | −4, 4, 9, 14 | −14, 4, 9, 31 (−4→−14, 14→31) | PROPOSED | −14: discriminant sign flipped, 36 + 4(k+5) = 0. 31: drops the 4 in 4ac, 36 − (k+5) = 0. |
| 4f1d1eb6 | 5 | 1, −5, 7, 5 | 1, −7, 11, 5 (−5→−7, 7→11) | WEAK | Neither −7 nor 11 has a clean path for 3x+3 = 4x−2. Prefer re-author. |
| 1de34236 | 5 | −5, 5, 1, 7 | −7, 5, 1, 11 (−5→−7, 7→11) | WEAK | As 3a55f1ba (2x−1 = 3x−6). The stem's "Round to the nearest whole number if needed" is meaningless for an exact integer answer. |

Tally: 5 PROPOSED, 13 WEAK, 8 RE-AUTHOR.
