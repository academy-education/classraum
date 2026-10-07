# MAP Growth pilot 7, 2026-10-07: CoE-only adaptation, options-only REPORT-ONLY. Pre-registration

Written and committed **before selection**. Results go in
`MAP-ADAPT7-PILOT-2026-10-07.md`.

**Owner, via the coordinator (2026-10-07):** re-run pilot 6 under a new rule.
For command-of-evidence, options-only is report-only (as on ACT Science), and
the with-source graders plus the dead-distractor bar decide.

## Why options-only gates nothing here, and the scope of that rule

**The reason.** Pilot 6 (`MAP-ADAPT6-PILOT-2026-10-07.md`) found that the
model and the human disagree on exactly this stratum:
- **The human was right on 3 of 9 picks** (33.3%, chance 25%) on textual SAT
  `v2` CoE (fresh rows, `bank-state.mjs` semantics).
- **On the 5 human-sat candidates:** human 1/5, model samples 14/15.
- **Model options-only on the 18 candidates: 96.3%** (52/54, 17/18 unanimous
  on key), against control R 25.0%.

CLAUDE.md (2026-09-21): when model and human disagree on the SHIPPED bank,
the instrument is invalid for that family. Where it saturates, the
with-source half decides.

**Scope.**
- This rule applies **only to command-of-evidence**, and **only from this run
  onward**.
- It does **not** re-decide pilot 5 (failed at stage 2) or pilot 6 (failed at
  stage S). Both verdicts stand as recorded.

## Sources (`map-adapt7-select.mjs`, committed with this file, run after)

**The pool** is pilot 6's: 93 live SAT `v2` textual CoE items. Pilot 5's four
CoE sources are excluded.

**What "minus pilot 6's sources" means here.** Pilot 6 never produced
sources. It stopped at its screen before any item was adapted or graded. Its
18 candidates were only screened, and that screen is the instrument now
demoted.
- Read strictly, "minus pilots 5 and 6 sources" removes pilot 5's four
  adapted sources.
- Pilot 6's candidates stay eligible. This is the only reading under which
  "prefer human-sat" can be honoured: all 5 human-sat sources in the pool
  were pilot 6 candidates.
- **If the owner meant to exclude pilot 6's 18 candidates too, this run used
  the wrong pool,** and the results must be read with that in mind.

**Selection:**
- Pilot 6's candidate ranks **1-12, in that order**. The order was fixed by a
  rule written before pilot 6's screen ran: human-sat first, then sha256 of
  `map-adapt6-2026-10-07|<id>`.
- The screen result is ignored; no candidate is chosen or skipped by it.
- 5 human-sat + 7 others.
- Bands alternate: grade 7 RIT 200-209, then grade 8 RIT 210-219 (6 each).
- The script refuses if any source changed or left the live verified bank.

## Stages, in order. STOP at the first DECIDING stage that fails

**Stage 0: fidelity and exact checks (deciding).**
- Two adapters, six items each, pilot 5's brief `MAP-ADAPT-BRIEF.md`
  unchanged.
- One fresh fidelity reviewer.
- `map-adapt-checks.mjs --dir map-adapt7/ --n 12`: X1-X5, E1, E3, F.
- An item failing gets one repair. The checker's PROBLEM line is relayed
  verbatim, option letter included.
- Repaired items get a fresh fidelity re-check. An item still failing is
  dropped.
- **Bar: at least 11 of 12 survive.** Drops count as failures in C, S1-b
  and G.
- Freeze commit before stage 1.

**Stage 1: options-only (REPORT-ONLY, gates nothing).**
- Adapted items only: 3 split files of 4, all 20 controls (R 8, V 12) in
  each, per-file seeded flat deal.
- Each file gets its own three fresh samples.
- Reported: candidate rate vs control R and V, and unanimity rate as a
  batch comparison against the controls' (CLAUDE.md 2026-09-25: three
  samples, not three solvers).
- Pilot 6's source-screen numbers for the same 12 sources are reported
  alongside.
- It runs whatever stage 0 shows after freeze, so it is always reported.

**Stage 2: with-source (deciding).**
- Two fresh graders, pilot 5-6's schema and prompt, count 12.
- Batch 3's `wsItem`, imported unchanged.
- `map-adapt6-score.mjs ws --dir map-adapt7/` (`wsBars6`, selftested).

| bar | threshold |
|---|---|
| **C** exclusivity | >= **10 of 12** |
| **S1-b** pilot-pass (conditions 1-4) | >= **10 of 12** |
| **G** option dead by both graders | on <= **2 of 12** items (drops count) |
| **S1-c** calibration | `easier` <= **4 of 24** AND `harder` < **6 of 24** |
| **S1-d** band | each grader's mean offset within **+-0.5** |

**Stage 3: relative naturalness (deciding).**
- Two fresh judges, prompt 5, count 18: the 12 adapted passages plus batch
  2's 6 comprehension passages, shuffled.
- **E: pooled candidate median >= pooled control median.**
- INVALID if the control median is 1.
- Caveat: the candidates are short, the controls about 220 words.

**Stage 4: only if stages 0, 2 and 3 all pass.**
- Insert STAGED (`verified=false`) under the new cohort **`map-adapt-p7`**
  (family `map`, section `reading`).
- `verify_meta` carries:
  - `source_item_id`, source family and cohort
  - `changes`
  - the stage results
  - `options_only: report-only (CoE)`
  - `cross_test_exposure`: the source id plus the count of real
    (non-internal) students already served it, via `study_test_accounts`
- **MAP stays unreachable and unverified.** No code, topic or blueprint
  change.
- Release is the owner's call, and a human read is recommended first.

*Range checks:*
- C, S1-b and G span 0-12.
- S1-c spans 0-24 per count.
- S1-d can fail from either side.
- E can fail unless the control median is 1.

The bar functions are pilot 6's, break-tested (`map-adapt6-score.mjs
--selftest` passes).

## Prediction

- **S1-c `easier`** is the likeliest failure: simplified argument items tend
  to state the claim plainly.
- **G** is next.
- Options-only will be high (about 90%). That is the reported saturation,
  not a verdict.
