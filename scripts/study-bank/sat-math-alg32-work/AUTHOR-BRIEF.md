# sat-math-v32-alg - author brief (three authors x 8 items: B, C, D)

You are writing Digital SAT Math multiple-choice items - **Algebra, authored HARD**, four options,
all numeric - for a question bank used by real students. Repo:
`/Users/andylee/Downloads/saas/classraum` (absolute paths always). The pre-registration
`scripts/study-bank/PREREG-MATH-ALG32-2026-10-23.md` is binding: read sections 3, 5, 7 and 8 before
you start. Your task message names your author letter (B, C or D) and the slots for THIS run (4 of
your 8).

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not run
git. Use only your own (Claude) reasoning: no external model calls, no GPT, and no program that
searches for or generates items. Do not read any other author's parts, any grader / solver / probe
file, any `alg32.*` result file, or any held or dropped v23-v26 item file. Do not open anything from
the previous attempt at this batch: `scripts/study-bank/sat-math-alg31-work/`, any
`sat-math-v31-alg*` file, any `alg31*` file, or `/Users/andylee/Downloads/saas/classraum-alg31-private/`.
Its 24 items appear in your census as BANNED prior items; their setups are in the reference list.

    WORK = /Users/andylee/Downloads/saas/classraum/scripts/study-bank/sat-math-alg32-work
    DUMP = /Users/andylee/Downloads/saas/classraum-alg32-private/dump

## What "hard" means here

"Hard" = the item has a **decision point that routine procedure, including Desmos, does not
bypass**. "Medium" = careful multi-step procedure reaches the key. Three independent graders label
every item and the bank takes their median; your label does not count. The method (alg26) banked 11
hard of 24 in these three mechanisms - and lost 5 of its 7 drops to plug-back, every one on a
greatest / least ask. So in this batch **every slot whose key a plug-back student reaches at try 1-2
asks an aggregate** (count / sum / difference), and greatest / least / value sit only where the key
is reached at try 3-4. Read rule 7 twice.

## Your mechanism and its decision point

| author | `mech` | the item | the decision point (must not be bypassable; its bypass is a named distractor) |
|---|---|---|---|
| B | `degenerate-parameter` | a linear equation in x, or a system of two linear equations in x and y, with a constant k such that ONE value of k makes the x-coefficient (or the determinant) vanish | the degenerate k must be treated as its own case (no solution vs every x vs one solution); the generic formula silently fails there |
| C | `integer-count-condition` | a one-variable linear inequality or compound inequality with a constant k, and a condition on how many integers (or positive integers) satisfy it | the boundary k values: whether each endpoint is attained, strict vs non-strict, and (where k multiplies x) the direction flip |
| D | `integer-optimum` | whole-number quantities x, y under two or three linear constraints; optimise a linear objective (or count / compare optimal plans) | the best LATTICE point is not the rounded corner of the real feasible region |

**D only:** on your extreme slots (D1 D3 D4 D5) the ask may NOT be the optimal objective value
itself (the rounded-corner error always overshoots a maximum and undershoots a minimum, so an
extreme-ranked optimum is signed by the structure). Ask for a count of optimal plans, a coordinate
or difference of coordinates of the optimal plan, a sum over feasible plans, and so on. **D6 is the
one slot that asks the optimum itself** (`greatest`, key rank 2 of 4: a student trying the largest
option first must REFUTE it, then the next, before reaching the key). An optimum asked anywhere else
must not be labelled `value`: if the question asks for a greatest or least quantity, that is the ask.

## Your slots (fixed; you may not change them)

Key rank = the key's position BY VALUE among the four options: 1 smallest, 4 largest. Try = where a
student trying the options in the natural order (ascending; descending only on a `greatest` ask)
meets the key. Bypass = which side of the key your `bypass_option` must sit on (the part check
refuses the other side).

    slot  ask         rank  try  bypass     slot  ask         rank  try  bypass     slot  ask         rank  try  bypass
    B1    count       r1    1    above      C1    count       r4    4    below      D1    count       r1    1    above
    B2    count       r4    4    below      C2    count       r3    3    above      D2    count       r2    2    below
    B3    count       r2    2    above      C3    sum         r1    1    above      D3    sum         r4    4    below
    B4    sum         r1    1    above      C4    sum         r3    3    below      D4    difference  r1    1    above
    B5    sum         r4    4    below      C5    difference  r1    1    above      D5    difference  r4    4    below
    B6    difference  r3    3    below      C6    difference  r4    4    below      D6    greatest    r2    3    above
    B7    sum         r2    2    above      C7    difference  r2    2    above      D7    difference  r2    2    above
    B8    value       r4    4    below      C8    least       r3    3    below      D8    value       r3    3    below

**Try 1-2 slots (B1 B3 B4 B7 C3 C5 C7 D1 D2 D4 D7) ask an aggregate**, and the part says what it
runs over in `plugback.aggregate_over` (the slot table's own description is printed by
`node scripts/study-bank/alg32-slots.mjs`; say it for YOUR item in your own words).

`ask` is one of: `count` (number of values / integers / plans), `sum` (sum or mean of values),
`difference` (width, spread, greatest minus least), `greatest`, `least`, `value` (one determined
value). The stem must really ask that kind of quantity. `node scripts/study-bank/alg32-slots.mjs`
prints the table.

## Order of work (each step is checked)

1. **Read your census first, all of its LIVE section, before writing anything:**
   `WORK/census-<your letter>.txt` (made by `alg32-census.mjs census <X>`). It holds every live maths
   row in every family that matches your mechanism - including the live v26 items written in
   exactly your mechanism - plus prior batch items. ISEE math s18 lost ~44 of 60 items because the
   author had not read the live canon: numbers and wording differ, and the scripts saw nothing. A
   new story over a live item's chain of steps and setup IS a duplicate.
2. **Read `scripts/study-bank/alg32-reference-triples.json`** (122 setup triples, including the 24
   from the previous attempt at this batch). None may be
   reproduced; R2 refuses an exact match and I refuse a same-setup item in different words.
3. **For each slot, probe the idea BEFORE writing it:**

       cd /Users/andylee/Downloads/saas/classraum
       node scripts/study-bank/alg32-census.mjs idea <slot> --setup "<i> | <ii> | <iii>" \
         --q "<term&term|alt>" --q "<term&term>" [--q ...]

   At least two queries; read every hit (a query with more than 40 hits does not count - narrow
   it). If a hit is your idea, drop the idea and probe a new one (earlier attempts stay logged; that
   is fine). Put `"idea_probe": {"at": "<the time it printed>", "nearest": "<nearest live id + why
   yours differs>"}` in the part. The part check refuses a part written before its probe.
4. **Write the item** to `WORK/parts/SM32L-<slot>.json` (one JSON object; absolute path) and run

       scripts/study-bank/alg32-part-check.sh /Users/andylee/Downloads/saas/classraum/scripts/study-bank/sat-math-alg32-work/parts/SM32L-<slot>.json

   Fix it until it prints `PART OK`. Answer every `(read)` line in `self_audit.note`. Then the next
   slot. Never build one big file. Put any scratch work under `WORK/scratch/<your letter>/`.

## Item schema (every field required unless marked)

    {
     "id": "SM32L-C4", "domain": "Algebra", "difficulty": "hard",
     "subskill": "<short label, < 60 chars>",
     "prompt": "<stem; plain text; ASCII '-' for minus (never U+2212); <= and >= may be written ≤ ≥; no reviewer-facing text>",
     "choices": ["..","..","..",".."],              // numeric strings (integers, decimals or a/b), four distinct values
     "correct_answer": "<exactly one of choices>",
     "explanation": "<student-facing worked solution, naming why each distractor is wrong>",
     "solve": "<JS function body returning the key; brute-force over k / x / plans where you can>",
     "distractor_solve": { "<option>": "<JS body returning exactly that option>", ... 3 },
     "mechanism": ["2-4 short keyword phrases naming the chain of steps"],
     "mech": "degenerate-parameter" | "integer-count-condition" | "integer-optimum",
     "ask": "count" | "sum" | "difference" | "greatest" | "least" | "value",
     "quantity_asked": "<what the stem asks for>",
     "setup": { "i": "<where k / the constraint sits>", "ii": "<the condition>", "iii": "<the asked quantity>" },
     "bypass_option": "<the distractor a student gets by SKIPPING the decision point>",
     "off_by_one_options": ["<an option that is an endpoint / inclusion error next to the key, if any>"],
     "nonint_constant": true, "integer_k_answer": "<..>",   // ONLY on an item asking about values of a k that need not be an integer (batch cap 2)
     "plugback": { "substitutable": true|false,
                   "verify": "<JS body of v returning true iff v satisfies the stem; REQUIRED if substitutable>",
                   "why": "<what a student trying the options in the natural order would do, and where it stops>",
                   "aggregate_over": "<REQUIRED on try 1-2 slots: the set your count / sum / difference runs over, >= 20 chars>" },
     "distractor_meta": { "<option>": { "error_kind": "<kind>", "error_sense": "omits"|"adds"|"swaps",
                          "direction": "above"|"below", "stem_predicts_direction": false,
                          "why": "<why the stem does not reveal the side>" }, ... 3 },
     "counter_error": { "error_kind": "<kind>", "solve": "<JS body>", "direction": "above"|"below", "why": "<..>" },   // REQUIRED on r1 / r4 slots
     "far_distractor": { "option": "<a distractor>", "natural_side": "above"|"below", "why": "<>= 40 chars>" },  // REQUIRED on r1 / r4
     "structure_check": "<r1 / r4: does the item's own structure (a universal condition, an extremum, a strictest bound, a monotone 'every slip lowers it') tell a student which way EVERY error goes? It must not; say why>",
     "cheap_bound_check": "<r1 / r4: the cheapest one-sided bound readable from the stem, and which distractor sits on the key's side of it>",
     "intermediate_check": "<for EACH distractor: is it a value the key follows from through ONE printed relation? each 'no', with the reason>",
     "shape_check": "<properties the stem hands over (integer, sign, cap, parity, monotone) and which options survive each; >= 2 survive all together>",
     "interior_parity_check": "<the two middle values: same display form and complexity? the key is not the cleaner one>",
     "arith_class_check": "<is the key alone in a class the stem implies (parity, sign, multiple of k, roundness)?>",
     "idea_probe": { "at": "<from the idea probe>", "nearest": "<id + why it differs>" },
     "dup_search": { "queries": ["<mf30-kw.mjs queries you ran beyond the idea probe, if any>"], "hits_read": <n>, "nearest": "<id + why different>" },
     "self_audit": { "risk": "low|medium|high", "note": "<what a test-wise student would try, and why it fails; every (read) line answered>" }
    }

`error_kind` is one of `sign_slip`, `inverted_rate`, `wrong_variable`, `wrong_operation`,
`wrong_base`, `omission`, `partial_answer`, `other`. `error_sense`: `omits` leaves out a constraint,
case, endpoint or step; `adds` puts in something extra (counts an excluded endpoint, keeps the
degenerate k, double-counts); `swaps` is a sign, inversion, swapped quantity or wrong operation.
Extra keyword searches: `node scripts/study-bank/mf30-kw.mjs <DUMP> "<term&term|alt>" [--full]`.

## Rules (all binding; the part check and my stage-0 read enforce them)

1. **Blueprint.** SAT Algebra only: linear equations in one or two variables, linear functions,
   systems of TWO linear equations in TWO variables, linear inequalities in one or two variables.
   At most two variables (x, y) and one named constant k (author B may add a constant c that the
   question asks for). No third equation, no "the solution lies on a third line", no k^2 or
   quadratic step in k, no quadratic in x, no absolute value, no divisibility beyond "is an
   integer". A grader majority calling an item off-blueprint holds it.
2. **The decision point is the item.** A student who skips it (uses the generic formula, rounds the
   corner, ignores strictness or the flip) must land on a distractor, and that distractor is your
   `bypass_option`. **Its side is fixed by your slot** (the table above; the part check refuses the
   other side), which gives each mechanism 4 above and 4 below (R10). Build the stem so the bypass
   genuinely lands on that side: alg26's graders found one mechanism's bypass below the key on every
   item, and the previous attempt at this batch had the degenerate-parameter bypass below the key on
   all 5 of its surviving items.
3. **Distractors from different named wrong paths.** At least two distinct `error_kind`s, at least
   one of sign_slip / inverted_rate / wrong_variable / wrong_operation / wrong_base, at most one
   omission / partial_answer; `stem_predicts_direction` honestly false. No derivational hub, no key
   that is a composite of other options, no +/- pair containing the key, **no closure (an option =
   sum / difference / average of two others - now checked by the part check, CLOSE)**, no evenly spaced or geometric run of three through
   the key, no key = another option combined with a printed number (or a multiplier one step from a
   printed number, or differing by the sum of two printed numbers), no key equal to a number printed
   in the stem.
4. **Extreme keys (r1 / r4 slots).** The three distractors may not all be `omits` (nor all `adds`);
   `far_distractor` names one real distractor whose error ORDINARILY lands past the key and here
   lands on the near side because of how the stem is built; `counter_error` is a natural error whose
   solve lands strictly past the key and is not an option; `cheap_bound_check` confirms that the
   cheapest stem bound leaves at least one distractor on the key's side. If one bound from the stem
   strikes all three distractors, the item is broken however hard it looks.
5. **No free elimination with the stem visible.** Cover the work and ask: how many options remain
   legal? The graders look for exactly these, and a median of 2 struck drops the item: a range or
   sign bound off one printed equation; an option set closed under the asked operation; an
   adjacency tell ("greatest integer below", "strictly" with one adjacent pair in the set); the
   no-constraint answer killed by monotonicity; parity / integrality the stem forces; an option
   illegal for the asked quantity. **Do not list bounds you have already satisfied as if that were a
   check** - an author's declared bounds have never killed an option; the graders' undeclared ones
   have.
6. **Interior parity.** The two middle values have the same display form and complexity within one
   digit; the key is not the "cleaner" one; no two options sum to 1, 90, 180, 360 or 100; no
   shared-denominator structure singling out the key.
7. **Plug-back (alg26's largest drop class: 5 of 7).** A student tries the options in the natural
   order - ascending, or descending on a `greatest` ask - and checks each against the stem. If one
   routine check (a substitution, or a short value computed forward from the option) confirms the
   key at try 1 or 2, the item dies. **Every try-1-2 slot asks an aggregate**: a count over k values,
   integers or plans; a sum of several derived values; a difference between two derived values - a
   number that no printed relation accepts, so checking an option needs the whole solution. The part
   check refuses a try-1-2 item whose `ask` is not count / sum / difference, whose
   `plugback.substitutable` is not false, that lacks `plugback.aggregate_over`, or whose QUESTION
   sentence does not ask that aggregate (ASKWORD). "How many units of A are made in the best plan?"
   is a single value, not a count: a count ranges over a SET ("for how many values of k", "how many
   different plans"). Every try-1-2 item also goes to a cold probe that sees only your stem and
   options; if it confirms the key routinely, the item is returned once to be made
   non-substitutable (same slot, same ask, same rank) and, still confirmed, dropped.
   `substitutable: true` is allowed only where the key is at try 3 or 4, and then `verify` must
   return true for the key and false for the three distractors.
8. **No solved intermediate as a distractor.** No distractor may be a value from which the key
   follows through ONE printed relation (fill in `intermediate_check` for each).
9. **Cross-item.** No two of your items share a key value or a full setup triple; no two share
   (i)+(iii); no two share (i)+(ii). Vary the stem register (a bare equation or system, a table of
   values, a short real-world linear model) and never reuse another item's boilerplate. Off-by-one
   options next to the key: B at most 1 item, C at most 3, D at most 2. Non-integer-constant items:
   at most 2 in the whole batch - ask me before writing one.
10. **Medium is not the goal.** If an item can be finished by careful routine procedure, it will
    bank medium; it still counts for the bank but not for the hard route this batch exists for.
    Build every item around the decision point, then check it survives rules 4-7.

## Before you finish the run

Every part of this run prints `PART OK`. For each item answer in `self_audit.note`: "covering the
work, how many options remain legal from the stem alone?", for r1 / r4 items "could a student tell
from the stem which way the errors go, and does one bound strike all three?", for slots at natural
try 1-2 "could a student confirm an option against the stem in one routine step?", and for every
item "is the bypass option really what skipping THIS item's decision point gives?" If any answer is
bad, rewrite the item.

Reply with one line per item: id, slot, key, quantity asked, nearest live id, PART OK.
