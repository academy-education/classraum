# Co-founder-standard grader: can agents apply HIS rejection standard? (pre-registered 2026-10-22)

**Written before any grader is built or run.** Owner: "have agents check it based on how we have rejected the
questions" — "Yes approve agents, do it".

## Why a second attempt
The generic grader (GRADER-TRIAL-2026-10-22) caught planted defects (34/40) but only 3 of his 29 real rejects: it used
a lenient "could a strong student argue it" standard, while his flags, mostly Choose a Response, say "another reply is
also natural/plausible". This grader is built FROM his verdicts and notes, and is told that over-flagging is cheap
(dropping a good item costs little) while missing a bad item is not.

## Design: two folds, no item tested by the grader that learned from it
- His 29 fresh rejects split, seeded ('cofounder-grader-folds-2026-10-22'), stratified CR / other: A = 15
  (12 CR), B = 14 (11 CR).
- A brief-writer agent per fold builds a co-founder-standard grading brief from: that fold's rejects (with his own
  words), the 15 older rejects whose items were since fixed (note only, no item), and 76 accepted items with his notes
  (controls excluded). Writers never see the other fold or any test packet.
- Grader agents apply brief A to the test packet for fold B rejects, and brief B to fold A rejects.
- Each test packet also holds half the 120 trial controls and half the 40 planted defects (same sets as the trial).
  Shuffled, anonymised; graders see no ids or labels.

## Bars (all three; fixed now)
1. **Held-out real-reject recall >= 18/29** (pooled across folds), the same bar the generic grader failed at 3/29.
2. **Planted recall >= 32/40.**
3. **False flags on controls <= 24/120 (20%).** This is looser than the trial's 15% because the policy accepts
   over-flagging; above 20% it would discard too many good items and hide the signal.
Ceiling check: all three are reachable, and none sits at an arm's edge.

## If it passes
Propose to the owner: agents grade every new item with the pooled brief (A+B rewritten from all 29), flagged items are
dropped or rewritten, and the co-founder moves to spot-checks (one passage or 12 items per batch). Every new flag he
gives is added to the brief. **Caveat stated now:** no SSAT/ISEE reading reject exists, so a pass is evidence for TOEFL
Choose a Response and generic defects, and weaker evidence for SSAT. SSAT would start with spot-checks plus a periodic
full sitting.

## If it fails
Report which bar failed and stop; full sittings (plus the pre-screen) remain.

## Known limits
- n = 29 rejects, 23 of them one task type (Choose a Response). A pass is a pass on that population.
- His rejects come from 8 sittings in Aug-Oct; his standard may have drifted.
- Graders and writers are the same model family as the authors.

## Result (2026-10-22): PASS on all three bars
Briefs in `cofounder-grader/` (A from fold A, B from fold B); scored by `cofounder-grader-score-2026-10-22.py`.

| bar | result | generic grader (same items) |
|---|---|---|
| 1 held-out real-reject recall | **20/29** (brief A 10/14, brief B 10/15) | 3/29 |
| 2 planted recall | **39/40** | 34/40 |
| 3 false flags on controls | **5/120** (4 TOEFL Listening, 1 SSAT reading) | 3/120 |

**Read the pass narrowly, as stated before the run:**
- All 20 caught rejects are TOEFL Listening (20/25). The 4 non-listening rejects (2 TOEFL Reading, 1 SAT, 1 ACT)
  were caught 0/4. The co-founder's standard was learned for Choose a Response, not shown elsewhere.
- SSAT: no real reject exists. Planted SSAT 20/20; controls 1/44 flagged. That is evidence of generic defect
  detection, not of matching him on SSAT.
- The 5 control flags are all "another reply is also natural" style, the strict direction the policy accepts.
Next step per this prereg: propose the route to the owner. Nothing changes until the owner decides.

## Amendment 1 (2026-10-22): the route the owner chose ("Lets do 2"), written before any spot-check run is drawn
Applies to every batch in `cofounder-queue.json` not yet drawn. Batches already sat keep their own rules.

**Before any of his runs on a batch:**
1. Every staged item is graded with a co-founder-standard brief (A or B; `cofounder-grader/`). Every flag is read by the
   author: dropped (archived) if the author agrees, kept with the reason recorded if the grader is clearly wrong. The
   generic pre-screen (552 items, 3 dropped) already ran; this is the stricter second pass.

**Then one of two runs, fixed in the queue (`route`):**
- **spot**: SSAT/ISEE reading = one whole passage (6 items), seeded pick ('spotcheck-groups-2026-10-22': d5 P02, d6
  P02, d8 P01, ISEE d2 P06). Verbal = 12 items per run (d1 one run, d2 two runs). TOEFL sets/CR = one run.
- **full**: every third reading batch: SSAT d7 and ISEE d3. Draft 1's rule unchanged.

**Release rule for a spot run:**
1. All sampled items "Only defensible" -> the sampled items and every unsampled, grader-cleared item in the batch are
   released (`verified=true`, basis recorded as `spot-check + co-founder-standard grader`).
2. Any sampled item flagged -> that item archived, and the REST of the batch goes to a full sitting (a queue entry is
   added). Nothing else from that batch is released until then.
3. His blind pick is recorded but is not a guard on a 6-12 item sample (too small to mean anything).
4. Notes are read as before; a factual-error note holds the passage, as with SSAT d3.

**What this changes in risk, stated now:** unsampled items reach students having passed two AI checks but no human.
TOEFL Listening is where the grader matched him (20/25); for SSAT it is unproven, which is why every third reading batch
is a full sitting. His first SSAT flags, from full sittings or spot runs, become the SSAT test set for this grader.
