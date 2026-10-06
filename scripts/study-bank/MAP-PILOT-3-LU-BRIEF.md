# Author brief: grades 5-7 Language Usage, Mechanics and Vocabulary (24 items)

You are writing **24 original four-option multiple-choice items** for a
grades 5-7 English language diagnostic aligned to the Common Core ELA
standards for grades 5-7 (Language L.5-7.1, L.5-7.2, L.5-7.4; Writing W.5-7.1c
/ 2c transitions and precise language). The test places a student in a
ten-point difficulty band on a 180-209 range; you are writing for **the
typical grade 5, 6 and 7 student**.

Work only from your own knowledge of those standards. Do not search for,
open, quote or imitate any published test item from any testing company.
Do not open any file in `scripts/study-bank/` or run anything there.

## The 24 items

| strand | n | bands |
|---|---|---|
| Capitalization | 4 | spread over the three bands |
| Spelling | 3 | one per band |
| Punctuation | 3 | one per band |
| Vocabulary in context | 6 | two per band |
| Parts of Speech | 3 | one per band |
| Phrases, Clauses, Agreement, Sentences | 3 | one per band |
| Writing: transitions or precise language | 2 | any two bands |

Bands: exactly **8 items at "RIT 180-189" (grade 5)**, **8 at "RIT 190-199"
(grade 6)**, **8 at "RIT 200-209" (grade 7)**.

## Difficulty: write one band harder than your instinct

Reviewers of earlier rounds judged about a quarter of items **easier** than
their stated grade, and almost none harder. So for each item, write what you
would first think of as the NEXT grade up, and label it at the lower grade.
- Spelling words must be grade-level words from a grade 5-7 content-area
  text (e.g. *rhythm* was judged too easy for grade 8, *definitely* too easy
  for grade 7). No words from grade 1-4 lists.
- Vocabulary words must be tier-2 academic words a grade 5-7 text uses, in a
  sentence where context genuinely decides the meaning.
- Grammar items test the grade's actual standard (e.g. grade 5 verb tense
  shifts and correlative conjunctions; grade 6 pronoun case and vague
  pronouns; grade 7 phrases and clauses, misplaced and dangling modifiers,
  simple/compound/complex sentences), not a lower grade's.

## Mechanics: the 2x2 grid (required)

Each Capitalization, Spelling and Punctuation item has **two error sites**,
and the four options are exactly: **neither error (the key), only the first
error, only the second error, both errors.** So every option shares each
site with two others, and no option is "in the middle" of the rest.
- Prompt: "Which sentence is capitalized correctly?" / "Which word is spelled
  correctly?" (or a sentence-completion version with one blank) / "Which
  sentence is punctuated correctly?"
- **Capitalization:** the four options are identical except for letter case.
  Each error is a real student mistake (generic word in a proper name left
  lowercase, a common noun or a season capitalized, a title word, a direction
  vs a region, a family title used as a name vs with a possessive).
- **Spelling:** one word, single word options; the two sites are two
  separate trouble spots in that word (a doubled consonant and a vowel in an
  unstressed syllable, say). Every misspelling is 1-2 letter edits from the
  correct word, keeps the first letter, is NOT itself a real English word,
  and is a misspelling students actually produce.
- **Punctuation:** the four options are identical except for punctuation
  marks (commas, apostrophes, quotation marks, semicolons, colons). Two sites,
  each a real grade 5-7 rule (comma after an introductory element, comma
  before a coordinating conjunction in a compound sentence, commas in a
  series, possessive apostrophe vs plural, comma with a direct address or
  yes/no, quotation punctuation, a semicolon joining two clauses).
- Each item's rule must be different from every other item's in its strand.

## Vocabulary in context: no dead options

Prompt: a short context (one to four sentences, in the `passage` field when
longer than one sentence) and "What does the word **X** most likely mean as it
is used in the sentence?" (or "...in paragraph 2?"). All four options are the
same part of speech and similar length, and **each is either a genuine
dictionary meaning of X or a meaning a student could plausibly read into that
sentence** (a multiple-meaning word is ideal). Nothing a student would dismiss
without reading the context. Do not let the key repeat a word from the context
sentence (an earlier key "based on good reasoning" echoed "your reasoning is
sound" and was flagged).

## Usage: one dimension only

- **Parts of Speech** and **Phrases/Clauses/Agreement/Sentences**: the four
  options vary in **exactly one** dimension, which you declare in
  `varied_dimension` (e.g. "pronoun case", "verb tense", "subject-verb
  number", "placement of the modifier"). Everything else is identical.
- Every option is a form a real grade 5-7 student writes. No forms no one
  would choose (an earlier item offered "mine" in "to Mia and ___": dead).
- An "Which sentence has an error" item is allowed, but the three correct
  sentences must each look like a plausible error.
- **Writing:** a short 3-5 sentence numbered paragraph and "Which transition
  best completes sentence N?" or "Which word most precisely ...?". Four options
  of one kind; exactly one fits the logic; each other one a mistake a student
  makes (e.g. a contrast word where a sentence already contains "but").

## Every wrong option names its mistake

For each distractor give a `student_error`: the specific misunderstanding
that produces it, in one line. If you cannot name a real one, replace the
option.

## General rules

- Original content only: invented names, everyday school-age topics, no
  world-knowledge shortcuts.
- One correct answer, defensible from the item alone.
- The key is not systematically the longest or shortest option.
- Vary the key's position A-D; no letter three times in a row.
- Readability: any sentence of 15+ words should read at grade 4-8 level.

## File format

Write a JSON array of 24 objects to the path you are given:

```json
{
  "id": "MAPP3-LU-01",
  "family": "map",
  "map_subject": "language_usage",           // "reading" for vocabulary items
  "map_area": "Language: Understand, Edit for Mechanics",
  "map_strand": "Capitalization",            // Capitalization | Spelling | Punctuation | Vocabulary | Parts of Speech | Phrases, Clauses, Agreement, Sentences | Plan, Organize; Create Cohesion, Use Transitions | Establish and Maintain Style; Use Precise Language
  "stratum": "mechanics",                    // mechanics | vocab | usage
  "target_band": "RIT 190-199",
  "grade_target": 6,
  "passage": null,                           // or the context / numbered paragraph
  "prompt": "Which sentence is capitalized correctly?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",                   // exactly one of the choices
  "explanation": "why the key is right and each distractor wrong",
  "student_error": {"<distractor text>": "the mistake that produces it", "...": "...", "...": "..."},
  "difficulty": "medium",
  "cap_rule": "...",                         // Capitalization only, distinct per item
  "spelling_polarity": "correct", "spelling_pattern": "...", "intended_word": "...",   // Spelling only
  "punct_rule": "...",                       // Punctuation only, distinct per item
  "varied_dimension": "..."                  // Parts of Speech / Phrases... only
}
```

Ids `MAPP3-LU-01` to `MAPP3-LU-24`. Keep the `map_area` values:
- Mechanics: "Language: Understand, Edit for Mechanics"
- Grammar: "Language: Understand, Edit for Grammar, Usage"
- Writing: "Writing: Write, Revise Texts for Purpose and Audience"
- Vocabulary: "Vocabulary"

When done, re-read every item as a grade 6 student would, and as a strict
reviewer looking for (a) a second defensible answer, (b) an option nobody
would pick, (c) an item easier than its label. Fix what you find. At the end,
state whether you opened any file other than this brief and your own output.
