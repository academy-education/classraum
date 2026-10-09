# sat-cs-wic-v18 — the ONE revision round (pre-freeze)

Two fresh probes read all 40 items. Your named items and the reasons are in
`REVISION-R1.json` (same folder): open it and use only YOUR author letter's
entries. Items NOT listed there must not be touched (not one character).

## What the probes found, batch-wide
- **Difficulty is the big problem.** A fresh SAT reviewer called 31 of 32
  authored-hard items medium (25) or easy (6). Most of them have a key that ONE
  sentence decides, or two distractors that are each contradicted by a planted
  phrase. A hard item must make a strong student COMBINE two or more sentences:
  the blank's own sentence must leave at least two options alive, and the
  deciding information must sit elsewhere (a later qualification, a comparison
  between two cases, a mechanism stated two sentences away). Distractors must be
  near-misses that fit most of the passage and fail one inferential step. Do not
  end with a clause that restates the key's definition.
- **Options-only tells.** A forced pick of "the rarest / most test-like word",
  "the most specific word", or "one pole of an opposite pair" hit the key too often
  for some authors; opposite pairs were found on several items (e.g.
  earnings/expenditure, documented/hypothetical, dissipates/erupts). Fix by
  making distractors as specific and test-worthy as the key (inside the ceiling),
  or by choosing a plainer key in a reworked sentence, and by removing every
  opposite or near-opposite pair among the four options, including mild ones.
- "incumbency" was read as above the ceiling.

## What you may change in a named item
Passage, key, distractors, explanation and author fields - anything - as long as
the item stays in your lane and letter range and keeps its id and its authored
difficulty label. Every AUTHOR-BRIEF rule still applies. Option shape uniform
within an item (all single words, or all two-word phrases).

## Count targets after revision (your 10 items, the self-check enforces some)
- key rarest <= 2, key most common >= 2, noun/verb keys >= 4
- key STRICTLY LONGEST option in at least 2 of your 10 items, and STRICTLY
  SHORTEST in at least 1 (batch band 15-35%; the batch currently has only 5/40
  strictly-longest keys). Do not make it longest in more than 3.
- no word reused anywhere in the batch; the self-check catches it.

## Loop
After each revised item run `node scripts/study-bank/wic18-selfcheck.mjs <L>`
from the repo root; finish with 0 problems for your letter. Then reread each
revised item as a strong student WITHOUT the key: is exactly one option
defensible, does the blank's own sentence leave at least two options alive, and
could the key be picked from the four words alone? Revise until all three hold.

## Rules
Edit only your own named files in your own folder. NEVER run pkill, killall or
any process-killing command. No GPT or other model API. Report, per revised
item, one line: id, new key, what changed.
