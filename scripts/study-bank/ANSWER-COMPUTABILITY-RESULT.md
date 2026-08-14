# SAT Math answer computability — 4.5% coverage, zero defects found

Run 2026-08-14. `check-answer-computability.py` (sympy) over all 820
live SAT Math items, via `dump-math-items.mjs`.

## Result

    items              820
    CHECKED             37    4.5% coverage
      verified correct  37
      VERIFIED WRONG     0
    not checkable      783    <- NOT a clean bill of health

    Algebra            18/199    Advanced Math   19/191
    Geometry            0/219    PSDA             0/211

**No item was proved wrong.** That is a real negative on 37 items and
says nothing whatever about the other 783.

## The finding is not the zero. It is the two rounds of false positives.

This checker reported defects twice, and both times **every single one
was wrong**. Not most — all of them.

**Round 1 — 9 of 32 "verified wrong", a 28% defect rate.** The target
regex took the first single letter after "value of". Stems asking for
an EXPRESSION were solved for one variable and compared against the key
for the expression:

    If 3x + 5y = 1 and 5x + 3y = 15, what is the value of x - y?
      checker solved for x  -> 9/2, "key says 7"      x - y IS 7
    If x + 1/x = 4, what is the value of x^2 + 1/x^2?
      checker solved for x  -> 2 +- sqrt(3)           the value IS 14

**Round 2 — 5 more.** `f(3) = 11` is function application; sympy's
implicit multiplication reads it as `f*3`. Four linear-function items
were condemned on that alone. The fifth was trigonometry: the stem says
degrees, sympy works in radians.

    The function f is linear. f(3) = 11, f(7) = 27. Find f(12).
      checker: 324/7          truth: slope 4, f(x) = 4x - 1, f(12) = 47
    For an acute angle x in degrees, sin(x) = cos(x + 20). Find x.
      checker: a nest of atan()   truth: x + (x+20) = 90, x = 35

All 14 are now regression fixtures with hand-worked verdicts. The
self-test runs 25 cases and the bank run refuses to start unless it
passes.

## Why this matters more than the coverage number

Every one of those 14 findings was **plausible**. A defect rate of 28%
in an AI-authored Math bank is exactly what you would expect to find,
the per-cohort table looked sensible, and the output named specific
items with specific numbers. Shipped as a backlog, it would have sent
someone to "fix" 14 correct items — and the fix, per
MATH-HUB-RESULT.md, is itself the risk, since every touched item is a
chance to introduce a new tell.

Nothing caught it except working the algebra by hand. Not the
self-test (which passed 12/12 at the time), not the coverage figure,
not the shape of the output.

**A checker that reports defects has not been validated by reporting
defects.** Validate it on items whose answer you already know, and
re-validate every time it produces a finding.

## What it can and cannot decide

Handles: linear and nonlinear systems, expression targets (`x - y`,
`a + b`, `x^2 + 1/x^2`), radicals with the unicode sign, exponent-form
equations, inequality constraints that exclude extraneous roots, keys
stored as text/letter/fraction, multi-root stems.

Abstains on — and these are the whole coverage story:

    491  no parseable "value of ..." target   word problems, mostly
    111  no symbolic equation in the stem     geometry, data analysis
     67  function notation f(x)
     49  key is not numeric
     29  trigonometry (degree/radian)

Geometry and PSDA are at **0% coverage**. Their answers depend on a
figure or a table, so almost nothing is decidable from stem text.

## Therefore

- The 37 are verified. 783 items remain unmeasured — do not let the
  green count read as a clean bank.
- Raising coverage means supporting function notation and degree-mode
  trig, worth roughly 96 more items (12%). Both are real work, and
  both are exactly the families that produced false positives, so
  neither should be added without fixtures first.
- Geometry and PSDA will not yield to this instrument at all.
