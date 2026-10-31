# Assignment: author B, iTEP Listening (round 2)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). Set ids in this round
start `ITL2-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v2-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v2-work/scratch/B/`.

**Output:** `scripts/study-bank/itep-listening-v2-work/items/B.json` with `"author": "B"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** animals, insects, birds and ecosystems.

**Name initials:** every invented person and place name starts with one of the letters C, D.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL2-B-D1` | 1 | cafeteria | W: a friend; M: a friend | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. inference |
| `ITL2-B-D2` | 1 | school hallway | W: a student; M: a teacher | the man speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-B-D3` | 1 | farmers' market stall | W: a farmer; M: a shopper | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-B-D4` | 1 | corner shop | W: a shopkeeper; M: a customer | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. inference |
| `ITL2-B-C` | 2 | in a classroom after class | W: a student; M: a teacher | the woman speaks first; prevails: woman | 10-20 turns, 300-420 words | 1. inference, 2. detail, 3. main-idea, 4. detail |
| `ITL2-B-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: unsettled; idea shape: a method and its limits; common belief: named, and the lecture shows it is wrong | one block, 480-580 words, at most 3,900 characters | 1. detail, 2. purpose, 3. purpose, 4. attitude, 5. main-idea, 6. inference |

**Lecture `common belief` (a script shape, like stance; follow it exactly):** `none` = the lecture states no popular
or common belief or "many people think" view at all; `named, and the lecture shows it is right` = the speaker names
one common belief and the lecture's evidence supports it; `named, and the lecture shows it is wrong` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL2-B-D1-1` inference: key length: longest; script words: key-most; about: the woman
- `ITL2-B-D2-1` intent-next: key length: middle; script words: key-not-most; about: the man
- `ITL2-B-D3-1` intent-next: key length: shortest; script words: key-most; about: the woman
- `ITL2-B-D4-1` inference: key length: middle; script words: key-not-most; about: the woman
- `ITL2-B-C-1` inference: key length: shortest; script words: key-not-most; about: the man
- `ITL2-B-C-2` detail: key length: middle; script words: key-not-most; about: the woman
- `ITL2-B-C-3` main-idea: key length: middle; script words: key-most; whole-script options: 2
- `ITL2-B-C-4` detail: key length: longest; script words: key-most; about: the man
- `ITL2-B-L-1` detail: key length: middle; script words: key-not-most
- `ITL2-B-L-2` purpose: key length: shortest; script words: key-most
- `ITL2-B-L-3` purpose: key length: middle; script words: key-most
- `ITL2-B-L-4` attitude: key length: middle; script words: key-not-most
- `ITL2-B-L-5` main-idea: key length: middle; script words: key-most; whole-script options: 1
- `ITL2-B-L-6` inference: key length: longest; script words: key-not-most

The same plan in machine form is `authors/B.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v2-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
`itep-listening-v2-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/B.json --expect 14 --plan scripts/study-bank/itep-listening-v2-work/authors/B.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work`), and nothing
under the repo-root `scratchpad/`.
