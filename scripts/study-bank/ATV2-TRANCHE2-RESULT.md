# ATV2 Phase 2, tranche 2 — IN PROGRESS (2026-08-18)

Batches at-b4 .. at-b8. This header is written BEFORE any tranche-2 quad
exists, per the pilot's execution order. Nothing banked, nothing
committed, DB untouched, blueprint untouched.

## Pre-registered constants (fixed now, before any quad is written)

- Batches: at-b5..at-b8 — 8 lectures x 4 questions = 32 items each.
  at-b4 — **9 lectures** x 4 questions = 36 items: the ninth lecture is
  the replacement for quarantined atv2-b1-p4 (Marine Biology), folded
  into b4 so it rides the full pipeline. 164 new items total.
- Seeds (fixed literals, streams as in tranche 1):
  - b4: `atv2-b4-20260818` (letter deal flat 9/9/9/9 -> control 25.0%)
  - b5: `atv2-b5-20260818`
  - b6: `atv2-b6-20260818`
  - b7: `atv2-b7-20260818`
  - b8: `atv2-b8-20260818`
  (b5-b8 letter deals flat 8/8/8/8 -> control exactly 25.0%.)
- Kill rule unchanged (ATV2-DESIGN.md): margin = mean of 3 Claude
  solvers - control. >= +30 batch DEAD whole (no rescue edits), <= +25
  CLEAR, between = inconclusive, extend n.
- Pipeline per batch: identical to tranche 1 (author -> fresh pre-freeze
  reviewer with cross-batch scope vs ALL frozen material incl. pilot,
  b1-b3, and the other tranche-2 batches -> rewrite/re-review to zero
  required rewrites -> FREEZE (sha256 here) -> seeded selection ->
  transcripts for selected worlds only -> atv2-checks.mjs -> 3-solver
  blind attack -> atv2-score.mjs (--shift break-test first) ->
  MANDATORY with-source exclusivity pass, key-blind; any flag
  quarantines its whole lecture, listed never edited).
- Tooling: atv2-render/checks/score.mjs get a b4-only lecture-count
  override (9/36). Because the scripts are modified, ALL break-tests
  re-run before any green counts: checks --fixture, score --shift, and
  a byte-identical regression of the b1 pipeline outputs.
- Domains: 41 fresh domains, none used in pilot or b1-b3, none reused
  within tranche 2 (grep-verified against every prior atv2 file):
  - b4 (9): Epigraphy, Seismology, Dance History, Entomology,
    Historical Demography, Acoustics, Papyrology, Limnology,
    Garden History
  - b5: Mycology, History of Medicine, Architectural History,
    Lexicography, Herpetology, History of Photography, Naval History,
    Sedimentology
  - b6: Parasitology, History of Printing, Dendrochronology,
    Museum Studies, Legal History, Speleology, Horology, Mammalogy
  - b7: Viticulture, Geodesy, History of Education, Coastal
    Geomorphology, Translation Studies, Postal History, Arachnology,
    Palynology
  - b8: History of Chemistry, Furniture History, Cinema History,
    Mineralogy, Agricultural History, Ceramics History, Historical
    Geography, Apiculture
- Difficulty: b5-b8 5 medium / 3 hard; b4 6 medium / 3 hard.
- Different authoring subagent per batch, different stylistic charter
  (b4 archives-and-provenance, b5 measurement-and-instrumentation,
  b6 revision-and-reattribution, b7 comparison-and-transmission,
  b8 practice-and-craft). Claude subagents only, never GPT/OpenAI.
- Tranche-1 lessons applied: transcript-author briefs include the
  decoy-narrative lever (weave sentences that make non-chosen tuples
  equally story-coherent); the SELECTED worlds of each batch are
  checked for cross-lecture thematic/narrative chains before the
  attack and the finding recorded here either way; stalled subagent
  transcripts are verified by independent file audit, never trusted
  from reports.

## Tooling regression (run once, before any tranche-2 green counted)

The scripts were modified for b4's 9-lecture/36-item case, so per the header
every break-test was re-run first:

- `atv2-checks.mjs --fixture` PASSED (fails the bad quote and the 2-word
  quote, passes the curly-apostrophe good quote).
- `atv2-score.mjs --batch b1 --shift 1` = 20.8% vs true-key 12.5%; the
  scorer reads content, not position.
- Byte-identical regression: re-running `select`/`assemble`/`blind` for BOTH
  b1 and the pilot reproduced all 8 output files byte-for-byte.

A pre-freeze quads auditor was also built (parse/counts/seed/difficulty/qtype
orders/absolutes/sibling 3-grams/cross-lecture near-dups/name collisions/
domain reuse). It was validated against data whose answer was known: it
reproduces the "zero sibling 3-grams, zero near-dups" result on frozen
b1/b2/b3, and a deliberately corrupted fixture makes every detector fire.
Two of its detectors were WRONG on first run and were caught only by that
known-good run — a substring matcher flagged "whenever" as the absolute
"never", and a proper-name extractor flagged sentence-initial ordinary words
("Where", "Several", "Take") as names, producing 16 false collisions. Both
fixed before any b4 result was believed.

---

# at-b4 — CLEAR at +10.2, one lecture quarantined

    margin +10.2  CLEAR (pre-registered bar: <= +25)
    exclusivity: 1 flag -> lecture atv2-b4-p7 QUARANTINED (4 items)
    cleared from this batch: 36 - 4 = 32

## Pre-freeze review (3 rounds, each a FRESH reviewer)

Round 1: **13 REQUIRED rewrites** across seven lectures plus five mechanical
sibling-3-gram hits. The batch-level blocker was a paradigm-recognition kill:
b4-p3/q1 asked whether a notation roll was the master's or his rehearsal
director's — the single most-cited configuration in dance-notation history,
so the real-world-true setting was identifiable without any audio. The pilot's
TMR clone and b2-p7's Rothamsted clone are the same failure mode; this is the
third time a fresh author has walked into it, and the third time the
pre-freeze reviewer caught it. Also required: an ink-chronology detail slate
that reproduced the FROZEN b2-p4/q2 slate (the same convergent-slate finding
that blocked b1 in tranche 1 — different authors keep converging), the
agency-handover family reaching a third batch, and a publish-one-class-first
family occupying four pivots.

Round 2 (fresh): confirmed all 13 were fixed at the axis rather than
relabelled, and found **one NEW leak created by the round-1 rewrite itself** —
the rebuilt p3/q1 s4 ("entrances redrawn for a later season") was the only
later-work mention in q1, and p3/q3 s3 ("later ink additions imaged
separately") was the only later-work mention in q3, so either handed a solver
the other. Every round of this project has created work for the next one.

Round 3 (fresh, and fresh ON PURPOSE): the round-2 reviewer authored the
round-2 diagnosis, so asking it to certify its own fix is the "a comment
asserting an invariant is not evidence the invariant holds" trap. A fresh
reviewer was briefed on the criteria and the changed text but NOT on the
round-2 verdict, so it could not be anchored. It independently returned
**FREEZE OK, zero required rewrites**, and additionally reviewed a second
setting (p7/q2 s4) that had changed after round 2 and that round 2 had never
seen. The round-2 reviewer, asked separately, agreed — but that agreement is
recorded as corroboration, not as the gate.

**The mechanical audit is NOT clearance for a semantic fix.** b4's audit was
green (0 sibling 3-grams, 0 absolutes, 0 near-dups, 0 name collisions) both
before and after the round-2 defect existed, because that defect was a
presupposition dependency that produced no shared n-gram at all. The green
proves no new MECHANICAL hit and nothing more. This is the CLAUDE.md
structural-proxy lesson arriving on schedule.

## Freeze record

FROZEN 2026-08-18, sha256 of the option layer:

    atv2-b4-quads.json  6f206e308d462bacd4ab9da00a346aaf2dd7ca56197eae2e94facd34e9f0dbbe

Seeded selection ran AFTER freeze with the pre-registered literal
`atv2-b4-20260818`; sha recorded in atv2-b4-selection.json and re-checked by
render on assemble. Letter deal flat **9/9/9/9** -> control exactly 25.0%.
No option text or stem changed after this point.

## Machine checks — one PRE-FLIGHT FAILURE, recorded not waived

    kill quotes        108/108 anchored (36 items x 3)
    letter spread      9/9/9/9
    hedge/absolute     keys 0.0% vs distractors 2.8%; absolutes 2.8% vs 0.0%
    sibling 3-grams    none
    cross-lecture dups none
    key length rank    13/7/15/1  -> worst slot 41.7%, bar 40%   ** FAILED **

The length-rank check FAILED and could not be fixed: option text is immutable
post-selection, and re-drawing the seed to obtain a nicer distribution would
be seed-shopping, which would destroy the very independence claim the design
rests on. So it is recorded as a failure and its exploitability was MEASURED
exactly rather than argued about:

    content-blind "always pick the longest option"   12/36 = 33.3%  (+8.3)
    content-blind "eliminate shortest, then guess"          32.4%   (+7.4)
    "always pick the shortest"                        2/36 =  5.6%

Note what this means: the key is chosen by an RNG that never saw the text, so
the rank distribution is a DRAW over fixed lengths, not an authoring
artifact — but a single 36-item draw can still land correlated (chi-square
13.3 vs flat, df=3, p~0.004). The design guarantees independence in
EXPECTATION; the pre-flight bar exists precisely to catch the draw that
doesn't cooperate, and here it did its job. For comparison the frozen batches
sat at 34.4 / 37.5 / 31.3% worst-slot.

## The attack

    at-b4   a 13/36=36.1%  b 11/36=30.6%  c 14/36=38.9%
            MEAN 35.2%  control 25.0%  MARGIN +10.2  -> CLEAR
            all-3-solved 9/36   zero-solver 19/36

Break-tests first: --shift 1 = 27.8%, --shift 2 = 16.7%, true key = 35.2%.
The true key scores highest, so the scorer is reading content.

This is the worst ATV2 margin so far (pilot -4.2, b1 -12.5, b2 -5.2,
b3 +3.1, b4 +10.2). It clears the pre-registered bar with room, but the
trend is upward and b5-b8 should be watched, not assumed.

## Named heuristics, COUNTED against the key

The rule is that a hypothesis is counted, not just out-scored:

- **"The received story is an artifact of how the evidence was made"** —
  named independently by solvers A and C as the batch's biggest exposure,
  and it was ALSO the orchestrator's own pre-attack hypothesis (5 of 9
  drawn worlds have that shape). Counted on solver C's eight named items:
  **3/8, 2/8, 2/8 against a chance of 2.0. It pays nothing.** The reason it
  fails is visible in the quads: b4's archives-and-provenance charter puts
  artifact-shaped readings in the DISTRACTORS too, so the shape does not
  identify the key. A loud, plausible, independently-corroborated tell that
  is worth exactly zero — which is why it gets counted rather than believed.
- **"Prefer the reframe over endorse/reject on position items"** (solver A):
  3/8 vs chance 2.0. Nothing.
- **"The thesis licenses the next step"** (solver A; the sibling-enablement
  channel, named in some form by ALL THREE solvers): **5/9 vs chance 2.25.**
  This is the real leak and the strongest single heuristic found in any ATV2
  batch to date. The "what will they do next" option that is *enabled by*
  the lecture's thesis is identifiable without the audio, because the other
  three are generically sensible research activities. This is the same
  channel as b3's narrative chain, and it is now confirmed twice.
- **Length**: all three solvers explicitly reported NOT using it, and their
  picks landed on the longest option 12/10/8 of 36 — at or below the 9/36
  chance rate. So b4's +10.2 is content-driven, and the +8.3 length tell is
  a SEPARATE, additive, entirely unexploited edge. A solver combining both
  would beat all three of these.
- Letter/punctuation/specificity/hedging tells: reported absent by all three,
  and each said so after checking rather than in passing.

## With-source exclusivity pass

Fresh grader, transcript + stem + options, blind to the key (input file
verified to contain no correct_answer, no explanation, no rationales).

    grader vs key: 36/36  — keys cleanly recoverable with the source, which
    validates the instrument before its flags are trusted

    flags: ONE. Item 22 (atv2-b4-p7 q1, Papyrology), option C ("Its entries
    pace out the sales month by month, showing how slowly material of this
    kind moved") is not refuted anywhere; the transcript's "Its months run at
    an even pace, with no slow seasons to read" arguably SUPPORTS it, and it
    is separated from the key only by rhetorical framing rather than by any
    incompatible assertion. Its two siblings are killed outright, so C is a
    lone unrefuted survivor.

QUARANTINE (listed, never edited): lecture **atv2-b4-p7**, items 2/18/22/26.
The whole lecture is withheld; the other 8 b4 lectures are unaffected. Option
text stays immutable — the lecture is dropped, not repaired.

**A transcript-side finding for b5-b8, from the same grader:** in all 36
items the key was the one option restating a positive assertion while each
distractor was negated by an explicit "not X" clause. Items were cleanly
solvable, and this is invisible to a blind solver (it needs the source) — but
it means a listener can score by tracking negations rather than by
understanding, and item 22 was flagged precisely because it was the one place
the negation was missing. **b5-b8 transcript briefs must require the
refutation FORM to vary** — contrast, incompatible assertion, corrected
misstatement, a concession that narrows — not a uniform "not X" construction.

## Deviation log (b4)

- The transcripts were authored by TWO subagents (p1-p5, p6-p9) writing
  separate files that the orchestrator merged, rather than one author per
  batch as in tranche 1. Reason: a credit/API failure mid-batch should cost
  at most half a batch. Both parts were verified independently by the
  orchestrator (parse, kill-index match against the selection, 60/60 and
  48/48 verbatim spans, word counts) rather than trusted from their reports.
- Cross-batch constraint carried forward: b4's p3/q1 axis overlaps
  still-unfrozen **b8-p3/q1**, and the overlap is member-for-member on the
  partial-endorsement setting. b4 froze first, so **b8 must move that s4
  member and the axis** — this is in the b8 authoring brief, not only here.

## Cumulative cleared count toward ~276

    pilot 24 + b1 28 + b2 32 + b3 32   = 116  (tranche 1)
    at-b4  36 - 4 quarantined          =  32
    TOTAL cleared                       = 148

---

# CORPUS-LEVEL MEASUREMENTS (run before b5's attack, at the coordinator's direction)

## 1. b4's length-rank failure is a local blip, not a corpus defect

b4 failed the per-batch length-rank bar (41.7% vs 40%). Students never sit
one batch, so the number with power is the POOLED one:

    batch   n   rank 0/1/2/3        worst%   always-pick-longest
    pilot  24   7/6/6/5              29.2%   29.2%
    b1     32   8/11/8/5             34.4%   25.0%
    b2     32   6/12/8/6             37.5%   15.6%
    b3     32   9/10/6/7             31.3%   25.0%
    b4     36   13/7/15/1            41.7%   33.3%
    POOLED 156  43/46/43/24          29.5%   25.6%  (edge +0.6)

**Pooled worst slot 29.5%, well within the 40% bar; pooled always-longest
+0.6, i.e. nothing.** A simulation puts P(worst slot >= 41.7% | flat, n=36)
at 3.4%, so across five batches seeing one such blip is expected. **b4 is
KEPT**; the local blip and its +8.3 in-batch length edge are recorded as a
known, documented, unexploited artifact of one draw.

One real residual: pooled, the key is the SHORTEST option on only 24/156 =
15.4% against a flat 25% (z = -2.77, p < .01). So "eliminate the shortest,
then guess" pays +3.2 corpus-wide. Small, but it is the one length effect
that survives pooling, and it should be watched as n grows.

## 2. The instrument has NOT drifted — the margin trend is real

The margins rose monotonically (-4.2, -12.5, -5.2, +3.1, +10.2), which is as
consistent with solver drift as with batch drift. Tested directly: the b1
blind attack was RE-RUN against the frozen b1 files with the CURRENT solver
prompt and three fresh solvers.

    b1 original (tranche 1)   12.5 / 12.5 / 12.5   MEAN 12.5%   margin -12.5
    b1 re-run   (now)         12.5 / 12.5 / 21.9   MEAN 15.6%   margin  -9.4

A 3.1-point difference, under one standard error of the 3-solver mean (~3.4
pp). The scorer used was break-tested first by reproducing the original
-12.5 exactly on the original solver files. **The instrument is stable, so
the rising margins are a property of the batches, not the measuring device.**

---

# at-b5 — CLEAR at +6.3, two lectures quarantined

    margin +6.3  CLEAR (bar: <= +25)
    exclusivity: 3 flags in 2 lectures -> atv2-b5-p5 and atv2-b5-p8 QUARANTINED
    cleared from this batch: 32 - 8 = 24

## Pre-freeze review (3 rounds, fresh reviewer each)

Round 1: **13 REQUIRED**, including a second paradigm-recognition kill —
b5-p4/q1 was a transparent Oxford English Dictionary silhouette
(correspondents' quotation slips, fascicles, a chief editor with an
annotated rival wordbook) whose slate was rankable by real-world truth, with
s3 the received modern critique and s1 the traditional defence. That is the
FIFTH batch in which a fresh author has walked into this failure mode and
the fifth time the pre-freeze reviewer has caught it. Also: b5-p1/q1
reproduced FROZEN b4-p8/q4 member-for-member on 3 of 4 members.

Round 2 (fresh): **6 more, four of them created or left standing by the
round-1 rewrite.** Two were mutual-exclusivity failures — settings that
could both be true at once, so they were never genuine alternatives. One
(p2 q1/s2 x q2/s2) had ZERO shared content words, so no mechanical check
could ever see it.

Round 3 (fresh): **FREEZE OK, zero required.** It confirmed the p4 q3/s4
leak had not relocated a third time (round 1 had moved it rather than killed
it) and that no one-to-one next-step licensing survived anywhere in b5.

**Author-model note:** the b5 rewrite subagent died mid-task on an API
safeguard false-positive, not on anything wrong with the work. It was
re-spawned with an explicit `model: "sonnet"` override and a compacted brief
carrying less verbatim reviewer prose. All six round-2 items were then
verified INDEPENDENTLY by id against the round-2 list before freeze, not
taken from the author's report. Recorded here so that if b5's numbers ever
look anomalous against its siblings, the authoring-model change is a
candidate explanation on the record.

## Freeze record

    atv2-b5-quads.json  a44352322bdcca877e1fc2e513fc2f131d4cdd13f148547debc31655fcc422cb

Selection ran after freeze with `atv2-b5-20260818`; letter deal flat 8/8/8/8
-> control exactly 25.0%.

## Machine checks — all green

    kill quotes 96/96   letter spread 8/8/8/8
    key length rank 10/7/8/7 (worst 31.3%, bar 40%)  <- b4's failure not repeated
    hedge keys 3.1% vs distractors 2.1%; absolutes 0.0% vs 0.0%
    sibling 3-grams none; cross-lecture near-dups none

## The attack

    at-b5   a 10/32=31.3%  b 10/32=31.3%  c 10/32=31.3%
            MEAN 31.3%  control 25.0%  MARGIN +6.3  -> CLEAR
            all-3-solved 8/32   zero-solver 20/32

Break-tests: shift 1 = 33.3%, shift 2 = 15.6%, true key = 31.3%. Note the
true key does NOT score highest — a rotation beats it. That is not a scorer
fault (shift 2 is far below); it is evidence the solvers are close to chance
on this batch, which is the intended outcome.

## Named heuristics, COUNTED

- **"The apparent signal is an artifact of how it was measured"** — named by
  ALL THREE solvers as the batch's biggest exposure, and all three bet on it.
  Counted on the six items they named: **1/6, 0/6, 0/6 against a chance of
  1.5.** Below chance. This is the second batch in which this family was the
  loudest solver hypothesis and the second in which it paid nothing; the
  decoy-narrative lever putting the same shape in distractors is working.
- **Thesis items** (5, 20, 23, 24, 25, 27): 2/6, 1/6, 1/6 vs chance 1.5.
  Nothing.
- **Length**: always-longest 31.3% (+6.3); all three solvers reported not
  using it and reported the length control as visibly effective.
- **The next-step / enabled-by-thesis channel: 3/4, 2/3, 3/3.** See below —
  this is now the finding of the tranche.

## With-source exclusivity pass

    grader vs key: 32/32 (instrument validated by agreement before flags trusted)

    flags: THREE
      item  8 (p5/q2, detail)    second_defensible — option D restates the
            key's first half; only a trailing "too few to move the model"
            separates them
      item 17 (p8/q3, detail)    weak_refutation — "Two stations had moved
            between crews" is asserted as fact and never contradicted;
            separated from the key by rhetorical placement only
      item 30 (p5/q4, attitude)  unentailed_key — the transcript voices no
            stance; the key requires an inference it never licenses, and is
            reachable only by elimination

QUARANTINE (listed, never edited): **atv2-b5-p5** (items 8/13/24/30) and
**atv2-b5-p8** (items 17/20/31/32). 8 items withheld; the other 6 lectures
unaffected.

## The b5 refutation-form fix WORKED, and revealed the next tell underneath

b4's grader found that every key was the lone positive assertion among three
"not X" negations. b5's transcript briefs required the form to vary, and
b5's grader confirms it succeeded: refutations are genuinely spread across
incompatible positive assertions, corrected misstatements, concessions that
narrow and scope defeaters, with no form dominant.

**But a NEW uniformity replaced it, and it is positional:** in roughly 26 of
32 items the key restates the FIRST assertion made after the topic is
announced, with every distractor a later sentence carrying its defeater. The
topic announcements are audible ("Coal returns, finally.", "Hedravean.",
"Why Fenrith?"), so "take the first claim after the topic marker" is a
listener-available strategy, not merely a text artifact. The stance items
invert it into an equally regular shape (rival's claim, then the professor's
verdict immediately after).

This is the same class as key-in-slot-A and the ABCD-permutation defect, no
existing script would see it, and it is the third distinct transcript-side
uniformity found in two batches. **b6-b8 transcript briefs must require the
key's position within its paragraph to VARY** — and the lesson generalises:
fixing one uniformity in a rigid brief tends to install the next one, so the
brief should specify variation as a property to be checked, not a list of
forbidden constructions to route around.

## Cumulative cleared count toward ~276

    tranche 1 (pilot 24 + b1 28 + b2 32 + b3 32)   116
    at-b4  36 - 4 quarantined                        32
    at-b5  32 - 8 quarantined                        24
    TOTAL cleared                                   172

## at-b6 .. at-b8

(pending — see the BLOCKING FINDING below, which should be resolved first)

---

# BLOCKING FINDING: the batch margin is a blend that hides a broken question type

Both b4 and b5 CLEARED on batch margin. Measuring a priori by QUESTION TYPE
— not by any solver-named heuristic, so there is no self-selection — shows
the batch-level number is concealing a severe and worsening leak.

Blind solve rate by qtype, all 3 solvers per batch, chance 25.0%:

    batch   inference  attitude   detail  main_emph  function
    b1             0%       33%       3%        33%       13%
    b2            28%       29%      21%         0%       13%
    b3            25%       33%      24%        22%       33%
    b4            52%       48%      37%        13%       21%
    b5            67%       33%      29%        27%        5%

    inference:  tranche 1  8/48 = 16.7%     tranche 2  23/39 = 59.0%
                z (tranche 2 vs chance) = 4.90
    attitude:   tranche 1 18/57 = 31.6%     tranche 2  16/39 = 41.0%
                z = 2.31

    b4+b5 all qtypes pooled = 68/204 = 33.3%  <- the number that CLEARED

**Inference items were fine in tranche 1 (16.7%, below chance) and are
solvable without audio in tranche 2 (59.0%, z = 4.90).** The batch margin
stays inside the bar only because function items (13.3%) and main_emphasis
(20.0%) score below chance and cancel it out. A student who met only the
inference items would score 59% blind.

This is the CLAUDE.md "check the count, not just the colour" failure in a new
dress: a green batch-level verdict computed over a mixture, with one
component broken. It also explains the rising margin trend that the
instrument re-test proved was real — the drift is concentrated almost
entirely in one question type.

Three things follow, and the third needs a human decision:

1. The pre-registered kill rule is batch-level and both batches cleared. I
   have NOT unilaterally overridden it, and no option text has been touched.
2. The cause is plausibly the tranche-2 next-step review axis being ADDED
   after b4's attack — reviewers were told to hunt one-to-one licensing, and
   b5's round 3 certified that none survived, yet b5's inference rate is the
   worst of any batch (67%). So the fix that was applied did not work, which
   means the mechanism is not (only) one-to-one licensing. Most likely it is
   that three next-step options are generically sensible research activities
   while one is downstream of the lecture's thesis — a many-to-one
   relationship the one-to-one sweep does not detect.
3. **Decision needed:** either quarantine the inference items in b4 and b5
   (9 + 8 = 17 items, dropping cumulative cleared from 172 to ~155), or
   redesign the inference/next-step pivot before b6-b8 are authored and
   accept b4/b5 as they stand. Redesigning b6-b8 without deciding on b4/b5
   would leave a known-leaky question type in the cleared pool.

---

# RESOLUTION (2026-08-19): quarantine AND redesign

## 1. Inference items quarantined in b4 and b5 — dropped, never edited

Option text is immutable post-selection; editing a frozen item would break
the invariant the independence claim rests on. An item 59-67% solvable with
the audio withheld is the disease being cured, so it cannot ship inside the
cure.

    b4   36 items - 4 (lecture atv2-b4-p7) - 6 further inference = 26 cleared
    b5   32 items - 8 (lectures p5, p8)    - 4 further inference = 20 cleared

    REVISED cumulative cleared:
      pilot 24 + b1 26 + b2 26 + b3 28 + b4 26 + b5 20 = 150

Note tranche 1 is also re-scored: its inference items are withdrawn too
(b1 6, b2 6, b3 4). They were NOT leaky (16.7%, below chance), but the
inference pivot is being redesigned, so the old-design items leave with it
rather than sitting in the pool under a superseded construction. Tranche 1
therefore drops 116 -> 104.

## 2. The batch-level kill rule is RETIRED; gate on the worst question type

From here every attack reports per-type margins and a batch dies if ANY
gated type breaches. **The threshold had to be fixed before adoption, and
this is exactly the "break the check" case:**

    READING A — gate types with >= 8 ITEMS:
      b4 inference = 7 items, b5 inference = 6 items -> NEITHER IS GATED.
      Worst gated type becomes detail: b4 +12.0, b5 +4.2 -> BOTH PASS.
      The new rule would NOT catch the defect it was written to catch.

    READING B — gate types with >= 8 TRIALS (>= 3 items at 3 solvers):
      b4 worst gated = inference +27.4 -> BREACH
      b5 worst gated = inference +41.7 -> DEAD (>= +30)

**Reading B is adopted**, because a rule that passes the known-bad case is
not a rule. Per-type margins for every batch to date:

    batch  inference  attitude   detail  main_emph  function   worst gated
    b1        -25.0     + 8.3    -21.7      + 8.3     -12.5      -12.5
    b2        + 2.8     + 3.6     - 4.2     -25.0     -12.5       + 3.6
    b3        + 0.0     + 8.3     - 0.8     - 2.8     + 8.3       + 8.3
    b4        +27.4     +22.6    +12.0      -11.7     - 4.2       +27.4  BREACH
    b5        +41.7     + 8.3    + 4.2      + 1.7     -20.2       +41.7  DEAD

With the inference items withdrawn, b4's worst remaining type is attitude
+22.6 and b5's is attitude +8.3 — both inside the bar. b4's attitude +22.6
is close to the line and should be watched in the redesigned pilot.

## 3. The many-to-one detector was built, break-tested, and FAILED

Full writeup: **MANY-TO-ONE-DETECTOR-RESULT.md**. Summary: 29 inference
pivots (13 known-bad from b4/b5 at 59.0%, 16 known-good from b1-b3 at
16.7%) were anonymised, shuffled under a fixed seed, and classified with
the origin withheld.

    known-BAD  (13):  6 flagged,  7 missed   recall 46%
    known-GOOD (16):  6 flagged, 10 clean    false-flag 38%
    P(this separation | random) = 0.46

b5 — worst inference rate of any batch at 67% — drew the joint-lowest flag
rate. b1, whose inference items solvers scored 0% on, drew the second
highest. **It does not discriminate, so it gates nothing.**

This is the SIXTH structural proxy to fail and the first to fail against
the very defect it was built for. It is therefore evidence against the
HYPOTHESIS, not just the instrument: if many-to-one licensing were the
mechanism, careful licensor enumeration should have separated a
59%-solvable set from a 16.7%-solvable one. **The cause of the inference
leak is not established.** Open candidates, none tested: the leak is
inherited from more-readable sibling thesis/attitude pivots (attitude rose
31.6% -> 41.0% over the same period); or option concreteness (naming the
lecture's own object) is doing the work; or it is semantic and
item-specific, which is what the record of five prior proxies predicts.

## 4. The redesign, and how it must be validated

The inference pivot is rebuilt on the symmetry principle the rest of the
design already uses and which was simply never applied here: **each of the
four next-step options must be the natural follow-up to a DIFFERENT world**,
so which is correct depends entirely on which world was spoken. Today the
four options are four candidate follow-ups to ONE world, which is why three
read as generic and one as downstream.

Validation is a per-type blind attack on a pilot batch. It may NOT be the
failed detector, and it may NOT be a reviewer's assurance that the structure
looks symmetric — b5's round 3 gave precisely that assurance and its items
then scored 67%. **Gate: if the pilot's inference margin is at or below
chance, resume b6-b8 with the corrected pivot. If not, the design is wrong
again and we stop and rethink rather than scaling it.**

## 5. Standing corpus residual — recorded, not chased

"Eliminate the shortest option, then guess" pays **+3.2 corpus-wide** (key
is shortest on 15.4% of 156 cleared items vs a flat 25%, z = -2.77). Real
but small. It does NOT warrant seed-shopping or item surgery, both of which
would cost more than the edge. Re-measure at the end of every tranche and
escalate only if it grows past about +8.

## 6. Transcript-brief doctrine, carried forward

Three distinct transcript-side uniformities in two batches, each invisible
to every script: b4's uniform "not X" negation killing every distractor;
b5's positional tell (the key restates the first assertion after an audible
topic marker in ~26/32 items); and the fact that b5's brief FIXED the first
by naming forbidden constructions and thereby installed the second.

**Briefs must specify variation as a property to be CHECKED, not a list of
constructions to avoid.** Routing around a named construction just relocates
the regularity. Every future transcript brief carries an explicit
"report the distribution of X across your kills" instruction and the
with-source grader is asked, each batch, what new uniformity has appeared.

---

# DIAGNOSTIC (2026-08-19): the inference leak is PIVOT-LOCAL — redesign is aimed correctly

Run before any authoring, on frozen data already held. Zero authoring cost.
Three hypotheses, three different products; the arithmetic separates them.

## Test 1 — is the leak INHERITED from the lecture's thesis item?

Inference correctness conditioned on whether the SAME solver got that
lecture's thesis item right (thesis = the lecture's main_emphasis pivot
where it has one, else its attitude pivot; 19 lectures the former, 22 the
latter).

    tranche 1   thesis RIGHT  3/13 = 23.1%    thesis WRONG  5/35 = 14.3%   gap  +8.8
    tranche 2   thesis RIGHT  8/12 = 66.7%    thesis WRONG 15/27 = 55.6%   gap +11.1
      b4        thesis RIGHT  4/8  = 50.0%    thesis WRONG  7/13 = 53.8%   gap  -3.8
      b5        thesis RIGHT  4/4  =100.0%    thesis WRONG  8/14 = 57.1%   gap +42.9

    tranche-2 gap z = 0.65 — NOT significant

**Hypothesis rejected.** The decisive number is not the gap, it is the
thesis-WRONG column: **55.6%, against a chance of 25%.** Solvers who had
just demonstrably misread the lecture's thesis still solved its inference
item more than half the time. b4's gap is actually NEGATIVE. Whatever is
leaking does not travel through the thesis, so redesigning siblings would
not fix it. (b5's 4/4 is n=4 and carries no weight.)

## Test 2 — is the unit of the defect the LECTURE rather than any pivot?

Per-lecture solve rates, 12 trials each (4 items x 3 solvers), against the
binomial expectation:

    tranche 1   24 lectures  mean 20.1%  var 0.0464 vs 0.0134 expected  ratio 3.47
                dispersion chi2 79.7 on 23 df
    tranche 2   17 lectures  mean 33.3%  var 0.0460 vs 0.0185 expected  ratio 2.48
                dispersion chi2 39.8 on 16 df

Lectures ARE overdispersed — but **in both tranches, and by a similar
amount**, while only tranche 2 leaks. So lecture-level clustering is a
CONSTANT BACKGROUND, not the regression. What changed is the qtype spread:

    variance ACROSS qtypes   tranche 1  0.0041   tranche 2  0.0324   (8x)

**Hypothesis rejected as the explanation for the regression**, though the
background clustering is a real second finding — see below.

## Test 3 — decisive: inference against ITS OWN LECTURE

Each lecture is its own control, so lecture difficulty is fully removed.
Statistic: (inference rate) - (same lecture's other-qtype rate).

    tranche 1   16 lectures   mean  +0.0 pts   se  8.2   t = 0.00
                beat siblings 4, lost 6, tied 6
    tranche 2   13 lectures   mean +32.5 pts   se 14.0   t = 2.31  p<.05
                beat siblings 8, lost 3, tied 2
      b4         7 lectures   mean +19.0 pts   t = 1.03
      b5         6 lectures   mean +48.1 pts   t = 2.25

**Tranche 1's inference items are statistically indistinguishable from
their own siblings — +0.0 points, t = 0.00.** Tranche 2's beat their own
siblings by 32.5 points. With lecture controlled and thesis-correctness
controlled, the effect survives in both directions.

## Verdict: HYPOTHESIS 3 — the defect is PIVOT-LOCAL

The symmetry redesign is aimed at the right pivot. Proceed with it.

Note what this does NOT establish: the many-to-one detector still failed
(MANY-TO-ONE-DETECTOR-RESULT.md), so the pivot is confirmed as the LOCUS
without the MECHANISM being confirmed. Pivot-local plus "not many-to-one as
an inspectable property" leaves the concreteness hypothesis and the
plain semantic-and-item-specific hypothesis open. The pilot's per-type
blind attack remains the only gate.

## Consequence: tranche 1's inference items are RESTORED

The arithmetic settles the held decision. Tranche 1's 16 inference items
are not merely un-flagged, they are MEASURED clean by the same instrument
that condemned tranche 2's: 16.7% absolute (below the 25% chance line) and
+0.0 points against their own siblings. They are not presumed sound, they
are measured sound.

This also shows the old construction is not SUFFICIENT to cause the leak —
it produced clean items in tranche 1 and leaky ones in tranche 2 — which is
further reason not to discard them on construction grounds alone.

    RESTORED cumulative cleared:
      pilot 24 + b1 22+6 + b2 26+6 + b3 28+4 + b4 26 + b5 20 = 162

    CORRECTED 2026-08-19. This line first read "b1 26+6 = 32", which
    double-counted the four items of atv2-b1-p4 — the lecture tranche 1
    quarantined on its exclusivity flag, and which that tranche's own
    result file correctly reports as leaving b1 at 28 (24 + 4 restored
    inference = 28, not 32). Caught by the exclusivity-calibration run,
    which loaded the corpus from the batch records and got 162 where this
    summary claimed 166. The batch records were right; the summary line
    was wrong. Nothing downstream used 166 except this file.

They remain the known-GOOD half of the detector fixture; being in the
cleared pool and being a control set are not in conflict.

## Second finding, logged not chased: lectures are overdispersed in BOTH tranches

Per-lecture variance runs 2.5-3.5x binomial in every tranche measured. Some
lectures are simply more guessable than others regardless of question type
(tranche 1 range: four lectures at 0%, two at 67%). This is pre-existing,
was never the regression, and is not what the redesign addresses. It is
worth a look once the inference pivot is fixed, because at 12 trials per
lecture the per-lecture estimates are noisy and the effect may partly be
sampling. Do not act on it before measuring it at higher n.
