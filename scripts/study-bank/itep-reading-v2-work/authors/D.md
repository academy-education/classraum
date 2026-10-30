# Assignment: author D, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/D.json` with `"author": "D"` (5 texts, 18 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** plants, food, cooking, farming, gardens and weather.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters H, I, J.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-D-P1A` | 1 | advertisement | 55-95 | 1. detail |
| `ITR2-D-P1B` | 1 | postcard | 55-95 | 1. main-idea |
| `ITR2-D-P2A` | 2 | first-person school life | 180-240 | 1. purpose, 2. not-except, 3. detail, 4. detail |
| `ITR2-D-P3A` | 3 | informational science | 450-560 | 1. inference, 2. purpose, 3. vocabulary, 4. detail, 5. purpose, 6. detail |
| `ITR2-D-P3B` | 3 | informational history | 450-560 | 1. detail, 2. inference, 3. main-idea, 4. vocabulary, 5. detail, 6. inference |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-D-P1A-1` detail: key length: middle
- `ITR2-D-P1B-1` main-idea: key length: middle; breadth: key-broadest; key form: two-part; cast: detail, minor-point, two-part
- `ITR2-D-P2A-1` purpose: key length: shortest
- `ITR2-D-P2A-2` not-except: key length: longest; key: not included in the text
- `ITR2-D-P2A-3` detail: key length: middle
- `ITR2-D-P2A-4` detail: key length: longest
- `ITR2-D-P3A-1` inference: key length: middle
- `ITR2-D-P3A-2` purpose: key length: longest
- `ITR2-D-P3A-3` vocabulary: key length: free (vocabulary)
- `ITR2-D-P3A-4` detail: key length: middle
- `ITR2-D-P3A-5` purpose: key length: shortest
- `ITR2-D-P3A-6` detail: key length: middle
- `ITR2-D-P3B-1` detail: key length: longest
- `ITR2-D-P3B-2` inference: key length: shortest
- `ITR2-D-P3B-3` main-idea: key length: middle; breadth: distractor-broader; key form: one-part; cast: broader (wrong), detail, misreading
- `ITR2-D-P3B-4` vocabulary: key length: free (vocabulary)
- `ITR2-D-P3B-5` detail: key length: middle
- `ITR2-D-P3B-6` inference: key length: shortest

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/D.json --expect 18 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
