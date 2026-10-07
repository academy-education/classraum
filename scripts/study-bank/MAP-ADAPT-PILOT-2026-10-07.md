# MAP Growth pilot 5, 2026-10-07: results. ADAPTING our own gated items

Pre-registration: `MAP-ADAPT-PILOT-2026-10-07.prereg.md`.
- Committed `051deaa1`, before any adapted item existed.
- Frozen `7288a7fa`.
- Amendment 1 (`5ee15935`) committed before any pick was scored.

**Verdict: FAILS at stage 2 (with-source). Stopped there, per protocol.**
- Stage 3 (naturalness) was not run.
- Nothing was inserted.
- MAP stays unshipped.

## Sources (24; `map-adapt/sources.json`, written by `map-adapt-select.mjs`)

| adapt id | source | role |
|---|---|---|
| MAPA-01..04 | SSAT `rw-RW3-S06` (`911cedb4`, `48240770`*, `22a23962`, `22f51ea9`) | literary set P1, g6 |
| MAPA-05..08 | SSAT `rw-RW3-S01` (`5cf8a937`, `e1f92e93`*, `9e1c6ea4`, `7cfb9796`) | literary set P2, g7 |
| MAPA-09..12 | SSAT `rw-RW3-S02` (`a1870fb0`*, `8c43dbc8`, `232a5a3b`, `722470a4`*) | informational set P3, g8 |
| MAPA-13..16 | SAT WIC (`9b185a4f` obligation, `fe4fc455` blame, `45212eff` noise, `15a999f3` rising) | Vocabulary |
| MAPA-17..20 | SAT transitions (`c274e771`, `888501fe`, `91f2282d`, `4aec0da6`) | Writing: Transitions |
| MAPA-21..24 | SAT `v2` CoE (`15755f7c`*, `209f3763`*, `2c67f590`*, `a349f42f`*) | Informational, evidence |

`*` = in a human blind sitting (8 of 24). The human was right on 3 of those 8.

**Not used:**
- TOEFL: the options-only instrument saturates there, so bars A and P could
  not be passed or measured.
- ISEE: Upper level only, and it supplies the controls.
- SSAT Verbal: not a MAP format; analogies are a known leaky stratum.

## Stage 0: fidelity and exact checks. PASS, 22 of 24 survive (bar >= 22)

- **Two adapters.** One fresh adapter did sets P1-P3, another the 12
  standalones.
- **Fidelity review:**
  - Reviewer 1 judged all 24: key kept 24/24, new defensible answer 0/24,
    roles kept 24/24.
  - Exact checks failed 7 items: P2's passage at 355 words (4 items),
    MAPA-16 at 133 words, MAPA-23 at 121 words, MAPA-24 with option A at
    FK 9.8.
  - Each of the 7 got one repair, then reviewer 2 re-checked the 6 whose
    content changed.
- **Dropped:**
  - **MAPA-16** (rising). Re-check: new_defensible. The adapter had swapped
    "discretionary" for "uncontrolled", which overlaps the key "rising".
    Reviewer 1 had noted the swap but passed it.
  - **MAPA-24** (warbler). E1 still failed after its repair.
    - **This one was partly my relay error.** The PROBLEM line I passed on
      dropped the checker's "optA", so the reviser rewrote the wrong option.
    - It was dropped by rule anyway, because the repair was spent.
    - Both drops count as failures in C and S1-b, out of 24.

## Stage 1: options-only. PASS

**Render defect, found mid-stage and fixed before scoring (Amendment 1).**
- The first render put all four items of a passage set in one blind file.
- The coordinator relayed a solver report: source sheet L03/L41 (P2
  inference + main idea) and L04/L42 (P3 purpose + inference) carry the same
  option content, and the solver matched them.
- Diagnosis:
  - Sources and adaptations WERE in separate sheets.
  - No source was a control.
  - It was sibling items of one passage in one sheet: the cross-item leak
    `attack-split.mjs` exists for. The prereg should have used it.
- Fix:
  - Each side was re-dealt into 4 files, one item per passage per file, all
    20 controls in every file.
  - Each file got its own 3 fresh samples: 24 solver agents.
  - A second defect found while splitting: per-arm flat dealing keyed every
    singleton arm "A". Candidates are now dealt flat across candidate arms
    from a random offset.
- The two interleaved-render samples are kept as `*.DEFECTIVE-RENDER.*` and
  are unscored.

| bar | result | denominator |
|---|---|---|
| A comprehension + writing | **25.0%** (bar <= 50), unanimous on key 2/16 (bar <= 4); control R 28.1% (valid 10-45) **PASS** | 16 items x 3 |
| V vocabulary | **0.0%** vs control V 61.1% + 20 (valid 30-<80) **PASS** | 6 items x 3 |
| P paired | adapted 18.2% vs chance 25.0 (margin -6.8); source 33.3% vs chance 22.3 (margin +11.1); **delta -17.9** (bar <= +10) **PASS**. Controls R+V 47.9% vs 45.4% across files. | 22 pairs x 3 a side |

**Read with care.**
- Vocabulary 0/18 and writing 0/12 are a SHARED PRIOR pointing away from the
  key:
  - 6/6 and 3/4 of those items were unanimous on one wrong letter.
  - The key text was verified against every render.
  - "Three samples, not three solvers."
- Below chance is not evidence of quality. P's large negative delta is
  mostly the writing arm: source 58.3%, adapted 0%. The adapter's
  grade-level distractor swaps moved the options away from the model's
  favourite.
- Comprehension alone: delta -3.7 (adapted +8.3, source +12.1 over chance).
- One CoE item is unanimous on its key both before and after adaptation:
  MAPA-22 3/3, its source `209f3763` 3/3.

## Stage 2: with-source. FAILS (two fresh graders, batches 2-4's schema)

| bar | result | |
|---|---|---|
| C exclusivity | **21/24** (bar >= 20) | PASS |
| S1-b pilot-pass (1-4) | **6/24** (bar >= 20); conditions 1-3 only 11/24; 11 items have an option dead by both | **FAIL** |
| S1-c calibration | easier **17**/44 (bar <= 8), harder 6/44 | **FAIL** |
| S1-d band | mean offset -0.32 / -0.32 (bar +-0.5) | PASS |

**Pilot-pass by source:**

| source | passed |
|---|---|
| CoE | **3/3** (MAPA-21, -22, -23) |
| SSAT sets | **2/12** (MAPA-06, -08) |
| transitions | 1/4 |
| WIC | 0/3 |

**Mechanisms the graders named:**

1. **The SSAT "worlds" distractors become dead at grade level.**
   - In the source, each wrong option is killed by ONE explicit sentence (the
     worlds construction).
   - Re-levelled to grade 6-8, that kill is a visible "direct negation of one
     sentence in paragraph 2". Both graders, independently, used those words
     for MAPA-01, -09, -10 and -11.
   - The adapter turned the denials into narration, and the narration still
     negates. That is what the source's key logic requires, so the defect is
     the source's construction, not the adaptation.
2. **Simplifying lowers the band.** P3, targeted at grade 8, was assigned
   190-209 by both graders, and its keys lift passage wording ("speak most
   truly while haggling"). Most of the 17 "easier" sit here and in P1.
3. **Cross-item cueing inside sets.** The same flaw the options-only split
   had to remove:
   - MAPA-05/06 share distractor families (beginners, sail alone, hull).
   - MAPA-10/11 share the "rejected sources" set.
   - Inherited from the SSAT source; both graders flagged it unprompted.
4. **The level is wrong in both directions.**
   - WIC and transitions targeted at grade 5 (MAPA-13 obligation, -14 blame)
     were rated too hard: "inference, not vocabulary".
   - MAPA-20 (grade 8, "Meanwhile") was rated too easy.
   - Re-banding words by inspection is not reliable.

**What held: the keys.** C is 21/24, and both graders picked the source's
key on all 22 rendered items. The only second answer named is MAPA-18
("By comparison"). Adapting does preserve key logic. It does not supply
distractors that tempt at the new level.

## Disposition

- Stage 2 failed, so stage 3 (naturalness) was not run, per "stop at the
  first failed stage".
- Nothing inserted. `verify_meta` provenance and cross-test exposure were
  never written.
- MAP family, cohort and topic do not exist; no code touched.

## Recommendation

1. **Do not adapt SSAT/ISEE "worlds" passages.**
   - Their distractor construction (one refuting sentence per option) is
     exactly what reads as dead or too easy once the prose is simplified.
   - The same shape also produces cross-item cueing.
   - This is the fifth agent-comprehension route to fail on with-source
     quality, after A76-A79/A81.
2. **The one positive signal is small:** SAT Command-of-Evidence standalones
   passed all four with-source conditions, 3/3. But:
   - n=3.
   - CoE is not a measured-clean stratum.
   - MAPA-22 is options-only unanimous both before and after adaptation.
   - If the owner wants one more try, make it a CoE-only adaptation of ~12
     items at grades 7-8, under these same bars. Include P and a
     one-item-per-file split from the start.
3. **MAP comprehension still needs a person** (REGISTER B11). Adaptation
   keeps keys but cannot make simplified distractors tempt.
4. **Cross-test exposure** was never written because nothing was inserted.
   Any future adapted item should carry `source_item_id`. A student who has
   met the SSAT passage would recognise its adaptation.

## Files

- `map-adapt/`:
  - `sources.json`, `adapted-*.json`
  - `batch.stage0-all24.json`, `batch.json` (the frozen 22)
  - `fidelity*.json`, `repair*.json`
  - `oo-{adapted,source}-f{1..4}.*`
  - `ws.md`, `ws.key.json`, `ws.grader-{a,b}.json`
  - `prompts.md`
- `map-adapt-{select,checks,render,score}.mjs`; checks and score have
  `--selftest`.
