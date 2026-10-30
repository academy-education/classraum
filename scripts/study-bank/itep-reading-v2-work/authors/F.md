# Assignment: author F, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/F.json` with `"author": "F"` (5 texts, 18 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** inventions, tools, machines, everyday technology, letters and communication.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters M, N, O.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-F-P1A` | 1 | text message | 55-95 | 1. inference |
| `ITR2-F-P1B` | 1 | short review | 55-95 | 1. inference |
| `ITR2-F-P2A` | 2 | story | 180-240 | 1. main-idea, 2. purpose, 3. detail, 4. not-except |
| `ITR2-F-P3A` | 3 | informational technology | 450-560 | 1. inference, 2. detail, 3. purpose, 4. vocabulary, 5. purpose, 6. main-idea |
| `ITR2-F-P3B` | 3 | biography of an invented person | 450-560 | 1. detail, 2. inference, 3. vocabulary, 4. main-idea, 5. not-except, 6. detail |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-F-P1A-1` inference: key length: middle
- `ITR2-F-P1B-1` inference: key length: middle
- `ITR2-F-P2A-1` main-idea: key length: shortest; breadth: key-broadest; key form: one-part; cast: detail, misreading, two-part
- `ITR2-F-P2A-2` purpose: key length: longest
- `ITR2-F-P2A-3` detail: key length: middle
- `ITR2-F-P2A-4` not-except: key length: middle; key: not included in the text
- `ITR2-F-P3A-1` inference: key length: middle
- `ITR2-F-P3A-2` detail: key length: longest
- `ITR2-F-P3A-3` purpose: key length: shortest
- `ITR2-F-P3A-4` vocabulary: key length: free (vocabulary)
- `ITR2-F-P3A-5` purpose: key length: middle
- `ITR2-F-P3A-6` main-idea: key length: longest; breadth: all-level; key form: two-part; cast: misreading, two-part, two-part
- `ITR2-F-P3B-1` detail: key length: shortest
- `ITR2-F-P3B-2` inference: key length: shortest
- `ITR2-F-P3B-3` vocabulary: key length: free (vocabulary)
- `ITR2-F-P3B-4` main-idea: key length: longest; breadth: all-level; key form: one-part; cast: misreading, misreading, two-part
- `ITR2-F-P3B-5` not-except: key length: middle; key: not included in the text
- `ITR2-F-P3B-6` detail: key length: middle

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/F.json --expect 18 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
