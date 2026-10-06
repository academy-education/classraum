# ssat-verbal-a18-hard (HARD analogies) — pre-registration

Written 2026-10-06, before any item or result exists.

## Why this batch
`ssat-verbal-a17` (121 analogies, inserted today) banked 74 easy / 47 medium /
**0 hard**. Live SSAT analogies, measured today on the bank (verified, not archived,
`[Analogy]` prompt or analogy subskill, n=270): **95 easy / 130 medium / 45 hard**
(before a17: 21 / 83 / 45). The admission draw does not balance difficulty, so
analogy sections got easier. Goal: **~60 grader-median-HARD SSAT Upper Level
analogies** to rebalance difficulty. NOT to add forms: form count is not a success
measure here and is reported only incidentally.

What made a17 easy: concrete textbook relations (part:whole, young:adult,
worker:tool, container). This batch is commissioned on the relations that make SSAT
analogies hard (degree, lack, defining trait, manner, rejecter-of; purpose/function,
abstract cause/effect, outward sign, counteraction, preparation:outcome) with words
at the top of the SSAT Upper band (never GRE-tier: no awl/sarcophagus/tome).
Distractors share the stem's general relation FAMILY, so a broad reading admits two
and only the precise relation admits one.

Two independent Claude authors (never GPT), disjoint relation assignments, 50 items
each (~100). Commissioned band: **hard** (`BANK_BAND=hard`).

## Vocabulary exclusions (pre-attack, mechanical)
No content word (stem or option) may appear in: the 128 a17 items, or any live SSAT
verbal row (stems and options; 3,398 words dumped today). No content word reused
within the merged batch, across authors included (the a17 word-pool convergence
finding): the second author's overlaps are rewritten before merge.

## Instrument (options-only) — same as s17-a17
    make-oo-render.mjs ssat-verbal-a18-hard.batch.json --control 30 --control-subskill analogy --exclude ssat-verbal-s6

Type-matched live control interleaved (s6 bijective clone sets excluded; a17 is now
live and stays eligible — it can only LOWER the live arm and so tighten the bar).
Keys dealt flat by the script; control = each arm's best-fixed-letter line, never a
literal 20. Three blind samples of one solver prompt ("three samples", not three
solvers), each returning pick, basis, reject, reject_certain, heuristics with counts.

## Bars (fixed now) — same as s17-a17
M_c = candidate rate − candidate best-fixed-letter; M_l = live rate − live
best-fixed-letter; pooled over three samples. E = M_c − M_l.
- **PASS: E <= +10. HOLD (nothing inserts): E > +10.** No repairs after the attack.
- **Ceiling:** live arm >= 85% = saturated, HOLD and report, never a default pass.
- **Floor:** live arm below its letter line -> also report against the letter line.
- A pass means *not detectably leakier than the shipped analogy bank*, not clean.

## With-source (exclusivity + band)
**Three** fresh graders (no author, no solver), each on its own unmarked re-shuffled
render (`make-grade-render.mjs`, then a per-grader seeded reshuffle). Each returns
pick, `why` (the relation of the stem and of the pick, naming the pick's words),
second_defensible, difficulty (easy|medium|hard vs SSAT Upper Level), above_band,
free_elimination.

**Record check (new, before any drop rule is applied):** each grader's `why` must name
the words of its own recorded pick. A grader whose notes contradict its picks on more
than 3 items is replaced by a fresh grader on a fresh shuffle (the a17 grader-B
transcription slip); its non-pick findings are kept as drop evidence. Individual
mismatches on a passing grader are reported and that grader's pick on that item is
treated as unreadable (neither key vote nor disagreement), never silently fixed.

Per-item DROP rules (same as s17-a17, three graders):
- any grader picks a non-key, or names a second defensible option;
- any grader marks the stem or key above the SSAT Upper band, or two graders mark the
  same distractor above band;
- a grader names a free elimination AND >= 2 blind samples rejected that same option
  as "certain";
- pre-flight: stem duplicates a live SSAT item (`stem-duplicates.mjs`) or another item
  in the batch; same stem pair or key pair as a live item.

**Difficulty (the purpose of this batch):** banked difficulty = the **MEDIAN of the
three grader labels**. Only grader-median HARD counts toward this batch's purpose
(target ~60). Median MEDIUM is inserted as medium. Median EASY is dropped (the item
missed its hard brief; `BANK_BAND=hard` enforces this at insert). The author's label
never banks.

## Batch tells, checked before the attack (fix pre-attack only)
Stored key slots near flat (no slot > 30%); key strictly longest / shortest each near
1 in 5; `check-recycled-distractor.mjs` NO MEASUREMENT or at/under its control;
`check-analogy-reversal.mjs` at/under its live control; no option that is the key's
relation reversed, and no key that is the stem's pair reversed; all five options in
the stem's part-of-speech pattern (no 3-2 POS split); no odd-topic-out (no four
options sharing a topical domain the fifth lacks); key relation family varied (no
family keyed in > 15% of items); `verbalKind()` = analogy on every prompt.

## Success measure
Live analogy difficulty mix before (95 / 130 / 45 e/m/h) and after; count of
grader-median-hard items inserted against the ~60 target. If the attack HOLDs or
attrition leaves fewer than 60 hard, report the measured number; do not lower a bar,
relabel a median, or change a blueprint count.
