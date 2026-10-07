# SSAT Upper Reading batch WV9 (2026-10-08): pre-registration

Committed **before any WV9 author runs.** The result goes in `READING-BATCH-WV9-2026-10-08.md`.

## Owner's decision (via the coordinator)

Go ahead with WV9, under a new prereg that adds both proposed fixes:
1. a pre-draw grouped-guess screen;
2. a felt-only attitude lexicon, with tone inferable, never announced.

The WV7 fixer rule stays: supporting quotes use the exact listed word. Everything else is as in WV6
and WV8:
- the same relative bars;
- fresh items only;
- stage whatever passes;
- releases wait for the co-founder's WV6 read (`ssat-wv6-cofounder-2026-10-07`).

## Why: the WV7 and WV8 failures

- **WV7 failed pre-flight**, on one mechanical quote ("trading" against "trade"). Its licensing
  failures were all attitude items in which "detached" was confused with a felt tone.
- **WV8 passed C 12/12, Q, dead-by-both, E and A, then failed B** (grouped options-only) at 21/36 =
  58.3%. Grouped guessers reconstructed one coherent world per unit, and the drawn P01 was that world
  (15/18). With the picks held fixed, the picks averaged 20% across all 25 draws, and P(B fails) was
  0.20.
- **WV8's felt versions announced their tone** after the fix round ("There is something comic about
  …").

## Fix 1: felt-only attitude lexicon, tone never announced (`ssat-wv.mjs`, ids `WV9-` and later)

**Five felt direction classes (`ATT_DIR9`):**

| class | contents |
|---|---|
| warm | as before |
| critical | as before |
| anxious | split out of the old "troubled": worried, uneasy, apprehensive, ... |
| sorrowful | split out of the old "troubled": regretful, wistful, sad, ... |
| amused | as before |

**The rules:**
- An indifferent-class word (detached, neutral, and so on) is refused as a choice.
- The five choices must cover the five classes.
- **Announced tone:** no version may contain any lexicon word (all classes, including the
  indifferent ones) or a tone-announcing word: comic, funny, laughable, amusing, absurd, admirable,
  shameful, regrettable, sadly, worrying, troubling, delightful, and so on.

**Break test, run before this commit, on every attitude set the method has produced:**

| set | how it failed | WV9 lexicon |
|---|---|---|
| WV5-P01-5 | graders: regret vs unease | flagged (indifference) |
| WV5-P02-5 | licensing: approving vs uneasy | **NOT flagged** (valid felt set) |
| WV6-P01-5 | graders: detached vs regretful | flagged |
| WV6-P02-5 | passed | flagged (detached) |
| WV7-P01-5, WV7-P02-5 | licensing | flagged |
| WV8-P01-5, WV8-P02-5 | licensing | flagged |
| constructed admiring/critical/worried/amused/wistful | | **clean** |
| constructed worried + uneasy | | flagged (shared "anxious") |

**Limits, stated now:**
- **WV5-P02-5 is a licensing failure.** Its passage licensed two directions, which no word list can
  see. The licensing pre-check exists for exactly this, and it fired on that item in its break test.
- **Splitting "troubled" re-allows unease and regret as two classes.** WV5-P01's confusion of the two
  is therefore left to the licensing pre-check, which caught it in the WV5 break test (P01-5 v1, both
  judges).
- **The announced-tone check fires on WV8-P02 v4 ("comic").** It also fires on "worry" naming a
  character's feeling (WV8-P01 v0/v1/v3/v4). That is a strict, deliberate false positive: the brief
  tells authors not to use those words at all.

## Fix 2: pre-draw grouped-guess screen (`ssat-wv.mjs gscreen-build` / `gscreen-score`)

**When and what:** it runs after stage 0 passes and before the freeze.
- Each unit's six questions are rendered together, options only, with no passage. The render is
  version-independent and its letters are seeded.
- Three fresh samples use pilot 4's grouped prompt verbatim.
- Hits are counted against **every** version k (choice k).

**Threshold, derived from WV8.** Each unit has 6 questions x 3 samples = 18 picks, so the picks
average 20% across the five versions by construction. The post-draw bar is <= 40%. **A unit is
REFUSED if any single version receives more than 40% of its picks (>= 8 of 18).**
- If every unit is at <= 7/18 for every version, then **any** draw pools to <= 14/36 = 38.9% <= 40%
  on these picks.
- So the post-draw grouped bar cannot be failed through draw luck alone. Fresh post-draw samples can
  still differ; B is kept unchanged, as instructed.

**Break test, run before this commit:**

| unit | max hits | verdict | note |
|---|---|---|---|
| WV8-P01 | v1 15/18 | REFUSE | |
| WV8-P02 | v1 9/18 | REFUSE | |
| WV6-P02 | v0 7/18 | PASS | |
| WV6-P01 | v0 15/18 | REFUSE | it passed B only because v3 was drawn (1/18 on v3) |
| margins | 7/18 | PASS | |
| margins | 8/18 | REFUSE | |

**No repair after the screen.** Rewriting options to defeat these guessers would be fitting to the
instrument. A refused unit is dropped.

## Authoring and units

- **Three fresh authors** write P01, P02 and P03, at most two at a time.
  - P01: a community or history feature.
  - P02: a science feature.
  - P03: narrative fiction.
  - All use fresh topics, avoiding every earlier topic: kilns, pottery, bats, tunnels, boats,
    lighthouses, newts, salamanders, clock towers, starwort, sheep grazing, aspen, eelgrass, mayflies,
    raccoons, hawk counts, market halls, bakeries, cricket pavilions, mussels, reservoirs, libraries
    and murals.
- **Pre-flight:** stage 0 (mechanical, A1, licensing; one fix round, with the exact-listed-word
  rule), then the grouped screen.
- **The batch is the first two units by passage id that pass all of pre-flight.** A third that also
  passes is kept on file, not used. With fewer than two passing units, the batch fails.

## Stages and bars: identical to WV6/WV8

1. Freeze, draw, render, commit.
2. Stage 1: C+F+Q.
3. Stage 2: E.
4. Stage 3: A.
5. Stage 4: B.

**Stop at the first that fails.**

| bar | threshold | status |
|---|---|---|
| C exclusivity | >= 11/12 | deciding |
| Q distractor >= plausible | >= 4/96 | deciding |
| dead-by-both | <= 7/12 | deciding |
| E naturalness | median >= live median | deciding |
| A options-only isolated | <= control + 10 points | deciding |
| B options-only grouped | <= 40% | deciding |
| F, pilot-pass | none | reported |

**If every stage passes:** insert STAGED as `ssat-reading-wv9` with `insert-ssat-wv.mjs`. It is not
released until the WV6 read confirms the method.
