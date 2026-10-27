# MAP Science pilot: author prompt template

**3 authors, one per area**: L (Life), P (Physical), E (Earth and Space). Each takes 12 slots spanning grades 5-8
x low/mid/high. They run in parallel as fresh Claude general-purpose agents and need no worktree, because they write
only in the git-excluded `scratchpad/`.

**Why one per area and not one per grade.** Each author owns a disjoint DCI set and an invented-name namespace. That
stops the concurrent-author collisions wave 7 hit, and lets an author spread one area's ideas across all four grades. A
4-author split (for example, area x grade band) would put two authors on one area's DCIs and need a cross-author topic
exchange. Keep it for batch 1's 12 cells.

Replace `<CODE>` with L, P or E, and `<AREA>` with Life Science, Physical Science or Earth and Space Science.

---

> You are MAP Science author **<CODE>** (<AREA>) for the MAP Science pilot. Read
> `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/science-pilot/BRIEF.md` in full and follow
> it exactly, including the pasted co-founder rules at the end. Write ONLY the 12 slots in the table "Author <CODE>"
> (also in `slots.json` under "<CODE>"), as one JSON array in
> `/Users/andylee/Downloads/saas/classraum/scratchpad/map-science-pilot/<CODE>/items.json`.
>
> Every slot fixes its grade, tier, DCI, kind, stimulus, option format, ask, key letter and key rank. Do not change any
> of them. If you cannot write a slot as assigned, write `{"id": "<slot id>", "empty": true, "reason": "..."}`
> instead.
>
> For every `invented: yes` slot, invent the system and every number (the fictional-experiment rule), and make sure
> the invention obeys real science. Before using any subject or invented name, grep
> `scripts/study-bank/map-v2-work/science-pilot/EXCLUSIONS-science.txt` for it. Do not reuse a name another author
> could plausibly pick: <CODE> uses <NAMESPACE>.
>
> Run `node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs scratchpad/map-science-pilot/<CODE>/items.json`
> from the repo root until it prints `sci-check: N ok` with exit 0. The checker is the floor, not the bar: it cannot
> see a second defensible answer or a false science claim, so check those yourself, item by item.
>
> Rules:
> - no git, no web, no kill commands, no database
> - no GPT or other models
> - no NWEA material of any kind (sample items, practice tests, MAP prep sites, any Herald file or PDF)
> - no other author's folder, and no edits to anything under `scripts/` or `src/`
>
> Reply as the brief's "Before you finish" section asks.

---

Namespaces (`<NAMESPACE>`):
- **L:** organism/strain codes, for example "plant line R-4", "beetle line Q", "yeast strain Y-12"
- **P:** device/substance codes, for example "cart K-2", "Solution Q", "Substance M", "Coil 3"
- **E:** place/sample names, for example "Basin Orrin", "Lake Tamsin", "Sample Ridge-7"

The sci-check fixtures already use the example names. Authors should invent their own; the checker refuses a name found
in the exclusions file but not one found in the fixtures.

**Coordinator, after all three reply:**
1. `node .../sci-check.mjs --batch scratchpad/map-science-pilot/{L,P,E}/items.json`, then one return per refused item.
2. Grade, attack and stage per `MAP-SCIENCE-PILOT.prereg.md`.
