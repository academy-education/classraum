# map-v2 Math batch 2, 2026-10-24: pre-registration (all four MAP maths areas)

Written **before any item exists** (no author has started, no reviewer has seen anything). Batch 1's prereg
(`MAP-MATH-V2.prereg.md`) governs everything not changed here; every change is listed in **Changes from batch 1**
with its reason. Nothing here changes after an item is seen.

**Not final until its tool exists.** `map-math-v2.mjs` is batch-1 specific (221 slots, `MV2-` ids, batch-1 paths,
seeds and prereg path). Batch 2 needs those parameterised (slots `map-v2-work/math-b2/slots.json`, ids `MB2-`, the
16 authors below, WORK = `scratchpad/map-math-v2-b2-work`, results in `scripts/study-bank/map-math-v2-b2/<area>/`,
the seeds below, rule C-prime, oo parts) and its `--selftest` re-run with C-prime at its margin and reverted. This
file is committed together with that tool and its selftest output, before any reviewer output, as batch 1 was.

## Inputs

16 Claude authors, one cluster each, `scratchpad/map-v2-math-b2-work/<author>/items.json`, slots seeded in
`map-v2-work/math-b2/slots.json` (`map-v2-math-b2-slots-2026-10-24`), brief `map-v2-work/math-b2/BRIEF.md`.
Every item must print PART OK from

    math-check.mjs <file> --slots scripts/study-bank/map-v2-work/math-b2/slots.json \
      --prior scratchpad/map-v2-math-work/dump-b2/prior-math.json --families isee,ssat,map

(batch 1's 2,157 prior items plus all 221 batch-1 items; live ISEE, SSAT **and MAP** maths for near-duplicates).
Without the two extra flags a verbatim copy of a live batch-1 item printed PART OK (break-tested 2026-10-24), so
`assemble` must pass all three flags and refuses otherwise.

**Which slot set, decided by the owner before authoring starts and recorded in the commit that starts it:**

| set | when | O | N | G | D | total | end keys (S/L) |
|---|---|---|---|---|---|---|---|
| FULL | the 68 staged MAP maths items stay staged | 110 | 39 | 72 | 33 | **254** | 127 (50.0%) |
| CORE | the 68 staged items (O 25, N 12, G 20, D 11) are released live | 32 | 13 | 21 | 11 | **77** | 42 (54.5%) |

CORE is the rows marked `core: true`; it is a subset of FULL, so nothing is re-seeded if the decision changes
before authoring.

| area | letter | authors (cells) | cohort at insert |
|---|---|---|---|
| Operations and Algebraic Thinking | O | O5, O6R, O6E, O7R, O7E, O8 | `map-math-v2-b2-oa` |
| Real and Complex Number Systems | N | N56, N78 | `map-math-v2-b2-num` |
| Geometry | G | G5, G6, G7A, G7B, G8 | `map-math-v2-b2-geo` |
| Statistics and Probability | D | D5, D67, D8 | `map-math-v2-b2-data` |

## Sizing, stated before any item exists

Need for 5 complete forms (10 per area per form; `map-form-depth.ts`, which falls to 4 if one item is missing):
live O 15, N 32, G 22, D 34 -> **O +35, G +28, N +18, D +16** live survivors (with the 68 released: O +10, G +8,
N +6, D +5). Slots = need / batch-1 area keep rate (O 35%, N 51%, G 43%, D 53%) x 1.1, rounded up:
O 110, G 72, N 39, D 33 (CORE: O 32, G 21, N 13, D 11).

**The binding constraint is the extremity gate, not the count.** Projected with three yield models, all from batch
1 (kept = expected survivors; "live" = what can be inserted after rule C, then after C-prime):

| FULL | model A: batch-1 keep by area x key position | model B: end keys at the class rate 54% | model C: batch-1 keep by key position x tier |
|---|---|---|---|
| O (need 35) | kept 52, end 20% -> C holds the area (0 live); C-prime 26 live | kept 71, end 42% -> 71 | kept 61, end 39% -> C holds; C-prime 59 |
| N (need 18) | kept 21, end 43% -> 21 | kept 23, end 47% -> 23 | kept 21, end 41% -> 21 |
| G (need 28) | kept 35, end 37% -> C holds; C-prime 32 | kept 41, end 47% -> 41 | kept 40, end 39% -> C holds; C-prime 39 |
| D (need 16) | kept 20, end 36% -> C holds; C-prime 18 | kept 21, end 41% -> 21 | kept 19, end 39% -> C holds; C-prime 18 |

Model A assumes the redesign changes nothing; model B assumes every end key performs like batch 1's
difference/signed stems (31/57 kept, an **in-sample** rate from a classification written after reading the
survivors, so optimistic by construction). The truth for this batch is measured, not assumed (H1 below).

## Stages and seeds (WORK = `scratchpad/map-math-v2-b2-work`, results in `scripts/study-bank/map-math-v2-b2/<area>/`)

As batch 1 (0a assemble, 0b screen pass 1, 0c one return, 0d screen pass 2 on revised items, 0e freeze per area,
1 options-only, 2 with-source d/e cold then keyed, 3 tie-break F), with these seeds:

| stage | seed |
|---|---|
| 0b screen pass 1 (packets of <= 40: FULL 7 packets, CORE 2) | order 20261401, deal 20261402 |
| 0d screen pass 2 | order 20261403, deal 20261404 |
| 0e freeze | O 20261411, N 20261412, G 20261413, D 20261414 |
| 1 options-only | O 20261421, N 20261422, G 20261423, D 20261424 |
| 2 with-source (+ part number, parts of <= 35) | O 20261430, N 20261440, G 20261450, D 20261460 |
| C-prime deferral draw | O 20261471, N 20261472, G 20261473, D 20261474 |

Briefs: screener, graders d/e, F and the options-only solvers use `MAP-MATH-G58-V5-GRADER-BRIEF.md` verbatim with
ids `MB2-...` and this batch's paths, exactly as batch 1. A screener, grader or solver of batch 1 is not reused
(fresh subagents). Claude only; no GPT.

## The screen (stage 0): unchanged

Fail conditions S-R4, S-R5, S-R6, S-R7, S-R8 (S/L), S-R10 (S/L), S-KEY, missing/malformed, exactly as batch 1. A
pass-1 fail returns to its author once (revise, withdraw with a reason, or stand with a reason); a pass-2 fail is
recorded, not dropped. The only stage-0 drop is an author's withdrawal. No freeze minimum.

## Bars, per area (each area its own batch): A and B unchanged, C unchanged, C-prime added

**A. Options-only.** As batch 1: 1:1 live ISEE control matched by area and tier (low -> `easy`, mid/high ->
`medium`), hold if candidate - control > +10.0 points (+10.0 passes); unanimity batch-level only, hold if the
candidate's unanimous-correct rate exceeds the control's by > +15.0; not measured (held) if the control's hit rate
is > 90.0% or its unanimous rate > 85.0%; empty arm held. Reported as "the option set alone does not decide it",
never "does not leak". **Control pool** (read 2026-10-24, 709 live ISEE maths rows; eligible oa/easy 51, oa/medium
164, num/easy 25, num/medium 66, geo/easy 36, geo/medium 100, data/easy 14, data/medium 49): at the maximum FULL
need (every slot frozen: O 28 low / 82 mid-high, N 9 / 30, G 18 / 54, D 7 / 26) every cell is covered by its own
pool and no substitution is needed; batch 1's substitution rule stands for a re-read that comes up short.
**Procedural change:** the render is split into parts of at most 60 rows (candidates and controls interleaved by
the seed), three samples per part, pooled per area before any rate is computed; an area of <= 60 rows is one part.
Reason: O can freeze ~90 items, i.e. ~180 rows, beyond what one solver file held in any earlier run. No bar moves.

**B. With-source graders.** Rules R1-R11, EXT-1, off-blueprint hold, tie-break F (2 of 3; missing or malformed F
-> drop), grade fit recorded not gating: all exactly as batch 1. R11 also counts a template of any batch-1 item
(the graders are given `EXCLUSIONS-map-math-b2.txt`'s batch-1 section as the "earlier items" list).

**C. Kept-set key extremity, per insert batch.** Unchanged: `key-extremity-gate.mjs` on the kept items; refuse if
the share of keys at the largest or smallest option is under 0.8 x the chance derived from the data (40.0% at four
distinct options; 40.0% passes). Below 10 scorable items it is no measurement, recorded, not a hold.

**C-prime (new). A C failure defers interior items instead of holding the area.** If C refuses an area's kept set
(n >= 10, e end keys, share e/n < 40.0%), the minimum number m of kept **interior-key** items is deferred so that
e/(n - m) >= 40.0%: m = n - floor(5e / 2), in integer arithmetic. The m items are drawn by the area's C-prime seed (seeded shuffle of the
kept interior items in frozen order, first m). If e = 0 the area is held (nothing is inserted). Deferred items are
written to `map-math-v2-b2/<area>/deferred.json` with their full stage record, are **not inserted** in this batch,
and are eligible for the next MAP maths insert batch, where they are counted in that batch's C like its own items.
No hand choice enters: the deferred set is a function of the kept set and the seed. C is then re-run on the
inserted set and must pass.

*Why this change.* C exists so that the live bank's keys are not predictable by position; it is a property of what
is inserted. Batch 1 handled a C failure by holding the whole area, which was harmless when 70% of slots were end
keys (assembled extremity 70-72%, kept O at exactly 40.0%). Batch 2 authors half as many end keys on purpose,
because end keys are what the screen kills (batch 1: 38% kept vs 68% for interior keys). Under the batch-1 yields
(models A and C above) the batch-1 rule would hold Operations, Geometry and Statistics **entirely** — every item that
passed every quality bar would be withheld because too few of its siblings had end keys. C-prime keeps C's
guarantee on every insert (the inserted set is always >= 40.0%) and withholds only the minimum, chosen by seed.
It never inserts an item that failed A or B, and it cannot be used to rescue one. If the owner does not accept this
change, strike this section before the commit; batch 1's rule (C fails -> area held) then applies unchanged.

**Area verdict.** PASS iff A passes, C passes on the inserted set (after C-prime if needed), and at least one item
is inserted; otherwise HELD with the reason. No batch-wide verdict.

## Pre-registered measurements (recorded; none gates)

- **H1, the slot redesign.** Batch 1 kept 59/156 end-key slots (37.8%) and 44/65 interior (67.7%); Operations 6/31
  (19.4%). **Prediction:** batch 2 keeps >= 45% of end-key slots overall and >= 30% in Operations; the end-key minus
  interior keep-rate gap is <= 20 points (batch 1: 29.9). Reported per area and per class (DIFF, SIGNED, DIVISOR,
  NEGTERM), with the denominators. If end-key keep is <= 38%, the class restriction did not help and the next batch
  must not assume it does.
- **H2, the screen's one-sided strikes.** Batch 1: 57 of 156 end-key items (36.5%) failed pass 1 on S-R8 or S-R10.
  **Prediction:** <= 20% in batch 2.
- **H3, withdrawals.** Batch 1: 86 withdrawn of 221 (38.9%), 72 of them end-key slots. Prediction: <= 25% withdrawn.
  Each withdrawal reason is tagged by the coordinator to one of K1-K7, one-sided, or other, and the counts are
  recorded, so the next brief can be built from measured kill shares.
- **H4, templates.** Batch 1: 8 items dropped on R11. Prediction: <= 3 (every slot's mechanism is distinct by design).
- **Deferral.** If C-prime fires: m per area, and the number of live survivors after it, against the need.

## Expected, stated before any item exists

FULL: projected live O 26-71, N 21-23, G 32-41, D 18-21 across models A-C with C-prime (O is the only area that can
miss its +35, and only under model A, i.e. if Operations end keys still keep at batch 1's 19%). Without C-prime,
models A and C hold O, G and D outright. CORE: projected live O 8-21 (need 10; short only under model A), N 7,
G 10-12, D 6-7.

## What can't be learned here

No grade or tier label is validated by response data. Three samples of one model are not three solvers; F is a
fourth sample of the same model. H1's comparison class (31/57) was fitted to batch 1 by reading its survivors; batch
2 is the first out-of-sample test of it. Cross-author near-duplicates are printed at assemble and are for the
graders' `same_template_as` and the coordinator, not a gate.
