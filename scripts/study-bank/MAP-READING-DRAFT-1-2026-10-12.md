# MAP Growth Reading `map-reading-draft-1` (2026-10-12): AI drafts staged for the co-founder's edit

**48 items (12 passages x 4) INSERTED STAGED: `verified=false`, `archived=false`, `family='map'`,
`section='reading'`, cohort `map-reading-draft-1`, one `passage_group_id` per passage
(`map-draft1-M1-P01` .. `map-draft1-M1-P12`).** MAP is not a shipped family ("Coming soon" in the app).
`bank-state.mjs counts` shows map/reading 0 drawable, 48 STAGED. Nothing is released, and nothing here is
a gate.

This is the owner's route for B11, the same one SSAT reading took on 2026-10-11 ("MAP test needs to keep
going"). Eight agent-only MAP comprehension pilots failed: the options leaked the answer, or the
distractors were dead (MAP-RESEARCH §14-18, REGISTER B11). Now the AI drafts each passage and its four
questions, the co-founder spends about ten minutes per passage fixing giveaway choices in the Drafts tab,
and our checks run on **his edited version**. Every number below describes the drafts as inserted. None
of it is a verdict on what will ship.

## The screen

`/admin/bank-qc?tab=drafts` now serves a closed allowlist of draft families (`DRAFT_FAMILIES` in
`src/lib/study/ssat-draft.ts`). The contract is `SSAT-DRAFT-EDIT-CONTRACT.md`.

| family | family / section | cohort | choices |
|---|---|---|---|
| SSAT reading | `ssat` / `reading` | `ssat-reading-draft-%` | 5 (unchanged) |
| MAP reading | `map` / `reading` | `map-reading-draft-%` | 4 |

- **family/section values.** No code decides MAP's values. The MAP pilot batch files already carry
  `family: 'map'` and `map_subject: 'reading'`, so the rows use `family='map'`, `section='reading'`.
  `MAP-LAUNCH-PLAN.md` §5, written the same day, adopts the same values. If the launch ever changes
  them, change the allowlist, the contract and these 48 rows together.
- **What the screen does for MAP.** Each passage in the list shows a test chip, and a test filter appears
  once two families have drafts. A MAP passage opens with exactly 4 choice boxes, and both the screen and
  the server refuse anything but 4 distinct choices. A group that mixes families is refused (403).
- **Unchanged.** The server still refuses any non-draft row and can never set `verified` or `archived`.
  The SSAT tests (`ssat-draft.test.ts`, `bank-qc-drafts.test.ts`) pass unchanged.

## Method

- **Authors.** Three Claude author agents ran in parallel on disjoint assignments:
  - A: four literary sets (fiction g5, poem g6, fiction g7, fiction g8);
  - B: fiction g5, an original folktale g6, science g7, science g8;
  - C: history g5, how-it-works g6, biography g7, opinion g8.
- **Brief** (`MAP-READING-DRAFT-1-AUTHOR-BRIEF.md`). Its main rules:
  - four questions per passage: central idea or theme; one text-evidence question (detail or
    inference); vocabulary in context; one craft question (purpose, structure, point of view or
    figurative language). These are MAP's CCSS_2024 strands (MAP-RESEARCH §12), and real MAP item sets
    hold four items per passage (§4);
  - the SSAT lure kinds, carried over;
  - the MAP pilots' lessons: no world-knowledge answers; vocabulary options must be meanings a reader
    could read into this sentence; no single-sentence kills; no textbook-analysis keys;
  - the naturalness tells banned (filler negations, feeling-list endings, anchor-word repetition);
  - a banned-topic list covering every earlier MAP pilot and SSAT batch.
- **Format sources.** Only public, citable format facts were used. No NWEA item and no Herald file was
  opened (MAP-RESEARCH §9).
- **Mechanical pre-check** (`merge.mjs`): 0 problems.
  - Word limits per grade, bands per grade, and the four kinds per passage.
  - 4 distinct choices, key present, `why` verbatim, choice lengths within 1.5x.
  - No explanation names a letter, 3 rationales per item, and `map_area` matches the kind.
  - Paragraph numbers are in range, and each vocabulary word is in its paragraph.
- **Key slots.** Re-dealt by a seeded balanced shuffle: A 12, B 12, C 12, D 12. The deal allows no slot 3+
  times in one passage and at most 2 passages whose four keys form a complete ABCD permutation (the
  CLAUDE.md tell). Distractor order was shuffled too.
- **Options-only check** (diagnostic, NOT a gate). One isolated render held options only, with **no
  passage and no stem**.
  - It contained 72 items: the 48 candidates plus an in-run control of 24 live 4-choice ISEE reading items.
  - The control reuses MAP pilot 2's control R (`map-pilot-2-control-r.batch.json`, the same 8
    main-idea items, all still live and unchanged), widened to the candidate's kinds with 16 seeded
    items: detail 5, inference 5, purpose 4, attitude 2. Vocabulary is excluded. The 24 come from 20
    passage groups.
  - Control choices were re-dealt 6/6/6/6, and no two items from one passage sat next to each other.
  - Three fresh solver samples each opened only their own byte-identical copy (sha256 `7948996b...`,
    checked after the run) and gave a pick and a reason.
- **With-source graders.** Two fresh graders saw each passage with its items, key withheld, plus the grade
  and target band. They returned pick, second defensible answer, key concern, per-distractor quality, a
  difficulty and band estimate, off-band, too-easy and above-band vocabulary.
- **Fixes before insert: mechanical only** (`fixes` in the batch file). Giveaways were left alone for the
  editor (`agent-rewrite-inverts-tell`).

## Passages

| set | title | type | genre | grade | target band | words | vocabulary word |
|---|---|---|---|---|---|---|---|
| M1-P01 | The Corner of Mr. Halvorsen's Lawn | literary | fiction | 5 | RIT 190-199 | 223 | patrolled |
| M1-P02 | Hand-Me-Down | literary | poetry | 6 | RIT 200-209 | 138 | swallow |
| M1-P03 | Channel Open | literary | fiction | 7 | RIT 210-219 | 338 | reported on |
| M1-P04 | Ashby Copper | literary | fiction | 8 | RIT 210-219 | 377 | counterfeit |
| M1-P05 | The Cereal Box Voice | literary | fiction | 5 | RIT 200-209 | 225 | wince |
| M1-P06 | Fire for Dera | literary | folktale | 6 | RIT 200-209 | 271 | kindling |
| M1-P07 | The Gecko That Darkens at Dawn | informational | science | 7 | RIT 200-209 | 331 | cue |
| M1-P08 | The Turbine That Stopped at Sunset | informational | science | 8 | RIT 210-219 | 378 | modest |
| M1-P09 | The Fire on Tanner Street | informational | history | 5 | RIT 190-199 | 221 | company |
| M1-P10 | Steering by the Wind | informational | how-it-works | 6 | RIT 200-209 | 279 | aloft |
| M1-P11 | The Man Who Planted Halvern | informational | biography | 7 | RIT 210-219 | 319 | hardier |
| M1-P12 | Read the Names Quietly | informational | opinion | 8 | RIT 210-219 | 353 | modest |

- **Grade and type mix.** Three passages per grade, 6 literary and 6 informational.
- **Craft questions:** purpose 4, structure 3, point of view 3, figurative 1. Text evidence: inference 10,
  detail 2.
- **Difficulty labels:** 12 easy, 24 medium, 12 hard.
- **The bands are targets, never measured RIT** (MAP-RESEARCH §10). P07 sits at grade 7 with a 200-209
  target by assignment.
- **The poem is 138 words**, inside the brief's verse range (120-260).

## Options-only (no passage, no stem): candidate against control

| population | hits | rate | unanimous on key |
|---|---|---|---|
| **candidate, non-vocabulary (36)** | 91/108 | **84.3%** | 22/36 |
| candidate, vocabulary (12) | 19/36 | 52.8% | 4/12 |
| candidate, all 48 | 110/144 | 76.4% | 26/48 |
| **live control (24)** | 30/72 | **41.7%** | 6/24 |
| control, the 8 pilot-2 control R main-idea items | 8/24 | 33.3% | 2/8 |

- **The control sits above the four-choice line this time.** The same 8 main-idea items measured 25.0% in
  pilot 2 and 33.3% here. The widened kinds ran higher: detail 53.3%, inference 66.7%, attitude 50.0%,
  purpose 8.3%. Read the deviation against 41.7%, not 25%.
- **The deviation is +42.6 points** on non-vocabulary. That is the same picture as SSAT draft 1 (83.9% vs
  20.0%) and MAP pilots 1-2 (100%, 83.3%). Single-world agent drafting is guessable, which is why a person
  edits the options.
- **By kind (candidate):**

  | kind | rate |
  |---|---|
  | theme | 17/18 |
  | inference | 25/30 |
  | central idea | 13/18 |
  | purpose | 12/15 |
  | structure | 8/9 |
  | point of view | 8/9 |
  | figurative | 3/3 |
  | detail | 5/6 |
  | vocabulary | 19/36 |

- **By passage:** from 6/12 (P12) to 11/12 (P03, P04, P07).
- **Samples are correlated** (one model sampled three times). On 29 of 48 candidate items all three chose
  the same letter, against 9 of 24 control items. Read the rates as means.
- **No-signal picks.** Of the picks the solvers labelled "no signal", 5 of 12 hit the key on candidates and
  13 of 48 on the control. Sample a gave one generic reason ("consistent with sibling questions") on 59
  items, so `oo_notes` draws its useful reasons from samples b and c.
- **Per-item `oo_hits` histogram:**

  | oo_hits | items |
  |---|---|
  | 0 | 5 |
  | 1 | 2 |
  | 2 | 15 |
  | 3 | 26 |

### The giveaway patterns the solvers named

1. **The keys tell one story across the set.** This was the most-cited cue, as in SSAT. Examples:
   "matches handed-down object becoming one's own (Q065)"; "nervousness fits Q070 calm memory";
   "consistent with wind above still ground finding".
2. **Theme: the key is the upbeat, universal lesson.** Examples: "universal positive theme", "balanced
   universal theme". Result: 17/18.
3. **Inference: the key is the story's resolution.** Examples: "classic mutual-waiting twist", "resolution
   of nest story".
4. **Central idea: the broadest summary.** Distractors are one detail, or a reversed claim.
5. **Craft: the key names the textbook device.** Examples: "flashback explanation typical", "competing
   explanations tested", "figurative, warm image; others literal or negative".
6. **Vocabulary: the key fits the story's topic**, while the wrong meanings are unrelated senses.
   Example: "kindling-type definition fits fire story". Both graders called several of these wrong
   meanings dead.

Patterns 1 and 4 are already in the shared guidance box (SSAT). Patterns 2, 5 and 6 differ, so the
Drafts tab shows three extra bullets on MAP passages only, under "Also seen in the MAP drafts". Pattern 3
is close to SSAT's inference bullet and is not repeated.

## With-source graders

- **Both graders picked the key on all 48 items.** No grader flagged a wrong key.
- **Second defensible answer:** 3 items, each named by one grader only (grader a): P02 theme, P04
  vocabulary, P06 purpose. Grader b found none.
- **Dead distractors:** 16 items. On 11 of them both graders named the same option dead. Most are
  vocabulary senses nobody would read into the sentence ("rested quietly on", "hang high above", "kept
  secrets about"), plus extreme theme options.
- **Too easy:** 3 items (P06 vocabulary, P11 inference, P11 point of view). P06 "kindling" can be
  answered from general knowledge (grader a).
- **Off band:** 42 of 96 judgements say "easier than target" and 1 says "harder" (P10 inference).
  - **By kind:** vocabulary 16/24, point of view 4/6, theme 6/12, central idea 5/12.
  - **By grade:** g5 11/24, g6 11/24, g7 14/24, g8 6/24.
  - This is the pilots' one-directional calibration miss again (§14-17). The authors' sense of a band is
    generous, worst at grade 7.
- **Above-band vocabulary:** none.

### Mechanical fixes made before insert (all recorded in the batch file's `fixes`)

| set | change | reason |
|---|---|---|
| P08 | paragraph 1 "On quiet spring evenings ... it would brake ... and send" becomes "Instead, on quiet spring evenings ... it kept braking ... and sending" | the shutdowns read as part of what the engineers expected (both graders) |
| P12 | "from Aaron to Zuniga" becomes "from Abbott to Zuniga" | a surname-order list cannot start at a first name (grader a) |
| P12 | "four hundred" names becomes "two hundred" (three places) | 400 names in six minutes is under a second each (grader a) |
| P07 | biologist "Rosa Ankeny" becomes "Mira Ankeny" | Rosa is also P03's narrator (grader b) |

No fix touched a stem or a choice, so the graders were not re-run. Four orchestrator notes are carried in
`grader_flags`, marked `[orchestrator, from grader x]`, and do not count toward risk:
- the vocabulary word "modest" is tested in both P08 and P12 in nearly the same sense;
- P05's inference question tests almost the same idea as its theme question;
- the P06 folktale never says how the visitors knew about the one small flame.

## Risk (contract rule, same as SSAT)

The rule:
- **high:** `oo_hits >= 2`, or any grader names a second defensible answer or a wrong key;
- **med:** `oo_hits = 1`, or a dead-distractor or too-easy flag;
- **low:** otherwise.

| risk | items |
|---|---|
| high | **41** |
| med | **4** |
| low | **3** |

- **Why the high items are high:** options-only alone 38, both options-only and a grader 3, grader alone 0.
- **The 4 med items:** 2 vocabulary, 1 central idea, 1 inference.
- **The 3 low items:** the vocabulary items of P05, P11 and P12.
- **High items per passage:** 3 or 4 everywhere. P01, P03, P04, P06 and P07 have 4 each.

**Edit-screen compatibility** (checked with the screen's own `src/lib/study/ssat-draft.ts`,
`screencheck.ts`):
- `isDraftRow`, family `map-reading` and `awaiting_edit` hold on 48/48 rows.
- `ssatContentHash` equals the stored `content_hash` on 48/48.
- `validateItemEdit(item, 4)` reports 0 errors on 48/48.
- `groupFamily` resolves 12/12 groups of 4.
- The key is the uniquely longest choice on 16/48. Chance is 12, and the screen warns on these.

**Database, after insert:** 48 rows in 12 groups of exactly 4. All are 4-choice, `verified=false` and
`archived=false`, and every row carries `verify_meta.draft` with status `awaiting_edit`.

## What happens next

1. The co-founder edits the 12 sets in the Drafts tab (filter: MAP reading).
   `verify_meta.draft.original_item` holds the item as inserted, so his edits can be diffed.
2. **Our checks run on his edited version:** the options-only attack paired with a live control, the
   with-source graders, and the structural pre-flight. Then a human sitting decides (bank-gate §5).
   MAP still has no human sitting.
3. **Nothing here can be released as drafted.** It also cannot be drawn until MAP ships as a family, and
   that is a separate piece of work.

## Evidence

- **Batch file:** `map-reading-draft-1.batch.json` (sha256 `93eb9d7d...`), which holds:
  - every inserted row, with its `verify_meta.draft` (per-item `oo_notes` with the three samples'
    reasons, and `grader_flags`);
  - the passage list and the fixes.
- **Author brief:** `MAP-READING-DRAFT-1-AUTHOR-BRIEF.md`.
- **Scratch:** `scratchpad/map-draft1-work/` (git-excluded). It holds:
  - `authored/`;
  - `oo/` (render, key, three sample files, per-item scores, summary);
  - `ws/` (render, both grader files, flags);
  - the merge, fix, build, screencheck and insert scripts.
- **Ledger:** `map-reading-draft-1-2026-10-12` (staged-for-human-edit).
