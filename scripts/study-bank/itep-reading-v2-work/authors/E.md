# Assignment: author E, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/E.json` with `"author": "E"` (6 texts, 22 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** travel, roads, bridges, boats, trains, maps and how people got around.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters K, L, U.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-E-P1A` | 1 | invitation | 55-95 | 1. main-idea |
| `ITR2-E-P1B` | 1 | travel update | 55-95 | 1. vocabulary |
| `ITR2-E-P2A` | 2 | informational science | 180-240 | 1. detail, 2. purpose, 3. detail, 4. vocabulary |
| `ITR2-E-P2B` | 2 | first-person school life | 180-240 | 1. not-except, 2. inference, 3. detail, 4. main-idea |
| `ITR2-E-P3A` | 3 | informational history | 450-560 | 1. inference, 2. inference, 3. vocabulary, 4. not-except, 5. vocabulary, 6. detail |
| `ITR2-E-P3B` | 3 | story | 450-560 | 1. vocabulary, 2. inference, 3. detail, 4. purpose, 5. vocabulary, 6. purpose |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-E-P1A-1` main-idea: key length: shortest; breadth: distractor-broader; key form: one-part; cast: broader (wrong), misreading, two-part
- `ITR2-E-P1B-1` vocabulary: key length: free (vocabulary)
- `ITR2-E-P2A-1` detail: key length: middle
- `ITR2-E-P2A-2` purpose: key length: longest
- `ITR2-E-P2A-3` detail: key length: longest
- `ITR2-E-P2A-4` vocabulary: key length: free (vocabulary)
- `ITR2-E-P2B-1` not-except: key length: middle; key: contradicted by the text
- `ITR2-E-P2B-2` inference: key length: middle
- `ITR2-E-P2B-3` detail: key length: middle
- `ITR2-E-P2B-4` main-idea: key length: middle; breadth: key-broadest; key form: two-part; cast: detail, misreading, two-part
- `ITR2-E-P3A-1` inference: key length: longest
- `ITR2-E-P3A-2` inference: key length: middle
- `ITR2-E-P3A-3` vocabulary: key length: free (vocabulary)
- `ITR2-E-P3A-4` not-except: key length: shortest; key: not included in the text
- `ITR2-E-P3A-5` vocabulary: key length: free (vocabulary)
- `ITR2-E-P3A-6` detail: key length: shortest
- `ITR2-E-P3B-1` vocabulary: key length: free (vocabulary)
- `ITR2-E-P3B-2` inference: key length: middle
- `ITR2-E-P3B-3` detail: key length: middle
- `ITR2-E-P3B-4` purpose: key length: shortest
- `ITR2-E-P3B-5` vocabulary: key length: free (vocabulary)
- `ITR2-E-P3B-6` purpose: key length: longest

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/E.json --expect 22 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
