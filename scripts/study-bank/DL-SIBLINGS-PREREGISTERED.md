# dl-siblings Stage 1 — pre-registered, before any item exists (2026-08-28)

Goal: convert Daily Life's 69 stranded single-question texts into
drawable 2-question sets by authoring ONE new sibling question per
existing passage — verify-daily-life-repair.ts's mode A, built for
exactly this. 69 new questions take Daily Life from 32 → 101 drawable
sets (~10 lower-path Reading forms), at half the authoring cost of
fresh sets.

## What the existing cohort teaches (design against these)

- harvest-v1 Daily Life attacks at +66.2 (95.5% blind) with a named
  mechanism: cartoonishly imprudent distractors ("Ignore their
  advisor's advice") leaving one responsible-adult key; hedged/absolute
  asymmetry. The 2026-07-28 authored repair batch scored 95% blind and
  was DISCARDED. New siblings must be wrong only against the passage.
- Official TOEFL Reading keys hedge MORE than distractors — the fix is
  distractors that hedge too, never a less-hedged key.
- "space permitting" appears in 36 live items — banned outright.
- Cross-sibling leakage: the new question's prompt must not restate the
  existing sibling's prompt, its key must not duplicate the sibling's
  key, and its options must not state the sibling's answer.

## Batch design

- Stage 1 pilot: 12 siblings on 12 seeded-sampled stranded passages.
  Per-item assignments: question kind (literal detail / purpose /
  inference / next-step — always DIFFERENT from the existing sibling's
  kind), key length rank to a flat 3/3/3/3 histogram, difficulty hard
  (cohort convention). Distractor doctrine per toefl-authoring-spec:
  info from a different sentence; synonym restatement with a key
  qualifier dropped; true-in-general but contradicted by the passage.
  Passage byte-identical to the banked row; passageGroupId = the
  existing pg-id; prompt prefixed with the passage's existing
  [Daily Life — Kind] tag; explanations order-safe (insert shuffles).

## Gates (stated before authoring)

1. elimination (during authoring): an options-only reader names the
   option they'd reject first + confidence; PASS = no option
   confidently rejectable without the source.
2. nosource on all 12, immediately: 3 independent Claude solvers,
   stems+options only, re-lettered per item by seeded RNG, forced
   choice; control = best fixed letter over actual keys. PASS ≤ +25
   margin; DEAD ≥ +30 (no option-text repair; brief revised, max two
   revisions); between → author 12 more, re-attack the union.
   Identical pick-strings across solvers = no verdict.
3. verify-daily-life-repair.ts mode A must pass (key-position ≤40%,
   hedge-only-in-key ≤25%, key-longest ≤45%, no prompt/key duplication
   against siblings).
4. withsource: 3 answer-blind key voters unanimous-or-2/3 per item +
   anchored grader; a mis-keyed or not-passage-dependent item is
   dropped, never edited.
5. Stage 2 (only on Stage-1 pass): scale to all 69, fresh held-out
   nosource attack (24 items), full tells pass, ledger.json batch entry
   with all five stages recorded at the exact contentSha, then
   insert-listening with keep.json and BANK_COHORT=dl-siblings-v1.

Per the policy settled 2026-08-28: an attack-PASS ships without a human
sitting; sittings adjudicate condemned cohorts.
