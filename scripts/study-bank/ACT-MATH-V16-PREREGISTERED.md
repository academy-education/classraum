# act-math-v16 — pre-registered bars (written 2026-10-07, BEFORE any item is authored)

## Why this batch, and its size

`form-capacity.mjs` (2026-10-07): ACT Math **13 forms**, binding on Number and
Quantity **69 / 5 per form**. ACT Math was 14 forms on 2026-09-22; one N&Q row
(`act-math-v8-nq`, b0c5c122) was archived on 2026-10-06, taking N&Q 70 -> 69.

Format read from code, not a brief: `src/lib/study/act-test.ts` math block
`questions: 45, choiceCount: 4`. Per-form minimums from `blueprint-quotas.mjs`
(`perForm('act/math')`): N&Q 5, Geometry 8, S&P 6, Algebra 8, Functions 8, IES 9.

Deficit for forms 14 AND 15 (live counts from `next-form.mjs`, 15 x per-form):

    domain                        live   need@15   deficit   authored (+~30%)
    Number and Quantity             69       75         6          8
    Geometry                       112      120         8         10
    Statistics and Probability      84       90         6          9
    Algebra                        113      120         7          9
    Functions                      113      120         7          9
    Integrating Essential Skills   128      135         7          9
    total                                              41         54   (+31.7%)

S&P gets the largest relative margin because its last two batches dropped 1/7
and 3/6. Commissioned **mixed band** (ACT Math opens easy): BANK_BAND=mixed is
declared HERE, at commission, and the banked label is always the graders'.

Cohort: `act-math-v16`. Three authors (Claude agents): A = N&Q + Algebra,
B = Geometry + Functions, C = S&P + IES. No repairs in this round.

## Stage 0 — structural pre-flight (authors run it; I re-run it on delivery)

Every authored file must, before it is gated: sandbox N/N, distractor_solve
3N/3N with 0 mismatches, numeric and symbolic hub margin <= +10,
`key-extremity-gate` PASS (>= 40% at k=4), `check-key-magnitude` consistent
with live, `check-key-is-composition` 0 unique-composite keys,
`check-sign-pair` / `check-plurality-key` / `check-dead-options` /
`check-stem-echo` / `check-key-singleton` exit 0, `stem-duplicates --family act`
and `check-duplicate-option-sets act/math` clean. A file that fails is returned
to its author ONCE before any attack; after the attack nothing is edited.

## Stage 1 — options-only attack (screen)

Render: every candidate interleaved with a live ACT Math control matched 1:1
by domain (54 live), width 4, keys dealt flat WITHIN each arm, no cohort from
this session in the control. Three blind solvers (Claude) — recorded as **three
samples of one solver**, not three independent solvers.

Bars, fixed now:

- **Batch HOLD** if candidate margin (pooled rate − its within-arm
  best-fixed-letter control) exceeds the live arm's margin by **more than +10
  points**. Ceiling check: the live arm has measured 28.6–34.7% on this
  instrument (v11, v15), so a +10 excess is attainable (candidate needs about
  45%, ceiling 100%) — the bar can fire.
- **Batch HOLD** if the candidate unanimous-correct rate exceeds the live arm's
  by **more than 15 points** (rate comparison, never an n·p³ expectation).
- **Instrument-invalid clause**: if the live arm's margin is itself >= +25,
  the instrument is saturated on this population and the with-source half
  decides alone; the candidate number is reported but is not a verdict.
- **Per item**: unanimous-correct is NOT a drop on its own. It is a drop only
  when corroborated by the with-source half (any named free elimination, a
  second defensible answer, or a disputed key on that item).
- Per-domain rates are reported (n ≈ 8–10 each) and decide nothing.

## Stage 2 — with-source grade (decides)

Two independent graders (Claude), grade render with key, difficulty,
explanation and solve fields withheld (`make-grade-render.mjs`), per-item
shuffled order. Each returns per item: pick (solved from the stem), second
defensible answer, every stem-forced bound checked and how many options
survive it, distractor quality (strong/plausible/weak/dead), difficulty, and
any live/within-batch mechanism duplicate.

An item is **kept** only if all of:

1. Both graders' picks equal the key. A disagreement is re-derived by me; it is
   forgiven only if it is a pure arithmetic slip by the grader with the stem
   read the same way. Any disagreement rooted in how the stem reads -> drop.
2. Neither grader names a second defensible answer (competing conventions
   count — the inclusive-quartile precedent).
3. **>= 3 options survive every stem-forced bound** (AUTHORING-BRIEF §8a), as
   named by either grader and confirmed real by me. A "dead" distractor is a
   bound kill. An option ON a bound is dead.
4. Not graded "weak" distractor quality by both graders.
5. No mechanism duplicate of a live math row (any family) or of an earlier item
   in this batch (later item drops).

**Difficulty banked** = the graders' label: agreement -> that label; one band
apart -> the easier; easy vs hard -> medium. Never the author's.

## Stage 3 — duplicate scan

Every candidate against ALL live math rows across every family, paged past
1000 with an ORDER BY and a distinct-id assertion: normalised-stem Jaccard and
numeric option-set identity. Any pair at stem Jaccard >= 0.6 or identical
option values is read by hand; a same-mechanism pair is a drop.

## Stage 4 — kept-set gates, then insert

The KEPT set must pass the stage-0 pre-flight as a set. If it fails the
key-extremity gate or the magnitude check, **the whole batch is held** — no
override, no dropping or editing items to pass (that is fitting to the
instrument). Insert with `BANK_FAMILY=act BANK_COHORT=act-math-v16
BANK_BAND=mixed`, then `verify-act-draw.ts` and `form-capacity.mjs`.

## Success

Target ACT Math **15 forms** (all six deficits met). 14 is partial. Whatever
lands, the result is recorded at its true value with denominators.
