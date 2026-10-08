# ssat-verbal-s19-ana — pre-registration (75 analogies, cohort `ssat-verbal-s19-ana`)

Written 2026-10-09, before any item, render or result exists. Inherits every gate of
`ssat-verbal-s18.prereg.md` (`399c6b2f`) for the analogy arm except where a line below says
otherwise. Two things change: **the per-family gate** (s18 finding 1) and **the grader's
difficulty / easiness rules** (s18 synonym finding). The 80 held s18 analogies are not
re-run, repaired or inserted.

## Measurement (the reason for the batch)

`ssat-verbal-replay.ts`, live 2026-10-09: 617 SSAT verbal rows (synonym 347 / 322 groups,
analogy 270 / 251 groups, unclassified 0). **9 clean forms of 12**; forms 10 and 11 are
syn 30/30 with ana 0/30. `--add-ana 30` gives 10, `--add-ana 60` gives 11, `--need 11` =
synonyms +0, analogies +60. Analogies bind alone. Target: **60 kept of 75** (80%; a17 kept
95%, older cohorts 72-74%). If fewer are kept, the clean-form count is reported as measured;
no bar moves and no blueprint count changes.

## Commission

75 analogies, ids `SVA19-01..75`, written by Claude authors (never GPT), **one file per
item** in `ssat-verbal-s19-work/items/`, 5-7 items per author run, at most two runs at a
time; each run checks every item against the bank's words and against every item file
already on disk (`ssat-verbal-s19-tools.mjs check-item`). Difficulty commissioned
**10 easy / 35 medium / 30 hard** (live analogies 95 / 130 / 45).

**Seeded design** (`ssat-verbal-s19-tools.mjs design`, seed 20261109, committed with the
tooling before any author runs) fixes per slot the key letter (15 per letter), the
difficulty, the key family and the four distractor families.

**15 relation families, four clusters.** young/adult, instrument/what it measures,
expert/field of study, early stage/later stage and animal/characteristic are dropped (s18
finding 4: their free word pools are nearly exhausted).

    person   worker/tool, worker/workplace, creator/creation
    thing    part/whole, container/contents, object/material, category/instance
    process  cause/effect, tool/function, preparation/act
    sense    degree, synonyms, antonyms, lack, symbol/symbolized

Every item's five options are five different families laid out **2 + 2 + 1**: two pairs of
same-cluster families and one singleton, from three different clusters. Every family
appears in 25 items (20 as a pair member, 5 as the singleton) and is keyed in 5 (4 and 1):
its key rate is 20.0% overall, in pair role and in singleton role. So neither WHICH family
an option instantiates nor WHERE it sits in the cluster pattern says anything about the key
with the stem withheld (CLAUDE.md axis rule, s18 balanced incidence carried over).

**The near miss (new; against the s18-synonym "unrelated distractor" easiness).** In the 60
items whose key sits in a pair, the pair partner is the key's same-cluster **sibling**: the
author writes it as the option a reader who takes the stem relation only loosely would
accept (e.g. stem worker/tool, sibling worker/workplace), and declares it in `near_miss`
(`option`, `why`). It must still be plainly wrong under the precise relation. The
remaining 15 items carry their temptation however the author can, without breaking a rule.

**Item rules** (all from s18 unless marked new):
1. Stem and all options noun : noun, every option a valid crisp instance of its declared
   family; no option a broken or mismatched twin of the key; no option the key's relation
   reversed. **New:** every pair is written in its family's canonical order (part:whole,
   worker:tool, worker:workplace, creator:creation, container:contents, object:material,
   category:instance, cause:effect, tool:function, preparation:act, lesser:greater for
   degree, bearer:what it lacks, symbol:symbolized), so no option reads "reversed".
2. Each option from a different everyday domain; the key not from the stem's own domain.
3. **New:** vocabulary level is spread across the options. The key is never the option with
   the uniquely rarest or most "test-like" words; at least two distractors sit at the key's
   word level (s17/s19 ISEE: "the test-worthy word is the key").
4. Upper Level band: hard comes from a less common but in-band word and/or a close near
   miss, never from GRE-tier vocabulary.
5. **New words only, inflections included:** no content word of any SSAT verbal row in the
   bank, live, staged or archived (619 rows, 3,766 words, re-dumped 2026-10-09 after the s18
   synonyms were inserted, `ssat-verbal-s19.live-words.json`; `roots()` over-matches on
   purpose), each content word once in the cohort. The held s18 analogies are not in the
   bank, so their single words are free, but **none of their 480 stem/option pairs may
   recur** (a fresh batch, not s18 re-dealt).
6. Declared `stem_relation`, `option_relations` (5, aligned to choices), `near_miss`,
   `distractor_rationales`; `check-item` refuses any deviation from the design.

## Gates, in this order. Stop at the first that fails; no repairs after freeze.

**0. Pre-flight (fixable before freeze only).** `check-all` PASS on the merged file (design,
words, cross-item collisions, key slots <= 30%, key strictly longest / shortest each <= 30%,
no option string repeated); `stem-duplicates` 0; no live stem or key pair reused;
`check-recycled-distractor.mjs` NO MEASUREMENT or at/under its control; `verbalKind()`
analogy for every prompt. Then FREEZE: `ssat-verbal-s19-ana.batch.json` committed with its
sha256 before any solver or grader sees it.

**1. Options-only (`nosource`) — deciding.**

    make-oo-render.mjs ssat-verbal-s19-ana.batch.json --control 40 --control-subskill analogy --exclude ssat-verbal-s6

40 live analogies from the whole eligible pool, interleaved, keys dealt flat. Three blind
samples of one Claude solver prompt ("three samples", not three solvers), each returning
pick, basis, reject, reject_certain and why **for every item, judged by reading it**: no
code, no random generator (s18 sample b used one for 98 picks). M_c / M_l = rate minus the
arm's best fixed letter, pooled; **E = M_c − M_l. PASS E <= +10; HOLD E > +10.** Ceiling:
live arm >= 85% → HOLD as saturated (the +10 bar is reachable below that). Floor: live arm
under its letter line → report against the letter line, no "better than the bank" claim.
Unanimity is a batch rate against the live arm, never per item.

**1b. The precision family gate (replaces s18's ">= 9 of 12 keyed picks").** For each family
f, over the candidate arm: I_f = items where f is among the options, K_f = those it keys,
c_i = samples (of 3) whose pick on item i was the f option.

    picks P_f = sum over I_f of c_i        correct C_f = sum over K_f of c_i
    precision = C_f / P_f                  base_f = |K_f| / |I_f|   (computed; 20.0% by design)

A habit picks f whether or not it is the key, so its precision sits at base_f however often
it fires; a leak picks f because it is the key, so precision rises. Significance is a
permutation test: the picks are held exactly as the correlated samples made them and the
keyed subset is redrawn among I_f (20,000 draws, seed 20261109), so no independence between
samples is assumed. p_f = share of draws with a keyed sum >= C_f.

**HOLD the arm iff some family has P_f >= 6, precision >= base_f + 10 points, and
p_f <= 0.05 / F** (F = families present, 15 → 0.0033). Implemented in
`ssat-verbal-s19-stages.mjs` (`precisionGate`). The keyed-item hit rate is printed beside it
as a diagnostic only.

**Break-test, run on s18's own files before this file was committed**
(`ssat-verbal-s19-stages.mjs gate-breaktest` on `ssat-verbal-s18-ana.batch.json`,
`-oo.key.json`, `-oo.solver-{a,b,c}.json`):

- **s18 as measured: PASS.** creator/creation precision 9/21 = 42.9% vs base 20.0%,
  p 0.0052 against 0.05/20 = 0.0025 (the closest family; expert/field 6/14, p 0.051). Not
  read as proof that creator/creation was pure habit: at p 0.005 it is more concentrated on
  its keyed items than a habit usually is. It is under the family-wise bar, which is what
  the gate decides.
- **Pure habit does not fire it.** 1,000 simulated batches on s18's items with a solver that
  never sees keyness, picking by s18's own measured family propensities (creator/creation's
  and worker/tool's included): fired 12/1000 = 1.2% at s18's pairwise agreement (rho 0.10 →
  27.0% vs measured 26.7%) and 15/1000 = 1.5% at high agreement (rho 0.60 → 52.9%). Bar <= 5%.
  For contrast, s18's rule fired on the same habit-only batches 31/1000 = 3.1% and
  164/1000 = **16.4%**: the old gate mostly measured how correlated the samples were.
- **A planted leak fires it.** On every item a family keys, all 3 samples moved to the key,
  every other pick (that family's habit picks on its non-keyed items included) left as s18
  measured them: fires for **19 of 20** families. The miss is instrument/what it measures,
  s18's heaviest habit (26 picks): 12/34 = 35.3%, p 0.0037. With 2 of 3 samples moved: 16 of
  20 (silent: cause/effect, tool/function, instrument, worker/tool, each p 0.012-0.12). So the
  gate is weakest exactly where a solver's habit is strongest, and that is recorded rather
  than tuned away: s19 keys each family 5 times, not 4, which helps, and the batch-level E
  still runs first.

**2. Elimination.** Items where >= 2 samples certainly rejected the same option, candidate vs
live, as rates. PASS if candidate <= live + 10 points.

**3. With-source (`withsource`).** Two fresh Claude graders (no author, no solver), each on
its own unmarked re-shuffled render (`grade-render`, seeds 20261110 / 20261111), stem and
five options. Each returns `pick`, `second_defensible`, `difficulty` (easy|medium|hard vs SSAT
Upper Level) with `difficulty_reason`, `above_band` (words), `free_elimination`,
`invalid_option` (no crisp relation, a mismatched twin, or a reversed pair),
`free_identification` (a feature of the five options alone that singles out the key, the
vocabulary-level tell included), and **new: `tempting_distractor`** — the distractor a
student who reads the stem relation loosely would most likely choose, or "none" if every
distractor is plainly unrelated to the stem pair. A grader's notes are read against its
picks before any rule is applied (a17 finding 3).

Per-item DROP (with-source evidence only): any grader picks a non-key or names a second
defensible option; any grader marks the stem or key above band, or both graders the same
distractor; any grader names an `invalid_option` or a `free_identification`; a grader names
a free elimination AND >= 2 blind samples rejected that same option as certain; **new: both
graders answer `tempting_distractor` = none** (the item is easy because its distractors are
unrelated, the s18-synonym failure, per item).

Banked difficulty = the EASIER of the two grader labels (s15/s17/s18 precedent),
BANK_BAND=mixed. **New, the difficulty gate:** banked easy <= 40% of the kept items (live
analogies are 35.2% easy). Over 40% HOLDs the arm: a batch that would make the analogy bank
easier than it is does not insert. Reported beside it: authored → banked label for every
graded item, and the no-tempting-distractor rate.

**4. Tells on the kept set.** Recycled-distractor and key-length extremes re-run on the kept
file; family key rate on the kept items reported.

**5. Insert** the kept file (`verbal-bank-helper.mjs`, `BANK_COHORT=ssat-verbal-s19-ana`)
once the ledger entry for its sha holds all five stages; then `verify-admission-forms.mjs`
and `ssat-verbal-replay.ts`.

## Success measure

Clean forms before: 9 (replay, 12 forms). Target 11 (+60 kept). 30-59 kept → 10. If the arm
HOLDs or attrition leaves it short, the measured number is reported.
