# Assignment: author D, iTEP Reading v1

Brief: `scripts/study-bank/briefs/itep-slate-reading-v1.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v1-work/`.

**Output:** `scripts/study-bank/itep-reading-v1-work/items/D.json` with `"author": "D"`.

**Topic lane (choose all four subjects inside it; other authors hold other lanes):** inventions, tools and everyday technology; music, art, buildings, libraries and museums.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters S, T, U, V, W, Y, Z.

| set_id | part | genre | words | question kinds, in order |
|---|---|---|---|---|
| `ITR1-D-P1A` | 1 | library notice | 55-95 | 1. purpose |
| `ITR1-D-P1B` | 1 | email | 55-95 | 1. detail |
| `ITR1-D-P2` | 2 | first-person school life | 180-240 | 1. main-idea, 2. vocabulary, 3. purpose, 4. inference |
| `ITR1-D-P3` | 3 | informational technology | 450-560 | 1. main-idea, 2. detail, 3. not-except, 4. inference, 5. purpose, 6. purpose |

**Reference lists (read-only):** `itep-reading-v1-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v1-work/existing-names.json` (capitalised words already
used in bank passages: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v1-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v1-work/items/D.json --expect 12 --assigned scripts/study-bank/itep-reading-v1-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file or grader file, and nothing under `scratchpad/`.
