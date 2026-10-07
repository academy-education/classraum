# SSAT Upper Reading batch WV6 (2026-10-07): pre-registration

Committed **before any author runs.** Results go in `READING-BATCH-WV6-2026-10-07.md`.

## Why WV6: WV5's failure, and the owner's decision

WV5 (`READING-BATCH-WV5-2026-10-07.md`, `124b7c9b`) **failed stage 1 on exclusivity: 9/12 against a bar
of 11/12.** All three misses were in the two question kinds a "checkable fact" does not settle:

- **P01-5 (attitude):** regret vs unease.
- **P02-5 (attitude):** approving vs uneasy, and one grader picked off the key.
- **P02-4 (vocabulary):** "settled the councillors" read as soothed or as resolved.

Every inference, purpose, detail and main-idea item was exclusive (8/8). On all other measures WV5
beat the live bank by wide margins.

**The owner's decision (2026-10-07, via the coordinator):** author WV6 under the same relative bars and
the A1 absent-option check. Fix the two failing kinds through construction rather than drop them,
because SSAT's mix requires them.

- **Vocabulary:** SAT words-in-context style. All options sit in one frame and exactly one sense fits.
  Never offer two senses that could both fit. A grader must name the sentence that excludes each wrong
  sense.
- **Attitude:** the options differ in DIRECTION, not shade. The passage licenses exactly one direction.
  A pre-flight near-synonym check is required, break-tested on WV5's failing pairs.

Everything else stays as in WV5:

- the main-idea, inference, purpose and detail construction;
- the NAEP lure rules;
- two passage sets of 12 items;
- fresh items only. No WV5 (or earlier) passage, item or topic is reused or repaired.

## Unchanged from WV5 (by reference to `READING-BATCH-WV5-2026-10-07.prereg.md`)

- **Method:** five versions per unit, version k keys choice k, one question of each of the six kinds.
  The same seed formula, applied after a freeze commit.
- **Pre-flight checks:** the `ssat-wv.mjs verify` rules for `WV5-`, which also apply to `WV6-`
  (choice ratio 1.5, lure labels, A1 via `a1build` / `--a1`, kill quotes on target, attitude word
  never named).
- **Authoring protocol:** two fresh authors, at most two at a time. They see only the brief. One fix
  round with fresh fixers, who receive the PROBLEM lines and the brief and nothing else. A unit
  still refused after that round fails stage 0.
- **Genres:** P01 narrative fiction, P02 science feature. New topics; the authors are told not to use
  kilns, pottery, bats, tunnels, boats, lighthouses, newts or salamanders.
- **Stages and stop rule:**
  1. Stage 0: pre-flight.
  2. Freeze, draw, render, commit.
  3. Stage 1: C+F+Q.
  4. Stage 2: E, naturalness.
  5. Stage 3: A, options-only isolated.
  6. Stage 4: B, options-only grouped.

  **Stop at the first deciding stage that fails.** D is not run.
- **All bars are identical to WV5's, computed from Stage A's live control by the same rule:**

| bar | candidate bar | status |
|---|---|---|
| C exclusivity | >= 11/12 | deciding |
| Q distractor >= plausible | >= 4/96 labels | deciding |
| dead-by-both | <= 7/12 | deciding |
| F easy, pilot-pass | none | reported, not decidable at n = 12 (live at 97% / 3%) |
| E naturalness | median >= live median (same judges, Stage A's 7 live passages) | deciding |
| A options-only isolated | <= in-run live control + 10 points (control 10-45% or INVALID) | deciding |
| B options-only grouped | <= 40% | deciding |

- **If every stage passes:** insert STAGED (`verified=false`) as cohort `ssat-reading-wv6`. A human read
  is recommended before release.

## What is new: construction (brief `SSAT-WV6-AUTHOR-BRIEF.md`) and two pre-flight checks

### 1. Brief

The brief is WV5's, with the vocabulary and attitude sections replaced.

**Vocabulary:**
- one frame;
- in each version exactly one sense fits X's sentence;
- the five senses are far enough apart that the sentence's object or setting admits only one;
- an explicit warning naming WV5's "settled" failure.

**Attitude:**
- the five choices come from five different DIRECTION classes, using words from a fixed lexicon;
- each version licenses exactly one direction, an explicit warning naming "approving" vs "uneasy"
  and "regret" vs "unease";
- the attitude word is never named in the passage.

### 2. Attitude direction lexicon (`ssat-wv.mjs` `ATT_DIR` and `attitudeDirections`, mechanical)

There are five classes: warm, critical, troubled, indifferent, amused.

- Every attitude choice must contain a word from exactly one class.
- The five choices must cover five different classes.
- A word outside the lexicon refuses.

**Break test, run before this commit, on every attitude option set the WV method has produced:**

| set | check result |
|---|---|
| WV5-P01-5: pride / regret / amusement / unease / indifference | **flagged**: regret + unease share "troubled" |
| WV5-P02-5: approving / uneasy / amused / regretful / irritated | **flagged**: uneasy + regretful share "troubled" |
| WV4-P01-5: wistful / grateful / resentful / doubtful / admiring | **flagged**: two shared classes |
| WV4-P02-6: admiring / sympathetic / indulgent / disapproving / skeptical | **flagged**: shared class, unknown word |
| WV3-P01-5 and WV3-P02-5 | **flagged** |
| constructed: admiring / critical / uneasy / indifferent / amused | **clean** |

**Limit, stated now.** The lexicon catches the WV5 regret/unease pair directly. **It cannot catch
WV5's other failure, approving vs uneasy.** Those two are different directions; that item failed
because its passage licensed both. A word list cannot see that. Check 3 exists for it.

### 3. Licensing pre-check (`ssat-wv.mjs licbuild` / `verify --lic`, grader-based)

This applies to the attitude and vocabulary questions, on **every version** of each unit.

- **Files:** one file per version index k, holding both units' version k. No judge ever sees two
  versions of one passage. Letters are re-dealt per question by a seeded shuffle, and the key is
  withheld.
- **Judges:** two fresh judges per file, so 10 judge agents per run.
- **Prompt, fixed:**
  > Open only `<lic-vK.json>`. Below are reading passages, each followed by five-choice questions. Answer
  > each question as a careful expert test-taker, judging it against its own passage only. For each
  > give: "pick" (A-E); "second_defensible" (the letter of any other choice a careful reader could also
  > defend from the passage, or "none"); "exclusions": for EVERY choice except your pick, a sentence (at
  > least three words) copied exactly from the passage that rules that choice out; and a one-sentence
  > "note". Return JSON {"labels": {"<question id>": {...}}}, one entry for every question id, to
  > `<lic-vK.X.json>`. Do not open any other file in scripts/study-bank/ or any web page. At the end,
  > state which files you opened.
- **A question-version passes only if BOTH judges:**
  - pick the key;
  - name no second defensible answer;
  - give a verbatim exclusion of at least 3 words for every other option.

  This is the owner's "a grader must name the sentence that excludes each wrong sense".
- Failures are PROBLEM lines and go into the same single fix round as the mechanical problems. After
  that round, the licensing judges are re-run (fresh) on the fixed units.

**Break test, run before this commit, on WV5's two units relabelled `WV6-T0x`**
(`ssat-wv6-breaktest/`):

- **The first design FAILED its break test, and is kept and recorded.** One file showed all five
  versions side by side, with letters in choice order. It licensed exactly the key on all 20
  question-versions, including the three items the deciding graders had flagged. One judge even
  remarked that "version k keys letter k". A check that cannot fail does not count, so it was
  replaced.
- **The design above FIRES on all three known failures in the drawn v1:**
  - P01-5 v1: both judges named unease;
  - P02-4 v1: both judges named resolved;
  - P02-5 v1: both judges picked "approving", off the key.
- It also fires on P01-5 v2 and v3 (one judge each), the attitude item's other versions.
- It is silent on the other 15 of 20 question-versions. So it discriminates; it does not fire on
  everything.

**A risk, stated now so it cannot be explained away later.** The licensing judges are the same model,
with nearly the same prompt fields, as the deciding Stage 1 graders. Passing this pre-flight
therefore makes Stage 1 C more likely to pass, partly through a shared prior. That is fitting to the
instrument, which the owner accepted by asking for a grader pre-check.

What keeps C informative:
- C uses fresh graders, on the drawn version only;
- C covers all 12 items, 8 of which the pre-check never sees;
- the human read remains required before release.

## Predictions

1. Stage 0 is the likeliest failure. The licensing pre-check over 2 units x 5 versions x 2 kinds, with
   both judges required, must clear 20 question-versions after one fix round.
2. If stage 0 passes, then A next, then E.
