# map-math-g58-v3, 2026-10-20: pre-registration

Written and committed **before any item exists**, with its tools (`map-math-g58-v3.mjs`, `--selftest`
75/75) and briefs (`MAP-MATH-G58-V3-AUTHOR-BRIEF.md`, `MAP-MATH-G58-V3-GRADER-BRIEF.md`). The result goes in
REGISTER §5 and the ledger entry `map-math-g58-v3-2026-10-20`, in one commit. Nothing here is changed after
an item is seen; anything decided later is recorded in REGISTER §5 as a deviation.

## Why this batch

Owner, 2026-10-20: "Keep going with the MAP question batches" (MAP launches at grades 5-8, Math included).
`map-math-g58-v1` inserted 11 STAGED items, all Statistics and Probability. `map-math-g58-v2` (REGISTER §5,
2026-10-12) wrote 60 items for the other three areas and **stopped at Stage 0 on volume, not quality**: the
pre-freeze screen failed 29 of 60 (R4 two or more free strikes 18, one-sided extreme key 7, option pair 3,
plug-back 1); one return rescued 12; Geometry kept **12 of 20**, under the freeze bar of 15 (oa 16, num 15).
Nothing after Stage 0 was reached. A grades 5-8 MAP maths form draws 10 per area, so these three areas are
still at 0.

## What changes against v2 (everything else is v2's prereg, unchanged)

| | v2 | v3 |
|---|---|---|
| items per area | 20 (5 per grade; tiers low 6 / mid 7 / high 7) | **28 (7 per grade; tiers low 8 / mid 12 / high 8)** |
| extreme keys per area | 12 (6 S / 6 L) = 60% | **16 (8 S / 8 L) = 57%** |
| ids, seeds | `MM2-`, 2026108x | **`MM3-`, 2026109x** |
| near-duplicate check | live ISEE + SSAT maths, every v1 item | **plus every v2 item** (60, as assembled) |
| commission | 3 authors, one per area, two runs of 10 | **3 authors, one per area, two runs of 14** |
| freeze bar | every area keeps >= 15 of 20 | every area keeps **>= 15 of 28** |
| author brief | v2's | v2's, plus rule 18 (why v2 stopped; cover-the-stem self-check) |

The expected effect, stated before any data: at v2's overall keep rate after the return (43 of 60 = 72%),
28 per area keeps about 20, five above the bar; at Geometry's v2 rate (12 of 20 = 60%) it keeps about 17.

Unchanged, by reference to `MAP-MATH-G58-V2.prereg.md`: source policy (no NWEA item, no Herald PDF, no web,
Claude only, at most three subagents at once); options plain numbers, no graphic; the cluster-to-area table
and RIT bands; the per-part check (sandbox key and distractor recompute, slot, mechanical checks, niceness,
near-duplicates, `bound_screen`); the pre-freeze screen with its rules R4-R10, **one return** to the author
and one fresh screener for the returned items, no second return; the options-only attack per area against a
matched live ISEE control (+10 margin, +15 unanimity, 90% ceiling, NOT MEASURED above it); the two
with-source graders cold then keyed; every drop rule including the fixed single-grader tie-break (third
grader F, 2 of 3 drops, a tie drops); the difficulty bars D1-D3; the per-area key-extremity gate (n >= 10);
the staged insert (`verified=false`, cohort `map-math-g58-v3`, never `verified=true`).

## What can't be learned here

As v2: no grade label is validated by response data; a human sitting releases staged rows; the screen and
graders are models and share priors (three samples of one solver are correlated, so unanimity is an area
comparison and never drops an item).
