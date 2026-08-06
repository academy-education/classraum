# The SAT Math hub was never bank-wide. 2026-08-06

**The 730 unrepaired items sit at +1.8pts over control. The defect was
concentrated in the 90 items that were already repaired, where it ran at
+73.3.**

The backlog said "derivational hub CONFIRMED bank-wide (64.4%)" and I
opened this expecting a 730-item repair job. Measuring first turned it
into a ~40-item one.

---

## The measurement

`check-math-hub.mjs`, read-only, no model. For each option, count how
many of the other three are reachable by one plausible slip (negate,
double, halve, square, sqrt, reciprocal, ±1, ×10, ÷10, 90−x, 180−x).
The hub is the option reaching the most. An item scores 1/k when the key
is among k tied hubs.

Under that rule a randomly-placed key scores exactly 25.0%: with k tied
hubs the key lands in the set with probability k/4 and earns 1/k, so the
expectation is 1/4 for any k. **The control is 25.0% by construction,
not by measurement** — which is what makes the comparison safe, and it
is asserted in `--selftest` by rotating the key through all four
positions and checking the credits sum to 1.

Population rate = credit over every scorable item, so an item with no
derivational structure counts as 0 rather than being dropped. Control
scales with how many items have structure at all.

    cohort                    scored  structured  hub-is-key  control  margin
    the 90, BEFORE repair         90          90       98.3%    25.0%   +73.3
    the 90, AFTER repair          90          22       16.7%     6.1%   +10.6
    the other 730, untouched     672         168        8.0%     6.3%    +1.8

## What that says

**1. The defect was real and severe — in those 90.** 98.3%, with all 90
carrying a derivational structure. Essentially every one of those items
could be answered by finding the number the others orbit.

**2. The repair worked.** It removed the structure entirely from 68 of
90 items and dropped the population rate 98.3% → 16.7%. Every one of
the 90 had its option set genuinely changed (0 identical to the stored
original), so this is a real before/after on the same items, not a
comparison of different populations.

**3. It was never bank-wide.** The untouched 730 sit at +1.8pts. Only
25% of them have any derivational structure, and within those the key is
the centre barely more often than chance. Whatever produced the 64.4%
figure was measured on a sample drawn from the affected cohort, or the
affected cohort has since been fully repaired — either way the premise
"730 items need rewriting" is false.

## APPLIED, 2026-08-06 — and the result

41 items repaired and written (`apply-math-hub-repair.mjs --file
math-hub-r2-proposed.json`). 41 updated, 0 missing, 0 failed.

    cohort                        structured   hub-is-key   control   margin
    unrepaired remainder (703)     141 / 645       19.2%     25.0%     -5.8
    repaired cohort (117)            8 / 117       12.5%     25.0%    -12.5

**Both cohorts now sit BELOW chance.** The key is the derivational
centre of its own option set less often than a random option would be,
which is what the absence of the defect looks like — not 25% exactly,
because removing a deliberate hub tends to leave the key slightly
peripheral.

Post-write verification, on the live rows rather than the proposal file:

    written as proposed                    41/41
    key present and unchanged              41/41
    no key-hub remains                     41/41
    structured items in the remainder     168 -> 141
    full hubs (key derives all three)      18 -> 0

And the property that mattered for the 14 items being repaired a SECOND
time: `legacy_choices` still holds the TRUE original, not the round-1
overlay, on 14 of 14. The apply script only writes the backup when
absent, so a re-repair cannot destroy the record of what the item
originally was.

## What was left before the apply

- **22 of the 90 repaired items still have the key as hub** (+10.6 over
  their control). The repair reduced them rather than clearing them.
  These are a known, bounded second pass.
- **18 unrepaired items are unambiguous full hubs** — the key derives
  all three distractors with no tie. e.g. key 5 with {10, 25, 50}
  = double, square, times-ten; key 6 with {−6, 36, 3} = negate, square,
  halve. These do not need a model to condemn.

That is ~40 items with a precisely identified defect and an existing
repair script, against the 730 the backlog implied.

## Two corrections to my own reasoning, recorded because both were the
## kind of mistake that ships

**I called the validation a failure when it was a denominator error.**
`--validate` scored the repaired items at 68.2% against a known 23.6%
and I reported the detector as unreliable. 68.2% is the rate *among the
22 items that still have structure*; the population rate over all 90 is
16.7%. Comparing a conditional rate to a population rate is not a
validation failure, it is two different questions. The script now prints
both, labelled.

**The first version of the detector over-fired, and the self-test caught
it before the bank did.** `12, 13, 17, 19` scored as a hub because
12 + 1 = 13. One ±1 neighbour among consecutive integers is arithmetic
coincidence, not a derivational structure, and it inflated the repaired
items from 16.7% to 34.7%. Fixed by requiring a hub to reach at least
two of three; the fixture is pinned.

Both mistakes ran in the same direction — making the bank look worse
than it is — which is the safer direction to be wrong in and still
wrong. Had I skipped the self-test and the before/after, the output
would have been a confident case for rewriting 730 sound items.

## Method note

No model was used anywhere in this. The defect is arithmetic, so it is
decidable, and the whole 820-item population was measured exactly for
the cost of one script. Every other tell in this project needed a model
because it was semantic — this is the exception, and it is the only one
where measuring the full population was possible rather than sampling.
