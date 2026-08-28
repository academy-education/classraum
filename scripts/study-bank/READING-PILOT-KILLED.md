# SSAT/ISEE Reading pilots — KILLED (2026-08-28)

8 original passages, 48 questions, first Reading content ever authored
for either test. Deterministic preflight was clean (word bands, choice
counts, kind spread, keys verbatim). Both died at the blind attack:

    SSAT reading   mean 87.5%  control 29.2%  margin +58.3  KILLED
    ISEE reading   mean 94.4%  control 33.3%  margin +61.1  KILLED

Solvers answered 9 of 10 questions correctly WITHOUT THE PASSAGE.
Graders independently flagged 8 of 24 SSAT and 19 of 24 ISEE items as
answerable without the passage or weak-distractored.

## The mechanism — and the brief is the defect, not the authors

I told every author to cover the same six question kinds. They did,
in the same order, so each SLOT developed its own rule. The hunter
found four rules each firing 4/4:

- **Tone/attitude (always Q6): the key is the one option carrying an
  internal qualifier** ("wry fondness deepening into understanding",
  "qualified respect") while every distractor is single-valence and
  affectively extreme ("unreserved praise", "uncritical devotion").
  The word "qualified" was literally in one key.
- Vocabulary-in-context: the standard dictionary sense wins without
  the passage.
- Main idea: the option describing a discovery/transformation arc
  beats options naming isolated events.
- Function-of-phrase: the measured middle-ground option wins.

This is CLAUDE.md's standing corollary reproduced exactly: *the more
rigid the authoring spec, the more the answer becomes predictable from
the spec rather than the content.* The form-symmetry clause was in the
brief but applies WITHIN an option set; it cannot see that Q6 across
four passages always rewards the same shape.

## Disposition

All 48 questions dead, never banked. SSAT and ISEE Reading return to
zero. The v2 brief must change in three ways before any re-author:

1. **Randomize the kind assignment per passage** — never the same six
   kinds in the same order across a batch; draw 6 from a pool of ~10
   with a seeded assignment, and vary which slot holds which kind.
2. **Tone questions: all four options equally qualified.** If the key
   hedges, every distractor hedges; the wrongness must be WHICH
   attitude, never HOW MODERATE the attitude is.
3. **Vocabulary questions must use a secondary sense** the passage
   forces, with the common sense planted as a distractor — otherwise
   the dictionary answers the item.

Add a per-slot join to check-batch-joins.mjs: for each question KIND,
does one option shape win disproportionately across the batch? That is
arithmetic and would have caught this before the attack fleet ran.
