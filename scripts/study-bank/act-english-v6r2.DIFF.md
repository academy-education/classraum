# `act-english-v6r2` — repair of the Production of Writing key balance

Source: `act-english-v6r.batch.json` (50 items; the Conventions repair, **not
overwritten**).
Output: `act-english-v6r2.batch.json` (50 items, same 5 passage groups of 10,
same 27/15/8 domain split, same item order and ids).

Build: `node scripts/study-bank/build-act-english-r2.mjs`
Self-test: `node scripts/study-bank/build-act-english-r2.mjs --selftest`
Measure: `node scripts/study-bank/check-production-key-balance.mjs <file>`

## What is being repaired against

REGISTER §5, 2026-09-12. `v6` was the file the measurement came from: **all four
relevance items keyed Kept, all four purpose items keyed Yes — 8 of 8, p=0.006**,
against a live ACT English bank at 11 of 21 = 52.4%. Plus `Point D` never the key
on any of the five placement items (v6 keys B,A,C,B,A), which the serve-time
shuffle cannot dissolve because the options ARE the `Point X.` strings.

## The target is the LIVE RATE, not zero

**52.4%.** `4 of 8 = 50.0%` is the reachable value closest to it, and was chosen
before any edit. Inverting the batch to 0% would be the same defect written
backwards.

The balance is spread across BOTH subskills, not concentrated in one. That is
load-bearing here: with 4 relevance and 4 purpose items, flipping only the purpose
items would have reached 4 of 8 overall while handing a student the rule "Kept for
a relevance item, No for a purpose item" — worth 8 of 8, i.e. the original defect
re-encoded. Two of each were flipped instead, so the best fixed strategy scores
4 of 8.

    stratum                            BEFORE           AFTER
    relevance of a detail [Kept/Del]   4 of 4 Kept      2 of 3 Kept
    relevance of a detail [Yes/No]     —                0 of 1 Yes
    purpose of the essay  [Yes/No]     4 of 4 Yes       2 of 4 Yes
    ---------------------------------------------------------------
    Kept/Yes                           8 of 8 = 100.0%  4 of 8 = 50.0%   binomial p vs 50% = 1.000

    placement keys                     B,A,C,B,A        B,A,C,D,A
                                       D never a key    A:2 B:1 C:1 D:1

## What changed: 5 items, 1 declared passage edit

### `ACT-EN6-P1-Q09` (relevance of a detail) — Kept → **Deleted** *(the passage edit)*
The previous target sentence, "On a strip of masking tape she recorded the
temperature of every dough.", genuinely IS load-bearing — deleting it would have
made the key wrong, so it was left in place and left doing its work. One sentence
was inserted into `en6-p1` ¶3 instead, immediately after the thermometer:

> **Thermometers of that type have been sold for kitchen use since the 1970s.**

and the item now asks about that sentence. Deleted is correct on content: the
paragraph runs from how Marisol measured to why the numbers mattered ("dough
cannot read a clock"), and the decade an instrument reached the retail market is
never picked up again. This is the same construction the file already uses for its
one pre-existing Deleted key in `v5` (the sixteenth-century cello fact).

**This is the one place where the "compare EQUAL as objects" constraint is
relaxed, and the relaxation is exact.** `passage` is duplicated into all ten items
of a group, so editing a passage necessarily changes the `passage` field of the
seven Conventions/Knowledge items in `en6-p1`. For those seven the build asserts:
every field OTHER than `passage` is byte-identical; the passage differs by exactly
the one declared insertion (anchor required to occur exactly once); and **every
string those items quote in their prompts still occurs verbatim in the new
passage**. Break-tested: corrupting the passage so that `ACT-EN6-P1-Q05`'s quoted
"A cold kitchen meant a slow rise…" no longer matches aborts the build. The other
28 protected items in the file compare fully equal as objects.

### `ACT-EN6-P5-Q09` (relevance of a detail) — Kept → **No**, and delete → add
"Commercial stations sold audiences to advertisers." is the term that "KMRW sold
nothing; it asked" negates; it cannot be made deletable without breaking ¶3. The
item was converted to the other ACT form of the same subskill — *should the writer
make this addition?* — with an addition that is genuinely wrong for the paragraph:

> **The first commercial radio advertisement in the United States was broadcast in
> 1922.**

It pushes an unused date between the two halves of the contrast. The passage is
untouched. This keeps the item in the scorable Yes/No stratum, preserves its
`domain` and `subskill`, and required no second passage edit.

### `ACT-EN6-P2-Q10` (purpose of the essay) — Yes → **No**
New request: *a brochure explaining how the tides that create the pools work.* The
brochure describes what the tide leaves behind, the bands, one animal and three
instructions, and never names a cause for the tide or describes how one works.
Scope-based; no passage change.

### `ACT-EN6-P3-Q10` (purpose of the essay) — Yes → **No**
New purpose: *explain how a person becomes an ASL interpreter.* Everything the
profile supplies is about practising the job — advance reading, fingerspelling
versus a sign, placement in space, reading the platform — and none of it concerns
training, certification or how Ruiz entered the field. Deliberately NOT phrased as
"how ASL differs from English", which the essay partly does do and which would
have left two defensible answers.

### `ACT-EN6-P4-Q08` (sentence placement) — Point B → **Point D**
Inserted sentence changed to **"That distinction, between the record and the
honor, is the whole of the case."** It names two things, so both must precede it:
at A neither has appeared, at B only the daily-repetition claim, at C the record
but not the honor. Only at D are both behind it, and there it closes the paragraph
on the distinction the paragraph builds. *(Same deviation as v5r2: the mechanism
was reached through the proposed sentence rather than by moving passage text,
because the `[A]`–`[D]` anchors already sit correctly and the other nine items in
the group must stay coherent.)*

## Option sets were also re-ordered

The four rewritten four-option sets initially all placed the key at index 2. Keys
were spread to indices 3, 0, 2, 3 — and deliberately away from index 1, because of
the pre-existing slot-B concentration recorded below. Whole-file key-slot
histogram moved 13/25/6/6 → **11/24/7/8**.

## Assertions (all break-tested)

`build-act-english-r2.mjs --selftest`: 12 corruptions on this file, all caught —
a Conventions item's choices edited; its key edited; a Knowledge item's
explanation edited; a Knowledge item gaining a field; a Conventions item losing a
field; a `domain` changed; an item dropped; an item reordered; a passage group
losing an item; a patched key not among its own choices; an UNDECLARED passage
edited; and a declared passage edit that destroys a protected item's quoted string.

Also asserted: 50 items, 5 groups of 10, 27/15/8, ids and order unchanged, every
key present in its own choices, no duplicate choices, the passage-edit anchor
unique.

## Found while measuring, NOT repaired — report only

**The Conventions repair that produced `v6r` collapsed the key slot.** Conventions
keys only, index within the stored `choices` array:

    act-english-v6.batch.json  (before repair)   7 /  6 / 6 / 8    n=27
    act-english-v6r.batch.json (after repair)    7 / 19 / 0 / 1    n=27   p <= 3.7e-06
    act-english-v4r.batch.json (same method)     2 / 25 / 0 / 0    n=27   p <= 7.2e-13
    act-english-v5.batch.json  (before repair)   5 /  8 / 5 / 9    n=27
    act-english-v5r.batch.json (after repair)    5 / 11 / 5 / 6    n=27   p <= 0.21

All 27 Conventions items open with `No Change`, and the repair author wrote the
corrected form as the FIRST named alternate every time. `act-english-v6r.DIFF.md`
says "No letters were shuffled (unreachable…)", which is the reasoning that
installed it. It is the register's own corollary — *a batch built to one brief
develops a cross-item tell* — in a fourth costume, and `verify-answer-key-spread.ts`
would not have been consulted because the repair was framed as text-only.

It is probably invisible to a student: `shuffleDrawnChoices` (assemble.ts:61)
randomises all four options per session for these types. It is still an authoring
habit, it is worse in the REPAIRED files than in the originals, and `v4r` — the
run the register calls "landed exactly on target" — is the worst of the three at
25 of 27. These items were out of scope for this pass and were not edited.
