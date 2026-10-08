# act-math-v24 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

v23 (55 items) was HELD at the options-only screen by the unanimity bar,
+16.4 against +15, by 1.4 points. The key-position tell was fixed (13/28/14
by value). What carried the gap was **which interior option**: interior-key
hits 56/84 = 66.7% vs the control's 47/96 = 49.0%, and Algebra carried it
(7 of 14 unanimous). v24 is v23's design with v23's bars, plus the
register's v24 rules (interior parity, no complement / shared-denominator
pairs, Algebra at ~2x deficit, mandatory hand keyword search).

`form-capacity.mjs` and `next-form.mjs act/math` (2026-10-08, after v23 was
held, re-run before writing this file): **ACT Math 16 forms** (751 items),
binding Algebra 135 / 8 per form; form 17 = Algebra +1.

    domain                        live  /form  form 18  deficit17+18  authored  rule
    Algebra                        135     8     144          9          18     ~2x deficit
    Geometry                       136     8     144          8          10     +30% (10.4)
    Integrating Essential Skills   154     9     162          8          10     +30% (10.4)
    Functions                      137     8     144          7           9     +30% (9.1)
    Statistics and Probability     103     6     108          5           7     +30% (6.5)
    Number and Quantity             86     5      90          4           5     +30% (5.2)
    total                                                    41          59

Five Claude authors (no GPT), every file >= 10 so the per-file gates measure:
**A1** = Algebra 10; **A2** = Algebra 8 + N&Q 5 (13); **B** = Functions 9 +
S&P 7 (16); **C** = Geometry 10; **D** = IES 10. A1 and A2 get disjoint
Algebra sub-topic lists (no shared mechanism inside the batch). Files
`act-math-v24-{a1,a2,b,c,d}.batch.json`, merged `act-math-v24.batch.json`; ids
`AM24{A,N,F,S,G,I}-NN` (A1 numbers A-01..10, A2 A-11..18); cohort
`act-math-v24`; four choices (`act-test.ts` math `choiceCount: 4`).
Commissioned medium/hard; banked difficulty is the graders'. `BANK_BAND=mixed`.
**No repairs after the attack.** No v21/v22/v23 item, mechanism or option set
reused (re-submitting a held item re-decides a finished batch).

## Carried over unchanged from v23

All of `ACT-MATH-V23-PREREGISTERED.md` applies unless replaced below: v20's
four distractor rules and v21's mechanism-duplicate rule; the (a)/(b) bans
(incl. evenly spaced runs and multiplicative chains under (a)); the (c)
one-sided error family ban with `distractor_meta` and `one_sided_check`, and
the mechanical (c) return; `quantity_asked`, `distractor_kind`, `mechanism`,
`arith_class_check` author fields, all stripped before grading.

## NEW in v24 — (d) interior parity, (e) complement and shared-denominator pairs

**(d) Interior parity.** Sort the four options by value; the two interior
options (ranks 2 and 3) must look equally clean: the same number form
(integer / decimal / fraction / radical), the same decimal shape as DISPLAYED
(no 5.60 beside 5.29 — a trailing zero is a rounder number), and the same
"niceness". Never an integer beside a messy decimal, never a simple fraction
beside an ugly one. Authors aim for exactly equal display complexity and
check that the key is not the nicer interior option.

**(e) Pairs.** No two options summing to 1, 90, 180 or 360 (or 100 when the
options carry %) — x and 1−x, x and 180−x. No shared-denominator structure
that singles out the key (key and one other on a denominator the other two
lack; three on one denominator and one off it).

**The new pre-flight script, `check-interior-niceness.mjs`** (written for v24,
`--selftest` 11/11; the selftest fails 4 of 11 with trailing-zero stripping
removed). Display complexity = significant digits + decimal places after
stripping trailing zeros (fractions c(a)+c(b)+1, radicals digits+symbols).

Break-tested on v23 before this file was written — and **the register's
narrow hypothesis was wrong**:

    interior-key items        asymmetric pair   key CLEANER of differing   parity violations
    v23 candidates (28)       20/28 = 71.4%     6/20  = 30.0%              16/55
    v23 matched controls (32) 12/32 = 37.5%     9/12  = 75.0%               9/53
    live act/math (397)      187/397 = 47.1%  115/187 = 61.5%             138/711

    blind hit rate on interior keys     asymmetric pair     tie pair
    v23 candidates                      44/60 = 73.3%       12/24 = 50.0%
    v23 controls                        28/36 = 77.8%       19/60 = 31.7%

v23's keys were NOT the cleaner interior option (30%, under chance). What
separated the arms was that the candidate interior pair was asymmetric far
more often (71.4% vs 37.5%), and the blind samples found asymmetric-pair keys
in BOTH directions (~75%) against ~32–50% on tie pairs. Asymmetry is the
information, whichever way it points. So (d) is enforced as parity, not only
as "key not nicer".

**Mechanical (mine), stage 0 — return to that author ONCE, before any attack**
(v20's one-return rule): any item the script prints with
- `parity` (interior forms differ, or display complexity differs by >= 2), or
- `KEY-CLEANER` (key strictly cleaner than the other interior option), or
- `complement`, or
- `denominators` (shared-denominator singling).

**Pre-flight REPORT, not a gate** (printed for the merged 59, each file, and
the matched controls): asymmetric share on interior-key items and key-cleaner
share. Target: the candidate asymmetric share at or under the control's.
Stage 1 additionally prints the blind hit rate split asymmetric / tie per arm
(`--attack`).

## Per-batch key-position target (as v23, re-measured live today)

`key-rank-position.mjs --live act`, 711 scorable of 751: smallest 22.5% /
middle 55.8% / largest 21.7%. **Target for 59: smallest ~14, middle ~31,
largest ~14.** Band on the merged 59 alone: smallest and largest in [15%,
32%] (9–18 items), middle in [42%, 62%] (25–36). Outside = stage-0 FAIL,
back to the author once. `key-extremity-gate.mjs` and `check-key-magnitude.mjs
act/math` on the merged 59 and each file.

## Stage 0 — structural pre-flight

`act-math-v18-preflight.sh` per author file and on the merged 59 (sandbox N/N,
distractor_solve 3N/3N, hub <= +10, extremity PASS, magnitude consistent, 0
composites, sign-pair / dead-options / stem-echo / key-singleton exit 0, stem
duplicates and duplicate option sets clean; plurality exit 2 = NOT MEASURED),
the key-position band, the (c) mechanical check, the (d)/(e) mechanical
check, and `check-key-arith-class.mjs` as a reading list (every key line read
against its stem).

## Stage 3 duplicate checks — run BEFORE the attack, all three mandatory

`act-math-v16-dupscan.mjs 59`, `math-mechanism-dup.mjs 59` (both over all live
maths rows, paged, count asserted; every FLAG read by hand) and a **hand
keyword search** of the full live maths dump per candidate mechanism, by me,
recorded per item. v20, v23 each found duplicates this way that both scripts
missed (v23: AM23A-12 = sat a0dae3a7, AM23F-08 = sat 7d3066a6). A confirmed
duplicate found here goes back to its author inside the single stage-0 return
(the replacement re-runs stage 0 and these checks); one found after the return,
or after the attack, drops (rule 5). Nothing is edited after the attack; the
attack runs on the files as they stand, with the count asserted.

## Stage 1 — options-only attack (screen), bars unchanged from v23

Candidates interleaved with live ACT Math controls **matched 1:1 by domain**,
act-math-v16..v24 excluded, keys dealt flat within each arm,
`act-math-v24-attack-draw.mjs` (v23's renderer; only names, the v23/v24
exclusions and the seed changed). Three blind Claude samples, recorded as
**three samples of one solver**. `score-oo.mjs`.

- At n = 59: 177 picks per arm; one pick 0.56 points; one item 1.7 points.
- **Batch HOLD** if candidate margin exceeds the control's by **more than +10**.
- **Batch HOLD** if the candidate unanimous-correct rate exceeds the
  control's by **more than 15 points** (~9 excess items).
- Ceiling: live ACT Math arms have measured 26–38% on this instrument (v16
  27.2, v18 36.2, v19 30.3, v20 37.8, v23 33.9), so both bars sit far under the
  attainable range's top and can fire; the v23 bar did fire.
- **Instrument-invalid** if the control margin is itself >= +25: the
  with-source half decides alone.
- Per item: unanimous-correct drops ONLY with with-source corroboration
  (rule 6).

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` of a copy with
`bounds`, `distractor_kind`, `quantity_asked`, `mechanism`,
`arith_class_check`, `one_sided_check`, `distractor_meta`, and any
`interior_parity_check` stripped; the render summary must name no unrecognised
field; both quote the render sha at start and end. v23's grader fields, plus
**`interior_parity`**: is one of the two interior options visibly cleaner or
differently shaped, or does any option pair complement / share a denominator
in a way that points at the key?

Kept only if all of v23's rules 1–8, plus:

9. **New:** a confirmed (d)/(e) shape — an interior-niceness asymmetry, a
   complement pair or a shared-denominator pair that singles out the key —
   named by either grader and confirmed by me -> drop.

Difficulty banked = graders' label (agree -> it; one apart -> the easier;
easy vs hard -> medium).

## Stage 4 — kept set, insert

The kept set re-runs stage 0 as a set (extremity and magnitude on the kept set
alone if >= 10 numeric). A measured gate failing holds the batch — no dropping
or editing items to pass. Ledger entry, then insert with `BANK_FAMILY=act
BANK_COHORT=act-math-v24 BANK_BAND=mixed`, then `verify-act-draw.ts`,
`form-capacity.mjs`, `next-form.mjs act/math`. REGISTER §5 and the ledger
entry in the same commit. Commit locally; no push.

## Success

**ACT Math 16 -> 18 forms** if kept items meet all six form-18 deficits
(Algebra 9, Geometry 8, IES 8, Functions 7, S&P 5, N&Q 4). **16 -> 17** needs
only Algebra >= 1. Anything less is partial, inserted if it passes, recorded
at its true value with denominators and the remaining deficit.
