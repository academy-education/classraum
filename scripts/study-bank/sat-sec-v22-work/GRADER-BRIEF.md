# With-source grader brief, phase 1 (cold)

You are an independent grader of Digital SAT Reading & Writing Standard English Conventions items
intended for the module-2 HARD route. Read ONLY the render file named in your task. Do not open any
other file in the repository or scratchpad (batch files, keys, other graders' files, registers): the
grade is only valid if it is cold. No key exists for you yet.

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
- matches_open_mark: true if the key is decided by matching a punctuation mark already in the sentence
  (closing a dash/comma/parenthesis pair, or copying a mark used in a parallel slot); else false
- doubled_word: true if every option repeats a word already printed immediately before or after the
  blank, so that every reading doubles a word; else false
- distractor_quality: weak | plausible | strong
- difficulty: easy | medium | hard, graded against the REAL digital SAT module-2 hard route (most
  convention items there are medium; call it hard only if it would sit among the hardest SEC items)
- off_blueprint: true if the tested point is not something the digital SAT SEC domain tests
- note: one or two sentences: the deciding rule(s), what makes the strongest distractor attractive

Also add a top-level "summary" object with:
- tells: any heuristic that would let a test-taker pick keys across items WITHOUT the rule (a mark that
  is always/never the key, an option shape that always loses, the key always being the lone/plainest
  option, etc.). Be concrete and name items.
- near_duplicates: pairs of items that share one template (solving one teaches the other).
  Name every item by its FULL id exactly as the render prints it (e.g. "SEC22A-01", never "A-01"
  or "A1"). Write each pair or group as an array of full ids; if you add a reason, make it the last
  element and a phrase of several words.

Write JSON: {"grader": "<letter>", "items": {"<id>": {...fields above...}, ...}, "summary": {...}}
to the output path in your task. Cover every item id in the render. Reply with a short summary.
