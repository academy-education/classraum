# A short read for the co-founder: SSAT Reading (new batch)

Run `ssat-wv6-cofounder-2026-10-07`: **12 items**, about **15 minutes**. Please finish all 12 in one go.

Sign in as **support@classraum.com** and open **/admin/bank-qc?tab=review**. The run resumes on its
own; there's no need to touch the cohort dropdown or press Start.

## What you will see

**First screen: the five answer options only**, with no passage and no question.
- **Pick one on every item, even if you're unsure.** Being unsure is normal with the passage hidden.
- If one option just *looks* right, pick it. That instinct is part of what we're measuring.
- If nothing points anywhere, pick at random and move on.
- There's no going back.

**Second screen.** After each pick, the passage and the correct answer appear. Please judge each
item with the passage in view; a note is optional, but welcome on anything you flag:

| button | meaning |
|---|---|
| **Only defensible answer** | with the passage in view, the marked answer is the one right choice. **The item goes live.** |
| **Another is also defensible** | a second option also works. Say which in the note. **The item is dropped.** |
| **No unique answer / key is wrong** | nothing works, or the marked answer is wrong. **The item is dropped.** |
| **Authentic / Authored to a template** | does it read like a real SSAT item? Recorded only. |

The very first item is an attitude question that our graders disagreed on. Your call on it matters most.

## What it decides

These are 12 new SSAT Upper reading items on two passages, currently **held back from students**.

- **Each item you mark "Only defensible" goes live; any you flag or reject is dropped.** Your blind
  score is recorded for information only.
- More batches written the same way are queued behind this one. They stay held until your read shows
  the method works.

The rule was committed before the run was drawn: `ssat-reading-wv6.SITTING.PREREG.md`.

## After he submits (for the owner)

    node scripts/study-bank/score-sweep-run.mjs ssat-wv6-cofounder-2026-10-07
    node scripts/study-bank/bank-state.mjs sittings

**Then, per item:**
- "Only defensible" → `verified=true`.
- Flagged or rejected → `archived=true`, not repaired.

**The blind score is reported against two lines:** the 20% five-choice chance line, and the deal's
25.0% control (keys 3/3/2/2/2).

**Method check for WV7 and later:** at most 2 of the 12 flagged or rejected, and none of the 8
main-idea, detail, inference or purpose items among them.
