# Steering probe reader brief (sat-sec-hard-v25, pre-freeze; one render per reader)

You are an independent reviewer of Digital SAT Reading & Writing Standard English Conventions
items intended for the module-2 HARD route. Read ONLY the render file named in your task. Do not
open any other file in the repository or scratchpad (batch files, author files, keys, other
readers' files, registers). No key is given to you. Judge each item by solving it yourself; no
script or fixed rule.

These are the SAME questions the with-source graders answer at the gate, in the graders' own
words. Your answers go back to the authors for ONE revision round before the batch is frozen.

For EVERY item, solve it yourself from the passage, then record:
- my_answer: your letter
- exclusive: true if exactly one option is correct under every recognised convention of edited
  American English; false if a second option is defensible
- second_defensible: the letter that is also defensible, or null
- convention: the convention that makes it defensible, or null
- resolving_word_after_blank: if a word within the FOUR words after the blank settles the item on its
  own (without parsing the rest), quote it; else null
- n_struck: how many of the three wrong options (0-3) a test-taker can reject WITHOUT parsing the
  sentence's structure (garbled, ungrammatical in isolation, a pattern that is never right, etc.)
- struck: the letters of exactly those n_struck options (an empty array when n_struck is 0); never
  your own my_answer
- matches_open_mark: true if the key is decided by matching a punctuation mark already in the sentence
  (closing a dash/comma/parenthesis pair, or copying a mark used in a parallel slot); else false
- doubled_word: true if every option repeats a word already printed immediately before or after the
  blank, so that every reading doubles a word; else false
- distractor_quality: weak | plausible | strong
- difficulty: easy | medium | hard, graded against the REAL digital SAT module-2 hard route (most
  convention items there are medium; call it hard only if it would sit among the hardest SEC items)
- off_blueprint: true if the tested point is not something the digital SAT SEC domain tests
- note: one or two sentences: the deciding rule(s), what makes the strongest distractor attractive
- not_hard_because: REQUIRED when you rate the item easy or medium (null when hard). Name the one
  thing a strong student sees that makes it easier than the hardest SEC items: the word next to the
  blank that gives the number away, a clause that hands over the tense, a distractor nobody would
  pick, the second rule copying the first, a pattern shared with another item in this render. The
  author receives this verbatim and must rewrite the item; "too easy" alone is not usable.

Also add a top-level "summary" object with:
- tells: any heuristic that would let a test-taker pick keys across items WITHOUT the rule (a mark that
  is always/never the key, an option shape that always loses, the key always being the lone/plainest
  option, etc.). Be concrete and name items by their render ids (P01, P02, ...).
- near_duplicates: pairs of items that share one template (solving one teaches the other). Name
  every item by its render id exactly as the render prints it (e.g. "P07"). Write each pair or group
  as an array of ids; if you add a reason, make it the last element and a phrase of several words.

Write ONLY this JSON to the output path in your task:
{"reader": "<r0|r1>", "items": {"P01": {...every field above...}, ...}, "summary": {"tells": [...], "near_duplicates": [[...], ...]}}
Cover every id in the render. Save after every 8 items. Reply with one line: items covered, how
many you rated hard, and how many near-duplicate groups you named.
