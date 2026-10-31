# Assignment: author D, iTEP Listening v1

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v1-work/`.

**Output:** `scripts/study-bank/itep-listening-v1-work/items/D.json` with `"author": "D"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** music, art, technology, inventions and space.

**Name initials:** every invented person and place name starts with one of the letters N, P, R, S, T.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL1-D-D1` | 1 | library desk | W: a student; M: a librarian | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. inference |
| `ITL1-D-D2` | 1 | park | W: a neighbour; M: a neighbour | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL1-D-D3` | 1 | clinic waiting room | W: a patient; M: a receptionist | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. detail |
| `ITL1-D-D4` | 1 | bookshop | W: a shop assistant; M: a customer | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. inference |
| `ITL1-D-C` | 2 | at school, in that staff member's office or room | W: a school staff member who is not a teacher (for example the librarian, the nurse, the office secretary, a lab technician); M: a student | the woman speaks first; prevails: woman | 10-20 turns, 300-420 words | 1. inference, 2. main-idea, 3. attitude, 4. detail |
| `ITL1-D-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: supports; idea shape: a surprising result | one block, 480-580 words, at most 3,900 characters | 1. purpose, 2. inference, 3. detail, 4. inference, 5. main-idea, 6. purpose |

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL1-D-D1-1` inference: key length: middle; script words: key-most; about: the woman
- `ITL1-D-D2-1` intent-next: key length: longest; script words: key-not-most; about: the man
- `ITL1-D-D3-1` detail: key length: middle; script words: key-most; about: the woman
- `ITL1-D-D4-1` inference: key length: middle; script words: key-not-most; about: the woman
- `ITL1-D-C-1` inference: key length: shortest; script words: key-most; about: the woman
- `ITL1-D-C-2` main-idea: key length: middle; script words: key-not-most; whole-script options: 1
- `ITL1-D-C-3` attitude: key length: middle; script words: key-not-most; about: the man
- `ITL1-D-C-4` detail: key length: middle; script words: key-most; about: the man
- `ITL1-D-L-1` purpose: key length: middle; script words: key-most
- `ITL1-D-L-2` inference: key length: longest; script words: key-not-most
- `ITL1-D-L-3` detail: key length: longest; script words: key-most
- `ITL1-D-L-4` inference: key length: shortest; script words: key-not-most
- `ITL1-D-L-5` main-idea: key length: shortest; script words: key-most; whole-script options: 4
- `ITL1-D-L-6` purpose: key length: middle; script words: key-not-most

The same plan in machine form is `authors/D.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v1-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank: your subjects must not overlap any of them) and `itep-listening-v1-work/existing-names.json`
(capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v1-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v1-work/items/D.json --expect 14 --plan scripts/study-bank/itep-listening-v1-work/authors/D.plan.json --existing-names scripts/study-bank/itep-listening-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory, and nothing under `scratchpad/`.
