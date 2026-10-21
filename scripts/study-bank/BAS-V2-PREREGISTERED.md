# bas-v2 — pre-registered (2026-10-21), items authored, NOTHING inserted

## Why
TOEFL Writing Build a Sentence (`arrange_words`) binds every path at **16 clean sittings**
(`toefl-form-depth.ts`, 10 per sitting, 165 live). The heaviest real TOEFL students have completed
12 and 11 Writing sittings. Owner, 2026-10-21: "keep going". Production task: no co-founder sitting
applies (nothing is hidden; the chips ARE the item), so bas-v1's gates are the gates.

## The items
`bas-v2.items.json`: **45 items written in-session by Claude** (no agents) to bas-v1's ambiguity
doctrine: every chip one landing slot, no floating time/place/manner adverbial, no symmetric halves
that can swap. 40 structure families (none passive-with-agent), 30 medium / 15 hard. Author self-hunt
before writing caught 5 swappable drafts, rebuilt.

## Gates (bas-v1's, unchanged; drop, never edit)
1. **shape + tells** (`bas-v2-gate1.mjs`, deterministic): 5-7 chips of 1-4 words, key an exact
   permutation, scrambled, no terminal punctuation, no case-insensitive duplicate chip, token-Jaccard
   < 0.5 vs all 165 live keys and within batch. **Result: 0 problems; max Jaccard 0.31 live / 0.25
   batch; passive-with-agent 0/45.** Break-tested: a non-permutation, a duplicate chip and a verbatim
   live key each fail.
2. **assembly convergence**: 3 independent solvers, chips only, per-item seeded shuffle, no key. PASS
   per item = at least 2 of 3 reproduce the key exactly (case-insensitive).
3. **ambiguity hunt**: 3 hunters per chunk, key shown, try to construct a different grammatical,
   natural order; every claimed alternative goes to a blind adjudicator panel (3). **Any alternative
   judged acceptable-or-better kills the item** (bas-v1's ruling: no majority qualifier).
4. If more than a third die at gate 3, the brief is the defect: one revision, then re-register.

**Gates 2-3 need agents (about 9).** Since 2026-10-12 agents are limited to MAP work by the owner, so
they wait on an owner decision. Without them this batch is NOT inserted: gate 1 cannot see a second
valid order, which is the defect that decides this task (exact-order grading marks a correct
student wrong).
