# One sitting for the co-founder — ACT English (second new batch)

Run `act-en8-cofounder-2026-10-07`, **40 items**, about **30-45 minutes**
in one go (your last one took 44).

Same as the ACT English sitting you just did. Sign in as
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

This is a new batch of 120 ACT English items (12 passages), currently
**held back from students**. If it clears, ACT English goes from 5 full
practice tests to 7. Your last sitting released the previous batch: you
scored 17% on grammar and 8% on writing-strategy items, where the AI check
had said 100%. The AI check says 100% on grammar again, and this time also
83% on the writing-strategy items, so your number decides. Keys are spread
evenly, so pure guessing scores about 25%.

Rule, committed before the run was drawn
(`act-english-v8.SITTING.PREREG.md`):

| your blind score, per section | outcome |
|---|---|
| at or below ~40% | **clean**: the batch goes live |
| ~40-60% | undecided; a second reader sits a fresh sample |
| at or above ~60% | guessable by a person too; that section is discarded, not repaired |

## After he submits (for the owner)

    node scripts/study-bank/score-sweep-run.mjs act-en8-cofounder-2026-10-07

Score per domain against the prereg's integer cutoffs (CSE n=24: ≤9 clean,
≥15 archive; PoW n=12: ≤4 clean, ≥8 archive; KoL report-only). Do not flip
`verified` on anything until both CSE and PoW are scored. On release:
`update study_item_bank set verified=true where cohort='act-english-v8'`,
then `form-capacity.mjs` should read 7 forms, all compliant.
