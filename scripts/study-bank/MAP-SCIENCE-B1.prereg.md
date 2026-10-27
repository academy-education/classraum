# MAP Science batch 1, 2026-10-27: pre-registration

Written **before any batch-1 item exists**, and while the pilot's L0 sitting is still queued. The coordinator commits it
with its tools before any author output. Nothing below changes after an item is seen. Pilot:
`MAP-SCIENCE-PILOT.prereg.md` (amendments A1, A2) and REGISTER 2026-10-27 (30 of 36 staged; 6 dropped). Plan:
`MAP-SCIENCE-PLAN.md` (owner decisions under "Decided 2026-10-27").

## Start condition (fixed now)

Authoring starts only when the pilot's L0 sitting has closed and its notes are classified (`cofounder-notes.json`).
- **Pilot PASS** (at most 1 archived, H <= 35%): start as written.
- **Pilot PASS with notes**: each new note becomes a rule appended to `science-b1/BRIEF-body.md` under "Amendments from
  the pilot sitting". Then rebuild with `make-brief.mjs` and re-fingerprint below, in one commit, before any author starts.
  No slot, bar or drop rule changes.
- **Pilot FAIL-METHOD** (2 or more archived): batch 1 does not start. A new pre-registration is needed.
  Release-by-shape's pilot rule already sends batch 1 to a FULL sitting in that case; this prereg would then be superseded.
- **Pilot H > 35%**: batch 1 does not start until the coordinator has read his picks against the pilot slot table
  (pilot prereg).

## Sizing (fixed now)

Target per (area, grade) cell: grade 5 = 17, grades 6-8 = 16 (65 per area). Pilot staged per cell (if all 30 release):

| area | g5 | g6 | g7 | g8 |
|---|---|---|---|---|
| Life | 2 | 2 | 3 | 3 |
| Physical | 3 | 2 | 3 | 2 |
| Earth and Space | 3 | 2 | 3 | 2 |

**Need: 13-15 per cell, 165 in all.** Batch 1 authors **20 per cell, 240 slots** (plan §4.5). At the pilot's
staged rate (30/36 = 83%) that gives about 16.7 per cell; at the plan's 72% it gives 14.4. So some cells may come in 1-2
short, and batch 2 fills them. No cell's count changes after an item is seen.

## Inputs

| file | role |
|---|---|
| `map-v2-work/science-b1/slots.json` | 240 slots from `science-b1/make-slots.mjs` (seed in the file; `--check` reproduces it). 12 authors L5..E8. Per author: one grade, tiers 6/8/6, kinds data 9 / investigation 4 / model 7, letters 5x4, ranks 5x4, every letter on >= 3 ranks, DCIs +-1, >= 2 model and >= 1 investigation item per tier. Batch: letters 60x4, ranks 60x4, letter x rank cell <= 20; asks rotated within each (kind, format); data/investigation claims 12 of 156 (<= 1 in 10); **no controlled-pair on a bar chart** |
| `science-b1/BRIEF-body.md` -> `make-brief.mjs` -> `BRIEF.md` (authors) + `BRIEF-grader.md` (graders) | one source, two outputs. The grader copy has no slot tables, and make-brief refuses to write one that leaks a slot id or a key-letter column (break-tested) |
| `science-pilot/sci-check.mjs` (+ fixtures) | **default rules are now `b1`**; `--rules pilot` reproduces the pilot's checker; `--selftest` and `--break-test` must pass |
| `science-b1/validate-b1-rules.mjs` | the B1 checks pointed at the 36 pilot items with the graders' findings as the known answer |
| `science-b1/EXCLUSIONS-science.txt` | ACT Science files + live act/map science rows + the pilot's 36 items; regenerate with `make-exclusions.mjs --live --out ...` right before authoring |
| `science-b1/GRADER-BRIEF.md` | with-source brief: the pilot fields plus `b1_option_set`, `b1_qualifier`, `b1_absolute`, `b1_stated_law`, `b1_name_property`; the blindness rule |
| `science-b1/AUTHOR-PROMPT.md` | author and grader prompt templates |
| `science-pilot/sci-packet.mjs` | packets and report-only renders (unchanged; pass `--out scratchpad/map-science-b1/packets/<area>`) |
| `scripts/study-bank/stage-map-science-b1.mjs` | stager: three cohorts by area, `verified=false`, rules b1, `--cleared`; `--selftest` |
| `autonomy-methods.json` | `map-science-v1-life`, `-phys`, `-earth` -> `map-sci-b1-agents+cfg-v2` |

## The five batch-1 rules (from the pilot's graders) and how each is enforced

| rule | pilot evidence | mechanical check (refusing) | grader field |
|---|---|---|---|
| B1 option set must not decide compare/variable items | E-04, L-03 (labels); L-06, E-12, P-07 (outcome wording) | LABEL (opaque labels: no comma, no unit, no lowercase descriptor, no repeated table setting, a code or an invented name); ROLE (`option_roles` agree with wording; outcome ask >= 2 results; setting ask 0 results) | `b1_option_set` |
| B2 trend qualifier on all four or none | L-10, P-04, P-11 (and E-02) | QUAL | `b1_qualifier` |
| B3 no lone absolute / lone hedge; absolutes not only on distractors | all 8 pilot absolutes on claim distractors | ABS (per item: 0, 2 or 4 options carry one); ABSDIS (batch: >= 3 distractor absolutes and 0 key absolutes refuses) | `b1_absolute` |
| B4 no data item on a law the standard states | P-11, P-04 (and E-04, E-12) | LAW (`prior_free` present, >= 8 words); presence only | `b1_stated_law`, `no_source_needed` |
| B5 names never encode the tested property | E-11 | NAMEPROP (property lexicon on names_used and condition labels) | `b1_name_property` |

**Validation on real data** (`validate-b1-rules.mjs`, the 36 pilot items, LAW excluded because no pilot item had the field):
- **QUAL** fires on L-10, P-04, P-11, E-02: all 3 named items, plus E-02, where 3 of 4 options carry a qualifier.
- **ROLE** fires on L-06, P-07, E-12: all 3 named; option_roles were inferred from the wording.
- **LABEL** fires on L-03, E-04: both named.
- **NAMEPROP** fires on E-11, L-03 and E-01. E-11 is the named item. L-03's labels contain "dry". On E-01 the names "Ridge" and "Flat" were not flagged by the graders. **That is the check's known over-reach, accepted: renaming costs an author nothing.**
- **ABS** fires on E-05 ("always") and E-10 ("never"), lone absolutes the graders described as a batch pattern.
- **ABSDIS** fires: absolutes sit on 8 claim distractors and 0 claim keys.

Recall on the named items is 100% for every check. Break-test: disabling each of the seven checks fails its own
fixture(s), and with all on the suite is clean.

## Stages and seeds (per area cohort unless noted)

| stage | what | seed / instrument | decides? |
|---|---|---|---|
| 0 | each author: `sci-check.mjs <file> --slots science-b1/slots.json --exclusions science-b1/EXCLUSIONS-science.txt` to exit 0 | exact | refuse until clean |
| 0b | coordinator: `sci-check.mjs --batch` over all 12 files (same flags) | exact | refuse; one return per refused item; a batch-level refusal (ABSDIS, clichés, shared key prose, name collisions) returns the items it names |
| 1 | 2 fresh with-source graders per area (6 in all), **given `BRIEF-grader.md` and the packets only** (A1, below), cold then keyed | `science-b1/GRADER-BRIEF.md` | **yes** |
| 1b | grader v2 (`cofounder-grader/COFOUNDER-BRIEF-v2.md`) over the survivors | `second_defensible` validated, others hold-only | flag -> one return; second flag drops |
| 2 | figure-covered render, 3 samples per area, data + investigation items | `sci-packet.mjs covered`, deal seed 20261031 | **report-only** unless the pilot's validity branch says otherwise (below) |
| 3 | options-only render, 3 **different** samples per area (not the stage-2 samples: pilot caveat A2), + 24 live act/science control | `sci-packet.mjs oo --control 24`, deal seed 20261032 | **no**; reported only |
| 4 | stage `verified=false`, three cohorts, `--cleared` = stage 1/1b survivors | `stage-map-science-b1.mjs` | — |
| 5 | **L1 spot, 12 items per area cohort**: 2/3 random, 1/3 by risk score (Amendment 3 §3.5), co-founder blind | `draw-next.mjs` / cofounder-queue entries `map-sci-v1-<area>-bridge1-cofounder-{date}` | **yes**: release by `release-by-shape.mjs --shape bridge` (the first spot of a new method; later batches `--shape spot`) |

Fresh subagents only, Claude only, no GPT, no NWEA material.

## A1, carried forward as a rule: graders see the slot-free brief only

- Graders are given **`science-b1/BRIEF-grader.md`** and the per-area packets. They are never given `BRIEF.md`,
  `slots.json`, `make-slots.mjs` or any author folder. The grader prompt says so (`AUTHOR-PROMPT.md`), and a grader who
  opens one says so and is replaced, with cold picks void.
- `make-brief.mjs` builds both briefs from one body and **refuses** to write a grader copy containing any batch-1 slot id,
  a "| key letter |" column or a slot table row (break-tested both ways, 2026-10-27).
- The cold packet withholds the key and the slot's `ask` (`sci-packet.mjs`, pilot selftest).
- A grader's cold picks count as blind only if the grader's reply states which files it opened, and none is on the list above.

## Drop rules (stage 1/1b), fixed now

Rules 1-8 of the pilot prereg, unchanged, plus:
9. Any `b1_*` field from **both** graders on the same item -> **drop**. From **one** grader -> one return; a fresh grader re-checks; a second hit -> drop.
10. A `cross_item_pattern` named by both graders of an area holds that area's cohort for the coordinator, as in the pilot.
    A pattern that is mechanical gets a checker and a fixture in the same commit as the batch result, never mid-batch.

## Attacks: report-only, with one pre-registered branch

- **If the pilot sitting recorded options-only as invalid for map/science** (M - H >= 30): both renders stay report-only.
- **If it recorded "provisionally discriminating"** (M - H < 30 with H <= 35%): the figure-covered render becomes a
  **batch-level hold per area for the data and investigation kinds**. Hold if the candidate's unanimous-on-key rate
  exceeds the pilot's (9 of 24 = 37.5%) by more than 15 points. The control is the pilot, measured by the same instrument.
  Its ceiling is 100%, so the bar (52.5%) is reachable, and its floor is 0%, so the comparison can go either way.
  **The 15-point bar is fixed now.**
- In either branch, model items are report-only. There is no per-item verdict and no interval. The three samples are one
  model sampled three times.

## Release (stage 5), fixed now

New method -> each area cohort's first spot is a **bridge** spot of 12 (Amendment 3: any method change is a new
method). Each is a clean 12-item spot -> `release-by-shape.mjs` releases the sampled items and every unsampled,
grader-cleared item of that cohort. A flag -> double sampling per Amendment 3; two flags -> that cohort goes to a full
sitting. Released rows stay invisible to students until the MAP flip (all four subjects at 5 forms).

## Verdict (per area)

- **PASS:** the spot clears, and the area's released total (pilot + batch 1) reaches >= 16 in every grade cell (17 at
  grade 5). `map-form-depth.ts` then shows >= 5 forms for science once wired.
- **PASS-SHORT:** the spot clears but one or more cells fall short. Batch 2 authors only the shortfall, at 1.4x the gap,
  under this brief.
- **FAIL:** the spot escalates to a full sitting and archives >= 2. The brief absorbs his notes before batch 2.

## Pre-registered predictions (recorded; none gates)

- **P1:** stage-0b batch refusals <= 10 items, most likely ABSDIS and name collisions inside an area.
- **P2:** stage-1 drops <= 15% (pilot 6/36 = 16.7%, before the B1 rules).
- **P3:** `no_source_needed` from both graders <= 5 of 156 data/investigation items (pilot 4 of 24, almost all B4 and B1).
- **P4:** zero `b1_option_set`, `b1_qualifier` or `b1_absolute` from both graders. The mechanical checks should leave only `b1_stated_law` and `b1_name_property` to judgment.
- **P5:** about 30 of 240 slots EMPTY, concentrated in grade-5 low-tier values slots under the READ rule and in variable slots under ROLE.
- **P6:** the options-only candidate arm stays at or below the live ACT Science control arm (pilot: 59.3% vs 58.3%).

## Changes to existing tools in this commit

- `sci-check.mjs`: B1 checks QUAL, ROLE, LABEL, NAMEPROP, ABS, LAW, ABSDIS. Default `--rules b1`. `--rules pilot` reproduces
  the pilot checker (the pilot suite still passes under it). Adds `--disable` (break-test only) and `--break-test`.
- `sci-spec.mjs`: QUALIFIER, RESULT_WORDS (calibrated on the pilot's variable options: 4 results matched, 8 settings not),
  NAME_PROPERTY, ABSOLUTE_B1.
- `stage-map-science-pilot.mjs`: pinned to `rules: 'pilot'`, so re-running it on the pilot items behaves as on 2026-10-27.
- `make-exclusions.mjs`: `--out`.
- No `src/` change. No new environment variable.

## Tool fingerprints at pre-registration (sha256, first 16)

- `map-v2-work/science-b1/slots.json` 7a6d826bbc0e6bc2
- `map-v2-work/science-b1/make-slots.mjs` 623a1d2ce976dc35
- `map-v2-work/science-b1/BRIEF-body.md` 56025ee6fa464667
- `map-v2-work/science-b1/BRIEF.md` 99e52f95765ae001
- `map-v2-work/science-b1/BRIEF-grader.md` 0f1c010b85abaef9
- `map-v2-work/science-b1/make-brief.mjs` 445aeaefa6938fad
- `map-v2-work/science-b1/GRADER-BRIEF.md` b9ee3b286fd7df2c
- `map-v2-work/science-b1/AUTHOR-PROMPT.md` a86b02bb762334a8
- `map-v2-work/science-b1/validate-b1-rules.mjs` 05912d6d92179e70
- `map-v2-work/science-pilot/sci-check.mjs` e6410fedc7b14375
- `map-v2-work/science-pilot/sci-check.fixtures.mjs` 19470c1c6062213e
- `map-v2-work/science-pilot/sci-spec.mjs` 786cfea2b06f2e35
- `map-v2-work/science-pilot/sci-packet.mjs` 976f7ff1c7066b3d
- `map-v2-work/science-pilot/make-exclusions.mjs` bfed567661818937
- `stage-map-science-b1.mjs` d67d6f62f598f8aa
- `stage-map-science-pilot.mjs` 29a2731877cda0aa

`science-b1/EXCLUSIONS-science.txt` is regenerated right before authoring, so it is not fingerprinted. A pilot-sitting amendment (start condition) re-fingerprints BRIEF-body/BRIEF/BRIEF-grader in the same commit.
