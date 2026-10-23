# World probe (sat-cs-wic-v27, steering; one render per reader)

You are an expert Digital SAT Reading & Writing item reviewer. Each item is a Words in
Context question with its passage and four options; the key is NOT given. Judge each
item by reading it; no script or fixed rule.

For EVERY item id give the same judgements a with-source grader gives, in the grader's
own words:
- `pick`: the letter you believe correct
- `exclusive`: true if exactly one option is defensible
- `second_defensible`: null or the letter of a second defensible option
- `n_struck`: how many of the three wrong options can be struck WITHOUT the
  passage's logic (from the blank's local grammar/collocation, an opposite pair,
  or a quick surface reading) - 0..3
- `struck`: the letters of exactly those `n_struck` options (an empty array when
  `n_struck` is 0). Never your own `pick`.
- `distractor_quality`: weak | plausible | strong
- `key_from_one_sentence`: true if one sentence alone decides the answer
- `resolving_word_after_blank`: null, or the word within four words after the
  blank that alone settles the item (e.g. a preposition only one option takes)
- `difficulty`: easy | medium | hard against REAL Digital SAT module-2 HARD-route
  Words in Context questions (hard = a strong student must combine two or more
  sentences and reject near-misses that fit most of the passage)
- `above_ceiling`: array of option words a strong 11th-grader would not know
  unglossed from a quality newspaper or textbook (empty if none)
- `antonym_pair`: null, or [word, word] if two options are opposites/near-opposites
- `explicit_kills`: how many of the three wrong options are each contradicted by
  one directly planted phrase (0-3)
- `literal_fit`: null, or the letter of a WRONG option that literally describes
  something the passage reports (for example, the passage describes a pause and a
  wrong option is "interlude"), even if the key is the better reading
- `presupposes_absent`: null, or the exact phrase of the passage that takes for
  granted something the passage never establishes (for example, "the surviving
  drafts" when no drafts are mentioned anywhere)
- `note`: one or two sentences. **If you rate an item easy, or give `n_struck` of 2
  or more, the note must name what gave it away**: the sentence or phrase that hands
  over the answer, or why each struck option fails on a surface read (off the
  passage's topic, wrong collocation with the blank's sentence, one end of an
  opposite pair). The author receives this note verbatim and must rewrite that
  world; "too easy" alone is not usable.

Write ONLY a JSON object keyed by item id to the output path you are given:
{"P01": {"pick":"C","exclusive":true,"second_defensible":null,"n_struck":1,"struck":["A"],"distractor_quality":"plausible","key_from_one_sentence":false,"resolving_word_after_blank":null,"difficulty":"hard","above_ceiling":[],"antonym_pair":null,"explicit_kills":0,"literal_fit":null,"presupposes_absent":null,"note":"..."}, ...}
Every id must be present. Then stop.
