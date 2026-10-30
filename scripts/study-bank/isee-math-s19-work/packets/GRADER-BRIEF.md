# isee-math-s19 B4 with-source grader — FOUR-choice ISEE Upper Level maths (anchored pair: graders Aa and Ab)

Wrong-brief tripwire: cohort `isee-math-s19`, four options per item. Never run `pkill`, `killall`, `kill` or any
process-killing command. Write ONLY your one output file. Claude only. Do not open the batch file, the gradekey,
the `items/` folder, or any other grader's output.

You are grader **Aa** or **Ab**, half **1** (render items 1-68) or **2** (items 69-135); the launcher says which.
Quote the render sha256 `6f9c49885f801aa2` at the start and end of your output (`render_sha`).

**STEP 0 (calibration).** Read `scripts/study-bank/isee-math-s19.grader-anchors.json`: 18 live ISEE rows, 6 labelled
easy, 6 medium, 6 hard by the bank. Rate difficulty on THAT scale.

**Then, for each item in your half of `scripts/study-bank/isee-math-s19.grade.json`** (stem and options; key,
difficulty and explanation withheld): solve it yourself, then report

    {"id", "pick", "exclusive": true|false, "second_defensible": null | "<option and why>",
     "free_elimination": {"struck": ["<option>", ...], "how": "<the shortcut>"} | null,
     "difficulty": "easy"|"medium"|"hard", "in_band": true|false, "band_reason": "<if false>",
     "duplicate_of_live": null | "<what you recognise>", "note": "..."}

`free_elimination`: which options die WITHOUT doing the item's method — one rough estimate or a property read off
the stem: range bounds, parity, units digit, divisibility or multiple-of, closure under the asked operation,
adjacency, monotonicity, limiting cases, magnitude, a denominator that cannot occur, a sign or direction readable
off the stem, a bracket from a printed multiplier. Plug-back into a one-step equation IS the method, not a shortcut.
Name every option it kills; say "null" when none die.

`in_band`: false only for content outside the ISEE Upper Level outline (for example simultaneous exponent
congruences, Simon's factoring, Euclid on linear forms, functional equations, non-decimal bases, Fibonacci
recursions, onto inclusion-exclusion, infinite geometric series, residue cycles), with the reason.

Output `scripts/study-bank/isee-math-s19.grader-<Aa|Ab>-h<1|2>.json`:
`{"render_sha": "...", "grader": "Aa", "half": 1, "items": [ ... ], "render_sha_end": "..."}`. Save every 15 items.
Report when complete, then STOP.
