# ACT English v11: gate sheet (pre-registered 2026-10-31, before any solver or grader runs)

The batch is frozen as written (sha256 prefix): `act-english-v11.batch.json` `18a51961`. It passes
`act-bank-helper.mjs check english` (120 items in 12 passages, "structure OK"). Authored in one Claude session.
The builders are kept in `act-en11-work/` for provenance: `common.py`, `pa.py`–`pf.py`, `run.py`, `deal.py`,
`stats.py`, and the two length patches `patch1.py`/`patch2.py`, which were applied before the freeze. Key positions
were then dealt flat by a seeded deck (`deal.py`, seed 20261031): No Change stays first, and Point [A]–[D]
placement options stay in order. That gives key index 30/30/30/30. The batch file, not the builders, is the source
of truth. Nothing is inserted, and nothing in the batch is edited after this sheet. A dropped item stays dropped.

This gate copies `ACT-EN10-RD13A-GATE.md` (English half) unchanged except for scale: 12 passages instead of 5,
so 12 items per blind file and three with-source renders of 4 passages each.

## What was written

| cohort | shape | mix | notes |
|---|---|---|---|
| act-english-v11 | 12 passages x 10 (ids `ACT-EN11-P<k>-Q<nn>`) | CSE 65 (54.2%) / PoW 36 (30.0%) / KoL 19 (15.8%); 7 type X (5/3/2: P1 P3 P4 P6 P8 P9 P11) + 5 type Y (6/3/1: P2 P5 P7 P10 P12) | Passages 302–350 words. Genres: publishing history, octopus camouflage, first-job narrative, desire paths, the Great Stink, crossword history, periodical cicadas, adult-swimmer narrative, library-of-things editorial, Mary Anning, the Bayeux embroidery, railroad standard time. |

**Lessons from v9 and v10 that the brief applied (and how to check them):**

1. **No Change keyed on about a quarter of eligible items.** v10's adversarial grader found NC keyed on only 5 of
   about 45 eligible items. v11 keys NC on **26 of 95 eligible (27.4%)**: CSE 19/65, KoL 2/19, PoW transitions 5/11.
   Every passage has 2 or 3 (P10 has 2 of 7).
2. **Varied boundary option casts.** There are 11 comma-splice or fused items. The keys are: ", but" (1), "; " (2),
   ", and" (1), ". " (2), ", whereas" (1), ": " (3), and ", by which time" (1). Distractors include ", however,",
   ", yet,", "; whereas", ", nevertheless", "; but", ", therefore", ", being that", ", although", ", because",
   ", so", "; and", and the fused form (5 of 11, not all). A semicolon is the key on 4 boundary items (2 as No
   Change), against v9's "a semicolon is never right".
3. **No tone items.** Every KoL item is precision, idiom, concision, or word choice. Seven are "word choice in
   context" items, where the surrounding sentence or paragraph decides: reckless, opposite, patience, modest,
   unusual, monopolizing, a defense.
4. **Every PoW option is passage-anchored** (v9's hold). Add, delete, and purpose options each name a real passage
   detail. Transition distractors each fit the quoted sentence alone. The three introduction items and the
   paragraph-3 conclusion item name a paragraph, not a property, so the stem does not name the key's axis. Keys
   alternate: Yes 6 / No 6 / Kept 5 on the whole-sentence options.
5. **Length tell.** Among the 94 non-NC keys, the key is uniquely longest on 1 and uniquely shortest on 14 (14.9%).
   v9 measured 4.7% / 15.3%.

**Mix fragility (read before releasing).** The live pool is 38 complete passages plus one group of 9 items
(read 2026-10-31: 15 x 4/4/2, 11 x 7/2/1, 6 x 5/3/2, 6 x 6/3/1). Ten forms need 50 passages, so the 12 new ones
are the arithmetic minimum, with zero slack. A replay of form-capacity's greedy draw over random orders
(`act-english-v9-mixsearch.mjs` with the live base updated and the self-check removed, because random orders of
the 38-passage pool give 6 or 7 forms) puts 7X+5Y at:

- 10 forms on 434 of 1000 orders when no passage is lost
- 9 forms on every order once one passage is lost

So v11 alone reaches 10 only if every passage clears **and** form-capacity's real group order is a good one. A
gate drop means the floor needs v10's kept passages, v9, or more passages.

## Spawns needed (25 fresh Claude agents; none may see the batch file, the key files, or another agent's output)

### 1. Blind split attack: a SCREEN, never a verdict

- **English:** 10 solvers, one per `scripts/study-bank/act-en11-f{1..10}.blind.json`. Each file has 12 items, one
  per passage (checked: 12 distinct groups per file). Built with `SPLIT=10 make-attack.mjs act-en11`.
- **Solver prompt** (the same for every file; fill `<FILE>`):

  > You will answer multiple-choice questions whose passage has been withheld. Read
  > `/Users/andylee/Downloads/saas/classraum/<FILE>` and nothing else in the repo. For every item, pick the option
  > you think is keyed, even if you must guess. Write `<FILE with .blind.json replaced by .solver-a.json>` as
  > `{"1":{"pick":"B","basis":"confident"|"guess","confidence":0-100,"why":"<one line: what in the stem or options decided it>"}, ...}`
  > covering every item. Do not open any other file. Claude only.

- **Score:** `node scripts/study-bank/score-attack.mjs act-en11-f<n> solver-a` for n = 1..10. **Read the `n` on its
  first line before the number.** With no solver file, this script prints `mean NaN%` and lists every item as
  "solved by all", and it exits 0 (seen 2026-10-31 while building these packets). A line without
  `solver-a.json: k/12` is not a result.
- **English bar** (per domain, against the matched live control used for v7–v10: CSE 68.0%, PoW 66.7%, KoL 92.9%):
  flag a domain if it is above live + 15. KoL is report-only (7.1 points of headroom). A flag drops nothing; it is
  recorded, and the sitting oversamples that domain. For reference, v10 measured CSE 100% and PoW 86.7%, both
  flagged. CLAUDE.md records that this instrument saturates on ACT verbal, so the with-source half decides.

### 2. With-source key grade: DECIDES

- **Who:** 3 graders per render over the key-unmarked renders `act-en11-h1.ws.md` (P1–P4), `act-en11-h2.ws.md`
  (P5–P8), and `act-en11-h3.ws.md` (P9–P12), 40 items each (9 agents). Samples a and b are plain; sample c is
  adversarial. The renders were made by `act-english-v8-ws-render.mjs` from the selections
  `act-en11-work/h{1,2,3}.batch.json`. Selections, not edits.
- **Grader prompt** (plain; fill `<RENDER>`):

  > You are a with-source grader for a staged ACT batch. Read
  > `/Users/andylee/Downloads/saas/classraum/<RENDER>` (passages plus items, key not marked) and nothing else. For
  > every item, answer from the passage, then write `<RENDER minus .ws.md>.grader-<a|b|c>.json` as
  > `{"1":{"pick":"B","second_defensible":null|"C","no_source_needed":true|false,"single_sentence":true|false,"difficulty":"easy|medium|hard","note":"<one line>"}, ...}`.
  > - `second_defensible`: a letter only if a careful student could defend it under a standard rule.
  > - `no_source_needed`: true if the stem and options alone decide the key without the essay or passage.
  > - `single_sentence`: true if one sentence of the passage settles it.
  >
  > Claude only, no database, and write only your own file.

- **Adversarial c:** the same, plus "Assume each item has a defect: look hardest for a second defensible option, a
  distractor that is true of the passage for the asked purpose, a key you can choose without the passage, and any
  pattern across items that picks the key."
- **Score:** `node scripts/study-bank/act-english-v8-ws-score.mjs scripts/study-bank/act-en11-h<n>` for n = 1..3.
  It reads `.ws.key.json` and `.grader-{a,b,c}.json` and refuses when a sample is missing (checked: exit 2 before
  any grader ran). Confirm `scorable 40 of 40` on each.
- **Drop rules** (v9's, unchanged), per item:
  - drop if ANY sample's pick differs from the key
  - drop if 2 or more samples name the same second defensible option
  - for English PoW items that need the essay, drop if 2 or more samples mark `no_source_needed`. Every v11 PoW
    subskill matches the scorer's `NEEDS_ESSAY` pattern: transition, add sentence, delete sentence/phrase, sentence
    placement, essay purpose, introduction, conclusion.
- **A dropped item takes its whole passage** (English passages are exactly 10). No repair.
- **Cross-item findings** from grader c (for example "NC is never keyed", "the key is always the X-shaped option")
  are recorded and do not drop items. That is v10's practice. If grader c names a cross-item pattern, compare it
  with the counts in "What was written" before believing it.

### 3. Co-founder-standard pre-screen (the wave 7 practice)

- **Who:** 2 graders per render (6 agents): brief A
  (`scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-A.md`) and brief B (`.../COFOUNDER-BRIEF-B.md`), each
  applied to one of `act-en11-h{1,2,3}.ws.md`. The keyed letter for each item is supplied from `.ws.key.json` by
  the coordinator, as the briefs require a stated answer.
- **Output:** `scripts/study-bank/act-en11-prescreen-<A|B>-h<n>.json`, shaped like `act-en10-rd13a-prescreen-A.json`:
  `{"act-en11-h<n>": {"1": {"verdict": "unique"|"alternative"|"broken", "answer": "<letter>", "note": "..."}}}`.
- **Rule:** any flag is read by hand. A flag that both briefs name on the same item drops that item's passage.

## Release route (unchanged from v10, decided after the gate)

- **Staging:** survivors are inserted with `BANK_VERIFIED=false node scripts/study-bank/act-bank-helper.mjs insert
  english <kept batch> act-english-v11 --apply`. Read `verified` back after the insert. v10's survivors went in
  live by mistake on 2026-10-30.
- **Sitting:** v9 is held on PoW and v10 is queued for a full sitting, so the v11 survivors go to a full co-founder
  sitting, not a spot. They enter `cofounder-queue.json` behind the runs already queued.
- **Kept file:** `act-english-v11.kept.batch.json` is a selection of whole passages from the frozen batch, never an
  edit.
