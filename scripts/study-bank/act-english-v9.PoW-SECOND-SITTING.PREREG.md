# act-english-v9 Production of Writing: co-founder second sitting (pre-registered 2026-10-19, NOT drawn)

**Committed before the run is drawn. A new pre-registration, as `act-english-v9.SITTING.PREREG.md`
requires for any change after its run existed.**

## Why this replaces the second reader
The v9 sitting (`act-en9-cofounder-*`) put PoW in the dead zone at 5/12, and that prereg sends a
dead zone to a SECOND READER on a fresh draw. Owner decision 2026-10-19 ("approve item 4"): the
co-founder takes the fresh draw himself instead of a second person. Recorded plainly: this is a
weaker design. Two readers test whether people in general can guess the items; one reader twice
tests whether THIS reader can. It does not repeat B1's failure mode exactly (B1 re-sat the SAME
items); these are 12 items he has never seen.

## The run
- run id `act-en9-pow2-cofounder-<draw date>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- 12 of the PoW items he has not seen (27 eligible); the draw excludes anything he has reviewed;
  flat four-wide deal, control 25.0% by construction (void and redraw if the printed control differs):

      DRAW_FAMILY=act DRAW_COHORT=act-english-v9 node scripts/study-bank/draw-review-run.mjs \
        "Production of Writing:12" 0 6ca6edaf-4044-4eed-84e0-137ebd79a81d act-en9-pow2-cofounder-<draw date>

- Queue position: after the SSAT release, TOEFL announcement and MAP reading sittings (one open run
  per reviewer).

## Decision rule (fixed now): both PoW sittings pooled, n=24
The pooled 24 use the cutoffs this test already uses for a 24-item domain (CSE in the v7/v8/v9 rule):

| pooled PoW correct (first 5 + this run) | verdict |
|---|---|
| <= 9 of 24 (this run <= 4 of 12) | CLEAN: release all 130 v9 rows (CSE already clean) |
| 10-14 | HOLD: nothing flips; report to the owner. No further sitting is pre-registered |
| >= 15 | ARCHIVE the v9 PoW rows; re-run form-capacity before anything flips |

- "Can't tell" scores wrong. Scored only when all 12 are answered; no rate over a prefix.
- Do not lower a bar to fit the data.
