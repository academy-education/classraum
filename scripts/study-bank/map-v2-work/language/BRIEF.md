# map-v2 Language Usage, batch 1 — author brief (grades 5-8, 10 authors, 216 slots)

You are writing **original four-option multiple-choice items** for a grades 5-8 English Language Usage
diagnostic in the style of MAP Growth, aligned to the public Common Core standards (Language L.5-8.1, L.5-8.2,
L.5-8.3; Writing W.5-8.1-3 revision skills). Real students will practise on them. Your task message names your
**author code** (W56A, W78A, W56B, W78B, GR5, GR6, GR7, GR8, PU, CA). Write ONLY your own slots (tables at the end).

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not run git. No web.
Use only your own (Claude) reasoning; no external model calls, no GPT. **Never open, search for, quote or imitate
any published test item from any testing company; never open any file with "herald" in its name, or any PDF.**
Do not touch the database. Do not open another author's folder.

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v2-lang-work/<your code>/` (git-excluded; create it).
Write your items as ONE JSON array in `WORK/items.json`, in slot order. Files you may open: this brief,
`scripts/study-bank/map-v2-work/language/EXCLUSIONS-map-language.txt`, `.../language/slots.json`, and your own
`WORK` folder. Commands you may run (from the repo root `/Users/andylee/Downloads/saas/classraum`):

    node scripts/study-bank/map-v2-work/language/lu-check.mjs <WORK>/items.json     # every item must print ok
    node scripts/study-bank/map-lu-v6.mjs spell <word> <word> ...                   # macOS spellchecker + variant list

## Why this batch, and what killed the earlier ones (read this; it is the whole design)

The Language Usage block draws 13 Writing + 13 Grammar and Usage + 13 Mechanics per form. Five forms need 65 of
each. The bank holds 37 staged Mechanics items (26 Spelling, 11 Punctuation) and **zero Writing and zero Grammar**.

Six earlier batches (pilots 1-4, mech-v1, v2-v5) got the keys right almost every time (64/64, 72/72, 56/56 cold)
and still failed. What they failed on, and what this brief does about it:
1. **A structural tell across the batch, not in any one item.** The key was uniquely longest (Grammar v4: 4/12;
   Spelling v5: 8/28), had the fewest vowels (v3), or treated both sites alike so it was the unique max or min of
   capitals (Capitalization v4: 7/8). A script finds these from the option set alone. **Fix: every slot comes with
   a seeded construction** (key length rank, grid site kinds, capitalization case pattern) so the key's position
   on every countable feature is dealt by chance, not by your habits. lu-check.mjs refuses a slot built otherwise.
2. **The rule set by one batch's failure produced the next batch's tell** (v3: seeding the length fixed length and
   the free letter content made the vowel tell). Write naturally inside the assigned construction; do not aim for
   any other pattern.
3. **Model graders called items "easier than target".** This is NOT a gate any more: the same grader placed live,
   human-cleared grade-8 ISEE items at grade 3-5 (61 of 62 calls "easier"; REGISTER 2026-10-07). Write to the
   grade's own standard, at the harder end of it, and say why in `grade_rationale`.
4. **Dead distractors.** A wrong option nobody would pick wastes the item. Give every wrong option a
   `student_error`: the specific mistake a real student at that grade makes that produces it.

## Formats

Every item: `prompt`, four `choices`, `correct_answer` (exactly one of them), `student_error` (one per wrong
option, keyed by its exact text), `explanation` (why the key is right and each other option wrong; never name a
letter), `grade_rationale`, `ccss` (a code of the item's own grade). Plain US English; common first names a
spellchecker knows (Maya, Leo, Sam, Ana, Ben, Mia, Omar, Lily, Jack, Nora, Priya, Diego, Hana, Theo); invented
titles for books, films and songs. Sentences up to about 22 words, reading level grade 4-8.

### Writing (W56A, W78A: organization; W56B, W78B: language and style)

`map_area`: `"Writing: Write, Revise Texts for Purpose and Audience"`. `map_strand`: organization formats
`"Plan, Organize; Create Cohesion, Use Transitions"`; language formats `"Establish and Maintain Style; Use Precise
Language"`. A stimulus paragraph goes in `passage`, 4-7 sentences, each numbered in place: `"(1) ... (2) ..."`.
Write the paragraph as a student draft on an everyday or school subject: plausible, concrete, with one real
weakness the item is about. Never make the paragraph absurd so that the item becomes easy.

- **transition** — the paragraph shows a blank `____` at the start of one sentence. "Which word or phrase best
  fits the blank in sentence 4?" The four options name **different logical relations** (contrast, cause,
  result, addition, example, time order, conclusion), each grammatical in the blank. Only one fits the relation
  between that sentence and the one before it. *(The SAT transitions stratum measured clean on the options-only
  attack: the reader has to read both sentences. Keep it that way: never let one option be the only one that
  could start a sentence, or the only formal one.)*
- **placement** — a new sentence is given in the prompt. "Where should this sentence be added?" Options are
  positions: `"Before sentence 1"`, `"After sentence 2"`, `"After sentence 4"`, `"After sentence 5"`. Exactly one
  position works, because of a pronoun, a time word, or the order of ideas. Choose positions so the key is not
  always the middle one.
- **irrelevant** — "Which sentence should be removed because it does not support the main idea of the
  paragraph?" Options: `"Sentence 2"`, `"Sentence 3"`, ... The sentence to remove shares the paragraph's topic
  words but drifts off its point (a related fact about something else, a personal aside); it must not be absurd
  or off-topic in vocabulary.
- **intro-conclusion** — "Which sentence best introduces / concludes the paragraph?" or "Which sentence best
  supports the claim in sentence 1?" **All four options are about the same subject, in the same register, and
  about the same length.** Each wrong option fails for a reason that shows only against the paragraph: it covers
  a different aspect the paragraph never develops, it repeats one detail instead of summing up, it contradicts
  sentence 3, it promises a list the paragraph does not give. Never make the wrong options perform visibly
  different acts (a question, a joke, an opinion, a summary) so the key can be picked by kind alone: an item
  leaks when the options differ along the axis the stem names (CLAUDE.md, "the one predictor that has held").
- **precise-word** — a sentence (alone or in a short passage) with one vague word in square brackets, e.g.
  `[good]`. "Which word would be the most precise replacement for the word in brackets?" Four real words, all
  grammatical in the slot, close in meaning; only one fits the exact situation described (shades of meaning).
- **combine** — two or three short sentences. "Which sentence best combines the sentences?" One option keeps
  every fact and the right relation and is correct; the others use the wrong relation ("because" for a
  contrast), drop or change a fact, or misplace a modifier. At most one wrong option may contain a comma splice.
- **style-audience** — "Which revision of sentence 3 best fits the formal style of the report?" / "...is most
  appropriate for a letter to the school principal?" Four versions of the sentence with the same content; one is
  formal and precise, the others are too casual, slangy, emotional, or vague. No wrong option may also be
  acceptable formal English.
- **concise-revision** — "Which revision is clearest and least wordy without changing the meaning?" One option
  removes the redundancy and keeps every idea; the wrong options keep a redundancy, drop a needed idea, or change
  the meaning. **The assigned key length rank applies here too**: a wrong option that is SHORTER than the key
  because it drops a needed idea is how rank 1-3 keys are possible. (Grammar v3 lost two redundancy items to a
  shortest-option tell.)

**Key length rank** (formats with a rank in your table): rank the four options by character length, longest = 1;
the key must sit at exactly your slot's rank, and all four lengths must differ by at least 2 characters. Copy the
rank into `key_length_rank`. Lengthen or shorten a distractor; never pad or trim the key into something unnatural.

### Grammar and Usage (GR5, GR6, GR7, GR8: one grade each)

`map_area`: `"Language: Understand, Edit for Grammar, Usage"`. `map_strand`: `"Parts of Speech"` (verb tense and
form, voice and mood, pronoun case and type, adjective/adverb, conjunctions and prepositions, verbals) or
`"Phrases, Clauses, Agreement, Sentences"` (agreement, modifiers, sentence structure, fragments and run-ons as
clause errors, parallel and correlative structure). About half your items in each.

- **grid** — "Which sentence is written correctly?" Each option is one full sentence. The item has **two error
  sites**; the four options are exactly: neither error (the key), only the first, only the second, both.
  Everything other than the two sites is character-for-character identical. **Your slot assigns the site kinds**,
  in sentence order: `add` = the error ADDS a word or words that the correct sentence does not have, `remove` =
  the error DROPS a word the correct sentence has, `sub` = the error REPLACES a word ("me" for "I"). Put the two
  sites apart (not adjacent) and choose two errors the same kind of student makes together, so the both-errors
  option is a real pick. Name them in `error_sites`.
- **blank** — one sentence with `____`. "Which word or phrase correctly completes the sentence?" Four forms of the
  same word or four members of one closed set (four tenses of one verb; four pronoun cases; four conjunctions);
  only one is standard English in this sentence, decided by something elsewhere in the sentence (a time clause, an
  antecedent, a parallel item), not by the word just before the blank.

Standards (anchor every item to its own grade; never label a lower grade's rule at a higher grade):
- grade 5: L.5.1a conjunctions, prepositions, interjections in context; L.5.1b perfect tenses; L.5.1c tense for
  time, sequence, state, condition; L.5.1d inappropriate tense shifts; L.5.1e correlative conjunctions; L.5.3a
  expand, combine, reduce sentences.
- grade 6: L.6.1a pronoun case; L.6.1b intensive pronouns; L.6.1c shifts in pronoun number and person; L.6.1d vague
  pronouns (only where the vague reading is unmistakable); L.6.3a varied sentence patterns.
- grade 7: L.7.1a function of phrases and clauses; L.7.1b simple, compound, complex, compound-complex sentences;
  L.7.1c misplaced and dangling modifiers.
- grade 8: L.8.1a verbals (gerunds, participles, infinitives); L.8.1b active and passive voice; L.8.1c verb mood
  (indicative, imperative, interrogative, conditional, subjunctive); L.8.1d inappropriate shifts in voice and mood.
- Never at grades 5-8: irregular past forms, basic subject-verb agreement, its/it's, there/their, a/an,
  comparatives, double negatives (grade 1-4 rules); and nothing disputable: who/whom, singular "they",
  "everyone ... their", "than I / than me", split infinitives, a final preposition, "data is", "I wish I was",
  "each of ... their", "neither ... nor" with mixed number, "between you and I" with a second reading.
- Grades 5-6 ran easy for the reviewers: write the harder instance (the site separated from what decides it; the
  less familiar case of the rule: future perfect, past perfect after "by the time", pronoun case inside a
  prepositional phrase or with an appositive, "we students / us students", "hisself" beside a correct intensive).

### Punctuation (PU: grades 5-8) and Capitalization (CA: grades 5-6)

`map_area`: `"Language: Understand, Edit for Mechanics"`. `map_strand`: `"Punctuation"` or `"Capitalization"`.
Both use the **grid**: "Which sentence is punctuated correctly?" / "Which sentence is capitalized correctly?"

- **Punctuation**, by grade: L.5.2a-c commas in a series, after an introductory element, to set off yes/no, a tag
  question, direct address; L.5.2d titles of works in quotation marks; L.6.2a commas, parentheses or dashes around
  nonrestrictive elements; L.7.2a a comma between coordinate adjectives (and none between cumulative ones);
  L.8.2a a comma, ellipsis or dash for a pause or break; L.8.2b an ellipsis for an omission. Your slot assigns
  the site kinds (`add` = the error adds a mark, `remove` = drops one, `sub` = a wrong mark in place of the right
  one). **Never build both sites out of one paired mark** (the opening and closing comma, dash or parenthesis
  around one element): graders solved those by symmetry alone (v3 P05, P06, P15). One site may be half of a pair
  only if the other site is an independent rule elsewhere in the sentence.
- **Capitalization**, grades 5-6 only. The options are identical except for letter case. Each item a different
  `cap_rule`, the hard case a grade 5-6 student still gets wrong: titles of works with a short verb or pronoun
  inside ("Is", "Be", "It") vs short words that stay lowercase; a long preposition in a title ("Through",
  "Between"); a named historical event, period or document vs the same words used generally; an organization or
  government body vs the general word; a region vs a compass direction; a language vs a school subject, and a
  course name ("Algebra I") vs the subject; a quoted full sentence vs a quoted fragment; a generic word inside a
  multi-word proper name vs the same word used alone later. Not at grade 5: multi-word place names, seasons vs
  holidays, nationality words, days vs "weekend" (grade 3-4 rules). **Your slot assigns the case pattern**:
  `mixed` = one error ADDS a capital (over-capitalizes) and the other DROPS one; `both-over`; `both-under`.
  (Capitalization v4 failed because 7 of 8 keys treated both sites alike, making the key the option with the most
  or fewest capitals.)

## Distinct assignments (so concurrent authors cannot converge)

Each author owns a distinct strand x grade cell (tables at the end). Inside it, use ONLY your own sentence-content
domains below, and never reuse a sentence, a tested word, or a (rule, context) pair from
`EXCLUSIONS-map-language.txt` (444 earlier MAP Language Usage items, banked and killed):

| author | sentence and paragraph content domains (yours only) |
|---|---|
| W56A | sports and games; animal behaviour; school events and clubs |
| W78A | science and technology; travel and geography; volunteering and community |
| W56B | food and cooking; weather and seasons; hobbies and crafts |
| W78B | jobs and careers; art and music; health and the human body |
| GR5 | family life; pets; a neighbourhood |
| GR6 | space; oceans; camping and hiking |
| GR7 | inventions; sports history; theatre and film |
| GR8 | ancient civilizations; the environment; transportation |
| PU | museums and collections; weather events; books and authors (invented) |
| CA | geography and travel; documents, events and organizations; titles of invented books, films and songs |

Within your own file: no tested rule twice in the same context, no key sentence that differs from another of your
keys by a word or two, and vary where the sites fall (early, middle, late; far apart).

## File format (one object per item)

```json
{
  "id": "LV2-GR6-04",
  "family": "map",
  "map_subject": "language_usage",
  "map_area": "Language: Understand, Edit for Grammar, Usage",
  "map_strand": "Parts of Speech",
  "grade_target": 6,
  "format": "grid",                       // exactly your slot's format
  "ccss": "L.6.1a",
  "prompt": "Which sentence is written correctly?",
  "passage": null,                        // the numbered paragraph for Writing formats that need one
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "key_length_rank": null,                // your slot's rank, when it assigns one
  "error_sites": ["...", "..."],          // grids: the two sites, in sentence order
  "cap_rule": null,                       // Capitalization only
  "rule": "the rule or relation the item tests, in one line",
  "student_error": {"<wrong option>": "the mistake that produces it", "...": "...", "...": "..."},
  "explanation": "...",
  "grade_rationale": "why this is at grade <g>, at the harder end of its standard",
  "self_audit": "what a test-wise student would try without knowing the rule, and why it fails"
}
```

## Before you finish

1. `lu-check.mjs` prints `ok` for every item (it checks your slot's construction, the grid structure, the case
   pattern, the length rank, the exclusion list and the spellchecker on keys and paragraphs).
2. Re-read every item as a student at its grade and as a strict reviewer: (a) a second defensible answer, under
   any mainstream US style guide; (b) a wrong option nobody would pick; (c) an item anchored to a lower grade's
   rule; (d) anything other than the two sites that differs between grid options; (e) a paragraph that contradicts
   itself or states a false real-world fact (AUTHORING-RULES 4-5).
3. Reply with: one line per slot (id, format, rule, ok), and the three items you are least sure have exactly one
   defensible answer, with why. Do not claim "all ok" unless you ran the check and saw it.

## What happens next

The coordinator runs batch-level structural checks over all ten files (the T2 structural-predictor scan, pooled
key-length counts, a flat key deal per format), then the co-founder-standard grader (v2) reads every item for a
second defensible answer, a wrong key, a dead option and the batch patterns he has flagged before. Flags come back
to you once. Then the co-founder sits a spot sample; if his sample is clean, the batch is released.

---

## Pasted: AUTHORING-RULES-FROM-NOTES.md (binding; rules 1, 4, 5, 7, 12 and 13 apply directly to Language Usage items)

# Authoring rules from the co-founder's notes

<!-- AUTHORING-RULES-FROM-NOTES v1 -->

**Every author brief for the question bank must include this file** (paste it, or link it and copy the version
marker above into the brief so `node scripts/study-bank/apply-notes.mjs --check-brief <brief>` passes). The rules
come from `cofounder-notes.json` (his human reviews; ids in brackets are the first 8 characters of `review_id`, or a
`REG-` id for a REGISTER catch). Rules are appended by `apply-notes.mjs`, never rewritten; a superseded rule is
struck through with the reason, not deleted.

He judges; he never writes. These rules record what he caught so the next batch does not need him to catch it again.
Their effect is measured only as his flag and note rate on fresh batches, never on items he has seen.

## A. Release-blocking (an item that breaks one of these does not ship)

1. **Exactly one defensible answer** (`second_defensible`, 42 notes, 41 blocking). For every distractor, write the fault that
   kills it: it contradicts the source, answers a different question, mistakes the register, or refers to something
   the source rules out. "It is not as good as the key" is not a fault. He flags an option that is "not completely
   wrong", "sort of correct", "also plausible". [2c7311fb, 9dc86ebd, 87fede75, a82a66d4, …]
2. **The source must decide on its own** (`source_underspecified`, 5). A Choose a Response line, or any short
   source, must contain the facts the key relies on. If the key works only by assuming a setting the line does not
   state, rewrite the line until the other replies are contradicted, not merely unmentioned. [25cbdd60, eacf3e55,
   a4674f2b, 6a5163ed, 9d0f956a]
3. **The key states only what the source states, about the right person** (`key_wrong`, 2). Check who does what to
   whom in every key; a key that adds an inference the speakers never make is wrong, even if it is the closest
   option. [4cec146d, 80a73085]
4. **Check every real-world claim** (`factual_error`, 1 + REG-offside). A passage about a real sport, game, law,
   procedure, place or named science gets its rule checked against an authoritative source before staging, not
   just its story logic. Fiction may invent people; it may not get a real rule wrong. [8dd87249, REG-offside]
5. **The source must not contradict itself** (`self_contradiction`, 3 + REG-goldfish, REG-v6-04, REG-v6-12). Before
   staging, read each passage or transcript line by line for dates, names, numbers, who-knows-what-when and
   explanations, and confirm the ending does not assert something an earlier line denies ("origin is a mystery" vs.
   "invented to justify"). [237a4f2f, 2f3a84af, 2dca0772]
6. **Transcripts sound like speech** (`unnatural_speech`, 4 + REG-v6-contractions). Use contractions throughout
   ("I don't", "it's", "won't"); no "Let us do that"; every line follows from the previous turn, none exists only to
   set up a question; establish a speaker's gender in the transcript before any option says "he"/"she"; keep
   speaker labels consistent across the set (student = A). [c1307ad6, 2dca0772, eb494e08, d2cfedbb, 4eca5525]
7. **No cross-item key pattern** (`batch_pattern`, 2 + REG-abcd-deal). Across a batch, vary key position (never a
   repeating A-B-C-D run), key form (a dash, semicolon or hedge must not appear only in keys), key prose (the same
   wording or claim type must not key many items), and construction (let different parties be the committed one).
   [4d2b87e1, 120b33a2, REG-abcd-deal]

## B. Quality (he accepts the item but asks for better; these make his next sitting shorter)

8. **Closer distractors on main-idea, purpose and attitude items** (`distractor_too_easy`, 14). At least two
   distractors should be tempting: a real part of the passage that is not the whole, a central point stated too
   narrowly, an overstatement of a hedged claim. He: "All four are easy to eliminate." [f7cacf39, e46b72a0, …]
9. **Tailor attitude option sets to the passage** (`option_set_reused`, 1 + REG-attitude-sets). Do not reuse
   amused / critical / uneasy / admiring / regretful; include near-neighbours of the key (nostalgic, resigned,
   indifferent, skeptical, detached). [7c8aab32, 26ae474d]
10. **The key uses the passage's own sense** (`key_imprecise`, 12). No narrower or regional synonym ("stall" for
    fail, "queue" for loose lines), no detail the passage does not give ("village pond"), no "settings" where the
    passage means what is controlled. [b3cf68ab, b30f004e, f7330481, 32985a85]
11. **The skill label matches the item** (`skill_mislabel`, 2). A purpose or inference item whose answer is stated
    almost word for word is a detail item: relabel it or make it a real inference. [7163deb4, 56bf4092]
12. **The key must not stand out** (`key_stands_out`, 46). Not uniquely longest, not the only option outside a shared
    category, wording or polarity. (Bank-side caps already enforce length.)
13. **Options are grammatical and do not copy the passage** (`option_wording`, 5). [cf2d90b9, 1544b368, d9e34532]
14. **Display**: paragraph and stanza breaks must survive into the item; a stem that says "the final paragraph" is
    unanswerable without them (`formatting`). [d3fd0c01, 45af4dc8]

---

## Slot tables (seeded, map-v2-lang-b1-slots-2026-10-24; also in slots.json)

### Author W56A — writing (organization), grade 5 x11, grade 6 x11 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-W56A-01 | 5 | placement | options are sentence positions (no rank) |
| LV2-W56A-02 | 5 | placement | options are sentence positions (no rank) |
| LV2-W56A-03 | 5 | placement | options are sentence positions (no rank) |
| LV2-W56A-04 | 5 | transition | key length rank 4 |
| LV2-W56A-05 | 5 | irrelevant | options are sentence positions (no rank) |
| LV2-W56A-06 | 5 | transition | key length rank 3 |
| LV2-W56A-07 | 5 | irrelevant | options are sentence positions (no rank) |
| LV2-W56A-08 | 5 | intro-conclusion | key length rank 2 |
| LV2-W56A-09 | 5 | intro-conclusion | key length rank 3 |
| LV2-W56A-10 | 5 | intro-conclusion | key length rank 3 |
| LV2-W56A-11 | 5 | transition | key length rank 1 |
| LV2-W56A-12 | 6 | intro-conclusion | key length rank 3 |
| LV2-W56A-13 | 6 | transition | key length rank 4 |
| LV2-W56A-14 | 6 | transition | key length rank 1 |
| LV2-W56A-15 | 6 | placement | options are sentence positions (no rank) |
| LV2-W56A-16 | 6 | irrelevant | options are sentence positions (no rank) |
| LV2-W56A-17 | 6 | intro-conclusion | key length rank 1 |
| LV2-W56A-18 | 6 | irrelevant | options are sentence positions (no rank) |
| LV2-W56A-19 | 6 | placement | options are sentence positions (no rank) |
| LV2-W56A-20 | 6 | transition | key length rank 2 |
| LV2-W56A-21 | 6 | intro-conclusion | key length rank 3 |
| LV2-W56A-22 | 6 | placement | options are sentence positions (no rank) |

### Author W78A — writing (organization), grade 7 x11, grade 8 x11 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-W78A-01 | 7 | irrelevant | options are sentence positions (no rank) |
| LV2-W78A-02 | 7 | placement | options are sentence positions (no rank) |
| LV2-W78A-03 | 7 | transition | key length rank 2 |
| LV2-W78A-04 | 7 | intro-conclusion | key length rank 2 |
| LV2-W78A-05 | 7 | transition | key length rank 3 |
| LV2-W78A-06 | 7 | placement | options are sentence positions (no rank) |
| LV2-W78A-07 | 7 | placement | options are sentence positions (no rank) |
| LV2-W78A-08 | 7 | intro-conclusion | key length rank 1 |
| LV2-W78A-09 | 7 | irrelevant | options are sentence positions (no rank) |
| LV2-W78A-10 | 7 | intro-conclusion | key length rank 4 |
| LV2-W78A-11 | 7 | transition | key length rank 4 |
| LV2-W78A-12 | 8 | placement | options are sentence positions (no rank) |
| LV2-W78A-13 | 8 | transition | key length rank 1 |
| LV2-W78A-14 | 8 | intro-conclusion | key length rank 2 |
| LV2-W78A-15 | 8 | intro-conclusion | key length rank 2 |
| LV2-W78A-16 | 8 | intro-conclusion | key length rank 2 |
| LV2-W78A-17 | 8 | transition | key length rank 1 |
| LV2-W78A-18 | 8 | placement | options are sentence positions (no rank) |
| LV2-W78A-19 | 8 | irrelevant | options are sentence positions (no rank) |
| LV2-W78A-20 | 8 | placement | options are sentence positions (no rank) |
| LV2-W78A-21 | 8 | irrelevant | options are sentence positions (no rank) |
| LV2-W78A-22 | 8 | transition | key length rank 1 |

### Author W56B — writing (language), grade 5 x11, grade 6 x11 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-W56B-01 | 5 | style-audience | key length rank 3 |
| LV2-W56B-02 | 5 | concise-revision | key length rank 2 |
| LV2-W56B-03 | 5 | combine | key length rank 1 |
| LV2-W56B-04 | 5 | style-audience | key length rank 1 |
| LV2-W56B-05 | 5 | concise-revision | key length rank 3 |
| LV2-W56B-06 | 5 | style-audience | key length rank 2 |
| LV2-W56B-07 | 5 | precise-word | key length rank 2 |
| LV2-W56B-08 | 5 | precise-word | key length rank 4 |
| LV2-W56B-09 | 5 | combine | key length rank 3 |
| LV2-W56B-10 | 5 | combine | key length rank 4 |
| LV2-W56B-11 | 5 | precise-word | key length rank 1 |
| LV2-W56B-12 | 6 | combine | key length rank 1 |
| LV2-W56B-13 | 6 | precise-word | key length rank 3 |
| LV2-W56B-14 | 6 | concise-revision | key length rank 3 |
| LV2-W56B-15 | 6 | combine | key length rank 2 |
| LV2-W56B-16 | 6 | precise-word | key length rank 2 |
| LV2-W56B-17 | 6 | precise-word | key length rank 1 |
| LV2-W56B-18 | 6 | style-audience | key length rank 4 |
| LV2-W56B-19 | 6 | combine | key length rank 3 |
| LV2-W56B-20 | 6 | concise-revision | key length rank 1 |
| LV2-W56B-21 | 6 | style-audience | key length rank 2 |
| LV2-W56B-22 | 6 | style-audience | key length rank 4 |

### Author W78B — writing (language), grade 7 x11, grade 8 x11 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-W78B-01 | 7 | combine | key length rank 1 |
| LV2-W78B-02 | 7 | style-audience | key length rank 1 |
| LV2-W78B-03 | 7 | precise-word | key length rank 3 |
| LV2-W78B-04 | 7 | combine | key length rank 2 |
| LV2-W78B-05 | 7 | precise-word | key length rank 1 |
| LV2-W78B-06 | 7 | style-audience | key length rank 2 |
| LV2-W78B-07 | 7 | combine | key length rank 2 |
| LV2-W78B-08 | 7 | concise-revision | key length rank 3 |
| LV2-W78B-09 | 7 | concise-revision | key length rank 3 |
| LV2-W78B-10 | 7 | precise-word | key length rank 4 |
| LV2-W78B-11 | 7 | style-audience | key length rank 4 |
| LV2-W78B-12 | 8 | precise-word | key length rank 3 |
| LV2-W78B-13 | 8 | precise-word | key length rank 2 |
| LV2-W78B-14 | 8 | concise-revision | key length rank 4 |
| LV2-W78B-15 | 8 | combine | key length rank 3 |
| LV2-W78B-16 | 8 | style-audience | key length rank 3 |
| LV2-W78B-17 | 8 | style-audience | key length rank 1 |
| LV2-W78B-18 | 8 | concise-revision | key length rank 1 |
| LV2-W78B-19 | 8 | style-audience | key length rank 2 |
| LV2-W78B-20 | 8 | combine | key length rank 1 |
| LV2-W78B-21 | 8 | precise-word | key length rank 2 |
| LV2-W78B-22 | 8 | combine | key length rank 4 |

### Author GR5 — grammar, grade 5 x22 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-GR5-01 | 5 | grid | site kinds remove,sub |
| LV2-GR5-02 | 5 | grid | site kinds sub,remove |
| LV2-GR5-03 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-04 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-05 | 5 | grid | site kinds remove,sub |
| LV2-GR5-06 | 5 | grid | site kinds add,remove |
| LV2-GR5-07 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-08 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-09 | 5 | grid | site kinds remove,add |
| LV2-GR5-10 | 5 | grid | site kinds sub,remove |
| LV2-GR5-11 | 5 | grid | site kinds sub,add |
| LV2-GR5-12 | 5 | grid | site kinds sub,add |
| LV2-GR5-13 | 5 | grid | site kinds add,sub |
| LV2-GR5-14 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-15 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-16 | 5 | grid | site kinds add,remove |
| LV2-GR5-17 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-18 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-19 | 5 | blank | no rank (T2 checks the batch) |
| LV2-GR5-20 | 5 | grid | site kinds add,remove |
| LV2-GR5-21 | 5 | grid | site kinds sub,add |
| LV2-GR5-22 | 5 | grid | site kinds remove,sub |

### Author GR6 — grammar, grade 6 x22 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-GR6-01 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-02 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-03 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-04 | 6 | grid | site kinds sub,add |
| LV2-GR6-05 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-06 | 6 | grid | site kinds remove,add |
| LV2-GR6-07 | 6 | grid | site kinds add,remove |
| LV2-GR6-08 | 6 | grid | site kinds sub,sub |
| LV2-GR6-09 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-10 | 6 | grid | site kinds add,remove |
| LV2-GR6-11 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-12 | 6 | grid | site kinds remove,add |
| LV2-GR6-13 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-14 | 6 | grid | site kinds sub,add |
| LV2-GR6-15 | 6 | grid | site kinds sub,remove |
| LV2-GR6-16 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-17 | 6 | blank | no rank (T2 checks the batch) |
| LV2-GR6-18 | 6 | grid | site kinds sub,sub |
| LV2-GR6-19 | 6 | grid | site kinds remove,sub |
| LV2-GR6-20 | 6 | grid | site kinds remove,sub |
| LV2-GR6-21 | 6 | grid | site kinds add,sub |
| LV2-GR6-22 | 6 | grid | site kinds add,sub |

### Author GR7 — grammar, grade 7 x22 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-GR7-01 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-02 | 7 | grid | site kinds remove,sub |
| LV2-GR7-03 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-04 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-05 | 7 | grid | site kinds add,remove |
| LV2-GR7-06 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-07 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-08 | 7 | grid | site kinds sub,add |
| LV2-GR7-09 | 7 | grid | site kinds sub,remove |
| LV2-GR7-10 | 7 | grid | site kinds sub,remove |
| LV2-GR7-11 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-12 | 7 | grid | site kinds remove,add |
| LV2-GR7-13 | 7 | grid | site kinds sub,sub |
| LV2-GR7-14 | 7 | grid | site kinds add,remove |
| LV2-GR7-15 | 7 | grid | site kinds sub,sub |
| LV2-GR7-16 | 7 | grid | site kinds add,sub |
| LV2-GR7-17 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-18 | 7 | grid | site kinds add,remove |
| LV2-GR7-19 | 7 | grid | site kinds sub,remove |
| LV2-GR7-20 | 7 | grid | site kinds add,sub |
| LV2-GR7-21 | 7 | blank | no rank (T2 checks the batch) |
| LV2-GR7-22 | 7 | blank | no rank (T2 checks the batch) |

### Author GR8 — grammar, grade 8 x22 (22 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-GR8-01 | 8 | grid | site kinds sub,remove |
| LV2-GR8-02 | 8 | grid | site kinds sub,add |
| LV2-GR8-03 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-04 | 8 | grid | site kinds sub,add |
| LV2-GR8-05 | 8 | grid | site kinds add,sub |
| LV2-GR8-06 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-07 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-08 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-09 | 8 | grid | site kinds add,remove |
| LV2-GR8-10 | 8 | grid | site kinds remove,sub |
| LV2-GR8-11 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-12 | 8 | grid | site kinds add,sub |
| LV2-GR8-13 | 8 | grid | site kinds add,remove |
| LV2-GR8-14 | 8 | grid | site kinds sub,sub |
| LV2-GR8-15 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-16 | 8 | grid | site kinds add,sub |
| LV2-GR8-17 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-18 | 8 | grid | site kinds add,remove |
| LV2-GR8-19 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-20 | 8 | blank | no rank (T2 checks the batch) |
| LV2-GR8-21 | 8 | grid | site kinds remove,sub |
| LV2-GR8-22 | 8 | grid | site kinds remove,add |

### Author PU — punctuation, grade 5 x6, grade 6 x7, grade 7 x6, grade 8 x7 (26 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-PU-01 | 5 | grid | site kinds add,remove |
| LV2-PU-02 | 5 | grid | site kinds add,sub |
| LV2-PU-03 | 5 | grid | site kinds sub,remove |
| LV2-PU-04 | 5 | grid | site kinds remove,sub |
| LV2-PU-05 | 5 | grid | site kinds remove,add |
| LV2-PU-06 | 5 | grid | site kinds sub,add |
| LV2-PU-07 | 6 | grid | site kinds sub,remove |
| LV2-PU-08 | 6 | grid | site kinds add,sub |
| LV2-PU-09 | 6 | grid | site kinds remove,sub |
| LV2-PU-10 | 6 | grid | site kinds remove,add |
| LV2-PU-11 | 6 | grid | site kinds sub,sub |
| LV2-PU-12 | 6 | grid | site kinds add,remove |
| LV2-PU-13 | 6 | grid | site kinds sub,add |
| LV2-PU-14 | 7 | grid | site kinds remove,add |
| LV2-PU-15 | 7 | grid | site kinds sub,remove |
| LV2-PU-16 | 7 | grid | site kinds add,sub |
| LV2-PU-17 | 7 | grid | site kinds remove,sub |
| LV2-PU-18 | 7 | grid | site kinds sub,add |
| LV2-PU-19 | 7 | grid | site kinds add,remove |
| LV2-PU-20 | 8 | grid | site kinds sub,remove |
| LV2-PU-21 | 8 | grid | site kinds add,sub |
| LV2-PU-22 | 8 | grid | site kinds sub,add |
| LV2-PU-23 | 8 | grid | site kinds remove,sub |
| LV2-PU-24 | 8 | grid | site kinds sub,sub |
| LV2-PU-25 | 8 | grid | site kinds add,remove |
| LV2-PU-26 | 8 | grid | site kinds remove,add |

### Author CA — capitalization, grade 5 x6, grade 6 x8 (14 slots)

| id | grade | format | assigned construction |
|---|---|---|---|
| LV2-CA-01 | 5 | grid | case pattern both-under |
| LV2-CA-02 | 5 | grid | case pattern mixed |
| LV2-CA-03 | 5 | grid | case pattern mixed |
| LV2-CA-04 | 5 | grid | case pattern mixed |
| LV2-CA-05 | 5 | grid | case pattern both-over |
| LV2-CA-06 | 5 | grid | case pattern mixed |
| LV2-CA-07 | 6 | grid | case pattern mixed |
| LV2-CA-08 | 6 | grid | case pattern both-over |
| LV2-CA-09 | 6 | grid | case pattern mixed |
| LV2-CA-10 | 6 | grid | case pattern both-under |
| LV2-CA-11 | 6 | grid | case pattern mixed |
| LV2-CA-12 | 6 | grid | case pattern both-under |
| LV2-CA-13 | 6 | grid | case pattern mixed |
| LV2-CA-14 | 6 | grid | case pattern both-over |
