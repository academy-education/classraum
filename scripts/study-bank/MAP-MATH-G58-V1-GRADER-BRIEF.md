# map-math-g58-v1 — with-source grader brief (graders D and E) and solver brief

## With-source grader

You grade frozen maths multiple-choice items for **grades 5-8** (four numeric options) for a practice
bank used by real students. Each item states its area, its **target grade** and its **target tier**
(low / mid / high = easier than typical / typical / harder than typical for that grade). Your task
message names your letter `<g>`, your half `<h>`, and your private folder `F`. You work in TWO runs,
and the order is enforced, not trusted.

**Hard bans.** Never run `pkill`, `killall`, `kill` or any other process-killing command. Do not run
git. No web. Use only your own (Claude) reasoning; no external model calls, no GPT. **Open only the
files in your folder `F`.** Do not open anything in the repo, any other folder, or any other
grader's or solver's file. Write every file you make (answers, notes) inside `F`.

**Run 1 = stage 1 (cold).** `F` holds only `grade.md` (stem + options; no key). Write
`F/stage1.json`: one JSON object keyed by item id (`"MMG-..."`), with the stage-1 fields below for
every item, plus `"_render_sha"` (first 16 hex of `shasum -a 256 F/grade.md`). Write it completely,
then STOP and reply "stage 1 written". After your reply stage1.json is snapshotted, hashed and made
read-only. **Never modify stage1.json after that**; a changed stage-1 file discards your run. If you
find a stage-1 error later, say so in stage 2.

**Run 2 = stage 2 (keyed).** You will be told when `F/keyed.md` (keys, worked solutions, each
distractor's stated wrong path) has appeared. Write `F/stage2.json`: for each id, **every stage-1
field copied unchanged** plus the stage-2 fields. Never edit a stage-1 field (a script compares them).

### Stage-1 fields (per item)

    my_answer               your answer, solved fully, as the option string
    exclusive               true if exactly one option is correct
    second_defensible       null, or the option string of a second defensible answer
    struck                  options a test-wise student strikes WITHOUT solving, stem visible (sign, whole
                            number, range, a bound, a stated cap, "too big/small", legality); [] if none
    n_struck                struck.length
    free_elimination        how each strike works, or "none"
    key_identifiable_free   true if the key can be picked without solving
    plugback_tries          trying options in the natural order (ascending; descending on a "greatest / most"
                            stem), how many routine substitutions reach the key; null if options cannot be
                            checked against the stem by substitution
    plugback_routine        true if that plug-back is routine and reaches the key in <= 2 tries
    error_directions        for each option you think wrong: the most likely wrong path that produces it,
                            above or below the key, and whether the STEM lets a student predict that side
    one_sided               true if the key is the largest or smallest option AND a student could read from
                            the stem which way the natural errors go, so all three distractors fall on the
                            predictable side
    extreme_single_bound    null, or the cheapest one-sided bound readable from the stem that the key sits at
    single_bound_kills_all  true if that bound, cheaper than the work, puts all three distractors beyond it
    interior_parity         the two middle values: same form / complexity? is the key the cleaner one?
    interior_tell           true if the middle pair singles out the key
    arith_tell              null, or the key alone in a class the stem implies (whole number, even, ...)
    option_pair_tell        null, or two options, one the key, joined by ONE operation with a number printed
                            in the stem, or by a multiplier one step from a printed number (n - 1, n + 1, the
                            sum of two printed numbers), or differing by the sum of two printed numbers. Name
                            the pair and the number. Write null when there is none - never a sentence.
    same_template_as        ids of OTHER items in your file that are the same chain of steps on the same kind
                            of givens to the same asked quantity; [] if none
    live_duplicate          null, or a note if you recognise this as a standard published / prep item
    area_judged             "Operations and Algebraic Thinking" | "Real and Complex Number Systems" |
                            "Statistics and Probability" | "Geometry" | "other" (grade 5: number and
                            fraction work is Number Systems; unit conversion and line plots are
                            Statistics and Probability; volume of prisms is Geometry; ratios / rates /
                            percent / expressions / equations / functions are Operations and Algebraic
                            Thinking; exponents, roots, scientific notation and irrational numbers are
                            Number Systems)
    on_blueprint            true if area_judged equals the stated area
    grade_fit               "fits" | "too_easy" | "too_hard": for the stated grade AND the stated tier. Judge
                            as a teacher of that grade: is this the grade's content (or the prior grade's for
                            a low item), and would the stated share of that grade's students get it right?
    grade_assigned          the US grade (integer, e.g. 3-10) at which this item would be a typical, mid-tier item
    tier_assigned           for the STATED grade: "below_grade" | "low" | "mid" | "high" | "above_grade"
    grade_note              one line: why
    note                    your working, briefly

### Stage-2 fields (added to the copied stage-1 fields)

    key_ok                  false if the stated key is wrong
    key_note
    path_coherent           false if the worked solution or ANY distractor's stated path does not produce its
                            value, or describes an error that does not lead there
    path_note
    distractors_weak        true if the distractors, as a set, are not errors real students of that grade make
    drop_recommend          true if this item should not reach students (any reason above, or another you name)
    drop_reason
    grade_fit_final         your grade_fit after seeing the key (stage-1 grade_fit stays as written)
    grade_note_final

Be a strict, independent reader: a student is your adversary for the item, looking for any way to
the key without doing the work. Solve every item yourself; do not write a program to guess. After run
2, reply with one line per item: id, my_answer, key_ok, n_struck, one_sided, option_pair_tell (y/n),
grade_fit, drop_recommend.

## Options-only solver (three samples)

> Open only `/Users/andylee/Downloads/saas/classraum/scripts/study-bank/map-math-g58-v1/oo.blind.json`.
> Do not open any other file, in the repo or elsewhere, and do not use the web. Never run a
> process-killing command; do not run git. It holds maths multiple-choice items with the QUESTION
> WITHHELD: for each id you see only the four answer options. For every id pick the option you think
> is most likely the correct answer, from the options alone. Answer every id (forced choice). Write
> `/Users/andylee/Downloads/saas/classraum/scratchpad/map-math-g58-work/solver-<x>.json` as
> `{"L001": {"pick": "A", "basis": "confident" | "guess"}, ...}` with every id, plus
> `"_heuristics"`: the heuristics you used and roughly how many picks each decided. Use only your own
> reasoning; no scripts that read other files. Reply "done" with the count of ids answered.
