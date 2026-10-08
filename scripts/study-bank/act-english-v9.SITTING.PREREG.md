# act-english-v9 human sitting — pre-registration

Written and committed 2026-10-08 **before** the run is drawn. Nothing below
may be edited after the run exists; a change after the draw is a new
pre-registration with its own commit, and the reason for it.

## Why a full sitting (not the spot-check path)

`ACT-ENGLISH-SPOTCHECK-RULE.md` made v9 the "in-between" batch that would
release on the with-source gate alone, unless rule 3 fired. It fired: the
with-source gate dropped P11-Q05 and P12-Q02 (PoW, `no_source_needed` by 2
and 3 of 3 samples), and under `act-english-v9.PREREG.md` bar 4 each takes
its passage with it, so **20 of 150 authored items (13.3%) were not inserted
because of the gate — over the 10% in rule 3** (item-level: 2/150 = 1.3%;
the conservative passage-level count was fixed in the prereg before the
gate ran). So v9 falls back to one full sitting, and the method's next
batch (v10) also takes a full sitting, not a spot check (rule 3: the
fallback is "a full sitting per batch").

Gates: `act-english-v9` (130 items in 13 passages, all `verified=false`;
CSE 70 / PoW 39 / KoL 21), REGISTER §5 2026-10-08. Design: the `act-en7` /
`act-en8` sitting unchanged, same instrument, same cutoffs.

## Reviewer

`support@classraum.com` (co-founder, reviewer id
`6ca6edaf-4044-4eed-84e0-137ebd79a81d`). Has reviewed 0 of the 130 v9
items (they were inserted today); the draw also excludes anything this
reviewer has ever reviewed.

**The draw is BLOCKED at the time of writing:** `bank-state.mjs open` shows
`ssat-wv6-cofounder-2026-10-07` open for this reviewer (12 of 12 unseen),
and `draw-review-run.mjs` refuses a second open run for one reviewer. The
run below is drawn only after that run closes. It is not drawn around the
guard.

## Instrument

`/admin/bank-qc` blind phase: the four options in dealt order and nothing
else. `reviewer_kind='human'`. "Can't tell" (null pick) scores wrong.

## Draw (exact command, run only once no run is open for this reviewer)

    DRAW_FAMILY=act DRAW_COHORT=act-english-v9 node scripts/study-bank/draw-review-run.mjs \
      "Conventions of Standard English:24,Production of Writing:12,Knowledge of Language:4" \
      0 6ca6edaf-4044-4eed-84e0-137ebd79a81d act-en9-cofounder-<draw date>

| order | domain | n | of staged | why |
|---|---|---|---|---|
| 1-24 | CSE | 24 | 70 | model screen 100% vs 68.0% live, +32 FLAG (as in v7 and v8). Largest domain, goes first |
| 25-36 | PoW | 12 | 39 | screen 75.6% vs 66.7%, +8.9, no flag. Both gate drops were PoW, so it keeps its 12 |
| 37-40 | KoL | 4 | 21 | report-only |

## Control — from the dealt keys

Flat deal within each domain; every n is a multiple of 4, so the control is
**25.0% in every domain** by construction. If the draw's printed control
line shows anything else for any domain, the run is void and deleted before
the reviewer is told. Both bars sit well inside 0-100 against a 25% control.

## Decision rule — per domain, fixed now (identical to v7/v8)

| domain | n | CLEAN | DEAD ZONE | ARCHIVE |
|---|---|---|---|---|
| CSE | 24 | <= 9 correct | 10-14 | >= 15 |
| PoW | 12 | <= 4 | 5-7 | >= 8 |
| KoL | 4 | report only; follows CSE |

- **Release:** CSE CLEAN and PoW CLEAN -> `update study_item_bank set
  verified=true where cohort='act-english-v9'` (all 130), then
  `form-capacity.mjs` (projected 10 forms, all compliant, 2026-10-08).
- **A domain at ARCHIVE:** archive that domain's v9 rows, unrepaired;
  re-run form-capacity before anything flips, report the count.
- **DEAD ZONE:** second reader on a fresh draw of that domain; nothing flips.
- Do not lower a bar to fit the data.

## Partial sittings

A domain is scored only when every row of it is answered. No rate over a prefix.

## Known limits, stated before the number exists

- Same reader as B7/B9/B15, now 120 blind items into this method.
  Familiarity could raise his score (the conservative direction).
- **A cross-item tell the gate did not catch:** no v9 item keys a semicolon
  (0 of 23 boundary-punctuation items; pre-flight caps it only at <= 35%).
  A reader who notices "the semicolon is never right" gains free
  eliminations on CSE. This could only push his CSE score up (toward
  archive), so it does not make a clean result less trustworthy.
- One reader; counts against fixed cutoffs, no interval.
