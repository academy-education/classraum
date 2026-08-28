# dl-fresh-v1 Stage 1 — pre-registered, before any item exists (2026-08-28)

Goal: Daily Life is again the binding TOEFL constraint (202 items /
20 per lower-path sitting = 10.1 repeat-free forms; everything else
≥ 12). Mode A (siblings) is exhausted — every stranded single is
repaired. This is the fallback DL-SIBLINGS-RESULT.md pre-registered:
FRESH 2-question sets with AUTHORED passages. Cohort `dl-fresh-v1`,
Stage 1 pilot = 6 sets (12 questions); Stage 2 target 30 sets
(60 questions) → 262 live / 13.1 sittings.

## Why authored passages strengthen the proven brief

The dl-siblings kills established that solvers guess REALITY — keys
faithful to institutional defaults are guessable without the passage.
A fixed banked passage limits which details can be tested; an
authored passage can ENCODE atypical facts (the west wing when north
is default, a Thursday deadline when Friday is default), letting the
flat-prior rule bite harder: where the passage's fact differs from
the world's default, the default becomes a distractor.

## Authoring rules (frozen from the dl-siblings rev-2 brief, plus passage rules)

1. FLAT-PRIOR ANCHORING and FORM SYMMETRY exactly as written in the
   dl-siblings Stage-2 brief, including the duration-band rule.
2. Passage: 45-85 words, Daily Life register (campus email, notice,
   club flyer, job ad, registration page), plain text, no markdown,
   "space permitting" banned. At least ONE fact per passage must be
   atypical — differing from the obvious institutional default — and
   at least one question must test a detail whose distractor set
   includes that default.
3. Two questions per passage, DIFFERENT kinds (literal detail /
   purpose / inference / next-step), assigned key-length ranks, no
   cross-question leakage: neither prompt restates the other, neither
   key nor any option states the other's answer.
4. Prompt tag: "[Daily Life — <kind>]" using the cohort's existing
   kind vocabulary.

## Gates (stated before authoring; drop, never edit)

1. Preflight (deterministic): word counts, 4 distinct choices, key
   verbatim, assigned ranks hit, tags, no "space permitting",
   cross-question leak check, passage not a near-dup (Jaccard < 0.5)
   of any live daily_life passage or within batch.
2. nosource pilot attack on all 12 pilot questions: 3 solvers,
   stems+options re-lettered per item by seeded RNG, forced choice,
   best-fixed-letter control. PASS ≤ +25, DEAD ≥ +30, between →
   author 6 more sets, re-attack the union. Identical pick-strings =
   no verdict. The brief arrives PRE-PROVEN (rev-2 measured −11.1 and
   Stage-2 held-out −13.9 on siblings), so a kill here would indict
   the authored-passage extension specifically: one revision allowed
   to the PASSAGE rules only, then this mode is also refuted.
3. withsource: 3 answer-blind key voters (≥2/3, drop on less) +
   grader (passage_needed with the corrected-direction brief;
   sibling_leak across the pair; distractor_quality) on every
   question.
4. verify-daily-life-repair.ts cross-item pattern checks over all
   candidate questions (key position ≤40%, hedge-only-in-key ≤25%,
   key-longest ≤45%) — run in mode A shape with each set's own two
   questions as mutual siblings.
5. Stage 2 (on pilot pass): scale to 30 sets total under the frozen
   brief, fresh held-out attack (24 questions), full gates, ledger
   entry at the rows sha, insert-listening under
   BANK_COHORT=dl-fresh-v1 (passageGroupId derived pg-md5 at insert).
