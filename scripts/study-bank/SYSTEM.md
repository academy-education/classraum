# The system

Supersedes PIPELINE.md, RUNBOOK.md, TOEFL-RUNBOOK.md,
ANSWERABILITY-GATE.md and PRODUCTION-GATE.md. Those stay as background;
this is the procedure.

## The rule

    author → gate → bank → serve

Nothing reaches `serve` without passing `gate`. One exception exists
today and it is a defect, not a design: `/api/study/test/generate`
writes questions at request time and skips both middle steps.

## The gate

| step | cost | what it decides |
|---|---|---|
| a. pre-flight | free | key spread, length rank, typography |
| b. blind attack | 3 solvers per batch | can it be solved with the source withheld |
| c. verdict | — | ship the batch, or discard it |

Pre-flight NEVER stands in for the attack. Five structural proxies have
been built and each caught only the tell it was written for.

**Pass: margin over control ≤ 25 points.**

Measured reference points:

    official ETS reply items      +25.5     the standard
    live bank, choose_response    +40.4     condemned
    generated questions           +68.1     worst surface measured

The threshold is parity with real ETS items. Nothing we have built
passes it today. That is the point of writing it down before the next
batch rather than after.

**On fail: discard the batch.** Do not patch it. Patching was tried on
2026-08-06 — 24 items repaired for a 3-point gain, because the defect
was in the brief, not the items. See CR-POSTREPAIR-RESULT.md.

## Coverage

An item is GATED if it has a row in `study_item_attacks_fresh` — an
attack whose `item_sha` still matches the item. Repairing an item
un-gates it, which is correct.

As of 2026-08-06: **270 of 3,327 live items are gated. 91.9% are not.**

Per-cohort "blind %" figures in REGISTER.md come from samples of ~12.
They are estimates, not coverage.

## Ownership

| | who |
|---|---|
| briefs, gate runs, scripts | claude |
| the threshold above | andy — decided once |
| human sittings | andy + co-founder — confirmation, never the gate |

A human sitting does not gate a batch. It checks whether the machine
attack is over-calling, which it has been on 2 of 3 cohorts tested.

## Commands

    node scripts/study-bank/attack-cohort.mjs prepare <run> --domain "<d>" --limit 60
    # solve the blind file with 3 independent agents, then:
    node scripts/study-bank/attack-cohort.mjs ingest <run> <a.json> <b.json> <c.json>
    node scripts/study-bank/render-register.mjs

`prepare` only offers items with no FRESH attack, so running it twice
gives you what the first run did not cover, and a finished cohort
returns nothing.

## What is not covered by any of this

- **The live generator.** Ungateable by construction: a 3-solver attack
  cannot run in front of a waiting student. Either move generation into
  batches, or cut it for SAT/TOEFL where the bank already fills the path.
- **The grader.** `calibrate-grader.ts` fails — published ETS 5 scores 3,
  published 4 scores 3. Needs real scored exemplars; not solvable by
  effort. Do not fold rubric marks into section bands until it is fixed.
