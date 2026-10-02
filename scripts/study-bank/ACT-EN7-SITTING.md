# One sitting for the co-founder — ACT English (new batch)

Run `act-en7-cofounder-2026-10-02`, **40 items**, about **25-30 minutes**
in one go.

Same as the ACT sitting on 2 September. Sign in as
**support@classraum.com**, open **/admin/bank-qc?tab=review**, and the
run resumes on its own. Don't touch the cohort dropdown or press Start.

## What you will see

Each item shows **only the four answer options**: no passage, no
sentence, no question. Forty of them.

- **Pick one on every item, even when unsure.** The source is hidden, so
  being unsure is normal.
- If one option just *looks* right (the grammatical one, the cleaner
  wording, the obvious "No Change"), pick it. That instinct is exactly
  what we're measuring.
- If nothing points anywhere, pick at random and move on. There's no
  abstain, and skipping still counts as wrong.
- No going back. 30-45 seconds an item is normal.

The first 24 items are grammar and punctuation. If you have to stop
early, **try to get past item 24**. That block answers the main question
on its own.

## After each pick: the second screen

Once you pick, the passage and the correct answer appear. Two quick
judgements (a note is optional):

| button | meaning |
|---|---|
| **Only defensible answer** | with the passage in view, the highlighted answer is the one right choice. Keep |
| **Another is also defensible** | a second option also works. Flag; say which in the note |
| **No unique answer / key is wrong** | nothing works, or the marked key is wrong. Reject |
| **Authentic / Authored to a template** | does it read like a real ACT item? |

## What it decides

This is a new batch of 120 ACT English items, currently **held back from
students**. The AI check said the grammar items were too easy to guess
without the passage (100%, against 68% on the items already live). But on
2 September the same AI said 76-79% and you scored 10%, so your number
decides. Keys are spread evenly, so pure guessing scores about 25%.

Rule, committed before the run was drawn
(`act-english-v7.SITTING.PREREG.md`):

| your blind score, per section | outcome |
|---|---|
| at or below ~40% | **clean**: the batch goes live |
| ~40-60% | undecided; a second reader sits a fresh sample |
| at or above ~60% | guessable by a person too; that section is discarded, not repaired |

## After he submits (for the owner)

    node scripts/study-bank/score-sweep-run.mjs act-en7-cofounder-2026-10-02

Score per domain against the prereg's integer cutoffs (CSE n=24: ≤9 clean,
≥15 archive; PoW n=12: ≤4 clean, ≥8 archive; KoL report-only). Do not flip
`verified` on anything until both CSE and PoW are scored.
