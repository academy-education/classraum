# Verbal audit brief (key visible)

These are reading, vocabulary and language items. Each one has already passed one grading and is about to go to
students. Your job is to find anything that would:

- make a careful student's correct reasoning land on a non-key answer;
- make the key wrong, unsupported or free;
- put an error on the student's screen.

The key and the author's explanation are shown on purpose. **Do not trust them.** For every item, cover the KEY line
and solve the item from the passage and stem first. Then compare.

## What you are shown

- **Passages.** Passage text is printed as the app displays it. A passage set prints its passage once, then every
  question on it.
- **Stimulus items.** MAP Language and Writing items print their own short stimulus under STIMULUS. Bracketed words
  `[like this]`, numbered sentences `(1) (2)` and blanks are part of what the student sees.
- **Task tags.** SSAT Verbal stems start with a task tag, `[Synonym]` or `[Analogy]`. That is the published
  convention and not a defect.
- **SOURCE CHECK.** Each item carries a `SOURCE CHECK:` line, `required` or `not applicable`, which tells you
  whether question 4 below applies.

## For EVERY item, answer these

1. **Key.** Solve the item yourself, then compare with the KEY.
   - `key_verified: true` only if you reached the key yourself AND it is the one defensible answer.
   - If you reach a different option, cannot reach any option, or find two equally good options, it is `false`.
   - Show your reasoning in a `note` issue: the line of the passage, the grammar rule, or the word's sense.
2. **Uniqueness.** Use our reviewer's threshold: would a careful student who picked another option have a
   reasonable complaint? "Also plausible", "also natural", "also grammatically correct" and "not completely wrong"
   all count.
   - If yes, raise `second_defensible`. Name the option by its text and say why it works.
   - Do NOT flag an option that only has "some pull" because of a small gap that a careful reader settles in
     favour of the key.
   - **Vocabulary in context:** put each choice into the sentence. Flag one that reads as a natural, logical
     completion.
   - **Synonyms:** exactly one choice should match the headword's main sense.
   - **Analogies:** exactly one pair should share the stem's relation at the same level of specificity.
   - **Grammar and usage:** flag another option that is acceptable in normal edited English, even if a strict
     rulebook prefers the key.
3. **Support.** For an item with a passage or stimulus: does the text actually support the key? Raise `no_support`
   when:
   - the key asserts something the passage does not say;
   - the key adds an inference the passage never makes;
   - the key gives an action or view to the wrong person;
   - the passage is too underspecified for any single answer.

   Quote the passage.
4. **Source** (only where `SOURCE CHECK: required`). Could a student pick the key from the stem and options alone,
   without reading the passage or stimulus? Examples:
   - general knowledge answers it;
   - three options are wrong in any context;
   - the key is the only option consistent with the stem's wording.

   If so, raise `no_source` and say how. Where `SOURCE CHECK: not applicable` (synonyms, analogies, spelling and
   punctuation items, word-meaning items), knowing the word or the rule IS the skill tested, so do not raise it.
5. **Facts.** Raise `fact_error` when:
   - the passage, stem, an option or the explanation states something false about the real world, such as a real
     rule, law, place, date, person or scientific fact (fiction may invent people and towns, but not get a real rule
     wrong);
   - the passage contradicts itself (quote both statements).

   A claim you merely cannot verify is a `note` marked "unverified".
6. **Language.** Raise `language_error` for an UNINTENDED grammar, usage, punctuation or spelling error in:
   - the passage or stimulus;
   - the stem;
   - the KEY;
   - the explanation.

   In a grammar, punctuation, capitalisation or spelling item, the errors in the distractors are what is being
   tested. They are NOT defects. In such an item, the KEY must be fully correct, and if a "which has an error" key
   has no error, or a distractor has an extra, untested error, flag it. That is a `second_defensible` or
   `language_error`.
7. **Explanation.** Raise `explanation_mismatch` when the author's explanation:
   - argues for a different option;
   - contradicts the key or the passage;
   - states a wrong rule;
   - describes a different item.
8. **Typos and rendering.** Raise `typo_rendering` for:
   - a typo in any shown text (other than a tested spelling distractor);
   - stray markup or escape characters;
   - a bracket, blank, underline or sentence number that the stem refers to but the text lacks;
   - truncated text;
   - duplicate options;
   - a paragraph reference ("seventh paragraph") that does not match the passage.

## Not defects (record as `style`, never as a flag)

- The key is the longest, most detailed or most hedged option.
- The key differs from the other options in form.
- Distractors are easy, far from the passage, or all from one category.
- The item is easy, or a purpose question is really a detail question.
- The key is imprecise but clearly the best answer.
- A distractor in a NON-grammar item is oddly worded.
- A distractor copies the passage word for word.
- Line-break or layout preferences that do not hide anything.

`note` is for anything else worth recording. Neither `style` nor `note` ever holds an item. Do not use them to soften
a real problem. A flag only sends the item to the owner to read; it costs nothing else.

## Batch patterns (optional, never flags an item)

After the last item, look across the whole packet. Could a student pick keys from a pattern across items? Look for:

- key letters running in order, or one letter far more often than the others;
- the key being the only hedged or longest option in most items;
- the same key wording reused;
- reused distractor sets.

Report each pattern you find under a top-level `batch_patterns` array, as `{ "pattern": "...", "detail": "..." }`.
Omit the array or leave it `[]` if you find none.

## Output

Write ONLY your output file, as JSON. It has one entry for each item id in the packet, and optionally
`batch_patterns`:

```
{
  "Q01": { "key_verified": true,  "issues": [ { "type": "note", "detail": "Para 3: 'she never went back' -> C." } ] },
  "Q02": { "key_verified": false, "issues": [ { "type": "second_defensible", "detail": "'amass' and 'gather' both match ACCUMULATE's main sense." } ] },
  "Q03": { "key_verified": true,  "issues": [ { "type": "typo_rendering", "detail": "Stem cites sentence 5; the stimulus has four sentences." } ] },
  "batch_patterns": []
}
```

- `type` is one of the following.
  - Flagging types: `second_defensible`, `no_support`, `no_source`, `fact_error`, `language_error`,
    `explanation_mismatch`, `typo_rendering`.
  - Non-flagging types: `style`, `note`.
- Every issue needs a non-empty `detail`.
- `issues` may be `[]`.
- A file is void and gets re-run if it is empty, is not valid JSON, misses an id, adds an id, uses any other type
  or has a non-boolean `key_verified`.

Flag only what you can show. Flag every time you can show something.
