# map-lu-v3, 2026-10-12: result

Bars: `MAP-LU-V3.prereg.md`, pre-registered at `40b10d2d` before any item
existed, with amendment 1 at `8c111ec4` (after authoring, before any teacher,
screener, solver or grader). Then freeze `f127c587` and renders `53dca1a0`,
both before any solver or grader ran. Scoring:
`node scripts/study-bank/map-lu-v3.mjs score`.

**Punctuation PASSES: 11 items inserted STAGED** (`verified=false`, cohort
`map-lu-v3-punctuation`, family `map`, section `language`). Spelling,
Grammar and Capitalization fail; nothing from them is inserted.

**Spelling cleared: 0. With earlier cleared Spelling (0), the total is 0 of
the owner's ~20.** The Language Usage gate is not met.

**Agents (18 Claude subagent runs, at most three at once, each in its own
scratch folder; the keyed stage continued the two cold graders):**
- 2 calibration screeners (on v2's words, before the prereg)
- 2 authors and 1 re-profile agent (amendment 1)
- 2 teacher raters, 1 reviser, 2 re-raters, 1 repair agent
- 2 word-grade screeners
- 3 options-only samples, 2 graders (cold, then keyed)

No NWEA item, no Herald PDF and no earlier MAP item file was shown to any
agent. Both graders' cold files were byte-compared before and after the keyed
stage: unchanged.

## Verdict per strand

| strand | Stage 0 | S1-a exact | S1-b pilot-pass | S1-c easier / harder | S1-d offsets | S2 oo vs control | slots | verdict |
|---|---|---|---|---|---|---|---|---|
| **Spelling** (24) | **FAIL**: T2[word] `unique_min(vowels)` 39.1% vs 25.0%, fw p 0.086 | | | | | | | **FAIL** (not graded) |
| **Punctuation** (12) | pass | PASS (T2 fw p 0.88) | **11/12** (bar 10) | 4/24 (bar ≤ 4) / 2/24 (bar < 6) | 0.00 / −0.25 | 100.0% vs 50.0% (bar 40.0) | 3/3/3/3 | **PASS: 11 inserted staged** |
| Grammar (12) | pass | PASS (T2 fw p 0.105) | **9/12** (bar 10) FAIL | **easier 7/24** (bar 4) FAIL; 2/24 | −0.25 / −0.17 | 100.0% vs 50.0% | 3/3/3/3 | **FAIL** |
| Capitalization (8, gr 5-6) | pass | PASS (T2 fw p 0.72) | **4/8** (bar 7) FAIL | **easier 9/16** (bar 2) FAIL; 0/16 | **−0.63 / −0.88** FAIL | 100.0% vs 50.0% | 2/2/2/2 | **FAIL** |

Pooled E3 over the frozen 32: key uniquely longest 4/32, uniquely shortest
6/32 (bar 25%), pass. Pooled T2: clear (fw p 0.15).

**Keys are right everywhere they were measured:** both graders picked the key
cold on 64/64 judgements, both keyed verdicts were "correct" on 32/32, no
accepted alternative, no options-only sample unanimous on a non-key letter.
One cold `second_defensible` was raised: plural "know" after
*neither ... nor* (MLV3-G02, grader b), withdrawn in the keyed stage; the cold
condition decides c2, so the item is held.

### Punctuation: passes, 11 of 12

- Held: MLV3-P11 (grade 7, an indefinite-pronoun possessive vs a possessive
  pronoun), judged too easy by both graders (grades 6 and 5).
- By grade: 5 3/3, 6 3/3, 7 2/3, 8 3/3. The four easier calls are P11 (2)
  and two grade-8 items placed at grade 7 by one grader (P13 semicolon, P14
  colon). `easier` 4/24 sits exactly at its bar.
- T2 on the 11 inserted: clear (`unique_min(words)` 31.8%, fw p 0.87).
  Difficulty by mean offset: medium 10, hard 1.
- Graders' cross-item notes, recorded: on the three paired-punctuation items (P05, P06, P15),
  a mark on one side only kills two options by symmetry and leaves the key
  against the all-wrong option (grader a); both cumulative-adjective items
  (P09, P10) reward fewer commas (grader b). Neither is a count, length or position
  tell, and neither decides an item.

### Spelling: stopped at Stage 0 by a tell the amendment created

- **Amendment 1 removed a length tell.** As authored, most trouble spots
  DROPPED a letter, so the key was the longest spelling on 12 of 24 word
  items (`at_max(len)` 40.6%, fw p 0.040). A seeded profile per item fixed the
  edit kinds (both drop / both add / both change / one drops, one adds).
- **It created a vowel tell.** In the `shortest` profile (both sites ADD a
  letter), the letters students add are mostly vowels (*disasterous*,
  *monsterosity*, *compairison*), so the key has the fewest vowels. On the
  16 word items the freeze took, `unique_min(vowels)` scored 39.1% (fw p
  0.086 against a bar of 0.10; margin +14.1 against +10). On all 24 word
  items after the re-profile T2 was clear (p 0.40); the freeze subset is
  where it fired.
- **This is CLAUDE.md's "each fix catches its own tell, not the next"
  pattern, inside one batch.** A seeded structural assignment fixes the axis
  it assigns and leaves the letter content free, and the content brought its
  own regularity. The next Spelling batch has to constrain the added letters
  too (or balance vowel/consonant edits within each profile), and should run
  T2 on the likely-frozen subset before the teacher gate, not only on the
  whole authored format.
- **The refusal may be partly chance.** T2 refuses about 1 clean strand in 8
  by design (v2 prereg), and p 0.086 is near its bar. The rule fired as
  registered, and the direction is conservative: it threw items away and
  shipped none. No repair was allowed after the screen ran.
- **What the grade-5 fix achieved is NOT measured.** The strand was never
  graded. The only evidence is the screen: the frozen grade-5 words
  (*altogether*, *weird*, *possibility*, *cinnamon*, *glisten*, *omission*)
  were graded 5-8 by both screeners, against v2's 2-4 for its grade-5 words.
  The screen dropped two grade-7 items (*deceive*, *ridiculous*, both graded
  6/6) and no grade-5 item.

### Capitalization: the grade-5 notch overshot

- Grade 6: 4/4, every judgement at grade 5-6.
- **Grade 5: 0/4**, with 8 of the 9 easier calls (assigned grades 3-4):
  multi-word place names, seasons vs holidays, nationality and language,
  days of the week vs "weekend".
- v2's grade 5 ran hard (title with "Is", region vs direction); the v3 brief
  moved those to grade 6 and gave grade 5 the rules taught by grade 4, and
  the graders placed them there. Between v2 and v3 the grade-5 target sits
  between "rules taught by grade 4" and "rules the graders call grade 6-7".
  With two misses either side, **Capitalization at grade 5 is not a
  calibration we can hit with these rule lists**; grade 6 has now passed
  4/4 here and fit in v2.

### Grammar: misses at grades 5-6

- Holds: G07 (grade 6 pronoun person shift: too easy, two options dead by
  both, "most of them take out your phones"), G02 (second defensible, cold),
  G03 (grade 5 irregular participles *swum* / *broken*, too easy for one
  grader).
- Grades 7-8 passed 6/6. Both graders named one cross-item tell: on the two
  redundancy items (G10, G16) both error sites are inserted words,
  so the key is the uniquely shortest sentence.
- T2 on Grammar came in at `at_min(vowels)` 47.9%, fw p 0.105, just clear of
  its 0.10 bar.

## Findings recorded whether or not the bars passed

1. **The word-grade screen did what it was calibrated to do, and cheaply.**
   Its prereg calibration on v2 (drops 4/4 failing grade-5 items, easier
   calls 11/48 to 2/32) is the only measurement of it; on v3 it dropped two
   grade-7 items and nothing at grade 5. Whether it predicts graders on new
   words is unmeasured, because the strand was not graded.
2. **Per-format key dealing worked**: every strand and format group 3/3/3/3
   or 2/2/2/2 in both renders, and neither grader named a slot pattern (both
   named one in v2).
3. **Pooled E3 let Punctuation and Grammar be measured** for the first time.
   Their own E3 rates were 2/12 longest and 3/12 shortest each, so v2's
   per-strand bar would have passed them this time anyway.
4. **The teacher gate fired mostly on the re-profiled spelling items** (11
   of 20 union NOs, on 10 items): a stacked both-errors form after a forced profile.
   Round 1: rater a 4 NO, rater b 19 NO of 246; union 20 on 17 items;
   re-rate dropped S23, S29, P02, G14.
5. **Options-only:** candidates 100.0% (32/32 unanimous on key), the
   construct, as pre-registered; control 50.0% (fresh draw, 0 overlap with
   v2's control, which ran 52.8%). Solvers named "pick the option that breaks
   no rule" for the full-sentence sets.

## Checker changes made after the prereg, all before any output they affect

- **Amendment 1 (`8c111ec4`)**: L-profile check and seeded profiles, as
  recorded in the prereg.
- **E4-dup treats the amendment-1 re-profile as a revision** (made before
  the repair step, after the teacher gate): the re-profile put
  *perseverance* into S31, already a target in S35; without this the
  unchanged S35 would have been sent to repair instead of S31.
- **The inserter passes an empty live set to the stem-duplicate check when
  the family has exactly 0 verified rows** (MAP is not shipped, and
  `stem-duplicates.mjs` refuses an empty read). Same handling as
  `map-math-g58-v1.mjs`; the within-batch check and the all-rows
  content-hash check still run. No bar changed.

Selftest: 70 checks.

## What carries forward

1. **Spelling is still at 0 of ~20.** The method gets keys right (v2 64/64;
   v3 no Spelling grading). Next batch: keep the v3 word choices and the
   screen, keep seeded length profiles, and **also fix the letter class of
   each edit** (an added vowel vs an added consonant, balanced within each
   profile), then run T2 per format on the likely-frozen subset at the
   authored stage.
2. **Punctuation grades 5-8 is now 11 staged items**, the first MAP Language
   Usage items in the bank. A person releases them.
3. **Capitalization grade 5 has missed in both directions.** Drop grade-5
   Capitalization or accept grade 6 only.
4. **Grammar grades 7-8 passed 6/6;** grades 5-6 need harder instances (the
   too-easy items were grade-4-level rules: irregular participles, pronoun
   person shift).

## Ledger

Four entries: `map-lu-v3-punctuation-2026-10-12` (staged, `contentSha` =
`inserted-punct.batch.json`, 90519ade…) and `map-lu-v3-{spelling,grammar,capitalization}-2026-10-12`
(killed). They were written into the working `ledger.json` before the
insert, and the parallel MAP maths agent's result commit `547dd07a`
committed that working file, so they reached HEAD in that commit rather than
in this batch's result commit. Their content is unchanged.

## Files

All in `scripts/study-bank/`:
- `MAP-LU-V3.prereg.md` (with amendment 1), `MAP-LU-V3-BRIEF-SPELLING.md`,
  `MAP-LU-V3-BRIEF-MECH.md`, `MAP-LU-V3-RESULT.md`
- `map-lu-v3.mjs`: the toolchain (imports v2's checks unchanged), `--selftest`
- `map-lu-v3/`: prompts, control, `lrank.json`, `wprofile.json`, screen
  calibration (`screen-v2-*`), authored files (original and re-profiled),
  teacher gate, revisions, repairs, screen, Stage 0, frozen files, renders,
  solver and grader files, `stages.json`, `inserted-punct.batch.json`
