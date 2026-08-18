# ATV2 pilot — blind attack CLEAR, margin −4.2 (2026-08-18)

Phase 1 of the Academic Talk rebuild (design: ATV2-DESIGN.md). 6
lectures × 4 questions = 24 items in the live row shape. NOTHING
banked, nothing archived, blueprint untouched, no commits. The 275
live Academic Talk items are unchanged.

## Provenance chain (per the pre-registered execution order)

1. Design doc written and kill rule pre-registered BEFORE any item
   existed (ATV2-DESIGN.md).
2. Option layer authored (atv2-quads.json), then TWO pre-freeze
   reviewer passes (atv2-prefreeze-review.md + a targeted re-review).
   First pass killed the original Neuroscience lecture whole — the
   fictional sleep study was a recognizable clone of the real
   targeted-memory-reactivation paradigm ("the paradigm, not the
   entities, is what a well-read solver recognizes") — and found two
   sibling leaks and a slot-locked verdict template. Second pass
   found one more real blocker (Ecology q2: the gut-passage setting
   was the dodo–tambalacoque story AND collided with three q1
   settings). All required rewrites done pre-freeze; final verdict
   "NO REQUIRED REWRITES — FREEZE OK".
3. **FROZEN**: atv2-quads.json sha256
   `e5b2b45d8f54d2b49ef97bd441bf75c6f6765ec3216fbfb8435722568518a962`.
   atv2-render.mjs refuses to assemble if this sha changes.
4. Seeded selection with the pre-registered fixed literal
   **`atv2-20260818`** (per-pivot streams `seed:lecture:pivot`; letter
   deal stream `seed:letters`, dealt flat 6/6/6/6 → control exactly
   25.0%). Selection in atv2-selection.json. No Date.now anywhere.
5. Transcripts + explanations + kill rationales authored for the
   SELECTED worlds only (atv2-spoken.json). No option text touched
   after selection (enforced by the sha check).
6. Machine checks (atv2-checks.mjs), kill-quote checker **break-tested
   first** on a known-bad fixture — the first version of the checker
   FAILED its own break-test (straight-apostrophe spans truncated at
   `team's`), which is exactly the quoting bug the fixture existed to
   catch; fixed, break-test green, then:
   - kill quotes: **72/72** anchor a ≥3-word verbatim span of their
     lecture's transcript
   - letter spread 6/6/6/6 (asserted)
   - key length rank 7/6/6/5 (worst slot 29%, bar 40%)
   - hedge rate keys 8.3% vs distractors 9.7%; absolutes 8.3% vs 5.6%
   - sibling 3-gram leakage: 3 hits, all WAIVED with reasons on the
     record in the checker ("at the time" idiom; the p5 topic phrase
     "the shift was already" counted twice) — option text is frozen,
     so benign hits are waived visibly, never edited away
   - cross-lecture near-duplicates (J ≥ 0.6): none
7. Blind render (atv2-pilot.blind.json / .key.json): stems + options
   only, seeded order shuffle, topic tags visible (sibling grouping
   deliberately transparent — the harshest cross-reference setup).
8. 3 Claude solver subagents, forced choice, blind file only.
9. Scored by atv2-score.mjs, **break-tested first**: rotated keys
   score 29.2% (shift 1) and 36.1% (shift 2) vs 20.8% on the true key
   — the scorer reads content, not position.

## The attack

    solver a    5/24 = 20.8%   confident 3/14   spread 5/6/6/7
    solver b    6/24 = 25.0%   confident 2/12   spread 4/6/8/6
    solver c    4/24 = 16.7%   confident 2/15   spread 5/6/5/8

    MEAN 20.8%   control 25.0% (flat by construction)   MARGIN −4.2
    all-3-solved 4/24   zero-solver items 18/24
    41 confident picks, 7 correct (17.1%)

**Pre-registered verdict: CLEAR** (kill ≥ +30, clear ≤ +25, n=24).
The pilot sits BELOW chance, like cr-v7 S1 (−16.7). For comparison,
the live Academic Talk bank measured the same day scored 99.2% /
margin +70.0 with the same instrument (MC-ATTACK-2026-08-18.md).

## The solvers' heuristics — loud, shared, and counted

All three solvers reported HIGH confidence of beating chance
("I would bet heavily", "central estimate 60–75%", "I'd bet on
beating chance at real odds") and all three converged on the same
two channels — which is exactly what the construction predicts and
defuses:

1. **World-knowledge / textbook-narrative fit** ("sediment cores →
   gradual rainfall decline", "the canonical findings in their
   fields — a distractor would be the surprising claim"). Under
   seeded keying the textbook option is the key 25% of the time; the
   solvers scored 16.7–25.0%.
2. **Sibling narrative coherence** — all three called it the dominant
   tell ("each lecture's four items can be solved as a joint
   coherence problem"; "one thesis told three times"). This is the
   channel requirement 3 was built against: every option is
   consistent with every world, so the "maximally coherent story" is
   a story about the solver's priors, not the spoken world. Counted:
   the coherent-story picks are the solvers' actual picks, and they
   scored below chance.
3. Named sub-heuristics, counted against the population per the
   standing rule (the hypothesis is counted, not just out-scored):
   - "the verdict item's key is consistently the hedged/nuanced
     option" (all three solvers): the hedged option is the key on
     **1 of 5** attitude pivots (20%, chance 25%).
   - "7D's corroboration wording is almost self-authenticating"
     (solver c, trust: high): that option is a **distractor** (the
     account-books key is the payment stoppage, and the transcript
     kills the corroboration reading — "don't itemize the pigments").
   - Length, punctuation, and letter position: all three solvers
     independently reported these as absent/unusable.

Solver c also stated the tail risk precisely: "if the authors
deliberately keyed against coherence… my strategy is anti-correlated
and I could land below chance." No one keyed against anything — the
RNG never saw the text. Below-chance is what an anti-correlated prior
looks like when the key is independent of it; expected margin on a
future slice remains ~0, and (cr-v7 invariant) a LARGE positive on a
future slice means tampering, not drift.

## What this does and does not establish

- ESTABLISHED: a 24-item Academic Talk set in the live delivery shape
  whose keys are unanswerable from option text to the instrument that
  scores the live bank at +70.0 — cleared under the rule fixed before
  authoring began.
- NOT ESTABLISHED: quality WITH the audio. The blind attack cannot
  see two-defensible-answer defects, transcript naturalness/TTS fit,
  or whether distractor wrongness is felt rather than merely
  provable. Transcripts run ~260–300 words vs the live ~210–260 —
  Phase 2 should tighten the band or accept the longer talks
  explicitly. The waived p5 "the shift was already" echo pairs a
  distractor with a key this draw; a with-source exclusivity pass
  (the cr-v7 cohesion instrument) and ultimately the human sitting
  (B4) remain the verdict on item quality.

## Recommendation — proceed to Phase 2 (scale), design unchanged

The mechanism transfers from Choose a Response to lecture sets: pivot
independence + post-freeze seeded selection killed both the
world-knowledge tell (+70.0 → −4.2) and the sibling-coherence channel
in one construction. Phase 2 per the design doc:

1. Scale in batches of 6–8 lectures with DIFFERENT authors per batch
   (cr-v7 S2 pattern), each batch through the same pre-freeze review
   → freeze → select → transcripts → checks → per-batch blind attack
   on a cross-batch sample.
2. Add the with-source exclusivity checker (judge all 4 options WITH
   the transcript, blind to the key) before any banking — the pilot
   has NOT had this pass.
3. Keep set sizes at 4 (the blueprint draws even counts; live bank
   also holds 2- and 3-question sets — decide whether ATV2 replaces
   those shapes too or only the 4-sets).
4. Human sitting per SITTING-PROCEDURE.md before any swap; Andy's
   rule stands — delivered counts never change, the 16/4/0/12
   academic_talk row is untouched; the swap is bank-side only
   (insert new cohort, archive old, as cr-v7 did).

## Files

    ATV2-DESIGN.md            pre-registered design + kill rule
    atv2-quads.json           FROZEN option layer (sha above)
    atv2-prefreeze-review.md  first reviewer pass (verbatim)
    atv2-selection.json       seeded world selection + letter deal
    atv2-spoken.json          transcripts, explanations, kill reasons
    atv2-items.json           24 rows, live study_item_bank shape
    atv2-render.mjs           select | assemble (sha-gated) | blind
    atv2-checks.mjs           machine checks (--fixture break-test)
    atv2-score.mjs            scorer (--shift break-test)
    atv2-pilot.blind.json / .key.json / .solver-{a,b,c}.json
