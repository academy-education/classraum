# Assignment: author A, iTEP Listening (round 3: one Part 2 conversation)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). This round has ONE
script for you, a Part 2 conversation; ignore what the brief says about dialogues and lectures. Set ids in this round
start `ITL3-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v3-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v3-work/scratch/A/`.

**Output:** `scripts/study-bank/itep-listening-v3-work/items/A.json` with `"author": "A"` (1 script, 4 items).

**Topic lane (choose the subject inside it; other authors hold other lanes):** family events, holidays and travel plans.

**Name initials:** every invented person and place name starts with one of the letters A, B.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL3-A-C` | 2 | at a relative's house during a family gathering | W: a girl; M: her cousin, a boy of about the same age | the man speaks first; prevails: woman; first plan: holds | 10-20 turns, 300-420 words | 1. detail, 2. intent-next, 3. main-idea, 4. inference |

**`first plan` (a script shape, like prevails; follow it exactly):** the first plan or suggestion made in the
conversation is the one that is finally followed (`holds`), is dropped for a later one (`replaced`), or is still
undecided at the end (`left open`).

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL3-A-C-1` detail: key length: shortest; script words: key-not-most; about: the woman
- `ITL3-A-C-2` intent-next: key length: middle; script words: key-most; about: the man
- `ITL3-A-C-3` main-idea: key length: longest; script words: key-most; whole-script options: 4
- `ITL3-A-C-4` inference: key length: middle; script words: key-not-most; about: the woman

The same plan in machine form is `authors/A.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v3-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subject must not overlap any of them) and
`itep-listening-v3-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v3-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v3-work/items/A.json --expect 4 --plan scripts/study-bank/itep-listening-v3-work/authors/A.plan.json --existing-names scripts/study-bank/itep-listening-v3-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work` and
`itep-listening-v2-work`), and nothing under the repo-root `scratchpad/`.
