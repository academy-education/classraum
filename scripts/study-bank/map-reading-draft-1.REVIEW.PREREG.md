# MAP Reading draft 1: co-founder sitting, pre-registered (2026-10-18, NOT drawn)

**Committed before the run is drawn.** Co-founder sitting #3, after the TOEFL announcement sitting.

## Why a release sitting, not a feedback run
The SSAT draft-1 review showed the AI options-only leak (83.9%) does not reach a person (human
6/36 = 16.7% vs 22.2% control). MAP draft 1 was written the same way (AI options-only 84.3% vs
41.7% control) and has never had a human sitting. Owner direction 2026-10-18: do every queued item.
MAP is not live, so "release" here means `verified=true` ready for launch; nothing reaches a student.

## The run
- run id `map-draft1-cofounder-<draw date>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- all 48 `map-reading-draft-1` rows (12 passages x 4, four choices), flat four-wide deal (control 25.0%):

      DRAW_FAMILY=map DRAW_COHORT=map-reading-draft-1 node scripts/study-bank/draw-review-run.mjs \
        "Informational Text:18,Literary Text:18,Vocabulary:12" 0 6ca6edaf-4044-4eed-84e0-137ebd79a81d map-draft1-cofounder-<draw date>

  (domains as stored: Informational 18, Literary 18, Vocabulary 12 = 48; the vocabulary items
  belong to the same 12 passages, so the per-passage rule counts across domains.)

## Release rule (fixed now)
1. **Batch guard:** blind >= 24/48 (50%, double the 25% control) -> nothing released, held whole.
2. Otherwise per item: "Only defensible" -> `verified=true`; flagged/rejected -> `archived=true`.
3. Per passage: 2 or more of a passage's 4 items flagged/rejected -> archive the whole passage.
4. Unanswered items stay staged.

## Known limits
One reader, n=48 (about +/-12 points). The grader-reported difficulty problem (items easier than
their target grade on 42 of 96 judgements) is NOT tested by this sitting; record his
Authentic/Authored and any "too easy" notes for the launch decision.

## Amendment 1 (2026-10-19, before any draw: 0 of 48 seen, no run exists)
Owner asked for a shorter sitting. Trimmed to 6 whole passages = 24 items, one or two per genre:
P01 fiction, P02 poetry, P06 folktale (Literary); P07 science, P09 history, P12 opinion
(Informational); each with its Vocabulary item. P03, P04, P05, P08, P10, P11 stay staged, unseen,
for a later sitting.

- **Draw:** the command above, unchanged (the draw tool picks items, not passages). Then, BEFORE he
  opens the run, delete that run's 24 rows whose items belong to P03/P04/P05/P08/P10/P11 and confirm
  24 rows remain, 4 per kept passage. Same procedure as the SSAT draft-1 Amendment 1 trim.
- **Control:** after the trim the deal is no longer flat. The control is the best fixed-slot score on
  the 24 remaining rows, per domain and overall, printed before he starts. If the overall control is
  above 9/24, delete the run and redraw before he is told (the guard below needs headroom).
- **Batch guard:** blind >= 12/24 (50%) -> nothing released, held whole.
- Rules 2-4 unchanged (per item, per passage at 2 or more of 4, unanswered stay staged).
- Known limit: n=24, about +/-17 points. Only the 24 reviewed items can be released by this sitting.

## Amendment 2 (2026-10-21, before the second draw: the remaining 24 items, 0 of them seen)
The first sitting (`map-draft1-cofounder-2026-10-20`, Amendment 1) released 24 (blind 5/24). The other six
passages, **P03, P04, P05, P08, P10, P11** (24 items, 4 each), get their own sitting under the same rules:

- **Draw:** the command above with run id `map-draft1b-cofounder-<draw date>`. The draw tool skips items the
  reviewer has already seen, so it can only take these 24; confirm 24 rows, 4 per passage, none from the first six.
- **Control:** best fixed-slot score on the 24, printed before he starts; above 9/24 -> delete and redraw.
- **Batch guard:** blind >= 12/24 -> nothing released, held whole. Rules 2-4 unchanged (per item; per passage at
  2 or more of 4 flagged; unanswered stay staged).
- Known limit as before (n=24, about +/-17 points), plus: he has now read 24 sibling items written to the same
  brief, the conservative direction for the guard.
- Draw counts (2026-10-21, before any row existed): the command above asks 18/18/12 and refused, since only the
  unseen 9 / 9 / 6 remain; drawn as `"Informational Text:9,Literary Text:9,Vocabulary:6"`. Same 24 items.
