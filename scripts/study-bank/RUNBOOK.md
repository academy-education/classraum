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
