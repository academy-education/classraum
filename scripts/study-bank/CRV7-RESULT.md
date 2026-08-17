# cr-v7 — sixth rebuild attempt of Choose a Response. Both attack gates CLEAR. NOT BANKED — pending the human sitting gate.

Run 2026-08-18. 132 items in `crv7-items.json` (12 pilot + 6 batches of
20, six different authors). Nothing banked, blueprint untouched, the 72
cr-v1 items still live. The swap and the blueprint restore happen only
after a calibrated human sitting passes; the main session draws it.

| attempt | margin | verdict |
|---|---|---|
| cr-v1 original | +45.1 | failed |
| cr-v3 near-miss distractors | +52.8 | failed |
| cr-v4 varied stimulus | +22.2 | inconclusive, did not replicate |
| cr-v5 cr-v4 + ban rule | +47.2 | failed |
| cr-v6 cr-v4 held exactly | +47.2 | failed |
| **cr-v7 S1 pilot (12)** | **−16.7** | **clear** |
| **cr-v7 S2 sample (24 of 120)** | **+1.4** | **clear** |

## What changed — the method, not another brief

Every prior attempt authored the KEY as "the reply to the real spoken
line" and the distractors some other way (a roster, near-misses, varied
stimuli). That authorship asymmetry is the one invariant that survived
all five failures; every solver in every round described its shadow
("the key takes up the news and does something about it; the
distractors are the alternative states of the world").

cr-v7 removes the provenance instead of trying to hide it:

1. Each item is FOUR mutually exclusive worlds authored symmetrically —
   each world has its own spoken line AND its own reply, and each
   world's line must contain a verbatim-quotable span that kills each of
   the other three replies (checked mechanically by `render-crv7.mjs`,
   4×3 kills per item, 1,584 verified across the cohort).
2. Only after the text is frozen does a SEEDED RNG choose which world is
   spoken. That world's reply becomes the key; the other three replies
   become distractors. No author ever knows which option is the key.
3. No post-selection edits. A defective item is discarded whole (none
   needed discarding; two kill-rationale strings had quote-format fixes,
   options and lines untouched).

The key is therefore statistically independent of every text feature —
expected blind margin 0 BY CONSTRUCTION. A blind heuristic can be loud,
shared by every solver, and still score 25%, because the property it
reads was never allowed to correlate with the key.

Pre-commitments (recorded in the session before any item existed):
selection seed 20260818 (+100 per batch; re-roll +1 only on a >25%
stimulus-kind/key-act quota violation, all re-rolls printed by the
render); key letters dealt flat so every control is exactly 25.0%; kill
rule per the standing pre-registration — margin ≥ +30 killed, ≤ +25
clear, 25–30 inconclusive at n=12.

## S1 — pilot 12, blind attack (crv7-pilot)

    solver a   1/12 = 8.3%   confident 0/2   spread 5/4/3/0
    solver b   1/12 = 8.3%   confident 0/3   spread 3/5/3/1
    solver c   1/12 = 8.3%   confident 0/4   spread 2/5/4/1

    MEAN 8.3%   control 25.0% (flat by construction)   margin −16.7
    zero of nine confident picks correct

Solver pattern reports (S1), abridged but in their own words:

- solver a: "No structural tell found… the four options in each item
  are replies to four different plausible utterances in the same
  scenario, and nothing marks which utterance was the real one." 10/12
  marked guess.
- solver b: named "That works / That suits me" openers as a candidate
  key family — counted against the key: one of the three is a key, two
  are not. Also "the two-beat uptake reply" — his three confident picks
  on it all missed.
- solver c: called items 8 and 12 "outright giveaways" and missed both;
  final score 1/12. Confidence with below-chance accuracy.

## S2 — scale to 120 (6 batches × 20, six different authors), 24-item cross-batch sample (crv7-s2)

Cross-batch pre-flight over the full 132 before the attack: 0 duplicate
settings, 0 exact or near-duplicate (Jaccard ≥ 0.6) lines or replies
across batches, no realized stimulus kind above 21.2% (cap 25%), every
batch's control 25.0% flat, hedge-word and intensifier-restatement
rates 0%/0% keys vs distractors, em-dash/question-mark rates within
noise in both directions.

    solver a   6/24 = 25.0%   confident 3/6   spread 6/4/5/9
    solver b   6/24 = 25.0%   confident 1/6   spread 6/4/4/10
    solver c   7/24 = 29.2%   confident 3/8   spread 5/6/5/8

    MEAN 26.4%   control 25.0%   margin +1.4
    per-batch (n=4 items each, noise): b1 8% b2 50% b3 33% b4 17% b5 25% b6 25%

Solver pattern reports (S2) — all three converged on the same
hypothesis, which is exactly what the construction predicts they will
do and exactly what it defuses:

- solver a: "pick the reply that acknowledges/receives rather than
  initiates (news markers, answers, 'then'-inference)… I saw no letter
  position pattern and no length tell."
- solver b: "keys react, distractors merely plan — if the keys really
  are those options… My picks skew heavily D (10/24). Either my
  heuristic has a position bias, or the affective-pivot options cluster
  in slot D — worth checking against the key spread." (Key spread was
  6/6/6/6; his skew was his own.)
- solver c: "Roughly 18 of 24 items have exactly one [reaction-token]
  option… it's the only structural signal in the file, and it's loud."
  His score: 29.2%.

THE HYPOTHESIS WAS COUNTED, not just out-scored, per the CLAUDE.md
rule. Across all 132 items: reaction-token options are 5.3% of keys vs
8.3% of distractors; in the 38 items with exactly ONE token option,
that option is the key 6/38 = 15.8% (chance 25%). The loud signal
exists and points nowhere — which is the designed property, not a
lucky draw: the RNG that picks the key never saw the text.

## What this does and does not establish

- ESTABLISHED: the cohort is unanswerable from options alone to the
  same instrument that scored cr-v1..v6 at +45 to +53. Both
  pre-registered gates cleared with room to spare, and the strongest
  named heuristics were counted against the population and found
  uncorrelated with the key.
- BY CONSTRUCTION, a future blind attack on any subset should sit at
  ~25%; a large deviation means the assembly was tampered with (e.g.
  someone re-picked keys after reading the text), not that authoring
  drifted. The invariant to protect is: NEVER edit an option or re-pick
  a world after selection.
- NOT ESTABLISHED: that the items are good WITH the audio. The blind
  attack cannot see two-defensible-answer defects, unnatural TTS lines,
  or scenario-echo fatigue. Known watch-items for the human gate:
  - two b4 items share a "treatment done → put things back in the
    cupboard" surface (crv7-b4-17's world and crv7-b4-12's world drew
    similar keys in the S2 sample; solver a noticed the echo);
  - "question"-kind spoken lines are under-represented (15/132 =
    11.4%; the cap rule had no floor). Official ETS reply items are
    mostly bare questions, so the human reviewer should say whether
    the mix reads off;
  - the kills gate guarantees each distractor is wrong for a QUOTABLE
    reason, but a human should confirm the wrongness is felt, not just
    provable, on a sitting-sized sample.

## Files

    crv7-quads.json, crv7-b[1-6]-quads.json   four-world sources (7 authors)
    render-crv7.mjs                            validation + seeded selection + assembly
    sample-crv7-s2.mjs                         cross-batch sample draw
    crv7-pilot.* / crv7-s2.*                   blind, key, solver files (both runs)
    crv7-items.json                            THE COHORT — 132 items, live JSON shape

## Next (not done here, by design)

1. Human sitting on a drawn sample of crv7-items.json under the
   calibrated reviewer (B4 passed 2026-08-15; the main session draws
   it — SITTING-PROCEDURE.md).
2. Only after that passes: bank the 132, archive the 72 cr-v1 items,
   revert the Listening blueprint 6 → 14 Choose a Response (one line +
   listening-blueprint.test.ts pin), port the §5 entry and a cr-v7 row
   into A3_ATTEMPTS in src/lib/study/bank-register.ts and re-run
   render-register.mjs.
