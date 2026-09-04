# Math options-only attack — 2026-09-04

`make-options-only.mjs` strips the stem entirely and shows four bare values. A
solver who picks the key from four numbers has proved the item does not require
the maths. Keys dealt flat on all 11 files (6/6/6/6 at n=24, 8/8/8/8 at n=32,
10/10/10/10 at n=40), so a constant-letter solver scores exactly 25.0%.

Rule pre-registered before any score existed: PASS at Δ ≤ +5.0 against a matched
live-bank control, SECOND READ at +5.0 < Δ < +10.0, FAIL at Δ ≥ +10.0, NO
VERDICT overriding everything on identical pick-strings. Bounds taken from
recorded practice (ACT Math v2c accepted at +5.2, v2b held at +11.4), not from
this data.

| batch | n | pooled | live ctl | Δ | verdict |
|---|---|---|---|---|---|
| sat-adv-hard-v4  | 24 | 29.2% | 45.8% | **-16.6** | **PASS** |
| sat-psda-hard-v3 | 24 | 25.0% | 27.8% | **-2.8**  | **PASS** |
| sat-psda-hard-v4 | 24 | 33.3% | 27.8% | +5.5      | **SECOND READ** |
| sat-geo-hard-v1  | 24 | 36.1% | 31.9% | +4.2      | **PASS** |
| act-math-v4gi    | 32 | 24.0% | 29.2% | **-5.2**  | **PASS** |
| isee-math-s8     | 40 | 25.8% | 22.5% | +3.3      | **PASS** |

## The live control decides three of the six

Advanced Math v4 is +4.2 against a bare 25% chance line and would read as a
mild elevation. The shipped Advanced Math bank scores **45.8%** through the same
render, so v4 is **16.6 points below what students already receive**. Geometry
v1 is +11.1 against chance — a fail on the old bar — and +4.2 against its own
live baseline.

## Evidence the instrument could have failed

It did not return a flat 25% for everything: the live Advanced Math control came
in at 45.8%, and within PSDA the prose-option items scored 50-100% against
22.7-30.4% for numeric items in the same files.

## The one SECOND READ, and why it is not a PASS

`sat-psda-hard-v4` has a passing-looking mean over a concentrated subset: 4 of 24
items were solved by EVERY solver (control: 0 of 24), and all four of the
batch's confident picks were correct. That is the SM4 pattern. Dropping the one
prose item does not rescue it — numeric-only the batch is 30.4% against the
control's 23.8%, **+6.6**. The excess lives in the numeric items.

## PSDA statistical-inference items are options-only solvable BY CONSTRUCTION

PSDA-H4-17 and PSDA-H3-08 present four full-sentence conclusions; the stem adds
nothing the options do not carry. Every solver named it. The LIVE bank behaves
identically — 3 such items in the control at 55.6% against 23.8% for its numeric
items — so this is the "nothing withheld" category: recorded, not counted. It
does not explain v4's elevation.

## The flagged solver anomaly is BENIGN — audited

`ctl-sat-geo` solver-a used 5 tool calls where the other 32 solvers used 2, and
the attack coordinator could not confirm why from inside its own run, correctly
refusing to drop the solver post-hoc (that would be fitting the rule to the
data; dropping it moves geo to +9.0, second-read band).

Transcript audited afterwards. The five calls are: one Read of its own
`oo-ctl-sat-geo.blind.json`, then FOUR attempts to write its own answer file —
the heredoc produced malformed JSON and it retried, including reading back its
own output to validate. This matches the coordinator's note that two solver
files arrived missing a closing brace. **It never opened a keyed file, a batch
file, a sibling answer file, or the web.** No contamination; the geo PASS stands
on its stated number.

## Caveat recorded rather than smoothed

This run's Advanced Math live control (45.8%) is well above the 30.6% the
register recorded earlier on 2026-09-04 — different sample, different difficulty
mix, n=24. The v4 verdict is unchanged under either figure, which is the only
reason it is reported as settled.
