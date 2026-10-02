# SSAT Reading: why 216 authored items leak, and the live bank doesn't

2026-10-02. Analysis only: no authoring, no inserts. This follows A36 (r9a/b/c, 126 items, 91.5%
options-only) and A38 (ra/rb/rc, 90 items, 94.4%). Both were measured against a live bank that scores
at or below chance under the same instrument. The standing rule (`agent-rewrite-inverts-tell`) says
not to commission a third round until the cause can be **stated**. This file states as much of it as
the data supports, records what it is not, and pre-registers a 2-passage pilot that tests the rest.

## Populations (read the denominators)

| population | items | passages | source |
|---|---|---|---|
| live | 138 (134 in groups of 2+) | 31 | `study_item_bank` ssat/reading, verified, paged past 1000 rows. Cohorts s4 75, s3 44, s2 19 |
| r1 (A36) | 126 | 21 | `ssat-reading-r9{a,b,c}.batch.json` |
| r2 (A38) | 90 | 15 | `ssat-reading-r{a,b,c}.batch.json` |

**Caveat found along the way.** The grouped live control behind A36/A38 (`ctrlrdg2`, 78 items) was
**s3 36 + s4 42 only**. Cohort s2 (19 items in short groups) has never been attacked as a passage
set. Here it appears only in the isolated-item attack below (8 items).

Instruments:
- `ssat-reading-diagnose.mjs` is exact and uses no model. It runs lexical "dumb solvers" (each picks
  one option by a rule, with tied maxima split 1/k) and per-item properties. It self-tests on
  fixtures first, refuses an empty population, and takes `--candidate` for the pilot. Effect size
  is Cliff's delta (rejected over live).
- `ssat-reading-label.mjs` handles the blind Claude labelling. 20 passages (10 live: s4 5, s3 3,
  s2 2; 10 rejected: 5 per round) are mixed and given anonymous ids. Vocabulary items are excluded
  (their options are dictionary senses), leaving 98 items. Known-answer fixtures are planted, and
  a labeller that misses one is discarded before its labels are read. All files are in
  `ssat-reading-diag/`.
- Per CLAUDE.md, labellers and solvers are **one model sampled more than once**, so they are not
  independent raters. Two solve samples agreed on 90/100 picks. Read the replicas as a reliability
  check, not as extra n.

## 1. The finding that reframes both earlier diagnoses: the leak does not need siblings

Isolated-item options-only solve: no passage, items shuffled across passages, no sibling adjacent
(`taskF.json`). Two samples gave identical totals.

| | solved | n | control |
|---|---|---|---|
| r1 (A36) | **96.0%** | 25 | 20% |
| r2 (A38) | **92.0%** | 25 | 20% |
| live | **29.2%** | 48 | 20% (prior grouped live control 28.2%, so the instrument reproduces its known number) |

Isolated, the rejected items leak exactly as much as they did grouped (91.5% / 94.4%). That refutes
both earlier causes as the **primary** mechanism:
- **A36's cause**, "six views of one skeleton co-determine": siblings are not needed. The exact
  lexical check agrees. A solver that picks the option whose content recurs most in sibling items'
  options scores **10.5% / 14.7%** on rejected (ALL-but-vocab, n=105/75), below chance. It scores
  14.9% on live.
- **A38's cause**, "a sibling stem names the key's slot": this is real but secondary. Key-unique
  content appears in a sibling stem on main-idea items in **38.1% (r1) / 33.3% (r2) vs 0.0% live**
  (n=21/15/21). Overall it is 21.0% / 18.7% vs 7.2%. It cannot explain a 94% that holds without
  siblings.

Solver basis on the rejected items: **SOPHISTICATED** ("the most nuanced reading, the kind a test
writer keys") was 22/24 and 25/27 correct across the two samples. On live, **GUESS** was the most
common basis, at 9/37 and 8/28.

## 2. Properties that SEPARATE live from rejected

The ALL-but-vocab stratum is used unless stated otherwise. Live n=111, r1 n=105, r2 n=75.

| property | live | r1 | r2 | Cliff δ r1/r2 | instrument |
|---|---|---|---|---|---|
| distractor is a candidate the passage **names and rules out** | **77.6 / 78.1%** | 11.5 / 10.5% (r1+r2 pooled) | | — | labeller A / B, 192 vs 200 distractors, agreement 93.4% |
| distractor **distorts** passage material | 5.7 / 2.1% | 52.5 / 48.5% (pooled) | | — | same |
| distractor **not in passage** (invention) | 16.7 / 17.2% | 33.0 / 37.5% (pooled) | | — | same |
| items with ≥3 of 4 distractors ruled out by the passage | **37/48** | **0/50** | | complete separation | labeller A |
| key is CONCRETE (restates the passage) vs INTERPRETIVE | 37–41 / 48 concrete | 15–18 / 50 concrete | | — | labellers, key agreement 92/99 |
| key is the **longest** option (lexical solver) | **17.4%** | 39.2% | 44.1% | +0.18 / +0.29 | exact |
| key has the most clause markers (lexical solver) | 16.0% | 35.7% | 37.9% | +0.26 / +0.27 | exact |
| key claims vs distractor claims (key-blind form labels) | 1.40 vs 1.42 | 2.14 vs 1.66 (pooled) | | — | labeller C* |
| key is second-order (a stance about claims) | 12.5% | 48.0% (pooled) | | — | labeller C, order dimension, fixture passed |
| spread of claim counts within a set | 0.29 | 0.82 (pooled) | | — | labeller C* |
| option words (mean) | 8.7 | 11.9 | 12.1 | +0.63 / +0.60 | exact |
| option words shared with the passage (distractors) | 0.58 | 0.36 | 0.37 | −0.44 / −0.44 | exact |
| negation tokens per 100 passage words | 3.69 | 1.92 | 1.77 | −0.52 / −0.60 (n=31/21/15 passages) | exact |
| attitude key's evidence position (0 first para, 1 last) | 0.81 | 0.39 | 0.16 | −0.60 / −0.77 (n=20/21/15) | exact |

\*Labeller C's `moves` fixture failed **because I mis-specified it**: "relief that a long argument is
over" really is two claims, and the labeller said so. I did not re-fit the fixture after seeing the
answer, so the claim-count rows are **unvalidated**. Only the second-order row passed its known-answer
check.

By live cohort (labeller B), the share of distractors that are named and ruled out is s4 100/100,
s3 50/60, and **s2 0/32**: s2's distractors are 30/32 inventions.

## 3. Properties that do NOT separate, or separate without explaining (do not retry these)

- **Lexical co-determination across siblings.** Recurrence solver: live 14.9%, r1 10.5%, r2 14.7%.
- **Distractors as "inventions" (A38's grader note).** This is not sufficient for a leak. Live s2
  distractors are 94% inventions, and s2 solves at **12.5% / 18.8%**. n=8, so this is a single
  weak data point, but it points the other way. On the rejected side, inventions are a third of
  distractors, not most of them.
- **Self-condemning distractors.** Read one at a time with the stem (key-blind), flagged
  distractors are rejected 0.20/4 per item, live 0.00/4, and "stem plus option alone decides" is 0%
  in both. The leak is **comparative**: no single wrong option gives itself away.
- **Key concreteness on its own.** Within rejected, concrete keys solve at 93.3–94.4% (n=15–18) and
  interpretive keys at 93.8–94.3%. Making only the key concrete would not fix it.
- **Uniquely complex key.** Rejected items whose key alone has the most claims or is alone in being
  second-order solve at 100% (34 picks). The rest still solve at 90.9% (66 picks). This is a
  contributor, not the mechanism.
- **Absolutes, hedges.** Key-without-absolute solver is 18.9–21.1% everywhere. Uniquely hedged key:
  3.6% live vs 8.6% / 8.0%.
- **Lexical centroid or odd-one-out.** Centroid 20.1% / 26.5% / 25.2%; odd-one-out 19.3% / 13.9% / 19.3%.
- **Option frame ratio.** Already refuted by A38: r2 reached 0.66 on main-idea and leaked at 100%.
- **Passage length, paragraphs, first person, numerals.** Length is about 330 words in all three.
  Paragraphs 4.6 / 5.3 / 4.7. First person and numerals vary by cohort in both populations.
- **Subskill template.** A38 already showed the live bank uses the same one.

## 4. What can be stated

**Population fact (well supported).** In a live item, the five options are **peers**. Each is a
concrete answer of the same form and weight (claim spread 0.29; the key is the longest option *less*
often than chance). In s3/s4, every distractor is one of the alternatives **the passage itself raises
and disposes of**. The s4 passages are literally built as "five candidates are named; one does the
work; the other four are explicitly denied." That is why their negation density is double the
rejected batches'. Without the passage, nothing in the set separates the key. In a rejected item, the
options are **not peers**. The key is a different kind of answer: longer, carrying more claims, often
second-order or interpretive. The distractors are mostly distortions of passage material (about 50%)
or inventions (about 35%). A solver picks "the reading a test writer would key" and is right 94% of
the time with no passage and no siblings.

**Causal claim (NOT established, and the data cannot establish it).** Zero of 50 rejected items use
the peer, ruled-out construction (complete separation), and every rejected item sits at the ceiling
whatever its other properties are. So no within-population comparison can show that the construction
*causes* the clean score. Every candidate tested inside the rejected set (concrete key, no
self-condemning distractor, non-unique complexity) left the solve rate at 91–94%. The peer
construction is the one separating property that has never been tried, and it has a coherent
mechanism: if the passage names all five, then without the passage all five are equally "real."
That makes it a hypothesis worth one cheap test. It is not a diagnosis to author 78 items against.

**Why this is not a third round.** A38 copied a *surface* feature of live items (the main-idea frame)
and the result inverted. The risk here is the same, so the pilot is sized to fail cheaply, its bars
are fixed below, and a fail ends agent authoring of SSAT reading.

## 5. Authoring brief (pilot only, 2 passages)

1. **Passage first, built around closed candidate sets.** For each point a question will ask about
   (the cause, the decision, the reason, the feeling, the function of a paragraph), the passage names
   **five** candidates and settles on one. It disposes of the other four explicitly: tried and
   failed, ruled out, "it was not X." Live s4 does this for 100% of distractors and s3 for 83%. Use
   different candidate sets for different questions. The live negation density of about 3.7 per
   100 words is a by-product, not a target.
2. **Options are the passage's own candidates, as peers.** Every option is concrete, in the same
   grammatical form, and makes the same number of claims. The key is never written as a gloss,
   synthesis or stance ("admits a second explanation…", "holds to X without Y"). If the question
   asks about a stance, the passage names five stances and denies four. The live s3 attitude item
   shows the pattern: "I was not relieved, I was not proud… I was angry… and knew the anger was
   unfair."
3. **No distractor is derived from the key.** Do not use reversals, overstatements, or partial or
   wrong-relation versions of the key's wording. A distractor must be a different candidate the
   passage considered.
4. **No sibling stem may contain a key's unique content.** `stem_leak` must be 0, as it is on live
   main-idea items.
5. **Attitude and tone keys sit late in the passage** (live 0.81). Not a gate; just the live
   convention.
6. **Naturalness is a known risk.** Some live s4 passages read as a list of negations ("I wonder
   nothing"). The with-source grader must judge whether the passage reads as real prose an SSAT
   student could meet. A pilot that is clean but unreadable is a fail.

## 6. Pre-registered pilot (do not run from this file without approval)

- **Size.** 2 passages × 6 items (main-idea, detail, vocabulary, inference, attitude, structure),
  12 items. One fresh author agent that has not seen the rejected batches or their attack notes. It
  gets this brief and two live s3 passages as examples (`rw-RW3-S01`, `rw-RW3-S02`). Do not use s4
  as the example: it carries the naturalness risk.
- **Pre-flight (must pass before the attack, or the pilot does not test the hypothesis).** These are
  checked with `ssat-reading-diagnose.mjs --candidate` and one Task-R labelling with the planted
  fixture:
  - ≥3 of 4 distractors NAMED_RULED_OUT on ≥8 of the 10 non-vocab items
  - key longest on ≤2 of 12
  - `stem_leak` = 0
  - with-source grader: all 12 keys exclusively defensible, both passages natural

  If pre-flight fails, the author may revise **before** any attack. After the attack, nothing is
  revised (CLAUDE.md: a repair made in response to the round that caught it is fitting).
- **Attack.** Isolated-item options-only on the 10 non-vocab items, using the `taskF` format (no
  passage, no siblings, shuffled among the same 48 live items as a matched control). Use 3 samples,
  reported pooled and treated as about one rater. Also run a grouped one-passage-per-file attack
  (`attack-split.mjs`) to check for sibling leakage.
- **Control and ceiling.** The live control is 29.2% (14/48). Its attainable range is 0–100%, and
  the bars below sit inside it. With 10 items, one rater: if the true rate were 94%, the chance of
  ≤6/10 is about 0.2%. If it were 30%, the chance of ≥7/10 is about 1%. So 10 items separate the
  two regimes, though not finely.
- **Bars, fixed now.**
  - **Hypothesis supported:** isolated solve ≤ 40% pooled AND the live control in the same run
    ≤ 40%.
  - **Hypothesis refuted:** isolated solve ≥ 60%. Then the peer construction is not sufficient,
    agent authoring of SSAT reading stops, and the deficit is escalated to human authoring.
  - **Inconclusive:** anything between 40% and 60%. No third pilot. Escalate as if refuted.
  - **Invalid run:** the live control comes in above 45% or below 10%. Re-run the control; do not
    read the candidate.
- **What a pass does NOT license.** Not an insert. A pass licenses one normal batch through
  `bank-gate`, which ends with a human sitting. The co-founder's sitting on live SSAT reading was
  15.0% on 20 items.

## Reproduce

```
set -a; source .env.local; set +a
node scripts/study-bank/ssat-reading-diagnose.mjs                     # self-test, then all tables
node scripts/study-bank/ssat-reading-label.mjs score scripts/study-bank/ssat-reading-diag \
  scripts/study-bank/ssat-reading-diag/labels-{R-A,R-B,F-A,C-A}.json \
  scripts/study-bank/ssat-reading-diag/solve-iso-{A,B}.json
node scripts/study-bank/ssat-reading-label.mjs cross scripts/study-bank/ssat-reading-diag \
  scripts/study-bank/ssat-reading-diag/labels-R-B.json scripts/study-bank/ssat-reading-diag/solve-iso-{A,B}.json
```
The labelling sample is seeded (20261002). Rebuilding it from a fresh live pull reproduces the same
passages only while the live bank is unchanged.
