# MAP Science batch 2: authoring note and grader prompt template

**Authoring (MAP-SCIENCE-B2.prereg.md).** The coordinator asked for batch 2 to be written in one session, by one Claude
author, with **no sub-agents**, area by area, in batch-1 format. So the twelve cells (L5 L6 L7 L8, P5 .. P8, E5 .. E8)
are written in sequence by the same author, into `scratchpad/map-science-b2/<CODE>/items.json`, each to its slot table
in `science-b2/BRIEF.md`. What this changes from batch 1, stated plainly:
- **Cross-cell collisions** (batch 1's 12 duplicates came from 12 authors who could not see each other) should fall,
  because one author sees every cell. They are still checked, not assumed: `sci-check --batch --rules b2` (XDUP, KEYDUP)
  and `probe-live.mjs` against every live and staged row.
- **Single-author style becomes a cross-item risk.** One author's habits (key length, a favourite clause, one way of
  building a distractor) repeat across all 224 items instead of 20. The seeded key letter and rank stop the mechanical
  forms; the graders' `cross_item_pattern` question is the instrument for the rest, and it is asked per area.
- The grade-letter namespace rule (grade 5 A-F, 6 G-L, 7 M-R, 8 S-Z) is kept, so names stay unique per cell.

Per cell, from the repo root:

    node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs scratchpad/map-science-b2/<CODE>/items.json --rules b2 \
      --slots scripts/study-bank/map-v2-work/science-b2/slots.json --exclusions scripts/study-bank/map-v2-work/science-b2/EXCLUSIONS-science.txt
    node scripts/study-bank/map-v2-work/science-b2/probe-live.mjs scratchpad/map-science-b2/<CODE>/items.json

Rules carried from batch 1: no git, no web, no NWEA material of any kind, no GPT or other models, no database writes.

---

**Grader prompt (amendment A1 carried forward; b1 finding 6: one folder per grader).** Two fresh graders per area
cohort, six in all. Fill in `<AREA>` (life | phys | earth), `<N>` (1 or 2), `<COUNT>`:

> You are with-source grader **<AREA>-g<N>** for MAP Science batch 2 (<COUNT> items). Read
> `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/science-b2/GRADER-BRIEF.md` and
> `science-b2/BRIEF-grader.md`. Then grade
> `/Users/andylee/Downloads/saas/classraum/scratchpad/map-science-b2/packets/<AREA>-g<N>/grader-cold.md` (all items, your
> own picks first). Write one JSON array to `scratchpad/map-science-b2/packets/<AREA>-g<N>/cold.json` with exactly the
> fields GRADER-BRIEF.md lists (leave the keyed-only judgements as "pending"). Then stop and reply. The keyed packet is
> placed in your folder only after your cold file is hashed (`cold-shas.txt`); you will then be asked to write
> `keyed.json` in the same folder.
>
> Read and write ONLY inside `packets/<AREA>-g<N>/`. Do NOT open:
> - `science-b2/BRIEF.md`, `science-b2/slots.json` or `science-b2/make-slots.mjs`
> - any folder under `scratchpad/map-science-b2/` other than your own, including `packets/hold/` and the other grader's folder
> - any batch-1 grade or packet file
>
> If you do open one, say so: your picks are then void. No git, no web, no database, no GPT, no NWEA material.

**Coordinator, after the twelve cells pass:**
1. `sci-check.mjs --batch --rules b2` over all twelve files, with the b2 slots and exclusions; answer every XDUP-REVIEW
   line in `science-b2/XDUP-REVIEW.md`.
2. `probe-live.mjs` over all twelve files; answer every REVIEW line in the same file.
3. `sci-packet.mjs grader` per area into `packets/<area>/`, copy the cold packet into `packets/<area>-g1/` and
   `packets/<area>-g2/`, and move the keyed packet into `packets/hold/` (it is released per grader after the cold hash).
4. Then follow `MAP-SCIENCE-B2.prereg.md`.
