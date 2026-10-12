# Author brief: grades 5-8 Spelling (32 items)

You are writing **32 original four-option multiple-choice spelling items** for
a grades 5-8 English language-usage diagnostic aligned to the Common Core ELA
Language standards ("spell grade-appropriate words correctly": L.5.2e,
L.6.2b, L.7.2b, L.8.2c). You write for **the typical student at each item's
target grade**.

Work only from your own knowledge. Do not search for, open, quote or imitate
any published test item from any testing company. No web. Do not open any file
in the repository other than this brief and your own output file. The one
command you may run is the dictionary oracle described below; do not open the
script itself.

## The 32 items

8 per grade (5, 6, 7, 8). Ids `MLV2-S01` to `MLV2-S32`: S01-S08 grade 5,
S09-S16 grade 6, S17-S24 grade 7, S25-S32 grade 8. Within each grade the
eight items follow this format order:
**word, sentence, word, word, sentence, word, word, sentence**
(so 5 "word" items and 3 "sentence" items per grade).

### Format "word": the correctly spelled word completes a sentence

- `prompt`: `"Which word correctly completes the sentence?\n\n<one sentence with a blank written as ____>"`.
  The blank is never the first word of the sentence. The sentence is plain,
  8-18 words, about grade 4-8 reading level, and its meaning makes the
  intended word clear (the item tests spelling, not vocabulary).
- `choices`: four **lowercase single words**: the correct spelling and three
  misspellings that form a **2x2 grid** over two separate trouble spots in the
  word:
  - neither error (the correct word, the key)
  - only the first error
  - only the second error
  - both errors
- Each trouble spot is **one single-letter edit**: one letter added, one
  dropped, one changed, or two adjacent letters swapped. The "both errors"
  option has exactly both edits. The first letter never changes.
- Example of the shape (do not use this word): `necessary` / `neccessary` /
  `necesary` / `neccesary`.

### Format "sentence": which sentence has a misspelled word

- `prompt`: `"Which sentence has a spelling error?"`
- `choices`: four different sentences, each 8-18 words, plain, about grade
  4-8 reading level. **Each sentence contains one target word**: a
  grade-appropriate word students commonly misspell. In exactly one sentence
  (the key) the target word is misspelled (1-2 letter edits, same first
  letter); in the other three the target word is spelled correctly.
- Every other word in all four sentences must be a common, correctly spelled
  word. Use common first names that a spellchecker knows (Maya, Leo, Sam, Ana,
  Ben, Mia, Omar, Lily, Jack, Nora...).
- The four target words should look about equally "hard", so a student cannot
  find the answer by spotting the one long or unusual word.

## Choosing words

- **Grade-appropriate and commonly misspelled at that grade**, from
  content-area or general academic reading (science, social studies, school
  life). Earlier reviewers judged *rhythm* too easy for grade 8 and
  *definitely* too easy for grade 7: pick words whose spelling is genuinely
  hard at the target grade, and harder words at higher grades.
- Misspellings must be ones real students produce: a vowel in an unstressed
  syllable (schwa), a doubled or undoubled consonant, a suffix rule (dropping
  or keeping a final e, y to i, -able/-ible, -ance/-ence, -ant/-ent), ie/ei,
  a silent letter, a prefix meeting a root (dis- + s, mis- + s, un- + n).
  Give each wrong option a `student_error`: the specific mistake that produces
  it, in one line. For a "sentence" item, the wrong options are the three
  correctly spelled sentences: give each a `student_error` saying why a
  student might wrongly think that sentence has the error (for example, its
  target word looks wrong although it is right).
- **Every misspelling must be a non-word**: not an English word in any
  variety, and not a word with another meaning ("calender", "dairy" for
  "diary", "loose" for "lose" are all forbidden). No homophone or
  wrong-word items.
- **US spelling only, and no word that has a regional variant.** Do not use
  any word spelled differently in British, Canadian or Australian English, or
  that has two accepted spellings: color/colour, center/centre, -ize/-ise
  (organize), -yze/-yse (analyze), traveled/travelled and every other
  single-l / double-l pair, judgment/judgement, gray/grey, defense/defence,
  catalog/catalogue, program/programme, fulfill, enroll, skillful, aging,
  likable, jewelry, theater, and so on. If in doubt, choose another word.
- Each tested word appears in only one item, and never inside another item's
  sentences.
- **Vary** across the batch: which trouble spots, where they sit in the word
  (start, middle, end), and the kind of edit (letter added, dropped, changed,
  swapped). A script checks across the whole batch whether any simple
  structural feature of the options (length, number of doubled letters or
  vowels, which option sits between the others in length, which option is
  most similar to the rest) picks out the correct answer more often than
  chance; a strand that shows such a pattern is not used. Do not aim for any
  per-item pattern. Just vary the kinds of errors naturally.

## The dictionary oracle (run it, it saves your items)

From the repository root (`cd /Users/andylee/Downloads/saas/classraum`):

    node scripts/study-bank/map-lu-v2.mjs spell <word> <word> ...

For every **correctly spelled tested word** (each "word" item's key, and all
four target words of a "sentence" item, using the correct spelling of the
misspelled one) the line must say `as a correct word: ok`. For every
**misspelling** it must say `as a misspelling: ok`. The macOS spellchecker
wrongly accepts some common misspellings (occurence, accomodate,
independant): those cannot be used, so pick a different error or word.
Check every word before you write the file. Run the oracle on lowercase
words only.

## Every wrong option must be a mistake a real student makes

After you finish, a classroom teacher rates every wrong option "would a real
student at this grade pick this?". Anything rated no comes back once for a
rewrite, and an item whose rewrite is still rated no is dropped. The
"both errors" option must be pickable too: choose two trouble spots that the
same kind of student gets wrong together.

## File format

Write a JSON array of 32 objects to the path you are given:

```json
{
  "id": "MLV2-S01",
  "family": "map",
  "map_subject": "language_usage",
  "map_area": "Language: Understand, Edit for Mechanics",
  "map_strand": "Spelling",
  "grade_target": 5,
  "ccss": "L.5.2e",                      // L.5.2e | L.6.2b | L.7.2b | L.8.2c
  "spelling_format": "word",             // "word" | "sentence"
  "prompt": "...",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",               // exactly one of the choices
  "spelling_pattern": "what the two trouble spots test (word) / what the misspelling tests (sentence)",
  "error_sites": ["site 1", "site 2"],   // "word" items only
  "targets": {"<sentence>": "<its target word as it appears>", ...},   // "sentence" items only, one per choice
  "misspelled_word": "...",              // "sentence" items only: the misspelled form, as it appears in the key
  "intended_word": "...",                // "sentence" items only: its correct spelling
  "student_error": {"<wrong option>": "the mistake", "...": "...", "...": "..."},
  "explanation": "why the key is right and each other option wrong"
}
```

When done, re-read every item as a student at its grade and as a strict
reviewer looking for (a) a second correct option (including any spelling a
dictionary accepts, British or otherwise), (b) a misspelling nobody would
write, (c) a word too easy or too hard for its grade, (d) for "sentence"
items, any other misspelling or one target word that obviously stands out.
Fix what you find, re-run the oracle on anything you changed, and at the end
state which files you opened and which commands you ran.
