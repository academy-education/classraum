# Wave 6 release routes, pre-registered (2026-10-23)

**Committed with the staged inserts, before any run is drawn.**

Owner (2026-10-23): "Make other tests as well. Use more agents. Use many as you can." These are the thinnest
sections by form-capacity: ACT Science at 3 forms, and ACT Reading and ISEE Reading at 4.

## ACT Science v8a and v8b (2 sections, 80 items)
- Two Claude agents wrote to the v7 brief, with every live and staged ACT Science passage (91) excluded.
- `act-bank-helper` structure: OK on both.
- **Co-founder-standard grader A+B: 0/80.** All arithmetic re-derived by both graders.
- Staged with `BANK_VERIFIED=false` and `BANK_GATE_OVERRIDE`.
- **Route:** v7a was the family's full sitting, so both v8 sections are spot runs. The spot is the passage at sha256
  of the cohort name, mod 7: v8a `sc8a-p5` (5 items), v8b `sc8b-p4` (6 items).

## ACT Reading v11a and v11b (2 sections, 72 items)
- Two Claude agents wrote to the v10 brief, with 196 live and staged passages excluded.
- **Topic switches:** the authors replaced three assigned topics that collided with live passages: piano repair
  became a volunteer weather observer, and the mural restoration became publishing a writer's drafts (paired).
- **Co-founder-standard grader A+B: 0/72.**
- **Route:** v10a was the family's full sitting, so both are spot runs. The spot is sha256 mod 4: v11a `arv11a-p1`,
  v11b `arv11b-p2` (9 items each).
- **Recorded:** the v11b story (two cousins clearing a grandparent's bait shop) is close in situation to the live
  ACT story "The Duplicate Drawer". The author flagged it, and the details and conflict differ.

## ISEE Reading draft 13 (36 items)
- One Claude agent wrote to the SSAT reading brief, with the ISEE overrides.
- **Topic switches:** two areas were switched because they collided with drafts 5 and 7: school start times became
  group projects, and the first library became storm-warning flags.
- **Co-founder-standard grader:** A 1/36 and B 1/36, the same item. In IR13-P03-5, the distractor "show that Mrs.
  Brandt expected the narrator to forget to feed it" is supported by her closing line. It was replaced with "warn the
  narrator that the starter must be kept in a cold place", which the passage does not support. The merge, quote and
  location checks were rerun clean.
- **Route:** draft 12 was the full sitting, so this is a spot run. The spot is sha256 mod 6: `iseedraft13-IR13-P02`.

## Rule (unchanged option-2 route)
- If the spot comes back all "Only defensible", the cohort is released.
- If anything is flagged, that passage is archived and the rest go to a full sitting.
- The next batch of each family gets the every-third full sitting.
