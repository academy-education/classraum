# sat-wic-v6 — pre-registration, written before any solver returned

12 candidate Words-in-Context items against a 9-item matched live control.
Files: `wic6-oo.blind.json` / `.key.json`, `wic6.ws.json`.

## The control, and why it is only 9 items

Live Words in Context is 30 items in two different renders. The control is
restricted twice, and both restrictions cost items:

- **shape = word only** (11 gloss items excluded). v6 is entirely single-word;
  the gloss family is the one measured at **+42.9 blind**, so including it
  would raise the control and flatter the candidate.
- **not my own cohorts** (10 excluded: `rw-v12-wic`, `rw-v14-wic`, both
  inserted by this session). A control made of items I shipped days ago
  measures my recent authoring, not the bank.

9 items, 27 picks, a 95% Wilson interval of roughly **±17 points**. This run
can refute a large leak and cannot resolve a small one. No larger
non-self-referential control exists.

## Key slots are dealt flat by construction

A free shuffle dealt the candidate C:5 D:4 and the control A:4 B:3 C:2 D:0 —
best-fixed-letter controls of 41.7% and 44.4%, near the band being measured.
Re-rolling seeds until a deal looks fair is choosing a result, so instead the
key slot is assigned by round-robin within each arm before any solver runs:
**candidate 3/3/3/3 → 25.0%; control 3/2/2/2 → 33.3%.** The two arms therefore
have DIFFERENT free-letter lines, and each is scored against its own.

## Ceiling check on the bars — the thing that was missing last time

The control arm's attainable range is 33.3% (pick one letter) to 100%. A
reject bar of "candidate exceeds control by 25 points" can fire only while the
control sits at or below 75%. **If the control returns above 75%, the bar is
unreachable and this run reports NOT MEASURED, not a pass.**

## Bars, fixed now

- **Instrument validity.** If the live control returns **above ~55%**, the
  options-only attack is saturating on this family and the blind half does not
  decide; the with-source half does (the ACT Science rule). The recorded WIC
  figures are 12.5% / 33.3%, so saturation is not expected — but it is not
  assumed either.
- **Batch reject.** Candidate exceeds its own free-letter line by 25+ points
  AND exceeds the control arm's margin over its line by 15+.
- **Per-item drop** (any one is sufficient):
  1. picked correctly by all three blind solvers
  2. key disputed by the with-source grader
  3. not exclusive — a second option survives a defensible reading
  4. distractors graded weak
  5. passage not needed (solvable from the blank's own sentence)
  6. a free elimination from the frame kills 2 of the 3 distractors

## What counts as success

**3 survivors.** SAT R&W sits at 15 complete forms, bound by Craft and
Structure at 237 items against 15 per form; 240 buys form 16. Three is the
whole deficit — which is why the batch is 12 and not 3. A batch written to
exactly the number needed has no room to lose items, and every batch here has
lost items.

## Discard conditions

If fewer than 3 survive, the batch is **held and re-authored**, not repaired
in response to this round. A repair made in response to the round that caught
it is fitting to the instrument (recorded today, SAT Algebra).
