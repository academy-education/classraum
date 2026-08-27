# dl-siblings Stage 1 — results (in progress, 2026-08-28)

Pre-registration: DL-SIBLINGS-PREREGISTERED.md.

## Pilot attack #1 — run `dl-sib-pilot-attack`, 12 items, 3 Haiku solvers

    solver-a   8/12 66.7%   BCAADCDBCDBC
    solver-b   9/12 75.0%   BCAADCDBCDAC   (12/12 marked "confident")
    solver-c  11/12 91.7%   CCAADBDBCDAC

    mean 77.8%   control 33.3%   margin +44.4   DEAD (≥ +30)

## The mechanism — the INVERSE of the cohort's original tell

harvest-v1 died on cartoonishly imprudent distractors. The brief banned
those, and the authors produced the mirror image: the key became the
procedurally precise, prudent, condition-carrying option while
distractors were vaguer, more optimistic, or overreaching. Solver B's
own words: "Keys favor procedural correctness, specific conditions, and
prudent behavior; distractors tend toward vagueness, optimistic
assumptions, or overreach." Fixing one uniformity installs the next —
REGISTER.md's standing lesson, reproduced here on the first try.

Supporting reads from the same run:
- elimination probe: 5 of 12 items had a distractor CERTAINLY
  rejectable without the passage (fails the Stage-1 elimination gate).
- grader: D3/D4 passage_needed=false (generic-action keys — "send a
  resume" answers any job ad); D10 sibling_leak=true; D9 key both
  longest and most hedged.
- key votes 3/3 unanimous on all 12 — the items are sound WITH the
  passage; the defect is guessability, not keying.

## Disposition per pre-registration

All 12 questions dead, discarded, never banked (the passages are
untouched bank rows). Brief revision 1 of 2: FORM SYMMETRY, transplanted
from eoi-v3 where it took RS from +61.1 to +16.7 — every option copies
the key's specificity, register, prudence level, and condition-shape;
wrongness only via one passage-checkable corrupted detail; explicit bans
on common-sense-rejectable options and world-knowledge-answerable keys.
Re-authoring the same 12 passages; re-attack pending below.

## Pilot attack #2 — rev-1, run `dl-sib-rev1-attack`

    solver-a   9/12 75.0%   DDDCCCBADBDC
    solver-b   7/12 58.3%   ABDCCBBADADC
    solver-c  10/12 83.3%   AAACCCBAABDC

    mean 72.2%   control 41.7%   margin +30.6   DEAD (≥ +30, barely)

Form symmetry removed the prudence/vagueness asymmetry (+44.4 → +30.6,
elimination certain-rejects 5 → 1) and exposed the THIRD mechanism:
world-knowledge priors about institutional life. Keys faithful to
typical institutional facts — FIFO processing, rolling review, grace
periods measured from the deadline, 2–4 p.m. maintenance — are
guessable because the solver guesses REALITY, not the item. Per-item:
every 3/3-solved item is typicality-anchored (D4 D5 D7 D8 D11 D12);
D3, whose four options are equally plausible job-ad mentions, went 0/3.
Key votes 3/3 unanimous again — sound with the passage, guessable
without.

## Disposition

Rev-1 items dead, discarded. FINAL brief revision (2 of 2):
FLAT-PRIOR ANCHORING on top of form symmetry — the tested detail must
be one whose four alternatives are a priori equally likely (which day,
which time among equally-ordinary windows, who to contact, where, a
name, an amount), never a behavior whose sensible answer is unique in
the world; where the passage's fact differs from the institutional
default, the default becomes a distractor. If this revision also dies,
mode A (siblings on fixed typical passages) is REFUTED and the fallback
is fresh 2-question sets with authored passages that can encode
atypical facts — a new pre-registration, not a third revision.

## Pilot attack #3 — rev-2, run `dl-sib-rev2-attack`

    solver-a   4/12 33.3%   BDBABCDBCABB
    solver-b   2/12 16.7%   BCDBBCDACDBB
    solver-c   2/12 16.7%   BCDBACDDCABB

    mean 22.2%   control 33.3%   margin -11.1   PASS (below control)

Flat-prior anchoring on top of form symmetry removed the typicality
mechanism entirely: +44.4 → +30.6 → −11.1. Solver B ran the exact
heuristics that won rev-1 (conservative baseline, institutional norm,
prudence screening) and scored 16.7% — the priors now point at
distractors as often as keys, which is what "a priori equally likely"
was pre-registered to mean. Elimination probe: certain rejects
5 → 1 → 0. Key votes 3/3 unanimous on all 12 (third run in a row —
keying has never been the defect).

Grader drops per gate 4 (dropped, never edited):
- D10: passage_needed=false.
- D5: distractor_quality=weak — "up to a month" grace period is
  dismissible on real-world grounds; the one residual typicality leak.
  Stage-2 brief note: durations/amounts used as options must all sit
  inside the plausible band (days vs a month is not flat).

## STAGE 1 VERDICT: PASS

Mode A works under the twice-revised brief (form symmetry +
flat-prior anchoring), now FROZEN for Stage 2. Carried forward: the 10
surviving pilot siblings. D5/D10's passages return to the stranded
pool for fresh Stage-2 authoring. Stage 2 per pre-registration: author
siblings for the remaining 59 passages under the frozen brief, fresh
held-out 24-item nosource attack, verify-daily-life-repair mode A,
answer-blind QC + grader, ledger entry, insert-listening under
BANK_COHORT=dl-siblings-v1.
