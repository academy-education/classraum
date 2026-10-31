# Assignment: author A, iTEP Listening v1

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v1-work/`.

**Output:** `scripts/study-bank/itep-listening-v1-work/items/A.json` with `"author": "A"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** school life, clubs, sport, exercise and health.

**Name initials:** every invented person and place name starts with one of the letters A, B, C, D.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL1-A-D1` | 1 | corner shop | W: a cousin; M: a cousin | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. relationship |
| `ITL1-A-D2` | 1 | bus stop | W: a team member; M: a team captain | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL1-A-D3` | 1 | school office | W: a new student; M: an older student | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. detail |
| `ITL1-A-D4` | 1 | computer room | W: a teacher; M: a student | the woman speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL1-A-C` | 2 | at school, between classes | W: a student; M: a classmate | the man speaks first; prevails: neither | 10-20 turns, 300-420 words | 1. attitude, 2. main-idea, 3. detail, 4. detail |
| `ITL1-A-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: supports; idea shape: a problem and its solution | one block, 480-580 words, at most 3,900 characters | 1. purpose, 2. main-idea, 3. purpose, 4. detail, 5. detail, 6. attitude |

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL1-A-D1-1` relationship: key length: middle; script words: key-most
- `ITL1-A-D2-1` intent-next: key length: middle; script words: key-most; about: the woman
- `ITL1-A-D3-1` detail: key length: longest; script words: key-most; about: the woman
- `ITL1-A-D4-1` intent-next: key length: middle; script words: key-not-most; about: the woman
- `ITL1-A-C-1` attitude: key length: shortest; script words: key-not-most; about: the woman
- `ITL1-A-C-2` main-idea: key length: middle; script words: key-not-most; whole-script options: 2
- `ITL1-A-C-3` detail: key length: longest; script words: key-most; about: the man
- `ITL1-A-C-4` detail: key length: shortest; script words: key-most; about: the man
- `ITL1-A-L-1` purpose: key length: shortest; script words: key-most
- `ITL1-A-L-2` main-idea: key length: middle; script words: key-not-most; whole-script options: 4
- `ITL1-A-L-3` purpose: key length: middle; script words: key-not-most
- `ITL1-A-L-4` detail: key length: middle; script words: key-not-most
- `ITL1-A-L-5` detail: key length: longest; script words: key-not-most
- `ITL1-A-L-6` attitude: key length: middle; script words: key-most

The same plan in machine form is `authors/A.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v1-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank: your subjects must not overlap any of them) and `itep-listening-v1-work/existing-names.json`
(capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v1-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v1-work/items/A.json --expect 14 --plan scripts/study-bank/itep-listening-v1-work/authors/A.plan.json --existing-names scripts/study-bank/itep-listening-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory, and nothing under `scratchpad/`.
