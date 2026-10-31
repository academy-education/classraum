# iTEP SLATE Listening v2 (round 2: to 10 disjoint forms) — pre-registration

Written 2026-10-31, BEFORE any v2 script, item, assignment, checker or author exists, and before any v2 author,
probe, grader or solver has been spawned.

**Why.** Listening v1 (`ITEP-SLATE-LISTENING-V1.prereg.md`) cleared 49 of 56 and staged Part 1 15 dialogues, Part 2
4 conversations, Part 3 3 lectures: **3 disjoint forms** (`verify-itep-draw.ts --section listening`, Parts 1 and 3
bind). Ten forms need 40 / 10 / 10, so the shortfall is **25 dialogues, 6 conversations, 7 lectures**. The owner's
target is 28 / 7 / 7; with about 25% margin this round authors **36 dialogues, 9 conversations, 9 lectures
(36 + 36 + 54 = 126 items)**.

## 0. Format: unchanged from v1 §0

Part 1 2-3 turns 20-55 words, 1 item, `easy`; Part 2 10-20 turns 300-420 words, 4 items, `medium`; Part 3 one block
480-580 words, at most 3,900 characters, 6 items, `medium` for main-idea/detail and `hard` otherwise. Four options;
kinds main-idea, detail, inference, intent-next, purpose, relationship, attitude. Domains as `ITEP_PART_QUOTAS.listening`.

## 1. Brief: NO CUT. Frozen v1 is used unchanged.

Decision under `BRIEF-VERSIONING.md` rule 3, recorded now:

- **Earned: no.** iTEP has no human bridge sitting and no L1 spot; v1 has closed nothing.
- **Blocking: no.** That needs the same tell named independently by both graders in **two consecutive batches**.
  v1 is one batch; its one counted two-grader pattern (p3 a+b sibling cueing, D lecture) is a first occurrence.
- **Broken: no.** v1 cleared 49/56 = 87.5%, the "brief works" band (bar 42).

So the author brief is `briefs/itep-slate-listening-v1.md`, byte-identical (sha256 `7d14a30f…e279`, re-checked by
`assign.mjs`, which refuses on a mismatch), and the pending file stays pending; authors never read it. Method id
**`itep-listening-v1-agent9+cfg-v1`** (same brief and grader brief, nine authors). If lesson 3 (sibling cueing) is
named by two graders again in this batch, that is the second consecutive batch and v3 is a **blocking** cut.

**What v2 applies from the pending lessons, and only through the assignment and the process** (the same route
Grammar v3 used: assignment draws and coordinator process, never new brief text):

1. **Lesson 1 (Part 1 key never shortest, 0/16 twice): key length and script words drawn per author PER PART** —
   each author's 4 dialogues 1 longest / 1 shortest / 2 middle; conversation 1 / 1 / 2; lecture 1 / 1 / 4. Script
   words half `key-most` / half `key-not-most` per author per part. The brief already says these are assigned.
2. **Lesson 2 (one lecture template: a named popular belief refuted, 3 of 4 lectures): a per-lecture `common belief`
   field** in the assignment, drawn over the 9 lectures as `none` x5 (the lecture states no popular or common
   belief at all), `named, and the lecture shows it is right` x2, `named, and the lecture shows it is wrong` x2. It
   is a script shape like `stance` and `idea shape` (brief R8: "follow the shapes in your assignment exactly"); the
   assignment file defines it in one line. Idea shapes widen from 4 to 9 different ones, one per lecture.
3. **Lesson 3 (revision rounds create sibling cueing) and the user's instruction: one revision round, minimal and
   targeted.** The revision prompt names only the property and the items; the author changes as little as possible
   (a distractor or a prompt, not a whole set) and then re-reads every item of each revised set together as a student
   would, checking that no prompt or option answers a sibling. No second revision round, whatever probe 2 finds.
4. **Lesson 8 (process): each author gets its own scratch directory** (`v2-work/scratch/<X>/`) named in its prompt,
   and the packet plan below was computed by `planPackets` on a mock population, not by hand.

Lessons 4-7 (relationship cue, intent-next keyed to the person in charge, narrow main-idea option never keyed,
inference key names its subject) are **queued, not applied**: they would need brief text. Probe and graders watch
for them; a recurrence is recorded in the pending file.

## 2. Population (fixed now)

- **126 items in 54 units: 36 Part 1 dialogues (36 items), 9 Part 2 conversations (36), 9 Part 3 lectures (54).**
  Nine fresh Claude author agents **A..I**, each writing 4 dialogues, 1 conversation and 1 lecture (14 items, v1's
  per-author load). Set ids `ITL2-<X>-D1..D4 | C | L`, qids `<set_id>-<n>`.
- **Assignment** `itep-listening-v2-work/assign.mjs` (sha256 in `v2-work/MANIFEST.json`) -> `ASSIGNED.json`,
  `authors/<X>.md`, `authors/<X>.plan.json`, deterministic from seed `itep-listening-v2-assign`. Disjoint topic lanes
  (A school life, clubs, exams, study habits; B animals and ecosystems; C plants, food, farming; D weather, oceans,
  earth and space science; E towns, transport, buildings, invented local history; F jobs, shops, money, markets;
  G music, art, crafts, museums; H technology, inventions, communication; I the body, sport, sleep and health),
  disjoint name initials (A-B, C-D, E-F, G-H, J-K, L-M, N-P, R-S, T-V-W), 36 different Part 1 settings with fitting
  role pairs, 9 different conversation role pairs, 9 different lecture idea shapes. Kinds: Part 1 shuffled over the
  36 dialogues (detail 9, inference 9, intent-next 9, purpose 5, relationship 4; v1's ratio); Part 2 / Part 3
  multisets drawn under v1's caps and weights, unique within a part (the caps allow 35 Part 2 and 12 Part 3
  multisets, so 9 unique each is feasible). `opens` and `prevails`
  from balanced cycles over the 45 dialogue sets; `about` balanced over the speaker-naming Part 1/2 items; lecture
  `stance` 3/3/3; main-idea `whole-script options` cycled 1/2/4.
- **Inputs to authors:** the frozen brief, their own `authors/<X>.md` and `.plan.json`, and refreshed
  `existing-transcripts.txt` / `existing-names.json` (`dump-existing.mjs`: every listening transcript in the bank,
  staged included, so all 49 v1 survivors; plus every v1 listening authored set, dropped ones included, and every
  iTEP reading draft's opening and names).
- **Nothing is edited after the packet is built.** A dropped item stays dropped.

## 3. Pre-flight, dedupe, break test (structural, not the gate)

- `itep-listening-v2-work/itep-listening-check.mjs` = v1's check with the id pattern `ITL2-[A-I]` and nothing else
  changed: `PROBLEMS 0` per author (`--expect 14 --plan ... --existing-names`) and over all nine (`--expect 126
  --batch`) before the probe. Exits 2 on unreadable / empty / miscounted input.
- **Break test** (`breaktest-check.mjs`, v1's 11 mutations on a v2 author file) must catch 11/11 before the probe.
- **Dedupe** `dedupe.mjs` (new; exits 2 unless it reads 126 v2 items in 54 sets and 56 v1 items in 24 sets): for
  every pair of v2 sets, and every v2 set against every v1 set, flags (a) transcript content-word Jaccard >= 0.20,
  (b) a shared invented name, (c) a key 4-gram shared with any other key, (d) an option text repeated verbatim.
  Break-tested before use: a v2 file with one v1 transcript pasted in must fire (a), and a copied v1 key must fire (c).
  Its flags go to the authors **in the same single revision round as the probe findings** (one round in total).

## 3b. Cross-item probe (v1 §3b, unchanged rule)

One fresh Claude agent reads `probe/PROBE.md` + `probe/items.json` (all 126 items with keys) and writes
`probe/probe1.json`. **Finding:** a property named on 3+ items with the key carrying it in >= 75% or 0% of the items
where it varies; stored answer-letter position is never one. Findings plus dedupe flags -> ONE revision round
(§1 item 3). Pre-flight and dedupe re-run; a second probe (fresh agent, same prompt) is run and **recorded, never
revised**. If a finding is fixed by the assignment (as v1's "Part 1 never shortest" was), it is recorded, not sent.

## 4. Gate (v1 §4, unchanged instrument)

- **Packets:** one cohort `itep-listening-v2` through `agent-review-core.mjs` `planPackets` / `dealPacket`, default
  limits. **Computed now on a mock 126-item population: 4 packets, 40 / 40 / 40 / 6** (p1 = the 36 dialogues + A's
  conversation; p4 = I's lecture alone). `build-packet.mjs` refuses any other plan.
- **Graders:** three fresh Claude agents per packet (12), a and b plain, c adversarial, `COFOUNDER-BRIEF-v2.md`
  (sha256 `3d032066…2ad0`), the v1 prompts word for word (cohort and paths changed only).
- **Decision rules (A1 via agent-review-core, no change):** any non-`unique` verdict drops the item; a dropped item
  takes its whole set; a batch pattern named by two graders on 3+ shared items of one packet counts (letter patterns
  excluded) and drops its items with their sets; a counted union of 50%+ of 126 holds the cohort; no repair inside
  the gate. Scored only by `score.mjs` (exits 2 writing nothing on a missing/malformed/short grader file).
- **Yield bands:** 95+ of 126 (75%) = "brief works"; 63-94 = queue the pending lessons as a cut; under 63, or the
  cohort held = "broken", cut v3 before more scripts. Parts reported separately in items and sets. **Separately
  reported:** whether the staged bank reaches 10 disjoint forms (needs 25 / 6 / 7 survivors of this round).

## 5. No-transcript attack: RECORDED ONLY (v1 §5)

Same instrument and bars: `oo-render.mjs` deals 4 files, at most one item per unit per file (item k of each Part 2/3
set -> file k, lecture items 5-6 unmeasured; dialogues 9 per file: 36 + 72 = **108 candidates**), each interleaved
with the SAME 10 live TOEFL listening control groups as v1 (seed `itep-listening-v1-ctl`, 40 control items). Stem shown,
transcript withheld. Three fresh Claude solvers per file. Margin +25 is written up as a signal and never applied;
control at 75%+ = "no headroom, uninformative" (v1's control was 100%, so this outcome is expected and is not a pass).

## 6. After the gate

Survivors -> `itep-listening-v2.batch.json` (`build-batch.mjs`: cohort `itep-listening-v2`, `verified=false`,
`passage_group_id` `itep-listening-v2-<set_id>`, method id above, `created_at` increasing after v1's). Staged by
`itep-bank-helper.ts stage --expect <n> --apply`, read back by id (all verified=false, 0 true), then
`verify-itep-draw.ts --section listening`: report disjoint forms. No audio generated; nothing released. No app or
player code is touched in this round (another session owns `TestSession.tsx` and the audio player).

## 7. Known risks

- Three samples, not three solvers. Graders read; students listen.
- A lone 6-item packet (p4) lets two graders count a pattern inside one lecture (v1 lost D's lecture this way).
- Nine authors on a brief built for four: more chance that two independently land on the same lecture template; the
  `common belief` draw and the 9 idea shapes are the only guard besides the probe.
- Lessons 4-7 are not applied, so their failure modes can recur and cost sets.

## Results

(2026-10-31, recorded after scoring; no rule above changed)

- **Authoring:** 9 Claude authors, 126 items, per-author pre-flight PASS on hand-in. Batch pre-flight 3 problems (two
  shared key 4-grams F/I, lone "Ask" keyed 3/4); dedupe 2 flags (the same two 4-grams). Break test 11/11 on a v2 file;
  dedupe break test fired (a) Jaccard 1.000 on a pasted v1 transcript and (c)/(d) on a copied v1 key. Highest
  non-flagged transcript Jaccard 0.193 (E-L ~ ITL1-C-L, different subjects). Not flagged, noted: A-C and I-C both
  concern a biology test (study-method swap vs rowing schedule).
- **Probe 1** (`probe/probe1.json`, input `probe/items-r1.json`, pre-revision files `probe/<X>.r1.json`): 8 patterns.
  Sent with the dedupe/pre-flight flags in ONE round (`probe/revision-r1.json`): purpose distractor verbs never keyed
  0/13; purpose key states the obstacle 6/7; lone hedge on key 9/11; blocked first plan never keyed 0/16; Part 2
  objection-prevails never keyed 0/6; Part 3 overclaim never keyed 0/7; attitude dismissive never keyed 0/7. Not sent
  (assignment-fixed, §3b): main-idea detail options never keyed, key the only whole-script option in 6 = exactly the
  6 `whole-script options: 1` items. Authors changed 2-3 items each (21 changes). Batch pre-flight then failed once
  (lone hedge never key 0/4, an over-correction); I changed one distractor word in I-L-2 (v1 precedent: a mechanical
  pre-flight fix, not a second probe round). Pre-flight PASS per author and batch; dedupe 0 flags.
- **Probe 2** (`probe/probe2.json`, recorded, NOT revised): abandoned first plan never keyed 0/22; intent-next key is
  the workaround 13/13; key in the most-similar pair in Parts 2-3 17/20; Part 2 woman's side wins 9/9 (assignment:
  prevails was cycled over all 45 sets, Part 2 drew woman 5 / neither 4 / man 0); deferred outcome keyed in twin
  main-ideas 4/4; broadest main-idea option keyed 9/9; attitude favourable 7/8.
- **Packets:** 40/40/40/6 as computed in §4. 12 graders, 378 verdicts.
- **Gate** (`score.mjs`): **91 of 126 cleared, 72.2% = the 63-94 band ("queue the pending lessons as a cut").** No
  hold. Counted patterns: p1 a+c `key_form` (key paraphrases, distractors echo) and b+c `one_template` (blocked plan ->
  substitute keyed), union 7 dialogues; p2 a+c `key_in_near_duplicate_pair` on C-C-3, B-C-4, B-L-6, E-C-4 (the
  `whole-script options: 2` shape) -> C, B, E conversations and the B lecture. Item drops: G-C-4 broken by a, b, c (the
  revision round changed "Ask their father's permission" into "Get ...", an outcome the script leaves open); B-D1-1 and
  I-C-3 by c alone. Letter patterns excluded (A1.1).
  **Parts:** Part 1 27/36 dialogues; Part 2 16/36 items, **4/9 conversations (named: under half)**; Part 3 48/54,
  8/9 lectures.
- **10 forms: NOT reached.** Survivors 27 / 4 / 8 against the 25 / 6 / 7 needed; Part 2 is 2 conversations short.
- **No-transcript attack (recorded only):** candidate 248/324 = 76.5% (108 items) vs the identical 40 v1 controls
  116/120 = 96.7%; margin -20.1; control >= 75%, so "no headroom, uninformative".
- **Staged:** `itep-listening-v2.batch.json` (91) -> `itep-bank-helper.ts stage --expect 91 --apply`, 0 hash clashes,
  read back by id 91 false / 0 true. `verify-itep-draw.ts --section listening`: pools P1 42, P2 32 (8 conversations),
  P3 66 (11 lectures); full 14/14 draw, sets whole and in order, live path refuses, every script voiceable.
  **Disjoint full forms: 8** (Part 2 binds). No audio generated; nothing released.
- Lessons 9-13 in `briefs/itep-slate-listening-v1.pending.md`.
