# dl-fresh-v1 — results (in progress, 2026-08-28)

Pre-registration: DL-FRESH-PREREGISTERED.md.

## Pilot — 6 authored sets / 12 questions, run `dl-fresh-pilot-attack`

Deterministic preflight clean on the first pass (word counts, ranks,
tags, leak checks).

Attack (3 Haiku solvers + a dedicated cross-item pattern hunter,
distinct pick-strings):

    solver-a   4/12 33.3%
    solver-b   0/12  0.0%
    solver-c   1/12  8.3%

    mean 13.9%   control 41.7%   margin -27.8   PASS (≤ +25)

The lowest attack score any Daily Life cohort has posted. The
authored-atypical-fact design worked as intended: every typicality
heuristic the solvers ran (institutional hierarchy, "official
channels", central-location preference) pointed at DISTRACTORS,
because the passages' true facts were deliberately atypical. Solver-b
ran the purest institutional-norms strategy and scored 0/12.

## The tell that PASSED the attack and still matters

The pattern hunter found real batch-level structure: authors recycled
a small name pool ("Dana" in five of six passages' contact items, a
phone number attached to two different people, one set's addressee
appearing as another set's option). Its proposed exploit — strike the
recurring names — would have BACKFIRED (Dana IS the key in 4 of the 5
contact items), which is why the margin stayed deeply negative. But
the inverse strategy ("the recurring name is the key") would have
scored 4/5 on contact items, and at 30-set scale that becomes a
learnable rule — the register's third-tell lesson (identical key
prose across lectures) in a new coat. Disposition:

- Pilot ships as measured (no gate failed; drop-never-edit protects
  the measurement, and the collisions are cosmetic blemishes, not
  validity defects — recorded: F2/F3 give "Dana Okafor" two different
  numbers).
- Stage 2 adds NAME HYGIENE to the passage rules (allowed
  authoring-hygiene layer; the frozen question brief is untouched):
  every author gets a disjoint assigned pool of names, numbers,
  rooms, and buildings, each usable at most once. No cross-passage
  recurrence can arise, in either exploit direction.

## Stage 2 (in flight)

24 more sets by 12 authors under the frozen brief + name hygiene;
pilot withsource QC (3 voters + corrected-direction grader) running
alongside. Then: held-out attack (24 questions), pattern checks,
ledger, insert under BANK_COHORT=dl-fresh-v1.
