# Math options-only attack — result, 2026-09-12

Scored against `MATH-ATTACK-PREREG-2026-09-12.md`, which was committed
(`56cf3e5b`) before any solver ran. 18 solvers, 3 per file, 6 files.

| band | batch | live control | Δ | verdict |
|---|---|---|---|---|
| ACT Algebra | 25.0% (12/48) | 27.1% (13/48) | **−2.1** | **PASS** |
| ACT Functions | 26.3% (15/57) | 15.7% (8/51) | **+10.6** | **FAIL** |
| SAT Algebra hard | 21.1% (12/57) | 40.4% (23/57) | **−19.3** | **PASS** |

No two solvers on any file returned identical pick-strings, so the NO VERDICT
clause did not fire.

## The instrument could have failed, and this run proves it

The pre-registration named the collapse mode: if every file returns ~25%
including the live controls, nothing has been discriminated and no verdict is
available. Three files did sit at 25–27%. **The SAT Algebra live control came
back at 40.4%**, which settles it — the render can separate a leaky option set
from a clean one, so the near-chance results are measurements and not a flat
line.

## The finding that matters is about the SHIPPED bank, not the candidates

**Live SAT Algebra hard items are 40.4% solvable from four bare numbers.** Six
of nineteen were solved by all three solvers with the stem withheld. The
mechanism is identical across all six, and it is the defect the graders were
told to apply strictly to the new batches:

    x² − 8x + k = 0 …          16, 12, 8, 48      key 12
    3x + ky = 7 …               80, 15, 5, −5     key 5
    2x² − 12x + k = 0 …         14, 7, 18, 61     key 14
    fundraiser, $2,700 …        350, 325, 1050, 900   key 350

One distractor is an order-of-magnitude outlier and **the key is never it**.
"Discard the value that is not the same size as the others, then guess among
three" lifts a solver from 25% to 33% before reading anything, and lands more
often than that because the remaining three are usually a tight cluster around
the key. Every solver named this rule unprompted.

The candidate batch drawn from the same domain and difficulty scores **21.1%**
— 19.3 points below what students receive today. The difference is not the
authoring, it is the grading standard: `distractor_quality: weak` was defined
as "eliminable by kind or magnitude with no work" and applied strictly, which
dropped 8 of 24 from ACT Algebra and 5 of 24 from ACT Functions. The live bank
was never held to it.

**This is a backlog entry, not an action.** Per CLAUDE.md, the population is
measured before anything is rewritten: this is 19 items sampled from a live
pool of 46 hard SAT Algebra, and the rate for the other three SAT Math domains
is unknown. A rewrite programme justified by one sample is the mistake already
recorded for the "bank-wide 64.4%" hub entry.

## ACT Functions FAILS, and the reason is the control

The batch itself is at chance — 26.3% against a 25.0% line. What produces the
+10.6 is the control landing at **15.7%, below chance**.

A control below chance is not a meaningful baseline; it is 51 picks landing
1.5 SD low. And the pre-registration flagged this specific control in advance:
it is the **entire** live ACT Functions 4-option numeric population (n=17),
smaller than the 19 it controls, and cannot be enlarged.

**It is still recorded as a FAIL and the batch is not being inserted.** The
rule was fixed before the data existed precisely so that a result this shaped
could not be argued away, and "the control was noisy" is the argument the rule
was written to refuse. Reaching for a broader ACT Math control now — after
seeing the number — would be choosing the comparison that gives the answer I
want, which is the failure mode recorded three times in this register already.

What a second read would legitimately look like, if Andy wants one: a
pre-registered control over all live ACT Math numeric items rather than
Functions alone, declared before it is run and reported as a weaker result
than a first read, because the decision to run it was made after seeing the
first.

## Inserted on this result

ACT Algebra (16 items) and SAT Algebra hard (19 items). ACT Functions (19)
stays out.

## Solver behaviour worth keeping

Six solvers independently found an "arithmetic run plus one outlier" shape and
bet the key sits at the run's centre; two asked for their confident subset to
be scored separately rather than trusting the overall rate. Scored: **3 of 12
confident picks correct, exactly 25%.** The shape is real and does not locate
the key. Recorded so nobody builds a seventh structural proxy for it.

One solver reported the SAT batch as leaking and marked 8 of 19 confident. It
scored 2/8, and its own caveat said the rule inverts if authors put the key on
the outlier. It was wrong in the direction it warned about.
