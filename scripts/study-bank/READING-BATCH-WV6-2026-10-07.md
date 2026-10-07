# SSAT Upper Reading batch WV6 (2026-10-07): result

**ALL DECIDING STAGES PASS. 12 items inserted STAGED (`verified=false`) as cohort `ssat-reading-wv6`.**
Drawable SSAT Reading is unchanged at 138; 12 rows are staged. **Nothing is released.** A human read
is required first. A person decides, and for a verbal cohort the human sitting is the verdict (bank-gate §5).

The bars were relative to the live control (Stage A). Chain of commits:

| step | commit |
|---|---|
| pre-registration | `35b5bd43` |
| freeze | `5e4433e7` |
| draw and renders | `596d77f0` |

The construction is the owner-approved fix for WV5's failure.

## Stages

| stage | measure | candidate | bar | live (Stage A) | verdict |
|---|---|---|---|---|---|
| 0 | pre-flight: verify + A1 + direction lexicon + licensing pre-check | after one fix round | all clean | n/a | **PASS** |
| 1 | C exclusivity | **11/12** | >= 11/12 | 33/33 | **PASS** (at the bar) |
| 1 | Q distractor >= plausible | 38/96 = 39.6% | >= 4/96 | 6.1% | **PASS** |
| 1 | dead-by-both | 6/12 | <= 7/12 | 15/33 = 45.5% | **PASS** |
| 1 | F easy (reported) | **10/12** | not decidable | 32/33 | reported |
| 1 | pilot-pass (reported) | 0/12 | not decidable | 1/33 | reported |
| 2 | E naturalness | median **4.5** (n = 4; P01 3/4, P02 5/5) | >= live median | **2** (n = 14, same judges) | **PASS** |
| 3 | A options-only isolated | **4/30 = 13.3%** | <= control + 10 | in-run control 34/144 = 23.6% | **PASS** (margin -10.3) |
| 4 | B options-only grouped | 8/36 = 22.2% | <= 40% | n/a | **PASS** |

**Stage A details.** The exact null over the 5^2 version draws, with picks held fixed, has mean 20.0%
and P(>= observed) = 0.72. One candidate item was solved by every sample.

**Draw.** frozenSha `d8c0cc0c…`, recomputed with `shasum`. One unit drew v0 and the other v3. The
stored choice order is the Stage 1 render, with key slots ABCDECEDBADC.

**Stage 0, in detail.**

**Round 0** produced 23 mechanical problems:
- off-target kill quotes;
- one question-version that used only one lure kind;
- one stem word that also appeared in another question's choice.

It also produced 22 lexical A1 flags, of which A1 judged 0 absent. The licensing pre-check was 20/20
question-versions clean, by both judges.

**One fix round, using fresh fixers:**
- P01 changed quotes and lure labels, plus one choice reworded ("used" → "cited").
- P02 gained one shared clause in all five versions, needed because "soil" appeared nowhere in four
  of them.

Those edits made the judgements stale, so A1 and licensing were **re-run fresh** on the fixed units.
- A1: 0 absent.
- Licensing: 20/20 clean, by both judges.
- Both attitude sets passed the direction lexicon:
  - P01: admiring, indignant, regretful, detached, amused;
  - P02: admiring, critical, worried, detached, amused.

## What the owner's two fixes did

**Vocabulary: the fix held.**
- Both vocabulary items were exclusive in Stage 1:
  - P01-4, "struck a bargain" → concluded;
  - P02-4, "cover".
- The licensing pre-check found one sense per version on all 10 vocabulary question-versions, from
  both judges.
- WV5's "settled" failure did not recur.

**Attitude: half held.**
- P02-5 (drawn v0, admiring) was exclusive.
- **P01-5 (drawn v3, "detached") was NOT exclusive.** Both Stage 1 graders named "regretful" as a
  second defensible answer, because the narrator caused the missed winding.
- The licensing pre-check had cleared this exact version with both judges. Both judges *noted*
  regret as the nearest rival and still answered "none".
- So the pre-check under-fires on a "detached / flat narration" key. A key that is the absence of
  affect lets any affect the story implies become a rival.
- This is the one exclusivity miss, and it is why C sits exactly at its bar.

**For the human read, flagged:**
1. **P01-5 should be looked at first.** A person may reasonably drop it, or keep it only if they see
   one answer.
2. **"Detached" is a structurally weak attitude key.** Future briefs should not use the indifferent
   class as a key when the plot gives the narrator a reason to feel something.

## What else the reader should know

- **This batch is mostly easy.** F was 10/12 easy, against live's 32/33.
  - Both graders said the P02 answers are "stated almost word for word in the passage".
  - The bars allow this by construction: F is not decidable against a 97%-easy control at n = 12,
    as pre-registered.
  - It is better than live, and worse than WV5 (5/12 easy).
- **Distractors are far better than live:**
  - plausible-or-strong labels: 39.6% against 6.1%;
  - dead-by-both: 6/12, about live's rate (45.5%).
- **The prose reads much better than live:** naturalness median 4.5 against 2.
- **The options-only attack sits below the live control.** It holds even in the upper-bound,
  sibling-sharing render.
- **Fixer caveat.** For P01-2 (v3, v4) and P01-6 (v1-v4), the fixer reported that some kill quotes
  meet the word rule "only formally". The `distractor_rationales` stored for the drawn versions
  quote those spans, and the human read should check that they make sense.
- **The pre-check shares a model with the deciding graders.** The licensing pre-check uses the same
  model as Stage 1, so passing it raised the odds of passing C, as the prereg stated. Even so, it did
  not catch P01-5, which Stage 1 did. The checks are correlated, not identical.

## Inserted rows (cohort `ssat-reading-wv6`, `verified=false`)

`d30fe347 ad1ca48c 90678eda cf647eda 32521213 47284b39 f930ddec 8ffd45ef ef8a2ebc 8e7c0439 b491d739 cba60250`

- **Difficulty**, taken from the Stage 1 graders' mean rank: 10 easy, 1 medium, 1 hard.
- **`verify_meta`** carries:
  - the unit, the drawn version, frozenSha and seed;
  - both grader labels;
  - every stage result (`ssat-wv6-batch/stages.json`);
  - the staged/not-released notice.
- **Inserter:** `insert-ssat-wv.mjs`. It refuses unless every stage is PASS; break-tested with one
  FAIL, it exited 2. It also refuses on duplicate content or an existing cohort.

## Recommendation

1. A person reads the 12 drawn items, P01-5 first, and decides release.
2. If released, run the human sitting per bank-gate §5.
3. Keep the WV6 brief for the next batch. Add one change: the attitude key may not come from the
   indifferent class when the plot gives the narrator a stake.

Evidence:
- `READING-BATCH-WV6-2026-10-07.prereg.md`
- `SSAT-WV6-AUTHOR-BRIEF.md`
- `ssat-wv6-p0{1,2}.wv.json`
- `ssat-wv6-batch/`: a1, lic, preflight, draw, renders, `ws-*`, `nat3-*`, `iso-*`, `grp-*`, `stages.json`
- `ssat-wv6-breaktest/`
- `ssat-wv.mjs`: `ATT_DIR`, `licbuild`, `--lic`
- `insert-ssat-wv.mjs`
