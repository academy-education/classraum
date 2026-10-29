# Agent review SSAT/MAP: pre-release audit draw (2026-10-29)

Owner: "Let's have Daniel check a couple questions before releasing." Nothing from the agent review is released until
this run is drawn, sat, closed, its notes classified, and `agent-review-release.mjs` decides it.

## When

Daniel has `actsciencev6b-full1-blindonly-cofounder-2026-10-28` open and only one run may be open. Draw this run the
moment v6b closes, before anything in the queue. `cofounder-queue.json` carries it as `nextManualDraw`; while that
field is there `draw-next.mjs` prints this command and draws nothing else. Remove the field once the run is drawn.

## The command (from the repo root)

    DRAW_IDS_FILE=scripts/study-bank/agent-review/audit-sample.ids.json DRAW_COHORT='ssat-reading-draft-10:2,ssat-reading-draft-11:2,ssat-reading-draft-14:2,ssat-reading-draft-8:2,ssat-reading-draft-9:2,map-language-v2-mechanics:2,map-language-v2-writing:2,map-lu-v3-punctuation:1,map-lu-v6-spelling:2,map-reading-draft-1:1,map-reading-v2-c4:1,map-vocab-v3:1,ssat-verbal-draft-2:1,ssat-verbal-draft-3:1,ssat-verbal-draft-4:1,ssat-verbal-draft-5:1' node scripts/study-bank/draw-review-run.mjs '*' 24 6ca6edaf-4044-4eed-84e0-137ebd79a81d agentreview-audit-cofounder-2026-10-29

`draw-review-run.mjs` refuses while any run is open (checked 2026-10-29: it refuses on v6b). `DRAW_IDS_FILE` limits
every cohort's pool to the pre-chosen ids, and each cohort's count equals its number of ids, so the draw is fully
determined. A dry run under a dummy reviewer showed exactly 1-2 reviewable items per cohort and 24 rows; without the
file the same cohorts showed 6-159 reviewable (break test).

## The sample: 24 items, 16 cohorts, seeded ("agentreview-audit-2026-10-29")

Picked by `agent-review-audit-sample.mjs --write` from the A1 cleared lists (`results/`), only items Daniel has never been
served. Ids are in `audit-sample.ids.json`, and the plan is in `audit-sample.json`.

| order | cohort | items | of cleared | passage |
|---|---|---|---|---|
| 1 | ssat-reading-draft-10 | 2 | 36 | draft10-D10-P05 |
| 2 | ssat-reading-draft-11 | 2 | 36 | draft11-D11-P03 |
| 3 | ssat-reading-draft-14 | 2 | 36 | draft14-D14-P06 |
| 4 | ssat-reading-draft-8 | 2 | 30 | draft8-D8-P04 |
| 5 | ssat-reading-draft-9 | 2 | 6 | draft9-D9-P03 |
| 6 | map-language-v2-mechanics | 2 | 40 |  |
| 7 | map-language-v2-writing | 2 | 76 |  |
| 8 | map-lu-v3-punctuation | 1 | 10 |  |
| 9 | map-lu-v6-spelling | 2 | 26 |  |
| 10 | map-reading-draft-1 | 1 | 20 | map-draft1-M1-P11 |
| 11 | map-reading-v2-c4 | 1 | 18 | mapv2-MRV2-R7-P06 |
| 12 | map-vocab-v3 | 1 | 35 |  |
| 13 | ssat-verbal-draft-2 | 1 | 105 |  |
| 14 | ssat-verbal-draft-3 | 1 | 120 |  |
| 15 | ssat-verbal-draft-4 | 1 | 104 |  |
| 16 | ssat-verbal-draft-5 | 1 | 128 |  |

Deviation from "2-3 per cohort": 16 cohorts cleared, and the cap is 24. So SSAT Reading and MAP Language get 2 each
(map-lu-v3-punctuation 1, because it cleared only 10), and every other cohort gets 1. "Whole passages" is met as one
passage per passage cohort: both SSAT Reading items come from the same passage, so Daniel reads the passage once.
Serving all 6 items of a passage would take 30 items for SSAT Reading alone.

## After it closes

1. Classify the run's notes into `cofounder-notes.json` (the usual ledger step). The release script refuses on any
   unclassified note.
2. Dry run:

       node scripts/study-bank/agent-review-release.mjs agentreview-audit-cofounder-2026-10-29

3. A cohort releases its cleared items only if every sampled item is `unique` with no would_block note. Any miss
   holds that cohort's cleared items, and they are listed. `--apply` writes only after the owner's go.
