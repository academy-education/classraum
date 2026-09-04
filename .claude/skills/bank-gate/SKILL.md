---
name: bank-gate
description: The shared quality gate every question batch passes before it reaches students - structural pre-flight, no-source blind attack, with-source key grade, QC ledger entry, insert, human sitting. Invoke from the per-test bank-* skills; never insert around it.
---

# Bank gate (shared by every bank-* skill)

The bank's thesis, proven eight times over: **a cheap check can only catch
the tell it was built for; the blind attack is the screen; a human sitting
is the verdict on verbal cohorts.** Read `scripts/study-bank/REGISTER.md`
§0 and §6 and CLAUDE.md "Verification standard" before running this.

## 0. Inputs

- `BATCH` - one or more authored `*.batch.json` files in `scripts/study-bank/`
- `TASK` - the family/section (sat rw, sat math, toefl listening task, act
  english/reading/science/math)
- The per-test skill tells you which structural checker and inserter apply.

## 1. Structural pre-flight (free, never sufficient)

Run the test's own checker (per-test skill). Then, for any batch:

```bash
cd /Users/andylee/Downloads/saas/classraum
node scripts/study-bank/make-attack.mjs <tag> <batch.json...>        # prints key-slot spread
```

Refuse the batch yourself if: key slots are lopsided (> 35% in one slot on
n >= 20), the key is uniquely longest or shortest in more than a quarter of
items, two items share a stem template, or an option begins with punctuation
after a spaced blank (renders as "cores , which"). These are the tells that
already happened; the checker will not see the next one.

## 2. No-source blind attack (the screen)

Keys are dealt flat so a constant-letter solver scores exactly 25%.
Passage cohorts MUST be split so no two items share a passage per file,
and each file gets a DIFFERENT solver - interleaving lets sibling items
answer each other (ACT English read 90% interleaved, 76% split).

```bash
# single-item tasks (SAT R&W, Choose a Response)
node scripts/study-bank/make-attack.mjs <tag> <batch.json...>
# passage/transcript cohorts: one item per passage per file
SPLIT=6 node scripts/study-bank/make-attack.mjs <tag> <batch.json>   # writes <tag>-f1..f6
```

Launch one blind-solver agent per file. The prompt must: name ONLY the
blind file, forbid opening anything else (a 2026-09-04 control run omitted
this; the transcripts had to be grepped afterwards to prove no solver had
opened the adjacent .key.json), ask for a pick + basis
("confident"/"guess") per item, and ask for the heuristics used and how
many picks each decided. Solver files: `<tag>.solver-a.json` (or
`<tag>-fN.solver-a.json`), shape `{"1":{"pick":"A","basis":"guess"}}`.

```bash
node scripts/study-bank/score-attack.mjs <tag>            # or per split file
```

Read the number against the family bar in `scripts/study-bank/ledger.json`
`baselines` and the shipped precedents:

| task | bar | precedent |
|---|---|---|
| choose_response | margin <= +25.5 (+4 tolerance) | cr-v7 shipped at +1.4; cr-v10 at +9.2 |
| daily_life / announcement (TOEFL MC) | at or below control | dl-fresh -1.4; announcement-v4 HELD at +58 |
| sat_rw | <= published +36.2 | |
| sat_math (options-only) | at or below the LIVE bank, which measures 30.6% | alg-hard-v1 banked at 18.1%; adv-hard-v1 and v2 held at 51.4% and 45.8% |
| act_math (options-only) | at or below the LIVE bank, which measures 29.2% | v2c inserted at 34.4%; v2a and v2b held at 43.3% and 40.6% |
| sat_rw Craft and Structure | at or below the LIVE bank, which measures **100.0%** | the shipped bank is fully model-solvable blind; cs-hard-v1 is 27.8 points BETTER at 72.2% |
| sat_rw Information and Ideas | at or below the LIVE bank, which measures **94.4%** | ii-hard-v1 at 93.0% is marginally better than shipped |
| sat_sec (grammar) | at or below the LIVE bank, which measures **72.2%** | NOT the 25% control - options-solvability is intrinsic to this skill. v3 passed at 68.1%, i.e. 4.1 points better than shipped |

**Before reading any margin, ask whether 25% is the right control.** For
`mc_stem_source` and grammar tasks it is not: judging the option set IS the
skill, so the floor is set by the item type. Draw a matched sample of LIVE
verified items, render it through the SAME script, and give the solvers the
SAME briefs. Two traps found doing this on 2026-09-04: some live items keep
the sentence in `item.prompt` rather than `passage`, so the control render
leaks stems the candidate withholds (compare question-field LENGTHS to
detect it - a regex for the instruction text does not); and a control drawn
with a buggy filter came back mixed-domain (print the domain histogram).
| ACT English/Reading/Science | model number is a SCREEN only | model 71-79%, human 10% |

Read the solvers' heuristic reports. If every solver names the same
heuristic, that is the tell - record it in the result file whether or not
the number passed.

## 3. With-source key grade

One or two grader agents see the source (passage/transcript/graphic) and
the four options with the key UNMARKED, and return pick, second_defensible,
difficulty, and for science `no_source_needed`. Score against
`<tag>.key.json` with `score-attack.mjs <tag> grader-a`. Any item where the
grader disagrees with the key, or names a second acceptable answer, is
dropped or repaired - and a REPAIRED item re-enters step 2 fresh (a repair
moves the defect as often as it removes it; after one failed repair, drop).

## 4. Ledger entry, then insert

The inserters refuse a batch with no ledger entry. Add to
`scripts/study-bank/ledger.json` `batches[]`:

```json
{ "id": "<cohort>-<date>", "targetTest": "...", "section": "...", "task": "...",
  "family": "mc_hidden_source|mc_stem_source|cloze|production",
  "contentSha": "<sha256 of the batch file bytes; for several files, sha256 of the files concatenated in the order passed>",
  "status": "qc|shipped|killed", "cohort": "<cohort>",
  "stages": { "shape": {"passed":true,"verdict":"..."}, "withsource": {...}, "nosource": {...,"n":..,"mean":..,"control":..,"margin":..}, "elimination": {...}, "tells": {...} } }
```

`gate-contract.json` says which stages each family needs. A stage without
`passed: true` blocks. Editing one byte of the batch after the entry makes
it STALE - retake the sha.

Insert with the per-test inserter, `BANK_COHORT=<cohort>` set. Then verify
the write with the test's live-draw verifier (per-test skill) - the
post-write check has crashed on a correct write before; run the draw.

## 5. Human sitting (verdict for verbal cohorts)

```bash
DRAW_FAMILY=<family> DRAW_COHORT=<cohort> node scripts/study-bank/draw-review-run.mjs "<Domain>:n,<Domain>:n" <total> <reviewerId> <runId>
```

One open run per reviewer. Fix the decision rule BEFORE the number exists:
at or below ~40% blind = clean; at or above ~60% = archive the cohort;
between = second reader. Score with `study_item_reviews` (`blind_pick ===
key_slot`, both in the displayed frame; verify the frame on a few rows).
Directions template: `scripts/study-bank/SITTING-DIRECTIONS-2026-09-03.md`.

## 6. Record

Same commit as the insert: a `§5` line in `REGISTER.md` with the numbers,
the solvers' heuristic in their words, and anything the checkers got wrong
about themselves. A finding only in a commit message is a finding nobody
reads.

## Do not

- Insert with `BANK_GATE_OVERRIDE` unless the exception is written in the ledger note.
- Change blueprint question counts to fit a thin bank. Ever.
- Author a third brief after two rewrites produced their own tells. Change the METHOD (cr-v7: four symmetric worlds, seeded key) or stop.
- Trust a green check whose input could be truncated (PostgREST returns 1000 rows; page).
