# Assignment: author H, iTEP Listening (round 2)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). Set ids in this round
start `ITL2-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v2-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v2-work/scratch/H/`.

**Output:** `scripts/study-bank/itep-listening-v2-work/items/H.json` with `"author": "H"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** technology, inventions and communication.

**Name initials:** every invented person and place name starts with one of the letters R, S.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL2-H-D1` | 1 | school garden | W: a student volunteer; M: a garden club leader | the man speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. detail |
| `ITL2-H-D2` | 1 | dentist's waiting room | W: a parent; M: a teenager | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. detail |
| `ITL2-H-D3` | 1 | art supply shop | W: a shop assistant; M: a customer | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. detail |
| `ITL2-H-D4` | 1 | hotel front desk | W: a receptionist; M: a guest | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. relationship |
| `ITL2-H-C` | 2 | at the side of a school sports field after practice | W: a student; M: a sports coach | the woman speaks first; prevails: woman | 10-20 turns, 300-420 words | 1. detail, 2. main-idea, 3. attitude, 4. intent-next |
| `ITL2-H-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: rejects; idea shape: a comparison of two cases; common belief: named, and the lecture shows it is right | one block, 480-580 words, at most 3,900 characters | 1. detail, 2. purpose, 3. inference, 4. main-idea, 5. inference, 6. purpose |

**Lecture `common belief` (a script shape, like stance; follow it exactly):** `none` = the lecture states no popular
or common belief or "many people think" view at all; `named, and the lecture shows it is right` = the speaker names
one common belief and the lecture's evidence supports it; `named, and the lecture shows it is wrong` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL2-H-D1-1` detail: key length: shortest; script words: key-not-most; about: the woman
- `ITL2-H-D2-1` detail: key length: middle; script words: key-most; about: the woman
- `ITL2-H-D3-1` detail: key length: middle; script words: key-most; about: the woman
- `ITL2-H-D4-1` relationship: key length: longest; script words: key-not-most
- `ITL2-H-C-1` detail: key length: shortest; script words: key-not-most; about: the man
- `ITL2-H-C-2` main-idea: key length: longest; script words: key-most; whole-script options: 4
- `ITL2-H-C-3` attitude: key length: middle; script words: key-most; about: the man
- `ITL2-H-C-4` intent-next: key length: middle; script words: key-not-most; about: the man
- `ITL2-H-L-1` detail: key length: longest; script words: key-not-most
- `ITL2-H-L-2` purpose: key length: middle; script words: key-not-most
- `ITL2-H-L-3` inference: key length: middle; script words: key-most
- `ITL2-H-L-4` main-idea: key length: shortest; script words: key-most; whole-script options: 4
- `ITL2-H-L-5` inference: key length: middle; script words: key-not-most
- `ITL2-H-L-6` purpose: key length: middle; script words: key-most

The same plan in machine form is `authors/H.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v2-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
`itep-listening-v2-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/H.json --expect 14 --plan scripts/study-bank/itep-listening-v2-work/authors/H.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work`), and nothing
under the repo-root `scratchpad/`.
