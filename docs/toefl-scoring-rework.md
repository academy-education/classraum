# TOEFL scoring — revised plan

Written 2026-07-29, after reading the ETS technical manual. Supersedes
the plan sketched earlier the same day, which was built on third-party
descriptions of the new scale and got the structure wrong in three
places.

**Primary source:** *TOEFL iBT® Technical Manual*, Manna, Li,
Papageorgiou & Gu — TOEFL Research Series RR-106 / ETS Research Report
RR-25-12, October 2025. Free full text:
<https://files.eric.ed.gov/fulltext/EJ1487502.pdf>
(`pdftotext -layout` extracts it cleanly; WebFetch does not.)

---

## 1. What ETS actually does

### Score points per task (Table 2, §III-2)

| Section | Task | Items | Points each | Section raw |
|---|---|---|---|---|
| Reading | questions | 35 | 1, correct/incorrect | **0–35** |
| Listening | questions | 35 | 1, correct/incorrect | **0–35** |
| Writing | Build a Sentence | 10 | 1, correct/incorrect | 0–10 |
| | Write an Email | 1 | 0–5, rubric | 0–5 |
| | Academic Discussion | 1 | 0–5, rubric | 0–5 |
| | **total** | 12 | | **0–20** |
| Speaking | Listen and Repeat | 7 | **0–5, rubric** | 0–35 |
| | Take an Interview | 4 | 0–5, rubric | 0–20 |
| | **total** | 11 | | **0–55** |

Verbatim, §III-2:

> In the Writing section, all Build a Sentence questions are scored
> correct or incorrect, with 1 or 0 score points awarded respectively.
> Responses to the Write an Email and Write for an Academic Discussion
> tasks are scored on a scale from 0 to 5 score points according to
> criteria outlined in the scoring rubric. **Responses to all speaking
> tasks are assigned scores from 0 to 5 score points** based on criteria
> defined in the respective scoring rubric.

> Responses to the Write an Email and Write for an Academic Discussion
> in the Writing section, as well as all speaking tasks, are evaluated
> using **ETS proprietary AI scoring engines as well as human scoring**.

### Raw → band

- Reading/Listening: IRT true-score equating against a base form.
- Writing/Speaking: weighted equipercentile linking (Haberman, 2015).
- Bands are 1–6 in 0.5 steps; overall is the mean of the four sections.
- **There is no 0–30 section scale.** The string does not appear in the
  manual. It belongs to the pre-2026 test.

And explicitly, §III-1:

> the reported scores are not equal to the number or percentage of raw
> score points earned nor a simple common linear transformation of them.

So an exact reproduction is impossible without ETS's per-form conversion
tables, which are not published. Any raw→band map we ship is an
approximation and must be labelled as one.

---

## 2. Where we diverge

| # | Divergence | Severity |
|---|---|---|
| 1 | Listen and Repeat is key-matched right/wrong; ETS scores it 0–5 on the repetition rubric. 35 of Speaking's 55 points are mis-modelled. | **high** |
| 2 | `weightedScore` returns `total: 0` for open responses, so rubric points are excluded entirely — 100% of Speaking's raw score and 50% of Writing's. | **high** |
| 3 | Our raw model is percent-of-questions-correct; ETS's is a points total with unequal per-task weights. | **high** |
| 4 | The result screen shows a "Scaled score /30", a scale that no longer exists. | medium |
| 5 | Band comes from a linear percent map. Unavoidable approximation, but currently unlabelled. | medium |
| 6 | The rubric grader runs 1–2 bands harsh, measured against ETS's published samples (`scripts/calibrate-grader.ts`). | **high** |

Reading and Listening are correct: 1 point per question, 35 scored,
matching the manual exactly.

### Corrections to earlier claims in this repo's history

- Speaking has **no key-matched half**. Every item is rubric-scored. The
  "7 objective + 4 rubric" framing used throughout 2026-07-29 is wrong.
- The Speaking weighting is **published**, not a judgement call:
  35:20 = 63.6 : 36.4, which is exactly the 7:4 item-count ratio.
  Writing is 10:5:5 = 50:25:25, which item count would have got wrong.
  Neither heuristic generalises — ETS assigns points per task.

---

## 3. Plan

### Phase A — model the raw score as points *(no calibration needed)*

Replace percent-of-correct with a points total.

- Give every question type a `maxPoints`: 1 for Reading, Listening and
  Build a Sentence; 5 for Email, Academic Discussion, and **all**
  Speaking items.
- `rawEarned / rawMax` becomes the section proportion.
- Rubric bands feed `rawEarned` directly — this is what fixes divergence
  2, structurally, rather than by choosing a blend weight.
- Pilots keep their current treatment: excluded from both numerator and
  denominator.

Once this lands, the "weighting" question disappears. It was only ever a
question because we were adding two scales together; ETS just counts
points.

*Estimate: 1 day incl. tests. Blocked on nothing.*

### Phase B — score Listen and Repeat on its rubric

We already hold `LISTEN_REPEAT_BANDS`, taken from the official guide, and
never use it for scoring. Three options:

1. **Grade each item through the pipeline.** Faithful; costs 7 extra
   model calls per Speaking test.
2. **Deterministic transcript comparison.** The rubric is unusually
   mechanical (exact repetition = 5; one or two function words changed
   = 4; majority of content words = 3 …), so edit distance over content
   vs function words could approximate it at zero marginal cost.
3. **Keep binary, document the approximation.** Cheapest, least faithful.

Option 2 is worth prototyping first — it is the only one that is both
faithful and free, and it can be checked against option 1 on a sample.

*Estimate: 1–2 days depending on option. Blocked on nothing.*

### Phase C — band presentation

- Delete the `/30` row.
- Keep a linear raw→band map, labelled as our estimate, not ETS's.
- Keep the "how your score was built" card; it becomes more honest under
  Phase A, since every part then contributes.

*Estimate: half a day. Depends on A.*

### Phase D — grader calibration *(blocked)*

The measured 1–2 band harshness. Needs **20–30 scored responses spread
across bands 0–5**. Only two are public (Academic Discussion, Writing
Practice Set 4), and tuning against two would fit the grader to two
essays — see CLAUDE.md on batches built to one brief.

Sources, best first:

1. A paid TOEFL rater scoring ~25 real student responses.
2. TPO / TestReady exemplars.
3. Students self-reporting their real TOEFL bands (best long-term).

Until this lands, **do not** present a rubric-derived band as if it were
accurate, and do not let Phase A's improvement disguise the fact that the
inputs are still 1–2 bands low.

*Estimate: 1–2 days once samples exist.*

### Phase E — verification

- One end-to-end Speaking test on a real device. The recording panel,
  the authored interview sets and batch grading have each been verified
  in isolation and never together.
- `scripts/calibrate-grader.ts` must pass before Phase D is considered
  done. It currently exits 1, deliberately.

---

## 4. Order

```
A ──► C
│
B ──┘        (A and B are independent; both unblocked today)

D ──► (gate on Phase A improvements being trustworthy)

E — anytime, and cheap
```

Do A and B now. C follows. D waits on samples. E whenever there is a
device to hand.

---

## 5. Open decisions

1. **Listen and Repeat scoring** — pipeline call, deterministic
   comparison, or documented approximation? (Phase B options above.)
2. **How to obtain calibration samples** — the only real blocker on
   Speaking and Writing being trustworthy.
3. **Whether to show a band at all before calibration**, or to show the
   raw points and withhold the band until it means something.
