# map-v2 Math batch 8 (Number Systems): written items, 2026-10-30

One item per mechanism for the chain checker's 3 NEW (E07, E14, E16) and 4 least-shared BORDERLINE (E09, E06, E12,
E17). Claude only. Nothing was inserted or committed, and nothing was written to the DB. The near-dup tool reads live
rows read-only.

**Result: 5 PART OK, 2 dropped.** Kept: E06, E07, E14, E16, E12 (g6 1, g7 4, g8 0). Dropped: E09, E17.

Command (the b6/b7 form), from the repo root:

    node scripts/study-bank/map-v2-work/math/math-check.mjs <items.json> \
      --slots scripts/study-bank/map-v2-work/math-b8/slots.json \
      --prior scratchpad/map-v2-math-work/dump-b6/prior-math.json --families isee,ssat,map

Every check read its input. The near-dup tool printed its denominators (709 isee, 615 ssat and 218 map live rows;
"cached read", and the count matched each time). It also flagged E09 and E17, so it did run. The `--prior` dump
predates batches 6 and 7. To cover that gap, all 8 b6/b7 item files (including the b7 drop) were compared by the same
prompt Jaccard. The closest match was 0.26, so nothing near-dup was found.

**Break-tests, run on a copy of N7 and then deleted.** A wrong `solve` in MB8-N7-02 was refused (sandbox FAIL), and so
was a wrong `distractor_solve` in MB8-N7-05 (DISTRACTOR mismatch). The bound-screen refusal and the PAIR refusal both
fired on real items (E09/E17 and the first E16 set).

| mech | checker verdict | id | slot | g / tier | key (rank) | options | math-check | path |
|---|---|---|---|---|---|---|---|---|
| E07 | NEW | MB8-N7-01 | N7 | 7 mid | -46.75 (2) | -63.75, -46.75, -35.75, -21.25 | **PART OK** | `scratchpad/map-v2-math-b8-work/N7/items.json` |
| E14 | NEW | MB8-N7-02 | N7 | 7 high | -11 4/7 (2) | -15 3/7, -11 4/7, -3 3/7, -2 2/7 | **PART OK** | same |
| E16 | NEW | MB8-N7-03 | N7 | 7 high | 5/7 (4, L) | -3 6/7, -5/7, 2/7, 5/7 | **PART OK** | same |
| E12 | BORDERLINE | MB8-N7-05 | N7 | 7 mid | -4 2/7 (3) | -7 3/7, -6 1/7, -4 2/7, -1 6/7 | **PART OK** | same |
| E06 | BORDERLINE | MB8-N6-01 | N6 | 6 mid | 3.5 (3) | 0.5, 2.5, 3.5, 7.5 | **PART OK** | `scratchpad/map-v2-math-b8-work/N6/items.json` |
| E09 | BORDERLINE | MB8-N7-04 | - | 7 mid | -4/11 (2) | -10/11, -4/11, 4/11, 8/11 | **DROPPED** | `scratchpad/map-v2-math-b8-work/_dropped/N7-E09/items.json` |
| E17 | BORDERLINE | MB8-N8-01 | - | 8 mid | -1/3 (2) | -1 2/3, -1/3, 1/3, 1 2/3 | **DROPPED** | `scratchpad/map-v2-math-b8-work/_dropped/N8-E17/items.json` |

## Why E09 and E17 were dropped (not reworded)

Both items fail **near-dup** on isee and ssat (E09 j = 0.80, E17 j = 1.00). They match the same two live rows: ISEE
012a20a1 ("What is the value of 2/3 + 1/4?") and SSAT 0da96925 ("If 3^(x + 2) = 81, what is the value of 3^x?"). The
flag is lexical. The digits are folded, so the only words left are "what is the value of". The live rows do not share
the chain. Under the brief, a near-dup failure is a drop, and the items were not reworded.

**Each would also have been dropped without the flag.** Each fails **BOUND-SCREEN: sign strikes 2 distractors**, and the
cause is the mechanism, not the wording:

- **E09.** Counting the seven printed minus signs fixes the sign and strikes both positive options. This is exactly the
  strike that withdrew batch-5 MB5-N7-01 ("the negative count strikes both positives",
  `map-math-v2-b5/stage0-drops.json`). LONE refuses a 3-1 sign split, so a clean set would need all four options to
  share the key's sign. A search over (-a/(a+1))...(-(n-1)/n) with a <= 9 and n <= 25 found none that passes FORM and
  HUB. Errors searched: wrong sign, last factor only (with and without the sign), first x last (with and without the
  sign), keeps the first denominator, assumes 1/n.
- **E17.** gen8 Q31 has exactly three natural errors (adds c, drops the sign, both), and two of them are positive. That
  always splits the options 2-2 by sign. The sign of x^3 = d - c is then readable by comparing two printed numbers, or
  by the sign rule alone when c > 0 > d. E17 also fails PAIR and DPAIR here (key -1/3 against ±1 2/3 differs by the
  printed 2), and P2 (it is substitutable with the key at try 2).

**Feasibility gap.** FEASIBILITY.md did not model the bound screen, so "writable" there was too generous for any mechanism
whose key sign follows from a sign rule. The same gap shaped E07 and E14 below.

## Deviations from the generator, for the coordinator to accept or reject

- **E07 uses five cards, not four** (-8.5, -7.5, -6.5, 2.5, 5.5). With four cards (gen8 Q16d), every natural error set
  either keys at rank 1 or puts two positive products beside a negative key:
  - Rank 1 means a "least" stem with every distractor above the key, so a student just picks the smallest option.
  - Two positives get struck by "the least product is negative".

  Five cards let all four options be negative with the key at rank 2. One error, -63.75 (the two numbers greatest in
  size, made negative), lands below the key, so "pick the smallest" is wrong. The stem never asks for "the two numbers
  greatest in size" (the C06 condition). That framing appears only as this error.
- **E14 uses a positive multiplier (3/2) and a negative result (-5 1/7).** With a negative multiplier, the key has the
  sign of R by the sign rules, and every natural error set splits 2-2. LONE refuses 3-1. The sign strike would then
  remove both opposite-sign options, as in MB5-N7-01. No same-sign error set passes FORM and HUB. Errors searched: divides
  again, divides by f^2, squares only the numerator, squares only the denominator, doubles instead of squaring.

  The signed content is now the negative mixed number (7.NS.A.2). The undo-then-apply chain is unchanged. The key is R
  x f^2. **R x f (the original number, -7 5/7) is not an option.** That satisfies the checker's condition. It also has
  to be absent anyway: the key is R x f times the printed 3/2, which is a PAIR.
- **E16's numbers were changed once.** The first set (1 1/7, 1 4/7, 1 6/7) failed PAIR because the key 6/7 is 6 x the
  slip 1/7, and 6 is printed. That was a construction refusal, not near-dup. The new set is 1 1/7, 2 2/7, 2 5/7. E16 is
  keyed at rank 4 (L). gen8's no-slip sets key at rank 2 or 3, but the key and its own negative are then the two options
  nearest 0, and a "nearest 0" guess cuts that to a coin flip. A renaming slip (2/7) nearer 0 than the key breaks this,
  and every passing set that includes that slip keys at rank 1 or 4. The item carries one computational slip (the
  allowed maximum).
- **E06 and E12 are as generated**, with sets chosen for the bound screen:
  - E06: a = -4.5, b = 5.5, c = -2.5. "Stays between -4.5 and 5.5" strikes only 7.5. "Other side of the fold" strikes
    only 0.5. Most gen8 Q47 sets let one of those bounds strike two.
  - E12: sum printed, all printed entries negative, three distinct errors (other blank as 0, stops at B, sign slip on
    the last step).

## Risks named, not resolved

- **Key positions:** ranks 2, 2, 4, 3, 3. Only 1 of 5 is at an extreme (E16), well under the inserter's 40% floor for a
  batch. Two keys are at rank 2, the position that held b2 Geometry. The rank limits come from the error sets above
  (E07 and E14 cannot leave rank 2 under the sign constraint).
- **E16 (risk high):** the stem asks for the value nearest 0, and the key is the largest option. Plug-back on
  reachability strikes -5/7 and 2/7, but only by trying the four sign patterns, which is the work.
- **E12:** the area risk the checker named (a magic square can read as Operations and Algebraic Thinking). -1 6/7 is
  the solved first blank B, offered as the stop-early error. It does not lead to the key through one printed number.
- **E06:** near-REPEAT BORDERLINE (midpoint + reflection, chained). 0.5 is the fold point (the stop-early error), and
  2.5 is the opposite of the printed -2.5.
- **E14:** -3 3/7 and -2 2/7 are R x 2/3 and R x 4/9, so with the stem's -5 1/7 they sit on one x(3/2) chain that the
  key continues. The signed-ratio HUB/RUN checks do not flag it, because the key is not linked to either. A cold screener
  should look at it.
- **Grade 5 and grade 8:** batch 8 now adds nothing at either grade. E17 was the only g8 chain.
