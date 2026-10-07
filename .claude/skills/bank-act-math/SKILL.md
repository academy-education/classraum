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

Every distractor needs a `distractor_solve` entry — a map from the exact
option string to a JS body producing it. `verify` recomputes them. This
exists because an ACT Functions item shipped 31484 where its own stated
derivation gives 31482, invisible to the sandbox, to both hub checks and
to the explanation alike. Round inside the body if the option is rounded.

- **Key at an extreme: about as often as chance — now a refusing gate (2026-10-02).** Across live maths the key is the largest or smallest option far less often than chance (SAT 31% vs 50%, SSAT 20% vs 40%); "strike the max and the min" is worth ~9 points per guessed SAT item, and authors who already knew still wrote 33%. The inserters now REFUSE a batch whose key-at-extreme rate is under 0.8 x the derived chance line (2/k: >=40% for four choices, >=32% for five), over >=10 numeric items (`node scripts/study-bank/key-extremity-gate.mjs <batch.json>`; `verify` prints it too). Aim for chance, not the bar: make the key the largest or smallest value roughly 2 in k times, by letting the named error path sometimes undershoot (dropped factor, wrong sign, half instead of double) rather than always overshoot. Do NOT overcorrect into the opposite tell — keys at an extreme far above chance, or every distractor on one side of the key, are just as strikeable. The gate is per batch on purpose; never move distractors to satisfy it after review (that repair is fitting to the instrument) — re-author. Override only with `BANK_GATE_OVERRIDE="<reason>"`.

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

### Duplicate checks — BOTH, before insert (standing step since 2026-10-08)

```bash
# 1. stem similarity (Jaccard over words + identical option sets)
node scripts/study-bank/act-math-v16-dupscan.mjs <N> <batch.json>
# 2. mechanism keywords (same mechanism in different words)
node scripts/study-bank/math-mechanism-dup.mjs <N> <batch.json>
```

Both read ALL live maths rows in every family, paged, and refuse (exit 2) if
the count does not match. The Jaccard scan cannot see a reworded mechanism:
v20 shipped three to the graders that it missed — fit-a-quadratic-through-
three-values (AM20A-05 ~ act e8f17f52), the same two lines with a different
third side (AM20G-03 ~ isee da512959), head-start-then-closing-speed
(AM20I-03 ~ sat 7c27e30c). `math-mechanism-dup.mjs` tags each item with
mechanism terms (lexicon over prompt + subskill + explanation), structural
signatures (three function values given, two or more lines, two movers with
a staggered start, a transformed f), rare shared equations, shared numbers,
and any author-declared `mechanism: [..]` keywords, IDF-weighted over the
live bank, and prints the top 5 per candidate. **FLAG** = score >= 16 with
shared structure, or >= 24 on topic tags alone; **every FLAG is read by
hand** (same mechanism -> drop, rule 5); `near` lines are a reading list.
Exit 1 means flags exist, not that the batch fails. Ask authors to declare
`mechanism` (3-5 short phrases a reader would grep for) and strip it before
the grade render with the other author fields. Run a live cohort as a
control with `--exclude-cohort <cohort>`; `--pair CAND:liveIdPrefix` prints
one pair's score and rank; `MMD_ABLATE=sig|lit|lex|num|decl` switches a
channel off for break-tests. The thresholds were set on v20 — a pair it
scores quiet is NOT cleared; the hand read still decides.

## 3. Record

`REGISTER.md` §5 (A21).
