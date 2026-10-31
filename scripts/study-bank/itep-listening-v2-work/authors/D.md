# Assignment: author D, iTEP Listening (round 2)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). Set ids in this round
start `ITL2-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v2-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v2-work/scratch/D/`.

**Output:** `scripts/study-bank/itep-listening-v2-work/items/D.json` with `"author": "D"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** weather, oceans, rocks, earth and space science.

**Name initials:** every invented person and place name starts with one of the letters G, H.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL2-D-D1` | 1 | pharmacy counter | W: a customer; M: a pharmacist | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. relationship |
| `ITL2-D-D2` | 1 | school gym | W: a student; M: a coach | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-D-D3` | 1 | clinic waiting room | W: a receptionist; M: a patient | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. inference |
| `ITL2-D-D4` | 1 | post office | W: a clerk; M: a customer | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. purpose |
| `ITL2-D-C` | 2 | at school, in that staff member's office or room | W: a student; M: a school staff member who is not a teacher (for example the librarian, the nurse, the office secretary, a lab technician) | the man speaks first; prevails: woman | 10-20 turns, 300-420 words | 1. main-idea, 2. detail, 3. purpose, 4. detail |
| `ITL2-D-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: supports; idea shape: how a process works, step by step; common belief: none | one block, 480-580 words, at most 3,900 characters | 1. purpose, 2. detail, 3. inference, 4. attitude, 5. inference, 6. main-idea |

**Lecture `common belief` (a script shape, like stance; follow it exactly):** `none` = the lecture states no popular
or common belief or "many people think" view at all; `named, and the lecture shows it is right` = the speaker names
one common belief and the lecture's evidence supports it; `named, and the lecture shows it is wrong` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL2-D-D1-1` relationship: key length: longest; script words: key-most
- `ITL2-D-D2-1` intent-next: key length: shortest; script words: key-not-most; about: the woman
- `ITL2-D-D3-1` inference: key length: middle; script words: key-most; about: the man
- `ITL2-D-D4-1` purpose: key length: middle; script words: key-not-most; about: the woman
- `ITL2-D-C-1` main-idea: key length: middle; script words: key-most; whole-script options: 2
- `ITL2-D-C-2` detail: key length: longest; script words: key-not-most; about: the woman
- `ITL2-D-C-3` purpose: key length: middle; script words: key-most; about: the man
- `ITL2-D-C-4` detail: key length: shortest; script words: key-not-most; about: the woman
- `ITL2-D-L-1` purpose: key length: longest; script words: key-not-most
- `ITL2-D-L-2` detail: key length: middle; script words: key-not-most
- `ITL2-D-L-3` inference: key length: middle; script words: key-not-most
- `ITL2-D-L-4` attitude: key length: shortest; script words: key-most
- `ITL2-D-L-5` inference: key length: middle; script words: key-most
- `ITL2-D-L-6` main-idea: key length: middle; script words: key-most; whole-script options: 1

The same plan in machine form is `authors/D.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v2-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
`itep-listening-v2-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/D.json --expect 14 --plan scripts/study-bank/itep-listening-v2-work/authors/D.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work`), and nothing
under the repo-root `scratchpad/`.
