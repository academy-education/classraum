# map-v2 Math batch 7 (Number Systems): independent chain check — checker prompt

Give this text, unchanged, to ONE fresh Claude agent that has not seen this session, `MECHANISMS.md`'s drafting, or
any batch-7 author. Claude only, no GPT. The checker writes one file and edits nothing else.

---

You are the independent chain checker for MAP Math batch 7, Number Systems only, grades 5–8. An author drafted 40
candidate item MECHANISMS (D01–D40). No item exists yet. Your job is to decide, for each mechanism, whether it is
**new** compared with every earlier MAP Number Systems item and every live ISEE/SSAT/SAT/ACT maths item. This matters
because batch 4 kept 1 of 11 Number Systems items: graders found six repeating earlier MAP chains, and the
brief-writer's own check missed four exact repeats.

Work in `/Users/andylee/Downloads/saas/classraum`. Read:

1. `scripts/study-bank/map-v2-work/math-b7/MECHANISMS.md`: the 40 candidates. **Ignore the author's ratings, its
   "closest by my reading" picks and its notes.** They are the author's own check, which is exactly what failed in
   batch 4.
2. `scripts/study-bank/map-v2-work/math-b7/earlier-N-chains.json`: 294 entries, every earlier MAP Number Systems item
   (live, staged, withdrawn, dropped, file only, first-written), each with its chain, prompt and key. **Read all 294
   in full**, grouped by grade.
3. `scripts/study-bank/map-v2-work/math-b5/CHAIN-CHECK.md` and `CHAIN-CHECK-R2.md`: the batch-5 rounds. Their
   verdicts on C01–C30 and R01–R30 bind, and the eight mechanisms batch 5 slotted (C06, C11, C25, R06, R08, R18, R27,
   R30) are now earlier items.

Search live ISEE/SSAT/SAT/ACT and prior maths rows yourself with

    node scripts/study-bank/mf30-kw.mjs scratchpad/map-v2-math-work/dump-b6 "<terms joined by &>" --full

Build each query from the candidate's OPERATIONS, not its story. Run at least one per candidate, and read every hit.

**Rule:** two items have the same chain when they use the same operations in the same order, on the same kind of
givens, to get the same kind of answer. Story, numbers and number type (fraction or decimal) are ignored. A changed
ASK over the same operations (e.g. the leftover as a fraction of the divisor instead of in units) counts as the same
chain only if no new operation is needed to answer it; say which way you ruled and why.

**Verdicts:**
- **NEW:** no earlier MAP item or live ISEE/SSAT/SAT/ACT item has this chain.
- **BORDERLINE:** most steps are shared; name the shared step and the step that differs.
- **REPEAT:** an earlier item has the chain; name it.

Also flag:
- **Wrong area:** a candidate that belongs to Operations and Algebraic Thinking or Statistics and Probability rather than
  Number Systems. Check at least D20 and D27, and any other you think is misplaced.
- **Families within the batch:** candidates that share a chain with each other, so at most one can be slotted.

Write `scripts/study-bank/map-v2-work/math-b7/CHAIN-CHECK.md` in the batch-5 format:

1. **A header:** what was read (entry counts per grade), how many `mf30-kw` queries were run, and the rule applied.
2. **Counts:** NEW / BORDERLINE / REPEAT, with the NEW ids listed.
3. **One table row per candidate,** with these columns:

   | id | verdict | closest earlier item(s) | what is the same / what differs | family within this batch |
   |---|---|---|---|---|

   Cite earlier items by id with their status (LIVE, staged, withdrawn, file only, and so on). Cite live rows by
   family and id prefix, e.g. "SSAT 76f0c5df (live)".
4. **Notes for the brief-writer:** live ISEE/SSAT/SAT/ACT repeats that no MAP item shares, near-twins the author's
   search missed, pairs that share a front end, and any wrong-area candidates.
5. **A recommended final set:** mutually distinct, at most one per family, with grade, chain, and "not to be slotted
   with it". The goal is at least 20 items, so say how many mechanisms you recommend and the grade spread.

**Not your job:** FORM, K4, HUB and the bracket constraints. They decide whether a NEW chain can be written, not whether
it is new. Note the author's HUB warnings only if they change your verdict.

Do not write items. Do not edit `MECHANISMS.md`, the earlier list or any other file. Do not query the database.

When done, reply with:
- the counts
- the NEW ids
- your recommended set, with its size and grade spread
- every live ISEE/SSAT/SAT/ACT repeat you found
