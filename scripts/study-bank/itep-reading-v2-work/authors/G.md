# Assignment: author G, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/G.json` with `"author": "G"` (5 texts, 18 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** music, painting, theatre, buildings, libraries and museums.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters P, Q, R.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-G-P1A` | 1 | email | 55-95 | 1. vocabulary |
| `ITR2-G-P1B` | 1 | note | 55-95 | 1. purpose |
| `ITR2-G-P2A` | 2 | first-person school life | 180-240 | 1. vocabulary, 2. detail, 3. detail, 4. main-idea |
| `ITR2-G-P3A` | 3 | informational history | 450-560 | 1. vocabulary, 2. detail, 3. not-except, 4. detail, 5. main-idea, 6. vocabulary |
| `ITR2-G-P3B` | 3 | informational technology | 450-560 | 1. inference, 2. not-except, 3. detail, 4. vocabulary, 5. inference, 6. detail |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-G-P1A-1` vocabulary: key length: free (vocabulary)
- `ITR2-G-P1B-1` purpose: key length: middle
- `ITR2-G-P2A-1` vocabulary: key length: free (vocabulary)
- `ITR2-G-P2A-2` detail: key length: middle
- `ITR2-G-P2A-3` detail: key length: longest
- `ITR2-G-P2A-4` main-idea: key length: middle; breadth: all-level; key form: two-part; cast: misreading, misreading, two-part
- `ITR2-G-P3A-1` vocabulary: key length: free (vocabulary)
- `ITR2-G-P3A-2` detail: key length: middle
- `ITR2-G-P3A-3` not-except: key length: middle; key: contradicted by the text
- `ITR2-G-P3A-4` detail: key length: longest
- `ITR2-G-P3A-5` main-idea: key length: longest; breadth: all-level; key form: two-part; cast: misreading, two-part, two-part
- `ITR2-G-P3A-6` vocabulary: key length: free (vocabulary)
- `ITR2-G-P3B-1` inference: key length: shortest
- `ITR2-G-P3B-2` not-except: key length: middle; key: not included in the text
- `ITR2-G-P3B-3` detail: key length: shortest
- `ITR2-G-P3B-4` vocabulary: key length: free (vocabulary)
- `ITR2-G-P3B-5` inference: key length: shortest
- `ITR2-G-P3B-6` detail: key length: middle

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/G.json --expect 18 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
