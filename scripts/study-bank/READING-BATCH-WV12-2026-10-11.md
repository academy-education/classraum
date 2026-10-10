# SSAT Upper Reading batch WV12 (2026-10-11): result

**FAILS STAGE 0 (PRE-FLIGHT): 0 of 4 units passed after the one fix round; the batch needs 3. Stopped.
Nothing frozen, drawn, graded or inserted.** Prereg `a63ffe50` (`READING-BATCH-WV12-2026-10-11.prereg.md`).

**Every refusal after the fix round is a VOCABULARY refusal. None is an attitude refusal.** The WV12
difference, the author's/narrator's attitude toward the subject licensed by two separate sentences, was
licensing-clean in 14 of 15 author-form question-versions in round 0 and, report-only, 15 of 15 after the
fix round, by both judges.

## The units

| unit | genre | attitude form (frame) | attitude choices | vocabulary word |
|---|---|---|---|---|
| P01 | reflective essay: a town replacing its hand-painted street signs | author (`attitude-best`) | admiring / critical / worried / wistful / amused | struck |
| P02 | memoir: a summer learning to keep bees with a neighbour | author (`feeling-best`) | worried / admiring / amused / wistful / critical | pitch |
| P03 | fiction: a teenager training a rescue dog for a county trial | character (`shows`) | grateful / annoyed / worried / wistful / amused | pitch |
| P04 | nature piece (spare): chimney swifts in an old school chimney | author (`regard`) | with admiration / disapproval / apprehension / sadness / amusement | bank |

All four passed the WV12 mechanical rules (`ssat-wv12-rules.mjs check`: attitude form, genre, author
frame, `why` + `why2` as two separate full sentences, no irony words) in round 0 and after the fix round.

## Pre-flight

**Round 0** (4 fresh authors; then mechanical verify, A1, licensing with the WV12 prompt, sense overlap):

| unit | mechanical | A1 | licensing (attitude + vocabulary, 10 question-versions each) | sense overlap (both judges) |
|---|---|---|---|---|
| P01 | 12 (kill quotes, lure kinds) | 0 absent | 10/10 clean | pass (struck 0-3 flagged by one judge only) |
| P02 | 14 (incl. one stem word) | 0 absent | 10/10 clean | **refused**: sales talk / musical tone |
| P03 | 12 (incl. one stem word) | 0 absent | 10/10 clean | **refused**: tone of voice / persuasive speech; field / throw |
| P04 | 9 (incl. two stem words) | 0 absent | **9/10**: attitude v1 (key disapproval) - both judges pick admiration and call disapproval only a second answer | **refused**: mass of cloud / river edge |

Licensing round 0: **39/40 question-versions clean.** R5 (two support sentences from each judge) held on
every author-form attitude version. A1: 0 absent over 215 + 50 option ids.

**One fix round** (4 fresh fixers; PROBLEM lines + brief only):
- P01: kill quotes and lure labels; three one-phrase text edits. Glosses unchanged.
- P02: kill quotes; "sales talk" replaced by "selling spot".
- P03: kill quotes; **the fixer rewrote v4's vocabulary sentence into the tar sense, which is gloss 2, so v4
  no longer keys its own choice.** `verify`: "kills its own choice", "kill for choice 2 missing".
- P04: "mass of cloud" replaced by "store of supplies"; v1's closing rewritten so the writer disapproves of
  the chimney itself (two new licensing sentences).

**After the fix round, all four units are refused:**

| unit | refusal | changed in the fix round? |
|---|---|---|
| P01 | sense overlap, both judges: "crashed into" / "occurred to" (struck) | **no** - the same pair one round-0 judge passed |
| P02 | sense overlap, both judges: "musical tone" / "steepness" (pitch) | **no** - the same pair one round-0 judge passed |
| P03 | mechanical: the vocabulary item's v4 support (fixer re-keyed the sentence) | yes |
| P04 | sense overlap, both judges: "store of supplies" / "row of objects" and / "financial firm" (bank) | yes (the new gloss) |

By the prereg a unit still refused after the one fix round fails stage 0. **0 of 4 pass; stage 0 FAILS.** The
grouped screen and Stages 1-4 were not run.

## The attitude forms (the question WV12 was built to answer)

| form | units | round 0 licensing (both judges) | after the fix round (REPORT-ONLY, unit already refused) |
|---|---|---|---|
| **author / narrator toward the subject**, two licensing sentences | P01, P02, P04 | **14/15** (P04 v1 disapproval read as admiration, both judges) | **15/15**, R5 15/15 (P04 v1 now clean) |
| **character action** (WV11 base) | P03 | **5/5** | not judged: the unit was refused mechanically on vocabulary |

- **Neither form caused a refusal.** The one author-form failure (P04 v1) was the old neighbouring-direction
  confusion, warm vs critical, where the criticism was aimed at the council's repair, not at the chimney
  the stem names. The fix aimed it at the chimney and both fresh judges then agreed.
- **Against the history:** WV9's narrator-tone item failed 7 of 15 attitude question-versions in round 0
  (its result table; REGISTER rounds it to 8) and 3 after the fix round. WV12's author item, with a subject named in the stem and two licensing
  sentences, failed 1 of 15 and then 0 of 15. Report-only: no deciding grader ever saw a WV12 item.
- **What this is not:** licensing is a pre-check by the same model family as the deciding graders, and no
  WV12 attitude item reached Stage 1 C, the options-only attacks or a person. It says the form can be
  written to pass its own pre-check, nothing more.

## What actually stopped WV12: the vocabulary sense pre-check

1. **The agreement rule is not stable across fresh judges.** Two of the three sense refusals after the
   fix round are on gloss pairs that did NOT change: struck "crashed into / occurred to" and pitch
   "musical tone / steepness" were each flagged by one round-0 judge and passed; fresh judges on the
   identical pairs flagged both. The fix round re-runs every judgement fresh, as the prereg requires, so a
   unit can be refused for a set it was never asked to fix. (WV11 found the same thing in licensing: a
   judge naming a second answer on text byte-identical to a clean round 0.)
2. **Homonym sets do not satisfy it reliably.** Every vocabulary word chosen was a textbook multi-sense
   word (struck, pitch, bank); pitch failed in two units and bank twice. The judges find an ambiguous
   sentence for almost any pair given only the glosses ("the bank was running low", "high pitch" for a
   roof). WV11 had all three of its vocabulary sets refused in round 0 too.
3. **A fixer broke a working item.** P03's fixer re-keyed v4's sentence while replacing a gloss. The
   five-version constraint (version k must key gloss k) is easy to break in a single-pass fix.

## REPORT-ONLY: the consistency channel

**Deviation, stated plainly:** the prereg ran it on the drawn batch after the renders. Stage 0 stopped
first, so there are no renders. It was run instead on the three units that completed the fix round
mechanically clean (P01, P02, P04, round-1 text), with one version per unit chosen by the pre-registered
draw formula applied to those files (`consistency/pseudo-draw.mjs`; NOT a freeze; it drew v3 for all
three). Same instrument, prompt and populations otherwise. Two fresh judges, 394 pairs each.

| population | KK fit (rated 4-5) | DX fit | channel KK - DX | other |
|---|---|---|---|---|
| WV12 candidate (3 units) | 61.7% (n=60) | 21.7% (n=60) | **+40.0** | DS (a non-drawn world) 51.7%; **KK - DS +10.0** (judge a +0, judge b +20) |
| live control (48 items, 10 passages) | 64.7% (n=184) | 21.2% (n=184) | **+43.5** | |
| PD pilot v2 (reference, 82% options-only) | 50.8% (n=120) | 15.8% (n=120) | **+35.0** | |

- **The hypothesis as PD v2 stated it is not supported.** Live keys agree with each other more than live
  distractors do, by as much as PD v2's (+43.5 vs +35.0). Keys are true of one passage, so they cohere in
  every population. KK - DX therefore cannot explain why PD v2 leaks at 82% while live sits at chance.
  WV11's run of its own instrument found the same (live +0.553 on its scale).
- **For the WV method**, the drawn world fits together only slightly better than a non-drawn world
  (+10, n=30 per cell, and the two judges disagree: 0 and +20). That is the design working as intended:
  every choice index is one coherent world.
- Two judges are two samples of one model; the cells are small; the candidate draw is not a real freeze.

## Pre-registered bars against results

| bar | pre-registered | result |
|---|---|---|
| Stage 0: >= 3 units pass pre-flight after one fix round | >= 3 of 4 | **0 of 4 - FAIL** |
| grouped screen (any version >= 8/18 refuses) | per unit | not run |
| C exclusivity | >= 17/18 | not run |
| Q distractor >= plausible | >= 7/144 | not run |
| dead-by-both | <= 10/18 | not run |
| E naturalness | median >= live | not run |
| A options-only isolated | <= control + 10 | not run |
| B options-only grouped | <= 40% (<= 21/54) | not run |
| attitude stop rule (post-draw) | any attitude C miss stops | not reached |
| consistency channel | report-only | candidate +40.0, live +43.5, PD v2 +35.0; candidate KK - DS +10.0 |

## Predictions, scored

1. "Stage 0 is the likeliest stop, on author-form licensing": **half right.** Stage 0 stopped it, but on
   vocabulary; author-form licensing was the cleanest part of the batch.
2. "The character unit's attitude holds better than the author units'": **not testable**; both forms were
   clean in round 0 (5/5 and 14/15) and the character unit fell on vocabulary.
3. "Candidate KK - DS near 0; live KK - DX smaller than PD v2's": first part roughly (+10, judges split);
   **second part wrong** (live +43.5 > PD v2 +35.0).

## Procedural notes

- **P04 round-0 snapshot.** I copied P04 into the round-0 folder about 30 seconds before its author
  finished; the author's last edit changed v3, v4 and the attitude stem. The stale judgements were
  detected by the sha checks (`verify` refused them as stale), the early copy is kept
  (`preflight/r0/WV12-P04.snapshot-early.wv.json`), and P04's final text got fresh licensing (v3, v4) and
  A1 judges (`preflight/r0b-p04/`, merged by `merge-p04.mjs`). The licensing on unchanged v0-v2 stands.
- Round-1 A1 was not run (every unit was already refused). Round-1 licensing was run after the stop,
  report-only, to answer which attitude form held.
- Judges and solvers each opened one file in a private scratch folder. Sub-agents receive CLAUDE.md and
  the memory index automatically; neither contains a key.

## Recommendation (owner's call)

- **Attitude:** the author/narrator form with a named subject and two licensing sentences is worth carrying
  into the next batch unchanged. It has not been tested past the pre-check.
- **Vocabulary is now the binding constraint**, through the sense pre-check rather than through students:
  WV11 and WV12 together had 6 of 7 vocabulary sets refused in round 0, and after the fix rounds 4 of
  WV12's and 1 of WV11's refusals were vocabulary. Options: (a) give the sense pre-check a fixed judge pair per round and only re-judge changed glosses,
  so unchanged sets cannot flip; (b) replace the gloss-only judgement with a per-version licensing check,
  which already asks whether a second sense fits each actual sentence and passed 15/15 vocabulary
  question-versions here; (c) a person writes the vocabulary item. Any of these needs a new prereg with a
  break test; none is applied here.
- **Fixers must not re-key a version.** A mechanical "version k keys gloss k" check already exists; a fixer
  prompt should say so explicitly.

## Files

`ssat-wv12-batch/`: `preflight/r0/` (author units, problems, A1/licensing/sense inputs and judge outputs),
`preflight/r0b-p04/` (P04 final-text licensing v3/v4 and A1), `preflight/r1/` (post-fix units, problems,
licensing and sense judgements), `fixers/` (the problem lists each fixer received), `breaktest-lic/`
(the prereg licensing-prompt break test on WV9), `consistency/` (pseudo-draw, render, key, two judges,
score). Tooling: `ssat-wv12-rules.mjs`, `ssat-wv-consistency.mjs`, the WV12 branch of `ssat-wv.mjs`,
`SSAT-WV12-AUTHOR-BRIEF.md`. Ledger `ssat-reading-wv12-2026-10-11` (killed).
