# MAP Language v4 (Grammar and Usage + Writing + Mechanics) — pre-registration

Written 2026-10-31, AFTER the 240 items were authored and staged (a stated deviation: the author agent built
packets before a prereg existed and flagged it), and BEFORE any grader has run or any packet has been opened by a
reviewer.

**Why.** Owner, 2026-10-31: "We need at least 10 tests worth of questions for each test." MAP Language is 0 forms
live. About 5 forms of v2 and v3 stock await release through Daniel's audit. v4 adds the next 5 forms (13 per area per
form, 65 per area, plus about 20%).

## Fixed now

- **Items (frozen as staged).** `map-language-v4-grammar` 80, `map-language-v4-writing` 80,
  `map-language-v4-mechanics` 80, all verified=false (confirmed by query). Source files are in
  `map-v2-work/language-v4/`. Nothing is edited after this commit; a dropped item stays dropped.
- **Pre-flight.** `map-v2-work/language-v4/lu4-check.mjs` passed with every denominator printed. It read 240 items,
  334 exclusion keys and 409 bank rows; the spelling oracle confirmed 30 + 30 targets. It is pre-flight, not the
  gate.
- **Gate.** The agent-review instrument with Amendment A1, unchanged from v3: three fresh graders per packet on
  COFOUNDER-BRIEF-v2 (a and b plain, c adversarial). Any single grader's non-unique verdict drops the item. A
  pattern named by two graders on 3 or more shared items drops those items. A cohort-wide pattern holds the cohort.
  Answer-letter patterns are excluded (draw-time shuffle). Manifest:
  `scratchpad/agent-review/MANIFEST-map-language-v4.json`, 6 packets x 40 = 18 graders. Scored with
  `agent-review-score.mjs --manifest … --out agent-review/results-map-language-v4`.
- **Method.** Grammar and Writing were authored from the unchanged v3 brief text, but the author also read the v3
  grader results, which BRIEF-VERSIONING.md keeps out of a frozen wave. They are therefore treated as a NEW method
  for trust purposes: the first release goes through a Daniel audit sample (bridge), and no carried-over trust level
  applies. Mechanics has a new method id (`map-lu-v4-mech-insession+cfg-v2`), so its first release is a bridge too.
- **The v4 claim is falsified** if any tell named by two v2 or v3 graders recurs here, named by two graders on 3 or
  more shared items. That is recorded as a method failure, not repaired in place.
- **Known going in.** The packet dealer put the key at B on 19 of 40 items in writing packet 1. Letter patterns are
  excluded by A1, but graders may name it; it decides nothing. In Mechanics the key is longest or tied for longest
  on 32 of 65 items, mostly ties from case-only capitalization and one-mark punctuation variants. A grader-named
  key_form pattern there will be applied as written.
- **Release** needs the owner's go and a Daniel audit sample, as for v3.
