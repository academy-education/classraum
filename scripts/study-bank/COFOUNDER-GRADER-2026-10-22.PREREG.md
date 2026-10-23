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

## Amendment 2 (2026-10-23, owner: "Release Cr-v11"): minimum run size for the per-run blind guard
`release-toefl-conv-runs.mjs`'s per-run guard (blind >= 50% holds the cohort) now applies only to runs of 6 or more
items. A shorter run still counts in the pooled guard. Cause: the 1-item run crv11-release2 (1/1) held cr-v11 although
the pooled rate was 4/13 = 30.8% and Amendment 1 rule 3 already says a blind pick is no guard on a small sample.

<!-- Amendment 3 is also kept as AMENDMENT-3-TRUST-LEVELS.md; the two must stay identical. -->

## Amendment 3 (2026-10-23, owner approved): trust levels per stratum, written before any run is drawn under it

Source design: `AUTONOMY-ALGORITHM-2026-10-23.md`, as changed by the audit `docs/research/autonomy-feasibility-2026-10-23.md`
(Part 3: reset on any brief change with a bridge spot, cap at L2, notes are the signal, the tracker fails loudly).
Tracker: `autonomy-state.mjs` (pure rules in `autonomy-core.mjs`, pinned by
`src/lib/study/__tests__/autonomy-core.test.ts`). Drawer: `draw-next.mjs` level-aware mode (`draw-next-levels.mjs`).
Release: `release-by-shape.mjs`. Method table: `autonomy-methods.json`. Notes ledger: `cofounder-notes.json`.

**Applies to every batch in `cofounder-queue.json` that has no run drawn yet.** A batch that already has a run keeps the
rule it was drawn under (Amendment 1's own transition rule): today cr-v14 (full sitting of the 24 left), toefl-talk-draft-1
(one more run), toefl-conv-draft-1 (one more run), ssat-reading-draft-5 (its clean 6-item spot releases it under
Amendment 1 rule 1). Amendments 1 and 2 stay in force where this one does not replace them.

### 1. Strata

A stratum is **family x section x task** (the bank's `task` column), e.g. `toefl/listening/choose_response`. ACT reading
and ACT science store the passage genre/format in `task` while every batch is a whole form across all of them, so
they collapse to `act/reading/*` and `act/science/*`. Maths is out of scope (keys are recomputed; exact checkers gate it).

Strata in the queue today (9): `act/science/*`, `isee/reading/multiple_choice`, `act/reading/*`,
`ssat/reading/multiple_choice`, `ssat/verbal/multiple_choice`, `toefl/listening/academic_talk`,
`toefl/listening/choose_response`, `toefl/listening/conversation`, `toefl/reading/academic_passage`.

### 2. Levels

| level | what he sits per batch | promote | demote |
|---|---|---|---|
| **L0** | a **full sitting** of the batch, capped at 36 items (whole passages/sets) | U < 20% | — |
| **L1** | **one spot run of 12**: the fewest whole passages or sets reaching 12 (SSAT/ISEE 2 x 6, ACT reading 2 x 9 = 18, ACT science 2-3 passages = 12-17, TOEFL passage 3 x 5 = 15, lectures 3 x 4, conversations 6 x 2, CR/verbal 12 items) | U < 5% | any miss -> L0 |
| **L2** | **one pooled 12-item run per wave** across up to 6 batches of the stratum's current method, 2-3 items each (12 split evenly; fewer than 4 batches waiting means more items each). The batch of any flagged item goes to a full sitting (a queue entry). | **none** | any miss -> L1 |

**No L3.** The cap is L2 until a second human ground truth exists: another reviewer on at least 20% of runs with
his-vs-their agreement measured, or real students with at least 30 non-internal attempts on an audit sample. Changing the
cap needs a new amendment. (`autonomy-core.mjs` keeps the design's 2% L3 bar only so the cap is a real, break-tested cap.)

Promotion moves at most one level per closed run, and never while a bridge is pending. A level is recomputed from the
whole record each time the tracker runs; it is never cached.

### 3. Evidence

- A **miss** is a would_block defect, from his verdict (`alternative`/`broken`) **or** his note (a `would_block: true`
  classification in `cofounder-notes.json`, including REGISTER entries linked to the review), on an item the AI
  pre-screen passed. Items the co-founder-standard grader flagged and the author kept for his sitting on purpose
  (`autonomy-methods.json` `screenFlaggedKept`: the 5 cr-v11 items) measure the screen, not its misses, and are excluded.
  Items of a method that declares no AI gate count as passed (an AI-only release would have shipped them).
- **U** = Clopper-Pearson **one-sided 90%** upper bound on the miss rate, over items of the **current method only**,
  plus the previous method's own items at **half weight once the bridge is clean** (`n = floor(sum w)`,
  `x = ceil(sum w*d)`).
- Only `reviewer_kind='human'`, answered rows count. Model-assisted rows are excluded and counted. An item sat twice
  counts once (a miss if either sitting found one).
- **Stale rows** (`item_sha` != `content_sha`): a stale row with no defect is excluded and counted, never a pass. A stale
  row that carries a miss still counts, because the normal life of a flag is "he flags, the author edits", and dropping
  those rows would erase exactly the misses this tracker exists to count. The stale set must equal his rows missing from
  `study_item_reviews_fresh`, or the tracker refuses.
- Notes are the signal: the tracker never computes a level from verdicts alone. With no ledger, an unclassified note, or
  a ledger entry that does not join to its review, it exits 2 and writes nothing.

### 4. Methods, the bridge, and the freeze

- A **method** is (authoring brief, construction, author type in-session/agent/model, grader brief version). **Any
  change to any of them starts a new method**, including appending a rule to a brief (the original design's exemption is
  deleted, per the audit).
- **The first batch after a change gets a 12-item bridge spot, whatever the level.** The bridge is the first 12 items sat
  under the new method. Clean (no miss in them): the previous method's evidence carries at half weight. Dirty: it never
  carries. A stratum's first-ever method starts with an L0 full sitting instead.
- **A stratum at L2 has its brief frozen.** Changing it is a method change, so it costs the level: the next batch is a
  bridge spot and the stratum climbs again from the bridge.
- **How a batch declares its method:** every row of a new batch carries `verify_meta.method_id` at insert, uniform over
  the cohort, and the cohort gets a row in `autonomy-methods.json` naming its sources. The tracker refuses a cohort with
  neither, or one where the two disagree. `unknown` is a legal value and is treated as a new method of its own.
- The method of every existing cohort was derived from `verify_meta`, the RELEASE preregs and REGISTER, and is recorded in
  `autonomy-methods.json` (120 cohorts) with its `source`. Where the sources disagree it says so in `conflict` and follows
  the prereg: SSAT reading d5-d8 and cr-v14..v19 carry a copied "in-session, no agents" note in `verify_meta` while
  their preregs say agents. Marked **unknown** (7): act-reading-v4, act-reading-v7, act-reading-v12a/b,
  act-science-v9a/b (wave 7 does not name its brief version), cr-v10 (method string conflicts with REGISTER §0).

Methods of the queued strata, in authoring order (L = level at the end of that method's own evidence):

| stratum | methods (cohorts) |
|---|---|
| choose_response | cr-four-slot (cr-v1/v2) -> crv7 worlds + attack (cr-v7) -> unknown (cr-v10) -> **one method per batch from b7 to b17** (cr-v11 .. cr-v21): each brief adds the previous batch's drop patterns, so every CR batch is a bridge spot |
| ssat/reading | worlds (s2-s4) -> wv6 -> in-session d1 brief (d1-d3) -> in-session notes v1 (d4) -> agent, SSAT-READING-AGENT-BRIEF md5 350d3265 + cfg-v1 (d5-d18) |
| isee/reading | in-session d1 brief, unscreened (d1) -> same brief + cfg-v1 (d2, d3) -> agent ISEE variant + cfg-v1 (d4-d16) |
| act/reading | v1 -> unknown v4 -> unknown v7 -> agent brief v8 (v8a-v9b) -> agent brief v10 (v10a-v11b) -> unknown v12a -> unknown v12b |
| act/science | v1/v2 -> agent brief v5 (v5a-v6b) -> agent brief v7 (v7a-v8b) -> unknown v9a -> unknown v9b |
| ssat/verbal | Aug claude+qc -> in-session live words (d1) -> agents v2 (d2) -> agents v3 (d3, d4) -> agents v5 drop patterns (d5) |
| academic_talk | harvest -> Jul claude -> orphan -> in-session d1 -> agents + cfg-v1 (d2-d7) |
| academic_passage | harvest -> orphan -> in-session d1 + cfg-v1 -> agent + cfg-v1 (d2-d7) |
| conversation | harvest -> Jul claude -> orphan -> Sept v5/v6 (conv d1) -> in-session conv-hard-v2 + cfg-v1 (conv d2) |

`cfg-v1` = the co-founder-standard grader briefs A (md5 6a9236f7) and B (md5 81017219), which pre-screened every batch
staged so far. **The feedback loop promoted brief v2 to production on 2026-10-23** (`cofounder-loop-state.json`,
`COFOUNDER-BRIEF-v2.md` md5 4f9cfca4, declared as `cfg-v2`): every batch pre-screened with v2 is a new method, so the first
v2 batch in each stratum is a bridge spot. The tracker warns when a declared brief's hash moves, and when the production
grader named by the loop is not a declared version.

### 5. Floor priority

Strata whose section has fewer than **5 live tests** (`depth-snapshot.json`, the depth scripts' measurement; smallest
path where a section has paths) are drawn first, fewest first; everything else keeps queue order. Checked live today:
`form-capacity.mjs` 2026-10-23 gives ACT Science 3, ACT Reading 4, ISEE Reading 4 as an upper bound, and
`admission-form-depth.ts` (the snapshot) gives ISEE Reading 3. So today: **ISEE Reading 3, ACT Science 3, ACT Reading 4**.

### 6. Never autonomous (capped at L1)

TOEFL Choose a Response, TOEFL Conversation, SSAT reading, ISEE reading, MAP comprehension, ACT Science: capped at **L1**
until the notes-based new checks (fact, consistency, naturalness, batch pattern) each have at least 10 real fixtures with
recall >= 80%. Planted fixtures do not count. Raising the cap needs a new amendment.

### 7. Audit of AI-only releases (owner choice: one run a week)

SAT R&W and SSAT/ISEE verbal release on AI gates alone (~1,300 items in October, 0-8% ever sat by a human). **One
12-item audit run per week, rotating: SAT R&W (one domain per week, cycling C&S, I&I, SEC, EoI), then SSAT verbal, then
ISEE verbal**, drawn from live items he has never seen, in one segment so the key deal is flat:

    DRAW_VERIFIED=1 DRAW_FAMILY=ssat node scripts/study-bank/draw-review-run.mjs Verbal 12 <reviewer> audit-ssat-verbal-<date>

The weekly cadence is the owner's choice and is the parameter to change. An audit run is drawn only when no queue run
is open. A flagged audit item is archived (Amendment 1 "a human flag archives the item") and reported with its cohort;
audit results are reported as the post-release miss rate of AI-only gating, the first time it is measured.

### 8. Release by run shape

`release-by-shape.mjs <runId>` (dry by default) applies, per batch in the run:
- **spot / bridge / pooled:** every sampled item clean -> the sampled items and every unsampled, grader-cleared item of
  that batch are released; any miss -> verdict-flagged items archived, note-blocked items held for the owner, nothing else
  released, and the batch gets a full-sitting queue entry (in a pooled run, only the flagged item's batch). No blind guard
  (Amendment 1 rule 3).
- **full:** per item; unanswered items stay staged; two or more misses send the rest of the batch to a full sitting. The
  per-run blind guard of Amendment 2 applies (runs of 6+ items, >= 50%).
The existing per-cohort scripts (`release-toefl-conv-runs.mjs`, the dated `release-*.mjs`) are unchanged and stay valid
for the batches drawn under them.

### 9. What the tracker refuses (exit 2, writes nothing)

A missing ledger; an unclassified note or flag; a ledger entry that does not join to its review (or whose note text
differs from the review's); any read whose row count differs from the server's `count:'exact'`; an empty join (a review
whose item is not in the bank, a queued cohort with no rows); a cohort with no method entry; a stale computation that
disagrees with `study_item_reviews_fresh`. `draw-next.mjs` refuses a state file older than the review table.

### Parameters fixed by this amendment

20% / 5% promotion bars, one-sided 90% Clopper-Pearson, half weight, 12-item bridge and spot, 36-item L0 cap, 12-item
pooled run over at most 6 batches, cap L2, never-autonomous cap L1, five-test floor, one audit run a week. Changing any of
them is a new amendment; a change that relaxes one resets the evidence of the strata it touches.

### Known limits

- Live grader-vs-human evidence under a current method is tiny (one stratum has 6 items, the rest 0): every queued
  stratum starts at a bridge, as the audit predicted.
- Choose a Response changes method every batch, so under this rule it never leaves the bridge: 12 items per batch, the
  same as Amendment 1, until its brief is frozen.
- The ledger's classifications are one model's reading of his notes; the REGISTER entries it links decide several misses
  (e.g. the conv d1 "no contractions" entry links five reviews; an act-reading-v4 key-deal entry is a draw-tool artifact
  classified would_block). Changing a classification changes U, which is why the ledger is the input and not a cache.
- One reviewer. His own misses and drift are invisible until a second human ground truth exists, which is why there is
  no L3.
