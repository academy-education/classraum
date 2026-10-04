# Bank integrity sweep — 2026-10-04

`node scripts/study-bank/bank-integrity-sweep.mjs [--selftest] [--json out] [--max N]`

Read-only. No row was edited. Population: **every verified, unarchived
`study_item_bank` row, all families — 7,200 loaded, `count: exact` = 7,200**
(paged with ORDER BY id; 9,023 rows in any state loaded for sibling checks,
also asserted). 670 reviews, 822 attacks and 1,779 audio objects loaded and
counted.

Before it sweeps, the script runs its self-test. All 40 row detectors and the 5
population detectors must fire on a planted defect and stay quiet on a clean
twin. Break-test of the self-test itself: replacing each detector in turn with
`() => null` and then `() => 'always'` was caught 40/40 both ways. A detector
expected to apply that reads zero rows makes the run exit 2. Two detectors read
nothing because the types don't exist in the bank (`multi_select`,
`numeric_entry`: 0 rows). They print NOT MEASURED, not "0 fail".

This is integrity, not quality. A clean row here means the product can serve
and grade it as stored. It does not mean the key is right or the item is
unguessable. The attack is still the gate.

---

## Ranked by student impact

### 1. 481 drawable SAT items are never served — the SAT assembler read is capped at 1,000 rows

`assembleFromBank` (`src/lib/study/assemble.ts:1830`, used by `test/assemble`
and the adaptive `test/route` module 2) reads the section with one unpaged
select. PostgREST returns at most 1,000 rows. Replaying that exact select:

    sat/math              returned 1000 of 1364 live → 364 never drawn
                          (hard: Adv 44, Alg 22, PSDA 9, Geo 4 = 79 of 298 hard)
    sat/reading_writing   returned 1000 of 1117 live → 117 never drawn
                          (hard: C&S 11, EoI 8, SEC 6, I&I 1)

The cut set was identical on 3 consecutive reads. It is stable, so the same
items are missing for every student, every session. Among them:
**all 17 `rw-v10-sec-hard` rows inserted today**, 20 `eoi-v6`, 11
`rw-v9-sec-hard`, and **6 of the 33 SEC hard items** that the "R&W hard route
= 4 forms" figure counts. `form-capacity.mjs` and `bank-state.mjs` page
correctly, so every capacity number quoted for SAT overstates what the draw
can reach. `verify-sat-hard-route.ts` reads with `.range(0, 2999)`, which the
server still caps at 1,000. The ACT, ISEE, SSAT and TOEFL reads are all under
1,000 or paged, so they return everything. `drawBankPractice` without a domain
filter (`order('id')`) has the same cap. Fixing this is a `src` change, so it
is out of scope here (see REGISTER §5).

### 2. Wrong-key / two-correct: **none confirmed**

| check | scorable | result |
|---|---|---|
| key matches exactly one choice under `gradeAnswer` norm() | 6,531 MC | 0 fail |
| empty key on a keyed type | 6,696 | 0 |
| duplicate choices under norm() | 6,531 | 0 |
| numerically/algebraically equal choices (`0.5`≡`1/2`, `3√13`≡`√117`, `2(x+1)`≡`2x+2`) | 2,508 with ≥2 parseable values | 0 |
| arrange_words key assemblable from chips | 165 | 0 |
| fill_in_blanks ids = `[N]` placeholders, numeric ids, answers present | 93 | 0 |
| speaking_repeat audio script = graded key | 136 | 0 |
| open-response: no key, type in OPEN_RESPONSE_TYPES (read from source) | 275 | 0 |
| row survives `readBankItem` (else silently undrawable) | 7,200 | 0 |
| explanation states a distractor as the answer | 6,531 | 0 after hand check |

The distractor detector first flagged 4 items. I checked all 4 by hand and
none is wrong. In each, the explanation does state the key, written in a form
the detector didn't recognise: `−4/3` with a typographic minus (`1f7bbe83`),
`2,464` with a comma (`531e1e70`), `−$0.20` (`8715eb44`), and the word
"exactly one" (`ac4d2920`). I fixed the detector's normalisation. Two
graphics with empty table cells (`15da5d5f`, `21b2f710`) are deliberate
("Two entries have been omitted"). I recomputed both keys and they are correct
(56/120 = 0.47, 120/240 = 0.50).

### 3. Served broken (T2)

- **38 explanations name options by letter** (22 `v2` SAT R&W, 15 `talk-c1`,
  1 `talk-c2`), e.g. "A is the tempting misreading", "which is B."
  `shuffleDrawnChoices` re-orders choices every session, so the letter
  matches what the student sees only by chance. **In 8 of the 15 `talk-c1`
  items the letters don't even match the stored order**: `21902fcd`, `2c821492`,
  `5058c7da`, `6b76825b`, `821bfc6a`, `867be863`, `e476ead1`, `fb93b3b8`. Each
  explanation calls the stored key letter a distractor. I read all 8 by hand.
  The content descriptions match the distractors in an earlier order, and in
  every case the stored key is the correct answer. These are wrong letters,
  not wrong keys. The `v2` letters agree with the stored order. Speaker-labelled
  dialogues ("B turns down the offer") and maths/science labels are excluded,
  not counted.
- **5 TOEFL Daily Life sets show two different passages under one group id**
  (all `harvest-v1`; `pg-6e3c35eb…`, `pg-8ec93027…`, `pg-7d3ae5e1…`,
  `pg-d77f7662…`, `pg-90651a93…`). The "space permitting" repair (A1/A6) was
  applied to one sibling and not the other. One passage reads "time
  permitting" and its sibling reads "space permitting".
- **1 TOEFL academic passage set is too large to draw whole**:
  `pg-afeddf8c…` (`harvest-v1`, 12 live items). Reading slots are m1 8 /
  upper 10, and sets are never split, so it only surfaces through the
  last-resort truncation path.
- **2 SAT SEC items contain an all-whitespace choice** (`31cc9322`,
  `3970fa5c`, both `v2`). This is the "no punctuation" option stored as `" "`.
  It renders as an empty button, and `gradeAnswer` rejects any whitespace
  answer. Both are distractors, so grading is accidentally right, but the
  student can't read the option.
- **11 ISEE/SSAT reading-worlds passages hold 1 live item and 25 more hold 2–5**,
  against `ITEMS_PER_PASSAGE` = 6. `drawByPassage` serves full sets first, so
  these are fallback passages: a full passage read for one or two questions.
- Clean: passage present where required (3,758; SEC items with the sentence in
  the stem are allowed), SVG well-formed with a sane viewBox (137), table/bar
  shapes (157), every TOEFL audio clip present under the TTS route's hash
  (1,087 items, 0 missing), choice count per format (7,035), no mojibake,
  `[object Object]`, HTML entities, Hangul, or hardcoded question numbers
  (7,200 each).
- `graphic/referenced-missing`: 9 candidates, all false positives on hand
  check. They are prose senses ("the tables" as furniture, "the diagram" in a
  verbal sentence) and function-graph wording ("vertex of the graph"). Two
  items (`4af12319`, `bb101d24`) say "the table" but give the data in prose.
  That is cosmetic.

### 4. Metadata / latent (T3)

- **Cohort labels:** `ssat-verbal-v1` holds **154** rows. REGISTER §1 measures
  it at 21. The other **133** were inserted 2026-09-20/21 with a different
  verify_meta schema. This is the same `verbal-bank-helper` default-label
  defect already recorded for the 13 `isee-verbal-s14` rows (still under
  `isee-verbal-v1`). A per-cohort query for those batches reads zero rows.
  Separately, 48 TOEFL Interview rows (2026-07-28) have no cohort.
- **Stale evidence (076/077):** 32 of 536 human review rows on live items are
  stale. They are `b2-all-cohorts` 10, `daily-life-2026-08-05` 6,
  `crv7-adjudicate` 5, `calibration-*` 6, `act-cofounder-2026-09-02` 2 (the
  A74 reword) and `resit-length` 2. 230 of 739 attack rows are stale, mostly
  the ACT English and Reading v1 attacks of 2026-09-02. `bank-state.mjs sittings`
  reads `study_item_reviews`, not `study_item_reviews_fresh`, so its scores
  still count the stale rows.
- **Row difficulty ≠ `item.difficulty` on 1,450 rows** (TOEFL 1,294). The
  TOEFL pilot (unscored) selection sorts on `item.difficulty`
  (`assemble.ts:1472`), while every draw uses the row column. Regraded items
  are therefore piloted by their old label.
- **Rationales:** 411 rows store `distractor_rationales` as an object map
  (301) or as strings (110). `readRationales` reads only `[{choice, reason}]`
  and drops them. Another 514 array rows name text that is no longer a choice,
  left over from choice edits (339 `v2`, 121 `harvest-v1`). Mostly
  `reason: ""`, so the effect is a missing rationale, not a wrong one.
- 120 `v2` R&W rows have `item.domain` ≠ row `domain`, left over from the
  2026-09-12 refiling. Nothing serving reads `item.domain` today.
- 248 rows where `passage_group_id` ≠ `item.passageGroupId`. Each serving path
  reads only one of the two (admission/ACT read the row, TOEFL/SAT the item).
  The group checks above use the served key. Under it, the only inconsistency
  is the 5 split-passage sets.
- 167 live groups have archived or staged siblings (307 archived, 3 staged).
  Expected after repairs, but the live set is shorter than authored.
- Clean: every live section is reachable (no hidden subtopic or locked topic
  holds verified rows), all 7,200 `content_sha` match the JS replica of the
  migration-076 hash, and no two live rows share a `content_sha` or
  `dedup_key`. `content_hash` was deliberately not checked: it is frozen and
  unreliable (CONTENT-HASH-FINDING.md).

### 5. Cosmetic (T4)

The explanation doesn't quote the key text on 2,753 of 6,527 rows. That is a
soft signal, since paraphrase is legitimate; it is worst in TOEFL listening
and `harvest-v1`/`v2`. There are 5 inline tables built with double spaces,
and 3 SEC fragments that close a parenthesis opened in the passage (false
positives). No −/- mixing inside a choice set (426 checked) and no stray
markdown.

## What this sweep cannot see

Whether a key is right when it matches a choice; semantic leaks; whether a
graphic matches its stem; whether audio says what the transcript says.
`choices/equal-value` only parses pure numeric and one- or two-variable
expressions (2,508 of 6,531 MC rows). Choices with units in words, inequalities
or coordinate pairs are outside its denominator.
