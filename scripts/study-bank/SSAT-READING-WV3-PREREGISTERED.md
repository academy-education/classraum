# SSAT Reading pilot 3: whole-passage variants, relative naturalness bar. Pre-registered 2026-10-06 (before any item exists)

Owner approved a third pilot on 2026-10-06. Pilot 2 (`SSAT-READING-WV-PREREGISTERED.md`, REGISTER A77)
failed ONLY bar E, and E was the wrong instrument in two ways:

1. **It was absolute, and the shipped bank fails it.** Both pilot-2 judges rated the pilot passages
   4/4 and 3/3, and rated the LIVE control passages 1/1 (s4) and 2/2 (s3). A bar of "mean >= 4.0 and
   not flagged" would reject the live bank it is meant to match.
2. **The judge prompt named the design's required feature as a tell.** It listed "names a set of
   candidates and rules them out" as a sign of constructed text. Every live s3/s4 passage is built
   that way (SSAT-READING-DIAGNOSIS §2: 77.6% of live distractors are named and ruled out).

A, B, C, D and F were never run in pilot 2.

## What is the same as pilot 2 (unchanged, by reference)

- **Method and generator:** whole-passage five-version units, `ssat-wv.mjs verify` (every refusal
  listed in pilot 2's §Unit), author brief `SSAT-WV-AUTHOR-BRIEF.md` unchanged.
- **Freeze -> hash -> draw:** the `*.wv.json` files are committed before the draw; `frozenSha` =
  sha256 of their bytes in sorted path order; `k(passage_id)` = the same formula and the same seed
  string `ssat-wv-2026-10-06` as pilot 2 (new passage ids and new bytes give new draws). Never re-rolled.
- **Bars A, B, C, D, F**, the same 48-item live control, the same instruments, the same scorer
  (`ssat-wv.mjs score`), and between-on-A counts as **not passing**.

## What is new

- **New passages:** 2 units × 6 questions, ids `WV3-P01`, `WV3-P02`, files
  `ssat-wv3-p01.wv.json`, `ssat-wv3-p02.wv.json`. Written by two **fresh** Claude author agents
  that see only the brief and their own file (never pilot 1/2 items). Genres assigned so they differ
  from pilot 2 (memoir; history/science feature): P01 **narrative fiction**, P02 **science or
  nature feature**.
- **Bar E restated as relative** (below).

## Bars (pilot 3 passes only if ALL pass)

- **A. Options-only, isolated.** The 10 non-vocabulary candidate items shuffled into the same 48
  live control items (`ssat-reading-diag/taskF.json`); three fresh samples of one Claude solver,
  pooled. **supports:** candidate <= 40% AND control <= 40%. **fails:** candidate >= 60%.
  **invalid:** control outside 10–45% (re-run the control). **between:** not passing.
  *Range check:* the control measured 26.4% (pilot 1, 3 samples) and 21.1% / 15.0% (model / human
  on the shipped bank), so it sits inside its 10–45% validity window and below the 40% support
  line with 13.6 points of headroom; the candidate's 0–100% range contains both bars. Context only
  (not a bar): `ssat-wv.mjs null` gives the exact null over the 5^2 draws.
- **B. Options-only, grouped.** One passage per file, all 6 items; three samples pooled; **<= 40%**.
  *Range:* 0–100%, chance 20%, bar attainable from both sides.
- **C. With-source exclusivity.** Two independent graders on the drawn passages give `pick`,
  `second_defensible`, `difficulty`. An item passes if both pick the key and neither names a second
  defensible choice. **>= 10 of 12.** *Range:* 0–12.
- **D. Cross-version validity.** One reviewer, all 5 versions × 6 questions × 2 passages = 60
  question-versions: does each version make its claimed choice the unique answer and refute or fail
  to support every sibling (passage-supported standard)? **>= 54 of 60.** *Range:* 0–60.
- **E. Naturalness, RELATIVE.** Two blind judges each see **8** unlabelled passages, shuffled by the
  build: the 2 drawn candidate passages and **6 live passages**, 2 each from s2, s3, s4, chosen
  mechanically (per cohort, the 2 passage groups with >= 3 live items having the lowest
  `sha256("ssat-wv3-nat|" + passage_group_id)`): `rw-RW-S18`, `rw-RW-S12` (s2), `rw-RW3-S04`,
  `rw-RW3-S01` (s3), `rw-RW4-S21`, `rw-RW4-S18` (s4). Their text is frozen now in
  `ssat-wv3-pilot/natlive.json`. Each judge gets ONLY this neutral prompt:

  > Below are 8 reading passages. For each, rate how natural and coherent the prose reads as a
  > published reading passage for middle and high school students, on a scale of 1 (very unnatural
  > or incoherent) to 5 (reads exactly like a well-written published passage). Judge each passage on
  > its own. Give an integer rating and a one- or two-sentence reason for each. Return JSON:
  > {"labels": {"N1": {"rating": <1-5>, "reason": "..."}, ...}}

  No mention of answer choices, tests construction, candidates, or ruling-out.
  **Bar:** the median of the 4 pooled candidate ratings (2 judges × 2 passages) **>=** the median of
  the 12 pooled live ratings (2 judges × 6). *Validity:* a judge that omits a rating or reason, or
  gives all 8 passages the same rating, is discarded and re-run with a fresh judge.
  *Range check:* the live median lies in 1–5, and the candidate median can reach any value in that
  range, so the bar can pass and fail. **Floor:** if the pooled live median is 1, the bar cannot fail;
  E is then INVALID, re-run once with two fresh judges; if still 1, E is not passing (no measurement).
  Scored by `ssat-wv.mjs score <out> --nat3 <judge files>` (break-tested before this commit: a
  candidate median of 3 vs live 3.5 FAILS, 3.5 vs 3 passes, a flat judge and a missing rating are
  discarded, live median 1 is INVALID).
- **F. Difficulty.** From the C graders (easy=1, medium=2, hard=3); an item is easy if the mean of
  the two is <= 1.5. **<= 6 of 12 easy.** *Range:* 0–12.

(The owner's note called the difficulty bar "D"; this document keeps pilot 2's letters: D is
cross-version validity, F is difficulty.)

Any failure stops the run and is recorded. No repair round. Claude subagents only (never GPT), at
most 2 at a time; the three A/B samples are one solver sampled three times, not independent raters.
Order of running does not affect the verdict; all bars are applied as written.

## Batch, if and only if pilot 3 passes

Run `admission-form-depth.ts` for the current SSAT Reading depth, then author enough new units to
add **+2 clean forms** (pilot 2's replay said 2 pilot + 12 new 6-item passages; recomputed before
authoring). At most 2 author agents at a time. Each round passes the same gate: verify, freeze,
draw, A and B against the same 48 control items (three samples), C+F on every drawn item, D on every
question-version, E (relative, same 6 live passages, same prompt). Items failing C are dropped;
passages left with fewer than 5 items are dropped. Ledger entry, insert as cohort
`ssat-reading-wv3`, re-run `admission-form-depth.ts`, report forms before -> after. The human sitting
remains the verdict for a verbal cohort (bank-gate §5).
