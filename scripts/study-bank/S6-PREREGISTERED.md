# s6 authoring round — decision rules, fixed before the items exist

**Written 2026-09-01, before any of the four batches returned.** The
rules below decide what is banked. Written first because a rule written
around a number it has already seen is not a rule — B1 died of that.

## Why these four sections

The reading format fix changed which section is the constraint. Before
it, reading was the worst at 2.08 forms; capping delivery at 3 items per
passage discarded half the reading bank. Serving the published format
(6 per passage) moved reading to 3.25 / 3.45 WITHOUT authoring anything,
and made maths and verbal the bottleneck:

    SSAT verbal   124 / 60 = 2.07 forms   <- worst
    ISEE math     174 / 84 = 2.07         <- worst
    SSAT math     108 / 50 = 2.16
    ISEE verbal    96 / 40 = 2.40
    ISEE reading  117 / 36 = 3.25
    SSAT reading  138 / 40 = 3.45

I had advised authoring reading an hour earlier. That was wrong, and it
was wrong because I had not re-measured after changing the delivery
rule. Commissioned: ISEE math +40, SSAT math +45, SSAT verbal +56,
ISEE verbal +32.

## The gates, in order. A batch that fails one is not banked.

1. **Maths: the sandbox, not a vote.** Every item carries a `solve`
   snippet that recomputes the answer from the problem's givens.
   `math-bank-helper.mjs verify` runs it and compares. A mismatch means
   the key and the arithmetic disagree; the item is wrong, not the
   checker. The LLM harness has a measured ~18% false-negative rate on
   hard maths and MUST NOT gate it.

2. **Verbal: bijective sets.** Five (SSAT) or four (ISEE) stems whose
   answers are mutually exclusive, each item's options being the set's
   answers. No option is a distractor by role, so no option property can
   correlate with correctness. Checked by `check-equivalent-options.mjs`
   plus a per-set exclusivity read.

3. **Structural pre-flight, all cheap, none sufficient:**
   `check-key-rank-spread.mjs` (maths — the key must not sit at one
   magnitude rank), `check-key-length-rank`, answer-key spread,
   duplicate-option and equivalent-option checks.

4. **The blind attack is the gate.** Three differently-reasoning solvers,
   source withheld, forced choice, control = best fixed letter.
   PASS at margin <= +25 over control. DEAD at >= +30. Between them the
   batch is repaired and re-attacked under a NEW run id, so a
   before/after comparison is never overwritten.

## Committed in advance — the parts that will be tempting to bend

- **A batch that fails the attack is not banked, however much work it
  represents.** SV4 was killed at 80% options-only and rebuilt on a
  different method; that is the precedent.
- **The aggregate margin does not clear a batch.** SSAT maths passed at
  +9.3 aggregate while containing a five-item subset at +53. Subsets are
  inspected, not just the mean.
- **The structural checks are pre-flight, never a substitute.** Nine
  proxies have now been built; each caught its own tell and none caught
  the next. A batch is not reported clean because the cheap checks pass.
- **Key-rank balance is required of the NEW cohorts only.** The four
  historic cohorts are deliberately not being repaired — see
  RANK-SKEW-DECISION.md; the repair would introduce a worse tell than
  the one the serve-time shuffle already neutralises.

## What this round does NOT do

It does not make any item human-reviewed. 769 SSAT/ISEE items exist and
26 have been read by a person. Authoring ~170 more improves form
coverage and makes that ratio worse. B5 remains the binding constraint
on whether this bank is trustworthy, and no amount of authoring
substitutes for it.
