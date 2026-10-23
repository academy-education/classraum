# Elimination reader brief

Read ONLY the blind file named in your task. Do not open any other file. Each entry is a digital SAT
Standard English Conventions item reduced to its four options (passage and question withheld).
For EVERY entry record:
- reject_first: the option you would reject first
- why: one sentence
- certain: true only if you are certain that option is wrong whatever the hidden sentence says
- confident_rejects: the list of ALL letters you are certain are wrong whatever the hidden sentence
  says (empty list if none). Only include a letter if no possible sentence could make it correct.

Write JSON {"L01": {"reject_first": "C", "why": "...", "certain": false, "confident_rejects": []}, ...}
covering every id to the output path in your task. Reply with one line: how many entries you covered.
