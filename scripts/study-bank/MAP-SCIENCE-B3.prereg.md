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

---

# Amendment P2 (2026-10-31): PILOT 2, written before any pilot-2 packet exists

Pilot 1 failed its gate in all three areas (REGISTER 2026-10-31, "MAP Science b3 PILOT failed its gate"). Both graders
of each area named a cross-item pattern in the COLD pass, and each was the inverse of a batch-2 ban:

| area | pattern both graders named (pilot 1) | the rule it inverted |
|---|---|---|
| Life | both trend keys the compound "X, then Y" at C; the key the only option in the data's direction (L7-02, L8-01) | B13 (one frame) left direction as the only difference; FORMAT's ">= 3 directions" pushed options apart |
| Physical | the top-tick (tallest) value offered and never the key; the shortest bar never offered (P6-02, P7-01) | B17 ("the asked bar is never the tallest") |
| Earth | claim keys the shortest option (E5-02, E8-01) | B18 balanced markers but left the plain shortest key |

Also recorded, single grader: life-g1 "the key is the only option general knowledge picks"; earth-g2 the "-sk" name
template (E6-01, E7-01, E8-02); phys-g1/g2 values keys the smallest option twice; earth-g1 absurd model distractors.
E7-02's fact error (the far point of Earth's orbit put in January) is noted; pilot-1 items are not reused.

**The principle (binding for pilot 2 and the full batch).** A rule that FORBIDS a key property makes that property mark
a distractor. Properties are RANDOMIZED at their natural base rate and checked as distributions across the batch.

## What changed, before any pilot-2 item was written

| file | change |
|---|---|
| `science-pilot/sci-check.mjs` | `--rules b3p2` = every b3 check except **BARTOP** (the ban), plus item check **TRENDDIR** and batch checks **BARPOS, BAREXT, TRENDFORM, RANKBAL, NAMETPL**; `WANT_TREND` gains `decrease-then-level`, `increase-then-decrease`, `decrease-then-increase`. b1 / b2 / b3 output is unchanged: `--selftest` and `--break-test --rules b1|b2|b3` still pass, `science-b3/validate-b3-rules.mjs` still passes, and all 24 pilot-1 items still print ok under `--rules b3` |
| `science-b3p2/make-slots.mjs` | 24 slots, ids `MSB3Q-*`. Grades, tiers and DCIs from seed 20261231; letters and ranks re-dealt (rank seed 7) to meet every constraint, including batch-wide ones. Per area: 2 read items with different `pos` (tallest / shortest / middle, 2/2/2 across the batch; tallest -> value rank 4, shortest -> 1, middle -> 2 or 3), 1 simple + 1 compound trend key (simple ranks 1-2, compound 3-4), no key rank or key letter repeated within a format, and batch-wide no format past RANKBAL's cap |
| `science-b3p2/BRIEF-body.md` | the b3 brief with B17 WITHDRAWN and new rules **B20** (read position dealt; both extremes offered in every read item), **B21** (one pool of trend forms; direction never decides), **B22** (ranks per format), **B23** (claim markers at the same rate; no absurd distractors), **B24** (two GK-plausible options in data items; no checker, graders judge), **B25** (no name template) |
| `science-b3p2/GRADER-BRIEF.md` | asks for patterns in BOTH directions (always on the key / never on the key); `b3_bar_extreme` rewritten for B20; new fields `b3p2_direction`, `b3p2_general_knowledge` |
| `science-b3p2/EXCLUSIONS-science.txt`, `probe-live.mjs` | batch 3's lists + all 24 pilot-1 items (pilot-1 topics excluded); probe reads batch 3's live snapshot (245 rows, nothing staged since) |

### The new checks, and their break-tests on items whose answers are known

`node scripts/study-bank/map-v2-work/science-b3p2/validate-b3p2-rules.mjs` (exit 0): every check fires on the pattern the
graders named, the hit disappears when that one check is disabled, and synthetic sets at each band edge land on the
intended side.

| check | what it tests | pilot 1 (named) | batch 2 (named) | band edges |
|---|---|---|---|---|
| TRENDDIR (item) | every direction the key names is on >= 1 distractor; a compound names two different directions | L7-02, L8-01, E6-02 caught (also P7-02, the lone flat option) | fires on L6-09, L8-08 (two of TRENDPAR's four named items), P6-09, P8-09, E6-08, E8-09 | lone rising key fires; two rising distractors pass; "dropped, then declined" fires |
| TRENDFORM (batch, per area + batch) | key share among compound options, and among simple options, 15-40% once >= 4 such options | Life fires (compound keys 50%, simple 0%) | 25% everywhere: batch 2's trend tell was the trailing clause, which TRENDPAR (kept) catches | 2/8 passes; 3/8 compound with 1/8 simple fires on the simple side; 4/8 fires |
| BARPOS (batch) | asked bar tallest / shortest / middle each <= ceil(n/3) (+1 once n >= 6), per area and batch, n >= 2 | Physical (middle 2/2) and batch (middle 4/4) fire | Physical (tallest 3/4) fires; also Earth (middle 3/4) and batch (middle 6/12) | 2/2/2 and 3/2/1 pass at n=6; 4/1/1 fires |
| BAREXT (batch) | the max (top tick) and the min, where offered in >= 3 read items, are the key 15-50% of the time; with >= 3 read items each extreme is offered at least once | batch: top tick offered 3x, key 0x; shortest never offered | Physical: top tick key 3 of 4 (75%), shortest key 0 of 4; Earth top tick key 0 of 4 | offered 6: key 2 and key 1 pass; key 0 and key 4 fire |
| RANKBAL (batch) | within an area and a format no key rank holds more than ceil(n/4) (+1 once n >= 8) keys, n >= 2; also batch-wide per format | Earth claims (rank 1, 2 of 3) and Physical values (rank 1, 2 of 3) fire | fires 16x (batch-2 slots balanced ranks per cell, not per format); Earth claims fire on rank 2 | claims 1/2/4 pass; 1/1/4 fire |
| NAMETPL (batch) | name cores in an area share no two-letter ending across >= 3 items | Earth "-sk" (Hesk, Marsk, Tesk) fires | fires 14x on common English endings (-on, -er, -th) | 2 items pass; 3 fire |

**Weaknesses, stated now.** (1) At pilot scale (2 read and 2 trend items per area) BAREXT is not measured per area
(n < 3) and TRENDFORM's per-area simple side sits under its minimum in Physical; the pilot relies on the batch-level
measurement plus the slot deal. (2) NAMETPL and RANKBAL over-fire on batch 2's 224 items; both must be recalibrated
against a known-clean population (for NAMETPL, a base rate of English name endings) before the full batch uses them as
refusals. (3) B24 (general knowledge picks the key) has no checker; graders judge it. (4) These checks are pre-flight.
The graders' cross_item_pattern question remains the gate.

## Pilot 2, 24 items (`scratchpad/map-science-b3p2/{L,P,E}/src.mjs` -> `items.json`)

| area | formats |
|---|---|
| Life | read (bar, tallest), read (line, middle), trend decrease (simple), trend increase-then-level (compound), interpolation, variable (controlled), claim (predicts), term (process) |
| Physical | read (bar, shortest), read (line, tallest), trend no-change (simple), trend decrease-then-increase (compound), interpolation, variable (dependent), claim (explains), claim (predicts) |
| Earth | read (line, shortest), read (bar, middle), trend increase (simple), trend decrease-then-level (compound), interpolation, claim (explains), claim (predicts), term (structure) |

Fresh topics: every pilot-1 and batch-2 topic is excluded, and 16 drafts were rewritten to a different system after
the probe or a REVIEW adjudication (`science-b3p2/XDUP-REVIEW.md`). One author, in session, no sub-agents.

Stage 0 / 0b results at amendment time: `sci-check --rules b3p2` 8/8/8 ok and `--batch` 24 ok (exit 0; BARPOS 2/2/2,
BAREXT max and min each offered 6 of 6 and the key 2 of 6, TRENDFORM compound 23% / simple 27%, RANKBAL and NAMETPL
clean, CLAIMBAL 25% in every area); `probe-live` 0 refused, 19 REVIEW, each answered in XDUP-REVIEW.md.

## Decision rule: unchanged from pilot 1

- **PROCEED to the full batch** only if, in pilot 2's stage 1, **no area has a `cross_item_pattern` named by both of its
  graders** (rule 10), whether old, inverse or new.
- **HOLD** otherwise, as pilot 1: a mechanical pattern gets a checker and a break-test on the pilot-2 items it names
  before any further authoring.
- One grader's pattern is recorded and passed to the full batch's brief.
- Drop rules 1-10 apply as written above; rule 9 also covers the new `b3p2_direction` and `b3p2_general_knowledge`
  fields. Survivors go to stage 2 with the full batch if it proceeds.
- Two fresh with-source graders per area (6 spawns), cold then keyed, one folder each, spawned by the coordinator from
  `scratchpad/map-science-b3p2/packets/GRADER-PROMPT.md`. This author stops after the packets.

## Predictions (recorded; none gates)

- **R1:** zero EMPTY slots (true at amendment time).
- **R2:** none of pilot 1's three inverse patterns (top tick never the key; compound trend keys; shortest claim keys) is
  named by both graders of any area.
- **R3:** at least one area has a NEW pattern named by one grader (one author, 24 items; true in every round so far).
- **R4:** the most likely both-grader pattern, if any: the read-item cast (both extremes offered in every read item) is
  itself a template a grader can see, or the interpolation casts (each item has one "skips a row" distractor).
- **R5:** stage-1 drops <= 2 per area.

## Tool fingerprints at amendment P2 (sha256, first 16)

- `map-v2-work/science-b3p2/slots.json` 5a12d8cb6cc869a0
- `map-v2-work/science-b3p2/make-slots.mjs` 8656ff618b14677c
- `map-v2-work/science-b3p2/BRIEF-body.md` 76b741d16ebdd977
- `map-v2-work/science-b3p2/BRIEF.md` 881c65f45a3ef74c
- `map-v2-work/science-b3p2/BRIEF-grader.md` bea0f43cc696cc77
- `map-v2-work/science-b3p2/make-brief.mjs` 816b7d431039ade8
- `map-v2-work/science-b3p2/GRADER-BRIEF.md` f385a183334f7e22
- `map-v2-work/science-b3p2/validate-b3p2-rules.mjs` 6636168895f85c09
- `map-v2-work/science-b3p2/probe-live.mjs` 6aa91cc9d591a0fd
- `map-v2-work/science-b3p2/expand.mjs` 266fc7c912b56623
- `map-v2-work/science-b3p2/make-exclusions-b3p2.mjs` c677c470ad137f8e
- `map-v2-work/science-b3p2/EXCLUSIONS-science.txt` cb7a60c20c10e56f
- `map-v2-work/science-b3p2/XDUP-REVIEW.md` 2b7359be27f47737
- `map-v2-work/science-pilot/sci-check.mjs` 2c81ca5f2fa32c78
- `map-v2-work/science-pilot/sci-check.fixtures.mjs` b9c16e97e1c705c8
- `map-v2-work/science-pilot/sci-spec.mjs` 3b32ae4a0a5bf0ae
- `map-v2-work/science-pilot/sci-packet.mjs` 66ce8d81fdc382c0
- `scratchpad/map-science-b3p2/L/items.json` 80c04f79e09aee0e
- `scratchpad/map-science-b3p2/P/items.json` 20ef47ea6d9fe1b5
- `scratchpad/map-science-b3p2/E/items.json` 3ecf9c6730c6ac85

No `src/` change, no database write, no new environment variable. The packet builder (`sci-packet.mjs`) is unchanged.
