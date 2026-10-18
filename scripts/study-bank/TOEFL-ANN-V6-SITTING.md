# Co-founder sitting #2: TOEFL Listening announcements (prepared 2026-10-18, NOT drawn)

Release rule: pre-registered in `PREREG-ANNOUNCEMENT-V6-2026-10-09.md` (v5's rule) and restated in
`ANNOUNCEMENT-V6-RESULT.md` §Release. Nothing below changes it.

## Draw (only once `bank-state.mjs open` shows no open run for support@classraum.com)

    DRAW_COHORT=announcement-v6 node scripts/study-bank/draw-review-run.mjs \
      "Announcement:20" 20 6ca6edaf-4044-4eed-84e0-137ebd79a81d announcement-v6-cofounder-<draw date>

20 items = 10 whole announcement sets, flat key deal (control 25%).

## Decision (fixed 2026-10-09)
- <= 8 of 20 blind correct: release all 28 staged announcement-v6 items (`verified=true`).
- >= 12 of 20: archive the cohort.
- 9-11: a second reader sits a fresh draw.
- Any item marked "Another is also defensible" / "No unique answer" is archived regardless.
Then re-run `npx tsx scripts/study-bank/toefl-form-depth.ts` (projected lower path 5 -> 11).

## Message to the co-founder

    Next sitting: 20 TOEFL Listening questions (short announcements), about 20 minutes.
    Same as always: sign in as support@classraum.com, open app.classraum.com/admin/bank-qc?tab=review.
    Pick an answer from the choices alone, even if guessing; then the transcript and answer appear.
    Mark whether there's one right answer, and add a short note on anything odd.
