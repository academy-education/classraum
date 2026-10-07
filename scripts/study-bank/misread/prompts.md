# Misreading-derived distractors: taxonomy and agent prompts (fixed before any passage is chosen)

Shared by `MAP-MISREAD-PILOT-2026-10-07.prereg.md` (MAP pilot 8) and
`SSAT-READING-MISREAD-PREREGISTERED.md` (SSAT Reading pilot 5). Every agent is a
fresh Claude subagent (never GPT). `<...>` is filled with a path, a set id, a
grade, or a habit block from §1, and nothing else.

Every prompt also carries this footer:

> Do not open any file in `scripts/study-bank/` other than the ones named
> here. Do not open any published test item, any NWEA material, the Herald or
> cloud.dherald.com PDFs, or any web page unless this prompt tells you to. At
> the end, state which files you opened.

## 1. The misreading taxonomy

These are the habits professional item writers use when they derive wrong
options from real student errors. The design rests on the item-writing
guideline "use typical errors of students to write your distractors"
(Haladyna, Downing & Rodriguez 2002, *Applied Measurement in Education* 15(3)),
on distractors coded by the level of misunderstanding they represent (King,
Gardner, Zucker & Jorgensen 2004, the Pearson *distractor rationale taxonomy*,
whose use in reading assessment was confirmed by search on 2026-10-07; and
Briggs, Alonzo, Schwab & Wilson 2006, *Educational Assessment* 11(1), on
ordered multiple-choice), and on the review in Gierl, Bulut, Guo & Zhang 2017,
*Review of Educational Research* 87(6).

Each habit cites the research that documents it as a real reader error. Where
the grounding is item-writing practice rather than error research, the entry
says so. Citations marked † were confirmed by web search on 2026-10-07. The
rest are standard references cited from memory, without page-level checking.

| id | habit | what the reader does | grounding |
|---|---|---|---|
| H1 | **detail-as-main-idea** | Offers a vivid or interesting detail as the main point or purpose. | Winograd 1984, *RRQ* 19(4): poor summarisers chose sentences by interest, not importance. Brown & Day 1983, *JVLVB* 22: the macrorules (delete trivia, generalise) develop late. |
| H2 | **over-generalisation / one step too far** | Turns a limited, hedged or local statement into a sweeping one, or infers past what the text supports. | Graesser, Singer & Trabasso 1994, *Psych. Review* 101(3): readers routinely make bridging inferences, while elaborative ones are unreliable. The "too far" distractor itself is item-writing practice (Haladyna & Rodriguez 2013). |
| H3 | **author/character conflation** | Treats a character's, quoted person's or opponent's view as the author's or narrator's, or the reverse. | Wineburg 1991, *J. Ed. Psych.* 83(1): students read texts as neutral information, not as an author's perspective. The CCSS RL/RI.6-8.6 point-of-view standards exist for this error. |
| H4 | **first/last-paragraph only** | Answers from the opening or closing paragraph and treats its topic as the whole passage's. | Kieras 1980, *Memory & Cognition* 8(4): readers use initial position as a signal of the theme. Brown & Day 1983. |
| H5 | **literal reading of figurative language** | Takes a metaphor, idiom, irony or understatement at face value. | Cain, Oakhill & Lemmon 2005 †, *J. Exp. Child Psych.* 90: poor comprehenders fail to use context to interpret opaque idioms. Winner 1988, *The Point of Words*. |
| H6 | **prior knowledge over the text** | Answers from what they already believe about the topic, even where the passage says otherwise. | Alvermann, Smith & Readence 1985 †, *RRQ* 20: activated prior knowledge overrode incompatible text. Anderson & Pearson 1984, schema theory. Lipson 1983, *RRQ* 18. |
| H7 | **wrong referent** | Attaches a pronoun, "this", "such" or an action to the wrong person, thing or event. | Oakhill & Yuill 1986, *Language and Speech* 29(1); Yuill & Oakhill 1991, *Children's Problems in Text Comprehension*: less-skilled comprehenders mis-resolve anaphors. |
| H8 | **reversed causality / sequence** | Swaps cause and effect, or before and after. | Trabasso & van den Broek 1985, *JML* 24: comprehension builds a causal network, and an error in it reverses relations. The "reversed relation" distractor itself is item-writing practice. |
| H9 | **keyword matching** | Finds the sentence that shares words with the question and answers with what that sentence says, whether or not it answers the question. | Rupp, Ferne & Choi 2006 †, *Language Testing* 23(4); Farr, Pritchard & Smitten 1990, *JEM* 27(3): test-takers match question words to text locations. |
| H10 | **literal only (no gap-filling inference)** | Repeats what is stated near the relevant spot and does not make the inference the question needs. | Oakhill 1984, *Brit. J. Ed. Psych.* 54; Cain & Oakhill 1999, *Reading and Writing* 11: less-skilled comprehenders make fewer necessary inferences. |
| S1-S3 | **skilled reader** | Reads the whole passage carefully and answers from the text. | Panel members whose consensus defines the key. |

Habit blocks for §4 are the "what the reader does" column, verbatim.

## 2. Passage selector (one fresh agent per family)

> You are choosing reading passages for a pilot. Read the rules, fetch real
> texts with `curl` into `<scratch dir>`, and write `<passages.json>`.
>
> **Sources (no AI-written prose):**
> (a) literature first published before 1931, from Project Gutenberg plain-text
> files; or (b) prose written by a U.S. federal agency (for example
> nps.gov, usgs.gov, noaa.gov, nasa.gov), which is public domain. Use only
> prose the agency wrote itself, not quoted third-party material.
> <family-specific slots, below>
>
> **For every passage:**
> - A contiguous excerpt of whole paragraphs, copied exactly. You may stop or
>   start at any paragraph boundary, but do not edit, modernise, re-punctuate
>   or join non-adjacent text. Gutenberg `_italics_` markers may be dropped.
> - Self-contained enough that a student needs nothing before it. A one-line
>   italic introduction is NOT allowed.
> - Not one of the most anthologised excerpts of a famous work, such as the
>   opening chapter of a well-known novel. Prefer lesser-known works or
>   chapters.
> - Suitable for the grade: no slurs, demeaning racial or ethnic portrayals,
>   or graphic violence.
> - Has enough going on for 9-10 questions about main idea, inference,
>   point of view, structure and word meaning. Not a list of facts.
>
> Save each source file you fetched (the whole fetched file, for example the
> Gutenberg .txt, or the HTML-to-text you extracted for a federal page) under
> `<scratch dir>`. Record, per passage: `set_id`, `title`, `author` (or the
> agency), `year`, `source_kind` ("pre-1931 literature" | "US federal"),
> `url`, `local_path`, `sha256` (of the saved file, via `shasum -a 256`),
> `genre`, and `text` (paragraphs separated by a blank line).
> Then run `node scripts/study-bank/misread.mjs fk <fam>` and
> `node scripts/study-bank/misread.mjs verbatim <fam>`, and fix until both
> are within range. Do not write questions.

Family slots:
- **MAP**: `M6` = grade 6, literary text (pre-1931 fiction), 200-350 words,
  3-6 paragraphs, Flesch-Kincaid 4.0-8.9. `M8` = grade 8, informational text
  (U.S. federal prose, or pre-1931 non-fiction), 200-350 words, 3-6
  paragraphs, FK 4.0-8.9.
- **SSAT Upper**: `U1` = literary (pre-1931 fiction or memoir), `U2` =
  informational or essay (pre-1931 non-fiction, such as nature, science or
  history writing, or U.S. federal prose). Each 350-700 words, 3-9
  paragraphs. Report FK; no FK range is imposed.

## 3. Stem writer (one fresh agent per family; it never sees answers or options)

> Read `<passages.json>`. For each passage write exactly <9 (MAP) | 10 (SSAT)>
> open-ended questions, in the order you would want them used. **Do not write
> answer choices, and do not write or record any answer.**
>
> Every question must:
> - have one best answer that a careful reader can reach from the passage
>   alone;
> - NOT be answerable by finding one sentence that repeats the question's
>   words. Target inference, central idea or theme, point of view, an
>   author's or character's purpose or motive, structure, and the meaning of
>   a word or phrase in context;
> - be phrased as a real test stem ("Which statement best describes...",
>   "What does the narrator mean when...", "Why does the author mention...").
>
> <family-specific rules, below>
>
> Write JSON to `<stems.json>`:
> `[{"set_id": "...", "stems": [{"sid": "<set>-S1", "prompt": "...", "kind": "<kind>"<, MAP: "map_area": "...", "map_strand": "...">}, ...]}]`.

Family rules:
- **MAP** (grades 6 and 8; NWEA's public CCSS_2024 strands): kinds
  `main-idea`, `inference`, `point-of-view`, `purpose`, `structure`, `theme`,
  `character`. **No vocabulary-only items, and no "which evidence / which
  finding / which quotation best supports" items.**
  `map_area` is "Literary Text" or "Informational Text", matching the passage.
  `map_strand` is one of: "Analyze Theme and Literary Elements; Summarize",
  "Analyze Point of View, Features, and Structure" (literary), or "Analyze
  Central Idea, Concepts, and Events; Summarize", "Analyze Point of View,
  Purpose, Features, and Structure" (informational). Plain, grade-level
  wording.
- **SSAT Upper**: kinds `main-idea`, `inference`, `purpose`,
  `vocabulary-in-context`, `attitude`, `detail`. Per passage: exactly 1
  vocabulary-in-context ("As used in line/paragraph N, the word 'X' most
  nearly means"), at least 3 inference, at least 1 purpose or main-idea, at
  most 1 attitude, at most 1 detail.

## 4. Panel reader (13 fresh agents per set: H1-H10 and S1-S3; each sees ONLY the passage and the stems)

The orchestrator writes `panel/<set>/input.json`, which holds the passage and
the stems and nothing else, and gives each reader one prompt.

**Misreader (H1-H10):**

> You are role-playing a <MAP: typical grade <6|8> student | SSAT: typical
> student in grades 8-10 preparing for the Upper Level SSAT> taking a reading
> test. You are a real reader, not a caricature: you read the whole passage
> once, at normal speed, and you try to answer well. You have one reading
> habit that shapes how you understand texts:
>
> **<habit block from §1>**
>
> Let the habit work wherever a student with it would naturally be led by it.
> On questions where it would not plausibly matter, answer as a typical
> student of your level would. Do not mention the habit. Answer each question
> in your own words, in at most 30 words, as that student would write it.
> There are no answer choices.
>
> Open only `<panel/<set>/input.json>`. Write JSON to
> `<panel/<set>/<id>.json>`: `{"reader": "<id>", "answers": {"<sid>": "...", ...}}`,
> one answer for every question.

**Skilled reader (S1-S3):**

> You are role-playing a <MAP: strong grade <6|8> reader, top of the class |
> SSAT: strong grade 10 reader> taking a reading test. Read the whole passage
> carefully, then answer each question in your own words, in at most 30
> words, from the text alone. There are no answer choices. Open only
> `<panel/<set>/input.json>`. Write JSON to `<panel/<set>/<id>.json>`:
> `{"reader": "<id>", "answers": {"<sid>": "...", ...}}`.

## 5. Assembler (one fresh agent per family; turns the panel into items)

> Read `<passages.json>`, `<stems.json>`, `<misread/prompts.md>` §1 (the
> taxonomy), and every `<panel/<set>/*.json>`. Readers H1-H10 were each given
> the one habit of the same id; S1-S3 are skilled readers.
>
> For EVERY stem (all of them, in order):
> 1. **Cluster.** Group the 13 answers into distinct propositions. Two
>    answers share a cluster only if a grader would score them as the same
>    answer. Every reader goes in exactly one cluster.
> 2. **Key.** The cluster holding at least 2 of S1-S3 is `"key"` if its
>    answer is supported by the passage. Merge into it any answer that says
>    the same thing. If no cluster holds 2 skilled readers, mark the stem
>    ineligible.
> 3. **Wrong clusters.** Mark each other cluster `"wrong"`, unless one of
>    these applies, in which case mark it `"ineligible"` with that reason:
>    - `absent`: it is about something the passage never mentions;
>    - `not-refutable`: no passage sentence shows it is wrong;
>    - `defensible`: a careful reader could defend it as correct;
>    - `non-answer`: it does not answer the question;
>    - `duplicate-of-key`: it says the same thing as the key;
>    - `single-sentence-kill`: the only sentence that refutes it simply
>      negates its own words, so a student could kill it by matching that
>      sentence's wording.
>    For each cluster record `cid`, `gist`, `readers`, `status`, `reason`
>    (if ineligible), and `habit`: the §1 habit whose error the answer
>    actually shows. Usually this is the reader's own habit, but not always;
>    if two readers with different habits gave it, name the one the answer
>    exhibits.
> 4. **Eligibility (mechanical).** The stem is eligible only if it has a key
>    and at least <3 (MAP) | 4 (SSAT)> `"wrong"` clusters. **The distractors
>    are the <3|4> largest `"wrong"` clusters, ties broken by your cluster
>    order. You may not skip a larger wrong cluster for a smaller one;**
>    if you think a larger one should not be used, it must be marked
>    ineligible with one of the listed reasons.
> 5. **Write the item** (eligible stems only):
>    - `prompt`: the stem, unchanged, or with minimal edits for MC form.
>    - `correct_answer`: the key cluster's proposition, phrased in your own
>      words, NOT copying any run of 5 or more consecutive words from the
>      passage.
>    - one option per chosen wrong cluster. **Keep its proposition exactly**,
>      so the panel's misreading is what the student sees. Adjust only the
>      wording, so that all <4|5> options share one grammatical frame,
>      similar length and similar specificity. Do not make the key the
>      longest, the most hedged, or the only option in the passage's
>      vocabulary.
>    - `choices`: the key plus the distractors, in any order.
>    - `distractors`: per wrong option: `text` (exactly as in `choices`),
>      `cid`, `habit`, `readers`, `quotes` (each reader's answer, verbatim,
>      one per reader), `refutation_sentence` (one passage sentence, copied
>      exactly, that shows it is wrong), and `why_not_single_sentence` (why
>      a student cannot kill it just by matching that sentence's wording).
>    - `key_support`: the passage sentence(s) that support the key, verbatim.
>
> Write `<assembly.json>`:
> `[{"sid": "...", "clusters": [...], "item": {...} | null}, ...]`,
> one entry per stem, in stems.json order.
> Then run `node scripts/study-bank/misread.mjs tally <fam>`. If it reports
> an ERROR line (a mechanical violation of steps 1-4), fix assembly.json and
> re-run. Do not change a cluster's membership to make a stem eligible.

## 6. Key verifier (pre-freeze; one fresh agent per family)

> Open only `<verify.input.json>`. Each item has a passage, a question, its
> choices with the intended key marked, and, for each wrong option, the
> student misreading it came from, the panel answers it came from, and the
> passage sentence claimed to refute it. For EACH item judge:
> - `key_correct`: the marked key is correct from the passage;
> - `key_unique`: no other option could be defended as correct;
> - `refutations_valid`: for every wrong option, the cited sentence really
>   does show it is wrong;
> - `provenance_faithful`: every wrong option states the same proposition as
>   the panel answers it is attributed to (wording may differ);
> - `note`: one or two sentences, naming the option at fault if any check is
>   false.
> Write `<verify.json>`: `{"<id>": {...}, ...}`.

**Repair (one round, for items failing a stage-0 check or the verifier; one
fresh agent):**

> Read `<misread/prompts.md>` §5 and `<repair.input.json>`: items with the
> checker's PROBLEM lines or the verifier's note (verbatim) plus their full
> cluster tables. Repair each item ONLY by (a) rewording an option or the key
> within the §5 rules, keeping every proposition, or (b) marking the faulty
> wrong cluster `"ineligible"` with a listed reason, which brings in the next
> largest `"wrong"` cluster as its replacement. Never invent an option that
> no panel reader gave. Write `<assembly.json>` back with those stems
> changed, then re-run `tally`.

The re-check uses the verifier prompt unchanged, by a fresh agent, on
repaired items only (`verify-2.json`).

## 7. MAP with-source grader (two fresh graders)

This is pilot 7's prompt 4 unchanged, with the one `option_quality` line
added.

> Open only `<misread/map/ws.md>`: 12 items for a grades 5-8 English reading
> and language diagnostic (CCSS ELA grades 5-8). Each lists its strand, grade
> target and target RIT band (ten-point bands: 170-179 is roughly early
> grade 4/5, 180-189 typical grade 5, 190-199 typical grade 6, 200-209
> typical grade 7, 210-219 typical grade 8, 220-229 above grade 8). The
> correct answer is not marked. Solve each item yourself, then judge it.
> Return JSON to `<misread/map/ws.grader-X.json>`, keyed by item number:
>
> - `pick`: your answer letter
> - `second_defensible`: a letter you think could also be defended as correct, or null
> - `grade_fit`: "fits" | "too_easy" | "too_hard" for the stated grade target, plus `grade_fit_note`
> - `band_assigned`: the ten-point RIT band you would target this item at, e.g. "RIT 190-199"
> - `band`: "plausible" | "easier" | "harder" relative to the stated target band
> - `free_elimination`: any option a student could kill with no reading or work, and why, or null
> - `dead_distractors`: letters of wrong options no grade 5-8 student would plausibly pick ([] if none)
> - `option_quality`: for EVERY option except your pick, how attractive it is as a wrong answer to a student at the stated grade: "strong" | "plausible" | "weak" | "dead", e.g. {"A": "plausible", "C": "weak", "D": "strong"}
> - `note`: one or two sentences

## 8. SSAT with-source grader (two fresh graders)

This is pilot 4's C+F prompt unchanged, with the `option_quality` field
added.

> Open only `<misread/ssat/withsource.json>`. Below are reading passages, each
> followed by five-choice questions. Answer each question as a careful expert
> test-taker. For each give: "pick" (A-E); "second_defensible" (the letter of
> any other choice a careful reader could also defend from the passage, or
> "none"); "difficulty" ("easy", "medium" or "hard" for a strong upper-level
> SSAT student reading this passage); "option_quality" (for EVERY choice
> except your pick, how attractive it is as a wrong answer to a typical
> upper-level SSAT student: "strong" | "plausible" | "weak" | "dead"); and a
> one-sentence "note" giving your reason. Return JSON
> {"labels": {"<qid>": {...}}} to `<misread/ssat/ws-X.json>`.

## 9. Naturalness judges (two fresh judges per family)

**MAP:** pilot 7's prompt 5, with the count set to 8.

> Below are 8 reading passages. For each, rate how natural and coherent the
> prose reads as a published reading passage for students in grades 5-8, on
> a scale of 1 (very unnatural or incoherent) to 5 (reads exactly like a
> well-written published passage). Judge each passage on its own. Give an
> integer rating and a one- or two-sentence reason for each. Return JSON:
> {"labels": {"N1": {"rating": <1-5>, "reason": "..."}, ...}}

(The judge opens only `misread/map/naturalness.json` and writes `nat-X.json`.)

**SSAT:** SSAT pilot 3's neutral prompt, verbatim. It already reads "8
passages".

> Below are 8 reading passages. For each, rate how natural and coherent the
> prose reads as a published reading passage for middle and high school
> students, on a scale of 1 (very unnatural or incoherent) to 5 (reads
> exactly like a well-written published passage). Judge each passage on its
> own. Give an integer rating and a one- or two-sentence reason for each.
> Return JSON: {"labels": {"N1": {"rating": <1-5>, "reason": "..."}, ...}}

(The judge opens only `misread/ssat/naturalness.json` and writes `nat3-X.json`.)

## 10. Options-only solvers

**MAP** (three fresh samples per split file): pilot 7's prompt 3, unchanged.

> Open only `<misread/map/oo-fN.blind.json>`. Each entry is the answer options
> to a multiple-choice question from an English test; the question, any
> passage and the item type are withheld. For every entry pick the letter you
> think is most likely the correct answer (guess if you must; never skip) and
> add a few words on why. Write JSON to `<misread/map/oo-fN.solver-X.json>`:
> `{"L01": {"pick": "A", "note": "..."}, ...}`, one entry for every id.

**SSAT** A and B (three fresh samples each): pilot 4's prompt, unchanged.

> The passages for these reading-test questions have been removed. For each
> question, pick the answer letter (A-E) you think is most likely correct.
> Each question has exactly one correct answer. Give a pick for every
> question. Return JSON {"labels": {"<qid>": {"pick": "<letter>"}, ...}}.

A agents open only `iso.json`. Each B agent opens `grp-1.json` and
`grp-2.json`, one file per passage, and returns one label file covering both.
