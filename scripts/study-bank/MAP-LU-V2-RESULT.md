# map-lu-v2, 2026-10-12: result

Bars: `MAP-LU-V2.prereg.md`, pre-registered at `abe4eb89` before any item
existed, with amendment 1 at `e758f73c` (after authoring, before any teacher,
solver or grader). Then freeze `f9bd9fca` and renders `001b9419`, both before
any solver or grader ran. Scoring: `node scripts/study-bank/map-lu-v2.mjs score`.

**Nothing inserted. Spelling cleared: 0** (its pilot-pass count is 20/24, but
the strand failed calibration, so under the prereg none of it is staged).

**Agents (16 Claude subagent runs, at most three at once; the keyed stage continued the two cold graders):**
- 2 authors and 1 re-length agent
- 2 teacher raters, 1 reviser, 2 re-raters (run twice, see Protocol)
- 1 repair agent
- 3 options-only samples
- 2 graders, cold then keyed

No NWEA item, no Herald PDF and no earlier MAP item file was shown to any
agent.

## Verdict per strand

| strand | Stage 0 | S1-a exact + T2 | S1-b pilot-pass | S1-c easier / harder | S1-d offsets | S2 oo vs control | slots | verdict |
|---|---|---|---|---|---|---|---|---|
| **Spelling** (n=24) | pass | PASS (T2 clear: strand p 0.61, word 0.58, sentence 0.52) | **20/24** (bar 20) PASS | **easier 11/48** (bar ≤ 8) FAIL; harder 0/48 | −0.42 / −0.17 PASS | 100.0% vs 52.8% (bar 42.8) PASS | 6/6/6/6 | **FAIL** |
| Punctuation (n=10) | **FAIL**: E3 key uniquely longest 3/10 (bar ≤ 25%) | | | | | | | **FAIL** (not graded) |
| Grammar (n=10) | **FAIL**: E3 key uniquely longest 3/10 | | | | | | | **FAIL** (not graded) |
| Capitalization (n=8, grades 5-6) | pass | PASS (T2 p 0.56) | **6/8** (bar 7) FAIL | easier 2/16 (bar ≤ 2); **harder 4/16** (bar < 4) FAIL | 0.00 / +0.38 PASS | 100.0% vs 52.8% PASS | 2/2/2/2 | **FAIL** |

**Keys are right everywhere they were measured:**
- both graders picked the key cold on 64/64 judgements
- both keyed verdicts were "correct" on 32/32
- no keyed accepted alternative, including the US/British spelling question
- no options-only sample landed unanimous on a non-key letter

The only second-defensible call was MLV2-C08 (grader b, cold): "Sunny Day
sunscreen" could be a brand name that includes the noun. That call held the
item. Both graders upheld the key when it was marked.

### Spelling: the miss is grade 5

| grade | pilot-pass | easier calls |
|---|---|---|
| 5 | **2/6** | 7 of the 11 |
| 6 | 6/6 | 2 |
| 7 | 6/6 | 0 |
| 8 | 6/6 | 2 |

- The grade-5 words were *tomorrow*, *answer*, *finally* and *beautiful*.
  Graders placed them at grades 3-5 (S01 3/4, S02 3/3, S05 4/4, S07 4/5).
  S02 also had an option dead by both: in its "which sentence" set, the
  misspelled word was the only non-trivial word.
- **Grades 6-8 Spelling passed 18/18.** The same pipeline held there:
  S1-c on those 18 would be 4 easier calls out of 36 (S13 *truly*, S14
  *especially*, S26 *guarantee*, S29 *existence*, one call each), and no
  harder call.
- This is the "rhythm too easy for 8 / definitely too easy for 7" pattern from
  pilot 3, now at grade 5. The brief warned against list words, and the author
  still reached for them.

### Capitalization at grades 5-6: no longer easy, now too hard at grade 5

- The `easier` problem from v1 is gone: 2/16 easier calls, against 10 easier
  calls on Capitalization in v1.
- But 3 of the 4 `harder` calls are grade-5 items:
  - C01, a title with "Is" in it (grader b placed it at grade 7)
  - C03, a region versus a direction (grades 5 and 6)
- Holds: C01 (too hard) and C08 (second defensible, brand name).
- v1's grade 5-6 Capitalization went 3/5. This run went 6/8 against a 7/8
  bar.

### Punctuation and Grammar: stopped at Stage 0 by a bar I set too coarse

Both strands had the key uniquely longest on 3 of their 10 frozen items. The
prereg applied v1's E3 bar (≤ 25%) **per strand**, which at n = 10 allows at
most 2. T2's family-wise test on the same items was clear: Punctuation
`unique_max(len)` 32.5%, p 0.95; Grammar 40.0%, p 0.26. As registered, the
two strands stop, and they were not rendered or graded.

**Lesson for the next batch.** Per-strand E3 at n = 10 is a one-item
threshold, and it duplicates `unique_max(len)` / `unique_min(len)`, which
T2 already tests with a significance correction. Either apply E3 to the
pooled batch, as v1 did over its 24, or let T2 carry it. This is recorded
as a design error in this prereg. The rule was not changed after the fact.

## T2 (the structural-predictor check): what it did

- At freeze, T2 was clear on every strand, on both Spelling formats, and
  pooled (p 0.68).
- **It earned its place before the freeze, on the authored set.** In the 12
  authored Spelling "sentence" items, the key was the uniquely longest
  sentence in 7/12 (`unique_max(len)` 62.5%, family-wise p 0.010).
- The strand-level T2 as first registered **could not see this** once the
  word items were pooled in (preview p 0.169).
- Amendment 1 added T2 per format and a seeded length-rank re-draw of those
  12 items. After it, the sentence format came in at p 0.52.
- **Neither grader named a length pattern.** Both graders' `_batch` answers
  found no structural pattern in the 16 word items ("a strict 2x2 factorial
  ... counting features gives nothing away") or in Capitalization ("most or
  least capitalized scores 2-3 of 8").

## Findings recorded whether or not the bars passed

1. **Both graders named the same cross-item pattern: the "sentence"
   format's key slot.** In the with-source render the 8 Spelling "sentence"
   keys sat at A 1, B 0, C 3, D 4 ("never at B"; "7 of 8 C or D").
   - The render dealt keys flat per **strand** (Spelling 6/6/6/6), not per
     format.
   - It does not reach students: the assembler shuffles drawn choices per
     session (`shuffleDrawnChoices`, `src/lib/study/assemble.ts`).
   - But it is a real defect in the stored order and in the grading
     instrument. **The next render must deal keys flat per format**, not
     only per strand.
2. **T2 and the graders together
   caught three different patterns in one batch:**
   - T2 caught the authored length tell
   - the graders caught the slot tell
   - the graders caught the grade-5 easy-elimination pattern ("the error word
     is often the only non-trivial word")

   No single instrument saw all three.
3. **Shared scratch directories race.** The two re-raters each wrote a helper
   named `rate.py` into the same session scratchpad at the same moment. One
   output file never appeared, and the other's provenance could not be
   established.
   - Both re-raters were re-run fresh, each with its own helper directory, and
     both runs agree (G09 dropped, everything else yes).
   - The raced file is kept as `rerate-b.raced.json`.
   - **Every parallel agent brief needs a private helper path.**
4. **The variant guard was needed.** NSSpellChecker (en) accepts *colour*,
   *centre*, *travelled* and *defence*, and also *occurence*, *accomodate*,
   *independant*, *miniture*, *colorfull* and *sweatre*. It rejects
   *harboured*, *tumour*, *memorised* and *likeable*. Measured 2026-10-12.
   The spelling author's oracle runs refused *different*, *library*,
   *exaggerate*, *humorous* and *absence* before they reached the file. No
   keyed grader found an accepted alternative spelling.
5. **Options-only:**
   - Candidates scored 100.0% (32/32 unanimous on key). That is the
     construct: the options are the item, as pre-registered.
   - The control scored 52.8%. It ran lower than v1's 77.8% on a fresh draw
     (one row overlaps).
   - Solvers named "pick the one correct spelling" and "the odd sentence out
     has the misspelling" as their heuristics, which is reading the item, not
     a tell.

## Checker changes, all before any rater, solver or grader output was read

- **G** uses a positional token diff when all four options have the key's
  token count (LCS mis-attributed MLV2-P10's adjacent sites). Chosen per item.
- **E4** scans sentence tokens in their original case (the old scan refused
  "Saturday").
- **L-rank** (amendment 1) enforces the seeded key length rank for sentence
  items.
- **E4-dup** (added after the teacher re-rate, before any repair, solver or
  grader): a tested-word clash introduced by a revision fails the revised
  item, so it goes to the one-repair step rather than stopping the strand.
  - The reviser had rewritten S06 onto *occasion*, which S11 tests.
  - The repair moved it to *probably*, which appears in S05's sentences, so
    S06 was dropped. S07 took its grade-5 place.

Selftest: 116 checks, every bar break-tested at each strand size.

## Gate trail

- **Teacher round 1:** 210 wrong options. Rater a said NO to 18, rater b to
  11; the union was 19 NOs on 15 items.
- **Reviser:** rewrote all 15 items. Its S06 and C06 changes altered the key
  wording.
- **Re-rate:** both fresh re-raters said NO to G09 ("because of we had"), so
  G09 was dropped.
- **Repairs:** 10 items. Nine were E1 readability (stems cut under 15 words,
  options shortened); the tenth was S06, dropped afterwards.
- **Frozen:** Spelling 24 (16 word, 8 sentence) and Capitalization 8.

## What carries forward

1. **Spelling at grades 6-8 works with this pipeline.** It went 18/18 on
   pilot-pass, keys were right everywhere, and no structural tell survived.
   - The next Spelling batch should keep the method and **fix grade 5 by
     word choice**: grade-5 words must not be grade 2-4 list words such as
     *tomorrow*, *answer*, *finally* or *beautiful*.
   - Or it should start the strand at grade 6 and treat grade 5 separately.
   - Owner's gate: about 20 Spelling items cleared. **Not met (0).**
2. **Punctuation and Grammar** were never measured with sources. Rerun them
   with E3 pooled or folded into T2.
3. **Capitalization at grades 5-6** moved from too easy to marginally too
   hard. Its grade-5 title rule ("Is") is where the graders split.
4. **Renders must deal keys flat per sub-format.**

## Files

All in `scripts/study-bank/`:
- Docs: `MAP-LU-V2.prereg.md` (including amendment 1),
  `MAP-LU-V2-BRIEF-SPELLING.md`, `MAP-LU-V2-BRIEF-MECH.md`
- `map-lu-v2.mjs`: the toolchain, with `--selftest`
- `map-lu-v2/`:
  - prompts: `prompts.md`
  - control: `control.json`
  - re-length: `relength.*`
  - authored items: `batch.*`
  - teacher gate: `teacher-*`, `revise*`, `revised.json`, `rerate*`
  - repairs: `repair.input.json`, `repairs.json`
  - Stage 0: `stage0*.json`, `frozen*.json`
  - renders: `oo.*`, `ws*`
  - solver and grader files
  - verdicts: `stages.json`
