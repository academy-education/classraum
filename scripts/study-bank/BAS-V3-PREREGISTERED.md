# bas-v3 — pre-registered (2026-10-22), before any solver or hunter ran

## Why
Build a Sentence binds TOEFL Writing at 20 clean sittings after bas-v2. Owner, 2026-10-22: "Do all the
three things you brought up" (including agents for this batch's checks) and "make more tests".

## The items
`bas-v3.items.json`: **49 items written in-session by Claude** to bas-v1's doctrine PLUS the rules bas-v2's
hunt taught (its 9 kills): no two swappable human or concrete noun phrases (pronoun objects, or one
animate and one inanimate argument); no pseudo-cleft or reversible copular "X was Y"; no so/such ... that;
no frontable subordinate clause or time/place adverbial; no separable phrasal verb split across chips;
no comparison between two noun phrases. Author pre-hunt replaced one draft ("to buy that expensive a
laptop" was a valid second order). 47 structure families, 31 medium / 18 hard.

## Gates (bas-v1's, unchanged; drop, never edit)
1. `bas-v2-gate1.mjs` (shape, Jaccard < 0.5 vs live and batch). **Result: 0 problems vs all 201 live keys;
   max Jaccard 0.33 live / 0.25 batch.** The gate's live-key query was fixed first: it filtered
   task='arrange_words' and so read 165 of 201 keys (bas-v2 rows carry task='build_a_sentence'); it now
   filters item_type.
2. Convergence: 3 blind solvers, chips only, own seeded shuffle each; PASS = >= 2/3 exact.
3. Ambiguity hunt: 3 hunters with keys; every claimed alternative (and every solver divergence) to 3 blind
   adjudicators; ANY acceptable-or-better verdict kills the item.
4. More than a third killed at gate 3 -> the brief is the defect; one revision, then re-register.
