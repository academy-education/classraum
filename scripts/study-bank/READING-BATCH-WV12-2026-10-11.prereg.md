# SSAT Upper Reading batch WV12 (2026-10-11): pre-registration

Committed **before any WV12 author runs.** The result goes in `READING-BATCH-WV12-2026-10-11.md`.
WV11 runs in parallel under `READING-BATCH-WV11-2026-10-08.prereg.md` and its amendment
`READING-BATCH-WV11-2026-10-11.prereg.md` (`10488468`). The two batches coordinate only through files on
disk; topics were exchanged through `scratchpad/ssat-wv1{1,2}-work/TOPICS.txt` (no overlap).

## The owner's decision (via the coordinator)

Keep authoring SSAT reading fully by AI with the WV6 method, the only agent method a human has passed. The
co-founder's WV6 read (2026-10-10, human, `ssat-wv6-cofounder-2026-10-07`): 12/12 "only defensible"; blind
3/12 = 25.0% against a 25.0% control; realism 6 authentic, 6 "authored to a template" (both attitude
items, both vocabulary items, one main-idea, one inference).

**WV12 shares WV11's base and differs in the attitude construction**, so the two batches test different
fixes.

## Design

### Base (same as WV11)

- WV10's character-action attitude form, with:
  - the action at least one full sentence (`fullSentence`, unchanged);
  - no reply carrying irony or teasing (licensing prompt, below);
  - vocabulary sense sets that cannot overlap (`sensebuild` / `verify --senses`, agreement rule, unchanged);
  - attitude and vocabulary stems varied within SSAT's real phrasings: WV11's `ATT_FRAMES` and
    `VOC_FRAMES`, with the same no-two-units-share-a-frame rule within one `verify` call.

### The WV12 difference: the author's or narrator's attitude toward the subject

- **In at least 2 of the 3 batch units, the attitude item asks about the AUTHOR's or NARRATOR's attitude
  toward the subject**, in an essay, a memoir or a nature piece, never about a character's reaction.
- **The attitude must be licensed by at least two separate sentences of the passage**, in every version.
- Every unit declares `"attitude_form": "author" | "character"`. The result reports each unit's form and
  what happened to its attitude item at every stage, so it says which form held.

### What is kept from WV6/WV10, unchanged

- The five-version method (version k keys choice k; one question of each of the six kinds; the WV6 seed
  formula `k = sha256("ssat-wv-2026-10-06|" + frozenSha + "|" + passage_id)[0:8] mod 5`, after a freeze
  commit; never re-rolled).
- Pre-flight: mechanical verify + A1 + licensing (+ sense overlap), one fix round with fresh fixers, then
  the grouped screen (refuse a unit if any version receives >= 8/18 grouped picks; no repair after it).
- Stage 1 with-source graders (C, Q, dead-by-both; F and pilot-pass reported), Stage 2 naturalness against
  the same 7 Stage A live passages, Stage 3 options-only isolated against the 48 live control items,
  Stage 4 options-only grouped <= 40%. **Stop at the first deciding stage that fails.**

## Tooling (committed with this file; every rule break-tested below)

1. **`ssat-wv.mjs`, WV12 branch (ids `WV12-` only).** WV10's `characterActionStem` no longer applies to
   WV12 ids. A WV12 attitude stem must match exactly one frame of its declared form: `character` →
   WV11's `ATT_FRAMES`; `author` → the new `AUTHOR_FRAMES`, four phrasings taken from live SSAT stems:

   | frame | stem |
   |---|---|
   | `attitude-best` | `The <author/narrator/writer/essayist>'s attitude toward <subject> is best described as` |
   | `feeling-best` | `The <...>'s feeling(s) about <subject> is/are best described as` |
   | `regard` | `How does the <...> regard/view <subject>?` |
   | `conveys` | `In describing <subject>, the <...> conveys/expresses a feeling/sense of` |

   Vocabulary stems use WV11's `VOC_FRAMES`. No two units in one call share an attitude frame or a
   vocabulary frame. WV11 ids and every older id verify exactly as before.
2. **`ssat-wv12-rules.mjs check` (pre-flight; must be clean alongside `ssat-wv.mjs verify`):**
   - R1 `attitude_form` is `author` or `character`; an author unit's genre names an essay, memoir or nature piece.
   - R2 author frames are distinct across author units.
   - R3 every author-form attitude version declares `why` AND `why2`: two full sentences (>= 6 words,
     sentence start to sentence end), both verbatim in that version, touching no common sentence.
   - R4 no attitude choice in either form is an irony word (ironic, mocking, wry, sarcastic, sardonic).
   - R5 (`--lic`) for every author-form attitude version, BOTH licensing judges give `support`: two
     different sentences of >= 4 words, verbatim, touching no common sentence.
3. **`ssat-wv-consistency.mjs`** (report-only, below).
4. **`reading-cal.mjs wv5 <dir> ws 18`**: the Stage 1 scorer takes the pre-registered item count (it
   refused anything but 12). WV6's Stage 1 re-scores identically with the default.

## Licensing prompt (WV12; WV11's no-irony prompt, extended to the author's statements and to two support sentences)

> Open only `<lic-vK.json>`. Below are reading passages, each followed by five-choice questions. Answer
> each question as a careful expert test-taker, judging it against its own passage only. Read every
> character's action or reply, and every statement the author or narrator makes, LITERALLY: if an action,
> reply or statement could be taken as ironic, dry or teasing, and that reading would support a different
> choice than its literal reading, you must name that other choice as "second_defensible". For each give:
> "pick" (A-E); "second_defensible" (the letter of any other choice a careful reader could also defend from
> the passage, or "none"); "exclusions": for EVERY choice except your pick, a sentence (at least three
> words) copied exactly from the passage that rules that choice out; for a question about the author's or
> narrator's attitude, also "support": two DIFFERENT sentences, each copied exactly from the passage, that
> each show the attitude you picked; and a one-sentence "note". Return JSON {"labels": {"<question id>":
> {...}}}, one entry for every question id, to `<lic-vK.X.json>`. Do not open any other file, in the
> repository or anywhere else, and no web page. At the end, state which files you opened.

A question-version passes only if BOTH judges pick the key, name no second answer, give a verbatim
exclusion of >= 3 words for every other option, and (author form) satisfy R5. Each judge works in its own
scratch folder holding only its file.

## Break tests (all run before this commit)

**Licensing prompt, on WV9's round-1 licensing files v1 and v2** (narrator/author-tone attitude, the form
WV12 brings back; two fresh judges per file, `scratchpad/ssat-wv12-work/breaktest-lic/`, scored against
`ssat-wv9-batch/preflight/lic-round1/lic-key.json`):

| question-version | WV9 round 1 (old prompt) | WV12 prompt |
|---|---|---|
| WV9-P01 v1 (wistful) | refused, both judges (admiring) | **refused, both judges (admiring)** |
| WV9-P01 v2 (amused) | refused, both judges (critical) | **refused, both judges (critical)** |
| WV9-P03 v2 (worried) | refused, one judge (wistful) | **refused, one judge (wistful)** |
| WV9-P02 v1 (admiring) | passed | **refused, one judge (amused: "on his knees ... like everyone else" read as dry)** |
| WV9-P02 v2, WV9-P03 v1 (attitude) | passed | pass |
| all 6 vocabulary question-versions | passed | pass (12/12 judgements) |

It reproduces every known failure and stays silent on 8 of 12 question-versions, so it discriminates. It
is **stricter** than WV9's prompt (one new refusal, from the irony clause), which is the direction the
owner asked for. **R5 never fired on real judge output**: all 12 attitude judgements gave two valid
support sentences. On real data R5 is a completeness check whose discriminating power is unproven; it
refuses every constructed bad label in its selftest (one sentence, none, two spans of one sentence, a
non-verbatim sentence).

**Mechanical rules** (`node ssat-wv12-rules.mjs --selftest` 22/22; `node ssat-wv.mjs selftest-frames` still
all ok):
- the four author frames each match a live-style stem; a WV10 character stem, the WV9 tone stems ("In the
  final paragraph, the author's attitude is ...", "Which best describes the author's attitude toward the
  events in the passage?") are refused as author frames;
- real WV9-P01 and WV9-P02 post-fix units relabelled `WV12-T01/T02` as author form: `verify` refuses the
  stem (no frame) and `check` refuses the stem and every missing `why2`; WV10-P01 relabelled `WV12-T03` as
  character form raises no frame problem (it matches `suggests`);
- **mutation:** deleting the WV12 branch from `ssat-wv.mjs` removes the frame refusal on `WV12-T01`
  (27 problems → 26); `check` still refuses it.
- regression: WV6's two units verify OK with their A1 and licensing dirs; WV6's Stage 1 re-scores to the
  same C 11/12, Q 38/96, dead-by-both 6/12.

**Consistency scorer** (`node ssat-wv-consistency.mjs --selftest` 10/10): a planted channel reads +100, a
flat one 0, the marginal case (one of two judges sees the candidate keys fit) +50; a missing pair, a rating
outside 1-5, one judge, or an empty comparison cell each refuse rather than return a number. A dry build
on WV6's drawn batch plus PD v2 produced 20/20/20 candidate, 92/92 live and 60/60 ref pairs.

## Units, authors and selection

**Four fresh authors** (at most three agents at once), each given only `SSAT-WV12-AUTHOR-BRIEF.md` (copied
to its scratch folder) and its unit id:

| unit | genre | topic | attitude form | attitude frame | vocabulary frame |
|---|---|---|---|---|---|
| WV12-P01 | reflective essay | a town replacing its hand-painted street-name signs | author | `attitude-best` | `as-used` |
| WV12-P02 | memoir | a summer learning to keep honeybees with a neighbour | author | `feeling-best` | `closest` |
| WV12-P03 | narrative fiction | a teenager training a rescue dog for a county obedience trial | character | `shows` | `likely-means` |
| WV12-P04 | nature piece (spare) | chimney swifts roosting in an old school chimney | author | `regard` | `context` |

**The batch is the first THREE units by id that pass all of pre-flight** (stage 0 and the grouped screen).
P03 is the only character unit, so any three of the four contain at least two author-form units: the
WV12 difference holds however the selection falls. A fourth unit that also passes is kept on file, not
used. **With fewer than three passing units, stage 0 fails and the batch stops.**

**Authoring protocol** (WV5-WV11): authors see only the brief and write to
`scratchpad/ssat-wv12-work/authors/`; the orchestrator runs every check. **One fix round:** fresh fixers
get the PROBLEM lines verbatim plus the brief, nothing else, and quote kill spans using the exact listed
word. Any edit to passage text or a choice makes A1, licensing and sense judgements stale; they are re-run
fresh on the changed units. A unit still refused after that round fails stage 0. No repair after the
grouped screen.

## Stages and bars (18 items; relative bars by WV5's rule, `node reading-cal.mjs relbars 18`)

1. Stage 0 pre-flight → grouped screen → freeze commit → `ssat-wv.mjs draw` (with `--a1 --lic --senses`)
   → `build --natlive reading-cal/ssat/natlive.json` + the consistency render → **commit the renders
   before any grader or solver.**
2. Stage 1 C+F+Q (two fresh graders, `misread/prompts.md` §8 verbatim, path changed; `reading-cal.mjs
   wv5 <dir> ws 18`).
3. Stage 2 E (two fresh judges, SSAT pilot 3's neutral prompt verbatim with the count set to 10: 3 drawn
   candidates + the 7 Stage A live passages; `ssat-wv.mjs score --nat3`).
4. Stage 3 A (15 non-vocabulary candidates among the 48 live control items, siblings never adjacent;
   three fresh samples, pilot 4's prompt verbatim; `reading-cal.mjs wv5 <dir> iso`; `ssat-wv.mjs null`
   reported).
5. Stage 4 B (`grp-1..3.json`, three fresh samples, each opens all three; `ssat-wv.mjs score --grp`).

| bar | live (Stage A) | candidate bar | status |
|---|---|---|---|
| C exclusivity | 33/33 | **>= 17/18** | deciding |
| Q distractor >= plausible | 16/264 = 6.1% | **>= 7/144** labels | deciding |
| dead-by-both | 15/33 = 45.5% | **<= 10/18** | deciding |
| E naturalness | same judges, 7 live passages | candidate median **>=** live median (INVALID if live median 1) | deciding |
| A options-only isolated | in-run control on the 48 live items | **<= control + 10 pts**; INVALID unless control 10-45% | deciding |
| B options-only grouped | n/a | **<= 40%** (<= 21/54) | deciding |
| F easy, pilot-pass | 32/33, 1/33 | <= 18/18, >= 0/18 | reported only (cannot fail at n = 18) |

**Range checks.** C can fail at 16/18; Q at 6/144; dead-by-both at 11/18; E unless live median is 1; A has
>= 25 points of headroom under a 10-45% control; B spans 0-100%.

**The attitude stop rule (WV10/WV11, kept):** a post-draw Stage 1 grader who picks off key, or names a
second answer, on ANY attitude item stops the batch: nothing is inserted, even if C still clears 17/18.
The result names the form of the attitude item that failed.

## REPORT-ONLY: the consistency channel (`ssat-wv-consistency.mjs`; never a gate)

**Question (PD pilot v2, point 3):** do a passage's keys agree with each other more than its distractors
do?
- **Pairs:** two (question + one answer) statements from two different NON-vocabulary questions of one
  passage set, passage withheld. **KK** = key + key; **DX** = a distractor + a distractor (candidate: two
  different non-drawn worlds); **DS** (candidate only) = choice j of both questions, j != drawn k (one
  non-drawn world, coherent by construction).
- **Populations:** candidate (3 drawn units × 10 question pairs: 30 KK, 30 DS, 30 DX); the 48 live
  control items (10 passages, 92 question pairs: 92 KK, 92 DX); and a reference population, PD pilot v2's
  36 frozen items (6 sets: 60 KK, 60 DX), where every options-only solver *said* it used this channel. If
  the instrument cannot see a channel in PD v2, it is not read as clearing one anywhere.
- **Two fresh judges** rate every pair 1-5 with this prompt (fixed):
  > Open only `<consistency.json>`. Each entry shows two statements about ONE reading passage, each
  > written as a test question followed by one answer option. The passage is withheld, and you are not
  > told whether either option is correct. For each entry, rate how well the two answers fit together as
  > true statements about a single passage: 1 = they contradict each other or describe incompatible
  > situations; 2 = hard to reconcile; 3 = unrelated, neither supports nor contradicts the other; 4 = they
  > fit together naturally; 5 = they clearly describe the same story or argument. Return JSON {"labels":
  > {"<id>": {"r": <1-5>}}}, one entry for every id, to `<consistency.X.json>`. Do not open any other file,
  > in the repository or anywhere else, and no web page. At the end, state which files you opened.
- **Reported:** fit rate (rated 4-5) and mean by population and type; channel = KK fit − DX fit per
  population; for the candidate also KK − DS (does the drawn world fit together better than a non-drawn
  one? that is the channel a solver could exploit in this design).
- **When:** after the renders are committed, independent of the gates, so it is reported whatever stage
  the batch reaches. It never changes a verdict, a drop or an insert.
- **Known limit, stated now:** the candidate's DX pairs mix two worlds on purpose, so the candidate's
  KK − DX is expected to be large by construction and is not comparable to live's in meaning; KK − DS is
  the WV-relevant number. Two judges are two samples of one model.

## If every deciding stage passes

- Insert STAGED (`verified=false`) with `insert-ssat-wv.mjs` as cohort **`ssat-reading-wv12`** (the
  inserter gains a `--prereg` flag so `verify_meta` cites this file; it still refuses unless every stage
  is PASS). Never set `verified=true`.
- Prepare a co-founder sitting note and sitting prereg in the WV6 shape
  (`SSAT-WV12-SITTING.md`, `ssat-reading-wv12.SITTING.PREREG.md`). **Do NOT draw it:** the co-founder's
  account has an open ACT English run and only one open run is allowed.
- Ledger entry `ssat-reading-wv12-2026-10-11` and a REGISTER §5 line, in the result commit, whatever the
  outcome.

## Predictions (recorded so they can be wrong)

1. Stage 0 is the likeliest stop, on author-form licensing: the WV12 prompt refused 4 of 6 WV9 tone
   question-versions it saw. Two separate licensing sentences make an author version harder to read two
   ways, but neighbouring felt directions (wistful/admiring) are the old failure.
2. If stage 0 passes, the character unit's attitude item is more likely to hold through Stage 1 than the
   author units'.
3. Consistency channel: candidate KK − DS near 0; live KK − DX smaller than PD v2's.
