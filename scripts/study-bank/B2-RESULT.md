# B2 — result

**Sat 2026-08-15 as `b2-all-cohorts-2026-08-15`. Scored 2026-09-01.**

The sitting sat unanalysed for 17 days. It is 100 items of the
co-founder's reading — roughly 100 minutes — and nothing had been read
off it. The register still listed B2 as open work while the run was
already in the database. This document exists so that cannot happen
again silently.

Scored against `B2-PREREGISTERED.md`, written 2026-08-09 before any
sitting existed. The rule is applied exactly as written: score is
correct ÷ items shown, "Can't tell" counts as not-correct, each cohort
judged on its own, thresholds not moved after seeing the numbers.

## Result

| cohort | human | verdict | model's blind claim |
|---|---|---|---|
| TOEFL / Academic Talk | **7/20 = 35%** | **CLEARED** | 100% |
| SAT / Craft and Structure | **8/20 = 40%** | **INCONCLUSIVE** | 97.4% |
| SAT / Information and Ideas | **8/20 = 40%** | **INCONCLUSIVE** | — |
| SAT / Standard English Conventions | **3/20 = 15%** | **CLEARED** | — |
| SAT / Expression of Ideas | **2/20 = 10%** | **CLEARED** | — |

Abstention was **0% on all five cohorts**. That is the number B4 was run
to repair — the three preceding sittings abstained at 92.5%, 95.0% and
70%. The instrument worked. Reported, not interpreted, per the
pre-registration.

## What this says

**The blind attack over-calls, and now for the fifth and sixth time.**
Academic Talk read as 100% guessable to a model shown only the options;
a person scored 35%, which is chance plus one standard error. Craft and
Structure read as 97.4%; a person scored 40%. The prior three cohorts
went the same way (Announcement 100 -> 15, Daily Life 100 -> 21,
Academic Passage 100 -> 42). The live hypothesis in the pre-registration
— that the blind attack is a SCREEN, not a verdict — is now supported by
six cohorts and contradicted by none.

**Two cohorts are not settled, and the rule says so.** 40% is in the
36–59% dead zone. The pre-registration anticipated exactly this
temptation and closed it in advance: *"If a cohort lands at 36%, it is
inconclusive, not basically cleared."* 40% is 3 items above chance at
n=20, where one item moves the score 5 points. It resolves with a SECOND
READER and nothing else.

**Academic Talk cleared on the boundary.** 7/20 is 35.0%, and the rule
is `≤ 35%`. One more correct answer would have made it inconclusive.
Recorded because a verdict that turns on a single item should never be
quoted later as though it were comfortable.

## What a second reader requires

Not the same person. `support@classraum.com` is the co-founder and holds
every human sitting on this bank; a second pass by him measures his own
consistency, not two readers — which is precisely how B1 died. A second
reader means Andy, on a THIRD account, because `andy.manager@gmail.com`
already holds the co-founder's B1 mirror despite its name.

Andy's only prior data point is 85% abstention on that mirror run, taken
under the old wording. Per the B4 note, calibration is per-reviewer, so
a first sitting by Andy needs its own calibration before its number
means anything.

## Provenance

- run `b2-all-cohorts-2026-08-15`, 100 rows, reviewer_kind `human`
- scored from `study_item_reviews` joined to `study_item_bank` on
  `item_id`, grouped by SAT `domain` (Craft and Structure spans Text
  Structure and Purpose, Cross-Text Connections and Words in Context —
  grouping by `subskill` would have split one cohort into three
  under-powered ones and produced a different verdict from the same data)
