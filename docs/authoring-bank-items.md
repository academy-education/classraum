# Authoring bank items

How to write questions that go into `study_item_bank` without breaking
something downstream. Every rule here exists because it was broken once;
the incident is named so you can judge whether the rule still applies.

Read this before commissioning a batch, and re-read the **Cross-item
tells** section before commissioning a *large* one.

---

## 0. Where items go, and who reads them

`study_item_bank` is the single pool. Both full mock tests and practice
draw from it — same table, same draw code (`src/lib/study/assemble.ts`),
same exposure ledger (`study_item_exposures`, keyed `student_id,
item_id`, no mode column). An item you add is visible to every mode at
once.

Practice covers only SAT Math, SAT Reading & Writing, and TOEFL Reading.
The other TOEFL sections are full-test-only because they need audio
(Listening) or free-response grading (Speaking, Writing).

Draw order is **unseen-first**, then oldest-seen recycled. Since
2026-07-29 there is a floor under that: if fewer than two thirds of a
requested set would be unseen, the route refuses with 409
`pool_exhausted` rather than dealing a mostly-repeat test — a full mock
costs credits and charging for a replay is not acceptable
(`src/lib/study/bank-coverage.ts`).

**Practical consequence for authoring:** a section needs enough items
that an active student does not hit that floor. One test's worth is not
a bank. Aim for at least ~10 non-overlapping sittings.

---

## 1. Required fields, and the ones that are silently unused

| Column | Required | Notes |
|---|---|---|
| `family`, `section` | yes | The draw filters on both. Must match the values the assemble route sends. |
| `item_type` | yes | Drives which renderer and which scorer runs. See §2. |
| `difficulty` | yes | `easy \| medium \| hard`. **Model-assigned, not measured.** See §6. |
| `verified` | yes | `false` items are never drawn. |
| `archived` | defaults false | Archived items stay for history; they are excluded from draws. |
| `item` (jsonb) | yes | The question itself. Shape depends on `item_type`. |
| `content_hash` | yes | Dedupe. The unique index on it is **PARTIAL** — `ON CONFLICT` on it raises 42P10. Dedupe explicitly in the seeding script instead. |
| `domain` | SAT only | Drives College-Board blueprint quotas. |
| `passage_group_id` | shared-passage items | **Unpopulated for TOEFL Reading/Listening today** — those group by passage content inside `item`. |
| `subskill`, `topic_tag` | no | Written by some scripts, read by nothing. Do not rely on them. |

**`domain`, `category`, `skill` are NULL on every stored TOEFL attempt.**
There is no per-item topic taxonomy for TOEFL. The result screen's
section breakdown therefore groups on the *bracketed prompt prefix*
instead — see §3.

---

## 2. Item types and how each is scored

Scoring lives in `src/lib/study/toefl-section-score.ts` (`scoreItem` is
the single per-item rule; the section total and the per-section
breakdown both call it — do not add a second implementation).

| `item_type` | Points | Scored by |
|---|---|---|
| `multiple_choice` | 1 | answer key |
| `fill_in_blanks` | 1 | per-blank key + `alternates` |
| `arrange_words` | 1 | exact order |
| `speaking_repeat` | 0–5 | deterministic, no model — `listen-repeat-accuracy.ts` |
| `speaking_interview` | 0–5 | AI rubric |
| `writing_email` | 0–5 | AI rubric |
| `writing_discussion` | 0–5 | AI rubric |

Reading and Listening are **one point per question, 0–35 raw**
(RR-25-12 Table 2). There is no 0–30 scale in the 2026 format; do not
reintroduce one.

Speaking and Writing use OUR weights, not ETS's:
Speaking `listen_repeat 0.40 / take_interview 0.60`;
Writing `build_a_sentence 0.20 / write_email 0.35 / academic_discussion 0.45`.
Deliberately different from ETS — this is a progress tracker, not a
score prediction. Changing the weights changes every historical
comparison, so treat it as a scoring change, not a tuning knob.

---

## 3. The bracketed prompt prefix is load-bearing

Every TOEFL prompt should start with a bracketed task label:

```
[Academic Talk — Geology] What does the professor mainly discuss?
[Conversation — Office hours] Why does the student visit the advisor?
[Academic — Art History] According to the passage, ...
```

The **first segment** is the taxonomy the result screen groups on. It
must come from a small, stable set per section:

- Listening: `Choose a Response`, `Conversation`, `Announcement`, `Academic Talk`
- Reading: `Academic`, `Daily Life`
- Speaking: `Listen and Repeat`, `Interview`
- Writing: `Build a Sentence`, `Email`, `Academic Discussion`

The **second segment** is free text and is *dropped* before grouping.
It was tried as a grouping key and produced 26 labels over 111 Listening
items — `Residence Hall` / `residence hall` / `Residence Hall Staff` as
three groups, Earth Science split by an em dash versus a hyphen.

Rules:
- Use an em dash (` — `) between segments. A hyphen is normalised too,
  but be consistent.
- **Do not mix labelled and unlabelled prompts in one section.** 38
  Reading items shipped without a prefix; they are the same task as the
  labelled ones, so they now fall into `omitted` rather than forming a
  fake "Multiple choice" group beside `Academic` and `Daily Life`. They
  are invisible in the breakdown. Label everything.

SAT prompts carry no prefix at all (0 of 547) and get no breakdown. If
you want one for SAT, the prefix convention has to be adopted there.

---

## 4. Answer keys and distractors

- **Shuffle the key position.** A hand-authored cohort put the key in
  slot A on 73% of items. `scripts/verify-answer-key-spread.ts` guards
  this — run it.
- **Never let a 4-question set be a complete ABCD permutation.** 78% of
  one cohort was, so three confident answers forced the fourth. The
  per-cohort histogram read as a perfect 25/25/25/25 while the tell was
  intact. Same script, per-group check.
- **That script gates on a minimum cohort size.** A 14-item cohort at
  50%-on-one-slot passed once. Small cohorts are not safe cohorts.
- Choice order is **re-shuffled per session at draw time**
  (`shuffleDrawnChoices`), so the served order deliberately differs from
  the bank's. Do not match served items to bank items by content hash.
- `distractor_rationales` are shown in review. Write them; a wrong
  answer with no explanation is a dead end.

---

## 5. Cross-item tells — the failure that keeps recurring

**The more rigid the authoring brief, the more the answer becomes
predictable from the brief rather than from the content.** Three
distinct tells have reached the bank, each invisible to the check
watching for the previous one:

1. Key in slot A (73%) — caught by a grader's remark.
2. Every 4-question set a complete ABCD permutation (78%).
3. **Identical key PROSE across lectures.** 32 items written to a rigid
   brief put the same option wording — "the lecturer is committed; the
   named critic neither way" — as the key in all 8 lectures. Letters
   were rotated, so both letter checks passed. A candidate who solves
   one answers eight without listening.

The third has no automated guard because the tell is semantic. When
commissioning a batch:

- Require the load-bearing element to **vary** across items. Let
  different parties be the committed one; let the survivor sometimes be
  the critic's narrowed claim.
- Ask a grader explicitly whether the answer is guessable **from the
  pattern across items**, not only from within one item.
- Vary authoring model and brief between cohorts. Claude-authored with
  gpt-4.1-as-checker beat gpt-4.1 authoring alone on SAT R&W.

---

## 6. Difficulty is a label, not a measurement

Every `difficulty` value is a model estimate or a computed proxy (word
count for Listen-and-Repeat, token count for Build-a-Sentence). None is
measured, and the live data shows it: SAT Math reads hard 31% / medium
28%, TOEFL Reading medium 6% / hard 15% — both inverted.

`difficulty` **is** live input to adaptive routing (`sat-adaptive.ts`,
`toefl-adaptive.ts` draw module 2 by `difficulty IN (...)`), and SAT's
scaled score is path-weighted, so the label indirectly moves future SAT
scores. It does **not** touch any TOEFL score — `scoreItem` never reads
it.

Decision as of 2026-07-29: **do not overwrite `difficulty` with measured
values.** When real p-values exist, add them as new columns and decide
the remap separately, with evidence.

`study_attempts.item_id` (migration 063) carries the bank row id so
per-item accuracy becomes computable. Today 163 attempts carry it,
across 163 distinct items — every item seen exactly once, so no p-value
is computable yet.

---

## 7. Before you call a batch done

Run these. A green check is evidence only if it would have failed.

```bash
npx tsx scripts/verify-answer-key-spread.ts      # key position + per-group permutation
npx tsx scripts/verify-section-breakdown.ts      # every session's rows reconcile with its score
npx tsx scripts/verify-listen-repeat.ts          # repeat scoring against real transcripts
npx jest                                         # 63 suites — check the SUITE count, not just green
```

Then, per `CLAUDE.md`:

1. **Revert the fix and confirm the check fails.** Per mechanism, not
   per feature.
2. **Ask what the check would miss.** A green test over truncated input
   passes loudly. PostgREST caps a plain `.select()` at **1000 rows** —
   a bank audit written that way read 152 items out of 751 and reported
   a clean result. Count in SQL, or paginate.
3. **Check the count, not just the colour.** A jest suite that dies at
   import collects zero tests and the run still prints other suites'
   passes.
4. **Verify against real data before believing a unit test.** Unit tests
   passed twice while the live bank was wrong.

---

## 8. Known gaps, so you do not rediscover them

- TOEFL Speaking is the thinnest section (145 usable) **and** has the
  worst cull rate: 58% of Listen-and-Repeat and 63% of Take-an-Interview
  items authored were archived. Budget for the rejection rate.
- `passage_group_id` is NULL for all TOEFL Reading/Listening bank rows.
  Grouping falls back to hashing the passage text inside `item`.
- No subject field is written, so "Art History vs Biology" performance
  cannot be reported. Adding one is a generator change and only helps
  tests taken *after* it ships.
- Flashcards exist for SAT only. See `docs/study-modes.md` for why
  Listening and Speaking do not get card decks.
