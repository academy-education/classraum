# Reading bar calibration, Stage A (2026-10-07): pre-registration

Written and committed **before the draw, before any grader, judge or presence check runs.** Results
go in `READING-BAR-CALIBRATION-2026-10-07.md`. Measurement only: nothing is authored, repaired or
inserted in Stage A. Stage B (a new SSAT Upper batch with RELATIVE bars) is pre-registered separately,
after this stage's result is committed.

## The question (owner, via the coordinator)

The recent SSAT Reading and MAP pilots failed on ABSOLUTE with-source bars: exclusivity >= 10/12,
"easy" <= 6/12, pilot-pass >= 10/12, "dead by both" <= 2/12, `easier` <= 4/24, distractor quality
>= 75% plausible. **Nobody has measured how the LIVE, shipped, human-cleared reading bank scores on
the same graders.** If live items would fail those bars too, the bars were unattainable even for
items we already ship, and the pilots' failures say less than they appeared to.

What "known-good" means here, stated before the data so it cannot be reinterpreted: the live SSAT
Reading bank is human-cleared on GUESSABILITY only (co-founder sitting `ssat-cofounder-2026-09-12`,
options-only, 3/20 = 15.0%; model 21.1%). It has never been human-checked for difficulty or
distractor quality, and pilot 3 rated its prose low (s3 median 2, s4 1, s2 5). So this calibration
measures "the bank we ship", not "ideal items". ISEE Reading is the same construction family
(`*-reading-worlds-*`) and stands in for MAP's upper band, as the coordinator specified.

## Populations and draw (`reading-cal.mjs draw`)

- Live rows: `study_item_bank` family `ssat` / `isee`, section `reading`, `verified=true`,
  `archived=false`, read paged at draw time (at writing: SSAT 138 items / 31 groups in cohorts
  s2/s3/s4; ISEE 117 / 29 in s2/s3/s5/v1).
- Seed string `reading-cal-2026-10-07`. Per family, the target of **24 items** is split over cohorts
  by largest remainder on live item counts. Within a cohort, passage groups are ordered by
  sha256(`seed|family|group`) and taken **whole** until the cohort's count reaches its target
  (whole groups, so the drawn n is >= 24; expected about 25-32). Never re-rolled.
- Snapshot (ids, text, content sha) written to `reading-cal/sample.json` and committed before any
  grader runs.

## Instruments (Claude subagents only, fresh per role, each opens only its one file)

**SSAT: SSAT pilot 4's C+F prompt, with the one `option_quality` field** that the misread pilot added
(`misread/prompts.md` §8, verbatim, path changed). Why this and not pilot 4's bare prompt: the
distractor-plausibility rate the coordinator asked for exists only in that field, and §8 is the
exact prompt the SSAT pilot 5 Q bar was defined on. Every other field (pick, second_defensible,
difficulty, note) is pilot 4's wording unchanged. Two fresh graders on `reading-cal/ssat/withsource.json`
(pilot 4's format; options re-dealt with `seeded-shuffle.mjs`, key letters balanced by a dealer).

**ISEE: MAP pilot 7's with-source prompt 4, with the one `option_quality` line** (`misread/prompts.md`
§7, verbatim, count and path changed). Two fresh graders on `reading-cal/isee/ws.md`, rendered in
pilot 5's set format. Every item is stated as **grade target 8, target band RIT 210-219** (the top band
any MAP pilot targeted). Strand by subskill, fixed table in `reading-cal.mjs strandOf`: vocabulary →
Vocabulary; attitude/tone/purpose/structure/technique → Point of View, Purpose, Features, and
Structure; theme/character → Theme and Literary Elements; everything else → Central Idea, Concepts,
and Events. Area (Literary / Informational Text) per passage group, recorded in `reading-cal/areas.json`
before any grader runs. **Known bias, stated now:** ISEE Upper is written for students older than
grade 8, so `harder` and `too_hard` counts are expected to run high. That is why the S1-b variant
ignoring `too_hard` is also reported (secondary, not instead).

**Naturalness (reported, not a bar):** SSAT: pilot 3's neutral prompt verbatim (`misread/prompts.md`
§9 SSAT, count changed), two fresh judges on the drawn SSAT passages. ISEE: MAP pilot 7's prompt 5
verbatim (count changed), two fresh judges on the drawn ISEE passages. The pilots' naturalness bars
were already relative to live passages, so there is no absolute bar to calibrate; the medians are
recorded for Stage B.

## Measures, and the absolute bars they are read against (scaled to rates)

| measure | SSAT definition | ISEE (MAP grader) definition | pilot bar |
|---|---|---|---|
| exclusivity C | both graders pick the key, neither names a second defensible | same (`wsItem.excl`) | >= 10/12 = 83.3% |
| pilot-pass | derived: exclusive AND not easy AND no option dead-by-both | S1-b: both on key, no second, both `fits`, no option dead by both (`wsItem` c3 && c4) | >= 10/12 = 83.3% |
| dead-by-both | an option both graders label `dead` (`option_quality`) | an option in both graders' `dead_distractors` | G: <= 2/12 = 16.7% of items |
| easier / easy | F: grader-median easy (mean rank <= 1.5) | S1-c: `band` = easier, per grader label | F <= 50% of items; S1-c <= 4/24 = 16.7% of labels |
| harder | grader-median hard (mean rank >= 2.5), reported | S1-c: `band` = harder, per label | (SSAT none); S1-c < 6/24 = 25% |
| plausibility Q | (grader x distractor) labels strong/plausible; a picked distractor counts strong (`misread.mjs qBar`) | same | >= 75% |
| band offset S1-d | n/a | each grader's mean (assigned - target)/10 | within +-0.5 |
| naturalness | pooled median, reported | pooled median, reported | relative only |

Every rate is printed with its n and a Wilson 95% interval. Scorers refuse (exit 2) on any missing
item or field; nothing is imputed.

## What counts as a material gap (fixed now)

- Live **PASSES** a bar if its point rate meets the bar's rate; **FAILS** otherwise.
- The gap is **material** if the whole Wilson 95% interval lies on the same side of the bar as the
  point rate. A point rate on the failing side with the bar inside the interval is reported as
  "fails, not material".
- The interval understates uncertainty: the two graders are one model sampled twice (CLAUDE.md
  2026-09-25), and items cluster in passages. So "not material" is the honest reading of anything
  near the bar, and only a material FAIL licenses the conclusion below.
- **Interpretation rule, committed now.** If live FAILS a bar materially: that absolute bar was
  unattainable for items we ship, and a pilot that failed it was failed by the bar as much as by its
  items. If live fails not materially: the bar sat at the edge of what live attains. If live PASSES:
  the bar was attainable, and the pilots' failures on it were real deficits.

## Absent-option replacement A1 (`absent-check.mjs`)

Defect being fixed: A0 (pilot 4's lexical rule) flags paraphrased KEYS (MAP batch 2 9/10, pilot 7
5/12, SSAT pilot 4 2/10). A1 keeps A0 as a prefilter and adds a presence judgement; definition in the
script header. Exemptions (vocabulary, attitude/tone) are WV4 brief rules A/E, applied before A0.

**Judge prompt (two fresh judges per file, key-blind, open only their file):**

> Open only `<reading-cal/a1/judge-N.json>`. Each entry is a reading passage followed by one or more
> lists of answer options; the questions and the correct answers are withheld. For EVERY option id,
> decide whether the passage discusses what the option is about: the people, things, places, events
> or ideas it names, in any wording (a paraphrase, a summary, or a more general or more specific term
> counts as discussed). Do NOT judge whether the option is true, correct or supported: an option the
> passage contradicts, or a claim about something the passage discusses, still counts as discussed.
> Mark an option not discussed only if it brings in something the passage never mentions at all.
> For each option id give "discussed" (true or false) and "quote": a short span copied exactly from
> the passage (at least three words) where it discusses what the option is about, or "" if not
> discussed. Write JSON to `<reading-cal/a1/judge-N.X.json>`: {"<option id>": {"discussed": ...,
> "quote": "..."}, ...}, one entry for every option id in the file.

**Test population.** Known-good: every live SSAT and ISEE reading item, MAP batch 2's 10 passage
items (`map-pilot-2-rlu.batch.json`), MAP pilot 7's 12 items. Judged: every item A0 flags at least
once, all of its options (so the flagged option is not singled out). Bad cases, mixed in blind:
pilot 3's three items whose absent options its graders named (museum; herons and food; herons and
beetles: 5 options), and 7 constructed plants in `reading-cal/a1-constructed.json` (committed with
this file), each replacing one distractor of an A0-clean known-good item with an absent-content option
(4 plausible X3, 2 off-topic filler, 1 partly absent).

**Requirements (both must hold, or A1 is not adopted and Stage B uses no absent-option check at all,
recorded as such):**
1. A1 flags **no correct key** in the known-good population.
2. A1 fires on **every bad option that A0 passes to it**. Bad options A0 misses are reported as
   inherited false negatives (expected: pilot 3's "food").
Also reported: A1's flags on live distractors (each is a candidate defect or a false positive; not
gated, because live distractors are not guaranteed present), and the revert check (A0 alone, i.e.
the old rule, on the same keys).

## Running rules

- No grader, judge or check is re-run to get a different answer. A malformed output (missing items or
  fields; the scorer refuses) gets ONE fresh replacement agent, recorded.
- Order: commit this file → draw, render, A1 build, areas → commit → graders, judges → score → result
  file and REGISTER §5 entry in one commit.
