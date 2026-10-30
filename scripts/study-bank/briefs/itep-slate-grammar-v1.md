# Author brief: iTEP SLATE-style Grammar, pilot v1 (24 items) - DRAFT, not frozen

> Status: DRAFT 2026-10-31. Freeze it (BRIEF-VERSIONING.md) only after the prereg is written. Authors receive THIS
> file only: never ITEP-SLATE-BLUEPRINT.md, the reference PDFs, or any pending file.

You are writing **24 original four-option multiple-choice grammar items** for an English proficiency practice test
taken by **middle- and high-school students learning English as a second language** (ages roughly 11-18). The items
range from beginner (CEFR A1-A2) to upper-intermediate/advanced (B2-C1).

Work only from your own knowledge of English grammar. Do not search for, open, quote, adapt or imitate any published
test item from any testing company, including iTEP, TOEFL Junior, Cambridge or SLEP. Do not open any repository file
other than this brief and your output file. No web.

## The 24 items

| part | n | ids | task |
|---|---|---|---|
| Part 1: Sentence Completion | 12 | `ITG1-C01`..`C12` | one sentence with one blank (`________`); choose the word or phrase that correctly completes it |
| Part 2: Error Identification | 12 | `ITG1-E01`..`E12` | one sentence with four marked words or phrases; choose the one that is NOT correct |

Prompts, verbatim:
- Part 1: "Choose the word or phrase that correctly completes the sentence."
- Part 2: "Choose the underlined word or phrase that is NOT correct."

**Part 2 rendering.** The app has no underline renderer. Write the sentence in `passage`, and wrap each of the four
segments in square brackets with its letter, for example `[A: ...]`. `choices` are the four segment texts,
**verbatim and in sentence order**. Each segment text must occur exactly once in the sentence.

## Assigned per item (do not change)

These were drawn at random so that the key position, the key's length rank and the difficulty land at base rate
across the batch. Write the item to fit its row. Do not swap rows.

**Part 1.** `slot` is where the key sits in `choices`. `len` is the key's character-length rank among the four
options (1 = shortest, 4 = longest; ties count as the lower rank).

| id | slot | len | difficulty |
|---|---|---|---|
| C01 | D | 1 | medium |
| C02 | D | 2 | easy |
| C03 | C | 3 | medium |
| C04 | B | 2 | hard |
| C05 | C | 4 | medium |
| C06 | B | 3 | hard |
| C07 | A | 2 | easy |
| C08 | A | 1 | easy |
| C09 | B | 3 | easy |
| C10 | C | 4 | hard |
| C11 | D | 4 | medium |
| C12 | A | 1 | hard |

**Part 2.** `slot` is which segment (A = first in the sentence, D = last) contains the error. `len` is that segment's
length rank among the four segments.

| id | slot | len | difficulty |
|---|---|---|---|
| E01 | C | 1 | easy |
| E02 | D | 4 | medium |
| E03 | B | 2 | hard |
| E04 | D | 3 | hard |
| E05 | C | 4 | medium |
| E06 | A | 4 | easy |
| E07 | D | 2 | easy |
| E08 | A | 1 | hard |
| E09 | A | 3 | hard |
| E10 | C | 2 | medium |
| E11 | B | 3 | medium |
| E12 | B | 1 | medium |

Difficulty targets:
- **easy**: A1-A2. Present and past simple, plurals, articles, basic prepositions of time and place, subject pronouns, can/must.
- **medium**: B1. Present perfect vs past simple, comparatives and superlatives, gerund vs infinitive after common
  verbs, first and second conditionals, relative clauses, count vs non-count quantifiers, adverb vs adjective.
- **hard**: B2-C1. Past perfect in sequence, third and mixed conditionals, passive with modals, reported speech
  backshift, inversion after negative adverbials, correlative pairs, parallel structure, reduced relative clauses,
  dangling or misplaced modifiers, subjunctive after "suggest/insist".

## The rule that decides whether an item survives

After you finish, solvers will see **only the four options, with the sentence hidden**, and try to pick the key. An
item fails if the options alone point to it. So:

1. **Every option must be well-formed English in SOME sentence.** For Part 1, each option must be a phrase a fluent
   speaker could write in some context. No non-words, no impossible verb strings, no "will going". A form that is
   wrong everywhere is a dead option: anyone can eliminate it without reading the sentence. In Part 2, each segment
   must look correct in isolation. The error lives in how the segment fits THIS sentence (agreement with a distant
   subject, tense against an earlier time marker, case inside a compound, a parallel list, a preposition that the
   head word governs), never in a segment that is broken on its own.
2. **The options must not differ along the axis the stem names in a way the options alone resolve.** In Part 1, all
   four options vary along ONE grammatical dimension (for example four tense forms of one verb, four pronoun cases,
   four connectors), and **only the sentence decides** which is right. Do not make the key the only "complete" or
   "standard-looking" form, the only option with an auxiliary, or the only option with the most common form.
   Declare the dimension in `varied_dimension`.
3. **In Part 2, every segment must be a place where a real error could plausibly sit.** Do not pad with segments
   nobody would suspect, like a bare "the" or a proper noun. Each of the three correct segments should contain a form
   that a learner might doubt: an irregular past, a preposition, a pronoun, a comparative, a "-ing" form. The wrong
   segment must not be the only segment containing an "interesting" grammatical feature.
4. **Exactly one correct answer**, wrong under every mainstream reference grammar for Part 2, and the only correct
   completion for Part 1. Use US conventions. Do NOT build an item on any of these:
   - who/whom; singular "they"; "everyone ... their"; "than I"/"than me";
   - split infinitives; a preposition at the end of a sentence; "data is"; "I wish I was";
   - "neither ... nor" agreement with mixed number; "less" vs "fewer";
   - "different than"; British vs American forms; "Can I" vs "May I";
   - any usage a teacher could defend either way.
   In Part 1, check that no distractor becomes correct under a second reading of the sentence (a different time
   reference, a different speaker intention).

## Vary the load-bearing element across items

A rigid batch develops a cross-item tell: a solver who cracks one item cracks many. So:
- **No two items test the same grammar point** within a part, and each `varied_dimension` is unique across all 24.
  Spread across these categories, using each at most twice per part:
  - verb tense and aspect;
  - subject-verb agreement;
  - pronoun case and reference;
  - relative pronouns and clauses;
  - comparatives and superlatives;
  - gerund vs infinitive;
  - conditionals;
  - passive voice;
  - modals;
  - count/non-count and quantifiers;
  - adjective vs adverb;
  - prepositions after a head word;
  - conjunctions and connectors;
  - parallel structure;
  - word form (noun/verb/adjective of one root);
  - reported speech;
  - modifier placement.
- In Part 1, vary which category of word the blank takes (verb phrase, pronoun, connector, preposition, adjective or
  adverb form, noun form) and where the blank sits: early, middle or late.
- In Part 2, vary **what kind of error** the wrong segment holds: a wrong form in place of the right one, a word that
  should not be there, or a missing word reflected in a segment. Vary **how far** the deciding word sits from the
  error. Do not put the decisive clue in the same position every time.
- Vary sentence length: about 8-12 words for easy, 12-18 for medium, 15-24 for hard. Vary the length naturally; a
  script checks whether length, word count or any other simple option feature predicts the key, and a part that
  shows such a pattern is not used. Do not aim for any count pattern beyond the assigned `len` rank.

## Content

Settings a secondary student lives in: school, clubs, sports, family, friends, hobbies, travel, weekend plans,
technology, and simple science and history facts that need no outside knowledge. Use invented names from many
backgrounds. Nothing frightening, political, romantic or brand-named. Every sentence must be fully understandable
to the target level, apart from the grammar being tested.

## Every wrong option names a real learner mistake

For each wrong option (Part 1) or each correct-but-suspicious segment (Part 2), give `student_error`: one line on
why a learner at that level picks it, for example a first-language transfer pattern, overgeneralising a rule, or a
confusion between two forms. If you cannot name a mistake that real learners make, change the option.

## Output

Write a JSON array to the output path you are given. Each element:

```json
{
  "id": "ITG1-C01",
  "part": "Part 1: Sentence Completion",
  "difficulty": "medium",
  "cefr": "B1",
  "category": "verb tense and aspect",
  "varied_dimension": "present perfect vs past simple vs past perfect vs present perfect continuous, decided by a 'since' clause",
  "prompt": "Choose the word or phrase that correctly completes the sentence.",
  "passage": "<the sentence, with ________ for Part 1, or [A: ...] [B: ...] [C: ...] [D: ...] for Part 2>",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "<exact text of the key, at the assigned slot>",
  "explanation": "<2-3 sentences a student can learn from: the rule and why the key follows it>",
  "distractor_rationales": {"<option text>": "<why wrong here>"},
  "student_error": {"<option or segment text>": "<the learner mistake that makes it attractive>"},
  "key_slot": "D",
  "key_len_rank": 1
}
```

Before you hand in, check every item against this list and fix any that fail:
- [ ] the key is at its assigned slot and has its assigned length rank
- [ ] all four options are distinct, and each is grammatical in some context
- [ ] Part 2 only:
  - [ ] each segment occurs exactly once in the sentence
  - [ ] the choices are in sentence order
  - [ ] exactly one segment is wrong
- [ ] no item uses a banned point from rule 4
- [ ] no two items share a `varied_dimension`
- [ ] the difficulty matches the target level for its row
