# SSAT Reading drafts 5-8: co-founder RELEASE sittings, pre-registered (2026-10-22)

**Committed with the staged inserts, before any run is drawn.** Nothing here changes after a draw.

## Why
Owner, 2026-10-22: "Yes make a lot more. We should not have any bottleneck questions. Use many agents as needed."
SSAT Reading is the binding SSAT section (5 clean forms; math 12, verbal 10). With drafts 3 and 4 queued and these
four, it can reach about 11 forms if the sittings release most items.

## The batches
Four cohorts, `ssat-reading-draft-5` … `-8`, 6 passages x 6 items = 36 each, **written by four Claude agents in
parallel** to `scripts/study-bank/SSAT-READING-AGENT-BRIEF.md`, which carries draft 4's rules (the co-founder's ISEE d1
notes), each agent with its own subject areas so no two batches share a topic. Every passage opening was checked
against the 122 live and staged SSAT/ISEE/MAP reading passages.

| cohort | passages |
|---|---|
| draft-5 | Backspin (table tennis) · Noon (poem, library steps) · A Little at a Time (scallion pancakes) · Ten Minutes (phones settle arguments) · The Nickel Cars (jitneys, invented town) · The Late Moon (Rømer, speed of light) |
| draft-6 | Two Hundred Twelve Bars (cymbal player) · Orb Weaver (poem) · Ardel, 4:12 a.m. (stranded train) · Close the Book (retrieval practice) · Lisle's Fork (river survey, invented) · Rings of Ice (hail) |
| draft-7 | The Patch (borrowed tent) · The Pantry Door (poem, height marks) · Twenty-Five Cents a Shirt (ironing) · Leave It Be (fledglings) · Numbers on the Gateposts (house numbers, invented) · The Hole in Sight (blind spot) |
| draft-8 | Short Count (hinges by weight) · Undertow (poem) · The Yellow Patch (visible mending) · Three Syllables (names) · Garrow Blue (uncredited glaze maker, invented) · Two Become One (lichens) |

**Author's review (in-session, all 144 items read with passage and key), and what it changed:**
- Two memoirs never stated the narrator's gender while their items said "his/her": one line added to each passage
  ("I was his little brother", "whether his daughter had fallen asleep").
- One prompt asked when an argument was "finally settled" although the passage says the uncle kept insisting for
  years; reworded to "finally found the answer".
- One key named "a neighbor's lawn" where the passage names the Ostranders but never calls them neighbors.
- Six attitude sets shared 3 words with a set in another batch (his note was about reuse across passages); swapped
  for same-direction words so every rationale still holds. Cross-batch overlap is now at most 2.
- Key uniquely longest was 2-4 of 36 in every batch (under chance, the reverse tell). The longest distractor was
  trimmed by filler words on 14 items: now 6/7/6/7 of 36; uniquely shortest 6/1/4/4.
- `merge.mjs` gained a per-passage slot cap (at most 3 keys on one letter in a passage) after draft 7's deal put 5
  of 6 science keys on E. Deterministic re-deal, logged.
- Science facts checked by the author: Io's ~42.5 h period, Rømer's 1676 ten-minute prediction and the ~22 min
  contemporary estimate; retrieval practice; hail growth (dry/wet layers, few trips per stone); the blind spot
  (optic disc, ~1M fibers, Mariotte 1660s); lichens (Schwendener 1867, the 2016 yeast partner). Rome is ~1.2°
  north of New York. The hinge arithmetic (190 and 186 from 105 and 147 lighter hinges) is exact.

**Mechanical pre-flight, all four:** `merge.mjs` 0 problems; `check-explanation-quotes.mjs` 0 unmatched
(289/314/297/314 fragments); `check-location-refs` 0 mismatches (37 checked, 16 skipped as unquoted and checked by
hand by the agents); edit screen 36/36 each; no content hash already in the bank.

**Not run, stated plainly:** no AI options-only attack and no independent AI grader. The sitting is the gate.
Agent-written SSAT reading failed three earlier rounds (memory `ssat-reading-agent-authoring-stopped`) on an AI
attack that does not reach a person on this family; whether these clear a human sitting is what the runs measure.

## The runs
One run of 36 per cohort, reviewer `support@classraum.com`, drawn by `draw-next.mjs` from `cofounder-queue.json`
(entries interleaved with the TOEFL queue so TOEFL Listening, also near run-out, is not pushed back days). Same
panel as draft 1. The drawer refuses a second open run.

## Release rule (draft 1's rule, unchanged, applied per cohort)
1. **Batch guard, first.** Blind score >= 18/36 (50%): NOTHING from that cohort is released.
2. Per item: "Only defensible" -> `verified=true`; any other verdict -> `archived=true`, not repaired.
3. Per passage: 2+ of its 6 items flagged -> archive the whole passage.
4. Unanswered items stay staged. Release script: `release-ssat-reading-draft2-2026-10-21.mjs` pattern, cohort
   swapped. After each release: `admission-form-depth.ts`, update `depth-snapshot.json`.

## What these runs can show
Drafts 5-8 are the first agent-written reading batches since agent authoring stopped, and draft 4 is the in-session
batch to the same rules. Report per-cohort blind accuracy and flag counts against draft 4's and against drafts 1-3.
A cohort whose blind score is far above the others', or whose passages draw 2+ flags, says the agent route needs the
same stop it had before; record it either way.

## Known limits
One reader; n=36 per cohort (about +/-13 points). By draft 8 he will have sat 280+ siblings written to one brief.
