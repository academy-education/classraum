# MAP Science batch 3, 2026-10-31: pre-registration (step 1: PILOT)

Written **before any batch-3 item exists and before any packet**, after the tools below were built and break-tested.
Nothing below changes after an item is seen. Bars, drop rules and attack rules are copied from
`MAP-SCIENCE-B2.prereg.md` (which carries batch 1's and the pilot's); where batch 3 differs, the difference is named
and the reason given.

## Why batch 3, and why a pilot first

Batch 2 (224 items) was HELD in all three areas (REGISTER 2026-10-31, "MAP Science batch 2 stage 1: all three areas
HELD"; `scratchpad/map-science-b2/STAGE1-DECISION.json`). Both graders of each area named the same cross-item pattern in
the COLD pass:

| area | pattern both graders named | batch-2 items cited |
|---|---|---|
| Life | the trend key alone carries a trailing "as/with ..." clause | L5-14, L6-09, L7-10, L8-08 |
| Life | variable items use one template that states each option's role | L5-15, L6-16, L7-02, L8-03 |
| Life | a definition-in-stem key echoes the defining word | L6-12, L6-17, L7-17 |
| Life | the interpolation key is the only unprinted value | L7-06, L8-01 |
| Physical | the asked bar is the tallest, on the top tick, the largest option | P5-07, P6-14, P7-01 |
| Physical | controlled-variable passages share one template | P5-03, P8-03 |
| Earth | misconception distractors carry intensifiers / because-rationales; the key is the plain shortest | E5-06, E5-14, E5-20, E7-05, E7-20, E8-05, E8-14 |
| Earth | variable passages share one template stating each role | E5-12, E8-17 |
| Earth | one invented name ("Sy") reused across four grade-8 items | E8-02, E8-08, E8-11, E8-15 |

Batch 3 re-authors FRESH. No batch-2 item is repaired or reused, and batch-2 topics stay excluded (they are in
`science-b3/EXCLUSIONS-science.txt` and `science-b3/probe-live.mjs` compares against all 224). REGISTER's batch-2 entry
says the graders' `cross_item_pattern` question is asked on a small pilot cell before the full batch. This is that pilot.

## Step 1 (this session): pilot, 24 items

| area | authored | formats (template fixed in `science-b3/make-slots.mjs`) |
|---|---|---|
| Life | 8 | 2 trend (line decrease, scatter increase-then-level), 2 term (structure, example), interpolation, variable (dependent), bar read, claim (explains) |
| Physical | 8 | 2 bar read, 2 claim (explains, predicts), interpolation (table), trend (scatter no-change), variable (controlled), term (quantity) |
| Earth and Space | 8 | 3 claim (predicts x2, explains), interpolation, bar read, trend (line increase), variable (independent), term (process) |

Each area carries every format a batch-2 pattern came from, and more of the format its own graders named. Per area:
2 items per grade, tiers 3/3/2, key letters 2 x A-D and key ranks 2 x 1-4 with no (letter, rank) pair repeated; batch
letters and ranks 6 x 4 (`make-slots.mjs --check` reproduces `slots.json`, seed 20261201).

**One author, no sub-agents, as batch 2.** The coordinator's brief for batch 3 said "Claude only"; the author writes all
24 items in-session and builds the packets. The graders are fresh agents spawned by the coordinator, not by the author.

**This session stops after the cold packets.** No grader, auditor or attack runs; nothing is staged; no DB write.

## Pilot decision (fixed now)

- **PROCEED to the full batch** only if, in the pilot's stage 1, **no area has a `cross_item_pattern` named by both of
  its graders** (rule 10), whether the pattern is one of batch 2's or a new one.
- **HOLD** otherwise: the coordinator reads the pattern; a mechanical pattern gets a checker and a fixture (break-tested
  on the pilot items it names) before any further authoring; the full batch is not written on the current brief.
- A pattern named by ONE grader is recorded and passed to the full batch's brief as a pending lesson; it does not hold.
- Pilot items are graded under the drop rules below exactly as a batch would be. Survivors are kept for batch 3's
  stage 2 (key-visible audit) alongside the full batch; they are not re-authored and not re-graded unless returned by
  rule 2 or 9.

**What the pilot cannot show, stated now.** Each format appears 1-3 times per area. Batch 2's Life trend pattern had 4
key-carrying instances in 72 items; at 8 items a pattern needs 2-3 instances to be visible, so a clean pilot is weak
evidence that 70+ items will be clean. The full batch keeps rule 10 and asks the same question. The pilot can refute
the brief cheaply; it cannot certify it.

## Inputs

| file | role |
|---|---|
| `map-v2-work/science-b3/slots.json` | 24 pilot slots from `science-b3/make-slots.mjs` |
| `science-b3/BRIEF-body.md` -> `science-b3/make-brief.mjs` -> `BRIEF.md` + `BRIEF-grader.md` | batch-2 brief body + the pilot header + binding rules **B13-B19**; grader copy carries no slot table (make-brief refuses a leak) |
| `science-pilot/sci-check.mjs --rules b3` | every b1 and b2 check plus TRENDPAR, ROLESTATE, ECHO, INTERP, BARTOP, CLAIMRAT (item) and VARTPL, CLAIMBAL, NAMEREUSE, ORDER (batch). `--selftest` passes all four rule sets; `--break-test --rules b3` shows all 23 b1+b2+b3 checks load-bearing |
| `science-b3/validate-b3-rules.mjs` | each b3 check pointed at batch 2's 224 items, where the graders named the answers (below) |
| `science-b3/probe-live.mjs` | every b3 item against every live/staged map/science row (snapshot `scratchpad/map-science-b3/live-map-science.json`, 245 rows = server count, read 2026-10-31) and every batch-2 item |
| `science-b3/EXCLUSIONS-science.txt` | batch 2's 632 lines + all 224 batch-2 items (856) |
| `science-b3/GRADER-BRIEF.md` | batch-2 grader brief + `b3_*` fields for B13-B18; `cross_item_pattern` answered in the cold pass, naming every item touched |
| `science-b3/expand.mjs` | author source -> item format, slot fields copied from `slots.json` |
| `science-pilot/sci-packet.mjs grader` | packets as batch 2 (unchanged) |

## Each batch-2 pattern, its rule, its checker, and the known-answer validation on batch 2

`node scripts/study-bank/map-v2-work/science-b3/validate-b3-rules.mjs` (exit 0 = every grader-named item caught):

| pattern | brief rule | checker | named items caught | also fires on (batch 2) |
|---|---|---|---|---|
| trend key alone carries "as ..." | B13 | TRENDPAR: options identical once direction words are stripped | 4/4 | 20 of 24 trend items (nearly every b2 trend set was non-parallel) |
| variable passage states roles | B14 | ROLESTATE: role words refused in a variable passage | 8/8 | the other 4 of 12 (g2 Earth: "every procedure") |
| shared variable template | B14 | VARTPL (batch): two same-area passages sharing >= 2 role phrases | 2/2 pairs | 4 other pairs |
| definition-in-stem echo | B15 | ECHO: a stem word (stem-matched) on the key and on no distractor; term + claim | 3/3 | 26 of 88 term+claim items |
| interpolation key the lone unprinted / lone mean | B16 | INTERP | 3/3 (L7-06, L8-01 unprinted; P8-01 mean) | 4 of 15 (L7-16, E5-07, E6-15, E7-01) |
| asked bar tallest / top tick | B17 | BARTOP: read off bar/line is not the max or min; key not the lone option on a tick | 3/3; P8-02 (named exception) passes | 3 of 12 (L7-09 tallest, L8-07 and E6-02 shortest) |
| Earth reasons / degree words on distractors | B18 | CLAIMRAT (item: 1 or 3 of 4 marked) + CLAIMBAL (batch: a marked option is the key in 15-40% of cases, n >= 4) | 5 of 7 per item; CLAIMBAL fires for Earth (degree words 0 of 9 on keys), so 7/7 | CLAIMRAT 23 of 52 claim items; CLAIMBAL Life/Physical do not fire |
| invented name reused | B19 | NAMEREUSE (batch): a name core in more than one item | "sy" 4/4 | 28 other cores (b2 reused codes widely) |
| numeric distractors sorted (Earth g1; recorded in b2, no checker then) | B19 | ORDER (batch): ascending or descending distractors above ceil(n/6)+1 per area | 3/3 areas (20/19/20 of 20) | — |

Two measurements made while building the checkers, recorded so nobody rebuilds them:
- **VARTPL by lexical overlap does not work.** Shared four-word spans put the named pair P5-03~P8-03 at 2 and the unnamed
  P6-03~P8-03 at 6; a function-word skeleton did not separate them either. The template IS the role statements, which
  ROLESTATE refuses outright, so VARTPL keys on shared role phrases and is a second guard.
- **CLAIMBAL's first form (key rate minus distractor rate > 25 points) missed Earth** (reasons 20% vs 37%, degree words
  0% vs 15%). Replaced, before any batch-3 item, by the share-of-marked-options band; Earth's 0 of 9 degree words fires.
- ORDER: at the pilot's 1-3 numeric items per area the cap (ceil(n/6)+1 = 2) cannot fire; the author avoids sorted
  distractors anyway (B19). It is a full-batch check.
- `shuffleDrawnChoices` still reorders every bank draw (REGISTER b2 entry), so ORDER protects the graders' packets, not
  students. It is checked because graders read packet order and named it.

## Stages (per area unless noted)

| stage | what | decides? |
|---|---|---|
| 0 | per area: `sci-check.mjs scratchpad/map-science-b3/<A>/items.json --rules b3 --slots science-b3/slots.json --exclusions science-b3/EXCLUSIONS-science.txt` to exit 0, and `science-b3/probe-live.mjs` to exit 0 | refuse until clean |
| 0b | `sci-check.mjs --batch --rules b3` over the three files; every XDUP-REVIEW and probe REVIEW line answered in writing (`science-b3/XDUP-REVIEW.md`) before packets | refuse |
| 1 | 2 fresh with-source graders per area (6 in all), `BRIEF-grader.md` + packets only (A1), cold then keyed, one folder each | **yes**, plus the pilot decision above |
| 2 | key-visible second audit over stage-1 survivors (with the full batch if it proceeds) | **yes**, as batch 2 |
| 3-4 | stage `verified=false`, release on the two agent passes (owner rule 2026-10-30) | — |

Changed from batch 2 by the owner's rules, not by this prereg: science is never queued for the co-founder.

## Drop rules (stage 1), copied from batch 2 and fixed now

1. `key_correct: no` from either grader, confirmed by the coordinator's recomputation -> **drop**. No repair.
2. The same `second_defensible` option from both graders -> **drop**. From one grader -> one return; a fresh grader re-checks; a second hit -> drop.
3. A confirmed `fact_error` -> **drop** (includes a passage contradicting its own figure, B10).
4. `no_source_needed: yes` from both graders on a data or investigation item -> **drop**. From one grader -> drop only if
   the figure-covered samples are unanimous on the key; that attack is not run (below), so one grader's flag is **recorded**.
5. A confirmed `recognised_real_data` -> **drop**.
6. `free_elimination` from both graders killing 2+ distractors -> **drop**. Killing 1 -> recorded.
7. `readability: problem` confirmed against the renderer -> **drop**.
8. `grade_fit` is recorded only, never a drop.
9. Any `b1_*`, `b2_*` or **`b3_*`** field from **both** graders on the same item -> **drop** (for `b2_duplicate`, the
   higher-grade item of the pair; **same-grade pair: the item with the higher slot number drops**, a tie-break fixed now
   because batch 2's prereg had none). From **one** grader -> one return; a fresh grader re-checks; a second hit -> drop.
10. A `cross_item_pattern` named by both graders of an area holds that area's cohort for the coordinator (and, in this
    pilot, stops the full batch: see "Pilot decision"). A mechanical pattern gets a checker and a fixture before the
    next authoring step. Re-deciding the pattern after seeing which items it touches is not allowed.

## Attacks: report-only, not run (copied)

The validity of the options-only and figure-covered instruments for map/science is undetermined (no human sitting), so
both stay report-only and are not run in this pilot, as in batches 1 and 2. No margin bar exists (the ACT Science
control's ceiling, 88.9% model, leaves 11 points of headroom).

## Pre-registered predictions (recorded; none gates)

- **Q1:** zero EMPTY pilot slots.
- **Q2:** stage-1 drops <= 2 per area (batch 2: 14/11/17 of 72-80, about 19%).
- **Q3:** none of batch 2's nine patterns is named by both graders of any area.
- **Q4:** at least one NEW pattern is named by one grader somewhere (one author, 24 items; P6 in batch 2 predicted the
  same and was right in all three areas, by both graders).
- **Q5:** `no_source_needed` from both graders on at most 1 of the 10 data/investigation trend, read and interpolation
  items per area.

## Tool fingerprints at pre-registration (sha256, first 16)

- `map-v2-work/science-b3/slots.json` 1c964c39b2e3b4a9
- `map-v2-work/science-b3/make-slots.mjs` d7d711829938792f
- `map-v2-work/science-b3/BRIEF-body.md` 143442eb005a59ff
- `map-v2-work/science-b3/BRIEF.md` dab0fee4fe755324
- `map-v2-work/science-b3/BRIEF-grader.md` 65a3decb77d6ce61
- `map-v2-work/science-b3/make-brief.mjs` 36d582542ca44962
- `map-v2-work/science-b3/GRADER-BRIEF.md` 55f1848e6daa2c4a
- `map-v2-work/science-b3/GRADER-PROMPT.md` a10aea9df4db0184
- `map-v2-work/science-b3/validate-b3-rules.mjs` bf14b6c2a9fd9cf7
- `map-v2-work/science-b3/probe-live.mjs` 81b43ec5b0003a12
- `map-v2-work/science-b3/expand.mjs` d271e0011c79f56a
- `map-v2-work/science-b3/make-exclusions-b3.mjs` 00540161ad45ad7b
- `map-v2-work/science-b3/EXCLUSIONS-science.txt` 18df00dca5639430
- `map-v2-work/science-pilot/sci-check.mjs` 20a455acfc131fb5
- `map-v2-work/science-pilot/sci-check.fixtures.mjs` b9c16e97e1c705c8
- `map-v2-work/science-pilot/sci-spec.mjs` 3b32ae4a0a5bf0ae
- `map-v2-work/science-pilot/sci-packet.mjs` 66ce8d81fdc382c0

Tool changes in this batch: `sci-check.mjs` gains `--rules b3` (default stays b1, so batches 1 and 2 reproduce; b1 and
b2 break-tests still pass); `sci-spec.mjs` gains TREND_STRIP, ROLE_STATEMENT, ECHO_STOP, RATIONALE, INTENSIFIER;
fixtures gain the B3 suite (17 clean, 13 new item mutations + 4 new batch mutations). No `src/` change, no database
write, no new environment variable.
