# Assignment: author B, iTEP Listening v1

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it).
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v1-work/`.

**Output:** `scripts/study-bank/itep-listening-v1-work/items/B.json` with `"author": "B"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** nature, animals, plants, weather and earth science.

**Name initials:** every invented person and place name starts with one of the letters E, F, G, H.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL1-B-D1` | 1 | train station | W: a passenger; M: a ticket clerk | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. inference |
| `ITL1-B-D2` | 1 | school bus | W: a sister; M: a brother | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. detail |
| `ITL1-B-D3` | 1 | science lab | W: a classmate; M: a classmate | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. purpose |
| `ITL1-B-D4` | 1 | museum on a class trip | W: a student; M: a museum guide | the woman speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. inference |
| `ITL1-B-C` | 2 | in a classroom after class | W: a student; M: a teacher | the man speaks first; prevails: woman | 10-20 turns, 300-420 words | 1. detail, 2. relationship, 3. purpose, 4. main-idea |
| `ITL1-B-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: rejects; idea shape: two competing explanations | one block, 480-580 words, at most 3,900 characters | 1. attitude, 2. main-idea, 3. inference, 4. detail, 5. detail, 6. inference |

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL1-B-D1-1` inference: key length: middle; script words: key-not-most; about: the man
- `ITL1-B-D2-1` detail: key length: middle; script words: key-not-most; about: the woman
- `ITL1-B-D3-1` purpose: key length: longest; script words: key-not-most; about: the woman
- `ITL1-B-D4-1` inference: key length: middle; script words: key-most; about: the man
- `ITL1-B-C-1` detail: key length: longest; script words: key-most; about: the man
- `ITL1-B-C-2` relationship: key length: longest; script words: key-most
- `ITL1-B-C-3` purpose: key length: shortest; script words: key-not-most; about: the man
- `ITL1-B-C-4` main-idea: key length: middle; script words: key-most; whole-script options: 1
- `ITL1-B-L-1` attitude: key length: middle; script words: key-most
- `ITL1-B-L-2` main-idea: key length: shortest; script words: key-not-most; whole-script options: 2
- `ITL1-B-L-3` inference: key length: shortest; script words: key-not-most
- `ITL1-B-L-4` detail: key length: middle; script words: key-most
- `ITL1-B-L-5` detail: key length: middle; script words: key-most
- `ITL1-B-L-6` inference: key length: middle; script words: key-not-most

The same plan in machine form is `authors/B.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v1-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank: your subjects must not overlap any of them) and `itep-listening-v1-work/existing-names.json`
(capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v1-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v1-work/items/B.json --expect 14 --plan scripts/study-bank/itep-listening-v1-work/authors/B.plan.json --existing-names scripts/study-bank/itep-listening-v1-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory, and nothing under `scratchpad/`.
