# act-english-v8 — pre-registration (written 2026-10-07, before any item exists)

Purpose: ACT English is at 5 forms (27 live passages: 15 `act-english-v1` at
CSE 4 / PoW 4 / KoL 2, 12 `act-english-v7` at CSE 7 / PoW 2 / KoL 1, released
2026-10-07 after the co-founder sitting, REGISTER B9). Goal: 2 more forms.
Method: the v7 brief and the v7 gate, unchanged except for the per-passage mix
(derived below), the topics/voices, and a duplicate scan.

## Target mix (derived, not chosen)

`ENGLISH_QUOTAS` on a 50-item form, as counts: PoW 15-16, KoL 7-9, CSE 26-28.

The 5 current forms consume all 15 v1 passages (3 per form) and 10 of the 12
v7 passages; 2 v7 (CSE 7 / PoW 2 / KoL 1) are spare. Forms 6 and 7 therefore
come almost entirely from new passages, and v7's own mix cannot be reused:
five 7/2/1 passages read CSE 70% / PoW 20%, outside both ranges.

Searched (scratchpad `mixsearch.mjs` / `robust.mjs`, a replay of
`form-capacity.mjs`'s sequential greedy draw over random passage-id orders,
since group ids are UUID-ordered):

| new-passage design | 7 forms, all 12 land | 7 forms, any 10 of 12 land |
|---|---|---|
| 12 x 7/2/1 (v7 repeated) | — | 6 at most (CSE ceiling) |
| 10 x CSE 5 / PoW 3 / KoL 2 | 88% of orders | — |
| 10 x CSE 6 / PoW 3 / KoL 1 | 76% | — |
| **6 x CSE 5/PoW 3/KoL 2 + 6 x CSE 6/PoW 3/KoL 1** | **300/300** | **1296/1320 (98.2%)** |

Chosen: **six passages at CSE 5 / PoW 3 / KoL 2 ("type X") and six at
CSE 6 / PoW 3 / KoL 1 ("type Y")**. Any five of them read PoW 15 and CSE
25 + #Y, KoL 10 - #Y, so a form with 1-3 type-Y passages is inside every
range; this is also close to the published form shape (about 5.4 / 3.1 /
1.6 per passage). Authored: 12 passages / 120 items (CSE 66 / PoW 36 /
KoL 18), so up to two can be lost at the gate.

## Bars, fixed before results (v7's, restated)

1. **Structure** — `act-bank-helper check english` exits 0 per file. Batch-level
   refusals (pre-flight, `act-english-v8-preflight.mjs`, the v7 pre-flight with the
   mix check changed to {5/3/2, 6/3/1} per the assignment): any key slot > 35% after
   the make-attack deal; key uniquely longest OR uniquely shortest in > 25% of items;
   NO CHANGE keying outside 15-35% of items that offer it; any placement letter never
   keyed; Kept/Yes polarity outside 30-70%; semicolon the key on > 35% of
   boundary-punctuation items; duplicate options; a quoted span absent from its passage.

2. **Duplicate scan** (new for v8; `act-english-v8-dupscan.mjs`) against EVERY
   non-archived ACT English row (verified and staged), paged with ORDER BY and a
   distinct-id assertion, refusing on fewer than 300 rows. Passage token-Jaccard
   >= 0.30 or a shared title = FLAG (topic re-use); stem token-Jaccard >= 0.60 = FLAG.
   A flagged passage is read by hand; a same-topic passage is re-authored before the
   gate, never after it. Break-test: a planted copy of a live passage must flag.

3. **Blind split attack — a SCREEN, never a verdict** (B7; v7: model 100% on CSE vs
   the co-founder's 16.7%). SPLIT=10, one item per passage per file, a different
   solver per file. Compared per domain against the same matched live control v7
   used (actlive-score.mjs, 2026-09-12): CSE 68.0% (n=25), PoW 66.7% (n=21),
   KoL 92.9% (n=14). Ceiling: CSE/PoW leave 32/33 points, a +15 bar can fire; KoL
   leaves 7.1 and is REPORT-ONLY. Screen flag = domain rate > live + 15. A flag drops
   nothing (repairing to the instrument is fitting); it is recorded and the sitting
   oversamples that domain.

4. **With-source key grade — DECIDES.** Three independent Claude samples per item over
   two key-unmarked renders (`act-en8-h{1,2}.ws.md`, v7's renderer), the v7 grader
   prompts verbatim (b = plain, c = adversarial; a = plain). Per item:
   - drop if ANY sample's pick differs from the key;
   - drop if >= 2 samples name the same second defensible option;
   - PoW items that need the essay (placement, purpose, add/delete, transition, goal):
     drop if >= 2 samples mark `no_source_needed`;
   - CSE/KoL: single-sentence retrievability recorded, not a drop rule.
   A dropped item may be repaired ONCE; the repair re-enters bar 4 with three fresh
   samples. A second failure drops the item, and a passage with a dropped item is
   dropped whole (passages are exactly 10).

5. **Insert** — every passing passage, STAGED (`BANK_VERIFIED=false`), cohort
   `act-english-v8`. If a drop leaves the X/Y split so uneven that
   `PROJECT_COHORT=act-english-v8 form-capacity.mjs` projects fewer than 7 forms,
   that is reported, not patched by re-labelling items. Released only by a human
   sitting pre-registered separately before its draw (bank-gate §5: <= ~40% blind
   clean, >= ~60% archive, between = second reader).

## Not changed from v7

The brief's twelve measured-tell rules, the shape rules, the No Change quota (two per
passage, different subskills), the semicolon cap, the key-length caps, and the
reading list. Added to the brief: the topic/voice list below, a ban on
reusing live titles, names and openings ("The summer I turned..."
opens three live passages), and "never refer to a question number" (the v7
"Question 10" defect).

## Topics and voices (all differ from the 32 ACT English passages in the bank)

| P | type | voice | topic |
|---|---|---|---|
| 1 | X | editorial, first-person plural | why a town should restore its public drinking fountains |
| 2 | Y | impersonal science explainer | how tardigrades survive drying out |
| 3 | X | third-person history | how railroads forced standard time zones (1883) |
| 4 | Y | third-person present-tense profile | a trainer of avalanche search dogs |
| 5 | Y | first-person adult reflection | a commuter learning birdsong by ear on a train platform |
| 6 | X | engineering explainer | how suspension-bridge cables are spun in place |
| 7 | X | arts/culture explainer | Foley artists who make film sound effects |
| 8 | Y | second-person place essay | a dawn fish auction at a harbor |
| 9 | Y | history of science | the first public weather forecasts (1860s) |
| 10 | X | social-science explainer | how a consumer price index is built from a basket of goods |
| 11 | Y | earth-science explainer | what ice cores record about past air |
| 12 | X | first-person humorous memoir, older narrator | a first season keeping a community-garden plot |
