# Reading draft edit screen (SSAT reading, MAP reading): data contract

Owner decision, 2026-10-11: an AI drafts SSAT reading passage sets. The
co-founder spends about 10 minutes per passage fixing giveaway answer choices
in an edit screen, and then our checks run. **2026-10-12:** the owner moved MAP
Growth reading comprehension onto the same route ("MAP test needs to keep
going"), so the screen now serves a closed allowlist of draft families. Screen: `/admin/bank-qc?tab=drafts`
(`src/components/admin/bank-qc/DraftsPanel.tsx`). API:
`/api/admin/bank-qc/drafts`. Pure logic: `src/lib/study/ssat-draft.ts`.

**Do not change this contract without updating all three.** The drafting
agent writes rows against it. (The file keeps its SSAT name because commits,
the ledger and REGISTER cite it.)

## Draft families (`DRAFT_FAMILIES` in `ssat-draft.ts`)

| key | label | family | section | cohort | choices | items per passage |
|---|---|---|---|---|---|---|
| `ssat-reading` | SSAT reading | `'ssat'` | `'reading'` | `LIKE 'ssat-reading-draft-%'` | **5** | 6 |
| `map-reading` | MAP reading | `'map'` | `'reading'` | `LIKE 'map-reading-draft-%'` | **4** | 4 |

- A row is a draft only when its family, section **and** cohort prefix all
  match **one** entry. `family='map'` with an SSAT prefix, or the reverse, is
  not a draft.
- A passage group must be all drafts of **one** family. A group that mixes
  families is refused (403) on get, save and skip.
- **MAP is not a shipped family** (the app shows "Coming soon"). Nothing in
  the code decides MAP's `family`/`section` yet. These values follow the MAP
  pilot batch files, which carry `family: 'map'` and `map_subject: 'reading'`.
  `MAP-LAUNCH-PLAN.md` §5 (2026-10-12) adopts the same values (sections
  `reading` / `language` / `math`). If the launch ever changes them, change
  this table, the allowlist and the rows together.
- Items per passage is the drafting convention, not something the screen
  enforces. It edits whatever the group holds.
- The SSAT entry is the original contract, unchanged.

## Draft rows (`study_item_bank`)

| column | value |
|---|---|
| family / section / cohort | one `DRAFT_FAMILIES` entry (above) |
| verified | `false` (so the assembler never draws them) |
| archived | `false` |
| passage_group_id | one passage = one id, holding the family's items per passage |
| item | the usual reading jsonb: `passage` (repeated on every item), `prompt`, `choices` (5 for SSAT, 4 for MAP), `correct_answer` (the choice TEXT), `explanation`, plus any other keys (carried through untouched; MAP rows also carry `map_area`, `target_band`, `grade_target`, `text_type`) |
| content_hash | the SSAT insert definition (`insert-ssat-wv.mjs` `hashOf`), for both families. MAP has no insert path of its own. |

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

`risk` is set by the drafting run, the same rule for both families (as used
for `ssat-reading-draft-1`):
- **high:** `oo_hits >= 2`, or any grader names a second defensible answer or a
  wrong key;
- **med:** `oo_hits = 1`, or a dead-distractor or too-easy flag;
- **low:** otherwise.

A grader flag that a recorded mechanical fix resolved before insert is kept,
prefixed `[resolved before insert ...]`, and does not count toward risk.

A missing `draft` object, or a missing `status`, reads as `awaiting_edit`.
Any other `verify_meta` keys are preserved on every write.

## What the screen and API do

- **List**: one query per family, each with its family's filters. Each query
  keeps only rows that are drafts of **that** family (re-checked on the rows).
  Passages are grouped by `passage_group_id`, with `awaiting_edit` first, and
  each carries its family key and label. The screen shows a test chip per
  passage, plus a test filter once more than one family has drafts.
- **Get**: one passage. The whole group is read **without** the draft filters.
  If any row in it is not a draft row, or the rows mix families, the request is
  refused with 403. The response carries `family`, `familyLabel` and
  `choiceCount`, and the editor shows exactly that many choice boxes.
- **Save** (`status` becomes `edited`): writes every item the client sends.
  - If an item's passage, prompt, choices, key or explanation changed, it
    rewrites `item` and recomputes `content_hash`.
  - On every row it sets `original_item` (only if absent), `edited_by`,
    `edited_at` and `edit_note`.
  - A passage edit must include all items, because the passage is stored on
    each item.
  - `distractor_rationales` are keyed by choice text. A rationale whose choice
    was rewritten, or which now names the key, is replaced with an empty reason.
  - Validation refuses the save unless there are exactly the family's number
    of non-empty, distinct choices (5 SSAT, 4 MAP), a key that is one of the
    choices, and a non-empty stem. The screen and the server both check this. If the key
    is the uniquely longest choice, the screen warns but still saves.
- **Skip**: sets `status` to `skipped`. Nothing else changes. Skipping a
  passage that is already `edited` is refused (409).
- Every UPDATE is filtered on the group's family's `family`, `section` and
  cohort LIKE, plus `verified=false` and `archived=false`, **and** on the `content_sha` the
  editor loaded. If a row changed in the meantime or stopped being a draft, it
  is not written, and the client gets a 409.
- Nothing here ever sets `verified` or `archived`.
- Writes go row by row (there is no RPC, by design: no migration). If a save
  fails partway, it reports which rows were written. The editor then reloads.

## What happens after an edit

Rows with `status='edited'` go to our checks: the options-only attack and the
with-source grade, both run against the new `content_sha`. The screen does not
release anything.
