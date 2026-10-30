# ACT English v12: gate sheet (pre-registered 2026-10-31, before any packet, solver or grader)

The batch is frozen as written (sha256 prefix): `act-english-v12.batch.json` `61c2ab00`. It passes
`act-bank-helper.mjs check english` (100 items in 10 passages, "structure OK"). Authored in one Claude session.
The builders are kept in `act-en12-work/` for provenance: `common.py` (v11's, id prefix changed), `pa.py`–`pe.py`
(two passages each), `run.py`, `deal.py`, `stats.py`, `mixsearch.mjs`, and `dump-bank-text.mjs` (the name and topic
check against live and staged rows). Key positions were dealt flat by a seeded deck (`deal.py`, seed 20261101):
No Change stays first, and Point [A]–[D] placement options stay in order. That gives key index 25/25/25/25. The
batch file, not the builders, is the source of truth. Nothing is inserted, and nothing in the batch is edited after
this sheet. A dropped item stays dropped.

This gate copies `ACT-EN11-GATE.md` unchanged except for scale: 10 passages instead of 12, so 10 items per blind
file and three with-source renders (4 + 3 + 3 passages).

## What was written

| cohort | shape | mix | notes |
|---|---|---|---|
| act-english-v12 | 10 passages x 10 (ids `ACT-EN12-P<k>-Q<nn>`) | CSE 54 (54.0%) / PoW 30 (30.0%) / KoL 16 (16.0%); 6 type X (5/3/2: P1 P3 P4 P6 P8 P9) + 4 type Y (6/3/1: P2 P5 P7 P10) | Passages 306–380 words. Topics: the Wardian case, slime-mold networks, a print-shop summer (narrative), sea otters and kelp, the Delta Works, the carillon, Benjamin Banneker, a glassblowing class (narrative), later school start times (editorial), the first emoji. |

**Names and topics.** Every proper name and topic was checked against the text of all live and staged ACT, SSAT and
ISEE rows (590 passage groups, read 2026-10-31 by `dump-bank-text.mjs`) plus every local `act-english-v*.batch.json`.
Invented names (Ifeoma, Benedek, Esperanza Ruelas) and historical ones (Ward, Fortune, Nakagaki, Tero, Estes,
van Veen, Hemony, Denyn, Banneker, Ellicott, Kurita) occur zero times. "Robert" occurs once elsewhere (a different
surname). No topic keyword (Wardian, slime mold, kelp, otter as an animal, Delta Works, carillon, Banneker,
glassblowing, letterpress, school start, emoji) occurs in the bank.

**v11's lessons the brief applied (and how to check them):**

1. **No Change keyed on about a quarter of eligible items.** **21 of 81 eligible (25.9%)**: CSE 12/54, KoL 6/16,
   PoW 3/11 (transitions 3/10; the paragraph 2 introduction item in P7 offers No Change and does not key it).
   Every passage has 1 to 3.
2. **Varied boundary option casts.** 8 comma-splice or fused items. Keys: ", where" (1), "; instead," (1), ": " (1),
   "; " (2), ", so" (1), ", and" (1), ". " (1). The fused original appears on 2 (P3, P7); the fused form is a
   distractor on 3 more. A semicolon is the key on 4 items in all, one of them as No Change (P4-Q08).
3. **No tone items.** Every KoL item is idiom, precision, usage, or word choice in context. 10 are "word choice in
   context": reshaped, challenge, unexpected, admired, strange, assumed, swelled, shifts, fair, misread. None has a
   lone plain option among grandiose ones or three near-synonyms plus an outlier (checked by listing every KoL option
   set; "breaks" was replaced by "reverses" in P9-Q03 for that reason before the freeze).
4. **Every PoW option is passage-anchored.** Add, delete, purpose, introduction and conclusion options each name a
   real passage detail.
5. **v11's failure, addressed.** Six v11 PoW items were answerable from the stem because the key paraphrased the
   stem's stated purpose. In v12 every such item's distractors echo the same purpose or axis, and the key differs
   only in what the passage does:
   - essay purpose (P2, P6, P10): two Yes and two No options, each giving a specific reason on the stem's axis; the
     wrong reasons misstate the passage (P2: "senses where all the food lies"; P10: "forced Kurita to redraw").
   - conclusion (P1, P5, P9): all four options return to an earlier detail; three contradict the passage (P1: the
     moth "never hatched"; P5: van Veen's plan drawn "in the three weeks after the flood"; P9: a first bell at 7:50).
   - add sentence (P3, P5, P8, P10): no added sentence is off-topic on its face; P5, P8 and P10 anchor by position
     ("after the first sentence of paragraph 4") so the stem does not carry the relevant text. Keys: 2 Yes, 2 No.
     Two No keys rest on repetition of a fact stated in another paragraph (P3, P10), never in the quoted anchor.
   - delete sentence/phrase (P2, P4, P6, P7, P9): Kept and Deleted options share a stem-matching description and
     differ in the paragraph they cite. Keys: Kept 4, Deleted 1.
   - introduction (P4, P7): every option would introduce SOME paragraph of the essay.
6. **Length tell.** Among the 79 non-NC keys, the key is uniquely longest on 4 and uniquely shortest on 14 (17.7%).
   v11: 1 / 14.9%. Distractors were swapped before the freeze to bring shortest down from 25.

**Known risks the graders should be pointed at (recorded so they are not discovered after the fact):**
- P6-Q02 ("handles called batons, and"): whether the comma-less original is defensible as a two-item list.
- P6-Q10 (essay purpose): the Yes option listing Denyn's real achievements is accurate in detail.
- P8-Q06 (swelled): decided by paragraph 4 ("watch the bubble grow"), not by its own sentence.
- P9-Q07 (delete sentence): decided by paragraph 5's "8:30".
- P3-Q05 and P10-Q08 (add sentence, No-repeats): the competing Yes reasons are plausible in isolation.

**Mix and depth (read before releasing).** The live pool is 38 complete passages (15 x 4/4/2, 11 x 7/2/1,
6 x 5/3/2, 6 x 6/3/1); staged and queued are v11's 7 kept (4X 3Y) and v10's 4 kept (2X 2Y). A replay of
form-capacity's greedy draw over random orders (`act-en12-work/mixsearch.mjs`, 400 orders per row) with those 11
staged passages counted puts every X/Y split of 10 new passages at 10 forms on 398–400 of 400 orders, even after
losing 3. The chosen 6X+4Y: 400/400 with 0, 1, 2 or 3 lost. **That depends on v10 and v11 being released.** Without
them the pool is 38 + 10 = 48 passages, below the 50 that 10 forms need, whatever survives here.

## Spawns needed (25 fresh Claude agents; none may see the batch file, the key files, or another agent's output)

### 1. Blind split attack: a SCREEN, never a verdict

- **English:** 10 solvers, one per `scripts/study-bank/act-en12-f{1..10}.blind.json`. Each file has 10 items, one
  per passage (to be checked: 10 distinct groups per file). Built with `SPLIT=10 make-attack.mjs act-en12`.
- **Solver prompt** (the same for every file; fill `<FILE>`):

  > You will answer multiple-choice questions whose passage has been withheld. Read
  > `/Users/andylee/Downloads/saas/classraum/<FILE>` and nothing else in the repo. For every item, pick the option
  > you think is keyed, even if you must guess. Write `<FILE with .blind.json replaced by .solver-a.json>` as
  > `{"1":{"pick":"B","basis":"confident"|"guess","confidence":0-100,"why":"<one line: what in the stem or options decided it>"}, ...}`
  > covering every item. Do not open any other file. Claude only.

- **Score:** `node scripts/study-bank/score-attack.mjs act-en12-f<n> solver-a` for n = 1..10. **Read the `n` on its
  first line before the number.** Since 2026-10-31 this script exits 2 when it has no solver file (it used to print
  `mean NaN%` and exit 0). A line without `solver-a.json: k/10` is not a result.
- **English bar** (per domain, against the matched live control used for v7–v11: CSE 68.0%, PoW 66.7%, KoL 92.9%):
  flag a domain if it is above live + 15. KoL is report-only (7.1 points of headroom). A flag drops nothing; it is
  recorded, and the sitting oversamples that domain. For reference, v10 measured CSE 100% and PoW 86.7%, both
  flagged; v11 measured CSE 98.5% (flagged) and PoW 77.8%. CLAUDE.md records that this instrument saturates on ACT
  verbal, so the with-source half decides.

### 2. With-source key grade: DECIDES

- **Who:** 3 graders per render over the key-unmarked renders `act-en12-h1.ws.md` (P1–P4, 40 items),
  `act-en12-h2.ws.md` (P5–P7, 30 items), and `act-en12-h3.ws.md` (P8–P10, 30 items) (9 agents). Samples a and b are
  plain; sample c is adversarial. The renders are made by `act-english-v8-ws-render.mjs` from the selections
  `act-en12-work/h{1,2,3}.batch.json`. Selections, not edits.
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
- **Score:** `node scripts/study-bank/act-english-v8-ws-score.mjs scripts/study-bank/act-en12-h<n>` for n = 1..3.
  It reads `.ws.key.json` and `.grader-{a,b,c}.json` and refuses when a sample is missing. Confirm `scorable 40 of
  40` on h1 and `scorable 30 of 30` on h2 and h3.
- **Drop rules** (v9's, unchanged), per item:
  - drop if ANY sample's pick differs from the key
  - drop if 2 or more samples name the same second defensible option
  - for English PoW items that need the essay, drop if 2 or more samples mark `no_source_needed`. Every v12 PoW
    subskill matches the scorer's `NEEDS_ESSAY` pattern: transition, add sentence, delete sentence/phrase, sentence
    placement, essay purpose, introduction, conclusion.
- **A dropped item takes its whole passage** (English passages are exactly 10). No repair.
- **Cross-item findings** from grader c (for example "NC is never keyed", "the key is always the X-shaped option")
  are recorded and do not drop items. That is v10's and v11's practice. If grader c names a cross-item pattern,
  compare it with the counts in "What was written" before believing it.

### 3. Co-founder-standard pre-screen (the wave 7 practice)

- **Who:** 2 graders per render (6 agents): brief A
  (`scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-A.md`) and brief B (`.../COFOUNDER-BRIEF-B.md`), each
  applied to one of `act-en12-h{1,2,3}.ws.md`. The keyed letter for each item is supplied from `.ws.key.json` by
  the coordinator, as the briefs require a stated answer.
- **Output:** `scripts/study-bank/act-en12-prescreen-<A|B>-h<n>.json`, shaped like `act-en11-prescreen-A-h1.json`:
  `{"act-en12-h<n>": {"1": {"verdict": "unique"|"alternative"|"broken", "answer": "<letter>", "note": "..."}}}`.
- **Rule:** any flag is read by hand. A flag that both briefs name on the same item drops that item's passage.

## Release route (unchanged from v11, decided after the gate)

- **Staging:** survivors are inserted with `BANK_VERIFIED=false node scripts/study-bank/act-bank-helper.mjs insert
  english <kept batch> act-english-v12 --apply`. Read `verified` back after the insert.
- **Sitting:** v10 and v11 are queued for full sittings, so the v12 survivors go to a full co-founder sitting, not a
  spot. They enter `cofounder-queue.json` behind the runs already queued.
- **Kept file:** `act-english-v12.kept.batch.json` is a selection of whole passages from the frozen batch, never an
  edit.

## Packets (built after this sheet was written; nothing above changed except the count "10 are word choice in context", which read 9)

- Blind: `act-en12-f{1..10}.blind.json` / `.key.json` / `.part.json`, 10 items each, 10 distinct passages per file
  (checked). Key slots per file 3/3/2/2.
- With-source: `act-en12-h1.ws.md` (40 items, P1–P4), `act-en12-h2.ws.md` (30, P5–P7), `act-en12-h3.ws.md` (30,
  P8–P10), with `.ws.key.json`. Render key letters: h1 A10 B10 C12 D8; h2 A7 B7 C9 D7; **h3 A7 B10 C2 D11**. The
  renderer's seeded deal put C on only 2 of h3's 30 keys. It is a render artifact, not a batch property (batch key
  index is 25/25/25/25); if grader c on h3 names "C is rarely keyed", that is the cause.
- Break-tested before any spawn: `score-attack.mjs act-en12-f1 solver-a` exits 2 ("no solver file"), and
  `act-english-v8-ws-score.mjs act-en12-h1` exits 2 ("missing grader sample(s) a,b,c").
