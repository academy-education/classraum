# act-math-v23 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

v21 (5 items) and v22 (6 items) were both one-item top-ups for form 17 and
both were HELD at the options-only screen, where at n = 5–6 one pick is
5.6–6.7 points and a key-position tell (v22: keys interior 4/6 against a
solver "pick an interior value" prior) dominated. Neither batch could be
measured by the key-extremity or magnitude gates on its own (n < 10). This
batch is sized so that **every batch-level gate measures it alone**.

`form-capacity.mjs` and `next-form.mjs act/math` (2026-10-08, after v22 was
held): **ACT Math 16 forms** (751 items), binding Algebra 135 / 8 per form.

    domain                        live  /form  form 17  deficit17  form 18  deficit17+18  authored
    Algebra                        135     8     136        1        144          9          14
    Geometry                       136     8     136        -        144          8          11
    Integrating Essential Skills   154     9     153        -        162          8          10
    Functions                      137     8     136        -        144          7           9
    Statistics and Probability     103     6     102        -        108          5           6
    Number and Quantity             86     5      85        -         90          4           5
    total                                                   1                    41          55  (+34.1%)

Per-domain margins from recent kept rates, not flat: Algebra +5 (v20 6/9; v21
and v22 kept 0/11 at the screen, with-source would have passed 4/11 — the
domain that binds and the one that has been failing); Geometry +3 (v20 7/10,
v17 6/10); IES +2 (v20 7/9); Functions +2 (v20 8/9); S&P +1 (v20 6/6, v18
4/4); N&Q +1 (v20 2/2, v19 5/5). 55 = 41 + 34%.

Four Claude authors (no GPT): **A** = Algebra 14; **B** = Functions 9 + S&P 6
(15); **C** = Geometry 11; **D** = IES 10 + N&Q 5 (15). Every author file has
>= 10 items, so key-extremity and magnitude can be measured per file as well
as on the merged 55. Files `act-math-v23-{a,b,c,d}.batch.json`, merged
`act-math-v23.batch.json`; ids `AM23{A,F,S,G,I,N}-NN`; cohort `act-math-v23`;
four choices (`src/lib/study/act-test.ts` math `choiceCount: 4`).
Commissioned medium/hard; banked difficulty is always the graders'.
`BANK_BAND=mixed`. **No repairs after the attack.** No v21/v22 item, mechanism
or option set reused (re-submitting a held item re-decides a finished batch).

## Distractor rules (v20's four, unchanged) and v21's

Every distractor carries a `distractor_kind` entry declaring each check; every
item a `quantity_asked` line and a `mechanism` list. Stripped before grading
with `bounds` and the other author fields below. Author declarations are not a
check.

1. **v16 limiting case** — a value at a parameter's extreme sitting ON a
   stem-forced bound is dead.
2. **v17 neighbouring setup** — the exact answer to an adjacent problem is
   usually an extreme of the feasible interval.
3. **v18/v19/v20 cheapest one-step estimate** — over the WHOLE quantity asked
   (the `quantity_asked` line), one step finer than the obvious cap; every
   distractor strictly inside its bracket; ON the edge is dead.
4. **v18 weak standard** — weak only if both graders name it, or it sits on a
   bound I confirm by hand. Two weak distractors drop the item.
5. **v21 mechanism duplicates** — authors get the full live maths dump (all
   2,765 rows, every family) and run both dup checks on their own file.

## v21/v22 bans (unchanged)

- **(a)** A key that stands out arithmetically: one quantity through a grid
  of factors (AM21A-03), or the key the odd one out under a simple arithmetic
  description. **Also v22's AM22A-02: evenly spaced option runs** (95/100/105
  beside the key) are an option-structure pattern and fall under (a).
- **(b)** A stem-readable divisibility / ratio / parity / integrality property
  leaving one candidate (AM21A-05). `arith_class_check` line per item.
  `check-key-arith-class.mjs` is run on the candidates and on the matched live
  controls as a READING LIST (not a gate); every candidate KEY line is read by
  hand against the stem.

## NEW in v23 — (c) the one-sided error family (from AM22A-05)

AM22A-05's three distractors all came from errors that under-count (simple
interest for compound, a missed period, ...), so all sat on one side and the
key was the extreme — and "compound beats simple" made that readable from the
stem. **Banned: an option set where every distractor comes from errors in the
same direction for a reason a student can read off the stem without solving**
(every error drops a positive term, every error ignores growth, every error
forgets a cost), which makes "pick the largest / smallest" a strategy.

A key at an extreme is NOT itself banned — it must happen about half the time
(next section). What is banned is an extreme key whose distractors are a
one-direction family. Author duties, per item:

- a `distractor_meta` map, per distractor `{ direction: "over"|"under",
  error_kind: "<short label>" }` (unit slip, dropped factor, wrong sign,
  adjacent setup, ...);
- if the key is the largest or smallest option, the three distractors must
  come from **at least two different error kinds**, and the item carries a
  `one_sided_check` line answering: "could a student who has not solved this
  know from the stem that the natural errors all push the same way?" — if yes,
  re-author.

Mechanical (mine): an item whose key is extreme and whose three declared
`error_kind`s are one label is a stage-0 return to the author. Graders get a
new field, `one_sided`, below; a confirmed (c) shape is rule 8 -> drop.

## NEW in v23 — per-batch key-position target (measured on the live bank first)

`key-rank-position.mjs --live act` (new, 2026-10-08; reproduces v22's recorded
1 / 4 / 1 and v20 kept's 17/36 at an extreme): live act/math, 711 scorable of
751 —

    smallest 160 (22.5%)   middle 397 (55.8%)   largest 154 (21.7%)
    per domain: smallest 21.0–23.6%, largest 17.2–25.2%, middle 51.2–59.6%

Chance at k = 4 with distinct values is 25 / 50 / 25.

**Target for v23 (55 items): smallest ~13, middle ~29, largest ~13** — the
live shape, which is also within two items per cell of chance. Each author
aims at about a quarter smallest and a quarter largest in their own file.

**Bars, measured on THIS batch alone (n = 55), not merged with any shipped
set** — the merged context runs of v21/v22 passed while the 6 new items were
the tell:

- `key-extremity-gate.mjs` on the merged 55 AND on each author file (each
  >= 10): PASS (>= 40% at k = 4). This is the existing refusing gate.
- `check-key-magnitude.mjs act/math` on the merged 55 AND on each author
  file: consistent with the live bank.
- `key-rank-position.mjs` on the merged 55: **smallest in [15%, 32%],
  largest in [15%, 32%], middle in [42%, 62%]** (at n = 55: smallest and
  largest 9–17 each, middle 24–34). Outside the band is a stage-0 FAIL.
- A stage-0 FAIL goes back to that author ONCE, before any attack (v20's
  rule). After the attack nothing is edited.

Descriptive, stage 1: the "pick uniformly among interior options" prior's
expected score is printed for both arms (interior keys / n x 1/2), so a gap
riding on key position is visible.

## Stage 0 — structural pre-flight

`act-math-v18-preflight.sh` unchanged (re-break-tested 2026-10-08 before this
file was committed: PREFLIGHT FAIL on live `act-math-v18.kept.batch.json`, 6
live stem duplicates), per author file and on the merged 55: sandbox N/N,
distractor_solve 3N/3N, hub margin <= +10, key-extremity-gate PASS,
check-key-magnitude consistent, 0 composites, sign-pair / dead-options /
stem-echo / key-singleton exit 0, stem duplicates and duplicate option sets
clean; check-plurality-key exit 2 = NOT MEASURED. Plus the key-position band
above and the (c) mechanical check.

## Stage 1 — options-only attack (screen)

55 candidates interleaved with **55 live ACT Math controls matched 1:1 by
domain** (v20's design; at n = 55 a 1:1 control is steady), act-math-v16..v23
excluded, keys dealt flat within each arm, `act-math-v23-attack-draw.mjs` =
v20's renderer with output names, exclusions and seed changed, plus the
controls written out for `check-key-arith-class.mjs`. Three blind Claude
samples, recorded as **three samples of one solver**. `score-oo.mjs`.

- 55 x 3 = 165 picks per arm; one pick is 0.61 points.
- **Batch HOLD** if candidate margin exceeds the control's by **more than
  +10**. Ceiling: live ACT Math arms have measured 26–38% on this instrument
  (v16 27.2, v18 36.2, v19 30.3, v20 37.8), so the bar sits ~50 points under
  the ceiling and can fire.
- **Batch HOLD** if the candidate unanimous-correct rate exceeds the
  control's by **more than 15 points** (one item = 1.8 points; ~9 excess items).
- **Instrument-invalid** if the control's margin is itself >= +25: the
  with-source half decides alone.
- **Per item**: unanimous-correct drops ONLY with with-source corroboration
  (rule 6).

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` of a copy with
`bounds`, `distractor_kind`, `quantity_asked`, `mechanism`,
`arith_class_check`, `one_sided_check`, `distractor_meta` and any other
author-reasoning field stripped; the render summary must name no unrecognised
field; both graders quote the render sha. Per item: pick, work, second
defensible, stem issue, every stem-forced bound and what it kills, survivors,
`limiting_case`, `neighbouring_setup`, `estimation_bound` (over the whole
quantity asked), `arith_class`, `option_structure`, **`one_sided`** (new: is the
key the largest/smallest option AND is there a stem-readable reason all
natural errors push the same way, so picking the extreme wins?), free
elimination, distractor quality, weak distractors, difficulty, duplicate note,
domain fit.

Kept only if all of:

1. Both picks equal the key (a pure arithmetic slip with the stem read the
   same way is forgiven after my re-derivation; a stem-reading split drops).
2. No second defensible answer named by either grader.
3. >= 3 options survive every stem-forced bound (estimation, containment,
   stem-implied class), named by either grader or my class scan and confirmed
   by me by hand; ON a bound is dead; an option rejectable only by doing the
   item's own work is kept.
4. Not "weak" quality by both graders; two weak distractors (by both, or on a
   confirmed bound) drops it.
5. No mechanism duplicate of a live maths row (any family) or an earlier item
   in this batch (later item drops).
6. Unanimous blind solve + a grader-named shortcut / free elimination -> drop.
7. A confirmed (a) or (b) shape, named by either grader or my scan and
   confirmed by me -> drop.
8. **New:** a confirmed (c) shape — key at an extreme with a stem-readable
   one-direction error family — named by either grader and confirmed by me ->
   drop.

Difficulty banked = graders' label (agree -> it; one apart -> the easier;
easy vs hard -> medium).

## Stage 3 — duplicate checks (all three)

`act-math-v16-dupscan.mjs 55 act-math-v23.batch.json` AND
`math-mechanism-dup.mjs 55 act-math-v23.batch.json`, both over ALL live maths
rows in every family, paged with the count asserted; every FLAG read by hand;
and a **hand keyword search** of the 2,765-row dump per candidate mechanism
(v20 found three duplicates this way that Jaccard missed). Same mechanism ->
drop (rule 5). Items with no lexicon term are hand-grepped.

## Stage 4 — kept set, insert

The kept set re-runs stage 0 as a set (key-extremity and magnitude measured on
the kept set alone if >= 10 numeric). A measured gate failing holds the batch
— no dropping or editing items to pass. Ledger entry written, then insert with
`BANK_FAMILY=act BANK_COHORT=act-math-v23 BANK_BAND=mixed`, then
`verify-act-draw.ts`, `form-capacity.mjs`, `next-form.mjs act/math`. REGISTER
§5 and the ledger entry go in the same commit. Commit locally; no push.

## Success

**ACT Math 16 -> 18 forms** if kept items meet all six form-18 deficits
(Algebra 9, Geometry 8, IES 8, Functions 7, S&P 5, N&Q 4). **16 -> 17** needs
only Algebra >= 1. Anything less is partial, inserted if it passes, and
recorded at its true value with denominators and the remaining deficit.
