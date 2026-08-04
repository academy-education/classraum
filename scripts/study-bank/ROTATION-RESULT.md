# Rotation pilot — 16 items, 2026-08-04

**Question:** the choose_response repair stalled at a **+40.4** no-source
margin after two rounds (round 2 bought 0.4 points). The residual was
diagnosed as RELATIONAL — distractors written as mutations of the key
make the recipe invertible, so a solver reconstructs the withheld
utterance from the option set. Can removing the recipe move that number?

**Answer: yes, and it is the first real movement on it. But this
construction pays for it with a worse defect.**

---

## Construction

4 families x 4 items. Within a family the four stimuli share **one
option set of four real keys** — each option is the correct reply to
exactly one stimulus. No filler, and no option derived from another.

Blind ceiling is therefore **25% by construction**: every fixed strategy
scores exactly 1 of 4. `expand-rotation.mjs` refuses to emit unless that
invariant holds.

## Both gates, measured

| | blind margin | solvable by word overlap |
|---|---|---|
| live bank (choose_response) | **+40.4** FAIL | **7.8%** pass |
| rotation-v1 | **+2.1** pass | **81.3%** FAIL |

The defects are **traded, not fixed.** That is the finding.

### Blind gate — passed, but largely by construction

3 solvers, 16 items, control 25.0% (key letters set flat by design).

    solver A  4/16 = 25.0%   spread 3/3/6/4
    solver B  5/16 = 31.3%   spread 4/4/5/3
    solver C  4/16 = 25.0%   spread 4/3/4/5
    MEAN 27.1%  ->  margin +2.1

Spreads DIFFER, which is the healthy signature — every failing verbal
cohort previously showed identical spreads. All three reported 0
confident.

But all three also reverse-engineered the cluster structure and hedged
with a bijection, which yields exactly 1 correct per cluster whatever
they do. The pass is therefore close to tautological. The one real
signal: solver C applied content heuristics and scored exactly chance.

### With-source gate — 100% accurate, and still broken

2 readers, 16/16 correct each, agreeing 16/16. 12 obvious / 4 inference
each; 18.8% rated inference by BOTH.

Both independently found the killer, before the mechanical check
existed: **12 of 16 keys are recoverable by lexical overlap alone.**

    "twenty-minute walk"         -> "Twenty minutes is fine"
    "battery goes after an hour" -> "An hour's enough"
    "back by five ... flagged"   -> "back before five ... risk the flag"
    "questions on the stats"     -> "handle the stats questions"

That is keyword matching, not pragmatic inference — the thing this task
type claims to measure. Reader X named it as the "complete permutation"
failure already in CLAUDE.md, now at the OPTION level.

3 of 16 items are outright defective: **16** (stimulus does two things,
one option answers each), **5** (key tonally unstable, survives only by
elimination), **14** (defensible alternative).

## The new gate this produced

`check-lexical-anchor.mjs` — measures how many items fall to "pick the
option sharing the most content words with the stimulus". Costs nothing:
no solvers, no tokens. It discriminates (bank 7.8%, rotation-v1 81.3%),
so it is not a checker that only ever fails.

**The blind attack cannot see this defect**, because seeing it requires
the stimulus the blind attack withholds. A batch can pass the no-source
gate and still test nothing. Run all three gates or none.

## Errors made, recorded because each produced a confident wrong number

1. **The key file was clobbered mid-experiment.** Re-running the
   renderer to fix a shuffle defect overwrote `rotation-v1.key.json`
   AFTER the with-source file was built from it, moving 9 of 16 key
   letters. Two readers then scored 43.8% against a key that no longer
   described their paper. Caught only because two independent readers
   agreeing 16/16 with each other while both "failing" is arithmetically
   absurd. The renderer is now write-once unless `--force`.

2. **A "fix" that was unsatisfiable.** Assigning key letters globally
   and then demanding a Latin square per family cannot work — a family
   can draw key letters A,A,B,C. The cyclic-shift version that replaced
   it could not work either: it needs a complete mapping of Z4, which
   does not exist (Hall-Paige). The symptom was the control silently
   drifting to 37.5% while the code looked right. Now searched for
   explicitly: a Latin square whose key cells form a transversal.

3. **A break-test that tested nothing.** Appending a space to an option
   to check byte-identity of `correct_answer` proved nothing, because
   the expander derives the key from that same array — both sides moved
   together. That check is tautological in this design.

4. **A free shuffle gave a 56.3% control.** 16 items cannot absorb key
   letters at A:9 B:1 C:4 D:2. Letters are now assigned flat.

## What this licenses

- The relational leak IS removable. +40.4 -> +2.1.
- This construction should NOT be scaled: it trades the leak for
  keyword matching, and the corridor between "anchored enough to word-match"
  and "generic enough to be ambiguous" is where the answer must live.
- Next hypothesis, being probed: keep "every option is a real key", add
  "no content word of a reply may appear in its own stimulus". A 4-item
  probe clears the lexical gate at exactly chance (25.0%, 0/4 anchored).
  Whether it also stays unambiguous with the source is the open question.
