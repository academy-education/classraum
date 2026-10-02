# Live SAT Math — whole-population arithmetic audit, 2026-10-02

No model calls. Read-only: no live item was edited or archived.

## Population

    live = family sat, section math, verified=true, archived=false
    count(head, exact)          1343      (bank-state.mjs counts: 1343 drawable)
    rows loaded, paged by id    1343      distinct ids 1343
    cohort v2                    820      (no stored solve snippet — see below)

## 1. Existing exact checkers, re-run on the live bank

Each was self-tested first (all passed) and, where a known number exists, made
to reproduce it before its live number was read.

| checker | denominator | result | known-number check |
|---|---|---|---|
| check-sign-pair | 1242 numeric 4-option sets; 65 hold a ±pair | key in pair 26/65 = 40.0% vs chance 60.0% | reproduces A68 "after" exactly (65 sets, 40.0%) |
| check-key-extremity | 1242 scored, 101 skipped (= 1343) | key at an extreme 393/1242 = 31.6% vs 50%, p<0.001, every domain | matches the 2026-09-25 entry (31.5% on 1190); still unremedied |
| check-math-hub (SAT-only, see defect below) | 1153 scorable of 1226 unrepaired; 193 structured | hub-is-key 12.9% vs 25.0% control — below chance | legacy_choices of the 117 repaired items score **98.7%** (recorded 98.3% on 90); current choices 12.5% on 8 structured |
| verify-math-hub.ts | 1221 numeric; 91 single-hub | hub is key 1/91 = 1.1%; shuffled-key control 22/91 = 24.2% | — |
| check-symbolic-hub --bank | 1343 read; 48 structured | key-is-hub 26.2% vs 25.0% | — |
| check-live-closure | 1221 numeric, 122 skipped | key is composite 316/1221 = 25.9% | reproduced 316/1221 exactly with an independent script, which also supplies the **missing control: 22.3%** (mean share of options that are composites) → margin +3.6 |
| check-equivalent-options --bank | 6573 comparable of 7077 (all families) | no equal values | blind to radicals — see §2 |
| check-tolerance-pass | 527 recovered solve snippets | 521 exact, 6 float-noise, 0 approximation, 0 mismatch | self-test passed |
| check-unique-residue | — | **not run** | refuted the day it was written (RESIDUE-PROXY-RESULT.md) |
| check-answer-computability.py (sympy) | 66 checked of 1343 (4.9%) | 64 OK, 2 "VERIFIED WRONG" — **both false positives** (§3) | self-test 31/31; distractor-promotion break test: 65/66 flip to WRONG |

### Checker defects found

1. **check-math-hub reads the wrong population.** It filters on
   `!archived && MATH_DOMAINS.includes(domain)` with no family, section or
   verified filter. ACT Math's `Algebra` domain shares the SAT name, so its
   "1339 UNREPAIRED live SAT Math items" are 1226 SAT + **113 ACT Algebra**.
   The SAT-only numbers above were computed by importing `scoreItem` over the
   checked dump. The conclusion (below chance) does not change; the
   denominator was wrong.
2. **check-answer-computability.py ends an equation at a decimal point.** The
   right-hand-side lookahead `(?=[,.;?]…)` stops at the `.` in `0.25`, so
   `0.4(x − 15) = 0.25(x + 6) + 2.1` parsed as `0.4(x − 15) = 0` and reported x = 15
   against a correct key of 64 (`d035977c`).
3. **check-answer-computability.py ignores "greatest/least".** With the key of
   `6fd19bbc` ("greatest possible value of x", roots 2 and −2/5) replaced by
   −2/5, it still returns OK: any root is accepted. It cannot check the
   SADV7B-05 class at all.
4. **check-symbolic-hub with no argument prints nothing and exits 0.** A bare
   run reads as "ran clean". It needs `--bank`.
5. check-sign-pair, check-key-extremity, check-symbolic-hub,
   check-equivalent-options and check-live-closure page with `.range()` but no
   `.order()`. Today's totals reconcile with the count (1242+101 = 1343; 1343
   read), but an unordered page is not guaranteed stable.

## 2. Independent key recomputation

**Sandbox replay.** The live rows store no `solve`, so each live item was matched
to its source batch (prompt + key, across 206 batch files / 4208 solve entries)
and the snippet was re-run.

    matched to a real solve     527   (all 523 non-v2 items + 4 v2)
    recompute == live key       527 / 527
    break test (a distractor promoted to key)   527 / 527 now FAIL
    verify_meta.computed vs current key          0 disagreements of 1343
    v2 with no recoverable solve                816   (13 more match only a `return null;` control placeholder)

This is the author's own code agreeing with itself, and SADV7B-05 shows that
is not independent. The independent part is the sympy check (66 items) plus a
hand read (§3). **816 v2 items have no mechanical key check of any kind.**
Their stems are free-form, not templated, so closing that gap needs either
hand solves or a model.

**Equal-value options.** Written for this audit and self-tested on fixtures
(0.5 vs 1/2, 2√3 vs √12, 2(x+3) vs 2x+6, U+2212, 4π vs 4pi, plus three that
must not fire). It parses radicals, π, decimals and fractions numerically and
compares expressions symbolically.

    1292 items with ≥2 parseable options; 1 equal-value pair; 0 keys missing from choices; 0 duplicate strings

**Extremum ("least/greatest") items.** All 110 live stems containing
least/greatest/smallest/largest/minimum/maximum were read by hand and
recomputed, including the table items from their graphic data. None has a
condition without an extremum (the SADV7B-05 class); every key is correct.
SADV7B-05 itself is not live.

## 3. Flags, each hand-verified

**Confirmed: two options with the same value (1).**

- `df25c0d2-97b3-4a24-864d-2953fd807bfe` (v2, Geometry, hard). The longer leg
  when the altitude splits the hypotenuse into 4 and 9. The key is `3√13`, and
  the option `√117` is the same number (9·13 = 117). The stem's "in simplest
  radical form" makes it formally defensible, but the real SAT never makes a
  student choose between equal values: a student who computes √(9·13) correctly
  and stops is marked wrong. check-equivalent-options missed it because it does
  not parse radicals. **Owner decides; not edited.**

**Confirmed: wording defect (1, not arithmetic).**

- `820a40b5` "using **exactly** 2 kilograms of a flour supply … only has 900 grams
  of water". At 5:3, 2 kg of flour needs 1200 g of water, so the premise is
  impossible. The key 2400 (1500 g flour + 900 g water) only works if
  "exactly" is dropped. The distractor 3200 is what a literal reader computes.

**Refuted (false positives from the sympy checker).**

- `6d6cdd12` resistors: r1+r2 = 11 and r1·r2 = 15, so R = 15/11. The key is
  right; the checker solved for the roots, not R.
- `d035977c`: 0.15x = 9.6, so x = 64. The key is right; this is checker defect 2.

**Structural (not key errors, recorded).**

- Two FULL derivational hubs remain: `0729744e` (key 4 → 16, 8, 3) and
  `e92b3c49` (key 2 → −2, 3, 4; also B8-held).
- 8 groups / 16 rows are the same question asked twice in v2, with the same
  key (normalised prompt + graphic + key): 05d545ec/2804a6ed,
  193a4191/47a971c0, 2c0a61eb/9fc75410, 2f64a1e3/7fd1d3e5, 3977d8f9/ec28917b,
  68ca9070/b91531df, 707f8d63/a69b0501, cc6cb282/e4e72c1b. The register's "zero
  share prompt+passage+choices" holds, because the choices differ; the
  question does not.
- Key-extremity at 31.6% is the largest live arithmetic channel this audit
  measured. "Strike the largest and smallest" is worth about +9 points over
  1242 items.

## 4. B8 held items

26 held = 22 `HELD` + 4 `FAIL` in check-repairs.mjs. The proposals are in
`b8/held-proposals.md`: 5 proposed, 13 weak (legal but with a placeholder
value), 8 that need re-authoring. None was applied.

## Reproduce

The dump and the two scratch checkers (the equal-value checker and the
two-replacement B8 rule check) were run from the session scratchpad and are
not committed. Re-derive the population with the same filter, and assert
`loaded == count(head) == distinct ids` before any number.
