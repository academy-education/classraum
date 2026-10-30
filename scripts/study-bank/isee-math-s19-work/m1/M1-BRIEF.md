# isee-math-s19 M1 method-duplicate search — FOUR-choice ISEE Upper Level maths (brief for each of 2 agents)

Wrong-brief tripwire: this is cohort `isee-math-s19`, four choices per item. If your input says otherwise, stop.

Never run `pkill`, `killall`, `kill` or any process-killing command. Write ONLY your one output file. Claude only.

## Your job

You are agent **H1** (items Q001-Q070) or **H2** (items Q071-Q140); the launcher tells you which. For every item in
YOUR half of `scripts/study-bank/isee-math-s19-work/m1/m1-candidates.json`:

1. State its **method**: the chain of steps a student uses, in one line (not the topic, the computation).
2. Search for any **live row that is the same method**: the same computation on the same structure, even when the
   context, the numbers and the wording all differ. Read
   `scripts/study-bank/isee-math-s19-work/m1/live-isee-ssat.json` (1,324 live ISEE and SSAT maths rows) in full.
   You may also grep `scripts/study-bank/isee-math-s19-work/dump/live-maths.json` (all 4,204 live maths rows, every
   family) for anything that looks close.
3. Compare the item against **every other item in the candidates file** (both halves) for a within-batch twin.

A duplicate is a row a student who had rehearsed it would answer this item with. "Same topic" is not a duplicate;
"same chain with other numbers or another story" is. **Borderline is not a parking place**: if you think a student
who had done the live row has most of this item, list it under `live_dups`/`batch_dups`; use `borderline` only when
the chains genuinely differ in a step, and say which step.

## Output

`scripts/study-bank/isee-math-s19-work/m1/m1-out-H1.json` (or `-H2.json`): a JSON array, one object per item in your
half, in id order:

    {"id": "Q001", "method": "...", "live_dups": [{"row": "<8-char id>", "why": "..."}],
     "batch_dups": [{"row": "Q0xx", "why": "..."}], "borderline": [{"ref": "...", "why": "..."}], "note": "..."}

Save the file every 10 items (overwrite with the array so far). Do not write any other file. Report when the file
holds all of your items, then STOP.
