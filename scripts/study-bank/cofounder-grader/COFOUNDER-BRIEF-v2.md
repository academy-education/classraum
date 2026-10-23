<!--
MAINTAINER HEADER — graders: skip to "# Item check". Nothing in this block is an instruction to you.

COFOUNDER-BRIEF-v2 (2026-10-23). Supersedes COFOUNDER-BRIEF-A.md / -B.md (= v1, unchanged, md5 6a9236f7… for A).
Never edit this file in place. A change is a new file COFOUNDER-BRIEF-v3.md (scripts/study-bank/apply-notes.mjs),
and a new version must pass the fixture run before any production use (FEEDBACK-LOOP.md).

Built from: cofounder-notes.json (160 human notes/flags by reviewer 6ca6edaf…, 40 model_assisted rows excluded,
+ 9 REGISTER catches). Everything in v1-A is kept (held-out CR recall 20/23); B's CR "natural reply" list, the
underspecified-line procedure and the vocabulary-in-context rules are merged in. New: one checklist line per
would-block defect type, quoting his notes; checks (a) fact, (b) self-consistency, (c) speech naturalness,
(d) batch-level pattern; verdict `hold`; per-item `defect_type`; top-level `batch_patterns`.
Notes quoted here are listed in COFOUNDER-BRIEF-v2.quotes.json, so `run-fixtures.mjs score` can report recall on
fixtures this brief quotes (in-sample) apart from the rest.

SHIP BAR (pre-registered 2026-10-23, before any grader has seen the fixtures):
  v2 ships only if, on REAL cases (cofounder-fixtures.json: his would-block items, current content, stale reviews
  excluded, vs an equal seeded sample of items he passed with no note):
    1. recall >= 80% on EACH defect type that has >= 10 positives, and
    2. its false-flag rate on the negatives is not more than 10 points above v1-A's on the same packet.
  Defect types with < 10 positives are "unvalidated" and cannot support promotion.
  Checked by: node scripts/study-bank/run-fixtures.mjs compare scratchpad/fixtures-v2 scratchpad/fixtures-a
  At build: second_defensible 28 positives (validatable); source_underspecified 5; key_wrong, factual_error,
  self_contradiction, unnatural_speech 0 fresh positives (every such item was edited after his note); batch_pattern
  is batch-scope (not an item fixture). So checks (a)-(d) are UNVALIDATED: they may run as additional HOLD signals
  routed to a human, and must not be cited as evidence for releasing anything.
  The fixtures are a regression gate, not promotion evidence: v1-A was written from his CR rejects and this brief
  quotes his notes. Promotion evidence is only his verdicts on fresh batches graded with this version.
-->

# Item check: would our reviewer accept this item? (v2)

You are checking multiple-choice questions for a test-prep app (SSAT, ISEE, SAT, ACT, TOEFL, MAP). Real students will
see these. For each item you get the passage (if any), the question, the choices, and the stated correct answer.
Your job is to judge each item **the way our human reviewer does**. His standard is described below and is stricter
than "can a strong student argue for another option". You also run four checks he made us add after he caught
defects that a correct key does not reveal (section "Release-blocking checks beyond the key").

Give exactly one verdict per item:
- **unique**: the stated answer is supported, no other choice is a reasonable answer, and none of the checks below
  finds a release-blocking defect.
- **alternative**: the stated answer is supported, AND at least one other choice is also a reasonable, natural or
  plausible answer for a careful student. Name it.
- **broken**: the stated answer is wrong or unsupported, a different choice is the real answer, the key asserts
  something the source does not say, gives an action to the wrong person, or the source is too underspecified for
  any single answer to be justified. Say which.
- **hold**: the key is unique, but the SOURCE has a release-blocking defect: a false real-world claim, a passage or
  transcript that contradicts itself, or a transcript that does not sound like natural speech. Say which and quote
  the words.

If an item has both a second answer and a hold defect, give the stronger verdict (broken > alternative > hold) and
mention the other in the reason.

## Checklist: one line per defect that stops release

Every non-unique verdict carries exactly one `defect_type` from this list. His own words are quoted.

| defect_type | verdict | flag when | his words |
|---|---|---|---|
| `second_defensible` | alternative | another option is a reasonable, natural or plausible answer for a careful student | "C is also a good answer." / "D is also possible. It's not completely wrong." / "C is sort of correct as well but not entirely but I can understand why people might choose C here as well." / "A is also grammatically correct." |
| `source_underspecified` | broken | the line or passage leaves out what you need, so several options fit some plausible filling | "The responses are all sort of possible." / "The transcript is too underspecified to uniquely justify C." |
| `key_wrong` | broken | the key gives an action to the wrong person, or states an inference the source never makes | "It's not that the roommate is the one switching. It's Jamie switching with Alex. So the answer is wrong." / "D is the closest to the answer but includes an inference not stated in the transcript." |
| `factual_error` | hold | a checkable real-world claim in the source is false (check (a)) | "offside isn't judged when a player kicks the ball. It's judged when a teammate passes the ball to them." / "The key teaches an incorrect rule." |
| `self_contradiction` | hold | the source states two things that cannot both be true (check (b)) | "paragraph 2 says the myth's 'origin is a mystery' … the final sentence says … 'it was invented to justify'" / "The transcript contradicts itself about winter gowns" / "The explanation contradicts itself: in practice, the subject was treated as a requirement." |
| `unnatural_speech` | hold | a transcript does not sound like people talking (check (c)) | "No contractions … this one sounds stiff and scripted, which is a real problem for a listening item meant to model natural speech." / "'Let us do that' sounds very unnatural; nobody says that in conversation." |
| `batch_pattern` | (batch section) | across the batch the key is predictable without the content (check (d)) | "The order of the answer choices keep going in order … A, B, C, D and back to A, B, C, D" / "It seems like answer with '-' are correct. This is the second time this happened." |

## The threshold (second answers)

He flags an item when a second option is **reasonable, natural, or plausible** for a careful student. That includes
cases where the option is "not completely wrong" or "sort of correct, and I can see why people would choose it".
His words for it are "also plausible", "also natural", "also a good answer", "also viable", "also defensible". You
do NOT need to show that a fair test-maker would be forced to accept it. Ask instead: **would a careful student who
picked this option have a reasonable complaint?** If yes, flag.

He does **not** flag when the second option only has "some pull", or a careful student "might hesitate", or the
passage has a small logic gap that makes another choice "arguable" while the text still decides. He records those
as notes and accepts.

Costs are asymmetric. Missing an item he would reject is costly; flagging a good item is cheap. When you are
genuinely in doubt about whether a second option works, flag it. Do NOT flag for style, difficulty, or test-taking
tells alone (see "Notice, but do not reject").

## Choose a Response (TOEFL Listening): the area where he rejects most

Most of his rejections are here. Treat the transcript line as the ONLY context. Do not invent the situation the item
writer had in mind. The question is not "which reply is best?" It is "**could a real person naturally say this
here?**"

1. **Any reply that fits some ordinary reading of the line counts as natural.** Picture the realistic situations in
   which someone would say this line. If a distractor is a sensible reply in one of them and does not contradict the
   line, it is a second answer. He flagged, for example:
   - a plain reaction or side comment that fits the topic (the line mentions stitches; a reply about the pet being
     glad to lose its cone)
   - a literal answer to the surface of the remark ("you've been at that a while" → "Yes, about forty minutes")
   - a forward-looking action the listener could take (the item will be ready later → "I'll come back Friday then")
   - a skill or prep reply that fits a change of assignment (told a different piece → "I'll have it up to tempo")
   - polite declining or acknowledging ("good to know, I'll stop chasing it"; "I don't need it, leave the spot for
     someone else")
   - explaining or pushing back with a reason; an emotional reaction (frustration, disbelief, relief: rude or
     unhelpful does not mean unnatural); empathy or agreement instead of action; a constructive counter-offer; a
     relevant follow-up or plan; a practical workaround in the same situation.
2. **Dilemmas and yes/no requests have more than one natural reply.** If the line gives the listener a choice or asks
   about their situation ("tell me now if you're out"; event A clashes with event B), replies choosing either side
   are natural. The key cannot be unique just because it is the wiser or more cautious choice, or because it assumes
   a fact about the listener (busy, available) that the line does not give.
3. **Short, context-poor lines are broken, not just "alternative".** A line like "your job's stuck behind one that
   keeps failing" or "the north route's suspended" leaves unknown what the job, route or replacement is. Do this:
   (i) write down the facts the key assumes but the line does not state; (ii) ask whether another option works under
   an equally plausible unstated assumption, and if so flag it; (iii) if three or more options each fit some
   plausible scenario, the verdict is **broken**, `source_underspecified`.
4. **Keys built on a twist.** If the key only works by spotting a hidden flaw in the line or by assuming niche
   context, ordinary accepting or reacting replies usually stay natural. Flag them.
5. **What makes a distractor safely wrong:** it contradicts the line (told to keep the dog off the field → "he'll
   love a run round the field"); it answers a different question (a time when nothing asked when); it mistakes the
   register (stiff formal thanks in a casual exchange); it repeats a word from the line with a wrong meaning; it
   refers to things the line rules out; it answers as the wrong speaker role. If you cannot name one of these faults
   for every distractor, flag the one you cannot rule out.
6. Grumbling or protesting replies ("that's unreasonable") have not been flagged by him. They are usually safely
   wrong unless the line invites an opinion.

## Conversations, lectures and announcements (TOEFL Listening / Reading)

- **Inference questions:** flag a distractor that a student could reach by a reasonable chain of reasoning from
  facts that ARE in the talk, even if the talk does not support it. He: "D is defensible too somewhat because it may
  not include some text but it can be inferred based on logic."
- **Gist / main-topic questions:** flag a distractor that is a partly right summary a careful student might choose.
- **Who-does-what:** check the agents. A key that gives an action to the wrong person is **broken**, `key_wrong`.
- **Key that adds an unstated inference:** if the key is only "the closest", and its distinctive claim is not in
  the transcript, call it **broken**, `key_wrong`. Separate this from loose wording of a point the transcript does
  make, which he accepts.
- Run checks (b) and (c) on every transcript.

## Reading passages (SAT R&W, SSAT, ISEE, ACT, MAP, TOEFL Reading)

- He flags SAT R&W items often with a single line: "B is also defensible / reasonable". Check every option against
  the text and question stem. If an option is supported, or would be supported under a natural reading of a vague
  phrase in the stem or text, flag it. On short or loosely written passages, a distractor that is a small, natural
  extension of what the passage says counts as defensible.
- For "according to the passage" and "which is true" stems, check every option. Do not stop once the key checks out.
- SAT inference, evidence and cross-text items: test each distractor's claim against both texts.
- He **accepts** a reading item when the text clearly picks the key and the rival only has "some pull" because of a
  small logic gap, a slightly ambiguous key line, or a slightly loose key ("D is the only answer but A is
  arguable"). The test: does the passage itself support the rival? If yes, flag. If the rival's only support is a
  gap or an ambiguity that a careful reader would settle in favour of the key, accept.
- Attitude/tone, main-idea and purpose items with far-off distractors are fine (easy, not wrong).
- Run checks (a) and (b) on every passage.

## Grammar / usage (ACT English, SAT Conventions)

- Flag when another option is acceptable in normal edited English, even if a strict rulebook would prefer the key.
  Example pattern: a comma splice fixed by ", and", where another option joins the clauses with ", then". He: "A is
  also grammatically correct."
- Transitions: a slightly loose but best-fitting key is accepted.

## Vocabulary in context, verbal analogies and synonyms

- Put each choice into the sentence. If a distractor reads as a natural, logical completion, flag it. If the
  distractor reads **better** than the key, or the key is a strained fit, use **broken**.
- Distractors that are real senses of the word are fine when the context rules them out, but flag one that has any
  contextual fit (light "captured" as in a photograph).
- Analogies and synonyms: exactly one pair shares the stem's relation at the same level; exactly one choice matches
  the headword's main sense. If a second choice is a reasonable match for a careful student, flag.

## Release-blocking checks beyond the key (new in v2)

He found these with the key still unique, so a key-only read passed them. Run (a)-(c) on every item's source; run
(d) once over the whole batch after grading every item.

**(a) Fact check.** List every checkable real-world claim in the passage or transcript: rules of a sport or game,
laws and official procedures, named scientific facts, real places, dates and people, how a real institution works.
For each, ask: is it true as stated? If any is false, or the item's key depends on it, verdict **hold**,
`factual_error`, and quote the claim with the correct fact. Fiction may invent people and towns; it may not get a
real rule wrong ("Many students play soccer and will know the rule, so the passage loses credibility"). Do not hold
for a claim you merely cannot verify; say "unverified" in the reason and keep the verdict.

**(b) Self-consistency.** Read the source line by line and check that dates, names, numbers, quantities, who-knows-
what-when, and explanations agree with each other. A **contradiction** is two statements that cannot both be true
("origin is a mystery" vs. "invented to justify"; winter gowns ordered vs. rented on the day; a "preference" that is
in practice a requirement). That is **hold**, `self_contradiction`, quoting both statements. A **gap** (something
left unexplained, a pronoun that could refer to two people, "unclear about who signs what") is not a contradiction:
note it and keep the verdict, unless it creates a second answer.

**(c) Speech naturalness (transcripts only).** Real speakers use contractions ("I don't think", "it's", "won't"),
short turns, and natural transitions. Verdict **hold**, `unnatural_speech`, when a conversation or talk avoids
contractions throughout or has lines nobody says ("Let us do that", "I do not think I ever registered it"), or when
a line exists only to set up a question ("Then get me onto Thursday's run" where "then" follows from nothing). Also
name, in the reason, options that assign a gender ("her", "she") the transcript never establishes. One stiff phrase
in otherwise natural speech is a note, not a hold.

**(d) Batch-level pattern.** After grading every item, look across ALL items in the batch you were given and ask:
could a student who never reads a passage or line pick the key from a pattern across items? Check:
- key position: letters running A, B, C, D, A, B, C, D, or one letter far more often than the others;
- key form: the key is the only option with a dash, semicolon, hedge or qualifier, or is the longest, in most items;
- identical key prose: the same wording or the same type of claim is the key in many items (e.g. "the lecturer is
  committed; the critic neither way" as the key of every lecture);
- one template: every item built to the same stem and option shape, so solving one solves the rest;
- reused option sets: the same distractor set (for example amused / critical / uneasy / admiring) across passages.
Report each pattern in `batch_patterns` with the item numbers and the evidence (counts). Report `[]` if you find
none. A batch pattern does not change any item's verdict.

## Notice, but do not reject

He often comments on the following but still marks the item **unique**. None of them alone justifies a flag:

- The key is the longest, most detailed, or most hedged option. This is his most frequent note. Never flag one item
  for it (a pattern across the batch goes in `batch_patterns`).
- The key stands out in form: the only option with a dash, the only one not naming a famous person, the only
  positive one, the only one outside a shared category or grammar pattern, the only option without the stem's
  keyword.
- Distractors are too easy, too far from the passage, or all from one obvious category. He asks for closer
  distractors but accepts the item.
- The item is easy, "a lucky guess", or answerable by matching a sentence (a purpose item that is really a detail).
- The key is imprecise but clearly the best: a vocabulary key that is a narrower or regional synonym ("stall" for
  "fail", "queues" for "lines"), "settings" where the text means what is controlled, "when" vs. "if" a room is
  available, a key with an extra small detail every option shares.
- A distractor is ungrammatical or oddly worded, or a distractor copies the passage word for word.
- A small logic gap or slightly unclear key line that gives a distractor "some pull" while the text still decides.
- Display problems: paragraph or line breaks, poem layout, speaker labels.
- A bank-level repeat of a distractor set (report it under (d) if it recurs inside the batch).

Exception: if the KEY is oddly phrased so that it stands out AND another reply is natural, that is an
**alternative** (he cited both together).

## Procedure

1. Read the source, then the stem. For Choose a Response, list two or three realistic situations for the line.
2. For each non-key option, try to make the case FOR it as a careful student would. Note whether the source supports
   it, whether it fits a natural reading of the line, or whether it is only a weak student's pick.
3. If any option survives as reasonable, choose **alternative** (or **broken** if the key itself fails or the line
   is too thin to decide).
4. Run (a) fact check and (b) self-consistency on the source; (c) speech naturalness if it is a transcript. A defect
   there with a unique key is **hold**.
5. If every distractor has a nameable fault and (a)-(c) find nothing, choose **unique**, whatever the style, length
   or difficulty complaints.
6. After the last item, run (d) over the whole batch.

## Output

Write your answers to the output file named in your task as one JSON object keyed by item number, plus one
`batch_patterns` key:

```
{
  "1": {"verdict": "unique"},
  "2": {"verdict": "alternative", "defect_type": "second_defensible", "other": "<choice text>", "reason": "..."},
  "3": {"verdict": "hold", "defect_type": "self_contradiction", "reason": "says X in paragraph 2 and Y in paragraph 5: '...' vs '...'"},
  "batch_patterns": [{"pattern": "key_position", "items": [4, 5, 6, 7], "evidence": "keys A,B,C,D,A,B,C,D"}]
}
```

- `verdict` is one of `unique`, `alternative`, `broken`, `hold`.
- Every non-unique verdict has a `defect_type` from the checklist table and a short `reason`. Name a competing
  choice by its **text**, not its letter.
- `batch_patterns` is always present; `[]` when there is none. Its `pattern` is one of `key_position`, `key_form`,
  `identical_key_prose`, `one_template`, `reused_option_set`, or a short name of your own.
- Grade every item. Do not skip any.
