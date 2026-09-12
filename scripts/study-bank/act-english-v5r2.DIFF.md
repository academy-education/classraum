# `act-english-v5r2` — repair of the Production of Writing key balance

Source: `act-english-v5r.batch.json` (50 items; the Conventions repair, **not
overwritten**).
Output: `act-english-v5r2.batch.json` (50 items, same 5 passage groups of 10,
same 27/15/8 domain split, same item order and ids).

Build: `node scripts/study-bank/build-act-english-r2.mjs`
Self-test: `node scripts/study-bank/build-act-english-r2.mjs --selftest`
Measure: `node scripts/study-bank/check-production-key-balance.mjs <file>`

## What is being repaired against

REGISTER §5, 2026-09-12 — the Conventions repair brief forbade touching the
Production items on a rate measured on `v4`, and the stratum was never measured
in `v5`/`v6`. Scoring only items whose OPTION SET carries the Kept/Deleted or
Yes/No shape:

    live ACT English bank    11 of 21 =  52.4%   <- a real ACT runs near 50%
    act-english-v4            2 of  6 =  33.3%   p=0.91
    act-english-v5            8 of  9 =  88.9%   p=0.027   SIGNIFICANT
    act-english-v6            8 of  8 = 100.0%   p=0.006   SIGNIFICANT

Plus: `Point D` was never the key on any sentence-placement item (v5 keys
A,C,B,C,B). `shuffleDrawnChoices` does not dissolve that one — the options ARE
the strings `Point A.`…`Point D.`, so the shuffle moves the string and the key
is still `Point D.`.

## The target is the LIVE RATE, not zero

**52.4%.** Swinging to 0% is the same defect inverted and would be worse, because
it is learnable in the same one sentence ("always answer Deleted / No"). The
target was chosen BEFORE the edits: 5 of 9 = 55.6% is the reachable value closest
to 52.4% (4 of 9 = 44.4% is 8.0 points away; 5 of 9 is 3.2 away).

The balance was also spread ACROSS subskills rather than concentrated, so that no
single rule — "Kept for a relevance item", "No for a purpose item" — beats chance
either. The best fixed strategy available to a student who reads nothing now
scores 5 of 9, which is the point.

    stratum                     BEFORE          AFTER
    relevance [Kept/Deleted]    2 of 3 Kept     2 of 3 Kept      (unchanged)
    adding detail [Yes/No]      1 of 1 Yes      0 of 1 Yes
    essay purpose [Yes/No]      5 of 5 Yes      3 of 5 Yes
    ------------------------------------------------------------
    Kept/Yes                    8 of 9 = 88.9%  5 of 9 = 55.6%   binomial p vs 50% = 1.000

    placement keys              A,C,B,C,B       A,C,B,C,D
                                D never a key   A:1 B:1 C:2 D:1

## What changed: 4 items, 0 passage edits

**No passage text was altered in this file.** Every one of the 50 `passage`
fields is byte-identical to `act-english-v5r.batch.json`, so all 27 Conventions
and all 8 Knowledge items compare EQUAL AS OBJECTS to their input — the strongest
form of the constraint, asserted and break-tested in the build.

### `ACT-EN5-P2-Q02` (adding detail) — Yes → **No**
The proposed addition was changed from a genuinely useful capacity figure
("It holds 150,000 gallons…") to one the paragraph has already given:
"The tower has been repainted twice in the last forty years." Paragraph 1's own
first sentence is "a white cylinder on four legs that has been repainted twice in
forty years", so the addition is now **redundant**, and it delays the turn from
the visible part to "a set of arrangements almost nobody in town could describe".
The content decides the answer; the key was not flipped under a sentence that
still justified Yes.

### `ACT-EN5-P3-Q10` (essay purpose) — Yes → **No**
The stated goal was changed from one the essay meets ("a craft whose success is
measured by how little it is noticed") to one it does not: *"describe how the
production staff of a regional theater work together."* The essay is a portrait
of one technician; the only other people in it are a director quoted for one
phrase and an unnamed helper standing in a beam. Nothing in the passage changed —
the essay genuinely fails the new goal.

### `ACT-EN5-P5-Q10` (essay purpose) — Yes → **No**
New goal: *"describe the daily work of a bicycle courier."* Paragraph 2 is the
money, paragraph 3 the governing, paragraph 5 the decline; a rider's actual day is
one clause of hazards ("hit by cars, doored, and ticketed"). Scope-based and
uncontestable.

### `ACT-EN5-P5-Q04` (sentence placement) — Point B → **Point D**
The inserted sentence was changed from "The fee was the same whether a rider
worked two days or six." to **"That comparison is what the eleven riders had spent
the spring saying to one another."** "That comparison" has an antecedent only
after "at the old company a rider handed over half of every fare; at the co-op a
busy rider handed over almost nothing", which is the sentence immediately before
`[D]`; at A, B and C no comparison has been made. It also closes the paragraph by
carrying the arithmetic back to the eleven riders of paragraph 1.

*Deviation, stated plainly:* the brief said to make D correct "by editing the
passage". The insertion anchors `[A]`–`[D]` already sit where they need to, so the
mechanism was reached by rewriting the PROPOSED sentence instead. That is strictly
less invasive — it leaves the other nine items in the group untouched and keeps
full object equality for the protected strata — and it produces a genuinely
D-keyed item, which is what the defect required.

## Two option sets were also re-ordered

The three rewritten four-option sets initially all placed the key at index 2 — a
positional pattern in the changed set, the same shape as the slot-A tell the
register already records. Keys were spread to indices 3, 2, 0. Whole-file key-slot
histogram moved 13/15/12/10 → **12/14/12/12**.

## Assertions (all break-tested)

`build-act-english-r2.mjs --selftest` corrupts each guarded property in turn and
requires the assertion to fail. 11 corruptions, all caught:
a Conventions item's choices edited; its key edited; a Knowledge item's
explanation edited; a Knowledge item gaining a field; a Conventions item losing a
field; a `domain` changed; an item dropped; an item reordered; a passage group
losing an item; a patched key not among its own choices; any passage edited.

Also asserted: 50 items, 5 groups of 10, 27/15/8, ids and order unchanged, every
key present in its own choices, no duplicate choices.

`check-production-key-balance.mjs` refuses (exit 2, **no number printed**) on:
no argument, a missing file, an empty file, non-JSON, JSON that is not an array,
a zero-item array, an item missing `id`/`choices`/`correct_answer`/`domain`, a
`correct_answer` that is not one of its choices, and a file where no item carries
either option shape. An empty single stratum prints `NOT MEASURED - 0 items`,
never a rate. It reproduces the register's own 8/9 and 8/8 on the unrepaired files.
