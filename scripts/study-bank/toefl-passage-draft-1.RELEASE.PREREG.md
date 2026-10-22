# TOEFL Reading academic passage draft 1: co-founder RELEASE sittings, pre-registered (2026-10-22)

**Committed with the staged insert, before any run is drawn.**

## Why
Upper/hard Reading repeats after **20** clean sittings, bound by Academic Passage (`toefl-form-depth.ts`,
2026-10-22: 432 items in 106 sets, 18 per upper sitting, and only 16 of the 432 graded hard). One real
student on the hard route has completed 17 (`runout-monitor.ts`: 3 left). The band rule stays (owner,
2026-10-21: "We just need more questions"), so the fix is more medium/hard passages.

## The batch
`toefl-passage-draft-1.batch.json`: **30 items = 6 five-question passages** (archaeology: pottery
residues; astronomy: transits; psychology: the spacing effect; economic history: early printing; botany:
the contested "wood wide web"; linguistics: Norman French borrowing), 220-252 words, 15 medium / 15
hard, written in-session by Claude. Question types vary per set: vocabulary, detail, inference, purpose,
NOT/EXCEPT, main idea or paragraph function. **As first written the key was uniquely longest on 18/30**
(the known self-authoring tell); one distractor was lengthened on 11 items -> 7/30, and on 4 more so the
key is uniquely shortest on 5/30 instead of 1 (zero is the reverse tell). Keys dealt flat at insert,
8/8/7/7, because TOEFL rows are served in stored order. **Not run:** AI options-only attack, AI graders,
an independent with-source read (no agents).

## Runs and rule
`toefl-conv-draft-1.RELEASE.PREREG.md`'s rule (per-run and pooled 50% guard), set rule per PASSAGE: any
flagged item archives the whole passage (`release-toefl-conv-runs.mjs`, unchanged). Runs of 10 items
(2 passages, flat deal over 10 rows, control 25%) via `draw-toefl-conv-runs.mjs toefl-passage-draft-1`,
three runs. Queue: after the cr-v11 Choose a Response run 1 and talk run 2, ahead of the remaining
conversation drafts (the hard-route Listening binder, Academic Talk at 14, has more headroom for real
students than Reading at 20 with a student at 17).

## Known limits, stated before the number exists
- One reader, 10 items per run; the blind score is coarse.
- Reading is a family where model attacks saturate on world knowledge (CLAUDE.md 2026-09-21); the
  sitting's blind score and his per-item verdicts are the measurement.
- Several distractors were lengthened after drafting; a length-matched distractor can read as padded,
  which a reader may notice. Report it if he does.

## Queue order amendment (2026-10-22, before any run is drawn)
Run 1 moves ahead of talk run 2 (`cofounder-queue.json`): the hard-route Reading student is 3 clean tests
from a repeat (17 of 20), while the nearest hard-route Listening student is 5 (9 of 14). Order only.
