# cr-v8 — pre-registered, before any quad exists (2026-08-28)

Run 2 of the cr-v7 METHOD (CRV7-RESULT.md), which cleared both attack
gates (−16.7 pilot, +1.4 held-out) after five brief-based rebuilds
failed. Nothing about the method changes; this run adds capacity:
60 new items → Choose a Response 132 → ~192 (per-form quota 14, so
~9 → ~13 forms on the CR-binding path).

## Method, frozen (identical to cr-v7)

- Each item = FOUR mutually exclusive worlds authored symmetrically:
  every world has its own spoken line AND its own reply; every world's
  line must contain a verbatim-quotable 2+-word span that kills each
  of the other three replies (worlds[i].kills[j], render-verified 4x3
  per item).
- Only after text freeze does the seeded RNG in render-crv7.mjs choose
  the spoken world. Key letters dealt flat -> control exactly 25%.
- NO post-selection edits, ever. Defective items discarded whole.

Pre-committed selection seeds: batch b1 offset 0, b2 offset 100, b3
offset 200 on base seed 20260828 (render --seed-offset), re-roll +1
only on a >25% stimulus-kind/key-act quota violation, all re-rolls
printed by the render.

## Lessons from cr-v7 baked into the BRIEF this time (they were
post-hoc patches last time)

1. Topical neighborhood: all four worlds of an item live in ONE
   conversational sphere (same errand, same office, same plan), so no
   distractor can be eliminated by topic distance. (cr-v7 needed a
   52-distractor cohesion pass for this; authoring to it up front
   avoids breaking the no-edit invariant later.)
2. The b3-20/b3-14 defect class: a reply that works as a NATURAL
   INDIRECT response to another world's line (implicit-no, relaying
   the news, comply-by-avoidance) competes with that world's key.
   Authors must run each reply against the other three lines asking
   "could a cooperative speaker say this here?" — not just "is it
   addressed to a different world".
3. Reaction-token parity: openers like "Great —", "Oh no —" appear in
   keys and distractors at the same rate within each item (the loudest
   solver heuristic in cr-v7, which survived only because the RNG made
   it uninformative — keep it uninformative by symmetry too).

## Gates (stated before authoring)

1. render-crv7.mjs mechanical checks per batch: 720 kills quote their
   own line, schema, reply-length ratio, quota check on stimulus kinds
   and key acts.
2. Blind attack on a 12-item pilot drawn from batch b1 (3 solvers,
   forced choice, flat 25% control): >= +30 KILLED, <= +25 clear,
   between = fresh 12 and re-attack, per the standing pre-registration.
   b2/b3 rendered only after b1 clears.
3. Exclusivity: the FROZEN EXCLUSIVITY-GRADER-BRIEF.md quoted verbatim
   (never rewritten — the 2026-08-19 lesson) over all 60, blind to the
   key; any non-unique item discarded whole.
4. Tells pass over the 60: letters flat by construction; key length
   rank worst slot < 40%; hedge/intensifier parity; no near-dup pairs
   vs cr-v7's 132 or within batch.
5. Ledger entry at the items-file sha, then insert via the bank-crv7
   path (flat letters preserved — NEVER insert-listening, whose
   shuffle would destroy the measured letter deal), cohort cr-v8.
