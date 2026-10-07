# SSAT Reading WV6: co-founder read, pre-registered (2026-10-07)

**Committed before the run is drawn.**

## Context

**Owner's decision (2026-10-07):** the co-founder reads `ssat-reading-wv6` before anything is
released. Those are the 12 staged items, `verified=false` (`READING-BATCH-WV6-2026-10-07.md`).

## The run

| | |
|---|---|
| run id | `ssat-wv6-cofounder-2026-10-07` |
| reviewer | `support@classraum.com`, `6ca6edaf-4044-4eed-84e0-137ebd79a81d` |
| items | all 12 `ssat-reading-wv6` rows (`DRAW_COHORT=ssat-reading-wv6`, `DRAW_FAMILY=ssat`, domain Reading Comprehension) |
| tool | `draw-review-run.mjs`, with a flat five-wide key deal |

**Order:** `32521213` (P01-5, the attitude item the WV6 graders flagged) is **first**.
- `DRAW_FIRST` inserts its row before the others.
- The panel serves the next unanswered row without an explicit ORDER BY, so first-inserted is the
  practical guarantee, not a contract.
- The whole run is 12 items, about 15 minutes, and the note asks him to finish it.

**Procedure** (the existing review tool, `/admin/bank-qc?tab=review`):
- **Blind pick:** options only, no passage.
- **Second screen**, with the passage and key shown:
  - Only defensible / Another is also defensible / No unique answer;
  - Authentic / Authored.

## Release rule, per item

| his verdict on the item | outcome |
|---|---|
| **Only defensible** | **released**: `verified=true` on that row |
| **Another is also defensible** (flag) | **dropped**: `archived=true`, not repaired |
| **No unique answer / key is wrong** (reject) | **dropped**: `archived=true`, not repaired |
| not answered | stays staged (`verified=false`) until it is read |

**Other rules:**
- **Authentic / Authored is recorded, not a gate.** It feeds the next brief.
- **Blind score is information, not a gate.** It is reported against two lines:
  - the five-choice chance line, 20%;
  - the control derived from the actual deal (12 items over 5 slots gives at most 3 on one letter,
    so 25.0%).
- **Why the blind score cannot gate:** at n = 12, one person and options-only, the sampling noise is
  about ±23 points. The A/B options-only stages already decided guessability under the pre-registered
  bars.
- **Scoring:** `node scripts/study-bank/score-sweep-run.mjs ssat-wv6-cofounder-2026-10-07` and
  `bank-state.mjs sittings`, fresh reviews only.
- **A partially answered run** releases only the items he has marked "only defensible". Nothing else
  changes until he finishes.
- **Recorded, not acted on:** if he flags P01-5, that confirms the WV6 grader finding. If he passes
  it, the item is released like any other.

## What this read also decides (owner)

WV7 and later batches are written and staged meanwhile. **None is released until this read is in and
confirms the method.**

**"Confirms the method"** is read here as:
- at most 2 of the 12 items flagged or rejected;
- the flagged/rejected items, if any, do not include any of the 8 main-idea, detail, inference or
  purpose items.

If either condition fails, the method itself is reconsidered before any WV7+ release.
