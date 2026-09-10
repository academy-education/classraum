# Math options-only attack — pre-registration, 2026-09-12

Written BEFORE any solver has run. Nothing below may be edited once a score
exists; a rule chosen after seeing the data is not a rule.

## What is being attacked

Three candidate batches, **QC survivors only** (the drops are not being
inserted, so attacking them would measure items nobody will ship):

| tag | batch | n |
|---|---|---|
| `att-act-alg` | act-math-v2-alg survivors | 16 |
| `att-act-fn`  | act-math-v2-fn survivors  | 19 |
| `att-sat-alg` | sat-alg-hard-v4 survivors | 19 |

Each has a MATCHED LIVE CONTROL drawn from the shipped bank — same family,
same domain, same 4-option all-numeric shape, and for the SAT one the same
`hard` difficulty:

| tag | control | n | live pool |
|---|---|---|---|
| `att-ctl-act-alg` | live ACT Algebra   | 16 | 20 |
| `att-ctl-act-fn`  | live ACT Functions | 17 | 17 |
| `att-ctl-sat-alg` | live SAT Algebra hard | 19 | 46 |

**The ACT Functions control is the whole live pool (17) and is smaller than
the 19 it controls.** Its rate is therefore noisier, and that is recorded here
rather than discovered later.

## Why 25% is not the bar

The question is not "can a solver beat chance on four bare numbers" but "is
this batch worse than what students already receive". A batch at +4 against
chance and −16 against the live bank is an improvement, not a leak. Three of
six verdicts on 2026-09-04 were decided by the control and not by the raw
rate.

## Decision rule, fixed now

Δ = pooled batch rate − matched live control rate, both over three solvers.

- **PASS** at Δ ≤ +5.0
- **SECOND READ** at +5.0 < Δ < +10.0
- **FAIL** at Δ ≥ +10.0
- **NO VERDICT**, overriding everything, if any two solvers on the same file
  return identical pick-strings — that is a sign they did not solve
  independently.

Bounds are taken from recorded practice (ACT Math v2c accepted at +5.2, v2b
held at +11.4), not from this data.

## Stated in advance, so it cannot be produced afterwards as an excuse

- A batch that lands in SECOND READ is **not** inserted on the strength of a
  favourable subset. The 2026-09-04 run recorded exactly that failure mode:
  `sat-psda-hard-v4` had a passing-looking mean over a concentrated subset,
  and dropping its one prose item did not rescue it.
- If the instrument returns ~25% for every file including the live controls,
  it has not discriminated anything and NO verdict is available from it. The
  controls existing is what makes that detectable.
- `att-ctl-act-fn` at n=17 is under-powered. If the ACT Functions verdict
  turns on a margin under about 8 points, it is reported as provisional.
