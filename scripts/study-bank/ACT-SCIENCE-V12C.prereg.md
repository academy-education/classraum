# ACT Science v12c — pre-registration (2026-10-29, before any grader sees an item)

**Why.** b10 (v12b) cleared 8 of 9 passages with 0 no-source items, the prereg's "keep writing" band, so the v12
brief is being scaled. v12c is the next cohort; v12d is written concurrently by another author on other topics.

**Population.** One cohort, `act-science-v12c`: 4 research_summaries + 3 conflicting_viewpoints (6 items each) + 2
data_representation passages (5 items each), 52 items, written in one pass by one author (a coordinator fork) to
`ACT-SCIENCE-V10-BRIEF.md` incl. the v11 and v12 lessons, plus the b10 lesson: every figure value a key depends on is
readable (no key turns on a gap under half a tick). Topics: plant physiology (Ferrow bean seedlings; Sarn maple
reddening; Tessel grass germination), materials (Daltex film; steel coatings), hydrology (Brede tank covers; Marrow
Canal), animal behaviour (Lorn beetle chamber choice; Harl moths at lamps). Graded as batch **b11** in
`act-science-regrade/batches.json`, seed 2026102911. Rows are built from the batch file with the inserter's content
hash (`_coordinator/b11/rows.json`, generator `_coordinator/b11/gen_v12c.py`) and passed with `--from`; nothing is
inserted until `decide --write` has run.

**Amendment A1 (before any packet is built).** The cohort is not one complete 40-item form (4 RS / 3 CV / 2 DR), so b11
carries `"strictForm": false`, as b7-b10 did. Every other structural check applies.

**Instrument (unchanged from b8-b10).** `act-sci-packet.mjs`, `GRADER-BRIEF.md`, `GRADER-PROMPT.md`, drop rules R1-R8, two
FRESH graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on single-grader R2/R4 flags, coordinator
confirmations for R1/R3/R5/R7/R8, any drop takes its whole passage. The author may not grade, re-check or confirm. No
item is repaired in response to this round.

**Self-audit before grading (recorded, not a gate).** Table and figure keys recomputed by asserts in the generator
(maxima, two-condition filters, ratios, first-crossing, largest step, threshold set). P9's bar graph: the renderer draws
ticks at max/4 (23.5 points); the 45% cutoff is at least 11.75 points (half a tick) from every bar (30% and 62%), and
the maximum (94%) is 14 points above the next bar. No "Yes/No + reason" or "weakens X, because" item; CV options are
scientist labels only. Design items (P1-Q4, P2-Q5, P3-Q5): each option set was checked so the key is not the option
sharing the most levels with the others; P2-Q5 and P3-Q5 were rewritten once in self-audit for that reason. Scientific
Investigation items 9 (v12b had 4). Key letters A13 B13 C13 D13; key uniquely longest on 6 of 52.

**Bars (fixed now; range 0-9 passages).** Keep writing to the brief if >= 5 of 9 clear; revise the brief again if 3-4
clear; stop agent authoring of 6-item ACT Science and report to the owner if 0-2 clear.

**Release.** Cleared passages go to `science-release.json` and one blind-only co-founder run, as for v10a/b-v12b. No
bar on the blind run; release is the graders' decision.

**Invalid if.** A grader sees the key file, another grader's output, this cohort's explanations or the generator before
its cold pass; GRADER-BRIEF or the drop rules change after packets are built.
