# map-v2 Math gate n789, 2026-10-30: pre-registration (NUMBER SYSTEMS ONLY, 9 items from batches 7-9)

Batch 6's prereg (`MAP-MATH-V2-B6.prereg.md`) and batch 5's (`MAP-MATH-V2-B5.prereg.md`, the last Number
Systems-only gate) govern everything not changed here. That covers fixed key rank per slot,
RANK/HUB/FORM/SLIP/BOUND-SCREEN and the construction checks in `math-check.mjs`, the screen and its one return,
the options-only bar, the with-source graders (R1-R11, EXT-1, F 2-of-3), C and C-prime. Every change is listed
under **Changes from batch 6**. **No bar changes.**

**Written after the items, not before them (deviation, as batch 6).** Batches 7, 8 and 9 each wrote and checked
their items (`math-check.mjs` PART OK) before this file existed. Each ran no gate because it was too small on its
own (b7: 1 item, b8: 5, b9: 3). The bars below are copied from batches 5 and 6 unchanged. No bar was chosen after
seeing a screen, solver or grader output: no reviewer has seen these items. This file exists before any screen
packet is handed to a screener.

## Tool

`map-math-v2.mjs --batch n789` reads:

- one area, N.
- 9 slots in `map-v2-work/math-n789/slots.json`. The rows are copied verbatim from `math-b7/`, `math-b8/` and
  `math-b9/slots.json`, and b8's two dropped rows are left out. The author cells are renamed `<cell>-b<k>` (N7-b7,
  N6-b8, N7-b8, N5-b9, N6-b9, N8-b9) so that b7 N7 and b8 N7, and b8 N6 and b9 N6, stay distinct.
- ids MB7-, MB8- and MB9- (`idPattern: 'MB[789]'`).
- WORK = `scratchpad/map-math-v2-n789-work`.
- authored = `scratchpad/map-v2-math-n789-work/<cell>-b<k>/items.json`. These are symlinks to the batch 7-9 author
  files, so the items have one source.
- results in `scripts/study-bank/map-math-v2-n789/num/`.
- cohort `map-math-v2-n789-num`, with C-prime on and one options-only part.

`--selftest` passes for n789 at 93/93, and 36/36 reverted rules each fail at least one case. b1-b6 reproduce
their pre-change selftest output byte for byte.

The selftest adds four n789 checks, each break-tested:

- the id pattern takes exactly MB7/MB8/MB9.
- no candidate is in the R11 earlier set or in the math-check prior. Pointing the prior at dump-b10 fails this check.
- the earlier set keeps the b6 items and the b7/b8 drops.
- all 6 author files are present.

All inputs are built by `map-v2-work/math-n789/build.mjs` from files already on disk, with no DB access and no model:

- **Duplicate corpus `dump-n789`** = `dump-b10/prior-math.json` (2,537 rows, sha256 `1fdaf607…`) minus the 6
  candidates' own b7/b8 "first-written" rows. That leaves 2,531 rows (sha256 `d0a87b3c…`).
  - dump-b10 = dump-b6 plus the 20 b6/b7/b8 rows. Every dump-b6 row is in it.
  - The candidates' own rows have to go because math-check's prior scan does not skip a row with the same id, so
    every candidate would be a j = 1.00 near-duplicate of itself. Break-tested: MB7-N7-01 against dump-b10 prints
    PART FAIL, "near-duplicate of earlier MAP item MB7-N7-01".
  - No batch 9 row exists in any dump. MB9's first refused F08 set is a version of a candidate and is excluded on
    the same reasoning.
- **R11 corpus**: every earlier MAP maths item in dump-n789 is **702 ids** (b6's 688 plus the 14 non-candidate
  b6/b7/b8 rows). Graders get `map-v2-work/math-n789/EXCLUSIONS-map-n789.txt` (938 lines, every id in parentheses
  with its source, prompt and key). This is batch 6's R11 rule. No chain table is appended. The b9 chain table
  (`math-b9/earlier-N-chains.json`) lists the candidates themselves and the b7/b8 draft mechanisms, so a grader
  could name a candidate as its own template.

Source files (sha256 at the time of writing):

| cell | file | sha256 |
|---|---|---|
| N7-b7 | `scratchpad/map-v2-math-b7-work/N7/items.json` | `9c2ee123a0aeca1a…` |
| N6-b8 | `scratchpad/map-v2-math-b8-work/N6/items.json` | `cdb066e07ac2f35a…` |
| N7-b8 | `scratchpad/map-v2-math-b8-work/N7/items.json` | `b34df13786ffb9b7…` |
| N5-b9 | `scratchpad/map-v2-math-b9-work/N5/items.json` | `443eb4c2f48d3bc6…` |
| N6-b9 | `scratchpad/map-v2-math-b9-work/N6/items.json` | `cfc37ea49841b429…` |
| N8-b9 | `scratchpad/map-v2-math-b9-work/N8/items.json` | `8242261ee30bcb33…` |

## Inputs

| slot | from | grade | tier | key (rank) | checker | mechanism |
|---|---|---|---|---|---|---|
| MB7-N7-01 | b7 D33 | 7 | mid | 9 (3) | BORDERLINE (area risk) | x(-2) + 5 pressed three times from 0.75 |
| MB8-N6-01 | b8 E06 | 6 | mid | 3.5 (3) | BORDERLINE | number line folded so a lands on b: where c lands |
| MB8-N7-01 | b8 E07 | 7 | mid | -46.75 (2) | NEW | least product of two cards from a signed set (five cards) |
| MB8-N7-02 | b8 E14 | 7 | high | -11 4/7 (2) | NEW | divided by f instead of multiplying: undo, then apply (R x f^2) |
| MB8-N7-03 | b8 E16 | 7 | high | 5/7 (4, L) | NEW | choose + or - before mixed numbers to land nearest 0 |
| MB8-N7-05 | b8 E12 | 7 | mid | -4 2/7 (3) | BORDERLINE | signed magic square, sum printed, first missing entry |
| MB9-N5-01 | b9 F04 | 5 | mid | 37.83 (3) | NEW | least running balance (an intermediate one, no threshold printed) |
| MB9-N6-01 | b9 F08 | 6 | high | -7.95 (3) | NEW | clockwise walk around a coordinate rectangle: y after d units |
| MB9-N8-01 | b9 F11 | 8 | mid | 1 8/15 (3) | BORDERLINE | classify rational/irrational, then sum the rationals |

Re-run through the batch's assemble with the dump-n789 prior, all 9 print PART OK. Live near-dup denominators were
709 ISEE, 615 SSAT and 218 MAP rows. Advisory read lines:

- MB9-N6-01's closest earlier MAP item is MB6-G6-01 at j = 0.50 (already read and declared in b9's ITEMS.md).
- MB8-N7-03 carries BOUND and STRUCT read lines.

No within-batch near-duplicates. No key value repeats.

## Batch-level gates, checked before this file

- **Key extremity (C).** 9 scorable of 9 (0 non-numeric). One end key (MB8-N7-03, rank 4), so 1/9 = 11.1%. Below
  10 scorable items this is **no measurement**: not a pass, not a fail, recorded, not a hold (batch 1 prereg,
  restated in b5 and b6). For the record, measured at n = 9 this set would sit far under the bar: 11.1% against
  0.8 x 50.0% = 40.0%. With fewer than 10 items, C cannot hold the area and C-prime cannot fire. The inserter's own
  gate (`key-extremity-gate.mjs`, MIN_N 10) also returns no measurement for any survivors-only set from this batch.
  **No bar was moved, and no key was re-ranked.** The ranks are the authors', each forced by its error set and
  stated in the ITEMS.md files.
- **Minimum n per area:** none (`areaFreezeMin: 0`). An area keeping 1 still freezes.
- **Options-only control:** live ISEE num/medium has **66 eligible against a need of 9** (all 9 are mid or high, so
  all are medium). No substitution is needed (`oo-pool`, read-only, 2026-10-30).

## Named risks, from the authors' own files (stated before any reviewer)

**MB7-N7-01 (b7 `FEASIBILITY.md`, `CHAIN-CHECK.md`, item `self_audit`, risk medium):**
- BORDERLINE with an area risk: an input-output rule is Operations-adjacent (MV2-O78-20).
- A near-twin is SAT prior SM27F-A05, which uses x(-2) + 3, pressed twice, run backward. This item runs a different
  rule forward three times.
- One round of the rule is MV2-N7-06 / MB4-N7-04.

**Batch 8 (`math-b8/ITEMS.md`):**
- Ranks 2, 2, 4, 3, 3, with two keys at rank 2 (the position that held b2 Geometry).
- **E16 / MB8-N7-03 is risk high.** The stem asks for "nearest 0" while the key is the largest option. Plug-back
  strikes -5/7 and 2/7 only by trying the sign patterns. The numbers were changed once after a PAIR refusal.
- **E12 / MB8-N7-05:** a magic square can read as Operations (area risk). -1 6/7 is the solved first blank, offered
  as the stop-early error.
- **E06 / MB8-N6-01:** near-REPEAT BORDERLINE (midpoint plus reflection). 0.5 is the fold point, and 2.5 is the
  opposite of the printed -2.5.
- **E14 / MB8-N7-02:** -3 3/7 and -2 2/7 sit with the stem's -5 1/7 on one x(3/2) chain that the key continues. The
  HUB/RUN checks do not flag it, and a cold screener should look at it. It uses a positive multiplier (deviation
  from the generator).
- **E07 / MB8-N7-01:** uses five cards, not four (deviation from the generator).

**Batch 9 (`math-b9/ITEMS.md`):**
- All three keys are at rank 3.
- **F08 / MB9-N6-01:**
  - -4.05 is the key's mirror about the unprinted midpoint -6.
  - -13.45 and -12.45 always differ by 1.
  - The advisory PAIR line notes key - (-12.45) = 4.5 = 2 x the printed 2.25.
  - The numbers were changed once after a STRUCT refusal.
- **F11 / MB9-N8-01:**
  - BORDERLINE: both halves of the chain exist (MM4-N35; b5 C17/R25).
  - 13/15 is the partial sum of the roots.
  - 1 7/15 sits 1/15 from the key, so telling them apart is the 0.666... = 2/3 construct itself.
- **F04 / MB9-N5-01:** "start minus the largest withdrawal" is labelled `other`.

**Batch-level:**
- Key ranks are **1/2/3/4 = 0/2/6/1**. Two thirds of the keys sit at rank 3.
- The expected position-only hit rate, from batch 1's Number Systems solver picks by rank (0.03 / 0.54 / 0.37 /
  0.07, as b5), is (2 x 0.54 + 6 x 0.37 + 0.07) / 9 = **37.4%**. Live Number Systems controls measured 31.6% (b1),
  36.4% (b4) and 66.7% (b5, n = 4). Position alone should not carry the candidates past the control by +10.
- A solver whose prior favours rank 3 (not rank 2) would gain about 6 of 9 items. This is the named way this batch
  could fail bar A.

## Stages and seeds

As batch 5: one area, one screen packet, one grade part and one options-only part.

| stage | seed |
|---|---|
| 0b screen pass 1 | order 20262101, deal 20262102 |
| 0d screen pass 2 | order 20262103, deal 20262104 |
| 0e freeze | 20262112 |
| 1 options-only | 20262122 |
| 2 with-source (+ part number) | 20262140 |
| C-prime deferral draw | 20262172 |

Use fresh subagents only. No reviewer from batches 1-6, and not the b7/b8/b9 author sessions. Claude only.

## Bars (unchanged from batches 5 and 6)

**A. Options-only.**
- The control is a 1:1 live ISEE Number Systems control matched by tier (low -> `easy`, mid/high -> `medium`).
- Hold if candidate - control > +10.0. Unanimity hold if > +15.0 (batch-level unanimity rate against the control's,
  never per item).
- Not measured (held) above a 90.0% control hit rate or an 85.0% control unanimity. The attainable control range for
  the margin bar is 0-90.0%, and 0-85.0% for the unanimity bar. Both bars sit inside it at every control value seen
  so far in this area (31.6-66.7%).
- **With n = 9 the margin moves 11.1 points per item and 3.7 points per pick** (27 picks per arm). +10.0 is exceeded
  by 3 more correct picks than the control. A hold or a pass on 9 items is read as what it is.

**B. With-source graders (d and e).**
- Rules R1-R11 and EXT-1 apply, plus the off-blueprint hold. F 2-of-3 decides one-grader flags. Grade fit is
  recorded.
- R11 runs against the 702 earlier MAP maths ids in dump-n789 (`EXCLUSIONS-map-n789.txt`).

**C and C-prime:** no measurement below 10 items (unchanged; see the pre-check above).

**Verdict:** PASS iff A passes and >= 1 item is inserted.

## Changes from batch 6

1. One area (Number Systems). The items come from three batches, each mechanism vetted by that batch's independent
   chain checker before it was written (the b5 method), and they are gated together here.
2. Ids span three prefixes (`idPattern`). The author cells are renamed `<cell>-b<k>`, and the authored files are
   symlinks to the batch 7-9 files.
3. The duplicate corpus is `dump-n789` (dump-b10 minus the candidates' own rows). The R11 corpus is 702 ids from it.
4. Items were written before this file, as in batch 6 (deviation above).

No threshold changes.

## Pre-registered measurements (recorded; none gates)

- **H1, R11.** Prediction: <= 1 R11 drop. Four of the nine are BORDERLINE (D33, E06, E12, F11), and every chain was
  vetted by a checker first.
- **H2, screen.** Prediction: <= 3 of 9 fail screen pass 1. The authors flagged E16, E14 and F08 for a cold screener.
- **H3, position.** The candidates' options-only hit rate, and the share of solver picks at rank 3, against the
  37.4% position-only expectation above.

## What can't be learned here

With 9 items, no rate here is more than an anecdote: the options-only margin moves 11.1 points per item, and C is
not measured. The items were written in three sessions to three briefs, so a cross-item tell from one brief has at
most 5 items (b8) to show itself in. Three samples of one model are not three solvers.
