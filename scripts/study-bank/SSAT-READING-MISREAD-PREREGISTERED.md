# SSAT Reading pilot 5: distractors derived from simulated student misreadings. Pre-registered 2026-10-07 (before any passage, stem or panel)

The MAP twin is `MAP-MISREAD-PILOT-2026-10-07.prereg.md`. The shared taxonomy
and all prompts are in `misread/prompts.md`, committed with this file. The tool
is `misread.mjs` (`--selftest` was run before this commit). The A/B/C/E/F
renders and scorers are `ssat-wv.mjs build/score`, pilot 4's instrument,
unchanged.

**Owner decision, 2026-10-07:** try one new construction for SSAT Upper
reading comprehension. Wrong options come from simulated student misreadings,
the way professional item writers derive distractors from real student errors.

## Why pilots 1-4 (and A69) failed, and what this changes

| pilot | failure | this construction |
|---|---|---|
| A69 diagnosis pilot | options-only 80.0% vs live 24.3%: the author's foils gave the key away | the key is written from skilled readers' consensus, before any distractor exists; distractors are other readers' answers |
| 1 (counterfactual slots) | naturalness ("unrelated asides"); every distractor absent, so items were easy | real published prose; the absent-option rule A0 is a deciding stage-0 check |
| 2 (variants, rivals named) | naturalness: the rival mentions read as constructed | no rivals are planted; the passage is untouched public-domain text |
| 3 | easy 9/12: absent options, flat dismissals, cross-item "what actually happened" | A0; L3 (no distractor dies to one negating sentence repeating its words); keys come from varied stems, not a key brief |
| 4 | C 9/12 (near-synonym attitudes; a present, undismissed rival was defensible), easy 7/12 | the assembler must mark a defensible cluster ineligible, and every distractor needs a verbatim refuting sentence (R1) plus a verifier's check that the sentence really refutes it |

**The three-sided bind pilot 4 measured** (rivals absent → easy; rivals
dismissed → easy; rivals present and undismissed → defensible) **is what this
tests.** A misreading is present in the reader's head, not in the text. The
text refutes it, but not by negating its words.

## Same as pilot 4 (by reference)

- Live control: the 48 items in `ssat-reading-diag/taskF.json`.
- Naturalness control: the 6 live passages frozen in
  `ssat-wv3-pilot/natlive.json`.
- Scorer: `ssat-wv.mjs score`, with `--iso`, `--grp`, `--ws` and `--nat3`.
- Bar definitions as in pilot 4.
- The A/B prompts and the C+F prompt are pilot 4's. The C+F prompt adds one
  field, `option_quality`, for bar Q, and the deciding fields are unchanged.
- Five choices per item.
- Claude subagents only, never GPT.

## Sets (fixed now)

| set | passage |
|---|---|
| U1 | literary: pre-1931 fiction or memoir, 350-700 words, 3-9 paragraphs |
| U2 | informational or essay: pre-1931 non-fiction (nature, science, history), or U.S. federal prose; same limits |

- Real public-domain text only, cut at paragraph boundaries and otherwise
  verbatim. Check **V** (sha256 plus verbatim) is deciding at stage 0.
- **No AI-written prose.**
- Pilot 3's passages are not reused: they are AI-written, and real text is
  available.
- The stem writer writes **10 open-ended stems per set** (prompts §3, SSAT
  rules: 1 vocabulary-in-context, at least 3 inference, at least 1
  purpose/main-idea, at most 1 attitude, at most 1 detail).
- The pilot takes **the first 6 eligible stems per set, in writer order**:
  12 items, five choices.

## Method

The method is the MAP prereg's §Method, with three differences:
- The panel's misreaders role-play "a typical student in grades 8-10
  preparing for the Upper Level SSAT".
- The skilled readers are "a strong grade 10 reader".
- The assembler takes **the 4 largest "wrong" clusters**.

13 panel agents per set, 26 in all. Simulated difficulty is recorded per item.

## Stages, in order. STOP at the first DECIDING stage that fails

**Stage P: panel yield (deciding).** Each set needs at least 6 eligible stems
of 10 (key cluster with 2+ skilled readers, and at least 4 "wrong" clusters),
with zero tally errors.

**Stage 0: exact checks and key verification (deciding, pre-freeze).**
- V.
- `misread.mjs checks ssat`:
  - X2: 5 distinct choices, key among them.
  - X3: passage limits.
  - **A0: absent-option rule** (pilot 4's lexical rule, now deciding per
    item; vocabulary items exempt). This replaces pilot 4's D, which
    validated passage versions this construction does not have.
  - L1, R1, L3, P1.
- Batch check E3: key uniquely longest on at most 25% of items.
- Key verifier (prompts §6).
- One repair round, as in the MAP prereg.
- **Bar: at least 11 of 12 survive and E3 passes.** Drops count as failures
  in C, F and Q.
- **Freeze commit**, then `ssat-wv.mjs build misread/ssat --natlive
  ssat-wv3-pilot/natlive.json`.

**Stage C+F+Q (deciding): two fresh graders on `withsource.json`, prompts §8.**

| bar | threshold |
|---|---|
| **C** exclusivity | both graders pick the key and neither names a second defensible answer, on **>= 10 of 12** (a drop counts as a failure) |
| **F** difficulty | **<= 6 of 12** items grader-median easy (mean rank <= 1.5; a drop counts as easy) |
| **Q (new)** distractor quality | >= **75%** of (grader x distractor) labels "plausible" or "strong", pooled over 96 labels (`misread.mjs score ssat q`; a picked distractor counts as strong, a missing label or a dropped item as not plausible) |

**Stage E (deciding): relative naturalness.**
- Two fresh judges, pilot 3's neutral prompt verbatim, rating the 2
  candidates plus 6 live passages.
- **Pooled candidate median >= pooled live median.**
- A live median of 1 is INVALID, and the stage is re-run once.

**Stage A (deciding; SSAT Reading is a family where the instrument
DISCRIMINATES).**
- Shipped bank: 21.1% model vs 15.0% human (CLAUDE.md 2026-09-21).
- `iso.json` holds the non-vocabulary candidates interleaved, siblings never
  adjacent, among the 48 live items.
- Three fresh samples.
- **SUPPORTS if candidate <= 40% AND live <= 40%.** INVALID if live is
  outside 10-45%. FAILS at >= 60%. BETWEEN counts as not passing.
- Siblings share one file, as in pilots 1-4. That makes this an upper bound
  (`agent-rewrite-inverts-tell`) and the conservative direction for a pass.

**Stage B (deciding):** grouped, `grp-1.json` and `grp-2.json`, three fresh
samples, **<= 40%**.

**Insert, only if every stage passes.**
- Cohort `ssat-reading-misread-p5`, inserted **STAGED (`verified=false`)**.
- `verify_meta` carries provenance, each distractor's habit, panel count and
  refutation, the simulated difficulty, and all stage results.
- **A human read is required before release, and the human sitting remains
  the verdict for a verbal cohort (bank-gate §5).** Nothing is verified here.

## Range checks

- The live control measured 26.4%, inside 10-45% with 13.6 points under the
  40% bar.
- The live E median measured 2, so E can both pass and fail.
- C, F and Q span their full ranges.
- Q's 75% margin is break-tested in `misread.mjs --selftest`.

## Predictions

1. **The likeliest failure is F (easy).** Real passages and inference stems
   help, but a strong-student grader may still find a misreading-based
   distractor transparently wrong to a careful reader. That is "easy for a
   strong student", which is F's own definition.
2. **Next is A**, where the key is the only whole-passage, qualified
   statement among local misreadings.
3. **C should pass**: R1 and the verifier exist to stop pilot 4's defensible
   rival.
4. **Stage P may bind on 4 wrong clusters per stem** (10 misreaders → 4
   distinct, refutable, present wrong answers).

## Not learnable here

- Whether simulated difficulty predicts students. A human sitting is
  required before release.
- **The panel is one model sampled 26 times under different instructions,
  not 26 students.**

## Amendment 1 (2026-10-07, after passage selection, BEFORE any stem, panel answer or distractor exists): NAEP distractor guide

This is identical to Amendment 1 of `MAP-MISREAD-PILOT-2026-10-07.prereg.md`.
The owner's addition is `misread/NAEP-DISTRACTOR-PATTERNS.md`: NAEP released
items used as models only, never shipped or copied.

- The assembler and the repair agent consult it:
  - for eligibility reasons
  - for parallel option phrasing
  - to break ties between equal-size clusters
- The top-k-by-frequency rule is unchanged and checked by `tally` T3.
- The C+F+Q graders get its difficulty-anchor section appended verbatim. This
  changes the instrument behind F relative to pilot 4, but not the threshold.
- The orchestrator reads the whole guide first, and passes no copied NAEP
  item text to any agent.
- If the guide is not ready, the run waits for it.

**No bar changes.**
