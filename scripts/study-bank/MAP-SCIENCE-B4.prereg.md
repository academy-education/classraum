# MAP Science batch 4, 2026-10-31: pre-registration

Written **before any batch-4 item exists**, after the tools below were built and break-tested. Nothing above the
addenda changes after an item is seen. Drop rules 1-9 and rule 10 (the Amendment A1 threshold) are copied unchanged from
`MAP-SCIENCE-B3-FULL.prereg.md`; rule 9 gains the `b4_*` grader fields. The gate, the stage-2 audit and the release route
are the ones batch 3 full ran.

## Why batch 4

- MAP Science has **362 live items** (Life 114, Physical 106, Earth 112; pilot 30, v1 211, v3 121) and 5 staged, about 7
  forms. The owner's floor is **10 forms** (memory: ten-test floor), so about 130 more survivors are needed, weighted to
  Physical (the thinnest area).
- Batch 3 full survived at about 53% (Life 42/75, Physical 34/75, Earth 46/80; 121 released 2026-10-31, E5-02 held by the
  coordinator). At that rate 130 survivors need about 240 authored items.

## Sizing (fixed now)

| area | authored | cells (grade 5 / 6 / 7 / 8) |
|---|---|---|
| Physical Science | 95 | 24 / 24 / 24 / 23 |
| Life Science | 75 | 19 / 19 / 19 / 18 |
| Earth and Space Science | 70 | 18 / 18 / 17 / 17 |
| **total** | **240** | |

`science-b4/make-slots.mjs` (seed 20261424 found from 20261401; `--check` reproduces) deals the slots exactly as batch 3
full's script did (read positions 2/2/2 per area, 8 trends per area 4 simple + 4 compound, ranks and letters flat per area
per format, letters >= 3 per cell), with these template changes, chosen from batch 3's survival by format:

- a **24-row cell** adds four rows to batch 1's 20-row template: investigation procedure+table conditions (b3: 10/12),
  investigation procedure+table values (9/12), data bar conditions (data conditions 20/28), investigation procedure claim
  (Physical 3/4); a **23-row cell** drops the fourth of these;
- a **17-row cell** (Earth grades 7 and 8) drops the variable slot as well as the 18-row drops (variable 0/12 in batch 3).

Ids `MSB4-<A><g>-NN`. No bar/line values or trend row is added or dropped, so the read and trend deals are unchanged.
Totals: letters A61 B61 C60 D58; ranks 61/61/60/58; kinds data 104 / investigation 57 / model 79; formats conditions 48,
values 64, claim 58, term 36, trend 24, variable 10. No cell count changes after an item is seen.

## Method (fixed now): brief version b4, parallel Claude authors

**Brief version cut (BRIEF-VERSIONING.md).** map/science is a blind-only section (rule 5: its briefs can change between
batches without touching anyone's review load), and the cut is also **blocking** under rule 3: B31 (one sensible option)
and the shared variable-passage plan were named by both graders in batch 3's pilot rounds and again by both graders of
batch 3 full on 3+ shared items (F5 failed). Version **b4** = `science-b4/BRIEF-body.md` (built into `BRIEF.md` for authors
and `BRIEF-grader.md` for graders by `make-brief.mjs`, which refuses a grader copy carrying any slot row). It folds in every
lesson recorded for batch 3 full (REGISTER 2026-10-31 and RULE10-MATCHES.md):

| b4 rule | from batch 3 full | checker |
|---|---|---|
| B33 variable passages: no shared sentence plan | Life/Phys/Earth 4+4+4 items, both graders; variable 0/12 survived | VARPLAN |
| B34 no outlier-short label core | Earth E5-07 E7-08 E7-15 E8-08 E8-17, both graders | SHORTLBL |
| B35 no content word living on keys | Physical "energy" P7-17 P7-18 P8-17 P8-18, both graders | KEYWORD |
| B36 stem echo at base rate (replaces B15's per-item ban) | Life L6-04 L6-18 L8-18, both graders | ECHOBAL (ECHO off) |
| B37 no item names another's term option | Earth E8-04/E8-13, E8-07/E8-18, both graders | XKEY (batch + probe vs live) |
| B38 model distractors: held misconceptions of the key's category, declared per distractor (replaces B31) | B31, largest drop in every area (Life 5, Phys 12, Earth 5) | MISCDECL (presence only) |
| B39 no need/will/learning-driven change on any Life option | Life L5-06 L6-06 L6-19 L7-13 L8-13, both graders | LAMARCK |
| B40 data plausible in size and curvature; no exact textbook law tables | fact errors P5-14 P6-15 P7-08, audit L5-16, real-data E5-02 P5-10 E8-07 P6-16 | none (graders: `b4_plausibility`) |
| B41 model distractor false everywhere; explanation matches its figure | E6-05 E7-06 P6-06 P6-08 E8-10 | none |
| B42 plan systems per PE before writing | 14 same-PE same-system pairs both graders named | PEPAIR (probe, REVIEW) |
| B43 working beside five other authors | new | NAMEREUSE, XDUP, XKEY (batch) |

**MISCDECL is a declaration, not a check** (CLAUDE.md: an author declares the constraints it has already satisfied). It
exists to make each author name the held belief behind each distractor before writing it; the graders judge whether a
real student holds it (`b4_one_sensible`), and that judgement decides.

**Authors.** Six parallel Claude author agents (owner direction for this batch; batch 1 used 12 agents, batches 2-3 one
in-session author): L56, L78, P56, P78, E56, E78, each writing its two grade cells from the frozen b4 brief, each writing a
per-slot system plan first and reading the others' (B43). Claude only, no GPT, no NWEA material. The coordinator (this
session) builds the tools, answers every REVIEW line, builds the packets and stops. The graders are fresh agents spawned
later from `science-b4/GRADER-PROMPT.md`; no author and no coordinator of this session spawns them.

**Topics excluded:** every live and staged map/science row (`science-b4/snapshot-live.mjs`, 367 rows READ-ONLY on
2026-10-31: pilot 30, v1 215 incl. 4 staged, v3 122 incl. 1 staged), every batch-1, batch-2, pilot-1, pilot-2 and batch-3-full
item (`science-b4/EXCLUSIONS-science.txt`, 1,134 lines; `probe-live-b4.mjs` compares each item with all of them).

## Rule 10d checkers (built and break-tested before any item)

`--rules b4` in `science-pilot/sci-check.mjs` = every b3f check except the per-item ECHO ban, plus:

| check | kind | refuses | randomize or forbid |
|---|---|---|---|
| VARPLAN | batch, per area + batch | a plan feature (REC: 2+ options right after noted/wrote down/recorded; SERIES: first..then second, third, fourth; ONEVAL: an option led by "one/a single"; BEFORE: an option "measured first / at rest") in more than half of the variable passages (n=4 -> 3, n=2 -> 2) | template cap, symmetric over options |
| SHORTLBL | batch, per area + batch | condition-label cores of 1-2 letters keyed outside 15-40% once 4 are used | base rate |
| KEYWORD | batch, per area x format (claim, term, variable) | a content-word lemma on 3+ keys with 1-in-4 binomial tail < 0.01; or on 17+ distractors and no key | base rate, both tails |
| ECHOBAL | batch, per area x format (term, claim) + batch | options that ALONE echo a stem content word: key share > 40% once 3 keys echo, or < 10% once 10 options echo | base rate, both tails |
| XKEY | batch (all areas) + probe vs every live/reference row | a term option (key or distractor) in another item's passage, prompt or figure, unless in more than 2 other texts | symmetric refusal (a leak, not a tell) |
| LAMARCK | item (Life) | need/will/effort/use/learning-driven change on any option | symmetric refusal (can never be a true key) |
| MISCDECL | item (model) | missing `key_category`, a distractor without a >= 6-word `misconception` or `same_category: true` | presence only |

`science-b4/validate-b4-rules.mjs` (exit 0, output `scratchpad/map-science-b4/validate-b4.txt`) on batch 3 full's 230 items:

| check | named items caught (on) | named items flagged when disabled |
|---|---|---|
| VARPLAN | 11 of 11 (L5-17 L6-03 L7-16 L8-16 P5-17 P6-10 P7-11 P8-02 E6-03 E7-10 E8-12) | 0 |
| SHORTLBL | 5 of 5 (Earth 0 of 5 keyed) | 0 |
| KEYWORD | 4 of 4 ("energy" 5 keys / 1 distractor, P = 4.6e-3; also catches P7-04) | 0 |
| ECHOBAL | 3 of 3 (Life term 4 of 7 keyed; also L7-18) | 0 |
| XKEY | 4 of 4, the exact pairs E8-04 -> E8-13 and E8-07 -> E8-18 | 0 |
| LAMARCK | 5 of 5 | 0 |
| MISCDECL | refuses an undeclared model item; passes it declared; refuses one off-category distractor; quiet when disabled | |

**Stated weaknesses (fixed now, not revisited after items):**
- VARPLAN misses **E5-10** (named by both Earth graders): only one of its options follows a recording verb. Below
  threshold by construction.
- **ECHOBAL found what the graders did not name:** under the per-item ban, batch 3 full's claim keys were the lone
  stem-echo option in 1 of 20 (Life), 1 of 20 (Physical) and 1 of 26 (Earth) cases, against 12-30% in batch 2 before the
  ban: the ban produced the inverse tell in every area. Batch 4 drops the per-item ban for the distribution.
- XKEY's frequency cut (> 2 other texts = ordinary vocabulary) was set on batch 3 full, where a bare match fired 47 times
  (40 on "year", "speed", "glacier"); with the cut it fires 11 times, including both named pairs. Against the live pool
  (900+ texts) the cut is stricter, so a rare term in one live passage still refuses.
- Reach on batch 2 (224; printed by the validator, not gated): SHORTLBL 3 (Physical 0 of 5 keyed, Earth 1 of 7), XKEY 18,
  LAMARCK 1, VARPLAN / KEYWORD / ECHOBAL 0.
- B38's substance (is the misconception really held?) has no checker. That is the graders' `b4_one_sensible`.

Existing suites still pass: `sci-check --selftest`, `science-b3full/validate-b3full-rules.mjs`,
`science-b3p2/validate-b3p2-rules.mjs`, `sci-packet --selftest`. The keyed packet now also prints each model item's
declared key category and each distractor's declared misconception (keyed only; the cold packet is unchanged).

## Stages (per area unless noted)

| stage | what | decides? |
|---|---|---|
| 0 | `sci-check --rules b4` per area to exit 0; `probe-live-b4.mjs` per area to exit 0 | refuse until clean |
| 0b | the same with `--batch` over the three files; every XDUP-REVIEW, probe REVIEW and PEPAIR line answered in writing (`science-b4/XDUP-REVIEW.md`) before packets | refuse |
| 1 | 2 fresh with-source graders per area (6 spawns), `BRIEF-grader.md` + packets only (A1 blindness), cold then keyed, one folder each | **yes** |
| 2 | key-visible second audit (2 auditors per area, one adversarial) over stage-1 survivors, `science-audit-score.mjs` unchanged; MAP: `no_source` alone clears, any other flag holds | **yes** |
| 3-4 | stage `verified=false`, then release on the two agent passes (owner science rule 2026-10-30) | — |

Science is never queued for the co-founder (owner rule). **This session stops after the packets**: no grader, auditor or
attack runs; nothing is staged; no database write (the snapshot is a read).

## Drop rules (stage 1): rules 1-9 copied, rule 9 extended to `b4_*`

1. `key_correct: no` from either grader, confirmed by the coordinator's recomputation -> **drop**. No repair.
2. The same `second_defensible` option from both graders -> **drop**. From one grader -> one return; a fresh grader re-checks; a second hit -> drop.
3. A confirmed `fact_error` -> **drop** (includes a passage contradicting its own figure, B10).
4. `no_source_needed: yes` from both graders on a data or investigation item -> **drop**. From one grader -> recorded (the
   figure-covered attack is not run).
5. A confirmed `recognised_real_data` -> **drop**.
6. `free_elimination` from both graders, each killing 2+ distractors -> **drop**. Killing 1 -> recorded.
7. `readability: problem` confirmed against the renderer -> **drop**.
8. `grade_fit` is recorded only, never a drop.
9. Any `b1_*`, `b2_*`, `b3_*`, `b3p2_*` or **`b4_*`** field from **both** graders on the same item -> **drop** (for
   `b2_duplicate` and `b4_cross_naming`, the higher-grade item of the pair; same grade: the higher slot number). From
   **one** grader -> one return; a fresh grader re-checks; a second hit -> drop. A `b4_plausibility` hit that is a fact
   error is also rule 3.

## Rule 10: the Amendment A1 threshold (copied unchanged)

10. **Cross-item patterns.** A `cross_item_pattern` counts as named by both graders of an area when both describe the same
    property (the coordinator records both quotations and the match before working out any intersection), and the items
    it touches are the items BOTH name for it.
    - **10a.** An intersection of **3 or more items** drops those items. Fewer: recorded, passed to the next brief's pending file.
    - **10b.** If the union of an area's 10a intersections is **50% or more of its authored items** (Physical >= 48 of 95,
      Life >= 38 of 75, Earth >= 35 of 70), the whole area cohort is held.
    - **10c.** Answer-letter position and option-order patterns never count (`shuffleDrawnChoices` reshuffles every drawn item).
    - **10d.** A mechanical pattern that meets 10a gets a checker and a fixture before the next authoring step. No re-matching
      after seeing the items.

## Attacks: report-only, not run (copied)

The options-only and figure-covered instruments' validity for map/science is undetermined (no human sitting); both stay
report-only and are not run.

## Pre-registered predictions (recorded; none gates)

- **F1:** EMPTY slots <= 8 of 240.
- **F2:** no area reaches 10b.
- **F3:** 10a drops <= 6 items per area (failed in every area of batch 3 full).
- **F4:** stage-1 drops under rules 1-9 <= 25% per area before returns (batch 3 full: 26.7 / 37.3 / 31.3%).
- **F5:** none of batch 3 full's seven 10a patterns (B31 one-sensible, Lamarckian, variable plan, stem echo, "energy" on
  keys, two-letter label, B7 cross-naming) is named by both graders of any area with 3+ shared items.
- **F6:** at least one NEW pattern is named by one grader somewhere.
- **F7:** final survival (after stage 2) >= 55% overall (>= 132 of 240) and Physical >= 50% (>= 48 of 95), enough with
  the 362 live to reach about 10 forms.
- **F8:** model claim survival >= 45% (batch 3 full: 14 of 46 = 30%).
- **F9:** variable survival >= 4 of 10 (batch 3 full: 0 of 12).

## Tool fingerprints before any item (sha256, first 16)

Recorded below by the coordinator after the tools were built and break-tested and before any author was spawned.

- `map-v2-work/science-b4/slots.json` 34264bbe2a73a236
- `map-v2-work/science-b4/make-slots.mjs` bd03594b4ecf2b3d
- `map-v2-work/science-b4/BRIEF-body.md` 3095259348e83551
- `map-v2-work/science-b4/BRIEF.md` 2ff5bbea7d4a8386
- `map-v2-work/science-b4/BRIEF-grader.md` 6da19f0b5f6a5931
- `map-v2-work/science-b4/make-brief.mjs` d849c0b5b049c4ee
- `map-v2-work/science-b4/GRADER-BRIEF.md` 6283a12b2444c8a6
- `map-v2-work/science-b4/GRADER-PROMPT.md` 87645bc6eb558b28
- `map-v2-work/science-b4/validate-b4-rules.mjs` 5d36fe2aa1dc30a9
- `map-v2-work/science-b4/probe-live-b4.mjs` 3895eef55d5565bb
- `map-v2-work/science-b4/snapshot-live.mjs` d942b29360090770
- `map-v2-work/science-b4/expand.mjs` d59ed10dbb7bd138
- `map-v2-work/science-b4/make-exclusions-b4.mjs` 37d0655d0a756657
- `map-v2-work/science-b4/EXCLUSIONS-science.txt` 77292e418e611a3d
- `map-v2-work/science-pilot/sci-check.mjs` ef45c8d5ff4d9ba5
- `map-v2-work/science-pilot/sci-spec.mjs` 3b32ae4a0a5bf0ae
- `map-v2-work/science-pilot/sci-packet.mjs` ad80de852c5bbcbe
- `map-v2-work/science-pilot/name-endings.json` eb8be670faed287c
- `scratchpad/map-science-b4/live-map-science.json` 7e6dfc93b30bfc0e

No `src/` change, no database write, no new environment variable.

---

# Addendum S (2026-10-31): authoring record and stage 0 / 0b, written before any grader

No rule above changed, and no tool listed in the fingerprints above changed (sci-check `ef45c8d5ff4d9ba5`, sci-packet
`ad80de852c5bbcbe` re-hashed at packet time). New files after the fingerprints: `science-b4/build-packets.sh`,
`science-b4/XDUP-REVIEW.md`, `science-b4/AUTHOR-PROMPT.md`, `science-b4/REVIEW-PROMPT.md`, and the records below.

## Authoring

Six parallel Claude author agents (L56, L78, P56, P78, E56, E78) wrote all 240 slots from the frozen b4 brief, each after a
per-slot system plan (`science-b4/plans/`). **0 EMPTY** (F1 holds). Sources `science-b4/src/src-<cell>.mjs` ->
`expand.mjs` -> `science-b4/items/{L,P,E}.json` (75 / 95 / 70). No slot swapped.

## XDUP review: 43 rewrites before packets

The first full probe and batch pass printed 408 REVIEW lines. Fresh Claude adjudicators (only the two items and the rule)
judged 49 pairs duplicate on **37 batch-4 items** (Life 12, Physical 20, Earth 5); the authors rewrote each on a new system
and concept. Round 2 (111 new or touched lines) found 4 more (L7-12, P8-09, P8-22, P6-13); the coordinator judged two
further P8-22 versions duplicates (ball-and-stick models beside P7-15; four solids timed melting beside live MSB1-P7-09).
Final: **366 REVIEW lines, all answered, 0 duplicates** (`science-b4/XDUP-REVIEW.md`). So B42's plan step did not stop
same-system collisions with the live and earlier banks: 37 of 240 first drafts (15%) reused a system on its PE. Lesson for
the next brief: give authors the live systems per PE as a list before planning, not only a grep instruction.

## Stage 0 / 0b (all exit 0 on the final files)

| check | Life 75 | Physical 95 | Earth 70 | batch 240 |
|---|---|---|---|---|
| `sci-check --rules b4` | 75 ok | 95 ok | 70 ok | batch clean (exit 0) |
| `probe-live-b4.mjs` (367 live/staged + b2 224 + p1 24 + p2 24 + b3f 230) | | | | 0 refused, 336 REVIEW (35 PEPAIR) |
| batch XDUP-REVIEW (cross-author stem route) | | | | 30 |
| `sci-check --rules b3p2` (reference only) | 7 fail | 8 fail | 8 fail | every failure is the per-item ECHO ban that b4 replaces with ECHOBAL by design; 0 other failures |

**The 10d checkers on the batch** (`science-b4/sci-check-batch-b4.txt`): VARPLAN no plan feature in any of 10 variable
passages; SHORTLBL no 1-2-letter label core used; KEYWORD most key-heavy word per area "water" 3/4, "energy" 3/7, "form" 3/4
(all P > 0.05; batch 3 full "energy" was 5/6); ECHOBAL lone-echo key share 20-23% in every area x format (batch 3: Life term
57%, claims 4-5%); XKEY 0 hits; LAMARCK 0; MISCDECL all 79 model items declared. Distributions: BARPOS 2/2/2 per area;
BAREXT 33%; TRENDFORM compound/simple 24%/26%; RANKBAL flat; CLAIMBAL marked-option key share 21/20/25%; FILLER 0 reused
among 512 option texts; ORDER within caps; cliche keys 0.

**Recorded risks for rule 10 (reported checks only):** NAMESHAPE puts **Physical "W W" names on 54 of 67** name-bearing
items (81%) and Earth single-word names on 30 of 46 (65%), above B29's "about a third". NAMETPL is under its threshold in
every area (closest Life "-ey" x7, P = 1.2e-3 against 0.001). No name template has been a both-grader 3+ pattern so far.
Authors flagged their own weakest keys in their replies (e.g. P8-13 inference vs supported; P7-22 weakly documented
misconceptions; E8-04 "rainfall total" a weak misconception; L8-12 process mix-ups); none was edited by the coordinator.

## Packets (b3-full layout)

`scratchpad/map-science-b4/packets/`: `<area>/grader-cold.md` (life 75 / phys 95 / earth 70 items, 0 KEY lines, 0 declared
misconceptions, no prior_free or option roles), copies in `<area>-g1/` and `<area>-g2/`, keyed packets only in
`hold/<area>-keyed.md` (75 / 95 / 70 KEY lines; 81 / 84 / 72 declared misconception lines = 3 per model item), and
`GRADER-PROMPT.md` (= `science-b4/GRADER-PROMPT.md`). Six grader spawns, by the coordinator of a later session. This
session stops here: no grader, auditor or attack ran; nothing staged; no database write.

## Fingerprints at packet time (sha256, first 16)

- `map-v2-work/science-b4/items/L.json` 13b2e9c6571ec121
- `map-v2-work/science-b4/items/P.json` 396e048136cff763
- `map-v2-work/science-b4/items/E.json` cc72e7e3a0d5d975
- `map-v2-work/science-b4/XDUP-REVIEW.md` fdd6e15b15597e2e
- `map-v2-work/science-b4/GRADER-PROMPT.md` 87645bc6eb558b28
- `map-v2-work/science-b4/build-packets.sh` 95be7fd32ccec46f
- `scratchpad/map-science-b4/packets/life/grader-cold.md` e90bd086c90fd248
- `scratchpad/map-science-b4/packets/phys/grader-cold.md` 890fbdc7ba9eed39
- `scratchpad/map-science-b4/packets/earth/grader-cold.md` 450a4ccdd4f2beaf
- `scratchpad/map-science-b4/packets/hold/life-keyed.md` 833e76679d55085a
- `scratchpad/map-science-b4/packets/hold/phys-keyed.md` 632350519cd1655b
- `scratchpad/map-science-b4/packets/hold/earth-keyed.md` fdc9e36c90bb90e3
