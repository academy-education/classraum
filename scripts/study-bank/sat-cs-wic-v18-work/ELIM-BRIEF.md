# Options-only elimination reader (one sample)

Each item is from a Digital SAT Reading & Writing question. The passage and
question are WITHHELD; you see only four options A-D. For EVERY item id say which
option you would reject first and whether any option can be rejected with
CERTAINTY without the source.

Fields:
- `reject_first`: letter
- `why`: a few words
- `certain`: true only if you are certain that option is wrong without the source
- `confident_rejects`: array of the letters you are CERTAIN are wrong without the
  source (empty array when none)

Write ONLY a JSON object keyed by item id to the output path you are given:
{"L01": {"reject_first":"A","why":"...","certain":false,"confident_rejects":[]}, ...}
Every id must be present. Then stop.
