# SSAT Upper Reading batch WV11 (2026-10-11): pre-registration amendment, before any author runs

Committed **before any WV11 author, judge, grader or solver runs.** The result goes in
`READING-BATCH-WV11-2026-10-11.md`. A sibling batch, WV12, runs in parallel under its own prereg; the two
coordinate only through files on disk (topics, below).

## What this file is

`READING-BATCH-WV11-2026-10-08.prereg.md` (`75c2bc3a`) pre-registered WV11 and its three additions, with their
break tests, and then WV11 never ran. **That file stays in force, word for word, except where this one adds
to it.** Nothing in it is loosened. This file adds four things, all decided before anything was authored:

1. stem phrasings vary within a fixed list (a mechanical check, break-tested below);
2. one REPORT-ONLY measurement, the consistency channel (never a gate);
3. new genres and topics, coordinated with WV12;
4. paths, cohort, ledger id and what happens if everything passes.

## Why now

- **The co-founder's WV6 read (2026-10-10, human, `ssat-wv6-cofounder-2026-10-07`):** 12/12 "only
  defensible"; blind 3/12 = 25.0% against a 25.0% control; realism 6 authentic and 6 "authored to a
  template". The templated six were both attitude items, both vocabulary items, one main idea and one
  inference. WV6 is the only agent method a human has passed.
- **The owner (via the coordinator):** keep authoring SSAT Reading fully by AI with the WV6 method, and run
  WV11 from WV10's "nearly working" reading: keep the character-action attitude form; the action is at least
  one full sentence and no reply carries irony or teasing; vocabulary sense sets whose senses cannot
  overlap (the fix goes in the choice set); and make the attitude and vocabulary stems read less templated.
  The first three are the 2026-10-08 prereg. The fourth is new, below.

## Addition 1: stem phrasings vary (`ssat-wv.mjs stemFrame` / `frameVariety`, ids `WV11-` and later)

**Rule.** Every attitude stem must match exactly one of four character-action frames, and every vocabulary
stem exactly one of four vocabulary frames. Within one `verify` call, **no two WV11 units may use the same
attitude frame, nor the same vocabulary frame.** For WV11 ids this replaces WV10's `characterActionStem`
(which required "suggests"); the tone/author/narrator refusal is kept and widened to "speaker", "writer"
and "attitude". **The rule is scoped to `WV11-` ids only** (`isWV11a`): WV12 runs in parallel under its own
prereg, and a WV12 unit verifies exactly as it did before this commit (checked on a relabelled WV10 unit).

| frame | attitude stem (character-action) |
|---|---|
| suggests | `<Name>'s <action or reply> in paragraph <N> suggests that <he/she/they> <is/feels>` (WV10's form) |
| shows | `In paragraph <N>, <Name>'s <action or reply> shows that <he/she/they> <is/feels>` |
| when | `When <Name> <action> in paragraph <N>, <he/she/they> is most likely` |
| which | `Which word best describes how <Name> feels when <he/she/they> <action> in paragraph <N>?` |

| frame | vocabulary stem |
|---|---|
| as-used | `As (it is) used in paragraph <N> / the <Nth> paragraph, (the word) "X" most nearly means` (every earlier WV stem) |
| closest | `In paragraph <N>, the word "X" is closest in meaning to` |
| likely-means | `The word "X" in paragraph <N> most likely means` |
| context | `In the context of paragraph <N>, "X" most nearly means` |

**Assignment, fixed now (the brief's "Stem phrasings" table):** P01 `which` + `closest`; P02 `shows` +
`likely-means`; P03 `when` + `context`. Neither earlier form (`suggests`, `as-used`) is assigned, so every
WV11 stem reads differently from every stem a person has already seen. Any two of the three units are
distinct on both kinds, so the variety rule cannot be failed by which two units pass.

**Break test (run before this commit, `node ssat-wv.mjs selftest-frames`, 30/30 ok):**
- all eight tone stems of WV6, WV8 and WV9, and the constructed "In paragraph 3, the narrator's attitude
  is", are refused;
- the three WV10 character-action stems match `suggests`; one constructed stem per frame matches its frame
  (attitude and vocabulary);
- near-misses are refused with a PROBLEM line: no paragraph; a tone word inside a matching frame ("In
  paragraph 3, Tomas's tone shows that he is"); an unlisted verb ("implies"); a bare question; an unlisted
  vocabulary phrasing;
- variety: a WV10-shaped batch (three units, all `suggests`, all `as-used`) is refused on both kinds;
  three distinct frames pass; two units sharing one attitude frame are refused.
- **On real files:** WV10's three post-fix units relabelled `WV11-T01..T03` raise both variety problems
  (scratch only). WV6's two units still verify OK, and WV10-P02 still refuses with exactly its 2 problems:
  older ids are unchanged.
- **Mutation tests (the check must fail when broken):** disabling the variety rule fails 2 cases;
  disabling the no-frame refusal fails 5; deleting the tone/attitude words fails 1.

**What it cannot do, stated now.** It makes the wording differ. It cannot make a stem read as authentic, and
it does not touch what the co-founder may really have been reacting to: five one-word felt adjectives, or
five one-word glosses. The next human read is the only test of whether this helped.

## Addition 2 (REPORT-ONLY, NOT A GATE): the consistency channel (`ssat-wv11-cc.mjs`)

**The question (PD pilot v2, point 3):** do a passage's keys agree with each other more than its distractors
do? Solvers said they rebuilt each passage from its sibling questions and picked mutually consistent
answers. In the WV design every choice k is the key of version k, so every diagonal (choice m of every
question) is meant to be one coherent world. If that works, the drawn key diagonal should cohere no more
than the other four.

**Instrument.**
- A pair is two (stem + one option) statements from two different non-vocabulary questions of ONE passage.
  The passage and every role are withheld. Two fresh judges rate each pair `fit` (+1), `unrelated` (0) or
  `clash` (-1); a pair's value is the mean of the two.
- **Candidate** (the two batch units, 5 non-vocabulary questions each, 10 question pairs per unit): all 5
  diagonal pairs and 5 seeded cross pairs per question pair, 200 pairs. Roles are assigned after judging,
  from `draw.json`: **KK** = the drawn diagonal (n = 20); **SW** = the other four diagonals (same-world
  distractor pairs, n = 80); **XW** = cross pairs with neither option the drawn key. **DD = (4 SW + 12 XW)/16**,
  the distractor-pair mean weighted as the drawn set presents it.
- **Live control:** the 48 non-vocabulary live items of `ssat-reading-diag` (10 passages, the Stage A
  population), 92 question pairs: KK plus 3 seeded distractor-distractor pairs each, 368 pairs.
- 568 pairs, shuffled together and split into 4 files; 8 judge agents.
- **Reported:** channel = mean(KK) - mean(DD) for each population; candidate KK - SW; the draw-independent
  view mean(all diagonals) - mean(all cross); judge agreement; denominators.
- **When:** after the deciding stages end, pass or stop, if a draw exists. If WV11 stops before a draw, it
  runs on the units that completed the fix round with `--draw none` (all-diagonal view only) plus the live
  control. It never changes a verdict, a drop or an insert.
- **Judge prompt (fixed):**
  > Open only `<cc-N.json>`. Each entry shows two statements about ONE reading passage, each written as a
  > test question followed by one of its answer options. The passage is withheld, and you are not told
  > whether either option is correct. Suppose both options were the correct answers to their questions
  > about the same passage. Rate how the two statements relate: "fit" (they support each other or
  > naturally belong to one story or argument), "unrelated" (neither bears on the other), or "clash"
  > (they are hard to make true of the same passage). Return JSON {"labels": {"<id>": {"rel":
  > "fit"|"unrelated"|"clash"}}}, one entry for every id, to `<cc-N.X.json>`. Do not open any other file,
  > any other repository file, or any web page. At the end, state which files you opened.
- **Break test (`node ssat-wv11-cc.mjs selftest`, 13/13 ok):** keys fit / distractors clash gives +2 in both
  populations, reversed gives -2, all-unrelated gives 0; "every diagonal fits" (the WV design working)
  gives KK - SW = 0 and KK - DD = 1.5; a missing label, a one-judge file, an invalid value, or a unit
  missing from the draw each refuse; `--draw none` reports only the all-diagonal view. Mutation tests:
  swapping KK and SW fails 2 cases, dropping the SW weighting fails 1, letting a live DD pair touch a key
  fails 1.
- **Predictions, so they can be wrong:** candidate KK - SW near 0 (|x| < 0.25), and KK - DD positive,
  carried by XW; the live channel smaller than the candidate's KK - DD. **Limits:** the judges are the same
  model as the authors and the solvers; n(KK) = 20 for the candidate; a "fit" judgement between two
  statements is not a solver's behaviour. It is a hypothesis check, never evidence for release.

## Addition 3: genres and topics (new to every WV batch; coordinated with WV12)

Every earlier WV batch used narrative fiction, science features and community/history features. WV11 uses
three genres no WV batch has used, each with a character whose action carries the attitude:

| unit | genre | topic |
|---|---|---|
| P01 | memoir / personal essay (first person, participant narrator) | helping a relative rebuild a dry-stone field wall one winter |
| P02 | biographical sketch (an invented 19th-century figure) | a land surveyor charting a river delta / marsh boundary |
| P03 | arts / humanities feature (film and archives) | restoring a silent film reel found in an attic, with a small-town cinema |

All earlier topics stay banned (the 2026-10-08 list plus pianos, carousels and dune beetles). The topics
were written to `scratchpad/ssat-wv11-work/TOPICS.txt` before this commit; WV12's file did not exist yet.
Before each author runs, I re-read `scratchpad/ssat-wv12-work/TOPICS.txt`; if WV12 has since claimed an
overlapping topic, mine stands (written first) and the overlap is recorded, not repaired.

## Addition 4: paths, prompts, cohort, ledger, and what passing means

- **Scratch** only in `scratchpad/ssat-wv11-work/` (git-excluded). Every agent opens and writes files only
  there. Tracked artefacts are copied to `scripts/study-bank/ssat-wv11-batch/` and committed; the frozen
  units are `ssat-wv11-p0{1,2,3}.wv.json` there.
- **Every author, fixer, judge, grader and solver prompt says:** open only the named file(s), no web, no
  other repository files, and state the files opened. Prompts are the 2026-10-08 / WV10 prompts verbatim
  with paths changed and that sentence appended.
- **Author prompt (fixed):** "You are writing unit WV11-P0n of an SSAT Upper Level reading batch. Open only
  `<scratch>/brief/SSAT-WV11-AUTHOR-BRIEF.md` and follow it exactly. Genre: <genre>. Topic: <topic>. Your
  unit uses the P0n row of the 'Stem phrasings' table. Write the unit as JSON to `<scratch>/authors/p0n.wv.json`.
  Do not open any other file, any repository file, or any web page, and do not run any script in the
  repository. At the end, state which files you opened."
- **Fixer prompt (fixed; fresh agent, one round):** "Open only `<scratch>/brief/SSAT-WV11-AUTHOR-BRIEF.md` and
  `<scratch>/fix/p0n.in.wv.json`. A mechanical checker and two reader panels refused this unit for the
  PROBLEM lines below. Fix every PROBLEM with the smallest change that satisfies the brief; when a quote
  must contain a choice's word, use the exact listed word. Do not change anything a PROBLEM does not
  require. Write the whole fixed unit to `<scratch>/fix/p0n.out.wv.json`. Do not open any other file, any
  repository file, or any web page. At the end, list what you changed and which files you opened.
  PROBLEM lines: <verbatim>"
- **Order:** this commit; authors (at most 2 agents at a time; at most 3 agents of any kind at once); stage
  0 (verify incl. stem frames, A1, licensing with the WV11 no-irony prompt, sense overlap, one fix round,
  re-run fresh on changed units); the grouped screen; the batch = the first 2 units by id that pass all of
  pre-flight (a passing third is kept on file, not used); **freeze commit**; draw + renders (`ssat-wv.mjs
  draw` with `--a1 --lic --senses`, `build --natlive reading-cal/ssat/natlive.json`, and the consistency
  render) **committed before any grader or solver**; stages 1-4, stop at the first deciding failure; the
  consistency channel (report-only); **result commit with the REGISTER §5 line and the ledger entry
  `ssat-reading-wv11-2026-10-11` in the same commit.**
- **Bars, unchanged** (12 items; `node reading-cal.mjs relbars 12` reproduces them):

| bar | threshold | status |
|---|---|---|
| C exclusivity | >= 11/12 | deciding |
| Q distractor >= plausible | >= 4/96 | deciding |
| dead-by-both | <= 7/12 | deciding |
| E naturalness | median >= live median (same two judges, Stage A's 7 live passages) | deciding |
| A options-only isolated | <= in-run control + 10 points (control 10-45% or INVALID) | deciding |
| B options-only grouped | <= 40% | deciding |
| F easy, pilot-pass | none | reported |
| consistency channel | none | **report-only** |

- **The attitude stop rule** is the 2026-10-08 one, unchanged: after the fix round, fewer than two units pass
  and any refusal is on the attitude item; or a post-draw grader picks off key or names a second answer on
  an attitude item. Either stops WV11 and reports to the owner.
- **If every deciding stage passes:** insert STAGED (`verified=false`) as cohort `ssat-reading-wv11` with
  `insert-ssat-wv.mjs`; never `verified=true`. Then prepare a co-founder sitting prereg and a forwardable
  sitting note in the WV6 shape (`ssat-reading-wv6.SITTING.PREREG.md`, `SSAT-WV6-SITTING.md`). **Do not
  draw it:** the co-founder's account has an open run (`act-en9-cofounder-2026-10-10`) and only one open
  run is allowed.
- No GPT models. No blueprint count changes. No Herald/NWEA material. Commit locally; the coordinator pushes.
