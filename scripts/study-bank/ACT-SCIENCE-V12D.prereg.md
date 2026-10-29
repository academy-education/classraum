# ACT Science v12d — pre-registration (2026-10-29, before any grader sees an item)

**Why.** b10 (v12b) cleared 8 of 9 passages with 0 no-source items, so the v12 brief is scaled. v12d is written in
parallel with v12c (b11), on different topics (geology, astronomy, microbiology, atmospheric science; all invented
systems following no named law).

**Population.** One cohort, `act-science-v12d`: 4 research_summaries + 3 conflicting_viewpoints passages (6 items
each) + 2 data_representation passages (5 items each), 52 items, written in one pass by one author (a coordinator fork)
to `ACT-SCIENCE-V10-BRIEF.md` incl. the v11 and v12 lessons, plus the b10 lesson: every figure value a key depends on
must be readable (the bar passage uses values on multiples of 25 on a 0-200 axis; every keyed comparison or cutoff is
at least half a tick from the nearest bar). Graded as batch **b12** in `act-science-regrade/batches.json`, seed
2026102912. Rows built from the batch file with the inserter's content hash (`_coordinator/b12/rows.json`, generator
`_coordinator/b12/gen_v12d.py`) and passed with `--from`; nothing is inserted until `decide --write` has run.

**Amendment A1 (before any packet is built).** The cohort is not one complete 40-item form, so b12 carries
`"strictForm": false`, as b7-b11 did. Every other structural check applies.

**Instrument (unchanged from b8-b11).** `act-sci-packet.mjs`, `GRADER-BRIEF.md`, `GRADER-PROMPT.md`, drop rules R1-R8,
two FRESH graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on single-grader R2/R4 flags, coordinator
confirmations for R1/R3/R5/R7/R8, any drop takes its whole passage. The author may not grade, re-check or confirm. No
item is repaired in response to this round.

**Self-audit before grading (recorded, not a gate).** 31 table/figure keys recomputed by script from the cells, all
match. No "Yes/No + reason" or "weakens X, because" item; design items use each level once with no mirrored pair; CV
options are scientist labels. Changed before this prereg: P5-Q4's ridge was re-specified as higher than Mount Teel's
summit (the first wording compared it with Teel's base, which left the landslide claim ambiguous); P7 Scientist 1's
threshold was reworded from "rises above 40 g/L" to "reaches about 40 g/L" so the July key and the usual August date
agree. Key letters flat (A13 B13 C13 D13); key uniquely longest on 5 of 52. Domains IoD 29 / SI 7 / EMI 16.

**Bars (fixed now; range 0-9 passages).** Keep writing to the brief if >= 5 of 9 clear; revise the brief again if 3-4
clear; stop agent authoring of 6-item ACT Science and report to the owner if 0-2 clear (same as V12B).

**Release.** Cleared passages go to `science-release.json` and one blind-only co-founder run, as for v10a/b-v12b. No
bar on the blind run; release is the graders' decision.

**Invalid if.** A grader sees the key file, another grader's output, this cohort's explanations or the generator before
its cold pass; GRADER-BRIEF or the drop rules change after packets are built.
