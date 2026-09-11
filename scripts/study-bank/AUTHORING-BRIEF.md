# Standing authoring brief — read this before writing any item

Every rule here was paid for by a defect that reached the bank. The register
entry for each is in `REGISTER.md` §5. Follow the skill for your section
(`.claude/skills/bank-*`) for shape and pipeline; this file is the part that
does not change between sections.

## 0. Before you write anything

- `git status` and `ls` your target path. **Never overwrite a tracked file.**
  One agent silently overwrote a committed, already-banked batch.
- Work in a **private scratch directory** (`mktemp -d`), not the shared
  scratchpad. One agent's checker was overwritten mid-run by another's and
  printed a confident verdict about a batch that was not under test. It was
  caught because the item count was wrong — 90 against 72 — not because
  anything looked wrong.
- **Every checker you write asserts the identity of its input** — item count
  at minimum — and exits non-zero if it does not match. A check that cannot
  name the bytes it read must not return a number.

## 1. The rule that costs the most items

**No option may be eliminable by KIND or MAGNITUDE without doing the work.**

An options-only attack measured the live SAT Algebra bank at **40.4%**
solvable from four bare numbers, against 21.1% for a freshly graded batch.
Six of nineteen shipped items were cracked by all three solvers by one
mechanism every solver named unprompted:

> one distractor is an order-of-magnitude outlier, and the key is never it

Every option must be a legal answer to the question the stem asks. If the stem
fixes a sign, a range, a total, a unit or a part-of-whole, every option
respects it. Specific instances that have shipped:

- a percentage above 100 where a part of a whole is asked
- a count exceeding a stated sample
- a pre-tax price above the tax-inclusive total
- a diagonal shorter than its own side; an x-coordinate beyond the radius
- a negative where the quantity is a length, a count, or a sum of squares
- an option below a sum the stem prints on the page
- a value outside a range the stem already pins

**And the key must not be the kind-singleton.** If three distractors are
powers of two and the key is not, the key is named. "Never let the key be the
only option outside a family the distractors share."

## 2. Decidable option-set tells — all three are mechanical, run all three

**Derivational hub.** The key must not sit at the centre of a star of
distractors each one operation away. Derive every distractor from a DIFFERENT
wrong path. This defect once hit 98.3% of one cohort.

**Plurality intersection.** `node scripts/study-bank/check-plurality-key.mjs
<file>`. Decompose options into components; if exactly one option carries the
commonest value at every position, a solver voting component-by-component
names it without the stem. Measured live: fires on 60 items, lands on the key
on 39 — 65% against a 25% control. **A COMPLETE grid (each level in exactly
two of four) cannot fire and is the safe shape** — do not abandon grids,
complete them.

**Composite expressions encode their own givens.** An option set of the form
`a ± b·π` carries a cross-check between its own terms, so the figure's
dimensions are recoverable from the option list alone. One such item measured
100% solvable blind. Prefer bare numeric options; where a composite is
unavoidable, make sure no option is internally checkable against another.

## 2b. Order tells are unreachable; VALUE-SET tells are the real ones

Measured 2026-09-11, after four separate graders in one session each reported
an authored key-slot pattern as a batch-blocker, and all four were wrong.

**The assembler re-deals every `multiple_choice` item's choices on every
draw** (`shuffleDrawnChoices`, `src/lib/study/assemble.ts`), seeded per
session. 5,451 of the live bank's 6,107 items — **89.3%** — are re-dealt.
Only `arrange_words`, `speaking_*`, `writing_*`, `fill_in_blanks`,
`numeric_entry` and `quant_comparison` keep authored order, and none of those
is scored by picking among `choices`.

So sort every tell you find into two kinds before spending an hour on it.

**UNREACHABLE — a property of the ORDER.** Do not repair, do not report as a
blocker. Each of these was measured, not assumed:

    key always in slot B                 the slot is re-rolled every session
    key slots repeat in adjacent pairs   sat-geo-h2: 12 of 23 pairs matched in
                                         the file; over 400 real draws the mean
                                         is 5.19 against a 5.75 chance floor
    key breaks the others' ascending run act-math-v3-sp: 13 of 24 in the file;
                                         after the draw 17.0% vs 16.7% chance
    every 4-window a permutation; key longest; key-letter spread

**REACHABLE — a property of the VALUE SET.** A shuffle permutes options; it
does not change which values are present. Fix these:

    a three-term arithmetic or geometric run plus one outlier — the run names
      its own middle, and the outlier says which three are the run
    the key is the difference, sum or product of two other options
    an option restates a quantity the stem handed over
    an option lies outside a range the stem pins, or is the unrestricted total
    the derivational hub: one value generates the others in a single step

The first keeps landing, because it comes from building distractors as "key
plus or minus one step, plus a blunder value" — a natural and otherwise good
habit. The clean shapes, named independently by six solvers across three
batches: an **even-count** run with no middle, or a closed symmetric set
(sign x magnitude, a full reciprocal quartet, a complete cross-product) where
every option is the image of another.

Spend nothing on arranging authored option order. Spend it on the set.

## 3. Vary the load-bearing element

A rigid brief makes the answer predictable from the pattern ACROSS items
rather than from the content of any one. This has now happened **five times**,
and every letter and spread check passed each time.

- No template above about a fifth of the batch.
- The "report the intermediate value" distractor is fine — but it must
  sometimes BE the key. When it is never the key, "the answer is never the
  number I had two lines ago" is free. Make it the key on three or four items.
- Do not give every key the same rhetorical act, the same length class, or the
  same relation to the stem.
- If you adopt a fix consistently across several items, that consistency is
  itself readable. A recent repair made the field's stock answer a distractor
  on four items and installed a new shortcut doing it.

## 4. Distractors must be wrong by a NAMED path

State the path in the explanation. Then:

- **`distractor_solve`** (maths): a map from each wrong option's exact string
  to a JS body producing it. Read the block comment above `sandboxDistractors`
  in `math-bank-helper.mjs`. Derive from the named path, THEN compare. A
  mismatch is the finding, not something to force.
- **Its limit, and you must cover it by hand**: `distractor_solve` checks the
  value against the derivation and **cannot check the derivation against the
  PROSE**. Read all your rationales against their items. Three stale referents
  shipped past this gate in one batch — a rationale naming an expression that
  appears nowhere in its item.

## 5. Keys, letters, difficulty

- `correct_answer` must be character-identical to one entry of `choices`.
- Key letters even across slots. **Check all sliding windows of four, not just
  the aligned ones** — the aligned-only check is recorded as too weak. No
  window may be a complete permutation; no periodic sequence.
- Key magnitude rank spread too, and **decorrelated from letter** — leave most
  choice arrays unsorted. A flat letter histogram over a forced permutation
  reads perfect and hides the tell.
- **The control is 100/k, never a literal.** Five-choice items (SSAT, and SSAT
  only among the admissions tests) have a **20%** control. A hardcoded 25% on
  five-choice data handed batches five free points.
- **Difficulty: label honestly, and the grader's label is what banks.** An
  inflated label to save an item is the one thing that corrupts the run.
  `BANK_BAND=hard` rejects easy; `BANK_BAND=mixed` accepts it. Unless your
  brief says otherwise you are writing MIXED — real ACT, SSAT and ISEE forms
  open easy, and the SAT lower module is selected by asking for easy.
- Explanations quote option text, **never** "option B".

## 6. Passages, figures, sources

- **Cite paragraphs and quoted phrases, never line numbers.** Text reflows on
  a phone, so a line number is a lie.
- **Quote the minimal span, not the whole sentence.** Quoting `"sits"` keeps
  the subject's number hidden and all four verb forms live; quoting the whole
  sentence collapses the item to one legal option blind.
- **Figure items must NEED the figure.** A figure-blind attack found 80.6% of
  this bank's maths figures decorative. Cover your own graphic and try each
  item; report the count. Every number lives in the figure, none in the stem.
- **Render any figure you author and look at it.** Two SVG arcs drawn on the
  reflex side and four labels overflowing the viewBox were caught that way and
  by nothing else.
- **Cross-item leakage is real.** Items sharing a passage answer each other —
  removing that alone moved one attack score from 90% to 76%. Write each
  question so its options do not restate what a sibling's options assert, and
  NAME any pair where one helps answer another.
- **An item leaks when the options differ along the axis the stem names.**
  Hold all four in one frame so each is a legal answer and only the source
  discriminates. Recorded leaky strata: text structure 87.5%, cross-text
  75.0%, analogies 69.0%. Clean: words-in-context, bare numeric maths.
- **Subject-recall is a separate leak from option shape, and no option rewrite
  reaches it.** A key that is simply the standard true claim in its field is
  answerable with the source covered even when the option set is flawless.
  Prefer narrow, non-canonical subject matter.

## 7. Before you report

Run your section's verify. **Read the denominators, not the verdicts** — if
`scorable N` is not your item count, the checker never read your file and its
number describes something else. A rate over one item is the absence of a
measurement.

**Break-test exhaustively, not by sampling.** Promote every distractor to key
on every item and expect every one to be refused. A sampled break-test missed
a comparator that could not distinguish `x <= -3` from `x >= -3`, and two
rigged items passed a green 24/24.

**Then attack your own harness**: rig one item so it SHOULD survive promotion
and confirm the harness reports it. A run where everything fails proves
nothing.

Report honestly, including what you could not fix and why. A batch reported at
its true state is worth more than one reported clean — every number here is
going into a decision.
