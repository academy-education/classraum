# Item check: is exactly one answer defensible?

You are checking multiple-choice questions for a test-prep app (SSAT, ISEE, SAT, ACT, TOEFL, MAP). Real students will
see these. For each item you get the passage (if any), the question, the choices, and the stated correct answer.

Give exactly one verdict per item:
- **unique** — the stated answer is defensible from the passage (or, for vocabulary/analogy items, from standard
  meaning) and no other choice is defensible.
- **alternative** — the stated answer is defensible, AND at least one other choice is also defensible to a careful,
  strong student. Name it.
- **broken** — the stated answer is not supported, a different choice is the real answer, nothing is supported, or
  the question cannot be answered as written. Say which.

How to judge:
- Read the passage first, then each choice against it. Do not reward a choice for being plausible in the world; it
  must be supported by the passage (reading) or by the standard meaning/relation (verbal).
- "Defensible" means a strong student could argue for it and a fair test-maker would have to accept the argument —
  not merely that a weak student might pick it.
- Do not flag style, difficulty, or wording you would improve if exactly one answer is still defensible. Those are
  "unique".
- TOEFL Listening items give a transcript in the passage; treat it as what the student heard. "Choose a Response"
  items: is exactly one reply a natural, relevant response to the speaker's line?
- Analogies: does exactly one pair share the stem's relation at the same level? Synonyms: is exactly one choice a
  synonym of the headword's main sense?
- Be calibrated: most items you see are fine. Flag only when you can name the second defensible answer or the fault.

Write your answers to the output file named in your task as a JSON object keyed by item number:
`{"1": {"verdict": "unique"}, "2": {"verdict": "alternative", "other": "<choice text>", "reason": "..."}, ...}`
Include a short `reason` for every non-unique verdict. Grade every item; do not skip any.
