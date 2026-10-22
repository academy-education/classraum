# SSAT Reading drafts 9-10: release route, pre-registered (2026-10-23)

**Committed with the staged inserts, before any run is drawn.** Nothing here changes after a draw.

## Why
Owner, 2026-10-23: "Run many agents as possible and keep going without me telling you to. I want more questions of
SSAT, or any other tests that we need that are stuck." SSAT Reading is at 6 clean forms. Students are at 2, 3 and 4
left. Drafts 3-8 are already staged or queued.

## The batches
`ssat-reading-draft-9` and `-10`: 6 passages x 6 items = 36 each. Two Claude agents wrote them to
`SSAT-READING-AGENT-BRIEF.md`, each with its own subject areas. The existing-passages list was refreshed with all
staged drafts before authoring.

| cohort | passages |
|---|---|
| draft-9 | High Water (hiking plan, flooded creek) · Rooftop, August (poem) · The Long Brush (sign-painting mentor) · Proof of Arrival (thank-you notes) · Rowed In (lifeboat crew, invented Brenmouth) · Bright and Wrong (flashbulb memories) |
| draft-10 | Hearts (ice-storm outage) · Schedule (poem, rain garden) · Bed by the Window (hospital stay) · Twelve Steps (zoos) · Pine and Stars (weavers' cooperative, invented) · Pale Reefs (coral bleaching) |

**Pre-flight checks, both batches:**
- `merge.mjs`: 0 problems.
- `check-explanation-quotes`: 0 unmatched.
- Location check: 0 mismatches.
- Key uniquely longest 5/36 and 7/36; uniquely shortest 3/36 and 7/36.

**Co-founder-standard grader, briefs A and B:**
- draft-10: 0/36 flagged.
- draft-9: 1/36 flagged (A only). D9-P03-4 had a second defensible distractor ("wanted the narrator to become a
  professional sign painter like her"). It was replaced before staging with "had meant the brush for an earlier
  student who stopped coming", which the tape's "my initials" contradicts. Checks were rerun clean.

## Release route (option-2, Amendment 1)
- **draft-9 (spot):** one seeded passage, `draft9-D9-P05` (sha256 of the cohort name mod 6), 6 items. All "Only
  defensible" releases all 36. Any flag archives that item and sends the rest to a full sitting.
- **draft-10 (full):** the every-third-batch full sitting (draft 7 was the last). One 36-item run, released by the
  drafts-5-8 rule.
