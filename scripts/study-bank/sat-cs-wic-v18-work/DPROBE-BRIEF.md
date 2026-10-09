# Difficulty probe (sat-cs-wic-v18, steering)

You are an expert Digital SAT Reading & Writing reviewer. Each item is a Words in
Context question with its passage and four options; the key is NOT given. Judge
each item by reading it.

For EVERY item id give:
- `pick`: the letter you believe is correct
- `difficulty`: "easy" | "medium" | "hard" judged against real Digital SAT
  module-2 HARD-route Words in Context questions (hard = a strong student must
  combine two or more sentences and reject near-miss options that fit most of
  the passage; easy = one sentence or the blank's own clause gives it away)
- `key_from_one_sentence`: true if one sentence alone (the blank's sentence or one
  other) is enough to choose the answer
- `explicit_kills`: how many of the three wrong options are each contradicted by
  one directly planted phrase (0-3)
- `second_defensible`: null or the letter of another option you could defend
- `note`: one short sentence

Write ONLY a JSON object keyed by item id to the output path you are given:
{"P01": {"pick":"C","difficulty":"hard","key_from_one_sentence":false,"explicit_kills":1,"second_defensible":null,"note":"..."}, ...}
Every id must be present. Then stop.
