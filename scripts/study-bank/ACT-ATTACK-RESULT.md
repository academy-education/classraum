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
produced its mirror image. A third brief would produce a third tell.
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
