# sat-cs-wic-v24 author brief (Digital SAT Words in Context, mostly hard)

You write Digital SAT Reading & Writing **Words in Context** items. The method is
NEW: the last brief of this kind (v17) leaked, and the rules below each close one
measured leak. Read them all before writing. The pre-registration is
`scripts/study-bank/PREREG-WIC24-2026-10-23.md`.

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
  in YOUR range: **A a-f, B g-l, C m-r, D s-z** (rotated from v23, where A had
  d-i, B j-q, C r-z, D a-c; no range is narrower than 6 letters). Never reuse a
  word across your items; the self-check also refuses any word that is a live WIC
  word, any v17/v18/v19/v20/v23 option word (key or distractor, kept or dropped),
  or a word used by another author.
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
`scripts/study-bank/sat-cs-wic-v24-work/<L>/WIC24<L>-NN.json` (NN = 01..10):

```json
{
  "id": "WIC24A-01",
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
  "polarity": {"w1": "0", "w2": "+", "w3": "+", "w4": "-"},
  "register": {"w1": "neutral", "w2": "formal", "w3": "formal", "w4": "neutral"},
  "rarity_order": ["most common", "...", "...", "rarest"],
  "killed_by": {"w1": "logic", "w3": "logic", "w4": "explicit"},
  "after_blank": "to",
  "pos": "verb",
  "shape": "cause and mechanism",
  "key_from_one_sentence": false,
  "deletion_test": {
    "kept_sentence": "<the blank's own sentence, copied verbatim from the passage>",
    "defensible": ["w2", "w3"],
    "why": "with every other sentence deleted, w2 and w3 both fit because ..."
  }
}
```
Choices lowercase, single word (a two-word phrase only if natural). Put the key in
any position; order is re-dealt at freeze.

## Loop
After EACH file: `cd /Users/andylee/Downloads/saas/classraum && node scripts/study-bank/wic24-selfcheck.mjs <L>`
and fix every PROBLEM on your own items (per-author count rules fire once you have
10 files). Then re-read the item as a student who has NOT seen the passage: could
you pick the key from the four words alone (an opposite pair, an odd one out, the
fanciest word)? If yes, change a distractor.

## Process rules
- Write 5 items per run (the run brief says which numbers), then stop and report.
- Never touch another author's folder or any file outside your folder.
- NEVER run pkill, killall, or any command that kills processes.
- No GPT or other non-Claude model; do not call any model API.

## v20 additions (from v19)
- v19's r1 probe found the key was the rarest/most "SAT-test" word on 45% of items and one pole of an opposite pair on
  42.5%. Write distractors as rare and precise as the key from the start, and never put two opposites in a set.
- Most v19 items were graded MEDIUM or EASY by the panel: the blank's own sentence or a local collocation settled
  them. For hard items, put the deciding facts in earlier sentences, make every distractor fit the blank's sentence
  locally, and make each distractor fail only on the passage's logic across two or more sentences.
- After your 10th file, run the self-check with `--final` and keep the batch key-strictly-longest within 15-35%.

## v23 addition (from v20)
- v20's one drop for non-exclusivity was WIC20D-08, "stretch" vs the key "shift": all three graders named the
  distractor as a second answer because it shares the key's semantic field with only a narrower scope. Do not use a
  distractor that is a near-synonym of the key differing only in scope or degree; each distractor must be wrong in
  the passage, not merely less precise than the key.

## v24 additions (from v23, which was HELD whole at stage 2)
v23 passed its r2 probe and still leaked: options-only solvers scored 53.3% on the candidate against 36.3% on the
live control (E = +17.0, bar +10). The probe numbers went down after the revision round (test_word on the key 32.5% to
22.5%) but the attack did not go under the bar. The rules below are hard rules, checked by the self-check where a
script can check them.

1. **How the solvers beat the control.** They picked (a) the rarest, most test-like word; (b) one member of an
   opposite or near-opposite pair; (c) the odd one out by polarity. So:
   - Your key is **NOT the rarest option in at least 8 of your 10 items** (`rarity_order`, checked). Make the rarest
     option a distractor on most items.
   - Your key is **NEVER the odd one out in polarity or register, in any item.** Label every option's `polarity`
     (+ / - / 0) and `register` (everyday | neutral | formal | technical | literary). The key's polarity must be
     shared by at least one distractor, and so must its register (both checked per item). Labels must be honest:
     the graders and probes read the words, not your labels.
   - Still no opposites (R1): no option is the opposite or near-opposite of the key or of another option.
2. **Difficulty: the neighbours must decide it.** The v23 difficulty probe rated 20 of 40 items easy, mainly because
   one sentence, or the blank's own clause, settled the key. For EVERY item, run the deletion test and declare it:
   delete every sentence except the blank's own sentence. At least **two** options, the key among them, must still
   be defensible from that sentence alone. Declare `deletion_test.kept_sentence` (verbatim, containing `______`),
   `deletion_test.defensible` (two or more options, key included) and `deletion_test.why`. If only the key survives
   the deletion, the item is easy however the passage reads: move the deciding fact out of the blank's sentence into
   a neighbour.
3. **Ranges are wider (6+ letters).** v23's narrowest range (a-c) stayed over on both probe axes. With six or more
   letters you have room to choose distractors as rare and as precise as the key. Use it.
