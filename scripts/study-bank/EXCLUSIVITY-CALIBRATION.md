# With-source exclusivity grader — calibrated against human labels, then run over two corpora

Run 2026-08-19. Read-only against the database; nothing edited, archived,
inserted or committed. Claude subagents only.

**Headline.** The grader reproduces the human's flags well enough to be an
instrument (recall 50–70%, false-flag 6.7–10%, permutation p = 0.0006). Over
all 132 live cr-v7 items it flags **21.2%** (≥1 of 3 graders) / **13.6%**
(≥2 of 3), against the co-founder's 25% on his sample of 40 — the population
rate agrees with the human's, so the 25% was not a bad draw. Over the AT-V2
cleared corpus (162 items) the same instrument flags **0.6%** (1 item, 1 of 3
graders). This is a cr-v7 problem, not a pipeline-wide one — with a selection
caveat recorded in §6.

---

## 0. The hypothesis about provenance is CONFIRMED from the record

cr-v7 shipped before a with-source exclusivity pass was mandatory, and the
one it did get covered a third of the cohort:

- `CRV7-RESULT.md` §Cohesion pass: "one checker judged all 4 options of each
  **edited** item WITH the line, blind to the key. 36/39 clean". Thirty-nine
  items, i.e. only the ones the cohesion pass had rewritten. The other 93
  live items were never examined on this axis.
- `REGISTER.md` §5 records the same scope ("over the 39 edited items").
- The mandatory step appears first in `ATV2-TRANCHE1-RESULT.md`: "With-source
  exclusivity pass (NEW — the pilot never had one)", and in
  `ATV2-TRANCHE2-RESULT.md`'s per-batch pipeline as "MANDATORY".

So 93 of 132 live items had never been asked the question at all. That is the
gap this run closes.

## 1. The fixture, and the decode

`study_item_reviews`, run `cr-v7-2026-08-18`, reviewer support@: 40 rows,
40 verdicts — 30 `unique`, 6 `alternative`, 4 `broken`. Flag = not unique,
so 10 of 40 = 25.0%.

**The decode trap was handled and self-checked.** The reviewer's notes name
HIS shuffled letters; `shown_order[s]` is the STORED choice index shown in
slot `s`. `exclusivity-render.mjs` is the only place that mapping is written,
and it asserts on every row that the key's decoded slot equals the stored
`key_slot` — 40/40 agreed, which is what makes the decode trustworthy rather
than assumed. His named rivals are carried as option TEXT, never as letters,
and the grader sees a THIRD, independent permutation, so no comparison
anywhere in this run is letter-to-letter.

Counts verified against SQL `count(*)`, not a PostgREST page: cr-v7 live =
132 (`select cohort, archived, count(*) … group by`), review rows = 40. Every
read in the scripts paginates.

## 2. The grader

`EXCLUSIVITY-GRADER-BRIEF.md`, frozen before any output or any human label
was inspected, and **not edited afterwards** — the number below therefore
needs no held-out qualification, though one was pre-registered anyway (see
§3). It asks for: each option judged independently for defensibility against
the source, a best pick, then `unique` / `contested`. The load-bearing clause
is "judge at listener level, not lawyer level", with underspecification named
as the expected failure and "do not manufacture contest" as the counterweight.

Three fresh subagents per corpus, each given only the brief and its own
key-blind input file, told explicitly not to read neighbouring files. Input
files verified to contain no `correct_answer`, no explanation, no rationales.

## 3. Confusion matrix against the human's 40

Instrument validation first, as in the AT-V2 pass — a grader that cannot
recover the key WITH the source has no standing to say a second option is
arguable:

    grader A  best==key 39/40 (97.5%)   contested 17.5%
    grader B  best==key 39/40 (97.5%)   contested 22.5%
    grader C  best==key 40/40 (100.0%)  contested 20.0%
                                        human      25.0%

Against the human's labels (flag = broken or alternative):

    grader A alone   TP 5  FN 5  FP 2  TN 28   recall 50.0%  false-flag 6.7%
    grader B alone   TP 7  FN 3  FP 2  TN 28   recall 70.0%  false-flag 6.7%
    grader C alone   TP 6  FN 4  FP 2  TN 28   recall 60.0%  false-flag 6.7%

    ensemble >=1/3   TP 7  FN 3  FP 3  TN 27   recall 70.0%  false-flag 10.0%
    ensemble >=2/3   TP 6  FN 4  FP 2  TN 28   recall 60.0%  false-flag  6.7%
    ensemble >=3/3   TP 5  FN 5  FP 1  TN 29   recall 50.0%  false-flag  3.3%

Pre-registered split (fixture sorted by item_id, even index dev / odd
holdout, fixed in the render before any grader ran), reported because it was
promised, not because it was needed — no tuning happened:

    >=1  dev      recall 60.0%  false-flag 13.3%
    >=1  holdout  recall 80.0%  false-flag  6.7%
    >=2  dev      recall 60.0%  false-flag  6.7%
    >=2  holdout  recall 60.0%  false-flag  6.7%

### The checks that could have failed, and did not

1. **Permutation break-test.** Shuffle the human's labels 5,000 times and
   recompute: `P(TP >= 7 | labels shuffled) = 0.0006`. The matrix is reading
   which ITEMS he flagged, not merely matching his rate.
2. **Test–retest.** All 40 fixture items also appear in the 132-item
   population run, graded by fresh agents under a DIFFERENT presentation
   permutation. Same flag/no-flag decision at ≥1 on **37/40**; identical
   3-way vote count on 33/40. The population run scores recall 50.0% /
   false-flag 6.7% against the same human — so the honest recall estimate is
   a range, 50–70%, not the single 70% the first run showed.
3. **A negative control that is not a tautology.** The same brief, the same
   three grader roles, on AT-V2: 0.6%. An instrument that flagged everything
   would have flagged there too.

### Where it is weak, stated plainly

- **It agrees on the item more than on the option.** On the 5 flagged items
  where the human named a specific rival option in his note, the graders'
  defensible-set named the same option in 2. A flag says "look at this item",
  not "this is the option to fix".
- **It does not rank severity.** Against his 4 `broken` items only, precision
  is 30–37%: it cannot tell a two-defensible item from a no-defensible one.
- **It misses 3–5 of his 10.** f04, f05, f09 were missed by all three graders
  in both runs. Two of his `broken` calls ("they are all sort of plausible")
  read as judgements about the whole set being thin rather than about a
  specific rival, which is a distinction the brief does not ask for.
- **n = 40, one reviewer.** Every rate above has a standard error near 7–15
  points. Treat 50–70% recall as the interval, not 60% as the value.

**Verdict: usable as a screen, at the ≥1-of-3 threshold, for locating items a
human should look at. Not usable as an adjudicator** — it must not decide on
its own that an item is broken, and it cannot name the offending option
reliably enough to drive an automated repair.

## 4. cr-v7 population — all 132 live items

    grader A  132/132 graded   best==key 131/132 (99.2%)   contested 15.2%
    grader B  132/132 graded   best==key 132/132 (100.0%)  contested 12.1%
    grader C  132/132 graded   best==key 132/132 (100.0%)  contested 15.2%

    flag >=1/3   28/132 = 21.2%
    flag >=2/3   18/132 = 13.6%
    flag >=3/3   10/132 =  7.6%

Per-item verdicts, with each grader's best pick, rival options and reason:
**`exclusivity-crv7-verdicts.json`** (132 rows, carries item_id, localId,
content_sha, the human verdict where one exists).

**Is 21.2% consistent with the human's 25%, or a different number?** It is
the same number. Correcting the observed rate for the measured recall and
false-flag rate — `observed = recall·p + ff·(1−p)` — gives a true prevalence
between 18.7% (recall .70, ff .10) and 33.5% (recall .50, ff .067). The
human's 25.0% sits inside that interval, and his 40 items were a random draw
from this same population. Nothing needs explaining away: **roughly 25 to 44
of the 132 live items have a defensible second answer.**

Two structural cuts, both worth having:

    per batch (>=2 of 3)   pilot 3/12   b1 2/20   b2 1/20   b3 1/20
                           b4 4/20      b5 5/20   b6 2/20

    cohesion-edited items   3/39  =  7.7%
    never-edited items     15/93  = 16.1%

**The cohesion pass is not the cause.** The 39 items it rewrote flag at half
the rate of the 93 it never touched. (3/39 vs 15/93 is not significant at
this n — the claim is "no evidence the edits caused it", not "the edits
helped".) The defect is spread across all seven authoring batches, which is
what you expect from a property nobody was checking rather than from one bad
author.

## 5. What the flagged items look like

The graders' reasons converge on one shape, and it is the same shape the
human described. The stimulus is a single short line that settles one fact
and leaves the situation open, so two different cooperative follow-ups are
both licensed:

    x107  "It's a semester placement, not the full year."      3 votes
    x112  "Can you drop the key back before Friday?"           3 votes  (human: alternative)
    x090  "It was just the charging port, it's working again." 3 votes  (human: broken)
    x008  "The sublet form needs your guarantor's signature too."  3 votes
    x052  "The care home can't take new volunteers this term."     3 votes

Grader A's summary of its own seven flags in one chunk: four where "a second
option is a cooperative but non-canonical response move — a later pickup, a
partial-shift counteroffer, implicit acceptance carried by 'then'" and three
of outright underspecification, "the line omits a fact … that would be needed
to prefer the key over its rival".

This is a predictable consequence of the cr-v7 construction and is worth
recording as a design finding rather than a list of accidents. Each item is
four mutually exclusive WORLDS, and the kill gate required each world's line
to contain a verbatim span refuting the other three replies. That gate proves
the other three replies are wrong ABOUT ANOTHER WORLD. It never asked whether
the chosen world's line, standing alone in a student's ear, is specific
enough that only one reply fits. Exclusivity across worlds is not exclusivity
within the spoken line.

## 6. AT-V2 cleared corpus — 162 items

    grader A  162/162   best==key 162/162 (100.0%)   contested 0.6%
    grader B  162/162   best==key 162/162 (100.0%)   contested 0.0%
    grader C  162/162   best==key 162/162 (100.0%)   contested 0.0%

    flag >=1/3   1/162 = 0.6%   (a162, atv2-b5-p7, grader A only)
    flag >=2/3   0/162 = 0.0%

    per source file (n / flagged>=1): pilot 24/0  b1 28/0  b2 32/0
                                      b3 32/0  b4 26/0  b5 20/1

All three graders volunteered the mechanism unprompted: each AT-V2 transcript
explicitly negates every distractor ("not a slow drying trend, not wild
swings… and not some unusual wet period either"), so no second option
survives. Two of them also warned, correctly, that this same rigidity is the
condition that produces cross-item tells in a blind attack — that is a
different measurement and this run says nothing about it.

**Two caveats before reading 0.6% as "the pipeline is fine".**

1. **The cleared corpus is already filtered by an exclusivity pass.** Every
   AT-V2 batch had one, and its flags were quarantined (lectures
   `atv2-b1-p4`, `atv2-b4-p7`, `atv2-b5-p5`, `atv2-b5-p8`) — those 16 items
   are excluded from the 162 I graded. So 0.6% is a POST-filter rate, not
   AT-V2's raw rate. The raw rate is recoverable from the batch records: 1
   flag in 32, 0, 0, 1 in 36, 3 in 32 → about 1.6% of items, 5 of 41
   lectures. Still an order of magnitude below cr-v7's ~25%.
2. **The corpus count is 162, not the 166 in ATV2-TRANCHE2-RESULT.md.** That
   file's restored total credits b1 with 32 (written "26+6") while tranche 1
   quarantined lecture `atv2-b1-p4` and reported b1 cleared = 28. Applying
   the exclusion LIST rather than the summary line gives
   24 + 28 + 32 + 32 + 26 + 20 = 162. The 4-item discrepancy is an
   arithmetic slip in the summary, not a disagreement about which items are
   cleared; it should be corrected in that file.

## 7. Repair options for the live cr-v7 items — RECOMMENDATION ONLY, nothing executed

Nothing was edited, archived, or written. What follows is for a decision.

**The cost of touching an item.** `content_sha` is `GENERATED ALWAYS` over
`item` (migration 077/078), and measurements bind to it: `study_item_attacks`
via `item_sha` + the `study_item_attacks_fresh` view, and
`study_item_reviews.item_sha`. Measured, not assumed:

    study_item_attacks rows for cr-v7 ................ 0
    study_item_reviews rows for cr-v7 ................ 40, all 40 currently sha-bound

So a DB-visible detachment costs at most the 40 human review rows — and only
5 of the 18 items flagged at ≥2 carry one (x028, x088, x090, x112, x116). The
real cost is not in the database: cr-v7's blind-attack evidence lives in
files, and the cohort's whole guessability claim rests on option text being
frozen after the seeded key selection. `CRV7-RESULT.md` states the invariant
in terms — "NEVER edit an option or re-pick a world after selection" — and
the cohesion pass, which broke it deliberately on distractors only, had to
buy a fresh 24-item blind attack to stay honest. Any repair pays that price
again.

Four options, with counts:

**(a) Quarantine — archive the flagged items, ship nothing new.**
18 items at ≥2 of 3, or 28 at ≥1 of 3. Live CR falls to 114 or 104, against a
blueprint that delivers 14 Choose a Response per section from a live pool of
132 — a pool of 104 still serves the blueprint, but repeat exposure rises and
the unseen-first draw runs out sooner. Zero authoring cost, zero risk of
introducing a new tell, no re-attack needed (removing items cannot make the
remainder more guessable). Loses ~25 sound items to false flags at the ≥1
threshold.

**(b) Repair the SOURCE — lengthen the spoken line so it settles the open
fact.** This is the fix that matches the diagnosis: the line, not the option
set, is what is underspecified. It leaves all four options byte-identical, so
the seeded-selection independence argument and every letter/length/hedge
statistic survive untouched. It changes `content_sha` and would want a fresh
blind attack on a sample, but the attack's own logic is weaker here — the
blind solver never sees the line, so editing the line cannot change a blind
margin. **Recommended for the 18 at ≥2.** Cost: one authoring pass, one
verification pass, one re-render of the machine checks (the kill rationales
are quote-anchored to the line and every one of them would need re-anchoring
— 4 per item, 72 strings).

**(c) Tighten the arguable OPTION.** Directly breaks the invariant on the
axis it was written to protect, on items whose blind evidence is per-cohort
rather than per-item, and the grader names the right option only ~40% of the
time (§3) — so a model-driven option rewrite would edit the wrong option in
most cases. **Not recommended** except where a human has read the item and
named the rival himself: that is the 5 items with review rows, plus the 2
pre-existing defects already repaired at ship time by exactly this method.

**(d) Do nothing and record it.** Defensible on the evidence that the cohort
is not guessable (human blind 20.0% vs 25.0% control) and that a defensible
second answer costs a student one item, not a section. But a quarter of a
live cohort having two answers is a quality claim the bank cannot make, and
the register already carries the finding.

**Recommended order.** (1) Put the 18 at ≥2 in front of the human reviewer as
a second sitting, verdict-only — no blind stage needed, ~20 minutes — because
the grader is calibrated as a screen and not as an adjudicator, and his
labels are what the screen was calibrated against. (2) Apply (b) to whatever
he confirms. (3) Leave the 10 that are ≥1-only unrepaired but recorded; at a
10% false-flag rate most of them are noise. (4) Add the with-source
exclusivity pass to the CR pipeline permanently, as AT-V2 already has it —
this cohort is the evidence for why it is mandatory, and the AT-V2 rate is
the evidence that it works.

## 8. Files

    EXCLUSIVITY-GRADER-BRIEF.md          the frozen task definition (quoted to every grader)
    exclusivity-render.mjs               fixture / crv7 / atv2 key-blind inputs; owns the decode
    exclusivity-score.mjs                cal (confusion matrix + permutation) | pop (flag rates)
    exclusivity-fixture.json             40 human-labelled rows, decoded
    exclusivity-cal-input.json           key-blind calibration input
    exclusivity-cal-grader{A,B,C}.json   calibration verdicts
    exclusivity-crv7-input.json/-key.json    132 live items, key-blind + key map
    exclusivity-crv7-grader{A,B,C}.json  population verdicts (merged from 3 chunks each)
    exclusivity-crv7-verdicts.json       PER-ITEM RESULT, 132 rows
    exclusivity-atv2-input.json/-key.json    162 cleared items
    exclusivity-atv2-grader{A,B,C}.json  AT-V2 verdicts
