# bas-v1 — results (SHIPPED 2026-08-28)

Pre-registration: BAS-V1-PREREGISTERED.md. 60 authored by 12 agents
under assigned structure families; 57 banked.

## Gate 1 — shape (deterministic)

One failure: B17 carried a 5-word chip ("that had approved it
earlier"). Dropped, never edited. The other 59: chips 5-7 × 1-4 words,
keys exact permutations, no case-insensitive duplicate chips, no
terminal punctuation, choices scrambled, positional-explanation check
clean.

Tells alongside: passive-with-agent skeleton (the harvest-v1 saturated
template) 1/59; key-token Jaccard < 0.5 against all 108 existing keys
and within batch; difficulty 24 hard / 36 medium as authored.

## Gate 2 — assembly convergence (3 blind solvers per item, chips only)

56/59 items: ALL THREE solvers reproduced the key exactly. B37: 2/3
exact, and the third produced the identical sentence with two chips
transcribed as one ("a permanent position" for "a permanent |
position") — a boundary artifact, not ambiguity; a tapping student is
constrained to the real chips. Zero convergence failures. This is the
strongest well-definedness result any cohort has posted.

## Gate 3 — adversarial alternative-order hunt (3 hunters per item, key shown)

15 hunters produced 2 valid permutation claims across 59 items:

- B11: the conditional postposed ("It automatically switches ... if
  the projector overheats"). Blind 3-judge panel: 1/3 acceptable.
- B15: "about the schedule change" reattached to the session ("must
  attend the makeup session about the schedule change"). Panel: 1/3.

Ruling recorded before scoring the panel: the pre-registration's kill
clause — "any alternative judged acceptable-or-better kills the item"
— carries no majority qualifier, so a single blind acceptance kills.
Both items DROPPED. Supporting observation: each had violated its own
welding doctrine (B11's brief required the if-clause be FORCED first;
it was not — the assigned-family rotation predicted exactly this
defect class).

## Ship

57 rows inserted under BANK_COHORT=bas-v1 via insert-arrange-words
(ledger `bas-v1-2026-08-28` at sha 29f861327c7abcec…; insertFrozen
already writes the NOT NULL task column — pre-checked per the
REGISTER's 068 note). Live verified by count: arrange_words 108 → 165.

Capacity note: Build a Sentence draws per form come from one pool, so
this raises repeat-free form coverage ~1.5x on that task.
