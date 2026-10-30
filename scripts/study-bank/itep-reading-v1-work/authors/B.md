# Assignment: author B, iTEP Reading v1

Brief: `scripts/study-bank/briefs/itep-slate-reading-v1.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v1-work/`.

**Output:** `scripts/study-bank/itep-reading-v1-work/items/B.json` with `"author": "B"`.

**Topic lane (choose all four subjects inside it; other authors hold other lanes):** towns, markets and crafts in the past and present; school clubs and events.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters G, H, I, J, K, L.

| set_id | part | genre | words | question kinds, in order |
|---|---|---|---|---|
| `ITR1-B-P1A` | 1 | poster | 55-95 | 1. vocabulary |
| `ITR1-B-P1B` | 1 | note | 55-95 | 1. detail |
| `ITR1-B-P2` | 2 | informational history | 180-240 | 1. detail, 2. vocabulary, 3. not-except, 4. purpose |
| `ITR1-B-P3` | 3 | first-person school life | 450-560 | 1. main-idea, 2. inference, 3. detail, 4. vocabulary, 5. not-except, 6. inference |

**Reference lists (read-only):** `itep-reading-v1-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v1-work/existing-names.json` (capitalised words already
used in bank passages: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v1-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v1-work/items/B.json --expect 12 --assigned scripts/study-bank/itep-reading-v1-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file or grader file, and nothing under `scratchpad/`.
