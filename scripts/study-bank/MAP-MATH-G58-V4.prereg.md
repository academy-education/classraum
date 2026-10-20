# map-math-g58-v4, 2026-10-20: pre-registration

Written and committed **before any item exists**, with its tools (`map-math-g58-v4.mjs`, `--selftest`
83/83) and briefs (`MAP-MATH-G58-V4-AUTHOR-BRIEF.md`, `MAP-MATH-G58-V4-GRADER-BRIEF.md`). The result goes in
REGISTER §5 and the ledger entry `map-math-g58-v4-2026-10-20`, in one commit. Nothing here is changed after
an item is seen; anything decided later is recorded in REGISTER §5 as a deviation.

## Why this batch

Owner, 2026-10-20: "Keep going" (on the MAP batches). `map-math-g58-v3` (REGISTER §5, 2026-10-20) staged
Operations and Algebraic Thinking (25) and Geometry (20) and **held Real and Complex Number Systems whole**:
options-only 38.9% against a matched live ISEE control at 19.4% (+19.4, bar +10). Staged map/math is now
Oper 25 / **Real 0** / Stat 11 / Geom 20 pooled over grades 5-8; a MAP maths form draws 10 per area, so
there is **no form until Number Systems has at least 10**. v4 writes Number Systems only.

## What v3 taught, measured before this was written (on v3's own data, so a hypothesis, not a result)

- The v3 Number Systems return author's stated method: one "sacrificial" distractor a cheap bound strikes,
  the other two "real errors that land inside every cheap bound" — mostly computational slips beside the
  key. The three solver samples named their heuristic: drop the far option, take the centre / the option
  the others are built from.
- Two cheap structural detectors were built for that and **both failed on known data** (recorded so nobody
  builds them again): "key is the unique derivation hub" fired on 4.2% of v3 Number Systems candidates vs
  8.3% of live controls; "key is the middle of the three after dropping the farthest" fired 29.2% vs 20.8%,
  and 35.7% on v1's Operations candidates, which the solvers got only 16.7% right. Neither is a gate.
- What does separate v3's Number Systems candidates: an option alone by sign or size (the LONE rule below).
  The 7 such candidates were solved 66.7% of the time against 27.5% for the other 17; on the live controls a
  lone option predicted nothing (20.0% vs 19.3%). Fitted on n = 7 from the data that suggested it, so it is
  used as a **construction rule**, and v4's options-only attack is what tests it.

## What changes against v3 (everything else is v3's prereg, and through it v2's, unchanged)

| | v3 | v4 |
|---|---|---|
| areas | oa, num, geo, 28 each | **num only, 40** (10 per grade; tiers low 12 / mid 16 / high 12) |
| extreme keys | 16 of 28 (8 S / 8 L) | **24 of 40 (12 S / 12 L) = 60%** |
| ids, seeds | `MM3-`, 2026109x | **`MM4-N01`-`N40`, 2026114x** |
| commission | 3 authors, one per area, two runs of 14 | **2 authors: A grades 5-6 (N01-N20), B grades 7-8 (N21-N40), two runs of 10 each** |
| near-duplicate check | live ISEE + SSAT, v1, v2 | **plus every v3 item, as assembled and as first written** |
| part check | v3's | v3's **plus LONE and SLIP** (gating; also applied to every returned item) |
| freeze bar | every area >= 15 of 28 | **>= 15 of 40** |
| author brief | v3's | v3's for Number Systems, plus rules 19-22 (why v3 was held; LONE; SLIP; the cover-the-question test) |

**LONE:** no option is the only one of its sign, and no option sits alone in size (>= 2x from its nearest
neighbour AND more than twice the log-spread of the other three). Break-tested at its margin (65 among
28-32 fires, 63 does not) and on v3's N22 / N26 / N02 shapes; refuses v3's own N22 through the part check.

**SLIP:** every distractor declares `slip` (a computational slip on the key's own correct working) and names
its `misconception`; at most one slip, three different misconceptions. Declarations are authoring
structure, not a check (CLAUDE.md 2026-09-24): whether they are true is read by the graders'
`path_coherent` / `distractors_weak`, and whether they worked is read by the options-only attack.

**The return stays as v3 ran it** (one return, one fresh screener, no second return), with LONE and SLIP
binding on the revision. Stated now because v3's return is where its Number Systems leak was built.

## Bars (v3's, at n <= 40, one area)

Options-only vs a matched live ISEE control drawn by v3's rule (num easy 25 / medium 66 eligible
2026-10-20; low -> easy, mid / high -> medium; seed 20261142): **HOLD if candidate minus control > +10 or
unanimity > +15; NOT MEASURED if the control exceeds 90%.** Difficulty D1-D3, the drop rules, the tie-break
grader F (2 of 3, a tie drops), the kept-set key-extremity gate (n >= 10) and the staged insert
(`verified=false`, cohort `map-math-g58-v4`) are v3's, unchanged.

**Control floor, stated in advance:** v3's matched num control came in at 19.4%, under the 25% letter line.
The margin is computed against the measured control, never a literal; a control at or below 15% is reported
as such and the margin still decides (the bar sits inside the attainable range either way: 0-100 minus a
control of 15-30).

## What success means

Number Systems PASSES and at least 10 items are inserted staged: the pooled grades 5-8 staged pool then
supports one MAP maths form (Oper 25 / Real >= 10 / Stat 11 / Geom 20). Grade-band forms (5-6, 7-8) need
more Statistics and Probability as well; out of scope here.

## What can't be learned here

As v3: no grade label is validated by response data; a human releases staged rows; three solver samples
are one solver (unanimity is an area comparison, never an item drop). And: whether LONE is the mechanism or
merely co-occurred with it in v3 — v4 is the first data that can say.
