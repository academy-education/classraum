# Confirmation run — 24 fresh items, 2026-08-06

**The pilot's 25.0% did not reproduce. 100% -> 37.5%, and the residual
leak is real.**

This run existed to decide whether to apply the recipe to 62 more items.
The answer is not yet.

---

## Numbers

24 rawsvg geometry items, none overlapping the 12-item pilot. Both
repairs applied (stem + same-family distractors). Key letters dealt
flat, control exactly 25.0%. Nothing written to the bank.

    baseline (figure withheld, items as they ship)   24/24  100.0%
      -- zero guesses; 13 of 24 are scaled triples

    after both repairs
      solver A  reasoner     9/24   37.5%   claimed solvable 0
      solver B  eliminator   7/24   29.2%   claimed solvable 8
      solver C  content     11/24   45.8%   claimed solvable 3
      MEAN                          37.5%   margin +12.5

Chance band at n=24 is 25.0% +/- 8.8 (1sd), i.e. 16.2%-33.8%. The mean
sits outside it. The pilot's 25.0% (n=12, two solvers) was inside its
own much wider band and should not have been read as precisely as it
was.

## What the recipe DID close

Every attack that beat rounds 1 and 2 failed here. Solver B:

> In the nine right-triangle items, every option is a legitimate
> Pythagorean-triple member... no set contains an internally consistent
> a^2+b^2=c^2 among three of its own options except item 1. So the
> classic "recover the hidden inputs from the distractors" attack fails
> on the triangle items.

Sixteen of 24 gave it nothing at all.

## What leaked, and it is specific

**Fixable by better distractor choice (6 items):**
- **Unhalved central angle** (3, 4). One option has its own double in
  the set: {45, 90}, {15, 30}. The "forgot to halve" distractor names
  the key.
- **Leg of the key's own triple** (5, 18, and weakly 8, 1). A figure
  value echoed as a distractor: 30 is a leg of 16-30-34, so 34 is the
  key. Solver B's prescription: choose distractors that are not legs of
  the key's own triangle.
- **Line items** (14, 19): three distractors are functions of the same
  hidden m and b, so 6m+b is recoverable.

**New tell, not previously named:**
- **The vertex label discloses the answer's SIZE CLASS.** "Length of AB"
  items carry leg-sized options; "length of AC" items carry
  hypotenuse-sized options. A solver knows whether it is being asked for
  a leg or a hypotenuse before seeing the figure, which halves the
  search space.

**NOT fixable by packaging — the frequency prior.** Solver C:

> All 3 trig items offer four legitimate triple ratios. I fell back to
> the prior "SAT figures are usually 3-4-5," which is a frequency
> guess, not a determination.

It claimed 3 of 24 solvable and scored 11. Making every option a
legitimate triple member does not help when 3-4-5 appears in real items
far more often than 28-45-53. This is the sixth instance of the one
failure: whatever is uniform across the batch becomes the answer. The
only fix is non-canonical figure values.

## Two item-level defects found in passing

- **Item 24 may be arithmetically wrong.** No pair of {3, 11, 17, 28}
  satisfies r^2 - h^2 = a perfect square, so unlike every other chord
  item its figure values are not recoverable at all. Check the source.
- **2739e126's SVG aria-label spells out both leg lengths in prose.**
  The blind harness renders stem + options only, so the measurement is
  unaffected — but a screen-reader user is still handed the numbers the
  stem repair removed. The repair is incomplete for that surface.
  Sweep all 86 for it.

## Decision

Do NOT roll out to the remaining 62. The recipe is a large, real
improvement (100% -> 37.5%) with a named, mostly-fixable residual. The
next iteration is cheap and targeted:
  1. no distractor may be a leg of the key's own triple
  2. no distractor may be the un-halved / un-doubled form of the key
  3. option size class must not track the vertex label
  4. for the frequency prior: change the figures' numbers

Then re-measure. Three of five rounds so far have been negative, each
costing one agent batch instead of a bank-wide rewrite.

## Method note recorded against myself

The render's key-rank check reported 9/4/5/6 and an "always smallest"
strategy scoring 37.5% — a positional tell that does not exist. Its
parser did `replace(/[^0-9.-]/g,'')`, which turns "4/5" into 45 and
"sqrt29" into 29. The authoring agent's own 6/6/6/6 was correct. A
measuring instrument that mis-parses its input invents defects as
readily as it hides them; the checker is now fraction- and
radical-aware.
