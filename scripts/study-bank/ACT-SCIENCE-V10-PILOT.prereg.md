# ACT Science v10 pilot — pre-registration (2026-10-27, before any v10 item is written)

**Question.** Does the v10 brief (`ACT-SCIENCE-V10-BRIEF.md`) lift passage survival under the unchanged agent gate?
The v5-v9 baseline is 7 of 84 passages (8.3%); for the 6-item formats it is 1 of ~60.

**Population.** Two cohorts written to the brief by two separate Claude authoring agents: act-science-v10a and
act-science-v10b, each 4 research_summaries + 3 conflicting_viewpoints passages (42 items, 7 passages), 84 items and 14
passages in all. Inserted staged (verified=false, hidden) before grading; graded as batch **b7** in
`act-science-regrade/batches.json` (seed 2026102707).

**Instrument.** Unchanged from `ACT-SCIENCE-AGENT-RELEASE.prereg.md`: `act-sci-packet.mjs`, `GRADER-BRIEF.md`,
`GRADER-PROMPT.md`, drop rules R1-R8, two fresh graders (g1, g2) cold then keyed, one fresh re-check grader (r1) on
single-grader R2/R4 flags, coordinator confirmations for R1/R3/R5/R7/R8, any drop takes its whole passage. No author
sees a grade before the round is decided; no item is repaired in response to this round (a repair is a new batch).

**Bars (fixed now).** The control's attainable range is 0-14 passages, so both bars sit inside it.
- **Scale up** the brief (author enough cohorts for two more forms) if **at least 7 of 14 passages clear (>= 50%)**.
- **Revise the brief, do not scale** if 3-6 of 14 clear.
- **Stop agent authoring of 6-item ACT Science and report to the owner** if 0-2 of 14 clear.

**What would make this invalid.** A grader who cannot read a figure (the packet refuses svg; the brief bans it); an
author or grader seeing another's output; any change to GRADER-BRIEF.md or the drop rules after packets are built.

## Amendment A1 (2026-10-27, before any b7 packet was built)

`act-sci-packet.mjs` refused b7 because its structure check requires each cohort to be a complete 40-item form
(2 DR / 3 RS / 2 CV), and the pilot is deliberately RS/CV only. b7 carries `"strictForm": false` in batches.json, and
`build` / `decide` pass it to `structure()` (the option already existed and is exercised by the selftest). Every other
check still applies: passage sizes (RS 6, CV 6), identical figure per passage, staged rows only, 4 distinct choices
containing the key, unique ids. b1-b6 are unaffected (no `strictForm` key = strict). Grading rules are unchanged.
The rows are graded from `_coordinator/b7/rows.json` (built from the two batch files) via `--from`, because the
inserter requires a QC ledger entry, which is produced by this grading.
