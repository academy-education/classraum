# sat-ii-hard-v17 + sat-wic-hard-v17 (cohorts rw-v17-ii-hard, rw-v17-wic-hard) — pre-registration

Written before any item is authored. Bars and per-item rules are the SEC v14 /
WIC v7 bars (PREREG-SEC14-2026-10-07.md, PREREG-WIC7-ALG18-2026-09-26.md)
restated so they cannot be reinterpreted; what is new is the control
construction for these two domains, the one-frame brief, and rule 8.

## State before (2026-10-07, live, paged 1153 of 1153 R&W rows)
- form-capacity "SAT MODULE-2 HARD ROUTE": **7 forms**, capped by SEC (49 hard /
  7). Hard by domain: I&I **59**, C&S **70**, SEC 49, EoI 81.
- The assembler's module-2 quota (blueprintQuotas over BLUEPRINT at 27 items):
  C&S **8**, I&I **7**, SEC 7, EoI 5 per form.
- **Hard deficits** (row-domain counts, panel-median HARD only counts):
  - I&I: form 9 needs 63 (**+4**), form 10 needs 70 (**+11**)
  - C&S: form 9 needs 72 (**+2**), form 10 needs 80 (**+10**)
  - SEC must also reach 56 (form 8) / 63 (form 9) — another agent's commission.
- verify-sat-hard-route.ts reading_writing 11: 7 of 11 forms all-hard,
  0 repeats; form 8 falls back on SEC, form 9 on I&I/C&S/SEC.
  NOTE: its per-domain line labels items by the jsonb `item.domain`, not the row
  `domain` the assembler draws on, so after the 2026-09-12 refiling it prints
  I&I 4-7 / C&S 8-11 per form while the draw is 7/8. The deficits above use the
  row column.

## What is commissioned and why these strata
24 items, four Claude authors (never GPT), 6 each, disjoint topic areas.
- **C&S: 12 Words in Context, word-shaped** (single word or ≤2-word phrase; no
  gloss/definition options — the live gloss family measured +42.9 / 88.9%).
  WIC is the only C&S stratum measured clean (12.5% / 33.3% / word-control
  36.4%); Text Structure 87.5% and Cross-Text 75.0% are not commissioned.
- **I&I: 6 Command of Evidence (textual, "which finding, if true, would most
  directly support/weaken ...") + 6 Command of Evidence (quantitative, a table
  graphic).** The least leaky I&I strata live (70.8% / 79.4% vs Inferences 98.8%,
  Central Ideas 100%). Inferences and Central Ideas are not commissioned.
- **Transitions is NOT commissioned**: it is an Expression of Ideas subskill and
  buys no I&I or C&S form.

**The one-frame rule (the axis-alignment rule, CLAUDE.md):** options must not
differ along the axis the stem names.
- Textual CoE: all four findings share one design and one vocabulary and vary
  only which group/condition/direction; if the key contains a contrast or a
  control comparison, every option does; no option uniquely hedged or uniquely
  absolute; at least one distractor is the finding a RIVAL account named in the
  passage predicts, so plausibility alone cannot pick the key.
- Quantitative CoE: all four options are in one sentence frame and at least
  three of the four are ACCURATE readings of the table; only the claim decides.
  The key needs a comparison across two cells/rows, not a single lookup.
- WIC: all four options one part of speech and one register; no odd-one-out by
  valence, length or rarity; each distractor fits the blank's own sentence and is
  killed by a DIFFERENT sentence of the passage in at least 2 of 3 distractors;
  the key is neither the plainest nor the rarest option in more than half of an
  author's items. Argument shape varied — at most 2 of 6 per author on the wic7
  machine ("X is usually read as A; the records show B; X was really ___").

## Pipeline
4 authors -> merge per domain -> **freeze** (sha recorded) -> pre-flight
(bank-helper check, key-letter spread, key length rank, within-batch stem and
option overlap, read by hand) -> duplicate scan of the frozen files against ALL
live R&W rows (paged, count-asserted; passage word-trigram Jaccard, option-set
overlap, WIC key-word reuse) -> options-only attack (3 fresh solver samples per
domain render) + 3 fresh with-source graders per domain (ws-d/e/f; phase 1 cold
written before any key is shown, phase 2 key + explanation) -> gate-verdict.mjs
+ rule 8 -> elimination-paired.mjs --batch (A23) -> mk-rw-qc.mjs -> ledger ->
insert -> verify-sat-hard-route.ts + form-capacity.mjs. **No audit-and-repair
round, no repair after freeze.** Anything caught after freeze is dropped or held.
Every agent is Claude.

With-source render: `BLIND=bare node bank-helper.mjs blind <frozen>`, asserted
before any grader reads it to contain no subskill string.

## Controls (options-only, same render, keys dealt flat, interleaved per domain)
- **C&S**: 24 live Words-in-Context items, WORD-shaped by score-oo-by-shape's
  rule: all 12 live hard word-shaped + 12 of the 27 medium word-shaped (seeded
  draw). The hard-only sub-arm (n=12) is printed, not decided on.
- **I&I**: 24 live Command-of-Evidence items: 12 hard TEXTUAL ("finding, if
  true") drawn from 26, and the QUANTITATIVE arm from the only pool that exists —
  2 hard + 10 of the 32 medium quantitative (graphic or data stem). Stratum
  sub-arms printed, not decided on (n=6 candidate each).
- Pool sizes were read before authoring; no control item has been rendered or
  solved. No cohort of this session exists live, so nothing is excluded.

## Ceiling / floor check — the control's attainable range
Each control is 24 items x 3 samples = 72 picks; the letter line is the realised
best-fixed-letter (25.0% by the flat deal). The single bar "candidate minus
control <= +10" can fire in both directions only while the control sits in
**(letter line + 5, 90%]** = (30%, 90%]. Prior readings sit inside it: WIC word
control 36.4% (wic7), live CoE 70.8% / 79.4% (2026-09-04, mixed band). **If a
control returns above 90%, or at/below 30%, that domain's blind half is reported
NOT MEASURED, not passed**, and the with-source half decides (I&I has a human
sitting on v2 at 36.7% against a model 90%+, so saturation is plausible there).

## Bars
- **Blind (per domain):** candidate minus matched control <= **+10**; above it
  the domain's batch is HELD whole.
- **Unanimity:** batch-level rate vs the control's rate only; never a per-item drop.
- **Per-item drop** (gate-verdict.mjs rules 1-6):
  1. key disputed by any grader — **a phase-1 cold miss counts as a dispute**
  2. not exclusive by majority
  3. distractors weak by majority
  4. median of 2+ of 3 distractors free-strikable
  5. explanation path wrong per any grader
  6. a grader-majority resolving word within four words after the blank (WIC)
- **Rule 8 (new): key retrievable from one sentence.** If a grader majority
  marks `key_from_one_sentence: true` (I&I: the key is matched by locating one
  sentence/one cell, no combination; WIC: the blank's own sentence alone decides
  it), the item **may not bank hard**: its difficulty is capped at medium. It is
  not dropped for this alone.
- **Elimination (A23):** candidate minus matched live control eliminable-rate <=
  +20, control <= 80%, n >= 12 per arm; run on all authored items of the domain if
  fewer than 12 survive. Matched on subskill (ratio 2).
- **Difficulty:** panel MEDIAN, never the author's label; panel-median easy is
  DROPPED, not relabelled.
- **Conservative extensions:** explicit grader recommend-drop -> dropped;
  majority off-blueprint -> HELD for Andy; duplicate-scan flag (passage trigram
  Jaccard >= 0.20 with any live R&W row, >= 3 of 4 options shared with a live
  item, or a WIC key word that is the key of a live WIC item) -> HELD.
- **Cross-item tell:** a batch-level heuristic named by a grader majority is
  recorded even if no item drops on it.

## Need and discard
- I&I: 4 banked HARD buys form 9 on I&I (once SEC reaches 63); 11 buys form 10.
- C&S: 2 banked HARD buys form 9 on C&S; 10 buys form 10.
- With 12 per domain and sixteen consecutive panels demoting the authors, form
  10 is not expected on either domain; reported honestly either way. Medium
  survivors are inserted and do not move the hard route.
- Zero hard survivors in a domain is reported as a failed hard commission for
  that domain regardless of insert count.
- The number quoted is form-capacity's "SAT MODULE-2 HARD ROUTE" line plus the
  per-domain hard counts, cross-checked by verify-sat-hard-route.ts.
