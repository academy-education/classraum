# iTEP SLATE: co-founder pre-release audit draw (prepared 2026-10-31)

Every iTEP row is staged (verified=false) and the test is hidden. Before any iTEP cohort is released, Daniel sits a
short audit sample of it, the same shape as the SSAT/MAP audit (`agent-review/AUDIT-DRAW.md`).

## When

Daniel has `agentreview-audit2-cofounder-2026-10-30` open (21 of 21 unseen on 2026-10-31), and only one run may be
open. Draw this run as soon as audit2 closes, before anything in the queue. `cofounder-queue.json` carries it as
`nextManualDraw`. While that field is there, `draw-next.mjs` prints this command and draws nothing else. Remove the
field once the run is drawn.

Queue check (2026-10-31): nothing else was pending as a manual draw. Audit2 was the last `nextManualDraw` and was
removed when it was drawn, and there is no `thenManualDraw`. Putting this draw first holds the queue's first entry back
by one run and changes nothing else.

## The command (from the repo root)

    node scripts/study-bank/draw-review-run.mjs '*' 33 6ca6edaf-4044-4eed-84e0-137ebd79a81d itep-audit-cofounder-2026-10-31 --ids-file=scripts/study-bank/itep-audit/audit-sample.ids.json --cohort=itep-grammar-v1:2,itep-grammar-v2:5,itep-grammar-v3:3,itep-reading-v1:5,itep-reading-v2:6,itep-listening-v1:1,itep-listening-v2:7,itep-listening-v3:4

`--ids-file` / `--cohort` / `--dry` are the CLI forms of `DRAW_IDS_FILE` / `DRAW_COHORT` / `DRAW_DRY=1`. The ids file
limits each cohort's pool to the chosen ids. Each cohort's count equals its number of ids, so the draw is fully
determined, and the file's order is the sitting order within each cohort.

Checked on 2026-10-31:
- With Daniel's id the drawer refuses on audit2.
- A dry run under a dummy reviewer (`00000000-0000-0000-0000-000000000000`, `--dry`) gave exactly 2/5/3/5/6/1/7/4
  reviewable items per cohort and 33 rows. The 5 error-identification rows came out FIXED with `shown [0,1,2,3]`. The
  other 28 were dealt flat (A7 B7 C7 D7). Overall key letters were A7 B8 C9 D9, so the control is 27.3%.
- Break test: with no ids file, the same cohorts showed 23/176/87/15/114/49/91/8 reviewable.
- With the fixed-order code disabled, the 5 error-identification rows were shuffled (`shown [3,1,2,0]` and so on).

## The sample: 33 items, 8 cohorts, seeded ("itep-audit-2026-10-31")

Picked by `itep-audit/itep-audit-sample.mjs --write`. The plan is fixed in the script, and the seed picks only which
items. Every pick is an item Daniel has never been served (he had seen 1,272 items, none of them iTEP). A passage is
picked only if it is complete and all of its items are unseen. Ids are in `audit-sample.ids.json`, and the plan is in
`audit-sample.json`.

| order | cohort | part | items | unit |
|---|---|---|---|---|
| 1 | itep-grammar-v1 | Part 1 completion | 1 | |
| 1 | itep-grammar-v1 | Part 2 error identification | 1 | |
| 2 | itep-grammar-v2 | Part 1 completion | 3 | |
| 2 | itep-grammar-v2 | Part 2 error identification | 2 | |
| 3 | itep-grammar-v3 | Part 1 completion | 1 | |
| 3 | itep-grammar-v3 | Part 2 error identification | 2 | |
| 4 | itep-reading-v1 | Part 1 short text | 1 | one text |
| 4 | itep-reading-v1 | Part 2 intermediate passage | 4 | itep-reading-v1-ITR1-B-P2 (whole) |
| 5 | itep-reading-v2 | Part 3 advanced passage | 6 | itep-reading-v2-ITR2-H-P3A (whole) |
| 6 | itep-listening-v1 | Part 1 dialogue | 1 | one dialogue |
| 7 | itep-listening-v2 | Part 1 dialogue | 1 | one dialogue |
| 7 | itep-listening-v2 | Part 3 lecture | 6 | itep-listening-v2-ITL2-F-L (whole) |
| 8 | itep-listening-v3 | Part 2 conversation | 4 | itep-listening-v3-ITL3-B-C (whole) |

Totals: Grammar 10 (5 completion, 5 error identification), Reading 11, Listening 12.

Deviation from the "about 10 each" target: each reading and listening unit is served whole, so Daniel reads or hears
each one once. One Part 1 text + 4 + 6 makes 11 for Reading. One lecture (6) + one conversation (4) is already 10 for
Listening, and the two dialogues bring it to 12. Every staged cohort is sampled at least once.

## What the panel shows (checked 2026-10-31, `ReviewPanel-itep.test.tsx`)

- **Blind phase:** options only, as for every family. No stem, passage, transcript or audio, so a listening item's
  transcript is never on screen before he answers.
- **Error identification:** the options stay in the sentence's A-D order, both in the blind phase and in the reveal.
  The reveal draws `[A: ...]` as underlined segments with the letter under each, as the test prints them.
- **Listening reveal:** uses the student audio player (TTS on first play, W/M voices pinned, up to 3 plays). The
  transcript sits behind the player's "show transcript" toggle, so he hears the item before he reads it.
- **Reading reveal:** shows the whole passage as text with its paragraph breaks, unchanged from SSAT. Each item of a
  passage shows the same passage again.

## After it closes

1. Classify the run's notes into `cofounder-notes.json` (the usual ledger step).
2. Release rule, stated before the sitting: a cohort releases only if every sampled item from it is `unique` with no
   would_block note. Any miss holds that cohort. Releasing means setting verified=true **and** un-hiding iTEP SLATE
   (migration 131 topic rows are on every hidden list), and both need the owner's go. No iTEP release script exists
   yet. `agent-review-release.mjs` reads `agent-review/results*`, not this sample.
3. Separate from this audit: the REGISTER says the next iTEP listening round must cut brief v2 (`one_template`
   blocking). This audit does not settle that.
