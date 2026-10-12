# map-lu-mech-v1, 2026-10-12: result

The bars are in `MAP-LU-MECH-V1.prereg.md` (commit `99ef2ddc`), committed
before any item existed. Three more commits came before anything was scored:
- freeze `d44bec26`
- renders `a7811152`, before any solver or grader
- scoring: `node scripts/study-bank/map-lu-mech-v1.mjs score`

**Nothing inserted.**

**Agents:** 11 Claude subagents, at most three at once:
- 1 author, 2 teacher raters, 1 reviser, 2 re-raters
- 1 repair agent, 3 options-only samples, 2 graders (cold then keyed)

No NWEA item, no Herald PDF and no earlier MAP item file was shown to any
agent.

## Verdict: FAIL on S1-b and S1-c. Keys are 48/48 right. Difficulty is the miss, plus one cross-item tell the batch's own new rule created.

| bar | result | |
|---|---|---|
| Stage 0 freeze | 28/28 survive; frozen 8/8/8 | pass |
| S1-a exact (E1 E3 E5-E7 E9 G T1) | 0 item failures; E3 1/24 + 1/24; T1 cap 0/8, punct 0/8, gram 2/8 | PASS |
| **S1-b pilot-pass c1-c5 ≥ 20/24** | **17/24** | **FAIL** |
| **S1-c easier ≤ 8/48, harder < 12/48** | **easier 15/48**, harder 3/48 | **FAIL** |
| S1-d mean grade offset within ±0.5 | a −0.42, b −0.46 | PASS (only just) |
| S2 options-only ≥ control − 10 (control ≥ 25%) | candidates 100.0% (24/24 unanimous on key) vs control 77.8% | PASS. A weak screen, as pre-registered |
| T key slots ≤ 35% | 6/6/6/6 | PASS |

**Keys:** both graders picked the key cold on 48/48. Both keyed verdicts
were "correct" on 24/24, and neither named an accepted alternative. No
options-only sample landed unanimously on a non-key letter. Pilot 4's
wrong-key class (LU-02) did not recur, and the disputable-site ban held.
One cold `second_defensible` was raised: "I wish I was" (MLM1-23, grader a).
The same grader withdrew it in the keyed stage, but the cold condition
decides c2, so the item is held.

### The seven holds

| item | strand, grade | why |
|---|---|---|
| MLM1-01 | Capitalization 5 | Both graders called it too easy (assigned grades 4 and 3: "Cedar avenue" / "Lake"). A option dead by both. |
| MLM1-04 | Capitalization 6 | Grader a: too easy (5). |
| MLM1-07 | Capitalization 7 | Grader b: too easy (4); nationality adjectives. |
| MLM1-15 | Punctuation 7 | Both: too easy (4, 5); its/it's and plural possessive. |
| MLM1-10 | Punctuation 5 | The period-ending tag question is dead by both. |
| MLM1-26 | Grammar 7 | Both: too easy (4, 5). The double-"which" option is dead by both. This is the item the teacher gate rewrote. |
| MLM1-23 | Grammar 8 | Grader a cold: "wish I was" is a second defensible answer (withdrawn when keyed). |

**By strand:**
- Grammar 6/8
- Punctuation 6/8
- Capitalization 5/8

**Where the `easier` calls fall:** Capitalization 10, Punctuation 3,
Grammar 2.

## Finding 1: Capitalization does not reach grades 6-8

10 of the 15 `easier` calls are on Capitalization. CCSS Language has no new
capitalization rule after grade 4: L.5-L.8.2 says only "use correct
capitalization". So a grade-6-to-8 Capitalization item can only be harder
by context, and the graders kept placing those items at grades 4-6.

Grammar, where each grade's standard names new structures (verbals, mood,
voice), fit its grade on 14 of 16 judgements. **Capitalization belongs in
the Lower band, plus a few Middle items at most.** Do not target it at
grades 7-8. Pilot 4 already found this in a weaker form: "one band harder
works where difficulty sits in a rule".

## Finding 2: the new T1 rule created a cross-item tell

**This is the CLAUDE.md "a cheap check can only catch the tell it was built
for" pattern, caused by the batch's own fix.**

T1 required one under-capitalization site and one over-capitalization site,
so the key could not be the option with the most or fewest capitals. In a
2x2 grid of two binary sites that has a consequence: the key and the
both-errors option are then the two "mixed" options, one site changed and
one not. The two single-error options are the two uniform ones, all changed
or none.

**Both graders named it independently in `_batch`:** "pick the option that
capitalizes or punctuates one site but not the other". Measured exactly on
the frozen 24 by an elimination script ("drop options at the count extremes,
pick at random among the rest"):

| strand | key strictly between the count extremes | heuristic expected score | chance |
|---|---|---|---|
| Capitalization | 8/8 | **50.0%** | 25% |
| Punctuation | 4/8 (one item all-equal) | 37.5% | 25% |
| Grammar | 3/8 | 28.1% | 25% |

**Before T1 the opposite tell existed.** Two under-capitalization sites make
the key the uniquely most-capitalized option. So with case-only sites,
**every** 2x2 Capitalization item is either an "extreme" item or a "mixed"
item. Only a batch-level balance can hide it: roughly half the keys mixed,
half extreme, and the extremes split between max and min.

A balance rule like that is a recipe the next solver can learn too.
Capitalization items with a **second, non-binary dimension** (for example a
site whose wrong forms differ in which letter is capitalized) would avoid
the binary structure altogether. **Stated as a hypothesis, not a fix.** The
punctuation version only applies to omission-plus-insertion grids;
substitution sites (comma vs semicolon) carry no count signal.

Options-only could not see this tell. Every candidate item is solved by
rule knowledge (100%, the construct), and that masks a rule-free heuristic.
It took the graders' cross-item question and an exact count to find it.
This is the prereg's own S2 caveat, confirmed.

## Protocol notes

- **Grader b had seen this batch's commit messages.** Its session started
  with an auto-attached git status that listed the prereg commit message,
  "T1 (no count-axis key extreme)". It reported, unprompted, that it had
  linked the mixed-cell pattern to that phrase. It ran no git commands and
  opened no other file (it confirmed this when asked). The pattern itself
  it found in `ws.md`, and **grader a, which had no such context, named the
  same tell**. Both graders' cold picks were identical (24/24), and so were
  their keys.
  - Lesson for future briefs: commit messages reach subagents through
    session context. A prereg commit message must not describe an anti-tell
    rule in a way that hands a grader the tell. Keys were never in any
    commit message.
- **E9 checker change before any output was read.** E9 now compares with
  whitespace removed, because a colon takes a following space and a dash
  does not. The selftest covers both directions.
- **20 items had one E1 readability repair** (shared text shortened, sites
  unchanged). The E1 bar FK [4, 9) penalises the 25-word sentences the brief
  asked for ("the harder instance on a full read"). The author's long
  sentences were cut, and that may have contributed to `easier`.
- **The teacher gate barely fired:** 2 of 84 options were rated NO, both on
  one item. Its one rewrite (MLM1-26) still came back dead by both graders,
  even though both fresh re-raters had passed it 3/3. The pilot-4 finding
  that the teacher rater predicts dead distractors did not hold here.
- **Gate infrastructure changes for future MAP whole-sentence items:**
  - `stem-duplicates.mjs` keys items flagged `stem_is_instruction: true` on
    the correct sentence. A fixed instruction stem would otherwise refuse
    every MAP Mechanics batch as duplicates. The selftest has 22 checks and
    the change was break-tested.
  - `insert-map-lu.mjs` (staged inserter, gated) is in place and unused.

## What carries forward

1. **Keys and grammar work.** Keys were 48/48 right and 24/24 keyed-correct.
   Grammar fit its grade 14/16.
2. **Next Mechanics batch:**
   - Capitalization at grades 5-6 only
   - Punctuation and grammar at grades 6-8
   - no binary-site count rule. Measure the "mixed-key" and "extreme-key"
     rates exactly before freeze, and report both.
   - an E1 limit that matches the brief (allow FK up to 10 at grade 8)
   - per the stop-after-a-failed-rewrite rule, this is a **method change**
     to site construction, not a third count-balance rule
3. **Upper-level Capitalization and Spelling (MAP-LAUNCH-PLAN Q10) is
   reconsidered.** Capitalization has no grade 9-11 standard to anchor to.
   The Upper Mechanics area is better served by punctuation (238 re-banded)
   plus Spelling. The plan is updated to say so.

## Files

All in `scripts/study-bank/`:
- `MAP-LU-MECH-V1.prereg.md`, `MAP-LU-MECH-V1-BRIEF.md`, `map-lu-mech-v1/prompts.md`
- `map-lu-mech-v1.batch.json`: the frozen 24.
  `map-lu-mech-v1/batch.authored.json`: the 28 as authored.
- `map-lu-mech-v1/`:
  - teacher gate: `teacher-*`, `revise*`, `revised.json`, `rerate*`
  - repairs: `repair.input.json`, `repairs.json`
  - control: `control.json`
  - renders: `oo.*`, `ws*`
  - verdicts: `stages.json`
- `map-lu-mech-v1.mjs`: the toolchain. `--selftest` break-tests every bar
  and structural check.
- `insert-map-lu.mjs`: staged inserter, gated, unused.
