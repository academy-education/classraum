# Authoring brief — TOEFL Listening "Choose a Response"

Read this in full before writing. It is the whole specification.

## Why this task and not another

Choose-a-Response is the single item type gating the TOEFL product. A test
draws 14 of them; the bank holds 57. That is **4 complete forms** — a student
sitting a fifth TOEFL sees items they have already answered, no matter how
healthy the other task types look. Every other Listening task supports 16+
forms. This one batch is what turns 4 usable forms into 15.

## The item

The student hears one line of natural speech and picks the reply a competent
speaker would actually give. There is no passage to re-read and no second
listen inside the item — everything hangs on one utterance.

```json
{
  "type": "multiple_choice",
  "passage": "Transcript: \"The room itself is fine — it's just that the window looks straight out onto the loading bay.\"",
  "passageGroupId": null,
  "prompt": "[Choose a Response] Which is the most natural reply?",
  "choices": ["…", "…", "…", "…"],
  "correct_answer": "…",
  "difficulty": "hard",
  "listeningTask": "choose_response",
  "explanation": "…"
}
```

Every field above is required and the three constant ones — `prompt`,
`listeningTask`, `type` — must be byte-identical to what is shown.
`passageGroupId` is `null`: one utterance, one question.

- **The stimulus** is ONE utterance, 12–28 words, inside `Transcript: "…"`.
  It is spoken aloud by TTS, so write speech: contractions, hedges,
  self-interruption, the way people actually talk. No stage directions.
- **`correct_answer` must be byte-identical** to one entry in `choices`.
- **`difficulty` is `"hard"`.** TOEFL is locked to the top band. The existing
  cohort is labelled easy/medium and sits below the bar; do not match it.

## What makes the item hard

Never comprehension of the words. The student must catch what the utterance
is *doing* — a complaint dressed as an observation, a request dressed as a
question, a refusal dressed as enthusiasm, a correction dressed as agreement.
The key is the reply that answers the **act**, not the surface content.

## Vary the load-bearing element — this is the rule that matters most

A batch authored to one idea develops a tell that no per-item check can see.
It has happened three times in this bank: the key sat in slot A 73% of the
time; every 4-question set was a complete ABCD permutation; and 32 items
across 8 lectures shipped with the *same key wording*, so a candidate who
solved one answered eight without listening.

The existing Choose-a-Response cohort is drifting the same way — its keys are
overwhelmingly "accept responsibility and offer a fix". Do not write 26 more
of those. Across your batch, the correct reply should sometimes be:

- a fix offered, but also — a clarifying question back
- a polite refusal, or a counter-proposal
- a correction of the speaker's premise
- an acceptance that adds a condition
- plain agreement, where the utterance really was just an observation
- a redirection to the right person, where that is genuinely the right move

If a grader could read your batch and predict the answer from the shape of
the key rather than from the utterance, the batch has failed even if every
item is individually sound.

### But the utterance must FORCE the move — this is where the first wave failed

Spreading the moves is only half the rule, and the half I originally wrote
was the wrong half on its own. 23 of the first 156 items were rejected by
blind QC, and almost all of them failed the same way: the key performed a
perfectly good move that the utterance did not require.

    "A few of us lift at six before class — you should come along."
      key:      "Six is brutal for me — though I'd be in for an evening session."
      3 of 3 solvers: "Count me in — I'll find you by the racks at six."

Both are natural. Whether you *can* do six in the morning is a fact about
you that the utterance never supplied, so accept-versus-refuse is a coin
flip and the item has no answer. The same fault, in other items: whether
you have spare guest swipes, whether 7am suits your commute, whether the
refund is the bursar's job or the desk's.

The premise-correction move fails the same way and most often. A key like
"This isn't tuition, though — it's the graduation fee" only works if the
utterance contains something that makes the speaker's premise visibly
wrong. If the student would need a fact they were never told, the item is
unanswerable no matter how well written.

So for EVERY item, before you keep it, answer this: **what in the utterance
rules out the other three replies?** Name it. If the answer is "nothing —
it depends on the responder's situation", the item is broken. Fix it by
putting the constraint into the utterance ("I'm dead before eight, but a
few of us lift at six — come along?") or change the key to the move the
utterance actually forces.

Plain agreement and offering-a-fix are the safest moves because the
utterance usually does force them. Refusal, counter-proposal, conditional
acceptance and premise-correction are the dangerous ones — they are the
moves worth having, and every one of them needs the constraint stated out
loud in the transcript.

### The constraint must be present without being blatant

The first batch written under the "utterance must FORCE the move" rule came
back with the ambiguity fixed and a new problem: of 26 items, only 2 were
unanswerable — but **10 were graded EASY**, and only 14 passed. The
rejection reason had moved from "no answer" to "obvious answer".

The mechanism is direct. The way to force a move is to plant a blocker in
the transcript — "my system won't take a card", "nothing else at all is
free", "I'm not moving them" — and a blocker loud enough to remove the
ambiguity is often loud enough to hand over the answer. Both failures are
the same dial at opposite ends.

What separates a good item is that the constraint is *stated but not
underlined*. Compare:

    blatant   "I can't do Tuesday, so don't suggest Tuesday."
    right     "I'm teaching Tuesday through Thursday this term."

The second still rules out three replies; it just requires the listener to
notice it. Bury the constraint in something the speaker would say anyway —
a schedule, a number, a name, a passing reason — not in a sentence whose
only job is to close a door.

The six best items in that batch planted a defect in the speaker's OWN
turn: a contradiction, bad arithmetic, a wrong inference. Those force the
corrective reply without announcing themselves, because the student has to
catch the error before the reply makes sense.

### Do not write the distractors to a FIXED SET OF CLASSES

Two blind graders, reading 78 items each with no key, independently built
rules that score ~50-58% without ever looking at a transcript. Chance is 25%.

Grader A's rule: *cross out any option that (a) opens in officialese, (b)
proposes scrapping or redoing the whole thing, (c) minimises the problem, or
(d) begins with "The". Among the survivors, pick the one with the most
words.* — 50%, and stable across all three authors, so it came from the
brief and not from one writer.

Grader B's rule: *pick the option containing but / though / actually; else
the one with an em dash; else the one that offers to do something.* — 58%.

Both describe the same underlying fault. The wrong options were being drawn
from a small fixed menu — the too-formal one, the over-reactor, the one who
shrugs it off, the inert remark that opens by naming a noun — and the key
was always the engaged reply that carries a condition or a follow-up. Learn
the three throwaway classes and every item collapses to a two-way choice.

Three consequences, and the third is the one that matters:

1. **The stiff bureaucratic option is banned.** "I hereby authorise…",
   "Kindly submit a fault report at your earliest convenience." It appeared
   in 22 items in one pool and was the key in 0 of them. It is free
   elimination on tone alone.
2. **Do not make every key the two-part hedged move.** "Fine — as long as
   it doesn't count against my aid" has a fixed typographic signature:
   clause, dash, rider. If that is what a key always looks like, the dash IS
   the answer key.
3. **Sometimes the blunt short reply is correct. Sometimes the minimiser is
   correct. Sometimes the deflection is correct** — because the utterance
   genuinely calls for it. If the correct answer is always the most engaged,
   most elaborated, most accommodating option, then "pick the one that
   sounds most like a good student" is the whole test.

Note what this means for the length rule below: the key's length skew is a
SYMPTOM of the class structure, not a separate defect. Flattening lengths
without fixing the classes just hides it.

### Let the key sometimes BE the shape you use for distractors

A grader that could not see the keys found five option shapes that were
never correct across 26 items: an opener like Who/What/Which/How, a tag
question, two or more commas, a politeness opener ("Sorry…", "Any chance…"),
and a bare evaluative word (great / perfect / outrageous). Eliminating all
five and guessing among the survivors scores about 40% out of sample.

Nothing about those shapes makes a reply wrong. They are never the key only
because we keep using them for distractors. So: write items where the
correct answer IS the question asked back, IS the polite request, IS the
comma-heavy sentence. Until some keys look like that, "the answer is never
the option that merely asks for more information or merely reacts" is a
free 15 points.

### Two stems that are almost always broken

- **A yes/no question with a natural yes and a natural no.** "Have you had
  a chance to look at the feedback I left?" — "Not yet, I'll get to the
  queries today" and "Yes, I read it on the train" are both perfect, and
  nothing says which is true of the responder. Do not write these.
- **A tag question.** "…aren't you?", "…doesn't it?" explicitly invites
  either confirmation or correction. Keying one of them is arbitrary.

Vary the setting too — no scenario twice. Front desk, roommate, office hours,
lab partner, library circulation, advising, part-time shift, group project,
transit, campus dining, housing office, IT desk, gym, clinic reception.
Vary the register: some exchanges are between peers, some student-to-staff,
some staff-to-student. Speakers should not all be unfailingly polite.

## Distractors

Four options, each of which a real student would pick for a real reason:

- echoes a salient word from the utterance and answers the wrong thing
- responds to the surface content while missing the act
- correct in content but wrong in register (wildly formal to a roommate,
  breezy to a professor)
- over-reacts to a hedge (treats a softened remark as a formal complaint)
  or under-reacts (reads a hedged criticism as approval)

A wrong option must be wrong on **what it does**, never on being obviously
silly or obviously short.

## Length: spread the key across all four ranks

Rank the four options by character count, 1 = longest, 4 = shortest, and note
where the key sits. Across your batch that must come out near **25% at each
rank** — so roughly a quarter of your keys are the LONGEST option and roughly
a quarter are the SHORTEST. No rank above 40%.

This is not hypothetical tidiness. An audit on 2026-07-29 found the key was
the longest of four in 74.3% of banked Listening items; a candidate who
ignored the audio and always picked the longest option scored about three
quarters. Repairing that took 660 items across four waves.

Do **not** phrase the target to yourself as "aim for 2nd or 3rd". That exact
wording was used for the first repair wave and 77% of 210 items came back at
rank 2 — the giveaway moved instead of going away.

Keep the longest option within ~1.6× the shortest.

## Explanations: quote the option, never number it

The insert helper **shuffles the choices**, so an explanation that says
"Choice 2 echoes 'wall'" ends up naming a different option than the one it
describes. 72 banked items verified wrong this way on 2026-07-30; the student
reading a wrong-answer explanation is pointed at the wrong option.

Write `the option that offers a refund`, not `choice 3`. The helper now
REJECTS any item whose explanation contains "choice N", "option B", "the
second option" or "(C)".

Say in one or two sentences what act the utterance performs, why the key
answers it, and what each wrong option does instead — identified by its
content.

## Before you hand the file back

Check your own batch and fix what misses:

1. `correct_answer` byte-identical to a member of `choices`, all 4 distinct,
   none empty.
2. Key's length-rank distribution across the batch ≈ 25/25/25/25, none > 40%.
3. Longest option ≤ 1.6× the shortest, per item.
4. No explanation matches `choice N` / `option B` / `(C)` / `the second option`.
5. Stimulus 12–28 words, in `Transcript: "…"`.
6. No two items share a scenario, and the keys are not all the same move.
