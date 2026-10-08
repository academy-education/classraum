# isee-verbal-s22 — pre-registration (written 2026-10-09, before any item or result exists)

## Why this batch
s21 inserted 29 of 30 synonyms and 27 of 40 SC (REGISTER §5, `d3bf36c1`). The live bank is
439 verified ISEE verbal rows. `isee-verbal-replay.ts --forms 12`, run for this prereg:

    synonym              222 items / 210 groups
    sentence completion  217 items / 205 groups
    forms 1-10 40/40, form 11 37/40 (syn 20/20, SC 17/20), form 12 2/40  -> 10 clean forms
    --need 11: synonyms +0,  SC +3
    --need 12: synonyms +18, SC +23

**Target: 12 clean forms. Commission 70 FRESH items (45 SC, 25 synonyms)** from five Claude
authors. Every word an author writes (SC options; synonym headword and options) starts with a
letter in that author's range, and the ranges are disjoint, so no cross-author collision is
possible:

    author  type      n    band                       letters  lane
    A       SC        15   13 hard / 2 medium         a-c      contrast / restatement / cause; science, medicine, technology, history
    B       SC        15   13 hard / 2 medium         d-i      examples / degree / purpose; economics, arts, sport, school, work
    C       SC        15   13 hard / 2 medium         p-s      concession / sequence / comparison; law, nature, travel, literature, family
    D       synonym   13   3 easy / 6 medium / 4 hard j-o      (s19 synonym brief)
    E       synonym   12   3 easy / 5 medium / 4 hard t-z      (s19 synonym brief)

**Thresholds, stated now:** 11 forms needs >= 3 of 45 SC (7%) and any synonyms; **12 forms needs
>= 18 of 25 synonyms (72%) AND >= 23 of 45 SC (51%).** s21 kept 29/30 synonyms (97%) and 27/40 SC
(68%); s20 47/70 SC (67%). 12 forms is the expected outcome if SC attrition stays near s21's. If a
type holds or attrition leaves it short, the measured number is reported; no bar moves and no
blueprint count changes. No two-blank SC.

## Process (shared 20-subagent cap)
Claude agents only, never GPT. **At most two of this batch's subagents run at once.** Authors
write ONE small JSON file per item into `scripts/study-bank/isee-verbal-s22-work/<letter>/<ID>.json`,
**5-7 items per run**, then stop; the next run of the same author resumes from the files on disk
(`isee-verbal-s22-merge.mjs <letter>` rebuilds `isee-verbal-s22<letter>.batch.json`, which every
checker reads). Completion is judged by the files on disk, never by a notification. A subagent
idle 6+ minutes (no file written) is relaunched from its disk state. Scratch: `isee-verbal-s22-work/`.

## Briefs
- **SC: s21's brief, unchanged except where §"What changed" says** — s18's distractor brief (every
  distractor the exact right word for a DIFFERENT sentence, matched on part of speech, register and
  rarity; key-rarest ~1 in 4, key-most-common ~1 in 4, same band for strictly-longest/shortest;
  `rarity_order` recorded and stripped); s20's four rules (no antonym/near-opposite among the
  options; no three options sharing a polarity the key lacks, `polarity` labelled and stripped; hard
  difficulty from the sentence, never a reversal whose opposite is an option; forced-pick
  stem-covered self-check + blind probe); s21's no "a"/"an" directly before the blank, and
  distractors as general-purpose as the key (no technical or concrete-niche distractor beside an
  abstract key).
- **Synonyms: s19's brief, unchanged** — one part of speech; every distractor the plain, standard
  gloss of a DIFFERENT likely ISEE Upper headword (`gloss_of`, stripped); antonym-of-key items <=
  25%; at most two options from one sense-family of the headword; no look-alike beside a same-sense
  cluster; plus s21's first-letter rule (below).

## What changed from s21 (and only this)
1. **A named rarity ceiling for every word, distractors included.** s21's largest SC drop class was
   "distractor too rare for ISEE Upper", 6 of 13 (s20: 2). The brief that asked for "test-worthy"
   distractors pushed authors up the rarity scale with no ceiling named. The ceiling, given to
   authors, the probe and (unchanged) the graders' above-band question:

   > **Every option word and every headword must be a word a strong 8th-10th grader would know from
   > school reading, or a word that commonly appears on ISEE / SSAT / PSAT vocabulary lists.** A
   > distractor is never rarer than that, whatever the key is. Out: technical and scientific terms
   > (ductile, friable, fusible, hygroscopic), Latinate literary rarities (lachrymose, plangent,
   > pellucid, sententious, recondite, sedulous, avuncular, abstemious, bilious, commodious, mawkish,
   > raffish, scabrous), and words whose common sense a teenager would not know (venal,
   > promulgate). Test: could this word appear, unglossed, in a 10th-grade English class text or a
   > mainstream ISEE/SSAT word list? If unsure, choose a commoner word.

   Those 20 words are every word s18/s20/s21 graders dropped as above band; they are a hard
   denylist in `isee-verbal-s22-selfcheck.mjs` (both types; it fires on 5 words of s21a, 2 of s21b
   and PROMULGATE in s21c). **The steering probe reads every word of all 70 items against the
   ceiling** (`above_ceiling`, per item) before freeze; any item with a word the probe puts above it
   goes into the revision round.
2. **"Key is the most test-like word" below 35% per author, in the probe.** s21's r2 probe still read
   author A's key as the test word on 9/20 (45%). Bar for every forced pick per author file, in the
   self-check and the probe: **fewer than 35% of items** (15 items -> at most 5). A file over it in
   r1 has its key-hit items named for the one revision round; the fix must stay under the ceiling
   (a plainer key in a reworked sentence, or a distractor as test-like as the key that a strong grade
   8 student knows - never a rarer distractor). r2 is recorded at freeze whatever it says.
3. **Mostly hard SC, difficulty from the sentence.** s21 authored-medium SC banked easy 5 of 12.
   s22 commissions **13 hard / 2 medium per SC author (39 / 6)**. A hard item is hard because of the
   sentence - the clue a clause or sentence away from the blank, a restatement that paraphrases
   without the key's definition words, stem vocabulary, a concession that must be tracked - while
   its KEY stays inside the ceiling (a word a strong 8th-10th grader knows). A medium item keeps a
   hard sentence and differs only in a commoner key. No sentence restates the key's dictionary
   definition next to the blank.
4. **New words only, inflections included:** no headword, key or option that is a live ISEE verbal
   word or any word of s17-s21 (frozen files and every author file). The list is
   `isee-verbal-s22.live-words.json` (2,793 words: 1,822 from the 439 live rows + 971 from 870 items
   in 30 prior files, built with `isee-verbal-s19-collisions.mjs --build --out ... --prior
   <s17..s21 tags>`). **Break-test, run for this prereg:** every s21 author file fires 75-80
   problems against it (one per word it uses). Each author runs the checker with `--words
   isee-verbal-s22.live-words.json --range <its letters>`.
5. **The with-source score script now parses the field shapes graders write** (the user's
   instruction: confirm it). s21's change-5 rule never met a real grader value - all 70 s21 rows
   had `free_elimination: null` - and the s21 script read the field as `String(x).toLowerCase()`.
   Measured on a scratch copy of s21 SC (`isee-verbal-s22-work/bt-sc.*`, reproduces s21's 27/40
   with 0 of 40 keep/difficulty differences): two graders writing `{option: abject}` and
   `{option: compulsory}` - different options - DROPPED the item as "2 graders name free elimination
   '[object object]'"; two graders writing `[abject, compulsory]` and `[compulsory, abject]` - the
   same two options - KEPT it. `isee-verbal-s22-withsource.mjs` parses `pick`,
   `second_defensible`, `free_elimination`, `above_band`, `reads_correctly` and `difficulty` against
   the item first: null / "" / one choice word / an array of choice words are read; anything else
   (an object, a word not on the item) **refuses, exit 2**, naming grader, item and value - a
   refusal means re-ask that grader, never drop or keep. Break-tested on the same copy: one grader
   naming an option -> kept; two graders on the same option (array and capitalised string) ->
   dropped; two on different options -> kept; an object -> exit 2; `"abjectly"` -> exit 2; restored
   -> 27/40 again. Graders are asked for `free_elimination` as an ARRAY of choice words.
6. **Controls are the whole eligible pool as it now stands** (`isee-verbal-s4` excluded, width 4,
   verified, not archived), counted for this prereg: synonyms **206** (s21's 29 now included), SC
   hard/medium **151** (s21's 27 included), of them **135 single-blank**. If the render prints a
   different eligible count, the control is that whole count and the number is reported.

## Self-check and probe (steering, decides nothing at the gate)
`isee-verbal-s22-selfcheck.mjs` per author file: SC - rule 1 (declared antonym pairs empty), rule 2
(polarity), each of antonym_pole / odd_one_out / most_specific / test_word forced-pick-is-key < 35%,
and the denylist; synonyms - the first-letter rule (**the key is the only option sharing the
headword's initial in at most 2 items per file**; s21 author C had 3/15, e.g. PRIOR -> previous),
`gloss_of` for every distractor, and the denylist. Plus the article scan (`sc-article-scan.mjs
--batch`) on every SC file during authoring.

After all five files pass, ONE fresh Claude probe agent (never an author, solver or grader) reads
`isee-verbal-s22-probe.mjs render r1`: the 45 SC as options only (keys dealt flat, interleaved, no
author tag) and the 25 synonyms as headword + options. It returns per SC item the four forced
picks, opposite pairs, polarity and `above_ceiling` (letters); per synonym item `above_ceiling`
(words). **Named for the ONE revision round:** any item with a word above the ceiling, a
probe-named opposite pair or a probe-read polarity breach, and the key-hit items of any forced pick
at >= 35% of its author file. Revisions touch named items only, inside the author's range, with
checker + self-check + article scan re-run; then one fresh probe (r2) re-reads everything and r2 is
recorded at freeze whatever it says.

## Freeze
After authoring: checker 0 problems on every file, self-check pass, SC article scan 0 split rows,
the probe round, and the structural pre-flight. Then `isee-verbal-s22-freeze.mjs` writes
`isee-verbal-s22-syn.batch.json` (seed 20261151) and `isee-verbal-s22-sc.batch.json` (seed
20261152): author-only fields stripped (`rarity_order`, `gloss_of`, `polarity`, `antonym_pairs`,
`selfcheck`), stored choice order dealt from a seeded balanced deck. sha256 recorded and committed
before any solver or grader sees them. **No repairs after freeze.** A dropped item stays dropped.

## Stage order and stopping (per type, independent strata)
pre-flight (shape) -> freeze -> options-only blind (nosource) -> elimination -> with-source
(withsource) -> tells. **A type that fails a stage stops there: none of that type inserts and no
later stage is run for it.** The other type continues. Passers go to two kept files,
`isee-verbal-s22-{syn,sc}.kept.batch.json` (byte-exact subsets in frozen order), one ledger entry
each (the insert gate binds one ledger entry to one content hash; s21 did the same), inserted with
`BANK_COHORT=isee-verbal-s22 BANK_BAND=mixed`.

## Pre-flight (shape), refuse/fix before freeze only
4 distinct single-word lowercase choices; key among them; `[Synonym] WORD` or `[Sentence
Completion] ...` with exactly one 7-hyphen blank; no "is to" in an SC; `verbalKind()` returns the
item's own type (`isee-verbal-s21-preflight.ts`); `stem-duplicates.mjs --family isee` clean against
live and within file; collision checker 0 problems; key strictly longest and strictly shortest
each in a 15-35% band of items per type; SC: `sc-article-scan.mjs --batch` 0 rows split on vowel
sound (any such row refuses the freeze).

## Options-only (nosource), one render per type
    make-oo-render.mjs isee-verbal-s22-syn.batch.json --control 206 --control-subskill synonym --exclude isee-verbal-s4
    make-oo-render.mjs isee-verbal-s22-sc.batch.json  --control 151 --control-subskill sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4

Scored by `isee-verbal-s18-oo-score.mjs` (unchanged). Three blind samples of one Claude solver
prompt per render (three samples, not three solvers; one agent per sample per render); each sees
ONLY its blind file and returns per item `pick`, `basis`, `reject` (a letter), `reject_certain`
(boolean, judged per item), `why`, and `heuristic` (the name of what decided the pick, or "none"),
plus a heuristics list.

M = arm rate − arm best-fixed-letter, pooled over three samples; E = M_candidate − M_live.
- **PASS: E <= +10. HOLD: E > +10.** SC: against all 151 live AND against the 135 single-blank
  alone; both must be <= +10.
- **Ceiling:** a live arm at >= 85% is SATURATED: HOLD and report, never a default pass.
- **Floor:** a live arm below its own letter line -> report the candidate against the letter line
  too; no "better than the bank" claim.
- Unanimity reported only as a batch rate against the live arm's.

**Attainable range (stated before the run).** Round-robin deal: synonyms candidate 25 -> 7/6/6/6 =
28.0%, control 206 -> 52/52/51/51 = 25.2%; SC candidate 45 -> 12/11/11/11 = 26.7%, control 151 ->
38/38/38/37 = 25.2% (single-blank line computed from its deal). M_c spans [−28.0, +72.0] (syn) and
[−26.7, +73.3] (SC); the HOLD bar can fire while M_live < 62.0 / 63.3, i.e. a live arm under ~87.2%
/ ~88.5%, and saturation stops the run at 85%, so both bars are reachable across the whole
unsaturated range. Live arms measured before: synonyms 52.5% (s21, 177), SC 50.0% all / 48.1%
single-blank (s21, 124 / 108). The candidate arms are 25 and 45 items through three correlated
samples (worth about one): roughly ±10 and ±7 points of binomial noise. An E between about 0 and
+20 (syn) or +3 and +17 (SC) will be reported as within that noise whichever side of +10 it lands;
the bar is the bar.

## Elimination (stage bar) — unchanged
Item "certainly eliminable" when >= 2 samples certainly rejected the SAME non-key option. PASS if
candidate share <= max(live arm share, 5%). If every sample marks every item not-certain, that is
reported as a default, not a reading.

## With-source
Three fresh Claude graders (no author, probe or solver); one grader agent grades both types, each
on its own unmarked, re-shuffled render (`isee-verbal-s19-grade-render.mjs`, seeds syn
20261161/62/63, SC 20261164/65/66 for graders a/b/c; key/difficulty/explanation withheld). Each
returns `pick`, `second_defensible` (null or a choice word), `difficulty` (easy|medium|hard vs ISEE
Upper Level), `above_band` (array of the item's own words above the ceiling quoted in change 1),
`free_elimination` (ARRAY of choice words removable without reading the stem/understanding the
headword's meaning - empty when none), (SC) `reads_correctly` (boolean), (syn) `antonym_of_key` and
`pos_mismatch`. Cold picks are written to disk before anything else is asked. Scored by
`isee-verbal-s22-withsource.mjs` (change 5).

Per-item DROP (s21, unchanged): any grader picks a non-key or names a second defensible option;
any grader marks the headword or KEY above band, or >= 2 mark the same distractor above band; a
grader-named free elimination that >= 2 blind samples also certainly rejected; a free elimination
>= 2 graders name on the same option; (SC) key-completed sentence does not read correctly per any
grader; difficulty = median of three; synonyms bank at the median; **SC median easy -> DROP**.
**Stage bar:** FAIL if any grader disagrees with the key on > 10% of the type's items.

## Tells (stage bar), per type, on the frozen file — unchanged
- key strictly longest and strictly shortest each <= 35% of items;
- `check-recycled-distractor.mjs`: NO MEASUREMENT or margin <= its derived control;
- `verify-answer-key-spread.ts --batch` on stored order: no FAIL;
- synonyms: antonym-of-key items <= 25%; all four options one part of speech;
- SC: `sc-article-scan.mjs --batch` 0 split rows (re-run);
- solver heuristic: if all three samples name one heuristic and, pooled, the candidate picks that
  heuristic decided score > 70% on >= 15 picks, the type FAILS.
Reported, not gated: the candidate hit rate on test-word-tagged picks against s21's 47.2% (one
sample) and s20's 54.2%.

## After the gate
Insert passers (`verbal-bank-helper.mjs insert isee`), then `verify-admission-forms.mjs` and
`isee-verbal-replay.ts --forms 12`. Report per-type counts before (syn 222 / 210 groups, SC 217 /
205) and after, the clean-form count with form-by-form fresh counts, and every number with its
denominator. REGISTER §5 and this batch's own ledger entries go in one commit (ledger.json re-read
from HEAD before editing). Committed locally; not pushed.

## Tools committed with this prereg
`isee-verbal-s22-{merge,selfcheck,probe,freeze,withsource}.mjs`, `isee-verbal-s22.live-words.json`.
Reused unchanged: `isee-verbal-s19-collisions.mjs`, `isee-verbal-s21-preflight.ts`,
`sc-article-scan.mjs`, `make-oo-render.mjs`, `isee-verbal-s18-oo-score.mjs`,
`isee-verbal-s19-grade-render.mjs`, `verbal-bank-helper.mjs`. No new env var.
