# map-lu-v4, 2026-10-12: result

Bars: `MAP-LU-V4.prereg.md`, pre-registered at `28e11dea` before any item
existed (no amendment). Then freeze `f636c855` and renders `f4c1fd11`, both
before any solver or grader ran. Scoring:
`node scripts/study-bank/map-lu-v4.mjs score`.

**All three strands FAIL. Nothing is inserted.**

**Spelling cleared: 0. With earlier cleared Spelling (0), the total is 0 of
the owner's ~20.** The Language Usage gate is not met. map/language stays at
0 drawable, 11 staged (v3 Punctuation).

**Agents (17 Claude subagent runs, at most three at once, each in its own
scratch folder; the keyed stage continued the two cold graders):**
- 2 authors
- 2 teacher raters, 1 reviser, 2 re-raters, 1 repair agent
- 2 word-grade screeners
- 3 options-only samples, 2 graders (cold, then keyed)

No NWEA item, no Herald PDF and no earlier MAP item file was shown to any
agent. Both graders' cold files were hashed before the keyed render entered
their folders and again after the keyed stage: unchanged (4294939a…,
8a8e1461…).

## Verdict per strand

| strand | Stage 0 | S1-a exact | S1-b pilot-pass | S1-c easier / harder | S1-d offsets | S2 oo vs control | slots | verdict |
|---|---|---|---|---|---|---|---|---|
| **Spelling** (28) | pass, first pick (no re-draw) | PASS (T2 fw p 0.26, T2-L 0.70; word 0.99 / 1.00; sentence 0.17 / 0.17) | **21/28** (bar 23) FAIL | **easier 12/56** (bar ≤ 9) FAIL; 5/56 | −0.07 / −0.29 | 100.0% vs 65.3% (bar 55.3) | 7/7/8/6; word 5/5/5/4; sentence 2/2/3/2 | **FAIL** |
| Grammar (12, gr 5-6) | **FAIL**: T2 `at_max(len)` 50.0% vs 25.0%, fw p 0.091 | | | | | | | **FAIL** (not graded) |
| Capitalization (8, gr 6) | pass | PASS (T2 fw p 0.11, T2-L 0.18) | **5/8** (bar 7) FAIL | **easier 5/16** (bar ≤ 2) FAIL; 3/16 | −0.13 / −0.25 | 100.0% vs 65.3% | 2/2/2/2 | **FAIL** |

Pooled E3 over the frozen 36: key uniquely longest 5/36, uniquely shortest
5/36 (bar 25%), pass. Pooled T2 clear (fw p 0.34), pooled T2-L clear (0.72).

**Keys are right everywhere they were measured:** both graders picked the key
cold on 72/72 judgements; both keyed verdicts "correct" on 36/36; no options-
only sample unanimous on a non-key letter. One cold `second_defensible` and
one keyed `accepted_alternative`, both grader b on MLV4-S01: *heighth* as a
dialectal form listed by some dictionaries (grader a looked at it and did not
accept it). That holds S01, which was also too easy.

### Spelling: the structure held, the grade did not

- **The seeded letter class did what it was built to do.** Every structural
  check was clear at every stage: authored (word T2 p 1.00, T2-L 0.49),
  likely-frozen pre-flight, Stage 0 on the first pick (so the pre-registered
  re-draw was never used), and the frozen 28. Neither grader named a length,
  vowel, consonant or doubling pattern in the word items: both wrote that each
  feature sits in exactly two options and the key is not consistently longest
  or shortest. v3's vowel tell is gone.
- **Spelling failed on difficulty, again, and this time not only at grade
  5:**

  | grade | pilot-pass | easier calls |
  |---|---|---|
  | 5 | 5/7 | 2 (S01 *height*, 4/4) |
  | 6 | 6/7 | 2 (S13 *professional*, 5/5) |
  | 7 | 6/7 | 3 (S25 *comparison*, 6/5; S33 *accidentally*, 6/7) |
  | 8 | **4/7** | 5 (S39 *veterinarian*, 7/6; S40 *hazardous*, 7/6; S42 *mortgage*, 8/7) |

  Other holds: S06 (*permanent*, grade 5, grader a too hard), S42 and S25 each
  with an option dead by both.
- **By format: sentence 9/9, word 12/19.** Every hold is a word item.
- **The rewrite step replaced most of the words.** The teacher gate rated 56
  of 222 wrong options NO (rater a 55, rater b 26), on 24 of the 32 word
  items, almost all the stacked both-errors option. Keeping a word's assigned
  edit types while changing a site is often impossible, so the reviser changed
  the KEY WORD on 21 of the 24 flagged Spelling items (*height*, *pollution*,
  *military*, *eventually*, *comparison*, *professional*...). Those
  replacement words were never chosen against the grade brief the way the
  authored words were. The screen then dropped three of them at grade 7
  (*eventually* 6/6, *military* 6/6, and the authored *twelfth* 6/4) and kept
  *height* (5/5 at grade 5), *professional* (6+/6+) and *comparison* (7/7),
  which the graders placed one to two grades lower. **4 of the 7 Spelling
  holds and 8 of the 12 easier calls are on reviser-replaced words** (S01, S13, S25, S33, S42).
- **What this says about the method.** Seeding the edit types moved the cost
  from the structure to the content: fixed types plus "both errors must be
  pickable" leaves few real words per slot, so the teacher gate fires more and
  the one-rewrite rule turns into a word swap. The screen is the only grade
  check a swapped word meets, and it is weakest exactly at the target grade
  (it drops only when BOTH screeners say below; *height* sat at 5/5).

### Grammar: stopped at Stage 0 by a length tell

The 12 the freeze took had the key at the maximum length on 6 of 12 (4
uniquely): `at_max(len)` 50.0%, fw p 0.091 (bar +10, p < 0.10). The brief
barred both-sites-inserted items, and the authored strand was clear
(`between(words)` p 0.32), but the sites the author chose mostly removed or
shortened text in the wrong options (key uniquely longest on 4 of 12), and
the reviser's changes (14 grammar items revised, 8 with the key reworded) did
not move that. Not rendered or graded. Grade fit
of the harder grades 5-6 grammar was therefore **not measured**.

### Capitalization: grade 6 ran easier than v3's grade 6

- Pilot-pass 5/8; 5 of 16 grade calls easier. Holds: C04 (documents, 5/5),
  C08 (quoted sentence vs fragment, 5/4), C02 (historical events, 6/5).
  v3's grade-6 items went 4/4 with the same rule list. C02 and C08 had their
  key reworded by the reviser; C02 and C04 were re-worded for readability at
  the repair step.
- **Both graders named the same cross-item tell:** the key treats both sites
  the same way (both capitalized or both lowercase) on 7 of 8 items, so
  discarding the two mixed options leaves a 50/50 on almost every item. In
  count terms the key is the unique maximum or unique minimum of capitals on
  7/8 (v3's frozen 8: 5/8). T2 sees each side separately (`unique_max(caps)`
  50.0%, `unique_min(caps)` 37.5%, fw p 0.11) and has no selector for "either
  extreme"; the strand failed on difficulty, so this decided nothing, but it
  is a gap in T2. Recorded, not a bar.

## Findings recorded whether or not the bars passed

1. **The letter-class seed removed v3's structural tell completely**, on every
   subset it was measured on, and no grader found a count pattern in the word
   items. Structure is no longer what stops Spelling.
2. **Sentence-format Spelling went 9/9** here (v2: grade-6-8 sentence items
   also passed). The word format carries every hold.
3. **The reviser is where the grade leaks out.** It changed the key word on 21 of
   24 flagged Spelling items (and reworded the key sentence on 8 of 14 revised
   grammar and 4 of 7 revised capitalization items); the replaced spelling words account for most of
   the easier calls. The next batch should either let a flagged word item be
   DROPPED rather than re-worded, or require a replacement word to pass the
   same screen with a margin (both screeners at or above target + 1).
4. **The grader-named length cue in sentence items** (the misspelled sentence
   at a length extreme in 7 of 9) is what the seeded key length rank produces
   by design (ranks 1 and 4 assigned to half the items); the ranks are
   balanced across extremes and T2[sentence] was clear (p 0.17). Recorded.
5. **Options-only control came in at 65.3%** (fresh draw, 0 overlap with v2's
   52.8% and v3's 50.0%), so the S2 bar was 55.3; candidates 100% as the
   construct predicts.
6. **The re-draw rule was never exercised** on real data; its only evidence
   is the selftest.

## Checker changes made after the prereg

None. Selftest: 64 checks.

## What carries forward

1. **Spelling is still at 0 of ~20.** Keep the letter-class seed and T2-L;
   they work. The open problem is word grade after the rewrite step. Either
   drop teacher-flagged word items instead of rewriting them (author more:
   v4 lost 6 at the gate and screen and still filled every quota), or screen
   replacement words at target + 1. Grade 8 needs harder words than
   *veterinarian*, *hazardous* and *mortgage*.
2. **Grammar grades 5-6** needs a re-run; difficulty was never measured.
   Seed the site KIND per item (insert / delete / substitute, balanced so the
   key is not the longest) the way Spelling's edit types are seeded.
3. **Capitalization grade 6:** require mixed keys (one site capitalized, one
   lowercase) on about half the items, and add an "either extreme" selector to
   T2 before the next run.
4. v3's grades 7-8 Grammar items remain uninserted; they were not re-decided.

## Ledger

Three entries, written into `ledger.json` from current HEAD immediately before
this commit and committed with it: `map-lu-v4-spelling-2026-10-12` (killed,
`contentSha` = `frozen-spell.json`, b4477100…),
`map-lu-v4-grammar-2026-10-12` (killed, `stage0-pick-gram.json`, feaa23ac…),
`map-lu-v4-capitalization-2026-10-12` (killed, `frozen-cap.json`, c300a991…).

## Files

All in `scripts/study-bank/`:
- `MAP-LU-V4.prereg.md`, `MAP-LU-V4-BRIEF-SPELLING.md`,
  `MAP-LU-V4-BRIEF-MECH.md`, `MAP-LU-V4-RESULT.md`
- `map-lu-v4.mjs`: the toolchain (imports v2's and v3's checks unchanged),
  `--selftest`
- `map-lu-v4/`: prompts, seeded `wclass.json` and `lrank.json`, control,
  authored files, teacher gate, revisions, repairs, screen, Stage 0, frozen
  files, renders, solver and grader files, `stages.json`
