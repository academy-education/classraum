# Key extremity: measured across the whole population before anyone repairs it (2026-10-02)

Read-only. No model calls. No item was edited.
Reproduce with `node scripts/study-bank/key-extremity-breakdown.mjs` (self-tests first, then
refuses to print unless loaded == count(head) == distinct ids for each family).

**The question.** `check-key-extremity.mjs` reports that across live SAT Math the key is the
largest or smallest option 393/1242 = 31.6% of the time, against a 50% line. Before any repair
programme: is that one cohort (like the derivational hub) or the whole bank? How much does a
student actually gain from it? And did recent authoring fix it?

**Answer in one line.** It is **diffuse**. `v2` is the worst cohort, but every family and
almost every cohort sits below its chance line. Repairing all 792 scorable `v2` items would
remove only about a third of the SAT exploit. **Do not start a repair programme. Fix it in the
authoring brief as a batch-level gate.** Authors already knowing about it did not fix it: v17
and v18 were written after A56 and come in at 33.3%.

## Method

- **Population:** `family = X, section = math, verified, not archived`, paged `.order('id')`.
  The script checks the family on every row. (check-math-hub once scored 113 ACT rows as SAT.)
  Loaded SAT 1343, ACT 622, SSAT 257, ISEE 328, each equal to count(head) and to distinct ids.
- **Chance line, derived per item:** (options at the min or max value) / k. Distinct values give
  2/k: 50% for four choices, **40% for SSAT's five**. A tie at an extreme would raise the line.
  **There are 0 such ties in the live maths bank**, so the derived lines are exactly 50% and 40%.
- **Parser:** a small safe evaluator that reads radicals, π, fractions, mixed numbers, $, %,
  U+2212 and implicit multiplication. It parses 47 SAT items that the old checker skipped
  (8 of those 47 have an extreme key). If any option is an expression, a word or a unit, the
  item is **non-numeric**: it is counted and never scored.
  **Known-number check:** restricted to the old parser's items, it reproduces **393/1242**
  exactly. Self-test: 23 cases, including a break test where moving the key off the max must
  flip the result.
- **Exploit:** strike every option at the min or max, then guess uniformly among the rest. On a
  non-numeric item, guess among all k. The expected score over the item population is an
  **exact** figure, not an estimate. Two intervals are given, and they mean different things:
  - a Wilson 95% interval on the rate, which treats the bank as one draw from the authoring
    process;
  - the spread over a 44-item draw from the population (finite-population SD).

## 1–2. Rates by family

| family | scorable / live (non-numeric) | key at an extreme | chance | diff | z | Wilson 95% |
|---|---|---|---|---|---|---|
| SAT  | 1289 / 1343 (54) | 401 = **31.1%** | 50.0% | −18.9 | −13.6 | 28.6–33.7 |
| ACT  | 583 / 622 (39)   | 251 = **43.1%** | 50.0% | −6.9  | −3.4  | 39.1–47.1 |
| SSAT | 250 / 257 (7)    | 50 = **20.0%**  | 40.0% | −20.0 | −6.5  | 15.5–25.4 |
| ISEE | 313 / 328 (15)   | 131 = **41.9%** | 50.0% | −8.1  | −2.9  | 36.5–47.4 |

The key's rank by value (1 = smallest):

- SAT 206 / 452 / 436 / 195
- ACT 129 / 174 / 158 / 122
- ISEE 68 / 98 / 84 / 63
- SSAT 28 / 70 / 74 / 56 / 22

The shape is the same in every family: the extremes are under-used, and the largest value is
the key slightly less often than the smallest.

**Is it concentrated?** The heterogeneity test is a chi-square across groups, against one
common obs/exp ratio.

| cut | χ² / df | p | reading |
|---|---|---|---|
| SAT by cohort (33)           | 58.5 / 32 | 0.003 | driven by `v2` |
| SAT by cohort, **excluding v2** (32) | 39.7 / 31 | ~0.13 | **homogeneous at 37.4%** |
| SAT by domain                | 9.0 / 3   | 0.030 | Algebra 27.6, PSDA 28.5, Geo 30.7, Adv 36.8 |
| SAT by difficulty            | 3.5 / 2   | 0.17  | easy 20.3 (n=59), medium 31.3, hard 32.6 |
| ACT by cohort / domain / difficulty | 24.7/28, 6.4/5, 0.0/2 | 0.64, 0.27, 0.99 | diffuse; Number & Quantity lowest at 32.8% |
| SSAT by cohort               | 18.8 / 9  | 0.027 | 9 of 10 cohorts at 6–33%; only `ssat-math-s6` sits at chance (18/45) |
| ISEE by cohort               | 9.9 / 9   | 0.36  | diffuse; s3 lowest (7/30) |
| option count | — | — | SAT, ACT and ISEE are all k=4 and SSAT is all k=5; no mixed widths exist |

**SAT split by origin:**

| SAT arm | key at an extreme | share of the SAT deficit* |
|---|---|---|
| `v2` (792 scorable)       | 215 = **27.1%** | 181.0 of 243.5 = 74% |
| everything else (497)     | 186 = **37.4%** | 62.5 = 26% |

\* Deficit = expected extremes minus observed.

`v2` falls short in every domain: PSDA 23.6 vs 41.7, Algebra 21.9 vs 33.3, Adv 32.8 vs 40.5,
Geo 30.3 vs 33.3. But the non-`v2` cohorts are themselves 12.6 points under chance (z −5.6),
and they are uniformly so.

**This is not the hub pattern.** The hub was 98% in one cohort and at chance everywhere else.
Here every arm is below chance, and `v2` is simply the worst of them.

## 3. The exploit, exact over the item population

| family | strike both extremes | guess | gain per guessed item | per 44 guessed items (±1.96 SD of a draw) | gain if the rate is re-drawn (Wilson) |
|---|---|---|---|---|---|
| SAT  | 34.1% | 25.0% | **+9.07 pts** | +4.0 ± 2.9 questions | +7.8 to +10.2 |
| SSAT | 26.5% | 20.0% | **+6.49 pts** | +2.9 ± 1.6 | +4.7 to +7.9 |
| ISEE | 28.9% | 25.0% | **+3.89 pts** | +1.7 ± 2.9 | +1.2 to +6.4 |
| ACT  | 28.3% | 25.0% | **+3.26 pts** | +1.4 ± 3.0 | +1.4 to +5.1 |

Striking only one extreme is worth much less. Striking only the max gains SAT +3.16, SSAT
+2.72, ISEE +1.55, ACT +1.27. Striking only the min gains SAT +2.89, SSAT +2.14, ISEE +1.04,
ACT +0.90.

The gain applies only to items a student guesses on. A student who can solve an item gains
nothing there.

**The serve-time shuffle does not help.** It reorders letters. A student strikes the largest
number wherever it is printed.

**Counterfactual.** Suppose all of `v2` were brought to the non-`v2` rate of 37.4%. The SAT
gain would fall from +9.1 to about **+6.0**. A 792-item programme buys 3 points. The other 6
come from the house authoring style, which every newer cohort shares.

## 4. The real exam

The repo contains no professionally authored SAT, ACT, SSAT or ISEE Math items with keys.
`ets-reference-v1.json` holds TOEFL Essentials listening items, and the MAP/Herald PDFs are
harvested NWEA items that must never be used. So **the real-exam base rate is unknown.**

Professional exams also bracket the key with named error paths, so some of this pattern is
probably fidelity rather than defect. **50% is the chance line, not a proven target.**

What does not need an external reference is our own spread. Every arm of our own bank is below
the line, but these cohorts are at chance:

- `act-math-v1`: 62/125 = 49.6%
- `isee-math-s6` and `isee-math-s7`: about 49–50%
- `ssat-math-s6`: 18/45 = 40.0%

Those cohorts show the line is reachable by normal authoring, without contortions.

## 5. Repaired and new cohorts

| arm | before | after / now |
|---|---|---|
| Hub repair (117 `v2` items, `verify_meta.legacy_choices`) | 16/117 = **13.7%** | 32/117 = **27.4%**: improved, landing at the rest of `v2` (183/675 = 27.1%) |
| B8 sign-pair repair (88 items, `b8/snapshot-2026-09-28.json`) | 29/88 = 33.0% | 29/88 = 33.0%: **net zero**, 9 items moved from extreme to middle and 9 from middle to extreme |
| sat-math-v16 / v17 / v18 combined | — | 16/47 = 34.0% |
| **Authored on or after 2026-09-25** (A56 found; v17-adv, v17-alg, v18-adv, v18-alg) | — | 10/30 = **33.3%** (v18-adv 5/8, v18-alg 2/9, v17-adv 2/7, v17-alg 1/6) |

No ACT, SSAT or ISEE math has been authored since 2026-09-25.

**Recent authoring neither fixed nor worsened it.** The newer cohorts sit at the non-`v2` norm
of about 34–37%. `bank-sat-math/SKILL.md` already says "vary which direction an incomplete
answer points", and the v17 and v18 authors knew about A56. Advice alone has not moved the
number. Only a gate will.

## Recommendation (sized to what was found)

1. **No repair programme.** The pattern is diffuse: four families, 83 cohorts, every
   domain and difficulty. The worst cohort (`v2`, 792 items) accounts for only a third of the
   exploit. RANK-SKEW-DECISION.md's reason stands: rewriting distractors so that keys sit at
   the extremes puts every distractor on one side of the key. That would create a new cross-item
   tell in exchange for a tell we can measure. B8 also shows that an edit made for another
   reason moves extremity at random (9 items each way).
2. **Fix it at authoring as a BATCH gate, not a per-item rule.** Every new numeric maths batch
   runs `check-key-extremity.mjs`. Target: the key at an extreme on at least **40%** of scorable
   items for k=4, and **30%** for k=5. These sit about 10 points under the chance line, which
   leaves room for genuine bracketing. Hold a batch below the target unless the author names
   items where an extreme key would hand over a with-source free elimination (as B4 and B7 did
   on alg16). Put the gate in `bank-sat-math`, `bank-act-math` and the SSAT/ISEE briefs. **SSAT
   first**: it runs at half its chance line (20% vs 40%) in 9 of its 10 cohorts.
3. **The open question is the human one, not the bank one.** Is +9 points per guessed SAT item
   a real student advantage, or does the real SAT look the same? The cheap instrument is still
   the B6 suggestion from 2026-09-12: give one human reader the explicit "strike both extremes"
   instruction on a `v2` draw. Until that runs, or a licensed real-exam control exists, report
   this as "below chance, real-exam rate unknown", never as a defect rate.
4. **Checker notes.** Fixing these is not required for this finding.
   - `check-key-extremity.mjs` is SAT-only and k=4-only, pages without `.order()`, takes its
     chance line from the first set's width, and skips radical and π options.
   - None of these changes its SAT number materially (31.6% vs 31.1% here).
   - Use `key-extremity-breakdown.mjs` for any cross-family or cohort question.
