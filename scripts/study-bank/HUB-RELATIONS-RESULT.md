# The relations three blind solvers named are NOT a detector

**2026-09-19. Measured, refused, recorded so nobody builds the seventh proxy.**
Reproduce with `node scripts/study-bank/measure-hub-relations.mjs --selftest`
then without the flag.

## What prompted it

Three solvers, given four bare numbers and no stem, picked the key 3/3 on
four items in one afternoon and named the structure each time:

    -95/8 is the key; -95 is it with the /8 dropped
    7/4  is the key; 7    is the un-divided numerator
    1250 is the key; 6250 is 5 x it
    52   is the key; 52 = 60 + (-8)

`check-math-hub.mjs` printed **"Numeric hub: no derivational structure in
any option set"** for every batch containing them — correctly by its own
definition. Its `OPS` list holds negate / double / halve / square / sqrt /
reciprocal / ±1 / ×10 / ÷10 / complements. Not one of the four relations
above is in it. So that line was not evidence about those items, and the
ledger says so.

The obvious response — append `×5`, `×8`, `÷3`, `÷4`, "un-divided
numerator" and "sum of two others" to `OPS` — is what that file's own
header warns against: *"with enough operations every number reaches every
other and the hub becomes whichever option has the most neighbours by
chance."* A relation that fires on a third of sound items does not catch a
tell, it manufactures one, and every item it condemns is a rewrite that can
introduce a new tell.

## The measurement

Whole live math bank, 2,361 verified rows, 2,223 with a parseable
four/five-option set. Control **derived** by rotating which option is
called the key and re-scoring the same set — never the literal 25%.

| family | structured | key-is-hub | control | margin |
|---|---|---|---|---|
| `base` (the existing OPS) | 360 | 18.6% | 24.1% | **−5.6** |
| `named` (×5 ×8 ÷3 ÷4, reaches ≥2) | 236 | 24.7% | 24.0% | +0.7 |
| `both` | 681 | 27.3% | 24.2% | +3.1 |
| `pair` (a LONE multiplicative pair, key = source) | 721 | 28.3% | 24.3% | +4.0 |
| `sum` (key = sum of two others) | 448 | 25.6% | 24.1% | +1.5 |
| `numerator` (key is `a/b`, an option is `a`) | **15** | 33.3% | 24.7% | +8.7 |

`base` landing **below** its control on a bank whose defective cohort was
repaired is the licence for the rest: the detector reproduces a known
number (the 90 repaired items re-measured at 23.6%, i.e. chance) before it
is pointed at anything unknown.

Stratified, because the number this project has most often got wrong is a
population rate that was really one cohort:

| `pair` | scorable | structured | margin |
|---|---|---|---|
| sat | 1168 | 349 | +6.5 |
| isee | 311 | 115 | +5.9 |
| act | 534 | 152 | +0.7 |
| ssat | 210 | 105 | −1.7 |

## The verdicts

1. **`named` and `sum` are noise.** +0.7 and +1.5 over 236 and 448 sets.
   The `52 = 60 + (−8)` reading that a solver gave, and that was right,
   generalises to nothing: 448 live items have an option that is the sum of
   two others and the key is one of them at chance.
2. **`pair` is the sixth structural proxy, and it fails the same way as the
   first five — too coarse.** +4.0 points, but it fires on **721 of 2,223
   items (32%)**, it is +6.5 on SAT and −1.7 on SSAT, and as a drop rule it
   would condemn a third of the bank to recover a four-point effect. This is
   the shape of the "SAT Math hub CONFIRMED bank-wide (64.4%)" backlog entry
   that turned out to be 98.3% in one cohort and 8.0% in the other 730.
3. **`numerator` is the only family not refuted, and it is UNMEASURED.**
   Fifteen structured sets live (0.7% of the bank), ten of them SAT at 50%
   vs 25%. A rate over 15 items is not a measurement; it is the absence of
   one. It is also the only relation here that a value-only checker
   *structurally cannot see*, because it is a property of the printed
   strings (`7/4` → `7`), not of the numbers. If it is ever tested it needs
   roughly 100 fraction-keyed items, which the bank does not have.

## Therefore

`check-math-hub.mjs` is **not patched**. Its `OPS` list stays as it is, and
its reaches-two guard stays — the self-test here confirms that guard is what
refuses the `1250 / 6250` set, and the guard was itself earned by a false
positive that put repaired items at 34.7% against a known 23.6%.

What changes is the claim attached to its output: **"Numeric hub: none" means
"no hub under twelve named slips", not "the option set carries no
structure."** Ledger entries say that now. The instrument that found all four
of these items was three solvers reading four bare numbers, which is the
standing finding — the attack is the gate, the cheap checks are pre-flight.
