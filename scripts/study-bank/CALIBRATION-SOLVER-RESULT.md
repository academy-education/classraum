# The human sitting cannot be replaced by a handicapped solver

**Result: FAILS, on both pre-registered criteria, by a wide margin.**
Recorded so this is not rebuilt — it is the sixth proxy attempt and the
sixth to fail, and the shape of the failure is more useful than the fact
of it.

Run 2026-08-14. `calibration-pairs.mjs` + `calibration-solve.mjs`.

## The question

Every bank verdict rests on a person reading items with the source
withheld: ~20 minutes of a co-founder per cohort, and four of eight
sittings have been thrown away for procedural reasons. If an algorithm
agreed with the human item by item, cohorts could be cleared without one
— and the 50-minute ask for B2 would be unnecessary rather than merely
unwelcome.

## Design

Per ITEM, not per cohort. Only five cohorts have a usable human number
and they carry one bit between them (Choose a Response high, the rest
clustered at 13–33%), so a per-cohort correlation cannot be falsified:
any solver that flags Choose a Response "tracks the human", including
the full-strength attack that is already known to rank cohorts
BACKWARDS against them (r = −0.64).

94 paired observations, from the six (cohort, run) segments that pass
every validity rule in SITTING-PROCEDURE.md §4 — abstention ≤20%, span
≤4h, ≥10s/item, n≥10.

Pre-registered before running: **phi ≥ 0.5 AND solver accuracy within 15
points of human** → candidate. Anything else → the sitting is
irreplaceable. The rule is one-sided on purpose: the only decision that
depends on this is whether to stop asking a person, so "somewhat
correlated" and "not correlated" lead to the same action.

## Result

|  | solver right | solver wrong |
|---|---|---|
| **human right** | 15 | 9 |
| **human wrong** | 53 | 17 |

```
human accuracy    25.5%
solver accuracy   72.3%     gap +46.8
phi              -0.129
```

Both criteria fail, and not narrowly.

## What the failure says

**1. The handicap did not handicap.** gpt-4o-mini, one pass, no
deliberation, told explicitly to answer on impression — 72.3%, against
77–100% for the full three-solver attack. Withholding reasoning from a
model does not move it toward a human; these items are simply easy for
it in a way they are not for a person.

**2. The sign is negative, twice.** phi = −0.129 here, r = −0.64 across
cohorts. Two independent analyses, different units of measurement,
agreeing that the model does slightly BETTER where the human did worse.
That is not an instrument needing calibration. Models and humans are
reading different cues, so no amount of weakening turns one into the
other.

**3. Raw agreement is a trap, and would have been reported as a win.**
34.0% raw agreement sounds poor; on this base rate a solver that answered
"wrong" every single time would agree 74.5%. Any future version of this
experiment must report phi, never agreement.

## Therefore

**The blind human sitting is irreplaceable.** B2 and B4 are justified
rather than assumed, and the ~20 minutes per cohort is the real price of
a bank verdict. The AI attack stays what it has always been: a ceiling
detector that finds what a *model* can crack, useful for catching gross
leaks and not a stand-in for a reader.

## Two defects this run exposed, both caught by checks rather than by reading output

- **The sitting shuffles options.** Only 23/94 items had the bank's key
  letter equal the reviewer's `key_slot` — 24.5%, i.e. chance for four
  options. Comparing a solver's letter to `key_slot` would have compared
  two different orderings and produced a confident phi near zero for a
  purely clerical reason. Each side is now scored in its own frame;
  correctness is order-independent, so the comparison is still valid.
- **A silent empty join.** The first version selected `stem, choices,
  answer_index` as columns when the bank keeps the question in one jsonb
  `item` (`prompt`/`choices`/`correct_answer`). PostgREST returned the
  error in `error` and null in `data`, which was ignored — producing
  "PAIRED OBSERVATIONS: 0" with no indication anything had gone wrong.
  Both scripts now throw when a lookup resolves nothing.

## Limits

- n=94 with a minority class of 24, so phi's interval is wide. Survivable
  only because the result is not marginal: negative sign, +46.8 accuracy
  gap, both criteria missed by a distance.
- ONE handicap was tried. A different one might land closer on accuracy —
  but accuracy was never the hard part, and the negative sign says the
  problem is what the model attends to, not how hard it tries.
- The 94 items come from 5 cohorts and one reader. A second reader could
  in principle agree with the model better than this one does; nothing
  here rules that out, and nothing suggests it either.
