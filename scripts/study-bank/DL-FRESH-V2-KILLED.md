# dl-fresh-v2 — KILLED before insert (2026-08-28)

Pre-registration: VOLUME-PREREGISTERED.md lane E. 24 sets / 48
questions authored (Opus) under the brief that measured −11.1, −13.9,
−27.8 and −1.4 across four prior runs. Deterministic preflight clean;
name hygiene clean; key votes ≥2/3 on all 48; grader flagged nothing;
held-out attack **−5.6, below control**.

## Killed anyway, by arithmetic

The cross-item pattern hunter reported option families at fixed slots
("email the contact" at D in 6 of 6 items; telephone at A in 3). Slot
tells die at insert (insert-listening shuffles choices seeded by
content_hash), so the slot claim alone was not disqualifying. But the
hunter also noted the families differ in SPECIFICITY, and that is
content, which survives shuffling. Measured over all 48:

    email option present in  7 items, key in  0   (chance 1.8)
    phone option present in 12 items, key in  8   (chance 3.3)
    room/number-specific    16 items, key in 12   (chance 6.0)

A student who learns "never the bare email option; take the one with a
room number or extension" beats this batch without reading a passage.

## Why this matters more than the passing attack

This is the PRECISION ASYMMETRY that killed the very first Daily Life
cohort (DL-SIBLINGS-RESULT.md kill #1: "keys procedurally precise,
distractors vaguer"). The frozen brief's FORM SYMMETRY clause exists
to prevent exactly it — "distractors copy the key's specificity" — and
the authors regressed on it while satisfying every other rule. Three
Haiku attack solvers missed it; the hunter plus one arithmetic join
found it decisively. The standing rule applies in both directions:
**when the defect is arithmetic, the exact measurement over the whole
batch overrules a passing sampling attack.**

## Disposition

All 48 questions dead, never banked. Daily Life stays at 260 rows /
130 sets. The brief gains one clause before any dl-fresh-v3:
**CHANNEL PARITY — when the tested detail is a contact method or
procedure, all four options must be the same KIND of channel at the
same level of specificity (four named people, or four offices, or four
methods each carrying a room/number). Never one bare channel among
three specific ones.** Add the three joins above to preflight so this
is caught before agents are spent on attacks.

## The same join condemned a SHIPPED cohort (2026-08-28, same night)

Break-testing `check-batch-joins.mjs` against already-shipped batches —
the standing rule that a checker must reproduce known numbers before
being pointed at unknown data — fired on **dl-fresh-v1**, banked hours
earlier. Population measurement over all 260 live Daily Life rows,
using the CONDITIONAL rule (items where exactly one option belongs to
the family, chance 25%):

    phone/number family    dl-fresh-v1     12/12 = 100%
                           harvest-v1       0/2
                           dl-siblings-v1   0/1
    email family           dl-fresh-v1      0/12 =   0%
    in-person family       all cohorts      3/16 =  19%  (chance)

So the defect is cohort-specific — the same authoring pass that
produced dl-fresh-v2, one revision earlier — and the rule is perfect
where it applies: *if exactly one option is a phone/extension option,
it is the key; never the bare email option.*

Disposition: the 12 affected items sit in 12 two-question sets, and
archiving a single question would strand its sibling (the exact defect
the dl-fresh programme existed to fix), so **all 24 rows archived
whole**. Daily Life: 260 → 236 rows, 118 drawable sets, still 0
singles. Post-archive the rule reads 0/3, at chance.

Two lessons, both already in this register in other forms and now
proven again:

1. **Break-test every new checker against shipped data.** This one was
   written to prevent a repeat and immediately found the original.
2. The dl-fresh-v3 re-author now covers 12 archived sets as well as
   the 24 killed ones, and `check-batch-joins.mjs` runs at preflight —
   before any attack fleet is paid for.
