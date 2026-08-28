# Four batches pre-registered before authoring (2026-08-28, evening)

One file, four cohorts — gates stated before any item exists.

## 1. eoi-v4 — SAT Expression of Ideas, 60 items

EoI (125) is STILL the R&W binder (others 210-240). Briefs FROZEN
verbatim from eoi-v3 (Transitions brief + form-symmetry RS brief,
measured −5.6/−23.6 T and +16.7/+18.1 RS across four attacks). Fresh
topics only; same rank/relation/goal/corruption rotations,
10 authors × 6.

Gates identical to eoi-v3 Stage 2: deterministic preflight
(eoi-v3-tools preflight), held-out 24-item nosource attack
(pass ≤ +25, dead ≥ +30, best-fixed-letter control, distinct
pick-strings) PLUS the cross-item pattern hunter (now standing
equipment), answer-blind QC (3 voters/chunk unanimous-or-2/3 +
grader), accepts() drops, insert as cohort eoi-v4 via bank-helper
(task 'multiple_choice'), verify-answer-key-spread stored-slot check
with seeded rebalance if write-key-first skews slots.

## 2. repeat-v3 — TOEFL Listen and Repeat, 36 sentences

Medium band binds (~13.3 sittings). Target 12 easy / 14 medium / 10
hard. Bands are WORD-COUNT-DERIVED at insert (8-9 easy, 10-11
medium, 12 hard); passage must equal correct_answer byte-wise; no
scaffolding prefixes (all enforced by insertRepeat, which this
session gained its missing NOT NULL task column and its
listen_and_repeat contract mapping — trap occurrences #5a/#5b).

Gates (family production): shape = the insertRepeat rules verified
locally pre-insert; withsource = 3 reviewers per chunk judging
speakability (natural spoken rhythm, no tongue-twisters unless
intended, no proper-noun spelling traps, unambiguous homophones —
the transcript grader must be able to match a correct repetition);
tells = no near-dup sentences (Jaccard < 0.6) vs the live 97 or
within batch, topic variety. Insert cohort repeat-v3, live counts
verified by band.

## 3. ssat-verbal-v1 — SSAT Upper Level Verbal pilot, 24 items

Phase 2 begins: the first bankable SSAT content. 12 synonyms + 12
completion analogies, 5 choices (control 20%), difficulty mix per
spec (30/45/25 target across the eventual cohort).

Gates: (a) shape — 5 distinct choices, key verbatim, "[Synonym]" /
"[Analogy]" tags, analogies in the completion format ("X is to Y
as"); (b) withsource — 3 key voters (answer the item cold; ≥2/3
match required, unanimous for hard) + an exclusivity check (exactly
one defensible closest-meaning / relation-reproducing option, judged
blind to the key); (c) nosource = OPTIONS-ONLY attack (stem word /
stem pair withheld): 3 solvers, control = best fixed letter over
5 slots; pass ≤ +25, dead ≥ +30 — the five options must carry
nothing; (d) tells — key letter spread over 5 slots, key-length rank
histogram, no stem reuse vs batch, pattern hunter on the attack.
DB: family 'ssat', section 'verbal', task 'multiple_choice',
cohort ssat-verbal-v1, via a new insert path modeled on
bank-helper.mjs (dedicated helper, written before insert, with the
task column from day one). Banking does NOT flip SSAT into
SHIPPED_TEST_SLUGS — mocks need all sections banked plus assemble
blueprints; that wiring is a separate later step.

## 4. isee-verbal-v1 — ISEE Upper Level Verbal pilot, 24 items

12 synonyms + 12 sentence completions (one- and two-blank), 4
choices (control 25%), no guessing penalty — distractors attract on
meaning only.

Same gate structure as ssat-verbal-v1 with 4-slot controls; for
sentence completions the nosource attack withholds the SENTENCE
(options only); the exclusivity check verifies the logic cue forces
exactly one choice. DB: family 'isee', section 'verbal', task
'multiple_choice', cohort isee-verbal-v1, same new helper.

Shared: drop never edit; identical pick-strings = no verdict;
incomplete solver files refused and re-run; payload files verified
on disk before any agent launch (the interview-v2 lesson).

## Addendum (2026-08-28, late): eoi RS revision 2 — FINAL

Rev-1 (paired corruption) defeated the consensus checker (23% expected
blind) but INVERTED the tell: on a contested slot the wrong value
appears twice and the true value once, so the minority value marks the
key (hunter rule; mechanical inverse checker 4/7 decided = 57%;
sampling attack +13.9 passed the bar but absolute 63.9%). Rev-1's 30
items do not ship.

Revision 2, the LAST allowed before the RS approach is refuted:
- BALANCED SLOTS: every contested value appears in exactly TWO options
  — the wrong value in two distractors OR the true value in the key
  plus one distractor that is wrong for a DIFFERENT, non-numeric
  reason (goal mismatch, dropped qualifier). No slot may be 1-vs-2 in
  either direction.
- COHERENT CLONES: a cloned wrong value must be internally consistent
  in its host sentence (no "most" beside a 30% figure — the
  self-contradicting-twin rule).
- Zero-unique-token distractor and form symmetry retained.

Gates: check-consensus-tell ≤ 30% expected blind AND the inverse
(minority-value) checker ≤ 30% of decided AND a sampling attack with
consensus- and minority-aware solvers ≤ +25 AND the hunter finding no
rule at 3+ items. If rev-2 fails any, the RS brief family is REFUTED:
the live eoi-v3 RS 32 archive WITHOUT replacement (EoI takes the
capacity hit) and RS authoring stops pending a genuinely new design.
The live 32 stay up only until this verdict — hours, not weeks.
