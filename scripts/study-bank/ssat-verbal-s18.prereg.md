# ssat-verbal-s18 — pre-registration (synonym arm `ssat-verbal-s18-syn`, analogy arm `ssat-verbal-s18-ana`)

Written 2026-10-08, before any item, render or result exists. Inherits the gates of the
latest SSAT verbal brief that passed, `ssat-verbal-s17-a17.prereg.md` (`a3dc0fd1`),
except where a line below says otherwise; nothing here loosens one of them.

## Measurement (the reason for the batch)

`ssat-verbal-replay.ts` (new: a 12-form replay of the real draw, adapted from
`isee-verbal-replay.ts`; imports the real `drawByPassage`, `VERBAL_TYPES` (ssat 30 synonyms
then 30 analogies, one item per group) and `verbalKind`). Live 2026-10-08: 545 SSAT verbal
rows (24 task=analogy + 489 multiple_choice + 32 task=synonym; independent SQL count agrees),
0 unclassified.

    synonym   275 items / 250 groups      analogy   270 items / 251 groups
    forms 1-9  60/60     form 10  5/60 (syn 5/30, ana 0/30)     form 11-12  0/60
    => 9 clean forms of 12 replayed

Cross-check: `admission-form-depth.ts` prints all 6 of its forms clean for verbal and the
replay at `--forms 6` agrees; the s17/a17 record (9 clean, form 10 = 5/60) is reproduced.

**Which type binds.** Analogies, at form 10 (0/30 fresh against synonyms' 5/30). But the
margin is 5 items, and the replay says adding to analogies alone moves nothing:

    --add-ana 60              9 clean (form 10 = 35/60: synonyms then bind)
    --add-syn 30              9 clean (form 10 = 30/60: analogies bind)
    --add-syn 55 --add-ana 60 11 clean
    --need 10                 synonyms +25, analogies +30
    --need 11                 synonyms +55, analogies +60

So "+2 forms to the binding type" is +2 forms to BOTH types: they bind together. The batch
commissions both, each arm gated and decided independently. If only one arm passes, it
inserts and the clean-form count is reported as measured (expected: unchanged at 9).

## Commission

Four independent Claude authors (never GPT), one file each, run at most two at a time.
Sizes from the replay and the s17/a17 keep rates (97% / 95%; older cohorts 72-74%):

    A  synonyms  36  headwords A-L   7 easy / 19 medium / 10 hard   ids SVS18A-01..36
    B  synonyms  36  headwords M-Z   7 / 19 / 10                    ids SVS18B-01..36
    C  analogies 40  stem's first word A-L   8 / 20 / 12            ids SVA18C-01..40
    D  analogies 40  stem's first word M-Z   8 / 20 / 12            ids SVA18D-01..40

Needed kept: synonyms 55 of 72, analogies 60 of 80. Mix aims harder than a17's (which
banked 0 hard) and near the live synonym profile (53/139/73).

Per slot the key letter and difficulty are fixed by `ssat-verbal-s18-tools.mjs design`
(seed 20261031, committed with the tooling before any author runs); for analogies so are
the key relation family and the four distractor families (below).

**New words only.** Every content word in a prompt or option (stop words aside) must be
absent from every SSAT verbal row in the bank — live, staged or archived (547 rows, 3,334
words, dumped to `ssat-verbal-s18.live-words.json`) — in any inflection or -ly form
(`roots()` over-matches on purpose: soaking ~ soak). Every content word is used once per
arm across both authors. Disjoint initial-letter ranges per author as above; the second
author of each type runs after the first and checks against the first author's file
(`--also`), because two independent Claude authors converged on one word pool twice
(a17 finding 1, a18-hard). Cross-author word check on the merge, not only within a file.

## The analogy rule this batch is built on

CLAUDE.md: an item leaks when its options differ along the axis the stem names. For an
analogy the stem names a RELATION. With the stem withheld, the option set must not say
which option carries that relation. Operationally, every item is built so that the only
way the options differ is the axis that only the stem can resolve:

1. **Five options, five DIFFERENT relation families, each a valid crisp instance.** No two
   options share a family (a18-hard: a family appearing once among pairs was the key 17/17);
   no option is a broken or mismatched twin of the key (a18-hard: 22/22); no option is the
   key's relation reversed (A33).
2. **Balanced incidence.** Each author has a fixed list of 10 families (C: part/whole,
   worker/tool, container/contents, object/material, young/adult, category/instance,
   worker/workplace, tool/function, preparation/act, creator/creation; D: cause/effect,
   degree, lack, symbol/symbolized, animal/characteristic, early stage/later stage,
   synonyms, antonyms, instrument/what it measures, expert/field of study). The seeded
   design puts each family in exactly 20 of the author's 40 items and keys it in exactly 4:
   every family's key rate is 20.0%, the five-choice chance line, so recognising WHICH
   relation an option instantiates carries no information about the key (the s10 fix).
3. **One shape.** Stem and all five options are noun : noun (a17 author D's residual
   part-of-speech majority tell), each option from a different everyday domain, and the key
   not from the stem's own domain (the live bank's "odd domain out").
4. The author declares `stem_relation` and `option_relations` (5, aligned to choices) per
   item; the checker refuses any deviation from the design.

## Gates, per type, in this order. Stop at the first that fails; no repairs after freeze.

**0. Pre-flight (fixable before freeze only).** `ssat-verbal-s18-tools.mjs check` PASS for
each author file against the live words and the other author; on each merged arm:
`stem-duplicates` 0 (also in gateBatch); no live stem or key pair reused;
`check-recycled-distractor.mjs` NO MEASUREMENT or margin at/under its derived control;
stored key slots no slot > 30%; key strictly longest / strictly shortest each <= 30%;
every prompt classified by `verbalKind()` as its own type. Then FREEZE: the merged arm
files are committed with their sha256 before any solver or grader sees them.

**1. Options-only (`nosource`) — the deciding stage.**

    make-oo-render.mjs ssat-verbal-s18-syn.batch.json --control 40 --control-subskill synonym --exclude ssat-verbal-s6
    make-oo-render.mjs ssat-verbal-s18-ana.batch.json --control 40 --control-subskill analogy --exclude ssat-verbal-s6

Control: 40 live items of the same type, sampled by the script's shared generator from the
WHOLE eligible live pool of that subskill (every cohort, a17/s17 included; `ssat-verbal-s6`
bijective clone sets excluded as in s17), interleaved in the same file, keys dealt flat.
Three blind samples of one Claude solver prompt per render ("three samples", not three
solvers); each returns pick, basis, reject, reject_certain, and why.
M_c = candidate rate - candidate best-fixed-letter; M_l = live rate - live
best-fixed-letter, pooled over the three samples; E = M_c - M_l.

- PASS: E <= +10. HOLD (nothing of that type inserts): E > +10.
- Ceiling: if the live arm reads >= 85% the instrument is saturated for that type: HOLD
  and report, never a default pass. Below that, the +10 bar is reachable (a candidate can
  exceed the live arm by 10 points while staying under 100%), so it can fire.
- Floor: if the live arm reads below its own letter line, also report the candidate
  against the letter line and do not claim "better than the bank".
- **Analogies only, the relation-axis check:** pooled options-only hit rate per relation
  family on the items it KEYS (4 items x 3 samples = 12 picks per family). HOLD analogies
  if any family reaches >= 9 of 12 (75%; chance 20%). This is the a18-hard failure mode
  (sign, degree 100%) measured directly.
- Unanimity is reported as a batch rate against the live arm only, never per item.

**2. Elimination.** Items where >= 2 samples certainly rejected the same option, candidate
vs live, as rates. PASS if the candidate rate <= live rate + 10 points.

**3. With-source (`withsource`).** Two fresh Claude graders per type (no author, no
solver), each on its own unmarked re-shuffled render with stem and five options. Each
returns pick, second_defensible, difficulty (easy|medium|hard vs SSAT Upper Level),
above_band (GRE-tier stem/key/option), free_elimination, and: synonyms `antonym_option`
(an option meaning the opposite of the key's sense); analogies `invalid_option` (an option
with no crisp relation, or a mismatched twin of the key) and `free_identification` (a
feature of the five options alone that singles out the key). A grader's notes are read
against its picks before any rule is applied (a17 finding 3).

Per-item DROP, with-source evidence only: any grader picks a non-key or names a second
defensible option; any grader marks the stem or key above band, or both graders the same
distractor; any grader names an `invalid_option` or a `free_identification`; a grader names
a free elimination AND >= 2 blind samples rejected that same option as certain.
Batch gate: synonym items with an `antonym_option` flagged by either grader <= 25%.
Banked difficulty = the EASIER of the two grader labels (s15/s17 precedent), BANK_BAND=mixed.

**4. Tells on the kept set** (`tells`): recycled-distractor and key-length extremes re-run on
the kept file; analogy family key rate on the kept items reported.

**5. Insert** passers per type (`verbal-bank-helper.mjs`, BANK_COHORT per arm) once the
ledger entry for the kept file's sha holds all five stages; then
`verify-admission-forms.mjs` and `ssat-verbal-replay.ts`.

## Success measure

Clean forms before 9 (replay, 12 forms). Target 11 (synonyms +55 and analogies +60 kept).
If either arm HOLDs or attrition leaves it short, report the measured number; no bar is
lowered and no blueprint count changes.
