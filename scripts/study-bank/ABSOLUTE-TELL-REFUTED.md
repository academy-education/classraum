# The "reject the absolute, pick the hedge" tell does not exist

**2026-09-01.** Three difficulty graders, working independently and none
of them asked about guessability, reported the same thing unprompted:

> "the wrong answer in EXCEPT / main-idea / central-claim slots is
>  overwhelmingly an ABSOLUTE (always, only, never, entirely, solely) and
>  the key is the hedged option. A solver applying that rule with no
>  passage would score far above chance."

Three independent observers agreeing is the strongest prior this project
has had for a tell. It is wrong.

## Measured over the whole population

The defect is decidable, so it was counted rather than sampled. The
strategy is executed literally: if exactly one option lacks an absolute,
pick it; otherwise the rule does not fire.

    TOEFL reading    rule fires on 1.6% of 728 items   score 1.2%   control 27.2%   margin -26.0
    TOEFL listening              2.2% of 802           1.2%         26.4%           -25.2
    SAT reading&writing          1.2% of 918           0.2%         33.3%           -33.1
    SSAT reading                 0.0% of 138             --         24.6%
    ISEE reading                 0.9% of 117           0.0%         33.3%           -33.3

The ingredients are real: a key contains an absolute only 5.9% of the
time, and at least one distractor does 31.9% of the time. But "exactly
one option is clean" almost never happens, because usually SEVERAL are.
The rule has nothing to discriminate with.

## Then tested against the graders' own examples

Population statistics can hide a real effect in a subset, so the
detector was pointed at the nine items one grader NAMED as solvable this
way — the strongest possible test, since a human had already committed
to them.

    R0418   3 of 4 contain an absolute, 1 clean   rule fires -- and is WRONG
    R0430   0 of 4 contain an absolute            does not fire
    R0445   1 of 4                                does not fire
    R0472   1 of 4                                does not fire
    R0493   1 of 4                                does not fire
    R0527   1 of 4                                does not fire
    R0537   2 of 4                                does not fire
    R0545   2 of 4                                does not fire
    R0559   0 of 4 contain an absolute            does not fire

Fires on ONE of nine, and gets that one wrong. Two of the cited items
contain no absolute at all, so whatever the grader was responding to, it
was not this.

## What is actually going on

The graders' PERCEPTION is probably sound — these items do feel easy,
and the difficulty grades say so independently (~50% easy). What is
refuted is the EXPLANATION. "Overstated distractor" is a semantic
judgement about whether an option claims more than the passage supports,
and absoluteness is a poor proxy for it: an option can overstate with no
absolute word in it, and can contain "all" while being perfectly
measured.

That is CLAUDE.md's standing conclusion arriving again from a new
direction: *the tells that decide these batches are SEMANTIC and
item-specific, and a cheap proxy for them does not exist.* This is the
tenth structural proxy built here and the fifth to fail.

## Kept anyway

`check-absolute-tell.mjs` stays in the repo. It is nearly free, it runs
over the whole bank, and its value is now the NEGATIVE: when someone
next proposes this tell — and the fact that three graders proposed it
unprompted says someone will — the answer is one command rather than an
afternoon.
