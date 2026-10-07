# act-english-v8 human sitting — pre-registration

Written and committed 2026-10-07 **before** the run is drawn. Nothing below
may be edited after the run exists; a change after the draw is a new
pre-registration with its own commit, and the reason for it.

Gates: `act-english-v8` (120 items, all `verified=false`; CSE 66 / PoW 36 /
KoL 18), REGISTER §5 2026-10-07. Design: the `act-en7` sitting
(`act-english-v7.SITTING.PREREG.md`) unchanged, so the two cohorts are read
on the same instrument against the same cutoffs. Rule source: B7, applied to
v7 as B9 (CSE 4/24, PoW 1/12, released).

## Reviewer

`support@classraum.com` (co-founder, `super_admin`, reviewer id
`6ca6edaf-4044-4eed-84e0-137ebd79a81d`). Has reviewed **0** of the 120 v8
items (checked 2026-10-07); the draw also excludes anything this reviewer
has ever reviewed. No open run for any reviewer at draw time
(`bank-state.mjs open`: none).

## Instrument

`/admin/bank-qc` blind phase: the four options in dealt order and **nothing
else** — no passage, no stem. Same instrument as B7 and B9.
`reviewer_kind='human'`. "Can't tell" (null pick) is an answer and scores
wrong.

## Draw (exact command)

    DRAW_FAMILY=act DRAW_COHORT=act-english-v8 node scripts/study-bank/draw-review-run.mjs \
      "Conventions of Standard English:24,Production of Writing:12,Knowledge of Language:4" \
      0 6ca6edaf-4044-4eed-84e0-137ebd79a81d act-en8-cofounder-2026-10-07

| order | domain | n | of staged | why |
|---|---|---|---|---|
| 1-24 | Conventions of Standard English (CSE) | 24 | 66 | the model screen flagged it: 100% vs 68.0% live (same as v7). The largest domain, so it goes first |
| 25-36 | Production of Writing (PoW) | 12 | 36 | screen 83.3% vs 66.7%, **flagged this time** (v7 was +4.1, no flag). Sized as in v7; 12 of 36 is already a third of the domain |
| 37-40 | Knowledge of Language (KoL) | 4 | 18 | report-only |

Staged items are drawable without touching any flag (`draw-review-run.mjs`
filters `archived`, never `verified`). No item's `verified` changes to draw
or sit this run.

## Control — from the dealt keys

Keys are dealt flat within each domain; every n is a multiple of 4, so the
deal is n/4 per slot and the control is **25.0% in every domain and
overall**, by construction. The draw's printed control line must confirm
this per domain; if any domain prints a control other than 25.0%, the run is
void and is deleted before the reviewer is told about it.

Ceiling check: with a 25% control both bars (40, 60) sit well inside the
attainable 0-100 range, so either verdict can fire.

## Decision rule — per domain, fixed now

| domain | n | CLEAN (<= ~40%) | DEAD ZONE | ARCHIVE (>= ~60%) |
|---|---|---|---|---|
| CSE | 24 | <= 9 correct (<= 37.5%) | 10-14 (41.7-58.3%) | >= 15 (>= 62.5%) |
| PoW | 12 | <= 4 (<= 33.3%) | 5-7 (41.7-58.3%) | >= 8 (>= 66.7%) |
| KoL | 4 | report only — 4 items cannot carry a verdict; KoL follows CSE |

- **Release:** CSE CLEAN **and** PoW CLEAN → `update study_item_bank set
  verified=true where cohort='act-english-v8'` (all 120).
- **A domain at ARCHIVE:** archive that domain's v8 rows (CSE 66 / PoW 36),
  unrepaired (B7, `agent-rewrite-inverts-tell`). The other domain still
  releases on its own CLEAN; KoL follows CSE. Note: archiving a whole domain
  breaks the per-passage mix, so form-capacity is re-run before anything is
  flipped and the projected form count is reported, not assumed.
- **A domain in the DEAD ZONE:** second reader on a fresh draw of the same
  domain; nothing flips meanwhile.
- **Do not lower a bar to fit the data.** In particular, v7's clean result
  does not move these cutoffs; this is a separate cohort with a different
  per-passage mix and a PoW screen flag v7 did not have.

## Partial sittings

Denominators are fixed. A domain is scored only when **every** row of it is
answered. CSE completes at question 24, so a sitting abandoned after that
still decides CSE; PoW then waits. No rate over a prefix.

## Known limits, stated before the number exists

- Same reader as B7/B9. He has now seen 80 ACT English blind items from this
  authoring method; familiarity with its distractor style could raise his
  score (in the direction of archiving, i.e. conservative). It is not
  modelled.
- One reader; no interval is quoted, only counts against the fixed cutoffs.
- The panel serves unanswered rows with no ORDER BY; B7/B9 came back in
  insertion order. If CSE was not answered first, that is recorded; scoring
  is per domain and does not change.
