# isee-verbal-s18 — pre-registration (written 2026-10-08, before any item or result exists)

## Why this batch
After s17 (60 synonyms inserted, 40 SC held), a 10-form replay of the real draw
(VERBAL_TYPES isee = 20 synonyms + 20 SC per form, one item per group, unseen-first,
the real `drawByPassage`) on the 302 live verified ISEE verbal rows:

    synonym              159 items / 147 groups   (easy 41 / medium 78 / hard 40)
    sentence completion  143 items / 131 groups   (easy 50 / medium 61 / hard 32)
    forms 1-7 40/40, form 8 22/40 (syn 19/20, SC 3/20), form 9 0/40  -> 7 clean forms

The same replay with N synthetic solo items added per type gives the need:

    clean forms   synonyms   SC
    8             +1         +17
    9             +21        +37
    10            +41        +57

Commission ~90 items, weighted to SC:

    30 synonyms   authors A (headwords A-L) and B (headwords M-Z), 15 each; s17's method
                  unchanged; mixed band aiming at ~25% easy / 50% medium / 25% hard
    60 SC         authors C, D and E, 20 each, SINGLE-BLANK only, MEDIUM/HARD only

9 clean forms needs >= 21 of 30 synonyms (70%) and >= 37 of 60 SC (62%) kept. If a
type holds or attrition leaves it short, the measured number is reported; no bar
moves and no blueprint count changes.

Two-blank SC is not commissioned (s16 held all 16 two-blank items; no tested fix).

## What changed from s17 (and only this)
s17's 40 SC were held at options-only: excess +12.7 against the 21 single-blank live
controls (bar +10). All three samples named one heuristic: "pick the most specific,
distinctive, test-worthy word" (40 / 46 / 52 picks). s17's register-parity rule ("the
key is not the uniquely hardest word") was written and was not enough: the key was the
word the sentence was BUILT for and the distractors read as generic.

**SC brief, the fix.** Every wrong answer must be as specific, uncommon and test-worthy
as the key: each distractor is the exact right word for a DIFFERENT, equally concrete
sentence, and would itself be a plausible ISEE Upper Level key. Options in a set are
matched on part of speech, register (no colloquial/plain word beside a Latinate one
unless all four are), and rarity. No generic filler (good, big, important, strange,
helpful...). Authors are told the target as a BAND, not a cap (s17 finding 1: a cap is
satisfied by the opposite tell): over their 20 items the key should be the rarest of its
four in about 1 item in 4 (3-6 of 20), the most common in about 1 in 4, and in between
otherwise. The same band applies to strictly-longest / strictly-shortest key.

Synonym brief: s17's, with new headwords. No headword, key or option word may repeat a
live ISEE verbal word (list re-derived from the bank, now including s17's synonyms) or
any s17 word (syn and the held SC), and none may repeat across s18 authors.

Five independent Claude authors (never GPT), no shared templates, disjoint lanes:
A/B by headword alphabet; C, D, E on disjoint clue-type sets and disjoint subject
domains. Cross-author word check before merge (no shared headword, key, or option word
anywhere in the merged cohort). Pre-freeze collisions are fixed by the later author;
parallel revisers get disjoint initial-letter ranges for new words (s17 finding 2).

## New measurement: is the key the rarest word, with the stem withheld? (pre-registered)
No word-frequency corpus is installed in this repo, so rarity is read by Claude raters,
not computed. Instrument (`isee-verbal-s18-rarity`): every option set reduced to its
four words, stem/headword withheld, keys dealt flat, interleaved and renumbered, with
two reference arms in the same file:

  - ANCHOR: the 40 frozen s17 SC (`isee-verbal-s17-sc.batch.json`) — the cohort whose
    tell this measurement exists to detect;
  - LIVE: 30 live single-blank ISEE SC (medium/hard, `isee-verbal-s4` excluded).

Each rater, per set, names `rarest` (the word an ISEE Upper Level student is least
likely to have met) and `testlike` (the word that looks most like what a vocabulary
test is built around). Statistic per arm: **K = key-rarest rate pooled over raters**
(sum over raters and items of [rarest == key] / (raters x n)); T likewise for testlike.
Chance is 25%.

**Validity first (break the check).** The instrument is valid only if it reads the s17
ANCHOR at K >= 40% or T >= 40%. If neither, it cannot see the tell it was built for:
the rarity result is NO MEASUREMENT, and SC cannot pass the tells stage on it (HOLD,
reported), because a check that cannot read its input must not return a pass.

**Bars on the s18 candidate, per type:**
- SC: **K <= 30%** and **K >= 12.5%** (the floor is the opposite tell: "reject the
  rarest"). Also T <= 35%. Fail any -> SC fails tells.
- Synonyms: **K <= 30%**. (The synonym key is normally the plain gloss, so a low K is
  the format, not a tell; the floor is reported, not applied.)

Two readings:
1. **Pre-flight (R1), before freeze:** one Claude rater on the author files. If an SC
   author file is outside the band, that author gets ONE revision round before freeze.
   R1 is a steering read and decides nothing.
2. **Binding (R2), on the frozen files:** three FRESH Claude raters (never authors,
   solvers, graders or R1). R2 is part of the tells stage and is run only for a type
   that reaches tells.

## Freeze
After authoring, cross-author check, structural pre-flight and R1, the merged files
`isee-verbal-s18-syn.batch.json` and `isee-verbal-s18-sc.batch.json` are frozen (sha256
recorded and committed) before any solver, grader or R2 rater sees them. Stored choice
order is shuffled with the shared seeded generator at freeze. **No repairs after
freeze.** A dropped item stays dropped.

## Stage order and stopping (s17's five-stage gate, unchanged)
Per type, independent strata: pre-flight (shape) -> freeze -> options-only blind
(nosource) -> elimination -> with-source (withsource) -> tells. **A type that fails a
stage stops there: none of that type inserts and no later stage is run for it.** The
other type continues. Passing type(s) go to `isee-verbal-s18.kept.batch.json`, one
ledger entry per type outcome, one insert (`BANK_COHORT=isee-verbal-s18`,
`BANK_BAND=mixed`).

## Pre-flight (shape), refuse/fix before freeze only
4 distinct single-word choices; key among them; `[Synonym] WORD` or
`[Sentence Completion] ...` with exactly one 7-hyphen blank; `verbalKind()` returns the
item's own type (no "is to" in an SC); `stem-duplicates.mjs --family isee` clean against
live and within file; no live or s17 headword/key reused; cross-author check; key
strictly longest and strictly shortest each in a 15-35% band of items.

## Options-only (nosource), one render per type — s17's instrument and two-control rule
    make-oo-render.mjs isee-verbal-s18-syn.batch.json --control 30 --control-subskill synonym --exclude isee-verbal-s4
    make-oo-render.mjs isee-verbal-s18-sc.batch.json  --control 40 --control-subskill sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4

The SC control is 40 (s17: 30) so the single-blank subset is larger than s17's 21.
Three blind samples of one Claude solver prompt per render (three samples, not three
solvers); each sample sees ONLY the blind file(s) and returns per item pick, basis,
reject, reject_certain, why, plus named heuristics with picks decided. The brief says
`reject_certain` must be JUDGED per item and true only when that option can be ruled
out with no stem at all (s17 finding 3: it was filled by formula).

Bars, per type. M = arm rate - arm best-fixed-letter, pooled over three samples;
E = M_candidate - M_live.
- **PASS: E <= +10. HOLD: E > +10.**
- **SC: E against all live controls AND against the single-blank controls alone** (shape
  read off the key: a two-blank option contains ".."); both must be <= +10. Single-blank
  subset under 12 items -> reported as underpowered, the full bar decides.
- **Ceiling:** a live arm at >= 85% is SATURATED: HOLD and report, never a default pass.
- **Floor:** a live arm below its own letter line -> report the candidate against the
  letter line too; no "better than the bank" claim.
- Unanimity reported only as a batch rate against the live arm's.

## Elimination (stage bar), per type — unchanged
Item "certainly eliminable" when >= 2 samples certainly rejected the SAME non-key
option. PASS if candidate share <= max(live arm share, 5%). If every sample marks
every item not-certain, that is reported as a default, not a reading (as in s17).

## With-source, per type — unchanged
Three fresh Claude graders (no author, solver or rater), each on its own unmarked,
re-shuffled render (`make-grade-render.mjs`; key/difficulty/explanation withheld). One
grader agent may grade both types, each on its own render. Each returns pick,
second_defensible, difficulty (easy|medium|hard vs ISEE Upper Level), above_band words,
free_elimination, and (SC) whether the key-completed sentence reads correctly aloud.

Per-item DROP: any grader picks a non-key or names a second defensible option; any
grader marks the headword or KEY above band, or >= 2 mark the same distractor above
band; a grader-named free elimination that >= 2 blind samples also certainly rejected;
(SC) key-completed sentence ungrammatical/unidiomatic per any grader; difficulty =
median of three labels; synonyms bank at the median; **SC median easy -> DROP**.
**Stage bar:** FAIL if any grader disagrees with the key on > 10% of the type's items.

## Tells (stage bar), per type, on the frozen file
- key strictly longest and strictly shortest each <= 35% of items;
- `check-recycled-distractor.mjs`: NO MEASUREMENT or margin <= its derived control;
- `verify-answer-key-spread.ts --batch` on stored order: no FAIL;
- synonyms: antonym-of-key items <= 25%; all four options one part of speech;
- **R2 rarity bars above** (with the anchor validity condition);
- solver heuristic: if all three samples name one heuristic and its candidate picks score
  > 70% on >= 15 picks, the type FAILS.

## Success measure
10-form replay (per type) and `admission-form-depth.ts` before (ISEE verbal 7 clean;
form 8 = 22/40) and after; `verify-admission-forms.mjs` green; per-type counts before
(syn 159 / 147 groups, SC 143 / 131) and after. Numbers reported with denominators and
the new clean-form count.
