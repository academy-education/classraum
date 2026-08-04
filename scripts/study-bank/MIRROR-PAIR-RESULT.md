# Mirror-pair pilot — 20 items, 2026-08-03

**Question it was run to answer:** can the ~1,092 compromised TOEFL MC
items be REPAIRED by re-authoring their options, or must they be
rewritten from scratch?

**Answer: repairable, but not by the fix we thought.** The pilot
separated two leaks that every previous run had confounded. One is
fully solved by the design. The other is untouched by it, and it is the
expensive one.

---

## Design

10 pairs = 20 items. Both members of a pair carry the **identical four
options, verbatim**, and the identical stem. Only the audio differs, and
it selects a **different key**. So "which option is the key" is, by
construction, unrecoverable from the option set — every option is the
key in some item.

Items were shuffled and re-lettered per item before solving, so pair
members were not adjacent and letter position carried nothing. Three
independent blind solvers answered with the audio withheld.

Best fixed-letter control: **30%**. Chance: 25%.

## Headline number, and why it is misleading

    solver a  10/20 = 50%
    solver b  10/20 = 50%
    solver c  10/20 = 50%

All three identical, which is the tell that this is structural rather
than a measurement. The per-pair breakdown explains it completely:

    solver   both-right pairs   one-right   zero   picked SAME option for both members
    a               0              10         0                 10/10
    b               0              10         0                 10/10
    c               0              10         0                 10/10

Every solver picked **one option and used it for both members of the
pair**. In a mirror pair that forces exactly one hit out of two — 50%
— with no knowledge whatsoever. The 50% is an artifact of the design,
not evidence of a leak.

Solver C independently noticed the pair structure and reported it
unprompted, which is worth recording: the pairs are spottable when both
members share a stem, so a production version must vary the stem
wording between members.

## What the pilot actually establishes

### 1. The "which option is the key" leak is GONE. ✅

**0 of 10 pairs, for all three solvers**, had both members correct.
Getting both right requires telling the two audios apart, which is
exactly the ability the attack is meant to detect. Chance expectation
for both-right is 6.25% per pair (~0.6 of 10); observed is 0.

Blind solvers have **no** ability to say which member is which. That is
the strongest possible result on this axis, and it means the
mutation-from-the-key defect *is* fixable by authoring.

### 2. A DIFFERENT leak is fully intact. ❌

In each pair, 2 of the 4 options are "live" (the key in one member) and
2 are pure filler (never correct). Picking blind, a solver should land
on a live option **50%** of the time.

    Observed: 10/10 pairs, for solver a, b AND c.
    P(10/10 by chance) = 0.5^10 = 0.098% per solver.

The solvers cannot tell which key goes with which audio — but they can
tell, essentially perfectly, **which two options are even candidates**.
The filler distractors are recognisable as filler.

This is the original defect wearing a different hat. It was invisible
before because it was masked by the stronger key-identification leak.

### 3. It is not a crude surface tell

Live options are only +3.2 characters / +1.0 words longer than filler on
average, and "always pick the longest" reproduces the effect in 8/10
pairs, not 10/10. So this is not fixable by a length rule or any other
mechanical normalisation — the solvers are reading **plausibility**.

---

## What this means for the ~1,092 items

**Do not rewrite them from scratch.** Result 1 shows the content is
salvageable: when the option set genuinely cannot identify the key, the
solvers are at zero.

**Do not ship a distractor-shuffling repair either.** Result 2 shows
that re-arranging or de-correlating options does nothing about the real
problem: two of the four options do not read like possible answers.

**The actual work is:** every distractor must be independently
plausible — a claim a competent test-taker could believe *until they
hear the audio*. That is per-item authoring judgement, not a
transformation that can be applied in bulk, and it is the same cost
whether we call it "repair" or "rewrite". The saving versus a full
rewrite is that the stems, audio, and keys survive.

## Recommended gate for the repaired batch

Score the repaired items as **mirror pairs**, and gate on the two
statistics separately, because they fail independently:

1. **both-right pairs ≤ 1 in 10** (key-identification leak) — this
   pilot achieved 0.
2. **live-option hit rate ≤ 65%** (candidate-identification leak) —
   this pilot scored 100% and would fail.

Gate 2 is the new one, and no existing script measures it. It is worth
adding before any repaired batch is authored, or the batch will be
graded by a check that cannot see its most likely defect.

## Caveats

- n=10 pairs. Result 1 (0/30 both-right) is decisive at this size;
  result 2 (30/30 live hits) is significant at p≈0.001 per solver.
- Solvers are the same model family and not statistically independent.
  Both results are so far from chance that this does not change the
  conclusion, but a larger repair batch should use mixed solvers.
- Items were authored by the same author who designed the test. That is
  a genuine bias for result 2 — my filler distractors may be worse than
  the bank's. It cannot inflate result 1, which is a *negative* finding.

## Artifacts

    mirror-pairs-v1.json              the 20 items with audio + keys
    mirror-pairs-v1.mp-blind.json     what the solvers saw
    mirror-pairs-v1.mp-key.json       shuffled key
    mirror-pairs-v1.mp-solver-[abc].json

---

# Bank-wide sweep — 2026-08-03, same day

Ran the new repeatable loop (`attack-cohort.mjs`) across every cohort,
12 items each, 3 blind solvers. Results are in `study_item_attacks`;
`attack-cohort.mjs report` reproduces this table from the database.

    family  domain                             items  attacked  blind%
    toefl   Academic Passage                     433        12   100
    toefl   Academic Talk                        274        12   100
    sat     Information and Ideas                240        12   100
    sat     Geometry and Trigonometry            225        12   100
    sat     Problem-Solving and Data Analysis    211        12   100
    sat     Advanced Math                        207        12   100
    sat     Algebra                              205        12   100
    sat     Expression of Ideas                   66        12   100
    toefl   Daily Life                           133        12   100
    toefl   Announcement                         121        12   100
    sat     Craft and Structure                  211        52  97.4
    toefl   Choose a Response                     71        12  91.7
    toefl   Conversation                         193        12  83.3
    sat     Standard English Conventions         234        12  52.8

**Twelve of fourteen measured cohorts score 100% blind.** Controls run
28.9–37.5%. This is not a TOEFL problem or a verbal problem; it is the
whole multiple-choice bank.

## Two readings that are NOT supported

**"SAT Math is fine because it was repaired."** It is not. Algebra,
Advanced Math, Geometry, and Problem-Solving all score 100% blind here.
The earlier repair fixed the *derivational hub* defect in 96 specific
items and drove that measured sample to 23.6%. The rest of SAT Math was
never re-measured, and now that it has been, it fails.

**"Standard English Conventions is the healthy one."** 52.8% is the
lowest score but probably not evidence of quality. SEC is grammar and
punctuation: only 179 of 234 items carry a passage at all, and those
average 125 characters against 750 for Craft and Structure. For a
"which punctuation is correct" item the sentence lives in the stem and
the skill is knowing the rule — there is no withheld source in the
sense the attack assumes. **The attack is the wrong instrument for this
cohort**, and its number should not be read as either pass or fail.

That distinction matters generally: the attack measures "is the source
doing work", so it only applies where a source is doing work.

## What is still unmeasured, and why

541 TOEFL items in six cohorts (Build a Sentence, Listen and Repeat,
Complete the Words, Academic Discussion, Email, Interview) have no
multiple-choice options at all. `prepare` correctly skipped them. They
need a different check entirely — the attack has nothing to withhold
and nothing to shuffle.

3,157 of 3,369 items (93.7%) remain unmeasured, but the sample is now
broad enough that the per-cohort rate is unlikely to be a sampling
artifact: 12 items at 100% across 12 independent cohorts is not a run
of bad luck.

## The conclusion this forces

Repairing is no longer a sensible frame. At a ~95%+ blind rate across
every passage-dependent cohort, the defect is in the GENERATOR, and the
items are downstream of it. The order has to be:

1. Fix the authoring brief — distractors independently plausible, which
   the mirror-pair pilot showed is the live failure and is not
   achievable by care alone.
2. Gate on both statistics before anything is written to the bank.
3. Regenerate a SMALL verified-clean set and ship that.
4. Archive the rest rather than repairing it.

Producing ~400 good items per exam behind a working gate is now
cheaper, and far more certain, than attempting to rescue 3,369.
