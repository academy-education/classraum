# MAP Growth pilot 8, 2026-10-07: distractors derived from simulated student misreadings. Pre-registration

Written and committed **before any passage is chosen, any stem written or
any panel run.** Results go in `MAP-MISREAD-PILOT-2026-10-07.md`. The SSAT
twin is `SSAT-READING-MISREAD-PREREGISTERED.md`. The shared taxonomy and
every prompt are in `misread/prompts.md`, committed with this file. The tool
is `misread.mjs`, with `--selftest` run before this commit.

**Owner decision, 2026-10-07, via the coordinator.** The owner closed AI
attempts at MAP comprehension after pilots 5-7, then reopened them for this
ONE new construction: wrong options taken from simulated student misreadings,
the way professional item writers derive distractors from real student
errors. This is a different construction, not a third brief to an old one,
so `agent-rewrite-inverts-tell` (stop after one failed rewrite) does not bar
it. If it fails, B11 stands unchanged.

## Why the earlier MAP pilots failed, and what this changes

| pilot | failure the graders named | what this construction does about it |
|---|---|---|
| 1-2 | comprehension leaked options-only (100%, 83.3% vs control R 25%); too easy | the key is written before any distractor exists, from skilled readers' consensus. Distractors are other readers' answers, not the author's foils |
| 3 (variants) | C 6/10, easy, G 6/10 dead, E naturalness 2.5 vs 4.5, cross-item keyword thread | real published prose (E); distractors a simulated reader actually gave cannot be "dead" by construction, and that is tested by G and the new Q |
| 5, 7 (adaptation) | the distractor dies to one explicit sentence, or is off the claim's axis; the key lifts the passage's wording; `easier` 17/44, 10/24 | every distractor is an answer TO THE STEM (on its axis). Stage-0 checks L1 (key copies 5+ passage words) and L3 (distractor killed by one negating sentence that repeats its words) |
| 6 | the options-only screen is invalid for command-of-evidence | no CoE stems are written (stem rule), so options-only is valid and DECIDING here |

**What this does NOT fix, said in advance.** Difficulty depends on the stems.
The panel only reports how hard a stem is. And a misreading that a weak
reader gives may still read as obviously wrong to an adult grader. That is
exactly what G and Q measure.

## Source policy

- **Passages:** real public-domain text only. That means pre-1931 literature
  (Project Gutenberg plain text) or prose written by a U.S. federal agency,
  cut at paragraph boundaries and otherwise verbatim. **No AI-written prose.**
- Check **V** (`misread.mjs verbatim map`): each passage is a contiguous
  excerpt of its saved source file, and the file's sha256 is recorded. V is
  deciding at stage 0.
- No NWEA item, live or reconstructed, is opened by anyone, **never the
  Herald / cloud.dherald.com PDFs**.
- Authors and graders get only NWEA's public CCSS_2024 strand names.
- Claude subagents only, never GPT.

## Sets (fixed now)

| set | grade | target band | area | passage |
|---|---|---|---|---|
| M6 | 6 | RIT 190-199 | Literary Text | pre-1931 fiction, 200-350 words, 3-6 paragraphs, FK 4.0-8.9 |
| M8 | 8 | RIT 210-219 | Informational Text | U.S. federal prose or pre-1931 non-fiction, same limits |

- The stem writer writes **9 open-ended stems per set** (prompts §3). No
  vocabulary-only items. No "which evidence / finding / quotation best
  supports" items, so there is no CoE.
- The pilot takes **the first 6 eligible stems per set, in the writer's
  order**: 12 items, 4 choices each.
- Six items per passage is more than MAP's usual 4. It is chosen so that
  pilot 7's 12-item bars apply unchanged.

## Method (the construction under test)

1. **Passage selector** (prompts §2): one fresh agent.
2. **Stem writer** (§3): one fresh agent. It sees only the passages, and
   writes no answers and no options.
3. **Panel** (§4): 13 fresh agents per set, 26 in all.
   - H1-H10 each carry ONE habit from the taxonomy (§1).
   - S1-S3 are skilled readers at the set's grade.
   - Each sees only the passage and the stems, and answers in free text of
     at most 30 words.
4. **Assembler** (§5): one fresh agent.
   - It clusters the 13 answers per stem.
   - The key is the cluster holding at least 2 of 3 skilled readers.
   - The distractors are **the 3 largest "wrong" clusters**. A larger
     cluster can be skipped only by marking it ineligible with a listed
     reason (absent, not-refutable, defensible, non-answer,
     duplicate-of-key, single-sentence-kill).
   - Each distractor keeps its cluster's proposition, records its habit, the
     readers' verbatim quotes, and a verbatim refuting passage sentence.
   - `misread.mjs tally` checks the frequency rule mechanically (T1 every
     reader once, T2 key has 2+ skilled, T3 the top-3 rule). It also
     computes the **simulated difficulty**: the share of the 13 readers, of
     the 10 misreaders, and of the 3 skilled readers whose answer is in the
     key cluster.
5. **Key verifier** (§6): one fresh with-source agent confirms the key, its
   uniqueness, each refutation, and each distractor's faithfulness to the
   panel.

## Stages, in order. STOP at the first DECIDING stage that fails

**Stage P: panel yield (deciding).** Each set needs **at least 6 eligible
stems of 9**, with zero tally errors (`misread.mjs tally map`).

**Stage 0: exact checks and key verification (deciding, pre-freeze).**
- **V:** every passage is verbatim, with the sha256 matching.
- `misread.mjs checks map`, per item:
  - X2: 4 distinct choices, key among them.
  - X3: passage length and paragraph count.
  - E1: batch 1's FK [4.0, 9.0) on the passage and on every stem or option
    sentence of 15+ words, imported unchanged.
  - A0: SSAT pilot 4's absent-option rule.
  - L1: the key repeats no 5-word run of the passage.
  - R1: each refutation sentence is verbatim in the passage.
  - L3: no distractor dies to one negating sentence that repeats at least
    60% (and at least 2) of its distinctive words.
  - P1: provenance fields are present.
- Batch check E3: key uniquely longest on at most 25% of items.
- Report-only: L2, the key uniquely highest in passage-word share.
- **Verifier:** all four judgements true.
- An item failing a check or the verifier gets ONE repair (§6 repair prompt;
  PROBLEM lines relayed verbatim). A repair may reword options or swap in
  the next-largest panel cluster, and never invents an option.
- Repaired items get a fresh verifier (`verify-2.json`) and re-run checks.
  An item still failing is dropped.
- **Bar: at least 11 of 12 survive, and E3 passes.**
- Drops count as failures in C, S1-b, G and Q.
- **Freeze commit before stage 2.**

**Stage 2: with-source (deciding).**
- Two fresh graders, prompts §7: pilot 7's prompt plus `option_quality`.
- Render: `misread.mjs render map ws`. Score: `misread.mjs score map ws`,
  which uses batch 3's `wsItem` and pilot 6's `wsBars6`, both imported
  unchanged.

| bar | threshold (pilot 7's, unchanged) |
|---|---|
| **C** exclusivity | >= **10 of 12** |
| **S1-b** pilot-pass (conditions 1-4) | >= **10 of 12** |
| **G** option dead by both graders | on <= **2 of 12** items (drops count) |
| **S1-c** calibration | `easier` <= **4 of 24** AND `harder` < **6 of 24** |
| **S1-d** band | each grader's mean offset within **+-0.5** bands |
| **Q (new)** distractor quality | >= **75%** of (grader x distractor) labels are "plausible" or "strong", pooled over both graders: 72 labels |

Q scoring:
- A distractor the grader picked counts as "strong".
- A missing label counts as not plausible.
- A dropped item adds 6 labels, all counted as not plausible.
- Each grader's own rate is reported too.

**Stage 3: relative naturalness (deciding).**
- Two fresh judges, prompts §9 (pilot 7's prompt 5, count 8), rating the 2
  candidate passages plus batch 2's 6 comprehension passages, shuffled
  (`render map nat`).
- **E: pooled candidate median >= pooled control median.**
- INVALID if the control median is 1.

**Stage 1: options-only (deciding; no CoE items exist).**
- Pilot 5's leakage-free split: `render map oo` writes **6 files**. Each file
  holds exactly one item of each set (2 candidates) plus all 20 controls
  (R 8, V 12).
- Each file gets its **own three fresh samples** (prompts §10): 18 solver
  agents.
- **Bar A (pilot 5's, imported): mean <= 50% AND unanimous-on-key <=
  floor(0.3 x 12) = 3.**
- INVALID if control R falls outside 10-45%. INVALID re-runs once with fresh
  samples; INVALID twice stops the pilot as INVALID, never as a pass.
- Unanimity is also reported as a batch rate against the controls'
  (CLAUDE.md 2026-09-25: three samples, not three solvers).
- Options-only runs last because it is the most expensive stage (18 agents),
  not because it matters less. The order was fixed before any item existed.

**Stage 4: only if P, 0, 2, 3 and 1 all pass.**
- Insert STAGED (`verified=false`) under the new cohort **`map-misread-p8`**
  (family `map`, section `reading`).
- `verify_meta` carries:
  - the passage provenance: url, sha256, author, title, year
  - each distractor's habit, panel count and refutation
  - the simulated difficulty
  - every stage result
- **MAP stays unreachable and unverified.** No code, topic or blueprint
  change.
- If the schema refuses a `map` family without a code change, the insert
  stops there and is reported.
- Release is the owner's call, after a human read.

## Range checks

- C, S1-b and G span 0-12. S1-c spans 0-24 per count. S1-d can fail from
  either side.
- Q spans 0-100%, and the selftest breaks it at 9/12 vs 8/12.
- A: control R measured 25.0, 25.0, 33.3, 28.1 and 26.4% in earlier batches,
  inside 10-45 with room on both sides, and the 50% bar sits well above
  four-choice chance.
- E can fail unless the control median is 1.
- `misread.mjs --selftest` breaks every new check (V, L1, A0, L3, T1-T3,
  E3, Q) and re-asserts the imported A and wsBars6 margins.

## Predictions, stated so they can be wrong

1. **Stage P passes**, but the yield is thin for the grade-8 informational
   set: skilled readers converge, and misreaders may collapse onto 2 wrong
   answers on detail-like stems.
2. **The likeliest deciding failure is S1-c `easier`.** Real passages are
   easier to cut to FK < 9 at the cost of depth, and grade-6 literary
   inference may be rated grade 5.
3. **Q is next.** Weak-reader answers to a skilled grader read as "weak", not
   "plausible". If Q fails while G passes, the panel produces answers a
   student would give that an adult discounts, which is a finding about the
   graders as much as the items.
4. **A should pass.** The key is written blind to the distractors, which
   removes pilots 1-2's author asymmetry. The residual risk is that the
   key is the only qualified, whole-passage statement among local or extreme
   misreadings, the CLAUDE.md "axis" tell.
5. E passes (real prose).

## What cannot be learned here

- Whether the simulated difficulty predicts real students: there is no MAP
  human sitting. It is recorded so that a later sitting can test it.
- Whether the panel's misreadings are the ones real grade 6-8 students make.
  The habits are research-documented, but their enactment is a model
  playing a reader. **The panel is one model sampled 26 times with different
  instructions, not 26 students.**

## Amendment 1 (2026-10-07, after passage selection, BEFORE any stem, panel answer or distractor exists): NAEP distractor guide

**Owner addition, relayed by the coordinator.** NAEP released reading items
may serve as MODELS only, never shipped or copied. A separate agent is writing
`misread/NAEP-DISTRACTOR-PATTERNS.md`, which covers:
- how NAEP grade-4/8 MC distractors are built, mapped to misreading types
- difficulty anchors from NAEP's published percent-correct

**What changes (instruments only; NO bar changes):**
1. **Assembler (prompts §5).** It reads the guide and consults it in three
   places:
   - (a) deciding a cluster's eligibility reason, for example what counts
     as `defensible` or `non-answer`;
   - (b) phrasing each option in parallel NAEP-like form, keeping the
     panel proposition;
   - (c) breaking ties between equal-size wrong clusters, replacing "your
     cluster order".

   **The top-k-by-frequency rule is unchanged and still checked
   mechanically by `tally` (T3).** The guide cannot promote a smaller
   cluster over a larger one. The repair agent gets the same guide.
2. **With-source graders (prompts §7 MAP, §8 SSAT).** They receive the
   guide's difficulty-anchor section, appended verbatim after their prompt,
   for rating `band` / `grade_fit` (MAP) or `difficulty` (SSAT).
   - This changes the instrument behind S1-c, S1-d and F relative to
     pilots 4 and 7. Their thresholds are untouched.
   - Results are compared with those pilots with that caveat.
3. **Source safety.** Before use, the orchestrator reads the whole guide. If
   it reproduces any NAEP item text (passage, stem or option) beyond a short
   quoted phrase, the copied material is not passed to any agent.
   NAEP-derived material never enters a passage, stem or option.
4. If the guide is not ready when the assembler stage is reached, the run
   waits for it.
