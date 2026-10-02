# isee-verbal-s16 — pre-registration (written 2026-10-02, before any item or result exists)

## Why this batch
`isee-verbal-s15` fixed SC capacity (4 -> 5 clean forms) with 35 items that no grader
rated hard (32 easy / 3 medium banked). Live ISEE SC went from 18/92 easy to 50/127
(easy 50 / medium 51 / hard 26). The admission draw does not balance difficulty, so
forms got easier. This batch is HARD ISEE Upper Level sentence completions, single-
and two-blank, to recover the pool's difficulty profile. It is commissioned as hard:
inserted with the default `BAND=hard` policy (easy is rejected, never relabelled).

Target ~40 authored by two independent Claude authors (20 each: 12 single-blank,
8 two-blank; live non-s15 SC is ~30% two-blank and the hard/medium live pool ~41%).

## Instrument (options-only)
`make-oo-render.mjs isee-verbal-s16.batch.json --control 30 --control-subskill
sentence_completion --control-difficulty hard,medium --exclude isee-verbal-s4,isee-verbal-s15`

Type- AND difficulty-matched live control interleaved in the same file. `s4` excluded
(bijective clone sets, A33/13o); `s15` excluded (same-day session, and easy). The
eligible hard/medium pool is ~58 items, ~41% two-blank. Three blind samples of one
solver prompt: three samples, not three solvers. Controls derived from each arm's deal.
Scored overall and by SHAPE (single-blank vs two-blank, read off the key: two-blank
options contain "...").

## Bars (fixed now)
M_c = candidate rate - candidate best-fixed-letter; M_l = live rate - live
best-fixed-letter; pooled over the three samples. Excess E = M_c - M_l.

- **Overall:** E <= +10 PASS; E > +10 HOLD (nothing inserts).
- **Per shape stratum:** E_shape <= +15 (wider: n roughly halves). A stratum that
  fails holds that stratum's items even if the overall passes.
- **Ceiling check (both levels):** the overall bar can fire only while the live arm is
  below 90%; a stratum bar only while that live stratum is below 85%. If the live arm
  (or stratum) is at or above that line the blind half is SATURATED for it and returns
  no verdict; that arm/stratum does NOT pass by default — stop and report.
  A34 measured live SC ~35%, s15 42.2%; two-blank pairs are expected to leak more, so
  the two-blank live stratum ceiling is the one to watch.
- **Floor check:** if a live arm comes back below its own best-fixed-letter, report the
  candidate against the letter line too and do not claim "better than the bank".

## With-source (exclusivity + difficulty), fixed now
Three fresh graders (no author, no solver), each on an unmarked re-shuffled render with
the sentence, returning pick, second_defensible, difficulty (easy|medium|hard vs ISEE
Upper Level), above_band words, free_elimination.

Per-item drop rules (gathered independently of the blind samples):
- any grader picks a non-key, or names a second defensible option -> DROP;
- any grader marks the KEY above the ISEE Upper band, or >= 2 graders mark the same
  distractor above band -> DROP;
- a grader names a free elimination AND >= 2 blind samples rejected that same option as
  "certain" -> DROP;
- stem/key duplicates the live bank or the other author (pre-flight) -> DROP;
- **difficulty = median of the three grader labels. Median easy -> DROP (not relabelled).
  Median hard -> banked hard. Otherwise banked medium.** Only median-hard counts as hard
  in the report.
No repairs after the attack. A dropped item stays dropped. Unanimity is reported only as
a batch rate against the live arm's, never as a per-item verdict.

## Batch tells checked before the attack
Key slot flat in the stored file; key strictly longest/shortest at about chance (word
length for single-blank, total length for two-blank); no two items sharing a stem
template or a key; no live key reused; `check-recycled-distractor.mjs`; every prompt
tagged `[Sentence Completion]`, blank count == key part count, and `verbalKind()` =
'sentence completion' (no "is to" anywhere in the prompt).
