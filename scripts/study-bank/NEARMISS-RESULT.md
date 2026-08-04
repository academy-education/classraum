# Near-miss pilot — 16 items, 2026-08-04

**Question:** three constructions have been eliminated (mutations of the
key, options borrowed from unrelated items, a shared rotated option set).
Each failed by being a CONSTRUCTION. So: abandon construction, author 16
independent items by hand, each distractor a correct reply to a
neighbouring utterance the speaker could plausibly have made.

**Answer: it failed worse than the bank it was meant to improve on.**

---

## Both gates, measured

| | blind margin | with-source |
|---|---|---|
| live bank (choose_response) | +40.4 FAIL | — |
| rotation-v1 | +2.1 pass | 81.3% word-matchable FAIL |
| **nearmiss-v1** | **+66.7 FAIL** | **2 of 16 broken, 4 word-matchable** |

### Blind gate — catastrophic

3 solvers, 16 items, control 25.0% (key letters flat by design, A:4 B:4
C:4 D:4).

    solver A  15/16 = 93.8%   confident 9/9    spread 3/4/4/5
    solver B  14/16 = 87.5%   confident 9/9    spread 3/5/3/5
    solver C  15/16 = 93.8%   confident 8/8    spread 3/4/4/5
    MEAN 91.7%  ->  margin +66.7

**26 confident picks, 26 correct.** Spreads nearly identical across the
three — the signature of a shared rule, not three readers guessing.

All three independently derived the SAME elimination rule from the
options alone, with no stimulus:

    drop the over-affirming option  (booster + absolute: "Great — ... definitely / as I like / end to end")
    drop the over-rejecting option
    drop the one asking what the utterance already supplied
    keep the measured survivor  <- the key

Two of the three added a POSITIVE tell: the key is the option naming the
most specific constraint.

That is the authoring pattern, read straight off the page.

### With-source gate — 2 readers, converging

Reader X: 3 obvious / 13 inference, 7 of 16 with defensible alternatives.
Reader Y: 3 obvious / 13 inference, 6 of 16 with defensible alternatives.
Independently, both named the same central defect.

- **Item 10 is broken** (both readers). C and D are two correct answers
  separated only by a preference the stimulus never states.
- **Item 16 is the same defect, milder** (both readers).
- **Item 7's key is arguably wrong** (both readers): "somewhere, even if
  it's an appendix" concedes the appendix as the FLOOR, so keying "add
  them as an appendix" rewards echoing the word over reading the
  concession, and marks the better answer wrong.
- **Item 12's key** — "What's the funding decided on, separately?" — is
  barely grammatical (X).
- **Word-matchable: 14, 7, 10** (both), i.e. 3-4 of 16. My mechanical
  gate `check-lexical-anchor.mjs` scored the batch at 26.6% vs 25.0%
  chance and called it clean. Second time that gate has under-reported.
  It stays demoted; do not use it as a pass.

## The cause, in the readers' words

Reader X:

> all 16 are the *same item*. Every stimulus is a two-clause concession
> — "X is fine, **but/though** Y" — and in all 16 the key is "responds to
> Y, not X". A candidate who notices "find the concession, answer the
> concession" clears all 16 without processing the content.

Reader Y, independently:

> Every single stimulus is the same rhetorical shape: assertion +
> *but/though* + qualifier. Sixteen for sixteen. A real form varies —
> some items are plain requests, offers, complaints, or
> misunderstandings with no concessive pivot at all.

`CHOOSE-A-RESPONSE-BRIEF.md` line 51 already says **"Vary the
load-bearing element — this is the rule that matters most."** I wrote
sixteen concessions. The rule was on the page and the batch violated it
anyway, because nothing checked it.

## A second batch-level tell, on an axis nobody was watching

Reader Y only:

> The idiom is British, uniformly — "a fortnight", "I'll chase them",
> "mind" as a tag, "practise", "out of interest", "I'd not leave it that
> late". TOEFL is North-American-normed; no real form has fourteen
> British-flavoured stimuli in a row.

This does not affect guessability. It makes the items unusable as TOEFL
regardless, and it is the same failure with a different variable: one
author, one voice, sixteen items.

Y also found a sub-template: items 5, 6, 10 and 16 are all hedged offers
where the key is fixed by the AUTHOR'S assumption about what the
responder wants, not by anything in the utterance. That heuristic —
"when the speaker hedges, defer to the hedge" — solves 5, 6 and 16
without listening, and is exactly what makes 10 unanswerable.

## What this licenses

This is the **fourth** recorded instance of one failure in this bank:

1. key in slot A, 73% of a cohort         (letters)
2. every 4-set a complete ABCD permutation (structure)
3. identical key PROSE across 8 lectures   (wording)
4. **identical rhetorical SHAPE across 16 items** (this)

Each was invisible to the checker built for the previous one, because
each sits one abstraction level higher. Careful per-item authoring does
not help — this batch was hand-authored with more care than any
previous one and scored worst.

**Do not propose a fifth construction.** The next thing to build is a
mechanical batch-level variety check, run BEFORE any solver:

- cap items per speech act (concession / plain request / offer /
  complaint / correction / misunderstanding) at ~3 of 16
- flag a shared syntactic pivot appearing in more than a third of stimuli
- flag regional-idiom clustering

Cheap, no tokens, and it would have killed this batch before three
solvers were spent on it — the same way the key-letter spread check now
kills a batch before anyone reads it.

## Addendum, same day: the tell is already in the shipped bank

Building that check produced a bigger finding than the check.

The first version used the live Choose a Response cohort as its
control, on a narrow regex (`but|though|although|however`), which scored
live 45.1% vs nearmiss 100% — a clean-looking discrimination. **Both
numbers were wrong in the same direction.**

A labeller given both corpora UNMARKED, asked to label each stimulus by
rhetorical shape semantically, returned:

|  | narrow regex | wide pivot | labelled CONCESSION |
|---|---|---|---|
| live bank (n=71) | 45.1% | **94.4%** | 50.7% |
| nearmiss-v1 (n=16) | 56.3% | **100.0%** | 100.0% |

The 94.4% was then re-derived directly in SQL, independently of the
labeller, and came back 67 of 71.

The labeller's note on why the semantic label undercounts:

> The non-concession labels are largely decoration: the COMPLAINTs all
> open with a concessive softener ("I don't want to make a fuss, but",
> "Not a big deal, but", "I'm not trying to make a thing of it, but"),
> which is the same surface shape wearing a different illocution.
> A candidate whose whole strategy is "locate the second half after the
> pivot and answer that" is on-template for ~90% of the bank.

So the live cohort is **not a control**. It has the same defect at ~94%,
and this is the first named, mechanically checkable candidate cause for
that cohort's +40.4 blind margin. Two further uniformities in the live
cohort, same family:

- **BrE idiom in ~15% of stimuli** (invigilator, enrolment, "when your
  chemistry final sits", groundsman/pitch) in a North-American-normed
  test. My regex reported 0 because those words sit outside its list.
- **Names are 100% non-Anglo** across 11 distinct names. Per the
  labeller: "as engineered as one that is 100% Anglo; it reads as a
  diversity requirement applied per-item rather than a plausible
  population."

Consequence for `check-batch-variety.mjs`: its thresholds are NOT
calibrated against a known-good corpus, because we do not have one — the
ETS baseline run (ledger.json, n=30) kept the scores and discarded the
item text. A FAIL from it is informative; a PASS is unproven.

**Getting ~30 official ETS reply stimuli stored is now the highest-value
next step in this whole QC**, because without a clean corpus every gate
in this directory is calibrated against defective material.

One signal worth keeping, from solver A: items 3, 4, 5, 7, 10, 11 and 12
have TWO options that are both measured accommodations of different
hidden constraints. That property is what defeats the elimination rule.
The nine solver A marked confident do not have it.
