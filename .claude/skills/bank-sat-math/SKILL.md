---
name: bank-sat-math
description: Author and land Digital SAT Math items (Algebra, Advanced Math, Problem-Solving and Data Analysis, Geometry and Trigonometry) through the sandbox key check and math-bank-helper. Use when a math domain or difficulty band is short, or for figure items.
---

# SAT Math

Pipeline detail: `scripts/study-bank/RUNBOOK.md` §"Math pipeline". Gate:
`/bank-gate` (math is `mc_stem_source`: no elimination stage; the stem IS
the source, so the no-source attack does not apply except to FIGURE items).

## 1. What is short

Live counts by domain x difficulty (paged). Module-2 hard route wants about
8 Algebra / 8 Advanced / 3 PSDA / 3 Geo hard per form. PSDA hard was the
cap until 2026-09-03 (+32 inserted, now 45).

## 2. Author

Batch shape: `scripts/study-bank/sat-psda-hard-v1.batch.json`. Fields as
R&W plus `graphic` (optional) in the shapes the runner renders:
`{"type":"table"|"twowaytable","rowLabels","colLabels","cells"}`,
`{"type":"bar","bars":[{"label","value"}],"xLabel","yLabel"}`,
`{"type":"scatter"|"line","series"/"points"}`, `{"type":"svg","svg":"<svg viewBox=\"0 0 350 250\" ...>"}`.

Brief essentials:
- Numeric answers must be exactly computable; the sandbox recomputes them.
- Distractors bracket the key with named errors (sign slip, wrong formula, unit) - the bank is middle-heavy by design, which is why choices are shuffled at draw.
- Figure items must NEED the figure. The figure-blind attack found 80.6% of maths figures decorative (`FIGURE-BLIND-RESULT.md`); cover the graphic and try the item.
- Do not repeat the derivational hub: options must not be a chain of `a, 2a, a+1, a-1`, nor a set of expressions where the key is the unique one every distractor is one token-edit from. Derive each distractor from a DIFFERENT wrong path; two distractors being one edit from each other is fine.

- Vary which direction an incomplete answer points. The "forgot the last step" distractor is naturally LARGER than the key, and doing that every time made the key the largest option in 11% of a batch against a 25% control. Measured bank-wide at 17/33/32/17 by value rank — the key avoids both extremes everywhere. Unlike a letter tell this one SURVIVES the draw shuffle, because a student eliminates the largest number wherever it sits. Check with `check-key-magnitude.mjs`.

**The two hub checkers take different inputs and are not interchangeable:**

| | reads | argument |
|---|---|---|
| `check-symbolic-hub.mjs` | a batch file, or `--bank` | batch paths |
| `check-math-hub.mjs` | a batch file, or the live bank | batch paths, or a DOMAIN name |

Both take batch paths now. `check-math-hub.mjs` gained a batch mode on
2026-09-04; before that a batch path matched zero live rows and printed
`0 items ... margin -25.0pts`, which reads like a pass. It refuses to
report a rate over an empty population rather than printing a
reassuring number. `verify` runs BOTH for you — symbolic and numeric —
because the symbolic one returns null on all-numeric sets and a purely
numeric batch would otherwise go through unchecked.

## 3. QC: sandbox key check

```bash
cd /Users/andylee/Downloads/saas/classraum
node scripts/study-bank/math-bank-helper.mjs verify <batch.json>      # recomputes every key in a sandbox; refuses mismatches
```

`verify` also prints a **symbolic hub** line, because the sandbox proves the
key is RIGHT and says nothing about whether it is GUESSABLE. A held batch
(`sat-adv-hard-v1`) prints `Sandbox: 24/24` directly above `margin 23.9pts`
— all keys correct, and three solvers shown only the options scored 51.4%.
**Above 10 points, fix the items; do not insert on that number.** The
mechanism is that the key is the unique option every distractor is one
token-edit from; derive distractors from different wrong paths instead.
`check-math-hub.mjs` pulls one NUMBER per option and is blind to this, so
run `check-symbolic-hub.mjs` for expression options.

Mutation-test the sandbox on any new item type: change one key by hand and
confirm the check fails. A grader that cannot fail is not a grader.

## 4. Insert and verify

```bash
BANK_COHORT=math-v<N>-<domain> node scripts/study-bank/math-bank-helper.mjs insert <batch.json> <qc.json>
set -a; source .env.local; set +a
npx tsx scripts/study-bank/verify-sat-hard-route.ts math
```

`BANK_FAMILY=act` switches the same helper to ACT Math (four choices).

## 5. Record

`REGISTER.md` §5: counts by difficulty, sandbox refusals and why, any new
figure type and whether the runner renders it.
