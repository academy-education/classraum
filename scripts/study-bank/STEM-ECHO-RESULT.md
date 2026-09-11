# stem-echo: a real channel, too weak to act on — and the run that found it
# was measured with the wrong instrument

Keep this file so nobody builds the checker again, and so the instrument
error below is not repeated. Companion to `OPTION-BALANCE-RESULT.md`, which
records the fifth structural proxy failing; this is the seventh.

## The hypothesis

Three independent options-only attackers on `act-math-v3-sp`, unprompted,
named the same channel: an option that merely repeats a number the STEM
already handed over. A question asking you to COMBINE givens cannot be
answered by one of the givens sitting there unchanged, so the echo is a free
elimination — and `check-math-hub` cannot see it by construction, because
that checker reads only the option set and this needs the stem too.

    AM3S-05  stem gives a 2-of-5 composition;  2/5 is an option
    AM3S-09  stem states an uncorrected mean of 74;  74 is an option
    AM3S-20  stem gives p = 50/125;  50/125 is an option
    AM3S-23  stem's unrestricted total is 84;  84 is an option

`check-stem-echo.mjs` implements it: normalises values so 50/125, 0.4 and 40%
collide, reads prose ratios ("2 of 5", "2 out of 5", "2 in 5"), treats an item
whose stem holds no numbers as UNSCORABLE rather than clean, and derives the
control from the population rather than a literal.

## The population, measured before believing any of it

    LIVE MATHS BANK, all families        1,752 rows, 1,604 scorable
      options that echo the stem           688/6,562 = 10.5%   <- control
      KEYS that echo the stem                124/1,604 = 7.7%
      margin                                          -2.8 pts
      items with an echo the key is NOT      406/1,604 = 25.3%

    act-math-v3-sp (candidate)              21 of 24 scorable
      margin -2.4 pts;  echo-not-key on 2 of 21 = 9.5%
    isee-math-s10 (candidate)               29 of 30 scorable
      margin +6.0 pts;  echo-not-key on 5 of 29 = 17.2%

**The effect is real, bank-wide, and small.** The key echoes the stem 2.8
points LESS often than a random option does — the direction the rule predicts,
and about a tenth of the size that would matter. And the candidate batch that
generated the hypothesis is at 9.5% against the live bank's 25.3%: it is
*cleaner* on this channel than what is already shipped.

**Do not build a gate on it, and do not start a repair programme.** Rewriting
the 406 live items would be the 690-item rewrite this repo already talked
itself out of once. The checker is kept because it is nearly free and because
`--bank` makes the population re-measurable in one command, not because it
discriminates.

Two limits, stated so the numbers are read as a floor:
- complements are NOT modelled (a stem giving "2 of 5" makes 3/5 available,
  and this counts only 2/5), so every rate above understates the channel;
- an echo is not automatically a defect — "which listed value is the mode"
  keys to a member of the printed list, and that is the item. Only the
  comparative rate means anything.

## The instrument error, which is the more useful half

The run that produced the hypothesis scored `act-math-v3-sp` at **68.1%
pooled, 13 of 24 unanimous**, and that number should not be compared to the
maths baseline of 24-29% recorded in `MATH-ATTACK-RESULT-2026-09-04.md`. The
two are different instruments:

    2026-09-04 baseline   make-options-only.mjs — the stem is STRIPPED
                          ENTIRELY; solvers see four bare values.
    this run              solvers were given the FULL STEM plus a written
                          list of elimination heuristics to look for.

I wrote that adapted prompt. Handing solvers the attack rules and then
reporting how often the rules fire measures the prompt, not the batch — and
several of the "leaks" it surfaced (bounding a probability under 1/2 by
symmetry, a combined rate lying between its two group rates) are not tells at
all. They are ordinary quantitative reasoning that the real ACT rewards.

It is the same failure I had corrected on the R&W side an hour earlier: a
score is uninterpretable without a control drawn through the identical
instrument. I applied that to three R&W cohorts and then did not apply it
here.

`act-math-v3-sp` and `isee-math-s10` are therefore being re-attacked through
`make-options-only.mjs`, which is the render the gate's `nosource` stage
actually names, keys dealt flat so a constant-letter solver scores exactly
25.0%. **Neither batch inserts until that run scores.** The 68.1% stands only
as evidence about a prompt.
