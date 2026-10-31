# Assignment: author E, iTEP Listening (round 2)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). Set ids in this round
start `ITL2-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v2-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v2-work/scratch/E/`.

**Output:** `scripts/study-bank/itep-listening-v2-work/items/E.json` with `"author": "E"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** towns, transport, buildings and invented local history.

**Name initials:** every invented person and place name starts with one of the letters J, K.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL2-E-D1` | 1 | restaurant | W: a diner; M: a waiter | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-E-D2` | 1 | swimming pool | W: a swimmer; M: a lifeguard | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. detail |
| `ITL2-E-D3` | 1 | phone shop | W: a customer; M: a sales assistant | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. detail |
| `ITL2-E-D4` | 1 | science lab | W: a classmate; M: a classmate | the woman speaks first; prevails: woman | 2-3 turns, 20-55 words | 1. inference |
| `ITL2-E-C` | 2 | at a school club meeting room before the meeting | W: the club's student leader; M: a club member | the woman speaks first; prevails: neither | 10-20 turns, 300-420 words | 1. intent-next, 2. detail, 3. inference, 4. main-idea |
| `ITL2-E-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: unsettled; idea shape: change over time; common belief: none | one block, 480-580 words, at most 3,900 characters | 1. detail, 2. detail, 3. main-idea, 4. inference, 5. purpose, 6. purpose |

**Lecture `common belief` (a script shape, like stance; follow it exactly):** `none` = the lecture states no popular
or common belief or "many people think" view at all; `named, and the lecture shows it is right` = the speaker names
one common belief and the lecture's evidence supports it; `named, and the lecture shows it is wrong` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL2-E-D1-1` intent-next: key length: longest; script words: key-not-most; about: the woman
- `ITL2-E-D2-1` detail: key length: middle; script words: key-not-most; about: the woman
- `ITL2-E-D3-1` detail: key length: shortest; script words: key-most; about: the man
- `ITL2-E-D4-1` inference: key length: middle; script words: key-most; about: the man
- `ITL2-E-C-1` intent-next: key length: shortest; script words: key-not-most; about: the man
- `ITL2-E-C-2` detail: key length: middle; script words: key-not-most; about: the man
- `ITL2-E-C-3` inference: key length: middle; script words: key-most; about: the man
- `ITL2-E-C-4` main-idea: key length: longest; script words: key-most; whole-script options: 2
- `ITL2-E-L-1` detail: key length: middle; script words: key-most
- `ITL2-E-L-2` detail: key length: middle; script words: key-not-most
- `ITL2-E-L-3` main-idea: key length: shortest; script words: key-most; whole-script options: 1
- `ITL2-E-L-4` inference: key length: longest; script words: key-not-most
- `ITL2-E-L-5` purpose: key length: middle; script words: key-most
- `ITL2-E-L-6` purpose: key length: middle; script words: key-not-most

The same plan in machine form is `authors/E.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v2-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
`itep-listening-v2-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/E.json --expect 14 --plan scripts/study-bank/itep-listening-v2-work/authors/E.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work`), and nothing
under the repo-root `scratchpad/`.
