# SSAT Reading, whole-passage variants: author brief (pilot 4)

You are writing ONE SSAT (Upper Level) reading unit: **five complete versions of one passage**
and **one fixed set of six five-choice questions**. With this method **nobody, including you,
knows which version students will read.**

## The method

- You write five complete passages (v0..v4) on the same topic, in the same genre, voice and
  length. They share the same people, setting and general arc, and differ in what actually
  happened, what was believed, what was decided, why, and how the writer feels about it.
- You write one set of six questions. Each has five choices (c0..c4), and the same stems and
  choices are used with every version.
- **In version k, choice k is the correct answer to every question.** v0 makes c0 correct for
  all six questions, v1 makes c1 correct for all six, and so on. So each version is one coherent
  "world" in which the six c_k answers are all true together. Design the five worlds first, and
  only then write the prose.
- After all units are frozen, a hash-seeded draw picks ONE version per unit, and that is what
  students read. **No version is "the real one."** All five must be equally natural, complete and
  well written, and a weak version has a 1-in-5 chance of being the one shown.

## The goal of this round: items that make a strong reader THINK

Earlier rounds produced natural prose but EASY items. Readers settled them at a glance for two
reasons, and both are now forbidden:

1. **A wrong option named something the shown passage never mentions.** A reader just struck the
   option that was not in the text.
2. **The passage flatly dismissed the wrong options** ("relief was the wrong word"; "the earlier
   tests failed"). A reader struck whatever the passage waved away.

There was also a pattern ACROSS questions: the right answer was always "what actually happened",
never something believed, planned or implied.

So, in this round:

### A. Every option is about something the passage actually discusses, in EVERY version

- For every question except vocabulary and attitude, **each of the five options must concern
  people, things or events that are present in each of the five versions.** That includes the
  right answer and all four wrong answers, in every version.
- Use the option's own distinguishing words (or plain forms of them: *sell / sold / sale*) in the
  passage, so a reader recognises what the option is talking about. If an option says "a loan
  from the harbor board", the harbor board and the loan are in every version.
- So **no option can be struck because "the passage never mentions that."** A machine check
  confirms this across all five versions.

### B. Wrong options are tempting PARTIAL readings, never things the passage throws away

Make each wrong option something a careful-but-hasty reader could believe from the passage:
- **true of PART of the passage** but not the whole (a main-idea option that fits paragraph 2 only);
- **true of a character's belief, but not the narrator's or author's conclusion** (the uncle is sure
  the bridge failed from flooding; the passage, read closely, shows otherwise without announcing it);
- **an overgeneralisation of a stated detail** (the passage says the plan worked *in the dry months*;
  the option says it worked);
- **a plausible inference one step too far** (the passage supports "she doubted the survey", the
  option says "she rejected the survey").

The passage settles each question through what it shows: sequence, consequence, who turns out to
be right, what the narrator does at the end. **Do not dismiss wrong options outright.** At most ONE
explicit rejection in any paragraph, and at most one negation word per paragraph (not, no, never,
nothing, nor, none, neither, n't, nobody, nowhere). No runs of denials, no "it was not X, nor Y".
No lists of candidates ("Five explanations were offered: …").

### C. Question mix (six questions)

- exactly **1 vocabulary-in-context**
- exactly **1 attitude** (author's or narrator's attitude or tone)
- at least **2 inference**
- at least **1 purpose** (author's purpose, or the structure or function of a paragraph or detail)
- at most **1 detail** (a pure "According to the passage" question)
- at most **1 main-idea**

### D. Vary what KIND of answer is correct, question to question

Across your six questions, the correct answer should not always be "what actually happened". Let
some keys be **what a character believed**, some **a plan that was adopted**, some **an implication
the author draws**, some **why something was done**. (Within one question the five options stay
peers: if the key to question 3 is a belief, all five options of question 3 are beliefs.)

### E. Attitude and tone: the reader infers it

The passage must **never name the attitude**: neither the key's attitude word nor any rival's,
nor obvious forms of them (if the options are "proud", "relieved", "amused", "regretful",
"wary", none of pride/proud, relief/relieved, amuse/amused/amusement, regret/regretful, wary/wariness
appears in any version). Convey the attitude through what the narrator or author says and does.
The five attitudes are of similar intensity toward one object.

## Standing rules (unchanged from earlier rounds)

1. **One narrative or argument, with no asides.** Every sentence belongs to the story or argument.
   Nothing exists only to answer a question.
2. **Choices are peers.** All five choices are the same KIND of thing, share one grammatical frame
   and similar length (longest at most 1.6× the shortest, in characters), each makes one claim, and
   none is hedged, compound or a stance-about-a-claim.
3. **Keys must not be guessable from the options alone.** No choice is the "nicest", most moderate,
   or most sophisticated. Each is equally plausible a priori.
4. **Avoid world knowledge.** Invented names and places; every world equally possible.
5. **Vocabulary-in-context:** 'As it is used in the [Nth] paragraph, the word "X" most nearly means'.
   X appears in the same form, in that paragraph, in all five versions, used in a different sense in
   each. Five short glosses in the same part of speech.
6. **Stems** are identical across versions and must make sense with every version. A stem may not
   contain a word that appears in only one choice of a DIFFERENT question. If a stem names a
   paragraph number, paragraph counts must line up across versions.
7. Label each question `difficulty`: easy, medium or hard. Aim for mostly medium and hard; no easy.

## Shape

- Each version is 300–360 words (hard limits 270–380; longest version at most 1.35× the shortest),
  in 4–5 paragraphs separated by "\n\n" (hard limits 3–6).
- Prose at the level of a published SSAT Upper Level passage.

## Support for every version

For each question and each version k, give:
- `why`: a span copied **verbatim** from version k that makes choice k correct;
- `kills`: for EACH of the other four choices j, an object
  `{"kind": "refute" | "mention", "quote": "<verbatim from version k>", "reason": "<one line>"}`.
  - The quote must be **where version k discusses choice j**, so it contains at least one of choice
    j's distinguishing words (or a plain form of one).
  - `refute`: the quote shows choice j is false here. `mention`: the passage discusses choice j but
    does not support it as the answer (a belief that turns out wrong, a detail true of only part,
    a claim one step beyond what is shown). The reason says why that is not enough.
  - The same quote may serve several kills.

## File format (`*.wv.json`)

```json
{
  "passage_id": "WV4-P01",
  "genre": "narrative fiction",
  "versions": [ {"text": "full passage v0 ..."}, {"text": "v1"}, {"text": "v2"}, {"text": "v3"}, {"text": "v4"} ],
  "questions": [
    {
      "qid": "WV4-P01-1", "kind": "inference", "difficulty": "medium",
      "prompt": "It can most reasonably be inferred that ...",
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

`kind` is one of: `main-idea`, `detail`, `inference`, `vocabulary-in-context`, `attitude`, `purpose`.
qids are `<passage_id>-1` … `-6`, in the order students see them.

## Self-check

Count words per version (`wc -w` is fine), check every `why` and `quote` is copied exactly, and
check rule A by hand: for every non-vocabulary, non-attitude question, read each version and
confirm all five options' distinguishing words appear in it. Then reread every version start to
finish, as a reader who has never seen the other four. Each should read like a real published
passage, and in each, exactly one choice per question should survive careful reading, while the
other four should each tempt a reader who skims.

Do not open any file in `scripts/study-bank/` or run any script there. The orchestrator runs the
mechanical check and will send you any problems it finds.
