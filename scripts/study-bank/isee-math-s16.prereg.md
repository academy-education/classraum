# isee-math-s16 — pre-registration (written 2026-10-08, BEFORE any item exists)

Same pipeline, bars and stop rule as `isee-math-s15.prereg.md` (read it; this
file states only what is the same by reference and everything that changes).
Four changes, each answering a measured s15 result (REGISTER §5, 2026-10-08):
the difficulty commission and grader anchoring (s15 banked 69/87/9), a
solution-method duplicate search BEFORE the freeze (s15's word-overlap scans
missed all 7 duplicates), a built-in-limits brief for the measurement /
coordinates author (s15 strand E lost 12 of 33), and a named free-strike brief
for every author (s15's 26 confirmed eliminations and 14 kept single kills).

## What it can buy

`admission-form-depth.ts`, run 2026-10-08 before this batch: ISEE quant and
mathach both 6/6 clean over a shared pool of **513** verified, unarchived
`isee/math` rows (re-dumped the same day: 513 read = 513 counted, 513 distinct
ids). One ISEE test consumes 37 + 47 = 84 math items from that pool, and the
pool is ungrouped (513 rows, 513 groups), so the replay is exact division:

    form 7 needs 7 x 84 = 588  -> +75
    form 8 needs 8 x 84 = 672  -> +159

The whole ISEE test stays at 2 clean (Reading binds); the section depth is
the number this batch moves. Because `admission-form-depth.ts` prints six
forms, the after-measurement is a **10-form replay** of the same shared-pool
draw (the script gains a `--forms N` argument; break-test: `--forms 6` must
reproduce the 6-column table, and `--forms 10` on the 513-row bank must print
6 clean with form 7 at 9/37 quant-fresh and 0/47 mathach-fresh).

## Batch

- Cohort `isee-math-s16` (no file or live cohort of that name exists).
- **114 authored = six Claude authors x 19**, the six s15 strands (A numbers
  and operations, B ratio/rate/percent, C algebra, D geometry, E measurement /
  coordinates / patterns / time, F data and probability), strand text as in
  s15. At s15's keep rate (165/198 = 83.3%) 114 yields about 95: form 7 (+75)
  is bought with ~20 margin; form 8 (+159) is NOT reachable from this batch
  and is reported as progress ("toward form 8"), not promised. If fewer than
  75 pass, the passers are still inserted and form 7 is reported NOT bought,
  with the shortfall.
- Four choices, ungrouped, no figure, domain `Math`, no calculator, ISEE Upper
  Level; quantitative comparison out of scope (no live row is that type —
  unchanged from s15). Ids `IM16A-01 .. IM16F-19`; files
  `isee-math-s16{a..f}.batch.json`; merged `isee-math-s16.batch.json`.
- Item fields as s15, plus a required `forced` array (below).
- Authors read all 513 live ISEE math rows (dump with difficulty labels)
  before writing; they also get the s15 drop list below.
- Waves: at most two authors run at once (repo-wide subagent cap). Each
  author saves its file after every 3-4 items, so a relaunch resumes from
  disk; an author idle 6+ minutes is relaunched from its file. Completion is
  judged by the file on disk and a marker holding its sha256, never a notice.

## Change 1 — difficulty: commission hard, anchor the graders

s15 commissioned 4/16/13 per author; the kept 165 authored 17/78/70 banked
**69 easy / 87 medium / 9 hard** (57 grader splits, easier label taken), and
the pool moved from 14/57/29 to **118 / 284 / 111 = 23.0 / 55.4 / 21.6**.

- **Commission per author: 0 easy / 7 medium / 12 hard** (batch 0 / 42 / 72 =
  0 / 36.8 / 63.2%). "Hard" for this batch means, and the author states which
  in the item's `subskill` or `explanation`: at least three dependent steps
  where no single step is a recall fact, OR one non-routine idea (a
  complementary count, an invariant, working backwards, combining two strands
  in one item). A long computation of routine steps is medium, not hard.
  Authors are shown the live rows labelled `hard` as calibration.
- **Grader anchoring (the instrument change).** Both graders receive, before
  the candidates, 18 live ISEE math rows (6 per band, drawn with seed
  20261031 from the 513, key shown) with their bank labels, and are told to
  rate each candidate on THAT scale: "easy / medium / hard as the live ISEE
  bank labels them", not as the grader personally finds it. Banked difficulty
  stays the s15 rule (consensus, or the easier label on a split), so the
  anchor is the only change and its effect is readable against s15.
- **Recorded, not gated** (the draw has no band quota, so no form breaks on
  mix): authored and banked mix of the kept set, the split count, and the
  pool after. Pre-stated reading: the fix "held" if the kept set banks
  **easy <= 23.0% and hard >= 21.6%** (i.e. it does not make the pool easier
  again); it "moved the pool back" if hard >= 29%. s15's transition (authored
  hard 70 -> banked hard 9) predicts neither holds without the anchor; that
  is the hypothesis this batch tests.

## Change 2 — solution-method duplicate search BEFORE the freeze

s15 found 5 live and 2 within-batch duplicates only AFTER the freeze, all
invisible to both word-overlap scans (live max Jaccard 0.45, within 0.39).
Now, after all six files are in and before the freeze:

- **M1 (Claude agent, the instrument).** Two agents, each taking half the 114
  candidates, receive every candidate's prompt + `solve` + explanation, the
  other 113 candidates, and the 513-row live dump. For each candidate they
  write the solution method in one line (what is computed from what, on what
  structure) and name any live row or other candidate solved by the SAME
  method on the SAME structure (rewording, new numbers or a new context do
  not make it different; a different asked quantity on the same setup chain
  is the same). Output per candidate: `{method, live_dups[], batch_dups[],
  note}`, saved after every 10 items.
- **M2 (aids, not verdicts).** `math-mechanism-dup.mjs` (ranked keyword
  candidates over every live maths row), `stem-duplicates.mjs --family isee`,
  and my word-3-shingle scan (>= 0.35 read by hand, break-tested by a planted
  live stem).
- I confirm every M1/M2 hit by hand. A confirmed duplicate (live, or a
  within-batch pair — the later id) is **returned once** to its author for a
  replacement on a different mechanism; the replacement is re-run through
  B1/B2 and through M1 for that item alone. A second confirmed duplicate on
  the same slot is dropped before the freeze (the batch shrinks; it is not
  padded).
- **Break-test of M1, before it is trusted:** its input includes three
  planted pairs whose answer is known — two s15 within-batch pairs
  (IM15B-13/IM15C-32, IM15D-15/IM15D-22, presented as two extra "candidates"
  each) and one s15 live duplicate (IM15E-02 vs its live row). M1 must name
  all three; if it names fewer than 3 of 3, its silence on the real
  candidates is not evidence and M1 is re-run with a sharper brief before the
  freeze. (The plants are removed before the merge; they are never frozen.)
- Post-freeze, B5 is unchanged from s15 (graders' `duplicate_of_live` plus
  `stem-duplicates`); a duplicate found AFTER the freeze is dropped, not
  repaired.

## Change 3 — strand E built-in limits

s15 strand E lost 12 of 33, mostly to bounds the measurement context carries
by itself. Author E's brief adds, as a checklist applied to EVERY option:
clock and timetable times are multiples of the stated step (a 5-minute
timetable gives :00/:05/...; a 12 x 8 min floor), durations under a
whole-minute product cannot carry seconds, a.m./p.m. and "before 10:00"
direction; km/h exceeds the m/s figure, a larger unit gives a smaller number;
grid distances are bounded by the leg and the taxicab sum (hypotenuse
strictly between the larger leg and the leg sum); lattice/grid parity (moves
of (+-1, +-2) change x + y parity; integer coordinates on a grid line); a
rising segment's perpendicular falls; direction of a reflection or
translation read off the stem; a midpoint lies between its endpoints.
**Every distractor must satisfy every such limit the key satisfies** — the
author writes the limits in `forced` and builds distractors inside them.

## Change 4 — every author is briefed on s15's free strikes, by example

Each author gets this list (s15 ids, what killed them) and must write, per
item, a `forced` array: every property the key is FORCED to have without
doing the item's method (sign; a range read off the stem; parity; a factor
of a printed product; units digit; a denominator dividing the sample-space
size; at most C(n,k); a multiple of a timetable step; between the extremes;
the kind/degree of an expression). **Each distractor must share every
`forced` property.** If a plausible error path cannot produce a value that
does, change the numbers or the error path — never keep an option a student
can strike on sight.

    impossible on its face (s15 sec 1)  F-21 7/30 as a probability over 15 pairs; F-27 5/44 over 66;
                                        F-01 2/7 over a length-20 interval; F-08 69 > C(9,2) = 36;
                                        C-31 a GCF coefficient above 12; A-08 12, 24 not tile counts;
                                        E-17 10:17 as "before 10:00"
    parity / units / factor             A-02 multiple of 7 and even; A-12 odd count of odds;
                                        A-22 units digit 3; E-12/E-18 multiples of 5 minutes
    bound read off the stem             B-03 120% of n = 90 so 80% < 72; B-17 larger raise;
                                        C-09 a > 6; C-12 f(-2) < f(3); C-26 |x+5| <= 12; A-14 quotient > 2
    limiting case ON the bound          B-06 equal split; B-12 linear variation beside a square; C-09 6
    geometry bracket / direction        E-08, E-10 hypotenuse between leg and leg sum; D-28 angle < 45;
                                        E-05, E-09 direction or sign read off the stem
    magnitude / kind singleton          E-19 km/h vs m/s; C-04 the only cubic; E-11, E-23 floors
    plug-back past a quadratic          C-24 one check of n = 24 ends the item

## Bars — unchanged from s15 except the hold count

B1 sandbox (114 keys, 342 distractors) and B2 pre-flight exactly as s15
(key extremity >= 40% on each author file and the merge, hub lines, run-
middle / pair-constant / key-is-sum / sign-pair / plurality on the key ->
re-author before freeze; `stem-duplicates` 0 internal). B3 options-only with
a 100-item interleaved live ISEE control, three Claude samples, PASS if
candidate <= control + 5.0, HOLD if >= +12.0, between decided by unanimity
rate <= control + 10; VOID if the control reads >= 80%. B4 two with-source
graders per item on the key-withheld render (each grader may run as two
agents over halves), drop rules 1-5 as s15 (>= 2 distractors killed by a
hand-confirmed free elimination is a drop; unanimity alone never drops).
**HOLD the whole batch if more than 32 of 114 are dropped at B4+B5** (28.1%,
s15's proportion). B6: ledger entry, `BANK_FAMILY=isee
BANK_COHORT=isee-math-s16 BANK_BAND=mixed math-bank-helper insert` with a
qc.json naming survivors, then `verify-admission-forms.mjs` and the 10-form
replay.

**Stop rule.** First failed gate stops the run (B1 after freeze, B3 HOLD or
VOID, B4/B5 HOLD). Nothing is inserted from a stopped run; **no item is
repaired after the freeze** — a failing item is dropped.

**Prediction.** ISEE math 6 -> 7 clean forms if >= 75 insert; 8 is not
reachable (+159). Kept mix: see Change 1.

## Author brief (every author)

s15's author brief (items 1-9 of `isee-math-s15.prereg.md`, read in full),
with these replacements: 19 items, 0 easy / 7 medium / 12 hard; key extremity
45-60% of numeric items; Change 1's definition of hard; Change 4's strike
list and `forced` field; author E also Change 3. Save the file after every
3-4 items. Before reporting, run from the repo root `math-bank-helper.mjs
verify` (19/19, 57/57, extremity PASS) and the five B2 checkers, fix what
they flag, write the completion marker (sha256 of the file) outside the repo,
report and STOP.
