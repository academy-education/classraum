# ssat-reading-pd-pilot: judge, grader and solver prompts (verbatim from the named sources; only paths changed)

Every agent is a fresh Claude subagent (never GPT), opens only the file named, and is told: never run
pkill, killall or any process-killing command; do not open any other file in `scripts/study-bank/` or
any web page; state at the end which files it opened.

## A1 presence judges (Stage 0; READING-BAR-CALIBRATION-2026-10-07.prereg.md, verbatim)

> Open only `<a1/a1-judge.json>`. Each entry is a reading passage followed by one or more
> lists of answer options; the questions and the correct answers are withheld. For EVERY option id,
> decide whether the passage discusses what the option is about: the people, things, places, events
> or ideas it names, in any wording (a paraphrase, a summary, or a more general or more specific term
> counts as discussed). Do NOT judge whether the option is true, correct or supported: an option the
> passage contradicts, or a claim about something the passage discusses, still counts as discussed.
> Mark an option not discussed only if it brings in something the passage never mentions at all.
> For each option id give "discussed" (true or false) and "quote": a short span copied exactly from
> the passage (at least three words) where it discusses what the option is about, or "" if not
> discussed. Write JSON to `<a1/a1-judge.X.json>`: {"<option id>": {"discussed": ...,
> "quote": "..."}, ...}, one entry for every option id in the file.

## Licensing judges (Stage 0; READING-BATCH-WV6-2026-10-07.prereg.md check 3, verbatim)

> Open only `<lic/lic.json>`. Below are reading passages, each followed by five-choice questions. Answer
> each question as a careful expert test-taker, judging it against its own passage only. For each
> give: "pick" (A-E); "second_defensible" (the letter of any other choice a careful reader could also
> defend from the passage, or "none"); "exclusions": for EVERY choice except your pick, a sentence (at
> least three words) copied exactly from the passage that rules that choice out; and a one-sentence
> "note". Return JSON {"labels": {"<question id>": {...}}}, one entry for every question id, to
> `<lic/lic.X.json>`. Do not open any other file in scripts/study-bank/ or any web page. At the end,
> state which files you opened.

## Stage 1 with-source graders (misread/prompts.md §8, verbatim)

> Open only `<withsource.json>`. Below are reading passages, each
> followed by five-choice questions. Answer each question as a careful expert
> test-taker. For each give: "pick" (A-E); "second_defensible" (the letter of
> any other choice a careful reader could also defend from the passage, or
> "none"); "difficulty" ("easy", "medium" or "hard" for a strong upper-level
> SSAT student reading this passage); "option_quality" (for EVERY choice
> except your pick, how attractive it is as a wrong answer to a typical
> upper-level SSAT student: "strong" | "plausible" | "weak" | "dead"); and a
> one-sentence "note" giving your reason. Return JSON
> {"labels": {"<qid>": {...}}} to `<ws-X.json>`.

## Stage 2 naturalness judges (misread/prompts.md §9, SSAT pilot 3's neutral prompt; count = passages shown)

> Below are <N> reading passages. For each, rate how natural and coherent the
> prose reads as a published reading passage for middle and high school
> students, on a scale of 1 (very unnatural or incoherent) to 5 (reads
> exactly like a well-written published passage). Judge each passage on its
> own. Give an integer rating and a one- or two-sentence reason for each.
> Return JSON: {"labels": {"N1": {"rating": <1-5>, "reason": "..."}, ...}}

(The judge opens only `naturalness.json` and writes `nat3-X.json`.)

## Stages 3 and 4 options-only solvers (misread/prompts.md §10, pilot 4's prompt, verbatim)

> The passages for these reading-test questions have been removed. For each
> question, pick the answer letter (A-E) you think is most likely correct.
> Each question has exactly one correct answer. Give a pick for every
> question. Return JSON {"labels": {"<qid>": {"pick": "<letter>"}, ...}}.

A agents open only `iso.json` and write `iso-X.json`. Each B agent opens every `grp-N.json` (one file
per passage) and returns one label file `grp-X.json` covering all of them.
