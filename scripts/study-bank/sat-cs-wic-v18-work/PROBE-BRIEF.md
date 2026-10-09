# Options-only probe (sat-cs-wic-v18, steering)

You read multiple-choice option sets from Digital SAT "Words in Context" items. The
passage and question are WITHHELD; each item shows only four options A-D. You are
not told the answers. Judge each item by reading it; no script or fixed rule.

For EVERY item id in the input file, give:
- `test_word`: the letter of the option that is the rarest / most "SAT-test-like" word
- `antonym_pole`: if any two options are opposites or near-opposites, the letter of
  the one you would bet is the answer; otherwise the letter you would guess anyway
- `odd_one_out`: the letter of the option that differs most from the other three
  (meaning, polarity, register or part of speech)
- `most_specific`: the letter of the most specific / precise option
- `opposite_pairs`: array of [word, word] pairs of options that are antonyms or
  near-opposites (empty array if none). Be strict but honest: name real opposites
  (e.g. integral/optional, uniform/composite), not merely different words.
- `polarity_breach`: true if three options share an evaluative polarity (all
  positive or all negative) that the fourth lacks, else false
- `above_ceiling`: array of option words a strong 11th-grader would NOT know
  unglossed from a quality newspaper or textbook (technical terms, GRE-only words);
  empty if none

Write ONLY a JSON object keyed by item id to the output path you are given:
{"P01": {"test_word":"B","antonym_pole":"A","odd_one_out":"C","most_specific":"B","opposite_pairs":[],"polarity_breach":false,"above_ceiling":[]}, ...}
Every id must be present. Then stop.
