# Assignment: author A, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/A.json` with `"author": "A"` (6 texts, 22 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** animals, insects, birds, oceans, rivers and the natural world.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters A, B.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-A-P1A` | 1 | shop notice | 55-95 | 1. main-idea |
| `ITR2-A-P1B` | 1 | library notice | 55-95 | 1. purpose |
| `ITR2-A-P2A` | 2 | story | 180-240 | 1. vocabulary, 2. not-except, 3. inference, 4. detail |
| `ITR2-A-P2B` | 2 | informational science | 180-240 | 1. vocabulary, 2. main-idea, 3. detail, 4. purpose |
| `ITR2-A-P3A` | 3 | informational science | 450-560 | 1. main-idea, 2. detail, 3. vocabulary, 4. inference, 5. not-except, 6. inference |
| `ITR2-A-P3B` | 3 | story | 450-560 | 1. purpose, 2. main-idea, 3. detail, 4. detail, 5. vocabulary, 6. vocabulary |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-A-P1A-1` main-idea: key length: middle; breadth: all-level; key form: two-part; cast: two-part, two-part, two-part
- `ITR2-A-P1B-1` purpose: key length: middle
- `ITR2-A-P2A-1` vocabulary: key length: free (vocabulary)
- `ITR2-A-P2A-2` not-except: key length: middle; key: contradicted by the text
- `ITR2-A-P2A-3` inference: key length: longest
- `ITR2-A-P2A-4` detail: key length: shortest
- `ITR2-A-P2B-1` vocabulary: key length: free (vocabulary)
- `ITR2-A-P2B-2` main-idea: key length: middle; breadth: distractor-broader; key form: one-part; cast: broader (wrong), misreading, misreading
- `ITR2-A-P2B-3` detail: key length: middle
- `ITR2-A-P2B-4` purpose: key length: middle
- `ITR2-A-P3A-1` main-idea: key length: middle; breadth: distractor-broader; key form: two-part; cast: broader (wrong), detail, two-part
- `ITR2-A-P3A-2` detail: key length: middle
- `ITR2-A-P3A-3` vocabulary: key length: free (vocabulary)
- `ITR2-A-P3A-4` inference: key length: longest
- `ITR2-A-P3A-5` not-except: key length: longest; key: contradicted by the text
- `ITR2-A-P3A-6` inference: key length: middle
- `ITR2-A-P3B-1` purpose: key length: shortest
- `ITR2-A-P3B-2` main-idea: key length: shortest; breadth: all-level; key form: two-part; cast: misreading, two-part, two-part
- `ITR2-A-P3B-3` detail: key length: shortest
- `ITR2-A-P3B-4` detail: key length: longest
- `ITR2-A-P3B-5` vocabulary: key length: free (vocabulary)
- `ITR2-A-P3B-6` vocabulary: key length: free (vocabulary)

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/A.json --expect 22 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
