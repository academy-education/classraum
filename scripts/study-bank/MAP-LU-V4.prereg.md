# map-lu-v4, 2026-10-12: pre-registration

Written and committed **before any item exists**. Results go in
`MAP-LU-V4-RESULT.md`. The previous batch is `MAP-LU-V3.prereg.md` (with its
amendment 1) and `MAP-LU-V3-RESULT.md`; plan context `MAP-LAUNCH-PLAN.md` §8.

## Why this batch

Owner decisions, 2026-10-12: MAP launches at grades 5-8, and Language Usage
waits for **about 20 cleared Spelling items**. Cleared so far: **0**
(`bank-state.mjs`: map/language 0 drawable, 11 staged, all Punctuation from
`map-lu-v3`).

`map-lu-v3` got every key right (64/64 cold, 32/32 keyed) and:
1. **Spelling stopped at Stage 0.** Amendment 1's seeded LENGTH profile
   removed a length tell, but the letters students ADD are mostly vowels, so
   in the both-add profile the key had the fewest vowels: T2[word]
   `unique_min(vowels)` 39.1% vs 25.0%, family-wise p 0.086 on the 16 word
   items the freeze took. The word-grade screen did its job (v3's grade-5
   words screened at grades 5-8).
2. **Punctuation passed** (11 staged). It is not in this batch.
3. **Grammar**: grades 7-8 6/6 pilot-pass; grades 5-6 too easy (the strand's
   7/24 `easier` calls fell mostly there).
4. **Capitalization**: grade 6 4/4; grade 5 has now missed both ways (v2 too
   hard, v3 too easy). v3 recommends grade 6 only.

## Source policy (unchanged)

Authors, raters, screeners, solvers and graders work only from their own
knowledge of CCSS ELA Language L.5-L.8 and NWEA's public strand names
(MAP-RESEARCH §12). **No NWEA item, live or reconstructed, is opened; the
Herald / cloud.dherald.com PDFs are never opened** (they are live NWEA items).
No earlier MAP item file is shown to any agent. Claude subagents only, at most
three at once, each writing in its own private scratch folder under
`scratchpad/map-lu-v4-work/` (git-excluded). Prompts are fixed in
`map-lu-v4/prompts.md`, committed with this file. Every solver, grader and
screener prompt names its one file and forbids any other file, the web, git,
git status and commit messages.

**Commit messages are neutral** ("map-lu-v4 pre-registration", "... freeze",
"... renders", "... result"). They never describe a rule, a check or a tell,
and never name a key.

## What is built

| strand | authored per grade | frozen per grade | n frozen | brief |
|---|---|---|---|---|
| **Spelling** | 12/12/12/12 = 48 (8 word + 4 sentence per grade) | 7/7/7/7 | **28** | `MAP-LU-V4-BRIEF-SPELLING.md` |
| Grammar and Usage | 8/8 at grades 5/6 = 16 | 6/6 | **12** | `MAP-LU-V4-BRIEF-MECH.md` |
| Capitalization | 10 at grade 6 | 8 | **8** | same |

Two fresh authors in parallel, one brief each; files concatenated (Spelling
first) without edits. Spelling format order per grade, in id order: word,
sentence, word, word, sentence, word, word, sentence, word, word, sentence,
word. The freeze takes the first 7 survivors per grade (5 word + 2 sentence
if nothing drops). Every v2/v3 Spelling rule holds: non-word misspellings,
the regional-variant guard, the dictionary oracle, E4, G-DL, E7, E4-dup,
L-rank (seeded key length rank for sentence items, `map-lu-v4/lrank.json`).

**Grammar is judged as one strand at grades 5-6.** The alternative was a
grades 5-8 strand judged per grade band; it is not used, because v3's grades
7-8 items are not re-decided (re-scoring a finished batch under a rule found
afterwards is what pre-registration exists to prevent) and no new grades 7-8
items are authored. The strand here IS the grade band. v3's grades 7-8 items
stay uninserted.

**Capitalization is grade 6 only**, with v3's grade-6 rule list; grade-5
rules (multi-word place names, seasons vs holidays, nationalities and
languages, days vs "weekend") are barred because v3's graders placed them at
grades 3-4.

## What changed against v3, each from a recorded finding

### 1. L-class: the letter class of every Spelling edit is seeded

Each word-format item's two trouble spots carry **assigned edit TYPES** that
fix the change in length, vowels and doubled consonants, and so the letter
class (y counts as a vowel; no edit may create or break a doubled vowel):

| type | edit | Δ length, vowels, consonants, doubled consonants |
|---|---|---|
| DV | drop a vowel | −1, −1, 0, 0 |
| DD | drop one of a doubled consonant pair | −1, 0, −1, −1 |
| DC | drop a single consonant | −1, 0, −1, 0 |
| AV | add a vowel | +1, +1, 0, 0 |
| AD | add a consonant that doubles a single one | +1, 0, +1, +1 |
| AC | add a consonant, no double | +1, 0, +1, 0 |
| XV | vowel to vowel, or swap two adjacent vowels | 0, 0, 0, 0 |
| XC | consonant to consonant, or swap two adjacent consonants | 0, 0, 0, 0 |

The pair per item (`map-lu-v4/wclass.json`, sha256 45c7c8a9…) comes from a
seeded local search (seed `map-lu-v4-wclass`, 6000 iterations, reproducible:
the selftest re-runs it) that minimises the highest T2 selector score of the
key on the four seedable features, subject to: vowel-class edits 30-34 of 64;
the rarer real-student edits capped (AC ≤ 4, XC ≤ 6, DC ≤ 10); AC and XC only
beside a common type. Result:

| | max selector score on length / vowels / consonants / doubled consonants |
|---|---|
| all 32 word items | **25.8%** (cap 31.3%) |
| the 20 the freeze takes if nothing drops | **26.3%** |
| 400 seeded per-grade 5-of-8 subsets | mean 29.6%, 90th percentile 32.5% |
| for comparison, a v3-style assignment (length balanced, adds = vowels, drops = doubles) | 50.0% (`at_min(vowels)`, `at_max(dbl)`); T2 fires, p 0.0002 |

Counts: DV 9, DD 8, DC 4, AV 10, AD 8, AC 4, XV 15, XC 6; vowel-class 34/64.
The author is told the types and given a helper (`edit`) that prints each
edit's type; the author never sees the reason.

**New exact check L-class** (every word item, through every later step):
the two single-edit options must have exactly the assigned pair of types,
the both-errors option exactly their sum on (length, vowels, doubled
consonants) and no doubled-vowel change, and the item's `edit_types` must be
its seeded pair. A same-length edit whose changed letters cross classes fits
no type.

### 2. T2-L: a second structural-predictor family over letter-class features

v2's T2 (8 features x 7 selectors = **56** heuristics; v3's prereg said 64,
which was wrong; the code is unchanged) already holds length, vowels and
doubled letters. **T2-L** runs the same seven selectors, the same
Westfall-Young min-p (4000 permutations) and the same firing rule (control +
10 points AND family-wise p < 0.10) over 9 new features: consonants, doubled
consonants, doubled vowels, vowel runs, vowel-vowel bigrams,
consonant-consonant bigrams, distinct letters, final vowel, and alphabetical
rank of the option (63 heuristics). **It runs everywhere T2 runs** (per
strand, per Spelling format, pooled), and **a strand fails if either family
fires.**

Why a second family and not one larger one (break-tested): merging the
features into T2 gives family-wise p 0.17 on v3's Stage 0 word picks, so it
would have MISSED the tell that stopped v3; T2 alone still fires there
(0.086). Separately, a constructed consonant-count tell (length, vowels,
marks and edit distances all equal) leaves T2 at p 1.0 and fires T2-L
(`unique_min(consonants)` 100%); with the key rotated through all four slots
T2-L is clear (p 0.88). On v3's Stage 0 word picks T2-L alone is clear
(p 0.53) and on v3's 11 inserted Punctuation items clear (p 1.0).

Cost, stated: two families double the chance that a clean strand is refused
by chance (v2 put one family at about 1 in 8). The direction is conservative:
it throws items away and never ships one.

### 3. Spelling pre-flight with ONE seeded re-draw (v3's recommendation)

At freeze, after the screen, the Spelling strand checks (distinct tested
words; T2 and T2-L on the strand and on each format) run on **exactly the 28
items the freeze would take** (first survivors per grade, id order). If they
pass, those 28 freeze. If they fail, **one re-draw**: per grade, the same
number of word and sentence items as the first pick, drawn from that grade's
survivors of each format by a shuffle seeded with
sha256("map-lu-v4-redraw"). If the re-draw passes it freezes; if it fails,
Spelling fails Stage 0. There is no second re-draw, and nothing is rewritten.
The re-draw then faces pooled E3 and pooled T2/T2-L like every strand.

Stated in advance: choosing between two draws lowers T2's power slightly
(a tell present in the population fires on most draws; a chance fire on one
draw is what the re-draw forgives). v3's Stage 0 Spelling pick is refused by
v4's checker on the same vowel tell (selftest).

A **report-only pre-flight** also runs on the authored batch (`preflight`:
T2 and T2-L on all authored items and on the likely-frozen subset), before
the teacher gate. It decides nothing.

### 4. Spelling at 28 frozen; Grammar grades 5-6 harder; Capitalization grade 6

The Spelling pilot-pass bar is ceil(0.8 x 28) = **23**, so a passing
Spelling strand clears at least 23, above the owner's ~20. The Grammar brief
names v3's too-easy grade 5-6 rules (irregular participles, an obvious
pronoun person shift, a reflexive subject) and the ones that fit, and asks for
the separated-site instance of each grade's own standard.

Unchanged from v3: the teacher gate, the one-rewrite and one-repair rules,
the word-grade screen (prompt 8, calibration on v2's words), pooled E3,
per-format key dealing and the slot bar, the two-stage graders and the
scoring.

## Order of work

1. two authors (parallel), concatenated unedited
2. exact checks and the report-only pre-flight
3. teacher round 1 (two raters), union of NOs
4. one reviser, then two fresh re-raters; an item whose rewrite is still
   rated NO by either is DROPPED
5. one exact-check repair per failing item, else drop
6. word-grade screen (two screeners), then `freeze`: quotas, Spelling
   pre-flight (+ at most one seeded re-draw), Stage 0; **freeze commit**
7. `render`; **render commit**
8. three options-only samples; two with-source graders, cold then keyed (the
   keyed render enters a grader's folder only after its cold file is hashed)
9. `score`; staged insert of each passing strand; **result commit**

**No repair after any screener, solver or grader has run. Drops only.**

## Stage 0 (freeze), per strand

A strand freezes only if every grade quota is filled by survivors of the
teacher gate, exact checks and (Spelling) the screen; its distinct-rule
checks pass (cap_rule / varied_dimension distinct; Spelling: each tested word
once, never inside another Spelling item); neither T2 nor T2-L fires on it
(Spelling: nor on either format, after at most one re-draw); pooled E3 does
not attribute a failure to it; and neither pooled family attributes a failure
to it. Otherwise it stops, and the other strands go on.

## Bars per strand: a strand PASSES only if all hold

| bar | threshold | Spelling (28) | Grammar (12) | Cap (8) | attainable |
|---|---|---|---|---|---|
| S1-a exact | every item passes E1, E4 (spelling), E5 (cap), E6, E7, G / G-DL, L-rank (sentence), L-class (word), grade/ccss; strand passes distinct rules, T2 and T2-L (+ per format), pooled E3 | | | | pass/fail |
| S1-b pilot-pass | ≥ ceil(0.8 n) items pass c1-c5 (v2's rule: both cold picks on key; no cold second defensible; both `grade_fit` fits; no option dead by both; both keyed "correct", no accepted alternative) | **≥ 23/28** | ≥ 10/12 | ≥ 7/8 | 0-n |
| S1-c calibration | `easier` ≤ floor(2n/6) AND `harder` < 2n/4 | ≤ 9/56, < 14/56 | ≤ 4/24, < 6/24 | ≤ 2/16, < 4/16 | 0-2n each |
| S1-d level | each grader's mean (grade_assigned − target) within ±0.5 | | | | either side |
| S2 options-only | strand on-key rate ≥ control − 10; control ≥ 25% or INVALID | | | | 0-100 |
| T slots | no key slot > 35% in any strand or format group, stored order | | | | flat by construction |

Every bar is break-tested at its margin for every strand size by
`map-lu-v4.mjs --selftest` (64 checks).

### S2 and the control's ceiling

The stems carry nothing the options do not, so a high options-only rate is
the construct, not a leak; S2 tests key recoverability only and is never
reported as "the batch does not leak". **Control:** 24 live verified
four-choice SAT SEC / ACT CSE items, easy and medium, 12 punctuation and 12
grammar, chosen by sha256 of `map-lu-v4-control:<id>` from 460 eligible rows
**excluding v2's and v3's controls**, committed as `map-lu-v4/control.json`
(sha256 fbcb58c7…). **Ceiling:** for any valid control (25-100%) the bar sits
at 15-90%, inside the candidate's 0-100 range; at a 100% control the bar is
90%, attainable both ways (selftest).

**Reported, not deciding:** candidate items unanimous on a non-key letter;
unanimity per arm; the solvers' heuristics and the graders' `_batch`
answers (a pattern both graders name is recorded as a finding); teacher NO
counts; screen drops by grade; whether the re-draw was used; per-grade and
per-format pilot-pass; T2 and T2-L on each inserted subset.

## If a strand passes

Its items passing c1-c5 are inserted **STAGED** (`verified=false`,
`family='map'`, `section='language'`, `task='multiple_choice'`) under
`map-lu-v4-spelling` / `-grammar` / `-capitalization`, choices in the
with-source render order, difficulty by mean grade offset (≤ −1 easy, ≥ +1
hard, else medium), `verify_meta.map` as v3. **Never `verified=true`.** MAP
is not a shipped family; a person releases a staged row.

**"Spelling cleared"** = Spelling items inserted staged = the pilot-pass
items, only if the strand passes every bar; otherwise 0. Earlier cleared
Spelling is 0, so **the owner's ~20 is reached exactly when the Spelling
strand passes** (its pilot-pass bar is 23).

**Ledger:** one entry per strand under the gate's resolved family
(`mc_hidden_source`), `contentSha` = the inserted strand file for a passing
strand, the frozen (or Stage 0 pick) file for a failing one; stages mapped as
v3. Entries are written into `ledger.json` from current HEAD immediately
before this batch's own result commit and committed with it by explicit path
(v3's entries were swept into a concurrent agent's commit). REGISTER §5 gets
the numbers in the same commit.

## What can't be learned here

- Whether any grade label is right: graders and screeners are models, not
  response data (MAP-RESEARCH §10).
- Whether students pick the distractors: a human sitting decides.
- Whether a word is "commonly misspelled at grade g" in any measured sense.
- Whether T2 or T2-L would catch a structural tell outside their 119
  heuristics, or a weak one at n = 8-12. The seeded types fix the COUNT
  features by construction; the position of an added letter (beside a vowel
  or between consonants) is left to the author and is read only by T2-L's
  bigram and run features.
