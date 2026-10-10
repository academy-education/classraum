# SSAT Upper Reading `ssat-reading-pd-pilot-v2` (2026-10-10): pre-registration

**Committed alone, before any passage is chosen, fetched or read for this pilot, and before any
question author runs.** It is committed with the v2 author brief `SSAT-PD-AUTHOR-BRIEF-V2.md` and the
v2 changes to `ssat-pd.mjs` (selftested; each new rule mutation-tested: disabling it fails the
selftest). The result goes in `READING-BATCH-PD-PILOT-V2-2026-10-10.md`; files in `ssat-pd-v2/`.

## Why a v2, and what changes

Pilot v1 (`SSAT-READING-PD-PILOT-PREREGISTERED.md`, result `READING-BATCH-PD-PILOT-2026-10-10.md`)
put AI-written questions on real public-domain passages. It passed exclusivity (35/36), naturalness
(median 5 vs live 2) and distractor quality (Q 47.9% vs live 6.1%), and **failed options-only
isolated: 80/90 = 88.9% against an in-run live control of 43/144 = 29.9%** (+59.0, bar +10). The
owner chose one more AI try with a fixed design. The v1 result named three causes:

1. **The key was the one thematic or insightful reading** among literal, negative or moralising
   distractors (the CLAUDE.md axis rule: the options differed along the axis the stem names).
2. **The five-direction attitude rule made the key the only warm option** in 5 of 6 attitude items.
3. **Solvers recognised 5 of 6 famous sources.** The one unrecognised passage (USGS 2026) still
   scored 12/15 = 80.0%, so the questions are the main leak.

**v2 changes only these things** (A-D below). Everything else (shape, tooling, stage order, every
judge/grader/solver prompt, the in-run live control, the relative bars, the scale test) is v1's,
unchanged.

**A. Obscure sources only, with a recognition pre-check** (Stage S).
**B. Option parity** in the author brief (the core fix).
**C. Attitude polarity rule** replaces the five-direction rule (brief and checker).
**D. One pre-freeze options-only screen** with fresh solvers, and one re-author round.

Applying the new attitude rule to v1's six frozen attitude items refuses all six (run before this
commit: `attitudePolarity` on `ssat-pd-pilot/items-*.json`; three are refused as "the only warm
option", the other three for a neutral option and too few opposite-polarity options). v1's frozen
items still verify CLEAN under the edited checker (v1 ids keep the v1 rules).

## Shape (unchanged from v1)

- **6 passages x 6 items = 36 items**, one each of `main-idea`, `detail`, `inference`,
  `vocabulary-in-context`, `attitude`, `purpose`; five choices. Set ids **`PD2-P1` .. `PD2-P6`**
  (the `PD2-` prefix switches the checker to the v2 rules).
- **Slots:** P1 literary fiction; P2 fiction or memoir (different author, era, tone from P1); P3
  poetry; P4 history / humanities; P5 natural science (pre-1930); P6 current science (US federal).
- Length: prose 280-650 words, poem 150-500 words.

## Stage S: sources (before any author runs)

All of v1's Stage S rules hold (public domain only; whole paragraphs or stanzas in source order;
`[...]` trims listed; modernizations only as listed `{from, to}` pairs; suitability), checked by
`ssat-pd.mjs srccheck` (sha256 of the fetched file, every segment verbatim in order, word ranges, all
six slots). In addition:

1. **Source class (A).** Pre-1930 slots (P1, P2, P3, P5, and P4 if pre-1930) come from **little-known
   pre-1930 US magazine pieces** (e.g. *St. Nicholas*, *The Youth's Companion*, *Popular Science
   Monthly*, *Harper's Young People*) **or little-known authors**. **No canonical author** (nobody
   taught as a standard name in US schools or college surveys: no Frost, Muir, Twain, Alcott,
   Dickinson, Thoreau, London, Garland, Addams, Grahame, etc.). P6, and P4 if not pre-1930, come from
   **recent US-government prose** written by the agency (NPS, NOAA, NASA, USGS, Smithsonian only where
   clearly federal, Library of Congress blogs), with no quoted third-party text in the excerpt.
2. **Recognition pre-check (A).** Before any question is written, **one fresh Claude solver** sees
   only each candidate passage's **first two sentences** (`ssat-pd.mjs firstSentences(text, 2)`;
   for the poem, a stanza break also ends a sentence) and must name the author or work, or say
   unknown. Prompt (verbatim, path filled in):

   > Open only `<recog file>`. Each entry is the opening (the first two sentences) of a published
   > text: a story, memoir, poem, essay or article. Do not use the web and do not open any other file.
   > For each entry, say whether you recognise the text itself. If you do, give its author and its
   > work (the title, or the periodical, book or website it appeared in). If you do not actually
   > recognise the text, write "unknown" for both; do not guess from the style, period or topic.
   > Return JSON {"labels": {"<id>": {"author": "<name or unknown>", "work": "<title or unknown>",
   > "note": "<one sentence>"}}} to `<out file>`. At the end, state which files you opened.

   **Any passage for which the solver names an author or a work (anything but "unknown" for both) is
   replaced** before questions are written, whether or not the name is right. A replacement passage
   gets a fresh recognition solver (a new agent, never one that saw an earlier attempt). Every
   attempt is recorded in `passages.json` (`recognition.attempts`: the opening shown, the solver,
   its file, its answer, whether it was right) and `srccheck` refuses a v2 passage unless its last
   attempt was on its exact opening and answered "unknown" for both. Candidate passages may be
   checked together in one file; one solver per file.
3. **Fame judgement** recorded per passage (as v1), now with the source class.

A source that fails S may be replaced: no question exists yet.

## Authoring

As v1: **two fresh Claude authors**, three passages each (A: P1 P3 P5; B: P2 P4 P6). Each sees only
`SSAT-PD-AUTHOR-BRIEF-V2.md`, its own three passages, and `misread/naep-guide-for-agents.md`. Each
writes only to the scratchpad and is told not to open anything else in `scripts/study-bank/`, and
never to use the web. The passage text is fixed.

**B. Option parity (the core of the brief).** In every item the distractors are the same KIND of
reading as the key: if the key is thematic or insightful, at least two distractors are equally
thematic, insightful and well-phrased readings that the passage contradicts or does not support. No
literal, negative or moralising "obviously lesser" options beside an insightful key. Main idea: all
five options are plausible main ideas of a passage on this topic; only the passage decides. This rule
is semantic and has no mechanical checker; the screen (D) and Stage 3 measure it.

## Stage 0: pre-flight (deciding). `ssat-pd.mjs verify`

v1's rules 1-11 unchanged, except **rule 5 is replaced** (C):

**5'. Attitude polarity** (`attitudePolarity`): every choice carries words of exactly one polarity
class from the v2 lexicon (warm / cool; neutral or mixed words such as indifferent, detached,
wistful, nostalgic, ironic, wry, bemused, uncertain refuse); **at least one other choice shares the
key's polarity** (the key is never the only warm or only cool option) and **at least two choices hold
the opposite polarity**; no choice's attitude word (5-letter stem) appears in the passage (as v1).
**5'-batch** (`attitudeMix`): over the batch's attitude items, the key's polarity class is the
2-option class in at least floor(n/3) items and the 3-option class in at least floor(n/3) (6 items:
at least 2 of each), so "pick from the majority (or minority) polarity" never decides the batch.
**The five-direction rule is dropped.**

Rule 11 (licensing pre-check on attitude and vocabulary items, two fresh judges, WV6 prompt verbatim)
is unchanged and now carries more weight: two or three same-polarity choices must still be separable
by the passage.

**One fix round, as v1:** one fresh fixer per author file gets the PROBLEM lines verbatim and may
change stems, choices, keys and support of the flagged items only. A1 and licensing re-run fresh on
the changed items. An item still refused after the round is dropped.

## Stage P: the pre-freeze options-only screen (D; NOT a gate, NOT the measurement)

1. The Stage-0 survivors are written to `ssat-pd-v2/screen/batch.json` (`ssat-pd.mjs freeze`) and
   rendered by `ssat-wv.mjs build ssat-pd-v2/screen` (seeded letter deal; the non-vocabulary
   candidates interleaved among the same 48 live control items as Stage 3, no two siblings adjacent).
   Only `iso.json` is used.
2. **Three fresh Claude solver samples**, pilot 4's prompt verbatim (`misread/prompts.md` §10), each
   opening only the screen's `iso.json`. **These agents are never reused in any later stage**; Stage 3
   uses three brand-new samples on a new render.
3. `ssat-pd.mjs score ssat-pd-v2/screen screen`: **every candidate item whose key is picked by 2 or
   more of the 3 samples is RE-AUTHORED**, once. Reported beside it: the candidate and control rates,
   and the share of CONTROL items solved by 2+ of 3 (the screen's base rate on live items).
4. **Re-authoring:** one fresh Claude author per author file that has flagged items (never an earlier
   author or fixer). It gets the v2 brief, the NAEP guide, the passage, the full text of that passage's
   other (surviving) items (to keep one-of-each and the cross-item rule), and only the STEM of each
   flagged item. It writes **a new item of the same kind from scratch: a new stem and a full new option
   set**, never a patch, and may not reuse the old stem. It is told the old item was guessable without
   the passage; it is NOT shown the old options, the screen's picks or the key.
5. The re-authored items then go through **Stage 0 in full** (mechanical rules, A1, licensing for
   attitude) with the same one fix round, applied to re-authored items only. A re-authored item still
   refused after that round is dropped. A rule-8 collision between a re-authored item and a survivor is
   fixed on the re-authored item. A passage left with fewer than 5 items is dropped. **Stage 0 fails
   (stop) if fewer than 4 passages or 24 items remain, or if a batch rule (9, 5'-batch) still fails.**
6. **Survivors of the screen are never touched again. No item is re-screened. Re-authoring is allowed
   once.** Then the batch is frozen.

**Recorded now, and to be repeated in the result:** the screen is an instrument the batch has been fit
to. A screened batch can still fit the screen: the re-authored items were written by an author told
that their predecessors leaked, and the survivors are the items that happened to miss three
correlated samples (CLAUDE.md: three samples of one solver are one solver sampled three times). The
final gate uses brand-new samples on a new letter deal, but they are samples of the same model; the
Stage 3 number is therefore an optimistic estimate of how the batch would do against a model that
never shaped it, and is not evidence that a student cannot guess it.

**Freeze:** the surviving items are written to `ssat-pd-v2/batch.json` (bank shape) and
`ssat-reading-pd-pilot-v2.batch.json`, committed before any grader or solver of a later stage runs.
Renders (`ssat-wv.mjs build ssat-pd-v2 --natlive reading-cal/ssat/natlive.json`) are committed right
after the freeze, before any grader runs. **No repair of any kind after the freeze.**

## Stages after freeze (unchanged from v1). STOP at the first deciding stage that fails

**Stage 1: with-source C, F, Q, dead-by-both, pilot-pass (deciding).** Two fresh graders on
`withsource.json`, `misread/prompts.md` §8 verbatim, scored by `ssat-pd.mjs score ssat-pd-v2 ws`
(relative bars against Stage A's live control at the frozen n, `reading-cal.mjs relBar`). At n = 36
(`node reading-cal.mjs relbars 36`, run before this commit): **C >= 34/36, F easy <= 35/36,
Q >= 15/288, dead-by-both <= 19/36, pilot-pass >= 1/36**, all deciding. Any other n: the same
function. Per item: an item that is not exclusive is not inserted, even if the batch passes.

**Stage 2: naturalness E (deciding).** Two fresh judges, `misread/prompts.md` §9 verbatim, candidates
plus Stage A's 7 live passages, unlabelled; `ssat-wv.mjs score --nat3`: candidate pooled median >= live
pooled median; INVALID if the live median <= 1 (re-run once with fresh judges, then stop).

**Stage 3: A, options-only isolated (deciding).** Every frozen non-vocabulary item among the 48 live
control items, no two siblings adjacent, **three brand-new solver samples** (never a screen solver),
`misread/prompts.md` §10 verbatim. Bar (`reading-cal.mjs barAMargin`): **control 10-45% (else INVALID)
and candidate <= control + 10 points.**

- **Ceiling check (CLAUDE.md, pre-registered bar vs the control's ceiling):** inside the valid control
  range 10-45% the bar runs from 20% to 55%, and the candidate can score anywhere in 0-100%; both PASS
  and FAIL are attainable for every valid control value. The floor case (control below 10%) is
  INVALID by the rule above. Re-checked against the in-run control and stated in the result.
- **Reported (not a bar):** the candidate rate **per passage**, and separately over the passages the
  recognition pre-check cleared (all six must be cleared to have reached authoring, so the two numbers
  should coincide; `ssat-pd.mjs score iso` prints both); unanimity rate candidate vs control; items
  solved by all three samples; any solver note naming a source.

**Stage 4: B, options-only grouped (deciding).** One file per passage; three fresh samples (never a
screen or Stage 3 solver), each answering every file; `ssat-wv.mjs score --grp`. Bar **<= 40%**.

## If every deciding stage passes

Insert **STAGED** (`verified=false`) as cohort **`ssat-reading-pd-pilot-v2`** (family `ssat`, section
`reading`, domain `Reading Comprehension`, `passage_group_id` `pd-<set_id>`), exactly as v1 planned:
choice order as the Stage 1 graders saw it, difficulty from the Stage 1 mean rank, `verify_meta` with
the source, recognition record, frozen sha, both grader labels and every stage result. Items not
exclusive in Stage 1 are left out. **Never `verified=true`.** Drawable count does not change.

**Co-founder sitting:** pre-registered in `ssat-reading-pd-pilot-v2.SITTING.PREREG.md` before any
draw, WV6 per-item rule (only-defensible -> released; flagged or rejected -> archived, no repair). The
draw command and a forwardable note are prepared; the draw itself is the owner's call.

## Scale test (unchanged from v1)

| hypothesis | measure | bar |
|---|---|---|
| H1, not too easy | items with grader-mean rank <= 1.5 | **<= 50%** of frozen items |
| H2, distractors alive | items with a distractor both graders call dead | **<= 1/6** of frozen items |

**Recommendation rule (fixed now, v1's):** **GO** (scale to about 30 passages, every batch staged and
human-sat) if every deciding stage passes AND H1 AND H2 are met; **CONDITIONAL** if every deciding stage
passes but H1 or H2 is not met; **NO-GO** if any deciding stage fails, with no repair and no re-run. In
every case release waits on the co-founder sitting (at most 15% of items flagged or rejected confirms
the method; the owner may override). **Added for v2:** a GO here would rest on a batch that was
screened and partly re-authored against the same model family; scaling would have to keep the screen
and re-author step, and its yield (how many items the screen sent back) is reported as a cost.

## Predictions (recorded so they can be wrong)

1. Stage S needs at least one replacement: some opening will be named (rightly or wrongly).
2. The screen sends back about a third of the non-vocabulary items (the v1 failure was 25/30
   unanimous; parity should cut that, not end it; live items solved 2+ of 3 give the base rate).
3. **Stage 3 is still the likeliest deciding failure.** Option parity is an author's declaration,
   and CLAUDE.md records that declared constraints rarely kill the live tell. I put roughly even
   odds on the candidate landing within control + 10.
4. Attitude items get harder to keep exclusive (two or three same-polarity choices); expect licensing
   and Stage 1 C misses to concentrate there.
5. If Stage 3 passes, the per-passage rates are uneven, with the poem and the fiction passages the
   highest.
