# Length rebalance — I&I and C&S key-length tell (2026-08-16)

Repair for the finding in REGISTER.md §5 "B2 sat in full" (2026-08-16):
the reviewer rode "if there is a longer answer that's UNIQUELY long, I
keep choosing that" to +15 margins in Information and Ideas and Craft
and Structure. Brief: LENGTHEN one distractor per affected item — keys
carry content and are never touched.

Tooling: `rebalance-length.mjs` (selftest / measure / export / apply).
The measure logic passed a 5-fixture selftest (key-longest-outlier,
balanced, key-shortest, exact-15%-boundary, longest-but-under-ratio)
before touching the bank.

## Population, before and after

Live unarchived rows; "key-longest" = key strictly longest by character
count; TARGET = key strictly longest AND >= 15% longer than the longest
distractor (the reviewer's "uniquely long" case); mean gap = key length
minus longest-distractor length.

    domain                     n    key-longest %      outlier targets    mean gap
                                    before  after      before  after     before  after
    Information and Ideas    240     34.2    15.0        52      0        -0.8   -10.5
    Craft and Structure      210     29.5    10.5        44      0        -3.1   -12.0

(The register's 08-16 numbers were 36.7 / 30.5; today's before-measure
read 34.2 / 29.5 — the 08-15/16 item-level resolutions moved a few rows
between the two measurements. Same query pattern, whole population,
paginated past the 1000-row PostgREST truncation.)

## Edits

96 targets exported (52 I&I, 44 C&S), authored by 5 Claude subagents in
batches of 20/20/20/20/16 under hard rules: lengthen exactly one
existing distractor with passage-grounded but still-wrong detail, >= 90%
of key length, no template reuse across items, never touch the key, no
duplicate choices.

Applied: 96/96, **0 refusals** from the apply guards (guards reject:
index at the key, new_text equal to key, duplicate of another choice,
new_text under 90% of key length, item still an outlier after the edit,
row not live). 0 explanations rewritten — none quoted the old
distractor verbatim. Old choices preserved in
`verify_meta.legacy_choices_length`; `content_sha` is generated, so all
96 rows' stale attack/review bindings detached on update, as intended.

## Spot-check (10 random edits, read against their passages, pre-apply)

All 10 PASS — the lengthened distractor remains unambiguously wrong:

- 0e815978 C&S: "specific overlooked inventor whose contribution was
  never patented" — passage says no nameable inventor. Wrong.
- 2379673c C&S: recommends dozens of funds — the passage's evidence is
  that this paralyzes savers. Wrong.
- 381a0e45 C&S: cost of engineering drives — cost never mentioned;
  passage's limit is evolved resistance. Wrong.
- 4d92f808 I&I: "simply by adopting the lime-clast recipe" — passage
  says durability owes as much to undemanding use. Wrong.
- 602bb721 C&S: "trace how Woolf's views evolved" — passage corrects a
  characterization, traces nothing. Wrong.
- 7998722a I&I: restates the correlation — exactly what the critics say
  cannot separate the hypotheses; does not strengthen. Wrong.
- 8f51893a C&S: "warn against trusting instruments" — not the opening's
  purpose. Wrong.
- a9ed4caf I&I: obstacle = reconstructing instruments — passage says
  instruments CAN be reconstructed, ears cannot. Wrong.
- ce5c5a0f I&I: "cannot recolonize unless adjacent, even where fungal
  networks survived" — directly contradicted (isolated intact-fungi
  fields recovered quickly). Wrong.
- ed8d9457 C&S: phlogiston "ultimately correct" — passage says it
  failed on a specific technical point. Wrong.

## Did the repair create the inverse tell?

Measured, not assumed (the 08-11 sweep entry set the precedent). A
length-rule attacker over the whole post-repair population:

    attacker                    I&I      C&S     chance
    pick-the-longest           16.9%    11.7%     25%     ← the exploited rule, now dead
    avoid-the-longest          27.6%    29.8%     25%     ← +2.6 / +4.8

Key-longest landed below 25% rather than at it because lengthened
distractors frequently ended longer than the key. The residual inverse
edge (+2.6/+4.8) is the same profile as SEC, which sits at 9.8%
key-longest and came back human-CLEAN at -10 margin in the same B2
sitting — and it is an order weaker than the +12 forward edge that was
just removed. Recorded so nobody re-derives it as a new finding.

## Next steps (out of scope here)

1. Blind-attack regression on a ~24-item sample of the 96 repaired
   items (attack-cohort.mjs conventions; needs run bookkeeping).
2. Re-sit 20 I&I/C&S items with the co-founder under the corrected
   brief — the human sitting is the verdict instrument, the attack is
   the screen.

Files: `rebalance-length.mjs`, `length-rebalance-targets.json` (the 96
as exported, pre-edit), `length-rebalance-edits.json` (the applied
edits). Nothing committed.
