# MAP Growth pilot 6, 2026-10-07: CoE-only adaptation. Pre-registration

Written and committed **before any candidate is selected, screened or
adapted**. Results go in `MAP-ADAPT6-PILOT-2026-10-07.md`.

**Owner, via the coordinator (2026-10-07):** run the narrow follow-up that
pilot 5 recommended (`MAP-ADAPT-PILOT-2026-10-07.md`): about 12
command-of-evidence items at grades 7-8, adapted from human-sat or clean SAT
CoE sources, under pilot 5's bars. The one-item-per-file split and per-file
key dealing are used from the start. Exclude MAPA-22's source and any source
the options-only check flags on its own. Add a dead-distractor bar.

**Why.** Pilot 5 failed at stage 2. Its only clean signal was CoE: 3 of 3
rendered CoE items passed every with-source condition. n=3 cannot carry a
claim. This pilot tests whether that holds at n=12, under the same
instrument. CoE is NOT on CLAUDE.md's measured-clean list (its options are
prose findings, the leaky shape), so the source screen and bar P are what
can catch it.

Unchanged from pilot 5:
- source policy (no NWEA item, never the Herald PDFs)
- Claude subagents only, at most two at once
- the adapter brief `MAP-ADAPT-BRIEF.md`, used as is
- the grader schema

Prompts are in `map-adapt6/prompts.md`.

## Pool and selection (`map-adapt6-select.mjs`, committed with this file, run after)

**Pool:**
- live, verified SAT cohort `v2`
- subskill Command of Evidence or Command of Textual Evidence
- no graphic, and the prompt does not mention a table, graph or chart
- passage of 30 or more words, four choices

`v2` is the SAT cohort a human sitting cleared:
- `b2-all-cohorts` 20.0% (n=70)
- `calibration-andy` 23.5% (n=17), which met the pre-registered B6 bar

**Excluded by name:**
- `209f3763`: MAPA-22's source, options-only unanimous before and after
  adaptation.
- `15755f7c`, `2c67f590`, `a349f42f`: pilot 5's other CoE sources, already
  adapted and graded. Re-adapting after seeing their grades would be fitting
  to the instrument.

**Order:** human-sat sources first, then the rest. Each tier is in sha256
order of `map-adapt6-2026-10-07|<id>`. The first **18** are candidates.

## Stages, in order. STOP at the first stage that fails

**Stage S: source screen (before adapting).**
- 18 candidates plus control R (8 live ISEE main-idea items) in one blind
  file. These are standalone items, so no two share a passage.
- Three fresh samples.
- A candidate unanimous on its key (3/3) is **excluded**.
- The first 12 unflagged, in rank order, become `sources.json`. Bands
  alternate: grade 7 RIT 200-209, then grade 8 RIT 210-219.
- INVALID if control R falls outside 10-45%: re-run once.
- **Stage S fails if fewer than 10 candidates are unflagged.** With 10 or 11,
  all are used, and the missing slots count as failures out of 12.
- Bar P below uses FRESH source samples in stage 1, never the screen's.
  Selecting on the screen would bias a reused source rate downward.

**Stage 0: fidelity and exact checks (pre-freeze).**
- Two adapters, six items each, pilot 5's brief.
- One fresh fidelity reviewer.
- `map-adapt-checks.mjs --dir map-adapt6/ --n 12`: X1-X5, E1, E3, F,
  unchanged.
- An item failing gets ONE repair. The checker's PROBLEM line is relayed
  verbatim, including the option letter.
- Repaired items get a fresh fidelity re-check. An item still failing is
  dropped.
- **Stage 0 fails if fewer than 11 of 12 survive** (pilot 5's 22/24).
- Survivors are frozen (commit) before stage 1. Every drop counts as a FAIL
  in C, S1-b and G.

**Stage 1: options-only (after freeze).**
- Each side (adapted, source) is dealt into **3 files of 4 candidates**, plus
  all 20 controls (R 8, V 12) in every file.
- Each file has its own seeded deal, flat across candidates from a random
  offset, and must be E8-clean.
- Each file gets **its own three fresh samples**: 18 solver agents.
- Controls pool over 9 samples per control item.

| bar | threshold |
|---|---|
| **A** | adapted mean <= 50% AND unanimous-on-key <= floor(0.3n) = 3 of 12. INVALID if control R falls outside 10-45%. |
| **P** | (adapted hit - 25) - (source hit - 25) **<= +10 points** over the pairs. INVALID if source margin + 10 >= 75 (no headroom) or the pooled controls (R+V) differ by more than 25 points between sides. |
| V | not applicable: no vocabulary items |

INVALID re-runs once. INVALID twice stops the pilot.

**Stage 2: with-source.**
- Two fresh graders, pilot 5's schema and prompt, count 12.
- Batch 3's `wsItem`, imported unchanged.

| bar | threshold | source of the bar |
|---|---|---|
| **C** exclusivity | >= **10 of 12** | pilot 5's 20/24 |
| **S1-b** pilot-pass (conditions 1-4) | >= **10 of 12** | pilot 5's 20/24 |
| **S1-c** calibration | `easier` <= **4 of 24** AND `harder` < **6 of 24** | pilot 5's 8/48 and 12/48 |
| **S1-d** band | each grader's mean offset within **+-0.5** | unchanged |
| **G** dead distractors (NEW) | an option named dead by BOTH graders on **<= 2 of 12** items (drops count) | from pilot 5's failure (11 of 22) |

**Stage 3: naturalness.**
- Two fresh judges get prompt 5, with the count set to 18: the 12 adapted
  passages plus batch 2's 6 comprehension passages, shuffled.
- **E: pooled candidate median >= pooled control median.**
- `map-wv.mjs scoreNat`, imported unchanged. INVALID if the control median
  is 1.
- *Stated caveat:* the candidate passages are 40-120 words and the controls
  are about 220. A judge may rate length.

**Stage 4: only if S and 0-3 all pass.**
- Insert STAGED (`verified=false`) under the new cohort `map-adapt-p6`.
- `verify_meta` carries `source_item_id`, the source family and cohort, the
  `changes` list, the stage results, and `cross_test_exposure`: the source id
  plus the count of real (non-internal) students already served it, read
  through `study_test_accounts`.
- **MAP stays unreachable and unverified either way.** No code, topic or
  blueprint change; the owner decides release.

*Range checks:*
- A: control R measured 25.0-33.3 in earlier runs.
- P: the bar can fail whenever it is valid.
- C, S1-b and G span 0-12. S1-c spans 0-24 per count.
- S1-d can fail from either side.
- E can fail unless the control median is 1.

`map-adapt6-score.mjs --selftest` breaks every bar at its margin and passed
before this commit.

## Prediction

- Most likely failures, in order: **S1-c `easier`** (simplifying an argument
  item tends to state the claim plainly), then **G**.
- **P** may fail if the adapters simplify findings into "the one that
  repeats the claim".

## What can't be learned here

- Band labels are unvalidated (MAP-RESEARCH §10).
- MAP has no human sitting.
- A pass would license staged rows and a human sitting. It would not license
  release.
