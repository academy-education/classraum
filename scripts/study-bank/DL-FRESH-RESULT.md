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

## Stage 2 — SHIPPED as cohort dl-fresh-v1 (2026-08-28)

24 sets authored by 12 authors under the frozen brief plus name
hygiene (disjoint per-author name/number/room pools). Measured
result of the hygiene rule: ZERO cross-set recurrence of any person
name or phone/extension — the pilot's tell cannot recur in either
exploit direction. (A first recurrence check false-alarmed by
counting within-set repetitions — a phone number legitimately
appears in several of one question's choices; fixed to per-set
presence before trusting it.)

Held-out attack (24 of 48, 3 solvers + pattern hunter):

    mean 40.3%   control 41.7% (best fixed letter)   margin -1.4   PASS

Caveats recorded rather than smoothed: the absolute sits well above
the pilot's 13.9%; the lumpy sample control (10/24 keys on one
letter) prices in skew, and the decisive read is that solver-b —
which explicitly ran the hunter's proposed hyper-specificity exploit
("specificity markers signal keys") — scored exactly control level.
The hypothesized tell has no measured exploit value.

Withsource QC: key votes 3/3 UNANIMOUS on all 48; grader flagged one
weak distractor (S12-2-2, answer derivable by schedule elimination) —
its set dropped WHOLE, because dropping one question of a 2-question
set would recreate the stranded-single problem this whole programme
exists to fix.

verify-daily-life-repair mode A run BOTH directions (each set's two
questions as mutual siblings): positions worst slot 38% (<40%),
hedge-only-in-key 0%, key-longest 24%, both passes OK.

Insert: 58/58 under BANK_COHORT=dl-fresh-v1 (ledger
dl-fresh-v1-2026-08-28; placeholder group ids namespaced to pg-md5 at
insert). Live verified by count: **260 daily_life rows, 130 drawable
sets, 0 singles** — repeat-free lower-path sittings 10.1 → 13.0, and
Daily Life is no longer the binding TOEFL constraint (Choose a
Response and Listen-and-Repeat now bind at ~12.7 and ~13.9).
