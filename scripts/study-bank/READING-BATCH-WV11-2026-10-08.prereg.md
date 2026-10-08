# SSAT Upper Reading batch WV11 (2026-10-08): pre-registration

**The LAST agent try on the attitude item** (owner). Committed before any WV11 author runs. The result
goes in `READING-BATCH-WV11-2026-10-08.md`.

## The owner's decision (via the coordinator)

WV11 keeps the character-action attitude form and adds exactly three things:
1. **The attitude action or reply is at least one full sentence**, never a two-word reply, so that
   kill quotes can meet the three-word minimum.
2. **No irony, dryness or teasing in any attitude version's licensing action.** Each action is read
   literally. This goes into the licensing judges' prompt, break-tested on WV10-P03 v4.
3. **Vocabulary senses must not overlap in any context.** A judge pre-check rates each pair of
   senses, break-tested on WV10-P02's "raised".

**Everything else is as in WV10:** three passages, the first two that clear pre-flight, one fix round,
the grouped screen before the draw, the same relative bars and the same stop rule.

**Stop rule:** if attitude causes a refusal, or a grader finds a second attitude answer, stop and
report. **The owner has said a person then writes the attitude questions.**

Stage what passes. Releases still wait for the co-founder's WV6 read.

## Why

In WV10 (`READING-BATCH-WV10-2026-10-08.md`, `2d17c811`) the character-action attitude item was
licensing-clean in all 15 question-versions in round 0, with one substantive failure in 30 overall.
The stop rule still fired, for three reasons:
- **P01:** a two-word reply could not supply a three-word excluding quote.
- **P03:** "before he wrote a fourth" read as a dry jab (irritated vs playful).
- **P02, vocabulary:** "raised" (hoisted vs reared) survived a rewrite.

## The three additions and their break tests (all run before this commit)

### 1. Full-sentence action (mechanical, `ssat-wv.mjs fullSentence`, ids `WV11-` and later)

Each version's attitude `why` (the quoted action) must:
- have at least 6 words;
- begin at a sentence start;
- end with sentence punctuation.

**Break test on WV10's final units:**
- it flags the fragment-style action quotes, including P01 v0/v2 and every fragment in P02 and P03;
- it passes full-sentence quotes ("That's gone now, and tuning won't fetch it back.", "Shall we have it
  framed for the committee room?").

### 2. No-irony licensing prompt (the licensing judges' prompt, WV11 wording, fixed)

> Open only `<lic-vK.json>`. Below are reading passages, each followed by five-choice questions.
> Answer each question as a careful expert test-taker, judging it against its own passage only. Read
> every character's action or reply LITERALLY: if an action or reply could be taken as ironic, dry or
> teasing, and that reading would support a different choice than its literal reading, you must name
> that other choice as "second_defensible". For each give: "pick" (A-E); "second_defensible" (the
> letter of any other choice a careful reader could also defend from the passage, or "none");
> "exclusions": for EVERY choice except your pick, a sentence (at least three words) copied exactly
> from the passage that rules that choice out; and a one-sentence "note". Return JSON
> {"labels": {...}} to `<lic-vK.X.json>`. Do not open any other file in scripts/study-bank/ or in that
> folder, or any web page. At the end, state which files you opened.

**Break test** on WV10's round-1 v4 file, which holds all three units' v4 (`ssat-wv11-breaktest/irony/`),
two judges:

| question-version | result |
|---|---|
| WV10-P03 v4 (irritated) | **REFUSED by both judges** ("playful", the dry "before he wrote a fourth") |
| the other 5 (3 vocabulary; P01 v4 amused; P02 v4 indignant) | pass |

P01 v4 is warm teasing and passed. The brief separately forbids teasing in the amused version.

### 3. Vocabulary sense-overlap pre-check (`ssat-wv.mjs sensebuild` / `verify --senses`)

- Two fresh judges rate all 10 pairs of each vocabulary question's five glosses as "overlap" or
  "distinct", using the prompt in `ssat-wv11-breaktest/` (fixed).
- **The rule is chosen on break-test data, before authoring: a vocabulary set is refused if ANY pair
  is rated "overlap" by BOTH judges.** Single-judge overlaps are recorded.
- **Why agreement and not "either judge":**

| set | either-judge rule | agreement rule |
|---|---|---|
| WV10 "raised" | refuse | **refuse** (hoisted/reared, both judges, as required) |
| WV10 "struck" | refuse | refuse (dawned on/concluded) |
| WV10 "ran" | refuse | refuse |
| constructed "bank" | refuse | refuse (riverside/heap up; tilt/heap up) |
| constructed "pitch" (throw / tar / musical tone / set up / sales talk) | refuse | **pass** (one judge flagged 2 pairs, the other none) |

The either-judge rule refuses everything, constructed homonym sets included, so no author could meet
it. The agreement rule refuses the required case and passes a genuinely homonymous set.

## Pre-flight, stages and bars: identical to WV10

**Pre-flight:**
- the stage 0 checks: mechanical, A1, character-action stem, felt lexicon, announced tone, licensing
  (WV11 prompt), sense overlap, and the new full-sentence rule;
- one fix round, exact-listed-word rule;
- then the grouped screen: refuse a unit if any version receives >= 8/18;
- 3 units; the batch is the first 2 by id that pass all of pre-flight.

**Then:** freeze, draw, render, commit; Stage 1 C+F+Q; Stage 2 E; Stage 3 A; Stage 4 B. **Stop at the
first failure.**

| bar | threshold | status |
|---|---|---|
| C exclusivity | >= 11/12 | deciding |
| Q distractor >= plausible | >= 4/96 | deciding |
| dead-by-both | <= 7/12 | deciding |
| E naturalness | median >= live median | deciding |
| A options-only isolated | <= control + 10 points | deciding |
| B options-only grouped | <= 40% | deciding |
| F, pilot-pass | none | reported |

**The attitude stop rule**, unchanged from WV10 and now final. Either of these ends agent attitude
authoring, and a person writes the attitude questions:
- after the fix round, fewer than two units pass and any refusal is on the attitude item (the
  full-sentence rule, licensing or stem);
- a post-draw grader picks off key or names a second answer on an attitude item.

If everything passes, insert STAGED as `ssat-reading-wv11`, not released until the WV6 read.

## Authors

- **Three fresh authors, at most two at a time:** P01 narrative fiction, P02 community feature, P03
  science feature.
- **Fresh topics only.** Avoid every earlier topic, WV10's included: pianos, carousels, dune beetles.
