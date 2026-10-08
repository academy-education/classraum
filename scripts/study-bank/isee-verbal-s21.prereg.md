# isee-verbal-s21 — pre-registration (written 2026-10-08, before any item or result exists)

## Why this batch
s20 inserted 47 of 70 SC (REGISTER §5). The live bank is 383 verified ISEE verbal rows.
`isee-verbal-replay.ts` (real `drawByPassage`, `VERBAL_TYPES`, `verbalKind`), run for this
prereg:

    synonym              193 items / 181 groups
    sentence completion  190 items / 178 groups
    forms 1-9 40/40, form 10 23/40 (syn 13/20, SC 10/20)  -> 9 clean forms
    --need 10: synonyms +7,  SC +10
    --need 11: synonyms +27, SC +30

**Target: 11 clean forms. Commission 70 FRESH items** from four Claude authors in two
waves of two (the session runs under a shared 20-subagent cap; at most two of this
batch's agents run at once):

    wave  author  type      n    band                         letters  lane
    1     A       SC        20   14 hard / 6 medium-as-hard    a-d      contrast/restatement/cause; science, technology, medicine, history, government
    1     C       synonym   15   4 easy / 7 medium / 4 hard    m-r      (s19 synonym brief)
    2     B       SC        20   14 hard / 6 medium-as-hard    s-z      examples/degree/purpose; economics, geography, arts, sport, school, work
    2     D       synonym   15   3 easy / 8 medium / 4 hard    e-l      (s19 synonym brief)

Thresholds, stated now: **10 forms needs >= 7 of 30 synonyms (23%) and >= 10 of 40 SC
(25%); 11 forms needs >= 27 of 30 synonyms (90%) and >= 30 of 40 SC (75%).** s19 kept
34/35 synonyms (97%); s20 kept 47/70 SC (67%); authored hard banked easy 3 of 49, authored medium 14 of 21.
11 forms is therefore reachable but not expected on SC unless the medium fix works. If a
type holds or attrition leaves it short, the measured number is reported; no bar moves
and no blueprint count changes. No two-blank SC.

**The frozen s18 and s19 SC items are not re-run, repaired or inserted.** s21 is all new
words.

## Briefs
- **SC: s20's brief, unchanged** — s18's distractor brief (every distractor as specific,
  uncommon and test-worthy as the key, the exact right word for a DIFFERENT sentence,
  matched on part of speech, register and rarity; key-rarest ~1 in 4, key-most-common
  ~1 in 4, the same band for strictly-longest/shortest; `rarity_order` recorded and
  stripped); the in-band rule for hard; and s20's four rules: (1) no option an antonym or
  near-opposite of the key or of another option; (2) no three options sharing a polarity
  the key lacks (`polarity` labelled, stripped); (3) hard difficulty from the sentence
  (clue distance, stem vocabulary, subtle restatement), never a reversal whose opposite is
  an option; (4) a forced-pick, stem-covered self-check, plus one blind steering probe.
- **Synonyms: s19's brief, unchanged** — one part of speech; every distractor the plain,
  standard gloss of a DIFFERENT likely ISEE Upper headword, matched to the key in part of
  speech, register and plainness (`gloss_of`, stripped); antonym-of-key items <= 25%; at
  most two options from one sense-family of the headword; no look-alike beside a
  same-sense cluster.

## What changed from s20 (and only this)
1. **SC: no "a"/"an" immediately before a blank where the options differ in initial vowel
   sound** (s20: IS20B-14 "an -------" left only the key; IS20C-22 "a -------" made the
   key ungrammatical). Authors are told not to write "a"/"an" directly before the blank at
   all. `sc-article-scan.mjs --batch` is run on every author file during authoring and on
   the merged file before freeze; **any row it reports as split on vowel sound refuses the
   freeze** (fix before freeze only).
2. **SC difficulty: medium is briefed as hard minus one step.** s20 graders called 14 of
   21 authored-medium SC easy. A medium item keeps a hard item's sentence (clue a clause
   or sentence away from the blank, or a restatement that paraphrases without the key's
   definition words, or vocabulary in the stem) and is easier only in its KEY, which a
   strong grade 8 student knows. A medium sentence must never restate the key's
   dictionary definition next to the blank.
3. **SC: the next tell is "pick the test-word"** (s20: all three samples named it; pooled
   52/96 = 54.2% on candidate picks, sample b 14/18 = 77.8%). The samples described it as
   the most abstract, general-purpose, Latinate test-list word over concrete, technical or
   niche ones ("nautical", "malarial"). **Brief: every distractor must be as test-worthy
   AND as general-purpose as the key** — a word that could itself be the key of an ISEE
   Upper sentence completion, fitting many sentence frames; no domain-technical or
   concrete-niche distractors beside an abstract key (and, when the key is concrete,
   distractors equally concrete). The self-check and the probe gain a fourth forced pick,
   `test_word` ("the most abstract, general-purpose test-list word"), with the same
   <= 35% bar per author file (20 items -> at most 7 hits). The tells-stage solver-
   heuristic rule is unchanged; the candidate hit rate on test-word-tagged picks is
   reported against s20's 54.2%.
4. **New words only, inflections included:** no headword, key or option word that is a
   live ISEE verbal word or any word of s17, s18, s19 or s20 (frozen files and every
   author file). `isee-verbal-s19-collisions.mjs --build --out isee-verbal-s21.live-words.json
   --prior <s17..s20 tags>` re-derives the list from the bank (now including s20's 47 SC)
   and every author runs the checker with `--words isee-verbal-s21.live-words.json
   --range <its letters> --against <other s21 files on disk>`. Ranges are disjoint across
   all four authors (a-d, e-l, m-r, s-z), so neither wave can converge with the other.
5. **SC with-source gains one drop, conservative only:** a free elimination named by >= 2
   graders on the SAME option drops the item. s20 had to withhold IS20B-14 outside its
   rules because a stem-side elimination can never be corroborated by a stem-withheld
   blind sample (CLAUDE.md: the options-only attack cannot see an elimination that needs
   the stem). The s20 blind-corroboration rule stays as well. Applies to both types.
6. **Controls are the whole eligible pool as it now stands** (`isee-verbal-s4` excluded,
   width 4, verified, not archived), counted for this prereg:
   synonyms **177** (all bands; s19's 34 now included), SC hard/medium **124** (s20's 47
   now included), of them **108 single-blank**. If the render prints a different eligible
   count, the control is that whole count and the number is reported.

Claude agents only, never GPT. At most two of this batch's agents at once; completion is
judged by the file on disk; every agent saves after every few items; an agent idle 6+
minutes is relaunched from its file's state.

## Self-check and probe (SC only; steering, decides nothing at the gate)
`isee-verbal-s21-selfcheck.mjs` = s20's with `test_word` added: per author file, rule 1
(declared antonym pairs empty), rule 2 (polarity), and each of antonym_pole /
odd_one_out / most_specific / test_word forced-pick-is-key <= 35%. After both SC files
pass, ONE fresh Claude probe agent (never an author, solver or grader) reads an
options-only render of all 40 (`isee-verbal-s21-probe.mjs render r1`, keys dealt flat,
interleaved, no author tag) and returns the four forced picks, opposite pairs and polarity
per item. An author file with any heuristic > 35%, or any item with a probe-named
opposite pair or a probe-read polarity breach, gets ONE revision round (named items only,
inside its range, checker + self-check + article scan re-run), then one fresh probe (r2)
re-reads; r2 is recorded at freeze whatever it says.

## Freeze
After authoring: checker 0 problems on every file (cross-author included), SC self-check
pass and article scan clean, the probe round, and the structural pre-flight. Then
`isee-verbal-s21-freeze.mjs` writes `isee-verbal-s21-syn.batch.json` (seed 20261051) and
`isee-verbal-s21-sc.batch.json` (seed 20261052): author-only fields stripped (`rarity_order`,
`gloss_of`, `polarity`, `antonym_pairs`, `selfcheck`), stored choice order dealt from a
seeded balanced deck. sha256 recorded and committed before any solver or grader sees them.
**No repairs after freeze.** A dropped item stays dropped.

## Stage order and stopping (per type, independent strata, as s19)
pre-flight (shape) -> freeze -> options-only blind (nosource) -> elimination -> with-source
(withsource) -> tells. **A type that fails a stage stops there: none of that type inserts
and no later stage is run for it.** The other type continues. Passers go to
`isee-verbal-s21.kept.batch.json`, one ledger entry per type outcome, one insert
(`BANK_COHORT=isee-verbal-s21`, `BANK_BAND=mixed`).

## Pre-flight (shape), refuse/fix before freeze only
4 distinct single-word lowercase choices; key among them; `[Synonym] WORD` or
`[Sentence Completion] ...` with exactly one 7-hyphen blank; no "is to" in an SC;
`verbalKind()` returns the item's own type; `stem-duplicates.mjs --family isee` clean
against live and within file; collision checker 0 problems; key strictly longest and
strictly shortest each in a 15-35% band of items per type; **SC: `sc-article-scan.mjs
--batch` reports 0 rows split on vowel sound.**

## Options-only (nosource), one render per type
    make-oo-render.mjs isee-verbal-s21-syn.batch.json --control 177 --control-subskill synonym --exclude isee-verbal-s4
    make-oo-render.mjs isee-verbal-s21-sc.batch.json  --control 124 --control-subskill sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4

Scored by `isee-verbal-s18-oo-score.mjs` (unchanged). Three blind samples of one Claude
solver prompt per render (three samples, not three solvers; one agent per sample per
render); each sees ONLY its blind file and returns per item pick, basis, reject,
reject_certain (judged per item), why, and the name of the heuristic that decided the pick,
plus a heuristics list with picks decided.

M = arm rate − arm best-fixed-letter, pooled over three samples; E = M_candidate − M_live.
- **PASS: E <= +10. HOLD: E > +10.** SC: against all 124 live AND against the 108
  single-blank alone; both must be <= +10.
- **Ceiling:** a live arm at >= 85% is SATURATED: HOLD and report, never a default pass.
- **Floor:** a live arm below its own letter line -> report the candidate against the
  letter line too; no "better than the bank" claim.
- Unanimity reported only as a batch rate against the live arm's.

**Attainable range (stated before the run).** Round-robin deal: synonyms candidate 30 ->
8/8/7/7 = 26.7%, control 177 -> 25.4%; SC candidate 40 -> 25.0%, control 124 -> 25.0%
(single-blank line computed from its deal). M_c spans [−26.7, +73.3] (syn) and
[−25.0, +75.0] (SC); the HOLD bar can fire while M_live < 63.3 / 65.0, i.e. a live arm
under ~88.7% / 90.0%, and saturation stops the run at 85%, so both bars are reachable
across the whole unsaturated range. Live arms measured before: synonyms 53.8% (s19, 143
items), SC 46.3% all / 46.4% single-blank (s20, 77 / 61). The candidate arms are 30 and 40
items through three correlated samples (worth about one): roughly ±9 and ±8 points of
binomial noise. An E between about +2 and +18 (syn) or +3 and +17 (SC) will be reported as
within that noise whichever side of +10 it lands; the bar is the bar.

## Elimination (stage bar) — unchanged
Item "certainly eliminable" when >= 2 samples certainly rejected the SAME non-key option.
PASS if candidate share <= max(live arm share, 5%). If every sample marks every item
not-certain, that is reported as a default, not a reading.

## With-source
Three fresh Claude graders (no author, probe or solver); one grader agent grades both
types, each on its own unmarked, re-shuffled render (`isee-verbal-s19-grade-render.mjs`,
seeds syn 20261061/62/63, SC 20261064/65/66 for graders a/b/c; key/difficulty/explanation
withheld). Each returns pick, second_defensible, difficulty (easy|medium|hard vs ISEE Upper
Level), above_band words, free_elimination, (SC) reads_correctly, (syn) antonym_of_key and
pos_mismatch. Cold picks are written to disk before anything else is asked.

Per-item DROP (s19/s20, plus change 5): any grader picks a non-key or names a second
defensible option; any grader marks the headword or KEY above band, or >= 2 mark the same
distractor above band; a grader-named free elimination that >= 2 blind samples also
certainly rejected; **a free elimination >= 2 graders name on the same option**; (SC)
key-completed sentence does not read correctly per any grader; difficulty = median of
three; synonyms bank at the median; **SC median easy -> DROP**.
**Stage bar:** FAIL if any grader disagrees with the key on > 10% of the type's items.

## Tells (stage bar), per type, on the frozen file
- key strictly longest and strictly shortest each <= 35% of items;
- `check-recycled-distractor.mjs`: NO MEASUREMENT or margin <= its derived control;
- `verify-answer-key-spread.ts --batch` on stored order: no FAIL;
- synonyms: antonym-of-key items <= 25%; all four options one part of speech;
- SC: `sc-article-scan.mjs --batch` 0 split rows (already a freeze refusal; re-run);
- solver heuristic: if all three samples name one heuristic and, pooled, the candidate
  picks that heuristic decided score > 70% on >= 15 picks, the type FAILS.

## After the gate
Insert passers (`verbal-bank-helper.mjs insert isee`), then `verify-admission-forms.mjs`
and `isee-verbal-replay.ts`. Report per-type counts before (syn 193 / 181 groups, SC 190 /
178) and after, the clean-form count with form-by-form fresh counts, and every number with
its denominator. REGISTER §5 and this batch's own ledger entries go in one commit
(ledger.json re-read from HEAD before editing). Committed locally; not pushed.
