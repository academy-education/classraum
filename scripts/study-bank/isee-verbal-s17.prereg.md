# isee-verbal-s17 — pre-registration (written 2026-10-08, before any item or result exists)

## Why this batch
`admission-form-depth.ts` today: ISEE verbal **242 items / 218 groups, 4 clean forms**
(form 5 = 39/40 fresh, form 6 = 20/40). Measured by type on the same 242 live verified
rows through `verbalKind()` (VERBAL_TYPES isee = 20 synonyms then 20 sentence
completions per form, one item per group, unseen-first):

    synonym              99 items / 87 groups   -> 4 clean forms (form 5 = 19/20)
    sentence completion 143 items / 131 groups  -> 7 clean forms

**Synonyms bind.** Clean forms need 20 fresh items of each type per form, so
synonyms need **+21 / +41 / +61** kept for 6 / 7 / 8 forms; sentence completions need
+0 / +0 / +17. Live difficulty: synonyms 22 easy / 51 medium / 26 hard; SC 50 / 61 / 32
(SC is easy-heavy since s15).

Commission ~100 items, both types the assembler draws, weighted to the binding type:

    60 synonyms   authors A (headwords A-L) and B (headwords M-Z), 30 each
                  mixed band, aiming at the live profile ~25% easy / 50% medium / 25% hard
    40 SC         authors C and D, 20 each, SINGLE-BLANK only, commissioned MEDIUM/HARD
                  (no easy) to pull the SC profile back from s15's easy load

7 clean forms needs >= 41 of 60 synonyms kept (68%); s14 kept 13/14 synonyms and
ssat-verbal-s17 113/116. SC needs 0 for 7 and 17 for 8. If attrition leaves synonyms
short of 41, the measured number is reported; no bar moves and no blueprint count changes.

Two-blank SC is NOT commissioned. s16 held all 16 two-blank items (excess +28.5, the
"pair whose two words hang together" tell); a fix brief for it is untested and SC is not
the binding type, so this batch does not spend items testing it.

Four independent Claude authors (never GPT), no shared templates: A and B on disjoint
headword alphabets; C and D on disjoint clue-type sets and disjoint subject domains.
Every author receives the live ISEE verbal headword/key/option list (derived from the
bank, not the directory: §14c) and must not use a live headword or key. **Cross-author
word check before merge** (ssat-verbal-s17 finding 1: two authors converged on one word
pool without seeing each other's file): no shared headword, no shared key, no option
word reused anywhere in the merged cohort (13q). A collision found pre-freeze is fixed by
the later author before freeze; after freeze, nothing is edited.

## Freeze
After authoring, the cross-author check and the structural pre-flight below, the merged
files `isee-verbal-s17-syn.batch.json` and `isee-verbal-s17-sc.batch.json` are frozen
(sha256 recorded and committed) before any solver or grader sees them. Stored choice
order is shuffled with the shared seeded generator at freeze. **No repairs after
freeze.** A dropped item stays dropped.

## Stage order and stopping
The gate is run PER TYPE, and the two types are independent strata (13p: the floor
belongs to the type): pre-flight (shape) -> freeze -> options-only blind (nosource) ->
elimination -> with-source (withsource) -> tells. **A type that fails a stage stops
there: none of that type inserts and no later stage is run for it.** The other type
continues. Only the passing type(s) are written to `isee-verbal-s17.kept.batch.json`,
which gets one ledger entry and one insert (`BANK_COHORT=isee-verbal-s17`,
`BANK_BAND=mixed`; the SC easy rule below is applied in qc.json before insert).

## Pre-flight (shape), refuse/fix before freeze only
4 distinct choices; key among them; prompt tagged `[Synonym] WORD` or
`[Sentence Completion] ...` with exactly one 7-hyphen blank; `verbalKind()` returns the
item's own type (no "is to" anywhere in an SC); single-word options in both types;
`stem-duplicates.mjs --family isee` clean against live and within file; no live
headword or key reused; cross-author check above.

## Instrument (options-only), one render per type
    make-oo-render.mjs isee-verbal-s17-syn.batch.json --control 30 --control-subskill synonym --exclude isee-verbal-s4
    make-oo-render.mjs isee-verbal-s17-sc.batch.json --control 30 --control-subskill sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4

Type-matched live control interleaved in the same file. `isee-verbal-s4` is excluded
(bijective clone sets, information-free pools: A33/13o). The synonym control is not
difficulty-filtered because the synonym commission is mixed; the SC control is
hard/medium because the SC commission is. Keys dealt flat by the script; each arm's
control is its own best-fixed-letter line, never a literal 25. Three blind samples of
one solver prompt per render — three samples, not three solvers. Each sample sees ONLY
the blind file and returns per item pick, basis, reject, reject_certain, why, plus its
heuristics with how many picks each decided.

## Bars (fixed now), per type
M_c = candidate rate - candidate best-fixed-letter; M_l = live rate - live
best-fixed-letter; pooled over the three samples. Excess E = M_c - M_l.

- **PASS (type continues): E <= +10. HOLD (nothing of that type inserts): E > +10.**
- **SC only (s15 Amendment 1, now fixed in advance):** the live SC control contains
  two-blank items; the candidate is single-blank. E is computed against the full 30 AND
  against the single-blank controls alone (shape read off the key: a two-blank option
  contains ".."). The SC type passes only if BOTH are <= +10. If the single-blank control
  subset is under 12 items, that comparison is reported as underpowered and the full-30
  bar decides.
- **Ceiling:** the bar can fire only while the live arm is below 90%. If a live arm reads
  >= 85% the blind half is SATURATED for that type and returns no verdict: HOLD and
  report, never a default pass. (Live SC measured 42.2% in s15 and 46.7% in s16; live
  ISEE synonyms measured +47.6 over chance in A34, so ~73% — the synonym arm is the one
  to watch against this line.)
- **Floor:** if a live arm reads below its own letter line, report the candidate against
  the letter line too and do not claim "better than the bank".
- A pass means *not detectably leakier than the shipped bank of that type*, not clean.
  Unanimity is reported only as a batch rate against the live arm's.

## Elimination (stage bar, fixed now), per type
From the same three samples: an item is "certainly eliminable" when >= 2 samples
certainly rejected the SAME non-key option. **PASS if the candidate share of such items
is <= max(live arm share, 5%).** FAIL -> that type stops. Per item: such an option that a
with-source grader also names as a free elimination -> DROP.

## With-source (exclusivity + difficulty), per type
Three fresh graders per type (no author, no solver), each on its own unmarked re-shuffled
render (`make-grade-render.mjs`, key/difficulty/explanation withheld). Each returns pick,
second_defensible, difficulty (easy|medium|hard vs ISEE Upper Level), above_band words,
free_elimination, and (SC) whether the completed sentence reads correctly aloud with the
key in place (§14b).

Per-item DROP rules, gathered independently of the blind samples:
- any grader picks a non-key, or names a second defensible option;
- any grader marks the headword or KEY above the ISEE Upper band, or >= 2 graders mark
  the same distractor above band;
- a grader names a free elimination AND >= 2 blind samples certainly rejected that option;
- (SC) any grader reports the key-completed sentence ungrammatical or unidiomatic;
- **difficulty = median of the three grader labels.** Synonyms bank at the median label
  (mixed). **SC median easy -> DROP** (commissioned medium/hard; not relabelled).
Read each grader's notes against its picks before applying a rule (ssat-verbal-a17
finding 3); a grader whose notes contradict its picks on many items is replaced by a
fresh grader on a fresh shuffle, and its non-pick findings still count as drop evidence.
**Stage bar:** the type FAILS withsource if any grader disagrees with the key on more
than 10% of that type's items (a miskey signal across the batch, not an item defect).

## Tells (stage bar, fixed now), per type, on the frozen file
- key strictly longest and strictly shortest (letters) each <= 35% of items (chance 25%);
- `check-recycled-distractor.mjs`: NO MEASUREMENT or margin <= its derived control;
- `verify-answer-key-spread.ts --batch` on stored order: no FAIL;
- synonyms: items with an antonym of the key among the distractors <= 25% (A35); 13n — at
  most two options from one sense-family of the headword and no look-alike beside a
  same-sense cluster; all four options one part of speech (§14b: a POS outlier is a blind
  tell; live controls were caught on it in ssat-verbal-s17);
- both types: the key is not the unique rare/"test-like" word of its set (s16 finding:
  "pick the harder word" decided 12-25 picks per sample; §14e register singleton) —
  checked by the authors' own blind self-test and by the solvers' named heuristics: if
  all three samples name one heuristic and its picks score > 70% on >= 15 picks, the type
  FAILS tells.

## Success measure
`admission-form-depth.ts` before (ISEE verbal 4; form 5 39/40) and after;
`verify-admission-forms.mjs` green; per-type counts before (syn 99, SC 143) and after.
Report numbers with denominators and the new clean-form count.
