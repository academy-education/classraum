# Pending lessons: iTEP SLATE Listening (brief itep-slate-listening-v1). Authors never read this file.

1. **2026-10-31, itep-listening-v1, probe 1 and probe 2 (counted 0/16 both times): Part 1 key never the shortest.**
   Cause is the assignment, not the authors: `assign.mjs` draws key length per author over all 14 items, and none of
   the 16 Part 1 items drew `shortest`. Draw key length (and script words) per part, so each part gets its share.
2. **Same batch, probe 1 (0/15) and probe 2 (0/7 after a revision round): one lecture template.** Three of four
   lectures named a popular belief and refuted it, whatever `stance` said (A "supports" a fix by rejecting "push
   through"; D "supports" a result by rejecting "old violins are better"). Assign per lecture whether a popular
   belief is named at all, and at most one lecture per form may refute one.
3. **Same batch, p3 graders a+b (counted; D lecture dropped), probe 2 5/5: sibling cueing in six-item sets**, mostly
   introduced by the probe revision round (D-L-5 rewritten so all four options open "Blind tests showing ...", which
   answers D-L-4; B-L-1's prompt names the thesis B-L-2/3 test). Add to R7: no prompt may state the script's main
   point or the speaker's position; after any revision, an author re-reads the whole set as a student would. Consider
   a sibling-only probe on revised sets before the gate.
4. **Same batch, p1 a, b, c (ITL1-A-D1-1 broken): relationship items in 2-3 turn dialogues.** "Is my aunt still
   picking us up?" / "Mom said she'll be there" made "cousins" depend on a pronoun. A relationship key needs an
   explicit role cue that survives one hearing, never a kinship inference through "she".
5. **Same batch, probe 2 (5/5, recorded): intent-next keys are the sensible plan of the person in charge** (coach,
   teacher, captain, parent). The revision round fixed "last plan stated" and left this. Draw per item whether the key
   is the plan of the higher-status speaker.
6. **Same batch, probe 2 (0/6, recorded): main-idea options naming one narrow episode are never keyed.** Same family
   as Reading v2 lesson 1; `whole-script options` 1/2/4 was drawn but the narrow option is never the key by
   construction. Allow a main-idea key that is the central episode when the conversation is one episode.
7. **Same batch, p2 a+b (2 items, under the 3-item bar): inference key names its subject ("The worms were ...",
   "These clerks were ...") where all three distractors open "They".** Watch in the next batch.
8. **Process.** Authors shared one scratchpad and one overwrote another's working file (D saw another lecture's
   opening). Give each author its own scratch directory. The prereg's packet plan was simulated by hand and wrong
   (26/30 vs the real 26/24/6): run `planPackets` on a mock population when writing the prereg.
