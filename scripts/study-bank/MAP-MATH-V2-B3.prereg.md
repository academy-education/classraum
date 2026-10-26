# map-v2 Math batch 3, 2026-10-26: pre-registration (GEOMETRY ONLY)

Written **before any item exists** (no author has started, no reviewer has seen anything). Batch 2's prereg
(`MAP-MATH-V2-B2.prereg.md`, which inherits batch 1's) governs everything not changed here, **including C-prime**.
Every change is listed under **Changes from batch 2** with its reason. Nothing here changes after an item is seen.

**Not final until its tool exists.** `map-math-v2.mjs` selects a batch with `--batch` (b1, b2). Batch 3 needs a `b3`
entry: one area (G) and its four authors, slots `map-v2-work/math-b3/slots.json`, ids `MB3-`, WORK =
`scratchpad/map-math-v2-b3-work`, authored = `scratchpad/map-v2-math-b3-work`, results
`scripts/study-bank/map-math-v2-b3/geo/`, math-check args `--slots .../math-b3/slots.json --prior
scratchpad/map-v2-math-work/dump-b3/prior-math.json --families isee,ssat,map`, earlier-items file
`map-v2-work/math-b3/EXCLUSIONS-map-geometry-b3.txt` (R11 against batches 1 and 2), the seeds below, cohort
`map-math-v2-b3-geo`, C-prime on, oo parts <= 60; and its `--selftest` re-run with b1 and b2 still reproducing byte for
byte. This file is committed with that tool and its selftest output, before any reviewer output.

## Inputs

4 Claude authors, one grade each, `scratchpad/map-v2-math-b3-work/<author>/items.json`, brief
`map-v2-work/math-b3/BRIEF.md`, slots `map-v2-math-b3-slots-2026-10-26`:

| author | grade | slots | key rank 1 / 2 / 3 / 4 | tiers low / mid / high |
|---|---|---|---|---|
| G5 | 5 (5.G, 5.MD.C) | 7 | 1 / 2 / 2 / 2 | 2 / 3 / 2 |
| G6 | 6 (6.G) | 8 | 3 / 2 / 1 / 2 | 1 / 4 / 3 |
| G7 | 7 (7.G) | 9 | 2 / 2 / 3 / 2 | 2 / 4 / 3 |
| G8 | 8 (8.G) | 8 | 2 / 2 / 2 / 2 | 1 / 4 / 3 |
| **total** | | **32** | **8 / 8 / 8 / 8** (end keys 16 = 50.0%) | 6 / 15 / 11 |

Every item must print PART OK from math-check with all three flags; `assemble` passes them and refuses otherwise.
math-check now also refuses, on any slot row that carries `rank`, a key whose ascending rank differs from the slot
(RANK) and a derivation hub (HUB: an option x2/x3/x4/x1.5/x10 of two or more others; the key in any such ratio pair;
the key the midpoint of two options). Break-tested 2026-10-26: a b2 item at its true rank prints PART OK, the same
item in a rank-3 slot fails RANK, a x2 copy of the key fails HUB, a midpoint distractor fails HUB, and the same items
against the b2 slot table (no `rank`) print no RANK/HUB line; batch-1 D8 and batch-2 G5 files reproduce byte for byte.

## Sizing, stated before any item exists

Live Geometry 42; 5 forms need 50 -> **+8 live survivors; aim +12.** Geometry keep rates: batch 1 22/51 (43%), batch 2
12/21 (57%, before the hold). 12 / 0.43 = 28 slots, x 1.1 margin -> 31; rounded to 32 so the ranks divide 8/8/8/8.
Grade split follows live Geometry by grade (g5 9, g6 12, g7 10, g8 11 after D1): G5 7, G6 8, G7 9, G8 8.

Projected, end keys at batch-1 / batch-2 Geometry end-key keep (36% / 42%), interior at (60% / 78%):
kept 15.4 / 19.2, end share 37% / 35%; live after C-prime **14.4 / 16.8** (C-prime binds in both: end keys die
more often than interior ones, so a 50% slot share keeps under 40%). Pessimistic
(end keys at 25%): 4 end keys kept -> live 10 (still >= 8). **None of this protects against the options-only hold,
which holds the whole area**; the slot design is what does (H1).

## Stages and seeds

As batch 2, for one area: 0a assemble, 0b screen pass 1 (one packet of <= 40), 0c one return, 0d screen pass 2 on
revised items, 0e freeze, 1 options-only (one part if <= 60 rows), 2 with-source d/e cold then keyed (parts of <= 35),
3 tie-break F, then C and C-prime.

| stage | seed |
|---|---|
| 0b screen pass 1 | order 20261501, deal 20261502 |
| 0d screen pass 2 | order 20261503, deal 20261504 |
| 0e freeze | 20261513 |
| 1 options-only | 20261523 |
| 2 with-source (+ part number) | 20261550 |
| C-prime deferral draw | 20261573 |

Fresh subagents only: no screener, grader, solver or tie-breaker who saw batch 1 or batch 2 Geometry. Claude only.

## Bars (unchanged from batch 2)

**A. Options-only:** 1:1 live ISEE Geometry control matched by tier (low -> `easy`, mid/high -> `medium`), hold if
candidate - control > +10.0 (+10.0 passes); unanimity batch-level, hold if > +15.0; not measured (held) if the control
hit rate > 90.0% or unanimity > 85.0%. Pool (2026-10-24 read): geo/easy 36, geo/medium 100 against a maximum need of
6 low and 26 mid/high: covered, no substitution. **The control is drawn fresh by this batch's seed**; the batch-2
control rows may recur by chance and are not excluded (excluding them would select the control on a known result).
**B. With-source graders:** R1-R11, EXT-1, off-blueprint hold, F 2-of-3, grade fit recorded: unchanged; R11's
earlier-items list is batches 1 and 2 (EXCLUSIONS-map-geometry-b3.txt), the 12 held batch-2 items included.
**C and C-prime:** unchanged (C on the kept set; if it fails, defer m = n - floor(5e/2) interior items by the C-prime
seed; held only if e = 0).

**Verdict:** PASS iff A passes, C passes on the inserted set, and at least one item is inserted; otherwise HELD.

## Changes from batch 2

1. **One area, four authors, 32 slots** (above). Reason: Geometry is the only binding area (D1, 2026-10-26).
2. **Key RANK fixed per slot, 8/8/8/8, and RANK/HUB refusing in math-check.** Reason: batch 2 Geometry's options-only
   hold. The three solvers picked the second-smallest option on 39 of 54 candidate picks; 6 of 18 candidate keys sat
   there (control 2 of 18) and drew 16 of their 18 picks; all 21 candidate hits were middle picks. Across MAP maths
   the frozen rank-2 share was 13-21% in every area that passed and 33% in the one that failed. HUB guards the tell
   that keyed 5 of 17 controls and 0 candidates. This is an authoring constraint, not a bar: A is unchanged and
   is measured exactly as before.
3. **Duplicate corpus `dump-b3`** = dump-b2 + all 72 batch-2 items with outcomes (21 live, 3 deferred, 12 held,
   21 dropped, 15 withdrawn), and a Geometry-only exclusions file.

No change to any threshold.

## Pre-registered measurements (recorded; none gates)

- **H1, rank.** Frozen and kept key-rank histograms are printed. Prediction: rank-2 share of the frozen set <= 25%;
  the solvers' rank-2 pick rate on candidates is reported beside the candidate rank-2 key share. If A holds again
  with a frozen rank-2 share <= 25%, rank was not the mechanism and the next Geometry batch must not assume it was.
- **H2, end keys.** Batch 1 Geometry kept 13/36 end-key slots (36%), batch 2 5/12 (42%). Prediction: >= 40%.
- **H3, templates.** Batch 1 Geometry lost 6 items to R11, batch 2 2 of 6 drops. Prediction: <= 1.
- **H4, HUB cost.** The number of items whose author recorded a MECHANISM SWAP or EMPTY because of RANK or HUB.

## Expected, stated before any item exists

Live after C-prime 10-17 of the +8 needed, if A passes. The main risk is A, not yield: 32 slots freeze at most 32
items, so A runs on n <= 32, where one solver's correlated prior moves the margin several points.

## What can't be learned here

No grade or tier label is validated by response data. Three samples of one model are not three solvers. The
rank finding comes from one held batch (n = 18) and correlational comparisons across six others; H1 is its first
test. A pass on A means the option set alone does not decide it, not that the batch does not leak.
