# announcement-v6 — 28 of 30 STAGED (2026-10-09). Lower-path Listening projected 5 -> 11 on release.

Pre-registration `PREREG-ANNOUNCEMENT-V6-2026-10-09.md` (`dd7f1cfa`, before any item).
Tooling + G2 break-test `bd45a437`; frozen `announcement-v6.batch.json` sha
`bda8a6b742b360eecbd92870657605f429f886ac0268120a17323d34215c73b1` (`101736c2`, before any
solver or grader). 15 two-question sets / 30 items, five Claude (Opus) authors x 3.
Inserted file `announcement-v6.graded.json` (sha `c7c9d36a…`) = frozen + grader-median
`difficulty` only, every other field byte-identical (checked).

## What changed from v5
Only G2: conv-hard-v2's distractor-only rule. v5's "key certain-rejected by any sample"
clause is removed because the atypical-fact design makes the key the option priors reject.
Scorer break-tested on v5's frozen solver files: 27/90, 26.7%, +3.3 reproduced; drops exactly
AN5-09 and AN5-10; planted 2-sample distractor reject drops; 1-sample distractor and
3-sample KEY rejects do not; missing / unreadable / empty input exits 2 (7/7).

## G0 — clean
30/30, 15 sets; key uniquely longest 7/30, shortest 8/30; check-batch-joins clean;
Jaccard < 0.5 vs 121 live + 30 v5 passages; gate question-number / stem-duplicate clean.

## G1 no-passage — PASS
    candidate   32/90 = 35.6%   best-fixed-letter 26.7%   margin +8.9   (bar <= +15)
    kept 28     32/84 = 38.1%   (reported)
    live ctrl   30/42 = 71.4%   control 28.6%   +42.9   (7 live two-sets, fresh samples; reported)
    unanimous   candidate 13/30 = 43.3%   live 9/14 = 64.3%
Solved 3/3: AN6-02-2, -03-1, -04-1, -08-2, -11-1, -15-1.

## G2 elimination — 1 of 15 drops
    AN6-06   AN6-06-2: "Use the percussion studio before six" certain-rejected by 3 of 3
             (the stem says "Tuesday evening") — a real free elimination
Key certain-rejects, reported only: 9 items (AN6-12-1 by 3, AN6-07-1 by 2, seven by 1).
Under v5's clause these would have dropped 8 more sets (9 total -> G4 HOLD again).

## G3 with-source — 0 drops
Graders Opus / Sonnet / Sonnet: 90/90 picks on key. AN6-11-2 second answer (reassurance)
named by 2 graders, refuted by "So on Tuesday we'll try three impromptu rounds" — kept.
passage_needed=false on AN6-04-2, -09-1, -10-2, -14-2; none solved 3/3 blind, so no
corroborated drop. Cross-item: grader-c "key is the post-change arrangement" 24/30 and
"why-items key the next-sentence rationale" 8/8 — both need the transcript to apply, so not
no-source rules (precedent conv-hard-v2, 17/17 last-mentioned); recorded for the sitting.

## G4 — PASS (1 of 15 dropped <= 6). G5 kept difficulty easy 6 / medium 17 / hard 5.

## Insert — STAGED
`BANK_COHORT=announcement-v6 BANK_VERIFIED=false insert-listening`: 28 rows, 14 sets,
verified=false. Stored key slots A7 B9 C6 D6 (served shuffled).

## Depth (toefl-form-depth.ts, TRIALS=3)
    live (unchanged)        lower/easy 5   lower/medium 5   upper/medium 11   upper/hard 11
    projected (staged in)   lower/easy 11  lower/medium 12  upper/medium 16   upper/hard 11
Projected Announcement column 12/12/24/24; lower/easy now binds on Choose a Response (11),
upper/medium on arrange_words (16), upper/hard on conversation (11).

## Release
Co-founder sitting: 20 items = 10 whole sets, `DRAW_COHORT=announcement-v6
draw-review-run.mjs "Announcement:20" 20 <co-founder id> announcement-v6-cofounder-<date>`;
<= 8/20 release, >= 12/20 archive, 9-11 second reader. NOT drawn today:
`ssat-wv6-cofounder-2026-10-07` is open (12 of 12 unseen) and act-english-v9 is queued.
