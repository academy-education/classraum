# sat-math-v30-full — with-source grader brief (graders D, E, F)

You grade frozen Digital SAT **Math** items from all four domains - Algebra, Advanced Math,
Geometry and Trigonometry, Problem-Solving and Data Analysis (four numeric options)
for a bank used by real students. Your task message names your grader letter `<g>` and
your third `<h>` (h1 / h2 / h3, 22 / 22 / 21 items). Some PSDA items carry a `graphic` table
(rowLabels, colLabels, cells): it is part of the stem the student sees. Geometry items carry no figure;
the stem describes it. You work in TWO runs, and the order is
enforced, not trusted:

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not
run git. Use only your own (Claude) reasoning; no external model calls, no GPT.

**Your private folder** is `/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/sat-math-v30-full-work/grade/<g>-<h>/` (outside the repo).
Write every file you make - your answers AND any scratch script or note - inside it,
and nowhere else in the repo. Never read or run anything in another grader's folder.

**Run 1 = stage 1 (cold).** Your folder holds only `grade.json` (stem + options; no key,
no explanation, no solve paths). For every item write the stage-1 fields below to
`<your folder>/stage1.json` as one JSON object keyed by item id, plus
`"_render_sha"` (the first 16 hex of `shasum -a 256` of grade.json). Write it completely,
then STOP and reply "stage 1 written". Do not open any other mf30 file, any author file
(`sat-math-v30-full*`, `sat-math-v30-full-work/parts/`), any other grader's file, or solver files.

After your reply, stage1.json is snapshotted, its hash recorded and the file made
read-only. **Never modify stage1.json after that, for any reason** - not to fix a typo,
not to repair a helper script's output. A changed stage-1 file discards your whole run
(this happened on the previous batch). If you find a stage-1 error, say so in stage 2.

**Run 2 = stage 2 (keyed).** You will be told when `gradekey.json` (keys) and
`keyed.batch.json` (explanation, `solve`, `distractor_solve`) have appeared in your
folder. Write `<your folder>/stage2.json`: for each id, **every stage-1 field copied
unchanged** plus the stage-2 fields. If the key shows you erred in stage 1, say so in
`key_note` / `difficulty_revision_reason`; never edit a stage-1 field (a script compares
them, and the stage-1 file's hash).

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
                            "greatest / maximum / largest / most" stem), how many routine
                            substitutions reach the key; null if options cannot be checked against
                            the stem by substitution. Count a forward computation of a short
                            value from the stem as substitution too (A90: seven S keys were
                            confirmed on the FIRST ascending try)
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
    option_pair_tell        null, or the tell A89 dropped 8 items for and A90 dropped 2 more for:
                            two options, one of them the key, joined by ONE operation with a
                            number printed in the stem (key = option + printed, option x
                            printed...) OR with a multiplier one step from a printed number
                            (printed n - 1 or n + 1, or the sum of two printed numbers: "4 orders"
                            -> 3 extra fees, so key = 3 x the fee option), so a student who sees
                            the pair and the stem can pick the key. A91 adds: two options, one the
                            key, that DIFFER by the sum of two printed numbers (A91 R01: key 24 =
                            option 7 + (8 + 9)). Name the pair and the number. Write null when there
                            is no such tell - never a sentence saying it is not one (A91: prose "not
                            a tell" notes in this field each had to be read as a flag).
    insight_bypassable      can routine procedure or Desmos bypass the item's decision point?
    difficulty             easy | medium | hard (definitions below)
    domain_judged           "Algebra" | "Advanced Math" | "Geometry and Trigonometry" |
                            "Problem-Solving and Data Analysis" | "other": SAT Algebra = linear
                            equations in one or two variables, linear functions, systems of two linear
                            equations, linear inequalities; SAT Advanced Math = quadratics,
                            exponentials, radicals, polynomials, rational expressions, nonlinear
                            functions (incl. absolute value, composition, inverses of nonlinear
                            functions, nonlinear systems); Geometry and Trigonometry = lines, angles,
                            triangles, area and volume, right triangles and trigonometry, circles
                            (incl. circles in the xy-plane); PSDA = ratios, rates, proportions, units,
                            percentages, one- and two-variable data, probability, inference from
                            samples; "other" = none of these, or a third equation or unknown
    on_blueprint            true if domain_judged matches the domain the item will be filed under (you
                            learn that only from the content: geometric content is Geometry even when
                            it is solved with a linear equation - A92 dropped a triangle-midpoint item
                            filed as Algebra; a percent or rate story is PSDA unless the decision is
                            solving the linear / nonlinear equation itself)
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
external model calls). Do not run git. After run 2, reply with one line per item: id, my_answer, key_ok,
n_struck, plugback_tries, one_sided, option_pair_tell (y/n), drop_recommend,
difficulty_final.
