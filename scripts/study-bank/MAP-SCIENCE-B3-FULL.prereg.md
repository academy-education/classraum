# MAP Science batch 3 FULL, 2026-10-31: pre-registration

Written **before any full-batch item exists and before any full-batch tool change**. Nothing in the sections above the
addendum changes after an item is seen. Drop rules 1-9 are copied unchanged from `MAP-SCIENCE-B3.prereg.md` (which
carries batch 2's, extended by amendment P2 to the `b3p2_*` fields). Rule 10 is replaced, and the reason is given.

## Why a full batch now

- Batch 2 (224) was held in all three areas on rule-10 patterns (REGISTER 2026-10-31).
- b3 pilot 1 (24) failed on INVERSE tells: a rule that forbade a key property made the property mark a distractor.
- b3 pilot 2 (24) used the randomize-at-base-rate method. Every b2 and pilot-1 tell was gone; 48 of 48 cold picks
  on key; no fact errors that changed a key. Physical and Life failed only because both graders named a pattern, and
  every pattern rested on **two items**: both Physical read keys at a chart extreme (P6-01, P8-01); "It remained
  constant." as a distractor in both Life trend items (L7-01, L7-02). Earth was clean.
- REGISTER's pilot-2 entry did not re-decide pilot 2 and directed that the full batch be written under the Amendment A1
  threshold from `AGENT-REVIEW-SSAT-MAP.prereg.md`, fixed in writing before any item exists. This file is that.

## Sizing (fixed now)

| area | authored | cells (grade 5 / 6 / 7 / 8) |
|---|---|---|
| Life Science | 75 | 19 / 19 / 19 / 18 |
| Physical Science | 75 | 19 / 19 / 19 / 18 |
| Earth and Space Science | 80 | 20 / 20 / 20 / 20 |
| **total** | **230** | |

Slots are dealt like batch 2's (`science-b2/make-slots.mjs`: batch 1's 20-row template per cell; a 19-row cell drops the
second table/conditions slot, an 18-row cell also drops the fourth model claim), with pilot 2's randomizations layered on:
read-item position (tallest / shortest / middle) dealt evenly **within each area**, trend keys half simple and half
compound within each area, and key ranks and key letters flat **per area per format**. Ids `MSB3-<A><g>-NN`. The deal
is seeded and `make-slots.mjs --check` reproduces it. No cell count changes after an item is seen.

## Method (fixed now)

The pilot-2 method, "randomize at base rate, never forbid", with every pilot-2 grader note turned into a binding lesson:

| pilot-2 note (grader) | lesson for the full batch |
|---|---|
| "It remained constant." a filler distractor in both Life trend items (life-g1, life-g2) | no distractor string is reused across items; trend options name the item's own quantity ("The seed count rose."), so no two items share an option |
| L5-02's procedure introduces every option as a sentence subject with its value; "in each jar: 500 mL" works like the banned "for every" (life-g1, life-g2) | no role-statement procedures in any form: options are named inside action sentences, and no quantity is introduced with a one-value phrase that answers the stem |
| P7-01: the stem's "how far" picks the key and names the changed quantity (phys-g1, phys-g2); L7-02, P5-01: general knowledge leaves one plausible option (life-g2, phys-g1, phys-g2) | data and investigation items leave at least two options plausible to a student who knows the topic; no data item on a shape that follows from a known law (a ball thrown up) |
| every Life system "<organism> line X-n"; every Physical system a Letter-digit code (life-g1, life-g2, phys-g1) | invented names vary in template across items, not only in letters |
| both Physical read keys at chart extremes (phys-g1, phys-g2) | read-item positions are balanced within each AREA, not only across the batch |
| L6-02's key the only one-word term; "spontaneous generation", "mutations fade", "dye particles swell", a self-contradicting reason (life-g1/g2, phys-g1, earth-g1/g2) | term options share a word-count shape; model distractors are held misconceptions of the same category; no lone yes/no polarity |
| P6-02 a struck bar treated as 1/L (real law 1/L^2); E5-01 a yearly pattern that does not repeat; L8-01 a real named example (myostatin cattle); P5-02 Galileo's ramp | invented data obey the real law for THAT device; no famous real example or canonical experiment |

**One author, in session, no sub-agents**, as batch 2 and both pilots. The graders are fresh agents spawned by the
coordinator from `GRADER-PROMPT.md`; the author never spawns them and stops after the packets.

**Topics excluded:** every live and staged map/science row, every batch-1 and batch-2 item, and every pilot-1 and
pilot-2 item (`science-b3full/EXCLUSIONS-science.txt`; `science-b3full/probe-live.mjs` compares each item with all of
them). Pilot-2 survivors are not re-authored and are not part of this batch's packets.

## Tool changes allowed before any item (and only these)

1. `sci-check.mjs`: **recalibrate NAMETPL and RANKBAL** so they do not over-fire. The pilot-2 author measured 14 NAMETPL
   and 16 RANKBAL refusals on batch 2's 224 items that no grader named. Each recalibrated check is break-tested with
   fixtures (band edges, a known-clean population, and the named items it must still catch, or a stated reason why a
   named item now sits below the threshold) before any item is written.
2. New mechanical checks for the table above (filler reuse, term shape, claim polarity, read-item cast), under a new rule
   set that is a superset of `b3p2`, each with a fixture that fires on the pilot-2 item a grader named.
3. Slots, brief, grader brief, exclusions and probe for the full batch.

Their fingerprints are recorded in the addendum below, written after the tools and **before any item**.

## Stages (per area unless noted)

| stage | what | decides? |
|---|---|---|
| 0 | `sci-check --rules b3p2` and the superset rule set per area to exit 0; `probe-live.mjs` per area to exit 0 | refuse until clean |
| 0b | the same with `--batch` over the three files; every XDUP-REVIEW and probe REVIEW line answered in writing (`science-b3full/XDUP-REVIEW.md`) before packets | refuse |
| 1 | 2 fresh with-source graders per area (6 spawns), `BRIEF-grader.md` + packets only (A1 blindness), cold then keyed, one folder each | **yes** |
| 2 | key-visible second audit over stage-1 survivors | **yes**, as batch 2 |
| 3-4 | stage `verified=false`, release on the two agent passes (owner rule 2026-10-30) | — |

Science is never queued for the co-founder (owner rule). This session stops after the packets: no grader, auditor or
attack runs; nothing is staged; no database write.

## Drop rules (stage 1): rules 1-9 copied unchanged

1. `key_correct: no` from either grader, confirmed by the coordinator's recomputation -> **drop**. No repair.
2. The same `second_defensible` option from both graders -> **drop**. From one grader -> one return; a fresh grader re-checks; a second hit -> drop.
3. A confirmed `fact_error` -> **drop** (includes a passage contradicting its own figure, B10).
4. `no_source_needed: yes` from both graders on a data or investigation item -> **drop**. From one grader -> drop only if
   the figure-covered samples are unanimous on the key; that attack is not run (below), so one grader's flag is **recorded**.
5. A confirmed `recognised_real_data` -> **drop**.
6. `free_elimination` from both graders killing 2+ distractors -> **drop**. Killing 1 -> recorded.
7. `readability: problem` confirmed against the renderer -> **drop**.
8. `grade_fit` is recorded only, never a drop.
9. Any `b1_*`, `b2_*`, `b3_*` or `b3p2_*` field from **both** graders on the same item -> **drop** (for `b2_duplicate`,
   the higher-grade item of the pair; same-grade pair: the item with the higher slot number drops). From **one**
   grader -> one return; a fresh grader re-checks; a second hit -> drop.

## Rule 10, REPLACED: the Amendment A1 threshold

10. **Cross-item patterns.** A `cross_item_pattern` counts as **named by both graders** of an area when both graders
    describe the same property (the coordinator records both quotations and the match before applying anything), and
    the items it touches are the items BOTH graders name for it (the intersection).
    - **10a (items).** If that intersection holds **3 or more items**, those items **drop**. Fewer than 3: recorded
      only, and passed to the next brief as a pending lesson.
    - **10b (cohort).** Take the union of the intersections of every pattern that met 10a in an area. If the union is
      **50% or more of the area's authored items** (Life and Physical >= 38 of 75, Earth >= 40 of 80), the **whole area
      cohort is held** for re-authoring and nothing from it clears. Below 50%, only the 10a items drop and the rest of the
      cohort is scored under rules 1-9.
    - **10c (excluded patterns).** Patterns about **answer-letter position** (key letters, letter runs, letter skews) or
      **option order** (distractors in sorted order, the key's place among the printed options) never count toward
      10a or 10b. Every bank draw re-orders each item's choices per student (`shuffleDrawnChoices`,
      `src/lib/study/assemble.ts`), so neither can reach a student; the packets' order is this batch's own deal.
    - **10d.** A mechanical pattern that meets 10a gets a checker and a fixture before the next authoring step.
      Re-deciding a pattern, or re-matching two graders' descriptions, after seeing which items it touches is not
      allowed.

**Why rule 10 changed.** Under the old rule a pattern named by both graders held the whole area. Pilot 2 showed what
that rule measures at small n: with 1-3 items per format per area, a two-item coincidence reads as a pattern, and both
of pilot 2's failing areas failed on exactly two items (P6-01 + P8-01; L7-01 + L7-02), each called "weak" by the
graders who named it. The A1 threshold already governs MAP Language and SSAT/ISEE reading for the same reason
(`AGENT-REVIEW-SSAT-MAP.prereg.md`, amendment A1: a five-item template held 35 items no grader faulted). A real
cohort-wide tell still holds the area (10b); a tell confined to three or more items drops exactly those items (10a);
a two-item coincidence is recorded, not acted on. The letter/order exclusion is A1's item 1 carried over, extended to
option order because batch 2's graders measured sorted distractors that the draw already removes.

## Attacks: report-only, not run (copied)

The options-only and figure-covered instruments' validity for map/science is undetermined (no human sitting); both stay
report-only and are not run, as in batches 1 and 2 and both pilots.

## Pre-registered predictions (recorded; none gates)

- **F1:** EMPTY slots <= 5 of 230.
- **F2:** no area reaches 10b (cohort hold).
- **F3:** 10a drops <= 6 items per area.
- **F4:** stage-1 drops under rules 1-9 <= 15% per area.
- **F5:** none of batch 2's nine, pilot 1's three or pilot 2's two patterns is named by both graders of any area with
  3+ shared items.
- **F6:** at least one NEW pattern is named by one grader somewhere (true in every round so far).

## Tool fingerprints

Recorded in the addendum below, after the tools are built and break-tested and before any item exists.

---

# Addendum T (2026-10-31): tools built and break-tested, written BEFORE any full-batch item

No rule above changed. This records what the "tool changes allowed before any item" section produced.

## Recalibrated checks (both rule sets `b3p2` and `b3f`)

| check | first form | recalibrated form | batch 2 (224, no grader named either) | named items |
|---|---|---|---|---|
| RANKBAL | a key rank above ceil(n/4) (+1 at n >= 8) per area per format, n >= 2 | a rank count c fires when c >= 3 AND the binomial tail P(X >= c \| n, 1/4) < 0.01, or c is every key of the cell (n >= 3) | 16 refusals -> **0** | pilot 1's two named cells were 2 of 3: now BELOW threshold by design (rule 10a needs 3 items) |
| NAMETPL | 3 items sharing any two-letter name ending in an area | each ending's expected item count from its base rate among 1,298 English given names (`science-pilot/name-endings.json`, from `/usr/share/dict/propernames`); fires at >= 3 items and Poisson tail < 0.001 | 14 refusals -> **2** (-by: Ashby/Ravensby/Thursby; -ow: Jarrow/Merrow/Penhallow/Yarrow, both rare endings, both plausible templates) | pilot 1's "-sk" (Hesk/Marsk/Tesk) still fires (P = 3e-9) |

Fixtures (`science-b3full/validate-b3full-rules.mjs`, exit 0): RANKBAL n=3 1/1/4 pass, 1/1/1 fire; n=4 three pass, four
fire; n=8 four pass, six fire; disabled -> gone. NAMETPL 2 x "-sk" pass, 3 fire; 3 of 8 "-on" pass, 7 of 8 fire; 300
random 60-item areas of English given names fire 6.0% (want <= 10%). A missing `name-endings.json` makes the batch
check fatal (exit 2), break-tested by moving the file. **Stated weakness:** at alpha 0.01 RANKBAL does not fire on 5 of 8
(P = 0.027); 0.03 would, but refuses one batch-2 cell nobody named. The full batch's ranks are dealt flat per area per
format and RANK enforces each slot, so drift cannot reach that edge. `science-b3p2/validate-b3p2-rules.mjs`'s two pilot-1
RANKBAL expectations and one band edge were rewritten to the recalibrated semantics (it still exits 0).

## New rule set `b3f` (superset of `b3p2`)

| check | refuses | named pilot-2 item it catches (validate-b3full-rules.mjs) |
|---|---|---|
| FILLER (batch) | an option text (trend / term / claim / variable) that is a distractor in 2+ items of an area or the batch and the key in none | "It remained constant." L7-01 + L7-02 (also catches two batch-wide reuses across areas) |
| TERMSHAPE (item) | a term option alone in its word count (symmetric: constrains every option, cannot invert) | L6-02 "fossilization" (also E6-02 "nebula") |
| CLAIMPOL (item) | Yes/No-led claim options not 2+2 or 4+0 | L6-01 lone "No" |
| READCAST, NAMESHAPE (batch) | report only | the read-item cast split and each area's name templates are printed so a grader's remark can be checked |

Each disappears when disabled; `b3p2` output is unchanged by them. `--selftest` (all four fixture rule sets) and
`--break-test --rules b3` still pass.

## Slots (`science-b3full/make-slots.mjs`, seed 20261398 found from 20261301; `--check` reproduces)

230 slots. Letters A58 B58 C58 D56; ranks 58/58/58/56; tiers 70/90/70; kinds data 100 / investigation 48 / model 82.
Per area: 6 drawn-axis reads with `pos` 2/2/2; 8 trends, 4 simple (increase, decrease, no-change, + one rotated by
area) and 4 compound (increase-then-level, decrease-then-level, decrease-then-increase, increase-then-decrease); ranks
and letters flat (spread <= 1) per area per format; every cell has each letter >= 3; DCIs round-robin; no controlled pair
on a bar chart.

## Snapshot

`scratchpad/map-science-b3/live-map-science.json` (245 rows) re-counted READ-ONLY against the server on 2026-10-31
before any item: 245 rows, no server id missing from the snapshot. The probe uses it plus batch 2 (224), pilot 1 (24)
and pilot 2 (24) and refuses (exit 2) on any wrong count.

## Tool fingerprints before any item (sha256, first 16)

- `map-v2-work/science-b3full/slots.json` 17ebca93ffc18a6f
- `map-v2-work/science-b3full/make-slots.mjs` e61824f5bf537296
- `map-v2-work/science-b3full/BRIEF-body.md` 383028d788217ccd
- `map-v2-work/science-b3full/BRIEF.md` df922457b22eff7b
- `map-v2-work/science-b3full/BRIEF-grader.md` 6660a31a9bfe88b8
- `map-v2-work/science-b3full/make-brief.mjs` 1bf36e4473dfc5cf
- `map-v2-work/science-b3full/GRADER-BRIEF.md` 7b316d710d0ee5e9
- `map-v2-work/science-b3full/validate-b3full-rules.mjs` d162075464a1045b
- `map-v2-work/science-b3full/probe-live.mjs` b413afedff6590d1
- `map-v2-work/science-b3full/expand.mjs` 87371b2300a2f0fb
- `map-v2-work/science-b3full/make-exclusions-b3full.mjs` 02059fe722e4fd05
- `map-v2-work/science-b3full/EXCLUSIONS-science.txt` 7a3aaa338b217155
- `map-v2-work/science-pilot/sci-check.mjs` df7869187207ab7b
- `map-v2-work/science-pilot/sci-spec.mjs` 3b32ae4a0a5bf0ae
- `map-v2-work/science-pilot/sci-packet.mjs` 66ce8d81fdc382c0
- `map-v2-work/science-pilot/name-endings.json` eb8be670faed287c
- `map-v2-work/science-pilot/make-name-endings.mjs` 962bfe27807fcf9e
- `map-v2-work/science-b3p2/validate-b3p2-rules.mjs` aa9edc4192fc7b59

No `src/` change, no database write, no new environment variable.

---

# Addendum S (2026-10-31): authoring record and stage 0 / 0b, written before any grader

No rule above changed. One author wrote all 230 slots in session (`scratchpad/map-science-b3full/{L,P,E}/src-<cell>.mjs` ->
`expand.mjs` -> `items.json`); no sub-agent, no slot swapped, **0 EMPTY** (F1 holds).

## Stage 0 / 0b (all exit 0 on the final files)

| check | Life 75 | Physical 75 | Earth 80 | batch 230 |
|---|---|---|---|---|
| `sci-check --rules b3f` | 75 ok | 75 ok | 80 ok | 230 ok, batch clean |
| `sci-check --rules b3p2` (recalibrated RANKBAL/NAMETPL) | 75 ok | 75 ok | 80 ok | 230 ok, batch clean |
| `probe-live.mjs` (245 live/staged + b2 224 + p1 24 + p2 24) | 0 refused | 0 refused | 0 refused | 0 refused, 204 REVIEW |
| batch XDUP-REVIEW (stem route) | | | | 25 |

Batch distributions (b3f output, `scratchpad/map-science-b3full/sci-check-batch-b3f.txt`): read position 2/2/2 in every
area (BARPOS); chart max and min offered in 6 of 6 read items per area and the key in 2 of 6 each (BAREXT 33%); trend
compound and simple options each the key 25% per area (TRENDFORM); RANKBAL clean (24 cells); 0 reused option texts across
520 distinct non-numeric options (FILLER); READCAST 3 of 6 read items all-plotted per area; CLAIMBAL: no reasons or degree
words except one Physical item with a degree word on 2 options (key and one distractor); ORDER ascending/descending
distractors 2/2, 3/4, 4/1 against a cap of 5; cliche keys 0; absolutes 0 on keys, 0 on distractors in 58 claims.

**Name templates (B29, reported only).** First-name template shares after diversifying 20 condition-label sets to single
names and 15 system names to codes or plain names: Life "W" 16 / "W W" 15 of 48, Physical "W" 18 / "W W" 18 / "C" 8 of
48, Earth "W" 24 / "W W" 23 of 52. B29's "about a third" is met in Life and Physical and **not met in Earth** (46% and 44%);
recorded as a risk for rule 10, since condition labels must share one shape inside an item (LSHAPE) and Earth carries 16
condition items.

## What the probe and batch pass changed before packets

22 items were rewritten to a different system and question after the first full probe/batch pass named a same-concept or
same-system neighbour (live, batch 2, pilot 2, or inside this batch); every REVIEW line is answered in
`science-b3full/XDUP-REVIEW.md` (229 lines; 10 nearest neighbours carry a written note; 0 judged duplicates remain).
Earlier per-cell passes also replaced ~30 drafts on probe refusals (live keys such as "asexual reproduction" and "natural
selection"; ratio/difference keys already used in the area; topic overlaps). Lesson for the next brief: **grep the live
term and claim keys and the area's used ratio/difference values per area before drafting** (they are dense on canonical
concepts), and plan systems per PE so in-batch neighbours (two stream tables, two rock-layer age tables, two model-roof
controlled pairs) do not arise.

## Tool change after Addendum T

`expand.mjs` gained `--partial` (skip missing cell files, write `items.partial.json`) for per-cell iteration; the full run
used for every result above is the unchanged path. No check changed.

## Packets (b2 layout)

`scratchpad/map-science-b3full/packets/`: `<area>/grader-cold.md` (75 / 75 / 80 items, 0 KEY lines, no ask, no prior_free or
option roles), copies in `<area>-g1/` and `<area>-g2/`, keyed packets only in `hold/<area>-keyed.md` (75 / 75 / 80 KEY
lines), and `GRADER-PROMPT.md` (also at `science-b3full/GRADER-PROMPT.md`). Six spawns. This author stops here.

## Fingerprints at packet time (sha256, first 16)

- `map-v2-work/science-b3full/expand.mjs` 11b7a2b0b2b1a31a
- `map-v2-work/science-b3full/GRADER-PROMPT.md` 795140748103a383
- `map-v2-work/science-b3full/XDUP-REVIEW.md` 4d4e31a48cd77770
- `scratchpad/map-science-b3full/L/items.json` fe7325a8a23c7d5d
- `scratchpad/map-science-b3full/P/items.json` 6a09ded87624c687
- `scratchpad/map-science-b3full/E/items.json` 39004332dec0b92a
- `scratchpad/map-science-b3full/packets/life/grader-cold.md` 1c0c529c6c5369c5
- `scratchpad/map-science-b3full/packets/phys/grader-cold.md` 22393eff8dd5e55e
- `scratchpad/map-science-b3full/packets/earth/grader-cold.md` e111e675d6f4d4ff
- `scratchpad/map-science-b3full/packets/hold/life-keyed.md` 6032be0e2b9bfbac
- `scratchpad/map-science-b3full/packets/hold/phys-keyed.md` cf71c25213556c9a
- `scratchpad/map-science-b3full/packets/hold/earth-keyed.md` 235a52ea4b8efee9

All Addendum T fingerprints other than `expand.mjs` are unchanged.
