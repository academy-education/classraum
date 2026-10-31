# Assignment: author C, iTEP Listening v1

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v1-work/`.

**Output:** `scripts/study-bank/itep-listening-v1-work/items/C.json` with `"author": "C"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** towns, travel, shops, jobs and local history.

**Name initials:** every invented person and place name starts with one of the letters J, K, L, M.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL1-C-D1` | 1 | sports field | W: a coach; M: a player | the man speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL1-C-D2` | 1 | music room | W: a club leader; M: a club member | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. detail |
| `ITL1-C-D3` | 1 | kitchen at home | W: a parent; M: a teenager | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. purpose |
| `ITL1-C-D4` | 1 | cafeteria | W: a friend; M: a friend | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. relationship |
| `ITL1-C-C` | 2 | at home or out in town | W: a parent or older relative; M: a teenager | the woman speaks first; prevails: woman | 10-20 turns, 300-420 words | 1. intent-next, 2. main-idea, 3. detail, 4. attitude |
| `ITL1-C-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: unsettled; idea shape: change over time | one block, 480-580 words, at most 3,900 characters | 1. main-idea, 2. inference, 3. detail, 4. detail, 5. purpose, 6. purpose |

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL1-C-D1-1` intent-next: key length: middle; script words: key-not-most; about: the man
- `ITL1-C-D2-1` detail: key length: middle; script words: key-not-most; about: the man
- `ITL1-C-D3-1` purpose: key length: middle; script words: key-not-most; about: the woman
- `ITL1-C-D4-1` relationship: key length: middle; script words: key-not-most
- `ITL1-C-C-1` intent-next: key length: middle; script words: key-most; about: the man
- `ITL1-C-C-2` main-idea: key length: middle; script words: key-not-most; whole-script options: 1
- `ITL1-C-C-3` detail: key length: longest; script words: key-most; about: the woman
- `ITL1-C-C-4` attitude: key length: longest; script words: key-most; about: the woman
- `ITL1-C-L-1` main-idea: key length: shortest; script words: key-not-most; whole-script options: 2
- `ITL1-C-L-2` inference: key length: longest; script words: key-most
- `ITL1-C-L-3` detail: key length: shortest; script words: key-not-most
- `ITL1-C-L-4` detail: key length: middle; script words: key-most
- `ITL1-C-L-5` purpose: key length: middle; script words: key-most
- `ITL1-C-L-6` purpose: key length: shortest; script words: key-most

The same plan in machine form is `authors/C.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v1-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank: your subjects must not overlap any of them) and `itep-listening-v1-work/existing-names.json`
(capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v1-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v1-work/items/C.json --expect 14 --plan scripts/study-bank/itep-listening-v1-work/authors/C.plan.json --existing-names scripts/study-bank/itep-listening-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory, and nothing under `scratchpad/`.
