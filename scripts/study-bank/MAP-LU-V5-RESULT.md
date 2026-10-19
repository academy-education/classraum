# map-lu-v5, 2026-10-20: result

**SPELLING STOPPED AT STAGE 0. NOTHING FROZEN, RENDERED, GRADED OR INSERTED. SPELLING CLEARED: 0**
(cumulative 0 of the owner's ~20; the Language Usage gate is not met). Prereg `4b34f9e8`, Amendment 1
`96da3305` (before any rater). No freeze or render commit exists, because nothing froze.

## What happened, in order

| step | result |
|---|---|
| authored | 48 (39 kept as first written + 9 grade-7 slots re-authored under Amendment 1); `itemchecks` all ok, `checks` 0 item failures |
| teacher gate | 144 wrong options. Rater A: **0** NO. Rater B: **9** NO, one per item -> **9 dropped** (g5 S01 S03 S07 S08 S09; g6 S17; g7 S29 S30; g8 S48) |
| exact checks | 0 dropped |
| strict word-grade screen | 39 words, two screeners; **1 dropped**: S31 *particularly* (7 and 6, target 7) |
| survivors | g5 **7**, g6 11, g7 9, g8 11 (quota 7 each) |
| pre-flight, first pick | clear (re-draw not used). T2 at_max(marks) 39.3%, fw p 0.18; T2-L mode(vv) 29.2%, fw p 0.96 |
| **E3** | key uniquely longest **8/28** (cap 7), uniquely shortest 5/28 -> **FAIL** |

Stage 0 fails on E3. The pre-registered single re-draw forgives only a firing pre-flight (T2 / T2-L) and
"the re-draw then faces pooled E3 like every strand" (v4 prereg §3, inherited); the pre-flight was clear,
so there is no re-draw to take and the rule stops the strand. Files: `map-lu-v5/stage0.json`,
`map-lu-v5/stage0-pick.json` (sha256 2671e3d1...), `teacher-{a,b}.json`, `teacher.drops.json`,
`screen-{a,b}.json`, `screen.words.json`, `batch.authored.json` (sha256 a3ec9c69...).

## Why E3 fired when the key length ranks were balanced

The seeded ranks were balanced (each rank 7 times) over the 28 items **expected** to freeze: the first 7
ids per grade. Ten drops replaced 10 of those 28 with later items, and the drops fell unevenly on rank:
4 of the 10 (S07, S08, S09, S17) carried rank 4, key shortest. The frozen pick came out 8 / 8 / 7 / 5
across ranks 1-4, and the 8 rank-1 items are exactly the 8 uniquely-longest keys. The cap fired at its
margin (8 against 7). This is a construction defect in the freeze, not a measured tell: the balance was
guaranteed on a set the drops were certain to change.

**Next design:** balance the pick, not the plan. Freeze the first survivor of each (grade, rank) cell
until each grade has 7 with every rank once or twice, or deal ranks after the drops (impossible here,
since the rank is authored into the sentence). Either needs headroom per cell, so author 16 per grade.

## Recorded for the next run

- **The two teachers disagreed completely: 0 against 9.** Under "any NO drops", rater B alone decided
  every teacher drop. Rater B's nine are each a plain, phonetic word (*mysterious, allowance, strategy,
  reliable, ingredient, prominent, controversy, perspiration, commemorate*) that it judged no student
  would suspect. Rater B also noted that on grades 7-8 the correctly spelled options are often harder
  words than the key's (*connoisseur, idiosyncrasy, camaraderie*), which makes the misspelling harder to
  find for the wrong reason. Not measured further; it bears on S1-c had grading been reached.
- Grade 5 kept exactly its quota (7 of 12): one more drop there would have stopped the strand on volume.
- Nothing about grade fit, keys or options-only was measured. The strand's quality is unknown, not bad.

## Process

At most three subagents at once (two math authors were running throughout). Raters and screeners opened
only their one input file in their own private folder; no git, no web, no GPT, no process-killing command.
No item was changed after authoring. Herald / NWEA PDFs never opened. Commit messages are neutral.
