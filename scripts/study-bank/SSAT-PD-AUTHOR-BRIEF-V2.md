# SSAT Upper Reading, real passages: question-writer brief, v2 (`ssat-reading-pd-pilot-v2`)

You are writing questions for **three real, published passages** (public-domain fiction, poetry,
history or science writing). **You write only the questions. The passage text is fixed: do not edit,
trim or "improve" a single word of it.** For each passage, write **six five-choice questions, one of
each kind**: `main-idea`, `detail`, `inference`, `vocabulary-in-context`, `attitude`, `purpose`.

The reader is a strong student applying to selective US high schools (SSAT Upper Level, grades 8-11).

## Why this matters: what went wrong before

Earlier rounds had an AI write the passages too. Their questions failed on three things, and those
three things are exactly what you are here to get right:

1. **Too easy.** Graders called nearly every item "easy": the answer was stated almost word for word
   in one sentence, and the question only asked the student to find it.
2. **Dead distractors.** Wrong choices were things the passage named and then plainly denied, or
   things it never mentioned. A student could strike each one with a single sentence, or without
   reading at all.
3. **Guessable from the options.** When the passage and questions were hidden, solvers still picked
   the key from the five choices alone, because the key was the most moderate, most qualified, most
   "test-like" option, or the only one that matched the kind of answer the question asked for.

4. **The last round, on real passages like yours, failed on point 3 alone.** Its passages and its
   distractor quality were excellent, but solvers who never saw the passage picked the key 89% of
   the time. Three patterns did it, and this brief exists to stop them:
   - **The key was the one thematic or insightful reading.** The four wrong choices were a literal
     summary, a negative claim, a moral, a mood: obviously lesser readings. A solver just picks the
     smartest-sounding option.
   - **In attitude items the key was the only warm word** among four negative or neutral ones.
   - **Inference keys were the "most perceptive" reading;** distractors were plainly literal or
     plainly negative.

Real prose gives you what the AI passages lacked: density, implication, figurative language, period
diction, and ideas that are connected without being spelled out. **Build difficulty from the text,
not from tricks.**

## Read first

Read `misread/naep-guide-for-agents.md` (path given in your prompt) in full: it is how the national
NAEP reading test builds wrong options that real students choose, with the numbers. The essentials:

- The wrong options that pull students are **built from what the passage really says, placed
  wrongly**: wrong referent, wrong moment, wrong relation, wrong scope, one element false.
- "Plausible, but the passage never discusses it" is NAEP's commonest and **weakest** distractor
  (filler). At most one per item, and a checker refuses options about things the passage never
  discusses at all.
- Hard items get their difficulty from **one strong lure**, not from a long chain of inference.
- **No single-sentence kills.** If one sentence of the passage negates a choice's own words, the choice
  is dead for an upper-level reader. Reject it.

## THE CORE RULE OF THIS ROUND: option parity

**In every item, the four wrong choices are the same KIND of reading as the key.**

- If the key is a thematic, interpretive or insightful reading, **at least two wrong choices are equally
  thematic, insightful and well-phrased readings** that the passage contradicts or does not support.
  A good wrong answer here sounds like what a clever student would write about this passage, and is
  wrong only because of what this passage actually says.
- **No "obviously lesser" options beside an insightful key**: no flat literal summary, no merely
  negative claim, no moral or lesson, no mood word, when the key is an interpretation. If the key is a
  literal fact, the wrong choices are literal facts too.
- **Main idea:** all five choices are plausible main ideas **of a passage on this topic**. Someone who
  knows only the topic (a boy and a dog; a volcano; an old town) must not be able to pick one. Only the
  passage decides.
- **Inference:** all five are inferences of the same depth. If the key infers a feeling or motive, so do
  the wrong choices: different, equally perceptive feelings or motives that the text rules out.
- **Purpose:** all five are functions that part could have, stated at the same level of abstraction.
- **Detail:** all five are paraphrased facts of the same specificity.
- **Test yourself on every item:** cover the passage and read the five choices. If one choice sounds
  smarter, deeper, more balanced, more "literary" or more like an English teacher's answer than the
  others, rewrite the others up to it (or the key down to them). If you could pick the key with the
  passage covered, the item is broken however good it looks with the passage.

**An options-only screen runs before the batch is frozen:** fresh solvers see only the stems and choices.
Any item they can solve is thrown away and rewritten from scratch by someone else. Write items that
survive it on the first try.

## Lure kinds (label every wrong choice of every main-idea, detail, inference and purpose item)

| label | NAEP | what it is |
|---|---|---|
| `stops-short` | H10 | restates what literally happens, but stops before the inference the question asks for |
| `reversed` | H8 | swaps a cause and its effect, or the order of two things the passage really contains |
| `half-right` | X2 | one element right, one wrong (the right person, the wrong reason) |
| `detail-as-whole` | H1 | a real, vivid detail or one paragraph's topic offered as the main idea or purpose |
| `misplaced-detail` | H7 | a real detail attached to the wrong person, thing, moment or relation |
| `character-not-author` | H3 | what a character or a quoted person believes, where the question asks what the author or narrator conveys (or the reverse) |
| `too-far` | H2 | turns a limited or hedged statement into a sweeping one; infers past the text |
| `keyword-match` | H9 | reuses the passage's salient words from near the target spot, but does not answer the question |
| `prior-knowledge` | H6 | what a reader already believes about the topic, which this passage does not say or corrects |
| `figurative-literal` | H5 | takes a metaphor, irony or understatement at face value |
| `true-not-answering` | X1 | true of the passage, but not an answer to this question |
| `unsupported` | X3 | about something the passage discusses, but claims what it never supports (at most ONE per item) |

Each item uses **at least two different labels**. For each wrong choice write one line on **why a real
reader would pick it** ("it is plausible" is not a reason).

## The six kinds

- **Main idea / primary purpose of the passage.** At least one wrong choice is **as broad as the
  key** (a broad statement of the wrong focus, or an over-generalisation), so "pick the broadest
  option" never decides it. Typical lures: `detail-as-whole`, `too-far`, one section's topic as the
  whole.
- **Detail** ("According to the passage", "The passage states that"). **Not a word-match hunt.** Ask
  about something the passage states in a dense or old-fashioned sentence, or states in two places
  that must be put together; write the key as a **paraphrase**, never a lifted phrase. Lures:
  `misplaced-detail` (the words right next to the answer, or a real fact attached to the wrong thing),
  `keyword-match`, `half-right`.
- **Inference** ("It can be inferred", "suggests", "most likely"). The answer is not stated, but the
  text makes it the only reasonable reading. Lures: `stops-short`, `too-far`,
  `character-not-author`, `reversed`.
- **Purpose** (why the author includes a detail, paragraph, image or stanza; how a part functions).
  The five purposes must all be things that part **could** be doing; the item must not be settled by
  the part's topic alone. Lures: `detail-as-whole`, `true-not-answering`, a reversed function.
- **Vocabulary in context.** Stem: `As it is used in the [Nth] paragraph, the word "X" most nearly
  means` (for the poem: `in the [Nth] stanza`, or quote the phrase: `In the phrase "...", the word "X"
  most nearly means`). **Never cite line numbers** (text reflows on a phone).
  - Choose X where the passage uses a familiar word in a **less familiar sense**, or an older sense
    (period prose is full of these). No transparent words, no rare dictionary senses.
  - Five one- or two-word glosses in one frame (same part of speech, each could replace X
    grammatically).
  - **Exactly one sense fits X's sentence.** Never offer two senses that could both fit: a reader who
    does not know the key must be able to name the words in the passage that exclude each wrong sense.
  - Include the word's **commonest everyday sense** when it does not fit (NAEP V1), and one sense that
    fits the passage's mood but not the sentence's grammar or object (V3). A checker asks two readers
    who do not know the key to defend each choice; if either can defend a second, it is sent back.
- **Attitude** (the author's, narrator's or speaker's attitude toward something specific, or the tone
  of a part). **The last round's rule (five different directions) made the key the only warm option
  whenever the true attitude was warm. That rule is gone.** This round:
  - Every choice is **warm** or **cool**, and uses a word from these lists (noun forms count;
    other words may surround it: "fond amusement at the boy's boasting", "respect for the old
    man's skill", "unease about the coming storm"):

    | polarity | allowed words |
    |---|---|
    | warm | admiring, approving, appreciative, proud, respectful, grateful, sympathetic, fond, affectionate, enthusiastic, reverent, tender, amused, playful, humorous, whimsical, delighted, hopeful, compassionate, warm |
    | cool | critical, disapproving, scornful, contemptuous, indignant, irritated, resentful, exasperated, disdainful, annoyed, angry, mocking, uneasy, worried, apprehensive, anxious, wary, fearful, alarmed, regretful, sad, mournful, melancholy, rueful, doubtful, skeptical, sorrowful, troubled, bitter, dismayed, suspicious, disappointed |

    **Not allowed** (neutral or mixed): indifferent, detached, neutral, unconcerned, impassive,
    dispassionate, uninterested, wistful, nostalgic, ironic, wry, bemused, uncertain. Each choice uses
    words of ONE polarity only.
  - **The key is never the only warm (or only cool) option.** At least one other choice shares the
    key's polarity, and at least two choices hold the opposite polarity. Across your three passages,
    vary which side has more options: in some attitude items the key's side has 2 of the 5 choices, in
    others 3 (a checker enforces this across the batch).
  - Because two or three choices now share a polarity, **they must differ in WHAT is felt or toward
    WHOM/WHAT, so the passage decides between them**: e.g. "respect for the miller's skill" vs "fond
    amusement at the miller's vanity", where the passage shows skill and no vanity. Never two
    near-synonyms ("admiring" vs "approving") that the passage cannot separate. A checker asks two
    readers who do not know the key to defend each choice; if either can defend a second, the item is
    sent back.
  - Choose the target (whose attitude, toward what) so that **the passage licenses exactly one
    choice**. Real writers often mix feelings; pick a target where they do not.
  - **None of the attitude words (or a form of them) may appear in the passage.** If the passage says
    "proud", do not offer "proud" or "pride".

## Rules for every item (these are where earlier rounds failed)

1. **The options must not give the key away without the passage.** With the passage covered, all
   five choices should be equally believable as the answer to this stem.
   - **The five choices are peers:** the same kind of thing, the same grammatical frame, one claim
     each, similar length. The longest is **at most 1.5x the shortest** in characters.
   - **They must not differ along the axis the stem names.** If the stem asks why the author mentions
     X, every choice must be a reason an author could have for mentioning X; if the stem asks what the
     narrator realises, every choice must be a realisation. Never make the key the only choice that
     fits the stem's wording.
   - **No option is uniquely hedged, moderate, qualified, "balanced", or sophisticated.** If the key
     says "partly" or "while acknowledging", so do others, or none do.
   - **The key is not the most interesting or most literary claim.** Distractors should be as
     thoughtful as the key (see the core rule: option parity).
   - **No option shares a distinctive word with the stem unless the others do too.**
2. **Exactly one choice survives careful reading.** Each wrong choice is wrong by one checkable fact
   a careful reader can point to. Never "arguably also right". If a careful reader could defend it,
   fix the choice, do not argue for it.
3. **Every wrong choice must tempt someone.** Each should be the answer a student who read too
   quickly, too literally, or with the wrong focus would pick. No absurd options, no options about
   things the passage never discusses.
4. **No single-sentence kills** (see above).
5. **Difficulty from the text.** Aim for medium and hard. Ask about the parts of the passage that
   take real reading: a dense sentence, an implied relation between paragraphs, a figure of speech,
   period diction, a shift in tone, an idea that only emerges from two places. Do not make items hard
   by vague stems, double negatives, or "EXCEPT/NOT" questions.
6. **Vary what kind of answer is correct across the six items**, and across your three passages: do
   not let the key always be the qualified one, always the "mixed feelings" one, always the abstract
   one, or always in the same position of a list. A student who solves one item must not be able to
   answer others from the pattern.
7. **Stems cite paragraphs (prose) or stanzas (poem) by ordinal, or quote a phrase.** Never line
   numbers. A stem may not contain a word that appears in only one choice of a different question
   about the same passage.
8. Use the passage's own facts. Do not rely on outside knowledge of the author, period or topic, and
   do not write a choice that is true in the world but not said in the passage as a key.

## Support for every item

- `why`: a span copied **verbatim** from the passage (at least 3 words) that makes the key correct,
  plus `explanation`: one or two sentences, in plain words, of why the key is right.
- `kills`: for EACH wrong choice (by its index), an object
  `{"lure": "<label>", "quote": "<verbatim from the passage, at least 3 words>", "reason": "<the one
  checkable fact that makes it wrong>", "tempts": "<why a real reader would pick it>"}`.
  For attitude and vocabulary items `lure` may be `""`, but `quote`, `reason` and `tempts` are
  required. The quote is where the passage shows the choice is wrong (or where the misplaced detail
  really belongs); it must not be a sentence that simply negates the choice's own words.

## File format

Write one JSON file containing an array of items for your three passages:

```json
[
  {
    "qid": "PD2-P1-1", "set_id": "PD2-P1", "kind": "main-idea", "difficulty": "medium",
    "prompt": "The passage as a whole is chiefly concerned with",
    "choices": ["...", "...", "...", "...", "..."],
    "answer": 2,
    "why": "verbatim span",
    "explanation": "...",
    "kills": { "0": {"lure": "detail-as-whole", "quote": "...", "reason": "...", "tempts": "..."},
               "1": {...}, "3": {...}, "4": {...} }
  }
]
```

`answer` is the index (0-4) of the key in `choices`. Order the choices however you like: the letters
students see are re-dealt by a seeded shuffle later. qids are `<set_id>-1` through `-6`, in the order
students should see them (usually main idea first or last, the others in passage order).
`difficulty` is your own estimate: easy, medium or hard.

## Self-check before you finish

- Every `why` and `quote` is copied exactly (copy-paste, do not retype).
- Lengths: longest choice <= 1.5x the shortest, every item.
- Cover the passage and read only each item's five choices: could you pick the key? If yes, fix it.
- Read each item against the passage as a careful student: exactly one survives; each of the other
  four would tempt a hurried reader and is wrong by one fact you can point to.
- Option parity: in every item at least two wrong choices are the same kind and depth of reading as
  the key; nothing is "obviously lesser".
- Attitude: every choice warm or cool from the lists; the key's polarity shared by at least one other
  choice; at least two of the opposite polarity; none of the words in the passage.
- Across all 18 items: the key is not usually the longest, not usually the shortest, not usually the
  most qualified.

Do not open any other file in `scripts/study-bank/`, any published test item, or any web page. The
orchestrator runs the mechanical checks and will send you any problems it finds. At the end, state
which files you opened.
