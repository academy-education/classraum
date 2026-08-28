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

## The per-kind join was built, break-tested, and FAILED (2026-08-28)

`check-kind-joins.mjs` was written to catch this defect class before an
attack fleet runs: group by question kind, then ask whether the key
carries a shape feature (hedged / absolute / longest / shortest) more
often than chance within that kind.

It self-tests correctly on synthetic fixtures — a set where every tone
key hedges is caught, a set where all four options hedge passes. But
**break-tested against the very batch it was built from, it reports
CLEAN**, both before and after fixing a real bug it did surface (kind
labels are author free-text and fragment: "tone" and "tone/attitude"
were counted as separate kinds, halving every group).

Why it fails: the qualifier that marked those keys also appears in
several distractors ("impatient affection strained by his habits",
"uncritical devotion untouched by doubt"). The hunter's rule was a
human-legible generalization, not a mechanical one. The real
discriminator is semantic.

**This is the SIXTH cheap structural proxy attempted in this repo, and
like the previous five (key-letter spread, key-length rank,
punctuation asymmetry, concessive-pivot rate, option-family balance) it
does not rank batches.** Recorded here and in the script's header so
nobody builds a seventh. The script stays as pre-flight REPORTING — it
catches gross skew and the fragmented-label defect — but it is not a
gate.

For reading, the blind attack is the gate, and the v2 brief carries the
load: assigned per-passage kind variety (drawn from a 10-kind pool, so
no slot is always tone), uniform qualification and intensity within
every option set, uniform specificity and grammar, secondary-sense
vocabulary, and an author self-test whose result is returned as
`anti_tell_note`.
