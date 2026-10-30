# iTEP SLATE Reading v1 (pilot: four forms) — pre-registration

Written 2026-10-31, BEFORE any passage or item exists and before any author, grader or solver has been spawned.

**Why.** iTEP SLATE is wired hidden (REGISTER 2026-10-31) and Reading draws 0 of 12. The ten-test floor needs 120
Reading items: 20 Part 1 short texts, 10 Part 2 and 10 Part 3 passages (blueprint §5.4). This pilot measures whether
the frozen brief yields passage sets that clear the agent-review gate, on four forms' worth of material, before any
scale-up.

## 0. Format decisions (fixed now)

- **Part 1 = two separate short texts with ONE question each** (two standalone items per form). Basis: the blueprint's
  best-supported reading (§2C): the newest official source (B, 2022) says "Two ... passages of approximately 50
  words, followed by two multiple-choice questions"; O and G (2012-2014) say one passage with 2 questions; the count is
  2 either way. The live wiring already encodes this (`ITEP_PART_QUOTAS.reading` Part 1 `itemsPerGroup: 1`), so the
  draw needs no change. **Still unconfirmed** against the live demo's Reading section (owner open item 3). If the demo
  shows one text with two questions, Part 1 rows can be re-paired only by authoring new texts; the v1 Part 1 items stay
  valid as standalone texts. Length 55-95 words (the blueprint recommends 50-100, because the worked SLATE samples run
  longer than 50).
- Part 2 one passage of 180-240 words with 4 questions; Part 3 one passage of 450-560 words with 6 questions; four
  options throughout; question kinds are the blueprint's (detail, vocabulary in context, main idea / writer's problem,
  NOT/EXCEPT, purpose of mention, inference). No insert-a-sentence or summary items (iTEP Academic only).
- Difficulty labels: Part 1 `easy`, Part 2 `medium`, Part 3 `medium` for main-idea and detail and `hard` otherwise
  (blueprint §5.3 mapping: easy A1-A2, medium B1, hard B2-C1; Part 3 is "low-advanced").

## 1. Brief: which base and why

- **Base:** the SSAT Reading d19-22 method (REGISTER 2026-10-31: 138 of 144 cleared, 0 cohorts held, the best
  agent-authored reading result so far): `SSAT-READING-AGENT-BRIEF.md` rules plus the d12-d18 agent-review lessons,
  enforced by `scratchpad/ssat-draft19-work/merge.mjs` refusals (per-passage kind mixes, no shared kind multiset,
  prompt-opening cap, key length-rank caps, absolute/hedge parity). Plus the ISEE d17-21 merge's lone-surface-feature
  check (`isee-reading-drafts-17-21.METHOD.md` §4) and the 2026-10-31 audit note (no proper name reused across passages;
  names checked against live and staged).
- **Adapted for iTEP** in `briefs/itep-slate-reading-v1.md` (sha256 `7ebb96f2…98b5ab`, frozen at this commit):
  four options; ESL level per part (A2 to C1); no attitude kind (not an iTEP kind, and the source of most SSAT
  reused-set flags); a NOT/EXCEPT kind added (R9); main-idea sets built broader / narrower / misreading so the key is
  NOT the broadest option (rule M: SSAT/ISEE graders repeatedly found the broadest option keyed); R1 inference
  distractors must be CONTRADICTED, not merely unmentioned (the COFOUNDER-BRIEF-v2 inference threshold); R3 the
  covered-text test, at least three options believable without the text (the no_source and no_support holds in the
  2026-10-31 SSAT audit); options in one frame (R4; CLAUDE.md "an item leaks when the options differ along the axis
  the stem names").
- **Method id** `itep-reading-v1-agent4+cfg-v2`. Brief version `itep-slate-reading-v1`. Lessons go to
  `briefs/itep-slate-reading-v1.pending.md`; authors never read it.

## 2. Population (fixed now)

- **48 items in 16 units: four forms x (2 Part 1 texts + 1 Part 2 + 1 Part 3).** Four fresh Claude author agents
  **A..D**, one form each, ids `ITR1-<X>-P1A`, `-P1B`, `-P2`, `-P3`, qids `<set_id>-<n>`.
- **Assignment** `itep-reading-v1-work/assign.mjs` (sha256 `14164cb0…13a4`) -> `ASSIGNED.json` (`ee67553e…8ea4d`) and
  `authors/<X>.md`. Disjoint topic lanes (A nature/sports, B towns-markets-crafts/school clubs, C plants-food-weather/
  transport, D technology/arts-buildings), disjoint name initials (A-F, G-L, M-R, S-Z), a genre per text (eight
  different Part 1 genres; Parts 2-3 cover story, first-person school life, informational history, science and
  technology), and a fixed kind list per text. No two Part 2 passages share a kind set; no two Part 3 passages share a
  kind multiset; at most one NOT/EXCEPT per passage. Batch kinds: main-idea 8, detail 11, vocabulary 8, purpose 8,
  inference 9, not-except 4.
- Authors read the brief, their own assignment, `existing-passages.txt` / `existing-names.json` (dumped by
  `dump-existing.mjs` from every passage row in the bank, 4,177 distinct passages) and may run the pre-flight on
  their own file. Nothing else.
- **Nothing is edited after the packet is built.** A dropped item stays dropped; a repaired item is a new batch.

## 3. Pre-flight (structural, not the gate)

`itep-reading-v1-work/itep-reading-check.mjs` (sha256 `8cefea85…52ce`) must print `PROBLEMS 0`, per author
(`--expect 12 --assigned --existing-names`) and over all four files (`--expect 48 --batch`), before the packet is
built. It exits 2 on unreadable/empty/miscounted input. **Break test before the packet:** each of these mutations of a
real author file must make it fail: a non-verbatim `why`; an inference without `why2`; a name shared across two sets;
a name from `existing-names.json`; a length ratio over 1.5; a key that is the lone hedge in 3 of 3 items; a fifth
choice; the wrong kind order. Recorded in the results.

A cross-author collision found by the batch run (shared name, shared key 4-gram, repeated option) is resolved before
the packet by the author later in the alphabet, as in Grammar v2.

## 4. Gate (the SSAT/ISEE reading instrument, unchanged)

- **Packet:** the 48 items as ONE cohort `itep-reading-v1`, built from the frozen files by
  `itep-reading-v1-work/build-packet.mjs` through `agent-review-core.mjs` `planPackets` / `dealPacket` (the same
  functions `agent-review-build.mjs` uses; 16 units, 8 grouped, so one packet of 48, unit and option order seeded).
  Packet format, prompts and brief copy as `agent-review-build.mjs`.
- **Graders:** three fresh Claude agents, a and b plain, c adversarial (the manifest prompts verbatim),
  `COFOUNDER-BRIEF-v2.md` (sha256 `3d032066…2ad0`). Each reads only the brief and the packet.
- **Decision rules** (`AGENT-REVIEW-SSAT-MAP.prereg.md` §3 + Amendment A1, applied by `agent-review-core.mjs`
  `scorePacket` / `scoreCohorts`, no change):
  1. any grader's non-`unique` verdict drops the item;
  2. **a dropped item takes its whole passage set** (Part 2 and Part 3 are drawn whole; a Part 1 text is its own set);
  3. a batch pattern named by two graders on 3+ shared items counts (answer-letter patterns excluded, A1.1: every
     iTEP Reading row is reshuffled per student by `shuffleDrawnChoices`); its items drop with their sets, and a
     counted-pattern union of 50%+ of the cohort holds all 48 (A1.2);
  4. no repair inside the gate. Scored only by `itep-reading-v1-work/score.mjs`, which exits 2 writing nothing if any
     grader file is missing, malformed or short.
- **Yield bands:** 36+ of 48 survive = "brief works, scale it"; 24-35 = scale with the pending lessons queued; under
  24, or the cohort held = "broken", cut v2 before more passages. Each part is reported separately, and a part under
  half its items is named.

## 5. The no-passage blind attack: REPORT-ONLY, and why

The task asked for the attack "if the family's instrument discriminates". Measured history says it does NOT
discriminate on agent-written reading, so it is run and reported but **decides nothing**:
- On the SHIPPED SSAT reading bank model and human agree (21.1% model / 15.0% human), which is why the attack was
  called discriminating (REGISTER 2026-09-12).
- But on **agent-written** SSAT reading the model and the human split: draft 1, AI options-only 83.9% vs the
  co-founder 16.7% on the same 36 items (REGISTER 2026-10-18), and every later human sitting of agent drafts sat at
  0-37.5% (`bank-state.mjs sittings`, 2026-10-31). REGISTER's conclusion that day: "the with-source half and the
  human sitting decide this family, not the blind model number" (CLAUDE.md: where the instrument saturates, the
  with-source half decides). iTEP has no human sitting at all.

Instrument, fixed now: `itep-reading-v1-work/oo-render.mjs` deals the 48 candidate items into **4 files with at most
one item per unit per file** (attack-split rule; Part 3 items 5-6 and Part 2 items beyond 4 stay unmeasured: 40
measured), each interleaved with 10 matched-control items, prompt withheld ("Which of these four is the answer? (the
question and the passage are withheld)"). **Control:** live (verified, not archived) `isee/reading` rows, the nearest
shipped four-option passage family; 10 passage groups with 4+ live items chosen by seeded shuffle
(`itep-reading-v1-ctl`), their first 4 items in stored order, item k to file k. Three fresh Claude solvers per file
(12). Scored by `oo-score.mjs`: candidate and control rate with denominators, margin, the per-file best-fixed-letter
line, and unanimity rate per arm (batch-level only; "three samples, not three solvers").
**Report:** margin; a margin of +25 or more is written up for the owner as a signal, never applied to an item. If the
control lands at 75%+ the run is reported as "no headroom, uninformative" (ceiling check).

## 6. After the gate

- Survivors are written to `scripts/study-bank/itep-reading-v1.batch.json` (staging shape, `family='itep'`,
  `section='reading'`, `domain` = the `ITEP_PART_QUOTAS` part label, cohort `itep-reading-v1`, `verified=false`,
  `passage_group_id` `itep-reading-v1-<set_id>` for Parts 2-3 and null for Part 1, `created_at` increasing in
  authored question order so `passagesInSeededOrder` keeps each passage's questions in order).
- Staged hidden through `itep-bank-helper.ts stage` only after it refuses broken passage sets (a Part 2/3 group whose
  size is not the part's `itemsPerGroup`, items in one group with different passages, a Part 1 row carrying a group,
  out-of-order `created_at`), with jest tests. Then `verify-itep-draw.ts --section reading`.
- Nothing is released. Release goes through a Daniel audit sample, as for every agent-cleared reading cohort.

## 7. Known risks, stated now

- **Three samples, not three solvers** (CLAUDE.md): one model family grades; an all-unique clear is weaker than it looks.
- **Agent graders under-flag what Daniel later finds** (memory agent-reading-comprehension-limit; ~5% residual).
- **Four-option Part 1 items on 60-90 words** are the easiest place to leave a key choosable without the text; R7
  addresses it, and the c grader is asked to look for exactly that.
- **One packet** means every grader sees all four authors, so cross-author patterns are visible; it also means one
  cohort-wide pattern can hold all 48.
- **Part 1 shape is unconfirmed** (§0).

## Results (2026-10-31, recorded after scoring; no rule changed)

- **Authoring:** 4 authors, 48 items. Per-author pre-flight PASS on hand-in; the batch run failed 3 (prompt opening
  "according to the passage," x7 and "what can be inferred" x5, max 4; a lone hedge on a distractor 7 times and never
  on a key). Resolved per §3 by C and D (prompts reworded, hedge words removed with claims unchanged). Final pre-flight
  PASS; break test 8/8 (`breaktest-check.mjs`; the hedge mutation first read "MISSED" because the test expected 3/3
  and the checker reported 3/4: the assertion was too narrow, the checker fired).
- **Gate** (`score.mjs` -> agent-review-score.mjs; files in `itep-reading-v1-work/results/`): 144 verdicts, 143
  unique, 1 `alternative` (c: D-P2-1, a "broader" distractor the passage supports). Patterns: `one_template` on items
  5, 16, 23, 29, 33, 38, 44 named by a, b and c (the over-general main-idea option never keyed). Union 7/48 = 14.6%, so
  no hold; those 7 items drop with their sets. **Cleared 15 of 48: Part 1 7/8, Part 2 8/16, Part 3 0/24. Band:
  broken.** Part 3 and Part 2 are each under half. The cause is rule M of this brief (pending lesson 1).
- **Blind attack (report-only, §5):** candidate 71.7% (86/120, 40 items) vs control 60.0% (72/120), +11.7; unanimous
  32/40 in each arm, on key 26 vs 21. The control's 60% and the deal's 35-45% best-fixed-letter lines mean this
  instrument had little headroom here; nothing is read from it.
- **Staged:** 15 rows, `itep-reading-v1.batch.json` -> `itep-bank-helper.ts stage --apply`, read back 15 false.
  `verify-itep-draw.ts --section reading`: Part 1 2/2 (pool 7), Part 2 4/4 (pool 8, drawn whole, in order), Part 3 0/6:
  SHORT 6 of 12, live path refuses.
- **Next:** cut `itep-slate-reading-v2` folding pending lessons 1-5 (BRIEF-VERSIONING rule 3, "broken"), then author
  Part 3-heavy.
