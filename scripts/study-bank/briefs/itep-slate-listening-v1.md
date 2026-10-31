# Author brief: iTEP SLATE-style Listening, v1 (each author: 4 short dialogues, 1 conversation, 1 lecture = 14 items)

> Status: frozen at the commit that records its sha256 in `itep-listening-v1-work/MANIFEST.json`, before any
> transcript exists. Authors receive THIS file and their own `itep-listening-v1-work/authors/<X>.md` and
> `authors/<X>.plan.json` only. Never the blueprint, the prereg, any pending file, any other author's file,
> `ASSIGNED.json`, any reference PDF, or any published test.

You are writing **practice Listening scripts and questions** for an English proficiency test taken by **middle- and
high-school students learning English as a second language** (ages about 11-18, CEFR A2 to C1). Students HEAR each
script once, read by a text-to-speech voice (a woman's voice and a man's voice for dialogues, one voice for the
lecture). They never see the script. They see the question and four options on screen. Three independent reviewers
will read every script with its questions; **if any one of them finds a second defensible answer, an unsupported key,
a key you can pick without listening, a script that contradicts itself, or a script that does not sound like real
people talking, the whole script and all its questions are thrown out.** A lecture has six questions, so one weak
question loses all six. Quality over speed.

Work only from your own knowledge. Do not search for, open, quote, adapt or imitate any published listening script or
test item from any testing company (iTEP, TOEFL, TOEFL Junior, Cambridge, SLEP, IELTS or any other). No web. Open only
this brief, your two assignment files, the two reference lists named in them, the check script named in them, and
your own output file. No database, no git, no npm/jest.

## 0. The one principle behind every shape rule in this brief

**Reviewers read all your items together, and all the other authors' items too.** If any property of the options
(length, a hedge, the first word, words repeated from the script, which speaker the key favours, the kind of mistake
each distractor makes, how polite or sensible it sounds) is ALWAYS or NEVER true of the key, a student who has seen
a few items can pick keys without listening. In one earlier listening batch the key in all eight lectures said the
same thing in nearly the same words (the lecturer is the committed party), so solving one answered eight. In another,
the key was always the one cooperative reply among a stiff, a rude and a confused one, and blind solvers scored 94%
without hearing anything. In an earlier reading batch one rule forced the same distractor into every set; that
distractor was never the key.

So this brief never requires or forbids a property of the key. Your assignment gives **each item and each script its
own shape**, drawn at random so every property lands on the key at about its natural rate. **Follow the shapes in
your assignment exactly**, even when they feel unusual.

## 1. The scripts

| part | what it is | length | questions | level (CEFR) | difficulty label |
|---|---|---|---|---|---|
| Part 1: Short Conversations | a short exchange between a woman and a man | 2-3 turns, 20-55 words | 1 | A2-B1 | `easy` |
| Part 2: Conversation | a conversation between a woman and a man, about 2-3 minutes spoken | 10-20 turns, 300-420 words | 4 | B1 | `medium` |
| Part 3: Lecture | one speaker, a short classroom talk, about 4 minutes spoken | one block, 480-580 words | 6 | B2-C1 | `medium` for main-idea and detail, `hard` otherwise |

Every question has **four options** and exactly one correct answer. Your assignment fixes each script's setting, the
two speakers' roles, who speaks first, the question kinds and their order, and each item's shape.

**Script format (the audio is generated from it, character for character):**

- Dialogues (Parts 1 and 2): one turn per line, each line starting `W: ` (the woman) or `M: ` (the man), lines
  separated by `\n`. Speakers alternate. Nothing else: no names before the colon, no stage directions, no
  "[laughs]", no sound effects, no parentheses.
- Lecture (Part 3): one block of plain prose, paragraphs separated by `\n\n`, no speaker label. The speaker is "the
  speaker" or "the professor" in questions and options, never "he" or "she", and never states their own name or
  gender.
- **Never write a single capital letter followed by a colon anywhere else** ("Plan B:", "Part A:", "Room C:"). The
  audio splitter would read it as a new speaker. The check script refuses it.
- Write for the ear: no symbols (%, &, /, #, +, =), no abbreviations a voice would misread (write "for example",
  "percent", "Doctor"), times and numbers as a person would say them ("half past three", "about forty").
  No lists or headings.

**Every fact a question asks about is said clearly once,** in a full sentence, not mumbled in a rushed aside. A
speaker may correct themselves ("Thursday, no, sorry, Friday"); then the question's key is the corrected fact, and
both values are clearly spoken.

## 2. Natural speech (reviewers hold scripts that do not sound like people)

- Use contractions the way people speak ("I'm", "it's", "don't", "we'll"). "Let us", "I do not", "It is a pleasure"
  in casual talk are defects.
- Short turns, mostly one to three sentences. People react to each other ("Oh, really?", "Right.", "Hmm, maybe"),
  but sparingly: not every turn opens with a filler.
- Teenagers sound like teenagers and teachers like teachers. Nobody explains what both speakers already know.
- The lecture is "slightly more formal" than the conversations but still spoken: "So today I want to...", "Now,
  you might think...", "Here's the interesting part." No written-essay sentences of 40 words.
- Language level: Part 1 high-frequency words (A2-B1), no idioms. Part 2 B1 vocabulary, at most one idiom, made
  clear by context. Part 3 B2-C1 is fine; explain a less common term when it is first used.

## 3. Content rules

- **Fresh topics.** Check every subject against `existing-transcripts.txt` (the opening of every listening script and
  reading passage already in the bank). Same subject, same central object or same situation = choose another. Your
  own scripts have different subjects from each other.
- **Names.** Most short dialogues need no names. Any person or place you name is invented, is easy to say aloud, uses
  only the initial letters your assignment gives you, is listed in the set's `names` field, never repeats across your
  scripts and never appears in `existing-names.json`. Every capitalised word in the middle of a sentence must be
  listed in `names` or `other_caps` (days, months, languages, real countries, school subjects).
- **History:** invented towns and people in a plausible past. Never attach invented events to a real named place or
  a real person.
- **Science and technology:** real science only, stated carefully; hedge numbers ("about", "roughly"). If you are not
  sure a fact is true, leave it out. A false science lecture is worse than a dull one.
- **Story logic:** check line by line who knows what and when, what each person can see, numbers, days and times.
  Check **every frequency word** (each, every, daily, always, only on) against every schedule in the script. A
  reviewer will look for any two statements that cannot both be true.
- **Authored, specific facts.** The facts the questions ask about belong to THIS conversation or lecture: a
  particular plan, a particular reason, a particular result. They are things a listener could not predict from
  common sense or from how such situations usually go. If the "usual" answer is the key, the item is guessable.

## 4. Question kinds

Write the kinds your assignment gives each script, **in that order**. Prompts are worded differently from each other;
no prompt opening (first four words) may appear more than three times in your file. Questions name speakers as "the
woman", "the man", "the speaker" or "the professor".

| kind | what it asks | how to build it |
|---|---|---|
| `main-idea` | what the conversation / lecture is mainly about; the speakers' main problem | see rule M and the item's shape |
| `detail` | a fact stated in the script ("What does the woman say about ...?") | the key **paraphrases** what is said; distractors may reuse script words in a wrong relation |
| `inference` | what the man / woman means or implies; what can be inferred about a speaker | the key needs **two** places in the script put together, or a meaning not said in so many words; never one line restated |
| `intent-next` | what a speaker will probably do next, intends to do, or what will happen next | the script states or clearly sets up the plan; every distractor is something the script rules out |
| `purpose` | why a speaker mentions X / why the speaker says "..." | the prompt names WHOSE purpose (the woman's, the speaker's); every option names a role in the same frame ("to show ...", "to explain ...", "to suggest ...") |
| `relationship` | who the speakers most likely are, or where they most likely are | at least two options must fit the topic of the talk; only what is said (not the topic) decides |
| `attitude` | how a speaker feels about, or what they think of, something | the four options are opinions about the same thing; the key is shown by words in the script, not by tone of voice (the voice is synthetic and flat) |

## 5. The rules every item must pass (each comes from defects reviewers found in earlier batches)

**R1. Exactly one defensible answer.** For every distractor, write the rationale that kills it **by quoting the
script**. If you cannot point at words that make it wrong, it is a second answer: rewrite it. "The script does not
mention it" is a valid kill only for `detail` items, and only when the script covers the topic and says something
else. For `inference`, `intent-next` and `attitude` items every distractor must be **contradicted** by a line, not
merely unmentioned.

**R2. The key is supported by the script, not by the world.** `why` is a verbatim substring of the script (inside one
turn, without the `W: ` / `M: ` label) that supports the key. `inference` items also need `why2`, a second verbatim
substring from a different sentence. The explanation may say nothing the script does not say.

**R3. No key you can choose without listening.** Cover the script and look at the prompt and four options together.
If one option is obviously the sensible, polite, cooperative, true-in-general, positive or "lesson" answer, or one or
more options are silly, rude, stiff or impossible in the real world, a student can pick the key blind: rewrite.
**All four options must stay about equally believable with the script covered.** Never build a distractor out of tone
(an over-formal reply, a rude reply, a reply that wrongly treats the problem as solved): all four options are in the
same plain register.

**R4. Options in one frame.** Within an item, all four options have the same grammatical shape and talk about the same
kind of thing, and they differ along the point the question asks about. No option is the only one with a hedge (may,
might, some, probably), an absolute (all, always, only, never), a contrast word (but, although), a semicolon or dash,
or a number. If the key has such a feature, give it to at least one distractor too.

**R5. Key length as assigned.** Each item has a `key length`: `longest`, `shortest` or `middle` (neither longest nor
shortest). In every item the length ratio (longest option / shortest, in characters) is at most 1.5. Adjust by changing
distractors or adding real content, never by making the key vague.

**R6. Script words as assigned.** Each item has a `script words` shape: `key-most` (the key repeats at least as large a
share of its content words from the script as any distractor does) or `key-not-most` (at least one distractor repeats
a larger share of its content words from the script than the key does). The check script measures it.

**R7. No item answers another.** Questions on one script ask about different moments. No option of one item may state
or rule out the answer to another item on the same script. No prompt may give away another item's key. No two keys in
your file share a four-word run.

**R8. Speakers and who is right, as assigned.** Each dialogue and conversation has `opens` (who speaks first) and
`prevails`: `woman` (the woman's view, plan or suggestion is the one that holds or is followed), `man`, or `neither`
(they settle on a third option, or the matter is left open). Each Part 1 and Part 2 item that names a speaker has
`about: the woman` or `about: the man`: the prompt asks about that speaker. Each lecture has a `stance`: the speaker
`supports` the idea discussed, `rejects` it, or says the question is `unsettled`, and an `idea shape`. Build the script
so the assigned outcome is clear but is not the obvious one from the situation alone.

**M. Main-idea items.** Each main-idea item has a `whole-script options` count: `1` (only the key covers the whole
conversation or lecture; the three distractors are one moment's detail, a misreading, a point mentioned in passing),
`2` (the key and one distractor are both whole-script summaries, and that distractor gets the outcome or the central
claim wrong), or `4` (all four are whole-script summaries at the same width, three with the outcome or claim wrong).
All four options are about the script's subject. A whole-script distractor must be **wrong, not just too general**.

**R9. Time words in stems.** A stem like "by the end of the conversation" or "at first" needs distractors that are
false at that time, not merely true at another time.

**R10. No pattern across your items.** Before you hand in, lay all your items side by side and ask: if a student had
already seen my other items, could the pattern pick this key? Look at what the key is in each item (the longest? the
one that agrees with the speaker who talks most? the most cooperative? the one with words from the script? the most
positive? the one that names a change or a result?). If any such property is true of nearly all your keys or of none
of them, change items until it is mixed. Vary your prompt wording and the way each distractor goes wrong; do not
reuse one recipe.

## 6. Output

Write the output file named in your assignment, one JSON object:

```json
{
  "author": "X",
  "sets": [
    {
      "set_id": "ITL1-X-D1",
      "part": 1,
      "setting": "as assigned",
      "speakers": {"W": "role as assigned", "M": "role as assigned"},
      "title": "short title (never heard by students)",
      "transcript": "W: ...\nM: ...\nW: ...",
      "names": ["every invented person or place name"],
      "other_caps": ["Monday", "English"],
      "items": [
        {
          "qid": "ITL1-X-D1-1",
          "kind": "detail",
          "difficulty": "easy",
          "prompt": "...",
          "choices": ["...", "...", "...", "..."],
          "correct_answer": "exactly one of the choices",
          "why": "verbatim script substring supporting the key (no W:/M: label)",
          "why2": "inference items only: a second verbatim substring",
          "explanation": "\"<key text>\" is correct: <reason quoting the script>",
          "distractor_rationales": [
            {"choice": "<distractor text>", "lure": "detail | misreading | contradicted | wrong speaker | wrong time | ...", "reason": "\"<distractor text>\" <why it is wrong, quoting the script>"}
          ]
        }
      ]
    }
  ]
}
```

For the lecture, `speakers` is `{"S": "role as assigned"}` and `transcript` has no labels. Sets in the order your
assignment lists them; qids are `<set_id>-1` ... `<set_id>-n` in question order. Exactly three distractor rationales
per item, each starting with its choice in double quotes. Any other quotation inside an explanation or rationale must
be verbatim script text. Never name an answer letter ("choice B"). Put the key anywhere in `choices`; letters are
reshuffled for every student.

## 7. Before you hand in

Run the check script named in your assignment on your own file until it prints `PROBLEMS 0`. Then read every script
ALOUD in your head once, at speaking speed: would a student who heard it once, with no text, catch each tested fact?
For every item, cover the script and do R3 honestly; reread every distractor rationale and confirm it quotes a line
that kills it; and do R10 across all your items.

Reply with: your titles and subjects, the check script's summary lines, and the one or two items you are least sure
have exactly one defensible answer, with why. Do not claim `PROBLEMS 0` unless you ran the script and saw it.
