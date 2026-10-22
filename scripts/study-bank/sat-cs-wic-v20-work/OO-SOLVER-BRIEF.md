# Options-only solver (sat-cs-wic-v19, stage 2)

Each item is a Digital SAT "Words in Context" question whose passage and question have been WITHHELD. You see only
the four options A-D. One option is the correct word for a blank in an academic passage you cannot see. Pick the
option you think is most likely correct anyway, using whatever you can infer from the options alone.

For EVERY item id in the input file, give:
- `pick`: the letter you choose
- `basis`: "reasoned" if you had a real reason from the options, else "guess"
- `heuristic`: a short name for the rule you used ("none" if none), e.g. "most precise word", "odd one out", "one of an opposite pair", "most common academic sense"
- `note`: a few words

Write ONLY a JSON object keyed by item id to the output path you are given:
{"L01": {"pick":"C","basis":"guess","heuristic":"none","note":"..."}, ...}
Every id must be present. Do not open any other file. Then stop.
