# SSAT Upper Reading `ssat-reading-pd-pilot-v2` (2026-10-10): result

**FAILS STAGE 1 (with-source exclusivity): C 32/36 against a bar of >= 34/36. STOPPED. NOTHING
INSERTED. NO SITTING TO DRAW. Recommendation on scaling: NO-GO** (the pre-registered rule: any
deciding stage fails).

All four exclusivity misses are items that were **re-authored after the pre-freeze screen**. The one
measurement v2 was built to move did not move either. Options-only was run once, report-only, after the
stop. It cannot change the verdict. It scored **82.2% against a 29.2% control (+53.1)**, against v1's
88.9% vs 29.9%. All six passages had cleared the recognition pre-check, so recall does not explain it.
The re-authored items scored 91.7%: **the re-author round made the leak worse, not better.**

| step | commit |
|---|---|
| pre-registration, v2 brief, `ssat-pd.mjs` v2 rules (before any passage was chosen) | `6ecfa436` |
| Stage S: six obscure passages, recognition pre-check, verified before any question | `58f29fe3` |
| freeze after Stage 0, the screen and the re-author round (36 items, sha `cb0bbf75`) | `ca9ed5db` |
| renders, before any grader or solver | `1d15ddb0` |

## Sources (all verbatim; `srccheck` 6/6, break-tested)

| set | slot | text | year | words | recognition pre-check |
|---|---|---|---|---|---|
| PD2-P1 | fiction | Mrs. L. G. Morse, "A Well-Meaning Little Busybody", *Harper's Young People* (Gutenberg #29002) | 1880 | 615, 1 trim | unknown / unknown |
| PD2-P2 | fiction | A. M. Platt (unsigned), "Mother's Idea", opening scenes, *St. Nicholas* (Gutenberg #39846) | 1886 | 641 | unknown / unknown |
| PD2-P3 | poetry | Marcia D. Bradbury, "Kensington Clover", *Harper's Young People* (Gutenberg #28975) | 1880 | 248, whole poem | unknown / unknown |
| PD2-P4 | history of an idea | Willard Austen, "Bookworms in Fact and Fancy", *Popular Science Monthly* (Gutenberg #45115) | 1899 | 623, 2 trims | unknown / unknown |
| PD2-P5 | natural science | Eleanor Hodgen Patterson, "A School for the Study of Life under the Sea", *Popular Science Monthly* (Gutenberg #44297) | 1899 | 518 | unknown / unknown |
| PD2-P6 | science (federal) | Claire Crise (NPS seasonal ranger), "We Don't Know What Will Happen to Bryce Canyon's Hoodoos", NPS *Park Science* | 2022 | 542, 3 trims (captions) | unknown / unknown |

**Recognition pre-check:** one fresh solver saw only the six openings (`firstSentences(text, 2)`,
`ssat-pd-v2/recog/`) and answered "unknown" for both author and work on all six. One attempt per
passage, no replacement. Three scouts shortlisted the sources first (3 per slot, rejections with
reasons in `ssat-pd-v2/stage-s/`). They rejected nine pieces for caricature, racial-science framing or
cruelty, and one because its pen name may belong to a canonical author.

## Stages

| stage | measure | candidate | bar | live | verdict |
|---|---|---|---|---|---|
| S | provenance, verbatim, recognition | 6/6, 6/6 cleared | 6/6 | n/a | PASS |
| 0 | pre-flight after one fix round | 36/36 | >= 24 items, >= 4 passages | n/a | PASS |
| P | pre-freeze screen (not a gate) | 75/90 = 83.3%; **24/30 solved by 2+ of 3** | n/a | 33/144 = 22.9%; 10/48 solved by 2+ | 24 re-authored |
| 0' | re-authored items through Stage 0 | 24/24 kept | as Stage 0 | n/a | PASS |
| 1 | **C exclusivity** | **32/36** | >= 34/36 | 33/33 | **FAIL** |
| 1 | F easy | 20/36 | <= 35/36 | 32/33 | pass |
| 1 | Q distractor >= plausible | 187/288 = 64.9% | >= 15/288 | 16/264 = 6.1% | pass |
| 1 | dead-by-both | 1/36 | <= 19/36 | 15/33 | pass |
| 1 | pilot-pass | 13/36 | >= 1/36 | 1/33 | pass |
| 2 | naturalness | not run as a gate (stop rule); one judge ran alongside Stage 1: candidate median 5, live 2 | >= live | | report only |
| 3 | options-only isolated | not run as a gate; **report-only after the stop: 74/90 = 82.2%** | <= control + 10 | 42/144 = 29.2% | would FAIL (+53.1) |
| 4 | grouped | not run | <= 40% | | |

**Stage 0 detail.** Round 0: 19 mechanical problems (17 stem-word rule, 2 attitude-lexicon), A1 0
absent, licensing 12/12 clean by both judges. Fixers changed 8 items. A1 and licensing were re-run
fresh on the changed items: 0 absent, 1/1 clean. Verify CLEAN.

**Stage P detail (the screen).** Three fresh samples, never reused, on a render with its own seed. They
solved 24 of the 30 non-vocabulary items 2+ of 3. Live control items solved 2+ of 3: 10/48 = 20.8%.
**Option parity, declared in the brief, did not change the screen rate:** 83.3% against v1's 88.9% at
Stage 3. Two fresh re-authors rewrote all 24 from scratch, with new stems and no option reused. They
saw the old stems only, never the old options, picks or keys. The rewrites passed Stage 0 in full:
16 mechanical problems, A1 0 absent, licensing 4/4. One fix round changed 11 of them, A1 and licensing
were re-run fresh (0 absent, 1/1), and verify was CLEAN. The 6 survivors are byte-identical to the
screened version.

**Stage 1 detail.** Both graders picked the key on all 72 item-gradings. Exclusivity failed only on
named second answers:
- PD2-P1-3 (inference): both graders named a second answer.
- PD2-P2-1 (main idea), PD2-P3-1 (main idea) and PD2-P5-4 (inference): one grader each.

**All four are re-authored items.** The 12 items the screen did not send back (6 survivors and the 6
unscreened vocabulary items) were all exclusive. Writing the distractors up to the key's depth (option
parity) produces distractors a careful reader can defend.

## The report-only options-only run (after the stop; NOT a gate, the verdict is Stage 1)

Three brand-new samples, pilot 4's prompt verbatim, each working on a private read-only copy of
`iso.json`. The copies' sha256 values were checked after the run.

| subset | candidate | note |
|---|---|---|
| all 30 non-vocabulary items | **74/90 = 82.2%** | control 42/144 = 29.2%; unanimity 24/30 vs 27/48 |
| **re-authored after the screen (24)** | **66/72 = 91.7%** | written by an author told the old item leaked |
| screen survivors (6) | 8/18 = 44.4% | 3/18 at the screen: regression to the mean, as recorded before the run |
| by kind | purpose 18/18, inference 16/18, main idea 15/18, detail 14/18, attitude 11/18 | both survivor attitude items 0/6; the four re-authored attitude items 11/12 |

| passage | candidate | recognition |
|---|---|---|
| PD2-P1 Morse 1880 | 13/15 = 86.7% | cleared |
| PD2-P2 Platt 1886 | 9/15 = 60.0% | cleared |
| PD2-P3 Bradbury 1880 (poem) | 9/15 = 60.0% | cleared |
| PD2-P4 Austen 1899 | 14/15 = 93.3% | cleared |
| PD2-P5 Patterson 1899 | 14/15 = 93.3% | cleared |
| PD2-P6 Crise 2022 (NPS) | 15/15 = 100.0% | cleared |
| **recognition-cleared passages (6/6)** | **74/90 = 82.2%** | |

**Ceiling check (pre-registered).** The in-run control was 29.2%, so the bar would have been 39.2%.
The candidate could score anywhere from 0% to 100%, so both PASS and FAIL were reachable. At the
screen the control was 22.9% and the bar would have been 32.9%. Neither bar was unreachable.

**The screen is an instrument the batch was fit to (recorded before the run, repeated here).** It
fitted badly. The items it sent back came back more guessable, at 91.7% against 83.3% for the batch it
screened. This is the `agent-rewrite-inverts-tell` pattern again: after one failed agent rewrite,
stop.

## Why: what was measured, and what is a hypothesis

1. **Recall is ruled out.** All six passages cleared the recognition check, and the cleared-only rate
   is 82.2%, close to v1's 88.9%. The 2022 NPS article, which nobody could have memorised the way they
   could Frost or Muir, scored 15/15.
2. **Option parity as an instruction does not work.** The screen rate barely moved (83.3% vs 88.9%).
   Authors who were told to "write the distractors up to the key" produced distractors a grader can
   defend (Stage 1 C), while solvers still found the key.
3. **The consistency channel (hypothesis, not measured).** Every screen and report-only solver said,
   unprompted, that it rebuilt each passage from its sibling questions and picked mutually consistent
   answers. In an agent-written set the keys are all true of one passage and therefore agree with each
   other. The distractors are independent inventions and do not agree. The live control resists this
   (22.9-29.2%), though the solvers named live clusters too, so the live distractors must cohere better.
   It fits the CLAUDE.md axis rule at the level of the set rather than the item. Testing it would take
   a grouped run against a run with one item per passage, or a set whose distractors are deliberately
   consistent with one another.
4. **The attitude polarity rule did its narrow job.** Both survivor attitude items scored 0/6 and all
   six attitude items were exclusive. The four re-authored attitude items reached 11/12 anyway, so the
   rule removes one tell and leaves the authoring pattern.

## The pre-registered scale test

| hypothesis | result | bar | v1 | live |
|---|---|---|---|---|
| H1 not too easy | 20/36 = 55.6% easy | <= 18/36 | 21/36 | 32/33 |
| H2 distractors alive | **1/36** dead-by-both | <= 6/36 | 8/36 | 15/33 |

H2 is met, and Q (64.9% plausible-or-strong) is the best any SSAT reading batch has measured. H1 is
not met. Both are moot: Stage 1 failed.

## Predictions, scored

1. "Stage S needs at least one replacement": **wrong**, 6/6 cleared on the first attempt.
2. "The screen sends back about a third": **wrong**, it sent back 24/30.
3. "Stage 3 is still the likeliest deciding failure": the deciding failure came one stage earlier
   (C), and the report-only options-only number shows Stage 3 would also have failed.
4. "Attitude items get harder to keep exclusive": **wrong**, 6/6 exclusive. The misses were
   inference and main idea, all re-authored.
5. "Per-passage rates uneven, poem and fiction highest": uneven, yes, but the poem and P2 were the
   lowest (60%) and the two science passages and the essay the highest (93-100%).

## Recommendation (NO-GO by the pre-registered rule)

Do not scale. Nothing is staged and there is no sitting to prepare. **B10 stands: a person writes or
selects SSAT reading items.** Two agent tries on real prose now agree. Real passages solve
naturalness and distractor quality. The options-only leak is in how an agent writes a question set,
and three things do not touch it: a brief, an obscure source, or a screen-and-rewrite loop. If anything
agent-side is tried again, it should test the consistency-channel hypothesis (point 3) before anyone
writes items, and it should not include a re-author loop.

## Files

`ssat-pd-v2/`: passages and the recognition record, `stage-s/` scouts, `preflight/` (every round, the
judge files, the re-author inputs and outputs), `screen/` (render, key, picks, `screen.json`), renders,
`ws-a.json`, `ws-b.json`, `stage1.json`, and `stage3-REPORT-ONLY-after-stop/` (picks, `stage3.json`,
one naturalness judge). Also `ssat-reading-pd-pilot-v2.batch.json` (frozen),
`SSAT-READING-PD-PILOT-V2-PREREGISTERED.md`, `SSAT-PD-AUTHOR-BRIEF-V2.md`, and `ssat-pd.mjs`
(`--selftest`).
