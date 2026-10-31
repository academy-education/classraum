# Assignment: author I, iTEP Listening (round 2)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). Set ids in this round
start `ITL2-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v2-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v2-work/scratch/I/`.

**Output:** `scripts/study-bank/itep-listening-v2-work/items/I.json` with `"author": "I"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** the human body, sport, sleep and health.

**Name initials:** every invented person and place name starts with one of the letters T, V, W.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL2-I-D1` | 1 | library desk | W: a student; M: a librarian | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-I-D2` | 1 | school bus | W: a sister; M: a brother | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. purpose |
| `ITL2-I-D3` | 1 | school theatre backstage | W: a stage manager; M: an actor | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. purpose |
| `ITL2-I-D4` | 1 | music room | W: a club leader; M: a club member | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-I-C` | 2 | at a public library study room | W: a high-school student; M: a university student who tutors the high-school student | the man speaks first; prevails: woman | 10-20 turns, 300-420 words | 1. attitude, 2. detail, 3. inference, 4. main-idea |
| `ITL2-I-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: supports; idea shape: a surprising result; common belief: none | one block, 480-580 words, at most 3,900 characters | 1. inference, 2. purpose, 3. detail, 4. detail, 5. inference, 6. attitude |

**Lecture `common belief` (a script shape, like stance; follow it exactly):** `none` = the lecture states no popular
or common belief or "many people think" view at all; `named, and the lecture shows it is right` = the speaker names
one common belief and the lecture's evidence supports it; `named, and the lecture shows it is wrong` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL2-I-D1-1` intent-next: key length: longest; script words: key-not-most; about: the woman
- `ITL2-I-D2-1` purpose: key length: middle; script words: key-most; about: the man
- `ITL2-I-D3-1` purpose: key length: shortest; script words: key-most; about: the man
- `ITL2-I-D4-1` intent-next: key length: middle; script words: key-not-most; about: the woman
- `ITL2-I-C-1` attitude: key length: middle; script words: key-most; about: the man
- `ITL2-I-C-2` detail: key length: middle; script words: key-not-most; about: the man
- `ITL2-I-C-3` inference: key length: shortest; script words: key-not-most; about: the woman
- `ITL2-I-C-4` main-idea: key length: longest; script words: key-most; whole-script options: 2
- `ITL2-I-L-1` inference: key length: shortest; script words: key-not-most
- `ITL2-I-L-2` purpose: key length: longest; script words: key-not-most
- `ITL2-I-L-3` detail: key length: middle; script words: key-most
- `ITL2-I-L-4` detail: key length: middle; script words: key-most
- `ITL2-I-L-5` inference: key length: middle; script words: key-not-most
- `ITL2-I-L-6` attitude: key length: middle; script words: key-most

The same plan in machine form is `authors/I.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v2-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
`itep-listening-v2-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/I.json --expect 14 --plan scripts/study-bank/itep-listening-v2-work/authors/I.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work`), and nothing
under the repo-root `scratchpad/`.
