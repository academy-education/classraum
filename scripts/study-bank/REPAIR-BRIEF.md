# Option-length repair brief

Read this before repairing a `.bank-repair/*.json` batch. It is the whole
brief — do not improvise beyond it, and do not infer a house style from the
items you are given, because the house style is the defect.

## What is wrong with these items

A student who never reads the passage and always picks the **longest option**
was scoring around two thirds. Across the banked verbal sections the correct
answer was the longest of four far more often than the quarter you would get
by chance:

| section | key was longest |
|---|---|
| SAT Reading & Writing | 64.3% |
| TOEFL Listening | 74.3% |
| TOEFL Reading | 61.0% |

Nothing was cheating. It is how a correct answer gets written: the key has to
be fully accurate, so it carries every qualifier, while a distractor gets
clipped the moment it is wrong enough to reject. Do that a few hundred times
and length becomes the answer key.

SAT **Math** sits at 4.7%, because its options are numbers and the habit never
gets a chance to operate. That is the proof the cause is prose, not the topic.

## What you are being asked to do

Each item in your file carries a **`target_rank`**: where the correct answer
must sit among the four options once you are done, measured by character
length.

- `target_rank: 2` — exactly one option longer than the key
- `target_rank: 3` — exactly two options longer than the key
- `target_rank: 4` — the key is the **shortest** of the four

The target is assigned by the export script from the section's current
histogram. **It is not a suggestion and it is not yours to choose.** An item
that lands on any other rank is rejected by import, even if the writing is
excellent.

### Why the rank is assigned rather than chosen

The first repair wave asked authors to "aim for the correct answer to sit 2nd
or 3rd of four by length." 162 of 210 items (77%) came back at rank 2. Every
author independently picked the safest reading of a vague instruction, and the
result was a *new* tell — "the key is the second-longest option" — replacing
the old one. The per-item check passed all 162, because a distribution is not
a property of any single item.

So the choice was removed. You author to a stated number; the histogram comes
out flat by construction instead of by everyone guessing the same middle.

**`target_rank: 4` is not a trick or a mistake.** A quarter of the bank is
supposed to have the shortest option as the key. TOEFL Listening currently
sits at 3.9%, which means "eliminate the shortest option" is worth 33% instead
of 25% — refusing to ever write a short key was itself one of the tells.

## How to hit the target

**Lengthen distractors. Do not shorten the key.**

This is the rule that decides whether the repair is worth anything. Trimming
the key costs accuracy — it is the one option that has to be exactly right.
Expanding a distractor costs nothing and usually *improves* the item, because
a clipped distractor is a weak distractor: it is rejectable on sight without
engaging the passage.

When you expand a distractor, expand it into a **real trap**. Ask what a
student who half-understood the passage would believe, and write that. Good
material to expand into:

- a claim the passage supports but that does not answer *this* question
- the right relationship between the wrong two parties
- a correct statement about the wrong paragraph
- the answer to the question a careless reader thinks is being asked
- an overstatement of something the passage says hedged ("suggests" → "proves")

Padding — "in the passage, the author seems to be saying that..." — is a
failure even when the character count works out. It is visible, it is boring,
and it makes the item worse. If you cannot expand a distractor into something
a real student would fall for, expand a *different* one.

For `target_rank: 4` you will usually need to lengthen **all three**
distractors. That is fine and it is the point.

## Hard constraints (import enforces every one)

1. **The key's text is byte-identical to `correct_answer`.** Not reworded, not
   re-punctuated, not re-spaced. Import compares exactly.
2. Exactly 4 options, in the **same order** as `choices` — the key must stay in
   the slot it is in. Position spread is guarded by a separate check and
   reordering here would break it.
3. No duplicate options, no empty options.
4. **Longest option ≤ 1.6× the shortest**, by character count. This is what
   keeps a `target_rank: 4` key from being a three-word stub beside three full
   sentences.
5. Every distractor stays **unambiguously wrong**. Expanding a distractor by
   adding a true-and-relevant clause can quietly turn it into a second
   defensible answer. If you find yourself arguing for a distractor, you have
   gone too far — pull it back.
6. The prompt and passage are **read-only**. You are given them for context.

## Output

Write `repaired_choices` back into the same JSON file, in place, one array per
item, same order as `choices`. Change nothing else. Leave `id`, `prompt`,
`passage`, `choices`, `correct_answer` and `target_rank` exactly as you found
them.

Do not create, rename, or delete files — one author per file, and the export
script refuses to reissue a file that already holds repaired work.

## Check your own file before you finish

For each item, count characters and confirm the key's rank equals
`target_rank`. Then confirm the longest option is within 1.6× the shortest.
Import will reject anything that misses, and a rejected item is simply left
unrepaired — it is not a partial credit situation.
