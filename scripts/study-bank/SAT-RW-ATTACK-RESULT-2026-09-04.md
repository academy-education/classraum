# SAT R&W no-source blind attack — 2026-09-04

Three solvers per batch, keys dealt flat (6/6/6/6 over 24 items, so the best
fixed letter scores exactly 25.0%). Decision rule pre-registered before any
solver was dispatched. Transcripts audited: all nine solvers made exactly two
tool calls — one read of their own blind file, one write of their own answers.
Zero reads of any `.batch.json`, `.key.json`, sibling answer file or web page.

## Results

| batch | dealt ctl | live ctl | solvers | pooled | margin | verdict |
|---|---|---|---|---|---|---|
| sat-cs-hard-v3  | 25.0 | 100.0 | 58.3 / 54.2 / 62.5 | **58.3%** | +33.3 | **PASS** |
| sat-sec-hard-v6 | 25.0 |  72.2 | 54.2 / 58.3 / 70.8 | **61.1%** | +36.1 | **PASS** |
| sat-sec-hard-v7 | 25.0 |  72.2 | 66.7 / 70.8 / 70.8 | **69.4%** | +44.4 | **HOLD** |

## THE HEADLINE IS THE CONTROL, NOT THE CANDIDATES

The shipped Craft & Structure sample scored **100.0%** — three solvers,
**byte-identical pick-strings, 24 of 24 each**. Live C&S items that students
can draw today are deterministically solvable without reading the passage.
Shipped Standard English Conventions scored 72.2%.

This is why the live control is not optional. Judged against the +40 published
bar alone, `sat-sec-hard-v7` at +44.4 looks like a failure — but it is
statistically indistinguishable from the bank it would be joining. And
`sat-cs-hard-v3` at 58.3% is not a mediocre batch; it is a **41.7-point
improvement** on what is already live. Holding it would have made the bank
worse, which has now nearly happened three times.

## Per-item split

### sat-cs-hard-v3 — one clean third, two broken thirds

| subskill | items | blind | margin |
|---|---|---|---|
| words in context | 8 | **12.5%** | **-12.5 (below chance)** |
| cross-text connections | 8 | 75.0% | +50.0 |
| text structure and purpose | 8 | 87.5% | +62.5 |

The pass is carried entirely by the vocabulary items, which are genuinely
below chance and are the model to copy. All three solvers independently named
the same tell on the cross-text sets: exactly one **concede-then-reframe**
option ("By accepting X but Y") against flat denials and procedural
recommendations. **The formulaic thing is the DISTRACTOR FAMILY, not the key** —
so the fix is to let a flat denial sometimes be correct, not to rewrite keys
or shuffle letters. Letter-level remedies cannot touch this.

### sat-sec-hard-v7 — the hold is localised and cheap

| family | items | blind |
|---|---|---|
| form (agreement/tense) | 17 | 62.7% |
| boundaries (punctuation) | 7 | **85.7%** |

All three solvers, unprompted, gave the same account: the punctuation items are
decidable from the option string in *any* English sentence, because only one
member of each grid is legal. Rebalancing those 7 would very likely bring the
batch under both bars. V7-11 is named as the model — a clean 2x2 of number x
aspect with no odd-form-out.

### sat-sec-hard-v6 — flattest, cleanest
Form 58.3 / boundaries 62.5 / structure 66.7. Two solvers independently found
the real defect: two-axis option grids (number x tense, number x punctuation)
where the two inconsistent combinations self-eliminate, halving the guess space
on ~8 items. One also found a composition leak — several items share a
beekeeping context, so one item's option text discloses another's referent
number.

## Note on the sub-analyses
The per-subskill splits were NOT pre-registered. They are recorded as
recommendations and do **not** overturn any verdict.
