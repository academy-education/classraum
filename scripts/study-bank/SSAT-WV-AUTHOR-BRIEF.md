# SSAT Reading, whole-passage variants: author brief

You are writing ONE SSAT (Upper Level) reading unit: **five complete versions of one passage**
and **one fixed set of six five-choice questions**. With this method **nobody, including you,
knows which version students will read.**

## The method

- You write five complete passages (v0..v4) on the same topic, in the same genre, voice and
  length. They share the same people, setting and general arc, and differ in what actually
  happened, what was decided, why, and how the writer feels about it.
- You write one set of six questions. Each has five choices (c0..c4), and the same stems and
  choices are used with every version.
- **In version k, choice k is the correct answer to every question.** v0 makes c0 correct for
  all six questions, v1 makes c1 correct for all six, and so on. So each version is one coherent
  "world" in which the six c_k answers are all true together. Design the five worlds first, and
  only then write the prose.
- After all units are frozen, a hash-seeded draw picks ONE version per unit, and that is what
  students read. A version you write carelessly has a 1-in-5 chance of being shown, and a weak
  shown version gets the item thrown away. **No version is "the real one."** All five must be
  equally natural, complete and well written.

## What makes these items good (and what made earlier ones bad)

1. **Wrong options are things the passage discusses but does not support.** In real SSAT
   passages most wrong answers are possibilities the passage itself raises: an earlier belief,
   someone else's view, a plan considered and dropped, a minor detail that is present but not
   the point. A reader who only matches words should be tempted. **In each version, name at least
   two of the four rival choices for most questions**, woven into the story naturally, and make
   the text settle on the key. An item whose key is the only option the passage mentions is a
   word-match. That is the defect this pilot exists to fix.
2. **No runs of denials.** Do not write "It was not X, nor Y, nor Z", and do not catalogue
   proposals each closed by a denial. Rule rivals out by what happens: a plan is tried and
   abandoned, a guess is overtaken by evidence, a person changes their mind, a detail is shown to
   be minor. **The checker refuses more than ONE negation word in any paragraph** (not, no, never,
   nothing, nor, none, neither, n't, nobody, nowhere).
3. **No lists of candidates.** Never write "Five explanations were offered: …". That device makes
   passages read as constructed. Rivals come up one at a time, where a real writer would bring them
   up.
4. **One narrative or argument, with no asides.** Every sentence belongs to the story or argument.
   Nothing exists only to answer a question. The facts that decide the answers are carried by the
   main line of the passage.
5. **Choices are peers.** All five choices are the same KIND of thing (five causes, five people,
   five senses of a word, five feelings of similar strength). They share one grammatical frame and
   similar length (longest at most 1.6× the shortest), each makes one claim, and none is hedged,
   compound or a stance-about-a-claim. Earlier batches failed because the right answer was visibly
   a different kind of answer.
6. **Keys must not be guessable from the options alone.** Do not make one choice the "nicest",
   most moderate or most sophisticated. Each choice is equally plausible a priori, and each is
   the truth in its own version.
7. **Avoid world knowledge.** Use invented names and places, and make sure each world is equally
   possible.

## The six questions (one each)

Use these stem shapes (live-bank conventions) and adapt the nouns:

1. **main-idea**: "The passage is chiefly concerned with" / "The passage is primarily about".
   Choices differ on what the passage as a whole decides (for example, five ways an old mill was
   finally put to use).
2. **detail**: "According to the passage, …". The answer is stated or plainly described.
3. **inference**: "It can most reasonably be inferred that …" / "The passage suggests that …".
   The version IMPLIES the answer without using the choice's words.
4. **vocabulary-in-context**: 'As it is used in the [Nth] paragraph, the word "X" most nearly
   means'. X appears in the same form, in that paragraph, in all five versions, used in a
   different sense in each. The five choices are five short glosses of X in the same part of
   speech. Context decides, not a definition. (The quoted word must appear in every version; the
   checker enforces this.)
5. **attitude**: "The author's/narrator's attitude toward … is best described as". Five attitudes
   of similar intensity toward one object. Convey the attitude through what is said and done, late
   in the passage, without using the choice's own key word.
6. **purpose**: "The [Nth] paragraph chiefly serves to" / "The mention of … chiefly serves to".
   Choices are concrete functions tied to the content, not abstract rhetorical labels. Note that
   paragraph counts must line up across versions if the stem names a paragraph number.

Stem rules: a stem may not contain a word that appears in only one choice of a DIFFERENT question
(the checker refuses this). Stems are identical across versions, so each must make sense with
every version.

Label each question `difficulty`: easy, medium or hard. Aim for mostly medium, one or two hard,
at most one easy. Because rivals are discussed in the passage, a reader should have to follow the
passage to the point where it settles, not just spot a word.

## Shape

- Each version is 300–360 words (the checker refuses outside 270–380, or a max/min ratio above
  1.35), in 4–5 paragraphs separated by "\n\n".
- Prose at the level of a published SSAT Upper Level passage: memoir, narrative fiction, history,
  science or nature feature, or argument.

## Support for every version (machine-checked)

For each question and each version k, give:
- `why`: a span copied **verbatim** from version k that makes choice k correct;
- `kills`: for EACH of the other four choices j, an object
  `{"kind": "refute" | "mention", "quote": "<verbatim from version k>", "reason": "<one line>"}`.
  - `refute`: the quote shows choice j is false in this version.
  - `mention`: the quote is where the passage names or discusses choice j without supporting it as
    the answer (a dropped plan, someone else's view, a minor detail). The reason says why that
    is not enough.
  The same quote may serve several kills.

## File format (`*.wv.json`)

```json
{
  "passage_id": "WV1-P01",
  "genre": "memoir",
  "versions": [ {"text": "full passage v0 ..."}, {"text": "v1"}, {"text": "v2"}, {"text": "v3"}, {"text": "v4"} ],
  "questions": [
    {
      "qid": "WV1-P01-1", "kind": "main-idea", "difficulty": "medium",
      "prompt": "The passage is chiefly concerned with",
      "choices": ["c0", "c1", "c2", "c3", "c4"],
      "support": [
        { "why": "verbatim from v0",
          "kills": { "1": {"kind": "mention", "quote": "...", "reason": "..."},
                     "2": {"kind": "refute", "quote": "...", "reason": "..."},
                     "3": {...}, "4": {...} } },
        "... support for v1 (keys c1; kills 0,2,3,4) ... through v4 ..."
      ]
    }
  ]
}
```

qids are `<passage_id>-1` … `-6`, in the order students see them.

## Self-check (required)

    node scripts/study-bank/ssat-wv.mjs verify <your file>

Fix it until it prints `verify OK`. The `lexical word-match solver` line should be well below
25/25. If a solver that picks the choice whose words appear in the passage gets nearly every
item, your rivals are not in the text. Then reread every version start to finish, as a reader
who has never seen the other four. Each should read like a real published passage, and in each,
exactly one choice per question should survive. Do NOT run any other subcommand of that script,
and do not open files in `scripts/study-bank/` other than this brief and your own file.
