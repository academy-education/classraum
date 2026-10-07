# ACT English: when a human sitting is required (owner decision 2026-10-07)

Committed BEFORE the co-founder sits act-en8-cofounder-2026-10-07, so the
rule cannot be fitted to that result.

Why sittings exist: on ACT English the options-only model attack saturates
(v7: model 100% blind on CSE, co-founder 16.7%), so a person's blind score is
the only instrument that discriminates. See CLAUDE.md, "the attack itself is
invalid on some families".

Rule:
1. act-english-v8 gets the full 40-item sitting already drawn (CSE 24 /
   PoW 12 / KoL 4, bars in act-english-v8.SITTING.PREREG.md).
2. If v8 is released (CSE and PoW both CLEAN), the authoring method
   (the v7/v8 brief + with-source gate, recovered and committed in v8) has
   passed two consecutive full sittings. From then on, a batch written with
   that SAME method, unchanged in substance, needs:
   - every other batch: a 20-item spot check (CSE 12 / PoW 6 / KoL 2),
     CLEAN at CSE <= 4 and PoW <= 2 correct; ARCHIVE at CSE >= 8 or PoW >= 4;
     anything between -> a full 40-item sitting on that batch;
   - the batches in between: no sitting; they release on the with-source gate.
3. The method falls back to a full sitting per batch if: the brief or gate
   changes in substance, a spot check lands in the dead zone or archives, or
   the with-source gate drops more than 10% of a batch.
4. If v8 is NOT released, this rule does not start; one full sitting per
   batch continues.

The spot-check bars mirror the B7 absolute bars (<= ~35% clean, >= ~65%
archive) scaled to n=12 / n=6; at these n one item moves CSE ~8 and PoW ~17
points, which is why the dead zone sends to a full sitting rather than
deciding.
