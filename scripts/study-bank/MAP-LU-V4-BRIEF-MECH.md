# Author brief: grades 5-6 Grammar and Usage and grade 6 Capitalization (26 items)

You are writing **26 original four-option multiple-choice items** for a
grades 5-8 English language-usage diagnostic aligned to the Common Core ELA
Language standards (L.5.1, L.6.1 grammar and usage, L.5.3, L.6.3 language
knowledge; L.6.2 capitalization). You write for **the typical student at each
item's target grade, at the harder end of that grade's standard**.

Work only from your own knowledge of those standards. Do not search for,
open, quote or imitate any published test item from any testing company. Do
not open any file in the repository other than this brief and your own output
file. No web.

## The 26 items

| strand | n | grade targets | ids |
|---|---|---|---|
| Grammar and Usage | 16 | 8 at grade 5, 8 at grade 6 (**no grade 7 or 8**) | `MLV4-G01`-`G16` (G01-08 gr 5, G09-16 gr 6) |
| Capitalization | 10 | all grade 6 | `MLV4-C01`-`C10` |

Grammar and Usage items are split: at least 6 **"Parts of Speech"** (verb
tense and form, pronoun case and type, adjective/adverb, conjunctions and
prepositions) and at least 6 **"Phrases, Clauses, Agreement, Sentences"**
(subject-verb and pronoun-antecedent agreement, modifiers, sentence structure,
correlative and parallel structure). Spread both kinds across the two grades.

## Every item is a 2x2 grid (required)

Each item has **two error sites**, and the four options are exactly:
**neither error (the key), only the first error, only the second error, both
errors.** Everything other than the two sites is **character-for-character
identical** across the four options.

- Prompts: "Which sentence is capitalized correctly?" / "Which sentence is
  written correctly?" (grammar). Each option is one full sentence.
- **The "both errors" option must be pickable.** Choose two sites that the
  same kind of student gets wrong together (one misconception, or two very
  common slips).
- **Capitalization:** the four options are identical except for letter case.
- **Grammar and Usage:** the options are identical except at the two sites;
  each site is a word or short phrase. Declare the two sites in
  `varied_dimension` (e.g. "past perfect in the earlier action; tense shift in
  the second clause"). Each grammar item uses a different pair of dimensions.
- A site may be any kind of error: something missing, something wrongly
  present, or something wrong in place of the right thing. **Vary the kinds
  freely across the batch.** A script checks across each strand whether any
  simple structural feature of the options (the number of capitals or marks,
  length, word count, letter counts, alphabetical order, which option sits
  between the others on a count, which option is most similar to the rest)
  picks out the correct answer more often than chance; a strand that shows
  such a pattern is not used. In particular, do not build an item where both
  sites are inserted words (the key is then always the shortest sentence) or
  both are deleted words. Do not aim for any particular count pattern; just
  vary the error kinds naturally.

## Grammar and Usage, grades 5-6: harder than last round, still AT grade

Reviewers of the last round placed its grades 7-8 grammar items at grade,
but **ran grades 5-6 too easy**: 7 of 24 grade judgements were below the
target, and the three items held were all grade 5-6. What they called too
easy, and why:
- **irregular past participles** ("has swum", "has broken"): a grade-3/4 rule;
- **a pronoun person shift** where the wrong options used "you/your" after
  "hikers ... they": two options were dead, nobody would pick them;
- **a reflexive pronoun used as a subject** ("Jamal and myself painted"):
  placed at grade 5 for a grade-6 target.
What they placed AT grade 5-6: past perfect vs simple past in a sequence of
two past actions ("By the time Grandpa arrived ..., the last train had
already left"); pronoun case split across a compound object and a compound
subject in one sentence ("asked Priya and me ... she and I carried").

So, for every grammar item:
1. **Anchor it to a standard of its own target grade** and put the code in
   `ccss`:
   - grade 5: L.5.1a (function of conjunctions, prepositions, interjections
     in a sentence), L.5.1b (perfect verb tenses), L.5.1c (verb tense to
     show time, sequence, state, condition), L.5.1d (recognize and correct
     inappropriate shifts in verb tense), L.5.1e (correlative conjunctions),
     L.5.3a (expand, combine, reduce sentences);
   - grade 6: L.6.1a (pronoun case: subjective, objective, possessive),
     L.6.1b (intensive pronouns), L.6.1c (inappropriate shifts in pronoun
     number and person), L.6.1d (vague pronouns), L.6.1e (variations from
     standard English), L.6.3a (vary sentence patterns).
   Never label a lower grade's rule at grade 5 or 6 (irregular past forms,
   basic subject-verb agreement, its/it's, there/their, a/an, comparatives,
   double negatives are grade 1-4 rules).
2. **Write the harder instance of that standard**, the one a student only gets
   right on a full read:
   - the site **separated from what decides it** (the earlier action is in a
     clause at the other end of the sentence; the antecedent is far from the
     pronoun; the second verb is after an interrupting phrase);
   - **both** sites look right at a glance, and every wrong option is one a
     grade-level student actually picks; no option is plainly absurd;
   - the less familiar case of the rule: future perfect ("by June she will
     have finished"), past perfect after "before / after / by the time",
     a tense shift hidden in the second half of a long sentence, a correlative
     pair whose second half is misplaced or mismatched ("not only ... but
     also" before different parts of speech), pronoun case inside a
     prepositional phrase ("between Ana and me") or with an appositive ("we
     students" / "us students") or after a compound with a name first,
     a nonstandard intensive form (hisself, theirselves) beside a correctly
     used one, a pronoun number shift with a plural antecedent and singular
     "it" or "this one" later in the sentence.
   Sentences may be up to about 22 words, but keep the wording plain (any
   sentence of 15+ words must read at about grade 4-8).

## Capitalization, grade 6 only

Reviewers placed last round's **grade-6** capitalization items at grade 5-6
(all fit), and its grade-5 items at grades 3-4: multi-word place names,
seasons vs holidays, nationality and language words, days of the week vs
"weekend" are grade-3/4 rules and **may not be used here**. Each item uses a
different `cap_rule`, one from this list (the hard case of a rule a grade-6
student still gets wrong):
- titles of works with short words, including a short verb ("Is", "Are",
  "Be") or a pronoun inside the title, vs the small words that stay
  lowercase;
- titles of works with a long preposition ("Through", "Between", "Without")
  vs a short one;
- historical events (a named war, a named treaty, a named movement) vs the
  same words used generally;
- historical periods ("the Middle Ages", "the Renaissance") vs a common noun
  like "the middle of the day";
- documents ("the Bill of Rights", "the Declaration of Independence") vs a
  general word like "a bill" or "a declaration";
- organizations and government bodies ("the Senate", "the Red Cross") vs the
  same words used generally ("a senate", "a cross");
- a region ("the Southwest", "the Midwest") vs a compass direction ("drove
  west");
- a language vs a school subject ("Spanish" vs "science"), with a course
  number or name where relevant ("Algebra I" vs "algebra");
- a quoted full sentence (capital) vs a quoted fragment inside the sentence
  (no capital);
- a brand name vs the product noun after it, only when the sentence makes the
  product noun unambiguous;
- a generic word that is part of a multi-word proper name ("the Hudson
  River", "Mount Rainier National Park") vs the same word used alone later
  in the sentence ("the river", "the park"), when the two are far apart.
Not a sentence-start capital or a person's name. No family words whose
capitalization depends on whether they are used as a name.

## No disputable errors (earlier rounds failed on these)

An error site must be wrong under **every** mainstream style guide a grade 5-6
teacher would use. Do NOT use:
- who/whom; singular "they"; "everyone ... their"; "than I" / "than me";
  split infinitives; a preposition at the end of a sentence; "data is";
  "I wish I was"; "each of ... their"; "neither ... nor" with a plural and a
  singular subject whose verb agreement some guides allow either way (last
  round a reviewer accepted a plural verb after "neither ... nor");
- "between you and I" style items where the sentence leaves a second reading;
- vague-pronoun items where the "vague" option could be read clearly;
- any spelling or word-choice change in a Capitalization item;
- British or other regional conventions: use US conventions throughout.

## Every wrong option must be a mistake a real student makes

Give each wrong option a `student_error`: the specific mistake that produces
it, in one line. If you cannot name a mistake real students at that grade
make, change the site. After you finish, a classroom teacher rates every
wrong option "would a real student pick this?"; anything rated no comes back
once for a rewrite, and an item whose rewrite is still rated no is dropped.

## General rules

- Original content only. Everyday school-age topics, invented names, no world
  knowledge needed beyond the names a grade-6 student meets in school.
- One correct answer, defensible from the item alone.
- Vary which error types and which parts of the sentence carry the sites; do
  not build every item on one skeleton. Put the sites early, late, or far
  apart.
- Put the key in any position; the order is reshuffled later.

## File format

Write a JSON array of 26 objects to the path you are given:

```json
{
  "id": "MLV4-G01",
  "family": "map",
  "map_subject": "language_usage",
  "map_area": "Language: Understand, Edit for Grammar, Usage",   // "Language: Understand, Edit for Mechanics" for capitalization
  "map_strand": "Parts of Speech",    // Parts of Speech | Phrases, Clauses, Agreement, Sentences | Capitalization
  "grade_target": 5,
  "ccss": "L.5.1b",
  "prompt": "Which sentence is written correctly?",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "...",            // exactly one of the choices: the no-error sentence
  "error_sites": ["what site 1 is", "what site 2 is"],
  "student_error": {"<wrong option>": "the mistake that produces it", "...": "...", "...": "..."},
  "explanation": "why the key is right and each wrong option is wrong",
  "cap_rule": "...",                  // Capitalization only, distinct per item
  "varied_dimension": "..."           // Grammar items only, distinct per item
}
```

When done, re-read every item as a student at its grade would, and as a strict
reviewer looking for (a) a second defensible answer, including under a
different style guide, (b) an option nobody would pick, (c) an item easier
than its grade or anchored to a lower grade's standard, (d) anything other
than the two sites that differs between options. Fix what you find. At the
end, state which files you opened.
