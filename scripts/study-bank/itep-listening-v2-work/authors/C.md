# Assignment: author C, iTEP Listening (round 2)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). Set ids in this round
start `ITL2-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v2-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v2-work/scratch/C/`.

**Output:** `scripts/study-bank/itep-listening-v2-work/items/C.json` with `"author": "C"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** plants, food, cooking and farming.

**Name initials:** every invented person and place name starts with one of the letters E, F.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL2-C-D1` | 1 | bookshop | W: a shop assistant; M: a customer | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. purpose |
| `ITL2-C-D2` | 1 | train station | W: a passenger; M: a ticket clerk | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. inference |
| `ITL2-C-D3` | 1 | museum on a class trip | W: a museum guide; M: a student | the man speaks first; prevails: man | 2-3 turns, 20-55 words | 1. inference |
| `ITL2-C-D4` | 1 | kitchen at home | W: a parent; M: a teenager | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. relationship |
| `ITL2-C-C` | 2 | at home or out in town | W: a teenager; M: a parent or older relative | the man speaks first; prevails: neither | 10-20 turns, 300-420 words | 1. inference, 2. detail, 3. main-idea, 4. relationship |
| `ITL2-C-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: rejects; idea shape: a discovery and how it was made; common belief: named, and the lecture shows it is wrong | one block, 480-580 words, at most 3,900 characters | 1. purpose, 2. detail, 3. inference, 4. detail, 5. main-idea, 6. attitude |

**Lecture `common belief` (a script shape, like stance; follow it exactly):** `none` = the lecture states no popular
or common belief or "many people think" view at all; `named, and the lecture shows it is right` = the speaker names
one common belief and the lecture's evidence supports it; `named, and the lecture shows it is wrong` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL2-C-D1-1` purpose: key length: shortest; script words: key-not-most; about: the woman
- `ITL2-C-D2-1` inference: key length: middle; script words: key-not-most; about: the woman
- `ITL2-C-D3-1` inference: key length: longest; script words: key-most; about: the woman
- `ITL2-C-D4-1` relationship: key length: middle; script words: key-most
- `ITL2-C-C-1` inference: key length: longest; script words: key-not-most; about: the woman
- `ITL2-C-C-2` detail: key length: middle; script words: key-not-most; about: the woman
- `ITL2-C-C-3` main-idea: key length: middle; script words: key-most; whole-script options: 2
- `ITL2-C-C-4` relationship: key length: shortest; script words: key-most
- `ITL2-C-L-1` purpose: key length: longest; script words: key-not-most
- `ITL2-C-L-2` detail: key length: middle; script words: key-most
- `ITL2-C-L-3` inference: key length: shortest; script words: key-not-most
- `ITL2-C-L-4` detail: key length: middle; script words: key-most
- `ITL2-C-L-5` main-idea: key length: middle; script words: key-most; whole-script options: 4
- `ITL2-C-L-6` attitude: key length: middle; script words: key-not-most

The same plan in machine form is `authors/C.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v2-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
`itep-listening-v2-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/C.json --expect 14 --plan scripts/study-bank/itep-listening-v2-work/authors/C.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work`), and nothing
under the repo-root `scratchpad/`.
