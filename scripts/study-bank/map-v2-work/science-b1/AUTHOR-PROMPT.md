# MAP Science batch 1: author and grader prompt templates

**12 authors, one per (area x grade) cell, 20 slots each** (MAP-SCIENCE-PLAN.md §4.5):
- Life: L5 L6 L7 L8
- Physical: P5 P6 P7 P8
- Earth and Space: E5 E6 E7 E8

All 12 run in parallel as fresh Claude general-purpose agents, never an agent from the pilot. They need no worktree,
because they write only in the git-excluded `scratchpad/`.

Fill in: `<CODE>` (for example P7), `<AREA>`, `<GRADE>`, `<NAMES>` (the namespace below), and `<SIBLINGS>` (the other
three codes of the same area).

---

> You are MAP Science author **<CODE>** (<AREA>, grade <GRADE>) for MAP Science batch 1. Read
> `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/science-b1/BRIEF.md` in full and follow it
> exactly. That includes the five **batch-1 binding rules B1-B5** and the pasted co-founder rules at the end. Write
> ONLY the 20 slots in the table "Author <CODE>" (also under "<CODE>" in `science-b1/slots.json`), as one JSON array in
> `/Users/andylee/Downloads/saas/classraum/scratchpad/map-science-b1/<CODE>/items.json`.
>
> Every slot fixes its tier, DCI, kind, stimulus, option format, ask, key letter and key rank. Do not change any of
> them. If you cannot write a slot as assigned, write `{"id": "<slot id>", "empty": true, "reason": "..."}`.
>
> The pilot lost 6 of 36 items, and you must not repeat the patterns behind them:
> - condition labels that spell out the settings
> - a lone measured result among variable options
> - a trend key carrying the only qualifier
> - absolutes only on claim distractors
> - a graph of a law the standard already states
> - place names that announce the property tested
>
> For every invented `trend` or `values` slot, fill `prior_free` honestly. If you cannot say why a student who knows the
> standard still needs your data, rebuild the item.
>
> Your invented names use <NAMES>, with letters from your grade's range in the brief. Before using any subject or name,
> grep `scripts/study-bank/map-v2-work/science-b1/EXCLUSIONS-science.txt`, which holds ACT Science and the pilot's
> items. Authors <SIBLINGS> write the same area at other grades, so pick systems they would not: say in your reply
> which systems you used.
>
> From the repo root, run:
> `node scripts/study-bank/map-v2-work/science-pilot/sci-check.mjs scratchpad/map-science-b1/<CODE>/items.json --slots scripts/study-bank/map-v2-work/science-b1/slots.json --exclusions scripts/study-bank/map-v2-work/science-b1/EXCLUSIONS-science.txt`
> until it prints `sci-check: N ok` and exits 0. The checker is the floor, not the bar: it cannot see a second
> defensible answer, a false science claim or a stated law, so check those yourself, item by item.
>
> Rules:
> - no git, no web, no kill commands, no database
> - no GPT or other models
> - no NWEA material of any kind (sample items, practice tests, MAP prep sites, any Herald file or PDF)
> - no other author's folder, and no edits under `scripts/` or `src/`
>
> Reply as the brief's "Before you finish" section asks, plus the list of invented systems you used.

---

Namespaces (`<NAMES>`):
- **Life:** organism/strain codes, for example "plant line H-14"
- **Physical:** device/substance codes, for example "Coil N-3"
- **Earth:** neutral place/sample names, for example "Site Tavin", "Sample S-22". Never a landform or property word (rule B5)

**Grader prompt (amendment A1 carried forward)**, 2 fresh graders per area cohort, so 6 in total. Fill in `<AREA>`,
`<N>`, `<OUT>`:

> You are a with-source grader for MAP Science batch 1, area **<AREA>** (<N> items). Read
> `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-v2-work/science-b1/GRADER-BRIEF.md` and
> `science-b1/BRIEF-grader.md`. Then grade `grader-cold.md` (all items, your own picks first), and only then
> `grader-keyed.md`, both in `scratchpad/map-science-b1/packets/<AREA>/`. Write one JSON array to `<OUT>` with exactly
> the fields GRADER-BRIEF.md lists.
>
> Do NOT open:
> - `science-b1/BRIEF.md`
> - `science-b1/slots.json` or `make-slots.mjs`
> - any folder under `scratchpad/map-science-b1/` other than `packets/<AREA>/`
> - any other grader's output
>
> If you do open one, say so: your picks are then void. No git, no web, no database, no GPT, no NWEA material.

**Coordinator, after all 12 authors reply:**
1. `sci-check.mjs --batch` over all 12 files, with the b1 slots and exclusions.
2. One return per refused item.
3. Then follow `MAP-SCIENCE-B1.prereg.md`.
