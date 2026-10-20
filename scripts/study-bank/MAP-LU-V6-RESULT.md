# map-lu-v6, 2026-10-20: result

**SPELLING PASSES EVERY PRE-REGISTERED BAR. 26 ITEMS INSERTED STAGED** (`verified=false`, `family='map'`,
`section='language'`, cohort `map-lu-v6-spelling`). **Spelling cleared: 26** — the first cleared Spelling
items, above the owner's ~20 for Language Usage. Prereg `1aa16264` (no amendment), freeze `9d52651e`,
renders `ab7cb754`. map/language: 0 drawable, 37 staged (v3 Punctuation 11 + v6 Spelling 26).

## Funnel

| step | result |
|---|---|
| authored | 64 (author 1 grades 5-6, target words a-m; author 2 grades 7-8, n-z); `itemchecks` 64/64; `checks` clear; no cross-author clash (the split made one impossible) |
| teacher gate | 192 wrong options; rater a 2 NO (S14 *hesitate*, S25 *eliminate*), rater b 0 -> **2 dropped** (v5: 9) |
| exact checks | 0 |
| strict screen | 62 words; **5 dropped**: S37 *repetition* (6/7, target 7), S44 *regrettable* (6/7), S53 *pharaoh* (7/8, target 8), S60 *unconscious* (7/8), S61 *perpendicular* (7/8) |
| cell quota | survivors g5 15 / g6 15 / g7 14 / g8 13; every grade x rank cell filled |
| Stage 0 | pre-flight clear (re-draw unused); T2 fw p 0.40, T2-L 0.23; **E3 7/28 longest, 7/28 shortest** — at the cap by construction, as designed |
| frozen | 28 (sha256 8ee7e6ef...) |

## Bars

| bar | result | threshold |
|---|---|---|
| S1-a exact | PASS: 0 item failures; T2, T2-L, E3 pass | pass/fail |
| S1-b pilot-pass | **26/28** | >= 23 |
| S1-c calibration | easier **8/56**, harder **13/56** | <= 9; < 14 |
| S1-d level | mean offset a +0.07, b +0.11 | within +-0.5 |
| S2 options-only | 100.0% vs control 62.5% | >= 52.5; control >= 25% |
| T slots | 7/7/7/7 | no slot > 35% |

Held (not inserted): **S54** (g8, grader b too_easy) and **S04** (g5, grader b too_hard). Cold picks on key
56/56; keyed 56/56 correct; no accepted alternative; no option dead by both; cold files hashed at release of
the keyed render and byte-checked unchanged (`coldshas.txt`).

**Margins, stated:** S1-c *harder* passed by one (13 against < 14), and the "easier" calls sit high in the
range: 5 of the 8 are at grade 8, 3 at grade 7, none at grades 5-6. S2 measures key recoverability
only: the misspelled word is visible in the options and is the construct, so 100% is expected and this is
never "does not leak".

## What made the difference (against v5, same bars)

- The **cell quota** made E3 hold by construction (v5 failed it 8/28 on drops that skewed the pick).
- **16 per grade** absorbed 7 drops with every cell still full.
- The **a-m / n-z split** removed the cross-author clash that cost v5 an amendment.
- The brief's list of **v5's teacher-dropped words** coincided with 2 teacher drops instead of 9. Not
  isolated: a different rater pair could disagree as v5's did (0 vs 9).

## Recorded for later

- Grader a: two "commit" words (items 21 *commitee*, 27 *committment*); item 21 spells *conscious*
  correctly beside the *conscience* item (23); two -geous items (1, 2). Cross-item overlaps, not answer
  tells; worth varying in the next brief.
- Both graders: item 19's option C has no quotation marks around "Yours sincerely" — punctuation, not
  spelling, but a distraction in a spelling item.
- Process (`map-lu-v6/DEVIATIONS.md`): author 1 used `mkdir`, one `sed -i` on its own file and a `tail`
  pipe; author 2 used `grep` three times on its own file. Raters, screeners, solvers and graders opened only
  their one file. No git, web, GPT or process-killing command anywhere.

## What can't be learned here

No grade label is validated by response data; a human releases staged rows; sentence-only Spelling does not
cover MAP's full mix of spelling formats.
