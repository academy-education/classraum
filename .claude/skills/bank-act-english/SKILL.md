---
name: bank-act-english
description: Author and land an ACT English form (5 passages x 10 items, enhanced ACT) through act-bank-helper's structural refusal, the split blind attack, a key grade and insert. Use to add English forms; the human sitting decided the method is sound.
---

# ACT English (enhanced ACT: 50 questions / 35 minutes, four choices)

Shape and checker: `scripts/study-bank/act-bank-helper.mjs` (refuses the
WHOLE batch on any structural failure; self-test
`act-bank-helper.selftest.mjs`, 27 fixtures). Blueprint:
`src/lib/study/act-test.ts`. Evidence: `ACT-ATTACK-RESULT.md` (English PoW
76% blind for the model, 10% for a person - B7).

## 1. Author (one agent per form)

Batch shape: `act-english-v1a.batch.json`. Five original essays of 300-380
words, five genres, passage text identical byte-for-byte across a passage's
10 items, ids `ACT-EN<n>-P<k>-Q<nn>`.

Rules the checker enforces:
- exactly 10 items per passage; "No Change" is `choices[0]` when present
- every stem LOCATES its span: a quoted span, `paragraph N`, `Point [A-D]`, or "the essay as a whole" ("Which transition is most logical?" alone is refused)
- domain spelled as the quotas spell it: Production of Writing 29-32%, Knowledge of Language 13-19%, Conventions of Standard English 51-56%
- explanations never name an option position

Rules the checker cannot enforce (put them in the brief and ask a grader):
- do not make the key the hedged/specific/cross-referencing option among flat absolutes, and do not make it the plain short neutral one among over-committed fillers - both were measured tells; vary the key's shape
- Conventions items use the SAT edit-in-place convention (blank the span, quote it), not underlining

```bash
cd /Users/andylee/Downloads/saas/classraum
node scripts/study-bank/act-bank-helper.mjs check english <batch.json>
```

## 2. Gate

- `SPLIT=5 make-attack.mjs` (one item per passage per file), a solver per file, `score-attack.mjs`. Read the number as a screen: the shipped forms measured 76% and a person scored 10%.
- With-source key grader on the full batch (passage + options, key unmarked): 100% agreement expected; disagreements are dropped.
- Ledger entry (family `mc_hidden_source`).

## 3. Insert and verify

```bash
node scripts/study-bank/act-bank-helper.mjs insert english <batch.json> act-english-v<n> --apply
set -a; source .env.local; set +a
npx tsx scripts/study-bank/verify-act-draw.ts      # must draw 50/45/36/40
```

`update english <batch> <cohort> --apply` rewrites prompt/choices/key by
localId and refuses passage changes - the batch file stays the source of
truth after a repair.

## 4. Record

`REGISTER.md` §5 (A21). If a new brief is used, the next human sitting
should sample the new cohort (`DRAW_FAMILY=act DRAW_COHORT=...`).
