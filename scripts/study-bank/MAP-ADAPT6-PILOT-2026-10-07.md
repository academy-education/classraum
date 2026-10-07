# MAP Growth pilot 6, 2026-10-07: CoE-only adaptation. Results

Pre-registration: `MAP-ADAPT6-PILOT-2026-10-07.prereg.md`, committed
`2be8f408` before any candidate was selected.

**Verdict: FAILS at stage S, the source screen. Stopped there.**
- Nothing was adapted, frozen, graded or inserted.
- MAP stays unreachable and unverified.

## Stage S: source options-only screen

**Pool and candidates** (`map-adapt6-select.mjs`):
- 93 eligible SAT `v2` textual CoE items, after excluding `209f3763`
  (MAPA-22's source) and pilot 5's three other CoE sources.
- 5 of the 93 are human-sat.
- Candidates are the first 18 in priority order: the 5 human-sat, then 13 by
  sha256 order (`map-adapt6/candidates.json`).

**Screen** (one file, 18 candidates + control R, three fresh samples):
- Render checked: every key letter decodes to the stored key.
- Control R: **25.0%** (8 items x 3), inside the valid 10-45.
- Candidates: **52 of 54 picks on the key (96.3%)**.
- **17 of 18 unanimous on the key**, so all 17 are excluded by the
  pre-registered rule.
- Only `4448abd0` survives, at 2/3.
- **Unflagged: 1 of 18 (bar >= 10). STAGE S FAILS.**

The solvers' notes name the mechanism every time: the key is the only finding
that bears on the claim. Examples:
- "only option undercutting wolf-driven recovery"
- "controlled comparison isolating institutions"
- "rules out cleaning-habit explanation"

That is CLAUDE.md's leaky shape: the options differ along the axis the stem
names, so the right finding can be identified without reading the passage.

## The finding that matters more than the verdict: model and human disagree on these items

Per `bank-state.mjs sittings`, plus the fresh human rows on exactly this pool:
- **The human was right on 3 of 9 picks (33.3%) on textual `v2` CoE, against
  25% chance.**
- On the 5 human-sat candidates screened here:

| | right |
|---|---|
| human | 1 of 5 |
| model samples | 14 of 15 |

CLAUDE.md, 2026-09-21: *if model and human disagree about the SHIPPED bank,
the instrument is invalid for that family.* This pool fits that pattern:
- The model solves CoE options-only through general reasoning about which
  finding bears on a claim, the same kind of saturation seen on ACT Science
  and TOEFL MC.
- The one human did not.

n=9 from one reader is thin. Still, it means this screen's exclusions are
**not** evidence that the CoE sources are guessable by a student.

The pre-registered rule was the owner's ("exclude any source the
options-only check flags on its own"). It was applied as written and not
re-decided after the fact. As specified, though, it cannot be satisfied by
any CoE pool: it exclusion-gates on an instrument that saturates on this
stratum.

## Consequences

- **Pilot 5's CoE "positive signal" goes with it.** Two of its three CoE
  sources were 3/3 options-only before adaptation. The with-source pass at
  n=3 stands, but CoE was never a clean source.
- **If the owner still wants CoE adaptation, it needs a new
  pre-registration** with the options-only half demoted to reported-only, as
  for ACT Science, and the with-source half plus G deciding. That is a
  change of rule and is the owner's call. It must not be retrofitted onto
  this run.
- **Otherwise the adaptation route for MAP comprehension is closed**
  alongside agent authoring: SSAT "worlds" sets fail with-source (pilot 5)
  and CoE fails the screen (pilot 6). REGISTER B11 (a person) stands.

## Files

- `map-adapt6/candidates.json`
- `screen.{blind,key}.json`, `screen.solver-{a,b,c}.json`
- `prompts.md`
- `map-adapt6-{select,render,score}.mjs` (score has `--selftest`)
- `map-adapt-checks.mjs` now takes `--dir` / `--n`. Pilot 5 still
  reproduces through it.
