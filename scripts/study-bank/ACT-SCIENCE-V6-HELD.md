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


---

# REPAIRED 2026-09-11 — and the grades on file are now stale

The figure was **redrawn from a generator, not hand-patched**, and the hold's
cause is gone.

    Q3's key margin   2.4 px at 340 / 1.8 px at 260   ->   11.0 px
    thinnest of 15 separations in the batch            ->    8.8 px (floor 8)
    Figure 2 resolution   1.2 px/min                   ->    2.2 px/min

The load-bearing choice was the viewBox: 350x250 -> **260x296**. The app serves
the graphic `w-full / h-auto / max-h-[300px]`, so the scale is
`min(W/vbW, 300/vbH)` — at 260x296 the drawing renders at **1 unit = 1 px at
every width at or above 260**, which stops resolution degrading on a narrow
phone. Both bar types now carry an identical 1px stroke, so the ~0.5 px
apparent-top bias that favoured Q3's key is gone, and both panels have major
gridlines and ticks every 10 min with minors every 5.

**The cascade turned out to be small, because the suggested fix was ambiguous
and one reading was a disaster.** "K 27 -> 32" could mean the unstirred bar —
but that value is pinned to Figure 1 at 10 mg/L, and raising it would put K's
own maximum at 10 mg/L, double-keying Q2 (J and K both "greatest there") and
shifting Q5's interpolation. It was applied to the **stirred** bar instead,
which lives only in Figure 2. No cascade at all. Three Figure 1 values moved to
open the other thin reads, all confined to columns **no option set uses**
(Q1's options are the 5 mg/L column, Q4's the 15 mg/L column).

**No key changed and no option string changed** — 0 of 6 keys, 0 of 24 options.
Three explanations were reworded because they quoted moved numbers.

The new verifier reads no authored table: it least-squares-fits each axis
against its labelled major ticks (telling minors apart by length), identifies
series by end-letter under one shared baseline offset, checks every marker
against a vertex of its own curve, reads each bar twice — from its top and
from its height — and re-answers all six items. It **re-derives** Experiment
2's concentration from the cross-figure match rather than assuming it (the
next-closest column is off by 11 min). 13 of 13 rigs behaved: 9 must-fail and
**4 must-pass**, including a marginal thin-margin rig at 5 -> 3 min rather than
a blowout. It caught two real things on its first run — a triangle marker whose
centroid sat 2.1 units off its datum, and a margin left at 3 min.

**A fourth defect neither grader named:** run the HELD figure through the new
verifier and it refuses at Figure 2's calibration, because that panel had **no
y-axis tick marks at all** — only gridlines and three text labels.

## What this batch now owes

`verify-act-science-v6.mjs` prints `VERIFY OK` and the pixel report. But:

- **The with-source grades are STALE.** All three graders read 44/29/7/41 where
  the file now draws 47/32/4/46. Same keys, same options, same reasoning path —
  but their transcripts quote numbers that are gone, and a grade is evidence
  only about the bytes it was taken on. A fresh three-grader pass is owed.
- The figure-blind 16.7% is **untouched**, because that attack withheld the
  figure entirely.
- There is no ledger entry at this content hash, so the gate refuses outright.
  That is correct.

Two residuals the repairer reports rather than hides: **~2.2 px/min is a
ceiling, not a choice** — `max-h-[300px]` caps rendered height regardless of
card width, so two stacked 0-50 panels plus legible labels cannot do better
without separate graphics per figure; and **Q5's option gap is the tightest
thing in the batch** at 3 min (half-gap 1.50), clearing the +-1.25 min the
ruler supports by 20%. That one is arithmetic, not legibility.
