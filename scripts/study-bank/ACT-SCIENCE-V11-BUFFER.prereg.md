# ACT Science v11a buffer — pre-registration (2026-10-29, before any grader sees an item)

**Why.** ACT Science serves 3 forms (form-capacity, 130 drawable). The v10 pilot cleared 11/14 passages and, with the
v5c-v8b survivors, the six queued blind-only runs reach about 5 forms with no spare. This cohort is buffer: research
summaries and conflicting viewpoints passages only, since data representation is not the binding format.

**Population.** One cohort, `act-science-v11a`: 4 research_summaries + 3 conflicting_viewpoints passages, 42 items,
written in one pass by the coordinator to `ACT-SCIENCE-V10-BRIEF.md` (no other author). Graded as batch **b8** in
`act-science-regrade/batches.json`, seed 2026102908, `strictForm: false` (A1 of the v10 pilot, same reason). Rows are
built from the batch file with the inserter's own content hash (`_coordinator/b8/rows.json`) and passed with `--from`;
nothing is inserted until `decide --write` has run.

**Instrument (unchanged).** `act-sci-packet.mjs`, `GRADER-BRIEF.md`, `GRADER-PROMPT.md`, drop rules R1-R8, two FRESH
graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on single-grader R2/R4 flags, coordinator confirmations
for R1/R3/R5/R7/R8, any drop takes its whole passage. The author is the coordinator, so the coordinator may NOT act as
a grader or re-check grader; confirmations it makes (R3/R5) must cite a recomputation in `confirm.json`. No item is
repaired in response to this round (a repair is a new cohort).

**Self-audit before grading (recorded, not a gate).** Fixed before this prereg: two CV support items whose key was the
only option echoing the finding (R8 pattern from b1) now have finding-echoing distractors; the frog passage's day-length
numbers were recomputed from solar declination at ~49°N (a 16-hour longest day cannot fall below 15 hours by mid-July;
it now falls below 15.5 hours near July 21). Key letters flat (A11 B11 C10 D10); key uniquely longest on 12/42.

**Release.** Cleared passages go to `science-release.json` and one blind-only co-founder run, as for v10a/b. No bar on
the blind run (none is pre-registered for science buffers); release is the graders' decision.

**Invalid if.** A grader sees the key file, another grader's output, or this cohort's explanations before its cold
pass; GRADER-BRIEF or the drop rules change after packets are built.
