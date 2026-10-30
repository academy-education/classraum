# iTEP SLATE Grammar v2 (scale-up) — pre-registration

Written 2026-10-31, BEFORE any v2 item exists and before any v2 author or grader has been spawned.

**Why.** The v1 pilot (`ITEP-SLATE-GRAMMAR-V1.prereg.md`) cleared 23 of 24, the "brief works, scale it" band. The
ten-test floor (owner rule) needs 250 Grammar items: 130 Part 1 (Sentence Completion) + 120 Part 2 (Error
Identification), blueprint §5.4. With the pilot's 11 + 12 survivors, the gap is 119 + 108 = 227.

## 0. Brief decision (BRIEF-VERSIONING.md rule 3): NO cut. This batch uses frozen `itep-slate-grammar-v1`.

Checked against each cut condition on 2026-10-31:
- **Earned:** no. Grammar has no autonomy stratum and no Daniel bridge yet; no L1 spot exists.
- **Blocking:** no. Pending lesson 2 (cross-author shared frames) was named by grader a ONLY, in ONE batch. Lesson 1
  (two-reading time adverbial, C12) was named by a and b, but in one batch; blocking needs two consecutive batches.
- **Broken:** no. 23/24 is the top yield band.

So lessons 1-6 stay in `briefs/itep-slate-grammar-v1.pending.md`, to be folded in together at the next cut. Authors
never read the pending file. Two things are handled at the ASSIGNMENT layer, which the pilot already used (topic
pool, ids, categories per author), not in the brief:
- **Lesson 2 (frames):** each author gets a disjoint name list, a disjoint topic pool, three disjoint discourse
  frames, one owned grammar sub-point per category held by no other author, and a short list of banned stock frames
  (the pilot's own frames among them). A mechanical dedupe check (§2) enforces it across authors and against the pilot.
- **Lesson 4 (13:12):** each author writes 13 + 12.

Stated honestly: giving authors the frame mitigation in their assignment is lesson 2's content reaching authors
without a cut. It is done because the owner's task asked for it explicitly, and it changes no rule an item is judged
by. Lessons 1, 3, 5 and 6 are NOT given to authors. Method id stays `itep-grammar-v1-agent3+cfg-v2-cold` for the
pilot; this batch is `itep-grammar-v1-agent10+cfg-v2-cold` (same brief, same grader brief, same author type; ten
authors with the expanded assignment). Owner: if the expanded assignment should count as a new construction under
Amendment 3, say so; nothing has been earned on the stratum yet, so either reading costs no trust.

## 1. Population (fixed now)

- **250 items: 130 Part 1 (`ITG2-C001`..`C130`) + 120 Part 2 (`ITG2-E001`..`E120`)**, ten fresh Claude author agents
  **A..J**, 13 + 12 each. Target: about 227 survivors (with the pilot's 23, about 250).
- **Brief:** `briefs/itep-slate-grammar-v1.md`, sha256 `04a045c0…235b`, unchanged.
- **Assignment:** `itep-grammar-v2-work/assign.mjs` (sha256 `67c1e060…9d79`), deterministic, writes
  `ASSIGNED.json` (sha256 `041257b2…77ca`) and `authors/<X>.md`. Per author:
  - **Topic pools** A school subjects; B sports; C family and home; D travel and transport; E food and cooking;
    F nature and weather; G music, theatre and art; H technology; I simple history and geography; J community and clubs.
  - **Categories:** a cyclic window over the brief's 17 (13 for Part 1, 12 for Part 2), so each author uses each
    category at most once per part. Overall each category gets 7-8 Part 1 and 6-8 Part 2 items.
  - **Owned sub-point per category** (170 in all, e.g. tense: A past simple vs present perfect, B past continuous for
    interruptions, C past perfect in sequence, ...); disputed usages left out of the menu.
  - **Key slot and key length rank** balanced per author per part (overall Part 1 A33 B33 C32 D32, ranks 32/32/33/33;
    Part 2 30 each). **Difficulty** about one third each; never "easy" on conditionals, reported speech, parallel
    structure or modifier placement.
- Authors read the brief and their own `authors/<X>.md` only (not the blueprint, the pilot, the pending file, the
  iTEP reference material, or each other). They may run the pre-flight and the dedupe check on their own file.
- Nothing is edited after the packets are built. A dropped item stays dropped. A repaired item is a new batch.

## 2. Pre-flight and dedupe (structural, not the gate). Both must exit 0 before packets are built.

- **Pre-flight:** the v1 checker, `itep-grammar-v1-work/itep-grammar-check.mjs`, with one added CLI flag
  `--assigned <ASSIGNED.json> [--author X]` that swaps the pilot's hard-coded table for the per-id table, adds
  "category = assigned category", and applies the brief's "category at most twice per part" per author file. Run per
  author (`--author X --expect 25`) and once over all ten files (`--expect 250`, which also enforces
  `varied_dimension` uniqueness across all 250). Without the flag it behaves exactly as at the v1 commit (re-run on
  the pilot: PASS).
- **Dedupe:** `itep-grammar-v2-work/dedupe.mjs <ten files> --expect 250 --against <three pilot item files>`. FAIL
  per pair (at least one new item): F1 shared proper name; F2 shared content root in the key; F3 shared word 4-gram
  (names masked) with 2+ content words; F4 same category and 3+ shared content roots. Exits 2 on unreadable, empty
  or miscounted input. **Break-tested before any v2 item:** on the pilot alone with `--all-pairs` it reproduces all
  three of grader a's named collisions (C04/C12 Priya, C06/E09 "but nobody remembered to", C11/E11 careful) plus one
  nobody named (C11/E07 Omar), and nothing else.
- **Resolving a cross-author collision:** the author later in the alphabet revises its item (fresh names, frame or
  key word), until both checks pass. Revisions happen only before the packets are built.

## 3. Gate (the v1 gate unchanged: Amendment A1 plus a cold solve)

- **Packets:** the 250 items shuffled (seeded `itep-grammar-v2`) and cut into **6 packets** of 42/42/42/42/41/41,
  so each packet mixes authors and graders can see cross-author frames. Part 1 choices shuffled (seeded); Part 2
  choices kept in sentence order. Built by `itep-grammar-v2-work/build-packets.mjs`; `packet-cold.json` first; a
  packet's `packet.json` is written only after its three cold files exist, recording their sha256.
- **Graders:** per packet, three fresh Claude agents that have seen no author, no other grader, no index and no key.
  **a**, **b** plain; **c** adversarial (the MAP Language prompt). 18 graders in all, each seeing one packet.
  - Phase 1 (cold): `itep-grammar-v1-work/COLD-BRIEF.md` (sha256 `694226f5…6eb4`) + `packet-cold.json` -> `cold-<k>.json`.
  - Phase 2 (keyed): the same agent, after its cold file is hashed, gets `packet.json` and
    `cofounder-grader/COFOUNDER-BRIEF-v2.md` (sha256 `3d032066…2ad0`) -> `grades-<k>.json`.
- **Decision rules (the v1 rules, applied per packet):**
  1. **Cold drop:** any grader's cold pick is not the key, or any grader's `also_correct` is non-empty.
  2. **Keyed drop:** any keyed verdict other than `unique`.
  3. **Patterns (A1):** two graders of the SAME packet naming patterns that share 3+ items (same named type, or
     either custom) count; counted items drop; a packet whose counted-pattern union is 50%+ of the packet is held
     whole (all its items drop).
  4. **Letter patterns count on Part 2 items only** (Part 1 is reshuffled at draw time).
  5. No repair inside the gate. Scored only by `itep-grammar-v2-work/score.mjs`, which exits 2 writing nothing if
     any of the 36 files is missing, malformed, changed after hashing, or short of its packet's coverage.
- **Yield bands:** 75%+ of 250 survive (188+) = brief works; 50-75% = scale with pending lessons queued; under 50%
  or 2+ packets held = "broken" band, cut v2 before authoring more. A part under half its items is reported apart.
- **Top-up:** if survivors fall short of 227, the shortfall per part is recorded; a top-up is a NEW batch (v3 ids),
  never a repair of these items.

## 4. Known risks, stated now

- **Three samples, not three solvers** (CLAUDE.md): one model family; a unanimous clear is weaker than it looks.
- **Cross-packet patterns are invisible to graders.** A grader sees 42 of 250; a frame repeated once per packet is
  out of every grader's view. The dedupe check is the only cross-packet guard and it is lexical: a shared skeleton
  with fully different words passes it.
- **Owned sub-points may push items toward the menu's wording** (e.g. "the number of"); two authors cannot share
  one, so this shows up as repetition within a category rather than as duplicates.
- **Daniel is the human gate.** Survivors are release-eligible only after an audit sample.
- **Part 1 key never uniquely shortest** (pending lesson 5) is NOT addressed; pre-flight prints the rate.

## 5. Storage

Same as v1 §5, cohort `itep-grammar-v2`, written by `itep-grammar-v2-work/build-batch.mjs` to
`scripts/study-bank/itep-grammar-v2.batch.json`. File only: no database write (another agent owns the insert path).
