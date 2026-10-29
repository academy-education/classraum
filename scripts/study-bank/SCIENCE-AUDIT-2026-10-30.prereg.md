# Science key-visible audit (pre-registered 2026-10-30, before any auditor runs)

The owner asked to "check science one more time" before the staged, agent-cleared science items are released.
This is a second, independent pass with a correctness lens. It does not replace the with-source grade that
cleared these items. **It releases nothing and changes no `verified` flag.**

## Population (fixed here)

Every row that is staged (`verified=false`, `archived=false`) AND whose qid is on its cohort's cleared list in
`science-release.json`:

- **ACT Science:** act-science-v6b, v7b, v8b, v10a, v10b, v11a, v12a, v12b, v12c, v12d, v12e, v12f. The qid is
  `verify_meta.localId`. v5c is already released and is out of scope.
- **MAP Science:** map-science-pilot, map-science-v1-life, -phys, -earth. The qid is `verify_meta.draft.qid`; the
  v1 cohorts share `map-v2-work/science-b1/cleared.json` and are split by `qidPrefix`.

Staged rows that are not on a cleared list are not audited; they are not releasable by this path anyway. A cleared
qid with no staged row is reported by the builder rather than skipped silently.

## Instrument

- **Builder:** `scripts/study-bank/science-audit-build.mjs` reads the rows paged and count-checked (`pageExact`).
- **Packets:** about 6–8 passages each, in `scratchpad/science-audit/<cohort>--pN/packet.md`.
  - ACT items stay with their passage.
  - MAP items are standalone, one item per "passage".
- **Figures:** rendered by `act-sci-packet.mjs decodeGraphic`, the same text the first pass saw.
  - A figure the decoder refuses is listed in `NOT-AUDITABLE.json`, never put in front of an auditor.
  - Its item is held exactly as a flag is.
- **Auditors:** every packet gets 2 independent auditors under `AUDIT-BRIEF.md`.
  - Auditor **a** is plain.
  - Auditor **b** is told to assume each passage contains at least one error and to hunt for it.
  - Both see the passage, every option, the key and the author's explanation.
  - Neither sees the other's output.

## Per-item questions (the brief)

1. Recompute the key from the rendered data, and show the arithmetic. Answer `key_verified` true or false.
2. Is exactly one option defensible? If not, raise `second_defensible`.
3. Is every value the key needs readable as rendered (the b10 lesson: bars carry no value labels, and unlabeled
   series cannot be told apart)? If not, raise `unreadable`.
4. Is there a false real-world claim, or does the passage or explanation contradict itself? If so, raise `fact_error`.
5. Can the item be answered without the passage or figure? If so, raise `no_source`.

## Output

Each auditor writes `audit-a.json` or `audit-b.json` in its own packet folder, in this shape:

```
{ "<item_id>": { "key_verified": true|false, "issues": [ { "type": "...", "detail": "..." } ] } }
```

- `type` is one of: `second_defensible`, `unreadable`, `fact_error`, `no_source`, `note`.
- `note` never flags.

## Decision rule (fixed here)

- **An item is FLAGGED** if EITHER auditor:
  - marks `key_verified: false`, or
  - raises `second_defensible`, `unreadable`, `fact_error` or `no_source`.
- **A flag holds the item's whole passage** from release, pending the owner's decision. For MAP, the passage is the
  item itself.
- **No repair inside this pass.** No item is edited, re-keyed or archived on an auditor's word. The owner decides
  each held passage.
- **Missing or malformed output voids the packet.** If an auditor file is missing, or covers the wrong ids, or has
  an unknown issue type or a non-boolean `key_verified`, the scorer exits non-zero and scores nothing.
  - The packet is re-run with a fresh auditor.
  - It is never scored on one auditor.

## Scorer

`scripts/study-bank/science-audit-score.mjs`, with its pure core in `science-audit-core.mjs`.

- It prints `scored N of M items, P of Q packets` before any verdict.
- It writes `scratchpad/science-audit/FLAGGED.json`, which lists the flagged items, the held passages and the
  reasons.
- `src/lib/study/__tests__/science-audit-score.test.ts` pins the rule, and was break-tested by deleting each flag
  condition in turn.

## What this cannot see

- Both auditors are one model sampled twice. Agreement between them is not independence. That is why the rule is
  "either", not "both".
- A key-visible auditor is anchored by the key. It is told so, and auditor b is told to argue against it, but a
  quiet agreement with a wrong key is still possible.
- No blind number is produced here, and none is quoted. CLAUDE.md records that the model blind attack saturates on
  ACT Science.
