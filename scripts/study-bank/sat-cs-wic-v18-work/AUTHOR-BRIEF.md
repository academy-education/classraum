# sat-cs-wic-v18 author brief (Digital SAT Words in Context, mostly hard)

You write Digital SAT Reading & Writing **Words in Context** items. The method is
NEW: the last brief of this kind (v17) leaked, and the rules below each close one
measured leak. Read them all before writing. The pre-registration is
`scripts/study-bank/PREREG-WIC18-2026-10-09.md`.

## What leaked last time (do not reproduce)
1. **The key's opposite was an option** (integral/optional, generic/specified,
   composite/uniform). A solver who never saw the passage picked "one of the
   opposite pair" and was right 20 of 21 times.
2. **The key was the rarest, most "SAT-sounding" word** among four plainer ones,
   and all 12 keys were adjectives.
3. **One key word was reused** across two items.
4. **Each distractor was killed by its own planted clause** ("within seconds" kills
   *sluggish*). Readers just picked the option nothing contradicted; graders called
   the items medium or easy.

## Rules
- **R1 No opposites.** No option may be the antonym or near-opposite of the key or
  of another option. If the passage mentions a view it then revises, the word for
  that view is NEVER an option. No three options sharing an evaluative polarity
  (+ / -) that the key lacks. Declare `antonym_pairs: []` and `polarity`.
- **R3 Distractors as test-worthy as the key, with a ceiling.** All four options
  are words a strong 11th-grader reads unglossed in a quality newspaper or a
  textbook. Nothing rarer: no technical terms, no GRE-only words (recondite,
  sedulous, pellucid, inchoate, perspicacious, sententious ...). Distractors match
  the key in part of speech, register and specificity. Declare `rarity_order`
  (most common first). In your 10 items the key may be the RAREST option at most
  2 times and must be the MOST COMMON option at least 2 times. **At least 4 of
  your 10 keys are nouns or verbs** (live SAT keys often are: "requires",
  "edition", "price", "claiming"); a common word used in a precise sense makes a
  good hard key.
- **R4 Difficulty from the passage's logic.** A hard item's key is decided only by
  combining two or more sentences (`key_from_one_sentence: false`): a mechanism, a
  comparison of two cases, a scope limit, a purpose. Each distractor should fit
  the blank's own sentence and a quick reading of the passage, and fail one
  inferential step (a near-miss that fits all but one detail). For each distractor
  declare `killed_by`: `logic` (fails a step combining sentences) or `explicit`
  (one phrase directly contradicts it). **At most ONE explicit per item. Never
  write a sentence whose only job is to contradict one distractor.** A contrast
  word ("however", "yet") may point at the key only if the key's opposite is not
  an option. Exactly one option must be defensible: check every distractor is
  actually wrong, not merely less good.
- **R5 Stem side.** No "a" or "an" directly before the blank (write "the" or
  rephrase). The word right after the blank must read grammatically and
  idiomatically with ALL FOUR options (if the blank is followed by "to", "of",
  "on", every option must take it). Declare `after_blank` (the next word, or ""
  if punctuation follows).
- **R6 No repeats.** Every option word (key and distractors) starts with a letter
  in YOUR range. Never reuse a word across your items; the self-check also
  refuses any word that is a live WIC word or used by another author.
- **Argument shapes.** At least 4 distinct shapes across your 10 (definition by
  example, cause and mechanism, comparison of two cases, concession then claim,
  method and its purpose, scope limit, process sequence, ...). "Received view
  overturned" at most 2 of 10. Declare `shape`.
- **Medium** = a hard-quality passage with a commoner key; not an easier passage.
- Passage 50-110 words, academic register, invented proper nouns (never reuse a
  name; prefer no name or a role, "one ecologist"), American punctuation, double
  quotes, exactly one blank written as six underscores `______`.
- Explanation: 2-4 sentences; quote the key and each distractor by its word,
  never "option B" / "choice B"; say why each distractor fails.

## File format — ONE file per item
`scripts/study-bank/sat-cs-wic-v18-work/<L>/WIC18<L>-NN.json` (NN = 01..10):

```json
{
  "id": "WIC18A-01",
  "domain": "Craft and Structure",
  "subskill": "Words in Context",
  "difficulty": "hard",
  "topic_tag": "short topic",
  "passage": "... ______ ...",
  "prompt": "Which choice completes the text with the most logical and precise word or phrase?",
  "choices": ["w1", "w2", "w3", "w4"],
  "correct_answer": "w2",
  "explanation": "...",
  "antonym_pairs": [],
  "polarity": {"w1": "0", "w2": "+", "w3": "0", "w4": "-"},
  "rarity_order": ["most common", "...", "...", "rarest"],
  "killed_by": {"w1": "logic", "w3": "logic", "w4": "explicit"},
  "after_blank": "to",
  "pos": "verb",
  "shape": "cause and mechanism",
  "key_from_one_sentence": false
}
```
Choices lowercase, single word (a two-word phrase only if natural). Put the key in
any position; order is re-dealt at freeze.

## Loop
After EACH file: `cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/wic18-selfcheck.mjs <L>`
and fix every PROBLEM on your own items (per-author count rules fire once you have
10 files). Then re-read the item as a student who has NOT seen the passage: could
you pick the key from the four words alone (an opposite pair, an odd one out, the
fanciest word)? If yes, change a distractor.

## Process rules
- Write 5 items per run (the run brief says which numbers), then stop and report.
- Never touch another author's folder or any file outside your folder.
- NEVER run pkill, killall, or any command that kills processes.
- No GPT or other non-Claude model; do not call any model API.
