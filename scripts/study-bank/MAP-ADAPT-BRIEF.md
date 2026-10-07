# MAP adaptation brief (pilot 5, 2026-10-07)

You are adapting existing, already-reviewed test questions **that this
project wrote itself** into the format of a grades 5-8 reading and language
diagnostic modelled on NWEA MAP Growth (public strand names only). You are
**not** writing new questions. Every item you produce must be the SAME
question as its source, made readable for its target grade and fitted to a
four-option format.

Source material: the file you are given, `sources.json`. Each entry has an
`adapt_id`, a `source_id`, the live source `item` (passage, prompt, choices,
`correct_answer`), and the target: `map_area`, `map_strand`, `grade_target`,
`target_band`, and `set` (P1/P2/P3 = items sharing one passage; null =
standalone).

Do not open any other file in `scripts/study-bank/`, any published test
item, any NWEA material, or any web page. At the end, state which files you
opened.

## The rules

**R1. The key does not change.** The adapted correct answer must say the same
thing as the source's `correct_answer` - the same proposition, the same word
sense, the same transition, the same finding - in simpler words. If you find
you cannot keep the key at the target grade, do not invent a new one: keep
the item as close as you can and say so in `changes` with the word
`KEY-AT-RISK`.

- Vocabulary in a passage ("drew", "ran", "measure"): keep the same target
  word and the same sense as the key.
- Fill-in-the-blank words: keep the key word itself.
- Transitions: keep the key transition itself.

**R2. Keep the distractor structure.** Each wrong option in your item must
come from one wrong option in the source and keep its ROLE: the same wrong
reading, the same confusion or the same rival explanation, in simpler words.
For a fill-in or transition item you may swap a distractor word that is above
the target grade for an easier word **with the same role** (for example,
another transition of the same relation, or a word with the same wrong
meaning). Record the mapping in `distractor_map`.

**R3. Four choices.** MAP multiple choice here has four options. Where the
source has five, drop exactly ONE wrong option. Prefer the one whose
refutation forces the most unnatural sentence into the passage, and you may
then remove that refutation from the passage. Record the dropped option's
source text in `dropped_distractor` (null if the source had four).

**R4. Passages (sets P1, P2, P3).** Rewrite each source passage ONCE (all
four items of a set share it) so that a student at the set's grade can read
it:

- 200-350 words, 3-6 paragraphs.
- Shorter sentences, everyday vocabulary.
- Flesch-Kincaid grade roughly at the target grade. Hard limits: 4.0 to 8.9
  for the passage and for any single stem or option sentence of 15+ words.
- Keep, reworded, every piece of text that makes the key correct.
- Keep, reworded, every piece of text that rules out a wrong option you kept.
- You may cut text that only supported items or options not used here.
- **Make the prose read naturally**, like a published passage for that grade.
  The source passages state flat denials ("I was not relieved, I was not
  proud...") to rule options out. Where you can, turn a denial into ordinary
  narration or explanation that rules the option out just as clearly. Never
  leave a kept wrong option defensible.
- Add no new fact that would make a wrong option defensible or the key less
  certain.
- Name places and people only as the source does, or with plain invented
  names.

**R5. Standalone items.**
- Shorten the source's short passage to 40-120 words at the target grade,
  keeping the logic that decides the answer.
- A fill-in-the-blank keeps its blank `______`.
- A transition item keeps its blank at the same logical joint.
- An evidence item ("which finding would support...") keeps the same claim
  and the same four findings, simplified.

**R6. Stems in plain MAP style.** For example:
- "Which sentence best tells what the passage is mostly about?"
- "What does the word *ran* mean in paragraph 1?"
- "Why does the author include paragraph 2?"
- "Which word best completes the sentence?"
- "Which transition best connects the two sentences?"

Refer to paragraphs, never line numbers. Stems must not give the answer away
or repeat words that appear only in the key.

**R7. Options.**
- Keep the four options parallel in form and similar in length.
- The key must not be the uniquely longest or uniquely shortest option on
  more than a quarter of your items.
- No option may be absurd or a form no student would choose.
- No option may share a distinctive word with the stem or passage that the
  other three lack.

**R8. Record exactly what changed.** Fill `changes` with short, concrete
entries, for example:
- "passage cut from 336 to 268 words"
- "sentence 'There was no wage in it...' turned into narration"
- "dropped option E (source: 'puzzlement she does not resolve')"
- "stem reworded from 'chiefly serves to' to 'Why does the author include'"
- "distractor 'conspicuous' replaced by 'easy to see' (same role: the opposite meaning)"

## Output

A JSON array, one object per item, in `adapt_id` order:

```json
{
  "id": "MAPA-01",
  "source_id": "<uuid from sources.json>",
  "set_id": "P1" | null,
  "map_area": "...", "map_strand": "...",
  "grade_target": 6, "target_band": "RIT 190-199",
  "stratum": "comprehension" | "vocab" | "writing",
  "passage": "<the full adapted passage; identical text on all items of a set>",
  "prompt": "...",
  "choices": ["...", "...", "...", "..."],
  "correct_answer": "<exactly one of choices>",
  "key_logic": "<one sentence: why the key is right, quoting the adapted passage>",
  "distractor_map": [{"adapted": "...", "source": "...", "role": "..."}, x3],
  "dropped_distractor": "<source text>" | null,
  "changes": ["...", "..."]
}
```

`stratum`:
- **vocab** for Vocabulary items.
- **writing** for transitions.
- **comprehension** for everything else.

Put the key in any position; positions are re-dealt later.
