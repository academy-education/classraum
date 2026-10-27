# ACT Science agent re-grade: grader prompt template

Fill `{BATCH}`, `{G}` (g1 | g2 | r1) and `{COHORTS}`. Spawn one fresh Claude agent for each grader, with no GPT
and no author or earlier grader. Give each agent only this text. A grader never receives another grader's
output, the coordinator folder or the ledger.

Run the steps in this order (ACT-SCIENCE-AGENT-RELEASE.prereg.md):

1. `build {BATCH}` writes the cold packets.
2. Spawn g1 and g2 on the COLD prompt.
3. When each writes `cold.json`, run `release-keyed {BATCH} {G}`.
4. Send that same agent the KEYED prompt.
5. Run `check {BATCH} {G}`.
6. Run `recheck {BATCH}`. When it reports flagged items, spawn r1 on the re-check prompts. It goes cold, then
   `release-keyed {BATCH} r1`, then keyed.
7. Write `_coordinator/{BATCH}/confirm.json`, then run `decide {BATCH}`.

---

## COLD prompt (g1, g2)

You are a with-source grader for ACT Science batch {BATCH} ({COHORTS}: two complete forms, 80 items, 14
passages). This is a release decision. Your grades, and those of one other independent grader, decide whether
these items reach students. Nobody reads the science after you.

Work in `/Users/andylee/Downloads/saas/classraum`. Read these two files and nothing else:

1. `scripts/study-bank/act-science-regrade/GRADER-BRIEF.md`: the fields, the blindness list and the drop rules
2. `scratchpad/act-science-regrade/{BATCH}-{G}/grader-cold.md`: the packet, with no key

Do the **cold pass only**. For every item, answer from the passage and the decoded figure, recomputing from the
cells. Write `scratchpad/act-science-regrade/{BATCH}-{G}/cold.json` in the brief's shape, with all 80 items:
`cold_pick` (one letter), `cold_defensible` (other letters a careful student could defend; an empty array if
none) and `cold_note` (the cells or points you used).

Do not look for a keyed packet. It is not in your folder, and it is released only after `cold.json` is frozen.
Do not open anything on the brief's blindness list. Write only inside your own folder. Do not edit any other
file, and do not query the database.

When done, reply with `cold.json written: N of 80` and the items where you marked a second defensible option.

## KEYED prompt (g1, g2, sent to the SAME agent after `release-keyed`)

Your `cold.json` is now frozen (sha256 in `cold.lock.json`). Do not edit it. If you do, your grades are void.

Read `scratchpad/act-science-regrade/{BATCH}-{G}/grader-keyed.md`. It is the same packet with the key and the
author's explanation added. Option letters are unchanged. For every item, fill every field in
GRADER-BRIEF.md's table and write `scratchpad/act-science-regrade/{BATCH}-{G}/keyed.json` as
`{ "items": [80 objects], "batch": { "cross_item_pattern": null | { "rule", "items" } } }`. Copy `cold_pick`,
`cold_defensible` and `cold_note` from `cold.json` unchanged.

Rules that matter most:

- `key_correct`: recompute every number the key uses, check a trend over all rows, and check an interpolation
  against both neighbours. A disagreement with your cold pick is data. Explain it and do not hide it.
- `no_source_needed`: cover the passage and figure. Ask whether background knowledge, a textbook formula or a
  named effect gives the key.
- `free_elimination`: list only distractors killed by the stem plus the options, with no passage. Never list
  the key.
- `cross_item_pattern`: answer for the batch as a whole. A pattern must be a mechanical rule, applied without
  the passage, naming 3 or more items across 2 or more passages, that picks the key more often than chance.
  Letter position never counts.

Then reply with:

- `graded N of 80`, then the count for each field
- every `key_correct` that is not `yes`, every `second_defensible`, every `fact_error` and every
  `no_source_needed: yes`, each with its reason
- your `cross_item_pattern` answer
- whether you opened anything on the blindness list

## RE-CHECK prompt, cold (r1: a fresh agent; never one of g1/g2)

You are the re-check grader for ACT Science batch {BATCH}. You read a few items that one earlier grader
flagged. You are not told which flag, or by whom. Grade them exactly as a first grader would.

Work in `/Users/andylee/Downloads/saas/classraum`. Read `scripts/study-bank/act-science-regrade/GRADER-BRIEF.md`
and `scratchpad/act-science-regrade/{BATCH}-r1/recheck-cold.md`, and nothing else. Do the cold pass. Write
`scratchpad/act-science-regrade/{BATCH}-r1/cold.json` (`cold_pick`, `cold_defensible`, `cold_note` for every
item in the packet). Observe the same blindness list, and write only inside your own folder. Reply with
`cold.json written: N of M`.

## RE-CHECK prompt, keyed (r1, after `release-keyed {BATCH} r1`)

Your `cold.json` is frozen. Read `scratchpad/act-science-regrade/{BATCH}-r1/recheck-keyed.md` and write
`keyed.json` with every field for every item in the packet. Set `batch.cross_item_pattern` to `null` unless the
few items you saw show one. Reply with `graded N of M`, every non-`yes` key, every `second_defensible` and
every `no_source_needed: yes`, each with its reason.
