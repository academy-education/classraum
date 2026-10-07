# MAP Growth pilot 8 + SSAT Reading pilot 5, 2026-10-07: misreading-derived distractors. Results

- Pre-registrations: `MAP-MISREAD-PILOT-2026-10-07.prereg.md` and `SSAT-READING-MISREAD-PREREGISTERED.md` (`40e4bbe9`), committed before any passage, stem or panel.
- Amendment 1 (`a95e3384`): the owner's NAEP distractor guide. It was committed before any stem or distractor.
- Taxonomy and prompts: `misread/prompts.md`. Tool: `misread.mjs` (`--selftest`).

**Verdict: BOTH FAMILIES FAIL AT STAGE P (panel yield), the first deciding stage.** Nothing was frozen, graded or inserted. MAP stays unreachable. SSAT forms are unchanged. No item exists to verify, and nothing was verified.

## What ran

| step | MAP | SSAT Upper |
|---|---|---|
| passages (fresh selector; check V) | M6: L. M. Montgomery, *The Story Girl* (1911), 281 words, FK 5.7. M8: Fabre, retold by Hasbrouck, *Insect Adventures* (1917), 286 words, FK 6.4. **V 2/2** | U1: W. H. Hudson, *Far Away and Long Ago* (1918), 619 words. U2: John Burroughs, *Ways of Nature* (1905), 542 words. **V 2/2** |
| stems (fresh writer; no answers, no options) | 9 + 9 | 10 + 10 |
| panel: one agent per reader, passage and stems only | 26 readers (H1-H10 + S1-S3 per set) | 26 readers |
| assembler (fresh agent; NAEP guide per Amendment 1) | 18 stems clustered | 20 stems clustered |
| `tally`: T1-T4 mechanical checks | **0 errors** | **0 errors** |

T4 was added before any panel ran (`74e74b29`). It requires every distractor quote to equal that reader's panel answer verbatim, so provenance is checked mechanically rather than trusted.

## Stage P: panel yield (deciding). FAIL in all four sets

The bar was at least 6 eligible stems per set, where eligible means a key cluster with at least 2 skilled readers plus k "wrong" clusters. k is 3 for MAP and 4 for SSAT.

| set | eligible | bar | |
|---|---|---|---|
| M6 (grade 6 literary) | **4 / 9** | 6 | FAIL |
| M8 (grade 8 informational) | **5 / 9** | 6 | FAIL |
| U1 (SSAT literary memoir) | **1 / 10** | 6 | FAIL |
| U2 (SSAT nature essay) | **2 / 10** | 6 | FAIL |

**The key was never the problem.** The skilled readers formed the key cluster on 38 of 38 stems, at 98.1% (MAP) and 100% (SSAT) agreement. **What is missing is distinct wrong answers.**

| | MAP (18 stems) | SSAT (20 stems) |
|---|---|---|
| simulated p, all 13 readers | 53.0% | 67.3% |
| simulated p, the 10 misreaders only | 39.4% | **57.5%** |
| mean non-key clusters per stem | 4.06 | **3.05** (4 needed) |

**The panel converges.** On the SSAT passages more than half the misreaders gave the correct answer, even though each had been told to read with a habit.
- **11 of 38 stems drew 0 or 1 usable wrong clusters**: M6-S9, M8-S4, M8-S6, U1-S4, U1-S7, U1-S10, U2-S3, U2-S5, U2-S7, U2-S9 (13/13 correct) and U2-S10.
- **Both vocabulary-in-context stems were among them** (U1-S4 at 85%, U2-S5 at 92%): open-ended word-meaning stems produce no misreadings.

**Is the failure the assembler's judgement, or the panel?** I re-counted every cluster the assembler excluded on judgement (absent, not-refutable, defensible, single-sentence-kill) as if it were usable. That gives an upper bound for each set:

| set | raw non-key clusters >= k | upper bound counting judgement exclusions |
|---|---|---|
| M6 | 7 | 7 |
| M8 | 7 | 7 |
| U1 | 5 | **2** |
| U2 | 3 | **3** |

- **SSAT fails under every reading.** The panel does not produce 4 distinct wrong answers on most stems, however leniently they are counted.
- **MAP's failure depends on the exclusions.** 12 clusters were excluded as `defensible` and 8 as `not-refutable`. Those are the exact defects pilots 4 and 5-7 failed on (a second defensible answer; no citable refutation). Counting them would have produced 7 stems per set, at the price of shipping known exclusivity failures. The exclusions were the right call, and the prereg made them deciding.

## Taxonomy used, and where the distractors came from

H1 detail-as-main-idea · H2 over-generalisation · H3 author/character conflation · H4 first/last paragraph only · H5 literal reading of figurative language · H6 prior knowledge over text · H7 wrong referent · H8 reversed causality/sequence · H9 keyword matching · H10 literal only (no gap-filling inference).

Each habit is cited in `misread/prompts.md` §1. Four citations were confirmed by web search on 2026-10-07: Alvermann, Smith & Readence 1985; Cain, Oakhill & Lemmon 2005; Rupp, Ferne & Choi 2006; and King et al. 2004's distractor rationale taxonomy. The rest are cited from memory.

| habit | MAP chosen distractors (27, the 9 eligible items) | SSAT chosen (12, the 3 eligible items) | MAP all usable wrong clusters (41) | SSAT all usable (43) | judged ineligible (MAP / SSAT) |
|---|---|---|---|---|---|
| H1 | 1 | 2 | 1 | 3 | 4 / 0 |
| H2 | **9** | 2 | **12** | **12** | 2 / 3 |
| H3 | 2 | 2 | 5 | 5 | 1 / 1 |
| H4 | 0 | 2 | 1 | 3 | 3 / 1 |
| H5 | 2 | 0 | 2 | 1 | 0 / 1 |
| H6 | 1 | 1 | 2 | 4 | 4 / 1 |
| H7 | 4 | 1 | 6 | 3 | 0 / 0 |
| H8 | **6** | 1 | **9** | **8** | 1 / 0 |
| H9 | 0 | 0 | 0 | 2 | 7 / 1 |
| H10 | 2 | 1 | 3 | 2 | **10 / 10** |

What the table shows:
- **H2 (over-generalisation) and H8 (reversed causality) supply most usable wrong answers in both families.**
- **H9 (keyword matching) and H10 (literal only) almost never yield a usable distractor.** Their answers are mostly literal restatements that do not answer the stem (`non-answer`) or are partly right (`defensible`).
- That is the opposite of NAEP's pattern. The guide finds H9 the most frequent strongest lure and H10 the strongest on average (guide §1.1). The likely reason is format: NAEP builds those lures as options, while free-text H9/H10 answers come out as half-answers that cannot be phrased as one clean wrong option.

## Stage 0: report-only (it never decided anything; stage P had already failed)

`misread.mjs checks` was run on the candidate items for information:
- MAP 9/9 items fail, mostly on A0, plus 5 E1 hits (FK >= 9 on long options and stems). E3 is 0/9.
- SSAT 2/3 fail on A0. E3 is 1/3.

**This exposes a prereg defect, and I record it rather than leave it latent. A0 cannot pass paraphrased prose options.** Pilot 4's lexical absent-option rule was carried over as a deciding stage-0 check, and I break-tested it only on its own fixture. Run on earlier items, it flags the KEY on:
- 9/10 of MAP batch 2's passage items
- 5/12 of pilot 7's items
- 2/10 of SSAT pilot 4's (whose authors wrote to satisfy it)

A rule that fires on correct answers written in a student's own words would have failed this construction at stage 0 even if stage P had passed. A0 suits options that reuse passage vocabulary, which is pilot 4's construction. It does not suit paraphrase, which is this construction's whole point. **Any future paraphrase-option pilot must replace A0, and break-test the replacement on known-good items first** (CLAUDE.md: a check must be shown to pass sound items as well as fail bad ones).

## What this settles

**The construction's premise held in one respect and failed in the one that decides.**
- **Held:** skilled readers reach the key independently on every stem (38/38), and keys come out without any distractor in view, which removes pilots 1-2's author asymmetry by construction.
- **Failed:** simulated misreaders do not generate enough distinct, refutable, non-defensible wrong answers.
  - On real public-domain passages, model readers told to misread mostly read correctly (misreader p 39% MAP, 57% SSAT).
  - When they do err, their errors split into a few usable lures (over-generalisation, reversal) and many that are half-right or non-answers.
  - That is why stage P binds at k=3, and far harder at k=4: the SSAT five-choice format needs 4 wrong answers and gets about 3 non-key clusters per stem.

**One model given ten instructions is not ten students** (CLAUDE.md: three samples are not three solvers). The convergence measured here is that limit made visible. Real students' errors are not conditional on being told to make them.

## Recommendations

- **B10 / B11 stand.** A person writes or selects SSAT and MAP comprehension. MAP pilot 8 and SSAT pilot 5 join the earlier agent routes that failed.
- **If the owner wants the idea itself tested, use real students.** The construction asks for free-text answers from real readers. That data would come from a short open-response sitting on these same stems. The stems and passages are committed and contain no answer.
- The keys alone (skilled consensus, 38/38) are not usable items.
- Nothing here licenses tuning the panel (more readers, stronger habit instructions) and re-running. That is fitting to the instrument, and it would make the readers caricatures, which the prompt was written to avoid.

## Files

- `misread/{map,ssat}/`:
  - `passages.json`, `stems.json`
  - `panel/<set>/{input,H1..H10,S1..S3}.json`
  - `assembly.json`, `batch.candidate.json` (unfrozen, never graded)
- `misread/prompts.md`
- `misread/NAEP-DISTRACTOR-PATTERNS.md` (owner's guide), plus the agent and grader copies
- `misread.mjs`
- Source files (Gutenberg plain text, sha256 recorded in `passages.json`) are in the session scratchpad.
