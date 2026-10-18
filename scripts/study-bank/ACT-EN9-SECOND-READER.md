# ACT English v9: second reader for Production of Writing (prepared 2026-10-18, NOT drawn)

The prereg (`act-english-v9.SITTING.PREREG.md`, commit 5ad821dc) put PoW in the DEAD ZONE (5/12)
and requires a SECOND READER on a fresh draw of that domain. Grammar (CSE 9/24) is already clean.

## Who
Any careful English reader who is NOT the co-founder and has not seen these items. Needs an admin
login that can open /admin/bank-qc (owner to create or name it; Claude does not create accounts).

## Draw (once the reviewer's user id is known)

    DRAW_FAMILY=act DRAW_COHORT=act-english-v9 node scripts/study-bank/draw-review-run.mjs \
      "Production of Writing:12" 0 <reviewer user id> act-en9-pow-reader2-<draw date>

12 of the 27 PoW items the co-founder has not seen; flat deal, control 25%.

## Decision (the prereg's PoW cutoffs, unchanged)
- <= 4 of 12 correct: PoW clean -> release all 130 act-english-v9 rows (CSE already clean).
- >= 8 of 12: archive the v9 PoW rows; re-run form-capacity before anything else flips.
- 5-7 again: hold; report to the owner. No third reader is pre-registered.

## Message for the second reader

    Could you help with a 15-minute check? Sign in with the account I give you and open
    app.classraum.com/admin/bank-qc?tab=review. You'll see 12 questions, one at a time,
    showing only the four answer choices. Pick the one that looks right, even if guessing.
    Then the passage appears: mark whether there's exactly one right answer. That's it.
