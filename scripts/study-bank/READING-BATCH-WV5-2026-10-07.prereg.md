# SSAT Upper Reading batch WV5 (2026-10-07): pre-registration, bars RELATIVE to the live control

Written and committed **after Stage A was committed (`483f39de`) and before any author agent runs.**
The result goes in `READING-BATCH-WV5-2026-10-07.md`.

## Why this batch, and what is different

- **The owner's position:** SSAT Reading and MAP matter to users, and we must keep making tests.
- **What Stage A found** (`READING-BAR-CALIBRATION-2026-10-07.md`): the live, shipped SSAT Reading bank
  fails the absolute "easy", pilot-pass and plausibility bars the pilots failed, and fails them
  materially. It passes exclusivity materially.
- **So this batch is judged against the live bank, not against an ideal.** Each candidate rate must be
  no worse than live, minus a stated tolerance.
- **What stays the same:** the options-only attack against the live control is still a deciding bar.
  It is valid for SSAT Reading: the shipped bank scored 21.1% for the model and 15.0% for the human.

## Construction

- **Method.** Pilot 3's whole-passage five-version method (`SSAT-READING-WV3-PREREGISTERED.md`), which
  passed naturalness and exclusivity.
  - Five versions per passage, one fixed set of six questions.
  - In version k, choice k is the key to every question.
  - One question of each kind: main-idea, detail, inference, vocabulary-in-context, attitude, purpose.
  - The same seed formula as pilot 3, after a freeze commit.
- **NAEP checklist, written into the brief** (`SSAT-WV5-AUTHOR-BRIEF.md`, committed with this file):
  - Lures are built from passage content: stops-short (surface restatement), reversed cause or
    sequence, half-right, detail-as-whole, misplaced detail, and character-not-author.
  - Each question uses at least two lure kinds, and every kill is labelled with its kind.
  - No filler options (enforced by A1).
  - Each wrong choice is wrong by one checkable fact, never "arguably also right" and never flatly
    denied.
  - No length tell: choice ratio at most 1.5.
  - Main idea: at least one wrong choice is as broad as the key.
  - Attitude: five clearly distinct attitudes, none named in the text. This is pilot 4's C failure.
  - Vocabulary: context-fit senses, never a transparent word. This is pilot 4's F failure.
- **Every item is new.** No pilot 1-5 passage, item or topic is reused or repaired. Genres follow pilot
  3's: **P01 narrative fiction, P02 science feature**. The topics are the authors' own, with invented
  names and places.
- **`ssat-wv.mjs verify` for passage ids `WV5-`** (break-tested on pilot 3's unit relabelled `WV5-`;
  old ids verify exactly as before):
  - pilot 3's one-of-each kinds;
  - choice ratio <= 1.5;
  - a lure label on every kill of a non-vocabulary, non-attitude question, with at least 2 kinds per
    question-version;
  - pilot 4's rules on kill quotes on target and on attitude words never named;
  - word, paragraph and negation limits unchanged;
  - **the absent-option refusal is A1** (`absent-check.mjs`, adopted in Stage A: 0/122 known-good keys
    flagged, 11/11 bad options caught). A lexically flagged choice-version goes to two fresh, key-blind
    presence judges (Stage A's judge prompt, verbatim, with the path changed) through `ssat-wv.mjs
    a1build`. It is refused only if A1 calls it absent. Stale or missing judgements refuse.

## Authoring protocol (unchanged from pilot 4 except the brief)

- **Authors.** Two fresh Claude author agents, at most two at a time.
  - Each gets ONLY the brief text and the format, and writes to the scratchpad.
  - Each is told not to open `scripts/study-bank/` or run anything there, and states at the end which
    files it opened.
- **The orchestrator runs the checks.** It runs `verify`, then `a1build` and the two A1 judges, then
  `verify --a1`.
- **One fix round.**
  - Fresh agents get the PROBLEM lines verbatim plus the brief, and nothing else. The A1 judges are
    then re-run on the fixed files.
  - A unit still refused after that round fails stage 0. Its passage is dropped, and with fewer than
    two units the batch fails.

## Stages, in order. STOP at the first DECIDING stage that fails

**Stage 0: pre-flight (deciding).** Both units pass `verify --a1` after at most one fix round. Then:
1. a freeze commit;
2. `ssat-wv.mjs draw --a1`;
3. `build --natlive reading-cal/ssat/natlive.json`, using Stage A's 7 live SSAT passages;
4. a commit of the draw and renders, before any grader runs.

**Stage 1: C+F+Q (deciding on C, Q and dead-by-both).**
- Two fresh graders on `withsource.json`, using Stage A's SSAT prompt verbatim (`misread/prompts.md`
  §8: pilot 4's C+F plus `option_quality`), with the path changed.
- Scored by `reading-cal.mjs wv5 <dir> ws`.

**Stage 2: E, naturalness (deciding).**
- Two fresh judges, using pilot 3's neutral prompt verbatim (count 9), on the 2 drawn candidates plus
  the same 7 live passages Stage A rated, shuffled.
- Scored by `ssat-wv.mjs score --nat3` (pilot 3's scorer, unchanged).

**Stage 3: A, options-only isolated (deciding).**
- Every non-vocabulary candidate item (10) is interleaved, with siblings never adjacent, among the 48
  live control items (`ssat-reading-diag/taskF.json`), exactly as in pilots 1-4.
- Three fresh samples, using pilot 4's prompt verbatim.
- Scored by `reading-cal.mjs wv5 <dir> iso`.
- Siblings share one file, so the number is an upper bound, which is the conservative direction for a
  pass.

**Stage 4: B, options-only grouped (deciding).**
- `grp-1.json` and `grp-2.json`, three fresh samples. Scored by `ssat-wv.mjs score --grp`.

**D (cross-version validity) is not run.**
- Students only ever see the drawn version.
- Stage 1's exclusivity measures exactly that version.
- Live has no versions, so D has no relative form.
- Pilots 3 and 4 never reached it either.

## Bars, with denominators

**The tolerance rule, fixed now** (`reading-cal.mjs relBar`, selftested):
- Smooth the live rate k/n to p = (k+1)/(n+2).
- The bar is the strictest whole-item count that a candidate whose true rate equals live's would clear
  with probability >= 0.8.
- The tolerance is the gap between the live point rate and that bar.
- **The bar decides only if it can fail inside the candidate's attainable range.** Otherwise it is
  reported, not deciding.

This is "no worse than live, allowing for 12-item sampling noise", and it is the only part of the bar
chosen by me. Computed from `reading-cal/ssat/score.json` (`node reading-cal.mjs relbars 12`):

| bar | live (Stage A) | candidate bar | tolerance | P(pass at live) | status |
|---|---|---|---|---|---|
| C exclusivity | 33/33 = 100.0% | **>= 11/12** | 8.3 pts | 0.96 | DECIDING |
| Q distractor >= plausible | 16/264 = 6.1% | **>= 4/96 labels** | 1.9 pts | 0.87 | DECIDING |
| dead-by-both | 15/33 = 45.5% | **<= 7/12** | 12.9 pts | 0.88 | DECIDING |
| F easy (grader-median) | 32/33 = 97.0% | <= 12/12 | (3.0) | 1.00 | **NOT DECIDABLE**, reported |
| pilot-pass | 1/33 = 3.0% | >= 0/12 | (3.0) | 1.00 | **NOT DECIDABLE**, reported |
| E naturalness | Stage A pooled median 3 (7 passages) | candidate median **>=** live median, both from the same two judges in this run | 0 (pilot 3's bar) | n/a | DECIDING; INVALID if live median is 1 (re-run once) |
| A options-only isolated | in-run control on the same 48 live items (pilot 4: 26.4%) | candidate **<= control + 10 pts** | +10 (the admission-family excess bar, `ssat-verbal-a18-hard`) | n/a | DECIDING; INVALID unless the control is 10-45% |
| B options-only grouped | none (live is not grouped) | **<= 40%** (pilots 1-4) | n/a | n/a | DECIDING |

**Range checks (CLAUDE.md: a pre-registered bar must be checked against the control's ceiling):**
- **C** can fail at 10/12 or below. Q can fail at 3/96 or below. Dead-by-both can fail at 8/12 or
  above.
- **E** can pass and fail, because the live median measured 3, away from both ends.
- **A** has 25+ points of headroom under a 10-45% control.
- **B** spans 0-100%.
- **F and pilot-pass cannot be made relative at n = 12 without becoming stricter than live.** Live is at
  97% easy and 3% pass. Against live's own rate, the only failable bars ("<= 11/12 easy", ">= 1/12
  pass") would each fail a candidate exactly as good as live 49% of the time.
  - So they are reported, alongside the pilots' absolute bars, and decide nothing.
  - **This means the batch can pass while being as easy as the live bank.** That is what "no worse than
    live" means when live is this easy, and the result file will say so in plain words.

## If and only if every deciding stage passes

- **Insert STAGED** (`verified=false`) as cohort **`ssat-reading-wv5`**: family `ssat`, section
  `reading`, domain `Reading Comprehension`, passage group `wv-<passage_id>`.
- **`verify_meta`** carries the method, the brief, frozenSha and draw, every stage result with its
  denominators, the lure labels, and A1's flags.
- **Release needs a human read first, and a person decides.** Nothing is verified here. The human
  sitting remains the verdict for a verbal cohort (bank-gate §5).

## Predictions (recorded so they can be wrong)

1. **Stage 1 C** is the likeliest deciding failure. The bar is 11/12, stricter than pilot 4's 10/12,
   and the NAEP rule "wrong by one checkable fact, not denied" is exactly where pilot 4 lost three
   items to second defensible answers.
2. **Next is A.** NAEP-style in-text lures may make the key the only option that answers the stem's
   precise question.
3. **F (reported) will be well under live's 97% easy**, as pilots 3 and 4 already were.
