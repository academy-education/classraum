# isee-verbal-s20 — pre-registration (written 2026-10-08, before any item or result exists)

## Why this batch
s19 inserted 34 of 35 synonyms and held all 70 SC at options-only (+22.4 all live /
+27.3 single-blank, bar +10; REGISTER §5). The live bank is 336 verified ISEE verbal
rows. `isee-verbal-replay.ts` (real `drawByPassage`, `VERBAL_TYPES`, `verbalKind`), run
for this prereg:

    synonym              193 items / 181 groups
    sentence completion  143 items / 131 groups
    forms 1-7 40/40, form 8 23/40 (syn 20/20, SC 3/20), form 9 20/40 (SC 0/20)  -> 7 clean forms
    --need 9: synonyms +0, SC +37      (8 forms: SC +17)

Synonyms already carry 9 forms. **SC is the only thing binding, so s20 is SC only.**

**Target: 9 clean forms. Commission 70 FRESH single-blank SC**, ~70% hard (49 hard /
21 medium), from three Claude authors in ONE wave of three:

    author   n    hard/medium   lane (s18/s19 lanes, unchanged)                                letters
    A        24   17 / 7        contrast/restatement clues, science/technology/medicine         a-f
    B        23   16 / 7        cause/purpose clues, history/government/economics/geography     g-o
    C        23   16 / 7        examples/degree clues, arts/sport/school/work                   p-z

8 forms needs >= 17 of 70 kept (24%), 9 forms >= 37 of 70 (53%). If SC holds or attrition
leaves it short, the measured number is reported; no bar moves and no blueprint count
changes. No synonyms, no two-blank SC.

**The frozen s18 and s19 items are not re-run, repaired or inserted.** s20 is all new
words.

## What is kept from s19, unchanged
- s18's SC distractor brief: every distractor as specific, uncommon and test-worthy as the
  key, the exact right word for a DIFFERENT equally concrete sentence, matched on part of
  speech, register and rarity; no generic filler; key-rarest about 1 in 4 and key-most-
  common about 1 in 4 (a band, not a cap); the same band for strictly-longest/shortest.
  `rarity_order` is recorded as a self-check and stripped at freeze.
- The in-band rule for hard: a key a strong ISEE Upper (grade 8-11) student may not know
  cold, still inside the band (s18 above-band drops: intranasally, fusible, friable,
  hygroscopic, mawkish).
- The controls: **the whole eligible live hard/medium SC pool**, `--control 77`
  (`isee-verbal-s4` excluded; 61 single-blank). The s19 SC were not inserted, so the pool
  is the one s19 measured. If the render prints a different eligible count, the control is
  that whole count and the number is reported.
- The five-stage gate, the stage bars, the with-source drop rules and the tells, exactly as
  in `isee-verbal-s19.prereg.md` (restated below for SC).
- Collision rules: no word (headword, key or option) that is a live ISEE verbal word or an
  s17/s18/**s19** word, inflections included, checked by `isee-verbal-s19-collisions.mjs`
  during authoring (exact + light stem + shared prefix). The word list is re-derived from
  the bank into `isee-verbal-s20.live-words.json` (live rows now include s19's 34 synonyms,
  plus every word of the s19 frozen SC and all five s19 author files). The checker gains a
  `--words <file>` flag and a `--build --out <file> --prior <tags>` form; its default
  behaviour on s19 is unchanged.
- Disjoint initial-letter ranges for EVERY word an author writes (key and all three
  distractors), one wave of three so parallel authors cannot converge; each author runs the
  checker on its own file with `--range` and `--against` the other two files on disk.

## What changed from s19 (and only this)
s19's tell (REGISTER §5): the difficulty instruction ("a reversal, a hardly/far from, a
contrast with a described opposite") made authors put the described opposite among the
options, so the option set carried the sentence's axis and both its poles. All three
samples named **antonym pair** (key = one pole of a visible opposite pair; 77.6% on
candidate picks vs 51.0% on live) and **odd one out among near-synonyms** (key differs in
polarity from three near-synonyms; 87.5%). Four new authoring rules:

1. **No antonyms.** No option may be an antonym of the key or of another option. Not a
   strict dictionary antonym and not a near-opposite on the sentence's axis
   (latent/manifest, headlong/protracted, nascent/moribund).
2. **No shared polarity.** No three options may share a polarity or connotation
   (positive / negative / neutral, approving / disapproving) that the key lacks. Authors
   label each option's polarity (`polarity`, stripped at freeze) and the self-check script
   refuses a violation; the brief asks, beyond the rule, that the key's polarity be shared
   by at least one distractor.
3. **Difficulty from the sentence, not the options.** A hard item gets its difficulty
   from clue distance (the clue in a different clause or sentence from the blank), from
   vocabulary in the STEM, or from a subtle restatement (the clue paraphrases the key's
   meaning without its definition words). It does NOT get it from a reversal word whose
   opposite appears among the options. A reversal clue is allowed only if the reversed
   quality appears nowhere in the option set.
4. **Self-check during authoring, with the stem covered.** Each author, with only the
   four options visible, applies three heuristics to every item and records a FORCED pick
   for each (`selfcheck`, stripped at freeze):
     - `antonym_pole`  — s19: the key is one side of an antonym pair (pick the pole most
                         likely to be the key)
     - `odd_one_out`   — s19: pick the option that differs in sense or polarity from the
                         other three
     - `most_specific` — s18: pick the most specific, test-worthy word
   Hit rate per heuristic = items where the forced pick is the key / items in the file.
   **Bar: each heuristic <= 35% across the author's file** (chance is 25%; 24 items -> at
   most 8 hits, 23 items -> at most 8). `isee-verbal-s20-selfcheck.mjs` computes it,
   enforces rule 2 on the author's labels, and exits non-zero on a breach; the author
   revises inside its own letter range until it passes.

   **Blind probe (steering, decides nothing).** An author knows its keys, so its own
   forced picks are biased toward missing them. After all three files pass the self-check,
   ONE fresh Claude probe agent (never an author, solver or grader) reads an options-only
   render of all 70 items (`isee-verbal-s20-probe.mjs render`: keys dealt flat, items
   interleaved and renumbered, no author tag) and returns, per item, the same three forced
   picks, any option pair it reads as antonyms or near-opposites, and each option's
   polarity. `isee-verbal-s20-probe.mjs score` reports per author file: each heuristic's
   hits / N, items with a probe-named opposite pair, and items breaking rule 2 on the
   probe's polarity labels. **An author file with any heuristic > 35%, or any item with a
   probe-named opposite pair or a probe-read polarity breach, gets ONE revision round**
   (revise only the named items, inside its range, checker + self-check re-run), then one
   fresh probe re-reads the revised files. That second reading is recorded at freeze
   whatever it says; the options-only stage, not the probe, decides.

Claude agents only, never GPT. At most three agents at once; completion is judged by the
file on disk; a dead agent is relaunched from its file's state.

## Freeze
After authoring, checker 0 problems on every file (cross-author included), self-check pass
on every file, the probe round, and the structural pre-flight, the merged file
`isee-verbal-s20-sc.batch.json` is frozen (sha256 recorded and committed) before any solver
or grader sees it. Author-only fields (`rarity_order`, `polarity`, `selfcheck`) are
stripped; stored choice order is dealt from a seeded balanced deck
(`isee-verbal-s20-freeze.mjs`, s19's freeze with one type). **No repairs after freeze.** A
dropped item stays dropped.

## Stage order and stopping
pre-flight (shape) -> freeze -> options-only blind (nosource) -> elimination -> with-source
(withsource) -> tells. **The first failed stage stops the batch: nothing inserts and no
later stage is run.** Passers go to `isee-verbal-s20.kept.batch.json`, one ledger entry, one
insert (`BANK_COHORT=isee-verbal-s20`, `BANK_BAND=mixed`).

## Pre-flight (shape), refuse/fix before freeze only
4 distinct single-word lowercase choices; key among them; `[Sentence Completion] ...` with
exactly one 7-hyphen blank; no "is to"; `verbalKind()` = sentence completion;
`stem-duplicates.mjs --family isee` clean against live and within file; collision checker
0 problems; key strictly longest and strictly shortest each in a 15-35% band of items.

## Options-only (nosource)
    make-oo-render.mjs isee-verbal-s20-sc.batch.json --control 77 --control-subskill sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4

Scored by `isee-verbal-s18-oo-score.mjs` (unchanged). Three blind samples of one Claude
solver prompt (three samples, not three solvers); each sees ONLY the blind file and returns
per item pick, basis, reject, reject_certain (judged per item), why, and the name of the
heuristic that decided the pick, plus a heuristics list with picks decided.

M = arm rate − arm best-fixed-letter, pooled over three samples; E = M_candidate − M_live.
- **PASS: E <= +10 against all live controls AND against the single-blank controls
  alone. HOLD otherwise.**
- **Ceiling:** a live arm at >= 85% is SATURATED: HOLD and report, never a default pass.
- **Floor:** a live arm below its own letter line -> report the candidate against the
  letter line too; no "better than the bank" claim.
- Unanimity reported only as a batch rate against the live arm's.
- Reported, not gating: candidate hit rate on picks tagged with an antonym-pair or
  odd-one-out heuristic, against s19's 77.6% / 87.5%.

**Attainable range (stated before the run).** Round-robin deal: candidate 70 -> 18/18/17/17
= 25.7%; control 77 -> 26.0% (single-blank subset's line computed from its deal).
M_c spans [−25.7, +74.3]; the HOLD bar can fire while M_live < 64.3, i.e. a live arm under
~89.5%, and saturation stops the run at 85%, so both bars are reachable across the whole
unsaturated range. Live SC measured on this same 77-item pool in s19: all 40.7% (M +14.7),
single-blank 37.7% (M +9.8). The candidate arm is 70 items through three correlated
samples (worth about one): roughly ±6 points of binomial noise at p≈0.4. An E between
about +4 and +16 will be reported as within that noise whichever side of +10 it lands; the
bar is the bar.

## Elimination (stage bar) — unchanged
Item "certainly eliminable" when >= 2 samples certainly rejected the SAME non-key option.
PASS if candidate share <= max(live arm share, 5%). If every sample marks every item
not-certain, that is reported as a default, not a reading.

## With-source — unchanged
Three fresh Claude graders (no author, probe or solver), each on its own unmarked,
re-shuffled render (`isee-verbal-s19-grade-render.mjs`; key/difficulty/explanation
withheld). Each returns pick, second_defensible, difficulty (easy|medium|hard vs ISEE Upper
Level), above_band words, free_elimination, reads_correctly.

Per-item DROP: any grader picks a non-key or names a second defensible option; any grader
marks the KEY above band, or >= 2 mark the same distractor above band; a grader-named free
elimination that >= 2 blind samples also certainly rejected; key-completed sentence does
not read correctly per any grader; difficulty = median of three; **median easy -> DROP**.
**Stage bar:** FAIL if any grader disagrees with the key on > 10% of items.

## Tells (stage bar), on the frozen file
- key strictly longest and strictly shortest each <= 35% of items;
- `check-recycled-distractor.mjs`: NO MEASUREMENT or margin <= its derived control;
- `verify-answer-key-spread.ts --batch` on stored order: no FAIL;
- solver heuristic: if all three samples name one heuristic and, pooled, the candidate
  picks that heuristic decided score > 70% on >= 15 picks, SC FAILS.

## After the gate
Insert passers (`verbal-bank-helper.mjs insert isee`), then `verify-admission-forms.mjs`
and `isee-verbal-replay.ts`. Report SC before (143 / 131 groups) and after, the clean-form
count with form-by-form fresh counts, and every number with its denominator. REGISTER §5
and this batch's own ledger entry go in one commit (ledger.json re-read from HEAD before
editing). Committed locally; not pushed.
