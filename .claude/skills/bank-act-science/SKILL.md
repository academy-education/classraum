---
name: bank-act-science
description: Author and land an ACT Science form (7 passages in the 25MC5 shape, per-item graphics) through act-bank-helper's science branch, the split blind attack, a data-checking key grade and insert. Science is hidden on the topic page until a human sitting clears it.
---

# ACT Science (optional section: 40 questions / 40 minutes)

Shape and checker: `act-bank-helper.mjs check science`. Draw:
`assembleActSection('science')` takes 7 passages in ACT's 25MC5 sequence
DR, CV, RS, RS, CV, RS, DR sized 5/6/6/6/6/6/5. Blueprint and the recorded
contradiction between ACT's published shares and its shipped form:
`src/lib/study/act-test.ts`. Evidence: `ACT-ATTACK-RESULT.md` "Science v1".

## 1. Author (one agent per format works best)

Batch shape: `act-science-v1.batch.json`. Per item: `format`
(data_representation 5 items / research_summaries 6 / conflicting_viewpoints
6), `graphic` IDENTICAL on every item of a DR/RS passage (the runner shows it
under each question), optional on CV. Graphic shapes the runner renders:

```json
{"type":"table","rowLabels":[],"colLabels":[],"cells":[[]],"caption":"Table 1. ..."}
{"type":"bar","xLabel":"","yLabel":"","bars":[{"label":"","value":0}],"caption":""}
{"type":"svg","svg":"<svg viewBox=\"0 0 350 250\" width=\"320\" role=\"img\" aria-label=\"...\">...</svg>","caption":""}
```

Checker rules: format per passage, sizes per format, identical graphic on
DR/RS passages, CV passage has labelled viewpoints (Scientist 1 / 2 ...),
no line numbers, graphic type one the runner renders, svg starts with
`<svg`, domains: Interpretation of Data / Scientific Investigation /
Evaluation of Models, Inferences, and Experimental Results.

Brief rules from the v1 attack (71% blind, 37/38 confident): every DR/RS
item must NEED the figure (cover it and check); do not let two options
share a number that reconstructs the data; do not make one option the only
one that "performs the comparison"; design-rationale items must depend on a
passage detail, not on the stem's own logic; aim harder than v1 (graders
read v1 as easy 49 / medium 28 / hard 3).

## 2. Gate

- `SPLIT=6 make-attack.mjs` (one item per passage per file), six solvers.
- Two with-source graders who DECODE the graphics (read SVG coordinates, table cells) and check every number the key relies on; flag `no_source_needed`.
- Ledger entry; status `qc` until the sitting.

## 3. Insert (hidden) and verify

```bash
node scripts/study-bank/act-bank-helper.mjs insert science <batch.json> act-science-v<n> --apply
npx tsx scripts/study-bank/verify-act-draw.ts     # act/science must draw 40 of 40
```

`act-science` and `act-writing` are in `HIDDEN_SUBTOPIC_SLUGS` in
`src/app/mobile/study/topic/[slug]/page.tsx`. Unhide Science only after the
co-founder's sitting clears the fixed rule (draw with `DRAW_FAMILY=act
DRAW_COHORT=act-science-v<n>`, 7/6/7 across the three categories).

## 4. Record

`REGISTER.md` §5 (A21) and the ledger entry's stages.
