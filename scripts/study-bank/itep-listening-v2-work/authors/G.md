# Assignment: author G, iTEP Listening (round 2)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). Set ids in this round
start `ITL2-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v2-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v2-work/scratch/G/`.

**Output:** `scripts/study-bank/itep-listening-v2-work/items/G.json` with `"author": "G"` (6 scripts, 14 items).

**Topic lane (choose every subject inside it as far as the setting allows; other authors hold other lanes):** music, art, crafts and museums.

**Name initials:** every invented person and place name starts with one of the letters N, P.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL2-G-D1` | 1 | bike repair shop | W: a customer; M: a mechanic | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. inference |
| `ITL2-G-D2` | 1 | airport check-in desk | W: a traveller; M: an airline agent | the woman speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-G-D3` | 1 | cinema ticket counter | W: a customer; M: a ticket seller | the woman speaks first; prevails: man | 2-3 turns, 20-55 words | 1. detail |
| `ITL2-G-D4` | 1 | living room at home | W: a grandparent; M: a grandchild | the man speaks first; prevails: neither | 2-3 turns, 20-55 words | 1. intent-next |
| `ITL2-G-C` | 2 | at home on a weekend | W: a sister; M: a brother | the man speaks first; prevails: neither | 10-20 turns, 300-420 words | 1. detail, 2. main-idea, 3. detail, 4. intent-next |
| `ITL2-G-L` | 3 | a class lecture | a teacher giving a short lecture to a high-school class | stance: unsettled; idea shape: a problem and its solution; common belief: none | one block, 480-580 words, at most 3,900 characters | 1. inference, 2. inference, 3. detail, 4. attitude, 5. main-idea, 6. detail |

**Lecture `common belief` (a script shape, like stance; follow it exactly):** `none` = the lecture states no popular
or common belief or "many people think" view at all; `named, and the lecture shows it is right` = the speaker names
one common belief and the lecture's evidence supports it; `named, and the lecture shows it is wrong` = the speaker
names one common belief and the lecture's evidence goes against it.

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL2-G-D1-1` inference: key length: longest; script words: key-not-most; about: the man
- `ITL2-G-D2-1` intent-next: key length: middle; script words: key-not-most; about: the man
- `ITL2-G-D3-1` detail: key length: middle; script words: key-most; about: the man
- `ITL2-G-D4-1` intent-next: key length: shortest; script words: key-most; about: the woman
- `ITL2-G-C-1` detail: key length: middle; script words: key-most; about: the man
- `ITL2-G-C-2` main-idea: key length: middle; script words: key-not-most; whole-script options: 4
- `ITL2-G-C-3` detail: key length: shortest; script words: key-most; about: the woman
- `ITL2-G-C-4` intent-next: key length: longest; script words: key-not-most; about: the woman
- `ITL2-G-L-1` inference: key length: middle; script words: key-not-most
- `ITL2-G-L-2` inference: key length: middle; script words: key-most
- `ITL2-G-L-3` detail: key length: middle; script words: key-most
- `ITL2-G-L-4` attitude: key length: shortest; script words: key-most
- `ITL2-G-L-5` main-idea: key length: middle; script words: key-not-most; whole-script options: 1
- `ITL2-G-L-6` detail: key length: longest; script words: key-not-most

The same plan in machine form is `authors/G.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v2-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subjects must not overlap any of them) and
`itep-listening-v2-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v2-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v2-work/items/G.json --expect 14 --plan scripts/study-bank/itep-listening-v2-work/authors/G.plan.json --existing-names scripts/study-bank/itep-listening-v2-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work`), and nothing
under the repo-root `scratchpad/`.
