# World probe (sat-cs-wic-v26, steering; one render per reader)

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
- `literal_fit`: null, or the letter of a WRONG option that literally describes
  something the passage reports (for example, the passage describes a pause and a
  wrong option is "interlude"), even if the key is the better reading
- `presupposes_absent`: null, or the exact phrase of the passage that takes for
  granted something the passage never establishes (for example, "the surviving
  drafts" when no drafts are mentioned anywhere)
- `note`: one short sentence. **If you rate an item easy, the note must name the
  sentence or phrase that gave the answer away.** The author receives this note
  verbatim and must rewrite that world; "too easy" alone is not usable.

Write ONLY a JSON object keyed by item id to the output path you are given:
{"P01": {"pick":"C","difficulty":"hard","key_from_one_sentence":false,"explicit_kills":1,"second_defensible":null,"literal_fit":null,"presupposes_absent":null,"note":"..."}, ...}
Every id must be present. Then stop.
