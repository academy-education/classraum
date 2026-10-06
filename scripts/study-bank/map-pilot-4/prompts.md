# MAP pilot 4: agent prompts, fixed before authoring

Each agent is a fresh Claude subagent. `<...>` is filled with a path only.
Every prompt also carries: "Do not open any other file in scripts/study-bank/,
any published test item, or any web page. At the end, state which files you
opened."

## 1. Author

> Read `<MAP-PILOT-4-LU-BRIEF.md>` and follow it exactly. Write the 24 items
> as a JSON array to `<map-pilot-4-lu.batch.json>`.

## 2. Teacher-voice distractor review (pre-gate; not a grader)

> You are a grades 5-7 English language arts teacher who has marked many
> years of student work and knows which mistakes real students make. Read
> `<map-pilot-4/teacher.input.json>`: 24 items, each with its target grade,
> question, the correct answer marked, and three wrong options. For EACH wrong
> option answer one question honestly: **would a real student at this grade,
> reading quickly or holding a common misconception, actually pick this?**
> "no" means you would not expect even a weak student at this grade to choose
> it, because it is plainly wrong, absurd in the sentence, or a form nobody
> writes. Do not rate the correct answer and do not judge difficulty. Write
> JSON to `<map-pilot-4/teacher.json>`:
> `{"<id>": {"distractors": [{"option": "<exact text>", "would_pick": "yes"|"no", "reason": "<one line>"}, x3]}}`

## 3. Reviser (only for options rated "no")

> Read `<MAP-PILOT-4-LU-BRIEF.md>`, then `<map-pilot-4/revise.input.json>`:
> items in which a teacher rated one or more wrong options "no student would
> pick this", with the teacher's reason. Replace ONLY those options (and their
> `student_error` entries) with options a real student at the item's grade
> would pick, keeping every rule in the brief: for Mechanics the four options
> must stay the 2x2 grid {neither, first only, second only, both}, so you may
> instead change an error site, and then all affected options and the
> rule field change consistently; for Vocabulary the options are real words of
> the same part of speech that fit the sentence's surface. You may change the
> key's wording only if the item cannot be repaired otherwise; say so. Write
> the full revised items (same ids, all fields) as a JSON array to
> `<map-pilot-4/revised.json>` and, per item, one line saying what changed.

The re-rate uses prompt 2 unchanged on the revised items only.

## 4. Options-only solver (three fresh samples)

> Open only `<map-pilot-4/oo.blind.json>`. Each entry is four answer options
> to a multiple-choice question from an English test; the question, any
> passage and the item type are withheld. For every entry pick the letter you
> think is most likely the correct answer (guess if you must; never skip) and
> add a few words on why. Write JSON to `<map-pilot-4/oo.solver-X.json>`:
> `{"L01": {"pick": "A", "note": "..."}, ...}`, one entry for every id.

## 5. With-source grader (two fresh graders)

> Open only `<map-pilot-4/ws.md>`: 24 items for a grades 5-7 English language
> diagnostic (CCSS ELA grades 5-7). Each lists its strand, grade target and
> target RIT band (ten-point bands: 170-179 is roughly early grade 4/5,
> 180-189 typical grade 5, 190-199 typical grade 6, 200-209 typical grade 7,
> 210-219 typical grade 8 and above). The correct answer is not marked.
> Solve each item yourself, then judge it. Return JSON to
> `<map-pilot-4/ws.grader-X.json>`, keyed by item number:
>
> - `pick`: your answer letter
> - `second_defensible`: a letter you think could also be defended as correct, or null
> - `grade_fit`: "fits" | "too_easy" | "too_hard" for the stated grade target, plus `grade_fit_note`
> - `band_assigned`: the ten-point RIT band you would target this item at, e.g. "RIT 190-199"
> - `band`: "plausible" | "easier" | "harder" relative to the stated target band
> - `free_elimination`: any option a student could kill with no reading or work, and why, or null
> - `dead_distractors`: letters of wrong options no grade 5-7 student would plausibly pick ([] if none)
> - `dimensions_varied`: for items marked GRAMMAR ITEM, the list of dimensions on which the four options differ
> - `note`: one or two sentences
