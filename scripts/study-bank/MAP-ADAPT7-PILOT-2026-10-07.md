# MAP Growth pilot 7, 2026-10-07: CoE-only adaptation, options-only report-only. Results

Pre-registration `MAP-ADAPT7-PILOT-2026-10-07.prereg.md`, committed
`2a4c7091` before selection. Frozen `d62d6eca`.

**Verdict: FAILS at stage 2 (with-source) on three deciding bars. Stopped
there.**
- Stage 3 (naturalness) was not run.
- Nothing was inserted.
- MAP stays unreachable and unverified.

## Sources (`map-adapt7/sources.json`)

Pilot 6's candidate ranks 1-12, in their pre-fixed order, with the screen
result ignored:
- `b12c632a`, `4448abd0`, `8a08e057`, `bee6a5cc`, `32ff11a5` (human-sat)
- `572ba180`, `ab0bf38a`, `17c8742e`, `c873257a`, `77766937`, `766e85de`,
  `cf913e6a`

Grade 7 and grade 8 alternate, 6 each.

**Pool reading:** pilot 6's 18 candidates were treated as eligible, because
pilot 6 adapted nothing and all 5 human-sat sources were among them. If the
owner meant to exclude them, this run used the wrong pool.

## Stage 0: deciding. PASS, 12/12 survive (bar >= 11)

- **Fidelity:** 12/12 key kept, 0 new defensible answers, roles kept 12/12.
- **E3 batch failure:** the key was uniquely longest on 6 of 12 items (bar
  <= 25%). Each of the 6 got one repair, with the checker line relayed
  verbatim plus that item's option lengths.
  - The reviser lengthened one wrong option per item and left every key
    unchanged. E3 is now 0/12.
  - A fresh fidelity re-check passed all 6.
  - Note that the fix is cosmetic: several keys are now second-longest by
    1-2 characters.

## Stage 1: options-only. REPORT-ONLY, gates nothing

Three split files of 4 items each, every file with all 20 controls and its
own three fresh samples (9 agents).

| arm | rate | unanimous on some letter | on key |
|---|---|---|---|
| adapted (12 x 3) | **83.3%** | 12/12 (100%) | 10/12 |
| control R (8 items x 9 samples) | 26.4% | 58.3% | |
| control V (12 x 9) | 63.0% | 66.7% | |

The same 12 sources scored 34 of 36 on the key in pilot 6's screen (94.4%).
That is the saturation the prereg demoted. The rate was predicted and does
not decide anything.

## Stage 2: deciding. FAILS (two fresh graders)

| bar | result | |
|---|---|---|
| C exclusivity | **12/12** (bar >= 10) | PASS |
| S1-b pilot-pass (conditions 1-4) | **6/12** (bar >= 10) | **FAIL** |
| G option dead by both | **4/12** (bar <= 2) | **FAIL** |
| S1-c calibration | easier **10/24** (bar <= 4), harder 3/24 (bar < 6) | **FAIL** |
| S1-d band offset | -0.33 / -0.25 (bar +-0.5) | PASS |

Both graders picked the key on all 12 items. Neither named a second
defensible answer.

*Scoring note:* grader b gave four bands off the ten-point grid ("RIT
195-205", "RIT 205-215"). The scorer reads the lower bound, which moves only
S1-d, and S1-d passes either way. No deciding verdict depends on it.

**Mechanisms the graders named:**

1. **Dead distractors (G).** On 4 items one wrong option is off the claim's
   axis entirely, so both graders called it dead:
   - an off-topic book-count option (MAPA7-08)
   - an irrelevant pay detail (MAPA7-11)
   - an option that is unrelated or ends elliptically (MAPA7-10, -12)
   - These are the source's "neutral" distractors. At grade level they read
     as obviously irrelevant.
2. **Easier than target (S1-c).** The key reuses the passage's own words,
   so it can be found by phrase-matching ("lexical lift", "copies the
   passage's wording"; MAPA7-01, -09, -08), and grader a also flagged
   MAPA7-02, -04 and -10.
   - Grader b, unprompted, named a cross-item pattern: "the answer usually
     echoes or flatly reverses one passage sentence".
   - That is the pilot 5 finding again, on a different source family.
3. **What held: the keys.** Exclusivity is 12/12, the third adaptation
   run in which keys survived the trip intact.

## What this settles

Three adaptation pilots in one day, three different source shapes, one
failure mode:

| pilot | source | pilot-pass | `easier` |
|---|---|---|---|
| 5 | SSAT "worlds" sets | 6/24 | 17/44 |
| 6 | CoE | stopped at the screen | — |
| 7 | CoE | 6/12 | 10/24 |

In every run, adaptation kept the key logic. What it cannot supply is a
wrong answer that tempts a grade 7-8 reader:
- Simplifying the passage makes the key quotable.
- Simplifying the options makes the off-axis distractor visibly dead.

That is the same quality wall agent authoring hit in pilots 1-4.

## Recommendation

- **Close the adaptation route for MAP comprehension.** It does not fix the
  failure mode: across three runs, the distractors and the difficulty fail
  the graders every time.
- **REGISTER B11 stands:** a person writes or selects MAP comprehension.
- If anything is tried by agents again, it should be the one strand still
  unproven: a human rewriting only the distractors of these already-adapted
  items, keys untouched, then the same bars. That is a human task, not a
  third agent brief.

## Files

- `map-adapt7/`:
  - `sources.json`, `adapted-{a,b}.json`
  - `batch.pre-repair.json`, `batch.json` (frozen)
  - `fidelity*.json`, `repair*.json`
  - `oo-adapted-f{1..3}.*`
  - `ws.md`, `ws.key.json`, `ws.grader-{a,b}.json`
  - `prompts.md`
- `map-adapt7-select.mjs`
- `map-adapt6-{render,score}.mjs` (`--dir`, `oo-report`)
