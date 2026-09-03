---
name: bank-act-math
description: Author and land ACT Math items (enhanced ACT: 45 questions, FOUR choices) through the SAT math sandbox with BANK_FAMILY=act. Use to add Math forms; keys are recomputed, so this is the one ACT section the model attack does not apply to.
---

# ACT Math (45 questions / 50 minutes, four choices since Sept 2025)

Uses the SAT math pipeline (`/bank-sat-math`) with the family switched:
`math-bank-helper.mjs` with `BANK_FAMILY=act`. Blueprint quotas (Preparing
for Higher Math: Number & Quantity, Algebra, Functions, Geometry,
Statistics & Probability; Integrating Essential Skills; Modeling) are in
`src/lib/study/act-test.ts` `MATH_QUOTAS`.

## 1. Author

Batch shape: `act-math-v1a.batch.json`. FOUR choices, not five (the legacy
ACT had five; the repo's old generation prompt was corrected). Domains
spelled as the quotas spell them. Same figure rules as SAT math; same
derivational-hub rule.

## 2. QC and insert

`verify` prints a **symbolic hub** line as well as the sandbox result: the
sandbox proves the key is right, the hub line says whether it is guessable
from the options alone. Above a 10-point margin, fix the items rather than
inserting.

```bash
cd /Users/andylee/Downloads/saas/classraum
BANK_FAMILY=act node scripts/study-bank/math-bank-helper.mjs verify <batch.json>
BANK_FAMILY=act BANK_COHORT=act-math-v<n> node scripts/study-bank/math-bank-helper.mjs insert <batch.json> <qc.json>
set -a; source .env.local; set +a
npx tsx scripts/study-bank/verify-act-draw.ts
```

The bank-wide dedup constraint will refuse an item identical to one in
another family (it did once); that is correct, not a bug.

## 3. Record

`REGISTER.md` §5 (A21).
