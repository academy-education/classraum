WV13 sense-check break test (before the prereg commit). Two persistent judge sessions (A, B), resumed for round 1.
Round 0 input: WV12 round-0 units P01-P04 (ssat-wv12-batch/preflight/r0/) + WV10-P02's "raised" set (stub here).
Round 1 input: WV12 round-1 units (ssat-wv12-batch/preflight/r1/) + the same stub; only pairs with a changed gloss asked.
  node ssat-wv13-senses.mjs build r0 <r0 units> ; merge r0 --judge-a A --judge-b B
  node ssat-wv13-senses.mjs build r1 <r1 units> --prev r0 ; merge r1 --judge-a A --judge-b B --prev r0
r*/sense-judge.json = what the judges were asked; r*/sense-judge.{a,b}.json = their answers; r*/merged = verify-shaped state.
