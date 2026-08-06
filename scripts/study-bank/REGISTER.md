# Question bank register — the one list

**Everything outstanding on the bank, in one place. If a fix uncovers
something new, it goes in §5 of THIS file in the same commit as the
fix.** Findings scattered across commit messages and result docs are
findings nobody reads.

Last updated 2026-08-06. Live items: 3,341.

---

## 1. Where every cohort actually stands

`blind` = 3 AI solvers, source withheld, vs a 25% control.
`human` = a real reviewer, same protocol. Where the two disagree, the
human wins — that is the whole finding of 2026-08-06.

| test | cohort | items | blind | human | state |
|---|---|---|---|---|---|
| TOEFL | Academic Passage | 435 | 100% | 41.7% (n=12) | model says broken, human says maybe — **needs 8 more** |
| TOEFL | Academic Talk | 275 | 100% | — | **unconfirmed** |
| SAT | Information and Ideas | 240 | 100% | — | **unconfirmed** |
| SAT | Standard English Conventions | 234 | 52.8% | — | in band, spot-checked only |
| SAT | Geometry and Trigonometry | 219 | 100% | — | **unconfirmed** |
| SAT | Craft and Structure | 211 | 97.4% | — | **unconfirmed** (52 measured — the best-covered cohort) |
| SAT | Problem-Solving and Data Analysis | 211 | 100% | — | **unconfirmed** |
| SAT | Algebra | 199 | 100% | — | **unconfirmed** |
| TOEFL | Conversation | 193 | 83.3% | — | **unconfirmed** |
| SAT | Advanced Math | 191 | 100% | — | **unconfirmed** |
| TOEFL | Daily Life | 133 | 100% | 25.0% (n=20) | **CLEARED by hand** — model was wrong |
| TOEFL | Announcement | 121 | 100% | 15.0% (n=20) | **CLEARED by hand** — model was wrong |
| TOEFL | Build a Sentence | 119 | — | — | never measured, attack N/A |
| TOEFL | Listen and Repeat | 97 | — | — | never measured, attack N/A |
| TOEFL | Complete the Words | 93 | — | — | never measured, attack N/A |
| TOEFL | Academic Discussion | 92 | — | — | never measured, attack N/A |
| TOEFL | Email | 92 | — | — | never measured, attack N/A |
| TOEFL | Choose a Response | 72 | 92.3% | **55.0% (n=20)** | **CONFIRMED BROKEN**, both instruments agree |
| SAT | Expression of Ideas | 66 | 100% | — | **unconfirmed** |
| TOEFL | Interview | 48 | — | — | never measured, attack N/A |

**Read this row-by-row and the shape is clear:** one cohort is confirmed
broken (72 items). Two are confirmed fine (254 items). Everything else
is a model suspicion nobody has checked — and on the two cohorts we DID
check, the model was wrong both times.

## 2. Open work — mine, no permission needed

| # | what | size | why it matters |
|---|---|---|---|
| A1 | "space permitting" misused across Daily Life | 36 items / 25 passages | English quality in an English product. Not a leak. Pair with A2 so the cohort is edited once. |
| A2 | Pronoun ambiguity in item 9c6944db ("their roommate") | 1 line | The thing the reviewer actually tripped on. NOT a re-key — the key is sound. |
| A3 | Rebuild Choose a Response | 72 items | The only confirmed-broken cohort. 3 rounds failed; start from crv2 items 1, 4, 10, 14 (the four that passed both gates). |
| A4 | A gate for the 541 never-measured items | 6 cohorts | Build a Sentence / Listen and Repeat / Complete the Words / Email / Academic Discussion / Interview have no options to withhold, so the blind attack does not apply. They have never been checked by anything. |
| A5 | Deepen the Daily Life reading pool | pool is 35 texts | Repetition risk across forms. |

## 3. Open work — needs you

| # | what | cost | unblocks |
|---|---|---|---|
| B1 | **One overlapping sitting by a second reviewer** | ~20 min | Everything. Every human number rests on one person; `reviewerAgreement` is built and reports an honest empty state until this exists. If two readers scatter, the +30.0 on Choose a Response was that reader's habit and A3 is cancelled. |
| B2 | Sittings on Academic Talk + Craft and Structure | ~20 min each | ~486 items currently "unconfirmed". Given Daily Life and Announcement both came back clean, these plausibly are too. |
| B3 | TestFlight device pass, iOS 1.0.4 | — | unrelated to the bank, still open |

## 4. Settled — do not redo these

- **SAT Math derivational hub.** Claimed "bank-wide 64.4%"; was 131 items of 820. All repaired, both cohorts now BELOW chance. → `MATH-HUB-RESULT.md`
- **The elimination gate cannot replace the blind attack.** Fires on 3 of 32 items in a repaired batch. → `CRV3-RESULT.md`
- **The option-balance check does not work.** Predicted a 2.7pt spread across batches spanning +14.6 to +40.4. → `OPTION-BALANCE-RESULT.md`
- **Figures do not leak their answers.** 0 of 164 graphics, with a 7-fixture self-test proving the checker fires. → `check-graphic-leak.mjs`
- **Reviews are now bound to the content they judged.** Migration 076 applied; scoring reads `study_item_reviews_fresh`.
- **The grader is not calibrated and cannot be from public data.** Two scored ETS samples exist for our task types. Do not tune against them.

## 5. Found while fixing

*Append here, in the same commit as the work that surfaced it. Do not
put a new finding only in a commit message.*

- **2026-08-06** — "space permitting" reported on 3 items, actually 36
  across 25 passages (27% of Daily Life). One phrase doing the work of
  five; `time permitting` appears 0 times. → A1
- **2026-08-06** — the reported mis-key is not one. The objection turns
  on an ambiguous pronoun, not a wrong answer. → A2
- **2026-08-06** — the near-duplicate pair lives in the REJECTED
  `choose-response-repair-v1`, never inserted. Rolled into A3.
- **2026-08-06** — the review GET had `.limit(5000)` with a comment
  claiming it defeated PostgREST's 1000-row cap. It does not. Fixed.
- **2026-08-06** — the apply script globbed `math-hub-*.json`, so new
  files with that prefix were silently pulled into unrelated runs.
  Now takes an explicit `--file`.

## 6. The rule that keeps this honest

A cohort is **not** clean because the cheap checks passed. Five
structural proxies have been built (letter spread, length rank,
punctuation asymmetry, concessive pivot, option-family balance); each
caught the tell it was built for and none caught the next. The blind
attack is the gate, a human sitting is the confirmation, and the
structural checks are pre-flight only. See CLAUDE.md.
