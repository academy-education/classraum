# ACT Science agent release, 2026-10-27: pre-registration

Written **before any grade exists**. No grader has seen a packet. The packets were built once to check the
builder: deterministic, from the bank, read-only. Nothing in this file changes after the first grader opens a
packet. A change after that point is a dated amendment, and it governs only work begun after it.

**Status: IN EFFECT 2026-10-27.** Covered by the owner's rule of 2026-10-27 ("Go" to: science release is decided by the agent with-source graders; the co-founder sits blind-only), recorded in REGISTER.md §5. The blind-run bar (whether a 2026-09-18 band becomes a release bar) is still an open owner decision and must be settled before the first ACT Science blind-only run is drawn. `science-release.json` names "pre-register an
agent release rule for ACT Science (owner)" as the first step on every ACT Science blocker. Approval must come
before step 2 of the stages below, and this file must be committed (with its tools, at the fingerprints at the
end) before any grader is spawned.

## Why

On 2026-10-27 the owner set a new rule ("OWNER RULE CHANGE", REGISTER §5): for act/science and map/science,
release is decided by two fresh agent with-source graders who read the decoded graphics under pre-registered
drop rules. The co-founder sits **blind-only** (options and stem, no source, no verdict). Twelve staged ACT
Science cohorts cannot use that path. Every ACT Science prereg (`act-science-v5.RELEASE.PREREG.md`,
`act-v9-v6.RELEASE.PREREG.md`, `act-v11-v8-isee13.RELEASE.PREREG.md`, `wave7.RELEASE.PREREG.md`, and REGISTER
wave 4 for v7) makes his verdict sitting the gate. Their with-source grading also survives only as one-line
ledger summaries: no per-item grades, no cleared list, one named grader on v5a-v5d, and items on v6b, v9a and
v9b repaired after flags rather than dropped.

This prereg **replaces the release route** of those twelve cohorts. Their old ledger summaries are history and
evidence of nothing here. Every item is graded afresh, including the items repaired earlier.

## Population (measured 2026-10-27, read-only)

| | |
|---|---|
| cohorts | `act-science-v5a` `v5b` `v5c` `v5d` `v6a` `v6b` `v7a` `v7b` `v8a` `v8b` `v9a` `v9b` |
| rows | **480**, all `verified=false, archived=false` (0 live, 0 archived) |
| per cohort | 40 items in 7 passages: DR 2 (5 items each), RS 3 (6 each), CV 2 (6 each) |
| figures | 28 of 40 items per cohort carry a **table**; the 12 CV items carry none. No bar, line, scatter or svg figure anywhere |
| join key | `verify_meta.localId` (e.g. `ASV5a-P1-Q1`), unique across all 480 |
| reachability | act/science is NOT hidden (`HIDDEN_SUBTOPIC_SLUGS` = sat-essay, act-writing). 120 items are live. **A released row is served on the next form.** |

`bank-state.mjs counts`: `act/science 120 drawable, 480 STAGED`.

## Instruments (all in `scripts/study-bank/act-science-regrade/` unless noted)

| file | role |
|---|---|
| `batches.json` | the batch split and the deal seed of each batch, fixed here |
| `act-sci-packet.mjs` | `build` (cold + keyed packets), `release-keyed` (freezes cold.json by sha256, then hands over the keyed packet), `check` (validates a grade file; refuses changed cold picks), `recheck` (packet of the single-grader flags for one fresh grader), `decide` (applies the drop rules below; refuses while anything is pending), `--selftest` |
| `GRADER-BRIEF.md` | the grader brief: fields, blindness list, drop rules (copied from here; this file governs) |
| `GRADER-PROMPT.md` | the prompts for g1/g2 (cold, keyed) and r1 (cold, keyed), and the run order |

**What the builder guarantees.** Each guarantee is pinned by a selftest case, and each case was break-tested on
2026-10-27 by reverting its mechanism and watching it fail:

- **Graphics decoded the way the student runner draws them** (`QuestionGraphicView`). Tables keep only truthy
  row and column labels and index cells by the filtered row, so a blank label shifts rows exactly as on
  screen. A `RENDER WARNING` is printed whenever the screen differs from the data. Bars get the five y ticks
  and no values. Line and scatter plots get the five ticks per axis, and all series are black with no legend.
  The passage and the stem pass through `normalizeDisplayText`. `passage_title` is withheld because the runner
  never draws it. **An svg figure, or any type it cannot decode to text, refuses (exit 2).** None exists in this
  population.
- **No key in the cold packet.** The cold packet has no key, no explanation and no difficulty. On all six built
  batches, 0 of 480 explanations appear in a cold packet, against 480 of 480 in the keyed ones (the positive
  control).
- **The deal.** Options are re-dealt with keys **flat per batch** (20/20/20/20 on every batch, seed in
  `batches.json`) and distractors shuffled. The stored order carries a positional skew: `act-science-v5b` keys
  sit in D on 3 of 40 and in B on 16. Students never see the stored order (`shuffleDrawnChoices`), so a grader
  must not see it either.
- **Cold before keyed.** The keyed packet lives in `_coordinator/<batch>/` and reaches a grader's folder only
  through `release-keyed`, after their `cold.json` validates and is frozen.
- **Grades bind to content.** `decide` refuses if any item's `content_sha` changed after its packet was built.

## Stages and agents

| stage | what | decides? |
|---|---|---|
| 0 | `act-sci-packet.mjs --selftest` prints `SELFTEST OK`; `build b1..b6` | refuse until clean |
| 1 | per batch, **two fresh graders (g1, g2)**, Claude only, each in their own folder `scratchpad/act-science-regrade/<batch>-<g>/`: cold pass → `release-keyed` → keyed pass → `check` | **yes**: drop rules |
| 1b | `recheck <batch>`: items flagged by ONE grader under R2 or R4 go to **one fresh re-check grader (r1)** per batch, cold then keyed, never told the flag | **yes**: R2b, R4b |
| 1c | coordinator confirmations (`_coordinator/<batch>/confirm.json`) for R1, R3, R5, R7, R8 | **yes** |
| 2 | `decide <batch> --write` writes `results/<batch>/{g1,g2,r1}.keyed.json`, `<cohort>.cleared.json`, `<cohort>.dropped.json` | records |
| 3 | archive every dropped row (owner-approved DB write; see Wiring) | — |
| 4 | wire `science-release.json`, lift the queue hold, draw ONE blind-only run per cohort (`draw-next`) | — |
| 5 | the co-founder sits it blind-only; `release-by-shape.mjs <run>` (dry, then `--apply`) | releases the cleared list |

**The batch split** (fixed in `batches.json`). One batch is two sibling cohorts written to the same brief: 80
items and 14 passages, inside the 80-100 target. Siblings are paired so that one grader sees the cross-item
patterns a shared brief produces.

| batch | cohorts | items | passages |
|---|---|---|---|
| b1 | v5a + v5b | 80 | 14 |
| b2 | v5c + v5d | 80 | 14 |
| b3 | v6a + v6b | 80 | 14 |
| b4 | v7a + v7b | 80 | 14 |
| b5 | v8a + v8b | 80 | 14 |
| b6 | v9a + v9b | 80 | 14 |

**Agents: 12 graders (6 × g1/g2), plus at most 6 re-check graders (one per batch, only when `recheck` reports
flags): 12-18 in total.** Every agent is fresh. None has authored, graded or seen any of these cohorts or their
ledger entries. A grader who opens anything on the brief's blindness list is void and replaced by a fresh one.
The replacement starts from the cold packet.

## Drop rules (stages 1-1c), fixed now

The MAP Science rules (`MAP-SCIENCE-PILOT.prereg.md` §Drop rules, `MAP-SCIENCE-B1.prereg.md`), adapted where
ACT Science differs. Each adaptation is listed under the table with its reason.

| | finding | action |
|---|---|---|
| R1 | `key_correct: no` or `unsure` from **either** grader, **or** both graders' cold picks on the same non-key letter | the coordinator recomputes from the cells → confirmed wrong: **drop**; confirmed right: kept. No repair |
| R2 | `second_defensible` from **both** graders naming the same option | **drop** |
| R2b | `second_defensible` from **one** grader | the re-check grader; names the same option: **drop**; otherwise recorded |
| R3 | `fact_error` from either grader, confirmed by the coordinator | **drop**; scope `passage` when the error is in the shared passage or table |
| R4 | `no_source_needed: yes` from **both** graders | **drop** |
| R4b | `no_source_needed: yes` from **one** grader | the re-check grader; `yes`: **drop**; otherwise recorded |
| R5 | `recognised_real_data` from either grader, confirmed | **drop**; scope `passage` when the shared table is the real data |
| R6 | `free_elimination` from **both** graders, **each** killing 2+ distractors | **drop**; fewer: recorded, counted in the batch's free-elimination rate |
| R7 | `readability: problem`, confirmed by the coordinator against the renderer | **drop**; scope `passage` when the figure is the problem |
| R8 | `cross_item_pattern` named by **both** graders | holds the batch; resolved as below |
| — | `single_sentence`, `difficulty` | recorded only, never decide |

**Adaptations from MAP, and why:**

1. **No return to an author; a re-check grader instead (R2b, R4b).** These items were authored days ago and
   their authors are gone. A repair made in response to the round that caught it is fitting to the instrument
   (CLAUDE.md 2026-09-24). The single-grader path therefore goes to one fresh grader who is not told the flag.
2. **R4b corroborates with the re-check grader, not the figure-covered attack.** On ACT Science the no-source
   attack measures the model's science knowledge (model 88.9% vs human 28.6% on the shipped bank). MAP used it
   only as corroboration. Here it would corroborate with the instrument CLAUDE.md records as invalid for this
   family.
3. **R4 covers every format, CV included.** MAP exempts "model" items, which test knowledge by design. ACT
   Science has no such class: every item is meant to be answered from the passage, and a CV item answerable
   without the viewpoints is the same defect.
4. **R1 also opens when both cold picks agree off the key**, even if both graders then accept the key. Two
   independent cold disagreements on the same letter are evidence that a keyed read can talk itself out of.
5. **R6 counts distractors only.** A grader listing the key as "eliminated" is noise, not a kill.
6. **R3, R5 and R7 carry a scope.** An ACT Science table is shared by 5 or 6 items, so a defect in it is a
   passage defect.
7. **MAP batch 1's `b1_*` fields are not used.** They encode rules from MAP's own authoring brief. Their
   substance (option-set decides a compare item, lone qualifier, lone absolute, stated law, a telling name) is
   covered by `free_elimination` and `no_source_needed`, which every ACT grader answers.

### What counts as a cross-item pattern (R8)

A grader names a pattern only when all three hold:

1. it is a **rule** another reader can apply mechanically **without the passage**
2. it names **at least 3 items across at least 2 passages** of the batch
3. applied to those items, it picks the key more often than chance

Letter position never counts, because options are re-dealt. A defect on one passage only is an item finding. A
topic repeated across the two forms is a note unless it makes the key predictable.

**Resolution, fixed now.** When both graders name a pattern, the coordinator records whether the two name the
**same rule**. If they do not, the pattern is recorded and nothing drops. If they do, the coordinator writes
the rule in `confirm.json`, applies it to **every item in the batch** using the cold packet only, and writes the
letter the rule picks for each item **before opening `packet.key.json`**. The items where the rule picks exactly
one option and that option is the key are R8 drops (`confirm.batch.pattern.decides`). If the rule decides **half
or more of a cohort's 40 items**, that cohort fails whole and does not ship in this round. The rule is not
re-decided after seeing which items it touches. It holds or it does not.

### Passage integrity, fixed now

**Any drop removes its whole passage.** `assembleActSection('science')` (`src/lib/study/assemble.ts`,
`pickPassagesForSlots`) only takes a passage group that has its full count for its slot: DR 5, RS 6, CV 6. A
passage that loses an item is never drawn, so its surviving items would be released and never served. Its
siblings are recorded `passage_incomplete`. They are not defective, and they are archived with the passage. A
passage is not completed with a replacement item in this round, because a new item is a new batch with its
own grading.

A cohort ships **whatever full passages survive**. There is no minimum, because the assembler draws passages
across cohorts, not by cohort. A cohort with zero surviving passages keeps a `blocker` in
`science-release.json`, since the release path refuses an empty cleared list.

## Release shape, fixed now

**Cleared list plus one CLOSED blind-only run per cohort.** This is `release-by-shape.mjs`'s science path
(`autonomy-core.mjs planScienceRelease`), unchanged:

- every staged row of the cohort must be on its cleared list (so the dropped rows are archived first)
- the blind-only run must have rows on the cohort, and every row must have `blind_at`
- the run is drawn by `draw-next` as one blind pass over whole unserved passages, capped at 36, and need not
  cover every passage. Release then flips every cleared staged row of the cohort.

**The blind score is reported against its control and decides nothing.** The control is the best fixed letter on
the run's own deal (`blindScore`), never a literal. No ACT Science release prereg fixes a bar on his blind
picks, so `blindBar` is `null` for all twelve.

**Recorded for the owner, not adopted:** `SITTING-DIRECTIONS-2026-09-18-science.md` fixed bands before his first
ACT Science sitting: at or below ~35% clean, 35-50% inconclusive, above ~50% leaks. Those bands governed whether
the section unhid, on a different cohort, in a sitting that also carried verdicts, and the doc is not a release
prereg. They are printed beside each blind score as reference only. Making one of them a bar is an owner
decision. It must be taken **before the first ACT Science blind-only run is drawn**, and it becomes
`blindBar: { maxPct, basis }` on the affected cohorts.

His science blind picks are also **reported, not relied on**, until the owner confirms they were unassisted
(REGISTER 2026-10-27).

## Reported (none gates)

- per batch and per cohort: cleared, dropped by rule (by R-number), `passage_incomplete`, and passages lost
  out of 7
- cold-pick agreement with the key, per grader (denominator first)
- free-elimination rate (R6 recorded) and `single_sentence` rate
- **the items repaired earlier** (ASV6b-P5-Q5; the 13 changed v9a items; the 4 reworked v9b items) as a separate
  stratum, with their drop rate beside the rest. No extra rule applies to them.
- the blind-only score against its control, per cohort, with n

## Pre-registered predictions (recorded; none gates)

- **P1:** cold-pick agreement with the key is at least 95% per grader. Most of these are table reads.
- **P2:** rule drops are at most 10% of items (48 of 480). Passage integrity then takes 3-5 times that many,
  so expect 20-35% of passages lost.
- **P3:** `no_source_needed` (R4/R4b) is the most frequent drop. It concentrates in RS and CV, where
  wave 7's graders already found knowledge-decidable items.
- **P4:** at least one batch is held by R8.
- **P5:** after release, `form-capacity.mjs` ACT Science moves from 3 to at least 5 forms (the five-test
  floor).

## Wiring into `science-release.json` (verified against the code, 2026-10-27)

Read from `release-by-shape.mjs` (`scienceRelease`), `autonomy-core.mjs` (`planScienceRelease`, `idsUnder`,
`blindScore`), `draw-next.mjs` and `src/lib/study/__tests__/blind-only-runs.test.ts`.

1. **Entry shape**, one per cohort. Remove `blocker` and write:
   ```json
   "act-science-v5a": {
     "family": "act/science",
     "prereg": "ACT-SCIENCE-AGENT-RELEASE.prereg.md",
     "qid": "localId",
     "cleared": "act-science-regrade/results/b1/act-science-v5a.cleared.json",
     "dropped": [{ "file": "act-science-regrade/results/b1/act-science-v5a.dropped.json", "keys": ["drop_rules", "passage_incomplete"] }],
     "grades": ["act-science-regrade/results/b1/g1.keyed.json", "act-science-regrade/results/b1/g2.keyed.json"],
     "blindBar": null,
     "blindBarNote": "ACT-SCIENCE-AGENT-RELEASE.prereg.md fixes no bar on his blind picks; reported against the deal-derived control, with the 2026-09-18 bands (<=35 / 35-50 / >50) as reference only."
   }
   ```
   - Paths resolve against `scripts/study-bank/` (`here + cfg.cleared`).
   - `qid: "localId"` is read as `verify_meta.localId` (`cfg.qid.split('.')`).
   - `qidPrefix` is not needed, because the files are per cohort.
   - Add `results/<batch>/r1.keyed.json` to `grades` when a re-check ran. Each `grades` file is only
     checked for existence.
   - `dropped.keys` must name keys present in the file, or `idsUnder` throws. `decide --write` always writes both
     keys, as objects keyed by qid, which `idsUnder` accepts.
2. **Archive the dropped rows first.** `planScienceRelease` refuses a cohort while any `verified=false,
   archived=false` row is off the cleared list. So every row under `drop_rules` and `passage_incomplete` must be
   `archived=true` before release. It must also happen before the blind-only run is drawn, or `draw-next`
   (which counts staged unserved rows) deals dropped passages to the co-founder. This is a DB write. It needs
   the owner's go-ahead and a small script that writes only rows still `verified=false, archived=false`,
   stamping `verify_meta.archive_basis` with the rule and this prereg.
3. **Test changes, in the same commit as the first wired entry.** Without them the suite fails:
   - `blind-only-runs.test.ts` ("science-release.json matches the records on disk") asserts
     `expect(c).toMatch(/^map-science-/)` for every releasable entry. Widen it to `/^(map|act)-science-/`.
   - The same test asserts `dropped.size > 0`. A cohort with no drop at all would fail. Replace it with: every
     `dropped.file` exists and holds every listed key. For ACT entries, add that cleared plus dropped equals the
     cohort's 40 qids, with no overlap.
4. **Queue.** In `cofounder-queue.json`, each `act-science-*` entry carries `upTo: 0` and a `heldNote`, and most
   also carry a pinned spot `group`. For each wired cohort, remove `upTo` and `heldNote`, and remove any `group`
   pin, so that the blind-only run is drawn over surviving whole passages (`draw-next` caps at 36). Check with
   a `draw-next.mjs` dry run (no `--commit`) that the run lists only surviving passages before committing it.
5. **Release.** After he closes the run, run `node scripts/study-bank/release-by-shape.mjs <runId>` (dry). It
   must print `release N staged row(s)` with N equal to the cleared count, the blind score against its control,
   and `reviewer_kind`. Then run it again with `--apply`, which writes only rows still `verified=false,
   archived=false`.
6. **Records**: a REGISTER §5 entry in the same commit as each wiring, then a `form-capacity.mjs`
   re-measure.

## Files written during the run (not before)

- `scratchpad/act-science-regrade/<batch>-{g1,g2,r1}/` (graders: cold.json, keyed.json)
- `scratchpad/act-science-regrade/_coordinator/<batch>/` (confirm.json, decision.json, recheck files)
- `scripts/study-bank/act-science-regrade/results/<batch>/` (written by `decide --write`; committed)
- an `ACT-SCIENCE-AGENT-RELEASE-RESULT.md` holding every count with its denominator, and a REGISTER §5 entry
  in the same commit

## Tool fingerprints at pre-registration (sha256, first 16)

- `act-science-regrade/act-sci-packet.mjs` 6c0b14307cdd2a7d
- `act-science-regrade/GRADER-BRIEF.md` c1ad06656c174616
- `act-science-regrade/GRADER-PROMPT.md` 10ef8eb31c092db5
- `act-science-regrade/batches.json` a0a84e761919350a
- `seeded-shuffle.mjs` 63fbb25069d7499f
