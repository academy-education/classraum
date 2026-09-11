# ACT Science figure-blind attack — result, 2026-09-12

Scored against `ACT-SCIENCE-ATTACK-PREREG-2026-09-12.md`, committed
(`29066425`) before any solver ran. 36 solvers, 3 per file, 12 files.
Nothing in the bank was changed, archived or inserted.

## Headline: the pre-registered NO VERDICT clause fired

    BATCH    live ACT Science   250/360 = 69.4%   (120 items, flat-deal floor 28.3%)
    CONTROL  live ACT Reading   168/216 = 77.8%   ( 72 items, flat-deal floor 25.0%)
    Δ = -8.3 pts

**−8.3 sits in the PASS band. It is not a verdict, because clause 1 of
the pre-registration overrides it:** twelve of thirty-six solver pairs on
a shared file returned byte-identical pick-strings — **eleven of the
eighteen control pairs, and one of the eighteen batch pairs.** The
pre-registration says that is evidence the three picks on a file are not
three independent measurements, and that no verdict is available when it
happens. It happened, so the hide/unhide question does not get an answer
from this run.

I am reporting it that way rather than re-reading the clause, because
the clause was written to stop exactly this: a Δ landing in the
favourable band and the disqualifier being reinterpreted afterwards.

**What is diagnosable anyway** is why it fired, and it is a design fault
in the clause, not a leak: three solvers are three runs of the same model
on the same file, and on a 12-item control file near-determinism produces
identical strings without any collusion. Mean pairwise agreement was
**94.4% on the control and 86.9% on the batch** — the control is the more
deterministic file set, which under `CS-V5-ATTACK-RESULT-2026-09-12.md`
reads as the control being the *more* guessable cohort, not the batch.
That is a reason to re-run with genuinely different solvers or longer
files. **It is not a reason to award the batch the PASS.**

Clause 2 did NOT fire: the control landed at 77.8% against a 25.0%
flat-deal floor, so the instrument discriminated. This is not the
"returned roughly the same number for everything" outcome.

## Denominators first, per the CLAUDE.md corollary

| | items | picks | rate | flat-deal floor |
|---|---|---|---|---|
| ACT Science (all live) | 120 | 360 | **69.4%** | 28.3% |
| ACT Reading (live control) | 72 | 216 | **77.8%** | 25.0% |

Read: **120 rows, 120 distinct ids, 0 duplicates**, paged with `.order('id')`
+ `.range()`. `family='act'`, `section='science'`, `verified=true`,
`archived` not true. Cohorts `act-science-v1` 80, `act-science-v2` 40.

The batch floor is 28.3%, not 25.0%: 120 items over six files deals
A:34 B:29 C:29 D:28. A constant-letter solver therefore scores 3.3
points higher on the batch than on the control, which flatters the batch
— stated because it is the direction that helps it.

Per file:

    BATCH    f1 48/63 76.2%   f2 34/63 54.0%   f3 42/63 66.7%
             f4 47/63 74.6%   f5 43/63 68.3%   f6 36/45 80.0%
    CONTROL  f1 27/36 75.0%   f2 24/36 66.7%   f3 28/36 77.8%
             f4 33/36 91.7%   f5 30/36 83.3%   f6 26/36 72.2%

Per item, over three solvers each:

    solved by all 3   75 of 120
    solved by 2        9
    solved by 1        7
    solved by none    29

## Confident subsets — and they are NOT at chance

    BATCH    157/167 = 94.0%   (46% of picks marked confident)
    CONTROL   95/99  = 96.0%   (46% of picks marked confident)

The failure mode named in the brief — an elevated overall rate whose
confident subset collapses to chance — **did not occur here.** When these
solvers said they knew, they were right 94% of the time. The signal is
real; the question is what it is made of, and the reasons say clearly
that it is mostly not an option-shape tell.

## The instrument was attacked before its output was believed

Three break-tests on the scorer, all run against data whose answer was
known in advance:

1. **Constant-letter solver** scored **exactly** the printed flat-deal
   floor — 102/360 = 28.3% batch, 54/216 = 25.0% control. The "keys are
   dealt flat" claim is therefore checkable and checked, and the letter
   mapping is right.
2. **Oracle solver** (picks the key) scored 360/360 and 216/216 = 100.0%.
3. **Deleting one answer** from one solver file made the scorer exit
   non-zero naming the file and the count, rather than quietly scoring a
   20-item denominator. A check that cannot read its input returns no
   number.

## The real finding is the domain split, and it does not need the control

| domain | items | blind rate |
|---|---|---|
| **Interpretation of Data** | 46 | **47.8%** (66/138) |
| Scientific Investigation | 31 | 77.4% (72/93) |
| Evaluation of Models, Inferences, Experimental Results | 43 | **86.8%** (112/129) |

**Twenty of the twenty-nine items no solver could touch are
Interpretation of Data.** Those are the items whose figure is
load-bearing: with the table or graph covered there is nothing to read,
and three solvers independently wrote "pure coin flip", "no signal at
all", "the table is withheld".

At the other end, **Evaluation of Models has a confident subset of
84 of 84 — 100.0%.** That is the determinism signature, and it is the
part of ACT Science that is not a data-reading test at all.

But read the solvers' own stated bases before calling it a leak. The
recurring reasons on the solved Evaluation and Investigation items are:

- *"autoclaving sterilizes, so it is the no-living-microbes control"*
- *"a plateau in CO₂ means the substrate ran out"*
- *"0.45 µm filter removes suspended charcoal that would scatter light"*
- *"only option whose stated arithmetic (75→30 vs 75→40) is internally
  correct"*

These are **background science knowledge and internal consistency of the
option set**, not the distractor-family tells that decided the SAT R&W
and ACT English cohorts. A method item that asks why you autoclave a
control has a right answer a scientist knows without the passage. That is
arguably the item type rather than a defect — the same reading recorded
for ACT Knowledge of Language in `ACT-ATTACK-RESULT.md` ("nothing
withheld... recorded, not counted") — but it is also a reason ACT Science
as authored here leans away from the data-reading skill it is meant to
measure.

## The pre-registered secondary REFUSES the 2026-08-05 maths finding

`FIGURE-BLIND-RESULT.md` found 80.6% of figure-bearing maths items
solvable with the graphic covered, and every `rawsvg` geometry item at
100%. The pre-registered prediction was that if these figures are
load-bearing, figure-bearing items score LOWER blind than figure-less
ones.

    figure-bearing   170/252 = 67.5%   (84 items)
    figure-less       80/108 = 74.1%   (36 items)
    Δ = -6.6

They do score lower, in the predicted direction, and the maths result
does not replicate: **there is no ACT Science equivalent of the decorative
geometry diagram.** By figure type:

    table   34 items   74/102 = 72.5%
    bar     22 items   44/66  = 66.7%
    svg     28 items   52/84  = 61.9%

`svg` here is charts, not the redrawn-stem geometry that failed in maths,
and it is the LOWEST of the three.

The sharpest version is domain-crossed: **Interpretation of Data items
that carry a figure sit at 45.8% (55/120)** — nineteen points above a
28.3% floor, and the nineteen points are traceable to
directional/monotonic reasoning ("hotter dissolves faster"), not to
reading the figure.

By cohort: `act-science-v1` 65.8% (240 picks), `act-science-v2` 76.7%
(120 picks). By difficulty: easy 64.6%, medium 68.5%, hard 75.8% — the
rate RISES with authored difficulty, which is the wrong direction and is
consistent with harder items being the evaluation/viewpoint ones.

## What the blind attack cannot see, measured directly

**Figures.** 84 of 120 items carry a graphic; **15 of the 21 passage
groups have one**, 6 do not (those are the prose and
conflicting-viewpoints sets). Types: table 34, svg 28, bar 22. All 34
stems that name a "Figure"/"Table" belong to figure-bearing items — no
figure-less item refers to a figure that is not there.

**Does a stem repeat the figure's numbers?** Checked exactly rather than
sampled, splitting each graphic's numbers into *measured values* (bar
values, table cells) and *labels* (row/column headings, axis labels,
caption):

    stem repeats a MEASURED VALUE from its own figure     6 of 84
    stem repeats only a LABEL / condition (normal lookup) 75 of 84

All six were read by hand and **all six are coincidental**: they are
condition labels — "the 40 °C trial", "at 25 °C", "30 roller passes" —
that happen to equal a cell value somewhere else in the same table.
Naming the row you must look up is how a data item is supposed to work.
**No ACT Science item prints its own answer in the stem.** That is the
defect `FIGURE-BLIND-RESULT.md` found all over maths geometry, and it is
absent here.

## Plain verdict

**On the hidden flag: no verdict.** The pre-registered override fired and
the run does not get to answer the question it was built for. What can be
said without it:

1. The instrument fired — the control cleared its floor by 52.8 points,
   so the near-chance results inside the batch are measurements.
2. ACT Science blind-solves at **69.4%**, and live ACT Reading, which
   students can already open, solves at **77.8%** under the identical
   render. Whatever ACT Science's problem is, it is not that it is more
   guessable than what ships. That is a fact about the two rates; it is
   not the verdict, because the verdict was disqualified.
3. **The maths figure-decoration defect is not present.** Figures are not
   redundant with their stems, and no stem repeats its figure's values.
4. **One third of the bank is a data test and behaves like one**
   (Interpretation of Data, 47.8%, 20 of the 29 unsolvable items). **One
   third is not** (Evaluation of Models, 86.8%, confident subset 84/84) —
   answerable from science knowledge and option consistency with no data
   at all.

**What this run says about the next one.** Per the standing rule — the
model attack is a screen, a human sitting is the gate; the register holds
seven cohorts where the attack said 83-100% and a person scored 13-27%,
and ACT itself cleared at a co-founder's 10.0% against a model 76-79% —
the hidden flag should not be lifted on a model number in either
direction. The two concrete prerequisites this run produces:

- **Re-run the comparison with solvers that are not three samples of one
  model**, or with files long enough that identical strings mean
  something. Clause 1 as written cannot be satisfied by this design.
- **Sit ACT Science with a human**, as `bank-act-science` already
  requires ("Science is hidden on the topic page until a human sitting
  clears it"). Nothing here contradicts that requirement, and nothing
  here substitutes for it.

## Artefacts

    scripts/study-bank/attack-act-science-figure-blind.mjs      render + score
    scripts/study-bank/act-sci-figblind-2026-09-12-f{1..6}.*    batch render, keys, 18 solver files
    scripts/study-bank/act-read-ctl-2026-09-12-f{1..6}.*        control render, keys, 18 solver files
    scripts/study-bank/act-sci-figblind-2026-09-12.peritem.json per-item counts, all 120

Solvers read neutrally-named copies (`set-01` … `set-36`, shuffled) in a
scratchpad, never the repo files, so no solver could see the cohort, the
keys, the batch/control identity, or another solver's answers.
