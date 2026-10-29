# ACT Science v10 authoring brief

Written 2026-10-27 against the four failure classes in `ACT-SCIENCE-AGENT-RELEASE-RESULT.md`
(36 of 480 items survived; 0 new forms). The gate is unchanged: two fresh with-source graders under
`act-science-regrade/GRADER-BRIEF.md` drop rules R1-R8, and any drop takes its whole passage. So one weak item
costs six. Write every item as if it alone decides whether its passage ships.

## Shape

- Each cohort: **4 research_summaries passages (6 items each) + 3 conflicting_viewpoints passages (6 items each) = 42 items.**
- Batch file shape: `act-science-v9a.batch.json` (id `ASV10a-P1-Q1`, passage_id `sc10a-p1`, passage_title, format,
  passage, graphic, prompt, choices[4], correct_answer, explanation, domain, difficulty, topic_tag).
- **Graphics: `table`, `bar`, `line` or `scatter` only. No `svg`** (the graders' decoder refuses svg). The graphic is
  IDENTICAL on every item of an RS passage; optional on CV.
- Domains across a cohort roughly 7/6/7 over Interpretation of Data / Scientific Investigation / Evaluation of Models,
  Inferences, and Experimental Results. Difficulty: aim medium/hard; v5-v9 graders read most items as easy.
- `node scripts/study-bank/act-bank-helper.mjs check science <batch.json>` must pass.

## The four rules that decide whether a passage survives

### 1. No item may be answerable from the stem and options alone (R4, R6)

This killed more passages than everything else together (115 of 154 rule drops).
- **Do not write "which experiment would best test X" items where only one option varies X.** If you write a design
  item, ALL FOUR options must vary the named variable; they differ in a passage-specific detail (which of the
  passage's control values is held, which strain/sample/site from the procedure is reused, which measurement
  interval the passage used). A reader without the passage cannot choose.
- **Do not write "why was this step done" items whose key is generic lab sense** (blotting, drying, same time of day,
  a control group). If you ask about a procedure step, the reason must come from a fact stated only in the passage.
- **Yes/No claim items:** every "Yes" and every "No" must cite a reason that is TRUE of the data in some row; the key
  is the one whose reason bears on the claim as worded. Never let a reason contradict its own verdict.
- Self-test for every item: cover the passage and figure; can you rule out two options from the stem and options
  alone? If yes, rewrite.

### 2. No textbook-exact data (R5)

25 items and many passages died because the table WAS a law: pendulum 2*pi*sqrt(L/g), Snell with handbook indices,
resistivity, thermal expansion, ideal gas, mass-spring, Mersenne strings, cloud base = 125 m per degree, freezing-point
depression.
- Use **invented systems** (fictional organisms, unnamed compounds, made-up instruments, invented field sites) whose
  behaviour follows NO named high-school law.
- Make relationships **non-trivial**: plateaus, thresholds, an optimum, an interaction between two variables, a
  reversal, measurement noise of a few percent. Never exact proportionality.
- No real datasets, no real places-plus-events (no Cascadia ghost forest, no Triton in disguise).
- Self-test: could a student who knows any standard formula or famous result reproduce a cell or the key? If yes,
  change the system.

### 3. Conflicting viewpoints: the key must need the viewpoints (R4, R8)

- **"Which scientist does this finding support" items:** every option's because-clause must restate SOME feature of
  the finding or of a viewpoint; the key is the one that matches a claim stated in only one viewpoint. Never let the
  key be the only option whose reason echoes the finding.
- **"Both would agree" items:** either every option names a mechanism from the viewpoints (and the key is the one both
  state), or none does. Never make the key the lone mechanism-free option.
- Give the viewpoints overlapping premises and specific, checkable claims (a number, a sequence, a location), so items
  can turn on details.
- Vary the key's role across a cohort's CV items (support / weaken / agree / predict / would-explain); do not reuse
  one option template across passages.

### 4. Physically and biologically possible (R3)

Two passages died on impossible setups (four cylinders of one solid, same volume, different masses; a comet orbit that
breaks Kepler's third law).
- Every passage gets a one-line `consistency_check` field in its first item stating the invariants you verified
  (conservation of mass/energy, densities, units, orbital mechanics, monotonic where it must be). Recompute every
  number the key uses.

## Process for the authoring agent

1. Draft all passages, then run the four self-tests item by item and rewrite.
2. Recompute every key from the cells. Check every trend over all rows, every interpolation against both neighbours.
3. Shuffle so the stored key position is roughly flat (A/B/C/D) within the cohort.
4. Run `act-bank-helper.mjs check science`. Do not insert.

## v11 lessons (b8, 2026-10-29: 1 of 7 passages cleared)

Every key was right; the passages died on guessability the brief already warns about, written to one template:

- **"Would most likely agree" items:** do not make the key the only general/structural option while each
  distractor is one scientist's specific mechanism. Two of the distractors must also be claims BOTH viewpoints
  could hold in general form, separated only by a detail stated in the passage.
- **Yes/No claim items:** "all four reasons true in the table" is not enough. At least two distractors' reasons
  must bear on the claim as worded too (a second counterexample-shaped reason that fails on a passage detail),
  so the key cannot be found by asking which reason is relevant.
- **Stems must not name the mechanism** the item asks about (P7-Q4 "blocks rain-splashed soil").
- **No option may be the only one connected to a stem cue** (P7-Q5 "distance from the road" → only exhaust option;
  P5-Q6 "briefly" → only duration option).
- Write at most one "agree" item and one Yes/No item per passage, and vary their shape across the cohort.

## v12 lessons (b9, 2026-10-29: 3 of 7 passages cleared — the prereg's "revise" band)

Every key correct again. The v11 rule for Yes/No items did not hold: both graders independently named the same
cross-item rule (the key is the only option whose reason tests exactly the claim as worded).

- **Do not write "Yes/No + reason" or "weakens X, because…" items.** Use interpolation/extrapolation/trend reads,
  "which result is consistent with Scientist X", and predictions from a stated model instead.
- **Design items: no convergent option sets.** The key must not be the option sharing the most levels with the
  others; no mirror-reversed pairs ("higher by 11" / "lower by 11"); no two trivially invalid designs (changes two
  factors / changes none) among the four.
- **Options must not quote a viewpoint's claim so that the finding alone rules them out** (P7-Q4).

## v12c/v12d lessons (b11 5/9, b12 6/9 — both in the "keep writing" band)

- **Raising Scientific Investigation brought back rule 1** (b11). On "which new set of trials would best test
  whether X matters under condition Y", the key was the only option that both varies X and sets Y. All four
  options must vary the named factor AND set the named condition, differing only in a passage detail; no
  distractor may fail on its own text ("50 lux" against "200 lux or more"). Fewer SI items beat leaky ones.
- **"Would most likely agree" keys must not be the only general-category option** (b12; confirmed by blind
  application, 3 of 3). Mix levels: at least two distractors are equally broad claims held by only one scientist
  or by neither, and the key is sometimes a specific shared detail.
