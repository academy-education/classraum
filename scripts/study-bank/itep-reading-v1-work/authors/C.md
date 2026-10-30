# Assignment: author C, iTEP Reading v1

Brief: `scripts/study-bank/briefs/itep-slate-reading-v1.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v1-work/`.

**Output:** `scripts/study-bank/itep-reading-v1-work/items/C.json` with `"author": "C"`.

**Topic lane (choose all four subjects inside it; other authors hold other lanes):** plants, food, farming and weather; roads, boats, trains and how people travelled.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters M, N, O, P, Q, R.

| set_id | part | genre | words | question kinds, in order |
|---|---|---|---|---|
| `ITR1-C-P1A` | 1 | advertisement | 55-95 | 1. main-idea |
| `ITR1-C-P1B` | 1 | diary entry | 55-95 | 1. inference |
| `ITR1-C-P2` | 2 | informational science | 180-240 | 1. main-idea, 2. not-except, 3. detail, 4. inference |
| `ITR1-C-P3` | 3 | informational history | 450-560 | 1. main-idea, 2. vocabulary, 3. detail, 4. purpose, 5. vocabulary, 6. inference |

**Reference lists (read-only):** `itep-reading-v1-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v1-work/existing-names.json` (capitalised words already
used in bank passages: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v1-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v1-work/items/C.json --expect 12 --assigned scripts/study-bank/itep-reading-v1-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file or grader file, and nothing under `scratchpad/`.
