# MAP Language v3 (Grammar and Usage + Writing rewrite) — pre-registration (2026-10-29, before any v3 item)

**Why.** The agent review (`AGENT-REVIEW-SSAT-MAP.prereg.md`) held `map-language-v2-grammar` (88; one_template,
key_form) and `map-language-v2-writing` (88; one_template). Owner, 2026-10-29: "Rewrite them". Re-authored from
nothing under `MAP-LANGUAGE-V3-BRIEF.md`, which bans each named tell and adds the positive rules. No repair.

## Fixed now

- **Count.** 78 Grammar and Usage + 78 Writing (65 for 5 forms at 13 per area per form, + 20%). Blueprint counts
  unchanged.
- **Method id** `map-lu-v3-insession-rewrite+cfg-v2`; cohorts `map-language-v3-grammar`, `map-language-v3-writing`.
  Author: one Claude session, separated sub-batches (Grammar one file per grade; Writing one file per format
  group). No GPT, no Herald/NWEA material.
- **Pre-flight** `map-v2-work/language-v3/lu3-check.mjs` must pass with every denominator printed. It is pre-flight,
  not the gate (CLAUDE.md: structural proxies catch only the tell they were built for).
- **Staging.** Inserted `verified=false` by `stage-map-language-v3.mjs` (dry run first, refuses duplicate hashes),
  confirmed by query.
- **Gate.** Exactly the agent-review instrument with Amendment A1, unchanged: packets under
  `scratchpad/agent-review/map-language-v3/`, three fresh graders on COFOUNDER-BRIEF-v2 (a, b plain; c adversarial),
  any single grader's non-unique verdict drops the item, a pattern named by two graders on >= 3 shared items drops
  those items, a cohort-wide pattern holds the cohort, answer-letter patterns excluded. Manifest
  `scratchpad/agent-review/MANIFEST-map-language-v3.json`.
- **The v3 claim is falsified** if any tell the v2 graders named (2x2 grid, extra-word error / key shortest,
  odd-class connector, near-duplicate concessive template, slang-free key among casual options, never-keyed
  transition pool, trivia-aside removal key, only-grammatical combine key, key longest) is named again by two
  graders on >= 3 shared v3 items. That outcome is recorded as a method failure, not repaired in place.
- **Release** still needs the owner's go and Daniel's pre-release spot (owner, 2026-10-29: "Let's have Daniel check
  couple questions before releasing").
