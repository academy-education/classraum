# SSAT Upper Reading batch WV5 (2026-10-07): result

**FAILS STAGE 1 ON C (exclusivity 9/12; the bar is >= 11/12). Stopped there, as pre-registered. Stages
E, A and B were not run, and nothing was inserted.**

The pre-registration is `024b0b88` (`READING-BATCH-WV5-2026-10-07.prereg.md`), committed after the
Stage A result `483f39de` and before any author ran.

## What ran

- **Authors.** Two fresh authors wrote P01 (narrative fiction, a pottery kiln) and P02 (science feature,
  bats and a tunnel gate). Neither reported opening any repo file.
- **Stage 0 (pre-flight): PASS.**
  - **Round 0.** Verify refused on 12 kill quotes that missed their target (P01 1, P02 11). It also
    raised 9 lexical A1 flags, all in P01. Two A1 judges cleared all 9, so A1 called nothing absent.
  - **Fix round, one, as pre-registered.** Fresh fixers received only the PROBLEM lines and the brief.
    They changed kill quotes and reasons only; a mechanical diff confirmed that no passage, stem or
    choice changed.
  - **Verify `--a1`: OK.** The pre-fix drafts and the round-0 problems are kept in
    `ssat-wv5-batch/preflight/`.
- **Freeze and draw.** Frozen in `31054b11`. frozenSha `1f75f807…`, recomputed with `shasum`. The draw
  gave **P01 → v1 and P02 → v1** and was committed with the renders in `ff6cca97`, before any grader.
- **Stage 1.** Two fresh graders, Stage A's SSAT prompt verbatim, scored by `reading-cal.mjs wv5
  ssat-wv5-batch ws`:

| bar | candidate | live control (Stage A) | bar | verdict |
|---|---|---|---|---|
| **C exclusivity** | **9/12 = 75.0%** | 33/33 = 100.0% | >= 11/12 | **FAIL** |
| Q distractor >= plausible | 43/96 = 44.8% | 16/264 = 6.1% | >= 4/96 | PASS |
| dead-by-both | 4/12 = 33.3% | 15/33 = 45.5% | <= 7/12 | PASS |
| F easy (reported) | 5/12 = 41.7% | 32/33 = 97.0% | not decidable | (would pass) |
| pilot-pass (reported) | 4/12 = 33.3% | 1/33 = 3.0% | not decidable | (would pass) |

Against the pilots' old absolute bars: C (>= 10/12) not met, F (<= 6/12 easy) met, Q (>= 75%) not met.

## The three non-exclusive items

| item | kind | key | what the graders did |
|---|---|---|---|
| P01-5 | attitude ("a sense of ...") | regret | both picked regret; grader B: "unease" also defensible from the final paragraph |
| P02-5 | attitude | uneasy | grader A picked "approving", with "uneasy" second; grader B picked uneasy |
| P02-4 | vocabulary, "settled the councillors" | soothed | both picked soothed; both: "resolved" also defensible |

**The attitude near-synonym failure recurred**, on both attitude items, after the brief named it
explicitly ("doubtful/wistful", "admiring/sympathetic") and required five clearly distinct attitudes.
That makes the third run in a row, across pilots 4, 5 and now WV5, where the attitude item costs
exclusivity. Regret and unease are distinct words, but one closing paragraph can carry both. The
vocabulary miss is a sense pair ("settled" = resolved or soothed) that fits the same sentence, the
V3 lure working too well.

## What moved, and what it means

- **On everything except exclusivity, this batch beat the live bank it was measured against**, and by
  wide margins:
  - easy: 5/12 against 32/33;
  - plausible distractors: 44.8% against 6.1%;
  - dead-by-both: 4/12 against 15/33;
  - pilot-pass: 4/12 against 1/33.
  The NAEP construction did what it was for: lures built from passage content are tempting.
- **The live bank's one strength is the one this construction keeps missing.** Live is 100% exclusive
  because every wrong option is named and then denied. The NAEP rule removes the denial and, with it,
  the guarantee. Pilot 4 saw the same thing (A80): a rival that is present and left undismissed becomes
  a defensible second answer.
  - The two failing kinds are the ones a "checkable fact" cannot settle: an attitude and a word sense.
  - Every inference, purpose, detail and main-idea item, 8 of 8, was exclusive.
- **Per the prereg, no repair, no re-run and no re-decision.** Repairing the three items after this
  round would be fitting to the instrument (CLAUDE.md 2026-09-24).

**Recommendation (owner's call).** The next attempt, if any, should change the question MIX, not the
brief. Keep this construction for main-idea, detail, inference and purpose, which were 8/8 exclusive
here. Either drop attitude and vocabulary-in-context from agent-authored WV units, or take those two
kinds from a person.
- This changes the pre-registered mix, so it needs its own pre-registration, under the same relative
  bars and with the options-only attack still deciding.
- B10 stands: no agent batch has yet cleared every bar, and a human read remains required before any
  release.

Evidence: `ssat-wv5-p0{1,2}.wv.json`, `ssat-wv5-batch/` (a1, preflight, draw, renders, `ws-{a,b}.json`),
`SSAT-WV5-AUTHOR-BRIEF.md`, `reading-cal.mjs wv5`.
