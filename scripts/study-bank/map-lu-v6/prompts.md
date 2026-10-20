# map-lu-v6: agent prompts, fixed before authoring

Every agent is a fresh Claude subagent (never GPT). At most three run at once. `<...>` is filled with an
absolute path only. Every agent works and writes in its own private folder under
`/Users/andylee/Downloads/saas/classraum/scratchpad/map-lu-v6-work/<agent>/` (git-excluded); its output
file is copied into `map-lu-v6/` unedited. Every prompt ends with this paragraph (the FENCE):

> Open ONLY the file(s) named above (and write only your output file). Do not
> open any other file in the repository, any published test item, or any web
> page; no web search. Do not run git, and do not read git status, git log or
> commit messages; if your session context shows any git status or commit
> messages, ignore them entirely. At the end, state every file you opened and
> every command you ran. Put any helper file you write ONLY in your private
> folder `<P>` (a folder no other agent uses).

The authors' FENCE adds: "The only commands you may run are the helper commands named in the brief
(`spell` and `itemchecks`)."

Prompts 2 and 5-8 are map-lu-v5's (and through it v4's), unchanged except the file names (v5 -> v6).
There is no reviser and no repairer in v6.

## 1. Authors (two, in parallel)

> Read `<MAP-LU-V6-BRIEF-SPELLING.md>` and follow it exactly. You are Author 1: write items MLV6-S01 to
> MLV6-S32 (grades 5 and 6) as a JSON array to `<P/batch.spell.a.json>`.

> Read `<MAP-LU-V6-BRIEF-SPELLING.md>` and follow it exactly. You are Author 2: write items MLV6-S33 to
> MLV6-S64 (grades 7 and 8) as a JSON array to `<P/batch.spell.b.json>`.

The two files are concatenated (Author 1 first) into `W/batch.authored.json` without edits.

## 2. Teacher-voice distractor rater (two independent; any "no" drops the item)

> You are a grades 5-8 English language arts teacher who has marked many
> years of student work and knows which mistakes real students make. Read
> `<input file>`: items, each with its target grade, question, the correct
> answer, and its wrong options. For EACH wrong option answer one question
> honestly: **would a real student at this grade, reading quickly or holding
> a common misconception, actually pick this as the answer to the question?**
> "no" means you would not expect even a weak student at this grade to choose
> it, because it is plainly wrong, absurd, or a form nobody writes. (For
> "Which sentence has a spelling error?" items the wrong options are correctly
> spelled sentences: "yes" means a student could plausibly think that
> sentence contains the error.) Do not rate the correct answer and do not
> judge difficulty. Write JSON to `<output file>`:
> `{"<id>": {"distractors": [{"option": "<exact text, copied character for character>", "would_pick": "yes"|"no", "reason": "<one line>"}, ...one per wrong option listed]}}`

## 5. Options-only solver (three fresh samples)

> Open only `<P/oo.blind.json>` (a copy of `W/oo.blind.json`). Each entry is the four answer options of a
> multiple-choice question from an English test; the question and any passage
> are withheld. For every entry pick the letter you think is most likely the
> correct answer (guess if you must; never skip) and add a few words on why.
> Write JSON to `<W/oo.solver-X.json>`: `{"Q01": {"pick": "A", "note": "..."}, ...}`,
> one entry for every id. At the end, in your reply (not the file), list the
> heuristics you used and roughly how many picks each decided.

## 6. With-source grader, COLD stage (two fresh graders)

> Open only `<P/ws.md>` (a copy of `W/ws.md`): items for a grades 5-8 English language-usage
> diagnostic aligned to CCSS ELA Language standards L.5-L.8 (spelling). Each item lists its strand
> and target grade. The correct answer is not marked. Solve each item
> yourself, then judge it. Write JSON to `<W/ws.grader-X.json>`, keyed by item
> number ("1".."N"):
>
> - `pick`: your answer letter
> - `second_defensible`: a letter that could also be defended as correct
>   (including under another mainstream style guide, or a spelling any
>   mainstream dictionary accepts, US or British), or null
> - `grade_fit`: "fits" | "too_easy" | "too_hard" for the stated target grade,
>   plus `grade_fit_note`
> - `grade_assigned`: the US grade (an integer, e.g. 3-10) at which you would
>   target this item for the typical student
> - `free_elimination`: any option a student could kill with no knowledge of
>   the rule or the word, and why, or null
> - `dead_distractors`: letters of wrong options no student at the target
>   grade would plausibly pick ([] if none)
> - `note`: one or two sentences
>
> Also add a top-level key `"_batch"`: an object with one paragraph per strand
> (key "Spelling"):
> is the answer guessable from a pattern ACROSS items of that strand (a
> recurring shape, position, length, number of letters, capitals or marks,
> which option sits between the others, or wording), and if so which items?

## 7. With-source grader, KEYED stage (the same two graders, after their cold file is on disk)

> Your cold answers are saved. Now open only `<P/ws.keyed.md>` (a copy of `W/ws.keyed.md`, placed in your folder only after your cold file was hashed): the same
> items in the same order with the intended answer marked. Do not change your
> cold file. For each item write to `<W/ws.keyed-X.json>`, keyed "1".."N":
>
> - `key_verdict`: "correct" | "wrong" | "disputed": is the intended answer
>   the one correct option under standard written US English as taught in
>   grades 5-8?
> - `accepted_alternative`: a letter of another option that a mainstream
>   style guide (AP, Chicago, MLA, a standard school grammar) would accept as
>   correct, or that spells a word in a form any mainstream dictionary accepts
>   (US, British or other regional), or null
> - `reason`: one line

## 8. Word-grade screener (two fresh, cold; after repairs, before freeze)

The same text was run, before this prereg, on v2's 24 frozen Spelling words
(`map-lu-v3/screen-v2-{a,b}.json`); that run is the calibration the drop rule
was chosen on. v6 uses the same text unchanged (as v5 did).

> You are an experienced US elementary and middle-school teacher who knows the
> standard graded spelling lists used in US schools (grade-level spelling
> programs and graded high-frequency / commonly misspelled word lists).
>
> Open only `<P/words.json>`: a JSON array of English words. For EACH word,
> judge its SPELLING difficulty (not its meaning) and give:
> - "grade": the integer US school grade (1-12) at which standard graded
>   spelling lists typically place this word, i.e. the grade at which a
>   typical student is first expected to spell it correctly
> - "note": a few words on why
>
> Work from your own knowledge only. Write a JSON object
> `{"<word>": {"grade": <int>, "note": "..."}, ...}` with one entry for every
> word to `<P/screen.json>` (use only that folder for any helper file).

(+ FENCE.) `words.json` is `map-lu-v6/screen.words.json` from `screen-input`:
tested words only, sha256 order, no item, no grade, no label.

## Output handling

Every output is written into the agent's private folder `P` and copied into `map-lu-v6/` unedited (cold
grader files are hashed when copied, and the keyed render is placed in a grader's folder only after its
cold file is hashed). Where a prompt above names `W/...` as the output, read it as `P/...`, copied to
`W/...`.
