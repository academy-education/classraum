# reading-worlds-v1 — pre-registered before any item exists (2026-08-28)

Three authored-key reading briefs died (+58.3, +61.1, +61.1) to the
same defect wearing three faces: qualifier → moderation → tension.
READING-PILOT-KILLED.md concludes it is a property of the task, since
a best-supported reading IS characteristically a both/and claim, so
the key is intrinsically the most balanced proposition on offer.

This applies the only cure that has ever beaten authorship asymmetry
in this repo — cr-v7's symmetric worlds, since replicated by rsw/rsw2.

## The design

One TOPIC becomes FOUR passage variants. The variants share a skeleton
— same subject, same names, same structure, same length — and differ
ONLY on 2-3 designated FACT SLOTS. Six questions are written ONCE and
asked of all four variants; each variant has its own correct answer to
each question, because the slots are load-bearing for those questions.

After the text is frozen, a seeded RNG (base 20260901) picks which
variant is SHOWN. That variant's passage is the item's passage; for
each question its answer is the KEY and the other three variants'
answers are the distractors.

**Why this kills the tension tell by construction**: every option is
some variant's genuinely best-supported reading, written with equal
care by the same author for the same question. If balance marked the
key, it would mark all four. No author knows the key, so no option
property can correlate with it. Expected blind margin 0 BY
CONSTRUCTION, not by discipline.

## The rule this design still needs (learned from rsw-v1)

QUESTION PARITY, the reading analogue of goal parity: every variant's
answer must be a genuine, full answer to the question asked. If a slot
change leaves one variant with only a weak answer to Q3, the RNG can
key that weak answer and punish a student who read well. Authors state
per item, in `question_parity_note`, that all four answers to every
question are equally complete.

## Gates (stated before authoring)

1. **kill-map (mechanical)**: for every question, each variant's answer
   must mismatch every other variant's PASSAGE on a checkable token —
   4x3 per question. A variant answer that survives another variant's
   passage means the slots are not load-bearing there.
2. **shape**: passages within a topic differ ONLY in the slot spans
   (skeleton identity checked by token diff); lengths within ±10%;
   option lengths within ±20%; choice counts per family.
3. **question parity review**: an independent agent confirms all four
   answers genuinely answer each question; any failure drops the item.
4. **nosource attack**: 3 solvers, passage withheld, armed explicitly
   with all three historical reading rules (moderation, tension,
   specificity) plus length/slot. PASS <= +25, KILL >= +30.
5. **hunter**: cross-item rules at 3+ items.
6. **withsource QC**: 3 voters with the shown passage; >=2/3 required.
7. Blind file ASSERTED stem-free of the passage before launch (the
   2026-08-28 instrument failure).

If this dies too, reading is closed pending licensed passages — this
is one experiment, not a revision chain.
