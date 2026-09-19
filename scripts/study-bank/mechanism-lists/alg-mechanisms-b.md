# Live Algebra mechanisms (read 2026-09-19, one line each)

Source: every item in `sat-alg-*.kept.batch.json` (5 files) + `"Algebra"` rows of `sat-math-v16-*.batch.json`.
73 rows read; SM16L-01..05 appear twice each (adv.batch vs kept/held) -> 68 distinct ids.
Two pairs are the same mechanism (SALG-04 = SM16L-05; ALG-H5-10 = SM16L-04) -> **66 distinct mechanisms**.

## Lines, graphs, linear functions (my ground — the ones I must clear)
1. SALG-10 — point with parameter coords (a, 3a) + fixed point + given slope -> solve a
2. SALG-12 — three concurrent lines; find k in the third from the intersection of the first two
3. SALG-13 — table f(1)=c, f(3)=11, f(7)=c+12: unknown constant cancels in the slope -> c
4. SALG-18 — g linear, g(f(x)) given with f known: recover g, evaluate g(5)
5. SALG3-10 — y-intercept is 3x the x-intercept + line through a point -> y-intercept
6. SALG5A-02 — two lines each from two points; y-coordinate of their intersection
7. SALG5A-11 — solve 2x2 system, use solution as point; slope of line through it and origin
8. SALG5A-12 — two lines through a common point with given slopes; sum of y-intercepts
9. SALG5B-05 — zero of a linear f from two function values (negative fractional slope)
10. SALG5B-10 — x-int of y=f(x)-5 and y-int of y=f(x+4) each encode a point; find f(0) (INVERSE transform problem)
11. SALG5B-11 — two lines with common y-intercept, opposite-sign slopes; distance between x-intercepts
12. SALG5B-12 — line through two points; asked m + b
13. ALG-H5-03 — line through two points; y at a third x
14. ALG-H5-10 / SM16L-04 — line perpendicular to a standard-form line through a GIVEN point; y-intercept
15. ALG-H5-16 — VERTICAL translation of a line by k; new x-intercept
16. ALG-H5-19 — f(a - 2) = 26 with f known; solve a (shifted argument, single evaluation)
17. ALG-H5-23 — f(x) = g(x) for two given linear functions; evaluate f there
18. SALG2-17 — slope of the line through a given point and the x-intercept of a standard-form line
19. SALG-11 — evaluate linear profit model, shift output, invert (model item)
20. SALG2-18 — linear model: time until output is a stated multiple of the start (model item)
21. SALG2-05 — F = 1.8C + 32 with condition relating output to input (model item)

## Systems
22. SALG3-01 — dependent system, parameter in the constants of BOTH equations
23. ALG-H5-01 — dependent system ax - 15y = b: a + b
24. SALGD-01 — dependent system, multiplier from the constants applied both ways: a + b
25. SM16L-02 — no-solution condition via signed coefficient ratio: a
26. SALG5A-01 — 3x+2y=7k, 2x+3y=3k+10: x + y in terms of k by adding
27. SM16L-01 — symmetric system 6x+5y, 5x+6y: x + y by adding
28. SALG3-07 — three-party constant-rate packing with a staggered start
29. SALG5A-06 — two-nutrient two-ingredient mixture with a non-integer solution
30. ALG-H5-05 — percent-acid mixture, fixed total volume
31. SALG2-14 — percent-acid mixture, added volume unknown
32. SALG-21 — flat fee + hourly rate, one observation discounted 25% before solving
33. ALG-H5-17 — two pay rates and a total hours/pay pair -> weekend hours
34. ALG-H5-14 — sum of two numbers + multiplicative comparison -> larger
35. ALG-H5-20 — ratio 4:7 becomes 4:9 after adding 12 apples
36. ALG-H5-22 — two-leg trip, second speed defined from the first
37. SALG2-16 — pursuit with delayed start (head start / closing speed)
38. SALG5B-07 — two linear growth models each given by two data points; when equal
39. ALG-H5-07 — two populations moving in opposite directions; crossing year
40. SALG-19 — age problem with two opposite time shifts and a fixed difference
41. ALG-H5-02 — two cost plans compared by strict inequality; least number of sessions

## Inequalities / regions / counting
42. SALG3-02 — ordered pair satisfying three linear inequalities (strict/non-strict mix)
43. SALGD-02 — ordered pair satisfying a strict + non-strict pair, all candidates near a boundary
44. SALG5A-05 — count positive-integer pairs inside 2x + 5y < 20
45. SALG5A-09 — area of triangular solution region of three inequalities
46. SALG-15 — maximise a count under a resource inequality + ratio constraint at its boundary
47. SALG-17 — count integer widths under a perimeter inequality with a lower bound
48. ALG-H5-15 — budget inequality narrowed by a whole-week constraint
49. ALG-H5-18 — fixed item count + spending cap in one inequality; greatest count
50. ALG-H5-06 — two strict inequalities bounding an integer from both sides
51. SALG-05 — inequality with two fractional terms, negative combined coefficient; greatest integer
52. ALG-H5-24 — inequality with variable on both sides and a direction reversal
53. SM16L-03 — one-variable linear inequality; greatest integer strictly below the boundary
54. SALG5C-11 — inequality with parameter inside a distributed parenthesis, solution set given as x <= 3 -> k
55. SALG2-11 — two absolute-value tolerances on x and y; max of 3x - 2y

## One-variable equations / absolute value / literal
56. SALG-03 — |3x + 4| = |x - 8|; greater root
57. SALG-04 / SM16L-05 — count integers in a strict |ax - b| < c
58. SALG-14 — k for which |2x + 5| - 4 = k has exactly one solution
59. ALG-H5-04 — |x - 10| = 2x - 8; extraneous case rejected
60. SALG2-10 — |5x - 8| = 2x + 7; product of both valid solutions
61. ALG-H5-21 — two absolute-value tolerances; extremise a difference
62. SALG5C-12 — decimal coefficients with a parenthesis each side; solve x
63. ALG-H5-08 — distribute over (a - 2b), substitute b, solve a
64. ALG-H5-09 — 2x + 5y = 17 -> 6x + 15y - 8 (scale whole expression)
65. ALG-H5-13 — undo a 15% decrease, apply to a shifted second price
66. SALG3-08 — literal equation, variable inside a fraction plus an added term

## Mechanisms I will use (none above), with nearest entry
- 01 perpendicular BISECTOR of a segment between two given points -> y-intercept. Nearest #14 (perpendicular through a given point): mine derives both the direction (from AB) and the point (midpoint).
- 02 g(x) = f(x - 3) + 2 for given linear f -> zero of g. Nearest #15 (vertical shift -> x-int) and #10 (inverse problem): mine is a FORWARD combined horizontal+vertical shift.
- 03 line through the intersection of two given lines, PARALLEL to a third -> x-intercept. Nearest #7 (system solution as a point -> slope through origin) and #2: mine carries a parallel slope to an intercept.
- 04 linear f with f(4) = 9 and mean of f(2), f(8) = 13 -> f(12) (mean of two outputs = output at the mean input). Nearest #3 (table with a cancelling constant) and #13: the second point is hidden inside an average. [Replaced the axes-triangle-area candidate: every named error there lands on a x2 / /3 / /4 / x5 hub or a sum, because area = (1/2)ab.]
- 05 linear f with f(x + 2) = f(x) + 7 and f(1) = -4 -> f(9). Nearest #13 (two points -> third value): the rate is given as a step relation, not two points.
- 06 f(f(x)) = 9x + 8 with m > 0 -> f(5). Nearest #4 (g∘f with f known): mine is SELF-composition, slope from m^2 with a sign decision, intercept from b(m+1).
- 07 line with x-int 4, y-int -6 translated horizontally so its x-int is 9 -> new y-intercept. Nearest #15 (vertical translation -> x-int): mine is horizontal, specified by the intercept move.
- 08 linear f with f(2) = 3·f(6) and f(4) = 8 -> f(0). Nearest #3 (table with a cancelling constant): mine is a proportional relation between two outputs, no table.
- 09 f(x) = -2x + 5; solve f(3x) = f(x) - 8. Nearest #16 (single shifted-argument evaluation): mine equates two transformed evaluations; the trap is f(3x) vs 3f(x).
- 10 line given by x-int -8 and y-int 6 -> f(-20). Nearest #13 (two points -> y at third x): the two points are intercepts (sign of the x-int is the trap) and the target is far outside.
