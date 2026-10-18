# MAP Reading draft 1: co-founder sitting, pre-registered (2026-10-18, NOT drawn)

**Committed before the run is drawn.** Co-founder sitting #3, after the TOEFL announcement sitting.

## Why a release sitting, not a feedback run
The SSAT draft-1 review showed the AI options-only leak (83.9%) does not reach a person (human
6/36 = 16.7% vs 22.2% control). MAP draft 1 was written the same way (AI options-only 84.3% vs
41.7% control) and has never had a human sitting. Owner direction 2026-10-18: do every queued item.
MAP is not live, so "release" here means `verified=true` ready for launch; nothing reaches a student.

## The run
- run id `map-draft1-cofounder-<draw date>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- all 48 `map-reading-draft-1` rows (12 passages x 4, four choices), `DRAW_COHORT=map-reading-draft-1
  DRAW_FAMILY=map`, domain as stored on the rows, flat four-wide deal (control 25.0%).

## Release rule (fixed now)
1. **Batch guard:** blind >= 24/48 (50%, double the 25% control) -> nothing released, held whole.
2. Otherwise per item: "Only defensible" -> `verified=true`; flagged/rejected -> `archived=true`.
3. Per passage: 2 or more of a passage's 4 items flagged/rejected -> archive the whole passage.
4. Unanswered items stay staged.

## Known limits
One reader, n=48 (about +/-12 points). The grader-reported difficulty problem (items easier than
their target grade on 42 of 96 judgements) is NOT tested by this sitting; record his
Authentic/Authored and any "too easy" notes for the launch decision.
