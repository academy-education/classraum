# isee-math-s17 — pre-registration (written 2026-10-09, BEFORE any item exists)

Same pipeline, bars and stop rule as `isee-math-s16.prereg.md`, which worked
(REGISTER §5, 2026-10-09: 103 of 111 frozen inserted, 0 post-freeze
duplicates, pool hard share 21.6% -> 23.1%). This file states what is reused
by reference and the ONE change: s16 moved two difficulty levers at once (the
0E/7M/12H commission and the anchored graders), so it could not say which did
the work. s17 keeps both levers exactly as s16 had them and adds a paired
unanchored grading arm so that the anchor's share can be measured on the same
items (Change 1). Everything else is a process fix from s16's own log.

## What it can buy

`admission-form-depth.ts --forms 10`, run 2026-10-09 before this batch, over
**616** verified, unarchived `isee/math` rows (re-dumped the same day: 616
read = 616 counted, 616 distinct ids; 127 easy / 347 medium / 142 hard =
20.6 / 56.3 / 23.1%):

    quant    37/form  forms 1-7 37/37, form 8 28/37*, form 9 0/37*   7 clean
    mathach  47/form  forms 1-7 47/47, form 8  0/47*, form 9 0/47*   7 clean
    one ISEE test consumes 37 + 47 = 84 from the shared, ungrouped pool

    form 8 needs 8 x 84 = 672  -> +56
    form 9 needs 9 x 84 = 756  -> +140

The whole ISEE test stays at 2 clean (Reading binds). The after-measurement is
the same 10-form replay plus `verify-admission-forms.mjs`.

## Batch

- Cohort `isee-math-s17` (no file or live cohort of that name exists).
- **120 authored = six Claude authors x 20**, the six s15/s16 strands (A
  numbers and operations, B ratio/rate/percent, C algebra, D geometry, E
  measurement / coordinates / patterns / time, F data and probability), strand
  text as in s15. Strands stay equal at 20, as in s16, so the strand mix is not
  a third difference between the two batches.
- **Yield.** s16 kept 103 of 114 authored (90.4%). At that rate 120 yields
  about 108: **form 8 (+56) is bought with about 50 to spare; form 9 (+140)
  cannot be bought by this batch** (it needs more survivors than items
  authored) and is reported as progress, "toward form 9", with the shortfall.
  If fewer than 56 pass, the passers are still inserted and form 8 is
  reported NOT bought.
- Four choices, ungrouped, no figure, domain `Math`, no calculator, ISEE Upper
  Level; quantitative comparison out of scope (unchanged). Ids
  `IM17A-01 .. IM17F-20`.
- **One file per item** (s16's two stalled authors had planned 19 items with
  nothing saved): `<work>/items/IM17X-NN.json`, one item object each. Each
  author run writes **5-7 items** (per strand: run 1 = 01-07, run 2 = 08-14,
  run 3 = 15-20), so 18 author runs. A later run of a strand reads every item
  already on disk (its own strand and the others) before writing. I assemble
  `isee-math-s17{a..f}.batch.json` and the merged `isee-math-s17.batch.json`
  from the item files.
- Item fields as s16, including the required `forced` array.
- Authors read all 616 live ISEE math rows (dump with bank labels) before
  writing.
- **Key slots are dealt in the commission**, not left to the author: a seeded
  shuffle of 30 x A/B/C/D over the 120 ids, so each array slot holds the key
  30 times.

## Reused from s16 unchanged

1. **Hard-heavy commission**, same proportion: per author 0 easy / 7 medium /
   13 hard (s16: 0/7/12 of 19; 35% vs 36.8% medium). Run 1: 2M/5H, run 2:
   3M/4H, run 3: 2M/4H. s16's definition of hard verbatim (three dependent
   steps with no single step a recall fact, OR one non-routine idea);
   authors see the live rows labelled `hard` as calibration.
2. **Anchored graders, same anchors.** The same 18 live rows s16 used
   (`isee-math-s16.grader-anchors.json`, seed 20261031, 6 per bank label; all
   18 still live), the same instruction ("rate on THAT scale"). **Banked
   difficulty = the anchored pair's consensus, or the easier label on a split,
   exactly s16's rule.** The anchored pair is the only instrument that banks.
3. **Method-duplicate search before freeze (M1).** Two Claude agents over
   halves, each comparing its half against all 120 candidates and the 616 live
   rows, output `{id, method, live_dups, batch_dups, borderline, note}`, saved
   every 8-10 items. Aids, not verdicts: `math-mechanism-dup.mjs`,
   `stem-duplicates.mjs --family isee`, the word-3-shingle scan (>= 0.35 read
   by hand, break-tested with a planted live stem). I confirm every hit by
   hand. A confirmed duplicate (live, or the later id of a within-batch pair)
   is returned ONCE to a fresh author run for a replacement on a different
   mechanism.
   - **Break-test, before M1's silence is trusted.** M1's input carries four
     plants with known answers, s16 originals whose duplicates were confirmed
     on 2026-10-09: IM16C-14 (live b0685d95, a fixed total with an amount moved
     between parts), IM16F-17 (live f2ad4e35, worst-case pigeonhole), IM16E-02
     (live b3086974, clock hands asked in the symmetric direction), and the
     pair IM16C-02 ~ a renumbered, recontexted copy of IM16A-07 (work
     backwards through halving/adding; A-07 is now live, so either a batch
     or a live naming counts). Ids are opaque. M1 must name **4 of 4**; fewer
     and it is re-run with a sharper brief before the freeze. Plants are
     removed before the merge and never frozen.
   - **Second check on replacements (round 2).** Every replacement goes
     through B1/B2 and a fresh M1 agent for those items alone, against all
     live rows and the other candidates. A second confirmed duplicate on the
     same slot is dropped before the freeze (the batch shrinks; never padded).
     s16's round 2 caught 3 of 13 replacements, so it is not optional.
4. **Render withholding of `forced`.** `make-grade-render.mjs` withholds
   `forced` by name (it names every option's value). Before any grader runs I
   grep the render for `forced` and for each item's key-derivation fields;
   the render's summary must list no unrecognised kept field. The options-only
   render shows options only.
5. **Free-strike brief.** Every author gets s15's named strike list (s16
   Change 4, verbatim) plus s16's seven confirmed kills by name, the class
   s16's `forced` lists did not stop because each needs one rough estimate:
   A-05 leading digits fixed by 8^2/4 = 16; A-12 a factor visibly dividing
   both terms; D-03 volume grows faster than area, so > 144; E-03 a diamond's
   area against its bounding box; E-06 a spacing that caps the hourly count;
   F-11 a partial tally that already passes 20; F-14 a weighted average on the
   wrong side of the midpoint. And s16's out-of-band drop (A-09, residue
   cycles mod 7). The rule is s16's: every distractor shares every `forced`
   property; the author adds a **rough-estimate pass** ("with one estimate
   and no method, which options die?") to the self-attack.
6. Strand E built-in-limits checklist (s16 Change 3), verbatim.

## Change 1 — attribute difficulty with a paired unanchored arm

**What s16 could not separate.** s16 banked 31 hard of 103 (30.1%) against
s15's 9 of 165 (5.5%); authored-hard -> banked-hard went 9/70 (s15) to 30/65
(s16). Per-rater hard labels went from 15 and 27 of 198 (s15, unanchored) to
34 and 50 of 111 (s16, anchored). The commission, the definition of hard,
the calibration rows and the anchors all changed together.

**Design.** Both levers stay on, as in s16. Every item is additionally graded
by an **unanchored pair (U-a, U-b)**: the same key-withheld render, the same
grader brief and output fields as the anchored pair, with STEP 0 (the anchors
file) removed and s15's wording in its place ("easy / medium / hard for an
ISEE Upper Level candidate"). U agents are never shown the anchors file, the
anchored graders' output, or each other's. Each grader runs as two agents
over the same halves the anchored graders use. U labels **never bank**.

**Quantities (computed on the kept set, pre-stated).**

- `A-banked`: anchored pair, consensus or easier label (the banked label).
- `U-banked`: the identical rule applied to the U pair (the counterfactual
  s15 instrument on the same items).
- **Anchor effect** `D = hard%(A-banked) - hard%(U-banked)`, paired, with the
  3x3 cross-tab and an exact two-sided sign test on the discordant items
  (hard under A only vs hard under U only). Also each of the four raters'
  own hard rate, so the easier-label rule is not what produces the gap.
- **Author-side effect**: hard%(U-banked) on s17 against s15's banked hard
  share under the same unanchored instrument, 9/165 = 5.5%, by one-sided exact
  binomial; and U-banked authored-hard -> hard against s15's 9/70 = 12.9%.
- **Replication**: hard%(A-banked) against s16's 30.1%.

**Readings, fixed now.**

    anchor effect present    D >= +10.0 points AND sign test p < 0.05
    author effect present    U-banked hard >= 11.0% (2x s15) AND binomial p < 0.05 vs 5.5%

    anchor present, author absent   -> "the anchor did the work"
    author present, anchor absent   -> "the commission/brief did the work"
    both present                    -> "both contribute"; report D and U-banked hard as the split
    neither                         -> "not attributable at this n"; say so, do not pick one
    D between +5 and +10, or p >= 0.05 on one side -> that side is "not shown", never "absent"

**What this cannot separate, stated before the data.** The author side is
compared to a different batch (s15), so "author effect" is the BUNDLE of the
commission share, the written definition of hard, the live calibration rows
and the strike list; this batch cannot split those, and claims no more. The
anchor effect is measured within-item and is clean of author variation, but
it is the anchor's effect on these Claude graders, not on people. Batch
drift since s15 (s15/s16 items now live and read by authors) also sits on
the author side.

**Effect on drops (the cost of the extra eyes, recorded).** U graders return
the full grader fields, so they can name defects. Drop rules 1-5 apply to all
four graders' reports, each confirmed by hand. I report **two drop counts**:
drops the anchored pair alone would have triggered (comparable to s16's 8 of
111) and total drops. The B4 hold bar is applied to the anchored-pair count
so the gate is s16's; total drops are recorded beside it.

## Bars — s16's, scaled to 120

B1 sandbox (120 keys, 360 distractors) and B2 pre-flight exactly as s16 (key
extremity >= 40% on each strand file and the merge, aim 45-60%; hub lines at
or below control + 10; run-middle / pair-constant / key-is-sum / sign-pair /
plurality on the key -> re-authored before freeze; `stem-duplicates` 0
internal). B3 options-only, `make-oo-render.mjs --control 100` (live ISEE
control interleaved, line derived from the deal), three Claude samples, PASS
if candidate <= control + 5.0, HOLD if >= +12.0, between decided by the
unanimous-correct rate <= control + 10; VOID if the control reads >= 80%.
Unanimity never drops an item on its own. B4 as s16 (two anchored graders per
item, drop rules 1-5, >= 2 distractors killed by a hand-confirmed free
elimination is a drop) plus the U pair above. **HOLD the whole batch if more
than 33 of 120 are dropped by the anchored pair at B4+B5** (28.1%, s16's
proportion). B5 post-freeze duplicates: graders' `duplicate_of_live` plus
`stem-duplicates`; a duplicate found after the freeze is dropped, not
repaired. B6: ledger entry, `BANK_FAMILY=isee BANK_COHORT=isee-math-s17
BANK_BAND=mixed math-bank-helper insert` with a qc.json naming survivors,
then `verify-admission-forms.mjs` and `admission-form-depth.ts --forms 10`.

**Stop rule.** First failed gate stops the run (B1 after freeze, B3 HOLD or
VOID, B4/B5 HOLD). Nothing is inserted from a stopped run; **no item is
repaired after the freeze** — a failing item is dropped.

**Prediction.** ISEE math 7 -> 8 clean forms if >= 56 insert. Form 9 is not
reachable (+140 from 120 authored); expected pool about 724, short of 756 by
about 32. Kept mix under A-banked: near s16 (hard 25-35%).

## Process rules (from s16's failures)

- **Scratch folder** `scratchpad/isee-math-s17-work/` only (s16 lost 12
  items to a shared `s16/` folder on a case-insensitive disk). Every brief's
  first line names `isee-math-s17` and FOUR choices, a wrong-brief tripwire.
- **No process killing.** Every subagent prompt forbids `pkill`, `killall`,
  `kill` and any process-killing command (an s16 author ran `pkill -f cat` on
  the user's account).
- **At most two subagents at once** (repo-wide 20-subagent cap shared with
  other batches). Completion is judged by files on disk, never a notice. A
  subagent idle 6+ minutes (no new file or mtime) is relaunched from its disk
  state.
- Claude agents only; no GPT, no external model API. No new env var is
  expected; any that appears is documented in `.env.example`.
- `ledger.json` is shared: re-read from HEAD immediately before editing, stage
  only this entry. REGISTER §5 and the ledger entry go in one commit. Commit
  locally; no push.

## Author brief (every author)

s16's author brief with: ids IM17X-NN; one file per item; 5-7 items per run
with the run's ids, difficulty and dealt key slots given in the commission;
read every item already in `items/` first; s16's seven kills and the
rough-estimate pass (reused item 5); strand E's checklist (author E). Before
reporting: assemble the strand's items so far and run `math-bank-helper.mjs
verify` and the five B2 checkers on them, fix what they flag in the run's
own items, report and STOP.
