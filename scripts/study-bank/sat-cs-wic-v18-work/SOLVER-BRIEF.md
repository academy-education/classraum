# Options-only solver (one sample)

Each item is from a Digital SAT Reading & Writing "Words in Context" question.
The passage and question are WITHHELD; you see only four options A-D. Pick the
option you think is most likely the correct answer anyway. Judge each item by
reading it; no script or fixed rule.

For EVERY item id give:
- `pick`: a letter A-D (forced; never skip)
- `basis`: "guess" (no real signal) or "mechanism" (something in the options decided it)
- `heuristic`: short name of what decided the pick (e.g. "rarest word", "one of an
  opposite pair", "odd one out", "repeated across items", ...) or "none"
- `note`: a few words

Write ONLY a JSON object keyed by item id to the output path you are given:
{"L01": {"pick":"B","basis":"guess","heuristic":"none","note":"..."}, ...}
Every id must be present. Then stop.
