# eoi-v3 Stage 1 — attack results (in progress, 2026-08-28)

Pre-registration: EOI-V3-STAGE1-PREREGISTERED.md. Tooling:
eoi-v3-tools.mjs (preflight break-tested against a seeded-bad fixture —
6/6 dimensions fire; scorer break-tested against synthetic solvers —
reproduces 100/0/50 with a correct best-fixed-letter control).

## Pilot attack #1 — run `eoi-v3-s1-attack`, 12 items, 3 Haiku solvers

Solver files complete (solver-b returned 11/12 on first invocation; the
scorer REFUSED the run per protocol and that one solver was re-run —
no scoring of subsets). Pick-strings distinct across solvers.

    solver-a  8/12 66.7%   BBDACDBCABCB
    solver-b  6/12 50.0%   ABDDCDBDABBB
    solver-c  8/12 66.7%   BADAADCBABCB

    mean 61.1%   control 33.3% (best fixed letter: C)   margin +27.8

    Transitions            5/18 = 27.8%   margin  −5.6   CLEAN
    Rhetorical Synthesis  17/18 = 94.4%   margin +61.1   DEAD (≥+30 at 18 trials)

## The mechanism, named by the solvers themselves

All three solvers reported the same heuristic unprompted: **match the
option's rhetorical shape to the goal statement in the stem.** The goal
is visible blind; the key was the only option whose FORM fully matched
it — the one hedged option under a "cautious summary" goal, the one
"Unlike…" contrast under a method-difference goal, the one
tradeoff-shaped sentence under a comparison goal. The distractors were
wrong on note-facts, but facts are exactly what a blind solver cannot
see and does not need.

This is the v2 cohort's 100%-blind defect reproduced from scratch on
the first try — which settles that it is a property of the item TYPE as
briefed, not of the old batch: goal-in-stem + form-varied options is
guessable by construction.

## Disposition per pre-registration

- T1–T6: measured clean, text frozen, carried forward.
- R1–R6: DROPPED whole. No option-text repair (the defect is the brief).
- Brief revision 1 of 2: **form symmetry** — the key is written first,
  and every distractor reuses the key's rhetorical shape for the goal
  (same structure family, same hedging level, length within ±20% before
  rank tuning), so the only dimension separating options is fidelity to
  the notes, which is invisible without them. Six fresh RS items
  (R7–R12, new topics) authored under it; re-attack of the RS half
  pending below.

## Pilot attack #2 — RS rev-1, run `eoi-v3-rs1-attack`, 6 items, 3 fresh solvers

    solver-a  4/6 66.7%   AABBBD
    solver-b  3/6 50.0%   BABCBC
    solver-c  5/6 83.3%   AABDBD

    mean 66.7%   control 50.0% (best fixed letter)   margin +16.7   PASS

Form symmetry moved the RS margin +61.1 → +16.7 in one revision. The
solvers' heuristics shifted from "match the option's shape to the goal"
(which no longer separates options) to genuine coin-flips over
note-facts they cannot see — several "confident" picks landed on
corrupted-fact distractors.

Answer-blind QC (3 voters + anchored grader), all 12 pilot items:
key_votes 3/3 unanimous on every item (R12's key confirmed as the
note-faithful limitation, not the plausible-sounding contradiction);
all passage_needed=true; distractors plausible/strong; grader
difficulties medium/hard throughout (grader rating is what banks, per
pipeline convention).

## STAGE 1 VERDICT: PASS

- Transitions −5.6 (clean), Rhetorical Synthesis rev-1 +16.7 (pass),
  both under the pre-registered +25 bar; no subskill breach.
- Carried to Stage 2: T1–T6 + R7–R12, text frozen.
- R1–R6: dead, discarded, never banked.
- Stage 2: scale to 72 total under the FROZEN briefs (Transitions
  brief unchanged; RS = form-symmetry brief verbatim), then full
  pre-flight, a fresh 24-item held-out attack, QC, accepts(), insert
  as cohort eoi-v3.

## Stage 2 — SHIPPED as cohort eoi-v3 (2026-08-28)

60 items authored under the frozen briefs by 10 independent authors
(assignments generated programmatically: rank histogram 15/15/15/15,
relation/goal/corruption rotations, 60 fresh topics). Preflight clean.

Held-out attack, run `eoi-v3-s2-attack` (24 items: 12T+12RS, seeded
sample, 3 fresh Haiku solvers, distinct pick-strings):

    mean 34.7%   control 37.5%   margin −2.8   PASS (below control)
      Transitions            13.9%   −23.6
      Rhetorical Synthesis   55.6%   +18.1  (replicates pilot's +16.7)

Answer-blind QC over all 72 candidates (15 voters in 5 chunks + 5
anchored graders): key_votes 3/3 UNANIMOUS on all 72 — zero mis-keys.
accepts() dropped 13 (10 grader-easy, 3 passage_needed=false), dropped
not edited. **59 banked** → Expression of Ideas 66 → 125 live items.

Post-insert: slot spread 15/15/15/14 (after a seeded reorder of stored
choice order — authors had listed the key first per the write-key-first
brief, 31/59 in slot A; students never see stored order and the attack
used independent re-lettering, so no measurement was invalidated, but
the stored skew is now gone), key-length p=0.29 ok, hedge tell ok,
0 duplicate pairs across all 125 EoI.

Found while fixing: bank-helper.mjs had been broken since migration 068
made `task` NOT NULL — every insert bounced. Fixed (task:
'multiple_choice'). Its closing summary also counts verified rows
without an archived filter, which printed "81" while zero rows had
inserted — worth knowing before trusting that number.

Capacity: R&W forms bound by EoI rise from ~6 to ~11 per student.
