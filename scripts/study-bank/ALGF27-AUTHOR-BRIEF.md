# sat-math-v27-algfull — author brief (one of four authors)

You are writing 13 Digital SAT **Algebra** multiple-choice items (four options,
numeric) for a question bank used by real students. Repo:
`/Users/andylee/Downloads/saas/classraum` (use absolute paths). Pre-registration:
`scripts/study-bank/PREREG-ALGF27-2026-10-08.md` (read it; it is binding).

The previous batch on these same sub-topics (A88, `sat-math-v26-algfull`) was
**held with 0 inserted**, because in linear Algebra the natural wrong paths
(drop a term, widen a bound, ignore a constraint, report an intermediate) move
the answer in a direction the stem announces. When the key was the largest or
smallest option, graders struck all three distractors by reading which way the
errors go: extreme keys survived 7 of 28. Your job is to write items whose
errors do NOT all point one stem-readable way. That is the point of this batch.

## Your file, ids and slots

Write `scripts/study-bank/sat-math-v27-algfull-<x>.batch.json` (a JSON array),
**adding each item to the file as soon as it is written** (not all at the end).
Ids `SM27F-<X>01 .. SM27F-<X>13`. `domain` = `"Algebra"`. Each slot fixes the
item's authored difficulty (M = medium, H = hard) and where the key must sit
**by value** among the four options: S = smallest, L = largest, I = one of the
two middle values. These were fixed by a seeded shuffle before authoring; you
may not change them. (`node scripts/study-bank/algf27-slots.mjs` prints the table.)

## Item schema (every field required)

    {
     "id": "SM27F-B05", "domain": "Algebra",
     "subskill": "<short label, < 60 chars>",
     "difficulty": "medium" | "hard",
     "prompt": "<stem; plain text; ASCII '-' for minus; no reviewer-facing text>",
     "choices": ["..","..","..",".."],           // numeric strings (integers, decimals or a/b)
     "correct_answer": "<exactly one of choices>",
     "explanation": "<student-facing worked solution; may say which error gives each distractor>",
     "solve": "<JS function body returning the key, e.g. 'const b=20/2; const m=40/10; return m*-4+b;'>",
     "distractor_solve": { "<option string>": "<JS body returning exactly that option, rounding included>", ... 3 entries },
     "mechanism": ["2-4 short keyword phrases naming the chain of steps"],
     "quantity_asked": "<what the stem asks for>",
     "distractor_meta": { "<option>": { "error_kind": "<kind>", "direction": "above"|"below",
                          "stem_predicts_direction": false, "why": "<why the stem does not reveal which side this error lands>" }, ... 3 },
     "counter_error": { "error_kind": "<kind>", "solve": "<JS body>", "direction": "above"|"below", "why": "<the natural error>" },   // REQUIRED when the slot is S or L
     "cheap_bound_check": "<extreme slots: the cheapest one-sided bound readable from the stem, and which distractor sits on the key's side of it; interior: 'interior key'>",
     "interior_parity_check": "<the two middle values: same display form and complexity? the key is not the cleaner one>",
     "arith_class_check": "<is the key alone in a class (parity, sign, integrality, roundness, multiple of k, perfect square) the stem implies?>",
     "dup_search": { "queries": ["<algf27-kw.mjs queries you ran>"], "hits_read": <n>, "nearest": "<id + why it is different>" },
     "self_audit": { "risk": "low|medium|high", "note": "<what a test-wise student would try, and why it fails>" },
     "bounds": []
    }

`error_kind` is one of: `sign_slip`, `inverted_rate`, `wrong_variable` (reports
the other unknown, or an intermediate quantity of a DIFFERENT variable),
`wrong_operation`, `wrong_base`, `omission`, `partial_answer`, `other`.

## Rules (all binding; the pre-flight checks most of them mechanically)

1. **One mechanism per item, all 13 distinct, and distinct from every live maths
   item in every family and every prior/held Algebra item.** A duplicate is the
   same chain of steps on the same kind of givens to the same asked quantity; a
   new story over the same chain IS a duplicate. Before writing each item run
   2-4 keyword searches and READ every hit:
   `node scripts/study-bank/algf27-kw.mjs <DUMP> "term&term|alt"`
   (`&` = all must match, `|` = alternation; `--full` prints everything). Record
   them in `dup_search`. DUMP is given in your task message.
2. `solve` recomputes the key independently; `distractor_solve` for **every**
   distractor, producing exactly the option string's value (round in the body if
   the option is rounded).
3. Distractors from **different named wrong paths**. No derivational hub (key the
   one option every distractor is one edit from), no key that is a composite of
   other options, no ± pair containing the key, no closure (an option = sum /
   difference / average / product of two others), no evenly spaced or geometric
   run of three options through the key, no grid of one quantity through factors,
   no singleton parity / sign / integrality / roundness / multiple-of-k tell.
4. **No one-sided error family** (the A88 cause). Declare every distractor's
   `error_kind` and `direction` (above / below the key, by value). Use at least
   two distinct kinds, **at least one of** `sign_slip`, `inverted_rate`,
   `wrong_variable`, `wrong_operation`, `wrong_base`, and **at most one**
   `omission` or `partial_answer`. `stem_predicts_direction` must be honestly
   false: if a student could tell from the stem alone that "any slip makes it
   bigger", the item is broken.
5. **Extreme keys (S/L slots) need errors that land on BOTH sides.** Give a
   `counter_error`: a natural error (sign slip, inverted ratio, other variable,
   wrong operation) whose `solve` lands **strictly on the other side of the key**
   (below the key on an S slot, above it on an L slot) and is **not** one of the
   options. Its existence is what makes "strike the side the stem points to"
   fail. Design the item so the errors genuinely split: e.g. a sign slip on a
   negative coefficient that can go either way, reporting the other variable
   (which may be larger or smaller), inverting a ratio. Do NOT build the extreme
   key by making every error an over-count.
6. **Banned asks on S/L slots:** greatest / least / maximum / minimum / largest /
   smallest, "sum of all", "possible values", "difference between the greatest
   and least", or a subset count. Use those asks only on I slots, and even there
   prefer a derived quantity.
7. **No option pair joined by a number printed in the stem where one member is
   the key** (A89's drop class): the key must not equal another option plus,
   minus, times or divided by any number that appears in the stem (other than
   1). E.g. stem prints 4, options 7 and 11 with key 11: broken. Also avoid twice
   a printed number and a ratio of two printed numbers. The checker lists these.
8. **Plug-back ban:** do not ask for the solution x of a one-variable equation
   or the (x, y) of a system when the options can be substituted; ask for a
   derived quantity (a combination, a parameter, the value of an expression, a
   coordinate of something built from the solution). Trying options in order must
   not reach the key in <= 2 routine substitutions. **Direction ban:** no sign or
   monotonicity reading from the stem that kills options without solving.
9. **Every option is a LEGAL value of the quantity asked:** a count or a greatest
   / least integer is an integer; a quantity the context makes nonnegative is
   nonnegative; a value under a stated cap or budget respects it. An illegal
   distractor is a free strike.
10. **Interior parity:** the two middle values have the same display form
    (both integers, or both one-decimal, or both a/b) and complexity within one
    digit; the key is not the "cleaner" of the two. No two options summing to
    1, 90, 180, 360 or 100; no shared-denominator structure singling out the key.
11. No reviewer-facing text in `explanation`; no option value repeated across
    items in your file; no key value repeated across items in your file; ASCII
    hyphen-minus `-` everywhere (never U+2212); "xy-plane".
12. **Medium = two real steps** (set up then solve, or solve then use the
    result); a single routine step is easy and will be held. **Hard** = a
    decision point that routine procedure, including Desmos, does not bypass.
13. On-blueprint only: no third equation, no three unknowns, no quadratics,
    exponentials, absolute value, nonlinear or inverse functions, no PSDA-style
    statistics or percent content.

## Before you finish

Run on your file and fix everything it reports, then re-run until it passes:

    cd /Users/andylee/Downloads/saas/classraum
    scripts/study-bank/algf27-preflight.sh scripts/study-bank/sat-math-v27-algfull-<x>.batch.json

It must end `GATING CHECKS PASS`. Also read every `(read)` line from
`algf27-checks`, every `KEY lone in` line from `check-key-arith-class`, and every
`math-mechanism-dup` FLAG, and fix what is real. Finally, for each S/L item, ask
yourself in writing (in `self_audit.note`): "covering the work, could a student
tell from the stem which way the errors go and strike all three distractors?"
If yes, rewrite it.

Do not edit any other file in the repo. Do not run git. Do not read any
`act-math-v27*` file or any grader/solver file. Use only Claude reasoning (no
external model calls). When done, reply with: the file path, the preflight
result line, and one line per item (id, slot, key, quantity asked).
