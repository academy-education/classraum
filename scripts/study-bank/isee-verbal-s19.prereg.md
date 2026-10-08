# isee-verbal-s19 — pre-registration (written 2026-10-08, before any item or result exists)

## Why this batch
s18 inserted 0 of 90 (REGISTER §5, 2026-10-08). The live bank is unchanged: 302 verified
ISEE verbal rows. The 10-form replay of the real draw (`isee-verbal-replay.ts`, imports the
real `drawByPassage`, `VERBAL_TYPES`, `verbalKind`; reproduces the s17/s18 numbers exactly):

    synonym              159 items / 147 groups
    sentence completion  143 items / 131 groups
    forms 1-7 40/40, form 8 22/40 (syn 19/20, SC 3/20), form 9 0/40  -> 7 clean forms

    clean forms   synonyms   SC        (isee-verbal-replay.ts --need N)
    8             +1         +17
    9             +21        +37
    10            +41        +57

**Target: 9 clean forms.** Commission ~105 FRESH items:

    35 synonyms   authors A (18) and B (17); mixed band ~25% easy / 50% medium / 25% hard
    70 SC         authors C (24), D (23), E (23); SINGLE-BLANK only; ~70% HARD (49 hard / 21 medium)

9 forms needs >= 21 of 35 synonyms (60%) and >= 37 of 70 SC (53%) kept. s18's SC
with-source rules would have kept 32 of 60 (53%), 26 of the 28 drops for a median grade of
easy (authored hard banked easy 6/30, authored medium banked easy 20/30), hence the hard
weighting. If a type holds or attrition leaves it short, the measured number is reported;
no bar moves and no blueprint count changes. Two-blank SC is not commissioned.

**The frozen s18 items are not re-run, repaired or inserted.** Re-deciding a finished
batch under a rule found afterwards is what pre-registration forbids; s19 is all new words.

## What changed from s18 (and only this)

1. **SC: the rarity gate is dropped, as invalid.** On s18 it could not read its own anchor
   (the s17 SC cohort that carried the tell read K 38.3% / T 35.8%, under its 40% validity
   line, and the live single-blank arm read K 36.7%, the same as the anchor). A check that
   cannot see the tell it was built for must not gate. The rarity instrument is retired for
   BOTH types (s18 also had a synonym K bar; synonyms never reached it). **For SC the tell
   measurement is the options-only stage against BOTH controls** (all live hard/medium SC,
   and the single-blank subset), which is the instrument that did see s17's tell (+12.7)
   and did see it gone in s18 (−6.9). The other structural tells and the solver-heuristic
   rule stay.
2. **SC: s18's authoring brief is kept unchanged** (it killed the "most specific,
   test-worthy word" tell): every distractor as specific, uncommon and test-worthy as the
   key, the exact right word for a DIFFERENT equally concrete sentence, matched on part of
   speech, register and rarity; no generic filler; key-rarest about 1 in 4 and key-most-
   common about 1 in 4 (a band, not a cap), the same band for strictly-longest/shortest.
   Authors still record `rarity_order` as a self-check; it is stripped at freeze and
   decides nothing. **Added: the difficulty instruction.** Commission ~70% hard, and tell
   authors what "hard" has to survive: graders demoted 20/30 authored-medium and 6/30
   authored-hard s18 items to easy. Hard = a key a strong ISEE Upper (grade 8-11) student
   may not know cold, still inside the band (s18 above-band drops: intranasally, fusible,
   friable, hygroscopic, mawkish), AND a clue that needs a step of inference (a reversal,
   a "hardly"/"far from", a consequence rather than a restatement), never a sentence that
   paraphrases the key's dictionary definition.
3. **SC: the SC control is the whole eligible pool**, `--control 77` (all live hard/medium
   SC, `isee-verbal-s4` excluded; 61 of them single-blank). s18 drew 40 (35 single-blank)
   and s17 drew 30 (21 single-blank); the single-blank arm read 31.7% in s17 and 47.6% in
   s18, the same draw-to-draw swing that held the s18 synonyms. Same rule, both controls.
4. **Synonyms: the live control is the whole eligible pool, `--control 143`** (every live
   ISEE synonym, `isee-verbal-s4` excluded). s17 and s18 each drew 30 and the arm read 70.0%
   and 47.8%, a 22-point swing larger than the ±10 bar. With all 143 the control has no
   item-draw variance left; it is the population, the same items every run.
5. **Synonyms: the brief targets s18's named heuristic.** All three s18 samples named "pick
   the plain gloss of a likely ISEE headword" (52/38/56 picks; s17 too). s18 keys were plain
   glosses and distractors were often concrete words no test headword means (gallop,
   hiccup). **New rule: every distractor must itself be the plain, standard gloss of a
   DIFFERENT likely ISEE Upper headword**, matched to the key in part of speech, register
   and plainness, so that with the headword covered all four options look equally like
   "the answer to some vocabulary word". Authors record `gloss_of` (the headword each
   distractor would gloss, not itself an s19 word); stripped at freeze. s17's other synonym
   rules stand: one part of speech, antonym-of-key items <= 25%, at most two options from
   one sense-family of the headword, no look-alike beside a same-sense cluster.
6. **New words only, inflections included**: no headword, key or option word that is a
   live ISEE verbal word, an s17 word or an s18 word (frozen files and all five author
   files), checked by `isee-verbal-s19-collisions.mjs` — the s18 pre-freeze check written
   down (exact + light-stem + shared-prefix match; s18's exact check missed
   "reverberations" and "abstained"). List: `isee-verbal-s19.live-words.json`, re-derived
   from the bank (1,748 words: 1,211 from 302 live rows + 537 from 280 s17/s18 items).
7. **Disjoint initial-letter ranges for EVERY word an author writes** (headword, key and
   all distractors), and authors run in two waves of at most three, each running the
   checker on its own file during authoring:

        wave 1   A  synonyms (18)   a-f      C  SC (24)  g-p      D  SC (23)  q-z
        wave 2   B  synonyms (17)   m-z      E  SC (23)  a-l      (both --against A,C,D)

   Within a wave the ranges are disjoint, so parallel authors cannot converge (s17 finding
   2, s18's 20 cross-author collisions); wave 2 checks against wave 1 on disk. Options in
   one item share a range, so the range carries no information about the key.
   SC lanes are s18's: C contrast/restatement in science/technology/medicine; D
   cause/purpose in history/government/economics/geography; E examples/degree in
   arts/sport/school/work.

Claude agents only, never GPT. At most three agents at once; completion is judged by the
file on disk, and a dead agent is relaunched from its file's state.

## Freeze
After authoring, the checker on every file (0 problems, cross-author included) and the
structural pre-flight, the merged files `isee-verbal-s19-syn.batch.json` and
`isee-verbal-s19-sc.batch.json` are frozen (sha256 recorded and committed) before any
solver or grader sees them. Author-only fields (`rarity_order`, `gloss_of`) are stripped;
stored choice order is shuffled with the shared seeded generator. **No repairs after
freeze.** A dropped item stays dropped.

## Stage order and stopping (s17's five-stage gate)
Per type, independent strata: pre-flight (shape) -> freeze -> options-only blind
(nosource) -> elimination -> with-source (withsource) -> tells. **A type that fails a stage
stops there: none of that type inserts and no later stage is run for it.** The other type
continues. Passing type(s) go to `isee-verbal-s19.kept.batch.json`, one ledger entry per
type outcome, one insert (`BANK_COHORT=isee-verbal-s19`, `BANK_BAND=mixed`).

## Pre-flight (shape), refuse/fix before freeze only
4 distinct single-word lowercase choices; key among them; `[Synonym] WORD` or
`[Sentence Completion] ...` with exactly one 7-hyphen blank; no "is to" in an SC;
`verbalKind()` returns the item's own type; `stem-duplicates.mjs --family isee` clean
against live and within file; collision checker 0 problems; key strictly longest and
strictly shortest each in a 15-35% band of items per type.

## Options-only (nosource), one render per type
    make-oo-render.mjs isee-verbal-s19-syn.batch.json --control 143 --control-subskill synonym --exclude isee-verbal-s4
    make-oo-render.mjs isee-verbal-s19-sc.batch.json  --control 77  --control-subskill sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4

Scored by `isee-verbal-s18-oo-score.mjs` (unchanged; reproduces s17 +4.7/+12.7). Three blind
samples of one Claude solver prompt per render (three samples, not three solvers); each
sees ONLY its blind file and returns per item pick, basis, reject, reject_certain, why,
**and the name of the heuristic that decided the pick** (so the heuristic rule below is
scored on its own picks, not bounded), plus a heuristics list with picks decided.
`reject_certain` is judged per item.

Bars, per type. M = arm rate − arm best-fixed-letter, pooled over three samples;
E = M_candidate − M_live.
- **PASS: E <= +10. HOLD: E > +10.**
- **SC: E against all live controls AND against the single-blank controls alone**; both
  must be <= +10 (single-blank n is 61, so no underpowered case).
- **Ceiling:** a live arm at >= 85% is SATURATED: HOLD and report, never a default pass.
- **Floor:** a live arm below its own letter line -> report the candidate against the letter
  line too; no "better than the bank" claim.
- Unanimity reported only as a batch rate against the live arm's.

**Attainable range, stated before the run (CLAUDE.md: a bar must sit inside the control's
range).** Keys are dealt round-robin, so the letter lines are fixed by n: synonyms candidate
35 -> 9/9/9/8 = 25.7%, control 143 -> 36/36/36/35 = 25.2%; SC candidate 70 -> 25.7%, control
77 -> 26.0% (single-blank subset's line computed from its deal). M_c spans [−25.7, +74.3].
The HOLD bar can fire only while M_live < 74.3 − 10, i.e. a live arm under ~89.5%; the
saturation rule stops the run at 85%, and at a live 84.9% a hold still needs only a
candidate >= 95.4% (synonyms 101/105 picks), so both bars are reachable across the whole
unsaturated range. Measured live synonym arm so far: 70.0% (s17) and 47.8% (s18), both
30-item draws; live SC all-arm 37.8% / 45.0%, single-blank 31.7% / 47.6%.
**What the larger control does not fix:** the candidate arm is still 35 synonyms. Three
correlated samples are worth about one, so the candidate rate carries roughly ±8.5 points
of binomial noise on its own (p≈0.5, n=35), and E inherits it. The bar is the bar; a
synonym E between about 0 and +20 will be reported as within the instrument's noise
whichever side of +10 it lands.

## Elimination (stage bar), per type — unchanged
Item "certainly eliminable" when >= 2 samples certainly rejected the SAME non-key option.
PASS if candidate share <= max(live arm share, 5%). If every sample marks every item
not-certain, that is reported as a default, not a reading (as in s17 and s18).

## With-source, per type — unchanged
Three fresh Claude graders (no author or solver), each on its own unmarked, re-shuffled
render (key/difficulty/explanation withheld). One grader agent may grade both types, each
on its own render. Each returns pick, second_defensible, difficulty (easy|medium|hard vs
ISEE Upper Level), above_band words, free_elimination, and (SC) whether the key-completed
sentence reads correctly aloud.

Per-item DROP: any grader picks a non-key or names a second defensible option; any grader
marks the headword or KEY above band, or >= 2 mark the same distractor above band; a
grader-named free elimination that >= 2 blind samples also certainly rejected; (SC)
key-completed sentence ungrammatical/unidiomatic per any grader; difficulty = median of
three labels; synonyms bank at the median; **SC median easy -> DROP**.
**Stage bar:** FAIL if any grader disagrees with the key on > 10% of the type's items.

## Tells (stage bar), per type, on the frozen file
- key strictly longest and strictly shortest each <= 35% of items;
- `check-recycled-distractor.mjs`: NO MEASUREMENT or margin <= its derived control;
- `verify-answer-key-spread.ts --batch` on stored order: no FAIL;
- synonyms: antonym-of-key items <= 25%; all four options one part of speech;
- solver heuristic: if all three samples name one heuristic and, pooled, the candidate
  picks that heuristic decided score > 70% on >= 15 picks, the type FAILS.
- (no rarity bar: retired, see change 1)

## After the gate
Insert passers (`verbal-bank-helper.mjs insert isee`), then `verify-admission-forms.mjs`
and the 10-form replay (`isee-verbal-replay.ts`). Report per-type counts before (syn 159 /
147 groups, SC 143 / 131) and after, the new clean-form count with form-by-form fresh
counts, and every number with its denominator. REGISTER §5 and this batch's own ledger
entries go in one commit. Committed locally; not pushed.
