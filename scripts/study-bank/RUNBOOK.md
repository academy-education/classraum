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
