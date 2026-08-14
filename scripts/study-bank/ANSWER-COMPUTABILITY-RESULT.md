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


---

# Update — function notation + degree trig (2026-08-14, same day)

Added the two families the checker used to refuse. **Coverage 37 -> 42.
Still zero defects.**

    CHECKED   42/820   5.1%   (was 37, 4.5%)
    WRONG      0

## The estimate was wrong: +5 items, not the ~96 predicted

The earlier note said supporting these two families was worth "roughly
96 more items (12%)". That counted every item the checker had SKIPPED
for those reasons. It is not what they are worth, because both families
are only safe in a narrow form:

    function notation   67 skipped  ->  58 still skipped, 9 gained
    trigonometry        29 skipped  ->  31 still skipped, ~0 gained

**Linear functions** are only decidable when the stem SAYS the function
is linear and gives exactly two points. Two points do not determine a
function otherwise, and assuming linearity where the stem does not
state it is precisely how a checker invents a finding. 58 items use
f(x) in some other way.

**Trigonometry** gained essentially nothing. Only the cofunction stem —
sin(x) = cos(x + k), in degrees — is exact without a solver. The other
31 need a figure, and the degree/radian trap that produced the original
false positive is still there for anything else.

The lesson is small but repeatable: **"items the checker skipped for
reason X" is an upper bound on what fixing X yields, and a bad
estimate of it.** The skip reason says why one instrument stopped, not
whether the item is decidable at all.

## New guards

Six fixtures added, four of them abstentions the new code MUST make:
a function not stated linear, a "linear" f with three points, trig
without degrees stated, trig with the same function on both sides. Plus
two corrupted keys in the new families that must come back WRONG — a
family that can only ever answer OK is not checking anything.

Two regex bugs found by the self-test while wiring this up, both of
which would have silently disabled a family:

- `\b(?!sin|cos|...)([a-zA-Z])\s*\(` does not exclude `sin(`. The engine
  retries at the next letter, matches `n(`, and calls it a function
  named n. Anchored on "no letter immediately before" instead.
- `([a-zA-Z])\s*\(` matched "acute angle x (in degrees)" — a variable
  followed by a parenthetical. That sent the whole trig family down the
  linear-function path and out as UNPARSEABLE. Real stems write f(3),
  never f (3), so the space is gone.

Self-test is now 31 cases.
