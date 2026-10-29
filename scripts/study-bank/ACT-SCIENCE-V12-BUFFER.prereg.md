# ACT Science v12a buffer — pre-registration (2026-10-29, before any grader sees an item)

**Why.** b8 (v11a) cleared 1 of 7 passages: every key was right, and the passages died on the template tells
recorded in `ACT-SCIENCE-V10-BRIEF.md` "v11 lessons". This cohort is the next buffer, written to the amended brief.

**Population.** One cohort, `act-science-v12a`: 4 research_summaries + 3 conflicting_viewpoints passages, 42 items,
written in one pass by one author (a coordinator fork) to `ACT-SCIENCE-V10-BRIEF.md` including "v11 lessons". Graded as
batch **b9** in `act-science-regrade/batches.json`, seed 2026102909, `strictForm: false`. Rows are built from the batch
file with the inserter's content hash (`_coordinator/b9/rows.json`, generator `_coordinator/b9/gen_v12a.py`) and passed
with `--from`; nothing is inserted until `decide --write` has run.

**Instrument (unchanged from b8).** `act-sci-packet.mjs`, `GRADER-BRIEF.md`, `GRADER-PROMPT.md`, drop rules R1-R8, two
FRESH graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on single-grader R2/R4 flags, coordinator
confirmations for R1/R3/R5/R7/R8, any drop takes its whole passage. The author may not grade, re-check or confirm.
No item is repaired in response to this round (a repair is a new cohort).

**Self-audit before grading (recorded, not a gate).** Every table key recomputed by script from the cells. Changed
before this prereg: the P7 "agree" item's distractors rewritten so all four options are general claims (the b8 tell);
the three Yes/No items were one template (key = the within-one-experiment comparison), so P1's became a true claim
with a "Yes" key and P4's became a choose-the-comparison design item; one Yes/No item per passage at most (P1, P2).
Key letters flat (A11 B11 C10 D10); key uniquely longest on 3 of 42. Domains IoD 17 / SI 7 / EMI 18.

**Bars (fixed now; range 0-7 passages, both inside it).** Keep writing to the brief if >= 4 of 7 clear; revise the
brief again if 2-3 clear; stop agent authoring of 6-item ACT Science and report to the owner if 0-1 clear.

**Release.** Cleared passages go to `science-release.json` and one blind-only co-founder run, as for v10a/b and v11a.
No bar on the blind run; release is the graders' decision.

**Invalid if.** A grader sees the key file, another grader's output, this cohort's explanations or the generator before
its cold pass; GRADER-BRIEF or the drop rules change after packets are built.
