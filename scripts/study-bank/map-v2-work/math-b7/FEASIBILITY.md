# map-v2 Math batch 7 (Number Systems): feasibility of the checker's mechanisms, 2026-10-29

Step 2 after `CHAIN-CHECK.md`. Each mechanism was searched for numbers whose NATURAL error set (each distractor a
named student error, computed) yields three distractors that pass the Number Systems construction rules in
`math-check.mjs`: FORM (every option in the key's surface form: same lowest-terms denominator for fractions; same
decimal places and last-digit class for decimals, and the same final digit when the key has two or more digits),
LONE, HUB (no x2/x3/x4/x1.5/x10 hub; the key in no ratio pair; the key no midpoint), RUN, PAIR, DPAIR, DSUM and
KEYPRINT. Tool: `search7.mjs` (core, reusing `../math-b6/feas-lib.mjs`) and `gen7.mjs <Dxx>` (one generator per
mechanism, with the error set listed in code). Read-only.

| id | checker verdict | result | why |
|---|---|---|---|
| D03 unit-fraction split, ask a+b | NEW | **not writable** | the key is a whole number; two-digit keys need every option to share the final digit, and single-digit keys collide with HUB/PAIR (e.g. 2/3 = 1/2 + 1/6: key 8, natural errors 12 (x1.5), 6 (differs by printed 2), 4 (x2)) |
| D05 count of factors > 1 | NEW | **not writable** | count answers: four small whole numbers of one parity class always form a HUB (2/4/6/8) or a RUN through the key (7/9/11); escaping needs counts up to ~18 |
| D06 add-across error distance | NEW | **not writable** | the true sum, the add-across value and their difference have different lowest-terms denominators, so no natural error shares the key's denominator (FORM) |
| D15 fraction closest to 1/2 | NEW | **not constructible** | the options are the fractions themselves, with different denominators: FORM refuses by construction (same for D08 and D25) |
| D16 area / side -> perimeter | NEW | **written, then dropped** | all construction checks pass (rank 3: 1 1/7, 4 1/7, 5 2/7, 8 1/7), but `math-check` refuses it as a near-duplicate of live **ISEE 5d6f2a16** (isee-math-s16, j = 0.688): "A square has a perimeter of 48 meters. A rectangular garden has the same area as the square, and the garden is 18 meters long. What is the perimeter of the garden?" That item runs area / side -> other side -> perimeter behind one extra front step, so under the chain rule (number type ignored) D16 is contained in a live item. The checker's NEW verdict missed it. Not reworded to slip under the threshold. Kept at `scratchpad/map-v2-math-b7-work/_dropped/N6-D16/` |
| D19 count of true statements | NEW | **not writable** | count answer (as D05) |
| D04 count of decimals > a fraction | BORDERLINE | **not writable** | count answer |
| D07 two-stage sharing | BORDERLINE | **not writable** | a/t, a/(t+p), tp/a, a/p: every natural error has a different denominator from a/(tp) (FORM) |
| D31 first hour below a threshold | BORDERLINE | **not writable** | whole-number hour key: final-digit FORM, HUB and RUN as D03 |
| **D33** x(-2) + 5, three presses | BORDERLINE (area risk) | **written, PART OK** | rank 3: -13, -1, 9, 41 (four presses; multiply three times then add once; drop the sign). Rule and direction differ from SAT prior SM27F-A05 (x(-2) + 3, two presses, backward) |
| D14 sum of exponents | BORDERLINE | **not writable** | small whole-number key, as D03 |
| D39 reciprocal pairing | BORDERLINE | **not writable** | a/b, b/a, 1, (a/b)^n: different denominators (FORM) |
| D21, D37 | BORDERLINE | **not constructible** | D21 is a count; D37's options are powers (2^20), not plain numbers |

## What this means

**One item, MB7-N7-01 (D33), is writable from this checker round, against +9 needed for a sixth MAP Math form.** The
binding constraint is not novelty but the Number Systems construction rules: 9 of the 10 NEW-or-least-shared chains
either answer with a small whole number or a count (FORM final digit, HUB, RUN), or produce errors whose denominators
differ from the key's. Batch 5's survivors used signed decimals and fractions built so that natural errors share the
key's form; the D33 shape (a signed rule iterated) is the kind that works.

**Recommendation for the next Number Systems round:** ask the mechanism author for candidates whose ANSWER is a signed
decimal or a fraction with a fixed denominator and whose natural errors keep that form (signed rules, operations on
same-denominator fractions, decimal place-value chains), and run `gen7.mjs`-style feasibility before the chain check,
so the checker vets only writable chains. Counts and whole-number keys under ~20 should not be drafted.

No gate was run and no prereg was written: a one-item batch gives the options-only bar no measurement (n = 1 moves the
margin 100 points), and the screen-plus-graders pipeline costs about ten agents for one item. MB7-N7-01 stays on disk at
`scratchpad/map-v2-math-b7-work/N7/items.json` (slot in `slots.json`) to be gated together with the next batch's items.
