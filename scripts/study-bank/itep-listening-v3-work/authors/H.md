# Assignment: author H, iTEP Listening (round 3: one Part 2 conversation)

Brief: `scripts/study-bank/briefs/itep-slate-listening-v1.md` (read it first, all of it). This round has ONE
script for you, a Part 2 conversation; ignore what the brief says about dialogues and lectures. Set ids in this round
start `ITL3-` where the brief's examples say `ITL1-`.
Repo root: `/Users/andylee/Downloads/saas/classraum`. Work only in `scripts/study-bank/itep-listening-v3-work/`.
**Your own scratch directory** (any drafts or temporary files go here and nowhere else; other authors work at the
same time): `scripts/study-bank/itep-listening-v3-work/scratch/H/`.

**Output:** `scripts/study-bank/itep-listening-v3-work/items/H.json` with `"author": "H"` (1 script, 4 items).

**Topic lane (choose the subject inside it; other authors hold other lanes):** university life, choosing courses and moving away from home.

**Name initials:** every invented person and place name starts with one of the letters R, S.

| set_id | part | setting | speakers (roles) | who and outcome (brief R8) | length | question kinds, in this order |
|---|---|---|---|---|---|---|
| `ITL3-H-C` | 2 | on a video call on a weekend evening | W: an older sister who has just started university; M: her younger brother who is in high school | the woman speaks first; prevails: neither; first plan: left open | 10-20 turns, 300-420 words | 1. detail, 2. relationship, 3. detail, 4. inference |

**`first plan` (a script shape, like prevails; follow it exactly):** the first plan or suggestion made in the
conversation is the one that is finally followed (`holds`), is dropped for a later one (`replaced`), or is still
undecided at the end (`left open`).

**Per-item shape (brief R5, R6, R8, M; follow exactly):**

- `ITL3-H-C-1` detail: key length: longest; script words: key-not-most; about: the woman
- `ITL3-H-C-2` relationship: key length: middle; script words: key-most
- `ITL3-H-C-3` detail: key length: shortest; script words: key-most; about: the man
- `ITL3-H-C-4` inference: key length: middle; script words: key-not-most; about: the woman

The same plan in machine form is `authors/H.plan.json` (the check script reads it). Do not open `ASSIGNED.json`
or any other author's files.

**Reference lists (read-only):** `itep-listening-v3-work/existing-transcripts.txt` (openings of every listening script
and passage in the bank and in earlier drafts: your subject must not overlap any of them) and
`itep-listening-v3-work/existing-names.json` (capitalised words already used: none of your names may appear in it).

**Check (run from the repo root until it prints `PROBLEMS 0`):**

    node scripts/study-bank/itep-listening-v3-work/itep-listening-check.mjs scripts/study-bank/itep-listening-v3-work/items/H.json --expect 4 --plan scripts/study-bank/itep-listening-v3-work/authors/H.plan.json --existing-names scripts/study-bank/itep-listening-v3-work/existing-names.json

Read nothing else in the repo: not other authors' files, not `ITEP-SLATE-BLUEPRINT.md`, not any prereg, pending
file, batch file, grader file or any other `*-work` directory (including `itep-listening-v1-work` and
`itep-listening-v2-work`), and nothing under the repo-root `scratchpad/`.
