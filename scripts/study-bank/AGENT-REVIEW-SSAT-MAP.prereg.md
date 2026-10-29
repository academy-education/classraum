# Agent review of staged SSAT and MAP items — pre-registration (2026-10-29, before any grader runs)

**Why.** The owner: "There is no way he can check all of these." On 2026-10-29 the co-founder's queue held 1,558 staged
SSAT/MAP items in these strata alone. Owner rule: no second human reviewer (memory no-second-reviewer). This gate lets
agents decide which staged items are fit to release, with Daniel moved from sitting every batch to auditing a sample
after release.

## 1. Population (fixed now)

Every STAGED row (verified=false, not archived) on 2026-10-29, read from the bank (counts reconcile with
`bank-state.mjs counts`):

| stratum | staged | cohorts |
|---|---|---|
| ssat/reading | 504 | ssat-reading-draft-1, -6 … -18 (14 x 36, 6 passages each) |
| ssat/verbal | 701 | ssat-verbal-draft-1 (66), -2 (159), -3 (159), -4 (158), -5 (159) |
| map/language | 253 | map-language-v2-grammar (88), -mechanics (40), -writing (88), map-lu-v3-punctuation (11), map-lu-v6-spelling (26) |
| map/reading | 100 | map-reading-draft-1 (24, 6 passages), map-reading-v2-c4 (36, 12 passages), map-vocab-v3 (40) |

**Excluded: map/science (245 staged).** Every staged MAP Science cohort (map-science-pilot, -v1-life, -v1-phys,
-v1-earth) already has a pre-registered with-source agent grade recorded in `science-release.json`
(MAP-SCIENCE-PILOT / MAP-SCIENCE-B1 preregs, cleared lists, grader files). Under the 2026-10-27 owner rule science
release is already the agents' decision; those cohorts wait only on their blind-only runs.

## 2. Instrument

- Packets built by `agent-review-build.mjs` from the live rows: per cohort, whole passages together, about 55 items or
  10 passages at most per packet, unit order and option order shuffled with the unbiased seeded shuffle
  (`seeded-shuffle.mjs`, seed = sha256 of the packet id). Packet format as `scratchpad/mapread4-grade/`
  (`packet.json`, `index.json`, `brief.json`, the brief). The stated key is in the packet, as the brief requires.
- Brief: `cofounder-grader/COFOUNDER-BRIEF-v2.md` (built from the co-founder's own notes), unchanged; its sha256 is
  recorded in every packet's `brief.json` and in `MANIFEST.json`.
- Three fresh Claude agents per packet, none of which has seen an author, another grader or `index.json`:
  - **a**, **b**: the brief as written.
  - **c** (adversarial): the brief plus "assume each item has a defect: look hardest for a second defensible option,
    a distractor that is true of the source for the asked purpose, a key you can choose without reading the source,
    a false real-world claim or self-contradiction, and any pattern across items that picks the key."
- Prompts are fixed in `scratchpad/agent-review/MANIFEST.json`. No grader may read anything but the brief and its
  packet; no database; output only its own `grades-<a|b|c>.json`.

## 3. Decision rules (fixed now)

1. **Item drop:** an item drops if ANY of the three graders gives a verdict other than `unique` (`alternative`,
   `broken` or `hold`). A wrong key is `broken` in the brief's vocabulary, so "picks a different key" is covered.
2. **Passage drop:** a dropped item takes every item of its passage group (SSAT and MAP reading passages are drawn
   whole). Standalone items (verbal, language, vocabulary) drop alone.
3. **Cohort hold:** a batch pattern counts as named by two graders when two of them report patterns sharing **at
   least 3 items** of the packet, with the same pattern type or either named with a custom type. One confirmed pattern
   in any packet of a cohort **holds the whole cohort for re-authoring** (nothing from it clears), consistent with the
   2026-10-29 MAP Reading MRV3 result (repairs produced new template tells).
4. No repair round inside this gate. A repaired item is a new batch.
5. Scoring by `agent-review-score.mjs` only; it refuses (exit non-zero) on any missing or malformed grader file and
   prints its denominators. A packet with fewer than three valid grader files is not scored at all.

## 4. Release route (needs the owner's go after results; nothing is released by this gate)

- Survivors released by agent verdict (`verified=true`), cohort by cohort.
- Daniel then sits an **audit sample**, not the batches: a pooled 12 items per stratum per wave, drawn after release.
  Any defect he finds in a released survivor counts as a miss under Amendment 3 and sends that stratum's later batches
  back to full agent-plus-Daniel review until it is clean again.
- The student-data net: `item-stats-report.ts` flags released items once they reach 30 real first attempts.
- Held cohorts go back for re-authoring with the confirmed pattern as a pending brief lesson (BRIEF-VERSIONING.md).

## 5. Known risks, stated now

- **Agent reading comprehension** (memory agent-reading-comprehension-limit): agents can make comprehension items
  non-guessable but they keep failing on exclusivity and naturalness. Model graders have under-flagged what the
  co-founder later found.
- **Model-vs-human disagreement** (CLAUDE.md, ACT Reading): on some families model instruments saturate while humans
  score differently; an agent verdict is not a human verdict. This gate's strictness (any one of three flags drops)
  is the mitigation, at the cost of yield.
- **Miss rate:** autonomy-state on 2026-10-29 counts 57 co-founder-found defects in 1,133 items the AI pre-screen had
  passed (about 5%). Three graders with an any-flag rule should catch more than one pre-screen did, but the residual
  rate is unknown until Daniel's audit samples measure it.
- Packets put 36-66 items in front of one grader; batch patterns are judged within a packet, so a tell spread across
  a 159-item cohort's three packets is caught only if two graders name it inside one packet.
