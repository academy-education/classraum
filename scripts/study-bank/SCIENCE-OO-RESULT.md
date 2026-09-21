# The options-only attack does not work on ACT Science

**2026-09-21. A negative result, recorded so nobody runs this again.**

`OPTION-BALANCE-RESULT.md` exists because five structural proxies were built
and none caught the next tell. This file is the same kind of record for an
*instrument*, not a proxy: the blind options-only attack — the one instrument
CLAUDE.md says IS the gate — is invalid for this one family.

## The measurement

Three blind solvers, passage and data figure withheld, forced pick on every
item, controls derived from each file's own key distribution:

    arm                                       pooled   control   margin
    scig      20 candidate items              71.7%     35.0%    +36.7
    ctrlscig  30 SHIPPED live items           88.9%     26.7%    +62.2

Unanimous-correct: 14 of 20 candidate, **25 of 30 live** (expected at
control: 0.57). Every solver independently reported the live control as MORE
transparent than the candidate — 19 mechanism-grade picks against 10, 18
against 11.

## Why that is the instrument failing, not the bank

Those same 30-item-population live items were sat blind by a human:

    act-science-cofounder-2026-09-18   act/science   21/21 answered   28.6%

against a 28.6% control. **A person, with the figure hidden, scored at exactly
chance. The models scored 88.9% on the same population.**

The solvers said why in their own reports without recognising it:

- `ctrlscig` L003/L004 — "the numbers are potassium nitrate's published
  solubilities (13.3 / 31.6 / 63.9 / 110 g per 100 g at 0/20/40/60 °C)".
- L030 — "Hardy-Weinberg 1−q², and only p = 0.55 gives a round answer".
- The beam block — "deflection ∝ 1/thickness³ plus one anchor value".

ACT Science figures plot *real science*. A model has the solubility curve of
potassium nitrate memorised and can apply Hardy-Weinberg; that is what it is
scoring on. A 16-year-old sitting the ACT cannot, which is the entire reason
the section exists. The attack is measuring the solver's science knowledge,
and a candidate's knowledge is the construct under test — not a leak.

This is the same false positive already recorded for the TOEFL MC bank: model
93-100%, humans at chance on 4 of 5 types.

## The one mechanism that survived, and it did not discriminate either

The solvers also named a leak that needs NO science: a value needed by item X
is printed in sibling item Y's option set. That is arithmetic, so per CLAUDE.md
it was checked exactly over both whole populations rather than sampled —
`check-sibling-numeric-leak.mjs`, self-tested on three fixtures including the
small-integer false-positive case:

    candidate   6 of 20 items = 30.0%    whole blocks clean: 1 of 4
    live bank  10 of 30 items = 33.3%    whole blocks clean: 0 of 6

It rejects **the entire shipped, human-cleared live bank**. A gate that fails
every item a human has already cleared is not a gate. Sixth proxy, same ending.

Most of its hits are innocuous: a shared "20" is a temperature axis label that
two stems in one data-table passage cannot avoid naming. The checker is kept
because it is nearly free and its *self-test* is sound, but it is pre-flight,
never a ship decision.

## Disposition

- **ACT Science stays live.** It was unhidden on the human sitting (75d841c5),
  and nothing here touches that evidence. Do not re-hide it on a model attack
  the human sitting already contradicts.
- **The 20 candidate items are STAGED, not inserted** (`verified=false`, which
  the assembler ignores). They are not distinguishable from the live bank by
  any instrument available, which is not the same as clean — it means there is
  no gate to clear. They wait for a human blind sitting.
- **The gate for ACT Science is a human sitting.** Do not commission another
  model attack on this family.

## What this does NOT say

It does not say the candidate items are good. The with-source grader graded
them easy 8 / medium 12 / hard 0 — nothing in the batch requires holding two
comparisons at once — and flagged ASCA-03/-05/-09 as answerable from the
procedure alone. Those are difficulty and construct notes, and they stand.
