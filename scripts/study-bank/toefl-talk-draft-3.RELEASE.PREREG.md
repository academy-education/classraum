# TOEFL Academic Talk draft 3 (48 items): release route, pre-registered (2026-10-23)

**Committed with the staged insert, before any run is drawn.**

TOEFL Listening upper/hard is bound by academic_talk at 15 clean sittings. Drafts 1-2 are queued. This draft adds
12 lectures × 4 questions, written by two Claude agents.
- A: Channeled Scablands, the marshmallow test and trust, fire suppression, painted Greek sculpture, why ice is
  slippery, the Library of Alexandria.
- B: periodical cicadas, Weber vs. the literacy explanation, diamond's stability, Muybridge and Rodin, "30% chance
  of rain", dairying residues.

B's first B01 and B02 duplicated topics in toefl-passage-draft-3 (waggle dance, weak ties) and were replaced before
staging. Topics were checked against 110 live and staged talks. The load-bearing element was varied lecture by
lecture. Author A stored every key in slot A, so build-insert dealt the keys flat: 12/12/12/12. Students' choices
are also re-shuffled at draw (assembleToeflFromBank → shuffleDrawnChoices), and review runs deal their own
shown_order. **Co-founder-standard grader, briefs A and B: 0/48 flagged.**

**Recorded on the way:** toefl-talk-draft-1 and -2 are stored with every key in slot A (20/0/0/0 and 48/0/0/0).
This is latent only, for the same two reasons above. It becomes live only if a serve path stops shuffling.

## Release route
One spot run via `draw-toefl-conv-runs.mjs` (3 lectures, 12 items).
- All "Only defensible": all 48 are released.
- Any flag: that lecture is archived and the rest go to a full sitting.
