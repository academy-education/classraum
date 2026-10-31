# Assignment: author G, iTEP Listening (round 3: one Part 2 conversation)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). This round has ONE
script for you, a Part 2 conversation; ignore what the brief says about dialogues and lectures. Set ids in this round
start `ITL3-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v3-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v3-work/scratch/G/`.

**Output:** `scripts/study-bank/itep-listening-v3-work/items/G.json` with `"author": "G"` (1 script, 4 items).

**Topic lane (choose the subject inside it; other authors hold other lanes):** science-fair projects, experiments and measuring things.

**Name initials:** every invented person and place name starts with one of the letters N, P.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL3-G-C` | 2 | in the school hall the day before the science fair | W: a student entering the school science fair; M: a volunteer judge for the science fair | the man speaks first; prevails: man; first plan: replaced | 10-20 turns, 300-420 words | 1. intent-next, 2. detail, 3. main-idea, 4. purpose |

**`first plan` (a script shape, like prevails; follow it exactly):** the first plan or suggestion made in the
conversation is the one that is finally followed (`holds`), is dropped for a later one (`replaced`), or is still
undecided at the end (`left open`).

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL3-G-C-1` intent-next: key length: middle; script words: key-not-most; about: the woman
- `ITL3-G-C-2` detail: key length: longest; script words: key-most; about: the man
- `ITL3-G-C-3` main-idea: key length: shortest; script words: key-most; whole-script options: 4
- `ITL3-G-C-4` purpose: key length: middle; script words: key-not-most; about: the woman

The same plan in machine form is `authors/G.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v3-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subject must not overlap any of them) and
`itep-listening-v3-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v3-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v3-work/items/G.json --expect 4 --plan scripts/study-bank/itep-listening-v3-work/authors/G.plan.json --existing-names scripts/study-bank/itep-listening-v3-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work` and
`itep-listening-v2-work`), and nothing under the repo-root `scratchpad/`.
