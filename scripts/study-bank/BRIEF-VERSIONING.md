# Brief versioning: batch the lessons, stop resetting trust (owner-approved 2026-10-29)

## Why

Under Amendment 3 a **method** is (authoring brief, construction, author type, grader brief). Any change to the
brief is a new method: the stratum drops to L0 and Daniel has to sit a 12-item bridge before anything earns a spot
or a pool again. On 2026-10-29 every queued verbal stratum sat at **L0, bridge pending**, because the briefs had been
amended after almost every grading round. The trust system was working; the brief churn kept restarting it.

The owner does not want a second reviewer (memory: no-second-reviewer). Fewer resets is how Daniel's load comes down.

## The rule

1. **One brief version per stratum per wave.** A version is frozen when its first batch is written. Every batch
   authored until the next cut uses the frozen text unchanged, and its `autonomy-methods.json` entry carries that one
   method id.
2. **Lessons go to a pending file, not the brief.** When a grader, Daniel's note, or an attack names a new tell,
   append it to `scripts/study-bank/briefs/<stratum-slug>.pending.md` with the date, the batch, the evidence, and
   who named it. Do not edit the frozen brief. The author of the next batch may NOT read the pending file.
3. **Cut a new version only when one of these holds:**
   - **Earned:** the current version has closed its bridge and at least one L1 spot (its evidence is banked; the
     next version starts with the previous one's items at half weight, per Amendment 3 §3).
   - **Blocking:** the same tell is named independently by both graders (or confirmed by R8 blind re-application)
     in **two consecutive batches** of the current version. One batch's tell is a pending lesson, not a cut.
   - **Broken:** the gate yield on the current version falls into the prereg's "stop" band.
4. **A cut folds in every pending lesson at once**, gets a new method id, and is recorded in REGISTER.md §5 with
   the lessons it absorbed.
5. **Sections where this costs nothing:** blind-only sections (`act/science/*`, `map/science/*`). Daniel's picks
   there are not evidence and release is the agents' decision, so their briefs can change between batches without
   touching anyone's review load. Maths is out of scope (exact checkers gate it).

## How to apply when spawning an author

- Give it the frozen brief by path and version, never the pending file.
- If the batch would be the stratum's first under a new cut, say so in its prereg: it will be drawn as a bridge.
- When a grader names a tell, write the pending lesson in the same commit as the grade results.
