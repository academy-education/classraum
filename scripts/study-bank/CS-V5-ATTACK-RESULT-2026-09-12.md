# SAT Craft & Structure v5 — options-only attack vs the live bank

Three solvers per file, source withheld, identical `{stem, options}` render,
candidate keys dealt flat 6/6/6/6.

| file | rate | confident subset | items decidable by the OPTION SET ALONE | mean legal options |
|---|---|---|---|---|
| **LIVE C&S** (what ships today) | **88.9%** (64/72) | **55 of 55** | **13 of 24** | 2.13 |
| **sat-cs-v5** (candidate) | **69.4%** (50/72) | 29 of 31 | **0 of 24** | 2.94 |

**Δ = −19.4 points.** The candidate is substantially less guessable than the
cohort it would join.

## Read the confident subset, not just the rate

The live control's solvers marked 55 picks confident and got **55 of 55**.
That is not a high score, it is determinism: they were not guessing well, they
were reading answers off the option sets. Two of the three returned
**byte-identical pick-strings**.

The strongest single number is the last column. **No item in the candidate is
decided by its option set alone. Thirteen of twenty-four live items are.**

## How the sequence went, stated plainly

The batch's own author attacked it, got 66.7%, measured that against a **25%
chance line**, and recommended not inserting. I ran this comparison afterwards
because I believed the bar was wrong.

That ordering deserves suspicion, so: the matched-live-control convention is
not something chosen today to rescue a batch. It is recorded in
`SAT-RW-ATTACK-RESULT-2026-09-04.md`, which measured live C&S at **100.0%**
(three solvers, byte-identical 24/24) and passed `sat-cs-hard-v3` at 58.3% as
a 41.7-point improvement, with the sentence: *"Holding it would have made the
bank worse, which has now nearly happened three times."* The control was drawn
fresh rather than reusing that number, from items with no prior attack row.

What I did NOT do, and should have: pre-register this comparison before
running it, the way the maths attack was pre-registered that morning.

## Two asymmetries recorded rather than smoothed over

- The live control's keys land 5/7/7/5, so a constant-letter solver scores
  29.2% there against exactly 25.0% on the candidate. The control has the
  slightly easier floor, which makes the gap conservative.
- Two of three live-control solvers returned identical pick-strings. On the
  maths run that was a NO VERDICT trigger for possible non-independence. Here
  it corroborates the 2026-09-04 finding rather than undermining it — the
  recorded live result was byte-identical 24/24 across three solvers — but it
  is the one number in this table I would want a fourth solver on.

## The candidate is not clean, and the solvers say where

All three named the same two defect families, and they want different fixes:

- **`act` mismatch** (items 4, 6, 8, 16): three options perform one rhetorical
  act and the key performs another. This is the axis-alignment leak and it is
  an authoring defect.
- **`knowledge` keys** (items 10, 11, 17, 23): the option set is well built —
  four parallel candidate confounds — and the key is simply the standard true
  claim in the field. A well-read solver answers without the passage. The fix
  is different: make the distractors equally true-sounding domain facts so the
  passage must adjudicate.

The four bare word-choice items (3, 12, 15, 21) drew "no signal at all" from
every solver, which is what a clean item looks like from this seat.
