# ACT Reading v9 (2 sections, 72) and ACT Science v6 (2 sections, 80): release route, pre-registered (2026-10-23)

**Committed with the staged inserts, before any run is drawn.**

Written by four Claude agents to the v8 and v5 briefs. Topics were checked against all live and staged ACT
passages: 180 reading, 63 science. `act-bank-helper` structure is OK on all four. Owner (2026-10-23): "Keep using
max agents."

**Co-founder-standard grader, briefs A and B:**
- **act-reading-v9b:** 0/36.
- **act-reading-v9a:** 1/36 (A only). ARV9a-26 had a second defensible distractor, "Tolley was the first painter
  on the wall to use the broken-stroke technique", because both passages lean toward it. It was replaced with
  "Tolley's name should be painted onto the panels she is believed to have made", which neither passage proposes,
  and its explanation line was updated.
- **act-science-v6a:** 0/40. The arithmetic was re-checked by both graders.
- **act-science-v6b:** 1/40 (A, "broken"). ASV6b-P5-Q5 asked "Which experiment(s) support this hypothesis?", but
  Experiment 3 also supports it, so the key "Experiment 2 only" was literally false. The stem now reads "Which of
  Experiments 1 and 2 support this hypothesis?"; the key and data are unchanged.

Staged with `BANK_VERIFIED=false` and `BANK_GATE_OVERRIDE` recorded. On ACT, the options-only attack measures model
knowledge, so the human sitting decides (CLAUDE.md, 2026-09-21).

## Release route (option-2, Amendment 1)
Each section gets one seeded passage spot (sha256 of the cohort name, mod the passage count):
- act-reading-v9a: `arv9a-p4`
- act-reading-v9b: `arv9b-p2`
- act-science-v6a: `sc6a-p6`
- act-science-v6b: `sc6b-p1`

All "Only defensible" releases the section. Any flag archives that passage and sends the rest to a full sitting.
The every-third full sitting falls on the next ACT batch of each family. Recorded on the way: an older, unrelated
`act-science-v6.batch.json` (0 rows live) shares the "v6" name. The new cohorts are `act-science-v6a` and `-v6b`.
