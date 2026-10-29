# Item statistics from real student attempts

`npx tsx scripts/study-bank/item-stats-report.ts [--section family/section] [--min-n 30] [--json]`

Pure logic: `src/lib/study/item-stats.ts` (tests: `src/lib/study/__tests__/item-stats.test.ts`, every guard
break-tested). **Reports only** — nothing here edits, hides, archives or releases an item.

## Why it exists

AMENDMENT-3-TRUST-LEVELS.md caps every stratum at L2 "until a second human ground truth exists", and names two:
a second reviewer, or **real students with at least 30 non-internal attempts on an audit sample**. The owner does
not want a second reviewer, so this is the only route past L2. It is built now so it is ready when real traffic is.

## What is counted

- Attempts with an `item_id` and a scored `is_correct`. Open responses and unscored pilots are skipped and counted.
- **Excluded first, before any statistic:** `users.is_internal = true` and `study_user_prefs.is_test_user = true`.
  When a team or test account is created, flag it immediately or it silently enters these numbers.
- **First attempt only** per student and item (a retake has seen the item).
- Every table is paged past PostgREST's 1000-row cap; the attempt total is asserted against an exact count, and a
  short read exits non-zero.
- Nothing flags below `--min-n` (default 30). Every stat carries its n.

## The statistics

| stat | meaning |
|---|---|
| n | counted first attempts |
| p | proportion correct |
| point-biserial | correlation between getting this item right and the student's score on the OTHER items in the same session (rest score) |
| D (27% index) | p in the top 27% by rest score minus p in the bottom 27% |
| choice distribution | how often each option text was chosen (choices are shuffled per session, so options are tracked by text) |
| median time | median seconds on the item |

## The flags

| flag | severity | what it usually means |
|---|---|---|
| `top_below_bottom` | high | the strongest students do worse than the weakest: miskeyed, or a second defensible option strong readers see |
| `distractor_beats_key_top` | high | the top group prefers one distractor: second defensible option or wrong key |
| `negative_discrimination` | high | same signal as point-biserial < 0 |
| `distractor_beats_key` | medium | a distractor beats the key overall: ambiguity, a trap that works too well, or a wrong key |
| `near_zero_discrimination` | medium | the item doesn't separate stronger from weaker students (guessable or broken) |
| `fast_correct` | medium | on a passage item, 20%+ of correct answers came faster than 0.3 x the section's median time: answerable without reading (the human-side version of the no-source attack) |
| `too_hard` / `too_easy` | low | p < 0.15 or p > 0.95: re-band, or check the key on very hard items |
| `unused_distractor` | low | an option almost nobody chooses (< 2%): a dead distractor makes the item effectively 3-choice |

Thresholds are options to `computeItemStats`; the defaults above are conventional item-analysis values.

## Proposed use as the Amendment 3 ground truth (NOT wired in; needs the owner and a new amendment)

- An item with n >= 30 real first attempts and a **high**-severity flag counts as a **miss** for its method, exactly
  like a would_block note from the co-founder, once a person confirms the flag is a defect (not a hard-but-fair item).
- A method whose sampled items reach n >= 30 with no high flag earns the evidence the amendment requires to consider
  lifting the L2 cap for that stratum.
- `fast_correct` on passage items feeds the authoring briefs the same way grader-named tells do.

## When it becomes meaningful

On the first run (2026-10-29): 8,247 attempts (= exact count); 32 excluded internal/test students (1,527
attempts); 16 counted students, 6,486 first attempts over 3,523 items; **largest per-item n = 7; 0 items reach 30.
Nothing can be measured yet.** It needs roughly 30 distinct real students to sit the same items, e.g. one full form
taken by 30+ real students. Confirm the 16 counted accounts are real students (several have 600-1,267 attempts since
August, which looks like heavy testing) and flag any that are not.
