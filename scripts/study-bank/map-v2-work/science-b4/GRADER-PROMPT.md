# MAP Science batch 4: grader prompt template (coordinator spawns; the author never does)

Two fresh graders per area, six in all (life-g1, life-g2, phys-g1, phys-g2, earth-g1, earth-g2). One folder each.
Fill in `<AREA>` (life | phys | earth), `<N>` (1 or 2) and `<COUNT>` (life 75, phys 95, earth 70). Claude only.

> You are with-source grader **<AREA>-g<N>** for MAP Science batch 4 (<COUNT> items in your area). Read
> `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/science-b4/GRADER-BRIEF.md` and
> `science-b4/BRIEF-grader.md` (same folder). Then grade
> `/Users/andylee/Downloads/saas/classraum/scratchpad/map-science-b4/packets/<AREA>-g<N>/grader-cold.md` (all items, your
> own picks first). Write one JSON array to `scratchpad/map-science-b4/packets/<AREA>-g<N>/cold.json` with exactly the
> fields GRADER-BRIEF.md lists, one object per item (<COUNT> objects). Leave the keyed-only judgements as "pending".
> Answer `cross_item_pattern` NOW, in the cold pass: give each pattern as its own entry with EVERY item id it touches, in
> both directions (a property always on the key, and a property never on the key). The decision counts the items both
> graders name, so an item you leave out is not counted. Patterns about answer-letter position or the order of the printed
> options decide nothing (the app reshuffles options per student); you may note them. Write the file with a JSON
> serializer and read it back to confirm <COUNT> objects: batch 2 lost one grader's 40 picks to a malformed cold file.
> Then stop and reply. The keyed packet is placed in your folder only after your cold file is hashed (`cold-shas.txt`);
> you will then be asked to write `keyed.json` in the same folder.
>
> Read and write ONLY inside `packets/<AREA>-g<N>/`. Do NOT open:
> - `science-b4/BRIEF.md`, `science-b4/slots.json` or `science-b4/make-slots.mjs`
> - any folder under `scratchpad/map-science-b4/` other than your own, including `packets/hold/`, `plans/`, the area
>   folders (L, P, E) and the other grader's folder
> - anything under `scratchpad/map-science-b2/`, `scratchpad/map-science-b3/`, `scratchpad/map-science-b3p2/` or
>   `scratchpad/map-science-b3full/`, and any earlier batch's grade or packet file
>
> If you do open one, say so: your picks are then void. No git, no web, no database, no GPT, no NWEA material.

**Coordinator, after the six cold files exist:** check each holds the right number of objects, hash them into
`packets/cold-shas.txt`, then copy `packets/hold/<area>-keyed.md` to `packets/<area>-g<N>/grader-keyed.md` per grader and
ask each grader for `keyed.json`. Apply `scripts/study-bank/MAP-SCIENCE-B4.prereg.md`: drop rules 1-9 (with the
`b3_*`, `b3p2_*` and `b4_*` fields under rule 9) and rule 10 as replaced (Amendment A1 threshold: a pattern both graders name drops
the items both name only if there are 3 or more; it holds the area only at 50% or more of the area; letter-position and
option-order patterns excluded). Match the two graders' patterns and record both quotations BEFORE looking at which items
the match touches.
