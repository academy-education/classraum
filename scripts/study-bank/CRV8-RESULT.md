# cr-v8 — results (SHIPPED 2026-08-28)

Pre-registration: CRV8-PREREGISTERED.md. Run 2 of the cr-v7 symmetric
four-world method, unchanged; 60 quads by 6 authors; **46 banked**.
Live unarchived Choose a Response 132 → 178.

## Render (mechanical gates)

All three batches at the pre-committed seeds: b1 20260828 (one quota
re-roll → 20260829, offer-kind at 30%, logged by the render),
b2 20260928, b3 20261028. 720 kill-quotes verified to anchor 2+-word
verbatim spans of their own lines; letters dealt 5/5/5/5 per batch.
Two metadata-only fixes within the cr-v7 precedent (options and lines
untouched): a comma inside a quoted kill span, and a kill-label typo
(world 1's kills keyed "1" for text that plainly targets reply 2).

DEVIATION RECORDED: the pre-registration sequenced b2/b3 rendering
after the b1 pilot verdict; all three were rendered first. No
integrity impact — the attack solvers never saw b2/b3, and selection
is seed-deterministic — but the record should say what happened.

## Pilot blind attack — 12 from b1, keys 3/3/3/3, control exactly 25%

    solver a   3/12 25.0%
    solver b   1/12  8.3%
    solver c   4/12 33.3%

    mean 22.2%   margin −2.8   CLEAR (kill bar +30)
    confident picks 3/19 — confidence again below chance

## Exclusivity — frozen EXCLUSIVITY-GRADER-BRIEF.md, all 60, blind to key

46 unique / 14 contested. The 14 discarded whole (no repair pass —
the cohesion lesson from cr-v7 is baked into the brief, and the
no-edit invariant stays intact this run). Construct check: on all 46
uniques the grader's independently chosen sole-defensible option
matched the RNG-picked key **46/46**.

Contested clustering: 8 of 14 in batch b2 (both b2 authors, 4 each) —
town-shop settings produced more offers whose alternatives are
mutually compatible. Worth a brief note if a cr-v9 is ever authored:
conditional offers ("if you repair it / set it aside / trade it")
breed defensible second replies.

## Cross-batch held-out attack — 24 of the 46 survivors, none from the pilot

    solver a   5/24 20.8%   (re-run: first invocation answered a
    solver b   4/24 16.7%    fabricated id and skipped a real one —
    solver c   7/24 29.2%    refused, re-run per protocol)

    mean 22.2%   control 33.3% (best fixed letter)   margin −11.1   CLEAR

Solvers marked nearly every pick "confident" and still scored below
chance — the by-construction independence holding at scale.

## Elimination probe — options-only, all 46

2/46 "certain" rejects; both landed on DISTRACTORS (keys were C on
both), both reasoned from topical narrowing the attacks already price
in. 44/46 uncertain.

## Tells — the 46 survivors

Key length rank worst slot 34.8% (bar 40%); hedge keys 6.5% vs
distractors 8.7% (the safe direction); intensifiers 0%/0%; zero
near-dup pairs (J≥0.5) against the live 132 or within batch; letters
10/10/12/14 after the contested drops.

## Ship

Ledger `crv8-2026-08-28` at sha 3ddd89cb7797fe46…; inserted 46 via
bank-crv8.mjs (the flat-letter-preserving path — NEVER
insert-listening, whose shuffle would replace the measured deal); NO
archive step, cr-v7 stays live. Live CR verified by count: 178.
Row-level verify: 5/5 sampled rows byte-identical after DEEP
canonicalization — the first verify pass reported 4/5 "differs"
because it sorted only top-level keys while Postgres jsonb reorders
nested ones; the checker was fixed and the green confirmed real.

Capacity: CR-binding Listening paths go from ~9 to ~12 forms
(per-form quota 14).
