# Item pipeline — author → QC → bank

The mandatory sequence for getting any multiple-choice item into
`study_item_bank`. Written 2026-08-01 after a bank-wide audit found every
verbal task type 92.7-100% solvable with the source hidden, and after a
24-item pilot built to fix that grew four *new* tells instead.

## Why this file exists

The problem has never been that people skip QC. It is that QC has no
mechanism. As of today the ONLY gates between an authored item and the bank
are the four inside `insertListening()`:

    1. listeningShapeOk            — JSON shape / task field present
    2. explanationIsOrderSafe      — explanation does not leak option order
    3. group size >= 2
    4. keep.has(id)                — the id appears in a hand-made keep file

Nothing checks whether the item is answerable, how hard it is, or whether it
can be solved without the source. Gate 4 is a bare list of ids with no
binding to content, so an item can be edited after review and still insert.

Every failure recorded in CLAUDE.md — slot-A 73%, ABCD permutations,
identical key prose, key-is-longest, em dash, and now the 94.3% no-source
result — passed all four of those gates.

A document telling authors to be careful will not fix this. The 2026-08-01
pilot proves it: the authors followed the new constraint, and the batch came
out with zero hard items, one unanswerable item, a 6/6 slot-A run, a uniform
key shape in one sub-batch, and an 83% length-extremity tell.

So the fix is structural: **numbered stages, each producing an artifact
bound to a content hash, and an insert step that refuses without them.**

---

## First: the gates are NOT the same for every task type

The first draft of this file was a verbal-multiple-choice pipeline labelled
as universal. That is the failure CLAUDE.md already records under "a
convention from one skill silently applies to the other" — the one that put
Writing's zero-conditions into the Speaking rubric.

Four of the eleven TOEFL task types have no options at all, so "hide the
source and see if a solver can still pick the key" is not a sentence that
parses for them. The stages below are a SPINE; stages 3-6 take a different
form per family.

**Family A — MC, source is separate and hideable**
`choose_response` (standalone, audio) · `conversation` · `announcement` ·
`academic_talk` (set-based, audio) · `daily_life` · `academic_passage`
(set-based, text) · all SAT `reading_writing`

Full treatment: no-source attack + elimination gate. Set-based ones MUST
render with set grouping preserved — four questions from one recording let a
solver rebuild it from the distractors, and a standalone render cannot see
that.

**Family B — MC, the STEM is the source**  ·  all SAT `math`

Nothing to hide but the question itself. The attack is options-only: strip
the stem entirely and see whether four numbers give the answer away. Chance
is the honest expectation, so ANY margin is a defect. Add the derivational
hub check (`verify-math-hub.ts`) — distractors generated FROM the key by
predictable slips make the key the unique centre. Do not run the verbal
tell checks here: maths options contain no hedges or absolutes, so those
scripts read "clean" no matter what.

**Family C — cloze**  ·  `fill_in_blanks` (Complete the Words)

Ten scored blanks per row, first letters given, no options. Guessability
means: can the blank be filled from the letter stub and sentence frame alone,
without the passage? The attack is "give the stub + local sentence, withhold
the passage". Batch tells are about stub length and answer frequency, not
key position — there are no positions.

**Family D — production, no key**
`speaking_repeat` · `speaking_interview` · `arrange_words` (Build a
Sentence) · `writing_email` · `writing_discussion`

There is no key to leak, so stages 4 and 5 do not exist. The failure modes
are different and each needs its own checks:

- `speaking_repeat` — already the best-gated type in the codebase:
  word-count band, no scaffolding prefix that would be read aloud,
  `passage === correct_answer`. Keep those; they are the model.
- `arrange_words` — the real risk is MORE THAN ONE grammatical ordering.
  Gate: an independent solver orders the words; any second valid ordering
  fails the item.
- `speaking_interview`, `writing_email`, `writing_discussion` — no key at
  all. The risk is an ambiguous or unanswerable PROMPT, and a rubric that
  does not discriminate. Gate: three independent responses at different
  target bands, graded blind; if the rubric cannot separate them, the prompt
  or the rubric is broken. Rubric fidelity is pinned separately by
  `rubric-fidelity.test.ts` — and note that Speaking and Writing have
  SEPARATE official ETS guides that disagree with each other.

**Applicability matrix**

| stage | A | B | C | D |
|---|---|---|---|---|
| 0 spec           | yes | yes | yes | yes |
| 1 author         | yes | yes | yes | yes |
| 2 shape          | yes | yes | yes | yes |
| 3 with-source    | yes | yes | yes | adapted: can a competent responder satisfy the prompt |
| 4 no-source      | yes | options-only | stub-only | n/a |
| 5 elimination    | yes | yes | n/a | n/a |
| 6 batch tells    | yes | hub + spread | stub/frequency | prompt & scenario diversity |
| 7 insert         | yes | yes | yes | yes |

Stages 0, 1, 2 and 7 are genuinely universal. **Stage 7's hash binding is the
part that must never be family-specific** — whatever gates a family requires,
insert refuses unless that family's full set recorded a pass for that exact
content hash.

---

## Stage 0 — SPEC (before a word is authored)

Write `spec.json` for the batch:

    { "task": "choose_response", "n": 60,
      "difficultyMix": { "easy": 0.05, "medium": 0.75, "hard": 0.20 },
      "emphases": ["constraint-tracking","numeric","pragmatic-force","condition"],
      "maxPerEmphasis": 0.34,
      "bannedScenarios": [ ...scenarios already heavy in the bank... ] }

`difficultyMix` is READ FROM THE BANK, not chosen. Query the live
distribution for that task and match it. The pilot hardcoded `"medium"` in
the prompt and produced 0 hard items against a bank standard of 20%.

`maxPerEmphasis` is load-bearing. One sub-batch authored to a single
emphasis develops a uniform key shape — pilot-3's six keys were all "the
cooperative option echoing the stated problem", solvable 6/6 without
listening. No emphasis may exceed a third of the batch.

## Stage 1 — AUTHOR

Sub-batches, one per emphasis, each written against
`VERBAL-DISTRACTOR-CONSTRAINT.md`. Authors run the self-test in that file.

Output: `batch-<id>-raw.json`. Compute and record `sha256` of this file.
Every downstream artifact carries that hash.

## Stage 2 — SHAPE (mechanical, no model)

Existing checks — shape, order-safe explanation, group size — plus:
4 distinct options, key present verbatim in choices, no duplicate stems
across the batch, no scenario in `bannedScenarios`.

Artifact: `qc-shape.json` `{ sha, pass, failures: [] }`

## Stage 3 — WITH-SOURCE SOLVE  (3 solvers, source VISIBLE)

The half that was missing all along. Ask: is this answerable, and is it hard
enough? Solvers see the transcript/passage and report pick, confidence,
difficulty, and any problem.

PASS requires ALL of:
- key agreement >= 95% across solvers (below that, items are mis-keyed)
- ZERO items where any solver names two defensible answers
- difficulty distribution within +/-10pts of `spec.difficultyMix`
- no item rated `trivial`
- **construct validity**: the item tests the skill the task claims to test
- **independent-fact count**: how many separate catches take a student from
  4 options to 1

The last two came out of the 2026-08-01 pilot audit and neither was on the
original list.

*Construct*: four pilot items turned out to be arithmetic word problems
wearing a pragmatics frame — the reply was decided by 60/40 or 9th-to-23rd,
and the conversation was decoration. They are unguessable, appropriately
hard, and measuring the wrong thing. Ask per item: if a student did the
calculation and ignored the exchange, would they still get it right?

*Independent facts*: 16 of 24 pilot items needed only ONE fact, because all
three distractors failed on the same proposition — catch it once, eliminate
three. Target a majority at 2+. Also check the facts are genuinely
independent: item 6's "the doctor is Mondays, the NP any day" states two
halves that entail each other, so a 2x2 is really a 1x2.

The 156 items rejected in July failed the second condition. The 2026-08-01
pilot failed the third (0 hard vs 20% target) and had one item with two
defensible answers.

Artifact: `qc-withsource.json`

## Stage 4 — NO-SOURCE ATTACK  (3 solvers, source HIDDEN)

Render blind: strip transcript/passage, KEEP the stem, shuffle options,
preserve set grouping. Protocol and traps in `ANSWERABILITY-GATE.md`.

PASS requires BOTH:
- mean accuracy <= this batch's OWN best fixed-letter control (never 25%)
- solver pick spreads DIFFER from one another

Identical spreads across independent solvers is the signature of a
deterministic tell; it is what every failing task type showed and what
sound maths did not.

Artifact: `qc-nosource.json`

## Stage 5 — ELIMINATION  (1 reader, source hidden)

Per item: which option would you reject first, why, are you certain, and how
many options are confidently rejectable without the source.

PASS: zero items with any confidently rejectable option.

Cheaper and more diagnostic than stage 4 — it fires before guessability
reaches 94% and names WHICH option to rewrite. Run it during authoring too,
not only at the gate.

Artifact: `qc-elimination.json`

## Stage 6 — BATCH TELLS (mechanical, no model)

Per-item checks cannot see these. All measured against chance, on the batch:

- key position spread (chance 25% each)
- key is longest / shortest / **at either extreme** (chance 50% for extreme —
  the pilot hit 83%)
- key first-word vs distractor first-word distribution
- hedge / absolute asymmetry (`verify-answerability.ts`)
- derivational hub, maths only (`verify-math-hub.ts`)
- cross-item leakage: no distractor may state another item's key fact
- key-shape uniformity: sample keys and ask a reader to describe the
  correct-answer shape. If they can, the batch has a semantic tell.

PASS: every measure within tolerance of chance.

Artifact: `qc-tells.json`

## Stage 7 — INSERT

`insertListening()` gains one new gate, and it is the load-bearing one:

    Recompute sha256 of the item file. Refuse to insert unless
    qc-shape / qc-withsource / qc-nosource / qc-elimination / qc-tells
    all exist, all record pass=true, and all carry THAT EXACT hash.

Hash binding is what stops "edited after QC". A keep-list of ids cannot.

---

## Rules that apply to every stage

**A gate is evidence only if it can fail.** Before trusting a new checker,
feed it a synthetic batch that must fail and one that must pass. Do this in
an isolated directory — writing synthetic files to real output paths means a
solver that dies silently gets scored as your fake 100%.

**A solver's score is evidence; its explanation is a hypothesis.** Three
solvers described a "stilted legalese" distractor class as ubiquitous. It
was 9 of 284 options. Count before you act on a narrative.

**Ask solvers what they noticed about the FILE.** Both ablation builds had
construction bugs and the solvers found both, not the author.

**Query the field the draw reads** — `item->>'listeningTask'` /
`readingTask`, never `domain`. They disagree. Speaking/Writing/CtW rows have
no task field and are selected by `type`; that is correct, not a defect.

**When a defect query returns zero, prove it can return non-zero.**
`NULL NOT IN (...)` is NULL, and `LIKE '%___%'` matches everything. Both
shipped clean-looking results today.

**No mechanical script can replace stages 3-5.** A regex strategy scored
27-33% where solvers scored 92.7-100%, and passed a section measured at
99.2% guessable. Scripts measure named sub-symptoms only.

## The calibrated threshold (measured 2026-08-01, do not guess at this)

The first draft of this file set stage 4's bar at "mean at or below the
cohort's own fixed-letter control". **That bar is unreachable and it was
wrong.** 183 official items were pulled from ets.org and the College Board
question bank and run through the identical attack:

| cohort | mean | control | MARGIN |
|---|---|---|---|
| ETS `choose_response` (official) | 62.2% | 36.7% | **+25.6** |
| ETS SAT R&W (official) | 71.5% | 35.4% | **+36.1** |
| our 2026-08-01 pilot | 58.3% | 33.3% | +25.0 |
| our bank `choose_response` | 94.3% | 28.6% | +65.7 |
| our bank SAT Craft & Structure | 100% | 31.3% | +68.7 |
| our bank SAT Std English Conventions | 75% | 37.5% | +37.5 |

Real published items are 25-36 points above their own control. A blind
solver gets real leverage from option form alone even on a professionally
built test — hedged keys against absolutist distractors, and stems that name
a rhetorical goal, are how the actual exams are written.

**So the pass condition is COMPARATIVE, against the published baseline for
that task family:**

    listening reply tasks  : margin <= +30pts   (ETS baseline +25.6)
    reading / SAT R&W      : margin <= +40pts   (ETS baseline +36.1)
    plus, always: solver pick spreads must DIFFER from one another

The variance condition does not move. Identical spreads across independent
solvers is a deterministic tell and no real test shows it.

Two corrections this forced, both worth remembering as the cost of
uncalibrated thresholds:

- The pilot was reported FAIL twice. At +25.0 it matches ETS's +25.6. It
  passed.
- SAT Standard English Conventions was called "compromised" at +37.5. The
  ETS SAT baseline is +36.1. It is normal, and was condemned on a bar no
  test meets.

The bank's real failures survive calibration unharmed: +58 to +68 points is
roughly 2.5x the published margin, and that is what needs fixing.

**Caveat on the control set.** The 30 `choose_response` items are TOEFL
Essentials "Listen and Reply", not the Jan-2026 iBT format — same task
design, different ETS product. The 2026 samples sit behind a registration
wall. Treat +25.6 as a close proxy, not an exact figure, and re-measure if
the real samples become available.
