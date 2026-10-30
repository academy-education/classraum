# Assignment: author B, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/B.json` with `"author": "B"` (5 texts, 18 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** sports, outdoor games, exercise, health and the human body.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters C, D.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-B-P1A` | 1 | club announcement | 55-95 | 1. detail |
| `ITR2-B-P1B` | 1 | school notice | 55-95 | 1. detail |
| `ITR2-B-P2A` | 2 | first-person school life | 180-240 | 1. detail, 2. vocabulary, 3. not-except, 4. main-idea |
| `ITR2-B-P3A` | 3 | biography of an invented person | 450-560 | 1. main-idea, 2. not-except, 3. purpose, 4. purpose, 5. detail, 6. vocabulary |
| `ITR2-B-P3B` | 3 | informational science | 450-560 | 1. vocabulary, 2. main-idea, 3. detail, 4. purpose, 5. purpose, 6. detail |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-B-P1A-1` detail: key length: shortest
- `ITR2-B-P1B-1` detail: key length: middle
- `ITR2-B-P2A-1` detail: key length: middle
- `ITR2-B-P2A-2` vocabulary: key length: free (vocabulary)
- `ITR2-B-P2A-3` not-except: key length: middle; key: not included in the text
- `ITR2-B-P2A-4` main-idea: key length: middle; breadth: key-broadest; key form: one-part; cast: detail, two-part, two-part
- `ITR2-B-P3A-1` main-idea: key length: shortest; breadth: key-broadest; key form: two-part; cast: minor-point, misreading, two-part
- `ITR2-B-P3A-2` not-except: key length: middle; key: contradicted by the text
- `ITR2-B-P3A-3` purpose: key length: shortest
- `ITR2-B-P3A-4` purpose: key length: middle
- `ITR2-B-P3A-5` detail: key length: middle
- `ITR2-B-P3A-6` vocabulary: key length: free (vocabulary)
- `ITR2-B-P3B-1` vocabulary: key length: free (vocabulary)
- `ITR2-B-P3B-2` main-idea: key length: longest; breadth: distractor-broader; key form: one-part; cast: broader (wrong), detail, two-part
- `ITR2-B-P3B-3` detail: key length: middle
- `ITR2-B-P3B-4` purpose: key length: longest
- `ITR2-B-P3B-5` purpose: key length: middle
- `ITR2-B-P3B-6` detail: key length: longest

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/B.json --expect 18 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
