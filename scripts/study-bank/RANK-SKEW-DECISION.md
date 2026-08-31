# Key rank skew — measured, and deliberately NOT repaired

**2026-09-01.** `check-key-rank-spread.mjs` flags four cohorts as
EXPOSED: rank-skewed *and* printed in ascending order, so their option
LETTER is their magnitude RANK.

    isee-math-s3   n=25  ranks 2/9/10/4      worst -17.0   asc 68%
    ssat-math-s2   n=46  ranks 3/15/15/11/2  worst -15.7   asc 65%
    isee-math-s4   n=38  ranks 9/15/8/6      worst +14.5   asc 97%
    sat/math-v4    n=55  ranks 8/18/21/8     worst +13.2   asc 76%

Flattening them by authoring means roughly **42 new items written to hit
a specific magnitude rank** — 5 at rank 1 here, 8 at rank 5 there.

## The decision: do not author those 42 items

Three reasons, in order of weight.

**1. The repair is the risk.** CLAUDE.md records this exactly once and it
applies here without modification: *"the rewrite itself would have been
the risk, since every touched item is a chance to introduce a new tell."*
Items authored to put the key at an extreme are items whose distractors
all sit on ONE SIDE of the answer. That is a cross-item tell of the
kind the register already documents three times — a batch built to one
brief develops a shape, and the shape is guessable even when every
individual item is sound. We would be trading a tell the shuffle already
neutralises for a tell nothing checks.

**2. The skew is a property of good distractors, not a defect.** A
well-built maths item brackets the answer: one distractor from
over-applying the operation, one from under-applying it. The key lands
in the middle BY CONSTRUCTION. Every one of the 13 measured cohorts is
middle-heavy, including SAT v2 at n=710 — that is not 13 authors making
the same mistake, it is what competent item-writing produces. Forcing a
flat distribution means forcing keys to the extremes, which means worse
distractors.

**3. The exposure is a CONJUNCTION and we already broke the other half.**
Rank only becomes a letter tell if options are served in magnitude order.
`shuffleDrawnChoices` reorders every multiple-choice item at serve time,
and as of 2026-09-01 that is covered by
`choice-shuffle-is-load-bearing.test.ts`, break-tested both ways. The
defence is live, cheap, and does not touch a single item.

## What was done instead

Nothing to the existing items. The guard is the shuffle test, which
fails loudly if anyone removes the reordering or preserves source order
"for fidelity" — and real SSAT and ISEE *do* print numeric options
ascending, so that argument will be made eventually.

## What would change this decision

- **A student-facing path that serves stored order.** Any export, print
  view, or offline mode that bypasses `shuffleDrawnChoices` reinstates
  the tell immediately. There is no such path today; if one is added,
  this decision is void and the shuffle must be applied there too.
- **A NEW cohort authored ascending and skewed.** The four here are
  historic. `isee-math-s5` (n=36, worst -2.8) shows a cohort authored
  with rank balance from the start is flat without contortion — so the
  cheap intervention is at AUTHORING time, not repair time.
- **Evidence that middle-heaviness leaks through the shuffle.** It
  should not: the shuffle is seeded per item and independent of rank.
  If a blind attack ever ranks these four cohorts above their siblings,
  this reasoning is wrong and the measurement wins.

## What this is NOT

Not a claim the four cohorts are clean. It is a claim that THIS defect
is contained by an existing guard, and that the obvious repair costs
more than it buys. The blind attack remains the gate; a structural
proxy — and this is the ninth — never stands in for it.
