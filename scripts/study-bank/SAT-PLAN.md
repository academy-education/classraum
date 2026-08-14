# SAT — what is left, and the order to do it in

Written 2026-08-14, after TOEFL's item bank was closed out and after the
calibration experiment established that the human sitting cannot be
automated (`CALIBRATION-SOLVER-RESULT.md`).

## The position

**1,571 live SAT items. Zero valid human measurements.**

| cohort | items | share of a test | AI attack | human |
|---|---|---|---|---|
| Information and Ideas | 240 | 26% of R&W | 100% | — |
| Standard English Conventions | 234 | 26% of R&W | 52.8% | none usable |
| Geometry and Trigonometry | 219 | 15% of Math | 100% | — |
| Craft and Structure | 211 | 28% of R&W | 97.4% | none usable |
| Problem-Solving and Data Analysis | 211 | 15% of Math | 100% | — |
| Algebra | 199 | 35% of Math | 100% | — |
| Advanced Math | 191 | 35% of Math | 100% | — |
| Expression of Ideas | 66 | 20% of R&W | 100% | — |

Every cohort ships to students in every assembled test — the blueprint
gives each a substantial share — so exposure does not prioritise
anything. Size and checkability do.

## The two facts that shape the plan

**1. The ~100% AI attack column does NOT mean these are broken.**
Announcement also scored 100% on the attack and was then CLEARED by a
human at 15%. Tonight's calibration measured why: the attack
anti-correlates with human blind performance (phi −0.13 per item, r
−0.64 per cohort). It is a ceiling detector — it finds what a *model*
can crack. **SAT is unmeasured, not condemned.** Do not rewrite anything
on the strength of that column.

**2. Math and R&W need different instruments.**

- **Math (820 items)** — defects have been ARITHMETIC. The derivational
  hub was decidable, and checking the whole population beat sampling it
  (`MATH-HUB-RESULT.md`: 98.3% in one authoring cohort, 8.0% everywhere
  else — acting on the sampled figure would have rewritten ~690 sound
  items). A wrong Math item is provably wrong. No human required.
- **R&W (751 items)** — defects are SEMANTIC. Five structural proxies
  have been built and all five failed to generalise; the sixth (a
  handicapped solver) failed tonight. Only a person reading the options
  has ever ranked these correctly.

So: **Math by exact checking, R&W by human sitting.** Half the SAT bank
can be cleared without spending anyone's evening.

---

## Phase 0 — unblock the instrument · YOURS · 20 minutes

**B4, the calibration sitting.** Already drawn as
`calibration-2026-08-11`; support@ presses Resume and touches nothing.

Everything in Phase 2 depends on it. Four of eight sittings so far were
thrown away for procedural reasons, and nothing has ever checked that the
reader works. Running R&W sittings before this is spending a co-founder's
time on numbers that may not be interpretable.

## Phase 1 — Math, by exact checking · MINE · no human, no approval

820 items across Algebra, Advanced Math, PSDA, Geometry. Each check is a
script, runs over the WHOLE population, and is self-tested against data
whose answer is already known before being pointed at data that is not.

1. **Answer computability.** Does the stated answer actually follow from
   the stem? Anything that cannot be verified symbolically gets flagged
   for reading, not deleted.
2. **Derivational hub, remaining cohorts.** `check-math-hub.mjs` exists
   and settled 820 items for one defect; confirm it has been run over all
   four Math cohorts rather than the two it was built for.
3. **Distractor derivability.** A good SAT distractor is the answer you
   get from a specific plausible slip. One that is arbitrary is
   eliminable without doing the maths — the arithmetic analogue of the
   Choose a Response roster tell.
4. **Near-duplicate stems.** Two items differing only in constants make a
   test that measures one thing twice.

Each produces a RESULT.md with a number, including the negatives.

## Phase 2 — R&W, by sitting · YOURS · 20 minutes each, one at a time

Four cohorts, ~80 minutes of co-founder time total, spread out. Order is
by items at risk, largest first:

1. **Information and Ideas** — 240 items, never read
2. **Standard English Conventions** — 234 items, never validly read
3. **Craft and Structure** — 211 items, never read
4. **Expression of Ideas** — 66 items, never read

Run each per `SITTING-PROCEDURE.md`: one run, drawn in advance, the
reviewer presses Resume and does not touch the cohort dropdown. Score
with `score-sweep-run.mjs`, per cohort, never blended.

**Decision rule, fixed now rather than after the number arrives** (§5):
per cohort, against that cohort's own best-single-letter control —
within ~10 points is clean, 10–25 is inconclusive and needs more items
(not more argument), over 25 leaks.

## Phase 3 — act, only where both instruments agree

Where a sitting says leaks, repair. Where the sitting and the AI attack
disagree, **the human wins** — that finding is from 2026-08-06 and has
held every time since, and tonight's calibration explains why.

---

## What this plan deliberately does NOT do

- **No seventh proxy.** Five structural checks and one handicapped solver
  have failed. The blind attack stays as a cheap pre-flight; it never
  substitutes for a reading. Recorded in
  `OPTION-BALANCE-RESULT.md` and `CALIBRATION-SOLVER-RESULT.md`.
- **No rewriting on the strength of the AI column.** See fact 1. The Math
  hub is the cautionary tale: a real defect, a real number, and acting on
  it bank-wide would have damaged ~690 sound items.
- **No sampling where exact checking is possible.** Math defects are
  decidable; check the population.

## Open question, not decided here

The generator authors SAT items with `gpt-4.1`, and Andy has asked that
GPT not be used in sessions going forward. Whether the production
authoring path also moves to Claude is a cost/quality decision with a
re-validation cost attached — every check above would need re-running
against newly authored items. Flagged, not assumed.
