# Same-family distractors — round 3, 2026-08-06

**Result: 100% -> 25.0%, exactly the control. The first repair in this
project that has reached its target.**

Read the caveats before acting on it. n=12.

---

## The four conditions, same 12 items, same key slots

Key LETTERS were held identical across every render, so the fixed-slot
control is 25.0% in all four and only the text varies. Nothing was
written to the bank in any round.

| round | distractor rule | scores | mean | margin |
|---|---|---|---|---|
| — | original | 12/12 | 100.0% | +75.0 |
| 1 | stem repaired only | 10/12, 11/12 | 87.5% | +62.5 |
| 2 | neutral ladders | 10/12, 8/12 | 75.0% | +50.0 |
| **3** | **same-family** | **2/12, 4/12** | **25.0%** | **+0.0** |

Reference: official ETS reply items sit at +25.5. This is +0.0.

## The rule that worked

Round 2 made distractors NEUTRAL and left the key as the only
recognisable value — a solver scored 83.3% by "picking the
Pythagorean-looking number" while marking zero items solvable.

Round 3 made them EQUALLY CANONICAL: every option as plausible an
answer as the key. On item 4 the options became 45/50/55/65 with the key
at 50 — the key sits INSIDE the ladder and a plausible outlier (65,
hypotenuse of four triples) sits outside it. Both solvers picked 65.
The heuristic that beat rounds 1 and 2 now misfires.

## THE CAVEATS. Read these before rolling anything out.

**1. The solvers' explanations are not evidence, in either direction.**
Solver 2 marked 8 of 12 solvable and scored 4/12. It produced a long,
specific, entirely plausible analysis — shared distractor pools, exotic
values, ladder-plus-outlier, feasibility filters — and its accuracy was
chance. Solver 1 did the same and scored below chance.

Had the scores been high, those narratives would have read as damning
mechanism. They are post-hoc rationalisation. The lesson cuts both
ways: do not credit a solver's story when it is wrong, and do not
credit it when it is right either — only the score is evidence.

**2. n=12, two solvers.** 2/12 and 4/12 are both consistent with chance,
and so is a genuine repair. Exactly hitting 25.0% is a coincidence of
averaging. This needs a confirmation run at 24+ items with three
solvers before it justifies touching 74 more items.

**3. One real artefact survives, verified by inspection rather than by
solver claim.** Items 5, 6 and 10 draw their options from exactly the
same pool {10, 13, 15} plus one varying element. That is a batch-level
regularity and it lets a solver reason across items.

It does NOT currently leak: the keys are 5, 10 and 13, so two of the
three sit inside the shared pool and "the odd one out is the key" fails
on 2 of 3. But it is one re-key away from becoming tell number six, and
it should be fixed as hygiene. **Never let the stock value list repeat
verbatim across items of the same type.**

## The structural finding, which is independent of the score

The author could satisfy both rules — same-family AND non-disclosing —
on 7 of 12. On 4 more, rule 5 (vary the key's rank) had to give way,
and the reason is not authoring quality:

> Triple hypotenuses go 5, 10, 13, 15, 17, 20, 25... there are
> essentially no members below 13, and the ones that exist are the legs
> themselves or a double/half of them, i.e. exactly round 1's
> disclosure. So any item whose answer is a small triple hypotenuse can
> only put its key at rank 1 or 2.

**That is a property of the numbers in the diagram, not of the
packaging.** A 3-4-5 triangle cannot host a fully non-guessable option
set; a 20-21-29 can. Item 03932ff4 (key 50) shows the inverse — a large
key has 45/55/65 available and both rules fall out for free.

Consequence: for small-integer Pythagorean items the fix is to change
the FIGURE's numbers, not the options. That is a change to the items
themselves, and it is also the only route that defeats a student who has
memorised the triples.

## Method note

Four conditions measured on proposed text with zero database writes.
Three of the four were negative results, each costing one agent batch
instead of a bank-wide rewrite. The one that worked is a candidate, not
a conclusion, until it survives a larger run.
