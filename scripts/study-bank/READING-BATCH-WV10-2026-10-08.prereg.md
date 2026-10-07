# SSAT Upper Reading batch WV10 (2026-10-08): pre-registration

Committed **before any WV10 author runs.** The result goes in `READING-BATCH-WV10-2026-10-08.md`.

## The owner's decision (via the coordinator)

**Proceed with WV10. Keep the construction for the five question kinds that work. Change ONLY the
attitude item**, to the character-action form: "X's [specific action/reply] in paragraph N suggests
that X feels/is ___". The answer must be inferable from that action in context and is never a tone
judgement about the narrator.

**What stays the same:**
- Five felt attitudes in five directions, with the same lexicon and the same no-announced-tone rule.
  Each version's action licenses exactly one of them.
- All four checks.
- Three passages, of which the batch takes the first two to clear pre-flight.

**If WV10's attitude items still fail exclusivity or licensing, stop and report. The owner will then
decide whether a person writes that one question.** Stage what passes. Releases still wait on the
co-founder's WV6 read.

## Why

WV9 (`READING-BATCH-WV9-2026-10-08.md`, `d99e816e`) failed stage 0: only 1 of 3 units passed. After
one fix round, the narrator-tone attitude item still licensed a neighbouring felt direction:
wistful/admiring, amused/critical, worried/wistful. Across WV5-WV9 the attitude item has been the
binding constraint in every batch.

## What changes: the attitude item only (`ssat-wv.mjs`, ids `WV10-` and later)

- **Brief** (`SSAT-WV10-AUTHOR-BRIEF.md`):
  - the attitude section is replaced by the character-action form;
  - every other section is WV9's, unchanged.
- **New mechanical stem check** (`characterActionStem`). It refuses an attitude stem unless:
  - it names a paragraph;
  - it says "suggests";
  - it names a character ("X's ...");
  - it does not ask about the author or the narrator, and does not mention tone.
- **Break test, run before this commit:**
  - it flags every attitude stem of WV6, WV8 and WV9 (all narrator or author tone);
  - it flags a constructed "In paragraph 3, the narrator's attitude is ..." stem;
  - it passes two constructed character-action stems.
  - WV6 and WV8 units still verify unchanged.

**Unchanged from WV9:**
- the felt-only lexicon, `ATT_DIR9`, with indifferent words refused;
- the announced-tone check across all versions;
- A1;
- the licensing pre-check (one file per version index; two judges; the fixed prompt);
- the pre-draw grouped screen: refuse a unit if any version receives >= 8 of 18 grouped picks;
- the exact-listed-word fixer rule;
- one fix round;
- 3 units, of which the batch takes the first 2 by id that pass every pre-flight check.

## The stop rule for the attitude item (owner's instruction, stated in advance)

WV10 is **stopped and reported for the owner's decision** if either of these happens:
1. **Stage 0:** after the one fix round, fewer than two units pass, and at least one refusal is a
   licensing refusal on the attitude item.
2. **Stage 1:** a post-draw grader names a second defensible answer on an attitude item, or picks off
   key there.

The second condition is stricter than the batch bar C >= 11/12. Under it, a C miss on any attitude
item stops WV10 for the owner even if C still passes. The batch's own deciding bars are reported
alongside, unchanged.

## Stages and bars: identical to WV6/WV8/WV9

1. Pre-flight: stage 0, then the grouped screen.
2. Freeze, draw, render, commit.
3. Stage 1: C+F+Q.
4. Stage 2: E.
5. Stage 3: A.
6. Stage 4: B.

**Stop at the first failure.**

| bar | threshold | status |
|---|---|---|
| C exclusivity | >= 11/12 | deciding |
| Q distractor >= plausible | >= 4/96 | deciding |
| dead-by-both | <= 7/12 | deciding |
| E naturalness | median >= live median | deciding |
| A options-only isolated | <= control + 10 points | deciding |
| B options-only grouped | <= 40% | deciding |
| F, pilot-pass | none | reported |

**If every stage passes and the attitude stop rule does not fire:** insert STAGED as
`ssat-reading-wv10`. It is not released until the WV6 read confirms the method.

## Authors

- **Three fresh authors** write P01, P02 and P03, at most two at a time.
  - P01: narrative fiction.
  - P02: a history or community feature with named people.
  - P03: a science feature with named researchers.
  - Every unit needs a character whose action carries the attitude.
- **Fresh topics only.** Avoid every earlier topic, including WV9's: weather records, glow-worms,
  orchards and frost.
