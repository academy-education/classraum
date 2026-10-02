# conv-hard-v1 — pre-registered 2026-10-02, before any item or control number exists

## Why

`toefl-form-depth.ts` (5 trials, live bank 2026-10-02): upper path / hard
route, Listening Conversation repeats after **4** clean sittings [max 7].
The hard route draws module 2 from `['medium','hard']`, and a set is
in-band when at least half its items are. Of 193 live Conversation items
147 are `easy` and 4 `hard`; in-band supply is ~9 four-sets and only
**7 two-sets**. A module quota of 6 is 4+2 or 2+2+2, so the TWO-sets bind:
once the in-band 2-sets are seen, `bandPreferredGroups` ranks a SEEN
in-band 2-set ahead of every unseen out-of-band one.

Synthetic sizing (scratch copy of the depth script with N fake in-band
sets injected, real assembler, 5 trials, min [max]):

    added            upper/hard conversation
    none             4 [7]
    4-sets x 6/8/10  5 [7]      <- four-sets do not help at all
    2-sets x 12      8 [10]
    2-sets x 16      9 [11]
    2x10 + 4x5       9 [11]

So: **2-question sets**, which is also the official ETS shape
(`conversation-gate.ts` ETS_REFERENCE: 9 turns, 92 words, 2 questions).
Target **≥ 13 in-band 2-sets kept**; author **22 sets / 44 items**
(two authors x 11) to absorb gate losses.

## Method (the one that cleared on TOEFL sets)

DL-FRESH method transplanted to Conversation: FLAT-PRIOR anchoring + FORM
SYMMETRY + AUTHORED ATYPICAL FACTS + CHANNEL PARITY + name hygiene
(disjoint per-author pools). Plus, for this task:
- Shape: 2 speakers A:/B:, 80-160 words, ≤ 12 turns, no back-to-back
  same-speaker turns (conversation-gate.ts, blocking rules).
- Hardness comes from what is asked, not from length: speaker's purpose
  in saying a line, implied meaning, a plan or fact REVISED mid-dialogue,
  attitude, inference across two turns. Never a vocabulary or world-
  knowledge test.
- Cross-item variation (CLAUDE.md tell #3): each set is assigned in
  advance which speaker (A/B, student/staff) is right / committed /
  changes their mind, and the assignment is balanced; the key's speech
  act and wording must not repeat across sets.

## Bars — fixed now, not moved after any number

**Instrument.** `SPLIT=2 make-attack.mjs` (one item per transcript per
file), three Claude solver samples per file (Haiku), forced choice,
pick + basis + certain-reject per option. Flat key deal, so the best-
fixed-letter control is derived from each key file, not assumed.

**Matched live control.** 12 live Conversation 2-sets (24 items, seeded
draw from the 27 live harvest-v1 two-sets — the only live sets of the
same size), rendered through the SAME script and given to the SAME
solver agents alongside the candidate file.

1. **No-source (primary).** Candidate mean minus its own best-fixed-
   letter control: **PASS ≤ +15. HOLD > +15** (no third brief; no
   repair-and-retest on the same items). Range check: the letter control
   sits near 25-30%, so the bar is ~40-45% — inside the attainable
   0-100% range from both sides. dl-fresh precedents: -27.8 / -1.4 /
   -13.9.
2. **No-source vs matched live control (secondary).** The skill's
   literal bar is "at or below control". **CEILING CHECK:** the live
   Conversation bank measured 93.1% on the 2026-08-18 run. If this
   control comes in ≥ 85%, "candidate above live control" leaves ≤ 15
   points of headroom and is subsumed by bar 1 — it is then REPORTED,
   NOT DECISIVE. Human sitting on live Conversation: 20% (n=15) and 0/3,
   so the model number on live items measures the model, not a leak.
3. **Elimination.** An option marked certain-reject by ≥ 2 of 3 samples
   drops its SET. Single-sample certain-rejects are reported only.
4. **With-source.** Three fresh grader agents, transcript + options, key
   unmarked. A set is dropped WHOLE if any grader's pick differs from the
   key on either item, or any grader names a second defensible answer
   that I cannot refute from the transcript in one quoted line. No
   repairs (drop, never edit).
5. **Difficulty.** Median of the three graders' labels per item, written
   to the batch AFTER grading and before the ledger sha. Never the
   author's label. An `easy` median is inserted as `easy`, never
   relabelled. A set with both items `easy` is inserted as an easy set
   (useful to other routes) and does not count toward the target.
6. **Tells.** check-batch-joins.mjs clean; key-longest ≤ 35%; conversation
   shape gate 0 blocking; one grader also asked to hunt patterns ACROSS
   items. A named cross-item rule that would score ≥ 60% on the batch
   holds the batch.
7. **Outcome.** Re-run `toefl-form-depth.ts` (TRIALS=5) after insert.
   Goal: upper/hard Conversation min ≥ 8. Reported before → after
   whether or not the goal is met.

Correlation note (CLAUDE.md 2026-09-25): the three solvers are one model
sampled three times; margins stand, per-item unanimity is not a verdict.

## Addendum, 2026-10-02 — v1 HELD (+29.5); conv-hard-v2 registered BEFORE authoring

v1 failed bar 1 (CONV-HARD-V1-RESULT.md). Brief revision **1 of 2**, applied
to 22 FRESH sets (CH23-CH44), never to v1 items. If v2 also exceeds +15
the method stops here — no third brief — and the finding is recorded.

Revisions, each aimed at a measured v1 leak kind:
- R1 quoted-line items: the line's context-free reading must point to a
  named DISTRACTOR; the key is the function only the surrounding turns
  reveal. (The three v1 quote items built this way went 0/3.)
- R2 stems name a referent only — no narrated events ("after checking the
  sign", "the exception", "a correction went out" are banned shapes).
- R3 no key may share a content word with its stem that no distractor
  shares (lexical echo).
- R4 detail items are crossed 2x2 grids: every name/place/time element in
  the options appears in exactly two of the four.
- R5 attitude/inference: the attitude or conclusion a reader would assume
  from the stem alone must be a distractor.

Bars 1-7 unchanged. v2 is attacked against the SAME 24-item control,
re-solved by the v2 solver agents so the instrument is matched within run.
