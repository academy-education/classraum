# Author brief: iTEP SLATE-style Reading, v1 (one form per author: 4 texts, 12 items)

> Status: frozen at the commit that records its sha256 in `itep-reading-v1-work/MANIFEST.json`, before any passage
> exists. Authors receive THIS file and their own `itep-reading-v1-work/authors/<X>.md` only. Never the blueprint,
> the prereg, any pending file, any other author's file, any reference PDF, or any published test.

You are writing **one complete practice Reading form** for an English proficiency test taken by **middle- and
high-school students learning English as a second language** (ages about 11-18, CEFR A2 to C1). Real students will
take it. Three independent reviewers will then check every item; **if any one of them finds a second defensible
answer, an unsupported key, or a key you can pick without reading, the whole passage and all its questions are
thrown out.** Quality over speed.

Work only from your own knowledge. Do not search for, open, quote, adapt or imitate any published reading passage or
test item from any testing company (iTEP, TOEFL Junior, Cambridge, SLEP, SSAT, ISEE or any other). No web. Open only
this brief, your assignment file, the two reference lists named in it, the check script named in it, and your own
output file. No database, no git, no npm/jest.

## 1. The form

| part | texts | words | questions | level (CEFR) | difficulty label |
|---|---|---|---|---|---|
| Part 1: Short Text | **two separate short texts**, each with **1 question** | 55-95 each | 1 + 1 | A2-B1 | `easy` |
| Part 2: Intermediate Passage | one passage | 180-240 | 4 | B1 | `medium` |
| Part 3: Advanced Passage | one passage | 450-560 | 6 | B2-C1 | `medium` for main-idea and detail, `hard` otherwise |

Every question has **four options** and exactly one correct answer. The genre, topic lane and question kinds of
every text are fixed in your assignment file. Do not change them.

**Part 1 texts** are everyday short texts a teenager meets: a school notice, a sign or poster, a short message or
email, a note, an advertisement, a diary entry, a postcard. Use plain sentences (no tables, no bullet lists, no
headings inside the text; a one-line greeting and sign-off are fine in a message). Part 1 questions mostly test
literal meaning.

**Parts 2 and 3** are connected prose: a story, a first-person account of school life, or an informational passage
on history or science, as assigned. Paragraphs are separated by a blank line. Part 3 has an idea worth asking about,
not just a list of facts.

## 2. Language level (this is a test for English learners, not native speakers)

- Part 1: high-frequency words (CEFR A2-B1), short sentences (average 15 words or fewer), no idioms.
- Part 2: B1 vocabulary, average sentence 18 words or fewer, at most one idiom, and only if the context makes it clear.
- Part 3: B2-C1 vocabulary is fine; average sentence 24 words or fewer. A few less common words are allowed when the
  context explains them.
- **Options use words no harder than the passage.** An option is never the only one with a rare word, and never the
  only one with all simple words.
- Natural, correct English. No slang that dates quickly. Not childish, not preachy.

## 3. Content rules

- **Fresh topics.** Check your subjects against `existing-passages.txt` (the opening of every passage already in the
  bank). Same subject, same central object or same situation as any of them = choose another.
- **Names.** Invent every person's name and every place name, and list them in the set's `names` field. Use only the
  initial letters your assignment gives you, never reuse a name across your four texts, and never use a name that
  appears in `existing-names.json`. Every capitalised word in the middle of a sentence must be listed in `names` or in
  `other_caps` (days, months, languages, real countries, school subjects).
- **History:** invented towns and people in a plausible past. Never attach invented events to a real named place or a
  real person.
- **Science and technology:** real science only, stated carefully; hedge numbers ("about", "roughly"). If you are not
  sure a fact is true, leave it out. A false science passage is worse than a dull one.
- **Story logic:** check line by line who knows what and when, what each person can see, numbers, days and times.
  A reviewer will look for any two statements that cannot both be true.
- **At most one negation word per paragraph** (not, no, never, nothing, nor, none, neither, nobody, nowhere, cannot,
  n't). The check script enforces it.

## 4. Question kinds

Write the kinds your assignment gives each text, in that order. Prompts must be worded differently from each other;
no prompt opening (first four words) may appear more than twice in your form.

| kind | what it asks | how to build it |
|---|---|---|
| `main-idea` | what the text or passage is mainly about / the writer's main point / the problem the writer describes | see rule M below |
| `detail` | a fact stated in the text ("According to the passage, ...") | the key **paraphrases** the line; distractors may reuse passage words in a wrong relation |
| `vocabulary` | what a word or short phrase in the text most nearly means | quote the word in the prompt, with its paragraph ("In paragraph 2, the word "..." is closest in meaning to"); the four options are real meanings of that word (or close synonyms of real meanings), and only one fits this context |
| `not-except` | "Which of the following is NOT ...", "All of the following are ... EXCEPT" (capitals as shown) | three options are each stated in the text (quote a line for each); the key is the one the text contradicts or plainly does not include |
| `purpose` | why the writer mentions X / why a paragraph is included / why the text was written | every option names a role in the same frame ("to show ...", "to explain ...", "to give an example of ...") |
| `inference` | what can be inferred / what is most likely true | the key needs **two** places in the text put together; never one sentence restated |

## 5. The rules every item must pass (each comes from defects reviewers found in earlier batches)

**R1. Exactly one defensible answer.** For every distractor, write the rationale that kills it **by quoting the
text**. If you cannot point at words in the text that make it wrong, it is a second answer: rewrite it.
"The text does not mention it" is a valid kill only for `detail` and `not-except` items, and only when the text
covers the topic and says something else. For `inference` items every distractor must be **contradicted** by a line,
not merely unmentioned, because a careful student may reach an unmentioned claim by reasonable reasoning.

**R2. The key is supported by the text, not by the world.** `why` is a verbatim substring of the text that supports
the key. `inference` items also need `why2`, a second verbatim substring from a different sentence. The explanation
may say nothing the text does not say.

**R3. No key you can choose without reading.** Cover the text and look at your four options. If one option is
obviously the sensible, true-in-general, polite, positive or "lesson" answer, or one or more options are silly or
impossible in the real world, a student can pick the key blind: rewrite. **At least three options must stay
believable with the text covered.** Science and history keys must be facts about THIS text (its people, numbers,
comparison, sequence), not textbook facts a student could know without it.

**M. Main-idea items: the key is not the broadest option.** Each main-idea option set has: one option **broader**
than the key (true in spirit but too general, or about the whole topic rather than this text), one **narrower** option
(one real detail or one paragraph), and one **central misreading** (about the main subject, but wrong about what
happens or what the writer claims). All four are on topic. The key is the one that covers the whole text at the right
level. Do not make the key the longest or the most hedged option.

**R4. Options in one frame.** Within an item, all four options have the same grammatical shape and talk about the
same kind of thing, and they differ along the point the question asks about, not along tone or style. No option is
the only one with a hedge (may, might, some, partly, probably), an absolute (all, always, only, never, completely),
a contrast word (but, although, while), a semicolon or dash, or a number. If the key has such a feature, give it to
at least one distractor too.

**R5. No length tell.** Length ratio within an item at most 1.5 (longest option / shortest, in characters). In your
12 items the key may be the uniquely longest option at most 3 times and the uniquely shortest at most 3 times.
Fix by lengthening a distractor, never by making the key vague.

**R6. No item answers another.** Questions on one passage ask about different sentences or paragraphs. No option of
one item may state or rule out the answer to another item on the same passage. The main-idea key's wording must not
reappear in another item's options. No two keys in your form share a four-word run.

**R7. Part 1 is easy but honest.** One question on a 60-90 word text is easy to make guessable. The distractors must
be things the text could plausibly have said (a different day, a different person, a different reason), each ruled
out by a line in the text.

**R8. Vocabulary items.** The tested word appears exactly once in the text. Pick a word an English learner at that
part's level may not know but can work out. The four options are short (one to four words), similar in frequency,
and each is a real meaning of the tested word or a near synonym of one; exactly one fits. Never make the key the only
everyday meaning.

**R9. NOT/EXCEPT items.** The three stated options are spread through the text (not three neighbouring phrases), and
the key is something the topic makes believable. The key is never the only option that is false in the real world.

## 6. Output

Write `itep-reading-v1-work/items/<X>.json` (path in your assignment), one JSON object:

```json
{
  "author": "X",
  "sets": [
    {
      "set_id": "ITR1-X-P1A",
      "part": 1,
      "genre": "school notice",
      "title": "short title (not shown to students)",
      "passage": "the text; paragraphs separated by a blank line (\\n\\n)",
      "names": ["every invented person or place name"],
      "other_caps": ["Monday", "English"],
      "items": [
        {
          "qid": "ITR1-X-P1A-1",
          "kind": "detail",
          "difficulty": "easy",
          "prompt": "...",
          "choices": ["...", "...", "...", "..."],
          "correct_answer": "exactly one of the choices",
          "why": "verbatim text substring supporting the key",
          "why2": "inference items only: a second verbatim substring",
          "explanation": "\"<key text>\" is correct: <reason quoting the text>",
          "distractor_rationales": [
            {"choice": "<distractor text>", "lure": "broader | narrower | central misreading | word lure | contradicted | other meaning | ...", "reason": "\"<distractor text>\" <why it is wrong, quoting the text>"}
          ]
        }
      ]
    }
  ]
}
```

Sets in this order: `P1A`, `P1B`, `P2`, `P3`. qids are `<set_id>-1` ... `<set_id>-n` in question order. Exactly three
distractor rationales per item, each starting with its choice in double quotes. Any other quotation inside an
explanation or rationale must be verbatim text from the passage. Never name an answer letter ("choice B"). Put the
key anywhere in `choices`; letters are reshuffled for every student.

## 7. Before you hand in

Run the check script named in your assignment on your own file until it prints `PROBLEMS 0`. Then, for every item,
cover the text and do R3 honestly; then reread every distractor rationale and confirm it quotes a line that kills it.

Reply with: the four titles and subjects, the check script's summary lines, and the one or two items you are least
sure have exactly one defensible answer, with why. Do not claim `PROBLEMS 0` unless you ran the script and saw it.
