# ACT Science agent release — result (2026-10-27)

Prereg: `ACT-SCIENCE-AGENT-RELEASE.prereg.md` (committed a4f15a27 before any grader ran).
Per-batch records: `act-science-regrade/results/b1..b6/` (grader keyed files, `<cohort>.cleared.json`, `<cohort>.dropped.json`).

## Counts (denominators stated)

| | n |
|---|---|
| cohorts | 12 (act-science-v5a .. v9b) |
| items graded | 480 (6 batches x 80), each by 2 fresh with-source graders = 960 grades |
| re-check grader items (r1) | 33 across b1-b6 |
| keys a grader disputed | 0 of 480 (every cold pick = key, both graders) |
| second-defensible flags | 0 |
| **items cleared** | **36 of 480 (7.5%)** |
| **passages cleared** | **7 of 84** |
| new full forms | **0** |

Cleared passages: v5c P1, P2; v6b P1, P3; v7b P2; v8b P1, P2 — six 5-item data-representation passages and one 6-item passage. A form needs 2 DR + 3 RS + 2 CV, so no form can be built from them.

## Why it dropped (first rule that took each item; a drop takes the whole passage)

| rule | items |
|---|---|
| R4 no_source_needed, both graders | 84 |
| R4b no_source_needed, one grader + re-check | 31 |
| R5 recognised real data (coordinator-confirmed) | 25 |
| R6 free elimination of 2+ distractors, both graders | 14 |
| R3 fact error (coordinator-confirmed) | 10 |
| R8 cross-item pattern (named by both, applied blind) | 1 |

The rest are `passage_incomplete` siblings: not defective, unservable because their passage lost an item.

## What failed, in plain terms

1. **Design and purpose items answerable from the options.** "Which experiment best tests X" and "why was this step done" — the key is the only option that varies X or names a control. Real ACT has this shape too; under this prereg it is a drop, and the rule is not re-decided after the fact.
2. **Textbook-exact tables.** Pendulum (2*pi*sqrt(L/g)), Snell refraction with handbook indices, wire resistivity, thermal expansion, ideal gas, mass-spring, Mersenne strings, cloud base = 125 m x (T - dew point), freezing-point depression. A student who knows the law answers without the table.
3. **CV items whose key restates the new finding.** Named by both graders in b1 (5 items) and as a both-agree "camp-neutral" key in b2/b5.
4. **Two physically impossible passages.** v9a P5: four cylinders of one solid plastic, same 200 cm^3, masses 75-300 g. v6b P7: perihelion 2 AU / aphelion 6 AU gives an 8.0-year Kepler period; the passage says 7.4.

## Coordinator decisions recorded

- R3 confirmed: v9a P5 (all six), v6b P7 (all six), each recomputed.
- R5 confirmed where the whole table is reproduced by a stated law or handbook values; rejected for v5d P5-Q4 (caffeine/ethanol is general knowledge, not a dataset), v5d P6-Q1 (Triton-like moon, invented numbers), v7b P4-Q6 and v8b P5-Q2 (coil-spring 1/D^3 and Beverloo flow are beyond the level tested).
- R8: b1 and b2 graders named the same rule; each rule was applied to all 80 items from the cold packet by a fresh agent before the key was opened (`scratchpad/act-science-regrade/_r8/`), 5 of 5 picks = key in both. b3 and b5 graders named different rules: recorded, nothing dropped.

## Next

- The 36 cleared items are not released: per the prereg wiring they still need `science-release.json` and one blind-only co-founder run per cohort, for 7 passages that add no form. Low priority.
- Archiving the 444 dropped/incomplete rows is an owner-approved DB write; not done.
- New ACT Science authoring must design against the four failure classes above (brief to follow).
