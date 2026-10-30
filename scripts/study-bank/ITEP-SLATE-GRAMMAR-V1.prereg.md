# iTEP SLATE Grammar v1 pilot — pre-registration

Written 2026-10-31, BEFORE any item exists and before any author or grader has been spawned.

**Why.** Owner request: add iTEP SLATE as a Study test (ITEP-SLATE-BLUEPRINT.md). Grammar is the pilot section
(blueprint §5.5): no audio, no passages, the largest pool (250 items for ten forms). This pilot measures whether the
frozen brief yields items that pass the agent-review gate, before anything is wired into the app or the DB.

## 1. Population (fixed now)

- **24 items, the brief's split: 12 Part 1 Sentence Completion (`ITG1-C01`..`C12`) + 12 Part 2 Error
  Identification (`ITG1-E01`..`E12`).** The real test is 13 + 12 (blueprint §2A). The brief's 12/12 is kept
  because the brief is frozen for this wave and its per-item slot/length/difficulty table is drawn for 12 + 12.
  Form assembly later draws 13 + 12 from the pool; the pilot split does not bind the form.
- **Brief:** `scripts/study-bank/briefs/itep-slate-grammar-v1.md`, frozen at this commit (sha256 recorded in
  `itep-grammar-v1-work/MANIFEST.json`). Lessons go to `briefs/itep-slate-grammar-v1.pending.md`; authors never
  read it. Method id `itep-grammar-v1-agent3+cfg-v2-cold`.
- **Authors:** three fresh Claude agents, each given the brief path, its item ids, an output path, a topic pool
  and a category assignment (so no grammar point collides across authors within a part). They read nothing else:
  not the blueprint, not the iTEP reference files, not each other's output.
  - **A** (topic pool: school subjects, clubs, the science lab, the library): C01-C08.
  - **B** (topic pool: sports, travel, family, weekend plans): C09-C12, E01-E04.
  - **C** (topic pool: hobbies, music, cooking, technology, simple history facts): E05-E12.
  - Category per item (one category per item; each at most once per part here, within the brief's limit of two):
    Part 1: C01 quantifiers, C02 prepositions, C03 gerund/infinitive, C04 conditionals, C05 relative clauses,
    C06 passive, C07 pronoun case, C08 tense, C09 subject-verb agreement, C10 conjunctions/connectors,
    C11 adjective/adverb, C12 reported speech.
    Part 2: E01 tense, E02 comparatives, E03 parallel structure, E04 subject-verb agreement, E05 quantifiers,
    E06 pronoun case/reference, E07 prepositions, E08 conjunctions/correlatives, E09 passive, E10 gerund/infinitive,
    E11 adjective/adverb, E12 relative clauses.
- Nothing is edited after the pre-flight passes and the packets are built. A dropped item stays dropped. A repaired
  item is a new batch.

## 2. Pre-flight (structural, not the gate)

`itep-grammar-v1-work/itep-grammar-check.mjs <items.json ...> --expect 24` must exit 0 before packets are built.
It exits non-zero on unreadable or empty input, a count other than `--expect`, or any of: not exactly 4 choices;
duplicate options (normalised); key not exactly one of the choices; key slot or length rank differing from the
brief's assigned table; Part 1 passage without exactly one `________`; Part 2 passage whose `[A: ..]`..`[D: ..]`
segments are not the choices verbatim and in order, or a segment occurring more than once in the unbracketed
sentence; duplicate `varied_dimension`; a category used more than twice in a part. It prints its denominators,
the key-length-rank and key-slot distributions per part, and how often a simple option feature (longest, shortest,
most words, only option with a feature) picks the key, against chance. Banned-point keywords (rule 4) are printed as
warnings for the graders, not failures.

Authors may revise their own files until pre-flight passes. Pre-flight runs once more after the final file set.

## 3. Gate (the agent-review instrument, Amendment A1, plus a cold solve)

**Why no options-only attack.** The brief says solvers will see only the options. That half is replaced here, a
stated deviation from the brief recorded as a pending lesson: on grammar, a four-option set is decided by the
model's knowledge of English, which IS the construct (the ACT Science saturation lesson, CLAUDE.md); and Part 2's
options are segments of the sentence, so hiding the sentence hides nothing. Instead each grader **solves cold**
first, which tests the thing that matters for grammar: does a careful reader holding the full sentence land on the
key, and only the key.

- **Packet:** one packet of all 24 items, built by `itep-grammar-v1-work/build-packets.mjs`. Item order shuffled
  (seeded). Part 1 choices shuffled (seeded, unbiased `seeded-shuffle.mjs`); **Part 2 choices kept in sentence
  order** because the `[A:]`..`[D:]` labels in the sentence name them. Two files:
  `packet-cold.json` (no key, no explanation) and `packet.json` (stated key added, the format
  COFOUNDER-BRIEF-v2 expects). The keyed packet is written only AFTER all three cold files exist.
- **Graders:** three fresh Claude agents, none of which has seen an author, another grader, the index or any key.
  **a**, **b**: plain. **c**: adversarial (the MAP Language prompt: "assume each item has a defect: look hardest
  for a second defensible option ... and any pattern across items that picks the key").
  - **Phase 1 (cold):** read `COLD-BRIEF.md` and `packet-cold.json` only; for every item write
    `cold-<k>.json`: `{"<n>": {"pick": "<choice text>", "also_correct": ["<choice text>", ...], "note": "..."}}`.
    `also_correct` lists any other option the grader thinks is also correct.
  - **Phase 2 (keyed):** only after its cold file is written, the same agent is sent the keyed packet and
    `COFOUNDER-BRIEF-v2.md` (unchanged) and writes `grades-<k>.json` in that brief's format. It may not edit its
    cold file (the cold file's sha256 is recorded before phase 2 is sent).
- **Decision rules (fixed now):**
  1. **Cold drop:** an item drops if any grader's cold `pick` is not the key, or any grader's cold
     `also_correct` is non-empty.
  2. **Keyed drop (A1, as MAP Language):** an item drops if any grader's keyed verdict is not `unique`.
  3. **Patterns (A1):** a batch pattern counts when two graders name patterns sharing at least 3 items (same named
     type, or either custom-named). Counted patterns drop their shared items; if the union of counted-pattern items
     is 50% or more of the batch (12+), the whole batch is held for re-authoring.
  4. **Letter patterns — split by part, a stated change from A1.1.** A1.1 excludes answer-letter patterns because
     the draw reshuffles choices. That holds for **Part 1 only**. Part 2 choices are segment positions in the
     sentence and must NOT be reshuffled (see §5), so a Part 2 key-position pattern can reach a student and
     **counts**. A letter/position pattern counts only on its Part 2 items; its Part 1 items are ignored.
  5. No repair inside the gate. Scored only by `itep-grammar-v1-work/score.mjs`, which exits non-zero, writing
     nothing, if any cold or keyed file is missing, malformed, or does not cover all 24 items, and prints every
     denominator.
- **Yield bands (pre-registered):** 18+ of 24 survive = the brief works, scale it; 12-17 = scale with the pending
  lessons queued for the next cut; fewer than 12 or a batch hold = the brief's "broken" band (BRIEF-VERSIONING.md
  rule 3), cut a v2 before scaling. Per part, a part with fewer than half its items surviving is reported separately.
- **Nothing is staged or inserted by this pilot.** Survivors are written to a batch JSON in the shape the staging
  path needs (§5); staging waits on the owner and on the DB rows and app wiring listed in the results.

## 4. Known risks, stated now

- **Model graders saturate on grammar knowledge.** Every cold pick on key does NOT mean a student-level item is
  fair; it means three samples of one model agreed. Correlated solvers (CLAUDE.md): say "three samples".
- **Daniel is the human gate** for verbal-type cohorts. A pilot pass here is release-eligible only after an audit
  sample, as for MAP Language v4.
- **Banned-point drift:** graders may flag disputed usage (rule 4 list); any flag drops the item.
- **Part 2 key position is visible** if the app does not shuffle; the brief assigned slots at base rate
  (A 3, B 3, C 3, D 3 of 12), so the bank stays at base rate only if survivors do.
- **Difficulty is the author's label.** No grader difficulty band is part of the gate.

## 5. Storage (decided now, executed later)

Rows: `family='itep'`, `section='grammar'`, `domain` = the part label exactly as in `ITEP_PART_QUOTAS`
(`Part 1: Sentence Completion` / `Part 2: Error Identification`), `subskill` = category, `topic_tag` = category,
`task='multiple_choice'`, `item_type` = `multiple_choice` for Part 1 and a type that the draw does NOT reshuffle
for Part 2 (the existing `ORDERED_OR_UNUSED` set in `assemble.ts` has no MC member, so this needs app work),
`verified=false`, `cohort='itep-grammar-v1'`, `source='hand'`, `verify_meta.method_id` as §1, content hash as
`stage-map-language-v4.mjs` (passage + prompt + choices).

## Results (2026-10-31, recorded after scoring; no rule changed)

- Pre-flight `itep-grammar-check.mjs`: PASS, 24 of 24 read (12 + 12); key slot 3/3/3/3 and key length rank 3/3/3/3
  in each part. Break-tested: a moved key, reordered Part 2 segments and a duplicated option each fail it; no input
  or a short file exits 2.
- Gate (`score.mjs`, files in `itep-grammar-v1-work/results/`): 72 cold picks, **0 off key, 0 also_correct**; 72
  keyed verdicts, 2 non-unique, both on **ITG1-C12** (a, b: "two days earlier" also reads as "earlier than planned",
  making "would leave" correct). **Cleared 23 of 24** (Part 1 11/12, Part 2 12/12). Band: brief works, scale it.
- Patterns: all three graders named `key_position` on the 12 Part 1 items (A5 B1 C0 D6 in the packet). Those
  letters are this packet's own seeded deal of Part 1 choices, not the authored order (authored 3/3/3/3), and the
  draw reshuffles Part 1, so rule 4 excludes it. Part 2 letters were 3/3/3/3. Grader a alone named same-frame pairs
  (C06/E09, C04/C12, C11/E11); one grader does not count, recorded as pending lesson 2.
- Survivors: `scripts/study-bank/itep-grammar-v1.batch.json` (23 rows, staging shape, `verified=false`). Not
  inserted. Release would still need DB rows, app wiring and a Daniel audit sample.
