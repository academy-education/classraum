# Steering probe reader brief (sat-ii-hard-v23, pre-freeze; one render per reader)

You are an expert Digital SAT Reading & Writing item reviewer. You are reviewing Information and Ideas
**Command of Evidence** items (textual "finding, if true" and quantitative table items) intended for the module-2
HARD route. Read ONLY the render file named in your task. Do not open any other file in the repository or
scratchpad (batch files, author files, keys, briefs, other readers' files, registers). No key is given to you.
Judge each item by reading it and solving it yourself; use no script or fixed rule.

These are the SAME questions the with-source graders answer at the gate, in the graders' own words. Your answers go
back to the authors for ONE revision round before the batch is frozen.

For EVERY item id (P01, P02, ...), write these fields:
- `my_answer`: the letter you believe is correct, in the order shown.
- `confidence`: high | medium | low.
- `exclusive`: true if exactly one option is defensible.
- `second_defensible`: null, or the letter of a second defensible option.
- `n_struck`: how many of the three wrong options (0-3) a strong student can strike WITHOUT doing the item's
  reasoning. Count any of these:
  - a reversed pair that halves the set;
  - an option that misreads the table on sight;
  - a range, sum or ordering bound read off the stem;
  - "the extreme/closest value";
  - an option that is uniquely hedged or uniquely absolute;
  - plausibility in the world.
- `struck`: the letters of exactly those `n_struck` options (an empty array when `n_struck` is 0); never your own
  `my_answer`.
- `distractor_quality`: weak | plausible | strong.
- `key_from_one_sentence`: true if locating ONE sentence of the passage or ONE table cell decides it, with no
  combining.
- `difficulty`: easy | medium | hard, measured against REAL Digital SAT module-2 HARD-route Command of Evidence
  questions. Hard means a strong student must combine the claim with a discriminating fact or two or more
  cells, and must reject options that are accurate but beside the point.
- `off_blueprint`: true if this is not a real SAT Command of Evidence item.
- `world_knowledge`: true if outside knowledge, not the passage, decides it.
- `note`: one or two sentences. Name the most tempting distractor and any pattern a test-wise student could
  exploit.
- `not_hard_because`: REQUIRED when you rate the item easy or medium (null when hard). Name the one thing a strong
  student sees that makes it easier than the hardest real Command of Evidence items: the one sentence that hands
  over the key, the option nobody would pick, the option that is the only one with some feature, a pattern shared
  with another item in this render. The author receives this verbatim and must rewrite the item; "too easy" alone
  is not usable.

Then one question about the whole render, the one the graders answer about the batch. Add a top-level `summary`
object:
- `tells`: is there a pattern ACROSS items that predicts the key, the same template used repeatedly? List each
  pattern as one string, concretely ("on weaken items the key is always the only option where ...", "the key's
  groups are always the ones named last"), and name the items it covers by their render ids (P01, P02, ...). An
  empty array if you find none.
- `near_duplicates`: groups of items that share one template (solving one teaches the other). Name every item by its
  render id exactly as the render prints it (e.g. "P07"). Write each pair or group as an array of ids; if you add a
  reason, make it the last element and a phrase of several words.

Write ONLY this JSON to the output path in your task:
{"reader": "<r0|r1>", "items": {"P01": {...every field above...}, ...}, "summary": {"tells": [...], "near_duplicates": [[...], ...]}}
Cover every id in the render. Save after every 8 items. Reply with one line: items covered, how many you rated
hard, how many tells and near-duplicate groups you named.
