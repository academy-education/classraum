# SSAT Upper Reading `ssat-reading-draft-1` (2026-10-11): AI drafts staged for the co-founder's edit

**72 items (12 passages x 6) INSERTED STAGED: `verified=false`, `archived=false`, cohort
`ssat-reading-draft-1`, one `passage_group_id` per passage (`draft1-D1-P01` .. `draft1-D1-P12`).**
Drawable SSAT Reading is unchanged at 150 (`bank-state.mjs counts`: 150 drawable, 72 STAGED). Nothing
is released, and nothing here is a gate.

This is the owner's chosen route for B10. The AI drafts each passage and its six questions. The
co-founder spends about 10 minutes per passage fixing the answer choices that give the answer away,
using the edit screen. Our checks then run on **his edited version** before a sitting and release.
Every number below describes the drafts as inserted. None of it is a verdict on what will ship.

## Method

- **Authors.** Three Claude author agents ran in parallel on disjoint genres: A fiction + poetry, B
  memoir + essay, C history + science. Brief: `SSAT-READING-DRAFT-1-AUTHOR-BRIEF.md`.
  - Each passage is a single world (no five-version method).
  - The brief keeps WV6's lure brief (real passage content placed wrongly).
  - Attitude uses the WV12/WV13 author/narrator form: five directions, `why` + `why2` licensing
    sentences, no irony words and no "no feeling" key.
  - Vocabulary needs clearly separate senses, with disjoint headword lists that contain no brief or
    live example word.
  - The naturalness tells (filler negations, feeling-list endings, template rhythm) are banned, and
    every topic is outside all earlier WV/PD topics.
- **Mechanical pre-check** (`merge.mjs`): 0 problems.
  - 6 kinds per passage, 5 distinct choices, keys present.
  - `why`/`why2` verbatim, choice lengths within 1.5x.
  - No explanation names a letter, and every item has 4 rationales.
- **Key slots** were re-assigned by a seeded balanced shuffle: A 15, B 15, C 14, D 14, E 14.
  Distractor order was shuffled too, since explanations quote option text, never letters.
- **Options-only check** (diagnostic, NOT a gate). One isolated render held options only, with **no
  passage and no stem**.
  - It contained 102 items: 72 candidate plus an in-run control of 30 live non-vocabulary SSAT reading
    items, seeded and spread across groups (worlds-s2 7, s3 8, s4 13, wv6 2).
  - Control choices were reshuffled, and no two items from one passage sat next to each other.
  - Three fresh solver samples opened only their own byte-identical copy (sha256 checked after the
    run). Each gave a pick and a stated reason.
- **With-source graders.** Two fresh graders saw each passage with its items, key withheld. They
  returned pick, second defensible answer, key concern, difficulty, too-easy, per-distractor quality
  and above-band vocabulary.
- **Fixes before insert: mechanical only** (`fixes` in the batch file). Giveaways were deliberately
  left alone: that is the editor's job, and agent rewrites of tells have made them worse
  (`agent-rewrite-inverts-tell`).

## Passages

| set | title | genre | words | vocabulary headword |
|---|---|---|---|---|
| D1-P01 | The Scorebook | fiction | 461 | crop |
| D1-P02 | Control Seven | fiction | 469 | bear |
| D1-P03 | Last Weeks of the 14 | poetry | 281 | light |
| D1-P04 | First Ice | poetry | 265 | post |
| D1-P05 | The Finest Observer | memoir | 511 | mean |
| D1-P06 | Twelve Sliders | memoir | 467 | train |
| D1-P07 | The Long Way There | essay | 458 | sound |
| D1-P08 | The Long Tables | essay | 463 | bolt |
| D1-P09 | The Voices of Harrow Gap | history | 441 | tripped |
| D1-P10 | The Winter Crop of Lake Orrin | history | 449 | presented |
| D1-P11 | What the Gravestones Remembered | science | 416 | board |
| D1-P12 | Counting Steps on the Salt Flat | science | 447 | lead |

- **The two poems are below the 300-word floor of the request** (281, 265). The author brief allowed
  220-400 words for verse, because a 300-600-word SSAT poem is unusually long. They were not padded.
- **Attitude keys** cover all five directions except amused: warm on P04, P05, P08, P09 and P12;
  critical on P01, P07 and P11; anxious on P02; sorrowful on P03, P06 and P10.
- **Difficulty labels** follow the live per-kind convention: main-idea easy, detail and vocabulary
  medium, inference/purpose/attitude medium or hard. In all, 12 easy, 37 medium and 23 hard.

## Options-only (no passage, no stem): candidate against control

| population | hits | rate | unanimous on key |
|---|---|---|---|
| **candidate, non-vocabulary (60)** | 151/180 | **83.9%** | 47/60 |
| candidate, vocabulary (12) | 13/36 | 36.1% | 3/12 |
| candidate, all 72 | 164/216 | 75.9% | 50/72 |
| **live control, non-vocabulary (30)** | 18/90 | **20.0%** | 3/30 |

- **The control sits at the five-choice line.** This matches every earlier SSAT reading control
  (20-30%), so the instrument discriminates on this family.
- **The candidate deviation is +63.9 points.** That is the same picture as PD v1/v2 (88.9% / 82.2%).
  Single-world agent drafting is as guessable as expected, which is why a person edits the options.
- **By kind:**

  | kind | rate |
  |---|---|
  | main idea | 36/36 |
  | inference | 35/36 |
  | purpose | 33/36 |
  | detail | 27/36 |
  | attitude | 20/36 |
  | vocabulary | 13/36 |

- **By passage:** from 9/18 (P02) to 18/18 (P04).
- **Samples are correlated** (one model sampled three times). On 57 of 72 candidate items all three
  chose the same letter, against 20 of 30 control items. Read the rates as means; intervals would be
  roughly sqrt(3) wider than independent-sample intervals.
- **An unarticulated signal is present.** Of the candidate non-vocabulary picks the solvers themselves
  labelled "no signal", 43 of 60 hit the key, against 14 of 75 in the control. The leak is larger than
  the cues the solvers could name.
- **Per-item `oo_hits` histogram:**

  | oo_hits | items |
  |---|---|
  | 0 | 13 |
  | 1 | 4 |
  | 2 | 5 |
  | 3 | 50 |

### The giveaway patterns the solvers named (for the co-founder's guidance)

1. **The keys tell one story across the set.** This was the most-cited cue, and it is the PD v2
   consistency channel again. Solvers grouped the items by topic across the whole render and picked,
   in each set, the option that agreed with its siblings' options. Examples: "measure distance by
   counting steps" agrees with "judge distance by their steps"; "scorebook exposed a mis-set clock"
   agrees with "times did not add up". Distractors each invent a different story.
   **Edit:** make at least one distractor per item agree with the other items' content too.
2. **Main idea: the key is the one option that covers what the sibling items mention.** Distractors
   are one detail or one paragraph's topic. Result: 36/36.
   **Edit:** give a distractor the same breadth as the key, with the wrong focus.
3. **Purpose: the key uses a stock purpose verb.** Examples: "prepare for the part X later plays",
   "show how tensely ...", "contrast", "concede", "show that the lesson outlasted ...". Distractors are
   literal descriptions of the paragraph's content ("describe the hall", "explain why ...").
   **Edit:** put a stock function into at least two distractors.
4. **Inference: the key is the "central" causal inference on the passage's theme.** Distractors are
   surface events that read like details from elsewhere.
5. **Attitude: the prior favours warm and reflective words (admiring, wistful).** Every warm or
   sorrowful key was solved by 2+ samples except P05 (only 1). All three critical keys (P01, P07,
   P11) and the anxious key (P02) were missed by every sample. When the key is warm, the warm word is
   the only positive option.
6. **Detail: real-world plausibility.** Examples: carving dates bound a lichen's age, a switchboard
   shutter drops, a shadow shortens toward noon.

## With-source graders

- **Both graders picked the key on all 72 items.** No grader flagged a wrong key.
- **Second defensible answer:** 14 flags on 9 items.
  - Named by both graders: P03 inference, P06 attitude (admiring vs wistful), P10 main idea, P11
    attitude (troubled vs critical), P12 detail (the bristle-ant trap).
  - Named by one grader: P04 main idea, P05 purpose, P07 attitude, P09 detail.
- **Dead distractors:** 54 flags on 40 items. Most are vocabulary glosses no reader would pick
  ("gullet", "haircut") and the attitude options from the far directions.
- **Too easy:** 19 flags on 10 items, all of them detail items: P01-P10's detail item is answered
  nearly word for word by the passage (P10's by one grader only). P11 and P12 are not flagged.
- **Above-band vocabulary:** 1 flag, P05 "mean" = excellent, an informal sense (grader b).

### Mechanical fixes made before insert (all recorded in the batch file's `fixes`)

| set | change | reason |
|---|---|---|
| P01 | "set to twenty-five minutes" -> "twenty-six"; "set all the clocks" -> "... to thirty minutes a side" | clock arithmetic 12 + 25 = 37, not the 38 minutes elapsed, and the time control was never stated (both graders) |
| P02 | "I was eleven" -> "I was eleven, her only brother," | choices say "a boy" / "his head"; sex never stated (both) |
| P05 | "I had two older brothers." -> "I was a boy of twelve with two older brothers." | stem and choices say "his"; sex never stated (both) |
| P08 | the hall "becomes a repair cafe and fills with broken things" | choices and stem say "repair cafe", which the passage never used (both) |
| P10 | "nearly three hundred pounds" -> "more than two hundred pounds" | a 22-inch block of 14-inch ice weighs about 225 pounds (grader b) |

The three "key concern" grader flags these fixes resolve are kept in `grader_flags`, prefixed
`[resolved before insert ...]`, and are excluded from risk. The graders were not re-run after the
fixes, because no fix touched a choice or a stem.

## Risk (per the contract)

The contract's rule:
- **high:** `oo_hits >= 2`, or any grader names a second defensible answer or a wrong key;
- **med:** `oo_hits = 1`, or a dead distractor or too-easy flag;
- **low:** otherwise.

| risk | items |
|---|---|
| high | **57** |
| med | **15** |
| low | **0** |

- **Why the high items are high:** options-only alone 48, grader alone 2, both 7. **Options-only
  drives the histogram.**
- **The 15 med items:** 8 vocabulary, 3 attitude, 3 detail and 1 purpose.
- **No item is low,** because nearly every item that escaped options-only carries a dead distractor
  flag.
- **Per passage, high count:**

  | passage | high items |
  |---|---|
  | P04, P07, P10 | 6 each |
  | P06, P08, P09, P11, P12 | 5 each |
  | P03, P05 | 4 each |
  | P01, P02 | 3 each |

**Edit-screen compatibility** (checked with the screen's own `src/lib/study/ssat-draft.ts`, from commit
`cc3552a2`):
- `isDraftRow` and `awaiting_edit` hold on 72/72 rows.
- `ssatContentHash` equals the stored `content_hash` on 72/72.
- `validateItemEdit` reports 0 errors on 72/72.
- The key is the uniquely longest choice on 17/72. Chance is 14.4, and the screen warns on these.

## What happens next

1. The co-founder edits the 12 sets in the edit screen. `verify_meta.draft.original_item` holds the
   item exactly as inserted, so his edits can be diffed.
2. **Our checks run on his edited version:** the options-only attack paired with a live control, the
   with-source graders and the structural pre-flight. Then a human sitting decides (bank-gate §5).
3. **Nothing here can be released as drafted.** An 83.9% options-only rate on the drafts is the
   expected starting point of this method, not a finding about the edited items.

## Evidence

- **Batch file:** `ssat-reading-draft-1.batch.json` (sha256 `e85175bc...`), which holds:
  - every inserted row, with its `verify_meta.draft` (per-item `oo_notes` with the three solvers'
    reasons, and `grader_flags`);
  - the passage list and the fixes.
- **Author brief:** `SSAT-READING-DRAFT-1-AUTHOR-BRIEF.md`.
- **Scratch:** `scratchpad/ssat-draft1-work/` (git-excluded). It holds the authored files, `oo/`
  (render, key, the three sample files, per-item scores), `ws/` (render, both grader files, flags),
  and the merge, fix, build and insert scripts.
- **Ledger:** `ssat-reading-draft-1-2026-10-11` (staged-for-human-edit).
