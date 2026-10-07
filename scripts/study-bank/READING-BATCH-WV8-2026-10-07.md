# SSAT Upper Reading batch WV8 (2026-10-07): result

**FAILS STAGE 4 (B, options-only grouped): 21/36 = 58.3% against a bar of 40%. Stopped. Nothing
inserted.**

| step | commit |
|---|---|
| prereg (WV7/WV8) | `159757d1` |
| freeze | `38572021` |
| draw and renders | `d169f81c` |

## Stages

| stage | measure | result | bar | verdict |
|---|---|---|---|---|
| 0 | pre-flight | round 0: 30 mechanical problems and 4 attitude licensing failures. One fix round. Re-run: 0 mechanical, A1 0 absent, licensing 20/20 | all clean | **PASS** |
| 1 | C exclusivity | **12/12** (including the drawn "detached" attitude item, P02 v3) | >= 11/12 | **PASS** |
| 1 | Q distractor >= plausible | 48/96 = 50.0% | >= 4/96 | **PASS** |
| 1 | dead-by-both | 4/12 | <= 7/12 | **PASS** |
| 1 | F easy (reported) | 9/12 | not decidable | reported |
| 1 | pilot-pass (reported) | 2/12 | not decidable | reported |
| 2 | E naturalness | median 4.5 (P01 5/4, P02 5/4) | >= live 2.5 | **PASS** |
| 3 | A options-only isolated | 9/30 = 30.0% | <= control + 10; control 35/144 = 24.3%, margin +5.7 | **PASS** |
| 4 | **B options-only grouped** | **21/36 = 58.3%** (each sample 7/12) | <= 40% | **FAIL** |

**Draw.** frozenSha `b9a37a71…`, recomputed. P01 drew v1 (critical) and P02 drew v3 (detached).

## Why B failed

The three grouped samples saw each unit's six questions together, with no passage. Each built **one
coherent story per unit** from the options. The P01 options all pointed the same way:
- the 1947 flood;
- "the river made the site too risky";
- the groundsman;
- a "stand" of trees.

Together those spell out the move-to-higher-ground world, which is v1, and v1 was drawn. With the
picks held fixed:

| unit | hits by possible drawn version (of 18) |
|---|---|
| P01 | v0 2 / **v1 15** / v2 0 / v3 1 / v4 0 |
| P02 | v0 3 / v1 9 / v2 0 / **v3 6** / v4 0 |

**Exact null over all 25 draws:** mean 20.0% (by construction), P(>= observed) = 0.08, and
P(B fails) = 0.20.

## What this means

- **Across all possible draws, the method is not leaky.** On average it sits at 20%.
- **The drawn P01 is.** A student who sees P01's six questions together can assemble the most
  coherent story, and here that story is the version on the page. The grouped bar measures exactly
  this student-facing property. The rule is the rule: stop, nothing inserted.
- **This is a structural property of whole-passage variants.** When one world is more "story-shaped"
  from the options alone, grouped solvers converge on it, and 1 draw in 5 lands on it.
  - WV6 passed B at 22.2%.
  - WV8's isolated attack, A, was fine, because siblings are not adjacent there.
  - **Mitigation for the next prereg:** before the freeze, run the grouped attack per unit across
    all five versions. That is the same picks scored against each version, as above. Refuse a unit
    whose hit distribution is concentrated on one version: for example, any single version over 2x
    its share. A unit where every world is equally reconstructible cannot fail B by luck of the
    draw. Done before the draw, this is pre-flight, not fitting to the decision.
- **The attitude fix worked this time.** After the licensing round, the drawn "detached" item (P02
  v3) was exclusive for both deciding graders. That was the WV6/WV7 failure mode.
  - It took a rewrite round on the felt versions: "wistful" and "amused" had read as "detached".
  - The fixed felt versions now name the tone outright. P02 v4 says "There is something comic about
    the team's whole approach." A human may find that heavy-handed.

## Recommendation

- **WV8 is not inserted.**
- **Next batch (WV9):** same bars, plus the per-unit grouped-world pre-flight above, under a new
  prereg.
- **Release:** still gated on the co-founder's WV6 read (`ssat-wv6-cofounder-2026-10-07`).

Evidence: `ssat-wv8-p0{1,2}.wv.json`, `ssat-wv8-batch/` (preflight, a1, lic, draw, renders, `ws-*`,
`nat3-*`, `iso-*`, `grp-*`).
