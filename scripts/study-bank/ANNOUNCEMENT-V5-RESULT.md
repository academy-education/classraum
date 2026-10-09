# announcement-v5 — HELD at G4 (2026-10-09). Nothing graded, nothing inserted.

Pre-registration: `PREREG-ANNOUNCEMENT-V5-2026-10-09.md` (`9d6c33e4`, before any
item). Frozen batch `announcement-v5.batch.json` sha256
`669cacce8b98554b0bc4df52bd3c699bbfc65559f0722a7cf9d4ffefc3ac0497` (`9b069682`,
before any solver). 15 two-question sets / 30 items, five Claude (Opus) authors x 3.

## G0 pre-flight — clean
30 items / 15 sets; 90-170 words; every key on its commissioned length rank;
key uniquely longest 8/30, uniquely shortest 8/30; check-batch-joins clean over 30;
max Jaccard vs 121 live Announcement passages < 0.5.

## G1 no-passage attack — PASS
SPLIT=2 (one item per transcript per file), three Claude Haiku samples per file.

    candidate   27/90 picks = 30.0%   best-fixed-letter control 26.7%   margin +3.3   (bar <= +15)
    live ctrl   35/42 picks = 83.3%   control 28.6%   margin +54.8   (7 live two-sets; reported only)
    unanimous   candidate 17/30 = 56.7%   live control 11/14 = 78.6%

Items solved by all three samples: AN5-02-2, AN5-06-1, AN5-11-1, AN5-13-1, AN5-15-2.
The instrument discriminated on this run: the same samples read the live
two-sets at 83.3% and the candidates near the letter line.

Solver heuristics, verbatim:
- ann5-f1 sample a: institutional-default-selection (6), advance-notification-preference (2), modern-channel-preference-online-over-inperson (2), temporal-middle-ground-for-delays (1), central-location-preference (1), safety-prioritizes-waiting (1), professional-scheduling (1), tone-avoids-extreme-negatives (1)
- ann5-f1 sample b: Typical institutional logistics and advance-prep conventions (9 items); specific procedural tells in option wording like 'Room' numbers and dates (4 items); cautious elimination of obviously wrong choices (2 items)
- ann5-f1 sample c: location/timing specificity (7 confident), typical procedures/requirements (6 confident), proactive vs reactive framing (2 confident), announcement justification patterns (3 confident); 14 confident, 1 guess
- ann5-f2 sample a: Specificity to question constraints (item 1); typical institutional timing patterns (business hours 10-4, auditions 7:30, training 4pm); causal connection between stated reason and answer (kiln age→glaze, room size→no groups, no computers→bring laptops, early email→wrong dates); standard procedures and locations (cashier ground floor); directness of logical consequence (7 items confident based on tight question-answer link)
- ann5-f2 sample b: Office hours defaults (10–4): 2 picks. End-of-week events (Friday): 2 picks. Equipment age→quality variation: 1 pick. Direct consequence of stated fact (cramped, no computers, early email): 3 picks. Real-world availability (evening pickup): 1 pick. Standard info lookup (order number not card, phone not portal): 2 picks. Certain rejects on implausible times (6:30 a.m. bus, disregard all email): 2. Guess tier on pure scheduling (yoga day, briefing day, make-up day, DJ training): 4 picks.
- ann5-f2 sample c: Official procedure specificity (8pm service, bookstore hours, direct booking) - 5 picks; Practical logic (old kiln→uneven glaze, no computers→bring laptop, small room→group capacity) - 5 picks; Typicality (Friday auditions, Monday training, weekday briefings) - 5 picks

## G2 elimination — 9 of 15 sets drop, so G4 holds the batch
Rule as registered: an option certain-rejected by >= 2 of 3 samples drops its
set; **a key certain-rejected by any sample drops its set.**

    distractor certain-rejected by 2 samples   AN5-09 (09-2 C), AN5-10 (10-1 C)
    KEY certain-rejected by >= 1 sample        AN5-01, -02, -05, -06, -08, -11, -14
                                               (AN5-14-2's key by all three samples)

9 sets dropped > the G4 limit of 6 -> HOLD. G3 (with-source graders) was NOT run:
stop at the first failure.

## The finding: the key-reject clause was mis-specified, and it is not re-decided

The key-reject clause was mine; it is not in conv-hard-v2's G3 elimination rule
(distractors only). In an atypical-fact design the key is BY CONSTRUCTION the
option real-world priors reject (the loading dock rather than the car park, 6:30
rather than 8:15). A sample "certain-rejecting" the key is that design working:
the priors point away from the key, which is the reverse of a leak. 7 of the 9
drops are that. Under the conv-hard-v2 rule only AN5-09 and AN5-10 would have
dropped (13 sets to G3).

Per CLAUDE.md, a rule discovered after the number is applied to the NEXT batch,
never to this one. The frozen 30 items are not re-attacked, re-scored or
inserted. Also recorded: these Haiku samples marked certain-rejects freely (33 options
on 28 of 90 item-reads, 10 of them on the key; several on options that are merely atypical), not at
the 10-to-1 standard the brief asked for. The elimination signal from this
instrument is therefore noisy in BOTH directions.

## Next batch (not commissioned here)
Same method and briefs. G2 = distractor certain-rejected by >= 2 of 3 samples
only, key certain-rejects reported. Fresh sets; the 15 here stay held.
Sizing is unchanged: 6 kept two-sets take lower-path Listening 5 -> 8.
