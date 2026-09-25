# The residue-class proxy does not work. Do not build an eighth.

`check-unique-residue.mjs`, built 2026-09-25, refuted the same day by its own
base-rate line. Kept in the tree because the base-rate machinery is reusable
and because the negative is worth more than the script.

## What it was for

Two graders found 37 free strikes across the two v16 maths batches whose
authors had declared three between them, and the most decisive were pure
divisibility:

    SM16L-10   two plans, 258+13m and 102+25m. All four options really are
               258+13m -- the author protected that -- and exactly one is
               102+25m. Three of three distractors, one glance, no arithmetic.
    SM16L-09   L = 3S-8 with L+S = 92, so (L+8) % 3 == 0. Two of three.

That is arithmetic, and the standing exception in `CLAUDE.md` says an
arithmetic defect gets an exact checker over the whole population rather than
a sampling attack. Authors have missed this class five batches running.

## Version 1: fired on 14 of 14, and the base rate says that is normal

Testing every modulus 2..30, the key was uniquely separable on **every single
Algebra item**. That reads as a catastrophic finding. It is not:

    20,000 random four-integer sets      some modulus <= 12 separates one
      uniform 1..200                                  98.3%
      uniform 1..60                                   95.0%
      clustered 100 +/- 20                            93.1%
                                         some modulus <= 5 separates one
      all three distributions                      ~80%

**Four arbitrary integers are almost always separable.** A detector that fires
on everything is not a detector, and the only reason this was caught is that
the base rate was measured instead of the 14/14 being believed.

## Version 2: restrict the modulus to those the stem PRINTS. Still nothing.

A solver can only apply `mod 25` if 25 is on the page, so version 2 parses the
integers out of the stem and tests only those. That is a real restriction and
it cut the fire rate. It also killed the idea, because the honest comparison is
not "how often does the key fire" but **"how often does a RANDOM OPTION fire"**:

    batch                    key separated    a random option separated
    sat-math-v16-alg           11/14  78.6%        48/56   85.7%
    sat-math-v16-adv            6/9   66.7%        25/36   69.4%
    sat-math-v15-alg            9/9  100.0%        34/36   94.4%

On two of three batches **the key is separated LESS often than a random
option**. There is no signal here in either direction. Recall against the
graders' own divisibility findings was 2 of 3 at 18% precision — and at an 86%
base rate, 2 of 3 is what you get from firing indiscriminately.

## Why it cannot work, stated so nobody rebuilds it

The grader did not reason from the stem's DIGITS. It reasoned from the stem's
MEANING: *the total has to be reachable by the second plan*, therefore
`t ≡ 102 (mod 25)`. Which of the printed integers is a live modulus depends on
what the sentence says that integer does. `13` and `25` are both printed in
SM16L-10 and only one of them is load-bearing, because only one of them is a
per-month rate in the equation that was never checked.

That is the semantic channel again, and it is the seventh cheap proxy for it to
fail here. The list now reads:

    key letter spread          caught its own tell, not the next
    key length rank            same
    punctuation asymmetry      same
    concessive-pivot rate      same
    option-family balance      predicted 2.7pts across a 25.8pt spread
    key-is-centre              the only one to survive out-of-sample (+16.8),
                               at a third of its in-sample strength
    unique residue class       no signal; the key fires LESS than a random
                               option on 2 of 3 batches

The one that partly survived (`key-is-centre`) is recorded in REGISTER.md A50
as a hypothesis with a single passing out-of-sample test, explicitly not a gate.

## What to do instead

Nothing cheap. The grader's own procedure is the instrument: hold the stem and
the options, name what each printed number DOES in the sentence, and ask which
of those roles constrains the answer. That costs a grader per batch and there
is no shortcut, which is exactly what "the attack is the gate, the structural
checks are pre-flight" has meant every previous time.
