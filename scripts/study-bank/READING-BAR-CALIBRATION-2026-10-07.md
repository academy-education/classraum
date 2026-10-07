# Reading bar calibration, Stage A (2026-10-07): result

Pre-registered in `5d705576` (`READING-BAR-CALIBRATION-2026-10-07.prereg.md`) before the draw. The draw,
renders and A1 judge files were frozen in `4b5a169c` before any grader or judge ran. Each grader, judge
and naturalness rater was a fresh Claude subagent that opened only its own file, and each one reported
which files it opened. No output was malformed, nothing was re-run, and no GPT model was used.

## The answer, plainly

**The live bank would NOT pass the absolute bars the pilots failed.** Exclusivity is the one exception.
The SSAT Reading bank we ship, and the ISEE Reading bank standing in for MAP's upper band, both fail
"easy", pilot-pass and distractor plausibility *materially*: the whole 95% interval lies on the failing
side of each bar. **Those absolute bars were unattainable even for items we already ship.** On difficulty,
the failed pilots scored *better* than live: SSAT pilot 3 was 9/12 easy and pilot 4 7/12, against
32/33 for live.

Exclusivity is different. Live passes it materially (SSAT 33/33, ISEE 30/31). So pilot 4's 9/12 on
exclusivity was a real deficit against the live standard.

Read "known-good" as the prereg defined it: live SSAT Reading is human-cleared on **guessability
only** (co-founder options-only 3/20 = 15.0%; model 21.1%). It has never been checked for difficulty
or distractor quality. These graders say why it reads as easy: the `worlds` construction names each
wrong option and then denies it in its own sentence ("the passage itself lists each distractor and
then explicitly rules it out"). Many s2 and v1 distractors are also simply absent from the passage.
**What the absolute bars measured is a property this bank does not have, not a property the pilots
lacked relative to it.**

## SSAT Reading, live: 33 items in 7 passage groups (s2 5, s3 12, s4 16)

Instrument: SSAT pilot 4's C+F prompt, plus `option_quality` (`misread/prompts.md` §8). Two graders.

| measure | live | 95% interval | pilot bar | live vs bar | failed pilots |
|---|---|---|---|---|---|
| exclusivity C | **33/33 = 100.0%** | 89.6-100 | >= 83.3% (10/12) | **PASS, material** | P3 12/12, P4 9/12 |
| easy F (grader-median) | **32/33 = 97.0%** | 84.7-99.5 | <= 50% (6/12) | **FAIL, material** | P3 9/12, P4 7/12 |
| distractor >= plausible Q | **16/264 = 6.1%** | 3.8-9.6 | >= 75% | **FAIL, material** | P5 never reached it |
| dead-by-both (option_quality) | **15/33 = 45.5%** | 29.8-62.0 | <= 16.7% (MAP G) | **FAIL, material** | n/a |
| pilot-pass (excl, not easy, no dead) | **1/33 = 3.0%** | 0.5-15.3 | >= 83.3% | **FAIL, material** | n/a |
| harder (grader-median hard) | 0/33 | 0-10.4 | none | reported | |
| naturalness (pilot 3 neutral prompt) | pooled median **3** (n = 14 ratings) | | relative only | reported | P3 candidates 4 |

Easy by cohort: s2 5/5, s3 12/12, s4 15/16. Grader A rated 32 easy and 1 medium; grader B 30 easy and
3 medium. The `option_quality` labels over 264 distractors were 109 dead, 139 weak, 16 plausible and
0 strong. Naturalness per passage: RW4-S20 1/1, RW4-S09 2/1, RW4-S14 2/1, RW3-S01 3/3, RW3-S02 3/3,
RW-S18 5/5, RW-S11 5/5. The s4 passages, the largest live cohort, are rated 1-2.

## ISEE Reading, live, on the MAP pilot 7 grader: 31 items in 6 groups

Instrument: MAP pilot 7's prompt 4, plus `option_quality` (`misread/prompts.md` §7). Every item was
stated as grade 8, RIT 210-219.

| measure | live | 95% interval | pilot 7 bar | live vs bar | pilot 7 |
|---|---|---|---|---|---|
| exclusivity C | **30/31 = 96.8%** | 83.8-99.4 | >= 83.3% | **PASS, material** | 12/12 |
| S1-b pilot-pass | **1/31 = 3.2%** | 0.6-16.2 | >= 83.3% | **FAIL, material** | 6/12 |
| G dead-by-both (`dead_distractors`) | **1/31 = 3.2%** | 0.6-16.2 | <= 16.7% | **PASS, material** | 4/12 |
| S1-c easier (labels) | **61/62 = 98.4%** | 91.4-99.7 | <= 16.7% (4/24) | **FAIL, material** | 10/24 |
| S1-c harder (labels) | 0/62 | 0-5.8 | < 25% | PASS | 3/24 |
| distractor >= plausible Q | **18/186 = 9.7%** | 6.2-14.8 | >= 75% | **FAIL, material** | n/a |
| S1-d mean band offset | **-3.13 / -2.81** | | within +-0.5 | **FAIL** | -0.33/-0.25 |
| grade_fit too_easy (labels) | 58/62 = 93.5% | | (inside S1-b) | reported | |
| naturalness (MAP prompt 5) | pooled median **1.5** (n = 12) | | relative only | reported | |

The prereg expected ISEE Upper to grade as `harder` and `too_hard` at grade 8. **That prediction was
wrong.** Both graders placed it 3 bands BELOW grade 8, mostly at RIT 170-189. So the S1-b variant that
ignores `too_hard` is no different: 1/31.

The two dead-distractor instruments disagree. On ISEE, `dead_distractors` names a dead option on 1/31
items, and so does `option_quality` "dead" (1/31). On SSAT, `option_quality` "dead" is dead-by-both on
15/33. The difference is in the bank, not the field: SSAT live labels were 109/264 dead, ISEE 28/186.

**What this says about the MAP pilots.** Pilot 7 *beat* the ISEE live proxy on pilot-pass (6/12
against 1/31) and on `easier` (10/24 against 61/62). It lost only on G (4/12 against 1/31). So for MAP
too, the easier and pilot-pass bars were stricter than anything our live reading bank attains.

## Absent-option replacement A1: adopted (both requirements met)

`absent-check.mjs`. A1 keeps A0 (pilot 4's lexical rule) as a prefilter, exempts vocabulary and
attitude, and calls an option absent only if A0 flags it AND neither of two key-blind judges
establishes presence. Establishing presence means `discussed: true` plus a verbatim quote of at least
3 words.

Population: 290 known-good items; the judges saw 591 option ids (2 judges per file, 4 files), with
the bad cases mixed in blind.

**Requirement 1, no correct key flagged: MET.**

| set | items | keys judged | A0 flags (old rule) | A1 flags |
|---|---|---|---|---|
| SSAT live | 138 | 57 | 12 | **0** |
| ISEE live | 117 | 48 | 10 | **0** |
| MAP batch 2 passage items | 10 | 6 | 6 | **0** |
| MAP pilot 7 | 12 | 11 | 5 | **0** |

**Break test, reverting the fix:** A0 alone, the old rule, flags 33 of these keys. With exemptions
off it flags 16 SSAT live keys, 9/10 MAP batch 2 keys and 5/12 pilot 7 keys, which reproduces the
misread pilot's report. Neither judge marked any of the 122 judged known-good keys as not discussed.
The margin is therefore not a lucky tie-break.

**Requirement 2, fires on bad cases: MET, 11/11 of the bad options that reach it.**
- The 7 constructed plants all fired: lawsuit, visiting sculptor, cholera outbreak, oyster, harvest
  songs, team sports, and the partly-absent trout option.
- 4 of pilot 3's 5 graded-absent options fired: museum, herons x2, beetles.
- One inherited false negative, the one the prereg predicted: pilot 3's "follow their food". A0 passes
  it on an incidental "following", so the judges never see it. Both judges would have called it
  absent.
- A1 flagged none of the 34 other options in the bad items, including 0 of 10 keys.

**Also found, reported:** A1 flags **44 live SSAT and 59 live ISEE distractors** as absent, both judges
agreeing. In the live grader notes these show up as "details that appear nowhere in the passage
(insurers, wells, fog, range lights)". So live distractors fail A1 at a material rate. Requiring A1 of
a new batch is stricter than live on this point, and the owner's NAEP checklist asks for exactly that.
MAP pilot 7 had 4 such distractors; MAP batch 2 had none.

## What changes because of this

1. Do not judge a reading pilot against an absolute easy, pilot-pass or plausibility bar again. Live
   fails all three materially.
2. **Stage B's bars are relative to these live rates.** At n = 12, several of them cannot fail
   against a control this extreme. That is computed and stated in Stage B's prereg before authoring,
   not discovered afterwards.
3. Retire A0 as a deciding check. Use A1, and remember it inherits A0's false negatives.
4. **A bank-quality finding, outside this task's scope:** by these graders the live SSAT and ISEE
   reading banks are 97-98% easy, have 6-10% plausible distractors, and carry 44 and 59 absent-content
   distractors. Exclusivity and the human options-only sitting are what cleared them. That fits B10
   and B11: what the reading banks lack is difficulty and tempting distractors, and only a person has
   supplied those so far.

Evidence: `reading-cal/` (sample, renders, `ssat/ws-{a,b}.json`, `isee/ws.grader-{a,b}.json`, `*/nat-*.json`,
`*/score.json`, `a1/judge-*.json`, `a1/score.json`), `reading-cal.mjs` and `absent-check.mjs` (both
`--selftest`).
