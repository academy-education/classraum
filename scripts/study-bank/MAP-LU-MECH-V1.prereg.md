# map-lu-mech-v1, 2026-10-12: pre-registration

Written and committed **before any item exists**. The results will go in
`MAP-LU-MECH-V1-RESULT.md`. The plan context is `MAP-LAUNCH-PLAN.md` §7.

## Why this batch

Mechanics is the one MAP strand where an agent pipeline has reached pilot
standard twice running:
- pilot 3: 9/10
- pilot 4: 8/10, with no grid tell from any grader and all 30 distractors
  rated live (MAP-RESEARCH §17)

Grammar was "partly" evidenced. This batch is the first that may **insert**
MAP items, and it inserts them STAGED only (`verified=false`). It extends
the 2x2 grid to grammar so that every item uses the construction that held.

## Source policy

Authors, teacher raters, solvers and graders work only from:
- their own knowledge of the CCSS ELA Language standards L.5-L.8
- NWEA's public CCSS strand names (MAP-RESEARCH §12)

**No NWEA item, live or reconstructed, is opened. The Herald /
cloud.dherald.com PDFs are never opened.** No earlier MAP item file is shown
to any agent. Claude subagents only, at most three at once. Prompts are
fixed in `map-lu-mech-v1/prompts.md`, committed with this file. Every solver
and grader prompt names its one render file and forbids opening anything
else and the web.

## What is built

**28 items** from one fresh author, brief `MAP-LU-MECH-V1-BRIEF.md`:
- Capitalization 9
- Punctuation 9
- Grammar and Usage 10 (Parts of Speech 5; Phrases, Clauses, Agreement,
  Sentences 5)

All target grades 5-8, every item a 2x2 grid {neither, first, second, both}.
**24 are frozen**: the first 8 survivors per strand in id order (grammar
counts as one strand). No spelling, by the brief's scope; that is the next
batch.

Changes against pilot 4, each from a recorded finding:
1. **Two independent teacher raters, union their NOs** (pilot 4: two raters
   disagreed on 3 options). One reviser rewrites each item once. Two fresh
   raters re-rate only the rewritten options. **An item whose rewrite is
   still rated NO by either is DROPPED**, not passed on (pilot 4 let three
   such options through, and all three were named dead by both graders).
2. **Count-axis balance (new exact gate T1).**
   - Capitalization: one under-capitalization site and one
     over-capitalization site.
   - Punctuation: at least one wrongly-present or substituted mark.
   - Either way, the key cannot be the option with uniquely the most or the
     fewest capitals or marks. This was never measured in pilots 1-4, and a
     two-omission grid would hand the key to a "most marks" heuristic.
3. **No disputable sites** (pilot 4 LU-02 "my uncle and Grandma", LU-08's
   optional comma): optional commas, who/whom, singular they and similar are
   banned.
4. **Two-stage with-source grade.** Cold first (key unmarked, file on disk),
   then keyed (key marked: correct / wrong / disputed, plus any option a
   mainstream style guide accepts). Pilot 4's wrong key was caught cold; the
   keyed stage asks the style-guide question directly.
5. Graders state `grade_assigned` as a US grade, not a RIT band. The product
   shows levels, never RIT (MAP-LAUNCH-PLAN Q3).

## Order of work

1. author
2. exact checks (report)
3. teacher round 1 (two raters)
4. revise, then re-rate (two fresh raters)
5. one pre-attack exact-check repair per failing item (`repairs.json`),
   else drop
6. `freeze`, then **freeze commit**
7. `render`, then **render commit**
8. three options-only samples and two with-source graders (cold, then keyed)
9. `score`

**No repair after any solver or grader has run. Drops only.**

## Stage 0 (freeze)

At least 8 survivors per strand after the teacher gate and exact checks, and
the frozen 24 pass the batch checks. Otherwise the batch stops: nothing is
frozen, rendered or inserted. Range: 0-10 per strand, and the bar sits
inside it.

## Bars: the batch PASSES only if all hold

Every bar is break-tested at its margin by `map-lu-mech-v1.mjs --selftest`.

| bar | threshold | attainable range | reason |
|---|---|---|---|
| S1-a exact | Every frozen item passes E1 (FK 4-9 on units of 15+ words; shorter units unscorable and counted), E5 (cap: case-only), E6, E7 (no unique medoid), E9 (punct: marks-only), G (2x2 grid by token alignment), grade/ccss match. Batch: E3 key uniquely longest ≤ 25% and uniquely shortest ≤ 25%; T1 key unique count-axis extreme ≤ 25% per strand; rule fields distinct | pass/fail | pilots 1-4 gates plus G and T1 |
| S1-b pilot-pass | **≥ 20 of 24** pass c1-c5: (1) both cold picks on key; (2) no second defensible; (3) both `grade_fit` = fits; (4) no option dead by BOTH; (5) both keyed verdicts "correct" and no accepted alternative | 0-24 | pilot 3/4 bar plus c5, so it is stricter |
| S1-c calibration | `easier` (grade_assigned < target) **≤ 8 of 48** AND `harder` **< 12 of 48** | 0-48 each | pilot bars |
| S1-d level | each grader's mean (grade_assigned − target) within **[−0.5, +0.5]** | either side | pilot bar, now in grades |
| S2 options-only | candidate on-key rate **≥ control rate − 10 points**. The control must be **≥ 25%**, or the stage is INVALID and the batch cannot pass | candidate 0-100 | see below |
| T slots | in the stored (with-source render) order no key slot > 35% | flat by construction | bank-gate §1 |

### What S2 can and cannot measure, stated before the number exists

Each candidate's stem ("Which sentence is punctuated correctly?") carries
nothing. The four full sentences ARE the item. So the options-only read is
the with-source read, and **a high options-only rate is the construct, not a
leak** (pilots 1-4: Mechanics 90-100%). A "leak" bar of the usual kind
("at or below control") would fire on every correct grammar item. It is
therefore **not used**.

What S2 does test is **key recoverability**: whether a reader holding only
the options lands on our key about as often as on a live conventions item's
key. A batch far below the control has ambiguous or wrong keys.

The control is **24 live verified four-choice SAT SEC / ACT CSE items, easy
and medium, 12 punctuation and 12 grammar**. They were chosen by sha256 of
`map-lu-mech-v1-control:<id>`, which is deterministic and committed here in
`map-lu-mech-v1/control.json`. They are rendered options-only through the
same file with the same solver brief.

**The match is imperfect, and the imperfection is stated.** Live SEC options
are fragments ("region;" / "region,") whose sentence is withheld. They carry
less than our full sentences, so the control should sit lower than the
candidates, probably 35-60%.

**The consequence: S2 is a weak screen.** It can fire only on gross key
ambiguity, if the candidates come in below roughly 25-50%. The real key check
is c1 + c5. S2 is kept because the brief requires an options-only stage
against a matched live control, and because a candidate rate that fell to the
control's level would mean something is badly wrong. It is never reported as
"the batch does not leak".

**Guessability without the rule** is decided exactly, not by sampling: E7
(no unique medoid) and T1 (no count-axis extreme). This is the CLAUDE.md
exception: where the defect is structural and decidable, check the whole
population.

**Reported, not deciding:**
- candidate items unanimous on a non-key letter. These are a key-dispute
  signal, read beside c1 and c5.
- unanimity rate, candidates vs control: three samples of one solver are
  correlated, so this is a batch-level comparison only.
- the solvers' named heuristics, and the graders' `_batch` cross-item
  pattern answer. If both graders name the same cross-item pattern, it is
  recorded as a finding whether or not the bars pass.
- teacher NO counts per round, and survivors by strand and by grade.

## If the batch passes

The items passing c1-c5 (at least 20) are inserted **STAGED**:
- `verified=false`
- cohort `map-lu-mech-v1`
- `family='map'`, `section='language'`. This matches the sibling's
  `family='map'`, `section='reading'`; there is no CHECK constraint on
  either column.
- `domain` = the MAP area, `subskill` = the strand, `task='multiple_choice'`
- choices in the with-source render order
- difficulty by mean grade offset: ≤ −1 easy, ≥ +1 hard, else medium
- `verify_meta.map` = { grade_target, ccss, strand, error_sites }

**Never `verified=true`.** MAP is not a shipped family, so a staged row
reaches no student. A person releases it, and the decision rule for that
sitting is fixed before it is drawn (MAP-LAUNCH-PLAN Q6).

The ledger entry is recorded under the gate's resolved family
(`mc_hidden_source`, the default for task `multiple_choice`). Its five
stages are mapped as follows:
- `shape` = S1-a
- `withsource` = S1-b, S1-c, S1-d
- `nosource` = S2
- `elimination` = E7 + T1. That is the exact no-rule-knowledge elimination
  probe. For whole-sentence items there is no withheld source to probe
  against, and the ledger note says so.
- `tells` = E3, T1 and key slots

## If the batch fails

Nothing is inserted. The ledger entry is recorded `killed`, and REGISTER §5
gets the numbers.

## What can't be learned here, stated in advance

- Whether any grade label is right. Graders are not response data
  (MAP-RESEARCH §10).
- Whether students pick the distractors. The teacher rater is a model in a
  teacher's voice, and a human sitting decides verbal cohorts.
- Whether the 2x2 grid is the right construction for grammar beyond this
  batch. There is no within-batch comparison.
