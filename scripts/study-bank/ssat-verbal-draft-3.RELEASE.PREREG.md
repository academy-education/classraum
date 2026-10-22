# SSAT Verbal draft 3 (159 items): release route, pre-registered (2026-10-23)

**Committed with the staged insert, before any run is drawn.**

## Why
SSAT Verbal has 10 clean forms, and one student has 2 left. Draft 2 (160) is queued. The owner said on
2026-10-23: "Run many agents as possible and keep going ... more questions of SSAT".

## The batch
Two Claude agents wrote the batch: 80 analogies (V4A01-80) and 80 synonyms.
- **Analogies:** no stem, key or distractor pair appears in the 4,922-entry pair list, in either order. That list
  covers every SSAT analogy, including staged draft 2. Relations are spread 3-7 per type.
- **Synonyms:** every headword is new against 626 SSAT and ISEE headwords, draft 2 included. The part-of-speech
  split is 36 adjectives, 24 verbs and 20 nouns.
- **Key position:** the build script deals keys flat at 16 per slot. Key uniquely longest: 15/79 analogies and
  10/80 synonyms.

**Co-founder-standard grader (briefs A and B):** both flagged the same 1 of 160, V4A17 "tug : yank :: push : shove",
because "drag : haul" reads as the same mild-to-forceful pull. That item was dropped, leaving 159.

## Release route
The same route as draft 2: two 12-item spot runs, up to 2.
- If every item comes back "Only defensible", all 159 are released.
- If any item is flagged, that item is archived and the rest go to a full sitting.

Release with `release-toefl-conv-runs.mjs ssat-verbal-draft-3`, where every item is a set of one.
