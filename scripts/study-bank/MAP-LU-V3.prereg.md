# map-lu-v3, 2026-10-12: pre-registration

Written and committed **before any item exists**. Results go in
`MAP-LU-V3-RESULT.md`. The previous batch is `MAP-LU-V2.prereg.md` (with its
amendment 1) and `MAP-LU-V2-RESULT.md`; plan context `MAP-LAUNCH-PLAN.md` §8.

## Why this batch

Owner decisions, 2026-10-12: MAP launches at grades 5-8, and Language Usage
waits for **about 20 cleared Spelling items**. None are cleared yet.

`map-lu-v2` got every key right (64/64 cold, 32/32 keyed, no accepted variant
spelling) and inserted nothing:
1. **Spelling** met pilot-pass (20/24) and failed difficulty (`easier` 11/48,
   bar 8). The whole miss was grade 5 (2/6 pilot-pass; *tomorrow*, *answer*,
   *finally*, *beautiful*, graded 3-5). Grades 6-8 passed 18/18.
2. **Capitalization (grades 5-6)** went 6/8 (bar 7), with grade 5 slightly
   too hard.
3. **Punctuation and Grammar** were never graded: the key-uniquely-longest
   bar (E3, ≤ 25%) was applied per 10-item strand, a one-item threshold. That
   was a design error.
4. **Render:** keys were dealt flat per strand, not per format, so both
   graders saw sentence-format Spelling keys never in slot B.

## Source policy (unchanged)

Authors, raters, screeners, solvers and graders work only from their own
knowledge of CCSS ELA Language L.5-L.8 and NWEA's public strand names
(MAP-RESEARCH §12). **No NWEA item, live or reconstructed, is opened; the
Herald / cloud.dherald.com PDFs are never opened** (they are live NWEA items).
No earlier MAP item file is shown to any agent. Claude subagents only, at most
three at once, each writing in its own private scratch folder. Prompts are
fixed in `map-lu-v3/prompts.md`, committed with this file. Every solver,
grader and screener prompt names its one file and forbids any other file, the
web, git, git status and commit messages.

**Commit messages are neutral** ("map-lu-v3 pre-registration", "... freeze",
"... renders", "... result"). They never describe a rule, a check or a tell,
and never name a key.

## Capitalization: INCLUDED (about 8, grades 5-6)

The research does not support "MAP grades 5-8 barely tests it". MAP Growth
Language 2+, the test given at grades 5-8, lists Capitalization as one of the
three Mechanics sub-strands (MAP-RESEARCH §12), and the bank holds 0 such
items. No public source gives the sub-strand's weight at grades 5-8, so there
is no basis to drop it. What the evidence does say is **where** to target it:
CCSS adds no capitalization rule after grade 4, and v1 drew 10 of 15 `easier`
calls on grade 6-8 Capitalization. So it stays at grades 5-6, as in v2, with
grade 5 **one notch easier** than v2 (the brief removes v2's grade-5 rules
that ran hard: short-verb title words, region vs direction, brands,
historical periods and documents; those move to grade 6).

## What is built

| strand | authored per grade | frozen per grade | n frozen | brief |
|---|---|---|---|---|
| **Spelling** | 10/10/10/10 = 40 | 6/6/6/6 | **24** | `MAP-LU-V3-BRIEF-SPELLING.md` |
| Punctuation | 4/4/4/4 = 16 | 3/3/3/3 | **12** | `MAP-LU-V3-BRIEF-MECH.md` |
| Grammar and Usage | 4/4/4/4 = 16 | 3/3/3/3 | **12** | same |
| Capitalization | 5/5/-/- = 10 | 4/4/-/- | **8** | same |

Two fresh authors in parallel, one brief each; files concatenated (Spelling
first) without edits. The Spelling formats are v2's: per grade, in id order,
word, sentence, word, word, sentence, word, word, sentence, word, sentence
(6 word, 4 sentence); the freeze takes the first 6 survivors per grade, so a
grade with no drops freezes 4 word + 2 sentence. Every v2 Spelling rule holds:
non-word misspellings, the regional-variant guard, the dictionary oracle,
E4, G-DL, E7, E4-dup.

## What changed against v2, each from a recorded finding

1. **Grade-5 Spelling words must be grade-5 hard.** The brief names v2's
   failing words, says graded lists must place every word at or above the
   target grade, and bars grade 2-4 list words at grade 5.
2. **A pre-registered word-grade SCREEN** drops a Spelling item before
   freeze (defined below).
3. **E3 is decided on the POOLED frozen batch** (defined below), not per
   strand. Per-strand E3 is reported only.
4. **Keys are dealt flat per FORMAT** in both renders: spelling word,
   spelling sentence, Punctuation, Grammar, Capitalization, and each control
   half (punctuation 12, grammar 12). The slot bar reads every strand AND
   every format group.
5. **Sentence-format key length ranks are assigned in the brief**
   (`map-lu-v3/lrank.json`, seed sha256("map-lu-v3-lrank"), each rank used
   twice among each grade's first two sentence items and twice among the
   last two), not repaired afterwards as v2's amendment 1 had to. L-rank now
   also fails a sentence item that carries no rank.
6. **Punctuation and Grammar at 12 each** (3 per grade), v2's brief
   otherwise unchanged; **Capitalization grade 5 a notch easier**.

T2 (64 structural heuristics, Westfall-Young min-p, fires at control + 10 and
family-wise p < 0.10), per strand, per Spelling format and pooled, is v2's
code, imported unchanged.

## The word-grade screen (Spelling only)

After the teacher gate and the one-repair step, `screen-input` writes every
surviving Spelling item's tested word (a word item's key; a sentence item's
intended word) to a list in sha256 order, with **no item, no target grade and
no label**. Two fresh cold screeners (prompt 8) give each word the grade at
which standard graded spelling lists place it. **A Spelling item is DROPPED
when both screeners grade its word below the item's target grade.** A word
missing from either screener's file stops the freeze (exit 2); it is never
read as a keep. The screen runs once; nothing is rewritten in response to it.

**Calibrated on known data before this commit** (the same prompt, two fresh
screeners, on v2's 24 frozen Spelling words; files
`map-lu-v3/screen-v2-{a,b}.json`):

| | v2 result | with the screen's drops |
|---|---|---|
| items | 24 | 16 (drops 8) |
| v2's failing grade-5 items (S01 *tomorrow*, S02 *answer*, S05 *finally*, S07 *beautiful*) | held | **all 4 dropped** |
| `easier` calls by v2's graders | 11 / 48 | **2 / 32** |
| items that had PASSED pilot-pass, dropped anyway | | 4 (*disappear* g5, *truly* g6, *especially* g6, *recommend* g7) |

So it catches what failed, at the cost of some items that would have passed;
that is why grade quotas sit inside a 10-per-grade authored pool. "Both
below" was chosen over "either below" because the two screeners are one model
sampled twice (they agreed within one grade on all 24 words); on v2 the two
rules differ by one word (*existence*).

**Where the screen is weak, stated in advance.** It is a model predicting
model graders, not students; the screeners never see the item, so a hard word
in an easy item (or the reverse) passes it; and it only drops, so it cannot
fix a grade that is short of survivors.

## Pooled E3

Over every strand that passed its own Stage 0 checks: the key is the uniquely
longest option in ≤ 25% of the pooled items, and the uniquely shortest in
≤ 25%. If a side fails, **every strand whose own rate on that side exceeds
25% fails** (at least one must, since the pooled rate is their weighted
mean). Break-tested (`map-lu-v3.mjs --selftest`, 62 checks):
- on v2's own four Stage 0 picks, pooled longest is 10/52 (19.2%), so no
  strand fails, where v2's per-strand rule stopped Punctuation and Grammar
  at 3/10;
- at exactly 14/56 it passes; at 15/56 it fails and is attributed only to
  the strand over 25%; with two strands over, both fail and the others do
  not; the shortest side fires and attributes the same way.

A per-strand length tell is still caught with a significance test by T2's
`unique_max(len)` / `unique_min(len)`.

## Order of work

1. two authors (parallel), concatenated unedited
2. exact checks (report only)
3. teacher round 1 (two raters), union of NOs
4. one reviser, then two fresh re-raters; an item whose rewrite is still
   rated NO by either is DROPPED
5. one exact-check repair per failing item, else drop
6. **word-grade screen** (two screeners), then `freeze`: first survivors per
   grade quota, per strand, in id order; Stage 0; **freeze commit**
7. `render`; **render commit**
8. three options-only samples; two with-source graders, cold then keyed
9. `score`; staged insert of each passing strand; **result commit**

**No repair after any screener, solver or grader has run. Drops only.**

## Stage 0 (freeze), per strand

A strand freezes only if every grade quota is filled by survivors of the
teacher gate, exact checks and (Spelling) the screen; its distinct-rule
checks pass (cap_rule / punct_rule / varied_dimension distinct; Spelling:
each tested word once, never inside another Spelling item); T2 does not fire
on it (Spelling: nor on either format); pooled E3 does not attribute a
failure to it; and pooled T2 does not attribute a failure to it. Otherwise it
stops, and the other strands go on.

## Bars per strand: a strand PASSES only if all hold

| bar | threshold | Spelling (24) | Punct / Gram (12) | Cap (8) | attainable |
|---|---|---|---|---|---|
| S1-a exact | every item passes E1, E4 (spelling), E5 (cap), E6, E7, E9 (punct), G / G-DL, L-rank (sentence), grade/ccss; strand passes distinct rules, T2 (+ per format), pooled E3 | | | | pass/fail |
| S1-b pilot-pass | ≥ ceil(0.8 n) items pass c1-c5 (v2's rule: both cold picks on key; no cold second defensible; both `grade_fit` fits; no option dead by both; both keyed "correct", no accepted alternative) | **≥ 20/24** | ≥ 10/12 | ≥ 7/8 | 0-n |
| S1-c calibration | `easier` ≤ floor(2n/6) AND `harder` < 2n/4 | ≤ 8/48, < 12/48 | ≤ 4/24, < 6/24 | ≤ 2/16, < 4/16 | 0-2n each |
| S1-d level | each grader's mean (grade_assigned − target) within ±0.5 | | | | either side |
| S2 options-only | strand on-key rate ≥ control − 10; control ≥ 25% or INVALID | | | | 0-100 |
| T slots | no key slot > 35% in any strand or format group, stored order | | | | flat by construction |

Every bar is break-tested at its margin for every strand size by the
selftest. The Spelling pilot-pass bar is the owner's number, 20.

### S2 and the control's ceiling

The stems carry nothing the options do not, so a high options-only rate is
the construct, not a leak; S2 tests key recoverability only and is never
reported as "the batch does not leak". **Control:** 24 live verified
four-choice SAT SEC / ACT CSE items, easy and medium, 12 punctuation and 12
grammar, chosen by sha256 of `map-lu-v3-control:<id>` from 508 eligible rows,
committed as `map-lu-v3/control.json` (sha256 ef8e0f60…; 0 overlap with v2's
control). No live spelling item exists to match; Spelling is read against
the same control, as in v2. **Ceiling:** for any valid control (25-100%) the
bar sits at 15-90%, inside the candidate's 0-100 range; at a 100% control the
bar is 90%, attainable both ways (selftest).

**Reported, not deciding:** candidate items unanimous on a non-key letter;
unanimity per arm; the solvers' heuristics and the graders' `_batch`
answers (a pattern both graders name is recorded as a finding whether or not
the bars pass); teacher NO counts; screen drops by grade; per-grade and
per-format pilot-pass; T2 on each inserted subset.

## If a strand passes

Its items passing c1-c5 are inserted **STAGED** (`verified=false`,
`family='map'`, `section='language'`, `task='multiple_choice'`) under
`map-lu-v3-spelling` / `-punctuation` / `-grammar` / `-capitalization`,
choices in the with-source render order, difficulty by mean grade offset
(≤ −1 easy, ≥ +1 hard, else medium), `verify_meta.map` as v2. **Never
`verified=true`.** MAP is not a shipped family; a person releases a staged
row under a decision rule fixed before that sitting.

**"Spelling cleared"** = Spelling items inserted staged = the pilot-pass
items, only if the strand passes every bar; otherwise 0. Earlier cleared
Spelling is 0 (v2 failed), so **the owner's ~20 is reached exactly when the
Spelling strand passes** (its pilot-pass bar is 20).

**Ledger:** one entry per strand under the gate's resolved family
(`mc_hidden_source`), `contentSha` = the inserted strand file for a passing
strand, the frozen (or Stage 0 pick) file for a failing one; stages mapped as
v2 (`shape` S1-a; `withsource` S1-b/c/d; `nosource` S2; `elimination` E7 +
T2; `tells` pooled E3, T2, slots). A failing strand is recorded `killed`;
REGISTER §5 gets the numbers in the result commit.

## What can't be learned here

- Whether any grade label is right: graders and screeners are models, not
  response data (MAP-RESEARCH §10).
- Whether students pick the distractors: a human sitting decides.
- Whether a word is "commonly misspelled at grade g" in any measured sense.
- Whether T2 would catch a structural tell outside its 64 heuristics, or a
  weak one at n = 8-12.
