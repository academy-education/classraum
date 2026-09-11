# act-science-v6 is HELD, and the with-source grade is not the reason

**With-source: clean.** Three independent graders, 6 of 6 keys agreed 3/3,
zero non-exclusive votes, no weak distractors. Difficulty medians easy 1 /
medium 4 / hard 1. `act-science-v6.qc.json` is written and valid.

**No-source: clean.** Three solvers, figure AND caption withheld, whole
6-item set so sibling leakage is included: **3 of 18 = 16.7%**, below the
33.3% a best-constant-letter solver scores on this key deal. Two picks were
marked confident and both were wrong. No item was answered by all three.

**The hold is a rendering defect, and two graders found it independently by
looking at the actual raster rather than the coordinates.**

Figure 2 is gridded and labelled only at 0 / 25 / 50 min, with no minor
ticks, so 1 min is about 1.2 px at the width the app actually serves. Q3's
key comparison is **2 min = 2.4 px**, and the nearest distractor pair (L, 7
vs 8) is 1.2 px — roughly one stroke width. Both graders resolved K only by
magnifying the raster; at native size the K pair reads close to a tie, and
the L pair reads as a dead tie.

There is also a stroke asymmetry that pushes the wrong way: the unstirred
bars are pure fill with no stroke, while the stirred bars carry
`stroke-width: 1`, so every open bar's apparent top sits about 0.5 px (0.42
min) high — always in the direction of Q3's key.

Both graders voted `exclusive: true`, and both said explicitly that they did
so on an **asymmetric** argument rather than a comfortable one: a student who
cannot resolve 2.4 px reads K as a tie, and a tie is not "greater", so the
failure mode is "no answer" rather than "a different answer", and L is drawn
shorter so no misread supports it. That is a defensible vote and a bad thing
to ship. Quoting one of them: it is "thinner than a shipped item should run
on".

Q2 is the second-thinnest read — M's 42 at 15 mg/L against its 40 at 10
mg/L, 4.4 px — and it is readable only because the 40-min gridline happens to
pass through the 10 mg/L diamond. That is placement luck, not design.

## What the repair has to do, and why it is not a one-line edit

1. Give Figure 2 gridlines and ticks every 10 min (both graders' first
   recommendation), and give the filled bars the same stroke as the open
   ones so the 0.5 px bias disappears.
2. Widen K's margin (27 -> 32 was suggested). **This is the part that
   cascades**: the batch's strongest internal evidence is that Figure 2's
   four unstirred bars equal Figure 1's values at 10 mg/L exactly
   (44/27/8/40), which two graders verified independently and which Q2 and
   Q4 both depend on. Moving K in Figure 2 without moving it in Figure 1
   breaks that, and moving it in Figure 1 changes Q1's option set.

So this needs the batch's own geometry verifier re-run after the edit, not a
hand patch. Until then the ledger gets no `shape` entry and the batch does
not insert.

## Also outstanding on this family

`act-science-v7` (13 items, 2 passages) is **refused by the blueprint**:
`SCIENCE_FORMATS` pins conflicting_viewpoints at 6 items and
data_representation at 5, and the batch holds 7 and 6. That is my
commissioning error, not the author's — the author refused to change the
counts, which is correct (`never-change-question-counts`). One item must be
dropped from each passage.
