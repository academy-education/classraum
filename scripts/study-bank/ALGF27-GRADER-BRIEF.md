# sat-math-v27-algfull — with-source grader brief (graders D, E, F)

You grade frozen Digital SAT **Algebra** items (four numeric options) for a bank
used by real students. You work in TWO stages per half, and the order is binding:

**Stage 1 (cold).** Read ONLY `scripts/study-bank/algf27-<h>.grade.json`
(stem + options; no key, no explanation, no solve paths). For every item write
the stage-1 fields below to `scripts/study-bank/algf27.ws-<g>-<h>.stage1.json`
as one JSON object keyed by item id, plus `"_render_sha"` (the first 16 hex of
`shasum -a 256` of the grade file). **Write this file completely to disk before
you open anything else.** Do not open any other algf27 file, any author file
(`sat-math-v27-algfull*`), any other grader's file, or the solver files.

**Stage 2 (keyed).** Only after the stage-1 file is on disk, open
`scripts/study-bank/algf27-<h>.gradekey.json` (keys) and
`scripts/study-bank/algf27-<h>.keyed.batch.json` (explanation, `solve`,
`distractor_solve`). Write `scripts/study-bank/algf27.ws-<g>-<h>.json`: for each
id, **every stage-1 field copied unchanged** plus the stage-2 fields. If the key
shows you erred in stage 1, say so in `key_note` / `difficulty_revision_reason`;
never edit a stage-1 field (a script compares them).

## Stage-1 fields (per item)

    my_answer               your answer, solved fully, as the option string
    exclusive               true if exactly one option is correct
    second_defensible       null, or the option string of a second defensible answer
    struck                  options a test-wise student strikes WITHOUT solving, with the stem
                            visible (sign, parity, range, a bound, a stated cap, monotonicity,
                            legality of the value, "too big/small to be right"); [] if none
    n_struck                struck.length
    free_elimination        how each strike works, or "none"
    key_identifiable_free   true if the key can be picked without solving
    plugback_tries          trying the options in the natural order (ascending; descending on a
                            "greatest" stem), how many routine substitutions reach the key; null
                            if options cannot be plugged back
    plugback_routine        true if that plug-back is routine and reaches the key in <= 2
    error_directions        for each of the three options you think are wrong: the most likely
                            wrong path that produces it, whether it lies above or below the key,
                            and whether the STEM lets a student predict that direction
    one_sided               true if the key is the largest or smallest option AND a student could
                            read from the stem which way the natural errors go, so all three
                            distractors fall on the predictable side (A88's cause: "any slip
                            widens the range", "an omitted constraint raises it")
    extreme_single_bound    null, or the cheapest one-sided bound readable from the stem that the
                            key sits at the edge of
    single_bound_kills_all  true if that bound, cheaper than the item's work, puts all three
                            distractors on or beyond it
    interior_parity         the two middle values: same display form / complexity? is the key
                            the cleaner one?
    interior_tell           true if the middle pair singles out the key (parity, complement,
                            shared denominator, cleaner value)
    arith_tell              null, or a class tell: the key alone in a class the stem implies
                            (integer, even, multiple of k, positive, a perfect square...)
    option_pair_tell        null, or the tell A89 dropped 8 items for: two options, one of them
                            the key, joined by ONE operation with a number printed in the stem
                            (key = option + printed, option - printed, option x printed...), so
                            a student who sees the pair and the stem number can pick the key.
                            Name the pair and the number.
    insight_bypassable      can routine procedure or Desmos bypass the item's decision point?
    difficulty             easy | medium | hard (definitions below)
    on_blueprint            true if SAT Algebra (linear equations in one or two variables,
                            linear functions, systems of two linear equations, linear
                            inequalities); false for quadratics, exponentials, absolute value,
                            nonlinear/inverse functions, a third equation or unknown, PSDA content
    same_template_as        ids of OTHER items in your render(s) that are the same chain of steps
                            on the same kind of givens to the same asked quantity; [] if none
    live_duplicate          null, or a note if you recognise this item as a standard published /
                            prep item
    note                    your working, briefly

## Stage-2 fields (per item, added to the copied stage-1 fields)

    key_ok                  false if the stated key is wrong (your cold answer differs and,
                            on re-check, the key is the error, not your arithmetic)
    key_note
    path_coherent           false if the explanation or ANY distractor_solve does not produce its
                            value, or describes an error that does not lead there
    path_note
    distractors_weak        true if the distractors are, as a set, not plausible errors
    drop_recommend          true if this item should not reach students (any reason above, or
                            another you name)
    drop_reason
    difficulty_final        easy | medium | hard
    difficulty_revision_reason

**Difficulty.** "hard" means the item belongs on the module-2 hard route because
it has a decision point that routine procedure (including Desmos) does not
bypass; "medium" means careful multi-step procedure reaches the key; "easy"
means one routine step.

Be a strict, independent reader: a student at a real test is your adversary for
the item, looking for any way to the key without doing the work. Solve every item
yourself; do not write a program to guess. Use only your own reasoning (no
external model calls). Do not run git. When done, reply with the two file paths
and one line per item: id, my_answer, key_ok, n_struck, one_sided,
option_pair_tell (y/n), drop_recommend, difficulty_final.
