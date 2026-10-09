# announcement-v6 SOLVER BRIEF — no-passage attack (TOEFL Listening announcements)

TRIPWIRE: this brief is for announcement-v6 solvers only.

Each item below is a question about a short campus announcement that you
will NOT hear or see. You get only the question and its four options. Your
job is to beat chance: pick the option most likely to be correct using ANY
tell you can find — typicality, real-world defaults, option shape, length,
hedging, specificity, wording echo, which options form a pattern, anything.
Exploit tells aggressively; that is the point of this exercise.

For every item return:
- `pick`: one letter
- `basis`: "confident" if a tell decides it, "guess" otherwise
- `certain_reject`: letters of any options you are CERTAIN (at least 10-to-1)
  are wrong without hearing the announcement — usually empty
- `why`: one short line

Write a JSON object keyed by item id to the output path named in your task:

```json
{ "1": {"pick": "B", "basis": "guess", "certain_reject": [], "why": "..."},
  "2": {"pick": "D", "basis": "confident", "certain_reject": ["A"], "why": "..."},
  "_heuristics": "the tells you used, and how many picks each decided" }
```

Rules: open ONLY the input files named in your task and this brief. Do not
open any other file (no key files, no batch files, no other solver's
output). NEVER run pkill, killall, kill or any process-killing command.
Save the output as soon as you have answered; validate it parses as JSON.
