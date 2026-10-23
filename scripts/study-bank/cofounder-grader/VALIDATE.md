# Validating COFOUNDER-BRIEF-v2 against v1-A on the co-founder fixtures (2026-10-23)

Pre-registered before any grader has seen the packets. The bar is in the v2 brief header and in
`shipBar()` (`scripts/study-bank/cofounder-loop-lib.mjs`); it is not changed after the grades come in.

## What is being measured, and what is not

- **Packets:** `scratchpad/fixtures-v2/` and `scratchpad/fixtures-a/`, the SAME 66 items in the SAME order
  (seed `cofounder-fixtures-2026-10-23`), split into two parts of 33. 33 positives (items he would block, current
  content, his review still bound to it) and 33 negatives (items he passed with no note, matched by stratum). The
  graders are not told the split.
- **Validatable:** `second_defensible` only (28 positives). `source_underspecified` has 5: reported, labelled
  unvalidated. **v2's new checks (fact, self-consistency, speech, batch pattern) have ZERO real positives**: every
  item he caught for them was edited afterwards, so its review is stale. This run can show whether v2 keeps A's
  recall and what its new checks cost in false flags on clean items. It cannot show the new checks work.
- **In-sample warning:** v1-A was written from his Choose a Response rejects, and v2 quotes his notes
  (`COFOUNDER-BRIEF-v2.quotes.json`; `score` prints the in-sample/out-of-sample split for v2). A pass is a
  regression gate, not evidence that either brief predicts him on new items. Only his verdicts on fresh batches
  graded with v2 are that.
- **Batch check (d):** a mixed fixture packet is not a batch. `batch_patterns` is required in v2's output and is
  printed, not scored.

## The four grader runs

Run each as a **separate, fresh Claude agent** with no other context (no access to this conversation, the
REGISTER, or earlier grades). Four agents, run in parallel. Paste each prompt exactly.

### v2, part 1

```
You are grading multiple-choice test items. Read the grading brief at
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-v2/COFOUNDER-BRIEF-v2.md and follow it exactly.
The items are in /Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-v2/packet-1.json (33 items, numbered
by their "n" field, 1-33). Grade every item and run the batch-level check over these 33 items.
Write your output, a single JSON object as the brief's Output section specifies (keys are the item "n" values as
strings, plus "batch_patterns"), to
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-v2/grades-1.json
Read ONLY those two files. Do not open index.json, brief.json, packet.json, any other packet or grades file, any file
under scripts/, or any database. Do not search for the items elsewhere. When the file is written, reply with the
count of items graded and the count of each verdict.
```

### v2, part 2

```
You are grading multiple-choice test items. Read the grading brief at
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-v2/COFOUNDER-BRIEF-v2.md and follow it exactly.
The items are in /Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-v2/packet-2.json (33 items, numbered
by their "n" field, 34-66). Grade every item and run the batch-level check over these 33 items.
Write your output, a single JSON object as the brief's Output section specifies (keys are the item "n" values as
strings, plus "batch_patterns"), to
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-v2/grades-2.json
Read ONLY those two files. Do not open index.json, brief.json, packet.json, any other packet or grades file, any file
under scripts/, or any database. Do not search for the items elsewhere. When the file is written, reply with the
count of items graded and the count of each verdict.
```

### v1-A, part 1

```
You are grading multiple-choice test items. Read the grading brief at
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-a/COFOUNDER-BRIEF-A.md and follow it exactly.
The items are in /Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-a/packet-1.json (33 items, numbered
by their "n" field, 1-33). Grade every item.
Write your output, a single JSON object keyed by the item "n" values as strings, as the brief's Output section
specifies, to
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-a/grades-1.json
Read ONLY those two files. Do not open index.json, brief.json, packet.json, any other packet or grades file, any file
under scripts/, or any database. Do not search for the items elsewhere. When the file is written, reply with the
count of items graded and the count of each verdict.
```

### v1-A, part 2

```
You are grading multiple-choice test items. Read the grading brief at
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-a/COFOUNDER-BRIEF-A.md and follow it exactly.
The items are in /Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-a/packet-2.json (33 items, numbered
by their "n" field, 34-66). Grade every item.
Write your output, a single JSON object keyed by the item "n" values as strings, as the brief's Output section
specifies, to
/Users/andylee/Downloads/saas/classraum/scratchpad/fixtures-a/grades-2.json
Read ONLY those two files. Do not open index.json, brief.json, packet.json, any other packet or grades file, any file
under scripts/, or any database. Do not search for the items elsewhere. When the file is written, reply with the
count of items graded and the count of each verdict.
```

## Scoring (after all four files exist)

```
node scripts/study-bank/run-fixtures.mjs score scratchpad/fixtures-v2
node scripts/study-bank/run-fixtures.mjs score scratchpad/fixtures-a
node scripts/study-bank/run-fixtures.mjs compare scratchpad/fixtures-v2 scratchpad/fixtures-a
```

Read `scorable N of M` first: anything but `66 of 66` is not a measurement, and the script exits 3. `compare`
prints PASS (exit 0) or DOES NOT SHIP with the reasons (exit 1).

**Reading the result.** n = 28 for the one validated type, so one item is 3.6 points; 80% means 23 of 28. Three
correlated Claude samples are closer to one solver than three (CLAUDE.md), so a single run per brief is what this
is: one sample of each. If v2 passes, set `validated_version` to `v2` in `cofounder-loop-state.json` (with the
files `cofounder-grader/COFOUNDER-BRIEF-v2.md`) and record the run in REGISTER §5; `mkpacket.py` then copies v2.
If it fails, v1 stays, and the failure goes in REGISTER §5 with the numbers.

## Break-tests already run on the scorer (planted grade files, 2026-10-23)

| planted | result |
|---|---|
| all-pass grader | recall 0/33, false flags 0/33, exit 0 (numbers move to the floor) |
| all-flag grader | recall 33/33, false flags 33/33, exit 0; `compare` DOES NOT SHIP (+100 points) |
| oracle (flags exactly the positives) | 28/28 and 5/5, false flags 0/33; `compare` vs all-pass A: PASS |
| inverse oracle | recall 0/33, false flags 33/33 |
| one item missing | `scorable 65 of 66`, INVALID, exit 3 |
| index id changed to one that maps to no fixture | counted FLAGGED in an UNMAPPED bucket (negatives 1/34), INVALID, exit 3 |
| grades-2.json deleted | `NOT MEASURED — no numbers`, exit 3; `compare` exit 3 |
| grade for item 99 (not in packet) | INVALID, exit 3 |
| verdict "maybe" | unscored, INVALID, exit 3 |
| v2 grade file without batch_patterns | INVALID, exit 3 |
| one item graded in both files | INVALID, exit 3 |
