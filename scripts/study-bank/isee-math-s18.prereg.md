# isee-math-s18 — pre-registration (written 2026-10-22, BEFORE any item exists)

Owner, 2026-10-22: agents approved for ONE ISEE math batch ("Approve agents"), so it can ship through the
math gate without co-founder time. Pipeline, bars and stop rule are `isee-math-s17.prereg.md`'s, by
reference, with the changes below. Max 3 agents at once.

## What it can buy
ISEE math 709 verified rows; one test draws 84 (quant 37 + math achievement 47) from one shared pool.
`admission-form-depth.ts --forms 20` (2026-10-22): quant 9 clean, math achievement 8 -> the full test
repeats at 8. **Form 9 needs 756 (+47).** No real student is near ISEE math today (`runout-monitor.ts`);
this is supply ahead of demand, and the whole ISEE test stays bound by Reading (2).

## Changes from s17
1. **One author, me, in-session** (no author agents): 60 items, six strands x 10 (s17's A numbers and
   operations, B ratio/rate/percent, C algebra, D geometry, E measurement/coordinates/patterns/time,
   F data and probability). Commission per strand 0 easy / 4 medium / 6 hard (24M/36H). Ids
   `IM18A-01 .. IM18F-10`. Item fields as s17 (`solve`, `distractor_solve`, `forced`).
2. **Hard is defined by depth INSIDE the ISEE Upper Level outline**, never by a contest trick: at least
   three dependent steps with no single step a recall fact, using only outline content. s17's 15
   out-of-band drops are named as forbidden techniques: simultaneous exponent congruences, Simon's
   factoring, Euclid on linear forms, extremal doubling chains, p(1)+p(-1) coefficient tricks, functional
   equations, prime-valued factored quadratics, a^b = 1 casework, British flag, Pitot, non-decimal bases,
   Fibonacci recursions, circular seating with adjacency, onto inclusion-exclusion, infinite geometric
   series; also residue cycles (s16). Classic contest set pieces (gear trains, digit position in
   123456789..., clock-hand angles, sum/difference closing speeds, two-set Venn, reverse percent,
   pigeonhole socks, triangle area from coordinates, quadratic from three values) are avoided because
   s17 found them already live.
3. **M1 method search: one agent over all 60** (s17 used two over halves), plus the script aids
   (`math-mechanism-dup.mjs`, `stem-duplicates.mjs --family isee`). Break-test as s17: four plants with
   known live duplicates (s16 originals IM16C-14, IM16F-17, IM16E-02, and an IM16A-07 recontext), ids
   opaque; M1 must name 4/4 or is re-run once with a sharper brief. Confirmed duplicates are replaced
   ONCE by me and the replacement re-checked by scripts; a second hit drops the slot before freeze.
4. **B4: the anchored pair only** (s16/s17 anchors, `isee-math-s16.grader-anchors.json`). No unanchored
   arm: s17 already measured the anchor effect (D = +20.4). Banked label = anchored pair, easier on a split.
5. **Hold bar scaled: HOLD if more than 16 of 60 are dropped at B4+B5** (28.1%, s16/s17's proportion).

## Unchanged (s17 by reference)
B1 sandbox (60 keys, 180 distractors through `math-bank-helper verify`); B2 pre-flight (key extremity
>= 40% on the merge, aim 45-60%; hub lines; run-middle / pair-constant / key-is-sum / sign-pair /
plurality on the key re-authored before freeze; stem-duplicates 0 internal). B3 options-only,
`make-oo-render.mjs --control 100`, three Claude samples, PASS if candidate <= control + 5.0, HOLD if
>= +12.0, between decided by unanimous-correct <= control + 10; VOID if the control reads >= 80%.
B4 drop rules 1-5 (>= 2 distractors killed by a hand-confirmed free elimination is a drop; out of band
is a drop). B5 post-freeze duplicates dropped, never repaired. B6 ledger entry, `BANK_FAMILY=isee
BANK_COHORT=isee-math-s18 BANK_BAND=mixed math-bank-helper insert`, then `verify-admission-forms.mjs`
and `admission-form-depth.ts --forms 20`. **Stop rule:** first failed gate stops the run; nothing is
repaired after the freeze.

## Prediction
About 50 of 60 survive (s16 90%, s17 79%); form 9 (+47) is reachable only if >= 47 insert. If fewer
pass, the passers are still inserted and form 9 is reported NOT bought.
