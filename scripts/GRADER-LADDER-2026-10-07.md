# Grader answer ladder: first run, 2026-10-07

**This is a consistency instrument, not a calibration.** Every intended
band is our own reading of the official ETS descriptors, applied to answers
we wrote. The numbers say whether the grader is consistent with that
reading. They do not say what an ETS rater would give. The offset is
relative to our ladder, not to ETS.

Owner decision 2026-10-07: build the ladder and do NOT change prompts,
rubrics, score mapping or labels to make these numbers move.

## What was run

- `npx tsx scripts/grader-ladder.ts --n=3 --concurrency=5`
  - production callbacks (`openAiStages()`: gpt-4o-mini for the gate and
    relevance stages, gpt-4o for quality)
  - prompt composed by `composeGraderPrompt(passage, prompt)`, as in
    production
- 6 prompts from our bank (`harvest-v1` generated Email and Discussion
  items, hand-authored Interview items), 46 ladder steps, 138 grades,
  183 s. No ETS material; the validator refuses any.
- Scope: the three task types the rubric grader scores
  (`RESPONSE_SKILL_BY_TYPE`). Listen and Repeat is deterministic and Build
  a Sentence is key-matched.
- **Speaking ran on the transcript path only**, with null speech signals.
  Delivery was not tested.

## Break-tests (no model calls)

| run | Spearman | Kendall | spread | hit rate |
|---|---|---|---|---|
| `--fake=oracle` | 1.00 | 1.00 | 0 | 138/138 |
| `--fake=oracle --shuffle-ladder=7` | −0.15 (83/142 pairs inverted) | −0.11 | 0 | 21/138 |
| `--fake=constant` (always 3) | undefined: no ordering information | undefined | 0 | 42/138 |

A constant grader still hits 30% to 48% of the time, depending on the
constant. So the runner prints the best constant grader's hit rate as a
control derived from the data. Only hits above that control count as
evidence.

## Results

| | Spearman | Kendall | inversions | flat pairs | steps with spread | hit rate | constant control | offset (vs OUR ladder) |
|---|---|---|---|---|---|---|---|---|
| Academic Discussion | 0.88 | 0.77 | 3/50 | 4/50 | 4/16 | 12/48 | 24/48 | −0.33 |
| Email | 0.90 | 0.83 | 0/50 | 10/50 | 2/16 | 15/48 | 24/48 | −0.31 |
| Interview (transcript) | 0.97 | 0.93 | 0/42 | 0/42 | 5/14 | 32/42 | 18/42 | −0.48 |
| all | 0.88 | 0.78 | 3/142 | 14/142 | 11/46 | 59/138 | 66/138 | −0.37 |

**Ordering is good. Band hits are not.** On Writing, the hit rate is below
the constant control.

## What the grader gets wrong, measured against our own descriptors

1. **The zero gate fires on answers that are not zeros, so Writing never
   gives a 1.**
   - All four fluent, mostly off-topic band-2 answers (`*-G`) scored 0
     on every repeat (`entirelyUnconnected`). `email-lee-G` also got
     `rejectsTopic`. That answer is close to our own "Weak — score 2,
     relevance failure" email anchor in `responseRubrics.ts`, so the
     grader and its own anchor disagree.
   - The band-1 borrowed-language answers (`*-H`) scored 0 in 10 of 12
     grades. The flag was `entirelyUnintelligible` or
     `entirelyUnconnected`, even though the phrases are intelligible
     and taken from the prompt itself.
   - `disc-tuition-H` went 0, 2, 2 across repeats, so the gate is also
     unstable at temperature 0.
2. **The timed-conditions allowance is not honoured.**
   - Three typos (`errors_timed`) took `disc-tuition` from 5,5,5 to
     4,4,4, and `email-lee` from 4,5,5 to 4,4,4.
   - The descriptor says those errors do NOT keep a response out of
     band 5. Invariance held on only 2 of 4 edges, and both of those
     anchors were already graded at or near 4, so the typos had nothing
     to cost.
3. **Email social conventions are close to ignored.**
   - The `*-D` steps (blunt "so I can't do it", an ultimatum, "Put us
     down for…", "Cheers") scored 4,4,4, the same as the polite
     plain-English `*-C`.
   - The relevance stage called them `fully_on_topic_well_elaborated`.
4. **Writing "frequent errors" lands at 3, not 2.**
   - Every `*-F` step scored 3 on every repeat, against the Writing band-2
     "one or more" rule.
   - Caveat: our F answers are error-dense but mostly recoverable, so
     "lapses sometimes obscure meaning" (band 3) is a defensible reading.
     This one is the closest call.
5. **A partly irrelevant Discussion post outscored a plain-English one.**
   - `disc-tuition-E` and `disc-ubi-E` replace one supporting point with
     a fluent tangent (intended 3). They got 4.00 and 3.67.
   - The plain-language `*-C` steps (intended 4) got 3.33. These are 2 of
     the 3 inversions.
   - Relevance is meant to be the gate, but here language weighed more
     than relevance.
6. **The grader sometimes produces no grade at all.**
   - `rubric_grade` failed schema validation 4 times: 3 on `email-lin-H`
     and 1 on `email-lee-D`. Retries recovered them.
   - Production does not retry, so a student would see a 502. This is a
     loud failure rather than a silent one, but it clusters at the bottom
     of the scale.
7. **Repeats are unstable at temperature 0.**
   - 11 of 46 answers moved between repeats: 9 by one band, and 2 by two
     bands (`disc-tuition-H` and `int-luxury-G`, both through a 0).
   - Anchors flip between 4 and 5 (`email-*-A`, `int-*-A`).
8. **Speaking orders well, and resolves every two-band call downward.**
   - Each half-band step (4.5, 3.5, 2.5) came back as the lower integer.
   - `int-luxury-E` (limited development plus limited language,
     intended 3) got 2,2,2.
   - Of the 12 Speaking edges, 3 were flat:
     - `int-occasion-B→C` (development, intended half a band)
     - `int-occasion-F→G` (language, under the relevance ceiling of 2)
     - `int-luxury-E→F` (relevance, because E had already dropped to 2)

## What it does NOT show

- Whether any band matches ETS. Only human-scored exemplars can show that.
- That our intended bands are right. Findings 4 and 5 rest on our reading
  of "frequent", "impede" and "part irrelevant". A human should check
  them before anyone acts.
- Delivery, or anything audio.
- That the findings generalise beyond 2 prompts per task type and N=3. All
  confidence is per step. Correlated repeats from one model are worth less
  than three independent raters.

## Rerunning

```
npx tsx scripts/grader-ladder.ts --dry
npx tsx scripts/grader-ladder.ts --n=3 --json=/tmp/ladder.json
npx tsx scripts/grader-ladder.ts --resume=/tmp/ladder.json --json=/tmp/ladder.json   # after a failure
```

The runner exits 1, after saving the raw grades, if any step is still
short of N after retries. It prints no statistics over a partial ladder.
Every failed attempt is listed under GRADER FAILURES with its stage.
