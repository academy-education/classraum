# Options-only solver (sat-ii-hard-v21, stage 2)

Each item is a Digital SAT Reading & Writing "Command of Evidence" question. Its passage, table and question
have been WITHHELD; you see only the four options A-D. One option is correct for a passage and question you
cannot see. Pick the option you think is most likely correct anyway, using whatever you can infer from the
options alone.

For EVERY item id in the input file, give:
- `pick`: the letter you choose.
- `basis`: "reasoned" if you had a real reason from the options, otherwise "guess".
- `heuristic`: a short name for the rule you used ("none" if none), e.g. "odd one out", "one of a reversed
  pair", "most hedged", "most specific comparison".
- `note`: a few words.

Write ONLY a JSON object keyed by item id to the output path you are given:
`{"L01": {"pick":"C","basis":"guess","heuristic":"none","note":"..."}, ...}`
Every id must be present. Do not open any other file. Then stop.
