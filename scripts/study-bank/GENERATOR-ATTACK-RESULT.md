# The generator, attacked — 24 items, 2026-08-05

**Question:** every QC number in this repo describes `study_item_bank`.
A live test can also serve a question the generator produced on the
spot, and those are never bank rows. Is that surface any better?

**Answer: it is the worst one measured. +68.1 over control.**

---

## The gap that existed until today

`study_attempts.item_id` is the discriminator — NOT NULL means the
question came from the bank, NULL means the generator made it.

    from bank (already measured)      379 attempts,  379 distinct
    generated (NEVER measured)      1,030 attempts,  951 distinct

More than twice as many distinct questions had never been through any
gate as had. Every "the bank scores X" statement in this repo was true
and beside the point for those.

## Result

3 solvers, 24 items, stem kept, source withheld. Key letters dealt flat,
so the control is 25.0% by construction rather than by luck.

    solver A  22/24 = 91.7%   confident 19/24   spread 7/6/6/5
    solver B  22/24 = 91.7%   confident 17/24   spread 8/5/6/5
    solver C  23/24 = 95.8%   confident 15/24   spread 7/6/6/5
    MEAN 93.1%   control 25.0%   margin +68.1

| | margin |
|---|---|
| official ETS reply items | +25.5 |
| live bank, choose_response | +40.4 |
| nearmiss-v1 (hand-authored, eliminated) | +66.7 |
| **generated questions** | **+68.1** |

Spreads differ across solvers, which is normally the healthy signature —
here it only means three different routes reached the same answers.

## Cause, from three independent solvers

They were given deliberately different instructions — A on surface
heuristics, B on elimination, C on content knowledge only, explicitly
forbidden from using surface tells. All three converged.

**1. Distractors are authored FROM the key.** Solver B:

> Negate the key, absolutise the key, or restate the key too literally —
> that is the whole generator. The key is identifiable by register
> alone: it is the one sentence that sounds like it was written by
> someone who had read the passage.

This is the SAME construction eliminated by hand back in the
choose_response repair (`ROTATION-RESULT.md`: "distractors written as
mutations of the key make the recipe invertible"). The generator does it
systematically, at scale, and nothing was watching.

**2. Absolutes mark the wrong answers.** Distractors carry "never",
"no role", "could not have occurred at all", "every household at the
same moment", "unaffected by human activity". Keys never do. Solver A
struck every option containing an absolute or flat negation and the
field usually collapsed to one survivor — on roughly 10 of 24.

**3. The stem quotes the load-bearing phrase.** Solver C, the one told
NOT to use surface tells, found the structural version:

> Every item that names the term, metaphor, or quotation being asked
> about is answerable because the thing to be interpreted travels with
> the question.

**4. Three-against-one polarity.** One option qualified, three denying
or reversing the same proposition. The odd one out is the key, and you
never need the passage to spot which is odd.

Solver C's summary: **world knowledge alone was sufficient on ~15 of
24.** Only 4 items — the grammar ones, where the sentence itself is
withheld — genuinely resisted.

## A second, separate defect found while rendering

**46 of 709 generated items (6.5%) write the whole passage into the
`prompt` field** instead of a separate passage field. The first render
caught one at 1,015 characters against a median stem of 88.

For those the attack cannot withhold anything — the solver is handed the
material, and a correct answer is a legitimate solve, not a leak. Left
in, they would have inflated the blind score with real comprehension.
They are excluded and counted, the same treatment maths items get in
`bank-targets.ts`. It is also a rendering bug in its own right: a
student meets the passage twice.

## Errors made in this run, recorded

**`.limit(5000)` does not lift the PostgREST cap.** The first version of
the sampler carried a comment claiming it guarded against the silent
1000-row ceiling. It read exactly 1000 of 1030 rows and printed a number
that looked deliberate. Fixed with `.range()` pagination; the total is
now printed so a future cap change is visible. Third time this repo has
been bitten by a comment asserting a guarantee that was never tested.

## What this licenses

- The generator is not a safe fallback for a defective bank. It is
  worse than the bank.
- The defect is a KNOWN one with a known cause — mutation-of-key
  distractors — already eliminated once by hand. This is not a new
  mystery; it is the old one, unguarded, in the live path.
- Whatever repair the human review picks for the bank has to be applied
  to the generator prompt as well, or fixing 1,742 stored items just
  moves the problem to the questions generated after them.
- 6.5% source-in-stem is a straightforward bug and can be fixed now,
  independently of the guessability question.
