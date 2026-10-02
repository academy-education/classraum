# act-english-v7 — pre-registration (written 2026-10-02, before any item exists)

Purpose: REGISTER §5 A63. Every live ACT English passage is CSE 4 / KoL 2 / PoW 4,
so every form is 40% Conventions against ACT's published 51% floor.

## Target mix (derived, not chosen)

`ENGLISH_QUOTAS` (src/lib/study/act-test.ts) on a 50-item form, as counts:
PoW [29,32]% -> 15-16, KoL [13,19]% -> 7-9, CSE [51,56]% -> 26-28.

With 15 live passages at 4/2/4 and N new passages, a form of k old passages
carries PoW 4k, so k <= 4; CSE needs >= 26, and a new passage tops out near 8,
so k <= 3. Ten new passages + fifteen old = 25 = five disjoint forms of exactly
3 old + 2 new. The new pair must then sum to CSE 14-16, PoW 3-4, KoL 1-3. The
only per-passage mix for which EVERY pair qualifies is **CSE 7 / PoW 2 / KoL 1**
(a form then reads 26/16/8 = 52/32/16%, inside all three ranges). Every new
passage is authored to that mix. The load-bearing elements (what the PoW/KoL
items ask, which mark keys a boundary item, whether NO CHANGE keys) are varied
across passages by a written plan, not left to the brief.

Authored: 12 passages (120 items), so that up to two can be lost at the gate
and ten still land.

## Bars, fixed before results

1. **Structure** — act-bank-helper `check english` exits 0. Batch-level refusals
   (pre-flight, mine): any key slot > 35% after the make-attack deal; key uniquely
   longest OR uniquely shortest in > 25% of items; NO CHANGE keying outside
   15-35% of items that offer it; any placement letter never keyed; Kept/Yes
   polarity outside 30-70%; semicolon the key on > 35% of boundary-punctuation
   items; a twin pair (two options equivalent in meaning and correctness).

2. **Blind split attack — a SCREEN, never a verdict** (B7: model 76-79%, human
   10% on shipped ACT English). SPLIT=10, one item per passage per file, a
   different solver per file. Compared per domain against the existing matched
   live control (actlive-score.mjs, 2026-09-12): CSE 68.0% (n=25), PoW 66.7%
   (n=21), KoL 92.9% (n=14). Ceiling check: CSE and PoW leave 32/33 points of
   headroom, so a +15 bar can fire; KoL leaves 7.1 and is REPORT-ONLY (a bar
   there cannot fire). Screen flag = candidate domain rate > live + 15 points.
   A flag does NOT drop items (repairing to the instrument is fitting) — it is
   recorded and the human sitting oversamples that domain. Items are not
   repaired on blind evidence alone.

3. **With-source key grade — DECIDES.** Three independent samples (Claude
   subagents), each sees passage + stem + options, key unmarked. Per item:
   - drop if ANY sample's pick differs from the key;
   - drop if >= 2 samples name the same second defensible option;
   - PoW items that need the essay (placement, purpose, add/delete, transition):
     drop if >= 2 samples mark `no_source_needed` (answerable from stem+options
     without the passage).
   - CSE/KoL items are by design decidable inside the quoted sentence; single-
     sentence retrievability is recorded for them, not a drop rule.
   A dropped item may be repaired ONCE; the repair re-enters bar 3 with three
   fresh samples. A second failure drops the item, and a passage with a dropped
   item is dropped whole (passages are exactly 10).

4. **Insert** — the passing passages (target 10, an even number so pairs close),
   STAGED (`BANK_VERIFIED=false`) per bank-act-english §3, cohort `act-english-v7`.
   Released only by a human sitting under the bank-gate §5 rule (<= ~40% blind
   clean, >= ~60% archive, between = second reader).
