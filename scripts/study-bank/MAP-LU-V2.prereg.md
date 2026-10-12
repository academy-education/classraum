# map-lu-v2, 2026-10-12: pre-registration

Written and committed **before any item exists**. The results will go in
`MAP-LU-V2-RESULT.md`. Plan context: `MAP-LAUNCH-PLAN.md` §3, §4, §7 and Q10;
the previous batch is `MAP-LU-MECH-V1.prereg.md` / `MAP-LU-MECH-V1-RESULT.md`.

## Why this batch

Owner decisions, 2026-10-12:
- MAP launches with grades 5-8, not Upper first.
- Language Usage waits until **about 20 Spelling items have cleared**.

`map-lu-mech-v1` got every key right (48/48 cold, 24/24 keyed) and failed on
difficulty (pilot-pass 17/24, `easier` 15/48). Two findings carry forward:
1. Capitalization runs easy above grade 6: CCSS adds no capitalization rule
   after grade 4.
2. Its per-item count-balance rule (T1) made the key the "mixed" option on
   every Capitalization item, worth 50% to a rule-free solver. Both graders
   named it. One grader had also read the prereg commit message, which named
   the rule.

## Source policy (unchanged)

Authors, raters, solvers and graders work only from their own knowledge of
CCSS ELA Language L.5-L.8 and NWEA's public strand names (MAP-RESEARCH §12).
**No NWEA item, live or reconstructed, is opened; the Herald /
cloud.dherald.com PDFs are never opened** (they are live NWEA items,
MAP-RESEARCH §9). No earlier MAP item file is shown to any agent. Claude
subagents only, at most three at once. Prompts are fixed in
`map-lu-v2/prompts.md`, committed with this file. Every solver and grader
prompt names its one render file and forbids any other file, the web, git,
git status and commit messages.

**Commit messages for this batch are neutral** ("map-lu-v2
pre-registration", "map-lu-v2 freeze", "map-lu-v2 renders", "map-lu-v2
result"). They never describe a rule, a check or a tell, and never name a key.

## What is built

Two fresh authors, in parallel, one brief each:

| strand | authored (per grade 5/6/7/8) | frozen (per grade) | n frozen | brief |
|---|---|---|---|---|
| **Spelling** | 8/8/8/8 = 32 | 6/6/6/6 | **24** | `MAP-LU-V2-BRIEF-SPELLING.md` |
| Punctuation | 3/4/4/3 = 14 | 2/3/3/2 | **10** | `MAP-LU-V2-BRIEF-MECH.md` |
| Grammar and Usage | 3/4/4/3 = 14 | 2/3/3/2 | **10** | same |
| Capitalization | 5/5/-/- = 10 | 4/4/-/- | **8** | same |

**Capitalization: INCLUDED, at grades 5 and 6 only** (no grade 7-8 item).
That is v1's stated next step. v1's own grade 5-6 Capitalization items
passed both graders' grade fit on only 3 of 5, so this strand is expected to
be marginal; it is measured rather than assumed. Language Usage does not
wait on it (the owner's gate is Spelling).

**Spelling formats.** MAP-RESEARCH records the strand ("Mechanics ·
Spelling", §12) and that it is absent from our bank, but **no public item
format**: the formats below come from the owner's instruction and pilots 3-4
(whose 2x2 single-word spelling items held). Per grade, in id order: word,
sentence, word, word, sentence, word, word, sentence.
- **word** (5 per grade authored): "Which word correctly completes the
  sentence?" over one sentence with a blank; four lowercase spellings of one
  word forming a 2x2 grid of two single-letter edits (a metric check: key to
  each single 1 edit, key to both 2, single to single 2).
- **sentence** (3 per grade authored): "Which sentence has a spelling
  error?"; four sentences, each with one commonly misspelled target word;
  exactly one target misspelled.
- Every misspelling is a **non-word** (fails NSSpellChecker, absent from
  web2, not a listed variant). "Clearly wrong word for the context" items
  (homophones) are **not used**: they cannot be checked exactly, and they
  belong to usage.
- **Regional variants are ruled out explicitly.** NSSpellChecker accepts US
  and UK forms alike (colour/color) and also some genuine misspellings
  (occurence, accomodate, independant, miniture), so it can neither prove a
  misspelling wrong nor a key unique. Measured 2026-10-12. The guard:
  - a misspelling must fail NSSpellChecker, be absent from web2 and not be on
    the variant list;
  - a tested word (key, intended word, every target word) is refused if it
    is on a curated variant list (338 forms, 676 with a plural -s: -or/-our, -er/-re, -ize/-ise,
    -yze/-yse, l/ll, -ense/-ence, -og/-ogue, judg(e)ment, e-drop -able, and
    single words such as gray, program, jewelry, aging); if it matches an
    outright pattern (-ize, -isation, -yze, single-l before -ed/-ing/-er
    unless a silent-e verb, -l(l)ment/-l(l)ful, judg(e)ment); or if any US/UK
    transform of it is accepted by NSSpellChecker or web2. False refusals
    are accepted: they cost the author a word, never a key.
  - the keyed graders are asked for any spelling a mainstream dictionary
    accepts, US or British.
  - The spelling author may run `map-lu-v2.mjs spell` (the dictionary oracle:
    NSSpellChecker, web2 and the guard, per word). It runs no batch check.

## What changed against v1, each from a recorded finding

1. **No per-item balance rule.** Neither brief asks for any count pattern
   within an item. Both say a batch-level structural check exists and ask
   the author to vary error kinds naturally.
2. **New batch-level check T2: does ANY simple structural feature predict the
   key?** Defined below. It replaces T1.
3. **E1 bound fits the grade:** FK in [4, 9) at grades 5-6 and [4, 10) at
   grades 7-8, for units of 15+ words (v1: [4, 9) everywhere, which forced
   20 readability trims).
4. **Capitalization at grades 5-6 only**; Punctuation and Grammar at grades
   5-8 with v1's named too-easy cases listed in the brief.
5. **Neutral commit messages; FENCE in every prompt** against git context.
6. **Per-strand verdicts.** A strand that fails is not inserted; the others
   can still pass.

## T2: the structural-predictor check (exact, whole population, per strand)

**Heuristics (64).** Eight option features: character length, word count,
capital count, punctuation-mark count, comma count, doubled-letter count,
vowel count, and summed Damerau-Levenshtein distance to the other three
options (the medoid feature). Eight selectors on each: unique max, unique
min, strictly between the extremes, all at max, all at min, the modal value
(a unique mode of at least two), the odd one out. A heuristic picks uniformly
among the options it selects, and guesses (1/4) when it does not fire. Its
**score** is its expected hit rate over the strand.

**Control: derived, not a literal.** The mean of 1/n_options (= 25.0% here):
the expected score of every heuristic when the key is a random option.

**Verdict.** Westfall-Young min-p over 4,000 seeded permutations of the key
position (family-wise over all 64 heuristics). **T2 FIRES on a strand when
its min-p heuristic scores at least control + 10 points AND its family-wise
p < 0.10.** Run on each frozen strand, then **pooled** over every strand that
passed: if the pooled test fires, every strand in which that heuristic itself
scores at least control + 10 is refused.

**Break-tested before this commit** (`map-lu-v2.mjs --selftest`, 106
checks), in the band that matters:

| case | best heuristic | score | family-wise p | T2 |
|---|---|---|---|---|
| v1 Capitalization (the known 50% mixed-key tell) | between(caps) | 50.0% | 0.0047 | **FIRES** |
| v1 Punctuation (the MARGINAL tell, 37.5-40.6%) | between(commas) | 40.6% | 0.0987 | **FIRES**, just |
| v1 Grammar (28.1%, no tell) | at_min(words) | 37.5% | 0.417 | clear |
| v1 Capitalization with half its keys moved to a single-error (extreme) option | - | 25.0% | 1.000 | clear |
| v1's 24 option sets with random keys, 100 draws | - | - | - | fires on **12/100** |

**Where T2 is weak, stated before any item exists.**
- At n = 8-10 it detects only a strong or near-uniform pattern. The marginal
  v1 Punctuation tell fired at p = 0.099, against a bar of 0.10.
- It refuses a clean strand about 1 time in 8-10 by chance. That direction
  is conservative: it throws a strand away, it never ships one.
- It sees only the 64 structural heuristics. Semantic tells stay with the
  graders' cross-item `_batch` answer, which is recorded whether or not the
  bars pass.

T2 runs at freeze (Stage 0) and again at scoring on the same frozen items. It
is also reported, not deciding, on the inserted subset.

## Order of work

1. two authors (parallel), files concatenated unedited
2. exact checks (report only)
3. teacher round 1 (two raters), union of NOs
4. one reviser, then two fresh re-raters; an item whose rewrite is still rated
   NO by either is DROPPED
5. one exact-check repair per failing item (`repairs.json`), else drop
6. `freeze`: first survivors per grade quota, per strand, in id order; Stage 0
   per strand; then **freeze commit**
7. `render`, then **render commit**
8. three options-only samples; two with-source graders, cold then keyed
9. `score`; per-strand insert of passing strands (staged); result commit

**No repair after any solver or grader has run. Drops only.**

## Stage 0 (freeze), per strand

A strand freezes only if:
- every grade quota is filled by survivors of the teacher gate and exact
  checks;
- the frozen strand passes E3 (key uniquely longest ≤ 25%, uniquely shortest
  ≤ 25%), distinct rules (cap_rule / punct_rule / varied_dimension distinct;
  spelling: each tested word once, and never inside another spelling item);
- T2 does not fire on the strand, nor through the pooled test.

Otherwise that strand stops: it is not rendered, graded or inserted, and the
other strands go on. The quotas sit inside the authored counts (range 0 to
the authored count per grade).

## Bars per strand: a strand PASSES only if all hold

n = frozen items in the strand (Spelling 24, Punctuation 10, Grammar 10,
Capitalization 8). Every bar is break-tested at its margin for every strand
size by `map-lu-v2.mjs --selftest`.

| bar | threshold | Spelling | Punct / Gram | Cap | attainable range |
|---|---|---|---|---|---|
| S1-a exact | every item passes E1, E4 (spelling), E5 (cap: case-only), E6, E7 (no unique medoid; grid items), E9 (punct: marks-only), G (2x2 grid; metric grid for spelling words), grade/ccss match; strand passes E3, distinct rules and **T2** | | | | pass/fail |
| S1-b pilot-pass | ≥ ceil(0.8 n) items pass c1-c5: (1) both cold picks on key; (2) no cold second defensible; (3) both `grade_fit` = fits; (4) no option dead by BOTH; (5) both keyed verdicts "correct" and no accepted alternative | **≥ 20/24** | ≥ 8/10 | ≥ 7/8 | 0-n |
| S1-c calibration | `easier` ≤ floor(2n/6) AND `harder` < 2n/4 (of 2n judgements) | ≤ 8/48, < 12/48 | ≤ 3/20, < 5/20 | ≤ 2/16, < 4/16 | 0-2n each |
| S1-d level | each grader's mean (grade_assigned − target) within [−0.5, +0.5] | | | | either side |
| S2 options-only | strand on-key rate ≥ control − 10 points; control ≥ 25% or INVALID (cannot pass) | | | | 0-100 |
| T slots | no key slot > 35% of the strand in the stored (with-source) order | | | | flat by construction |

The Spelling pilot-pass bar is the owner's number: 20.

### S2, stated before the number exists

The candidate's stem carries nothing ("Which sentence is punctuated
correctly?", "Which word correctly completes the sentence?" with the sentence
withheld). The options ARE the item, so **a high options-only rate is the
construct, not a leak**, and no leak bar is used. S2 tests **key
recoverability**: whether a reader holding only the options lands on our key
about as often as on a live conventions item's key.

**The control** is 24 live verified four-choice SAT SEC / ACT CSE items, easy
and medium, 12 punctuation and 12 grammar, chosen by sha256 of
`map-lu-v2-control:<id>` from 508 eligible rows and committed here in
`map-lu-v2/control.json` (sat/punct 7, act/punct 5, sat/gram 11, act/gram 1).
They render options-only through the same file with the same brief. There is
**no live spelling item to match** (Spelling is 0 in the bank, MAP-RESEARCH
§12), so Spelling is read against the same conventions control. That mismatch
is stated, not hidden.

**The control's ceiling (the CLAUDE.md check).** The S2 bar is "candidate ≥
control − 10". For any valid control (25-100%) the bar sits at 15-90%, inside
the candidate's attainable range 0-100, so it can fire and it can pass. At a
100% control the bar is 90%, still reachable both ways (selftest). Like v1,
S2 is a weak screen for gross key ambiguity only. It is never reported as
"the batch does not leak". Rule-free guessability is decided exactly by T2
and E7.

**Reported, not deciding:**
- candidate items unanimous on a non-key letter (a key-dispute signal read
  beside c1 and c5);
- unanimity rate per arm (three samples of one solver are correlated, so this
  is a batch-level comparison only);
- the solvers' named heuristics and the graders' `_batch` answers per strand:
  if both graders name the same cross-item pattern, it is recorded as a
  finding whether or not the bars pass;
- teacher NO counts per round; survivors by strand, grade and spelling format;
- T2 on the inserted subset.

## If a strand passes

Its items passing c1-c5 are inserted **STAGED** under one cohort per strand:

| strand | cohort |
|---|---|
| Spelling | `map-lu-v2-spelling` |
| Punctuation | `map-lu-v2-punctuation` |
| Grammar and Usage | `map-lu-v2-grammar` |
| Capitalization | `map-lu-v2-capitalization` |

- `verified=false`, `family='map'`, `section='language'`, `domain` = the MAP
  area, `subskill` = the strand, `task='multiple_choice'`
- choices in the with-source render order
- difficulty by mean grade offset: ≤ −1 easy, ≥ +1 hard, else medium
- `verify_meta.map` = { grade_target, ccss, strand, error_sites,
  spelling_format, rule, grade_assigned }

**Never `verified=true`.** MAP is not a shipped family, so a staged row
reaches no student. A person releases it, under a decision rule fixed before
that sitting is drawn (MAP-LAUNCH-PLAN Q6).

**"Spelling cleared"** means Spelling items inserted staged. That is the
pilot-pass items, and only if the Spelling strand passes every bar. If the
strand fails, the result reports its pilot-pass count but **0 cleared**.

**Ledger:** one entry per strand, recorded under the gate's resolved family
(`mc_hidden_source`, the default for task `multiple_choice`). `contentSha` is
the inserted strand file for a passing strand, and the frozen strand file for
a failing one. Stages map as in v1:
- `shape` = S1-a
- `withsource` = S1-b, S1-c, S1-d
- `nosource` = S2
- `elimination` = E7 + T2: the exact no-rule-knowledge probes. Whole-sentence
  and whole-word items have no withheld source to probe against.
- `tells` = E3, T2 and key slots

## If a strand fails

Nothing from it is inserted. Its ledger entry is recorded `killed`, and
REGISTER §5 gets the numbers.

## What can't be learned here, stated in advance

- Whether any grade label is right. Graders are not response data
  (MAP-RESEARCH §10).
- Whether students pick the distractors. The teacher rater is a model in a
  teacher's voice, and a human sitting decides verbal cohorts.
- Whether a word is "commonly misspelled at grade g" in any measured sense.
  There is no frequency source here, only the author's and graders' judgement.
- Whether T2 would catch a structural tell outside its 64 heuristics, or a
  weak one in a strand of 8-10.
