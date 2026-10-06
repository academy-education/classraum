# Author brief: one grades 5-7 reading unit, four versions (MAP pilot 3)

You are writing ONE reading unit for a grades 5-7 English reading diagnostic
aligned to Common Core ELA (RL/RI.5-7): **four complete versions of one
passage** and **one fixed set of five four-choice questions**. With this
method **nobody, including you, knows which version students will read.**

Work only from your own knowledge. Do not search for, open, quote or imitate
any published test passage or item. Do not open any file in
`scripts/study-bank/` or run anything there. The orchestrator runs a
mechanical check and will send you any problems it finds.

## The method

- Write four complete passages (v0..v3) on the same topic, in the same genre,
  voice and length. They share the same people, setting and general arc, and
  differ in what actually happened, what was believed, what was decided, why,
  and how the narrator or writer feels about it.
- Write one set of five questions. Each has four choices (c0..c3); the same
  stems and choices are used with every version.
- **In version k, choice k is the correct answer to every question.** v0
  makes c0 correct for all five questions, v1 makes c1 correct for all five,
  and so on. Each version is one coherent "world" in which the five c_k
  answers are all true together. **Design the four worlds first, then write
  the prose.**
- After freezing, a hash-seeded draw picks ONE version, and that is what
  students read. No version is "the real one". All four must be equally
  natural, complete and well written.

## Items that make a grade 6-7 reader THINK

Earlier rounds of this method produced natural prose but EASY items, for two
reasons, both now forbidden:

1. **A wrong option named something the shown passage never mentions.** A
   reader just struck the option that was not in the text.
2. **The passage flatly dismissed the wrong options** ("relief was the wrong
   word"; "the earlier tests failed"). A reader struck whatever was waved away.

There was also a pattern ACROSS questions: the right answer was always "what
actually happened", never something believed, planned or implied.

### A. Every option is about something every version discusses

For every question except vocabulary and attitude, **each of the four options
must concern people, things or events present in each of the four versions**,
in the option's own distinguishing words (or plain forms: *sell / sold /
sale*). A machine check confirms this across all four versions, so no option
can be struck because "the passage never mentions that".

### B. Wrong options are tempting PARTIAL readings

Each wrong option is something a careful-but-hasty grade 6-7 reader could
believe from the passage:
- **true of PART of the passage** but not the whole;
- **what a character believes**, but not what the passage shows;
- **an overgeneralisation** of a stated detail;
- **an inference one step too far.**

The passage settles each question through what it shows: sequence,
consequence, who turns out to be right, what the character does at the end.
**At most ONE negation word per paragraph** (not, no, never, nothing, nor,
none, neither, n't, nobody, nowhere). No runs of denials, no lists of
candidates being ruled out.

### C. Question mix (five questions)

- exactly **1 vocabulary-in-context**
- exactly **1 theme** (literary unit) **or central idea** (informational unit)
- at most **1 summary** ("Which is the best summary of the passage?")
- **1-3 inference**
- **1-3** of: **point of view** (how the narrator or a character sees
  something), **attitude** (narrator's or author's attitude), **purpose**
  (why the author includes a detail or paragraph), **structure** (how the
  passage or a part of it is organised)

### D. Vary what KIND of answer is correct across questions

Some keys a character's belief, some a choice that was made, some an
implication, some a reason. Within one question the four options stay peers.

### E. Attitude: the reader infers it

If you write an attitude question, no version names any choice's attitude
word or an obvious form of it (if the options are "proud", "worried",
"amused", "doubtful", none of pride/proud, worry/worried, amuse/amused,
doubt/doubtful appears in any version).

## Standing rules

1. **One story or one explanation, no asides.** Every sentence belongs to it;
   nothing exists only to feed a question.
2. **Choices are peers:** same kind, one grammatical frame, similar length
   (longest at most 1.6x the shortest, in characters), one claim each, no
   hedges, no absolutes beside qualified options.
3. **Not guessable from the options alone.** No choice is the "nicest", most
   moderate, most literary-sounding or most complete.
4. **No world knowledge.** Invented names and places; every world equally
   possible in real life.
5. **Vocabulary-in-context:** 'As it is used in paragraph N, what does the
   word "X" most likely mean?' X appears in the same form, in that paragraph,
   in all four versions, in a different sense in each. Four short glosses, one
   part of speech, all genuine meanings of X. Paragraph counts must line up
   across versions when a stem names a paragraph.
6. **Stems** are identical across versions and make sense with every version.
   A stem may not contain a word that appears in only one choice of a
   DIFFERENT question.
7. Label each question `difficulty` easy / medium / hard for the stated grade.
   Aim for medium and hard; no easy.

## Shape and level

- Each version **220-290 words** (hard limits 190-320; longest at most 1.3x
  the shortest), in **4-6 paragraphs** separated by "\n\n" (hard limits 3-7).
- Grade level: Flesch-Kincaid between 5 and 8 for every version (hard limits
  4.0-9.0). Plain sentences, grade-appropriate vocabulary; the difficulty
  comes from what the reader has to infer, not from long words.

## Support for every version

For each question and each version k:
- `why`: a span copied **verbatim** from version k that makes choice k
  correct;
- `kills`: for EACH of the other three choices j,
  `{"kind": "refute" | "mention", "quote": "<verbatim from version k>", "reason": "<one line>"}`.
  The quote is **where version k discusses choice j**, so it contains at least
  one of choice j's distinguishing words. `refute`: the quote shows j is false
  here. `mention`: the passage discusses j but does not support it as the
  answer (a belief that turns out wrong, a detail true of only part, a claim
  one step too far).

## File format (`*.wv.json`)

```json
{
  "passage_id": "MAPWV-P01",
  "text_type": "literary",                 // or "informational"
  "genre": "narrative fiction",
  "grade_target": 6,
  "target_band": "RIT 190-199",
  "versions": [ {"text": "v0 ..."}, {"text": "v1"}, {"text": "v2"}, {"text": "v3"} ],
  "questions": [
    {
      "qid": "MAPWV-P01-1", "kind": "theme", "difficulty": "medium",
      "prompt": "Which statement best expresses a theme of the passage?",
      "choices": ["c0", "c1", "c2", "c3"],
      "support": [
        { "why": "verbatim from v0",
          "kills": { "1": {"kind": "mention", "quote": "...", "reason": "..."},
                     "2": {"kind": "refute", "quote": "...", "reason": "..."},
                     "3": {"kind": "mention", "quote": "...", "reason": "..."} } },
        "... v1 (keys c1; kills 0,2,3) ... through v3 ..."
      ]
    }
  ]
}
```

`kind` is one of: `theme`, `central-idea`, `summary`, `inference`,
`point-of-view`, `attitude`, `purpose`, `structure`, `vocabulary-in-context`.
qids are `<passage_id>-1` ... `-5`, in the order students see them.

## Self-check

Count words per version (`wc -w`), check every `why` and `quote` is copied
exactly, and check rule A by hand. Then reread every version start to finish
as a grade 6 reader who has never seen the other three: it should read like a
real published passage, exactly one choice per question should survive careful
reading, and each of the other three should tempt a reader who skims. At the
end, state whether you opened any file other than this brief and your own
output.
