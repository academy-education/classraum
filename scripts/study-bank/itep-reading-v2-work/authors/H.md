# Assignment: author H, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/H.json` with `"author": "H"` (5 texts, 18 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** rocks, volcanoes, caves, the sky, light, sound and other earth and space science; school clubs and competitions.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters S, T, V, W, Y, Z.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-H-P1A` | 1 | diary entry | 55-95 | 1. purpose |
| `ITR2-H-P1B` | 1 | sign | 55-95 | 1. detail |
| `ITR2-H-P2A` | 2 | informational history | 180-240 | 1. inference, 2. inference, 3. vocabulary, 4. detail |
| `ITR2-H-P3A` | 3 | informational science | 450-560 | 1. detail, 2. inference, 3. not-except, 4. vocabulary, 5. vocabulary, 6. detail |
| `ITR2-H-P3B` | 3 | story | 450-560 | 1. purpose, 2. detail, 3. not-except, 4. vocabulary, 5. detail, 6. main-idea |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-H-P1A-1` purpose: key length: middle
- `ITR2-H-P1B-1` detail: key length: longest
- `ITR2-H-P2A-1` inference: key length: middle
- `ITR2-H-P2A-2` inference: key length: middle
- `ITR2-H-P2A-3` vocabulary: key length: free (vocabulary)
- `ITR2-H-P2A-4` detail: key length: shortest
- `ITR2-H-P3A-1` detail: key length: middle
- `ITR2-H-P3A-2` inference: key length: middle
- `ITR2-H-P3A-3` not-except: key length: middle; key: contradicted by the text
- `ITR2-H-P3A-4` vocabulary: key length: free (vocabulary)
- `ITR2-H-P3A-5` vocabulary: key length: free (vocabulary)
- `ITR2-H-P3A-6` detail: key length: longest
- `ITR2-H-P3B-1` purpose: key length: shortest
- `ITR2-H-P3B-2` detail: key length: longest
- `ITR2-H-P3B-3` not-except: key length: middle; key: not included in the text
- `ITR2-H-P3B-4` vocabulary: key length: free (vocabulary)
- `ITR2-H-P3B-5` detail: key length: shortest
- `ITR2-H-P3B-6` main-idea: key length: middle; breadth: distractor-broader; key form: one-part; cast: broader (wrong), detail, minor-point

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/H.json --expect 18 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
