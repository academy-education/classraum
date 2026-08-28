# reading-worlds-v1 — RESULT: the design works (2026-08-28)

Pre-registration: READING-WORLDS-PREREGISTERED.md. After three
authored-key reading briefs died at +58.3, +61.1 and +61.1, this
applied cr-v7's symmetric-worlds cure to reading.

## Verdict: PASS, and by construction

    blind attack   mean 15.9%   control 30.4%   margin −14.5   PASS
    hunter         exploitable = false
    cross-variant  23 judged, 4 failed → dropped
    with-passage   votes >= 2/3 on every shipped item

**19 items banked** as cohort `isee-reading-worlds-v1` — the first
Reading content either test has ever had. ISEE 181 → 200 items.

## Why this is different from "the brief got better"

Solvers were armed with all three rules that killed the previous
batches and asked which still fired. They reported that TENSION "discriminated
most reliably" and "fired decisively on 8 items" — and scored 15.9%.
One solver marked all 23 items *confident* and got 4 right. The
heuristic is as loud as ever and now carries no information, because
every option is some variant's genuinely best-supported reading: if
balance marks the key, it marks all four. That is the property the
design was built for, and it is the same result cr-v7 produced when
five brief-based rebuilds had failed.

The third solver's own summary is the cleanest statement of it:
"without the passage, these heuristics collapsed... This batch appears
designed specifically to block the tells that broke previous ones."

## The real finding: the cure makes items NON-INDEPENDENT

The hunter could not predict any key, but it reconstructed the variant
axis of all five topics from the options alone — because within a
topic, ONE shown variant answers every question. A student who
identifies the distinguishing fact scores 5/5; one who misses it
scores 0/5 despite full comprehension of everything else.

**Five items per topic therefore carry roughly one item's worth of
independent information.** This is the 2026-08-06 population lesson in
reverse: the device that removed the correlation between options
introduced a correlation between items.

Operating constraint, to be enforced at assembly when these serve:
**draw at most ONE item per topic per form.** Nineteen items across
five topics is five usable slots, not nineteen — which sets the real
authoring cost for a servable Reading section (~40 topics per test for
three repeat-free forms, not ~7 passages).

Checked and cleared: per-TOPIC key-letter collapse (the hunter's own
risk 1) — no topic's keys sit on one or two letters; worst is 2 of 3
in a three-item topic.

## SSAT still blocked, for a structural reason

N variants produce exactly N options. ISEE is 4-choice and fits four
variants; **SSAT is 5-choice and needs FIVE variants per topic.** The
renderer skipped every SSAT topic rather than ship 4-option items into
a 5-choice section. An SSAT re-author at five variants is the fix.
