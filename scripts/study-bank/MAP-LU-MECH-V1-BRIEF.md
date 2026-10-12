# Author brief: grades 5-8 Language Usage, Mechanics and Grammar (28 items)

You are writing **28 original four-option multiple-choice items** for a
grades 5-8 English language-usage diagnostic aligned to the Common Core ELA
Language standards for grades 5-8 (L.5.1-L.8.1 grammar and usage; L.5.2-L.8.2
capitalization and punctuation). You are writing for **the typical student
at each item's target grade**, at the harder end of that grade's standard.

Work only from your own knowledge of those standards. Do not search for,
open, quote or imitate any published test item from any testing company. Do
not open any file in the repository other than this brief and your own
output file. No web.

## The 28 items

| strand | n | grade targets |
|---|---|---|
| Capitalization | 9 | two each at grades 5, 7, 8; three at grade 6 |
| Punctuation | 9 | two each at grades 5, 6, 8; three at grade 7 |
| Grammar and Usage | 10 | three each at grades 5 and 8; two each at grades 6 and 7 |

Grammar and Usage items are split: **5 "Parts of Speech"** (verb tense and
form, pronoun case and type, adjective/adverb, conjunctions and
prepositions) and **5 "Phrases, Clauses, Agreement, Sentences"**
(subject-verb and pronoun-antecedent agreement, modifiers, sentence
structure, voice and mood).

## Every item is a 2x2 grid (required)

Each item has **two error sites**, and the four options are exactly:
**neither error (the key), only the first error, only the second error, both
errors.** Every option shares each site with exactly two others, so no option
sits "in the middle" of the rest. Everything other than the two sites is
**character-for-character identical** across the four options.

- Prompts: "Which sentence is capitalized correctly?" / "Which sentence is
  punctuated correctly?" / "Which sentence is written correctly?" (grammar).
  You may vary the wording slightly, but each option is a full sentence.
- **The "both errors" option must be pickable.** Choose two sites that the
  same kind of student gets wrong together (one misconception, or two very
  common slips), so a student who makes one mistake plausibly makes both.
- **Capitalization:** the four options are identical except for letter case.
  **One site must be an UNDER-capitalization error (a letter that should be
  capital is lowercase) and the other an OVER-capitalization error (a letter
  that should be lowercase is capital).** This keeps the correct sentence
  from being the one with the most or the fewest capitals. Rules to draw on
  (each item uses a different `cap_rule`): a generic word that is part of a
  proper name (Lake, Street, Company) vs the same word used generically; a
  season, subject or direction capitalized by mistake; a region (the
  Southwest) vs a direction (drove southwest); a family title used as a name
  vs after a possessive; a language or nationality adjective vs a school
  subject; titles of books, songs and articles (short words lowercase unless
  first); historical events, periods, documents and organizations; proper
  adjectives; the first word of a quoted full sentence vs a quoted fragment;
  brand names vs the product noun.
- **Punctuation:** the four options are identical except for punctuation
  marks. **At least one site must be a mark that is WRONGLY PRESENT or a
  WRONG MARK (substitution), not only missing marks,** so the correct
  sentence is not simply the one with the most or the fewest marks. Rules by
  grade: grade 5 commas after an introductory element, in a series of
  phrases, with yes/no, tag questions and direct address, and titles of works
  (L.5.2a-d); grade 6 commas, parentheses or dashes around nonrestrictive
  elements (L.6.2a); grade 7 a comma between coordinate adjectives and not
  between cumulative ones (L.7.2a), apostrophes in possessives; grade 8 a
  comma, ellipsis or dash for a pause or break, ellipsis for omission
  (L.8.2a-b), semicolons joining independent clauses. Each item uses a
  different `punct_rule`.
- **Grammar and Usage:** the four options are identical except at the two
  sites; each site is a word or short phrase. Both errors are clear errors in
  standard written English at the item's grade (e.g. grade 5: perfect tense
  and inappropriate tense shift, correlative conjunctions; grade 6: pronoun
  case, intensive pronouns, shifts in pronoun number or person; grade 7:
  misplaced and dangling modifiers, phrase vs clause; grade 8: verbals,
  active/passive voice shifts, verb mood). Declare the two sites in
  `varied_dimension` (e.g. "pronoun case; verb tense"). Each grammar item
  uses a different pair of dimensions.

## No disputable errors (an earlier round failed on these)

An error site must be wrong under **every** mainstream style guide a grade
5-8 teacher would use. Do NOT use:
- optional commas: after a short introductory phrase or clause, the serial
  (Oxford) comma, a comma before "too";
- who/whom where informal usage accepts either; singular "they"; split
  infinitives; a preposition at the end of a sentence; "data is";
- family words where the capitalization depends on whether the word is a
  name and the sentence leaves it open (an earlier key read "my uncle and
  Grandma"; both reviewers ruled that "my" governs both nouns);
- any spelling or word-choice change in a Capitalization or Punctuation item.

## Every wrong option must be a mistake a real student makes

Give each wrong option a `student_error`: the specific mistake that produces
it, in one line. If you cannot name a mistake real students at that grade
make, change the site. After you finish, a classroom teacher will rate every
wrong option "would a real student pick this?"; anything rated no comes back
once for a rewrite, and an item whose rewrite is still rated no is dropped.

## Difficulty: each item uses ITS OWN grade's standards, at the hard end

Reviewers of earlier rounds judged about a quarter of items **easier** than
their stated grade and almost none harder.
1. Anchor every item to a standard of its own target grade and put the code
   in `ccss` (e.g. "L.6.2a", "L.8.1b"). Never label a lower grade's rule at a
   higher grade (a direct-address comma is L.5.2c and may only appear at
   grade 5).
2. Within that standard, write the harder instance, the one a student only
   gets right on a full read: longer sentences where the site is separated
   from what decides it, the rule's less familiar case, a site that looks
   right at a glance.
3. Sentences use everyday school-age topics, invented names, no world
   knowledge needed. Any sentence of 15+ words should read at about grade
   4-8 level (not dense adult prose).

## General rules

- Original content only.
- One correct answer, defensible from the item alone.
- Vary which error types and which parts of the sentence carry the sites;
  do not build every item on the same skeleton. Different items should put
  the sites early, late, or far apart.
- Put the key in any position; the order is reshuffled later.

## File format

Write a JSON array of 28 objects to the path you are given:

```json
{
  "id": "MLM1-01",
  "family": "map",
  "map_subject": "language_usage",
  "map_area": "Language: Understand, Edit for Mechanics",
  "map_strand": "Capitalization",      // Capitalization | Punctuation | Parts of Speech | Phrases, Clauses, Agreement, Sentences
  "grade_target": 6,
  "ccss": "L.6.2",
  "prompt": "Which sentence is capitalized correctly?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",            // exactly one of the choices: the no-error sentence
  "error_sites": ["what site 1 is", "what site 2 is"],
  "student_error": {"<distractor text>": "the mistake that produces it", "...": "...", "...": "..."},
  "explanation": "why the key is right and each distractor wrong",
  "cap_rule": "...",                  // Capitalization only, distinct per item
  "punct_rule": "...",                // Punctuation only, distinct per item
  "varied_dimension": "..."           // Grammar items only, distinct per item
}
```

Ids `MLM1-01` to `MLM1-28`: 01-09 Capitalization, 10-18 Punctuation, 19-23
Parts of Speech, 24-28 Phrases, Clauses, Agreement, Sentences. `map_area`:
"Language: Understand, Edit for Mechanics" for Capitalization and
Punctuation; "Language: Understand, Edit for Grammar, Usage" for the rest.

When done, re-read every item as a student at its grade would, and as a
strict reviewer looking for (a) a second defensible answer, including under
a different style guide, (b) an option nobody would pick, (c) an item easier
than its grade or anchored to a lower grade's standard, (d) anything other
than the two sites that differs between options. Fix what you find. At the
end, state which files you opened.
