# Live SAT Information and Ideas — no-source blind attack, 2026-09-04

**Question:** the live Craft & Structure `v2` cohort was just measured broken in bulk
(97.5% blind). I&I is also cohort `v2`, is larger, and a 24-item sample re-scored at
94.4%. Does that generalise, or is it the Math-hub case again (a defect confined to one
authoring cohort, with a "bank-wide" number drawn from inside it)?

**Answer: it generalises. It is worse than C&S, and unlike C&S there is no clean
sub-population anywhere.**

## 1. Population (paged past the PostgREST 1000-row cap explicitly)

    all rows any verified/archived    319
    LIVE (verified=true, archived=false)  250
      v2                              240
      rw-v7-ii-hard                    10   (authored 2026-09-04)
    archived/staged                    69

LIVE v2 by subskill: Inferences 75, Command of Evidence 74, Command of Textual
Evidence 24, Cross-Text Connections 23, Text Structure and Purpose 22, Central Ideas
and Details 21, Command of Evidence (Textual) 1.
`rw-v7-ii-hard`: CoE-quantitative 5, CoE-textual 3, Inferences 2.
Difficulty: medium 198, hard 48, easy 4.

All 250 passages are byte-distinct, so no sibling-item leakage can explain the score.
32 items carry a graphic. **`v2` is a bank-wide SAT label — the filter is on domain.**

## 2. The earlier 24-item sample, matched on prompt+passage

All 24 matched, 24 of 24, all `v2`, all live. **Prompt-only matching would have been
unsafe here: 21 of 250 prompts collide.** The sample was badly unstratified — 13
Inferences and 7 Command of Evidence out of 24 — which is why a fresh stratified draw
was necessary rather than an extrapolation.

Re-scored through this scorer: **94.4%** (91.7 / 91.7 / 100.0), 21 of 24 solved by all
three, no identical pick-strings.

## 3. The fresh draw

72 items not previously attacked, 3 files x 24, every cohort and every subskill
represented, **all 10 `rw-v7-ii-hard` items enumerated** (so that cohort is a population
fact, not a sample). Keys dealt exactly 6/6/6/6 per file — a constant-letter solver
scores exactly 25.0%.

| file | dealt ctl | solvers | pooled | margin | identical strings |
|---|---|---|---|---|---|
| iilive-f1 | 25.0 | 87.5 / 91.7 / 91.7 | **90.3%** | +65.3 | no |
| iilive-f2 (a/b/c) | 25.0 | 95.8 / 95.8 / 95.8 | 95.8% | +70.8 | **YES — VOIDED** |
| iilive-f2 (d/e/f, re-run) | 25.0 | 95.8 / 91.7 / 91.7 | **93.1%** | +68.1 | no |
| iilive-f3 | 25.0 | 79.2 / 83.3 / 83.3 | **81.9%** | +56.9 | no |

`iilive-f2`'s first three solvers returned **byte-identical 24-letter pick-strings**,
the pre-registered void condition. It was re-run with three fresh solvers rather than
reported; the re-run is the verdict-bearing number and is used everywhere below. The
first run's number is recorded but not counted. Note the re-run landed within 2.7
points of the voided run — six independent solvers converging is the finding, not a
contamination signal, and the transcript audit is what distinguishes the two.

## 4. Results — 96 unique live items measured

    fresh draw only            72 items    88.4%
    fresh + earlier control    96 items    89.9%   (+64.9 over a 25.0% dealt control)

### By cohort

| cohort | population | measured | blind | all-3 |
|---|---|---|---|---|
| `v2` | 240 | 86 (35.8%) | **91.9%** | 76 / 86 |
| `rw-v7-ii-hard` | 10 | **10 (100%)** | **73.3%** | 6 / 10 |

### By subskill, `v2` (combined, n = measured)

| subskill | pop | n | blind | all-3 |
|---|---|---|---|---|
| Inferences | 75 | 27 | **98.8%** | 26/27 |
| Text Structure and Purpose | 22 | 11 | **100.0%** | 11/11 |
| Cross-Text Connections | 23 | 9 | **100.0%** | 9/9 |
| Central Ideas and Details | 21 | 9 | **100.0%** | 9/9 |
| Command of Evidence (Textual) | 1 | 1 | 100.0% | 1/1 |
| Command of Evidence | 74 | 21 | 79.4% | 15/21 |
| Command of Textual Evidence | 24 | 8 | 70.8% | 5/8 |

### By subskill, `rw-v7-ii-hard` (fully enumerated)

    CoE (quantitative)  5   66.7%   2/5 all-3
    CoE (textual)       3   66.7%   2/3
    Inferences          2  100.0%   2/2

**Noise check.** The per-subskill best-fixed-letter rate over the drawn items runs
35.7–50.0% (letters are flat per file, not per stratum), so small strata are noisy.
Every stratum above still clears its own fixed-letter ceiling by 20–60 points. The
lowest number anywhere in live I&I is 66.7% against a 40–50% ceiling.

### Per-item split (96 measured)

    solved by 3/3 solvers   82
    solved by 2/3            5
    solved by 1/3            3
    solved by 0/3            6

    v2 only:  3/3 = 76,  2/3 = 3,  1/3 = 3,  0/3 = 4

## 5. Concentrated or cohort-wide? — COHORT-WIDE, and no stratum is clean

This is the opposite of the Math-hub outcome and stronger than C&S.

- **C&S had a clean stratum and I&I does not.** In C&S the 18-item `rw-v7-cs-hard`
  cohort scored 68.5% and its words-in-context third was genuinely clean (33.3%), which
  is what stopped a good sub-population being rewritten. **There is no equivalent here.**
  `rw-v7-ii-hard` is fully enumerated at 73.3% with 6 of its 10 items solved by all
  three solvers. It is better than `v2` and it is still broken.
- **Four of the seven `v2` subskills are at a literal ceiling** (100%, and Inferences at
  98.8% over 27 items). The two evidence subskills are the only ones below 80%, and
  79.4% / 70.8% is not "clean", it is 45–55 points over chance.
- **Difficulty does not separate it either**: v2 medium 92.3%, v2 hard 83.3%.

## 6. Scope of repair

| reading | rule | v2 items |
|---|---|---|
| **strict** | project the measured all-3 rate onto each subskill's population | **~207 of 240** |
| **conservative** | repair only subskills measured at or above 95% | **142 of 240** |

Strict: Inferences 72, CoE 53, CoTE 15, CTC 23, TSP 22, CIaD 21, CoE(Textual) 1.
Conservative: Inferences 75, CTC 23, TSP 22, CIaD 21, CoE(Textual) 1 — leaving the
98 Command of Evidence / Command of Textual Evidence items as arguable survivors,
though both measured well above chance and neither is defensible as *good*.

The 10 `rw-v7-ii-hard` items should be judged on their own; at n=10 the cohort is too
small to matter either way, and it is **not** the clean counter-example C&S had.

Combined with the C&S finding, **the live SAT R&W `v2` prose bank — 450 items across
two domains — is the open item, not 240.**

## 7. The tell — the C&S mechanism reproduces exactly, plus one C&S did not show

**Reproduced, named independently by all twelve solvers in their own words:** the key is
the single hedged, two-part, concede-then-qualify option; the distractors are absolutes,
flat denials or strawmen. Solvers quoted the distractor markers back verbatim and
unprompted — *only, never, always, every, at all, no basis whatsoever, at any scale,
entirely, proves, necessarily invalidates, no measurable effect* — against keys built on
*rather than, not X but Y, valid for a small number but wrongly generalized, too sweeping
since, may explain, do not compel*. Several put it as a rule: discard every option that
finishes the thought, keep the one that says this far and no further. One phrased the
diagnosis precisely: *"the options were written from the answer rather than from a
passage — the key is a careful precis of a position and the three distractors are that
same position deliberately coarsened."*

**Also reproduced:** canonical academic set-pieces. Solvers named, unprompted, Wegener
and drift, MOND vs dark matter, Snowball/Slushball Earth, the faint young Sun paradox,
the Yellowstone trophic cascade, the hygiene hypothesis, monopsony vs the competitive
labour model, the Zeigarnik effect, Rapa Nui revisionism, the glass-flows myth, gigantothermy.
Background knowledge alone settles a large minority of items.

**A third mechanism, new relative to C&S, and it is structural rather than semantic:
topic twins.** Four solvers independently observed that some items come in pairs sharing
a subject with different passages, so one item's option set discloses the other's
position. A whole-population check (rare-word Jaccard over passage text, self-tested on
known-identical and known-unrelated text first) confirms it:

    Information and Ideas   16 twin pairs at Jaccard >= 0.20,  23 items (9.2%)
    Craft and Structure      1 twin pair,                       2 items (0.9%)

Repeated subjects include the minimum-wage/monopsony set-piece, the hygiene hypothesis,
the faint young Sun, Wegener, and two solubility/carbon-content lab write-ups. C&S is
effectively free of this; I&I is not. **Any repair that rewrites options without also
diversifying subjects leaves this one in place.**

**A fourth, reported by every solver and specific to the evidence subskills:** the
strengthen/weaken/support items are a research-methods quiz. The key is reliably the
only option that controls the rival explanation, supplies a matched comparison, or
inverts the causal order; the distractors are bare correlation, a confound, or a fact
supporting the rival. Solvers said the topic was "decoration". This is why the two
evidence subskills are the *lowest* scoring and still 45+ points over chance — the leak
there is a different one, so a fix aimed only at the hedge tell will not reach them.

**Where the attack failed is the most useful signal in the run.** Every solver, without
being asked, located the same residue: the quantitative data-completion items, where the
answer is arithmetic over withheld numbers. Those are the 6 items solved by 0 of 3. One
solver stated the diagnostic outright — *"where the writer varied the load-bearing
content I was at chance; where the distractors were built by inflating the key into an
overstatement, I was not."*

## 8. Method — what was broken before it was believed

**The scorer, before any solver was dispatched:**

    synthetic perfect x3      -> 100.0%, and trips the identical-pick-string detector
    synthetic always-A x3     -> exactly 25.0%, margin 0.0
    a file missing one answer -> REFUSING, exit 2
    non-ABCD picks            -> REFUSING, exit 2

**All twelve solver transcripts audited**, from the raw JSONL: exactly two tool calls
each (1 Read, 1 Write), and the only `study-bank/` paths appearing in any transcript are
that solver's own blind file and its own answer file. Zero reads of any `.key.json`,
`.meta.json`, `.batch.json`, sibling answer file, `.env`, database or web page.

**The prompt+passage rule was load-bearing, again.** 21 of 250 I&I prompts collide; a
prompt-only match would have mis-identified items exactly as it did in the C&S report.

**A structural proxy was built and it does not work — recorded so nobody builds it again.**
A "key is the unique hedged option while distractors are absolutes" detector, run over
the whole live population:

    I&I v2            240   key hedged 39.2%   uniquely hedged 23.3%
    C&S v2            210              32.9%                   19.5%
    C&S rw-v7-cs-hard  18              11.1%                    0.0%
    SEC / Adv Math    ~500               ~0%                     ~0%

It separates prose domains from non-prose ones, which is trivial, and it fires on 23% of
items where solvers succeed on 92%. **It under-detects by a factor of four.** This is the
sixth structural proxy to be too coarse for a semantic tell, exactly as CLAUDE.md
predicts. The attack is the gate; this is not even useful pre-flight.

## Artifacts

`iilive-pop.mjs`, `iilive-inspect.mjs`, `iilive-match.mjs`, `iilive-draw.mjs`,
`iilive-score.mjs`, `iilive-agg.mjs`, `iilive-control-score.mjs`, `iilive-hedge.mjs`,
`iilive-twins.mjs`; `iilive-f{1,2,3}.{blind,key,meta}.json` and
`iilive-f{1,2,3}.solver-{a,b,c}.json` plus `iilive-f2.solver-{d,e,f}.json`.
Nothing was written to the database.
