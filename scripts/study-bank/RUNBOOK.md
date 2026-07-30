# SAT item-bank pipeline (Claude-only, no external model)

## Cohorts & archiving (added 2026-07-08)

`study_item_bank` has two lifecycle columns: `archived boolean` (the
served-gate — the assemble route serves only `archived=false AND
verified=true`) and `cohort text` (a batch label). The full pre-2026-07-08
set (515 rows) is archived under `cohort='legacy'` — kept for dedup and
reference, never served, never deleted. New verified items go in as the
`v2` cohort (`archived=false`), so the app now serves ONLY the fresh,
figure-capable, triple-gated set. Both helpers tag inserts with
`cohort = process.env.BANK_COHORT || 'v2'`; override per batch, e.g.
`BANK_COHORT=v2 node ... insert batch.json qc.json`. To un-archive or
re-cohort, just `update study_item_bank set archived=..., cohort=...`.

**Figures:** an item renders a diagram in-app when
`item.graphic = { type:'rawsvg', svg:'<svg…>', caption? }` (the
TestSession `RawSvgFigure` escape hatch). The math helper builds this
automatically from a top-level `svg` (and optional `caption`) field on the
batch item — author the SVG from structured data so the figure stays
verifiable.

---

# SAT R&W item-bank pipeline (Claude-only, no external model)

Builds verified SAT Reading & Writing items in `study_item_bank`, authored
and QC'd entirely inside a Claude Code session. **No OpenAI, no Anthropic
API key.** The only credential used is the Supabase service-role key in
`.env.local` (a DB write, not a model call). The model backend is Claude
Code itself, via the Agent tool.

Background on *why* this shape (grader scale is compressed, Claude-author
beats gpt-4.1, independence comes from answer-blindness): see the memory
`sat-rw-bank-qc`.

## Roles

- **Author** — Opus (the main session). Writes hard, Module-2-tier items.
- **Blind solvers** — 3 subagents on a *different, smaller* Claude model
  (Haiku) for cross-model diversity. Each sees passage+question+choices
  only, never the key. Confirms exactly one defensible answer.
- **Grader** — 1 subagent, difficulty vs fixed anchors (a known-hard and a
  known-easy exemplar) + distractor quality + passage-dependence.
- **Helper** — `bank-helper.mjs`. Deterministic: blind render + insert.
  No model calls.

## Steps

1. **Author** a batch to `scratchpad/rw-batch.json` — an array of
   `{ id, domain, subskill, passage?, prompt, choices[4], correct_answer,
   explanation }`. Vary domains/topics; make every distractor a real trap;
   never state the answer's meaning in the prompt (that leaks it).

   **Vary the key's LENGTH, not just its position.** An audit on 2026-07-29
   found the correct answer was the uniquely longest of four options in 64.3%
   of banked SAT R&W items, against 25% by chance — while the A/B/C/D histogram
   read as perfectly healthy, which is why nothing caught it for months. A
   test-taker who never read the passage and always picked the longest option
   scored about two thirds. (SAT Math sat at 4.7%: its options are numbers, so
   the habit never gets the chance to operate.)

   It comes from how a correct answer gets written — the key must be fully
   accurate, a distractor gets clipped as soon as it is wrong enough. When a
   distractor reads clipped beside a fully-worded key, EXPAND THE DISTRACTOR
   into a real trap rather than trimming the key; that also makes it a better
   distractor. Keep the four within roughly one band (no option more than
   ~1.5x the shortest).

   State the goal as a HISTOGRAM, never as a direction. Rank the four options
   by length and record where the key sits: 1 = longest, 4 = shortest. Across
   a batch that should come out near **25% at each of the four ranks** — which
   means about a quarter of your keys are the LONGEST option and about a
   quarter are the SHORTEST. Both are correct outcomes.

   Do not write the instruction as "aim for 2nd or 3rd". That exact wording
   was used for the first repair wave on 2026-07-30 and 77% of 210 items came
   back at rank 2: every author picked the safest reading, and the tell became
   "the key is the second-longest option" instead. A per-item check cannot see
   this, because a distribution is not a property of any single item. If you
   are commissioning a batch, ASSIGN each item its rank rather than describing
   a preference — see `REPAIR-BRIEF.md`, which does exactly that.

   `scripts/verify-answer-key-spread.ts` fails a cohort above 40% on longest OR
   shortest; run it before inserting.

### The hedge/absolute asymmetry — and why the fix is on the DISTRACTOR side

Measured against 462 official College Board Digital SAT items and 314 ETS
TOEFL items (2026 practice tests, teacher's resources, released sets),
because we had no released items in the repo and the reference rate could
not be guessed:

    "pick the only hedged option" scores, on the OFFICIAL exams
      SAT Reading & Writing   21%  — key 20.7% / distractor 21.0%, PARITY
      TOEFL Listening         23%  — key  6.9% / distractor 12.0%, keys
                                     hedge LESS than distractors
      TOEFL Reading           47%  — key 23.8% / distractor 11.2%, a real
                                     tell on the real exam

So "a correct answer hedges because it must be defensible" is true for
TOEFL Reading and false everywhere else. Do not aim every section at 25%,
and do not aim SAT keys at "more hedged".

**Our keys are fine.** Every key-side deviation from official is
statistically insignificant. The gap is entirely in the distractors:

    absolutes (all / every / always / never / only / must / cannot)
      official distractors    1.4 - 6.5% of options
      ours                   11 - 19%

That is not merely a tell. An absolute is the single most-taught
elimination cue on both exams, so roughly one wrong answer in five is
currently removable without reading the passage — which makes our items
EASIER than the real thing, not just more guessable.

What to do when authoring:

- **Vary how a distractor is wrong.** Overstatement is one way. The others
  are: right claim about the wrong paragraph, reversed causation, the
  answer to a question that was not asked, a true statement that does not
  address the prompt, the popular misconception the passage corrects.
  Reach for overstatement roughly as often as official items do — rarely.
- **Distractors may hedge.** Official SAT distractors hedge as often as its
  keys do. A hedged wrong answer is a better trap than an absolute one,
  because it cannot be eliminated on form.
- **The target is the key/distractor RATIO, not a level.** Cutting
  distractor absolutes alone would flip the SAT absolute tell from 13.9% to
  36.8%, because our keys carry absolutes at 10.8% against an official
  6.5%. Move both sides toward the official ratio or neither.
- **Leave TOEFL Reading hedges alone.** Ours already match ETS there.

Full working, corpora and per-section z-scores: `docs/plans/hedge-word-tell.md`.

2. **Blind render** (keys stripped):
   ```
   node scripts/study-bank/bank-helper.mjs blind scratchpad/rw-batch.json
   ```

3. **Spawn QC subagents** (Agent tool, `model: "haiku"`), in parallel:
   - ×3 blind solvers — paste the blind render; each returns
     `{"<id>":"<letter>", ...}`.
   - ×1 grader — paste items + the two anchors; returns per id
     `{ difficulty: hard|medium|easy, distractor_quality:
     throwaway|weak|plausible|strong, passage_needed: bool }`.

4. **Assemble `scratchpad/rw-qc.json`** — merge into
   `{ "<id>": { key_votes, difficulty, distractor_quality, passage_needed } }`
   where `key_votes` = how many of the 3 solvers matched the author's key.

5. **Insert** the passers (rule lives in the helper):
   ```
   node scripts/study-bank/bank-helper.mjs insert scratchpad/rw-batch.json scratchpad/rw-qc.json
   ```

## Acceptance rule (in `bank-helper.mjs > accepts()`)

`key_votes ≥ 2` AND `difficulty ∈ {hard, medium}` AND
`distractor_quality ∈ {plausible, strong}` AND
(`passage_needed` OR domain is Standard English Conventions).

Rejections are the pipeline working: a 2/3 (or worse) key vote means an
ambiguous/mis-keyed item; `easy`/`weak` means below the difficulty bar;
`passage_needed=false` on a reading item means the answer leaked.

## Notes

- Runs only with a human/Claude-Code session driving it (Claude is the
  model backend). It is **not** a server cron; making it unattended would
  require an API key. That is by design — the app never calls a model.
- Math bank items are verified by code (a sandbox computes the key), a
  separate path that also uses no external model.

## Math pipeline (`math-bank-helper.mjs`)

Math has a COMPUTABLE answer, so the correctness gate is a deterministic
sandbox, not a vote. (The LLM harness has a ~18% false-negative rate on
hard math — it falls for distractors — so a blind LLM solve must NOT gate
math; it is only a soft cross-check + difficulty rating.)

1. **Author** a batch to `scratchpad/math-batch.json` — each item adds a
   `solve` field: a JS function BODY that recomputes the answer from the
   problem's numbers (an independent method, not an echo of the key) and
   returns it.

2. **Sandbox gate** (the real check, no model):
   ```
   node scripts/study-bank/math-bank-helper.mjs verify scratchpad/math-batch.json
   ```
   Every item must recompute to its key. A mismatch = a mis-key; fix or drop.

3. **Difficulty + cross-check** (Haiku subagents, in parallel): one grader
   (difficulty vs a hard anchor [tangent-to-parabola/Vieta] and an easy
   anchor [solve 2x=10]); one blind solver returning `{id:letter}` as an
   independent confirmation. If the blind solver disagrees on a
   sandbox-passing item, inspect it by hand before inserting.

4. **Insert** (`insert` re-runs the sandbox as a hard gate, then requires
   grader difficulty ∈ {hard, medium}):
   ```
   node scripts/study-bank/math-bank-helper.mjs insert scratchpad/math-batch.json scratchpad/math-qc.json
   ```
   qc.json: `{ "<id>": { difficulty, blind_letter } }`.

Aim HARD: routine one-step items grade "easy" and get cut. Target Vieta /
tangency, parameterized systems, function composition, non-obvious
geometry/trig — the hardest-tier Module 2 shapes.
