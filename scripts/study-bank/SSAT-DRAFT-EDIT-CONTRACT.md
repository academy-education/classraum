# SSAT reading draft edit screen: data contract

Owner decision, 2026-10-11: an AI drafts SSAT reading passage sets. The
co-founder spends about 10 minutes per passage fixing giveaway answer choices
in an edit screen, and then our checks run. Screen: `/admin/bank-qc?tab=drafts`
(`src/components/admin/bank-qc/DraftsPanel.tsx`). API:
`/api/admin/bank-qc/drafts`. Pure logic: `src/lib/study/ssat-draft.ts`.

**Do not change this contract without updating all three.** The drafting
agent writes rows against it.

## Draft rows (`study_item_bank`)

| column | value |
|---|---|
| family | `'ssat'` |
| section | `'reading'` |
| cohort | `LIKE 'ssat-reading-draft-%'` |
| verified | `false` (so the assembler never draws them) |
| archived | `false` |
| passage_group_id | one passage = one id, holding **6 items** |
| item | the usual SSAT reading jsonb: `passage` (repeated on every item), `prompt`, `choices` (5), `correct_answer` (the choice TEXT), `explanation`, plus any other keys (carried through untouched) |
| content_hash | the SSAT insert definition (`insert-ssat-wv.mjs` `hashOf`) |

`content_sha` and `dedup_key` are GENERATED columns (migration 077). Postgres
recomputes them on every write, so an edit makes old reviews and attacks stale
by itself. Never write them.

## `verify_meta.draft`

```jsonc
{
  "status": "awaiting_edit" | "edited" | "skipped",
  "qc": {
    "oo_hits": 0-3,           // how many of 3 options-only solvers picked the key without the passage
    "oo_notes": ["..."],      // why the solvers picked it
    "grader_flags": ["..."],  // the with-source grader's concerns
    "risk": "high" | "med" | "low"
  },
  "original_item": { ... },   // item jsonb as first inserted; the screen writes it ONLY if absent
  "edited_by": "<admin user id>",
  "edited_at": "<ISO timestamp>",
  "edit_note": "..."
}
```

A missing `draft` object, or a missing `status`, reads as `awaiting_edit`.
Any other `verify_meta` keys are preserved on every write.

## What the screen and API do

- **List**: passages grouped by `passage_group_id`, with `awaiting_edit` first.
- **Get**: one passage. The whole group is read **without** the draft filters.
  If any row in it is not a draft row, the request is refused with 403.
- **Save** (`status` becomes `edited`): writes every item the client sends.
  - If an item's passage, prompt, choices, key or explanation changed, it
    rewrites `item` and recomputes `content_hash`.
  - On every row it sets `original_item` (only if absent), `edited_by`,
    `edited_at` and `edit_note`.
  - A passage edit must include all items, because the passage is stored on
    each item.
  - `distractor_rationales` are keyed by choice text. A rationale whose choice
    was rewritten, or which now names the key, is replaced with an empty reason.
  - Validation refuses the save unless there are exactly 5 non-empty, distinct
    choices, a key that is one of the choices, and a non-empty stem. If the key
    is the uniquely longest choice, the screen warns but still saves.
- **Skip**: sets `status` to `skipped`. Nothing else changes. Skipping a
  passage that is already `edited` is refused (409).
- Every UPDATE is filtered on `family`, `section`, the cohort LIKE,
  `verified=false` and `archived=false`, **and** on the `content_sha` the
  editor loaded. If a row changed in the meantime or stopped being a draft, it
  is not written, and the client gets a 409.
- Nothing here ever sets `verified` or `archived`.
- Writes go row by row (there is no RPC, by design: no migration). If a save
  fails partway, it reports which rows were written. The editor then reloads.

## What happens after an edit

Rows with `status='edited'` go to our checks: the options-only attack and the
with-source grade, both run against the new `content_sha`. The screen does not
release anything.
