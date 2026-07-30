# TOEFL iBT (January 2026) — item-authoring spec

Reference for authoring TOEFL practice items into `study_item_bank` (family
`toefl`). Hand this file to a Claude authoring subagent; it produces a JSON
array of items that the QC + insert pipeline (see TOEFL-RUNBOOK.md) verifies
and loads. Items render in the TOEFL TestSession and are graded by the submit
route / AI rubric grader, so **the JSON shape must be EXACT**.

Global rules for every item type:
- All items HARD difficulty, first-year-undergraduate accessible.
- Output ONLY a JSON array to the assigned file. No prose, no markdown fences.
- Plain text only — NO markdown, NO LaTeX, NO `**bold**`. Escape JSON strings.
- `correct_answer` (when used) MUST be byte-identical to one entry in `choices`.
- 4 choices for MC; vary the correct position across A/B/C/D (don't cluster on A).
- **Vary the correct answer's LENGTH too — this is not the same rule as position,
  and getting position right is what let this one hide.** An audit on 2026-07-29
  found the key was the uniquely longest of four options in 72.6% of banked TOEFL
  Listening items and 57.4% of Reading, against 25% by chance, while every
  position histogram read as healthy. A candidate who ignored the passage and
  always picked the longest option scored about two thirds.
  The cause is how a correct answer gets WRITTEN: the key has to be fully
  accurate and hedged where the source hedges, so it grows, while a distractor
  gets clipped the moment it is wrong enough. Left alone the habit is automatic.
  Where a distractor reads clipped next to a fully-worded key, EXPAND THE
  DISTRACTOR — give it the concrete detail that would tempt a student who
  half-understood — rather than trimming the key. A wrong answer must be wrong
  on its content, never on its brevity. Keep all four within roughly the same
  band (no option more than ~1.5x the shortest).
  State the goal as a HISTOGRAM, not a direction. Rank the four options by
  length, 1 = longest to 4 = shortest, and note where the key sits. Across the
  batch that should land near 25% at EACH rank — so about a quarter of your
  keys are the longest option and about a quarter are the SHORTEST. Both are
  correct outcomes; a key that is never short is its own tell.
  Do NOT phrase this to yourself as "aim for 2nd or 3rd". That exact wording
  drove the first repair wave on 2026-07-30 and 77% of 210 items came back at
  rank 2 — the giveaway moved rather than went away, and no per-item check
  could see it, because a distribution is not a property of one item.
  Guarded by `scripts/verify-answer-key-spread.ts`, which fails a cohort above
  40% on longest OR shortest — run it before inserting.
### The hedge/absolute asymmetry — and why the fix is on the DISTRACTOR side

Measured against 462 official College Board Digital SAT items and 314 ETS
TOEFL items (2026 practice tests, teacher's resources, released sets),
because we had no released items in the repo and the reference rate could
not be guessed:

    "pick the only hedged option" scores, on the OFFICIAL exams
      SAT Reading & Writing   21%  — key 20.7% / distractor 21.0%, PARITY
      TOEFL Listening         23%  — key  6.9% / distractor 12.0%, keys
                                     hedge LESS than distractors
      TOEFL Reading           47%  — key 23.8% / distractor 11.2%, a real
                                     tell on the real exam

So "a correct answer hedges because it must be defensible" is true for
TOEFL Reading and false everywhere else. Do not aim every section at 25%,
and do not aim SAT keys at "more hedged".

**Our keys are fine.** Every key-side deviation from official is
statistically insignificant. The gap is entirely in the distractors:

    absolutes (all / every / always / never / only / must / cannot)
      official distractors    1.4 - 6.5% of options
      ours                   11 - 19%

That is not merely a tell. An absolute is the single most-taught
elimination cue on both exams, so roughly one wrong answer in five is
currently removable without reading the passage — which makes our items
EASIER than the real thing, not just more guessable.

What to do when authoring:

- **Vary how a distractor is wrong.** Overstatement is one way. The others
  are: right claim about the wrong paragraph, reversed causation, the
  answer to a question that was not asked, a true statement that does not
  address the prompt, the popular misconception the passage corrects.
  Reach for overstatement roughly as often as official items do — rarely.
- **Distractors may hedge.** Official SAT distractors hedge as often as its
  keys do. A hedged wrong answer is a better trap than an absolute one,
  because it cannot be eliminated on form.
- **The target is the key/distractor RATIO, not a level.** Cutting
  distractor absolutes alone would flip the SAT absolute tell from 13.9% to
  36.8%, because our keys carry absolutes at 10.8% against an official
  6.5%. Move both sides toward the official ratio or neither.
- **Leave TOEFL Reading hedges alone.** Ours already match ETS there.

Full working, corpora and per-section z-scores: `docs/plans/hedge-word-tell.md`.

- Ensure topical VARIETY within a batch — never reuse a scenario/topic twice.
  EXCEPTION: `speaking_interview`. On the real exam one interview = one topic,
  so the 4 questions of a single interview set MUST share a scenario and topic.
  Variety applies ACROSS interview sets (each set gets its own topic), never
  WITHIN one.

The bank `section` + `item_type` per type:
| section    | item_type            | keyed? | audio? |
|------------|----------------------|--------|--------|
| reading    | multiple_choice      | yes    | no     |
| reading    | fill_in_blanks       | yes    | no     |
| listening  | multiple_choice      | yes    | yes    |
| speaking   | speaking_repeat      | ref    | yes    |
| speaking   | speaking_interview   | no     | yes    |
| writing    | arrange_words        | yes    | no     |
| writing    | writing_email        | no     | no     |
| writing    | writing_discussion   | no     | no     |

---

## READING — Academic / Daily-Life MC (section reading, type multiple_choice)

Two task styles, tag each in the prompt:
- **Academic** `[Academic — <Field>]`: a 150–180w intro-undergraduate passage
  (biology, art history, psychology, geology, business, linguistics). One passage
  → up to 5 questions sharing a `passageGroupId`: main idea, vocab-in-context,
  factual detail, negative-factual (EXCEPT/NOT), inference/purpose.
- **Daily Life** `[Daily Life — <Kind>]`: a 40–90w everyday text (campus notice,
  flyer, email, job ad). 2–3 questions: literal detail, purpose, inference, next-step.

Distractors: (1) info from a different sentence, (2) synonym-restated but a key
qualifier dropped, (3) true-in-general but contradicts the passage. Never
keyword-lookup-solvable.

```json
{ "type":"multiple_choice", "prompt":"[Academic — Biology] ...?",
  "choices":["...","...","...","..."], "passage":"<passage text>",
  "difficulty":"hard", "explanation":"1 sentence grounded in the passage.",
  "correct_answer":"<exact choice>", "passageGroupId":"<same id per passage>",
  "distractor_rationales":[{"choice":"<wrong>","reason":"..."}],
  "blanks":null, "graphic":null, "correct_answers":null, "acceptable_answers":null }
```

## READING — Complete-the-Words (section reading, type fill_in_blanks)

One ~70–100w academic paragraph whose 2nd–3rd sentences contain 10 inline
`[N]` placeholders, each masking the END of a word (e.g. `Igne[1]` → answer
`ous`). Each blank separately scored.

```json
{ "type":"fill_in_blanks", "prompt":"[Complete the Words] Fill in the missing letters in each word.",
  "passage":"Geology is ... Igne[1] rocks form ... solid[2] of magma ...",
  "blanks":[{"id":1,"answer":"ous","alternates":null},{"id":2,"answer":"ification","alternates":null}, ...10 total],
  "difficulty":"hard", "explanation":"1 sentence on the passage topic.",
  "choices":[], "correct_answer":"", "passageGroupId":null,
  "graphic":null, "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] }
```

---

## LISTENING (section listening, type multiple_choice)

One spoken **transcript** → 3–5 MC questions sharing a `passageGroupId`. Mix
three recording kinds:
- **Conversation** — two speakers `A:` / `B:`, campus/service situation, 140–220w.
- **Announcement** — one speaker, informational, 140–200w.
- **Academic talk** — one professor, intro-level, 160–240w.

Tag the prompt `[Conversation — <Kind>]` / `[Announcement — <Kind>]` /
`[Academic Talk — <Field>]`. ≥1 inference/purpose question per recording.
The item must be answerable ONLY from the transcript, never world knowledge.

**The transcript is spoken via TTS** — put it in `passage` prefixed exactly
`"Transcript: "`. Conversations MUST use `A:` / `B:` labels (they drive
per-speaker voices). No audio is stored; it's generated on first play and
should be pre-warmed after insert (see runbook).

```json
{ "type":"multiple_choice", "prompt":"[Academic Talk — Astronomy] ...?",
  "choices":["...","...","...","..."],
  "passage":"Transcript: <full transcript; A:/B: for conversations>",
  "difficulty":"hard", "explanation":"1 sentence grounded in the transcript.",
  "correct_answer":"<exact choice>", "passageGroupId":"<same id per recording>",
  "distractor_rationales":[{"choice":"<wrong>","reason":"..."}],
  "blanks":null, "graphic":null, "correct_answers":null, "acceptable_answers":null }
```

---

## SPEAKING — Listen-and-Repeat (section speaking, type speaking_repeat)

A SHORT sentence (8–12 words, top-2000 vocabulary, one main clause + at most one
simple extension — a time/place phrase or a short because/so/when tail; no idioms,
no nested clauses). The student hears it and repeats it. EXEMPT from hard framing
— keep the 8–12 word band regardless. Spoken via TTS; `passage` holds the script.

```json
{ "type":"speaking_repeat", "prompt":"[Listen and Repeat] Type the sentence exactly as you hear it.",
  "passage":"Audio script: \"She missed the lecture because her train was late this morning.\"",
  "correct_answer":"She missed the lecture because her train was late this morning.",
  "difficulty":"hard", "explanation":"1 sentence on the structural challenge.",
  "choices":[], "blanks":null, "graphic":null, "passageGroupId":null,
  "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] }
```

## SPEAKING — Interview (section speaking, type speaking_interview)

Author interviews in SETS OF 4, never as loose questions — on the real exam all
4 items are one simulated interview on one topic (rubric-graded, no key). The
question is spoken via TTS (the `[Interview]` tag is stripped before TTS).

Premise first, questions second:

1. Invent ONE scenario premise — an academic/campus framing device around an
   EVERYDAY topic, second person, 1–2 sentences, no specialist knowledge
   ("You have agreed to take part in a university research study about how
   students get to and from campus…").
2. Derive exactly 4 questions from it, ALL on the premise's topic, escalating in
   this fixed order (ETS: "difficulty increasing across the task"):
   1. personal experience or fact about the topic
   2. personal habit/preference about the topic, with a reason
   3. opinion on a contested general claim about the topic
   4. policy / prediction / institutional recommendation about the topic

Every question must stand alone — answerable without having heard the earlier
answers. It is a sequence, not a dependency chain; the section is linear, never
branching, so never write "as you just said…". No yes/no-answerable phrasing;
~45s of speech, 2–5 sentences each.

`passage` = the scenario premise, byte-identical on all 4 items (ETS delivers
the scenario introduction both aurally and in print). `passageGroupId` = the
same id on all 4 (`"interview-1"`, `"interview-2"`, … one per set) — assembly
draws and renders interviews as whole groups in authored order.

```json
[
 { "type":"speaking_interview",
   "prompt":"[Interview] How do you usually get to campus, and how long does the trip take?",
   "passage":"You have agreed to take part in a university research study about how students get to and from campus. The interviewer will ask you a few questions about commuting.",
   "correct_answer":"", "difficulty":"hard",
   "explanation":"1 sentence on what a strong answer must do.",
   "choices":[], "blanks":null, "graphic":null, "passageGroupId":"interview-1",
   "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] },
 { "type":"speaking_interview",
   "prompt":"[Interview] Which part of your commute would you change if you could, and why?",
   "passage":"<IDENTICAL premise string>", "correct_answer":"", "difficulty":"hard",
   "explanation":"…", "choices":[], "blanks":null, "graphic":null,
   "passageGroupId":"interview-1",
   "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] },
 { "type":"speaking_interview",
   "prompt":"[Interview] Some people say universities should discourage students from driving to campus. Do you agree? Give two reasons.",
   "passage":"<IDENTICAL premise string>", "correct_answer":"", "difficulty":"hard",
   "explanation":"…", "choices":[], "blanks":null, "graphic":null,
   "passageGroupId":"interview-1",
   "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] },
 { "type":"speaking_interview",
   "prompt":"[Interview] If you were advising this university, what one change to campus transportation would you recommend, and what effect would you expect it to have?",
   "passage":"<IDENTICAL premise string>", "correct_answer":"", "difficulty":"hard",
   "explanation":"…", "choices":[], "blanks":null, "graphic":null,
   "passageGroupId":"interview-1",
   "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] }
]
```

---

## WRITING — Build-a-Sentence (section writing, type arrange_words)

Word/phrase chips the student orders into one grammatical sentence.
`choices` = the chips (scrambled, 4–12); `correct_answer` = the chips in correct
order joined by `" | "`. Chip text must match `correct_answer` segments exactly.

```json
{ "type":"arrange_words", "prompt":"[Build a Sentence] Tap the words in order to make a grammatical sentence.",
  "choices":["the paintings","that were","displayed in the gallery","by the artist","were admired","for their originality"],
  "correct_answer":"The paintings | that were | displayed in the gallery | by the artist | were admired | for their originality",
  "difficulty":"hard", "explanation":"1 sentence on the grammar tested.",
  "passage":null, "blanks":null, "graphic":null, "passageGroupId":null,
  "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[{"choice":"<chip>","reason":"..."}] }
```

## WRITING — Email (section writing, type writing_email)

Free-response, no key. `passage` = a 2nd-person situation paragraph, then a line
`"In your email to <recipient>, be sure to:"`, then exactly three `"• "` bullets.
NO From:/To:/Subject: headers.

```json
{ "type":"writing_email", "prompt":"[Email] Read the email above and write your reply (target 100+ words).",
  "passage":"<situation>\n\nIn your email to <recipient>, be sure to:\n• <b1>\n• <b2>\n• <b3>",
  "difficulty":"hard", "explanation":"1 sentence naming the register/task trap.",
  "correct_answer":"", "choices":[], "blanks":null, "graphic":null,
  "passageGroupId":null, "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] }
```

## WRITING — Academic Discussion (section writing, type writing_discussion)

Free-response, no key. `passage` = `"Professor <Name>: <question>"` + two named
`"<Student>: <reply>"` replies (40–70w each) taking OPPOSING positions.

```json
{ "type":"writing_discussion", "prompt":"[Academic Discussion] Read the discussion above and write your own contribution (target 150+ words). Engage at least one classmate by name.",
  "passage":"Professor <Name>: <question>\n\n<Student A>: <reply>\n\n<Student B>: <opposing reply>",
  "difficulty":"hard", "explanation":"1 sentence on what a strong contribution must do.",
  "correct_answer":"", "choices":[], "blanks":null, "graphic":null,
  "passageGroupId":null, "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] }
```
