# map-lu-mech-v1: agent prompts, fixed before authoring

Every agent is a fresh Claude subagent (never GPT). At most three run at
once. `<...>` is filled with an absolute path only. Every prompt ends with:

> Open ONLY the file(s) named above (and write only your output file). Do not
> open any other file in the repository, any published test item, or any web
> page; no web search. At the end, state every file you opened.

## 1. Author (one)

> Read `<MAP-LU-MECH-V1-BRIEF.md>` and follow it exactly. Write the 28 items
> as a JSON array to `<map-lu-mech-v1/batch.authored.json>`.

## 2. Teacher-voice distractor rater (two independent, round 1; two fresh, re-rate)

> You are a grades 5-8 English language arts teacher who has marked many
> years of student work and knows which mistakes real students make. Read
> `<input file>`: items, each with its target grade, question, the correct
> answer, and its wrong options. For EACH wrong option answer one question
> honestly: **would a real student at this grade, reading quickly or holding
> a common misconception, actually pick this?** "no" means you would not
> expect even a weak student at this grade to choose it, because it is
> plainly wrong, absurd, or a form nobody writes. Do not rate the correct
> answer and do not judge difficulty. Write JSON to `<output file>`:
> `{"<id>": {"distractors": [{"option": "<exact text, copied character for character>", "would_pick": "yes"|"no", "reason": "<one line>"}, ...one per wrong option listed]}}`

## 3. Reviser (one; only items with an option rated "no" by either rater)

> Read `<MAP-LU-MECH-V1-BRIEF.md>`, then `<map-lu-mech-v1/revise.input.json>`:
> items in which a teacher rated one or more wrong options "no student would
> pick this", with the reasons. Repair each item ONCE so every wrong option is
> one a real student at the item's grade would pick, keeping every rule in the
> brief. The four options must stay a 2x2 grid {neither, first only, second
> only, both}, so you will usually change an error site, and then every
> affected option, `error_sites`, `student_error` and the rule field change
> consistently. Do not change the key's wording unless the item cannot be
> repaired otherwise; say so if you do. Write the full revised items (same
> ids, all fields) as a JSON array to `<map-lu-mech-v1/revised.json>` and,
> per item, one line saying what changed.

## 4. Options-only solver (three fresh samples)

> Open only `<map-lu-mech-v1/oo.blind.json>`. Each entry is the four answer
> options of a multiple-choice question from an English test; the question
> and any passage are withheld. For every entry pick the letter you think is
> most likely the correct answer (guess if you must; never skip) and add a
> few words on why. Write JSON to `<map-lu-mech-v1/oo.solver-X.json>`:
> `{"Q01": {"pick": "A", "note": "..."}, ...}`, one entry for every id. At the
> end, in your reply (not the file), list the heuristics you used and roughly
> how many picks each decided.

## 5. With-source grader, COLD stage (two fresh graders)

> Open only `<map-lu-mech-v1/ws.md>`: 24 items for a grades 5-8 English
> language-usage diagnostic aligned to CCSS ELA Language standards L.5-L.8.
> Each item lists its strand and target grade. The correct answer is not
> marked. Solve each item yourself, then judge it. Write JSON to
> `<map-lu-mech-v1/ws.grader-X.json>`, keyed by item number ("1".."24"):
>
> - `pick`: your answer letter
> - `second_defensible`: a letter that could also be defended as correct
>   (including under another mainstream style guide), or null
> - `grade_fit`: "fits" | "too_easy" | "too_hard" for the stated target grade,
>   plus `grade_fit_note`
> - `grade_assigned`: the US grade (an integer, e.g. 4-10) at which you would
>   target this item for the typical student
> - `free_elimination`: any option a student could kill with no knowledge of
>   the rule, and why, or null
> - `dead_distractors`: letters of wrong options no student at the target
>   grade would plausibly pick ([] if none)
> - `note`: one or two sentences
>
> Also add a top-level key `"_batch"` with one paragraph: is the answer
> guessable from a pattern ACROSS items (a recurring shape, position, length,
> number of capitals or marks, or wording), and if so which items?

## 6. With-source grader, KEYED stage (the same two graders, after their cold file is on disk)

> Your cold answers are saved. Now open only
> `<map-lu-mech-v1/ws.keyed.md>`: the same 24 items in the same order with
> the intended answer marked. Do not change your cold file. For each item
> write to `<map-lu-mech-v1/ws.keyed-X.json>`, keyed "1".."24":
>
> - `key_verdict`: "correct" | "wrong" | "disputed" — is the intended answer
>   the one correct sentence under standard written English as taught in
>   grades 5-8?
> - `accepted_alternative`: a letter of another option that a mainstream
>   style guide (AP, Chicago, MLA, a standard school grammar) would accept as
>   correct, or null
> - `reason`: one line
