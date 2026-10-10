# SSAT Upper Reading `ssat-reading-pd-pilot` (2026-10-10): pre-registration

**Committed before any passage is chosen, fetched or read for this pilot, and before any question
author runs.** The author brief `SSAT-PD-AUTHOR-BRIEF.md` and the checker `ssat-pd.mjs` (selftested)
are committed with this file. The result goes in `READING-BATCH-PD-PILOT-2026-10-10.md`.

## Why a new method, and what it tests

SSAT Reading holds 138 drawable items in 31 passage groups. `admission-form-depth.ts` (run
2026-10-10) gives forms 40/40, 40/40, 40/40, 18/40, 0/40: **3 clean reading forms**, which caps
whole SSAT tests at 3 (math 6+ and verbal 6+ on the same run).

Every agent route so far failed on with-source QUALITY, not on guessability (REGISTER §5: pilots
1-5, WV5-WV10, MAP adapt pilots 5-7; B10/B11):

1. **AI passages read less natural than live** (pilots 1-2). WV3+ fixed this with a relative bar.
2. **Items came out too easy** (pilot 3 9/12, pilot 4 7/12 and 9/12, WV6 10/12 easy).
3. **Distractors each die to one sentence** (MAP adapt 5: "direct negation of one sentence";
   Stage A: live itself names and denies every wrong option).

All three may come from the same root: the passage was written *to carry the questions*. The owner
approved a pilot that removes that root: **the passages are real, published, public-domain prose;
the AI writes only the questions.** Pilot 5 (misread) also used real public-domain passages but
derived distractors from a simulated panel and failed on panel yield; it never reached a grader.
No earlier run has graded AI-written questions on real prose under the SSAT reading gates.

**The question this pilot answers:** with real prose, (a) do AI-written questions pass the existing
SSAT reading gates, and (b) does real prose fix "too easy" and "dead distractors"?

## Shape (fixed now)

- **6 passages x 6 items = 36 items**, matching delivery: `ITEMS_PER_PASSAGE.ssat = 6`
  (`src/lib/study/admission-tests.ts`), 40 items per form drawn as 7 passages.
- **One item of each kind per passage**: `main-idea`, `detail`, `inference`,
  `vocabulary-in-context`, `attitude`, `purpose`. The live subskill mix (138 items) is detail 28+,
  vocabulary 23, inference 22, main-idea 21, attitude 20, purpose/structure 19+: near-even, so
  one-of-each is the closest per-passage match. Five choices, as live.
- **Genre slots** (live is about 1/4 narrative and 3/4 informational; the published SSAT Upper mix
  adds poetry and literary nonfiction, as the owner asked):

  | slot | genre | source class |
  |---|---|---|
  | P1 | literary fiction (story or novel chapter) | first published before 1930 |
  | P2 | literary fiction or memoir, different author, era and tone from P1 | before 1930 |
  | P3 | poetry | before 1930 |
  | P4 | history / humanities (essay, letter, speech, memoir of public life) | before 1930, or a US federal history text |
  | P5 | natural science (natural history, field observation) | before 1930 |
  | P6 | science (current) | US federal agency prose (NASA, NOAA, USGS, NPS; Smithsonian only if clearly federal) |

- **Length:** prose 280-650 words (live is 287-343; the owner's range is about 250-700); the poem
  150-500 words.

## Stage S: sources (before any author runs; checked mechanically by `ssat-pd.mjs srccheck`)

For every passage, `passages.json` records `set_id`, `slot`, `genre`, `title`, `author`, `year`
(original publication), `url`, `local_path` (the whole fetched file, plain text or HTML-to-text),
`source_sha256`, `pd_reason`, `trims` and `modernizations`, and `text`.

- **Public domain only.** Pre-1930 first publication, or a work of the US federal government written
  by the agency itself (no quoted third-party material, no credited non-federal author). Gutenberg
  texts are a source of PD text; the edition's own front matter is not used.
- **Not rewritten.** The excerpt is whole paragraphs (whole stanzas for the poem) in source order.
  A cut inside the excerpt is marked `[...]` and listed in `trims`. Spelling modernization is
  allowed only as a listed `{from, to}` pair. Gutenberg `_italic_` markers may be dropped.
- **`srccheck` refuses unless:** the local file's sha256 matches; every `[...]`-separated segment,
  after reversing the listed modernizations and normalizing whitespace/quotes/dashes/underscores,
  occurs verbatim in the local file, in order; word counts are in range; all six slots are filled.
- **Not famous.** No opening chapter of a widely taught novel, no poem that is a staple of US
  middle-school anthologies, no speech students memorize. Recorded per passage as a judgement,
  not measured.
- **Suitable:** no slurs or demeaning portrayals, no graphic violence, nothing on self-harm.
- A source that fails S may be replaced: no question exists yet.

## Authoring

- **Two fresh Claude authors**, at most two at a time, three passages each (A: P1 P3 P5; B: P2 P4
  P6). Each sees only the brief, its own three passages, and `misread/naep-guide-for-agents.md`
  (the owner's NAEP distractor guide, agent copy). Each writes only to the scratchpad and is told not
  to open anything else in `scripts/study-bank/`.
- **The passage text is fixed.** Authors write stems, choices, keys and support only.

## Stage 0: pre-flight (deciding). `ssat-pd.mjs verify`

Mechanical rules (refuse = a PROBLEM line):

1. one of each kind per passage, qids `<pid>-1..6`, five distinct non-empty choices, key among them;
2. choice length ratio (longest/shortest, characters) <= 1.5 on every item;
3. every non-vocabulary, non-attitude item: a NAEP lure label on each of its four wrong choices
   (`stops-short` H10, `reversed` H8, `half-right` X2, `detail-as-whole` H1, `misplaced-detail` H7,
   `character-not-author` H3, `too-far` H2, `keyword-match` H9, `prior-knowledge` H6,
   `figurative-literal` H5, `true-not-answering` X1, `unsupported` X3), at least 2 different labels
   per item and at most one `unsupported` (NAEP guide §4 items 3 and 5);
4. `why` and every kill `quote` (>= 3 words) verbatim in the passage;
5. attitude: the five choices cover five different direction classes of `ssat-wv.mjs ATT_DIR`
   (WV6's mechanical rule), and no choice's attitude word (5-letter stem) appears in the passage;
6. vocabulary: the stem quotes the word, the word appears in the passage, and the stem's
   paragraph/stanza ordinal (if any) is the one it appears in;
7. stems never cite line numbers (text reflows on a phone);
8. cross-item: a stem may not contain a content word that appears in exactly one choice of a
   DIFFERENT item of the same passage (WV rule 5);
9. batch length band (CLAUDE.md: a band per unique extreme, never a cap): the key is the uniquely
   longest choice in at least 2 and at most 12 of 36 items, and likewise uniquely shortest
   (scaled as round(n x 2/36) .. round(n x 12/36) if items are dropped).

Judged rules:

10. **A1 absent-option check** (`absent-check.mjs` definition, Stage A's judge prompt verbatim with
    the path changed): every lexically flagged non-exempt choice goes to two fresh key-blind
    presence judges; refused only if A1 calls it absent.
11. **Licensing pre-check on the attitude and vocabulary items only** (WV6's prompt verbatim, path
    changed; one file, letters re-dealt by seed, key withheld; two fresh judges): an item passes only
    if BOTH judges pick the key, name no second defensible answer, and give a verbatim >= 3-word
    exclusion for every other choice. The other four kinds are NOT pre-checked, so Stage 1 measures
    them fresh (WV5: those four kinds were 8/8 exclusive; repairing them in response to a grader-like
    pre-check would be fitting to the instrument).

**One fix round.** One fresh fixer per author file gets the PROBLEM lines verbatim, the brief and
that file, and may change stems, choices, keys and support of the flagged items only (never the
passage). A1 and licensing are re-run fresh on the changed items. **An item still refused after the
round is dropped** (not repaired again). A passage left with fewer than 5 items is dropped. **Stage 0
fails if fewer than 4 passages or fewer than 24 items remain.**

**Freeze:** the surviving items are written to `ssat-reading-pd-pilot.batch.json` (bank shape) and
committed before any grader or solver runs. Renders (`ssat-wv.mjs build`, seeded letter deal,
`--natlive reading-cal/ssat/natlive.json`) are committed with or right after the freeze, before any
grader runs. **No repair of any kind after the freeze.**

## Stages after freeze, in order. STOP at the first deciding stage that fails

**Stage 1: with-source C, F, Q, dead-by-both, pilot-pass (deciding).** Two fresh graders on
`withsource.json`, prompt `misread/prompts.md` §8 verbatim (path changed). Scored by
`ssat-pd.mjs score <dir> ws`, which uses `reading-cal.mjs` `scoreSsat` and `relBar` unchanged:
the relative bar against Stage A's live control (`reading-cal/ssat/score.json`), power 0.8, computed
at the frozen item count n; a bar decides only if it can fail inside the attainable range.

At n = 36 (`node reading-cal.mjs relbars 36`, run before this commit):

| bar | live (Stage A) | candidate bar at n = 36 | status |
|---|---|---|---|
| C exclusivity | 33/33 | **>= 34/36** | DECIDING |
| F easy (grader-mean <= 1.5) | 32/33 | **<= 35/36** | DECIDING (by the rule; it fails only if all 36 are easy) |
| Q distractor >= plausible | 16/264 | **>= 15/288 labels** | DECIDING |
| dead-by-both | 15/33 | **<= 19/36** | DECIDING |
| pilot-pass (excl, not easy, no dead-by-both) | 1/33 | **>= 1/36** | DECIDING (by the rule) |

(At n = 30 the bars are >= 28, <= 29, >= 12/240, <= 16, >= 1; at n = 24 >= 23, F and pilot-pass
not decidable, >= 9/192, <= 13. Any other n: the same function.)

**Per item (not a batch bar):** an item that is not exclusive (either grader off key, or either
names a second defensible answer) is **not inserted**, even if the batch passes.

**Stage 2: naturalness E (deciding).** Two fresh judges, SSAT pilot 3's neutral prompt verbatim
(`misread/prompts.md` §9) with the count set to the number of passages shown: the frozen candidates
plus Stage A's 7 live passages (`reading-cal/ssat/natlive.json`), shuffled, unlabelled. Scored by
`ssat-wv.mjs score --nat3`: **candidate pooled median >= live pooled median**; INVALID if the live
median is <= 1 (re-run once with fresh judges, then stop). Prediction: passes easily. A failure here
would mean the judges penalise period prose, and it stops the run all the same.

**Stage 3: A, options-only isolated (deciding).** Every frozen non-vocabulary item interleaved, no
two siblings adjacent, among the 48 live control items (`ssat-reading-diag/taskF.json`), exactly as
WV5/WV6. Three fresh samples of one solver, pilot 4's prompt verbatim (`misread/prompts.md` §10).
Bar (`reading-cal.mjs barAMargin`): **control 10-45% (else INVALID) and candidate <= control + 10
points.** Siblings share the file, so the number is an upper bound (the conservative direction).
Reported, not a bar: unanimity rate candidate vs control (CLAUDE.md: one solver sampled three
times), and items solved by all three samples.

*A risk stated now:* a solver might recognise a public-domain source from an option's content and
answer from memory. That inflates the candidate number (the conservative direction for a pass). The
bar stays deciding as written; solver notes that name a source are recorded.

**Stage 4: B, options-only grouped (deciding).** One file per passage (`grp-N.json`); three fresh
samples, each answering every file; scored by `ssat-wv.mjs score --grp`. Bar **<= 40%**.

D (cross-version validity) does not exist here: there is one version.

## If every deciding stage passes

Insert **STAGED** (`verified=false`) as cohort **`ssat-reading-pd-pilot`**: family `ssat`, section
`reading`, domain `Reading Comprehension`, `passage_group_id` `pd-<set_id>`, choice order as the
Stage 1 graders saw it, difficulty from the Stage 1 graders' mean rank (the F definition).
`verify_meta` carries the source (title, author, year, URL, PD reason, trims, modernizations), the
frozen sha, both grader labels and every stage result. Items not exclusive in Stage 1 are left out.
Drawable count does not change. **Nothing is released.** For a verbal cohort the human sitting is
the verdict (bank-gate §5).

**Co-founder sitting:** pre-registered in `ssat-reading-pd-pilot.SITTING.PREREG.md` (committed
before any draw) with the WV6 per-item rule (only-defensible -> released; flagged or rejected ->
archived, no repair). **Not drawn while `ssat-wv6-cofounder-2026-10-07` is open**
(`draw-review-run.mjs` refuses a second open run per reviewer). The draw command and a forwardable
note are prepared.

## The scale test: does real prose fix "too easy" and "dead distractors"? (pre-registered)

These decide the **scale recommendation**, not insertion. They are the pilots' original absolute
bars, the ones every agent route and the live bank failed, computed on the frozen items with the
Stage 1 labels:

| hypothesis | measure | bar | comparators |
|---|---|---|---|
| H1, not too easy | items with grader-mean rank <= 1.5 | **<= 50%** of frozen items (18/36) | live 32/33 = 97.0%; WV6 10/12; WV5 5/12; pilot 3 9/12 |
| H2, distractors alive | items with a distractor both graders call dead | **<= 16.7%** of frozen items (6/36) | live 15/33 = 45.5%; WV6 6/12; WV5 4/12 |

Reported beside them: Q plausible-or-strong rate (live 6.1%, WV6 39.6%), and the Stage 2 medians.

**Recommendation rule, fixed now:**

- **GO** (scale to about 30 passages under this method, every batch staged and human-sat): every
  deciding stage passes AND H1 AND H2 are met.
- **CONDITIONAL**: every deciding stage passes but H1 or H2 is not met. The method is no worse than
  live but does not fix that defect; scaling is the owner's call, and the result will say plainly
  which defect remains.
- **NO-GO**: any deciding stage fails. The result says which and why; no repair, no re-run.

In every case, release of this pilot, and of anything scaled from it, waits on the co-founder
sitting; and scaling should not begin until that sitting has confirmed the method (at most 5 of the
36 items flagged or rejected, i.e. <= 15%; my operationalisation, the owner may override).

## Predictions (recorded so they can be wrong)

1. Stage S and Stage 2 pass easily.
2. **Stage 1 C is the likeliest deciding failure.** Real prose was not written to make one answer
   unique; >= 34/36 allows two misses. Inference and attitude are the likeliest misses.
3. If C passes, A next: real texts have no planted tells, so I predict A passes.
4. H2 more likely met than H1. Real prose gives real lure material; difficulty is capped by how
   hard upper-level graders consider any passage-based question (live 97% easy), so H1 may fail even
   if the items are good. If H1 fails while everything else passes, the honest reading is that the
   grader's "easy" may not be reachable on SSAT Upper prose at all, and the human sitting's blind
   score is the better difficulty signal.
