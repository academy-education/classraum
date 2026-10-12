# Author brief: grades 5-8 Spelling (48 items)

You are writing **48 original four-option multiple-choice spelling items** for
a grades 5-8 English language-usage diagnostic aligned to the Common Core ELA
Language standards ("spell grade-appropriate words correctly": L.5.2e,
L.6.2b, L.7.2b, L.8.2c). You write for **the typical student at each item's
target grade**.

Work only from your own knowledge. Do not search for, open, quote or imitate
any published test item from any testing company. No web. Do not open any file
in the repository other than this brief and your own output file. The only
commands you may run are the two helper commands described below; do not open
the script itself.

## The 48 items

12 per grade (5, 6, 7, 8). Ids `MLV4-S01` to `MLV4-S48`: S01-S12 grade 5,
S13-S24 grade 6, S25-S36 grade 7, S37-S48 grade 8. Within each grade the
twelve items follow this format order:
**word, sentence, word, word, sentence, word, word, sentence, word, word, sentence, word**
(so 8 "word" items and 4 "sentence" items per grade).

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
- Each trouble spot is **one single-letter edit**, and the "both errors"
  option has exactly both edits. The first letter never changes. The two
  trouble spots must not touch each other.
- **Each item's two edits have ASSIGNED TYPES** (table below). Choose a word
  at the right grade whose real student errors have exactly those two types.

#### The edit types

For these types **y counts as a vowel**; every other letter that is not
a, e, i, o, u or y is a consonant.

| type | the edit | example (do not use these words) |
|---|---|---|
| `DV` | drop one vowel | temperature -> temprature |
| `DD` | drop one letter of a doubled consonant pair | embarrass -> embarass |
| `DC` | drop a consonant that is not part of a doubled pair | government -> goverment |
| `AV` | add one vowel | athlete -> athelete |
| `AD` | add a consonant that doubles a single consonant | until -> untill |
| `AC` | add a consonant that does NOT make a doubled pair | exercise -> excercise |
| `XV` | change one vowel to another vowel, or swap two adjacent vowels | separate -> seperate; receive -> recieve |
| `XC` | change one consonant to another consonant, or swap two adjacent consonants | ecstasy -> ecstacy |

Rules that go with the types:
- **No edit may create or break a doubled vowel** (ee, oo, aa ...). So
  "committee -> committe" is not allowed (it breaks "ee"), but
  "committee -> commitee" is `DD` (it drops a t).
- `DV`, `DC`, `AV`, `AC` and the `X` types must not create or break a doubled
  consonant either (for example, dropping a vowel between two identical
  consonants would join them into a pair: not allowed).
- A swap of a vowel with a consonant ("le" -> "el") fits no type: not allowed.
- The order of the two types in the table does not matter (either trouble spot
  can be the first).
- Copy the two types into the item as `edit_types` exactly as listed.

#### Assigned types (word items)

The types were drawn by a seeded procedure; do not change them.

| id | types | id | types | id | types | id | types |
|---|---|---|---|---|---|---|---|
| S01 | AC + XV | S03 | AV + DC | S04 | XC + XV | S06 | XV + XV |
| S07 | AV + DC | S09 | AD + DV | S10 | XC + XV | S12 | DD + XC |
| S13 | AD + DV | S15 | DD + DV | S16 | XC + XV | S18 | AC + DV |
| S19 | AD + AV | S21 | DD + DV | S22 | XV + XV | S24 | AV + DV |
| S25 | AD + AV | S27 | XV + XV | S28 | AD + DD | S30 | DD + DV |
| S31 | AV + XC | S33 | AV + DD | S34 | AD + DV | S36 | AD + AV |
| S37 | XV + XV | S39 | DV + XV | S40 | AD + AV | S42 | AC + DC |
| S43 | DC + DD | S45 | AC + AV | S46 | DD + XV | S48 | XC + XV |

Both edits must be mistakes real students at the grade make. If the word you
first think of cannot carry its two types with real errors, choose a
different word at or above the grade; never force an unnatural error to fit a
type.

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
- **All four target words must be about equally hard, and all four at the
  item's grade.** A student must not be able to find the answer by spotting
  the one long or unusual word; every sentence should contain a word that
  looks like it could be the error.
- **Assigned key length.** Each sentence item has an assigned
  `key_length_rank`: rank the four sentences by character length (longest =
  1, shortest = 4); the key (the misspelled sentence) must sit at exactly its
  assigned rank, and all four sentence lengths must differ from each other by
  at least 3 characters. Copy the rank into the item. The ranks were drawn by
  a seeded shuffle; do not change them:

  | id | rank | id | rank | id | rank | id | rank |
  |---|---|---|---|---|---|---|---|
  | S02 | 2 | S14 | 4 | S26 | 3 | S38 | 3 |
  | S05 | 1 | S17 | 4 | S29 | 1 | S41 | 2 |
  | S08 | 1 | S20 | 3 | S32 | 4 | S44 | 2 |
  | S11 | 2 | S23 | 4 | S35 | 1 | S47 | 3 |

## Choosing words: the grade is the whole job

Earlier rounds got every key right. One round failed on difficulty
**entirely at grade 5**: its grade-5 words were *tomorrow*, *answer*,
*finally*, *beautiful* and *disappear*, which reviewers placed at grades 2-4.
The next round's grade-5 words (*altogether*, *weird*, *possibility*,
*cinnamon*, *glisten*, *omission*) were placed at grades 5-8 by an
independent screen, and that is the level to aim for. Grades 6-8 words such as
*environment*, *occasion*, *immediately*, *embarrassed*, *privilege*,
*hypothesis*, *maintenance*, *occurrence*, *irresistible* and *surveillance*
fit their grades. **Do not reuse any word named anywhere in this brief.**

- **Each word must be one that standard US graded spelling lists place AT or
  ABOVE the item's target grade, never below it.** Ask of every word: "on a
  graded spelling list, which grade is this word on?" If the honest answer is
  lower than the target grade, choose a harder word.
- **Grade 5 in particular:** no word from grade 2-4 lists (high-frequency
  words, everyday words a grade-3 or grade-4 student has already practised).
  Choose words from grade-5 lists and grade-5 content-area reading: longer
  words with a doubled consonant, an unstressed vowel, a suffix rule, a silent
  letter, an ie/ei, or a prefix meeting a root, that grade-5 students are
  still learning to spell. If in doubt between two words, choose the harder.
- **Grades 6-8:** commonly misspelled academic and general words, harder at
  each higher grade. Reviewers judged *rhythm* too easy for grade 8,
  *definitely* too easy for grade 7, *truly*, *especially* and *recommend* a
  grade below where they were placed, and the screen placed *deceive* and
  *ridiculous* at grade 6, below their grade-7 target.
- **Before freezing, an independent screen grades every tested word, with no
  item and no target grade shown.** A Spelling item whose word is graded below
  its target grade by both screeners is dropped. Choosing words at or above
  the grade is the only way to keep your items.
- Misspellings must be ones real students produce: a vowel in an unstressed
  syllable (schwa), a doubled or undoubled consonant, a suffix rule (dropping
  or keeping a final e, y to i, -able/-ible, -ance/-ence, -ant/-ent), ie/ei,
  a silent letter, a prefix meeting a root (dis- + s, mis- + s, un- + n), an
  extra or missing consonant in a cluster.
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
- A script checks across the whole batch whether any simple structural or
  letter feature of the options (length, number of vowels, consonants or
  doubled letters, which option sits between the others, alphabetical order,
  which option is most similar to the rest) picks out the correct answer more
  often than chance; a strand that shows such a pattern is not used. The
  assigned types take care of the counts. Do not aim for any other pattern;
  just choose real student errors.

## The two helper commands (run them; they save your items)

From the repository root (`cd /Users/andylee/Downloads/saas/classraum`):

    node scripts/study-bank/map-lu-v4.mjs spell <word> <word> ...

For every **correctly spelled tested word** (each "word" item's key, and all
four target words of a "sentence" item, using the correct spelling of the
misspelled one) the line must say `as a correct word: ok`. For every
**misspelling** it must say `as a misspelling: ok`. The macOS spellchecker
wrongly accepts some common misspellings (occurence, accomodate,
independant): those cannot be used, so pick a different error or word.
Run it on lowercase words only. Also make sure every other word in a
"sentence" item's four sentences is spelled correctly (run it on any you are
unsure of).

    node scripts/study-bank/map-lu-v4.mjs edit <key> <first-only> <second-only> <both> types=<T1>+<T2>

prints the type of each single edit and ends with `L-class: ok` when a "word"
item's three misspellings have exactly the assigned types (for example
`edit necessary neccessary necesary neccesary types=AD+DD`). Every "word" item
must end with `L-class: ok`.

## Every wrong option must be a mistake a real student makes

After you finish, a classroom teacher rates every wrong option "would a real
student at this grade pick this?". Anything rated no comes back once for a
rewrite, and an item whose rewrite is still rated no is dropped. The
"both errors" option must be pickable too: choose two trouble spots that the
same kind of student gets wrong together.

## File format

Write a JSON array of 48 objects to the path you are given:

```json
{
  "id": "MLV4-S01",
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
  "edit_types": ["AC", "XV"],            // "word" items only: copied from the table
  "targets": {"<sentence>": "<its target word as it appears>", ...},   // "sentence" items only, one per choice
  "misspelled_word": "...",              // "sentence" items only: the misspelled form, as it appears in the key
  "intended_word": "...",                // "sentence" items only: its correct spelling
  "key_length_rank": 4,                  // "sentence" items only: copied from the table above
  "student_error": {"<wrong option>": "the mistake", "...": "...", "...": "..."},
  "explanation": "why the key is right and each other option wrong"
}
```

When done, re-read every item as a student at its grade and as a strict
reviewer looking for (a) a second correct option (including any spelling a
dictionary accepts, British or otherwise), (b) a misspelling nobody would
write, (c) **a word that a graded spelling list puts below the target grade**
(check every grade-5 word twice), (d) for "sentence" items, any other
misspelling, one target word that obviously stands out, or a key at the wrong
length rank, (e) for "word" items, a missing `L-class: ok`. Fix what you find,
re-run the helpers on anything you changed, and at the end state which files
you opened and which commands you ran.
