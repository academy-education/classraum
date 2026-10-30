# Verbal key-visible audit (pre-registered 2026-10-31, before any packet is built or any grader runs)

The staged SSAT Reading, SSAT Verbal, MAP Language and MAP Reading items that
`node scripts/study-bank/agent-review-release.mjs agentreview-audit-cofounder-2026-10-29` (dry run) would release
get a second, independent pass with the key shown, as science did (SCIENCE-AUDIT-2026-10-30.prereg.md). This is a
correctness lens over items that already cleared the 3-grader agent review and a clean co-founder audit sample.
**Building, grading and scoring release nothing and change no `verified` flag.** Only the release script with
`--apply` writes, and only after the owner decides.

## Population (fixed here)

- Exactly the ids `agent-review-release.mjs` would write for run `agentreview-audit-cofounder-2026-10-29`: the
  cleared ids of every RELEASE cohort that are still `verified=false` AND `archived=false`.
- The builder gets them by calling the same code. The selection was moved out of `agent-review-release.mjs` into
  `agent-review-select.mjs` (`selectRelease`), and the release script now calls it too. Its dry-run output is
  unchanged: `release 957, hold 0`.
- It is never re-derived by cohort name. The builder exits non-zero unless the count is **957**
  (`--expect <n>` overrides this, and only for a deliberate re-run).
- At the time of writing, that is 18 cohorts:
  - SSAT Reading: ssat-reading-draft-8 / 9 / 10 / 11 / 14
  - SSAT Verbal: ssat-verbal-draft-2 / 3 / 4 / 5
  - MAP Language: map-language-v2-mechanics, map-language-v2-writing, map-lu-v3-punctuation, map-lu-v6-spelling,
    map-language-v3-grammar, map-language-v3-writing
  - MAP Reading: map-reading-draft-1, map-reading-v2-c4, map-vocab-v3
- Rows are read with `rowsByIds`, which pages by id and checks each page against `count:'exact'`, so PostgREST's
  1,000-row cap cannot shrink the population.
- An item that cannot be shown faithfully refuses the whole build. That covers a graphic, a key that is not one of
  its choices, or a choice count other than 4 (MAP) or 5 (SSAT). The builder does not skip it quietly.

## Units

- **Passage set:** rows of one cohort that share a non-null `passage_group_id`. These are SSAT Reading, and MAP
  Reading draft-1 and v2-c4. A set is never split across packets.
- **Standalone item:** every other row, including MAP Language and Writing items that carry their own short stimulus
  in `item.passage`, and map-vocab-v3 context sentences. Its "passage" is the item itself.

## Source rule (where verbal differs from science)

Science MAP items got "no_source is the construct". **Verbal gets no such exception for passage items.**

- `source_check: required`: every item in a passage set, and every standalone item with a non-empty passage whose
  domain is not `Vocabulary`. That second group is MAP Language and Writing items with a stimulus. If the item can
  be answered from the stem and options alone, without the passage, that is a defect.
- `source_check: not_applicable`: SSAT synonyms and analogies, MAP spelling, punctuation, capitalisation and other
  items with no passage, and map-vocab-v3 (domain `Vocabulary`), where knowing the word IS the construct.
  - A `no_source` raised on such an item is recorded as `ignored` in FLAGGED.json and never flags.
  - A wrong sense that the context sentence rules in still flags as `second_defensible`.

## What a grader checks, with the key visible (the brief: VERBAL-AUDIT-BRIEF.md)

1. **Key.** Solve the item yourself from the passage and stem before reading the key. `key_verified: true` only if
   you reached the key and it is uniquely defensible.
2. **Uniqueness.** Is any other option defensible for a careful student? The COFOUNDER-BRIEF-v2 threshold applies:
   "reasonable, natural or plausible", not "a test-maker would be forced to accept it". If yes, raise
   `second_defensible`.
3. **Support.** For a passage item, does the passage support the key, or does the key assert something the passage
   does not say? If unsupported, raise `no_support`.
4. **Source.** Only where `source_check: required`: can the item be answered without the passage? If so, raise
   `no_source`.
5. **Facts.** Is there a false real-world claim in the passage, stem, options or explanation, or a passage that
   contradicts itself? If so, raise `fact_error`.
6. **Language.** Is there an UNINTENDED grammar, usage or spelling error in the passage, stem, key or explanation? If
   so, raise `language_error`. Errors that are the tested distractors of a grammar, punctuation or spelling item are
   the construct, not a defect.
7. **Explanation.** Does the explanation argue for a different option, contradict the key, or reason wrongly? If so,
   raise `explanation_mismatch`.
8. **Typos and rendering.** Raise `typo_rendering` for:
   - a typo;
   - stray markup;
   - a missing bracket, blank or sentence number that the stem refers to;
   - truncated text;
   - duplicate options.
9. **Non-flagging.**
   - `style`: anything on COFOUNDER-BRIEF-v2's "notice, but do not reject" list, such as a longest key, easy or far
     distractors, an oddly worded distractor in a non-grammar item, or a loose but clearly best key.
   - `note`: anything else worth recording.
   - Optional top-level `batch_patterns` (check (d) of v2) is reported and never flags an item.

## Graders

- Two graders per packet, independent. Neither sees the other's file.
- **a, plain:** the brief as written.
- **b, adversarial:** the same brief plus this instruction: assume every passage set (and every standalone item)
  in the packet contains at least one defect, argue for every distractor as a careful student would, and argue
  against every key before accepting it. This is COFOUNDER-BRIEF-v2's asymmetric-cost stance taken to its limit,
  and it is the same "b" stance the science audit used. b still flags only what it can show.
- Claude only. No GPT.

## Decision rule (fixed here)

- **An item is HELD** if EITHER grader:
  - marks `key_verified: false`; or
  - raises `second_defensible`, `no_support`, `fact_error`, `language_error`, `explanation_mismatch` or
    `typo_rendering`; or
  - raises `no_source` on an item whose `source_check` is `required`.
- `style` and `note` never hold.
- **A passage set is held whole** when ANY of its items is held. The reasons:
  - a released partial set would change the set's item count and type mix under the assembler;
  - a defect in one item is evidence about the shared passage.
- A standalone item holds only itself.
- **No repair inside this pass.** No item is edited, re-keyed or archived on a grader's word. The owner decides
  each held unit.
- **A grader file that is missing, empty, unparseable, missing an id, holding an extra id, using an unknown type,
  with a non-boolean `key_verified` or an issue without a `detail` voids its packet.**
  - The scorer exits non-zero and writes no FLAGGED.json.
  - The packet is re-run with a fresh grader. It is never scored on one grader.
- The scorer also refuses if any packet's `index.json` count differs from MANIFEST, or if the scored total differs
  from MANIFEST `items` or from MANIFEST `population`.

## Instrument

- `verbal-audit-build.mjs [--root <dir>] [--expect 957] [--force]` writes packets of about 40 items. Its default
  root is `scratchpad/verbal-audit/`.
  - Each packet sits in `<cohort>--pN/` and holds `packet.md` and `index.json`. Each `index.json` item has `id`,
    `row_id`, `cohort`, `passage`, `source_check`, `content_sha` and `updated_at`.
  - Packets never mix cohorts, so v2 check (d) runs within one authoring batch.
  - The builder also writes:
    - `MANIFEST.json`, with built_at, population, items and per-packet grader prompts;
    - `GRADER-PROMPT.md`, the template;
    - `AUDIT-BRIEF.md`;
    - `PACKETS.txt`, one packet directory per line.
  - It refuses to overwrite a root that already holds any `audit-*.json`, unless given `--force`.
- `verbal-audit-score.mjs [--root <dir>]`, with its pure core in `verbal-audit-core.mjs`.
  - It prints `scored N of M items, P of Q packets` before any verdict.
  - It writes `FLAGGED.json`, stamped with MANIFEST `built_at`.
  - `src/lib/study/__tests__/verbal-audit-score.test.ts` pins the rule.
- `release-verbal-audit-2026-10-31.mjs [--root <dir>] [--apply]` is a dry run by default. It refuses when:
  - FLAGGED.json is missing or was not scored from this MANIFEST;
  - `selectRelease` no longer puts every audited row in its release set;
  - any audited row is no longer `verified=false`/`archived=false`;
  - any audited row has `updated_at` later than `built_at`, or a `content_sha` that differs from the one recorded
    at build.

  It writes `verified=true` only for audited rows outside held units, and only after the owner says go.

## What this cannot see

- The two graders are one model sampled twice, so agreement between them is not independence. That is why the
  rule is "either", not "both".
- A key-visible grader is anchored by the key. Grader b is told to argue against it, but a quiet agreement with a
  wrong key remains possible.
- No blind number is produced or quoted here. CLAUDE.md records that the model blind attack saturates on some
  families, and this pass does not measure guessability. A clean pass here is not "does not leak".
- The co-founder audit sample cleared these cohorts. This pass may hold items inside cohorts he cleared. That does
  not contradict him: he saw a sample of 28 items, and this pass reads all 957.
