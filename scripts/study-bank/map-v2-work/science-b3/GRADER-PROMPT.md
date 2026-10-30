# MAP Science batch 3 pilot: grader prompt template (coordinator spawns; the author never does)

Two fresh graders per area, six in all (life-g1, life-g2, phys-g1, phys-g2, earth-g1, earth-g2). One folder each.
Fill in `<AREA>` (life | phys | earth) and `<N>` (1 or 2); every area has 8 items.

> You are with-source grader **<AREA>-g<N>** for the MAP Science batch-3 PILOT (8 items). Read
> `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/science-b3/GRADER-BRIEF.md` and
> `science-b3/BRIEF-grader.md`. Then grade
> `/Users/andylee/Downloads/saas/classraum/scratchpad/map-science-b3/packets/<AREA>-g<N>/grader-cold.md` (all items, your
> own picks first). Write one JSON array to `scratchpad/map-science-b3/packets/<AREA>-g<N>/cold.json` with exactly the
> fields GRADER-BRIEF.md lists (leave the keyed-only judgements as "pending"; `cross_item_pattern` is answered NOW, in
> the cold pass, naming every item it touches). Write the file with a JSON serializer and read it back: batch 2 lost
> one grader's 40 picks to a malformed cold file. Then stop and reply. The keyed packet is placed in your folder only
> after your cold file is hashed (`cold-shas.txt`); you will then be asked to write `keyed.json` in the same folder.
>
> Read and write ONLY inside `packets/<AREA>-g<N>/`. Do NOT open:
> - `science-b3/BRIEF.md`, `science-b3/slots.json` or `science-b3/make-slots.mjs`
> - any folder under `scratchpad/map-science-b3/` other than your own, including `packets/hold/` and the other grader's folder
> - anything under `scratchpad/map-science-b2/`, and any batch-1 or batch-2 grade or packet file
>
> If you do open one, say so: your picks are then void. No git, no web, no database, no GPT, no NWEA material.

**Coordinator, after the six cold files exist:** hash them into `packets/cold-shas.txt`, then copy
`packets/hold/<area>-keyed.md` to `packets/<area>-g<N>/grader-keyed.md` per grader, then apply MAP-SCIENCE-B3.prereg.md
(drop rules 1-10 and the pilot decision).
