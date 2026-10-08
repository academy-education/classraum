# act-math-v22 — pre-registered bars (written 2026-10-08, BEFORE any item is authored)

## Why this batch, and its size

`form-capacity.mjs` (2026-10-08, re-run after act-math-v21 was held): **ACT
Math 16 forms** (751 items), binding on **Algebra 135 / 8 per form**.
`next-form.mjs act/math`: Algebra 135 for 136 needed, every other domain met.
**CHEAPEST NEXT FORM: 1 item -> Algebra +1.** Nothing changed since v21.

**Size: 6 Algebra items** (v21 had 5; one more for margin after v21 kept 0).
One Claude author; file `act-math-v22.batch.json`; ids `AM22A-01..06`;
cohort `act-math-v22`; four choices (`act-test.ts` math `choiceCount: 4`).
Commissioned medium/hard as v18–v21; the banked label is always the
graders'. `BANK_BAND=mixed`. **No repairs after the attack.**

**No v21 item, mechanism or option set is reused.** The v21 batch was held;
re-submitting any of its items (including AM21A-01, which the with-source half
would have passed) would be re-deciding a finished batch.

## Distractor rules (unchanged from v20/v21)

Every distractor carries a `distractor_kind` entry declaring all four checks,
each item a `quantity_asked` line and a `mechanism` list; all three are
stripped (with `bounds`) before grading. Author declarations are not a check.

1. **v16 limiting case** — a parameter-extreme value ON a stem-forced bound is dead.
2. **v17 neighbouring setup** — the exact answer to an adjacent problem is
   usually an extreme of the feasible interval.
3. **v18/v19/v20 cheapest one-step estimate** — over the WHOLE quantity asked,
   one step finer than the obvious cap; every distractor strictly inside.
4. **v18 weak standard** — weak only if both graders name it or it sits on a
   bound I confirm by hand.
5. **v21 mechanism duplicates** — the author gets the full live maths list
   (every family) and runs both dup checks on its own file before delivery.

## New in v22 — two banned option shapes (the two that sank v21)

- **(a) A key that stands out arithmetically from the other options.**
  AM21A-03's options were 72/4, 72/3, 72/9, 72/10 — a 2x2 grid of
  "root or not" x "split or divide", so either idea alone narrowed to two.
  AM21A-05's 90 was the only multiple of 15 when the stem forced the sum to be
  15x. Banned: option sets that are one quantity transformed by a grid of
  factors, and any set where the key is the odd one out under a simple
  arithmetic description (the only integer, the only multiple of k, the only
  square, the only one sharing a factor with the stem's numbers, ...).
- **(b) Any option set where a divisibility or ratio property readable from
  the stem leaves one candidate.** E.g. a ratio that falls out of two given
  terms (a3/a1), a total forced to be a multiple of a stem number, a count
  forced to be even.

**Author duty:** for every item, write an `arith_class_check` line answering
"is the key the unique member of some simple arithmetic class the stem
implies?" — and if yes, break the option set (re-author distractors so at
least two options share the class, or change the numbers), never just assert
it. Stripped before grading with the other author fields.

**My check (not the author's):** `check-key-arith-class.mjs` (new, written
with this file, break-tested on v21 before authoring) lists, per item, every
simple class — integer, multiple of d for d = 2..30, perfect square, perfect
cube, positive, sign — in which exactly ONE option is a member, and whether
that option is the key. It runs on the candidates AND on the 18 live
controls of stage 1, so the base rate of "key unique in some class" is
measured, not assumed. It is a **reading list, not a gate**: being unique in
some class happens by chance; what is banned is a class **the stem implies**.
Every candidate key-hit is read by hand against the stem; a confirmed
stem-implied class leaving the key alone is rule 3 (survivors 1) -> drop.
It cannot see (a)'s grid shape — that is the graders' field below.
Measured before authoring (descriptive): v21 keys lone in some class 5/5,
distractors 9/15 (`--selftest` asserts AM21A-05 -> multiple of 15); shipped
v20 kept keys 12/36 = 33.3%, distractors 43/108 = 39.8%. Most hits are
incidental ("multiple of 17"), which is why it is a reading list.

## Stage 0 — structural pre-flight

`act-math-v18-preflight.sh` unchanged, my re-run on delivery: sandbox 6/6,
distractor_solve 18/18, hub, composites, sign-pair, dead options, stem echo,
key singleton, stem duplicates, duplicate option sets.

**Key-extremity and magnitude need >= 10 numeric items; v22 has 6.** They are
run on `act-math-v22.batch.json` merged with `act-math-v20.kept.batch.json`
(36 items) **as context, and stated as such** — all 36 are a shipped set, so a
merged PASS says the 6 do not break the cohort's distribution, not that the 6
are clean on their own. The 6-item key-at-extreme count is reported
descriptively (x / 6), not gated. v22 alone is expected to REFUSE both
checks (n < 10); that refusal is reported as NOT MEASURED, not a pass.

## Stage 1 — options-only attack (screen)

6 candidates interleaved with **18 live ACT Algebra controls (3:1, as v21)**,
act-math-v16..v22 excluded, keys dealt flat within each arm (at n = 6 the
best-fixed slot is 2/6 = 33.3%; control 5/18 = 27.8%), three blind Claude
samples (recorded as three samples of one solver), `score-oo.mjs`.

- 6 x 3 = 18 candidate picks; one pick is 5.6 points. Reported with denominators.
- **Batch HOLD** if candidate margin exceeds the control's by more than
  **+10** (fires at 2 excess picks, 11.1). Ceiling: live Algebra arms have
  measured 11–38% on this instrument, lines 27–33%, so the bar sits far
  under the ceiling and can fire.
- **Batch HOLD on unanimity** only if **>= 2 of 6** candidates are
  unanimous-correct AND the candidate rate exceeds the control's by > 15
  points (one item is 16.7 points at n = 6; a single unanimous item is a
  per-item matter).
- **Instrument-invalid** if the control's margin is >= +25: with-source decides alone.
- **Per item**: unanimous-correct drops ONLY with with-source corroboration (rule 6).

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` of a copy with
`bounds`, `distractor_kind`, `quantity_asked`, `mechanism` and
`arith_class_check` stripped; render summary must name no unrecognised field.
Same fields as v21, plus two:

- `arith_class`: is the key the unique member of an arithmetic class the stem
  implies (divisibility, integrality, ratio, parity, square/cube)? name it.
- `option_structure`: is the option SET built from one quantity by a pattern
  of transformations such that the pattern singles out the key?

Kept only if all of:

1. Both picks equal the key (pure arithmetic slip forgiven after my re-derivation).
2. No second defensible answer named by either grader.
3. >= 3 options survive every stem-forced bound (including estimation and any
   stem-implied arithmetic class), named by either grader or by my class scan
   and confirmed by me; ON a bound is dead; an option rejectable only by doing
   the item's work is kept.
4. Not "weak" quality by both graders; two weak distractors (by both, or on a
   confirmed bound) drops it.
5. No mechanism duplicate of a live maths row (any family) or earlier batch item.
6. Unanimous blind solve + a grader-named shortcut / free elimination -> drop.
7. **New:** a confirmed (a) or (b) shape — the key unique in a stem-implied
   class, or an option-structure pattern that singles out the key, named by
   either grader or my scan and confirmed by me -> drop, whether or not the
   blind half solved it.

Difficulty banked = graders' label (agree -> it; one apart -> easier; easy vs hard -> medium).

## Stage 3 — duplicate checks (both)

`act-math-v16-dupscan.mjs 6 act-math-v22.batch.json` AND
`math-mechanism-dup.mjs 6 act-math-v22.batch.json`, both over ALL live maths
rows in every family, paged with the count asserted. Every FLAG read by hand;
same mechanism -> drop (rule 5). An item with no lexicon term is hand-grepped.

## Stage 4 — kept set, insert

Kept set re-runs stage 0 (extremity/magnitude merged with v20 kept, stated).
A measured gate failing holds the batch — no editing to pass. Insert with
`BANK_FAMILY=act BANK_COHORT=act-math-v22 BANK_BAND=mixed`, then
`verify-act-draw.ts`, `form-capacity.mjs`, `next-form.mjs act/math`.

## Success

**ACT Math 16 -> 17 forms** if >= 1 Algebra item is kept. Zero kept is
recorded at its true value and the form stays 16.
