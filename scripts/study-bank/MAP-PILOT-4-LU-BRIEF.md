# Author brief: grades 5-7 Language Usage, Mechanics and Vocabulary (24 items)

You are writing **24 original four-option multiple-choice items** for a
grades 5-7 English language diagnostic aligned to the Common Core ELA
standards for grades 5-7 (Language L.5-7.1, L.5-7.2, L.5-7.4; Writing W.5-7.1c
/ 2c transitions and precise language). The test places a student in a
ten-point difficulty band on a 180-209 range; you are writing for **the
typical grade 5, 6 and 7 student**.

Work only from your own knowledge of those standards. Do not search for,
open, quote or imitate any published test item from any testing company.
Do not open any file in `scripts/study-bank/` or run anything there, other
than writing your own output file.

## The 24 items

| strand | n | bands |
|---|---|---|
| Capitalization | 4 | 2 at 180-189, 1 at 190-199, 1 at 200-209 |
| Spelling | 3 | one per band |
| Punctuation | 3 | one per band |
| Vocabulary in context | 6 | two per band |
| Parts of Speech | 3 | one per band |
| Phrases, Clauses, Agreement, Sentences | 3 | one per band |
| Writing: transitions or precise language | 2 | one at 190-199, one at 200-209 |

Bands: exactly **8 items at "RIT 180-189" (grade 5)**, **8 at "RIT 190-199"
(grade 6)**, **8 at "RIT 200-209" (grade 7)**.

## Difficulty: each band uses ITS OWN grade's standards, at the hard end

Reviewers of earlier rounds judged about a quarter of items **easier** than
their stated grade, almost none harder, and the misses were concentrated in
the lowest band: grade-5 items were placed at grade 4, and grade-5 rules were
labelled grade 6. So:

1. **Anchor every item to a standard of its own band's grade** and put the
   code in `ccss` (e.g. "L.5.2a"). 180-189 uses L.5 / W.5 standards only;
   190-199 uses L.6 / W.6 (or a grade-5 rule in a clearly harder sentence is
   NOT allowed: use a grade-6 rule); 200-209 uses L.7 / W.7. Never label a
   grade-4 or grade-5 rule at 190-199 or above (e.g. a direct-address comma is
   L.5.2c: it may only appear at 180-189).
2. **Within that standard, write the harder instance, one band harder than
   your instinct.** For the lowest band that means the harder end of grade 5,
   for example:
   - commas separating items in a series where the items are PHRASES, or
     where the series sits after an introductory clause, rather than a list of
     three single nouns;
   - homophones and commonly confused words in context where the sentence
     only decides it on a full read (not *their/there* in a giveaway frame);
   - irregular plurals and irregular past tense/participles that grade 5
     students still get wrong;
   - perfect verb tenses and inappropriate tense shifts (L.5.1b-d);
   - correlative conjunctions used in a sentence where the pairing is
     plausible either way until the second half is read (L.5.1e);
   - pronoun-antecedent agreement with a compound or indefinite antecedent.
3. **Spelling words** are grade-level words from a grade 5-7 content-area
   text, never grade 1-4 list words (*rhythm* was judged too easy for grade
   8, *definitely* too easy for grade 7).
4. **Vocabulary words** are tier-2 academic words. The context must decide the
   meaning by INFERENCE across the sentence, not by defining it: an earlier
   item read "a map scale where one inch stands for ten miles", which simply
   states the meaning and was judged two bands too easy.
5. **No giveaway context clue that only the key matches**: an earlier item
   said "with great force" and only one of four verbs carried force.

## Every wrong option must be a mistake a real grade 5-7 student makes

This is the main fix in this round. In the last round both reviewers named an
option that **no student would pick** on 5 of 24 items, and that alone failed
the batch. Every distractor must be something a real student at the target
grade, reading quickly or holding a common misconception, would actually
choose. Give each one a `student_error`: the specific mistake that produces
it, in one line. If you cannot name a mistake real students make, replace the
option. Then, separately, the batch goes to a classroom teacher who rates
each wrong option "would a real student pick this?"; anything rated no comes
back for a rewrite.

## Mechanics: the 2x2 grid (required)

Each Capitalization, Spelling and Punctuation item has **two error sites**,
and the four options are exactly: **neither error (the key), only the first
error, only the second error, both errors.** So every option shares each
site with two others, and no option is "in the middle" of the rest.
- Prompt: "Which sentence is capitalized correctly?" / "Which word is spelled
  correctly?" (or a sentence-completion version with one blank) / "Which
  sentence is punctuated correctly?"
- **The "both errors" option must also be pickable.** Choose two sites that
  the same kind of student gets wrong together (one misconception, or two
  very common slips), so a student who makes one mistake plausibly makes
  both. An earlier "both errors" cell was judged one no student would pick.
- **Capitalization:** the four options are identical except for letter case.
  Each error is a real student mistake (generic word in a proper name left
  lowercase, a common noun or a season capitalized, a title word, a direction
  vs a region, a family title used as a name vs with a possessive, a school
  subject vs a language, a historical period or document).
- **Spelling:** one word, single word options; the two sites are two
  separate trouble spots in that word (a doubled consonant and a vowel in an
  unstressed syllable, say). Every misspelling is 1-2 letter edits from the
  correct word, keeps the first letter, is NOT itself a real English word,
  and is a misspelling students actually produce.
- **Punctuation:** the four options are identical except for punctuation
  marks (commas, apostrophes, quotation marks, semicolons, colons). Two sites,
  each a real rule of the band's grade.
- Each item's rule must be different from every other item's in its strand
  (`cap_rule`, `spelling_pattern`, `punct_rule`).

## Vocabulary in context: real words that fit the sentence, not its meaning

Prompt: a short context (one to four sentences, in the `passage` field when
longer than one sentence) and "What does the word **X** most likely mean as it
is used in the sentence?" (or "...in paragraph 2?").

- The four options are **real words or short phrases, all the same part of
  speech as X, all similar length**, and **each one fits the sentence's
  surface**: if you substituted it for X the sentence would still be
  grammatical and would describe something that could plausibly happen in
  that situation. Only the key fits what the context actually says.
- The options do **NOT** have to be dictionary meanings of X. A meaning of X
  that makes no sense in this sentence (a musical scale in a sentence about a
  map; a traffic "yield" in a sentence about a harvest) is exactly the dead
  option to avoid.
- Good distractors come from how students misread context: the meaning
  suggested by the sentence's topic rather than its logic; the opposite of
  the key when the student misses a "not", "although" or "instead"; a meaning
  that fits the first half of the context but not the clue in the second
  half; a near-synonym that is too strong or too weak for the situation.
- Do not let the key repeat or echo a word from the context.

## Usage: one dimension only

- **Parts of Speech** and **Phrases/Clauses/Agreement/Sentences**: the four
  options vary in **exactly one** dimension, which you declare in
  `varied_dimension` (e.g. "pronoun case", "verb tense", "subject-verb
  number", "placement of the modifier"). Everything else is identical.
- Every option is a form real grade 5-7 students write. No forms no one
  would choose (earlier rounds offered "mine" in "to Mia and ___", and a
  correlative pair mismatched in a way nobody writes: both dead).
- A "Which sentence has an error" item is allowed, but the three correct
  sentences must each look like a plausible error.
- **Writing:** a short 3-5 sentence numbered paragraph and "Which transition
  best completes sentence N?" or "Which word most precisely ...?". Four options
  of one kind; exactly one fits the logic; **each other one reads naturally in
  that sentence taken alone** and is wrong only across sentences (an earlier
  "for example" with nothing to exemplify read as dead).

## General rules

- Original content only: invented names, everyday school-age topics, no
  world-knowledge shortcuts.
- One correct answer, defensible from the item alone.
- The key is not systematically the longest or shortest option.
- Vary the key's position A-D; no letter three times in a row, and no
  repeating cycle such as ABCDABCD.
- Readability: any sentence of 15+ words should read at grade 4-8 level.

## File format

Write a JSON array of 24 objects to the path you are given:

```json
{
  "id": "MAPP4-LU-01",
  "family": "map",
  "map_subject": "language_usage",           // "reading" for vocabulary items
  "map_area": "Language: Understand, Edit for Mechanics",
  "map_strand": "Capitalization",            // Capitalization | Spelling | Punctuation | Vocabulary | Parts of Speech | Phrases, Clauses, Agreement, Sentences | Plan, Organize; Create Cohesion, Use Transitions | Establish and Maintain Style; Use Precise Language
  "stratum": "mechanics",                    // mechanics | vocab | usage   (Writing items are "usage")
  "target_band": "RIT 190-199",
  "grade_target": 6,
  "ccss": "L.6.2a",
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

Ids `MAPP4-LU-01` to `MAPP4-LU-24`. Keep the `map_area` values:
- Mechanics: "Language: Understand, Edit for Mechanics"
- Grammar: "Language: Understand, Edit for Grammar, Usage"
- Writing: "Writing: Write, Revise Texts for Purpose and Audience"
- Vocabulary: "Vocabulary"

When done, re-read every item as a student at its grade would, and as a
strict reviewer looking for (a) a second defensible answer, (b) an option
nobody would pick, (c) an item easier than its label or anchored to a lower
grade's standard. Fix what you find. At the end, state whether you opened any
file other than this brief and your own output.
