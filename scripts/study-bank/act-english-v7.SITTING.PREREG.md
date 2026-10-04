# act-english-v7 human sitting — pre-registration

Written and committed 2026-10-02 **before** the run is drawn. Nothing below
may be edited after the run exists; a change after the draw is a new
pre-registration with its own commit, and the reason for it.

Gates: `act-english-v7` (120 items, all `verified=false`), REGISTER §5 A74.
Rule source: B7 (`act-cofounder-2026-09-02`) — same thresholds, stated per
domain here.

## Reviewer

`support@classraum.com` (co-founder, `super_admin`, reviewer id
`6ca6edaf-4044-4eed-84e0-137ebd79a81d`). Has reviewed **0** of the 120 v7
items (checked 2026-10-02); the draw also excludes anything this reviewer
has ever reviewed. No open run for him at draw time (`bank-state.mjs open`:
none).

## Instrument

`/admin/bank-qc` blind phase: the four options in dealt order and **nothing
else** — no passage, no stem (the route's `next=1` payload is
`{ itemId, options }`). Same instrument as B7. `reviewer_kind='human'`
(column default). "Can't tell" (null pick) is an answer and scores wrong.

## Draw (exact command)

    DRAW_FAMILY=act DRAW_COHORT=act-english-v7 node scripts/study-bank/draw-review-run.mjs \
      "Conventions of Standard English:24,Production of Writing:12,Knowledge of Language:4" \
      0 6ca6edaf-4044-4eed-84e0-137ebd79a81d act-en7-cofounder-2026-10-02

| order | domain | n | of staged | why |
|---|---|---|---|---|
| 1-24 | Conventions of Standard English (CSE) | 24 | 84 | the model screen flagged it: 100% vs 68.0% live. The question this sitting exists to answer, so it goes first |
| 25-36 | Production of Writing (PoW) | 12 | 24 | screen 70.8% vs 66.7%, no flag; the domain B7 cleared on v1 |
| 37-40 | Knowledge of Language (KoL) | 4 | 12 | report-only |

Staged items are drawable without touching any flag: `draw-review-run.mjs`
filters `archived`, never `verified`, and neither the review route nor
`study_item_reviews_fresh` filters it. No item's `verified` changes to draw
or sit this run.

## Control — from the dealt keys

Keys are dealt flat within each domain. Every n above is a multiple of 4, so
the deal is exactly n/4 per slot and the control (best fixed-slot strategy)
is **25.0% in every domain and 25.0% overall**, by construction. The draw's
printed `keys a/b/c/d -> control` line must confirm this per domain; if any
domain prints a control other than 25.0%, the run is void and is deleted
before the reviewer is told about it.

Ceiling check (CLAUDE.md): with a 25% control both bars (40, 60) sit well
inside the attainable 0-100 range, so either verdict can fire.

## Decision rule — per domain, fixed now

Absolute blind accuracy, the B7 bars, as integer cutoffs so nothing is
rounded after the fact:

| domain | n | CLEAN (<= ~40%) | DEAD ZONE | ARCHIVE (>= ~60%) |
|---|---|---|---|---|
| CSE | 24 | <= 9 correct (<= 37.5%) | 10-14 (41.7-58.3%) | >= 15 (>= 62.5%) |
| PoW | 12 | <= 4 (<= 33.3%) | 5-7 (41.7-58.3%) | >= 8 (>= 66.7%) |
| KoL | 4 | report only — 4 items cannot carry a verdict; KoL follows the cohort |

- **Release:** CSE CLEAN **and** PoW CLEAN → `update study_item_bank set
  verified=true where cohort='act-english-v7'` (all 120, KoL included).
- **A domain at ARCHIVE:** a person can guess it too. Archive that domain's
  v7 rows (CSE 84 / PoW 24) — do not repair them (B7, and
  `agent-rewrite-inverts-tell`). The other domain still releases on its own
  CLEAN; KoL then follows CSE, since KoL and CSE are the same
  sentence-level instrument.
- **A domain in the DEAD ZONE:** second reader on a fresh draw of the same
  domain; nothing flips meanwhile. Exactly the B2/B6/B7 rule.
- **Do not lower a bar to fit the data.**

## Partial sittings

Denominators are fixed. A domain is scored only when **every** row of it is
answered. CSE completes at question 24 (~60% of the sitting), so a sitting
abandoned after that still decides CSE; PoW then waits for the rest. A
domain with any unanswered row is not scored at all — no rate over a
prefix.

## Known limits, stated before the number exists

- **No human number exists on shipped ACT CSE.** B7 sat PoW and Reading.
  So these bars are absolute, not parity with shipped. A CSE dead-zone
  result cannot be resolved by comparison to the live bank; it goes to a
  second reader.
- **Options-only on CSE measures exactly the leak in question:** whether
  one of four renderings of a phrase is grammatical without the sentence.
  Unlike the ACT Science model attack (which measured subject recall), a
  person scoring high here means the option set gives the answer away
  without the sentence. The bars are the same ones B7 applied.
- One reader. Correlation across a person's picks is not modelled; no
  interval is quoted, only the counts against the fixed cutoffs.
- The panel serves the next unanswered row with no ORDER BY. B7's 40
  answers came back in exact insertion order (PoW 20, then K 7, C 7, I 6),
  which is what front-loading relies on. If the scored run shows CSE was
  not answered first, that is recorded; it does not change the scoring,
  which is per domain.
