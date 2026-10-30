# Assignment: author C, iTEP Reading v2

Brief: `scripts/study-bank/briefs/itep-slate-reading-v2.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-reading-v2-work/`.

**Output:** `scripts/study-bank/itep-reading-v2-work/items/C.json` with `"author": "C"` (5 texts, 18 items).

**Topic lane (choose every subject inside it; other authors hold other lanes):** towns, markets, shops, crafts, money and trade, past and present.

**Name initials:** every invented person and place name (first names, surnames, town names) starts with one of
the letters E, F, G.

| set_id | part | genre | words | question kinds, in this order |
|---|---|---|---|---|
| `ITR2-C-P1A` | 1 | poster | 55-95 | 1. vocabulary |
| `ITR2-C-P1B` | 1 | lost-and-found notice | 55-95 | 1. detail |
| `ITR2-C-P2A` | 2 | story | 180-240 | 1. purpose, 2. inference, 3. main-idea, 4. detail |
| `ITR2-C-P3A` | 3 | informational history | 450-560 | 1. inference, 2. not-except, 3. vocabulary, 4. detail, 5. main-idea, 6. purpose |
| `ITR2-C-P3B` | 3 | first-person account | 450-560 | 1. inference, 2. vocabulary, 3. detail, 4. detail, 5. main-idea, 6. purpose |

**Per-item shape (brief §0, rule M, R5; follow exactly):**

- `ITR2-C-P1A-1` vocabulary: key length: free (vocabulary)
- `ITR2-C-P1B-1` detail: key length: longest
- `ITR2-C-P2A-1` purpose: key length: longest
- `ITR2-C-P2A-2` inference: key length: middle
- `ITR2-C-P2A-3` main-idea: key length: shortest; breadth: distractor-broader; key form: one-part; cast: broader (wrong), two-part, two-part
- `ITR2-C-P2A-4` detail: key length: middle
- `ITR2-C-P3A-1` inference: key length: middle
- `ITR2-C-P3A-2` not-except: key length: middle; key: contradicted by the text
- `ITR2-C-P3A-3` vocabulary: key length: free (vocabulary)
- `ITR2-C-P3A-4` detail: key length: middle
- `ITR2-C-P3A-5` main-idea: key length: middle; breadth: key-broadest; key form: one-part; cast: detail, two-part, two-part
- `ITR2-C-P3A-6` purpose: key length: middle
- `ITR2-C-P3B-1` inference: key length: middle
- `ITR2-C-P3B-2` vocabulary: key length: free (vocabulary)
- `ITR2-C-P3B-3` detail: key length: middle
- `ITR2-C-P3B-4` detail: key length: shortest
- `ITR2-C-P3B-5` main-idea: key length: shortest; breadth: key-broadest; key form: two-part; cast: minor-point, misreading, two-part
- `ITR2-C-P3B-6` purpose: key length: longest

**Reference lists (read-only):** `itep-reading-v2-work/existing-passages.txt` (openings of every passage in the bank:
your subjects must not overlap any of them) and `itep-reading-v2-work/existing-names.json` (capitalised words already
used in bank passages and earlier drafts: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-reading-v2-work/itep-reading-check.mjs scripts/study-bank/itep-reading-v2-work/items/C.json --expect 18 --assigned scripts/study-bank/itep-reading-v2-work/ASSIGNED.json --existing-names scripts/study-bank/itep-reading-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any `itep-reading-v1-work` file, and nothing under `scratchpad/`.
