# TOEFL Academic Passage draft 3 (60 items): release route, pre-registered (2026-10-23)

**Committed with the staged insert, before any run is drawn.**

## Why
TOEFL Reading upper/hard is bound by academic_passage at 20 sittings, and the student on that path has 3 left.
Drafts 1 and 2 (60 items) are queued. This draft adds 60 more (12 passages). Owner, 2026-10-23: "Run many
agents as possible and keep going ... more questions of ... any other tests that we need that are stuck."

## The batch
12 passages × 5 four-choice items, 220-252 words, 3 paragraphs each, written by two Claude agents in parallel.
- A: honeybee waggle dance, Kirkwood gaps, Laennec's stethoscope, Granovetter's weak ties, Norfolk four-course
  rotation, Parthenon refinements.
- B: Venus flytrap closing, Nansen/Ekman transport, Lloyd's coffeehouse, subitizing, Mendeleev's gaps and
  gallium, Cristofori's piano.

Topics were checked against 103 live and staged academic passages. Keys are dealt flat by build-insert:
15/15/15/15. **Co-founder-standard grader, both briefs (A and B): 0/60 flagged.** TOEFL Reading is not the arm
where the grader was proven, so this is a pre-flight check, not evidence.

## Release route (Amendment 1 of the option-2 prereg)
One spot run via `draw-toefl-conv-runs.mjs` (2 passages, 10 items).
- All "Only defensible": all 60 are released.
- Any flag: that passage is archived and the remaining passages go to a full sitting first.
