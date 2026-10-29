# ACT Science v12f — pre-registration (2026-10-29, before any grader sees an item)

**Why.** A further cohort on the brief that b10 (v12b) showed works (8 of 9 passages, 0 no-source items), written in
parallel with v12c (b11) and v12d (b12), owner request "use more agents to make more tests".

**Population.** One cohort, `act-science-v12f`: 4 research_summaries + 3 conflicting_viewpoints passages (6 items
each) + 2 data_representation passages (5 items each), 52 items, written in one pass by one author (a coordinator
fork) to `ACT-SCIENCE-V10-BRIEF.md` incl. the v11 and v12 lessons and the b10 figure-readability rule. Topics:
invented human-physiology conditions (Corrin tremor, the Dunmere cough, Brell marker), invented ocean currents
(Marrow Current, Telmar upwelling, Kesh Current, Ollin Bay) and invented materials (Corvane foam, Lumite tiles);
no named law, no real dataset. Graded as batch **b14** in `act-science-regrade/batches.json`, seed 2026102914. Rows
are built from the batch file with the inserter's content hash (`_coordinator/b14/rows.json`, generator
`_coordinator/b14/gen_v12f.py`) and passed with `--from`; nothing is inserted until `decide --write` has run.

**Amendment A1 (before any packet is built).** The cohort is not one complete 40-item form (4 RS / 3 CV / 2 DR), so
b14 carries `"strictForm": false`, as b7-b12 did. Every other structural check applies.

**Instrument (unchanged from b8-b10).** `act-sci-packet.mjs`, `GRADER-BRIEF.md`, `GRADER-PROMPT.md`, drop rules R1-R8,
two FRESH graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on single-grader R2/R4 flags, coordinator
confirmations for R1/R3/R5/R7/R8, any drop takes its whole passage. The author may not grade, re-check or confirm. No
item is repaired in response to this round.

**Self-audit before grading (recorded, not a gate).** Every table and figure key recomputed in the generator
(asserts on the maxima, the 10-day distances = speed x 8.64, the 40% and 8 cm/s per decade, the porosity count, the
Brell ratios and the dive-limit count). No Yes/No + reason or "weakens X, because" item; no "would most likely agree"
item; design items use each level once with no mirrored pair; CV options are scientist labels or neutral
observations. Every Figure 1 (P9) value is a multiple of 3 m, on an axis tick, and the 7.5-m limit sits half a tick
from the nearest bars. Changed before this prereg: P1-Q3's stem said "long chill" and only one option was long (now
every option is an 8-minute chill differing in temperature); P1-Q6's key was the only general option (replaced by a
held-constant item); P2-Q3's key was the only widely spread set of distances (distractors now spread too); P7-Q3's
options evened in length. After the coordinator relayed the b11 design-item tell (the key was the only option that both
varies the factor and sets the condition), P3-Q3 and P4-Q3 were rebuilt so all four options share the factor and the
condition and differ only in a passage detail (which temperature dented most; which buoy had the most nitrate); P1-Q3
and P2-Q3 already had that shape; P7-Q3 names a scientist, not the factor. Key letters flat (A13 B13 C13 D13); key uniquely longest on 5 of 52. Domains IoD 32 / SI 7
/ EMI 13.

**Bars (fixed now; range 0-9 passages).** Keep writing to the brief if >= 5 of 9 clear; revise the brief again if 3-4
clear; stop agent authoring of 6-item ACT Science and report to the owner if 0-2 clear (the V12B bars).

**Release.** Cleared passages go to `science-release.json` and one blind-only co-founder run, as for v10a/b-v12b. No
bar on the blind run; release is the graders' decision.

**Invalid if.** A grader sees the key file, another grader's output, this cohort's explanations or the generator before
its cold pass; GRADER-BRIEF or the drop rules change after packets are built.
