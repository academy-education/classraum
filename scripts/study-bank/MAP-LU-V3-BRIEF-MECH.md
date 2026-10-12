# Author brief: grades 5-8 Punctuation, Grammar and Usage, and grades 5-6 Capitalization (42 items)

You are writing **42 original four-option multiple-choice items** for a
grades 5-8 English language-usage diagnostic aligned to the Common Core ELA
Language standards (L.5.1-L.8.1 grammar and usage, L.5.3-L.8.3 language
knowledge; L.5.2-L.8.2 capitalization and punctuation). You write for **the
typical student at each item's target grade, at the harder end of that
grade's standard**.

Work only from your own knowledge of those standards. Do not search for,
open, quote or imitate any published test item from any testing company. Do
not open any file in the repository other than this brief and your own output
file. No web.

## The 42 items

| strand | n | grade targets | ids |
|---|---|---|---|
| Punctuation | 16 | 4 at each of grades 5, 6, 7, 8 | `MLV3-P01`-`P16` (P01-04 gr 5, P05-08 gr 6, P09-12 gr 7, P13-16 gr 8) |
| Grammar and Usage | 16 | 4 at each of grades 5, 6, 7, 8 | `MLV3-G01`-`G16`, same grade order |
| Capitalization | 10 | 5 at grade 5, 5 at grade 6 (**no grade 7 or 8**) | `MLV3-C01`-`C10` (C01-05 gr 5, C06-10 gr 6) |

Grammar and Usage items are split: at least 7 **"Parts of Speech"** (verb
tense and form, pronoun case and type, adjective/adverb, conjunctions and
prepositions) and at least 7 **"Phrases, Clauses, Agreement, Sentences"**
(subject-verb and pronoun-antecedent agreement, modifiers, sentence structure,
voice and mood). Spread both kinds across the grades.

## Every item is a 2x2 grid (required)

Each item has **two error sites**, and the four options are exactly:
**neither error (the key), only the first error, only the second error, both
errors.** Everything other than the two sites is **character-for-character
identical** across the four options.

- Prompts: "Which sentence is capitalized correctly?" / "Which sentence is
  punctuated correctly?" / "Which sentence is written correctly?" (grammar).
  Each option is one full sentence.
- **The "both errors" option must be pickable.** Choose two sites that the
  same kind of student gets wrong together (one misconception, or two very
  common slips).
- **Capitalization:** the four options are identical except for letter case.
- **Punctuation:** the four options are identical except for punctuation
  marks.
- **Grammar and Usage:** the options are identical except at the two sites;
  each site is a word or short phrase. Declare the two sites in
  `varied_dimension` (e.g. "pronoun case; verb tense"). Each grammar item
  uses a different pair of dimensions.
- A site may be any kind of error: something missing (a capital, a mark, a
  word ending), something wrongly present, or something wrong in place of the
  right thing (a substituted mark, a wrong form). **Vary the kinds freely
  across the batch.** A script checks across each strand whether any simple
  structural feature of the options (the number of capitals, commas or marks,
  length, word count, which option sits between the others on a count, which
  option is most similar to the rest) picks out the correct answer more often
  than chance; a strand that shows such a pattern is not used. Do not aim for
  any particular count pattern within an item. Just vary the error kinds
  naturally, the way they occur in student writing.

## Difficulty: each item uses ITS OWN grade's standards, at the hard end

Reviewers of the last round judged a fifth of the items **easier** than their
stated grade. What they named as too easy: a street name with "avenue"
lowercased at grade 5; nationality adjectives at grade 7; its/it's and a plural
possessive at grade 7; a dead tag-question option; an obviously doubled
"which". What they judged right: grammar items anchored to a grade-specific
standard (verbals, mood, voice, modifiers, perfect tenses), and comma rules
with the deciding element far from the site.

1. Anchor every item to a standard of its own target grade and put the code in
   `ccss` (e.g. "L.6.2a", "L.8.1b", "L.7.3a"). Never label a lower grade's
   rule at a higher grade (a direct-address comma is L.5.2c and may only
   appear at grade 5). Punctuation and Capitalization use L.x.2 codes; Grammar
   uses L.x.1 or L.x.3.
2. Within that standard, write the harder instance, the one a student only gets
   right on a full read: the site separated from what decides it, the rule's
   less familiar case, a site that looks right at a glance. Sentences may be
   longer than last round (up to about 25 words at grades 7-8), but keep the
   wording plain: any sentence of 15+ words must read at about grade 4-8 at
   grades 5-6 and about grade 4-9 at grades 7-8 (no dense adult prose).
3. **Capitalization is for grades 5-6 only**, because the standards add no new
   capitalization rule after grade 4. Each item uses a different `cap_rule`.
   The last round's grade-6 items fit their grade; its **grade-5 items ran
   slightly too HARD**: reviewers placed a title whose site was the short verb
   "Is" at grade 7, and split on a region vs a compass direction. So:
   - **Grade 5 (C01-C05): one notch easier than last round.** Use rules a
     grade-5 student has been taught by grade 4-5, in a sentence where the
     rule is clear from the sentence itself: proper nouns that are more than
     one word (a park, a school, a bridge, a company, a team) vs the same
     common noun used alone; holidays and named events vs seasons; days and
     months; languages, nationalities and the proper adjectives formed from
     them; the first word of a quoted full sentence; titles of books, songs
     and films in which the only small words are "a", "an", "the", "and",
     "of", "in", "on" or "to"; a family title used as a name ("Aunt Rosa",
     "Grandpa" in address) vs after "my". Still the harder instance a grade-5
     student gets wrong on a quick read, not a sentence-start capital or a
     person's name. **At grade 5 do not use:** title rules that turn on short
     verbs ("Is", "Are", "Be") or on long prepositions; a region vs a compass
     direction; brand names; historical periods and documents.
   - **Grade 6 (C06-C10): as last round**, the hard case of a rule a grade-6
     student still gets wrong (titles of works with short words, including a
     short verb or a long preposition inside them; historical events,
     periods, documents and organizations vs the same words used generally;
     a region vs a compass direction; a language vs a school subject; a
     quoted full sentence vs a quoted fragment; a brand name vs the product
     noun only when the sentence makes the product noun unambiguous; a
     generic word inside a multi-word proper name vs the same word used
     alone).
4. Punctuation by grade: grade 5 commas after an introductory element, in a
   series of phrases, with yes/no, tag questions and direct address, and
   titles of works (L.5.2a-d); grade 6 commas, parentheses or dashes around
   nonrestrictive elements (L.6.2a); grade 7 a comma between coordinate
   adjectives and not between cumulative ones (L.7.2a), and harder
   apostrophe cases; grade 8 a comma, ellipsis or dash for a pause or break,
   an ellipsis for omission (L.8.2a-b), semicolons and colons joining or
   introducing clauses. Each item uses a different `punct_rule`.
5. Grammar by grade (examples): grade 5 perfect tenses and inappropriate tense
   shifts, correlative conjunctions (L.5.1b-e); grade 6 pronoun case,
   intensive pronouns, shifts in pronoun number or person, vague pronouns
   (L.6.1a-d); grade 7 phrases and clauses, misplaced and dangling modifiers,
   simple/compound/complex sentences (L.7.1a-c); grade 8 verbals, active and
   passive voice, verb mood, inappropriate shifts in voice and mood
   (L.8.1a-d).

## No disputable errors (earlier rounds failed on these)

An error site must be wrong under **every** mainstream style guide a grade 5-8
teacher would use. Do NOT use:
- optional commas: after a short introductory phrase or clause, the serial
  (Oxford) comma, a comma before "too";
- who/whom where informal usage accepts either; singular "they"; split
  infinitives; a preposition at the end of a sentence; "data is"; "I wish I
  was" (last round a reviewer accepted it as informal standard);
- family words where the capitalization depends on whether the word is used as
  a name and the sentence leaves it open;
- any spelling or word-choice change in a Capitalization or Punctuation item;
- British or other regional spelling or punctuation conventions (single
  quotation marks, punctuation outside closing quotation marks): use US
  conventions throughout.

## Every wrong option must be a mistake a real student makes

Give each wrong option a `student_error`: the specific mistake that produces
it, in one line. If you cannot name a mistake real students at that grade
make, change the site. After you finish, a classroom teacher rates every
wrong option "would a real student pick this?"; anything rated no comes back
once for a rewrite, and an item whose rewrite is still rated no is dropped.

## General rules

- Original content only. Everyday school-age topics, invented names, no world
  knowledge needed.
- One correct answer, defensible from the item alone.
- Vary which error types and which parts of the sentence carry the sites; do
  not build every item on one skeleton. Put the sites early, late, or far
  apart.
- Put the key in any position; the order is reshuffled later.

## File format

Write a JSON array of 42 objects to the path you are given:

```json
{
  "id": "MLV3-P01",
  "family": "map",
  "map_subject": "language_usage",
  "map_area": "Language: Understand, Edit for Mechanics",   // "Language: Understand, Edit for Grammar, Usage" for grammar items
  "map_strand": "Punctuation",        // Capitalization | Punctuation | Parts of Speech | Phrases, Clauses, Agreement, Sentences
  "grade_target": 5,
  "ccss": "L.5.2a",
  "prompt": "Which sentence is punctuated correctly?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",            // exactly one of the choices: the no-error sentence
  "error_sites": ["what site 1 is", "what site 2 is"],
  "student_error": {"<wrong option>": "the mistake that produces it", "...": "...", "...": "..."},
  "explanation": "why the key is right and each wrong option is wrong",
  "cap_rule": "...",                  // Capitalization only, distinct per item
  "punct_rule": "...",                // Punctuation only, distinct per item
  "varied_dimension": "..."           // Grammar items only, distinct per item
}
```

When done, re-read every item as a student at its grade would, and as a strict
reviewer looking for (a) a second defensible answer, including under a
different style guide, (b) an option nobody would pick, (c) an item easier
than its grade or anchored to a lower grade's standard, (d) anything other
than the two sites that differs between options. Fix what you find. At the
end, state which files you opened.
