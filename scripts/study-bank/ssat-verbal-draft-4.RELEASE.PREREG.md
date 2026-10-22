# SSAT Verbal draft 4 (158 items): release route, pre-registered (2026-10-23)

**Committed with the staged insert, before any run is drawn.**

## Why
One student has 2 SSAT Verbal tests left. Drafts 2 and 3 are queued behind the co-founder's open run. The owner said
on 2026-10-23: "Make other tests as well. Use more agents."

## The batch
Two Claude agents wrote the batch: 80 analogies (V6A01-80) and 80 synonyms (d7).
- **Analogies:** no stem, key or distractor pair appears in the 5,870-entry pair list, in either order, and none
  overlaps draft 3.
- **Key position:** dealt flat, 16 per slot per subskill. Key uniquely longest: 9/80 analogies and 15/80 synonyms.

**Co-founder-standard grader (briefs A and B):**
- **V6A30** "darkness : light :: anarchy : government": both briefs flagged it, because "whisper : yell" reads as
  a second opposite pair.
- **V6A64** "callow : experience": brief A flagged it, because of "fledgling : flight".

Both items were dropped, leaving 158 (78 analogies + 80 synonyms). batch sha256
877419d71c636ff457323f60f47a91dd9c97c749109b1359cb29b92bed4ccf9f.

## Release route
Same route as drafts 2 and 3: two 12-item spot runs, up to 2.
- If every item comes back "Only defensible", all 158 are released.
- If any item is flagged, that item is archived and the rest go to a full sitting.

Release with `release-toefl-conv-runs.mjs ssat-verbal-draft-4`, where every item is a set of one.
