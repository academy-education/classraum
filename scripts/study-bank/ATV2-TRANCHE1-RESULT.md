# ATV2 Phase 2, tranche 1 — ALL THREE BATCHES CLEAR (2026-08-18)

    at-b1  margin -12.5  CLEAR   exclusivity: 1 flag -> lecture atv2-b1-p4 QUARANTINED (4 items)
    at-b2  margin  -5.2  CLEAR   exclusivity: no flags
    at-b3  margin  +3.1  CLEAR   exclusivity: no flags

    cleared toward ~276: pilot 24 + b1 28 + b2 32 + b3 32 = 116

Status: COMPLETE as a files-only tranche. Nothing banked, nothing committed,
DB untouched, blueprint untouched. The header below was written BEFORE
authoring began, per the pilot's execution order.

## Pre-registered constants (fixed now, before any quad is written)

- Batches: at-b1, at-b2, at-b3 — 8 lectures x 4 questions = 32 items each.
- Seeds (fixed literals, per-pivot streams `seed:lecture:pivot`, letter
  stream `seed:letters`, placement `seed:place:lecture:pivot`):
  - b1: `atv2-b1-20260818`
  - b2: `atv2-b2-20260818`
  - b3: `atv2-b3-20260818`
- Letter deal flat 8/8/8/8 per batch -> fixed-letter control exactly 25.0%.
- Kill rule (unchanged from ATV2-DESIGN.md): margin = mean of 3 Claude
  solvers - control. >= +30 batch DEAD whole (no rescue edits, post-freeze
  option text immutable); <= +25 CLEAR; between = inconclusive, extend n.
- Pipeline per batch: author quads -> fresh pre-freeze reviewer (criteria of
  atv2-prefreeze-review.md + cross-batch vs pilot and other tranche batches)
  -> rewrite/re-review until no required rewrites -> FREEZE (sha256 recorded
  here) -> seeded selection -> transcripts for selected worlds only ->
  atv2-checks.mjs (batch mode) -> blind attack (3 Claude solvers, options+
  stem only) -> atv2-score.mjs (batch mode, --shift break-test first) ->
  with-source exclusivity pass (new vs pilot): grader sees transcript+item,
  blind to key; any item with two defensible options or an unentailed key
  quarantines its whole LECTURE (listed, never edited).
- Tooling: atv2-render/checks/score.mjs parametrized with --batch bN.
  Regression before use: pilot mode re-run produced byte-identical
  atv2-selection.json / atv2-items.json / atv2-pilot.blind.json /
  atv2-pilot.key.json; checks --fixture break-test PASSED; score --shift 1
  on pilot = 29.2% (near chance) vs true-key 20.8%.
- Domains: 24 fresh domains, none of the pilot's six reused.
  - b1: Musicology, Glaciology, Economic History, Marine Biology,
    Urban History, Astronomy, Anthropology, Paleontology
  - b2: Materials Science, Medieval Literature, Ornithology, History of
    Cartography, Meteorology, Theater History, Soil Science, Numismatics
  - b3: Oceanography, Primatology, History of Mathematics, Textile
    Conservation, Folklore Studies, Botany, History of Engineering,
    Sociology
- Difficulty per batch: 5 medium, 3 hard (pilot ratio).
- Different authoring subagent per batch, different stylistic charter each;
  Claude subagents only, never GPT/OpenAI.

## Freeze record (filled at freeze time, never after)

All three batches passed pre-freeze review (round 1: required rewrites in
every batch; round 2 fresh reviewers: b2 and b3 FREEZE OK, b1 blocked by
one cross-batch duplicate slate b1-p1/q1 ~ b2-p4/q2; targeted rewrite of
that one pivot + round 3 targeted fresh review: FREEZE OK). Reviews are
verbatim in atv2-b{1,2,3}-prefreeze-review.md.

FROZEN 2026-08-18, sha256 of the option layers:

    atv2-b1-quads.json  43300aa250a5a9df36fc8cac0bc376061b50b795c3ded2d3901a9a689df9bdc1
    atv2-b2-quads.json  6ee5a8efc8a513de7f3d96dee40b5b05e78bb925fd626ae852c98d5f384c230a
    atv2-b3-quads.json  1acce8eaddecd2cd02bc6f0e4a848b051817ac264db04e1d4c6128ae2bee6263

Seeded selection ran AFTER freeze with the pre-registered seeds
(atv2-b1-20260818 / atv2-b2-20260818 / atv2-b3-20260818); shas recorded in
each atv2-bN-selection.json; render refuses to assemble on sha mismatch.
Key letters dealt flat 8/8/8/8 per batch -> control exactly 25.0%.
No option text or stem may change from this point. Transcript-side typo
fixes that leave options byte-identical are permitted and logged.

## Provenance per batch (execution order held: no step reordered)

1. Three authoring subagents, one per batch, different charters
   (b1 evidence-and-mechanism, b2 interpretation-and-historiography,
   b3 fieldwork-and-method). 24 fresh domains, none of the pilot's six.
2. Round-1 fresh reviewers (one per batch, cross-batch scope incl. pilot):
   REQUIRED rewrites in all three —
   - b1: p5 q1/s1 sibling near-forcing; p6 two entailment leaks;
     p2 q3/s4 cross-batch "agency-handover" echo; renames.
   - b2: p4 q4/s3 leak into q1; p7 q1 pivot-level KILL (Rothamsted clone —
     the pilot's paradigm-recognition failure mode reproduced by a fresh
     author, screened out pre-freeze as designed); p8 q1/s2 leak into q4.
   - b3: batch-level defer-family saturation (5 of 7 attitude slates);
     third occurrence of the agency-handover family; name collisions
     (Serrano, Brenna) with other batches.
   Rewrites applied by the ORIGINAL authors; independent mechanical audit
   re-run by the orchestrator (parse/counts/absolutes/3-grams/names).
3. Round-2 fresh reviewers: b2 FREEZE OK, b3 FREEZE OK, b1 blocked by ONE
   new cross-batch finding (b1-p1/q1 ink-chronology slate duplicated
   b2-p4/q2 — the cross-BATCH recipe check earning its keep). One-pivot
   rewrite (wear/usage axis) + round-3 targeted fresh review: FREEZE OK.
4. FREEZE (shas above) -> seeded selection (pre-registered literals,
   8/8/8/8 letter deals verified) -> transcripts authored for selected
   worlds only, per-batch self-verified 96/96 kill spans, word counts
   210-270 (pilot overshoot band fixed: all 48 transcripts in band).
5. Machine checks (atv2-checks.mjs --batch, all green):
   - built-in --fixture break-test PASSED before any green counted, AND a
     batch-mode break-test: corrupted kill quote in a b1-items copy ->
     checker FAILED it, restored -> PASSED (break the check, both modes).
   - kill quotes 96/96 anchored per batch; letter spread 8/8/8/8;
     key length rank worst slot 12/32 (37.5%, bar 40%);
     hedge/absolute imbalances all within gates; sibling 3-grams none;
     cross-lecture near-dups none. No waivers needed in any batch.
6. Blind attack: 3 fresh Claude solver subagents per batch (9 total),
   options+stems only (blind files verified transcript-free before
   handoff), forced choice, cross-item pattern report demanded.
7. Scored by atv2-score.mjs --batch, --shift 1 break-test run per batch
   first (rotated keys scored 28.1/20.8/17.7% — the scorer reads content).

## The attack (pre-registered rule: >= +30 dead, <= +25 clear)

    at-b1   a 4/32=12.5%  b 4/32=12.5%  c 4/32=12.5%
            MEAN 12.5%  control 25.0%  MARGIN -12.5  -> CLEAR
            all-3-solved 2/32   zero-solver 26/32
    at-b2   a 7/32=21.9%  b 7/32=21.9%  c 5/32=15.6%
            MEAN 19.8%  control 25.0%  MARGIN -5.2   -> CLEAR
            all-3-solved 5/32   zero-solver 24/32
    at-b3   a 10/32=31.3% b 8/32=25.0%  c 9/32=28.1%
            MEAN 28.1%  control 25.0%  MARGIN +3.1   -> CLEAR
            all-3-solved 7/32   zero-solver 21/32

    (pilot, same instrument: -4.2; live Academic Talk bank: +70.0)

Named solver heuristics, counted against the key (the hypothesis is
counted, not just out-scored):

- "nuanced/sophisticated-hedge wins evaluative items" (named by 5 of 9
  solvers): b2's named six items -> 2/6 for both solvers who named them
  (chance 1.5/6); b1's named four -> 1/4. No edge.
- "b2 item 3 answerable from theater-history world knowledge alone"
  (solver a "near-certain", solver b named it too): ALL THREE b2 solvers
  picked A; the key is D. The world-knowledge read was confidently wrong.
- "Signet detail bridges b2 items 16/26" (solver b): 1/2.
- b3 "road-disturbance narrative chain" (items 5/19/27, named by all
  three): 2/3 for each solver (chance 0.75) — the chain partially
  matched the drawn world. This is the one heuristic that paid anything,
  it is draw-specific (the RNG happened to pick a coherent-looking
  tuple), and at population level b3 still sits at +3.1. Watch the
  narrative-coherence channel in future batches; do not repair this one
  (option text frozen, margin far inside the clear line).
- Letter/length/punctuation tells: reported absent by all 9 solvers.
  Solver-pick letter spreads were B/C-heavy while keys are flat, which
  is the anti-correlated-prior signature, same as the pilot.

## With-source exclusivity pass (NEW — the pilot never had one)

One fresh grader subagent per batch: transcript + stem + options, BLIND
to the key (inputs generated without correct_answer fields, verified).
Must solve every item and flag any with two defensible options or an
unentailed key.

    grader vs key:  b1 32/32   b2 32/32   b3 32/32
    (keys cleanly recoverable with the source in every batch — the
     instrument itself is validated by this agreement)

    flags: b1 ONE — item 13 (atv2-b1-p4 q1, Marine Biology): option D
    ("fish tagged at the old site were caught over the new one within a
    single season") is defensible alongside key C from "the older fish
    led the move — they were over the new ground almost at once";
    kill relies on the tagging site being unstated — lawyer-level, not
    listener-level. b2: none. b3: none.

QUARANTINE (listed, never edited): lecture atv2-b1-p4, items 13-16
(q1-q4). The whole lecture is withheld from any future banking step;
the other 7 b1 lectures are unaffected. Post-freeze option text stays
immutable — the lecture is dropped, not repaired.

## Cumulative cleared count toward ~276

    pilot (at-v2-pilot)   24
    at-b1                 32 - 4 quarantined = 28
    at-b2                 32
    at-b3                 32
    TOTAL cleared        116  (~160 to go; ~5 more 8-lecture batches)

## What blocked / notes for tranche 2

- One mid-run harness restart (before any batch file existed) and three
  SendMessage-resumed author sessions whose transcripts stalled at
  wrap-up; their edits were verified independently (parse, counts,
  grep) rather than trusted from reports. No data loss.
- Tooling now takes --batch bN (render/checks/score); pilot mode
  regression-tested byte-identical before first batch use.
- The exclusivity pass earns its place: it caught a listener-defensible
  second answer that 96/96 kill-quote anchoring and a -12.5 blind margin
  both missed. Keep it mandatory before banking.
- Cross-batch review caught a duplicated evidence-slate (ink chronology)
  between two different authors — different-authors-per-batch does NOT
  by itself prevent convergent slates; the cross-batch reviewer pass
  must stay.
- b3's +3.1 with a draw-coincident narrative chain suggests adding a
  post-selection "decoy-narrative" note to transcript-author briefs
  (weave sentences that make non-chosen tuples equally story-coherent)
  — a transcript-side lever, legal post-freeze, worth piloting in b4.
- Human sitting (SITTING-PROCEDURE.md) and TTS pass remain before any
  bank swap; Andy's rule stands — delivered counts never change; the
  16/4/0/12 academic_talk row in assemble.ts untouched.

## Files (per batch bN in {b1,b2,b3})

    atv2-bN-quads.json             FROZEN option layer (shas above)
    atv2-bN-prefreeze-review.md    round-1 + round-2 (+ round-3 for b1)
    atv2-bN-selection.json         seeded world selection + letter deal
    atv2-bN-spoken.json            transcripts, explanations, kills
    atv2-bN-items.json             32 rows, live study_item_bank shape
    atv2-bN-blind.json / -key.json blind attack materials
    atv2-bN-solver-{a,b,c}.json    solver picks
    atv2-bN-exclusivity-input.json key-blind with-source inputs
    atv2-bN-exclusivity.json       grader picks + flags
