# Agent review, wave 2: ISEE Reading, ACT Reading, ACT English, TOEFL (pre-registered 2026-10-30, before any packet is built)

**Owner instruction (2026-10-30):** "proceed to the next questions" — extend the agent review that replaced Daniel's
per-batch verdict for SSAT/MAP to the next staged verbal sections, in his floor-first order.

## Inherited unchanged

Everything in `AGENT-REVIEW-SSAT-MAP.prereg.md` **including Amendment A1**:

- 3 independent graders per packet (a, b plain; c adversarial), each reading only `COFOUNDER-BRIEF-v2.md` and its own
  `packet.json`; same output format; scored by `agent-review-score.mjs` (`--manifest MANIFEST-wave2.json`).
- Item drop: any grader verdict alternative / broken / hold, or a different key. A dropped passage item takes its
  whole passage (passage_group_id).
- A1: answer-letter-position patterns are excluded (choices are reshuffled per student at draw time); a pattern named
  by 2+ graders on 3+ shared items drops only those items (and their passages) when it covers under 50% of the
  cohort, and holds the cohort at 50% or more.
- Release route: nothing is released by this gate. Survivors go to a short Daniel audit sample first (as for
  SSAT/MAP), then `agent-review-release.mjs`, then the owner's go.

## Population (bank-state.mjs counts, 2026-10-30), in this order

1. **isee/reading** — 13 cohorts (isee-reading-draft-4 … -16), 468 staged. First: ISEE Reading is at the floor (5).
2. **act/reading** — act-reading-v8d, v9a, v9b, v10a, v10b, v11a, v11b, v12a, v12b; 324 staged.
3. **act/english** — act-english-v4, 50 staged.
4. **toefl/listening** — academic_talk (toefl-talk-draft-1…7, 296), conversation (toefl-conv-draft-1, -2, 40),
   choose_response (cr-v12, v13, v15–v21, 264); 600 staged.
5. **toefl/reading** — academic_passage (toefl-passage-draft-1…7), 360 staged.

**Skipped, and why:**
- `act-english-v9` (130 staged): two co-founder runs drawn under its current method (act-en9-cofounder-2026-10-10,
  act-en9-pow2-cofounder-2026-10-20); it stays on his path.
- `cr-v14` (35): co-founder spot run drawn (crv14-spot1-cofounder-2026-10-23).
- `harvest-v1` (toefl listening 3 / reading 2, task multiple_choice): co-founder runs drawn, and not a listed task.
- act-english-v10 and act-reading-v13a survivors (40 and 27, cleared 2026-10-29) are **not staged yet**, so they are
  not in the population; they were already graded by their own with-source gate.
- Science is out of scope (owner deciding separately).

## Caveats recorded before grading

- **TOEFL listening is audio.** Graders read the transcript the bank stores in `item.passage`; they cannot judge audio
  quality, pacing, or whether a spoken distinction is audible. A listening survivor is cleared on text only.
- **Model saturation.** CLAUDE.md records that the model options-only attack saturates on ACT Reading and TOEFL MC
  (shipped ACT Reading 96.3% by model vs 10% by a person). This gate does not use guessability numbers: graders look
  for defects (second defensible option, wrong key, fact error, self-contradiction, a cross-item tell). Those
  verdicts remain informative where the blind attack is not — but a "key choosable without the source" flag on these
  families should be read knowing the models over-solve them, and the Daniel audit sample stays the human check.
