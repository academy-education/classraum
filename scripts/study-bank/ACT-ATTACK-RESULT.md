# ACT round 1: what the blind attack found, and why the rewrites did not move it

Date: 2026-09-02. Bank state: `act-english-v1` 150, `act-reading-v1` 108,
`act-math-v1` 134. Shipped gate OFF. Nothing here is servable.

## The numbers

Source withheld, three independent solvers per file, persisted in
`study_item_attacks` (run ids below). "Control" is the best fixed letter.

| run | items | blind | control | margin | note |
|---|---|---|---|---|---|
| act-english-pow-2026-09-02 | 60 | 90.0 | 26.7 | +63 | round 1, one interleaved file |
| act-english-kol-2026-09-02 | 30 | 100.0 | 30.0 | +70 | by construction - see below |
| act-english-pow-r2-2026-09-02 | 51 | 90.2 | 35.3 | +55 | after distractor rewrite, still interleaved |
| act-english-pow-split-…-f1..f4 | 60 | 76.1 | 33-47 | +33..+47 | leakage-free, one item per passage per solver |
| act-reading-{kid,cs,iki}-2026-09-02 | 108 | 98 / 98 / 85 | 33-37 | +51..+65 | round 1, interleaved |
| act-reading-split-…-f1..f3 | 36 | 78.7 | 41.7 | +28..+56 | after FULL distractor rewrite, leakage-free |
| act-english-pow-r3-…-f1,f2 | 20 | 92.9 / 100 | 43 / 50 | +50 | purpose + would-lose items after a THIRD, narrowly-briefed pass (four equal blurbs; locator-only stems) - worse |

Math is gated by the sandbox (135/135 recompute, my own mutations
caught) and was not attacked; its option sets are numbers.

## Three separate things were being measured, and only one is a defect

1. **Nothing withheld.** Knowledge of Language (100%) and Conventions
   quote the whole sentence in the stem - Andy's decision, no underline
   renderer - so the "no-passage" attack withholds nothing. Same for
   "most specific" items (3/3) and would-lose items whose stem quoted
   the deleted phrase (6/6). These are not tells; they are the item
   type. Recorded, not counted.
2. **Cross-item leakage inside the attack file.** Purpose options
   summarise paragraph contents; interleave 51 items from 15 essays and
   those summaries answer the placement and transition items three
   lines away. Removing it (attack-split.mjs) took English from 90 to
   76. A delivered form gives the student the passage, so this inflates
   the attack without harming validity. It IS why every earlier
   interleaved attack number on passage-based cohorts should be read as
   an upper bound.
3. **The per-item plausibility asymmetry.** This is the defect. 76%
   English, 79% Reading with leakage gone.

## Why two rewrites did not fix (3)

Round 1 tell: the key is the hedged, specific, cross-referencing option;
distractors are flat absolutes. Rewrite brief: make distractors equally
hedged, specific, passage-anchored, wrong on a checkable point.
Round 2 tell, in the solvers' words: "the key is the plain, short,
neutral option; the fillers over-commit to specific facts." The brief
produced its mirror image. A third brief DID produce a third tell: the 20 purpose / would-lose items were rewritten to "four equally essay-shaped blurbs" and scored 92.9% and 100%. Six solvers named it the same way - one Yes option in every purpose item is written to defeat its own premise ("Yes... scouts as elder bees the swarm defers to" for "without a leader"), and the real blurb restates the stem's purpose. Three briefs, three tells, no movement.
This is the corollary already in CLAUDE.md, observed live three times
in one day.

The residue is not evenly spread. English by sub-type (leakage-free):

    would primarily lose   100%  6/6    structural (stem quotes text)
    most specific          100%  3/3    genre
    purpose (whole essay)   90% 12/14   authoring - one bounded pass pending
    intro / conclusion      71%  5/7
    transition              70%  5/9    two items had a synonym pair
    add / delete            61%  9/19
    placement               50%  1/2

Reading by subskill (leakage-free, n=36):

    vocabulary in context  100%  5/5    quoted phrase + word knowledge
    main idea              100%  3/3
    tone/attitude          100%  2/2
    inference               87%  4/5
    argument/evidence       73%  3/5
    function                72%  4/6
    detail                  58%  2/4
    comparison               0%  0/2

## What this does and does not establish

- It does NOT establish that a student can score 76-79% on these forms
  without reading. The register records seven TOEFL cohorts where AI
  solvers claimed 83-100% and a person scored 13-27%. The attack is a
  screen. Its absolute numbers are not findings.
- It DOES establish that these forms are not clean by the only
  instrument that has ranked batches correctly, and that another
  agent-authored rewrite is not the fix.

## Decision

Stop rewriting by brief. Next instrument is a human sitting, B5-style:
a 20-item draw across English Production of Writing and Reading
(`draw-review-run.mjs`), read by the co-founder, scored against the
pre-registered dead zone. If a person lands near control, the item
bank is usable and the AI attack over-called again, as it did for
TOEFL. If a person lands high, the ACT verbal forms need re-authoring
under a different process (mixed authors, or distractors drawn from
real wrong answers) rather than another pass of the same one.

The shipped gate stays off until that sitting is read. Math can ship
independently once forms are drawn and the assembler is exercised.

## The human sitting (B7) — 2026-09-02, scored 2026-09-03

Run `act-cofounder-2026-09-02`: 40 items, blind (no passage), the
co-founder (support@classraum.com, reviewer_kind human), 15:33-16:14 UTC,
median 46 s per item, no notes left, every verdict "unique / authentic".

    Production of Writing               2/20   10.0%   control 25.0%
    Key Ideas and Details               1/7    14.3%
    Craft and Structure                 1/7    14.3%
    Integration of Knowledge and Ideas  0/6     0.0%
    Reading (all three)                 2/20   10.0%
    OVERALL                             4/40   10.0%   control 27.5%

Scoring frame checked before believing it: for all 40 rows key_slot equals
the displayed position of the bank key under shown_order (40/40 under the
hypothesis "shown_order[k] is the bank index at slot k"; 21/40 under the
other reading), and blind_pick is in the same displayed frame. Pick spread
A10/B11/C10/D9 against key spread A11/B11/C10/D8 — no slot habit.

Against the pre-registered rule (at or below ~40% = clean; ~60% or more =
archive; between = second reader): CLEAN, by a wide margin. The AI attack
said 76% (PoW) and 79% (Reading) with leakage removed; a person scored 10%.
This is the eighth cohort in the register where the model attack and a
human disagree by 60 points or more in the same direction, and it settles
the ACT question the way the rule said it would.

10% is below the 27.5% control (p ≈ 0.006 under uniform guessing). That
is consistent with the round-2 solver reports — the key became "the
plain, short, neutral option" and the fillers over-commit — being a tell
a model exploits and a person is repelled by: humans pick the committed
distractor. It is not evidence of a scoring fault (checked above), but it
is one more reason the model number is a screen, not a verdict.

Decision taken: the shipped gate flips for ACT (English, Math, Reading;
Science has no items and is optional). shipped-tests.ts, 2026-09-03.

## Science v1 — first attack, 2026-09-03

80 items, 14 passages (DR 4 x 5, RS 6 x 6, CV 4 x 6), authored by four
agents to one brief each, inserted as cohort act-science-v1 under the
HIDDEN act-science topic. No-passage attack, sibling-free (make-attack.mjs
SPLIT=6: one item per passage per file, a different solver per file):

    f1 9/14  f2 9/13  f3 9/13  f4 11/13  f5 10/13  f6 9/14
    TOTAL 57/80 = 71.3%   confident picks 37/38 right (97%)
    solved by format: DR 12/20  RS 26/36  CV 19/24

Same territory as English PoW (76%) and Reading (79%), which a person
then scored at 10%. What the solvers used, in their own words: general
science knowledge (RC time constants, germination optimum curves,
autoclaving kills microbes), experimental-design logic that the stem
states in full (which control isolates X), option structure (the one
option that performs the comparison the stem asks for; two options
sharing a number), and viewpoint role-mapping in CV sets. Several of
these are legitimate ACT Science skills - a control-purpose item IS
answerable by a student who knows what a control is - so this number is
not a defect count. The structural tells named by more than one solver
are worth reading regardless of the sitting: shared numbers between two
options (RSB-02 capacitor items reconstruct the E-series resistor set),
a single option that "performs the comparison" (DR-01-5), and design
items whose stem states the whole logic.

Decision: no rewrite brief (the rule). The gate is the co-founder's
Science sitting, drawn as act-science-cofounder-2026-09-03 once his
cr-v10 sitting closes (the draw tool holds one open run per reviewer):
20 items, 7 / 6 / 7 across the three reporting categories, same
<=40 / >=60 rule as B7. A with-source key check (two graders, passage +
graphic + options, key unmarked) runs in parallel.
