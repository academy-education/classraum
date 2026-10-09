# isee-verbal-s23 — pre-registration (written 2026-10-09, before any item or result exists)

## Why this batch
s22 inserted 25 of 25 synonyms and 32 of 45 SC (REGISTER §5, `f34aa044`). The live bank is
496 verified ISEE verbal rows. `isee-verbal-replay.ts --forms 15`, run for this prereg:

    synonym              247 items / 235 groups
    sentence completion  249 items / 237 groups
    forms 1-12 40/40, form 13 16/40 (syn 7/20, SC 9/20), forms 14-15 0/40  -> 12 clean forms
    --need 13: synonyms +13, SC +11
    --need 14: synonyms +33, SC +31

**Target: 14 clean forms. Commission 100 FRESH items (60 SC, 40 synonyms)**, sized from s22's
yield (synonyms 25/25 = 100%, SC 32/45 = 71%) plus margin: 40 synonyms at 100% is +7 over the 33
needed (at s21's 97%, +6); 60 SC at 71% is ~43, +12 over the 31 needed. Six Claude authors. Every
word an author writes (SC options; synonym headword and options) starts with a letter in that
author's range; the ranges are disjoint, so no cross-author collision is possible:

    author  type      n    band                       letters  lane
    A       SC        15   13 hard / 2 medium         a-b      contrast / restatement / cause; science, medicine, technology, history
    B       SC        15   13 hard / 2 medium         c-d      examples / degree / purpose; economics, arts, sport, school, work
    C       SC        15   13 hard / 2 medium         e-h      concession / sequence / comparison; law, nature, travel, literature, family
    D       SC        15   13 hard / 2 medium         p-r      two-step inference / near-miss; politics, geography, music, food, building
    E       synonym   20   4 easy / 9 medium / 7 hard i-o      (s19 synonym brief)
    F       synonym   20   4 easy / 9 medium / 7 hard s-z      (s19 synonym brief)

**Thresholds, stated now:** 13 forms needs >= 13 of 40 synonyms (33%) AND >= 11 of 60 SC (18%);
**14 forms needs >= 33 of 40 synonyms (82.5%) AND >= 31 of 60 SC (51.7%).** SC items dropped
before freeze by the new grammar rule count against the 60. s22 kept 25/25 synonyms and 32/45 SC
(71%), s21 29/30 and 27/40 (68%), s20 SC 47/70 (67%). 14 forms is the expected outcome if SC
attrition stays near the last three batches'. If a type holds or attrition leaves it short, the
measured number is reported; no bar moves and no blueprint count changes. No two-blank SC.

## Process (shared 20-subagent cap)
Claude agents only, never GPT. **At most two of this batch's subagents run at once.** Authors
write ONE small JSON file per item into `scripts/study-bank/isee-verbal-s23-work/<letter>/<ID>.json`,
**5-7 items per run**, then stop; the next run of the same author resumes from the files on disk
(`isee-verbal-s23-merge.mjs <letter>` rebuilds `isee-verbal-s23<letter>.batch.json`, which every
checker reads). Completion is judged by the files on disk, never by a notification. A subagent
idle 6+ minutes (no file written) is relaunched from its disk state. No tool call of the
coordinating session runs longer than ~8 minutes. Scratch: `isee-verbal-s23-work/`.

## Briefs
- **SC: s22's brief, unchanged except where §"What changed" says** (`isee-verbal-s23-work/BRIEF-SC.md`):
  s18's distractor brief; s20's four rules; s21's no "a"/"an" before the blank and distractors as
  general-purpose as the key; s22's named rarity ceiling (with the 20-word above-band denylist in
  the self-check) and mostly-hard SC with difficulty from the sentence.
- **Synonyms: s22's brief, unchanged** (s19 rules + ceiling + first-letter rule: the key is the only
  option sharing the headword's initial in at most 2 items per file), plus one sentence asking that
  medium/hard items not be solvable by word association (s22 graders called TOSS, VOYAGE, UTENSIL,
  TOPPLE gimmes).

## What changed from s22 (and only this)
1. **A pre-freeze DIFFICULTY read, with the sentence.** s22 lost 13 of 45 SC with-source, **12 as
   median easy** (8 of them authored hard); every one was visible to a reader holding the sentence.
   The SC brief now asks for difficulty that survives a reader who knows every word (two-step
   inference, a concession that reverses the clue, a clue a sentence away with a nearer wrong one, a
   near-miss distractor) and never a nearby synonym of the key. Before freeze, **two fresh Claude
   readers** (`isee-verbal-s23-reader.mjs`, brief `READER.md`; never an author, probe, solver or
   grader) each read every SC item with its sentence, key withheld, own seeded order, and give
   `pick`, `difficulty`, `collocation_tell`, `note`. **Any SC item either reader labels easy, or
   either reader answers off key, is named for the ONE revision round** (the s22 instruction was
   "a medium SC that a probe reads as easy goes to the revision round"; it is applied to every SC
   item, hard or medium, because 8 of s22's 12 were authored hard). The fix is a harder sentence
   with the key unchanged or a key no rarer; never a rarer word. Calibration plants, interleaved and
   never named: four s22 SC all three s22 graders called easy (IS22A-10, IS22B-01, IS22B-09,
   IS22C-12) and two s22 SC banked hard (IS22A-02, IS22C-07). A reader that does not call the four
   plants easy is reported as uncalibrated for difficulty; nothing else changes.
2. **A collocation-tell check, with a drop rule.** s22's IS22B-02 ("the staging had become -------
   to the score") shipped with a stem-side tell: only *disproportionate* takes "to". One grader named
   all three distractors; no rule could act. Now, before freeze:
   - `isee-verbal-s23-reader.mjs score` lists every item with a function word next to the blank
     (a preposition after, or an article / degree word / auxiliary before) - reported, decides nothing;
   - **both readers flag the item and name >= 1 option in common -> the item is DROPPED before
     freeze** (not revised; it counts against the 60);
   - exactly one reader flags it (or both on disjoint options) -> **I read it by hand before freeze**
     and record `{confirmed, note}` in `isee-verbal-s23-reader-<round>.handread.json`; the score
     refuses (exit 3) until every such item has an entry. Confirmed at r1 -> named for the revision
     round; confirmed at r2 -> dropped; not confirmed -> kept, the note recorded.
   - IS22B-02 is interleaved as a calibration plant; a reader that does not flag it is reported.
   - **With-source, one added drop rule:** a single grader naming EVERY distractor of an item as a
     free elimination -> DROP (`isee-verbal-s23-withsource.mjs`). Break-tested on a scratch copy of
     s22 SC: it reproduces s22's 32/45 except IS22B-02, which now drops (31/45); nothing else moves.
     The grader brief's free-elimination field now names "a preposition or idiom next to the blank
     that only some options take" explicitly.
3. **A per-author blind guess in the options-only probe.** s22 author A's SC drew **62.2%
   options-only** (28/45 over three samples; B 35.6%, C 48.9%) with no heuristic any sample could
   name, so no forced-pick bar could see it. The steering probe (`isee-verbal-s23-probe.mjs`, brief
   `PROBE.md`, one fresh reader) now also gives each SC item a blind `pick` and `basis`, scored PER
   AUTHOR FILE: **a file whose blind guess hits the key on >= 50% of its items (15 -> 8) has its
   key-hit items named for the revision round.** One sample of 15 items is noisy (an author drawing
   at s22's live 42.6% trips it ~28% of the time, one at A's 62.2% ~84%); it steers a revision and
   decides nothing. Authors also record a forced `blind_guess` in the self-check (< 35% per file,
   `isee-verbal-s23-selfcheck.mjs` = s22's plus that field). The probe keeps s22's four forced picks
   (< 35% per author file), opposite pairs, polarity and `above_ceiling`, and **its six calibration
   plants are in r1 and r2 from the start** (s22 added them only at r2, after r1 flagged 0 of 305
   words): IS21B-14, IS20C-19, IS21A-10, IS21A-18, IS21A-06, IS21A-09.
4. **New words only, inflections included:** no headword, key or option that is a live ISEE verbal
   word or any word of s17-s22 (frozen files, every author file, and s22's pre-revision author
   files). The list is `isee-verbal-s23.live-words.json` (**3,119 words**: 2,075 from the 496 live
   rows + 1,044 from 1,080 items in 42 prior files, built with `isee-verbal-s19-collisions.mjs
   --build --out ... --prior <s17..s22 tags>`). **Break-test, run for this prereg:** every s22 author
   file fires 60-65 problems against it (one per word it uses: 60 for a 15-item SC file, 65 for the
   13-item synonym file). Each author runs the checker with `--words isee-verbal-s23.live-words.json
   --range <its letters>`; the ranges above are disjoint across all six.
5. **Controls are the whole eligible pool as it now stands** (`isee-verbal-s4` excluded, width 4,
   verified, not archived), counted for this prereg: synonyms **231** (s22's 25 included), SC
   hard/medium **183** (s22's 32 included), of them **167 single-blank**. If the render prints a
   different eligible count, the control is that whole count and the number is reported.

Unchanged from s22 and reused as is: the rarity ceiling and its 20-word denylist; the with-source
field parser (`refuse, exit 2` on an unreadable grader value); the drop rules; the stage bars;
`isee-verbal-s19-collisions.mjs`, `isee-verbal-s21-preflight.ts`, `sc-article-scan.mjs`,
`make-oo-render.mjs`, `isee-verbal-s18-oo-score.mjs`, `isee-verbal-s19-grade-render.mjs`,
`verbal-bank-helper.mjs`.

## Pre-freeze order
1. Authoring: checker 0 problems on every file, `isee-verbal-s23-selfcheck.mjs` pass, SC article
   scan 0 split rows.
2. **r1 reads** (independent, any order): the options-only probe (`probe render r1`) and the two
   with-sentence readers (`reader render r1 a|b`). Score both; hand-read every single-reader
   collocation flag; drops from r1 are removed before anything else happens.
3. **One revision round** on every item named by either r1 score (probe: above ceiling, opposite
   pair, polarity breach, forced pick >= 35% of a file, blind guess >= 50% of a file; readers:
   easy, off-key pick, hand-confirmed collocation tell). Named items only, each author's own range,
   new words only; checker + self-check + article scan re-run. A diff against the pre-round
   snapshot (`isee-verbal-s23-work/pre-revision/`) confirms no unnamed item moved.
4. **r2 reads**, everything re-read (r1 drops left out): probe r2 and readers r2. r2 names nothing.
   r2's two-reader collocation drops and hand-confirmed single flags drop; everything else in r2 is
   recorded at freeze whatever it says.

## Freeze
`isee-verbal-s23-freeze.mjs` (s22's freeze, plus: refuses unless both reader drop files exist, and
leaves those SC items out, listed) writes `isee-verbal-s23-syn.batch.json` (seed 20261171) and
`isee-verbal-s23-sc.batch.json` (seed 20261172): author-only fields stripped (`rarity_order`,
`gloss_of`, `polarity`, `antonym_pairs`, `selfcheck`), stored choice order dealt from a seeded
balanced deck. sha256 recorded and committed before any solver or grader sees them. **No repairs
after freeze.** A dropped item stays dropped.

## Stage order and stopping (per type, independent strata)
pre-flight (shape) -> freeze -> options-only blind (nosource) -> elimination -> with-source
(withsource) -> tells. **A type that fails a stage stops there: none of that type inserts and no
later stage is run for it.** The other type continues. Passers go to two kept files,
`isee-verbal-s23-{syn,sc}.kept.batch.json` (`isee-verbal-s23-kept.mjs`: byte-exact subsets in
frozen order; reproduces s22's SC kept sha `ad42e337` from s22's files), one ledger entry each,
inserted with `BANK_COHORT=isee-verbal-s23 BANK_BAND=mixed`.

## Pre-flight (shape), refuse/fix before freeze only
4 distinct single-word lowercase choices; key among them; `[Synonym] WORD` or `[Sentence
Completion] ...` with exactly one 7-hyphen blank; no "is to" in an SC; `verbalKind()` returns the
item's own type (`isee-verbal-s21-preflight.ts`); `stem-duplicates.mjs --family isee` clean against
live and within file; collision checker 0 problems; key strictly longest and strictly shortest
each in a 15-35% band of items per type; SC: `sc-article-scan.mjs --batch` 0 rows split on vowel
sound (any such row refuses the freeze).

## Options-only (nosource), one render per type
    make-oo-render.mjs isee-verbal-s23-syn.batch.json --control 231 --control-subskill synonym --exclude isee-verbal-s4
    make-oo-render.mjs isee-verbal-s23-sc.batch.json  --control 183 --control-subskill sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4

Scored by `isee-verbal-s18-oo-score.mjs` (unchanged). Three blind samples of one Claude solver
prompt per render (three samples, not three solvers; one agent per sample per render); each sees
ONLY its blind file and returns per item `pick`, `basis`, `reject`, `reject_certain`, `why`,
`heuristic`, plus a heuristics list (`SOLVER.md`, s22's, with s22's added sentence "judge each item
by reading it; no script or fixed rule" in every sample's prompt).

M = arm rate − arm best-fixed-letter, pooled over three samples; E = M_candidate − M_live.
- **PASS: E <= +10. HOLD: E > +10.** SC: against all 183 live AND against the 167 single-blank
  alone; both must be <= +10.
- **Ceiling:** a live arm at >= 85% is SATURATED: HOLD and report, never a default pass.
- **Floor:** a live arm below its own letter line -> report the candidate against the letter line
  too; no "better than the bank" claim.
- Unanimity reported only as a batch rate against the live arm's. SC candidate rate also reported
  per author file (s22 A 62.2%), not gated.

**Attainable range (stated before the run).** Round-robin deal: synonyms candidate 40 -> 10 each =
25.0%, control 231 -> 58/58/58/57 = 25.1%; SC candidate 60 -> 15 each = 25.0% (fewer after
pre-freeze drops; the line is recomputed from the deal and printed), control 183 -> 46/46/46/45 =
25.1% (single-blank line from its deal). M_c spans about [−25, +75]; the HOLD bar can fire while
M_live < ~65, i.e. a live arm under ~90%, and saturation stops the run at 85%, so both bars are
reachable across the whole unsaturated range. Live arms measured before: synonyms 43.2% (s22,
206), SC 42.6% all / 43.7% single-blank (s22, 151 / 135). The candidate arms are 40 and <= 60
items through three correlated samples (worth about one): roughly ±8 and ±6.5 points of binomial
noise. An E between about +2 and +18 (syn) or +3.5 and +16.5 (SC) will be reported as within that
noise whichever side of +10 it lands; the bar is the bar.

## Elimination (stage bar) — unchanged
Item "certainly eliminable" when >= 2 samples certainly rejected the SAME non-key option. PASS if
candidate share <= max(live arm share, 5%). If every sample marks every item not-certain, that is
reported as a default, not a reading.

## With-source
Three fresh Claude graders (no author, probe, reader or solver); one grader agent grades both
types, each on its own unmarked, re-shuffled render (`isee-verbal-s19-grade-render.mjs`, seeds syn
20261181/82/83, SC 20261184/85/86 for graders a/b/c; key/difficulty/explanation withheld). Each
returns `pick`, `second_defensible`, `difficulty`, `above_band`, `free_elimination` (ARRAY),
(SC) `reads_correctly`, (syn) `antonym_of_key`, `pos_mismatch`. Cold picks are written to disk
before anything else is asked (`GRADER.md`). Scored by `isee-verbal-s23-withsource.mjs`.

Per-item DROP (s22's, plus change 2): any grader picks a non-key or names a second defensible
option; any grader marks the headword or KEY above band, or >= 2 mark the same distractor above
band; a grader-named free elimination that >= 2 blind samples also certainly rejected; a free
elimination >= 2 graders name on the same option; **a single grader naming every distractor a free
elimination**; (SC) key-completed sentence does not read correctly per any grader; difficulty =
median of three; synonyms bank at the median; **SC median easy -> DROP**.
**Stage bar:** FAIL if any grader disagrees with the key on > 10% of the type's items.

## Tells (stage bar), per type, on the frozen file — unchanged
- key strictly longest and strictly shortest each <= 35% of items;
- `check-recycled-distractor.mjs`: NO MEASUREMENT or margin <= its derived control;
- `verify-answer-key-spread.ts --batch` on stored order: no FAIL;
- synonyms: antonym-of-key items <= 25%; all four options one part of speech;
- SC: `sc-article-scan.mjs --batch` 0 split rows (re-run);
- solver heuristic: if all three samples name one heuristic and, pooled, the candidate picks that
  heuristic decided score > 70% on >= 15 picks, the type FAILS.
Reported, not gated: the candidate hit rate on test-word-tagged picks (s20 54.2%, s21 47.2%, s22
none named).

## After the gate
Insert passers (`verbal-bank-helper.mjs insert isee`), then `verify-admission-forms.mjs` and
`isee-verbal-replay.ts --forms 15`. Report per-type counts before (syn 247 / 235 groups, SC 249 /
237) and after, the clean-form count with form-by-form fresh counts, and every number with its
denominator. REGISTER §5 and this batch's OWN ledger entries go in one commit (ledger.json is shared
by concurrent sessions: re-read from HEAD immediately before editing, stage only this batch's
entries, never reset the working copy). Committed locally; not pushed.

## Tools committed with this prereg
`isee-verbal-s23-{merge,selfcheck,probe,reader,freeze,withsource,kept}.mjs`,
`isee-verbal-s23.live-words.json`. `isee-verbal-s23-reader.mjs selftest` passes 11/11 and fails
on two mutations of the drop rule (disjoint options treated as agreement; the easy label ignored).
Smoke-tested on scratch copies of s22's author files standing in for s23's (removed after): the
probe named exactly the 15 key-hit items of a file planted at 15/15 blind guesses plus the 8
test_word hits of a file planted at 8/15, and printed all 6 plants; the reader score dropped the
item both planted readers flagged on a common option, refused (exit 3) until the single-reader flag
had a hand-read entry, then named it, and named the 15 items one reader called easy.
No new env var.
