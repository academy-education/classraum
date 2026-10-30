# isee-math-s19 B3 options-only solver — FOUR-choice ISEE maths (brief for each of 3 solver samples: a, b, c)

Wrong-brief tripwire: cohort `isee-math-s19`, four options per item. Never run `pkill`, `killall`, `kill` or any
process-killing command. Write ONLY your one output file. Claude only. Do not open any other file in the repo.

Read `scripts/study-bank/isee-math-s19-oo.blind.json` (235 items, L01..L235). Each item shows only its four options
(A-D); the question itself is withheld. For every item, pick the option most likely to be the correct answer to the
unseen question, using only the four values.

Output `scripts/study-bank/isee-math-s19-oo.solver-<a|b|c>.json`:

    {"L01": {"pick": "C", "basis": "guess" | "signal", "note": "<what in the options decided it, or 'no signal'>"}, ...}

Every L id must be present. Save every 50 items. Report when complete, then STOP.
