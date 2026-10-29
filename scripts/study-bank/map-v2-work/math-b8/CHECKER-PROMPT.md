# map-v2 Math batch 8 (Number Systems): independent chain check — checker prompt

Give this text, unchanged, to ONE fresh Claude agent that has not seen this session, `MECHANISMS.md`'s drafting, or
any batch-8 author. Claude only, no GPT. The checker writes one file and edits nothing else.

---

You are the independent chain checker for MAP Math batch 8, Number Systems only, grades 5–8. An author drafted 17
candidate item MECHANISMS (E01–E17). No item exists yet. Every one of them has already passed the construction rules
(FORM, HUB, RUN, PAIR and the rest), so your verdict decides whether it gets written. Your job is to decide, for each
mechanism, whether it is **new** compared with every earlier MAP Number Systems item and every live ISEE/SSAT/SAT/ACT
maths item. This matters because batch 4 kept 1 of 11 Number Systems items: graders found six repeating earlier MAP
chains, and the brief-writer's own check missed four exact repeats. In batch 7 a NEW verdict (D16) was later found to be
contained in a live ISEE item.

Work in `/Users/andylee/Downloads/saas/classraum`. Read:

1. `scripts/study-bank/map-v2-work/math-b8/MECHANISMS.md`: the 17 candidates. **Ignore the author's "pointers", its
   notes and its family labels.** They are the author's own check, which is exactly what failed in batch 4. Use only
   each candidate's **Ask / Chain / Twist** (the feasibility lines tell you the numbers work; they say nothing about
   novelty).
2. `scripts/study-bank/map-v2-work/math-b8/earlier-N-chains.json`: 374 entries. 294 are every earlier MAP Number
   Systems item (live, staged, withdrawn, dropped, file only, first-written), each with its chain, prompt and key; 2 are
   batch 7's written items (MB7-N7-01, MB7-N6-01); 40 are batch 7's checked mechanisms (ids `B7-D01`..`B7-D40`, the
   status field carries the batch-7 checker's verdict); 38 are batch 7's probe-dropped drafts (`B7-K..`, `B7-M..`,
   `B7-P..`). **Read all 374 in full**, grouped by grade. A batch-8 candidate that re-proposes a batch-7 mechanism or
   draft is a REPEAT of it.
3. `scripts/study-bank/map-v2-work/math-b5/CHAIN-CHECK.md`, `CHAIN-CHECK-R2.md` and
   `scripts/study-bank/map-v2-work/math-b7/CHAIN-CHECK.md`: the earlier rounds. Their verdicts bind, and the eight
   mechanisms batch 5 slotted (C06, C11, C25, R06, R08, R18, R27, R30) and batch 7's D33 (MB7-N7-01) are earlier items.

Search live ISEE/SSAT/SAT/ACT and prior maths rows yourself with

    node scripts/study-bank/mf30-kw.mjs scratchpad/map-v2-math-work/dump-b6 "<terms joined by &>" --full

Build each query from the candidate's OPERATIONS, not its story. Run at least one per candidate, and read every hit.
The prior rows include MAP **Geometry**, **Measurement/Data** and **Operations** items; batch 8's probe found its
collisions there as often as in live rows (MMG-G04, MM3-G03, MB3-G6-02, MMG-D04), so cite them when they share a chain.

**Rule:** two items have the same chain when they use the same operations in the same order, on the same kind of
givens, to get the same kind of answer. Story, numbers and number type (fraction or decimal) are ignored. A changed
ASK over the same operations (e.g. the leftover as a fraction of the divisor instead of in units) counts as the same
chain only if no new operation is needed to answer it; say which way you ruled and why. Following batch-5's R29 ruling,
a candidate whose whole chain is a prefix or sub-chain of an earlier item, with no step of its own, is a REPEAT.

**Verdicts:**
- **NEW:** no earlier MAP item or live ISEE/SSAT/SAT/ACT item has this chain.
- **BORDERLINE:** most steps are shared; name the shared step and the step that differs.
- **REPEAT:** an earlier item has the chain; name it.

Also flag:
- **Wrong area:** a candidate that belongs to Operations and Algebraic Thinking, Ratios, Geometry or Statistics rather
  than Number Systems. Check at least E04 and E12 (magic squares), E02 (fraction of a set after a change) and E17 (an
  equation with a cube root), and any other you think is misplaced.
- **Families within the batch:** candidates that share a chain with each other, so at most one can be slotted.

Write `scripts/study-bank/map-v2-work/math-b8/CHAIN-CHECK.md` in the batch-5/7 format:

1. **A header:** what was read (entry counts per grade), how many `mf30-kw` queries were run, and the rule applied.
2. **Counts:** NEW / BORDERLINE / REPEAT, with the NEW ids listed.
3. **One table row per candidate,** with these columns:

   | id | verdict | closest earlier item(s) | what is the same / what differs | family within this batch |
   |---|---|---|---|---|

   Cite earlier items by id with their status (LIVE, staged, withdrawn, file only, b7 mechanism, and so on). Cite live
   rows by family and id prefix, e.g. "SSAT 76f0c5df (live)".
4. **Notes for the brief-writer:** live ISEE/SSAT/SAT/ACT repeats that no MAP item shares, near-twins the author's
   search missed, pairs that share a front end, and any wrong-area candidates.
5. **A recommended final set:** mutually distinct, at most one per family, with grade, chain, and "not to be slotted
   with it". MAP Math needs +9 Number Systems items for a sixth form, so say how many mechanisms you recommend and the
   grade spread.

**Not your job:** FORM, K4, HUB and the bracket constraints. They were checked before this round and decide whether a
NEW chain can be written, not whether it is new.

Do not write items. Do not edit `MECHANISMS.md`, the earlier list or any other file. Do not query the database.

When done, reply with:
- the counts
- the NEW ids
- your recommended set, with its size and grade spread
- every live ISEE/SSAT/SAT/ACT repeat you found
