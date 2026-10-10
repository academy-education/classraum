# sat-math-v30-full — author brief (thirteen authors: Algebra A-D, Advanced Math P-R, Geometry and Trigonometry G H J, PSDA T U V)

You are writing Digital SAT Math multiple-choice items (four options, all numeric) for a
question bank used by real students. Repo: `/Users/andylee/Downloads/saas/classraum`
(absolute paths always). Pre-registration: `scripts/study-bank/PREREG-MF30-2026-10-10.md`
(read it; it is binding). Your task message names your author letter, your domain,
the slots for THIS run (5-7 of them), and the dump directory DUMP.

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command, for any
reason. Do not run git. Use only your own (Claude) reasoning - no external model calls, no GPT.

`WORK` below is `/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/sat-math-v30-full-work`
(outside the repo).

## How you write (A90 process lesson: long runs stalled)

**One small file per item.** Write each item, as soon as it is finished, to
`WORK/parts/SM30F-<X><NN>.json` (one JSON object, not an array; absolute path).
Then immediately run

    cd /Users/andylee/Downloads/saas/classraum
    scripts/study-bank/mf30-part-check.sh WORK/parts/SM30F-<X><NN>.json

and fix the part until it prints `PART OK`. Then go to the next slot. Never build one
big file; never rewrite earlier parts unless the check failed on them. Do only the
slots named in your task message. Do not create ANY file in the repo; put any scratch work
under your own folder `WORK/scratch/<X>/` (create it).

## Ids and slots

Ids `SM30F-<X><NN>`. Each slot fixes `domain`, authored difficulty (M = medium,
H = hard) and where the key must sit **by value** among the four options: S =
smallest, L = largest, I = one of the two middle values. They were fixed by a seeded
shuffle before authoring; you may not change them (`node scripts/study-bank/mf30-slots.mjs`).

## Item schema (every field required)

    {
     "id": "SM30F-B05", "domain": "Algebra" | "Advanced Math" | "Geometry and Trigonometry" | "Problem-Solving and Data Analysis",
     "subskill": "<short label, < 60 chars>",
     "difficulty": "medium" | "hard",
     "prompt": "<stem; plain text; ASCII '-' for minus; no reviewer-facing text>",
     "graphic": <OPTIONAL, PSDA authors T U V only: {"type": "table", "rowLabels": [..], "colLabels": [..], "cells": [[".."]], "caption": ".."}
                 or {"type": "twowaytable", ...same fields}; omit the field otherwise. No svg / bar / scatter / figure
                 of any kind, in any domain: Geometry items describe their figure in words>,
     "choices": ["..","..","..",".."],           // numeric strings (integers, decimals or a/b)
     "correct_answer": "<exactly one of choices>",
     "explanation": "<student-facing worked solution>",
     "solve": "<JS function body returning the key>",
     "distractor_solve": { "<option>": "<JS body returning exactly that option, rounding included>", ... 3 },
     "mechanism": ["2-4 short keyword phrases naming the chain of steps"],
     "quantity_asked": "<what the stem asks for>",
     "ask_type": "<e.g. derived-expression | parameter | coordinate | count | rate | value-of-expression>",
     "plugback": { "substitutable": true|false,
                   "verify": "<JS body of v returning true iff v satisfies the stem's condition; REQUIRED if substitutable>",
                   "why": "<how a student would check an option against the stem, and why it does or does not work>" },
     "distractor_meta": { "<option>": { "error_kind": "<kind>", "error_sense": "omits"|"adds"|"swaps",
                          "direction": "above"|"below",
                          "stem_predicts_direction": false, "why": "<why the stem does not reveal the side>" }, ... 3 },
     "counter_error": { "error_kind": "<kind>", "solve": "<JS body>", "direction": "above"|"below", "why": "<the natural error>" },  // REQUIRED on S and L slots
     "far_distractor": { "option": "<one of the three distractors>", "natural_side": "above"|"below",
                         "why": "<why an error of this kind, which ordinarily lands past the key, lands on the near side HERE>" },  // REQUIRED on S and L slots
     "structure_check": "<S/L slots: does the item's own structure - a universal condition ('for every', 'for all'), an
                         extremum (vertex, maximum, minimum, top of an arc, highest / lowest), a strictest bound, a
                         monotone 'every slip lowers it' - tell a student which way EVERY error goes? It must not
                         (rule 15); say why not. I slots may omit it>",
     "intermediate_check": "<for EACH distractor: is it a value the key follows from through ONE printed rate, purchase or
                            relation (a distance from which the minutes follow at a printed speed, a dollar amount from
                            which the count follows at a printed price, the other item's price)? Each must be 'no', with
                            the reason (rule 14)>",
     "cheap_bound_check": "<S/L: the cheapest one-sided bound readable from the stem, and which distractor sits on the key's side of it; I: 'interior key'>",
     "shape_check": "<properties the stem hands over (sign, integer, cap, monotonic, convex, symmetric, +/- pairs) and which options survive each; >= 2 survive all together>",
     "interior_parity_check": "<the two middle values: same display form and complexity? the key is not the cleaner one>",
     "arith_class_check": "<is the key alone in a class (parity, sign, integrality, roundness, multiple of k, square) the stem implies?>",
     "dup_search": { "queries": ["<mf30-kw.mjs queries you ran>"], "hits_read": <n>, "nearest": "<id + why it is different>" },
     "self_audit": { "risk": "low|medium|high", "note": "<what a test-wise student would try, and why it fails; answer every (read) line>" },
     "bounds": []
    }

`error_kind` is one of: `sign_slip`, `inverted_rate`, `wrong_variable`, `wrong_operation`,
`wrong_base`, `omission`, `partial_answer`, `other`.

`error_sense` (A91, new) says what the error DOES, whatever its kind: `omits` = leaves out a
constraint, term, fee, condition or step, or stops a step early ("forgot a constraint");
`adds` = puts in something extra (double-counts, applies a step twice, adds a term that does not
belong, ignores a reducing cap or discount); `swaps` = sign, inversion, swapped quantity, wrong
operation or base. Label it honestly: an `omission` kind is always `omits`.

## Your sub-topics (nothing else; off-blueprint items are held)

**Algebra (A-D)** — every function and equation is LINEAR.

    A  linear equations in ONE variable: solving, a parameter giving no / infinitely many /
       a stated solution, set up from a context
    B  linear functions / equations in TWO variables: slope, intercepts, rate of change from a
       table / two points / a context, f(x) = mx + b, parallel and perpendicular lines,
       interpreting slope / intercept NUMERICALLY
    C  systems of TWO linear equations in TWO variables: solving, a combination without solving
       for each, a parameter giving no / infinitely many solutions, systems from a context
    D  linear INEQUALITIES in one or two variables: solving, from a context, systems of two
       linear inequalities, a linear inequality relating two quantities in context

Off-blueprint for Algebra: a third equation, three unknowns, quadratics, exponentials,
absolute value, nonlinear or inverse-of-nonlinear functions, PSDA statistics / percent.

**Advanced Math (P-R)** — every function an item is built on is NONLINEAR.

    P  quadratic functions and equations: forms (standard / vertex / factored), zeros, vertex and
       extreme values, axis of symmetry, discriminant and number of solutions, quadratic models in
       context, a line meeting a parabola
    Q  exponential functions and models, growth / decay rates and period conversion, exponent rules
       and rational exponents, radical expressions and radical equations (extraneous roots),
       equations quadratic in b^x
    R  polynomials and rational expressions / equations (factor and remainder theorems, zeros and
       multiplicity, coefficients, equivalent expressions, excluded values, a + b/(x - c)) AND
       nonlinear functions (notation, composition, inverses of nonlinear functions, transformations
       given by equations or tables, absolute-value equations, nonlinear systems that are not circles,
       inverse variation / rational / piecewise models)

Off-blueprint for Advanced Math: a linear function, its inverse, a composition of linear
functions or a linear system (that is Algebra); circles; PSDA percent / statistics.

**Geometry and Trigonometry (G H J)** — no figure is shown; describe the figure in words, completely.

    G  lines, angles and triangles (vertical / supplementary / parallel-line angles, triangle angle sum,
       exterior angles, isosceles and equilateral triangles, similar and congruent triangles, the
       triangle inequality) AND area, perimeter, surface area and volume (polygons, composite regions,
       prisms, cylinders, cones, pyramids, spheres, the effect of scaling a length on area / volume)
    H  right triangles and trigonometry: the Pythagorean theorem and triples, 30-60-90 and 45-45-90
       triangles, sine / cosine / tangent in right triangles, sin x = cos(90 - x), radians and degrees,
       arc of the unit circle, trigonometric values of special angles
    J  circles: arc length, sector area, central and inscribed angles, chords and their distance from the
       centre, tangents (perpendicular to the radius), the circle equation in the xy-plane (centre,
       radius, completing the square, a point inside / on / outside); coordinate distance and midpoint
       when the item is built on a circle or a polygon

Off-blueprint for Geometry: a linear or quadratic function with no geometric content (Algebra /
Advanced Math); percent, rate or statistics content (PSDA).

**Problem-Solving and Data Analysis (T U V)**

    T  ratios, rates and proportional relationships, unit conversion (including squared / cubic units),
       percentages: percent of, percent change, successive percent changes, reversing a percent change
    U  one-variable data (mean, median, mode, range, standard deviation compared qualitatively ONLY
       through a numeric ask, weighted means, the effect of adding / removing a value, data in a
       frequency table) AND two-variable data (a line or curve of best fit given as an equation,
       predicted vs actual, residual, linear vs exponential growth given numerically)
    V  probability and conditional probability (including from a two-way table, without replacement,
       "at least one"), and inference from a sample (estimating a population count from a sample
       proportion, the endpoints of an interval from an estimate and a margin of error)

Off-blueprint for PSDA: solving a linear equation or system with no data / rate / percent content
(Algebra); exponential FUNCTION algebra (Advanced Math); geometry.

## Rules (all binding; mf30-part-check and the pre-flight check most of them)

1. **One mechanism per item, distinct from every other item in this batch, from every live
   maths item in every family, and from every prior / held SAT maths
   batch item.** A duplicate is the same chain of steps on the same kind of givens to the
   same asked quantity; a new story over the same chain IS a duplicate. Before writing each
   item run 2-4 keyword searches and READ every hit:
   `node scripts/study-bank/mf30-kw.mjs <DUMP> "term&term|alt"` (`&` = all must match, `|` =
   alternation; `--full` prints everything). Record them in `dup_search`.
2. `solve` recomputes the key independently; `distractor_solve` for **every** distractor,
   producing exactly the option string's value (round in the body if the option is rounded).
3. Distractors from **different named wrong paths**. No derivational hub, no key that is a
   composite of other options, no +/- pair containing the key, no closure (an option = sum /
   difference / average / product of two others), no evenly spaced or geometric run of three
   options through the key, no grid of one quantity through factors, no decimal-shift sibling
   of the key, no singleton parity / sign / integrality / roundness / multiple-of-k tell.
4. **No one-sided error family.** Declare every distractor's `error_kind` and `direction`
   (above / below the key, by value). At least two distinct kinds, at least one of
   `sign_slip` / `inverted_rate` / `wrong_variable` / `wrong_operation` / `wrong_base`, at
   most one `omission` / `partial_answer`. `stem_predicts_direction` must be honestly false.
   Within your own items, an `error_kind` used on 3+ items falls above the key on at least one
   and below on at least one.
5. **Extreme keys (S/L slots): a REAL distractor from the far side (A91, new; 9 of 13 drops).**
   A91 lost C09, A10, A07, B08, S05, D06, Q02 and others the same way: the key was the largest
   (or smallest) option and all three distractors were "forgot a constraint" shortfalls (the
   white-paint cap, the freed space, positive weights, the sign of an intercept, the $2 per
   mug), so a student who sees that every natural error leaves something out picks the
   extreme without solving. `counter_error` (still required: a natural error whose `solve`
   lands strictly past the key and is not an option) did not stop it, because it is not an
   option and so changes nothing a student sees. Now:
   - **FAR1** the three distractors may NOT all be `omits` (and not all `adds` either).
   - **FAR2** `far_distractor` names one REAL distractor built from an error of a kind that
     ORDINARILY lands on the far side of the key (an over-count / extra step / ignored cap on a
     largest key; a dropped term / early stop on a smallest key), and which lands on the near
     side in THIS item because of how the stem is built (the extra enters a divisor, a
     subtracted amount, a difference, a comparison...). `natural_side` = the far side ("above"
     on L, "below" on S). An option cannot sit past an extreme key by value (the key would
     stop being extreme), which is why the requirement is on the error's natural side.
   - I read every `far_distractor` by hand: if a student who recognised that error would sign
     it on the near side from the stem without computing, the item is returned. Do not label
     an ordinary near-side error as "far" - build the item so the error's direction is
     genuinely not readable.
   - **Cheapest stem bound.** For every S/L item write in `cheap_bound_check` the cheapest
     one-sided bound a student can read from the stem (a cap, "must exceed 180/5 = 36", a
     sign, an integer floor) and confirm that at least one distractor sits on the KEY's side
     of it. A10 in A91 died because one bound (spaces > 36) struck all three.
6. **Banned asks on S/L slots:** greatest / least / maximum / minimum / largest / smallest,
   "sum of all", "possible values", "difference between the greatest and least", a subset
   count. Use those only on I slots, and even there prefer a derived quantity.
7. **Option pairs (A89, extended by A90).** The key must not equal another option combined by
   ONE operation (+, -, x, /) with **a number printed in the stem** (other than 1), and must
   not equal another option **times or divided by a number one step from the printed numbers**:
   a printed integer n - 1 or n + 1, or the sum of two printed numbers. A90 lost B01 (key 45 =
   3 x the option 15, with 4 orders printed: 3 = 4 - 1) and D04 (key 96 = 4 x the option 24,
   with 3 pens printed: 4 = 3 + 1). These are the "how many MORE", "one extra", "total vs per
   unit" distractors: natural as errors, and they hand over the key. `mf30-checks` lists every
   one (PAIR / DPAIR gating); its `(read)` lines (twice a printed number, a ratio of two printed
   numbers, a difference equal to n +/- 1) are answered in `self_audit`.
   **DSUM (A91, new, gating):** the key and an option must not DIFFER by the sum of two
   different printed numbers. A91 lost R01: key 24 = option 7 + (8 + 9), with 8 and 9 the
   printed constants, so a student who saw the 7 could add the two printed numbers to it.
8. **Plug-back (A90's largest drop class: 8 of 18, seven of them S keys reached on the FIRST
   ascending substitution).** A student tries the options in the natural order: ASCENDING,
   or DESCENDING when the stem asks for a greatest / maximum / largest / most value. If an
   option can be checked against the stem in one routine step (substitute and see if a
   printed equation / condition holds), the item is broken whenever that order reaches the key
   in 1 or 2 tries. So:
   - Set `plugback.substitutable` honestly. If true, write `verify` (it must return true for
     the key and false for the three distractors; the checker runs it) - and the key must be
     reached at try 3 or 4 in the natural order (the checker enforces this).
   - On an **S slot** or the **lower interior** value (ascending try 1 or 2), the ask must NOT
     be substitutable: not the solution x, not a zero, not the input where f(x) = c, not "the
     value of k" that makes a printed condition true, not a short value computed forward from
     the stem. Ask for a derived quantity one step past the parameter or solution (a product /
     sum / difference built from it, a coordinate of something built from it, the value of a
     different expression). The checker prints a `(read) PLUG` line for every such item; I read
     each by hand and a substitutable one is returned.
   - Direction ban: no sign or monotonicity reading from the stem that kills options unsolved.
9. **Every option is a LEGAL value of the quantity asked** and survives every qualitative
   property the stem hands over (a count is an integer; a quantity the context makes
   nonnegative is nonnegative; a value under a stated cap respects it; convexity, monotonicity,
   symmetry, an exponent above or below 1, solutions in +/- pairs). `shape_check` names each.
   At least two options survive every property together.
10. **Interior parity:** the two middle values have the same display form and complexity
    within one digit; the key is not the "cleaner" one. No two options summing to 1, 90, 180,
    360 or 100; no shared-denominator structure singling out the key.
11. No reviewer-facing text in `explanation`; no option value and no key value repeated across
    your items; ASCII hyphen-minus `-` everywhere (never U+2212); "xy-plane".
12. **Medium = two real steps** (set up then solve, or solve then use the result); one
    routine step is easy and will be held at the easy cap. **Hard** = a decision point that
    routine procedure, including Desmos, does not bypass.

13. **Plug-back, ALGEBRA, decided by a cold probe (A92, new; 6 plug-back drops, all Algebra).** A92
    lost B09 D04 A07 A04 - all smallest keys confirmed on the FIRST ascending try - and B08 A09. The
    authors called five of them "not substitutable" and argued the check needed the whole model run
    backwards; graders back-solved each in one routine pass. So for Algebra your `substitutable`
    claim no longer decides anything: **every Algebra item whose key is reached at try 1 or 2 of the
    natural order (ascending; descending on a greatest / maximum / largest / most stem) is sent to a
    cold probe** - a separate agent that sees only the stem and options, tries them in that order and
    reports whether one routine check confirms the key. If it does, the item is returned (once) and,
    still confirmed after the return, dropped. On an Algebra S slot or lower-interior slot the asked
    quantity must be one a student cannot confirm from the option: not the solution, not a single
    derived value whose back-solve is linear (A92's four), but a quantity many different situations
    share (a combination of two unknowns, a difference of two derived values, a value of a different
    expression) so that checking an option needs the whole solution anyway. Write `plugback.why` as
    what the probe will try, not as an argument.
14. **No solved intermediate as a distractor (A92, new; A01 A03 C02 C05).** No distractor may be a
    value from which the key follows through ONE printed rate, purchase or relation: the distance when
    the stem prints the speed and asks the minutes; the dollars when it prints the price and asks the
    count; the other item's price when it prints the total. A student who suspects that option gets the
    key AND a full check from the option set. Fill in `intermediate_check` for every distractor; I read
    every one at stage 0, and a yes is a return.
15. **Structure that signs every error takes no extreme key (A92, new; D01 P09 and three more).** If the
    item's own structure tells a student which way every error goes - a universal condition ("for every
    y", "for all x"), an extremum (a vertex, a maximum or minimum, the top of an arc, a highest / lowest
    point), a strictest bound, a monotone "every slip lowers it" - the item may sit only on an I slot.
    On S and L slots, `mf30-checks` STRUCT refuses a stem containing "for every / all / each / any",
    vertex, maximum, minimum, highest, lowest, peak or "top of", and `structure_check` must say why the
    structure does not sign the errors; I read it, and a structure the regex cannot see is a return.
16. **The key is not a number printed in the stem (A92, new; A11: key 45 = the minutes in 7:45).**
    `mf30-checks` KEYPRINT refuses a key whose value appears anywhere in the prompt or in a table's
    labels, cells or caption. A key equal to a printed number in absolute value only is a `(read)` line.
17. **Geometry: no figure.** Describe every figure in words, completely enough to draw it. No `graphic`
    in Geometry or in Algebra / Advanced Math. A figure item must NEED its figure (80.6% of maths figures
    were decorative, FIGURE-BLIND-RESULT.md); this batch avoids the question by using none.
18. **PSDA tables.** T U V may attach one `graphic` of type "table" or "twowaytable" (shape above); the
    `solve` and every `distractor_solve` must compute from the numbers in it (copy them into the body).
    Percent and probability options are numeric strings (a fraction "a/b" or a decimal), never "%" text.

## Before you finish the run

Every part of this run must print `PART OK`. For each S/L item write in `self_audit.note`
your answer to: "covering the work, could a student tell from the stem which way the errors
go and strike all three distractors? Does the far_distractor really read as a far-side error,
and does any one bound from the stem strike all three?" and for each S / lower-interior item: "could a
student check an option against the stem in one routine step?" (for Algebra the cold probe will
try exactly that), and for every item: "is any distractor a solved intermediate one printed rate,
purchase or relation away from the key?" If any answer is yes, rewrite the item.

Do not edit any file except your own parts and your scratch folder. Do not run git. Never run
a process-killing command. Do not read any `act-math-v2*` file, any grader / solver / probe file, or
another author's parts. Use
only Claude reasoning (no external model calls). When done, reply with one line per item:
id, slot, key, quantity asked, PART OK.
