# ACT Science v12b — pre-registration (2026-10-29, before any grader sees an item)

**Why.** A second buffer cohort written in parallel with v12a (b9), to the same brief, with two data_representation
passages added so the cohort can help complete forms. Written after the coordinator relayed the b9 result (3 of 7
cleared) and its two new tells, which were applied before this prereg (see Self-audit).

**Population.** One cohort, `act-science-v12b`: 4 research_summaries + 3 conflicting_viewpoints passages (6 items
each) + 2 data_representation passages (5 items each), 52 items, written in one pass by one author (a coordinator fork)
to `ACT-SCIENCE-V10-BRIEF.md` incl. "v11 lessons" and the v12 lessons. Graded as batch **b10** in
`act-science-regrade/batches.json`, seed 2026102910. Rows are built from the batch file with the inserter's content
hash (`_coordinator/b10/rows.json`, generator `_coordinator/b10/gen_v12b.py`) and passed with `--from`; nothing is
inserted until `decide --write` has run.

**Amendment A1 (before any packet is built).** The cohort is not one complete 40-item form (it has 4 RS / 3 CV / 2 DR),
so b10 carries `"strictForm": false`, as b7-b9 did. Every other structural check applies.

**Instrument (unchanged from b8/b9).** `act-sci-packet.mjs`, `GRADER-BRIEF.md`, `GRADER-PROMPT.md`, drop rules R1-R8, two
FRESH graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on single-grader R2/R4 flags, coordinator
confirmations for R1/R3/R5/R7/R8, any drop takes its whole passage. The author may not grade, re-check or confirm. No
item is repaired in response to this round.

**Self-audit before grading (recorded, not a gate).** Every table and figure key recomputed by script from the cells
(26 checks). Applied from the b9 lessons: no "Yes/No + reason" item and no "weakens X, because" item anywhere; design
items have no modal option set (each level appears once), no mirrored pair and no trivially invalid design; CV options
are scientist labels, never quoted claims. Changed before this prereg: P1-Q5 had overlapping ranges ("longer than 19"
and "longer than 80") and was replaced by a two-variable comparison; P7-Q5's condensation option could plausibly
separate the viewpoints and was replaced by a season test neither predicts. The first packet build flagged a render warning on P8 (blank table row labels); P8's table was relabelled by height and the packets rebuilt before any grader saw them. Key letters flat (A13 B13 C13 D13); key
uniquely longest on 4 of 52. Domains IoD 31 / SI 4 / EMI 17 (SI is light; recorded, not changed).

**Bars (fixed now; range 0-9 passages).** Keep writing to the brief if >= 5 of 9 clear; revise the brief again if 3-4
clear; stop agent authoring of 6-item ACT Science and report to the owner if 0-2 clear. (Same proportions as V12's
4 / 2-3 / 0-1 of 7.)

**Release.** Cleared passages go to `science-release.json` and one blind-only co-founder run, as for v10a/b-v12a. No
bar on the blind run; release is the graders' decision.

**Invalid if.** A grader sees the key file, another grader's output, this cohort's explanations or the generator before
its cold pass; GRADER-BRIEF or the drop rules change after packets are built.
