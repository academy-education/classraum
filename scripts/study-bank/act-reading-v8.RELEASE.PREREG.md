# ACT Reading v8 (4 sections, 144 items): release route, pre-registered (2026-10-23)

**Committed with the staged insert, before any run is drawn.** Owner, 2026-10-23: "Start both" (SAT hard + ACT).

## Why
ACT Reading allows 4 clean forms (18 live passages; 4 per form). No real student is near it yet, but it is the
thinnest section of any test. Four sections take it to about 8.

## The batches
Four complete sections (`act-reading-v8a`..`d`), each 4 passages x 9 in the published genre order with one paired
passage, written by four Claude agents to `scratchpad/act-reading-v8-work/BRIEF.md`: the ACT verbal leaks closed
as rules (no hedged key among absolutes, no key-longest/three-part-list tell, no line numbers, distractors not
lifted truths), topics checked against every live ACT/SSAT/ISEE/MAP passage, real facts hedged.
`act-bank-helper check reading`: structure OK on all four (domain mix 17/12/7 each; key slots 9/9/9/9).
**Co-founder-standard grader: 1/144 flagged** (v8c item 2, a literal "failing hearing" reading of a figurative
line); the distractor was replaced before any sitting. ACT sections are fixed-size, so items are fixed, not dropped.
Inserted staged (`BANK_VERIFIED=false`) with `BANK_GATE_OVERRIDE` recorded: on ACT verbal the options-only attack
saturates and the human sitting decides (CLAUDE.md 2026-09-21; act-reading-v4/v7 precedent).

## Release route (COFOUNDER-GRADER-2026-10-22.PREREG.md Amendment 1)
- v8a, v8b, v8d: spot run of one seeded passage ('spotcheck-groups-act-v8-2026-10-23': a p3, b p4, d p2). All 9
  "Only defensible" -> the whole section released. Any flag -> that passage archived and the section's other
  passages go to a full sitting first.
- v8c: full sitting (every third batch), per-item rule; 2+ flags in a passage archive the passage.
- After release: `form-capacity.mjs` ACT Reading line.
