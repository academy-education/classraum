# isee-math-s19 — pre-registration (written 2026-10-31, after authoring and pre-flight, BEFORE any packet, agent, solver or grader)

Coordinator brief, 2026-10-31: author the next ISEE Math batch, Claude only, build and check only, no insert, no
commit, stop before any grader or solver. Pipeline, bars and stop rule are `isee-math-s17.prereg.md`'s with s18's
changes (`isee-math-s18.prereg.md`), by reference, with the changes below. Nothing here is decided by this author
after a packet exists.

## What it can buy

`npx tsx scripts/study-bank/admission-form-depth.ts --forms 10`, 2026-10-31: ISEE math 709 rows; quant 9 clean
(form 10 0/37), math achievement 8 clean (form 9 0/47). One ISEE test draws 37 + 47 = 84 from one shared pool.

**The assembler has no level or topic quota for ISEE math.** `assemble.ts` (`assembleAdmission`) draws every
non-reading, non-verbal, non-MAP section with `drawByPassage(ranked, block.questions, 1, fresh)` over all verified
`isee/math` rows, unseen-first; no difficulty, strand or subskill split. Any drawable row counts.

    form  9 needs  9 x 84 = 756  -> +47
    form 10 needs 10 x 84 = 840  -> +131

The coordinator's "+170" is not what the replay needs: 840 - 709 = 131. The whole ISEE test stays bound by Reading (5).

## Batch (frozen content = `isee-math-s19-work/isee-math-s19.batch.json` as it stands when M1 is launched)

- Cohort `isee-math-s19` (no file or live cohort of that name). Ids `IM19A-01 .. IM19F-17`, plus `IM19R-01 .. 11`.
- **135 items**: A numbers and operations 38, B ratio/rate/percent 17, C algebra 23, D geometry 18, E measurement /
  coordinates / patterns / time 22, F data and probability 17. Authored labels 96 medium / 39 hard, 0 easy.
- 124 written in this session; **11 are s18 items that s18's M1 cleared** (IM18A-07, A-06, A-02, B-07, E-05, C-09,
  E-01, E-04, F-04, F-05, F-06), re-id'd `IM19R-01..11`, stems and keys unchanged. Seven of them had their
  distractors re-dealt (`distractors_redealt: true`) because s18 predates the central-key finding.
- Four choices, ungrouped, no figure, domain `Math`, ISEE Upper Level. Items needing pi now say "Use 3.14 for pi"
  and have numeric options (the pi-symbol versions failed the symbolic-hub pre-flight at 43.9%).
- **The target was about 220. 135 is the probe ceiling this session reached**, not a choice: of 345 probed
  ideas, about 145 collided with live rows (same method), about 70 more were trivial, within-batch twins or had
  no option set that passed the screen and hub rules, and 3 written items were dropped by the duplicate aids (idea files and probe outputs in `isee-math-s19-work/ideas/`, `probes/`). 135 x s17's 79% survival = about 107, short of
  form 10 (+131) and well past form 9 (+47).

## Changes from s17/s18

1. **Probe before writing (s18's rule, MAP 2026-10-30).** Every idea went through `isee-math-s19-work/probe.mjs`
   BEFORE an item existed: the mandated `mf30-kw.mjs` keyword probe over a fresh `mf30-dump.mjs` dump (4,204 live
   maths rows, every family, + 1,593 prior SAT batch items) plus a TF-IDF nearest-live line. The idea files and
   outputs are `isee-math-s19-work/ideas/*.txt` and `probes/*.json`. Same-method hits were dropped, not reworded.
2. **Screen in the authoring loop (MAP lesson: a closed rule list is not the attack, but central keys are a known
   options-only tell).** `merge.mjs` refuses any option set where the key is nearest the option mean (CENT-a), nearest
   the mean of the others (CENT-b), or a rank-2/3 key sits at 38-62% of the range (CENT-e), or the key is alone in its
   surface form. Items with 4-6 natural errors carry a pool; `merge.mjs` picks the triple that passes, is not a key
   hub, has the key in no +- pair, is not key = sum/difference of two options, then has fewest warnings, then fills the
   least-used key rank. Warnings (CENT-c/d, OUTLIER, CLASS, ADJ-key, SUMOPT) are recorded in `screen.json`, not refused.
3. **Key ranks dealt across all four positions**: ranks 1/2/3/4 = 35/40/27/30, 3 non-numeric (clock times).
4. One author (this session), as s18. No author agents.

## Pre-flight already run (B1, B2, duplicate aids), results recorded before any packet

    B1 math-bank-helper verify      sandbox 135/135, distractors 405/405 recomputed, 0 mismatches
    B2 key extremity                64/131 = 48.9% at an extreme (bar >= 40%, aim 45-60%)  PASS
       numeric hub                  16 structured, 6.3% vs 25.0%, -18.8 points (bar <= control + 10)            PASS
       symbolic hub                 2 structured, 0.0% vs 25.0%                              PASS
       run-middle                   key is the single run middle 9/38 = 23.7% vs 25.0%      PASS
       pair-constant                key in the single constant pair 0/1                      PASS (7 re-authored)
       key-is-sum                   sum node 1/10 = 10.0% vs 25.0%                            PASS
       sign-pair                    2 pair sets, key in pair 0/2                             PASS
       plurality                    lands on key 0/3                                         PASS (2 re-authored)
       stem-duplicates --family isee 0 of 135 against 1,520 live isee rows                   PASS
    math-mechanism-dup (all 4,204 live rows)  0 FLAG, 18 near; hand read: IM19D-01 (= ssat c1aab049, cylinder
       volume under radius/height factors) and IM19B-03 (= sat 62148a8d family, volume scales as the cube) confirmed
       and DROPPED before freeze
    word-3-shingle (shingle.mjs, J >= 0.35)  19 pairs read by hand, boilerplate stems; IM19D-16 (cube from a total ~
       isee f452a6e2) dropped as a borderline; break-test plant CAUGHT (J = 0.74)

## Bars — copied from s17/s18, scaled to 135

- **M1 method search before freeze**: two Claude agents over halves (s17), each comparing its half against all 135
  candidates and the live ISEE + SSAT math rows (with every family greppable), output
  `{id, method, live_dups, batch_dups, borderline, note}`. **Break-test**: the four s16 plants of s17/s18 (IM16C-14,
  IM16F-17, IM16E-02, the IM16C-02 ~ IM16A-07-rewrite pair), ids opaque. Each agent must name every plant in its half
  as a duplicate (borderline does not count, s17 half 2); fewer and that agent is re-run ONCE with a sharper brief that
  does not describe the plants. Confirmed duplicates are DROPPED (s18 rule: no replacement round this time, because
  the replacement would be written without a probe pass), and the batch shrinks.
- **Freeze** after M1: sha256 of the batch file recorded; the B3/B4 renders are REBUILT from the frozen file if M1
  dropped anything (the packets built today are on the pre-M1 file and are then void).
- **B3 options-only**: `make-oo-render.mjs <frozen> --control 100`, three Claude samples. PASS if candidate <= control
  + 5.0; HOLD if >= +12.0; between decided by the unanimous-correct RATE <= control's rate + 10 (batch level; since
  2026-09-25 unanimity is never a per-item verdict, and three samples are one solver sampled three times); VOID if the
  control reads >= 80%. Report the margin as what it measured (options alone), never as "does not leak".
- **B4 with-source**: `make-grade-render.mjs`, the anchored pair only (s18; anchors = `isee-math-s16.grader-anchors.json`,
  18 live rows, 6 per label), each grader as two agents over the same halves. Drop rules 1-5 (s15): (1) a pick differs
  from the key and my hand recomputation agrees; (2) a confirmed second defensible answer; (3) a hand-confirmed free
  elimination killing >= 2 of 3 distractors without the method; (4) confirmed out of band for ISEE Upper Level
  (s17's named techniques); (5) a confirmed live ISEE duplicate. Banked label = anchored-pair consensus, the easier
  label on a split. A named free elimination killing exactly one distractor is recorded, not a drop.
- **HOLD the whole batch if more than 37 of 135 are dropped at B4+B5** (28.1%, s16/s17/s18's proportion; scale to the
  frozen count n as floor(0.281 n) if M1 shrinks the batch).
- **B5** post-freeze duplicates (graders' `duplicate_of_live`, `stem-duplicates`): dropped, never repaired.
- **B6** (coordinator, not this run): ledger entry, `BANK_FAMILY=isee BANK_COHORT=isee-math-s19 BANK_BAND=mixed
  math-bank-helper insert`, then `verify-admission-forms.mjs` and `admission-form-depth.ts --forms 10`.
- **Stop rule**: first failed gate stops the run; nothing is repaired after the freeze; a failing item is dropped.

## Prediction (fixed now)

M1 confirms 10-25 more duplicates (the probe caught most, but s18 showed scripts miss method twins). About 75-80% of
the frozen set survives B3/B4 (s16 90%, s17 79%). Expected insert about 85-100: **form 9 bought, form 10 NOT bought**
(needs 131). If B3 holds, nothing is inserted.

## Process rules

No process killing in any brief. Claude agents only. Completion judged by files on disk. Briefs name `isee-math-s19`
and FOUR choices on the first line. Agents write only their named output file.

## Packets built after this file (prereg sha256 a507cee3 before any packet; this section appended afterwards)

- Batch as built: sha256 `63088a08`, 135 items; author-side fields (strand, s18 origin, unused pool values) moved to
  `isee-math-s19-work/isee-math-s19.meta.json` so the grade render keeps no unrecognised field but family/section.
- M1: `isee-math-s19-work/m1/` (`M1-BRIEF.md`, `m1-candidates.json` 140 = 135 + 5 plant items, `live-isee-ssat.json`;
  `m1.key.json` is the opaque map, not for agents). Plants: H1 holds IM16C-14 (Q041) and IM16C-02 (Q057); H2 holds
  IM16E-02 (Q072), IM16F-17 (Q096) and IM16A-07-rewrite (Q118). 2 agents.
- B3: `isee-math-s19-oo.blind.json` / `.key.json` (135 + 100 live control, blind sha d11df416), brief
  `isee-math-s19-work/packets/OO-SOLVER-BRIEF.md`. 3 samples. Void if M1 drops anything; rebuild from the frozen file.
- B4: `isee-math-s19.grade.json` (render sha 6f9c4988) / `.gradekey.json`, anchors `isee-math-s19.grader-anchors.json`
  (= s16's), brief `isee-math-s19-work/packets/GRADER-BRIEF.md`. Aa and Ab, each over halves 1-68 / 69-135: 4 agents.
  Void if M1 drops anything; rebuild.
