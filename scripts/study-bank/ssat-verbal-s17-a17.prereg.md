# ssat-verbal-s17 (synonyms) + ssat-verbal-a17 (analogies) — pre-registration

Written 2026-10-06, before any item or result exists.

## Why this batch
A paying student has used 4 of the 5 SSAT Verbal forms. Measured today through the
real `drawByPassage` replay (VERBAL_TYPES ssat = 30 synonyms then 30 analogies, one
item per group, unseen-first), on 311 live verbal rows:

    synonym   162 items / 137 groups -> 5 clean forms   needs +18 / +48 / +78 for 6 / 7 / 8
    analogy   149 items / 130 groups -> 4 clean forms   needs +31 / +61 / +91 for 6 / 7 / 8

(`admission-form-depth.ts` prints verbal 4 clean; analogies dropped to 4 after the
2026-10-06 stem-duplicate archives.) Goal: SSAT verbal >= 8 clean forms, so >= 78 kept
synonyms AND >= 91 kept analogies. Historical keep rates 72% (s8) / 74% (a7), so the
commission is ~112 synonyms (two authors x 56, disjoint stem alphabets A-L / M-Z) and
~128 analogies (two authors x 64, disjoint relation-family sets and disjoint stem
alphabets). Independent Claude authors, never GPT. Commissioned MIXED band
(`BANK_BAND=mixed`), aiming at roughly the live profile (syn 28 easy / 90 medium /
44 hard; ana 21 / 83 / 45).

## Instrument (options-only), one render per TYPE
    make-oo-render.mjs ssat-verbal-s17.batch.json --control 30 --control-subskill synonym --exclude ssat-verbal-s6
    make-oo-render.mjs ssat-verbal-a17.batch.json --control 30 --control-subskill analogy --exclude ssat-verbal-s6

Type-matched live control interleaved in the same file (13p). `ssat-verbal-s6` is
excluded because its 56 rows are the bijective clone sets whose shared pools are
information-free (A33 / 13o; the only cohort with shared option sets, measured today).
`ssat-verbal-s5` drops out by the subskill filter (topic-name subskills). Keys dealt
flat by the script; the control for each arm is that arm's own best-fixed-letter line,
never a literal 20. Three blind samples of one solver prompt per render — "three
samples", not three solvers. Each sample returns pick, basis, reject, reject_certain,
and its heuristics with how many picks each decided.

## Bars (fixed now), per type, independently
M_c = candidate rate - candidate best-fixed-letter; M_l = live rate - live
best-fixed-letter; pooled over three samples. Excess E = M_c - M_l.

- **PASS (that type may insert): E <= +10.**
- **HOLD (nothing of that type inserts): E > +10.** No repairs after the attack.
- **Ceiling:** the bar can fire only while the live arm is below 90%. If the live arm
  reads >= 85%, the blind half is SATURATED for that type and returns no verdict: HOLD
  and report, never a default pass. (A33 measured live ~56-60% on unique sets.)
- **Floor:** if a live arm reads below its own letter line, report the candidate
  against the letter line too and do not claim "better than the bank".
- A pass means *not detectably leakier than the shipped bank of that type*, not clean.

## With-source (exclusivity + band), fixed now
Two fresh graders per type (no author, no solver), each on its own unmarked re-shuffled
render showing the stem and five options. Each returns pick, second_defensible,
difficulty (easy|medium|hard vs SSAT Upper Level), above_band (GRE-tier stem/key/option),
free_elimination (an option rejectable without the stem).

Per-item DROP rules, gathered independently of the blind samples:
- any grader picks a non-key, or names a second defensible option;
- any grader marks the stem or key above the SSAT Upper band, or both graders mark the
  same distractor above band;
- a grader names a free elimination AND >= 2 blind samples rejected that same option as
  "certain";
- pre-flight: stem duplicates a live SSAT item (`stem-duplicates.mjs`, also in
  gateBatch) or the other author's item (the later one drops); analogy items with the
  same stem pair or the same key pair as live or the other author;
- banked difficulty = the EASIER of the two grader labels (s15 precedent).
Unanimity among blind samples is reported only as a batch rate against the live arm's
rate (CLAUDE.md, three samples of one solver), never a per-item drop.

## Batch tells, checked before the attack (refuse/fix pre-attack only)
Stored key slots near flat per type (no slot > 30% at n >= 50); key strictly longest
and strictly shortest each at about chance (1 in 5); `check-recycled-distractor.mjs` on
each merged file must report NO MEASUREMENT or a margin at/under its derived control
(no single unique outlier option per item: whole-pool or no recycling); synonym items
containing an antonym of the key's sense <= 25% (the A35 key+antonym tell); 13n: at most
two options from one sense-family and no look-alike with a same-sense cluster; analogy
relation family of the KEY varied (no family keyed in > 15% of items) and no option
that is the key's relation reversed (the A33 relational-inversion tell); every prompt
tagged and classified by `verbalKind()` as its own type.

## Success measure
`admission-form-depth.ts` before (verbal 4) and after; per-type replay before
(syn 5 / ana 4) and after. Target 8 per type. If a type HOLDs or attrition leaves it
short, report the measured number; do not lower a bar or change a blueprint count.
