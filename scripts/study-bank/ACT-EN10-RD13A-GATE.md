# ACT English v10 + ACT Reading v13a: gate sheet (pre-registered 2026-10-29, before any solver or grader runs)

Batches are frozen as committed (sha256 prefixes): `act-english-v10.batch.json` `2d6b3547`,
`act-reading-v13a.batch.json` `906b7860`. Both pass `act-bank-helper.mjs check`. Authored in one Claude session.
The builders are kept in `act-en10-rd13a-work/` for provenance. Key positions were then dealt flat by a seeded
shuffle (No Change kept first, placement points kept in order), so the batch files, not the builders, are the
source of truth. Nothing is inserted. Nothing in either batch is edited after this commit; a dropped item stays
dropped.

## What was written

| cohort | shape | mix | notes |
|---|---|---|---|
| act-english-v10 | 5 passages x 10 (ids `ACT-EN10-P<k>-Q<nn>`) | CSE 27 (54%) / PoW 15 (30%) / KoL 8 (16%); 3 type X (5/3/2) + 2 type Y (6/3/1) | Semicolon is the key on 3 boundary items (the v9 pre-flight found "a semicolon is never right" across that cohort). No Change keyed 6 of 38. Key uniquely shortest 7/50, uniquely longest 0/50. Passages 305-333 words. |
| act-reading-v13a | 4 passages x 9 (ids `ARV13a-NN`), lit / soc sci / humanities / nat sci | KID 17 (47%) / C&S 11 (31%) / IKI 8 (22%) | Paired passage = natural science (v12a paired humanities, v12b social science). Passages 689-740 words; paired parts 342 / 322. Keys 9/9/9/9. |

The v9 English hold was PoW guessability (co-founder 10/24 no-passage). In v10 every PoW option is passage-anchored:
transition distractors each fit the quoted sentence alone; goal, add, delete and purpose options each name a real
passage detail; and the key is never the only option echoing the stem.

## Spawns needed (29 fresh Claude agents; none may see the batch file, the key files or another agent's output)

### 1. Blind split attack: a SCREEN, never a verdict

- **English:** 10 solvers, one per `scripts/study-bank/act-en10-f{1..10}.blind.json` (5 items each, one per passage).
- **Reading:** 9 solvers, one per `scripts/study-bank/act-rd13a-f{1..9}.blind.json` (4 items each, one per passage).
- **Solver prompt** (the same for every file; fill `<FILE>`):

  > You will answer multiple-choice questions whose passage has been withheld. Read
  > `/Users/andylee/Downloads/saas/classraum/<FILE>` and nothing else in the repo. For every item, pick the option
  > you think is keyed, even if you must guess. Write `<FILE with .blind.json replaced by .solver-a.json>` as
  > `{"1":{"pick":"B","basis":"confident"|"guess","confidence":0-100,"why":"<one line: what in the stem or options decided it>"}, ...}`
  > covering every item. Do not open any other file. Claude only.

- **Score:** `node scripts/study-bank/score-attack.mjs act-en10-f<n> solver-a` (and `act-rd13a-f<n>`).
- **English bar** (per domain, against the matched live control v7–v9 used: CSE 68.0%, PoW 66.7%, KoL 92.9%): flag
  if a domain is above live + 15. KoL is report-only (7.1 points of headroom). A flag drops nothing; it is recorded
  and the sitting oversamples that domain.
- **Reading:** report-only. CLAUDE.md records that the model attack saturates on ACT Reading (shipped bank 96.3%
  by model, 10% by a person), so no number from it is a verdict.

### 2. With-source key grade: DECIDES

- **Who:** 3 graders per cohort over the key-unmarked renders `act-en10-h1.ws.md` and `act-rd13a-h1.ws.md`
  (6 agents): samples a and b plain, sample c adversarial.
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
- **Score:** `node scripts/study-bank/act-english-v8-ws-score.mjs scripts/study-bank/act-en10-h1` (and
  `act-rd13a-h1`). It reads `.ws.key.json` and `.grader-{a,b,c}.json`.
- **Drop rules** (v9's, unchanged), per item:
  - drop if ANY sample's pick differs from the key
  - drop if 2 or more samples name the same second defensible option
  - for English PoW items that need the essay, drop if 2 or more samples mark `no_source_needed`
- **A dropped item takes its whole passage** (English passages are exactly 10, Reading passages exactly 9). No repair.

### 3. Co-founder-standard pre-screen (the wave 7 practice)

- **Who:** 2 graders per cohort (4 agents). Brief A
  (`scripts/study-bank/cofounder-grader/COFOUNDER-BRIEF-A.md`) and brief B (`.../COFOUNDER-BRIEF-B.md`), each
  applied to both renders.
- **Output:** per item, "Only defensible" or a flag with the reason.
- **Rule:** any flag is read by hand. A flag both briefs name on the same item drops that item's passage.

## Release route (unchanged, decided after the gate)

- **Staging:** survivors are inserted `BANK_VERIFIED=false` and routed like wave 7.
- **English v10:** ACT English v9 is still held on PoW, so the v10 survivors go to a full co-founder sitting, not a spot.
- **Reading v13a:** spot one passage chosen by sha256 mod 4.
- **Queueing:** both enter `cofounder-queue.json` behind the open ACT Science blind-only runs. Nothing is drawn
  while a run is open.
