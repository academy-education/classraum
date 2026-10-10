# SSAT Upper Reading batch WV11 (2026-10-11): result

**STOPPED AT STAGE 0 (pre-flight). Only 1 of 3 units passed all of pre-flight (2 needed), so the batch
fails, and the pre-registered attitude stop rule fires. Nothing frozen, drawn, graded or inserted.**
Prereg `READING-BATCH-WV11-2026-10-08.prereg.md` (`75c2bc3a`) as amended by
`READING-BATCH-WV11-2026-10-11.prereg.md` (`10488468`); stage-0 artefacts and the consistency render
`f2aa6ac3`.

## Pre-registered bars against results

| stage / bar | threshold | result | verdict |
|---|---|---|---|
| Stage 0: verify (incl. new stem frames), A1, licensing (no-irony prompt), sense overlap; one fix round | 2 units pass | P01 pass, P02 pass, **P03 refused** | see screen |
| Grouped screen (pre-draw) | refuse a unit if any version >= 8/18 | **P01 REFUSE (8/18 on one version)**, P02 PASS (max 6/18) | |
| Batch = first 2 units passing all pre-flight | 2 | **1 (P02)** | **FAIL** |
| Attitude stop rule | fires if < 2 units pass and any refusal is on the attitude item | P03 attitude licensing refusal after the fix round | **FIRES** |
| C, Q, dead-by-both, E, A, B | as WV6 | not run | n/a |
| Consistency channel | none (report-only) | see below | report-only |

## Stage 0 in detail

**Units:** P01 memoir (a dry-stone wall, participant narrator), P02 biographical sketch (an 1850s
marsh surveyor), P03 arts feature (a silent-film reel and a small-town cinema). All three are genres no
earlier WV batch used. WV12's topics (street signs, honeybees, a rescue dog, chimney swifts) do not
overlap; WV12's P02 is also a memoir (genre overlap, recorded).

**New stem rule:** all three units used their assigned phrasing (P01 `which` + `closest`, P02 `shows`
+ `likely-means`, P03 `when` + `context`); every stem matched its frame and the variety rule passed on
the three together (`ssat-wv11-batch/preflight/stem-frames.txt`). No author had trouble with it.

**Round 0** (`r0-a`, `r0-b`, and P03's licensing inside `rc1`):

| check | P01 | P02 | P03 |
|---|---|---|---|
| mechanical problems | 14 (kill quotes, one lure count) | 9 (kill quotes) | 13 (kill quotes, two length ratios, one stem word) |
| A1 absent | 0 | 0 | 0 |
| licensing (both judges, 10 question-versions each) | 10/10 clean | 10/10 clean | 10/10 clean |
| sense overlap (agreement rule) | **refused**: "pitch" sound / sales talk | **refused**: "draft" air current / drink | **refused**: "pitch" throw / sales talk |

So in round 0 the attitude item was licensing-clean in **15/15** attitude question-versions, and every
vocabulary set was refused by the new sense check.

**One fix round** (fresh fixers, PROBLEM lines + brief only), then A1, licensing and senses re-run fresh:

| unit | what the fixer changed | round 1 |
|---|---|---|
| P01 | quotes; "sales talk" replaced by "an underhand throw" (v3 sentence rewritten) | verify OK; licensing 10/10; senses clean |
| P02 | quotes; v4 sentence edited; "a swallow of drink" replaced by "the pulling of loads" (v4 sentence rewritten) | verify OK; licensing 10/10; senses clean |
| P03 | quotes; "sales talk" -> "field" and "tar" -> "resin" (v4 sentence rewritten); attitude labels "wary" -> "worried", "disapproving" -> "critical" (length ratio) | **refused, 4 problems** |

**P03's round-1 refusals:**
- vocabulary "pitch": both sense judges rate throw / field and slope / field as overlapping (the new
  "field" gloss sits in the same sports or hillside context as throw and slope);
- attitude, v0 (key "worried") and v1 (key "grateful"): licensing judge b names "amused" as a second
  defensible answer each time (Mabel's condition read as a dry joke; her poster request read as teasing).

**The attitude refusal is on unchanged text.** P03's v0 and v1 passages and their quoted actions are
byte-identical to round 0, where both fresh judges found exactly one feeling (4/4 clean). Only the
distractor labels changed, and v1's key did not change at all. The same question-versions went 2/2
clean then 1/2. This is sampling variation in the licensing judges on the irony reading, which is
exactly the failure the no-irony prompt was written to surface. It is real under the rule, and it shows
the pre-check can flip on unchanged text.

**Grouped screen** (P01 and P02, the two units that passed stage 0; three fresh samples, pilot 4
prompt): P01 hits by version 2/8/1/4/3 of 18, max 8 against a limit of 7, **REFUSE**; P02 6/3/2/3/4,
PASS. Two of the three samples said they chose answers to agree with their picks on sibling questions
(the consistency channel, named unprompted again). No repair after the screen (WV9 rule).

**Stop rule:** fewer than two units pass pre-flight, and P03's refusal includes an attitude licensing
refusal. Per the 2026-10-08 prereg this ends agent attitude authoring and goes to the owner.

## Report-only: the consistency channel

Run as pre-registered for a stop before the draw: `--draw none`, the three post-fix units (all
diagonal and cross pairs, draw-independent) plus the 48-item live control. 668 pairs, two fresh judges
each, judge agreement 618/668 (92.5%; "unrelated" dominates).

| population | keys (KK) | distractors (DD) | channel KK - DD |
|---|---|---|---|
| **live control** (10 passages) | **+0.592** (n=92; both judges "fit" on 53) | +0.040 (n=276) | **+0.553** |
| candidate, all-diagonal view (3 units) | diagonals +0.213 (n=150) | cross +0.163 (n=150) | **+0.050** |

Descriptive, not pre-registered (the expectation over the five possible draws of each unit, KK - DD
with DD = (4 SW + 12 XW)/16): P01 +0.054, P02 +0.221, P03 -0.157; mean +0.039. Live per passage:
0.12 to 1.22, every passage positive.

**What this says.**
- **The live bank's keys agree with each other far more than its distractors do.** The channel PD v2
  hypothesised exists, and it is large, in the shipped bank. The live control still scores near chance
  options-only in isolation (23.6-29.9% across runs), so the channel does not leak one item at a time;
  it is a grouped-presentation channel.
- **The WV design nearly removes it.** Its "worlds" cohere only weakly (+0.21 per diagonal against
  live keys at +0.59), and no better than cross-world pairs (+0.05). That is the five-version method
  working as intended: no one answer-set is the coherent story.
- **Prediction check:** the prereg predicted the live channel would be smaller than the candidate's. It
  was the opposite (+0.553 against about +0.04). The KK - SW prediction could not be tested without a
  draw.
- **Limits:** the judges are the model that authors and solves; "fit" between two statements is not a
  solver's behaviour; P01's screen favourite (v1, 8/18) is not its most coherent diagonal (v2, +0.35),
  so the instrument did not predict the screen on this one unit. Treat it as a hypothesis check.

## What the run shows

1. **The attitude item still breaks on irony, and the pre-check is noisy.** Round 0: 15/15 clean.
   Round 1 refused two P03 question-versions whose text had not changed. Across WV10 and WV11 the
   character-action form has had 3 substantive one-judge irony refusals in 60 attitude
   question-versions.
2. **The new vocabulary check is the binding constraint now.** It refused all 3 sets in round 0, and the
   P03 replacement failed again on a new pair. Two of three sets were fixed by one gloss swap, so
   "senses that cannot overlap" is achievable but not reliably in one round. Two authors independently
   chose "pitch", the brief's own example word: an example in a brief becomes the default.
3. **The grouped screen is still firing on a unit that passed everything else** (P01, by one pick over
   the limit).
4. **The stem-variety rule cost nothing** at pre-flight. Whether it reads less templated to a person is
   untested.

## For the owner's decision

As pre-registered, WV11 stops and is reported. The attitude stop rule says a person then writes the
attitude questions. Nothing is staged; no sitting note is prepared (it was conditional on all stages
passing); the co-founder's open ACT English run is untouched.

Evidence: `ssat-wv11-batch/` (`TOPICS.txt`; `preflight/` pre/post-fix units, every A1, licensing and
sense round, problem lists, `stem-frames.txt`; `gscreen/` render, key, samples, score; `cc/` render,
key, labels, `cc.score.json`, `cc.score.txt`), `ssat-wv.mjs` (`stemFrame`, `frameVariety`,
`selftest-frames`), `ssat-wv11-cc.mjs` (`selftest`), `SSAT-WV11-AUTHOR-BRIEF.md`.
