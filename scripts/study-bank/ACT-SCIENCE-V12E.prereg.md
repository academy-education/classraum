# ACT Science v12e — pre-registration (2026-10-29, before any grader sees an item)

**Why.** A further buffer cohort on the v12 brief, which cleared 8 of 9 passages with 0 no-source items in b10.

**Population.** One cohort, `act-science-v12e`: 4 research_summaries + 3 conflicting_viewpoints passages (6 items each)
+ 2 data_representation passages (5 items each), 52 items, written in one pass by one author (a coordinator fork) to
`ACT-SCIENCE-V10-BRIEF.md` incl. the v11 and v12 lessons and the b10 figure-readability rule. Topics: invented
compounds (Kelsite dissolving, torvane colour, compound Q yield), invented wetlands (Ostry Fen ponds, Halley Fen
frogs) and invented devices and acoustics (Torrin horns, Brennick filters, Merrow Hall echo, Pell generator
mufflers); none overlaps v11a or v12a-d. Graded as batch **b13** in `act-science-regrade/batches.json`, seed
2026102913. Rows are built from the batch file with the inserter's content hash (`_coordinator/b13/rows.json`,
generator `_coordinator/b13/gen_v12e.py`) and passed with `--from`; nothing is inserted until `decide --write` runs.

**Amendment A1 (before any packet is built).** The cohort is not one complete 40-item form (4 RS / 3 CV / 2 DR), so b13
carries `"strictForm": false`, as b7-b12 did. Every other structural check applies.

**Instrument (unchanged from b8-b10).** `act-sci-packet.mjs`, `GRADER-BRIEF.md`, `GRADER-PROMPT.md`, drop rules R1-R8,
two FRESH graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on single-grader R2/R4 flags, coordinator
confirmations for R1/R3/R5/R7/R8, any drop takes its whole passage. The author may not grade, re-check or confirm. No
item is repaired in response to this round.

**Self-audit before grading (recorded, not a gate).**
- Every table key is recomputed by asserts in the generator (differences, interpolation brackets, two-condition
  filters, ratios, counts); the generator refuses to write if any fails.
- v12 lessons: no "Yes/No + reason" or "weakens X, because" item; CV options are scientist/student labels or plain
  predictions, never quoted claims; no mirrored pairs.
- Coordinator's b11 rule (relayed mid-authoring): the two "which new trial" design items (P1-Q3, P4-Q3) have the
  factor and condition fixed in the stem and options that differ only in which held value matches an existing trial;
  no option fails on its own text. The other SI items read the design (variable changed, count of levels).
- b10 readability rule: both data_representation passages are tables (no unlabelled bar values).
- Changed before this prereg: P1-Q6 and P4-Q6 were base-condition items keyed "30" on the same option set as P1-Q3 and
  P4-Q3 (a possible cross-item rule); replaced by a level count and a two-variable comparison.
- Key letters A13 B13 C13 D13; key uniquely longest on 3 of 52. Domains IoD 27 / SI 5 / EMI 20 (SI below the ~7
  asked; fewer SI accepted rather than risk the rule-1 design tell).

**Bars (fixed now; range 0-9 passages).** Keep writing to the brief if >= 5 of 9 clear; revise the brief if 3-4 clear;
stop agent authoring of 6-item ACT Science and report to the owner if 0-2 clear. (Same as V12B.)

**Release.** Cleared passages go to `science-release.json` and one blind-only co-founder run, as for v10a/b-v12b.

**Invalid if.** A grader sees the key file, another grader's output, this cohort's explanations or the generator before
its cold pass; GRADER-BRIEF or the drop rules change after packets are built.
