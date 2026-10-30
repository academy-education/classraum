# MAP Science batch 2, 2026-10-31: pre-registration

Written **before any batch-2 item exists**, after the tools below were built and break-tested. Nothing below changes
after an item is seen. Bars, drop rules and attack rules are copied from `MAP-SCIENCE-B1.prereg.md` (which carries the
pilot's rules 1-8); where batch 2 differs, the difference is named and the reason given. Plan: `MAP-SCIENCE-PLAN.md`.
Batch 1: REGISTER 2026-10-27 (215 staged of 240) and 2026-10-30 (key-visible audit; 241 MAP rows released on the owner's
"GO on both").

## Goal and sizing (fixed now)

Live today (`bank-state.mjs counts`, 2026-10-31): Life 82, Physical 82, Earth and Space 77 drawable, 4 staged (the four
audit defects). Five complete forms. Goal: **10 forms = at least 130 drawable per area** (one item per group, so the
per-area count is exact; `map-form-depth.ts`). Need **+48 Life, +48 Physical, +53 Earth and Space** at minimum.

| area | authored | keep needed for 130 | keep rate needed |
|---|---|---|---|
| Life Science | 72 (4 cells x 18) | 48 | 66.7% |
| Physical Science | 72 (4 cells x 18) | 48 | 66.7% |
| Earth and Space Science | 80 (4 cells x 20) | 53 | 66.3% |
| **total** | **224** | 149 | |

The coordinator's brief asked for about 75 per area (~225); the slot generator's flat letter/rank deal needs cells of
18 or 20, so the split is 72/72/80, weighted to Earth, which is furthest from 130. At batch 1's coordinator-quoted
~72% keep this gives about 52 / 52 / 58. Grade cells are authoring targets only (the assembler draws by area).
No cell's count changes after an item is seen.

## Deviation from batch 1, fixed now: one author, no sub-agents

The coordinator instructed: Claude only, spawn no sub-agents, write the items in-session, area by area, in batch-1
format. So one author writes all twelve cells in sequence. Consequences, stated before any item exists:
- Cross-cell collisions should fall (batch 1's 12 duplicates came from 12 blind authors). They are still checked.
- One author's style can become a cross-item tell over 224 items instead of 20. The seeded key letter and key rank stop
  the mechanical forms; the graders' `cross_item_pattern` question, asked per area, is the instrument for the rest.
  **A pattern named by both graders of an area holds that cohort (rule 10), exactly as in batch 1.**
- The author also builds the packets. The cold packet withholds the key and the slot's ask by construction
  (`sci-packet.mjs` selftest), and the graders are fresh agents spawned by the coordinator, not by the author.

## Inputs

| file | role |
|---|---|
| `map-v2-work/science-b2/slots.json` | 224 slots from `science-b2/make-slots.mjs` (seed 20261131; `--check` reproduces). 20-slot cells use batch 1's template exactly; 18-slot cells drop one table/conditions and one model/claim slot (tiers 5/8/5, kinds 8/4/6, letters and ranks 5/5/4/4 rotated). Batch: letters 56x4, ranks 56x4, letter x rank cell <= 20, asks rotated, data/investigation claims <= 1 in 10, no controlled pair on a bar chart |
| `science-b2/BRIEF-body.md` -> `make-brief.mjs` -> `BRIEF.md` + `BRIEF-grader.md` | one source, two outputs; the grader copy has no slot table and make-brief refuses one that leaks an MSB2 slot id (break-tested 2026-10-31) |
| `science-pilot/sci-check.mjs --rules b2` | every b1 check plus INVENTED, LSHAPE, TICK (item) and XDUP, KEYDUP, MISC (batch). `--selftest` passes all three rule sets; `--break-test --rules b2` shows each of the 13 b1+b2 checks load-bearing |
| `science-b2/validate-b2-rules.mjs` | the b2 checks pointed at batch 1's 240 items, where the answers are known (below) |
| `science-b2/probe-live.mjs` | every b2 item against every live and staged map/science row (snapshot `--dump`, server count asserted): refuses on xdupReason or a shared term/trend/claim key |
| `science-b2/EXCLUSIONS-science.txt` | `make-exclusions.mjs --live` + pilot items + all 240 batch-1 items (632 stimuli, 2026-10-31) |
| `science-b2/GRADER-BRIEF.md` | batch-1 grader brief + `b2_label_shape`, `b2_duplicate`, and the audit lessons folded into `fact_error`, `second_defensible`, `readability`; one folder per grader |
| `science-pilot/sci-packet.mjs` | packets as batch 1; the keyed packet now prints `prior_free` and `option_roles` (b1 finding 5; selftest asserts the cold packet carries neither) |

## Batch 1's seven findings and the audit's four defects, and how each is enforced

| finding | enforcement | known-answer validation on batch 1 (`validate-b2-rules.mjs`) |
|---|---|---|
| 1 padded labels; key the lone shape (E6) | LSHAPE refuses a key whose label shape is unique among the four (which refuses every code ladder); brief rule B6 | catches E6-01, -02, -11, -16 (4/4); also fires on 37 other batch-1 conditions items, all ladders, which is the point |
| 2 cross-grade duplicates | XDUP (batch) + `probe-live.mjs` (live/staged): words, key and form routes refuse; the stem route prints XDUP-REVIEW; brief rule B7 | 13/13 named pairs; refusing routes alone 10/13 (+17 other pairs refused), stem route the other 3 (+~70 review lines) |
| 3 stock misconception distractors | MISC: each family once per cell; brief rule B8 | fires in L6 and L8 (2/2) |
| 4 "invented" in student text | INVENTED; brief rule B9 | E6-07, -08, -10 on the E6 author's original file (3/3); on the corrected files it fires only on P5-07 "Students invented four codes", accepted over-reach |
| 5 keyed packet lacked prior_free / option_roles | sci-packet keyed packet prints both | packet selftest |
| 6 graders shared a scratch folder | one folder per grader, named in the prompt and the grader brief | — |
| 7 records note | — | — |
| audit: unreadable kink (L8-16) | TICK: every line x on a tick or a half-tick; brief rule (line) | catches L8-16 (1/1); also fires on 13 other batch-1 line items, recorded |
| audit: second-defensible correlated twin (E5-13) | brief rule B11; grader `second_defensible` text | judgement only |
| audit: passage contradicts figure (E6-03, E8-11) | brief rule B10; grader `fact_error` text | judgement only |
| audit: no_source on data items (P5-02, E8-17) | brief rule B12 (= B4); grader `no_source_needed` | judgement only |

## Stages (per area cohort unless noted)

| stage | what | decides? |
|---|---|---|
| 0 | per cell: `sci-check.mjs <file> --rules b2 --slots science-b2/slots.json --exclusions science-b2/EXCLUSIONS-science.txt` to exit 0, and `probe-live.mjs <file>` to exit 0 | refuse until clean |
| 0b | `sci-check.mjs --batch --rules b2` over all twelve files; `probe-live.mjs` over all twelve; every XDUP-REVIEW and probe REVIEW line answered in `science-b2/XDUP-REVIEW.md` before packets | refuse; a REVIEW line judged a duplicate is resolved by rewriting the later item before any packet exists |
| 1 | 2 fresh with-source graders per area (6 in all), `BRIEF-grader.md` + packets only (A1), cold then keyed, one folder each | **yes** |
| 2 | key-visible second audit (`SCIENCE-AUDIT-BRIEF.md` / `AUDIT-BRIEF.md`, 2 auditors per packet, one adversarial) over the stage-1 survivors | **yes**: any `second_defensible`, `unreadable` or `fact_error` holds the item; `no_source` alone counts as clean on MAP Science (owner, 2026-10-30) |
| 3 | stage `verified=false`, three cohorts `map-science-v2-life / -phys / -earth`, cleared list = stage 1 and 2 survivors | — |
| 4 | release on the two agent passes (owner rule 2026-10-30; `release-science-audit-2026-10-30.mjs` is the template) | owner's standing rule |

**Changed from batch 1, by the owner's 2026-10-30 rule, not by this prereg:** batch 1's stage 1b (grader v2 pre-screen)
and stage 5 (co-founder L1 spot) are replaced by stage 2 (the key-visible audit). Science left the co-founder's queue
on 2026-10-27/30 and is never queued for him. Nothing in this batch is drawn for a human sitting.

**This session stops after stage 0b and the cold packets.** No grader, auditor or attack runs; nothing is staged.

## Drop rules (stage 1), copied from batch 1 and fixed now

1. `key_correct: no` from either grader, confirmed by the coordinator's recomputation -> **drop**. No repair.
2. The same `second_defensible` option from both graders -> **drop**. From one grader -> one return; a fresh grader re-checks; a second hit -> drop.
3. A confirmed `fact_error` -> **drop** (includes a passage contradicting its own figure, B10).
4. `no_source_needed: yes` from both graders on a data or investigation item -> **drop**. From one grader -> drop only if
   the stage-2-attack figure-covered samples are unanimous on the key; that attack is not run in this batch (below), so
   one grader's flag is **recorded**.
5. A confirmed `recognised_real_data` -> **drop**.
6. `free_elimination` from both graders killing 2+ distractors -> **drop**. Killing 1 -> recorded.
7. `readability: problem` confirmed against the renderer -> **drop**.
8. `grade_fit` is recorded only, never a drop.
9. Any `b1_*` or `b2_*` field from **both** graders on the same item -> **drop** (for `b2_duplicate`, the higher-grade
   item of the pair, B1-A2's rule). From **one** grader -> one return; a fresh grader re-checks; a second hit -> drop.
10. A `cross_item_pattern` named by both graders of an area holds that area's cohort for the coordinator. A mechanical
    pattern gets a checker and a fixture in the same commit as the batch result, never mid-batch. Re-deciding the
    pattern after seeing which items it touches is not allowed.

## Attacks: report-only (copied), and not run in this batch

Batch 1's branch made the figure-covered render a batch-level hold only if the pilot's L0 sitting recorded the model
attack "provisionally discriminating". That sitting never happened: science left the co-founder's queue before it was
drawn. So the validity of the options-only and figure-covered instruments for map/science is **undetermined**, and both
stay **report-only**, as in batch 1. Batch 1 did not run them either. If they are run for batch 2, they use
`sci-packet.mjs covered` / `oo --control 24` (deal seeds 20261131 / 20261132), report hit rate and unanimity rate per
arm, and decide nothing. The ACT Science control's ceiling (88.9% model, 11 points of headroom) is why no margin bar
exists, unchanged.

## Verdict (per area)

- **PASS:** after stages 1 and 2, the area's drawable total (live + released batch 2) reaches >= 130, so
  `map-form-depth.ts` shows >= 10 forms.
- **PASS-SHORT:** survivors leave the area under 130. A batch 3 authors only the gap, at 1.4x, under this brief.
- **HOLD:** both graders of the area name the same cross-item pattern (rule 10). The coordinator reads it before any
  keyed packet is released.

## Pre-registered predictions (recorded; none gates)

- **P1:** EMPTY slots <= 5% (<= 11 of 224), concentrated in grade-5 low-tier values items on drawn axes (READ, TICK).
- **P2:** stage-0b batch refusals after per-cell cleanup <= 10 items; XDUP-REVIEW lines judged real duplicates <= 3.
- **P3:** stage-1 drops <= 15% per area (batch 1: 25 of 240 = 10.4% before the audit).
- **P4:** `no_source_needed` from both graders <= 5 of 148 data/investigation items.
- **P5:** zero `b2_label_shape` from both graders (LSHAPE is mechanical); `b2_duplicate` from both <= 2.
- **P6:** the single-author risk shows up as at least one `cross_item_pattern` named by ONE grader per area; named by
  both in at most one area.
- **P7:** stage-2 audit holds (excluding `no_source`-only) <= 3% of survivors (batch 1: 4 of 245 = 1.6%).

## Tool fingerprints at pre-registration (sha256, first 16)

- `map-v2-work/science-b2/slots.json` a88af6c4347028d9
- `map-v2-work/science-b2/make-slots.mjs` ae0c34cf471e4219
- `map-v2-work/science-b2/BRIEF-body.md` 79d61eefa75d9e94
- `map-v2-work/science-b2/BRIEF.md` e05cc5101049cabf
- `map-v2-work/science-b2/BRIEF-grader.md` a0be31bd8cc03189
- `map-v2-work/science-b2/make-brief.mjs` b182d807e98cd592
- `map-v2-work/science-b2/GRADER-BRIEF.md` 2c0036372e226318
- `map-v2-work/science-b2/AUTHOR-PROMPT.md` af1e2ce2ab26df90
- `map-v2-work/science-b2/validate-b2-rules.mjs` cc3a966d2f37da68
- `map-v2-work/science-b2/probe-live.mjs` c95d9a76def4c6fc
- `map-v2-work/science-b2/EXCLUSIONS-science.txt` 3eaef8da05c72e01
- `map-v2-work/science-pilot/sci-check.mjs` d44eec75a5fc3239
- `map-v2-work/science-pilot/sci-check.fixtures.mjs` 2590d45a41a412e8
- `map-v2-work/science-pilot/sci-spec.mjs` 87b22b26feaca1ef
- `map-v2-work/science-pilot/sci-packet.mjs` 66ce8d81fdc382c0
- `map-v2-work/science-pilot/make-exclusions.mjs` bfed567661818937

Tool changes in this batch: `sci-check.mjs` gains `--rules b2` (default stays b1, so batch 1 reproduces); `sci-spec.mjs`
gains INVENTED_WORD and STOCK_MISCONCEPTIONS; fixtures gain the B2 suite; `sci-packet.mjs` keyed packet prints
prior_free and option_roles. No `src/` change, no database write, no new environment variable.
