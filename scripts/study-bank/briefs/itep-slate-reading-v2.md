# Author brief: iTEP SLATE-style Reading, v2 (each author: 5-6 texts, 18-22 items)

> Status: frozen at the commit that records its sha256 in `itep-reading-v2-work/MANIFEST.json`, before any passage
> exists. Authors receive THIS file and their own `itep-reading-v2-work/authors/<X>.md` only. Never the blueprint,
> the prereg, any pending file, any other author's file, any reference PDF, or any published test.

You are writing **practice Reading texts and questions** for an English proficiency test taken by **middle- and
high-school students learning English as a second language** (ages about 11-18, CEFR A2 to C1). Real students will
take it. Three independent reviewers will then check every item; **if any one of them finds a second defensible
answer, an unsupported key, or a key you can pick without reading, the whole passage and all its questions are
thrown out.** A Part 3 passage has six questions, so one weak question loses all six. Quality over speed.

Work only from your own knowledge. Do not search for, open, quote, adapt or imitate any published reading passage or
test item from any testing company (iTEP, TOEFL Junior, Cambridge, SLEP, SSAT, ISEE or any other). No web. Open only
this brief, your assignment file, the two reference lists named in it, the check script named in it, and your own
output file. No database, no git, no npm/jest.

## 0. The one principle behind every shape rule in this brief

**Reviewers read all your items together, and all the other authors' items too.** If any property of the options
(length, breadth, number of parts, a hedge, the first word, words copied from the text, the kind of mistake each
distractor makes) is ALWAYS or NEVER true of the key, a student who has seen a few items can pick keys without
reading. The previous version of this brief required every main-idea set to contain one over-general option; that
option was then never the key, all three reviewers spotted it, and every Part 3 passage was thrown out.

So this brief never requires or forbids a property of the key. Instead your assignment file gives **each item its own
shape**, drawn at random so that every property appears on the key at about its natural rate: sometimes the key is
the broadest option and sometimes a distractor is broader; sometimes the key is the longest option and sometimes the
shortest. **Follow the per-item shape in your assignment exactly**, even when it feels unusual. It is how the batch
stays unguessable as a whole.

## 1. The texts

| part | texts | words | questions | level (CEFR) | difficulty label |
|---|---|---|---|---|---|
| Part 1: Short Text | a separate short text with **1 question** | 55-95 | 1 | A2-B1 | `easy` |
| Part 2: Intermediate Passage | one passage | 180-240 | 4 | B1 | `medium` |
| Part 3: Advanced Passage | one passage | 450-560 | 6 | B2-C1 | `medium` for main-idea and detail, `hard` otherwise |

Your assignment file says how many texts of each part you write, and fixes each text's genre, the question kinds
and their order, and each item's shape. Every question has **four options** and exactly one correct answer.

**Part 1 texts** are everyday short texts a teenager meets: a school notice, a sign or poster, a short message or
email, a note, an advertisement, a diary entry, a postcard. Use plain sentences (no tables, no bullet lists, no
headings inside the text; a one-line greeting and sign-off are fine in a message). Part 1 questions mostly test
literal meaning.

**Parts 2 and 3** are connected prose: a story, a first-person account, a short biography of an invented person, or
an informational passage on history, science or technology, as assigned. Paragraphs are separated by a blank line.
A Part 3 passage has an idea worth asking about (a change, a problem and its answer, a surprising result, a
disagreement), not just a list of facts. Your two Part 3 passages must have different shapes of idea.

## 2. Language level (this is a test for English learners, not native speakers)

- Part 1: high-frequency words (CEFR A2-B1), short sentences (average 15 words or fewer), no idioms.
- Part 2: B1 vocabulary, average sentence 18 words or fewer, at most one idiom, and only if the context makes it clear.
- Part 3: B2-C1 vocabulary is fine; average sentence 24 words or fewer. A few less common words are allowed when the
  context explains them.
- **Options use words no harder than the passage.** An option is never the only one with a rare word, and never the
  only one with all simple words.
- Natural, correct English. No slang that dates quickly. Not childish, not preachy.

## 3. Content rules

- **Fresh topics.** Check every subject against `existing-passages.txt` (the opening of every passage already in the
  bank). Same subject, same central object or same situation as any of them = choose another. Your own texts have
  different subjects from each other.
- **Names.** Invent every person's name and every place name, and list them in the set's `names` field. Use only the
  initial letters your assignment gives you, never reuse a name across your texts, and never use a name that appears
  in `existing-names.json`. Every capitalised word in the middle of a sentence must be listed in `names` or in
  `other_caps` (days, months, languages, real countries, school subjects).
- **History:** invented towns and people in a plausible past. Never attach invented events to a real named place or a
  real person.
- **Science and technology:** real science only, stated carefully; hedge numbers ("about", "roughly"). If you are not
  sure a fact is true, leave it out. A false science passage is worse than a dull one.
- **Story logic:** check line by line who knows what and when, what each person can see, numbers, days and times.
  A reviewer will look for any two statements that cannot both be true.
- **People's gender.** Options, keys and explanations call a person "he" or "she" only when the text does. In a
  first-person text whose writer's gender is never stated, say "the writer" (never "her" or "his"). The check script
  flags a he/she/him/her/his in an option when the text has none.
- **At most one negation word per paragraph** (not, no, never, nothing, nor, none, neither, nobody, nowhere, cannot,
  n't). The check script enforces it.

## 4. Question kinds

Write the kinds your assignment gives each text, **in that order** (the order differs from text to text on purpose).
Prompts must be worded differently from each other; no prompt opening (first four words) may appear more than three
times in your file.

| kind | what it asks | how to build it |
|---|---|---|
| `main-idea` | what the text or passage is mainly about / the writer's main point / the problem the writer describes | see rule M below and the item's shape in your assignment |
| `detail` | a fact stated in the text ("According to the passage, ...") | the key **paraphrases** the line; distractors may reuse passage words in a wrong relation |
| `vocabulary` | what a word or short phrase in the text most nearly means | quote the word in the prompt, with its paragraph ("In paragraph 2, the word "..." is closest in meaning to"); see R8 |
| `not-except` | "Which of the following is NOT ...", "All of the following are ... EXCEPT" (capitals as shown) | three options are each stated in the text (quote a line for each); the key is as your assignment's shape says (contradicted by the text, or plainly outside what the text lists) |
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

**M. Main-idea items: build the cast your assignment gives the item.** Each main-idea item in your assignment has
a `breadth` and a `cast`:

- `breadth: key-broadest` — the key is the widest of the four options. The three distractors are each narrower or
  equally wide but wrong (one paragraph's detail, a misreading of what happens, a minor point treated as the main
  one). No distractor is wider than the key.
- `breadth: distractor-broader` — one distractor is wider than the key. That wider option must be **wrong, not just
  too general**: it claims something the text contradicts, or it is about a subject the text does not cover. A wider
  option that is a fair generalisation of the text is a second answer. The key covers the whole text at its own
  level.
- `breadth: all-level` — all four options are whole-text summaries at the same width; three of them get the
  text's main change, result or claim wrong.

The `cast` lists what each distractor is (for example `misreading, detail, two-part`); `two-part` means a
two-part summary ("how X happened and why Y followed") with one part wrong. `key form: two-part` means the key itself
is a two-part summary; `one-part` means it is not. When the key is two-part, at least one distractor is two-part too,
so the number of parts never marks the key. All four options are about the text's subject. Never make the key the
most hedged option.

**R4. Options in one frame.** Within an item, all four options have the same grammatical shape and talk about the
same kind of thing, and they differ along the point the question asks about, not along tone or style. No option is
the only one with a hedge (may, might, some, partly, probably), an absolute (all, always, only, never, completely),
a contrast word (but, although, while), a semicolon or dash, or a number. If the key has such a feature, give it to
at least one distractor too.

**R5. Key length as assigned.** Each non-vocabulary item has a `key length` in your assignment: `longest` (the key
is the longest option), `shortest` (the key is the shortest option), or `middle` (the key is neither the longest nor
the shortest). The check script enforces it. In every item the length ratio (longest option / shortest, in
characters) is at most 1.5. Adjust lengths by changing distractors or by adding real content, never by making the
key vague or padding it with empty words.

**R6. No item answers another.** Questions on one passage ask about different sentences or paragraphs. No option of
one item may state or rule out the answer to another item on the same passage. The main-idea key's wording must not
reappear in another item's options. No two keys in your file share a four-word run.

**R7. Part 1 is easy but honest.** One question on a 60-90 word text is easy to make guessable. The distractors must
be things the text could plausibly have said (a different day, a different person, a different reason), each ruled
out by a line in the text.

**R8. Vocabulary items.** The tested word appears exactly once in the text. Pick a word an English learner at that
part's level may not know but can work out. The four options are short (one to four words), similar in frequency,
and each is a real meaning of the tested word or a near synonym of one; exactly one fits. **The three wrong senses
come from at least two different areas of life** (for "judge": "estimate" (key), "rule on a case" (law), "referee"
(sport), "criticise" (people): never three courtroom senses, which would make the key the odd one out). Never make
the key the only everyday meaning.

**R9. NOT/EXCEPT items.** The three stated options are spread through the text (not three neighbouring phrases), and
the key is something the topic makes believable. The key is never the only option that is false in the real world.

**R10. No pattern across your items.** Before you hand in, lay all your items side by side and ask: if a student had
already seen my other items, could the pattern pick this key? Look at what the key is in each item (the longest? the
widest? the one with words copied from the text? the one with "and"? the one that starts with the same word as the
others? the most positive?). If any such property is true of nearly all your keys or of none of them, change items
until it is mixed. Also vary your prompt wording and the way each distractor goes wrong; do not reuse one recipe.

## 6. Output

Write the output file named in your assignment, one JSON object:

```json
{
  "author": "X",
  "sets": [
    {
      "set_id": "ITR2-X-P1A",
      "part": 1,
      "genre": "school notice",
      "title": "short title (not shown to students)",
      "passage": "the text; paragraphs separated by a blank line (\\n\\n)",
      "names": ["every invented person or place name"],
      "other_caps": ["Monday", "English"],
      "items": [
        {
          "qid": "ITR2-X-P1A-1",
          "kind": "detail",
          "difficulty": "easy",
          "prompt": "...",
          "choices": ["...", "...", "...", "..."],
          "correct_answer": "exactly one of the choices",
          "why": "verbatim text substring supporting the key",
          "why2": "inference items only: a second verbatim substring",
          "explanation": "\"<key text>\" is correct: <reason quoting the text>",
          "distractor_rationales": [
            {"choice": "<distractor text>", "lure": "broader | detail | misreading | two-part | word lure | contradicted | other meaning | ...", "reason": "\"<distractor text>\" <why it is wrong, quoting the text>"}
          ]
        }
      ]
    }
  ]
}
```

Sets in the order your assignment lists them. qids are `<set_id>-1` ... `<set_id>-n` in question order. Exactly three
distractor rationales per item, each starting with its choice in double quotes. Any other quotation inside an
explanation or rationale must be verbatim text from the passage. Never name an answer letter ("choice B"). Put the
key anywhere in `choices`; letters are reshuffled for every student.

## 7. Before you hand in

Run the check script named in your assignment on your own file until it prints `PROBLEMS 0`. Then, for every item,
cover the text and do R3 honestly; reread every distractor rationale and confirm it quotes a line that kills it; and
do R10 across all your items.

Reply with: your titles and subjects, the check script's summary lines, and the one or two items you are least sure
have exactly one defensible answer, with why. Do not claim `PROBLEMS 0` unless you ran the script and saw it.
