# SSAT Upper Level Reading: author brief, pilot 5 ("axis-aligned" passage sets)

You are writing ONE reading passage and SIX five-choice questions for a practice SSAT Upper Level
test (students in grades 8-11). Write only to the output path you are given. Do not open any file
under `scripts/study-bank/` and do not run anything there.

## 1. The passage

- **280-380 words**, at least 3 paragraphs, separated by a blank line.
- It must read like real published prose for an educated general reader. No sentences that exist only
  to feed a question. No "runs of denials": at most ONE explicit rejection ("not X but Y", "rather
  than", "was wrong") per paragraph. Do not write the passage as a list of candidates.
- **Your genre and source are given in your task message.**
  - *Newly written:* original prose.
  - *Public domain:* build the passage from a real public-domain text (published before 1931, or a
    work of the U.S. federal government). Retrieve the text yourself with `curl` (gutenberg.org or a
    .gov site). Abridge and adapt: cut, join, and lightly modernise spelling or punctuation. Keep the
    author's voice and facts. Avoid famous, widely anthologised texts. Record `citation`, `url` and a
    plain list of `changes`.

## 2. The question mix (exactly this; it follows the official SSAT 50/50 split)

| kind | count | official category |
|---|---|---|
| `main-idea` | 1 | Main Idea and Content |
| `evidence` | 1 | Main Idea and Content (supporting details) |
| `detail` | 1 | Main Idea and Content (supporting details) |
| `vocabulary-in-context` | 1 | Higher Order and Interpretation |
| `structure` | 1 | Higher Order and Interpretation (author's logic) |
| `attitude` OR `inference` (as told in your task) | 1 | Higher Order and Interpretation |

## 3. THE rule: with the passage covered, all five options must stay equally possible

A student who sees only the question and the five choices must have no way to prefer one.
That holds when **all five options sit in ONE frame and differ only in the part the passage
decides**. It fails when the options differ in kind: one is broader, more nuanced, more hedged,
longer, more "test-like", or does a different job (one concedes, one contrasts, one summarises).

- Same grammatical frame, same length (the key is NOT the longest; within a question the longest
  choice is at most 1.6 times the shortest), same level of generality, same tone.
- **Every option is about something the passage actually discusses**, using the passage's people,
  things, places, numbers or events. No option names anything the passage never mentions (an option
  that can be struck by scanning is an easy item).
- Every wrong option must be refuted by a specific passage sentence (its `kill` quote): the passage
  attaches that material to something else, or says otherwise. A wrong option a careful reader could
  still defend is a broken item.
- The key **paraphrases**; it does not copy a phrase from the passage. Wrong options may reuse passage
  words, attached to the wrong person, thing, time or reason.

### Templates per kind

- **main-idea.** "The passage is mainly concerned with ..." / "Which title best fits ...". Five
  options in one frame, e.g. "how the town came to [X]" with five different X, each X a real topic of
  the passage. The key is what the whole passage is organised around; the others are topics the
  passage really treats, in one paragraph or one sentence each. All five equally specific.
- **evidence.** "Which sentence from the passage best supports the idea that [claim]?" The five
  options are **verbatim sentences** from the passage (copy them exactly, including punctuation),
  similar in length (longest at most 2 times the shortest), all about the same person or thing as
  the claim. State the claim with a referent that only the passage defines (e.g. "the second plan",
  "the uncle's change of mind"), so whether a sentence supports it cannot be judged from the claim and
  sentence alone.
- **detail.** One fixed frame with one or two slots that vary, e.g. "The [count] ... was made in
  [year]" or "[person] first saw the [thing]". Declare the slots: `slots` is a list of slot lists, each
  holding the 5 values used in that slot. **Every slot value appears in the passage, and each value
  appears in exactly one option** (so no value is the "most common" one). Wrong options pair real
  passage values with the wrong referent. Prefer a key that needs two places in the passage (a
  number from one paragraph and its referent or consequence from another).
- **vocabulary-in-context.** `As used in paragraph N, "WORD" most nearly means`. Pick a word the
  passage uses in a less common sense. The five options are single words or very short glosses, all
  the same part of speech, each a genuine meaning of WORD in some context: include the most common
  meaning and **at least three other genuine senses**, so "the unusual sense" does not single out the
  key. The sentence context must rule out every sense but one.
- **structure.** "The [Nth] paragraph mainly serves to ..." or "The author mentions [detail] mainly
  in order to ...". All five options do the SAME job in one frame (e.g. "show why the [X] ...") and
  differ only in the passage element X. Never mix rhetorical acts (explain / concede / contrast /
  summarise) across options.
- **attitude** (fiction). Put the attitude in the stem and vary the OBJECT: "The narrator shows the
  most [suspicion / gratitude / impatience] toward ..." with five people or things from the passage.
  The passage must never name that attitude word: the reader infers it from behaviour.
- **inference.** "It can most reasonably be inferred that ..." with five options in one frame
  differing in a passage element; the key follows from putting two statements together; each wrong
  option is stated or implied of a DIFFERENT element, or is contradicted.

## 4. Difficulty

Aim for medium and hard for a strong upper-level student: the key should need two non-adjacent
sentences, or a non-literal reading (irony, understatement, what a detail implies). An item whose
answer is one sentence restated is easy; at most two of your six may be that.

## 5. Adapt one proven SAT item

Your task message lists SAT Reading and Writing items that tested well. Adapt **at least one** into
your set where it fits SSAT format: a words-in-context item can supply the vocabulary question's
word, context or option logic; a "notes" item whose four options share one frame and vary only in
facts can supply the detail question's frame. Simplify to the SSAT Upper level, use five choices,
and record `adapted_from: {"id": "<source id>", "changes": "<what you kept and what you changed>"}`
on that question.

## 6. Output (JSON, exactly this shape)

```json
{
  "passage_id": "AX1-P0n",
  "genre": "...",
  "source": {"kind": "new"} ,
  "passage": "paragraph one...\n\nparagraph two...\n\nparagraph three...",
  "questions": [
    {
      "qid": "Q1",
      "kind": "main-idea",
      "prompt": "...",
      "choices": ["...", "...", "...", "...", "..."],
      "answer": 2,
      "explanation": "<verbatim passage quote that settles the key>",
      "kills": {"0": "<verbatim quote refuting choice 0>", "1": "...", "3": "...", "4": "..."},
      "slots": [["v1","v2","v3","v4","v5"]],
      "adapted_from": {"id": "...", "changes": "..."}
    }
  ]
}
```

(`slots` only on the detail question; `adapted_from` only where used; for public domain use
`"source": {"kind": "public-domain", "citation": "...", "url": "...", "changes": "..."}`.)
Vary the answer index across questions. At the end of your reply, state whether you opened any file
other than your own output and the public-domain source.
