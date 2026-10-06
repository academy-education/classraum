# Live SAT Math v2: every answer key independently re-solved (begun 2026-10-02, finished 2026-10-06)

Read-only. No item was edited or archived. This closes the gap left by
`MATH-LIVE-AUDIT-2026-10-02.md` §2: "816 v2 items have no mechanical key
check of any kind."

## Population

    live = family sat, section math, verified=true, archived=false
    dump 2026-10-06    count(head) 1364 = loaded 1364 = distinct 1364   (paged, ordered by id)
    cohort v2           820

The total grew from 1343 to 1364 since 2026-10-02, all of it outside v2. On
the v2 rows the 10-06 dump differs from the 10-02 dump in exactly two items,
`820a40b5` and `df25c0d2`, the two edited on 2026-10-02. No key and no graphic
changed. Every solver input (prompt, option set and graphic) was compared with
the 10-06 live text. All 820 match, apart from the two edited items' old-text
labels, which are excluded from the count (below).

## Coverage by method

| method | v2 items | result |
|---|---|---|
| sympy (`v2-verify/check-answer-computability.py`) | 42 of 820 parse (778 UNPARSEABLE, not a verdict) | 42 OK, 0 WRONG |
| independent solve, pass A (options in stored order) | 820 of 820 | 820 agree with the key |
| independent solve, pass B (options shuffled, different batch grouping) | 820 of 820 | 820 agree with the key |
| equal-value option scan (radicals, π, fractions, decimals, symbolic) | 804 of 820 with ≥2 parseable options | 0 equal-value pairs |
| key-in-choices / duplicate option strings | 820 of 820 | 0 / 0 |

**Every v2 item has two independent solves, and the two agree with the stored
key: 820 of 820.** 42 of those also have an agreeing sympy verdict. Each item
received exactly one A-family and one B-family solve (A01–A21 + C01, B01–B21 +
D01; 1,704 records with 0 empty `value`/`work` fields). The two edited items
were re-solved on their current text, as S043/S044 in C01 and D01. Their
pre-edit labels (Q0406, Q0675) do not count.

**Solvers.** Claude subagents only, never more than 3 per batch of about 40.
They saw label, domain, prompt, options and graphic, but not the key, the
explanation or any other file. Brief: `solver-brief.md` (session scratchpad).
Batches A01–A11, B01–B09, C01 and D01 came from earlier sessions. A12–A21 and
B10–B21 were run on 2026-10-06. One slip: for a short time, four solver
agents were running at once.

**Controls.** 30 non-v2 items with known keys were seeded into the batches,
and each was solved twice. 60 of 60 agree.

### Why the 820/820 is evidence and not a formality

- **Scorer break test.** With the first distractor promoted to key, 820 of
  820 items flip to "disagree". The agreement is measured, not defaulted.
- **Position cannot carry it.** Pass B shuffled the options. Stored key slots
  are 202/225/203/190, so no slot dominates.
- **The solvers catch real defects.** Both pre-edit texts were still in
  batches A13/A17/B18. The solvers flagged df25c0d2's `3√13`/`√117` pair
  "two-options-correct" in **both** passes (A13, B18). They caught
  820a40b5's impossible "exactly 2 kg" premise in **only one of two** (A17
  flagged it; B06 answered 2400 silently). These are the two defects the
  10-02 audit found and fixed. A single pass can therefore miss a wording
  defect, though not an equal-value pair. That is why both passes count, and
  why wording defects outside the three below cannot be ruled out.
- **sympy fixed checker.** Self-test 37/37. Each fix was reverted separately
  (`brk1`: decimal lookahead, `brk2`: extremum). Each revert fails exactly
  its 2 pinned cases (35/37). On the current v2 text, all 126 distractor
  promotions across the 42 OK items flip to WRONG.
- **Equal-value scan.** Self-tested on 9 fixtures. It reproduces the known
  pair on the 10-02 dump (`df25c0d2` `3√13`/`√117` → 1 hit) and finds 0 on the
  current dump.

**What this does not establish.** Two Claude solves are not two independent
solvers; see CLAUDE.md, "one solver sampled three times". A misreading shared
by the model, the author and the key would agree with itself. The checks
above show the instrument can disagree. They do not show it would
disagree on a shared blind spot. 778 items have no non-model check.

## Confirmed defects (keys correct; wording/figure)

No v2 key is wrong. Three items carry a defect that a student could trip
over. Each was hand-checked against the live row.

1. **`2651c472` (Q0137, PSDA, IQR, medium): two conventions, two offered
   answers.** Data 2, 5, 7, 10, 14, 16, 21. Median excluded from the halves:
   Q1 = 5, Q3 = 16, IQR = **11** (key). Median included (Tukey hinges, Excel
   `QUARTILE.INC`): Q1 = 6, Q3 = 15, IQR = **9**, which is also an option. The
   item's own explanation describes 9 as "wrongly includes the median". Both
   solve passes flagged it on their own (A14, B11). Every n-odd IQR item has
   this exposure when the other convention's value is a distractor.
   Suggested fix: replace the distractor `9`, or use an even-n data set.
2. **`40b7798b` (Q0223, PSDA, rates, easy): underspecified stem and table.**
   The whole prompt reads "What is the car's speed, in miles per hour?" No
   car is introduced and no passage exists. The table has the column
   "Distance (miles)", values 52/104/156/208, and unlabelled row labels
   1–4. Key 52 holds only if those rows are hours, and nothing says so.
   Flagged by both passes (A14, B13). Suggested fix: add a "Time (hours)"
   label and one sentence of context.
3. **`825707e2` (Q0408, Geometry, inscribed angle, medium): figure not to
   scale.** The stem and the figure's own label say ∠AOB = 100°. The SVG
   draws OA at 207° and OB at 63°, which is **144°**. A protractor reading of
   ∠APB gives 72°, which is not an option, so the key 50° is unaffected. The
   SAT draws figures to scale unless it says otherwise, and this one says
   nothing. Noted by two solvers (A12, B19). Suggested fix: redraw at 100°.

## Dismissed leads

- **`f1026628` (Q0736): "which correctly compares the standard deviations"
  against options that name the larger set.** Only one option is true (set A
  deviates by up to 20, set B by up to 2). The wording is loose, but no
  second answer is defensible. Not a defect.
- **Q0675 / Q0406** (old text of `df25c0d2` / `820a40b5`). Already fixed on
  2026-10-02. The current text was re-solved clean in both passes (S043,
  S044).
- **Equal-valued option pairs:** none on current text, from both the scan
  and the solvers.
- **Non-unique stems** (two roots offered with no greatest/least, etc.):
  none flagged on current text apart from Q0137 above.

## Reproduce

Scratchpad `…/scratchpad/v2`: `labels.json` + `labels-c.json` (label → id, key
withheld from batches), `batches/*.json`, `out/*.json` and `../solve/*/out.json`
(solves), `score3.py` (coverage + leads), `eqopt.py` (equal-value scan),
`sympy_v2_1006.json`. The scratchpad is not committed. Re-derive the
population with the filter above, and assert `count == loaded == distinct`
before any number.
