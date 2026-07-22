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
- Ensure topical VARIETY within a batch — never reuse a scenario/topic twice.

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

An open interviewer question the student answers aloud (rubric-graded, no key).
HARD = requires a defended position, a comparison, or a hypothetical — never a
yes/no or single biographical fact. The question is spoken via TTS (the `[Interview]`
tag is stripped before TTS).

```json
{ "type":"speaking_interview",
  "prompt":"[Interview] Some universities are moving to fully online degrees. Do you think an online degree has the same value as an in-person one? Defend your position with two specific reasons.",
  "passage":null, "correct_answer":"", "difficulty":"hard",
  "explanation":"1 sentence on what a strong answer must do.",
  "choices":[], "blanks":null, "graphic":null, "passageGroupId":null,
  "correct_answers":null, "acceptable_answers":null, "distractor_rationales":[] }
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
