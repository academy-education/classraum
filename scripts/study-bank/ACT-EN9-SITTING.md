# One sitting for the co-founder: ACT English (third new batch)

**NOT DRAWN YET.** The panel allows one open run per reviewer, and
`ssat-wv6-cofounder-2026-10-07` (12 items) is still open for this account.
Once that run is finished, draw this one with the command in
`act-english-v9.SITTING.PREREG.md`. Then fill in the run id below and send
the note.

Run `act-en9-cofounder-<date>`, **40 items**, about **25-45 minutes** in
one go. Your last two sittings took 44 and 25 minutes.

It works the same way as the last two ACT English sittings. Sign in as
**support@classraum.com** and open **/admin/bank-qc?tab=review**. The run
resumes on its own, so don't touch the cohort dropdown or press Start.

## What you will see

Each item shows **only the four answer options**: no passage, no sentence,
no question.

- **Pick one on every item, even when unsure.** If one option just *looks*
  right, pick it, because that instinct is what we are measuring.
- If nothing points anywhere, pick at random. Skipping counts as wrong.
- You can't go back. 30-45 seconds per item is normal.

The first 24 items are grammar and punctuation. If you have to stop early,
try to get past item 24.

## After each pick

The passage and the key appear. Mark one of: **Only defensible answer**,
**Another is also defensible** (say which in the note), or **No unique
answer / key is wrong**. Then mark **Authentic** or **Authored to a
template**.

## What it decides

This is a new batch of 130 ACT English items (13 passages), currently
**held back from students**. If it clears, ACT English goes from 7 full
practice tests to 10.

This batch was meant to go live without a sitting under the new spot-check
rule. That didn't happen because the answer-key check removed 2 of the 15
passages, which is more than the rule allows. Your last two sittings
released the previous batches:

| batch | grammar | writing strategy | AI check, grammar |
|---|---|---|---|
| v7 | 17% | 8% | 100% |
| v8 | 29% | 17% | 100% |

Keys are spread evenly, so pure guessing scores about 25%.

| your blind score, per section | outcome |
|---|---|
| at or below ~40% | **clean**: the batch goes live |
| ~40-60% | undecided; a second reader sits a fresh sample |
| at or above ~60% | guessable by a person too; that section is discarded |

## After he submits (for the owner)

    node scripts/study-bank/score-sweep-run.mjs act-en9-cofounder-<date>

Score each domain against the integer cutoffs in the prereg:

- **CSE (n=24):** 9 or fewer correct is clean; 15 or more archives.
- **PoW (n=12):** 4 or fewer is clean; 8 or more archives.
- **KoL:** report only.

If both CSE and PoW are clean, run
`update study_item_bank set verified=true where cohort='act-english-v9'`.
After that, `form-capacity.mjs` should read 10 forms, all compliant.
