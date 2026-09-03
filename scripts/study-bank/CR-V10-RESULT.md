# cr-v10 (40 Choose a Response, two authors x 20) — HELD, not inserted

Authored 2026-09-03 to the cr-v7 kill-quote standard (each distractor is the
natural reply to a neighbouring line; each killable by a quotable span), but
NOT by the cr-v7 four-world seeded-selection method for batch 1 (batch 2's
author reports fixing world and slot sequences before writing options).
Filenames were cr-v8-* at authoring and renamed: a shipped cr-v8 cohort
already exists.

## No-passage attack (options only, keys dealt flat 10/10/10/10, 3 solvers)

    solver a   15/40   37.5%   (2 confident)
    solver b   14/40   35.0%   (4 confident, 2 right)
    solver c   13/40   32.5%   (19 confident, 8 right)
    mean       35.0%   margin +10.0 over chance

    items right for 0 / 1 / 2 / 3 solvers:  18 / 9 / 6 / 7
    solved by all three: CR10-B1-17, B1-19, B1-20, B2-07, B2-10, B2-11, B2-17

For scale: cr-v7 S2 measured +1.4 (clear); the failed cr-v3..v6 briefs
measured +14.6 to +55.9. cr-v10 sits between — better than every failed
brief, worse than the one that shipped.

All three solvers named the same load-bearing heuristic, unprompted: "reconstruct
the CANONICAL complication for the named setting and pick its reply" (~22, ~14,
~22 items each). Solver c predicted 55-65% on that basis and scored 32.5%, so
the heuristic is weaker than it feels — but it is where the +10 lives. Secondary:
"cooperative pivot with a trailing 'then'", "reject the option that argues".
No length, slot or punctuation tell was found by any solver.

## With-source exclusivity (transcript + 4 options, key unmarked, 1 grader)

    agrees with key   37/40
    two acceptable replies   6: B1 items 2,5,13,19 / B2 items 6,9 (attack ids)
    spoken line self-contradictory   2: attack ids 22 (B1-03), 39 (B1-10)
    difficulty   easy 20 / medium 18 / hard 2
    stilted or free distractors   ids 1, 4, 8 (key echoes the line), 30, 34

## Decision

Held. cr-v7 shipped on Andy's explicit approval after clearing the attack at
+1.4; inserting a +10 batch with six exclusivity defects into the same live
pool would dilute a cohort that passed, and the register rule is no third
brief once two rewrites have produced their own tells. Options for Andy:
(a) archive the files; (b) repair the 8 flagged items and the 7 solved-by-all,
then a FRESH no-passage attack on the remaining 25 (post-selection numbers are
biased and do not count); (c) rebuild with render-crv7.mjs's four-world
selection, which is the method that cleared.

Files: cr-v10-b1.batch.json, cr-v10-b2.batch.json, cr-v10-attack.{blind,key}.json,
cr-v10-attack.solver-{a,b,c}.json, cr-v10-withsource.json, cr-v10-withsource.grader-a.json.
Score with: node scripts/study-bank/score-attack.mjs cr-v10-attack
