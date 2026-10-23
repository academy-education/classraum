# Wave 7 release routes, pre-registered (2026-10-23)

**Committed with the staged inserts, before any run is drawn.** Owner (2026-10-23): "Even though we don't have
students we want to always have at least 5 tests left." Under the floor at commission time: ISEE Reading 3 forms,
ACT Reading 4, ACT Science 3; SSAT Reading and TOEFL were short for individual students (runout-monitor).

Every batch below was written by Claude agents, pre-screened by two co-founder-standard graders (briefs A and B),
and every flag was fixed before staging. All rows are `verified=false` until released.

| cohort | items | pre-screen | route |
|---|---|---|---|
| isee-reading-draft-16 | 36 | A 0, B 0 | **full sitting** (every third: d12 full, d13/d14 spot) |
| act-reading-v12a | 36 | A 0, B 0 | **full sitting** (v10a full, v11a/b spot) |
| act-reading-v12b | 36 | A 1, B 1 (same item, fixed) | spot `arv12b-p1` (sha256 mod 4 = 0) |
| act-science-v9a | 40 | 0/0 on keys; knowledge-decidable items reworked, 13 re-graded clean | **full sitting** (v7a full, v8a/b spot) |
| act-science-v9b | 40 | A 1 broken, B 0; 4 reworked, re-graded, one ×1000 shortcut removed | spot `sc9b-p6` (sha256 mod 7 = 5) |
| ssat-reading-draft-17 | 36 | A 1, B 1 (same item, fixed) | spot `draft17-D17-P03` (sha256 mod 6 = 2) |
| ssat-reading-draft-18 | 36 | A 0, B 0 | spot `draft18-D18-P04` (sha256 mod 6 = 3) |
| toefl-passage-draft-7 | 60 | A 0, B 0; one factual fix (Armero toll) | spot, 2 passages (as drafts 1-6) |
| toefl-talk-draft-7 | 48 | 0/0 per item, but a cross-lecture template; one rework round, re-graded 48/48 per item, batch pattern remains | **full sitting**, 4 runs of 3 lectures |

## Rule (unchanged option-2 route)
- Spot all "Only defensible": the cohort is released.
- Anything flagged: that passage is archived and the rest of the cohort goes to a full sitting.
- A full sitting releases every item marked "Only defensible" and archives the rest.

## Recorded
- ACT Science graders were asked a new question this wave: can background knowledge or a textbook formula alone
  decide the item? It found a whole passage (floating cylinders: depth = mass / (density × area)) answerable
  without the table, and a numeric item whose factor was exactly 1000, so the key was a table cell. Neither was
  visible to a key-correctness check. Ask it on every ACT Science pre-screen.
- ISEE draft 15 is held back: three of its passages duplicated d16 and d18, which were written at the same time.
- TOEFL talk d7 is routed to a full sitting rather than a spot because both graders, before and after the rework,
  named a batch-level template: the view-item key is the moderate partial-revision verdict, and absolute words
  appear only in distractors. Per item it is clean. Next talk brief: some lectures end with the challenge winning
  outright, some view keys are the strong or absolute option, and some distractors are moderate.
