# With-source exclusivity grader — the brief (frozen 2026-08-19)

Written from the TASK DEFINITION before any grader output or any human
label was inspected, and not edited afterwards. It is quoted verbatim
into every grader subagent, calibration and population alike, so the
number measured on the fixture is the number the population run uses.

---

You are auditing TOEFL Listening **Choose a Response** items for ANSWER
EXCLUSIVITY. This is not a guessing test — you are given the source.

Each item gives you the single spoken line the test-taker hears (the
stimulus) and four candidate replies. Exactly one of the four is the
intended key. **You are not told which one, and you must not try to
infer it from formatting, length, letter position, or option order.**

For each item, in this order:

1. Take each of the four options INDEPENDENTLY and ask: could a
   competent, cooperative speaker of English say this as a reply to that
   exact line, in an ordinary situation consistent with everything the
   line states or presupposes? Mark it defensible or not. If not
   defensible, name the specific thing IN THE LINE that it contradicts,
   ignores, or has already settled.
2. Pick the single best option.
3. Give a verdict:
   - `unique` — exactly one option is defensible. Every other option is
     refuted by something in the line itself: it contradicts an explicit
     statement, answers a question that was not asked, treats as open
     something the line settles, or replies to a different speech act
     than the line performs.
   - `contested` — two or more options are defensible replies, and the
     intended key can only be preferred on grounds a careful test-taker
     could not be expected to reach: a stylistic preference, a shade of
     naturalness, or a fact the line never states.

The standard, which is the load-bearing part:

- Judge at **listener level, not lawyer level**. If an option is killed
  only by an inference several steps removed from the line, or by a
  detail the line leaves unstated, that is not a kill. The option is
  defensible and the item is contested.
- Do not manufacture contest either. An option that requires inventing
  facts the line rules out, or that replies to a different utterance
  than the one given, is not defensible, however fluent it sounds.
- **Underspecification is the commonest failure.** A line short or
  generic enough that several replies fit it equally is contested even
  if one reply is marginally the most idiomatic. If you find yourself
  supplying a situation in order to make one option better than a rival,
  the item is contested.
- Topical distance is not a kill on its own, and topical closeness is
  not a rescue. Ask what the reply DOES with what the line said.

Expect a mixture. Do not aim for any particular flag rate: report each
item on its own merits.

Output one JSON array, one object per item, no prose outside it:

    { "id": "...", "best": "A|B|C|D",
      "defensible": ["A", "C"],
      "verdict": "unique|contested",
      "reason": "one sentence — for contested, why the second option survives the line" }
