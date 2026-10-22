# ISEE Reading drafts 6-8: release route, pre-registered (2026-10-23)

**Committed with the staged inserts, before any run is drawn.** Nothing here changes after a draw.

## Why
ISEE Reading is the shallowest admission section: 3 clean forms, and one student has 2 left. Drafts 4 and 5
(72 items) are queued. These three add 108 more. The owner's instruction is the same as for SSAT drafts 9-10
(2026-10-23).

## The batches
`isee-reading-draft-6`, `-7` and `-8`: 6 passages x 6 four-choice items = 36 each. Three Claude agents wrote
them to `SSAT-READING-AGENT-BRIEF.md` with the ISEE overrides; the quality bar was `isee-reading-draft-5.authored.py`.

| cohort | passages |
|---|---|
| draft-6 | Seven Stakes (garden dispute) · Thumbprint (poem, frost) · Window Light (paint counter job) · Written After (postscripts) · The Turn Rule (canal lock, invented) · A Map in the Field (loggerhead navigation) |
| draft-7 | Egg Loft (model rocket) · The Fence Oak (poem) · Corners (folding sheets with a sister) · The Drawer (waiting before revising) · Two Books for Three Weeks (first library, invented) · The Underground Farm (leafcutter ants) |
| draft-8 | The Long Way (lost beagle) · Crossing (poem, freight train) · Averses (learning French) · The Missing Apron (what museums keep) · Two Clocks in the Window (clockmaker, invented) · Ears in the Dark (bats and moths) |

**Pre-flight checks, all three:**
- `merge.mjs`: 0 problems.
- Quote check: 0 unmatched.
- Location check: 0 mismatches.
- Keys 9/9/9/9 in every batch. Key uniquely longest 5, 7 and 5 of 36; uniquely shortest 3, 7 and 6.

**Co-founder-standard grader, briefs A and B: 0/108 flagged.**

## Release route (option-2, Amendment 1)
- **draft-6 (full):** the every-third ISEE batch (drafts 4 and 5 are spot). One 36-item run.
- **draft-7 (spot):** seeded passage `iseedraft7-IR7-P04`, 6 items.
- **draft-8 (spot):** seeded passage `iseedraft8-IR8-P05`, 6 items.

For each spot run, all "Only defensible" releases all 36. Any flag archives that item and sends the rest to a
full sitting.
