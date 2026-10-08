# act-english-v9 — pre-registration (written 2026-10-08, before any item exists)

Purpose: ACT English is at 7 forms (39 drawable passages, all used:
15 `act-english-v1` at CSE 4 / PoW 4 / KoL 2, 12 `act-english-v7` at 7/2/1,
6 + 6 `act-english-v8` at 5/3/2 and 6/3/1; `form-capacity.mjs` 2026-10-08:
"all 7 forms drawable inside every range"). Goal: +2-3 forms. Method: the v7/v8
brief and gate, unchanged in substance (see "What changed from v8" below, which
is the list the spot-check rule needs).

## Target mix (derived, not chosen)

`ENGLISH_QUOTAS` on a 50-item form, as counts: CSE 26-28, PoW 15-16, KoL 7-9.
All 39 live passages are already consumed by the 7 forms, so every new form is
drawn from the leftovers of a fresh greedy replay plus the new passages.

Searched with `act-english-v9-mixsearch.mjs` (committed with this file): a replay
of `form-capacity.mjs`'s sequential greedy DFS over random passage orders, the
live pool hard-coded from a DB read on 2026-10-08 and self-checked (the live pool
alone replays to 7 forms on 50/50 orders, matching form-capacity). Over designs
of X = 5/3/2 and Y = 6/3/1 passages:

| new passages | best designs | P(>= 10 forms), none lost | lose 1 | lose 2 |
|---|---|---|---|---|
| 12 | 4-12 X | 68-79% | 35-41% | 0% |
| 15 | 9-11 X + 6-4 Y | 99.6-99.8% | 99.0-99.6% | 94-96% |

12 new passages buy 10 forms only when none is lost and the draw order is kind;
15 is the smallest count that holds 10 forms through a two-passage loss.
Chosen: **15 passages, 10 type X (CSE 5 / PoW 3 / KoL 2) + 5 type Y
(CSE 6 / PoW 3 / KoL 1)** = 150 items (CSE 80 / PoW 45 / KoL 25). Five authors,
each 2 X + 1 Y (CSE 16 / PoW 9 / KoL 5 per author). Projection for the chosen
design (1000 random orders): none lost 10 forms on 993 / 9 on 7; lose 1:
991 / 9; lose 2: 946 / 54; lose 3: 782 / 218; lose 5: 9 forms on 997.

## Bars, fixed before results (v8's, restated)

1. **Structure / pre-flight** — `act-bank-helper check english` exits 0 per author
   file (authors iterate on this themselves BEFORE freeze). After freeze,
   `act-english-v9-preflight.mjs` over all 150 (the v8 pre-flight with only the
   per-passage type map changed): per-passage mix as assigned; any key slot > 35%
   after the make-attack deal; key uniquely longest OR uniquely shortest in > 25%;
   NO CHANGE keying outside 15-35% of items that offer it; any placement letter
   never keyed; Kept/Yes polarity outside 30-70%; semicolon the key on > 35% of
   boundary-punctuation items; duplicate options; option starting with
   punctuation; a quoted span absent from its passage. **Any refusal = STOP.**

2. **Duplicate scan** — `act-english-v8-dupscan.mjs 150` (unchanged) against every
   non-archived ACT English row, verified and staged (440 rows / 44 passages on
   2026-10-08), paged with ORDER BY + distinct-id assertion, refusing under 300
   rows; break-test `PLANT=1` must flag. Passage token-Jaccard >= 0.30 or a shared
   title = FLAG, read by hand. A flagged passage that is read as the same topic
   is **dropped** (v8 re-authored before the gate; v9 makes no change after
   freeze). Stem flags from the house transition template are read, not dropped.

3. **Blind split attack — a SCREEN, never a verdict.** SPLIT=10, one item per
   passage per file (15 items per file), a fresh Claude solver per file, the v8
   solver prompt verbatim. Per domain against the same matched live control v7
   and v8 used (actlive-score.mjs, 2026-09-12): CSE 68.0% (n=25), PoW 66.7%
   (n=21), KoL 92.9% (n=14). Ceiling: CSE/PoW leave 32/33 points so a +15 bar
   can fire; KoL leaves 7.1 and is REPORT-ONLY. Flag = domain rate > live + 15.
   A flag drops nothing (repairing to the instrument is fitting). Expected: CSE
   flags as in v7 and v8, where the co-founder then scored 16.7% and 29.2%.

4. **With-source key grade — DECIDES.** Three independent Claude samples per item
   over key-unmarked renders (`act-english-v8-ws-render.mjs`, unchanged:
   `act-en9-h1` = files a+b, `act-en9-h2` = c+d, `act-en9-h3` = e), the v8
   grader prompts verbatim (a, b plain; c adversarial), scored by
   `act-english-v8-ws-score.mjs` (unchanged). Per item:
   - drop if ANY sample's pick differs from the key;
   - drop if >= 2 samples name the same second defensible option;
   - PoW items that need the essay: drop if >= 2 samples mark `no_source_needed`;
   - CSE/KoL single-sentence retrievability recorded, not a drop rule.
   **No repair** (changed from v8, which allowed one): a dropped item stays
   dropped, and a passage with a dropped item is dropped whole (passages are
   exactly 10). **Bar 4 fails the batch (STOP, nothing inserted) only if the
   surviving passages project fewer than 9 forms** (re-run the mix search's
   replay on the survivors' actual X/Y counts).

5. **Insert and release — per `ACT-ENGLISH-SPOTCHECK-RULE.md`.** v8 released
   2026-10-07 after a clean full sitting, so the rule is active. REGISTER §5
   (2026-10-07, B15 close) records the sequence it fixes: "the next same-method
   batch releases on the with-source gate and the one after gets a 20-item spot
   check". **v9 is that next batch**, so:
   - if the method is unchanged in substance (below) AND bar 4 drops <= 10% of
     the batch, every passing passage is inserted **verified=true** (no sitting),
     cohort `act-english-v9`;
   - **"drops more than 10% of a batch" is measured conservatively as items not
     inserted because of bar 4, including the whole-passage siblings of a dropped
     item, over 150 authored.** One lost passage = 10/150 = 6.7% (release);
     two = 20/150 = 13.3% (fallback). The item-level count is reported beside it;
   - otherwise (rule 3 fallback): passing passages are inserted STAGED
     (`BANK_VERIFIED=false`) and a full 40-item sitting (CSE 24 / PoW 12 / KoL 4,
     act-en8 design and integer cutoffs) is pre-registered in its own file and
     drawn for the co-founder, NOT sent, and not assumed sat;
   - either way, the NEXT same-method batch (v10) owes the 20-item spot check
     (CSE 12 / PoW 6 / KoL 2; CLEAN at CSE <= 4 and PoW <= 2; ARCHIVE at
     CSE >= 8 or PoW >= 4; between -> full 40-item sitting).
   After insert: `verify-act-draw.ts` (must draw 50/45/36/40) and
   `form-capacity.mjs` (projected or live, whichever applies).

## What changed from v8 (for rule 3's "unchanged in substance")

Changed, all of the kind v8 itself changed from v7 (which the rule counts as
the same method): the passage count (15 vs 12) and author count (5 x 3 passages
vs 4 x 3); the X/Y split (10/5 vs 6/6); the per-passage Production/Knowledge
assignment table (placement keys A/B/C/D/B; add Yes 3 / No 2; delete Kept 2 /
Deleted 3; purpose Yes 2 / No 2; 15 transitions with relations varied per
author; 11 goal items), the per-author Conventions subskill counts (each row
sums to 16), the topics and voices, and the ban list now names all 44 bank
titles. The brief text is otherwise v8's verbatim and is committed this time
(`act-english-v9.BRIEF.md`; v8's had to be recovered from a scratchpad).

Not changed: the twelve measured-tell rules, the shape rules, the No Change
quota (two per passage, different subskills), the semicolon and key-length caps,
the reading list, the pre-flight bars, the dup scan, the solver and grader
prompts, the renderer and scorer, the drop rules.

Stricter: no repair after freeze (v8 allowed one). This can only drop more,
so it can only move v9 toward the full-sitting fallback, never away from it.

## Topics and voices (all differ from the 44 ACT English passages in the bank)

| P | author | type | voice | topic |
|---|---|---|---|---|
| 1 | A | X | editorial, first-person plural | why a city should plant shade trees on its school playgrounds |
| 2 | A | Y | impersonal science explainer | how some fireflies synchronize their flashing |
| 3 | A | X | third-person history | London's "Great Stink" of 1858 and the sewers that followed |
| 4 | B | X | third-person present-tense profile | a farrier who shoes horses |
| 5 | B | Y | first-person adult reflection | learning to navigate with a paper map and compass |
| 6 | B | X | engineering explainer | how a canal lock raises and lowers boats |
| 7 | C | X | arts/culture explainer | stop-motion animators moving puppets frame by frame |
| 8 | C | Y | second-person place essay | a neighborhood laundromat late at night |
| 9 | C | X | history of science | how Eratosthenes estimated the size of the Earth |
| 10 | D | Y | social-science explainer | how pollsters choose a representative sample |
| 11 | D | X | earth-science explainer | why a geyser erupts on a rough schedule |
| 12 | D | X | first-person humorous memoir, older narrator | taking up ballroom dancing at sixty |
| 13 | E | X | biology explainer | how salmon find the stream where they hatched |
| 14 | E | Y | third-person history | Britain's penny post of 1840 |
| 15 | E | X | second-person process essay | a first morning learning to sail a small dinghy |

## Pipeline order (stop at the first failed gate)

author (5 Claude agents, one per file `act-english-v9-{a..e}.batch.json`) ->
freeze (sha256 of each file recorded in REGISTER) -> bar 1 -> bar 2 -> bar 3
(screen; never stops) -> bar 4 -> ledger entries (one per inserted file,
`act-english-v9-{a..e}-2026-10-08`) -> insert per bar 5 -> verify-act-draw ->
form-capacity -> REGISTER §5 + ledger in one commit. Claude agents only.
