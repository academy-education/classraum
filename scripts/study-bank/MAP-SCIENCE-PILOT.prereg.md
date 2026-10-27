# MAP Science pilot, 2026-10-27: pre-registration

Written **before any item exists**. The coordinator commits it together with its tools, before any author output.
Nothing here changes after an item is seen. A change after that point is a new pre-registration with its own date,
and it governs only items authored after it. Plan: `MAP-SCIENCE-PLAN.md` (owner decisions recorded there under
"Decided 2026-10-27").

## Why

MAP Science has 0 items. It needs 195 (65 per area) for 5 complete forms. The owner has held the whole MAP launch until
all four subjects reach 5 forms. This pilot runs 36 items through every stage, and its human sitting decides three things:

1. whether the method (agent authors on seeded slots, invented systems, with-source graders) produces items the
   co-founder clears
2. whether the model's blind attacks measure anything a person cannot do, on this family
3. the brief changes batch 1 (240 slots) starts from

## Inputs (all in `scripts/study-bank/map-v2-work/science-pilot/` unless noted)

| file | role |
|---|---|
| `slots.json` | 36 slots from `make-slots.mjs`, seed recorded in the file. `make-slots.mjs --check` must reproduce it byte for byte |
| `BRIEF.md` | author brief: the fictional-experiment rule, stimulus rules, option formats, the tells, slot tables, AUTHORING-RULES-FROM-NOTES v1 pasted (`apply-notes.mjs --check-brief` OK) |
| `sci-spec.mjs` | the one constants table (areas, DCIs, NGSS PE lists per band, RIT bands, formats, asks, cliché and hedge lexicons) |
| `sci-check.mjs` (+ `sci-check.fixtures.mjs`) | per-item and `--batch` checker; `--selftest` must print `SELFTEST OK` |
| `make-exclusions.mjs` -> `EXCLUSIONS-science.txt` | regenerate with `--live` immediately before authoring |
| `sci-packet.mjs` | grader packets (cold, keyed) and the report-only renders (covered, options-only), plus `score`; `--selftest` |
| `GRADER-BRIEF.md` | with-source grader brief, including the drop rules (copied below; this file governs if the two differ) |
| `AUTHOR-PROMPT.md` | the author prompt template |
| `scripts/study-bank/stage-map-science-pilot.mjs` | dry-run-by-default stager, cohort `map-science-pilot`, `verified=false`; `--selftest` |
| `autonomy-methods.json` | cohort `map-science-pilot` -> method `map-sci-pilot-agents+cfg-v2` |

**Slots.** 3 authors (L Life, P Physical, E Earth and Space), 12 each: grades 5-8 x low/mid/high. Kinds: data 15,
investigation 9, model 12. Stimuli: table 6, bar 3, line 3, scatter 3, procedure 5, procedure+table 4, scenario 12.
Formats: conditions 9, claim 8, values 6, term 6, trend 4, variable 3. Key letters 9/9/9/9 and key ranks 9/9/9/9, with
no letter x rank cell above 3 and no letter tied to one rank within an author. Asks rotate within each (kind, format),
so no ask holds more than half its group. Data/investigation claim slots: 2 of 24.

## Stages and seeds

| stage | what | seed / instrument | decides? |
|---|---|---|---|
| 0 | authors run `sci-check.mjs <file>` to exit 0 | exact | refuse until clean |
| 0b | coordinator runs `sci-check.mjs --batch L.json P.json E.json` | exact | refuse; one return per refused item |
| 1 | two with-source graders (fresh agents, no author or earlier grader), cold then keyed, `sci-packet.mjs grader` | GRADER-BRIEF.md | **yes**: drop rules below |
| 1b | co-founder-standard grader v2 (`cofounder-grader/COFOUNDER-BRIEF-v2.md`) over the survivors | `second_defensible` validated; other checks hold-only | flag -> one return; a second flag drops |
| 2 | figure-covered attack, 3 samples, data + investigation items | `sci-packet.mjs covered`, deal seed 20261028 | **no**; corroborates stage 1 only (below) |
| 3 | options-only attack, 3 samples, all 36 + 24 live act/science control | `sci-packet.mjs oo --control 24`, deal seed 20261029, control draw seed 20261027 | **no**; reported only |
| 4 | stage `verified=false` with `--cleared` = the stage 1/1b survivors | `stage-map-science-pilot.mjs` | — |
| 5 | **L0 full sitting**, every staged item, blind, co-founder (Daniel) | `draw-next.mjs` / bank-qc review | **yes**: release |

Fresh subagents only, Claude only, no GPT, no NWEA material.

## Drop rules (stage 1 and 1b), fixed now

1. `key_correct: no` from either grader, confirmed by the coordinator's recomputation -> **drop**. There is no repair: a
   repair made in response to the round that caught it is fitting to the instrument (CLAUDE.md 2026-09-24).
2. The same `second_defensible` option from both graders -> **drop**. From one grader -> one return; a fresh grader re-checks; a second hit -> drop.
3. A confirmed `fact_error` -> **drop**.
4. `no_source_needed: yes` from both graders on a data or investigation item -> **drop**. From one grader -> drop only if
   the stage-2 figure-covered samples are unanimous on the key for that item. Otherwise it is recorded.
5. A confirmed `recognised_real_data` -> **drop**.
6. `free_elimination` from both graders killing 2+ distractors -> **drop**. Killing 1 -> recorded.
7. `readability: problem` confirmed against the renderer -> **drop**.
8. `grade_fit` is recorded only, never a drop. A `cross_item_pattern` named by both graders **holds the batch** for the
   coordinator to read before staging. Re-deciding the pattern after seeing which items it touches is not allowed; it
   holds or it does not.

## The two attacks are REPORT-ONLY, and why (fixed now)

- **No options-only bar is set.** On ACT Science the shipped bank reads 88.9% options-only to the model and 28.6% to the
  co-founder (`act-science-cofounder-2026-09-18`, n=21). A control near 89% leaves about 11 points of headroom, so any
  "+10 over control" bar would be unreachable by construction (CLAUDE.md ceiling corollary). On model items the attack
  measures the construct: a student who knows the science should answer without a stimulus.
- **Reported:** per arm (candidate, live control), the hit rate and the **unanimity rate** of the 3 samples, read as one
  model sampled three times. There is no per-item verdict and no interval, and no `n*p^3` expectation is computed.
- The figure-covered attack is reported the same way per kind. Its only decisive use is the corroboration in drop rule 4.

## Validity measurement for the family (decided by the L0 sitting, fixed now)

On the same staged items the co-founder sits, compare:
- **M** = the stage-3 model options-only hit rate (candidate arm)
- **H** = his blind hit rate, with each pick scored against `key_slot` (`bank-state.mjs sittings`, `reviewer_kind='human'`)

The rule:
- **M - H >= 30 points**: the options-only instrument is recorded **invalid for map/science**, as on ACT Science, ACT
  Reading, MAP Reading and TOEFL MC. Every later batch keeps it report-only, and the with-source half plus the human
  sitting remain the gate.
- **M - H < 30 points** with H at or under 35%: the instrument is recorded **provisionally discriminating** for the
  data/investigation kinds only. Batch 1's prereg may then make the figure-covered unanimity rate (candidate vs this
  pilot's) a batch-level hold for those kinds. Model items stay report-only either way.
- **H > 35%** (four-choice chance 25%): the sitting itself flags guessability. Batch 1 does not start until the
  coordinator has read his picks and notes against the slot table (which ask, format or rank he exploited).

## Release (stage 5), fixed now

- New stratum `map/science/multiple_choice` -> **L0 full**: every staged item, capped at 36 (Amendment 3 §3.3).
- Each flag archives its item. Two or more flags in the sitting send batch 1 to a full sitting too.
- Release only through `release-by-shape.mjs <runId> --shape full`, after his notes are classified (`cofounder-notes.json`).
- **Queue order (owner, 2026-10-27):** the pilot sitting is drawn AFTER the MAP Language runs (`map-language-v2-writing`,
  `-grammar`, `-mechanics` spots and anything they trigger).
- Released rows stay invisible to students until the MAP flip, which waits for all four subjects at 5 forms.

## Verdict

- **PASS** if at least 24 items are staged after stage 1/1b, AND the L0 sitting archives at most 1 of them, AND
  H <= 35%.
- **FAIL-METHOD** if 2 or more are archived. Batch 1 does not start until the brief absorbs his notes (each note
  becomes a rule, a check or a fixture; AUTONOMY-ALGORITHM §5).
- **FAIL-YIELD** if fewer than 24 items are staged. Batch 1's slot plan is re-sized from the measured per-(kind, format)
  survival before it is written.

## Pre-registered predictions (recorded; none gates)

- **P1 EMPTY:** at most 2 of 36 slots empty, most likely low-tier grade-5 values or trend slots on line graphs, where the ⅛-range READ rule bites.
- **P2 stage-1 drops:** at most 8 of 36 (keep >= 78%).
- **P3 `no_source_needed`:** at most 3 of 24 data/investigation items flagged by either grader.
- **P4 options-only:** the candidate arm is below the ACT Science live control arm (our options share one frame by construction; ACT's are freer prose).
- **P5 human:** H within 25-35%, consistent with ACT Science's 28.6%.
- **P6 grade fit:** graders place most grade-5 items "above". Recorded and expected; it decides nothing (Stage A).

## Files the coordinator writes during the run (not before)

- `scratchpad/map-science-pilot/<L|P|E>/items.json` (authors)
- `scratchpad/map-science-pilot/packets/` (sci-packet outputs)
- `scratchpad/map-science-pilot/grades-<1|2>.json` (graders)
- `scratchpad/map-science-pilot/cleared.json` (the ids surviving stage 1/1b)
- a `MAP-SCIENCE-PILOT-RESULT.md` with every count and denominator, and a REGISTER §5 entry in the same commit

## Tool fingerprints at pre-registration (sha256, first 16)

- `map-v2-work/science-pilot/slots.json` 732b0ae43536a0bf
- `map-v2-work/science-pilot/BRIEF.md` 2f21ebeb2900a3e7
- `map-v2-work/science-pilot/sci-spec.mjs` 6eb0c773a593232b
- `map-v2-work/science-pilot/make-slots.mjs` 9ec54698edb1b933
- `map-v2-work/science-pilot/sci-check.mjs` 64593a4f678be884
- `map-v2-work/science-pilot/sci-check.fixtures.mjs` a042c82210f4f116
- `map-v2-work/science-pilot/make-exclusions.mjs` 37500fbd2ad32b34
- `map-v2-work/science-pilot/sci-packet.mjs` 875a6edc3ad56e4d
- `map-v2-work/science-pilot/GRADER-BRIEF.md` d2f562b11ab1f117
- `map-v2-work/science-pilot/AUTHOR-PROMPT.md` d513d92a5dc518cf
- `stage-map-science-pilot.mjs` 245a1ee9dcb8eb06

`EXCLUSIONS-science.txt` is regenerated before authoring (`make-exclusions.mjs --live`), so it is not fingerprinted.

## Amendments (2026-10-27, before any keyed pass, before any drop decision)

**A1. The first two graders were not blind; two fresh graders decide.** GRADER-BRIEF.md told graders to read
BRIEF.md, whose slot tables list every slot's key letter and key rank. Grader 1 reported it; grader 2 read the same
brief. Their cold picks therefore say nothing about whether the keys are right, and they are recorded as non-blind
(`packets/g1/cold.json`, `packets/g2/cold.json`). Fix: `BRIEF-grader.md` is BRIEF.md with the slot tables cut, and
GRADER-BRIEF.md now points at it. Stage 1 is re-run by two FRESH graders (g3, g4) who are not shown g1/g2's output;
the drop rules apply to g3/g4. g1/g2's shortcut flags (both independently flagged MSP-E-04, MSP-E-12, MSP-P-04,
MSP-P-11; the flags do not depend on knowing the key) are recorded as findings and reported beside g3/g4, never
substituted for them.

**A2. Scorer fix.** `sci-packet.mjs score` compared each answer value to the key letter, so `{pick, basis}` answer
files scored 0/72 instead of failing. It now accepts a bare letter or `{pick}` and refuses anything else (selftest
cases added; removing the fix fails both). Report-only renders, scored after the fix: covered candidate 48.6%
(unanimous 15/24, 9 on key); options-only candidate 59.3% vs live act/science control 58.3% (unanimity 61.1% vs
83.3%). Caveat: each sample saw the covered render before the options-only one, and the options-only packet repeats
the 24 covered items, so options-only picks on those items are not independent of the covered picks. A first
single-pass "three samples" file set was voided unscored (`packets/void-single-pass/`).
