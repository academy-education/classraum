# iTEP SLATE Reading v2 (round 2: Part 3-heavy) — pre-registration

Written 2026-10-31, BEFORE any v2 passage or item exists and before any v2 author, probe, grader or solver has been
spawned.

**Why.** Reading v1 (`ITEP-SLATE-READING-V1.prereg.md`) cleared 15 of 48, the prereg's "broken" band: every Part 3
set (0/24) and half of Part 2 fell to one batch tell all three graders named (`one_template`: the brief's rule M
required an over-general option in every main-idea set, so that option was never the key). Staged after v1: Part 1
7 texts, Part 2 2 passages, Part 3 0. Ten forms need 20 / 10 / 10. This round authors **16 Part 3 passages, 10 Part 2
passages and 16 Part 1 texts**, which would reach the ten-form floor on Parts 2 and 3 at a 62.5% / 80% passage yield
and leaves Part 1 for a later round only if fewer than 13 of 16 texts clear.

## 0. Format decisions (unchanged from v1 §0)

Part 1 = a standalone 55-95-word text with one question (still unconfirmed against the live demo; owner open item 3).
Part 2 180-240 words, 4 questions; Part 3 450-560 words, 6 questions; four options; kinds detail, vocabulary,
main-idea, not-except, purpose, inference. Difficulty: Part 1 `easy`, Part 2 `medium`, Part 3 `medium` for main-idea
and detail and `hard` otherwise.

## 1. Brief: v2, cut as "broken"

`briefs/itep-slate-reading-v2.md` (sha256 recorded in `itep-reading-v2-work/MANIFEST.json` at this commit). Cut under
BRIEF-VERSIONING rule 3 ("broken": v1's yield fell in its prereg's stop band) and rule 4 (folds every pending lesson
at once). Lessons absorbed from `briefs/itep-slate-reading-v1.pending.md`:

1. **Rule M replaced.** No key property is required or forbidden (new §0). Each main-idea item gets a per-item shape
   drawn by `assign.mjs`: `breadth` from a balanced cycle over the batch of `key-broadest` (no distractor wider than
   the key), `distractor-broader` (one wider distractor, which must be wrong), `all-level` (four whole-text summaries);
   `cast` drawn from a menu (detail, misreading, minor-point, two-part; plus the broader option where the breadth asks
   for it); no cast on more than half the main-idea items (assign.mjs refuses).
2. **Key form balanced:** half the main-idea keys `two-part`, half `one-part`; a two-part key always has at least one
   two-part distractor.
3. **Vocabulary:** the three wrong senses come from at least two areas of life (R8).
4. **Gender:** options say "the writer" unless the text states a gender; the pre-flight flags a gendered pronoun in an
   option when the passage has none.
5. **A broader distractor must be wrong** (contradicted, or about a subject the text does not cover), never a fair
   generalisation (rule M, `distractor-broader`).

Two further changes apply the same principle (randomise at base rate) rather than a new lesson, and are named here so
the method change is complete: **R5 key length is assigned per item** (per author over non-vocabulary items:
floor(n/4) `longest`, floor(n/4) `shortest`, the rest `middle`; enforced by the pre-flight) instead of capped; and
**R10** asks each author to check its own keys for a cross-item property before hand-in. Question-kind order is drawn
per passage (main-idea is not always first; not every passage has one).

- **Method id** `itep-reading-v2-agent8+cfg-v2`. Brief version `itep-slate-reading-v2`; first batch under the cut, so
  if it is ever drawn for a human sitting it is the bridge. Lessons from this round go to
  `briefs/itep-slate-reading-v2.pending.md`; authors never read it.

## 2. Population (fixed now)

- **152 items in 42 units: 16 Part 1 texts (16 items), 10 Part 2 passages (40), 16 Part 3 passages (96).** Eight
  fresh Claude author agents **A..H**. Each writes 2 Part 1 texts and 2 Part 3 passages; A and E write 2 Part 2
  passages, the others 1. Ids `ITR2-<X>-P1A|P1B|P2A|P2B|P3A|P3B`, qids `<set_id>-<n>`.
- **Assignment** `itep-reading-v2-work/assign.mjs` (sha256 in MANIFEST) -> `ASSIGNED.json` and `authors/<X>.md`,
  deterministic from seed `itep-reading-v2-assign`. Disjoint topic lanes (A natural world; B sports and health;
  C towns, markets, crafts, trade; D plants, food, farming, weather; E travel and transport; F inventions and
  communication; G music, art, buildings, libraries, museums; H earth and space science, school clubs), disjoint name
  initials (A-B, C-D, E-G, H-J, K-L-U, M-O, P-R, S-Z less U/X), 16 different Part 1 genres, each author's two Part 3
  passages in different genres. Kinds: Part 1 shuffled over the 16 texts (detail 5, purpose 3, vocabulary 3,
  main-idea 3, inference 2); Part 2 / Part 3 kind multisets drawn under caps (Part 2: at most 1 main-idea, vocabulary,
  not-except, purpose, 2 inference, 2 detail, at least 1 detail; Part 3: at most 1 main-idea and 1 not-except, at most
  2 of each other kind, at least 1 detail and 1 vocabulary), no multiset repeated within a part, order shuffled. As
  drawn: main-idea 20, detail 44, vocabulary 30, purpose 22, inference 22, not-except 14; main-idea breadth 7/7/6,
  key form 10/10; key length 28 longest / 28 shortest / 66 middle (non-vocabulary); not-except key half contradicted,
  half not included.
- Authors read the brief, their own assignment, `itep-reading-v2-work/existing-passages.txt` and
  `existing-names.json` (dumped by `dump-existing.mjs`: every passage row in the bank, 4,227 distinct passages, plus
  the 7 v1 draft passages and 18 v1 draft names not in the bank) and may run the pre-flight on their own file.
  Nothing else; no v1 item file.
- **Nothing is edited after the packet is built.** A dropped item stays dropped; a repaired item is a new batch.

## 3. Pre-flight (structural, not the gate)

`itep-reading-v2-work/itep-reading-check.mjs` (sha256 in MANIFEST; v1's checker plus: ITR2 ids and per-author set
lists from ASSIGNED.json, the assigned key-length rank, the gendered-pronoun check, a `two_part` lone feature,
prompt-opening caps 3 per author and max(4, ceil(n/16)) per batch, the uniquely-longest/shortest caps over
non-vocabulary items) must print `PROBLEMS 0` per author (`--expect <n> --assigned --existing-names`) and over all
eight files (`--expect 152 --batch`) before the packet is built; exits 2 on unreadable/empty/miscounted input.
**Break test before the packet** (`breaktest-check.mjs`, each mutation of a real author file must fail): a non-verbatim
`why`; an inference without `why2`; a name shared across two sets; a name from `existing-names.json`; a length ratio
over 1.5; a key that is the lone hedge in 3 of 3 items; a fifth choice; the wrong kind order; a key that breaks its
assigned length rank; a "her" in an option of a passage with no she/her. A cross-author collision found by the batch
run is resolved before the packet by the author later in the alphabet.

## 3b. Cross-item probe (new; before any gate grader)

As the task requires, one grader is asked explicitly, before the gate, whether keys are guessable from patterns
ACROSS items. **Probe:** one fresh Claude agent reads `itep-reading-v2-work/probe/PROBE.md` and `probe/items.json`
(all 152 items, grouped by author and passage, with kind, choices and key marked; built by `build-probe.mjs`) and
writes `probe/probe.json`: every property it can find that predicts the key across items (length, breadth, number of
parts, hedges, absolutes, first words, words copied from the passage, the role of each option in the cast, sentiment,
position of the tested line, kind order), each with the items, the count of items where the key has it out of items
where it varies, and whether it would let a student pick or eliminate options without the passage.

**Decision rule, fixed now:** a property the probe names on 3+ items with the key carrying it in >= 75% or in 0% of
the items where it varies is a **finding**. Each finding's items go back to their original author for one revision
round (the author is told the property and the items, not the probe's other notes); then the per-author and batch
pre-flight re-run, and a second probe pass (fresh agent, same prompt) is run and recorded. Findings from the second
pass are recorded and NOT revised (they go to the gate as they are; the gate graders may name them). The packet is
built only after this. If the probe names nothing, the files freeze as they are.

## 4. Gate (v1's instrument, unchanged)

- **Packets:** the 152 items as ONE cohort `itep-reading-v2`, built from the frozen files by
  `itep-reading-v2-work/build-packet.mjs` through `agent-review-core.mjs` `planPackets` / `dealPacket` with default
  limits (55 items, 10 passage groups per packet). Simulated on ASSIGNED.json at this commit: **4 packets of whole
  units, 46 / 46 / 48 / 12 items** (all 16 Part 1 texts plus A's and B's passages; B-H in id order; the greedy fill
  leaves H's two Part 3 passages as a 12-item fourth packet). Patterns therefore count within a packet only. Packet format, prompts and brief
  copy as v1 (`agent-review-build.mjs` shape).
- **Graders:** three fresh Claude agents per packet, a and b plain, c adversarial (the manifest prompts verbatim),
  `COFOUNDER-BRIEF-v2.md` (sha256 `3d032066…2ad0`). Each reads only the brief and its packet.
- **Decision rules** (`AGENT-REVIEW-SSAT-MAP.prereg.md` §3 + Amendment A1, applied by `agent-review-core.mjs`
  `scorePacket` / `scoreCohorts`, no change):
  1. any grader's non-`unique` verdict drops the item;
  2. **a dropped item takes its whole passage set** (Part 1 texts are their own set);
  3. a batch pattern named by two graders on 3+ shared items of one packet counts (answer-letter patterns excluded,
     A1.1); its items drop with their sets; a counted-pattern union of 50%+ of the cohort's 152 items holds all of it
     (A1.2);
  4. no repair inside the gate. Scored only by `itep-reading-v2-work/score.mjs`, which exits 2 writing nothing if any
     grader file is missing, malformed or short.
- **Yield bands** (v1's, scaled): 114+ of 152 survive = "brief works, scale it"; 76-113 = scale with the pending
  lessons queued; under 76, or the cohort held = "broken", cut v3 before more passages. Each part is reported
  separately (items and passages), and a part under half its items is named.

## 5. The no-passage blind attack: RECORDED ONLY

Run and reported, decides nothing, for v1 §5's reasons (agent-written reading saturates the model: SSAT draft 1 AI
83.9% vs the co-founder 16.7%; iTEP has no human sitting; v1's control sat at 60%). Instrument as v1:
`itep-reading-v2-work/oo-render.mjs` deals the candidates into 4 files with at most one item per unit per file (item k
of each Part 2/3 unit -> file k, items 5-6 of Part 3 unmeasured; Part 1 texts 4 per file: 26 + 16 = 120 measured),
each interleaved with the SAME 10 matched-control groups as v1 (live `isee/reading`, seed `itep-reading-v1-ctl`, first
4 items, item k -> file k), prompt and passage withheld. Three fresh Claude solvers per file (12). Scored by
`oo-score.mjs` (rates with denominators, margin, per-file best-fixed-letter line, unanimity per arm, batch-level
only). A margin of +25 or more is written up for the owner as a signal, never applied to an item; a control at 75%+
is reported as "no headroom, uninformative".

## 6. After the gate

- Survivors -> `scripts/study-bank/itep-reading-v2.batch.json` by `build-batch.mjs` (staging shape as v1: family
  `itep`, section `reading`, domain = the `ITEP_PART_QUOTAS` part label, cohort `itep-reading-v2`, `verified=false`,
  `passage_group_id` `itep-reading-v2-<set_id>` for Parts 2-3 and null for Part 1, `created_at` increasing in authored
  question order). Refuses unless the pre-flight still passes, the score file exists and is not held, and every set is
  whole or absent.
- Staged through `itep-bank-helper.ts stage --expect <n> --apply` (its passage-set refusals unchanged), read back by
  id (all verified=false), then `verify-itep-draw.ts --section reading` and the disjoint full-form count reported.
- Nothing is released. Release goes through a Daniel audit sample, as for every agent-cleared reading cohort.

## 7. Known risks, stated now

- **Three samples, not three solvers** (CLAUDE.md); an all-unique clear is weaker than it looks.
- **Assigned shapes can themselves become a tell** if an author realises them mechanically (e.g. every `longest` key
  padded with the same filler). The probe (§3b) and the c grader are the check; nothing structural catches it.
- **Part 3 is six items per set**: at a 95% per-item clear rate a set survives about 74% of the time.
- **Packets split by unit id**, so cross-author patterns are visible to the gate only within a packet; the probe sees
  all 152.
- **Inference and not-except** (36 items) are the kinds most often found with a second defensible answer.
- **Part 1 shape is unconfirmed** (§0).

## Results (2026-10-31, recorded after scoring; no rule changed)

- **Authoring:** 8 authors, 152 items, per-author pre-flight PASS on hand-in. Two authors (B, D) printed the head of
  `ASSIGNED.json` while checking its format and so saw author A's P1A shape (reported by them; A's item unaffected).
  Batch run failed 8 (prompt openings "which of the following" x16, "according to the passage," x14, "why does the
  writer" x13 against a cap of 10; two shared key 4-grams; "delicate" tested by A and D; one repeated option);
  resolved per §3 by B, D, F, G, H. Break test 10/10 (`breaktest-check.mjs`).
- **Probe 1** (`probe/probe1.json`): 6 patterns. Five were findings under §3b and went back for one round (A, B, C, D,
  E, F, G): main-idea key always in the pair sharing a 3+-word opening (10/10); a failure-ending option never keyed
  (0/7); "X and why Y" never keyed (0/5); a number/time detail never keyed (0/4); vocabulary odd-one-out (3/3). The
  sixth, **key letter position in stored order** (B/F/G/H slot A, E slot D), was not sent for revision: stored order
  never reaches a grader or a student (`dealPacket` and `shuffleDrawnChoices` both reshuffle; A1.1). That is a
  judgement outside §3b's literal rule, recorded here. One revision introduced an R6 overlap (C-P3A-5 confirming a
  P3A-2 option), swapped before freeze. **Probe 2** (`probe/probe2.json`, recorded, not revised): letter position
  again; main-idea key names a change/outcome 12/14; inference key never the highest passage-overlap option 0/22;
  hedge on inference keys 7/9; F's keys longest-by-words 12/16; over-general main-idea option never keyed 0/6.
- **Gate** (`score.mjs`; 4 packets, 12 graders; files in `results/itep-reading-v2--p*/`): 456 verdicts, 444 unique.
  Item drops: B-P3A-4 (c), B-P3A-5 (a, c: "by the end of the first year" admits the spring nickname), D-P3B-1..6
  (c hold, a on item 2: "each morning" vs "Tuesdays and Fridays"). **One counted pattern:** p2 a+b `one_template` on 6
  main-idea items (C-P2A-3, C-P3A-5, C-P3B-5, D-P3B-3, E-P2B-4, B-P3B-2); union 6/152 = 3.9%, no hold. Uncounted
  single-grader patterns: p1 a `convergence_key`, p1 c vocabulary `one_template`, p2 a vocabulary `one_template`, p3 a
  `identical_key_prose` ("the sceptic comes round") and plot `one_template`; letter runs excluded (A1.1).
  **Cleared 114 of 152 = "brief works" band (114 is the bar).** Part 1 16/16 texts; Part 2 32/40 items, 8/10
  passages (C-P2A, E-P2B dropped); Part 3 66/96 items, 11/16 passages (B-P3A, B-P3B, C-P3A, C-P3B, D-P3B dropped).
  No part under half. Lessons 1-8 in `briefs/itep-slate-reading-v2.pending.md`.
- **Blind attack (recorded only, §5):** candidate 245/360 = 68.1% (120 items) vs control 89/120 = 74.2% (v1's exact 10
  groups, verified by id), margin -6.1; unanimity 95/120 vs 30/40. The control sits at 74.2%, a hair under the 75%
  "no headroom" line, and higher than in v1 (60.0%) on the same items with fresh solvers: three samples of one model,
  not an instrument. Nothing read from it.
- **Staged:** 114 rows, `itep-reading-v2.batch.json` -> `itep-bank-helper.ts stage --expect 114 --apply`, read back
  114 false / 0 true. `verify-itep-draw.ts --section reading`: Part 1 pool 23, Part 2 40 (10 passages), Part 3 66
  (11 passages), full 12/12 draw, passages whole and in order, live path refuses; **disjoint full forms: 10.**
- Nothing released; release goes through a Daniel audit sample.
