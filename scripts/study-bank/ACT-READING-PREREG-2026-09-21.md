# Pre-registration — ACT Reading passage-hidden attack, 2026-09-21

**Written before any solver reported. Bars fixed now so no result can be
reinterpreted afterwards.**

## Why this needs pre-registering

The register already records that this instrument is BLUNT on ACT Reading:
on `act-reading-v1`, a cohort a human has cleared, the model scores **80.6%**
(CI 72.1–86.9) against the same items' **human score of 10.0%**. So a high
absolute number on the candidate means nothing on its own. Today's ACT Science
result is the same failure one family over, and it nearly cost a live section.

Only a DEVIATION from a matched live control can decide this. The SSAT sitting
established that a model deviation transfers to a person even though model
levels do not; it did not establish how small a deviation still transfers.

## Design

72 items rendered passage-hidden into ONE file, `ardg.blind.json` (sha
cec47fe10895463f): 36 candidate (4 new passages, `arda-p1/p2`, `ardb-p1/p2`)
interleaved and shuffled with 36 live control items drawn as **4 COMPLETE
9-item passages** — the same structural regime (§13r), since the dominant leak
in a reading set is nine questions about one text answering each other.

**The arm is recorded only in the key.** The science run handed solvers two
separate files, which told them which arm they were attacking. Here they cannot
know.

Controls are derived from each arm's own key distribution, not a literal:
candidate best-fixed-letter **33.3%**, control **36.1%**.

**Control composition caveat, recorded now.** The 4 control passages are
`act-reading-v1:AR1-P2`, `act-reading-v1:AR1-P3`, `act-reading-v4:rd4-p3`,
`act-reading-v7:rd7-p1`. Only the two v1 passages belong to the cohort a human
actually sat. The v1 subgroup will therefore be scored SEPARATELY as the
human-validated reference, and where the two disagree the v1 number governs.

## Bars

Let **D = candidate pooled − control pooled** (same instrument, same run).

- **D ≤ +10 points** — the candidate is not distinguishable from live shipped
  reading. **Insert**, and say plainly that this is a matched-control pass and
  not a claim the items are unguessable.
- **D ≥ +30 points** — a real deviation, the size that has proved real every
  time it has been measured (SSAT reading holds ran +45 to +57).
  **Reject. Do not commission a rewrite** — the standing rule after the ACT
  rewrite is that after one failed rewrite you stop, and these authors have not
  had one, but a 30-point deviation has never been repaired by one.
- **+10 < D < +30** — **the dead zone, and it decides nothing.** The register
  says +12 is inside the range nobody has calibrated. In this band the items
  are **held, not inserted and not archived**, and the question goes to a human
  sitting. Do not resolve it by argument.

## Passage rule

A passage ships only if ALL 9 of its items clear; the inserter refuses a
partial group. So the unit of disposition is the passage, and per-item
acceptance is not a yield. **One clean passage buys ACT Reading form 5**
(`next-form.mjs`: 4 complete forms now, deficit 4 items, supply in 9s).

## What would make me discard this run

- If the control comes in at or below chance, this instrument is NOT blunt on
  this material after all, the 80.6% on record is wrong, and the whole framing
  above needs rewriting before any candidate number is read.
- If solvers report they identified which arm an item belonged to.
