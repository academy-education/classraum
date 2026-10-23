# Autonomy algorithm: fewer co-founder sittings, agents releasing on their own (2026-10-23)

Owner: "Can you come up with an algorithm to make it so that sittings are less necessary? We want it to reference
his feedback and also be able to have the agents be independent eventually."

**Status: design and measurement only.** No release rule, queue entry, brief or bank row was changed. The current
rules (`COFOUNDER-GRADER-2026-10-22.PREREG.md` Amendments 1 and 2) stay in force until the owner adopts this, and
adoption should be written as Amendment 3 there, before any run is drawn under it.

---

## 1. What was measured

Sources (all read-only):

- `study_item_reviews`, reviewer `6ca6edaf-…` (support@), `reviewer_kind='human'`: **1,045 rows** (997 unique,
  38 alternative, 10 broken), **199 with a note**, paged past the 1,000-row cap. 40 model_assisted rows excluded.
- `study_item_bank`, families toefl/ssat/isee/act/map: 12,278 rows including archived.
- Grader verdicts: 69 `scratchpad/*-grade/` folders (2,885 items with both briefs A and B, plus 560 with one),
  `scratchpad/prescreen/` (the 552-item queue pre-screen, generic `grades-N` and co-founder-standard
  `cgrades-N`), and the held-out trial (`scratchpad/cofounder-grader/`, scored by
  `cofounder-grader-score-2026-10-22.py`, re-run today: same 20/29, 39/40, 5/120).

**How grader packets were tied to items.** `index.json` does NOT hold bank ids: it holds author-local ids
(`D9-P01-1`) or `null` (all of `crv16-grade`). So packets were matched to bank rows on prompt + sorted choice set
(+ passage where two rows share both). 2,822 of 2,885 two-brief packet items matched. **Break test:** in
`crv14-grade`, `crv15-grade` and `ssat12-grade` every unmatched packet item (4, 5, 5) is one the graders flagged,
i.e. dropped or rewritten before insert. Not one cleared item failed to match. Perturbing one choice of a matched
item drops its match from 1 to 0.

Scratch scripts (not part of the repo): `$SCRATCH/auto/{dump.mjs,bank.mjs,map.js,map2.js,labels.js,cp.py,sim3.py}`
in this session's scratchpad. §9 names the repo script that should replace them.

### 1.1 Grader vs co-founder on the SAME items

There are only two sources of same-item pairs, and they measure different things.

**(a) Held-out trial (each brief graded items written up by the OTHER fold's writer).** This measures recall: of
his rejects, how many the grader flags.

| stratum | his rejects | grader flagged | grader passed (MISS) |
|---|---|---|---|
| TOEFL Choose a Response | 23 | 20 | **3 (13.0%, CP90 upper 26.8%)** |
| TOEFL Conversation / Academic Talk | 2 | 0 | 2 |
| TOEFL Reading | 2 | 0 | 2 |
| SAT R&W | 1 | 0 | 1 |
| ACT English | 1 | 0 | 1 |
| SSAT, ISEE, ACT Reading, ACT Science | **0** | — | — (no reject exists) |

False flags on items he passed (same trial): **5/120** overall; **4/22 TOEFL Listening** (18.2%), 1/36 SSAT
reading, 0/62 everything else.

**(b) Production pre-screen followed by his sitting.** This measures what matters for release: of the items the
grader cleared, how many he flagged.

| cohort | served to him | grader-cleared | he flagged among cleared | grader-flagged, kept on purpose | he flagged among those |
|---|---|---|---|---|---|
| cr-v11 | 13 | 8 | 0 | 5 | 3 |
| cr-v14 (spot1) | 12 | 12 | **1** ("C is also a possible answer") | 0 | — |
| ssat-reading-draft-5 (spot) | 6 | 6 | 0 | 0 | — |

So the live post-screen miss rate is **CR 1/20 (5.0%, CP90 upper 18.1%)** and **SSAT reading 0/6 (CP90 upper
31.9%)**. **Every other family: NOT MEASURED. No item cleared by the co-founder-standard grader has ever been sat
by him in ISEE reading, SSAT verbal, ACT reading, ACT science, TOEFL conversation, talk or passage.** The ~2,800
other graded items are all in the queue, unsat.

"How often the graders flagged one he passed": live, 2 of the 10 cr-v11 items he passed (n=10). Elsewhere the
flagged items were dropped before he could see them, so it is unmeasurable in production by construction. The
trial's 4/22 and 5/120 are the only usable figures.

Grader A vs grader B on 2,885 items: 69 flagged by either, 39 by both; kappa 0.72; P(B flags | A flags) = 0.67.
Two thirds of all flags are CR (48 of 69 either-flags fall in the eight `crv*` folders, 320 items).

### 1.2 His flag rate per batch over time

Hard flags (verdict alternative/broken) are almost entirely Choose a Response and SAT R&W:

| when | cohort | n | hard flags | note |
|---|---|---|---|---|
| Aug 5-15 | cr-v1, cr-v2 | 31 | 11 (35%) | unscreened |
| Aug 18 | cr-v7 | 40 | 10 (25%) | unscreened (+5/13 on a targeted adjudication run) |
| Sep 4 | cr-v10 | 20 | 3 (15%) | unscreened |
| Oct 22 | cr-v11, grader-cleared | 8 | 0 | first pre-screened CR |
| Oct 23 | cr-v14, grader-cleared | 12 | 1 (8.3%) | |
| Aug | SAT R&W v2 | 120 | 8 (6.7%) | not in the queue |
| Oct 6-20 | ACT English v7-v9 | 132 | 1 (0.8%) | |
| **Sep-Oct** | **SSAT reading (d1-d5, wv6, worlds)** | **218** | **0** | |
| Sep-Oct | ISEE reading d1, ACT reading, ACT science, MAP, TOEFL conv d1/talk d1/ann v6 | 205 | 0 | |

Outside CR he has not hard-flagged a reading or listening item since August. **His reading defects arrive as
notes on items he still marks "unique"**, so a verdict-only agreement measure says nothing about reading. §2
classifies the notes; the ones that actually stopped a release were two SSAT draft-3 notes (offside rule wrong,
passage contradicts itself) and two TOEFL conv draft-1 notes (transcripts contradict themselves).

### 1.3 Did his flag rate drop as his notes went into the briefs?

- **The grader brief has never changed.** All 76 copies of `COFOUNDER-BRIEF-A.md` across the grade folders have
  one md5, and all 67 copies of `-B.md` share one. No note of his since 2026-10-22 has entered a grader brief. The
  question cannot be asked of the grader yet.
- **The CR authoring brief changes every batch, but it learns from the GRADER's drops, not from his notes**
  (`crv7-b17-work/BRIEF.md`: "batch-14 drops", "batch-16's flags"). Its pre-screen flag rate by batch is
  10, 12.5, 25, 15, 10, 10, 20, 17.5% (crv14..crv21, n=40 each). REGISTER's "25 -> 15 -> 10% over batches 12-14"
  is correct, and it **rebounded to 20% and 17.5%** in batches 16-17. And his own CR rate on cleared items is 1/20.
  This is the tuning-to-the-instrument pattern CLAUDE.md warns about: authors optimised against the grader, and
  the grader's number is not his number.
- **Reading authoring rules from his notes:** easy-distractor and attitude-set notes ran at **17 of 144 items**
  (11.8%) on SSAT d1-d3 and ISEE d1, before the rules entered `SSAT-READING-AGENT-BRIEF.md`. After, they ran at
  **1 of 42** (2.4%) on SSAT d4-d5. One-sided Fisher p = 0.054. That is suggestive at n=42, not a measurement.
  He also wrote of d4 that the attitude options were "tailored to the passage".

---

## 2. His notes, categorised (160 records = every flag plus every note)

Each record was labelled by hand against the full note text (labels in `$SCRATCH/auto/labels.js`). Severity:
**R** = reject (second answer / broken), **H** = hold (a defect that stopped or should stop release although the key
is unique), **Q** = quality (he accepts the item and asks for better).

| # | type | sev | count | where | grader brief checks it? | authoring brief has a rule? |
|---|---|---|---|---|---|---|
| 1 | Second defensible answer | R | 42 | CR 28, SAT 8, TOEFL rd 3, lis 2, ACT Eng 1 | **Yes, the core rule.** Recall measured CR 20/23; non-CR 0/6 | CR: yes (four worlds, drop patterns). Reading: rule 5 "exactly one defensible" |
| 2 | Key is the longest option (tell) | Q | 33 | SAT 22, TOEFL 11 (all Aug) | **No, told not to flag** | Yes: merge caps (key uniquely longest <= 8/36, ratio <= 1.5). No note of this kind since Aug 16 |
| 3 | Distractors too easy (main idea, purpose, attitude) | Q | 19 | SSAT 11, ISEE 5, TOEFL 3 | **No, told not to flag** | Yes for SSAT/ISEE (rule 1 main idea, rule 4 purpose) |
| 4 | Key is odd one out by form, category or position | Q | 15 | TOEFL rd/lis, 1 ACT (letters in order) | **No, told not to flag** | Partly: key-spread scripts and the CR four-world construction. Category odd-one-out has no check |
| 5 | Key imprecise but no rival ("stall" for fail, "queue", "village pond") | Q | 12 | TOEFL 5, SSAT 4, ACT 2, ISEE 1 | **No, told not to flag** | **No rule found** |
| 6 | Rival has "some pull" (gap, ambiguous key line) | Q | 8 | conv 4, SSAT 3, CR 1 | No, told to accept | No |
| 7 | Source too underspecified | R | 5 | CR 5 | Yes (CR rule 3, "broken") | Yes (CR fixed-context rule, batch 17) |
| 8 | Unnatural speech: no contractions, speaker labels, gender not established | Q | 5 (+26/48 conv d1 rated "artificial") | TOEFL conv | **No** | **No standing rule found** (REGISTER 10-21 says "require contractions", but no brief file carries it; it was fixed by script) |
| 9 | Display: paragraph or stanza breaks | Q | 4 | SSAT 3, MAP 1 | No | Renderer fix; he confirmed poems fixed in d3 |
| 10 | Attitude option set reused, not tailored | Q | 4 | SSAT 2, ISEE 2 | No, told not to flag | Yes (rule 2) |
| 11 | Grammar or idiom error in an option | Q | 4 | CR 3, SAT 1 | No | No |
| 12 | **Source contradicts itself** (myth "origin a mystery" vs "invented to justify"; winter gowns; language matching) | **H** | 3 | SSAT 1, conv 2 | **No.** The brief says small logic gaps are accepted and never asks for a consistency read | SSAT/ISEE: yes ("check internal logic line by line"). Conversation: no |
| 13 | Story logic gap / pronoun ambiguity, text still decides | Q | 3 | SSAT 2, ISEE 1 | No | SSAT/ISEE: yes |
| 14 | Key wrong (who does what; key adds an inference) | R | 2 | TOEFL | Yes | — |
| 15 | Skill mislabel (purpose item that is a detail item) | Q | 2 | ISEE | No | Yes (rule 4) |
| 16 | **Factual error about the real world** (offside judged on the forward's own kick) | **H** | 1 | SSAT | **No.** Nothing in either brief checks facts | Science passages only; a real sport or rule is not covered |
| 17 | Options copy the passage; "lucky guess" | Q / none | 3 | TOEFL | No | — |

**Top 5 by count: second answer (42, covered and working only for CR), longest-key tell (33, deliberately not a
grader check but closed by merge caps), easy distractors (19, authoring rule only), odd-one-out tell (15, partly
scripted), imprecise key (12, nothing covers it).** By severity the two that matter most are **#12 and #16, the
only notes that held a release since September, and neither brief checks for them.** The grader was validated on
exclusivity, and exclusivity is not where his reading and listening defects are.

---

## 3. The algorithm

### 3.1 Strata

Trust is earned per **stratum** = family x task type, because the grader's skill differs by task (CR 20/23
against non-CR 0/6):
`toefl/CR`, `toefl/conversation`, `toefl/talk`, `toefl/passage`, `toefl/announcement`, `toefl/daily-life`,
`ssat/reading`, `ssat/verbal`, `isee/reading`, `isee/verbal`, `act/reading`, `act/science`, `act/english`,
`map/reading`, `sat/rw-<domain>`. Maths families are out of scope: keys are recomputed, so the exact checkers are
the gate.

Each batch also carries a **method id** (the authoring construction, e.g. `cr-four-worlds`,
`ssat-reading-agent-v1`, `in-session-claude`). Appending a rule to a brief is not a new method. A new
construction is.

### 3.2 The evidence count and the trust bound

For stratum s, every item he has sat contributes `(w, d)`:

- `d = 1` if his verdict is `alternative`/`broken`, **or** his note is classified **H** (§2 types 12 and 16) and
  confirmed (§5 step 1). Q notes never count as defects. They feed the authoring loop.
- `w = 1` if the item is from the stratum's **current method** AND either (a) it was cleared by the
  co-founder-standard grader, or (b) it was unscreened and the stratum's grader flag rate on fresh batches is below
  3% (then the screen removes almost nothing, and an unscreened item is a fair stand-in for a screened one).
- `w = 0.5` for the previous method under the same (a)/(b) condition. `w = 0` for harvested, orphan and
  older-than-previous cohorts, and for unscreened items in a stratum whose screen rate is 3% or more (CR: 10-25%).
- Stale reviews (item edited after the review) still count: he judged what the author produced.

`n = floor(sum w)`, `x = ceil(sum w*d)`, and **U = Clopper-Pearson one-sided 90% upper bound on the miss rate,
CP(x, n)**. U is the only number that moves levels.

Minimum n for a bound (CP90; rule of three is the x=0 column at 95%):

| U <= | x = 0 | x = 1 | x = 2 |
|---|---|---|---|
| 20% | 11 | 18 | 25 |
| 15% | 15 | 25 | 34 |
| 5% | 45 | 77 | 105 |
| 2% | 114 | 194 | 265 |

### 3.3 Trust levels

| level | what he sits | promote when | demote when |
|---|---|---|---|
| **L0 full** | Every item of the first batch, capped at 36. Each flag archives its item. Two or more flags in the 36 send the rest of the batch to a full sitting. | U <= 20% | — |
| **L1 batch spot** | One spot per batch, **n1 = the fewest whole passages or sets with at least 12 items** (SSAT/ISEE 2 passages, ACT reading 2 x 9, sets 12, CR/verbal 12). That catches a batch at >= 20% defects with 93% probability (1-0.8^12). Double sampling, below. | U <= 5% AND >= 3 L1 batches of the current method, the last 3 clean AND the brief checks every defect class that produced a d=1 in s in the last 60 days AND fixture recall for s >= 80% (or, with no fixtures in s, planted-defect recall >= 90% on >= 10 planted items) | U > 20% |
| **L2 pooled spot** | One run across k <= 4 consecutive batches of s: one passage/set or 6 items per batch, drawn in one sitting. | U <= 2% AND >= 2 clean pooled runs AND >= 14 days at L2 AND the family's blind-attack status is valid (§3.8) AND a one-time owner sign-off | any d=1 in a pooled run -> L1, and every batch in that pool gets its own L1 spot (excluding items already sat) |
| **L3 autonomous** | Nothing before release. Audit only (§3.7). | — | any d=1 in an audit -> L2, and that item's batch gets an L1 spot. Two d=1 in the trailing 60 sampled items at any level -> L1. A **live** H-fact or key-wrong defect -> L1, and the batch is re-checked by the fact check |

Also: U is recomputed after every sitting, and a stratum falls to whatever level its U allows. A new method resets
the current-method weight (old items drop to w=0.5) and the level is recomputed. A grader-brief change that only
adds checks carries evidence over. One that relaxes anything halves it.

**L1 double sampling** replaces Amendment 1 rule 2's jump to a full sitting:

- 0 defects in n1: release the batch.
- 1 defect: archive it, then draw **n2 = 2*n1** more from the same batch, preferring other passages. 0 defects:
  release the rest, except the flagged item's own passage or set, which gets the targeted check (§5) first. Any
  defect: full sitting of the rest.
- 2 or more defects in n1: full sitting of the rest.

This is the standard c=0/c=1 double plan. It costs 36 items, not 150, when one CR item slips. Today's single flag
in cr-v14 put **24 items** in the queue, and one flag in an SSAT verbal spot would put **147**.

### 3.4 Where each stratum stands today

| stratum | evidence (x/n after weights) | U (CP90) | level today | why |
|---|---|---|---|---|
| toefl/CR | 1/20, cleared items only (cr-v11 8, cr-v14 12); unscreened CR excluded (screen rate 10-25%) | 18.1% | **L1** | Held-out recall 20/23 supports the screen. The live 1/20 is consistent with 5% but cannot rule out 18%. Needs ~5 more clean 12-item spots for U <= 5% |
| ssat/reading | 1/96 = agent d5 0/6 at w=1, plus in-session d1-d4 (180 items, 2 H) at w=0.5 | 4.0% | **L1, capped** (the numbers alone say L2) | Both d=1 are H-fact/H-contradiction, which the brief does not check. Only 6 agent-method items sat. The d7 full sitting is still queued |
| isee/reading | 0/18 (in-session d1 at 0.5; no agent batch sat) | 12.0% | **L1** | below the five-test floor (3 tests) |
| act/reading | 0/22 (v1/v4/v7 at 0.5; no v8+ sat) | 9.9% | **L1** | below the floor (4). The model attack is invalid here, so the human sitting is the gate |
| act/science | 0/10 (v1/v2 at 0.5) | 20.6% | **L0** | the queued v5d full sitting is the L0 sitting. Below the floor (3) and hidden until a human sitting clears it |
| toefl/conversation | 2/48 (conv d1, both H-contradiction) | 10.7% | **L1, capped** | consistency and naturalness are not checked (types 8, 12) |
| toefl/talk | 0/30 (talk d1 12 at w=1, v3-claude/talk-c 36 at 0.5) | 7.4% | **L1** | ttd7's batch-level template already routes it to a full sitting |
| toefl/passage | 0/0 (only harvest/orphan items ever sat) | — | **L0** | first passage draft (30 items) in full instead of three 10-item spots |
| ssat/verbal | 0/10 (Sept cohorts at 0.5) | 20.6% | **L0** | first 36 of draft 1, then L1 |
| act/english | 1/132 (v7-v9) | 2.9% | L2 by number | not in the queue |
| map/reading, toefl/announcement | 0/24, 0/20 | 9.1%, 10.9% | L1 | not in the queue |

**No stratum qualifies for L3 today.** The closest is ACT English (needs 194 items with x=1).

### 3.5 Risk-weighted sampling, and which number feeds U

Each L1 or L2 sample is **2/3 simple random** (whole passages chosen at random) and **1/3 by risk score**,
highest first. Score per item (passage = max of its items):

| +3 | graders A and B disagree on it |
| +3 | the author kept a grader-flagged item, with a reason |
| +2 | its subskill is one of s's two most-flagged in the last 100 ledger rows (CR: dilemma/offer lines; SSAT/ISEE: main idea, attitude; conv: inference) |
| +2 | the batch is one of the first two from a new method or author |
| +2 | the passage asserts a checkable real-world rule or fact (sport, law, named science), tagged by the fact check |
| +1 | the grader reported `confidence: low` (add this field to the output schema) |
| +1 | the item was edited after grading |

**U uses ALL sampled items, random and risk-weighted.** Risk weighting oversamples likely defects, so it can only
push the observed rate up, which makes U conservative for promotion. Any defect, whichever half found it,
triggers the batch and demotion rules. **Guard:** every 100 sampled items in s, compare the defect rate of the two
halves. If the risk half is at or below the random half with at least 2 defects in total, the score is not doing
its job: compute U from the random half only and refit the score. **The unbiased estimate of what students see**,
reported to the owner, is the random half plus the L3 audits, never the risk half.

### 3.6 Queue priority

`draw-next.mjs` would order entries by:
1. **Sections below the five-test floor** (`depth-snapshot.json`): today `isee/reading` 3, `act/science` 3,
   `act/reading` 4. Lowest depth first.
2. A real student nearest a repeat (runout monitor), as today.
3. **Information value:** an entry whose sitting would complete a promotion criterion (the third clean L1 spot,
   the second clean pooled run) before one that would not.
4. Otherwise FIFO.

L2 entries wait until k=4 batches of the stratum are staged, or 7 days pass. L3 strata never enter the queue,
except for the weekly audit run.

### 3.7 What "agents independent" means at L3, and what stays

At L3 a batch goes from author to `verified=true` with no human before release. Basis recorded:
`autonomous L3 (stratum s, U90 = u%, evidence x/n)`. The safeguards that remain:

1. **Audit sittings.** A 4% simple random sample of released items, at least 6 per stratum per 2 weeks, drawn as
   one weekly run across all L3 strata. Every 30 days each L3 stratum also gets one pooled run regardless of audit
   results, to catch drift in his standard (a known limit of the 2026-10-22 prereg).
2. **The blind attack** stays a per-batch gate where it discriminates (SSAT reading, SAT R&W, maths). Where it
   saturates (ACT science, ACT reading, TOEFL MC; CLAUDE.md 2026-09-21), the with-source half decides, and L3 needs
   that half run on every batch.
3. **The co-founder-standard grader + the H-checks of §5** on every item, with the structural pre-flight.
4. **Student data, once it exists.** Today `study_attempts` is internal testing (memory
   `attempts-data-contaminated`), so this is NOT a safeguard yet. When an item has >= 30 attempts from
   non-internal accounts (an explicit internal-account exclusion list is required), flag it for audit if its
   point-biserial is negative, or if top-quartile students pick a distractor more often than the key.
5. **Kill switch:** the owner can pin any stratum to L0 in the state file.

### 3.8 Which blind number is valid

L2 to L3 requires the family's blind-attack status to be valid. Read it from `bank-state.mjs sittings` (CLAUDE.md:
if model and human disagree about the shipped bank, the instrument is invalid for that family and the with-source
half decides).

---

## 4. Projection

Simulation over today's 83 open queue entries (`sim3.py`, 400 runs). The current rule includes Amendment 1 rule
2's escalation to a full sitting. "Expected" assumes the true post-screen miss rate is CR 5% (the live 1/20),
conversation 4% (2/48) and 1% elsewhere. "Optimistic" assumes no further defects.

| | current rules | this algorithm (H-checks shipped first) | this algorithm (H-checks not shipped) |
|---|---|---|---|
| optimistic | **1,252** items | **~810-830** | ~870-890 |
| expected | **~1,560** (escalations) | **~1,180-1,200** | ~1,230-1,260 |

The saving on THIS queue is ~30-35%, not more, for three reasons. Reading spots grow from 6 to 12 items (6 only
catches a batch at >= 32% defects). Two strata start at L0 (SSAT verbal, TOEFL passage). And most strata reach
only L2 inside the queue. **The large saving is the next queue.** Once a stratum is at L3, 1,000 new items cost him
~40 audit items plus one pooled drift run per stratum per month (~6-24 items). Today they cost about 300.

Batches from today until L3, assuming zero further defects (the best case; each defect adds ~6 L1 batches):

| stratum | to L3 | his items to get there | open batches in queue today |
|---|---|---|---|
| act/reading | 11 | 108 | 12 (reaches L3 inside the queue) |
| act/science | 12 | 108 (incl. the L0 sitting) | 12 |
| toefl/passage | 12 | 117 | 7 |
| ssat/verbal | 12 | 108 | 5 |
| toefl/talk | 15 | 90 | 7 |
| ssat/reading | 19 | 108 | 13 (after the H-checks ship) |
| isee/reading | 19 | 108 | 15 |
| toefl/CR | 33 | 186 | 10 |
| toefl/conversation | 41 | 222 | 2 |

CR and conversation are slow because each already holds a defect in a small n. **If the true CR miss rate is
about 5%, CR should never reach L3**, and the algorithm correctly keeps it at L1 (the expected-case simulation ends
CR at U = 6-8%).

---

## 5. Feedback loop: every note becomes a check, a fixture and an authoring rule

### Files (to create when adopted)

- `scripts/study-bank/cofounder-notes/ledger.jsonl`, append-only, one row per flag or note:
  `{review_id, item_id, item_sha, run_id, stratum, method, verdict, note, type, severity R|H|Q, classified_by,
  confirmed_by, grader_rule, fixture_id, authoring_rule, ingested_at}`.
- `scripts/study-bank/cofounder-notes/TAXONOMY.md`: the 17 types of §2 with definitions and his example wording.
- `scripts/study-bank/cofounder-grader/briefs/COFOUNDER-BRIEF-{A,B}.v{N}.md` + `BRIEF-CHANGELOG.md`. Every rule
  cites ledger rows. Today's files become v1.
- `scripts/study-bank/cofounder-grader/H-CHECKS.md`, a separate pass so the validated exclusivity brief is not
  disturbed. It outputs `hold` with a reason, not `drop`:
  (a) **fact check**: list every checkable real-world claim (rules of a sport, laws, named science, real places) and
  verify each one;
  (b) **consistency read**: does the source contradict itself, who knows what when, are the objects explained;
  (c) **speech naturalness** for transcripts: contractions, speaker labels, pronouns or gender not established;
  (d) **batch-level template**: one read across all keys in the batch for a shared shape (ttd7, the
  identical-key-prose corollary).
- `scripts/study-bank/cofounder-grader/fixtures/fixtures.jsonl`: a frozen item snapshot (sha), expected
  `flag`/`unique`, stratum, and `fold` (seeded 50/50 train/test by item id). Every R and H item enters. So does
  a matched control: an item of his from the same stratum and sitting, marked unique with no note.
- `scripts/study-bank/cofounder-grader/run-fixtures.mjs`: builds shuffled, anonymised packets, scores per-stratum
  recall on the test fold and false flags on controls, and prints `scorable N of M`. It **exits non-zero if any
  packet item is unscored or any grade file is missing** (CLAUDE.md, "a check that cannot read its input").

### Process after every sitting closes

1. **Classify.** One agent labels each note (type, severity). A second agent labels it blind. Disagreements, and
   every proposed H, go to the owner. H confirmation is what makes d=1.
2. **Fixture.** Every R and H item (and its control) enters `fixtures.jsonl`. Its fold is fixed by seed, never
   chosen.
3. **Grader rule.** A brief-writer agent sees the TRAIN fold only and proposes an additive rule.
   **Ship gate** (all required): no test-fold fixture previously caught becomes missed; recall for that stratum's
   test fold does not drop; false flags on controls stay at or below 20% overall and 25% per stratum; planted recall
   stays at or above 32/40. Then bump the brief version.
4. **Authoring rule.** The same note becomes a rule in the family's authoring brief, under "The co-founder's
   rules", with its ledger id. Q notes go here only.
5. **Re-measure on fresh batches.** A brief change is credited ONLY through U on batches graded with the new version
   that he then sits. The fixture score is a regression gate and never evidence for promotion, because it is the
   tuning set. Authoring rules are measured as his Q-note rate per 36 items on fresh batches, never on items he
   has seen.

**Anti-tuning rules, from what the data showed:**
- Brief writers never see the test fold.
- At most one grader-brief revision per stratum per sitting.
- Grader-brief and authoring-brief writers are different agents.
- **Authors may read grader flags (as now), but no metric they are steered by may stand in for his verdicts.**
  The CR authoring brief has been tuned on grader drops for eight batches, and its grader flag rate is not his
  rate (§1.3).

### Ingest now (the backlog)

The 4 H rows (types 12, 16) and 49 R rows become fixtures. The 107 Q rows become authoring-rule candidates.
Specifically:
- the conversation authoring brief gains contractions, speaker labels, no unestablished gender, and a consistency
  read;
- every reading brief gains "a passage about a real rule or fact has that rule checked";
- the reading briefs gain an imprecise-key rule ("the key uses the passage's own sense; no narrower or regional
  synonym").

---

## 6. Implementation (when the owner adopts it)

1. Write this as **Amendment 3** of `COFOUNDER-GRADER-2026-10-22.PREREG.md` before any run is drawn under it,
   including ε1/ε2/ε3 = 20/5/2% and the 90% confidence. These are the owner's parameters to change, and after
   adoption they are fixed.
2. `scripts/study-bank/autonomy-state.mjs`: reads reviews (paged), the ledger and the grader map. It computes
   `(x, n, U, level)` per stratum, prints every denominator, and writes `autonomy-state.json`. It replaces the
   scratch scripts of §1. It **refuses** if a grade packet does not map to bank ids (key on prompt + choices +
   passage, as §1 did). Have the graders write the bank id into `index.json` from now on.
3. `draw-next.mjs`: reads the level, picks the plan (L0/L1/L2/audit) and the 2/3 + 1/3 sample, and orders by §3.6.
   `draw-review-run.mjs` needs a pooled multi-cohort draw (it already supports several domains per run; it needs
   several cohorts).
4. Release scripts: a `release-batch.mjs` that applies the double-sampling plan and records its basis.
5. Tests: break-test each rule. A planted d=1 in an L2 pool must demote. A stratum at U = 5.1% must not promote. A
   missing grade file must exit non-zero. A risk score anti-correlated with defects must trip the guard.

## 7. Known limits

- **Live grader-vs-human data is 26 items in two strata.** Every level above rests mostly on his unscreened
  history at reduced weight. That is why nothing starts above L1 and why the bounds are wide.
- His standard for reading is notes, not verdicts. H classification needs owner confirmation, which is a human
  step. It is small (4 H rows in two months).
- Graders, authors and brief writers are one model family. Correlated misses are the main residual risk, and this
  is why the audits never stop at L3.
- The simulation's assumed defect rates are point estimates from n=20 and n=48.
