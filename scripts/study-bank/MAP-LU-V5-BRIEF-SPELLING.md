# Author brief: grades 5-8 Spelling, sentence format (map-lu-v5)

You are writing **original four-option multiple-choice spelling items** for a grades 5-8 English
language-usage diagnostic aligned to the Common Core ELA Language standards ("spell grade-appropriate
words correctly": L.5.2e, L.6.2b, L.7.2b, L.8.2c). You write for **the typical student at each item's
target grade**. Your prompt tells you which 24 items are yours.

Work only from your own knowledge. Do not search for, open, quote or imitate any published test item
from any testing company. No web. Do not open any file in the repository other than this brief and your
own output file. The only commands you may run are the three helper commands described below; do not
open the script itself.

## The 48 items (two authors, 24 each)

Ids `MLV5-S01` to `MLV5-S48`: S01-S12 grade 5, S13-S24 grade 6, S25-S36 grade 7, S37-S48 grade 8.
**Author 1 writes S01-S24 (grades 5 and 6). Author 2 writes S25-S48 (grades 7 and 8).**
Every item is the same format.

### The format: which sentence has a misspelled word

- `prompt`: exactly `"Which sentence has a spelling error?"`
- `choices`: four different sentences, each 8-18 words, plain, about grade 4-8 reading level.
  **Each sentence contains one target word**: a grade-appropriate word students commonly misspell. In
  exactly one sentence (the key) the target word is misspelled (1-2 letter edits, same first letter); in
  the other three the target word is spelled correctly.
- Every other word in all four sentences must be a common, correctly spelled word. Use common first names
  that a spellchecker knows (Maya, Leo, Sam, Ana, Ben, Mia, Omar, Lily, Jack, Nora...).
- **All four target words must be about equally hard, and all four at the item's grade.** A student must
  not be able to find the answer by spotting the one long or unusual word; every sentence should contain a
  word that looks like it could be the error.
- **Assigned key length.** Rank the four sentences by character length (longest = 1, shortest = 4); the
  key (the misspelled sentence) must sit at exactly the rank assigned to its id, and all four sentence
  lengths must differ from each other by at least 3 characters. Copy the rank into `key_length_rank`. The
  ranks were drawn by a seeded shuffle; do not change them.

Author 1:

| id | rank | id | rank | id | rank | id | rank |
|---|---|---|---|---|---|---|---|
| S01 | 2 | S02 | 1 | S03 | 3 | S04 | 4 |
| S05 | 2 | S06 | 3 | S07 | 4 | S08 | 4 |
| S09 | 4 | S10 | 3 | S11 | 2 | S12 | 1 |
| S13 | 1 | S14 | 2 | S15 | 3 | S16 | 4 |
| S17 | 4 | S18 | 2 | S19 | 1 | S20 | 2 |
| S21 | 1 | S22 | 3 | S23 | 4 | S24 | 3 |

Author 2:

| id | rank | id | rank | id | rank | id | rank |
|---|---|---|---|---|---|---|---|
| S25 | 1 | S26 | 4 | S27 | 2 | S28 | 3 |
| S29 | 4 | S30 | 1 | S31 | 3 | S32 | 3 |
| S33 | 1 | S34 | 4 | S35 | 1 | S36 | 2 |
| S37 | 1 | S38 | 4 | S39 | 3 | S40 | 2 |
| S41 | 2 | S42 | 1 | S43 | 3 | S44 | 2 |
| S45 | 2 | S46 | 4 | S47 | 3 | S48 | 1 |

## Choosing words: the grade is the whole job

Earlier rounds got every key right and failed on difficulty. What the reviewers placed too low:
- grade 5: *tomorrow*, *answer*, *finally*, *beautiful*, *disappear* (placed at grades 2-4), *height*
- grade 6: *professional*; grade 7: *comparison*, *accidentally*, *definitely*, *deceive*, *ridiculous*
- grade 8: *veterinarian*, *hazardous*, *mortgage*, *rhythm*

What fit: grade-5 words like *altogether*, *weird*, *possibility*, *cinnamon*, *glisten*, *omission*;
grades 6-8 words like *environment*, *occasion*, *immediately*, *embarrassed*, *privilege*, *hypothesis*,
*maintenance*, *irresistible*, *surveillance*. **Do not reuse any word named anywhere in this brief.**

- **Each target word must be one that standard US graded spelling lists place AT or ABOVE the item's
  target grade, never below it.** Ask of every word: "on a graded spelling list, which grade is this word
  on?" If the honest answer is lower than the target grade, choose a harder word. **If in doubt between two
  words, choose the harder.**
- **Grade 5:** no word from grade 2-4 lists. Choose words from grade-5 lists and grade-5 content-area
  reading: longer words with a doubled consonant, an unstressed vowel, a suffix rule, a silent letter, an
  ie/ei, or a prefix meeting a root, that grade-5 students are still learning to spell.
- **Grades 6-8:** commonly misspelled academic and general words, clearly harder at each higher grade.
  **Grade 8 words must be genuinely hard** for an eighth grader: words that adults still misspell, from
  high-school-level lists (the grade-8 examples above that fell short were judged grade 6-7).
- **New in this round, and strict: before freezing, two independent screeners each grade every target
  word with no item and no grade shown. If EITHER screener places the misspelled sentence's word below the
  item's target grade, the item is dropped.** The three correctly spelled target words should be just as
  hard. Choosing words at or above the grade is the only way to keep your items.
- Misspellings must be ones real students produce: a vowel in an unstressed syllable (schwa), a doubled or
  undoubled consonant, a suffix rule (dropping or keeping a final e, y to i, -able/-ible, -ance/-ence,
  -ant/-ent), ie/ei, a silent letter, a prefix meeting a root (dis- + s, mis- + s, un- + n), an extra or
  missing consonant in a cluster.
- **Every misspelling must be a non-word**: not an English word in any variety, and not a word with
  another meaning ("calender", "dairy" for "diary", "loose" for "lose" are all forbidden). No homophone or
  wrong-word items.
- **US spelling only, and no word that has a regional variant** (color/colour, center/centre, -ize/-ise,
  -yze/-yse, traveled/travelled and every single-l / double-l pair, judgment/judgement, gray/grey,
  defense/defence, catalog/catalogue, program/programme, fulfill, enroll, skillful, aging, likable,
  jewelry, theater...). If in doubt, choose another word.
- Each tested word appears in only one item, and never inside another item's sentences (the other author
  writes different grades; check within your own 24).
- A script checks across the whole batch whether any simple structural or letter feature of the options
  (length, number of words, letters, vowels, consonants or doubled letters, marks, which option sits
  between the others, alphabetical order, which option is most similar to the rest) picks out the correct
  answer more often than chance; a batch that shows such a pattern is not used. The assigned ranks take
  care of length. Do not aim for any other pattern; just write natural sentences.

## Every wrong option must be one a real student could pick

A classroom teacher rates each wrong option: "would a real student at this grade think THIS sentence has
the error?" **In this round, if either of two teachers rates any wrong option "no", the item is dropped
(there is no rewrite).** So each correctly spelled target word must look like it could be wrong: a word
with a double letter, a schwa, a suffix or a silent letter that students often get wrong. Give each wrong
option a `student_error`: why a student might wrongly think that sentence has the error.

## The three helper commands (run them; they save your items)

From the repository root (`cd /Users/andylee/Downloads/saas/classraum`):

    node scripts/study-bank/map-lu-v5.mjs spell <word> <word> ...

For every **correctly spelled target word** (all four, using the correct spelling of the misspelled one)
the line must say `as a correct word: ok`. For every **misspelling** it must say `as a misspelling: ok`.
The macOS spellchecker wrongly accepts some common misspellings (occurence, accomodate, independant):
those cannot be used, so pick a different error or word. Run it on lowercase words only. Also check any
other word in your sentences you are unsure of.

    node scripts/study-bank/map-lu-v5.mjs itemchecks <your output file>

runs the exact item checks on your file (format, lengths and length rank, the dictionary guard, tested
words not repeated). **Every item must print `ok` before you finish.** Fix and re-run until it does.

## File format

Write a JSON array of your 24 objects to the path you are given:

```json
{
  "id": "MLV5-S01",
  "family": "map",
  "map_subject": "language_usage",
  "map_area": "Language: Understand, Edit for Mechanics",
  "map_strand": "Spelling",
  "grade_target": 5,
  "ccss": "L.5.2e",                      // L.5.2e | L.6.2b | L.7.2b | L.8.2c
  "spelling_format": "sentence",
  "prompt": "Which sentence has a spelling error?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",               // exactly one of the choices: the misspelled sentence
  "spelling_pattern": "what the misspelling tests",
  "targets": {"<sentence>": "<its target word as it appears>", "...": "...", "...": "...", "...": "..."},
  "misspelled_word": "...",              // the misspelled form, as it appears in the key
  "intended_word": "...",                // its correct spelling
  "key_length_rank": 1,                  // copied from your table
  "student_error": {"<wrong option>": "why a student might think it has the error", "...": "...", "...": "..."},
  "explanation": "why the key is right and each other option wrong"
}
```

When done, re-read every item as a student at its grade and as a strict reviewer looking for (a) a second
sentence with an error, or a spelling a dictionary accepts (British or otherwise), (b) a misspelling nobody
would write, (c) **a target word that a graded spelling list puts below the target grade** (check every
word twice), (d) one target word that obviously stands out, (e) a key at the wrong length rank. Fix what
you find, re-run `itemchecks`, and at the end state which files you opened and which commands you ran.
