# Options-only solver brief

Read ONLY the blind file named in your task. Do not open any other file (no batch, key, render, or
register files). Each entry is a Standard English Conventions multiple-choice item from the digital
SAT, reduced to its four options: the passage and the question are withheld. For EVERY entry, pick
the option you think is the answer anyway (forced choice, no skips), and label your basis:
"mechanism" if a rule visible in the options decides it, otherwise "guess".

Write JSON {"L01": {"pick": "A", "basis": "guess", "note": "<=15 words"}, ...} covering every id to
the output path in your task. Reply with one line: how many entries you answered.
