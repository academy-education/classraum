# sat-math-v28-full — author brief (eight authors: Algebra A-D, Advanced Math P-S)

You are writing Digital SAT multiple-choice items (four options, all numeric) for a
question bank used by real students. Repo: `/Users/andylee/Downloads/saas/classraum`
(absolute paths always). Pre-registration: `scripts/study-bank/PREREG-MF28-2026-10-09.md`
(read it; it is binding). Your task message names your author letter, your domain,
the slots for THIS run (5-7 of them), and the dump directory DUMP.

## How you write (A90 process lesson: long runs stalled)

**One small file per item.** Write each item, as soon as it is finished, to
`scripts/study-bank/mf28-parts/SM28F-<X><NN>.json` (one JSON object, not an array).
Then immediately run

    cd /Users/andylee/Downloads/saas/classraum
    scripts/study-bank/mf28-part-check.sh scripts/study-bank/mf28-parts/SM28F-<X><NN>.json

and fix the part until it prints `PART OK`. Then go to the next slot. Never build one
big file; never rewrite earlier parts unless the check failed on them. Do only the
slots named in your task message. Do not create any other file in the repo; put any
scratch work under your own folder `scripts/study-bank/mf28-scratch/<X>/` (create it).

## Ids and slots

Ids `SM28F-<X><NN>`. Each slot fixes `domain`, authored difficulty (M = medium,
H = hard) and where the key must sit **by value** among the four options: S =
smallest, L = largest, I = one of the two middle values. They were fixed by a seeded
shuffle before authoring; you may not change them (`node scripts/study-bank/mf28-slots.mjs`).

## Item schema (every field required)

    {
     "id": "SM28F-B05", "domain": "Algebra" | "Advanced Math",
     "subskill": "<short label, < 60 chars>",
     "difficulty": "medium" | "hard",
     "prompt": "<stem; plain text; ASCII '-' for minus; no reviewer-facing text>",
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
     "distractor_meta": { "<option>": { "error_kind": "<kind>", "direction": "above"|"below",
                          "stem_predicts_direction": false, "why": "<why the stem does not reveal the side>" }, ... 3 },
     "counter_error": { "error_kind": "<kind>", "solve": "<JS body>", "direction": "above"|"below", "why": "<the natural error>" },  // REQUIRED on S and L slots
     "cheap_bound_check": "<S/L: the cheapest one-sided bound readable from the stem, and which distractor sits on the key's side of it; I: 'interior key'>",
     "shape_check": "<properties the stem hands over (sign, integer, cap, monotonic, convex, symmetric, +/- pairs) and which options survive each; >= 2 survive all together>",
     "interior_parity_check": "<the two middle values: same display form and complexity? the key is not the cleaner one>",
     "arith_class_check": "<is the key alone in a class (parity, sign, integrality, roundness, multiple of k, square) the stem implies?>",
     "dup_search": { "queries": ["<mf28-kw.mjs queries you ran>"], "hits_read": <n>, "nearest": "<id + why it is different>" },
     "self_audit": { "risk": "low|medium|high", "note": "<what a test-wise student would try, and why it fails; answer every (read) line>" },
     "bounds": []
    }

`error_kind` is one of: `sign_slip`, `inverted_rate`, `wrong_variable`, `wrong_operation`,
`wrong_base`, `omission`, `partial_answer`, `other`.

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

**Advanced Math (P-S)** — every function an item is built on is NONLINEAR.

    P  quadratic functions and equations: forms (standard / vertex / factored), zeros, vertex and
       extreme values, axis of symmetry, discriminant and number of solutions, quadratic models in
       context, a line meeting a parabola
    Q  exponential functions and models, growth / decay rates and period conversion, exponent rules
       and rational exponents, radical expressions and radical equations (extraneous roots),
       equations quadratic in b^x
    R  polynomials and rational expressions / equations: factor and remainder theorems, zeros and
       multiplicity, end behaviour, polynomial operations and coefficients, equivalent expressions,
       rational equations (excluded values), division a + b/(x - c)
    S  NONLINEAR functions: notation and evaluation, composition, inverses of nonlinear functions,
       transformations of graphs given by equations or tables, absolute-value equations, nonlinear
       systems (NOT circles - Geometry), nonlinear models in context (inverse variation, rational,
       piecewise)

Off-blueprint for Advanced Math: a linear function, its inverse, a composition of linear
functions or a linear system (that is Algebra); circles; PSDA percent / statistics.

## Rules (all binding; mf28-part-check and the pre-flight check most of them)

1. **One mechanism per item, distinct from every other item in this batch, from every live
   maths item in every family, and from every prior / held SAT Algebra and Advanced Math
   batch item.** A duplicate is the same chain of steps on the same kind of givens to the
   same asked quantity; a new story over the same chain IS a duplicate. Before writing each
   item run 2-4 keyword searches and READ every hit:
   `node scripts/study-bank/mf28-kw.mjs <DUMP> "term&term|alt"` (`&` = all must match, `|` =
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
5. **Extreme keys (S/L slots) need errors on BOTH sides.** `counter_error`: a natural error
   whose `solve` lands strictly past the key (below it on S, above it on L) and is not an
   option. Design the item so the errors genuinely split; do not build an extreme key by
   making every error an over-count.
6. **Banned asks on S/L slots:** greatest / least / maximum / minimum / largest / smallest,
   "sum of all", "possible values", "difference between the greatest and least", a subset
   count. Use those only on I slots, and even there prefer a derived quantity.
7. **Option pairs (A89, extended by A90).** The key must not equal another option combined by
   ONE operation (+, -, x, /) with **a number printed in the stem** (other than 1), and must
   not equal another option **times or divided by a number one step from the printed numbers**:
   a printed integer n - 1 or n + 1, or the sum of two printed numbers. A90 lost B01 (key 45 =
   3 x the option 15, with 4 orders printed: 3 = 4 - 1) and D04 (key 96 = 4 x the option 24,
   with 3 pens printed: 4 = 3 + 1). These are the "how many MORE", "one extra", "total vs per
   unit" distractors: natural as errors, and they hand over the key. `mf28-checks` lists every
   one (PAIR / DPAIR gating); its `(read)` lines (twice a printed number, a ratio of two printed
   numbers, a difference equal to a derived number) are answered in `self_audit`.
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

## Before you finish the run

Every part of this run must print `PART OK`. For each S/L item write in `self_audit.note`
your answer to: "covering the work, could a student tell from the stem which way the errors
go and strike all three distractors?" and for each S / lower-interior item: "could a
student check an option against the stem in one routine step?" If either answer is yes,
rewrite the item.

Do not edit any file except your own parts and your scratch folder. Do not run git. Do not
read any `act-math-v27*` file, any grader / solver file, or another author's parts. Use
only Claude reasoning (no external model calls). When done, reply with one line per item:
id, slot, key, quantity asked, PART OK.
