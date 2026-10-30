# iTEP SLATE Grammar v3 (top-up to the ten-form floor) — pre-registration

Written 2026-10-31, BEFORE any v3 item exists and before any v3 author or grader has been spawned.

**Why.** After v2 the bank holds 199 Grammar items (pilot 23 + v2 176, all `verified=false`): Part 1 120, Part 2 79.
Ten forms of 13 + 12 need 130 + 120, so the shortfall is **10 Part 1 + 41 Part 2**. v2's own prereg fixed that a
top-up is a new batch with new ids, never a repair of dropped v2 items.

## 0. Brief decision (BRIEF-VERSIONING.md rule 3): NO cut. v3 uses frozen `itep-slate-grammar-v1` unchanged.

Checked on 2026-10-31 against each condition:
- **Earned:** no. Grammar has no autonomy stratum, no bridge, no L1 spot.
- **Broken:** no. v2 cleared 70.4% (the middle band), the pilot 23/24; no packet-hold count reached the stop band.
- **Blocking:** no, not yet. Two candidates:
  - *Lesson 7, the dangling-modifier template:* named by two graders in v2 (packet 2) and not in the pilot. One
    batch. Not blocking.
  - *Lesson 8, Part 2 errors that live between segments (the "error must sit inside a labelled segment" point):*
    named by all three graders on E094 and singly on E082/E086/E099, in v2 only. One batch. Not blocking.
  - The v2 prereg said "if the template recurs in the top-up, cut". That is the rule's "two consecutive batches",
    and it is decided AFTER this batch's gate, not before it: **if two graders of one v3 packet independently name
    either tell (a modifier template, or a Part 2 item with no single wrong segment / an error repairable only
    outside the keyed segment), the brief is cut to v2 before the next Grammar batch**, folding in lessons 1-10.
    If neither is named, the cut waits.

Stated honestly, and the reason the test is weak: v3 assigns modifier placement to **one** Part 1 item and to no
Part 2 item (below), so lesson 7 cannot recur as a cross-item template here by construction, and lesson 8 can
recur only through other categories. That is an assignment-layer mitigation (v2 precedent: categories and owned
points are assignment, not brief), chosen because this batch exists to fill the floor and modifier items were
v2's most fragile. It changes no rule an item is judged by. Authors read the frozen brief and their own
assignment file only; they never read the pending file. Lessons 1, 3, 4, 5, 6 are not given to authors.

**Method id:** `itep-grammar-v1-agent7+cfg-v2-cold` (same brief, same cold brief, same grader brief, same author
type as v2; seven authors, v3 assignment). Nothing has been earned on the stratum, so the id costs no trust.

## 1. Population (fixed now)

- **90 items: 20 Part 1 (`ITG3-C001`..`C020`) + 70 Part 2 (`ITG3-E001`..`E070`)**, seven fresh Claude author
  agents **A..G**: A-F write 3 + 10, G writes 2 + 10. Need 10 + 41; the margin covers a v2-like yield
  (Part 1 84%, Part 2 56% in v2 -> about 17 + 39 expected; Part 2 is tight, see §4).
- **Brief:** `briefs/itep-slate-grammar-v1.md`, sha256 `04a045c0…235b`, unchanged.
- **Assignment:** `itep-grammar-v3-work/assign.mjs`, deterministic, writes `ASSIGNED.json` and `authors/<X>.md`.
  `assign.mjs --check` reproduces them. Per author:
  - **Topic pools, all new against v2:** A books, libraries and writing; B health and the body; C zoos, aquariums
    and wildlife centres; D money, saving and small business; E space and the night sky; F jobs and careers;
    G celebrations and holidays. Three discourse frames each, disjoint.
  - **Names:** twelve per author, disjoint, none occurring in the 199 banked items or any v1/v2 name list.
  - **Categories:** 13 distinct per author (no category in both parts). Part 2 never gets modifier placement;
    70 Part 2 items over the other 16 categories (six at 5, ten at 4). Part 1: 20 over 16 categories, one
    modifier-placement item.
  - **Owned sub-points from the v2 menu, unchanged text, with v3 exclusions:** sub-points behind v2's item-ground
    drops or two-reading risks are not handed out (past perfect after before/after, stative and aspect nuance,
    will/going to, restrictive which/that, reduced relatives, like-with-like comparisons, stop/remember meaning
    shifts, purpose "for -ing", zero conditional, wish, in case, near-synonym modals, needn't, in time/on time,
    even though/even if, the no-backshift case, the separable-phrasal-verb point that forces a dead option).
    Each sub-point is held once in the batch, and sub-points that test one rule under two labels form conflict
    groups of which the batch holds one (for example "the number of" under agreement and quantifiers;
    both...and under connectors and parallel structure).
  - **Part 2 key slot:** A18 B18 C17 D17 overall, 3/3/2/2 per author; key length rank 17/17/18/18. Part 1
    slots/ranks only satisfy the pre-flight (Part 1 is re-dealt in packets and reshuffled at draw).
  - **Difficulty:** about a third each; never easy on conditionals, reported speech, parallel structure or
    modifier placement.
  - **Banned frames/contents:** v2's list plus v2's failed contents (toolbox for fixing, needn't have brought)
    and heavily used settings (microscope/onion skin, science fair, school play, bake sale, football match).
- Authors read the brief and their own `authors/<X>.md` only. They may run the pre-flight and the dedupe check on
  their own file. Nothing is edited after the packets are built.

## 2. Pre-flight and dedupe (structural, not the gate). Both must exit 0 before packets are built.

- **Pre-flight:** `itep-grammar-v1-work/itep-grammar-check.mjs <7 files> --expect 90 --assigned
  itep-grammar-v3-work/ASSIGNED.json` (per author with `--author X --expect 13|12`). Unchanged checker.
- **Dedupe against the bank and across authors:** `itep-grammar-v2-work/dedupe.mjs <7 files> --expect 90
  --against itep-grammar-v3-work/ref-199.json`. Unchanged checker (F1 shared name, F2 shared key root, F3 shared
  4-gram with 2+ content words, F4 same category + 3 shared roots). `ref-199.json` is every banked item (pilot 23
  + v2 176) written by `make-ref.mjs --expect 199` from the two staged batch files. Collisions are resolved by
  the later author alphabetically (and always by the v3 author against a banked item), before packets exist.

## 3. Gate (v2's gate; one packet-design fix; one plumbing change)

- **Packets: 3 x 30** (Part 1 7/7/6, Part 2 23/23/24), built by `itep-grammar-v3-work/build-packets.mjs --cold`.
  **The fix for v2's 59 lost items:** Part 2 items are dealt PER KEY SLOT to fixed targets, packet 1 A6 B6 C6 D5,
  packet 2 A6 B6 C5 D6, packet 3 A6 B6 C6 D6. A seeded search (attempts 0..999, first that passes) also requires
  no three consecutive Part 2 items with one key letter, no Part 2 length rank on more than 9 of a packet's Part 2
  items, no author on more than 6 items of a packet, and no category on more than 2 of a packet's Part 2 items.
  Part 1 choices are arranged so Part 1 key letters are also within 1 per packet. Part 2 choices stay in
  sentence order.
- **Mechanical letter check before any grader:** `check-packets.mjs` re-reads the written packet and key files
  from disk and FAILS a packet whose Part 2 key letters differ by more than 1, that has a three-run, or whose
  Part 2 choices are not its labelled segments in order; the builder exits 2 if it fails. **Break-tested before
  any v3 item:** pointed at v2's six real packets it fails all of them that skewed (packet 1 A9 B2 C6 D3, packet 3
  A3 B7 C5 D8, plus 12 three-runs), and exits 2 on a missing root. A marginal break (one swap to max-min 2) is run
  on the v3 packets before graders and recorded.
- **Graders:** per packet three fresh Claude agents, none of which has seen an author, another grader, a key
  file or an index: **a**, **b** plain; **c** adversarial (the MAP Language line: "assume each item has a
  defect: look hardest for a second defensible option ... and any pattern across items that picks the key").
  9 graders. Keys live in `scratchpad/itep-grammar-v3/keys/`, outside the graders' packet folders (v2 kept
  `index.json` beside the packet).
  - Phase 1 (cold): `COLD-BRIEF.md` (v1, sha256 `694226f5…6eb4`) + `packet-cold.json` -> `cold-<k>.json`.
  - Phase 2 (keyed), **same agent, same run** (plumbing change from v2, which waited for all three cold files):
    the grader runs `build-packets.mjs --keyed --packet P --grader k`, which refuses unless its cold file
    covers every item with valid picks, records the cold file's sha256 (write-once) and only then writes
    `packet-<k>.json`; the grader then applies `COFOUNDER-BRIEF-v2.md` (sha256 `3d032066…2ad0`) ->
    `grades-<k>.json`. A cold file changed after its hash fails the scorer.
- **Decision rules: v2's, unchanged, per packet.** (1) cold drop: any cold pick off key or non-empty
  `also_correct`; (2) keyed drop: any verdict other than `unique`; (3) A1 patterns: two graders of one packet
  naming patterns sharing 3+ items (same type, or either custom) count, counted items drop, a packet whose
  union reaches 50% is held whole; (4) letter patterns count on Part 2 items only; (5) no repair. Scored only by
  `itep-grammar-v3-work/score.mjs` (v2's rules, keys and cold hashes read from their new places), which exits 2
  writing nothing on any missing, malformed, re-hashed or short file.
- **Yield bands (of 90):** 68+ brief works; 45-67 scale with pending lessons queued; under 45 or 2+ packets held
  = broken band, cut the brief before authoring more. A part under half its items is reported apart.
- **Floor:** if survivors leave Part 1 under 130 or Part 2 under 120 in the bank, the shortfall is recorded and
  topped up by a NEW batch (v4 ids).

## 4. Known risks, stated now

- **Part 2 margin is thin.** 70 authored for 41 needed: v2's Part 2 item-ground yield was 67 of 120 counting
  the letter-pattern losses, but 112 of 120 without them. If the letter fix works, Part 2 should clear well
  above 41; if it does not, it can fall short and a v4 is needed.
- **Three samples, not three solvers.** One model family.
- **Cross-packet patterns stay invisible.** A grader sees 30 of 90; the dedupe is lexical.
- **Balanced letters can themselves read as a pattern** (a grader may call a near-perfect A/B/C/D rotation a
  "complete permutation" tell). The three-run ban and the shuffled order are the only defence; recorded if named.
- **Daniel is the human gate.** Staging is `verified=false`; release needs the audit sample.

## 5. Storage

Survivors written by `itep-grammar-v3-work/build-batch.mjs` to `scripts/study-bank/itep-grammar-v3.batch.json`
(v2's shape, cohort `itep-grammar-v3`, `verified=false`, Part 2 `item_type='error_identification'`), then staged
with `npx tsx scripts/study-bank/itep-bank-helper.ts stage <batch> --expect <n> --apply`, which reads `verified`
back by row id. Then `npx tsx scripts/study-bank/verify-itep-draw.ts --section grammar` for the form count.

## Results (2026-10-31, recorded after scoring; no rule changed)

- **Authoring:** 7 authors, 90 items; each passed its own pre-flight and dedupe against `ref-199.json`. The
  cross-author dedupe found 1 collision (E001/E044 key root "return"); author E revised E044. Final pre-flight
  PASS (90; Part 2 slots A18 B18 C17 D17, length ranks 17/17/18/18; 5 length warnings on easy items); dedupe PASS.
- **Deal: one mechanics deviation, constraints unchanged.** The plain rejection search found no deal in 1000
  attempts (three-runs 515, author cap 236, category cap 212 of the rejections). Before any grader, the builder was
  changed to (a) re-shuffle a packet's order up to 500 times for the three-run rule and (b) repair a partition by
  seeded same-slot swaps that never raise the violation count. Every constraint in §3 is as written; deal attempt 0
  passed. Packets: P2 key letters A6 B6 C6 D5 / A6 B6 C5 D6 / A6 B6 C6 D6, P1 within 1, no three-runs, author max
  6, category max 2. `check-packets.mjs` PASS on the files as written; a marginal break (one D item replaced by an
  A item in packet 3, A7 B6 C6 D5) fails it.
- **Gate** (`score.mjs`; grader files copied to `itep-grammar-v3-work/results/`, rescoring the copy reproduces the
  result; a tampered cold file and a missing grade file each exit 2): 270 cold picks, **0 off key**, 1
  `also_correct`; 270 keyed verdicts, 7 non-unique. **No letter pattern was counted in any packet** (one grader in
  packet 3 named a weak pairing `key_position`; no second grader). **Cleared 87 of 90 (Part 1 19/20, Part 2
  68/70). Band: brief works.** 0 packets held.
- **Drops (3):**
  - **C020** (a, b, c): "Since her grandfather taught her last winter" reads causally, so "was able" is also right.
    The pilot's lesson 1 shape (a time phrase with a second reading) again, three graders.
  - **E063** (a, b, c keyed; c cold): a fronted "so everyone could ..." purpose clause is acceptable, so no segment
    is wrong. The author had flagged this item as its weakest.
  - **E052** (a only): a however-clash repairable at either end (connector or the clause), the lesson 8 shape.
- **Brief decision after the gate: still no cut.** Lesson 7 (modifier template): not named (one modifier item, by
  construction). Lesson 8 (error outside one segment): named by ONE grader on E052; blocking needs both. Lesson 1
  recurred with all three graders (C020), but v2 between did not name it, so v1 and v3 are not consecutive.
  Recorded as pending lesson 11; if the next Grammar batch names it again, that is two consecutive and the cut is
  blocking.
- **Staged:** `itep-grammar-v3.batch.json`, 87 rows, staged with `itep-bank-helper.ts stage --expect 87 --apply`:
  read back 87 of 87 verified=false (`itep-grammar-v3.batch.staged.json`). Bank: Part 1 139, Part 2 147 (Part 2
  key slots A37 B36 C38 D36). `verify-itep-draw.ts --section grammar`: FULL 25 of 25, live path still refuses,
  error-ID order kept; **10 disjoint full Grammar forms** (Part 1 is the binding part: 139 / 13). The script
  gained one printed line for that count.
