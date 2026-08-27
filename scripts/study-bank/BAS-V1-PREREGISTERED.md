# bas-v1 Stage 1 — pre-registered, before any item exists (2026-08-28)

Goal: grow TOEFL Build a Sentence (arrange_words, section writing)
beyond the 108 harvest-v1 items. Cohort `bas-v1`, target 60 authored,
keep survivors. Gate family `production` (shape / withsource / tells)
per gate-contract.json — fixed this session after the fallback trap
sent build_a_sentence to mc_hidden_source.

## What the existing cohort teaches (design against these)

- The 108 live keys are saturated with ONE template: "The NOUN |
  participial modifier | passive verb | by-agent | purpose/time"
  (passive-participial). A batch authored to one template develops a
  cross-item tell (REGISTER.md standing lesson). New items spread
  across assigned structure families; passive-participial capped.
- The DEFINING defect of the task: grading is EXACT single-order
  (submit route: lowercased byte-compare of " | "-joined chips), so a
  second grammatical, natural ordering makes the item unfair — the
  student who builds a correct sentence is marked wrong. The live
  cohort has never been gated for this; bas-v1 is.
- Chips display lowercase-forced in the pool (so capitalization cannot
  telegraph the first chip) and grading is case-insensitive; duplicate
  chips break the UI's remaining-pool filter and the exact grader —
  banned case-insensitively.

## Authoring rules (the ambiguity doctrine)

1. Every chip must have exactly ONE grammatical landing slot. Build
   order-forcing dependencies: relative clauses that can only modify
   one noun, verb-bound prepositional phrases, correlatives split
   across chips (not only / but also), complement-taking verbs.
2. BANNED: standalone floating adverbial chips (time/place/manner —
   "last quarter", "yesterday", "in the park") that could front, end,
   or attach at multiple points. The live cohort's most common
   ambiguity source.
3. Chips 5-7, each 1-4 words; no terminal punctuation on any chip or
   the key; statements only; lowercase except proper nouns; no
   duplicate chips (case-insensitive).
4. Self-test before returning: attempt to build a DIFFERENT
   grammatical order; if any exists, restructure the sentence.

## Gates (stated before authoring; drop, never edit)

1. shape (deterministic, local): checkArrangeWords permutation rule +
   the chip rules above, verified by script.
2. withsource = assembly convergence: 3 independent solvers receive
   the chip pool per item (per-item seeded shuffle, no key) and output
   the best grammatical order. PASS per item = at least 2/3 reproduce
   the key exactly (case-insensitive). A solver's divergent order is
   also fed to gate 3 as a candidate alternative.
3. ambiguity hunt: 3 hunters per item chunk try to CONSTRUCT an
   alternative grammatical, natural order different from the key. Every
   claimed alternative goes to an adjudicator agent shown sentence
   pairs blind (which is more natural / are both acceptable). Any
   alternative judged acceptable-or-better kills the item. This is the
   task's analogue of the blind attack: the instrument that targets
   the defect that actually decides the item.
4. tells: token-Jaccard of every new key vs all 108 existing keys and
   vs the batch (< 0.5); structure-family spread reported; passive-
   participial share ≤ 20% of survivors; difficulty mix reported.
5. Ledger entry (family production) at the exact rows-file sha, then
   insert-arrange-words under BANK_COHORT=bas-v1 (insertFrozen already
   writes the NOT NULL task column — checked before use per the
   REGISTER's three-for-three 068 note).

No blind option-attack exists for this task (nothing is hidden — the
chips ARE the item), so gate 3 stands in as the adversarial
instrument. If more than a third of the batch dies at gate 3, the
brief is the defect: one revision allowed, then the approach is
re-registered, mirroring the two-revision rule.
