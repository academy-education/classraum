---
name: bank-sat-rw
description: Author and land Digital SAT Reading & Writing items (Craft and Structure, Information and Ideas, Standard English Conventions, Expression of Ideas) through the three-solver QC and the bank-helper inserter. Use when the R&W bank needs items in a domain or difficulty band.
---

# SAT Reading & Writing

Pipeline detail: `scripts/study-bank/RUNBOOK.md`. Gate: `/bank-gate`.
State of the bank and what has already been tried: `REGISTER.md` (B6 row).

## 1. Decide what is actually short

```bash
cd /Users/andylee/Downloads/saas/classraum
set -a; source .env.local; set +a
npx tsx scripts/study-bank/verify-sat-hard-route.ts reading_writing   # repeats + band fallback across 3 forms
```

Count live items by domain x difficulty with a paged query (R&W is over
1000 rows). The module-2 hard route wants roughly 8 C&S / 7 I&I / 7 SEC /
5 EoI hard per form; since 2026-09-03 a thin band falls back to the same
domain's medium items instead of repeating, so a shortage costs difficulty,
not correctness.

## 2. Author (Claude agents, no GPT)

Batch shape: `scripts/study-bank/sat-sec-hard-v1a.batch.json` (id, domain,
subskill, passage, prompt, choices, correct_answer, explanation, topic_tag,
difficulty). 20-24 items per agent, one agent per domain/band.

Brief essentials:
- Passage 40-110 words, academic register, no repeated proper nouns across items, American punctuation, double quotes.
- Key letter 25/25/25/25 across the batch; key not longest/shortest in more than a quarter of items; length ratio under 1.6.
- Explanations quote option text, never "option B".
- The distractor asymmetry (RUNBOOK §"hedge/absolute"): the fix is on the DISTRACTOR side - distractors as hedged and specific as the key.
- SEC "hard": two rules interacting per item; no resolving word within four words after the blank; distractors wrong by RULE only (no literary-present, singular-they, "one"-as-noun, collective-plural, or dictionary-variant traps - solvers flag them all). Do not build three items on one template; solving one solves the triad.
- Expect solvers to grade most Claude-authored SEC as medium. Two batches of 68 moved the hard count from 7 to 12; do not expect a third brief to do better.

```bash
node scripts/study-bank/bank-helper.mjs blind <batch.json> > <batch>.blind.txt
```

## 3. QC: three blind solvers (with the passage, key stripped)

Solver prompt: solve; flag `second_defensible` under any recognised
convention of edited American English; grade difficulty against the real
module-2 hard route; grade distractor quality (weak/plausible/strong); say
whether the word after the blank resolves the item; name near-duplicate
stems and any typographic tell. Output `<tag>.solver-{a,b,c}.json` keyed by
item id: `{pick, second_defensible, difficulty, distractor_quality, note}`.

```bash
TAG=<tag> BATCHES=<a.json,b.json> DROP=<ids to exclude> node scripts/study-bank/sec-qc-aggregate.mjs
```

Acceptance (in `bank-helper.mjs accepts()`): key votes 3/3 for conventions
(2/3 elsewhere), majority difficulty hard or medium, majority distractors
plausible or strong, no exclusivity flag, passage needed (SEC exempt).
Majority-easy items are dropped, not relabelled.

## 4. Insert and verify

```bash
BANK_COHORT=rw-v<N>-<domain> node scripts/study-bank/bank-helper.mjs insert <batch.json> <tag>.qc.json
npx tsx scripts/study-bank/verify-sat-hard-route.ts reading_writing
```

Choices are banked in authored order and shuffled at DRAW time (do not
shuffle at insert - explanations and reviews are content-bound).

## 5. No-source attack is optional here

R&W items were attacked bank-wide (RW3/RW5 result files); for a new
cohort run `/bank-gate` step 2 on a 24-item sample when a new brief is
used, and always when a batch is meant to be "hard".

## 6. Record

`REGISTER.md` §5 line in the same commit: counts inserted by difficulty,
the solvers' difficulty histogram, dropped ids and why.
