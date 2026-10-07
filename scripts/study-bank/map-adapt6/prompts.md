# MAP adaptation pilot 6 (CoE only): agent prompts, fixed before adapting

Each agent is a fresh Claude subagent (no GPT). `<...>` is filled with a path
only. Every prompt also carries: "Do not open any other file in
scripts/study-bank/, any published test item, any NWEA material, or any web
page. At the end, state which files you opened."

## 0. Source screen solver (three fresh samples, before any adaptation)

Prompt 3 below, on `<map-adapt6/screen.blind.json>`, writing `<map-adapt6/screen.solver-X.json>`.

## 1. Adapter (two fresh agents, six standalones each; the brief is pilot 5's, unchanged)

> Read `<MAP-ADAPT-BRIEF.md>` and follow it exactly. Adapt ONLY the entries of
> `<map-adapt6/sources.json>` whose adapt_id is in <MAPA6-01..MAPA6-06 | MAPA6-07..MAPA6-12>.
> Write the adapted items as a JSON array to `<map-adapt6/adapted-<a|b>.json>`.

Repair prompts relay the checker's PROBLEM line VERBATIM, including the option
letter (pilot 5's MAPA-24 repair failed because the relay dropped "optA").

## 2. Fidelity reviewer (pre-freeze; not a grader; one fresh agent)

> Read `<map-adapt6/fidelity.input.json>`: 12 pairs, each a SOURCE item (a
> question already in use on another test, key marked) and its ADAPTED
> version for a grades 5-8 diagnostic (key marked). The adaptation was
> required to keep the source's key and the role of each kept wrong option,
> while simplifying the reading level and, for five-option sources, dropping
> one wrong option. For EACH pair judge:
> - `key_preserved`: true if the adapted key says the same thing as the
>   source key (same proposition, word sense, transition or finding), else false
> - `new_defensible`: true if the adaptation made any wrong option defensible
>   as correct (or the key no longer clearly correct) given the ADAPTED passage
> - `roles_preserved`: true if each adapted wrong option keeps the role of a
>   source wrong option
> - `note`: one or two sentences
> Write JSON to `<map-adapt6/fidelity.json>`: `{"MAPA-01": {...}, ...}`.

The repair prompt (only for items failing key_preserved or new_defensible):

> Read `<MAP-ADAPT-BRIEF.md>`, then `<map-adapt6/repair.input.json>`: items
> whose adaptation a reviewer judged to have changed the key or made a wrong
> option defensible, with the reviewer's note and the source. Repair each so
> that the key matches the source and every kept wrong option is ruled out by
> the adapted passage, following every rule in the brief (for a set, change
> the shared passage only if the other items of the set stay correct, and
> return all items of that set). Write the full repaired items (same ids, all
> fields) to `<map-adapt6/repaired.json>` and one line per item saying what
> changed.

The re-check uses prompt 2 unchanged, by a fresh agent, on the repaired items.

## 3. Options-only solver (three fresh samples per file; six agents in all)

> Open only `<map-adapt6/oo-<adapted|source>.blind.json>`. Each entry is the
> answer options to a multiple-choice question from an English test (some
> have four options, some five); the question, any passage and the item type
> are withheld. For every entry pick the letter you think is most likely the
> correct answer (guess if you must; never skip) and add a few words on why.
> Write JSON to `<map-adapt6/oo-<adapted|source>.solver-X.json>`:
> `{"L01": {"pick": "A", "note": "..."}, ...}`, one entry for every id.

## 4. With-source grader (two fresh graders)

> Open only `<map-adapt6/ws.md>`: 12 items for a grades 5-8 English reading and
> language diagnostic (CCSS ELA grades 5-8). Each lists its strand, grade
> target and target RIT band (ten-point bands: 170-179 is roughly early
> grade 4/5, 180-189 typical grade 5, 190-199 typical grade 6, 200-209
> typical grade 7, 210-219 typical grade 8, 220-229 above grade 8). The
> correct answer is not marked. Solve each item yourself, then judge it.
> Return JSON to `<map-adapt6/ws.grader-X.json>`, keyed by item number:
>
> - `pick`: your answer letter
> - `second_defensible`: a letter you think could also be defended as correct, or null
> - `grade_fit`: "fits" | "too_easy" | "too_hard" for the stated grade target, plus `grade_fit_note`
> - `band_assigned`: the ten-point RIT band you would target this item at, e.g. "RIT 190-199"
> - `band`: "plausible" | "easier" | "harder" relative to the stated target band
> - `free_elimination`: any option a student could kill with no reading or work, and why, or null
> - `dead_distractors`: letters of wrong options no grade 5-8 student would plausibly pick ([] if none)
> - `note`: one or two sentences

## 5. Naturalness judge (two fresh judges; batch 3's wording, count changed to 9)

> Below are 18 reading passages. For each, rate how natural and coherent the
> prose reads as a published reading passage for students in grades 5-8, on
> a scale of 1 (very unnatural or incoherent) to 5 (reads exactly like a
> well-written published passage). Judge each passage on its own. Give an
> integer rating and a one- or two-sentence reason for each. Return JSON:
> {"labels": {"N1": {"rating": <1-5>, "reason": "..."}, ...}}

(The judge opens only `<map-adapt6/naturalness.json>` and writes
`<map-adapt6/nat-X.json>`.)
