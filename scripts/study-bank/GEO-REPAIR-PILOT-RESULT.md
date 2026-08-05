# Geometry stem repair — pilot of 12, 2026-08-05

**Hypothesis:** the figure-blind attack scored 100% on `rawsvg` geometry
items because the stems restate what the diagram shows. Delete the
duplicated numbers from the stem and the items should become
figure-dependent.

**Result: the hypothesis was right about the cause and wrong about the
cure. 100% -> 87.5%. Control is 25%.**

---

## The measurement

Same 12 items, same options, same key positions. ONLY the stem differs.
Average stem 117 chars -> 88. Nothing was written to the bank.

    before, solver 1   12/12 = 100.0%   +75.0   (claimed 12 of 12 solvable)
    after,  solver 1   10/12 =  83.3%   +58.3   (claimed  0 of 12 solvable)
    after,  solver 2   11/12 =  91.7%   +66.7   (claimed  8 of 12 solvable)
    AFTER MEAN                87.5%    +62.5

## The repair did exactly what it was meant to

After-solver 1, which was asked to solve from the stem:

> Not one of the 12 stems contains a single numeric value. Every stem is
> a bare "in the figure shown, what is X?" — all quantitative content
> lived in the removed diagram.

It then answered 0 of 12 by reasoning — **and scored 83.3%.**

## Why it did not matter: the OPTIONS leak

After-solver 2 was pointed at the option sets and reconstructed the
withheld figures from them:

> The distractors are all derived from the same hidden numbers by one
> wrong operation each, so the option set reconstructs the withheld
> figure. Find the assignment of hidden values under which every
> distractor becomes a named error; the survivor is the answer.

Worked cases from its report:

    #1  hypotenuse    17 = 5+12 (added legs), 10.91 = sqrt(12^2-5^2)
                      two distractors pin the legs at 5 and 12  -> 13
    #6  distance      100 = d^2, 5.29 = sqrt(8^2-6^2), 7 = (6+8)/2
                      all four options are functions of legs 6, 8 -> 10
    #9  altitude      7.5 is the ARITHMETIC mean where the answer is the
                      GEOMETRIC mean; 15 is their sum -> segments 3, 12 -> 6
    #8  tangent       9 = PB, 13 = PA+PB, 3 = PB-PT -> PT=6, PA=4 -> 5

Three distractors derived from the key's own inputs are a system of
equations with one solution. The wrong answers disclose the operands.

Second, smaller leak: **range-impossible options.** On #2, two of the
four choices for cos(C) exceed 1. That is a free 50/50 with no figure
and no reasoning.

## The two items that DON'T leak show the fix

- **#11** — distractors are an evenly spaced ladder 5-7-9-11 with no
  error structure. Solver 2: *"the best-behaved item in the set."*
- **#2** — leaks only half, and only because of the range violation.

So the rule is: **distractors should be plausible VALUES, not the
residue of the correct computation.** A ladder around the answer leaks
nothing. `sqrt(a^2-b^2)`, `a+b`, and "forgot the square root" each
announce `a` and `b`.

## What this licenses, and what it forbids

- **Do NOT apply the remaining 74 stem rewrites yet.** They would move
  the gate 100% -> ~87.5% while the actual leak sat untouched: 86 live
  items edited for 12.5 points. The 12 pilot rewrites are correct and
  worth keeping — they are NECESSARY — but they are not sufficient, and
  shipping them at scale now would look like progress without being it.
- The real repair for these items is the distractor sets.
- **This is the same defect as everywhere else.** Verbal bank +40.4,
  generator +68.1, geometry +62.5 after the stem fix — all three are
  "distractors authored from the key". Four surfaces, one cause. The
  human review was scoped to decide whether the TOEFL problem is leaky
  distractors or ambiguous keys; this is evidence for leaky distractors,
  from a completely different section of the bank.

## Method note

This was run WITHOUT touching the database, by rendering the proposed
stems into a blind file alongside the originals. That is why the
finding cost nothing to act on. Any future bank-wide rewrite should be
measured the same way — proposed text first, live rows only after the
number moves.
