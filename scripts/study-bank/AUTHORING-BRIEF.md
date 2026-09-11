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

## 2c. The cure for a cross-item tell must not itself be a uniform rule

Measured 2026-09-11, and it cost a whole 30-item batch.

Subject recall is the dominant leak on prose-reading families (§6), and the
prescribed cure was: choose subjects whose central claim is NOT a transferable
principle — a local dispute, a contingent outcome, something a well-read solver
cannot predict. `isee-reading-s6` did exactly that, on five invented subjects,
and scored **80.0% blind against a 25.0% control — WORSE than the batch it was
written to improve on (63.3%).**

Six independent solvers, one per split file, converged on a mechanism none was
told about: **the key is the option that declines to adjudicate.** "print both
answers", "her refusal to name one of three causes", "can still only report",
"has outlasted both of the things that might have decided it" — against
distractors reading as verdicts a careful passage would not reach.

That prior is a DIRECT CONSEQUENCE of the cure. If every passage's central
claim is a non-resolution, then "pick the non-resolving option" names the key
across the whole batch. The stratum split shows it exactly:

    inference     7/7  = 100%      the three strata where the passage's
    main idea     5/5  = 100%      stance IS the answer: 14/14
    attitude      2/2  = 100%
    vocabulary    4/5
    detail        6/11 = 54.5%     the only stratum near usable

**So the rule is one level up from the cure: vary the KIND of central claim.**
Some passages must resolve, some must not; some must reach a verdict the
evidence supports, some must decline. A batch in which every passage declines
is as predictable as a batch in which every key is the hedged option — the
same defect wearing the opposite costume.

This is §3 ("vary the load-bearing element") applied to the SUBJECT rather
than to the option set, and it is the case where the two collide: the fix for
one leak was itself a rigid brief. When a cure is a rule you apply to every
item, ask what a solver who knows the rule can do with it.

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
- **Key LETTERS: do nothing.** This bullet used to ask for an even spread and
  for all sliding windows of four to be checked. **§2b supersedes that** — the
  assembler re-deals every `multiple_choice` item's choices on every draw, so
  the authored letter carries nothing to any student, and four graders in one
  session wasted their reports calling an authored letter pattern a blocker.
  If you are authoring one of the types that KEEPS its order
  (`arrange_words`, `speaking_*`, `writing_*`, `fill_in_blanks`,
  `numeric_entry`, `quant_comparison`) the old advice still applies — but none
  of those is scored by picking among `choices`, so it almost never will.
- **And when you test it, the null is the BANK, not 50/50.** A grader today
  reported the interior-key tell on a batch at 18 of 24 with **p = 0.011**,
  which is true against a uniform prior and is the wrong question. Against the
  live maths bank's own 64.8% the same 18 of 24 gives **p = 0.205** — not
  distinguishable from the cohort it would join. The 50/50 null asks whether a
  batch differs from a coin flip; the only question that decides anything is
  whether it is worse than the bank. A literal null is wrong in the ALARMING
  direction on every maths batch anyone will ever grade, because distractors
  built from named error paths overshoot more often than they undershoot.
- **Key MAGNITUDE rank still matters**, because it is a property of the value
  set and survives the shuffle. Read it against the live bank's own baseline,
  not against zero: across 1,499 four-choice maths items the key sits at ranks
  18.1 / 33.1 / 31.7 / 17.1, so "always eliminate the largest" is worth **+2.6
  points** bank-wide and your batch is only interesting if it is well past
  that. The middle-heaviness is inherent to building distractors from named
  error paths — wrong arithmetic overshoots more often than it undershoots —
  and flattening it by inventing pathless distractors is a worse trade.
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

## 6b. The passage-group field is `topic_id`, and getting it wrong is silent

A reading batch groups its items into passages with **`topic_id`**, never
`passage_group_id`. The inserter does the mapping itself:

    // verbal-bank-helper.mjs — grep for `raw.topic_id`, do not trust a line
    // number: adding the gate to that file on 2026-09-11 shifted 113,126 to
    // 146,159, and a reading author caught the stale cite the same day.
    passage_group_id: raw.topic_id ? `rw-${raw.topic_id}` : null

So a batch file that writes `passage_group_id` directly lands **every row with
`passage_group_id = NULL`**. Nothing errors. The items insert, `bank-state`
counts them as drawable, and then the assembler drops each one: `groupKeyOf`
turns a null group id into `'__solo:' + id`, every item becomes a singleton
set, and a singleton is not a passage. You get rows you have paid for and no
student can ever be served.

**This is written down because the instruction that went out was wrong.** On
2026-09-11 two reading authors were briefed to use `passage_group_id`. One
followed the brief; one read `verbal-bank-helper.mjs` first, found the
mapping, used `topic_id`, and said so. Neither the brief nor the RUNBOOK
mentioned the field at all, which is why the wrong name survived being
written down.

Copy the field set from the nearest existing batch in your family and diff
against it — `isee-reading-s9.batch.json` and `ssat-reading-s10.batch.json`
are the reference shapes. **When a brief and the code disagree, the code is
what runs.** Check it and say so, the way that author did.

There are 163 live TOEFL Daily Life items sitting at `passage_group_id =
NULL` for this reason, out of 232 that are undrawable. That is the cost of
this defect, already paid once.

## 3b. Hard is an INTERACTION, and stem order can dissolve it

Four consecutive maths batches have been commissioned hard or with a hard
quota and graded at 0, 0, 1 and 4 hard by three independent graders each.
The authors were not aiming low. Two separate graders, on two different
batches, reached the same diagnosis independently:

> the batch names a hard structure and then orders the stem so the student
> never has to see it

The worked example is exact. `AM7I-19` is *"a rate that changes partway"* —
this brief's own example of a hard structure — and all three graders called
it medium, because the stem hands over the legs in order, so it decomposes
into three one-line steps. `AM7I-10` is average speed over two legs and all
three called it hard, because the student has to **reject** averaging the
rates and nothing in the stem says so. **The difference between them is one
sentence of scaffolding.**

So the test is not "does this item contain two ideas". It is:

- Can the student reach the answer by executing the stem's own sentences in
  the order they are written? Then it is medium, however long the working.
- Must the student notice something the stem does not say — that rates do not
  average, that the added ingredient moves the denominator too, that the
  floor of the budget bound is not the answer because the weeks must divide?
  Then it is hard.

An inequality is not a second idea when the boundary value **is** the answer;
a grader called that one "decorative" and they were right. A percentage of a
percentage taken in the stated order is one multiplication twice.

**And do not reach for difficulty by adding steps to a habit.** The same
graders counted 15 to 25 of 28 items sitting on four to seven templates, and
the damage is specific: on one batch a single learned line (`sum = mean x n`,
subtract the known part) answered five items *including one of the four
graded hard*. A prepared student meets that batch with less difficulty than
the histogram claims. If one hard item is wanted from a family, replace the
other members rather than making that one longer.

## 3c-bis. No two options may be answers to the same question

On a SYNONYM item, no two options may be synonyms of each other. On an
ANALOGY item, no two option pairs may stand in the same relation.

If two options are both correct, neither can be the key, and a solver who
spots it eliminates both with the headword still covered. Two options-only
solvers found this independently on the same item:

    SV13-29   somber / shrewd / fickle / modest / humble

`modest` and `humble` are mutual synonyms. That is 2 of 5 gone for free, and
the item drops to a one-in-three with nothing read.

**No checker covers this.** `check-equivalent-options.mjs` compares VALUES —
it was built for `3 : 5` against `6 : 10` on a maths item — and it reports
"no two options share a value" here, which is true and beside the point.
Deciding semantic equivalence needs a thesaurus the repo does not have, so
this is an authoring rule and a reading task, not a gate. Check it by hand
before you report, the way both solvers did.

The analogy half of the rule is why the balanced incidence design in
`ssat-verbal-s13` uses five DISTINCT relation families per item: if two
options shared a family, both would answer the stem equally.

## 3d. Report the template census under a STATED rule, or it is not a number

Report the census. Do NOT report a bare count — state the grouping rule first,
and give it at two strictnesses.

This is here because the metric was nearly thrown away. On `act-math-v8-fn`
three graders were asked for a census with no rule specified and returned
**15, 21 and 18 of 28**, with largest groups of 3, 5 and 6, and they disagreed
about whether a hard item was templated. That looks like an unusable metric.

On the very next batch three graders each **stated their rule before counting**
and returned:

        grader   strict        loose
        a        9 of 28       22 of 28
        b        6 of 28       22 of 28
        c        6 of 28       22 of 28

**All three landed on exactly 22 at the loose reading.** The earlier spread was
not grader noise, it was three people silently choosing different units.

Use these two, and report both:

- **STRICT** — three or more items where one rehearsed procedure, statable in a
  single sentence with only the numbers changing, produces the answer, AND no
  item in the group needs a step outside that sentence.
- **LOOSE** — same topic and the same single recalled fact, with the procedure
  allowed to vary.

The gap between them is informative rather than embarrassing. One grader put it
exactly right: a batch built one item per canonical skill *"templates heavily at
topic level and barely at move level"*, so a 6-versus-22 spread is a fact about
the batch's construction, not a disagreement about its items.

**The contested question — is a HARD item templated? — must be answered under
both rules**, because that is where graders actually diverge: an item that uses
a habit as an inner step but wraps it in something else is templated under the
loose rule and not under the strict one. Two graders noted that the wrapping is
exactly what makes such an item hard.

## 3e. Measure the null before reporting any options-only channel

A raw count is not a finding. Resample each item's options from that item's own
observed range (20k+ draws) and compare.

Every solver on the last two maths batches did this unprompted and it changed
the verdict every time:

        channel                 observed   expected     reported as
        geometric run middle      4 of 25   0.17-0.31    REAL, p ~ 4e-5
        key = product of two      2 of 25   0.13-0.34    REAL, p ~ 1e-2
        arithmetic run middle     4-5       2.5-3.0      NOISE
        pair sums to a constant   3         1.8-1.9      NOISE

Three pairs summing to 90 or 360 and five arithmetic runs would each have read
as a finding on a raw count. Both are what 25 four-value sets produce by
accident. One solver added a domain check on top: Number and Quantity supplies
no angle or percentage constant, so a 90-sum there is meaningless whatever its
p-value — **the configuration has to make the constant mean something.**

An author claiming "I built N of these deliberately" is not evidence either.
Three solvers tested exactly such a claim, found the author's count correct and
the channel still at its noise floor, and declined to bet in either direction.

## 3c. A 2x2 option grid protects an item only when BOTH axes are arbitrary

The grid is recommended above and it works — but two options-only solvers
independently and **confidently** solved these with no stem, and both were
right:

    t = s/(2a)  |  t = sqrt(2s/a)  |  t = sqrt(s/(2a))  |  t = 2s/a
    b1 = A/h + b2 | b1 = 2A/h - b2 | b1 = 2A/h + b2 | b1 = A/h - b2

Both are perfect 2x2 grids. Neither is protected, because the letters are not
placeholders: `s`, `a`, `t` say kinematics, `A`, `h`, `b1`, `b2` say
trapezoid. The option set **is** the formula, and the correct rearrangement
follows from recognising it. One axis of each grid is not a formatting flip
but correct-versus-incorrect algebra over a relation the reader can name.

For a literal-equation or rearrangement item, either use generic unknowns
(`x`, `y`, `z`) or build it on a relation that is not standard. `check-formula-options.mjs`
finds the shape; it cannot decide whether a reader knows the formula, so read
a hit as a question and answer it per item. The live bank has **zero** of
these, so this is a rule for the next batch rather than a backlog.

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
