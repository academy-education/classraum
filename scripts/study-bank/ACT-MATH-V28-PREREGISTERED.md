# act-math-v28 — pre-registered bars (written 2026-10-09, BEFORE any item is authored)

## Why this batch, and its size

v27 was HELD at stage 0 (nothing frozen, 0 inserted): after its single return, one
post-return drop (AM27N-01, an interior key) moved `act-math-v27-projection.mjs`'s
v26-rate line to 55.4%, outside [45.0%, 55.0%], on a commission that sat 0.9
points inside that band. `form-capacity.mjs` and `next-form.mjs act/math`, re-run
2026-10-09 before writing this file: **ACT Math 18 forms (853 items)**, binding
IES 170 / 9 per form. Form 19 = **IES +1**. Forms 19+20 need IES 10, Geometry 7,
S&P 6, Functions 5, N&Q 2 (Algebra 163 already meets 160). The same as v27.

Same domain mix as v27, with IES widened from 20 to 22 for the headroom reason in
§1 (no IES-20 composition has 2.5 points of headroom at IES's own rate), and 3
spares per arm:

    arm  file                          core                         smallest interior largest   spares (position)
    D1   act-math-v28-d1.batch.json    IES 11                           4        3        4     AM28I-X1 s, X2 i, X3 l
    D2   act-math-v28-d2.batch.json    IES 11                           4        3        4     AM28I-X4 s, X5 i, X6 l
    B    act-math-v28-b.batch.json     S&P 8 + Functions 7 (15)         4        8        3     AM28S-X1 s, AM28F-X2 i, AM28S-X3 l
    C    act-math-v28-c.batch.json     Geometry 9 + N&Q 4 (13)          3        6        4     AM28G-X1 s, AM28G-X2 i, AM28N-X3 l
    core                               50                              15       20       15     12 spares (62 authored)

Per item (the slot table is code: `act-math-v28-assemble.mjs`, selftest 7/7):

    D1  I-01 s  I-02 l  I-03 i  I-04 s  I-05 l  I-06 i  I-07 s  I-08 l  I-09 i  I-10 s  I-11 l
    D2  I-12 s  I-13 l  I-14 i  I-15 s  I-16 l  I-17 i  I-18 s  I-19 l  I-20 i  I-21 s  I-22 l
    B   S-01 s  S-02 i  S-03 l  F-01 s  F-02 i  S-04 i  S-05 s  F-03 i  F-04 l  F-05 i  S-06 i  S-07 l  S-08 i  F-06 s  F-07 i
    C   G-01 s  G-02 i  G-03 l  N-01 i  G-04 i  G-05 l  G-06 s  N-02 s  G-07 i  G-08 i  G-09 l  N-03 l  N-04 i

(s smallest, i interior, l largest, by value among the four options.) IES 16 extreme
/ 6 interior; non-IES 14 / 14. Domain slack over the form-20 deficit: IES +12,
Geometry +2, S&P +2, Functions +2, N&Q +2.

D1 and D2 keep v27's **disjoint IES sub-topic lists**. **D1**: rates and unit
conversions (speed / time / distance, work and flow or fill rates, unit price and
best buy, currency exchange, density and concentration / mixtures, map and drawing
scale). **D2**: percents (successive or compound change, percent of a changed
base, markup / discount / tax / commission, percent error), averages (weighted
mean, the score needed for a target mean, median from a frequency table),
proportional reasoning in context (splitting by a ratio, direct and inverse
variation), and applied area / volume (coverage, fill, material). Ids `AM28{I,S,F,G,N}-NN`
and the spare ids above; cohort `act-math-v28`; four choices. Commissioned
medium/hard; banked difficulty is the graders'. `BANK_BAND=mixed`.

**Off limits:** every item, mechanism and option set of act-math-v21–v24 (held),
v25's 12 drops, v26's 10 drops and its G-03, and **all 62 act-math-v27 items**
(the 47 merged, the dropped N-01 replacement and the 14 round-1 originals that
were returned). Re-submitting a held item re-decides a finished batch. The search
dump holds every live maths row (every family; 3,290 at 2026-10-09) plus those
210 held/dropped ACT rows (3,500).

## Carried over unchanged from v27 (and through it v20–v26)

All of `ACT-MATH-V27-PREREGISTERED.md` applies unless replaced below, in
particular:

- v20's four distractor rules, v21's mechanism-duplicate rule, the (a)–(e) bans and
  their mechanical returns (`check-interior-niceness.mjs`, the (c) check), rules
  8–11, `cheap_bound_check`, `trap_check`, the IES additive-total ban, and the
  self-audit.
- **The IES direction declarations** (`direction_declaration`, stripped before
  grading) and `act-math-v27-ies-directions.mjs` D1–D4 as a stage-0 return, D5 a
  reading list (a return on a time quantity). Run unchanged on the v28 files.
- **My stem-readable error-direction read on EVERY extreme-key item of EVERY
  author file (and every extreme-key spare) during stage 0, before the return.**
  "Readable, all one way" is a return. The same read on IES interior keys checks
  the declaration.
- **Option-shape and merge checks before the return**: `act-math-v26-option-shapes.mjs`
  and `merge-halves.mjs` per file and on the D1+D2, B+C, full and full+spares
  merges. RUN through the key and CLOSURE ON THE KEY are mechanical returns; GAP,
  closure among distractors, shared key / option values across items are read.
- **The hand keyword duplicate search BEFORE FREEZE** with the full-hit helper
  (`kw.mjs`, v28 copy: every hit up to 40 with the count not shown, `--full`
  untruncated; refuses a dump under 3,400 rows), beside Jaccard
  (`act-math-v16-dupscan.mjs`) and `math-mechanism-dup.mjs`. Every FLAG and every
  hand hit is read.
- Stage 1, stage 2 (two graders, rules 1–12 including v27's rule 12 and the
  `ies_counter` field, verified by `act-math-v27-ies-verify.mjs`), difficulty
  banking, and the stage-4 rule (a measured gate failing on the kept set holds the
  batch, with no dropping or editing).
- Author fields stripped before grading: `quantity_asked`, `distractor_kind`,
  `distractor_meta`, `bounds`, `mechanism`, `arith_class_check`,
  `one_sided_check`, `interior_parity_check`, `cheap_bound_check`, `trap_check`,
  `self_audit`, `direction_declaration`.

## CHANGED in v28

### 1. Headroom: one planning rate per band, >= 2.5 points inside it, and survival of any single loss

**The seven rates v27 gated cannot all have 2.5 points.** `key-extremity-projection`
(v24), `act-math-v26-projection` (v24, v25, pooled v24+v25) and
`act-math-v27-projection` (split, pooled3, v26, plus IES alone at IES's rate)
disagree by more than the 5 points two 2.5-point headrooms leave in a 10-point
band. Searched exhaustively over IES 20–24 × non-IES 24–32 and every key-position
split: **the best achievable minimum headroom over all seven is 1.53 points**
(derived from the files by `act-math-v28-projection.mjs --selftest`, not typed).
v27's commission had 0.88. So "2.5 points at every rate" is infeasible, and v28
reads the instruction as **2.5 points at each band's planning rate**:

- **Merged band — planning rate SPLIT** (IES items at IES's v24–v26 survival,
  6/17 extreme and 16/17 interior; everything else at non-IES's, 63/83 and 56/66).
  It is the only rate that models the domain difference v27 measured, and it uses
  all 183 graded items.
- **IES band — planning rate IES** (IES subset at IES's own survival).
- **`key-extremity-projection.mjs` (v25 bars) — its own v24 rate**, still GATED
  (read-only, not edited; sha printed each run). It is the steep-differential
  case, the low side.

**Why the domain-blind rates are REPORTED, not gated.** The line that held v27
(v26-rate 55.4%) projects every IES extreme-key item at v26's overall 28/36 =
77.8% survival. IES extreme keys have survived 6 of 17 = 35.3% over v24–v26 and
2 of 6 in v26 itself. A domain-blind rate applied to a batch that is 44% IES at
73% extreme is mis-specified; it held v27 on a number that describes no domain in
the batch. `act-math-v26-projection.mjs` and `act-math-v27-projection.mjs` still
run on every stage-0 pass and print their lines (and the domain-blind rates are
also printed on the non-IES subset alone, where they were measured); they do not
gate. The kept set's own stage-4 gates (`key-extremity-gate`, `check-key-magnitude`,
IES-alone `key-extremity-gate`) are measured directly and still decide.

**New `act-math-v28-projection.mjs` (selftest 10/10).** Rates derived from the
v24–v26 files and asserted; reproduces v27's merged 47 exactly (split 48.3%, v26
55.4%, IES 46.7%). GATES, merged: G1 split-rate share in [45.0%, 55.0%]; G2
equal-rate interior z >= −1.96 at the split-rate projected kept n; G3 authored
smallest and largest z within ±1.96 of live act/math; G4 split kept n >= 10; G5
author-kept key-extremity-gate PASS. IES subset: G6 IES-rate share in [45.0%,
55.0%]; G7 IES kept n >= 10. `--commission` adds C1 (split and IES shares each
>= 2.5 points inside) and C2 (dropping any ONE item of each class present keeps
G1–G7). Break-tests in the selftest: v27's commission (IES 14/6) fails C1 (IES
46.7%, 1.67 points) AND C2 (one IES extreme lost → 44.8%; one IES interior lost
→ kept IES n 9.65); an IES-20 at 15/5 fails C1 (52.9%); a 75%-extreme overshoot
fails G2; the v28 target passes. Mutations of the split formula and of the C2
check each fail the selftest.

**At the commissioned target (IES 16/6, non-IES 14/14, 15/20/15):**

    gated                          value     headroom   (n)
    split-rate (merged)            48.1%     3.15 pts   kept ~33.8
    IES-rate (IES 22)              50.0%     5.00 pts   kept ~11.29
    key-extremity-projection v24   50.9%     4.1 pts    kept ~31.6
    equal-rate interior z at split n   −1.72
    authored per-side z            1.15 / 1.34
    reported (domain-blind, merged): v24 50.9 | v25 54.0 | pooled45 53.3 | pooled3 54.4 | v26 55.8
    (act-math-v27-projection would FAIL its v26 line at this target by construction; that is why it is reported)

**How a single pre-freeze drop moves the projection** (no spare promoted):

    drop one             split    IES       IES kept n   zEq     key-extremity v24   all gates
    IES extreme          47.6%    48.4%     10.94        −1.62   50.1%               hold
    IES interior         49.5%    54.5%     10.35        −1.84   52.2%               hold
    non-IES extreme      47.0%    50.0%     11.29        −1.61   50.1%               hold
    non-IES interior     49.4%    50.0%     11.29        −1.84   52.2%               hold

The design survives losing any one item with no spare. With a spare promoted under
the rule below, the composition is restored exactly (same arm, same position).
`act-math-v28-projection.mjs` prints this table on every run.

### 2. Spares and the promotion rule (decided here, before any item exists)

Three spares per arm, one at each key position (above), authored in the same runs
and under the same brief as the core. Spares go through all of stage 0 with the
core, including the single return on the same terms. They are excluded from the
merged core and from every set gate unless promoted.

**Rule.** A core item dropped AFTER the return and before freeze (a per-item gate
failing after the return, a duplicate found on the pre-freeze re-dump, a drop
under rule 5) is replaced by **the spare in the SAME ARM whose key position
(smallest / interior / largest by value) equals the dropped item's**; if that spare
is used or unavailable, **the arm's lowest-numbered remaining spare of the same
class** (extreme vs interior); if none, **no promotion** (the item is simply
dropped). Drops are processed in id order. A spare is unavailable if it failed a
stage-0 check after the return. The promotion is applied mechanically by
`act-math-v28-assemble.mjs --drop ... --unavail ...` and recorded in my notes
BEFORE any projection is re-run. The merged set (with the promoted spare) then
re-runs all of stage 0 as a set; a promoted spare failing a per-item check now is
dropped and the rule applies again. Unpromoted spares are never attacked, graded or
inserted; they are committed at freeze as a record.

A set gate failing after promotions holds the batch, as in v27.

### 3. Authoring: one file per item, 5–7 items per run

A90 found longer runs stall; v27 lost two author waves. Each author run writes
**one JSON file per item** (`<scratch>/v28/items/<id>.json`, a single item object;
written as soon as the item is done, rewritten if fixed), **5–7 items per run**,
then I assemble with `act-math-v28-assemble.mjs` (refuses a missing slot file, a
wrong id or domain, anything but four choices; prints POSITION MISMATCH against
the slot table). Runs: D1a (I-01..06, X1), D1b (I-07..11, X2, X3), D2a (I-12..17,
X4), D2b (I-18..22, X5, X6), Ba (S-01..03, F-01..02, S-X1), Bb (S-04..05,
F-03..05, F-X2), Bc (S-06..08, F-06..07, S-X3), Ca (G-01..04, N-01, G-X1), Cb
(G-05..07, N-02, N-X3), Cc (G-08..09, N-03..04, G-X2): 10 runs of 5–7. A run that
writes nothing for 6 minutes is relaunched from its disk state (the item files it
has written are kept). **At most 2 subagents at a time**, completion judged by the
files on disk. All agents Claude; no GPT.

### 4. Dumps

The search dump is pulled before the first author run and **re-pulled immediately
before freeze**. Every live maths row added between the two pulls is hand-searched
against every core item and promoted spare, and Jaccard and `math-mechanism-dup`
are re-run on the merged set against the live table at that moment.

## Stage 0 — structural pre-flight

`act-math-v28-stage0.sh` (v27's script with v28 names, the spares file, and the
gating changes of §1). Per arm core file, merged core, IES 22 and spares file:
`act-math-v18-preflight.sh` (sandbox N/N, distractor_solve 3N/3N, hub <= +10,
key-extremity-gate PASS, 0 composites, sign-pair / dead-options / stem-echo /
key-singleton exit 0, stem duplicates and duplicate option sets clean; plurality
exit 2 = NOT MEASURED; `check-key-magnitude` REPORTED on the authored set); key
position exactly per the slot table (round 1: a mismatch is a return); the v28
projection (`--commission` on round 1; G1–G7 after) and key-extremity-projection
as GATES; the v26 and v27 projections reported; the (c) check;
`act-math-v27-ies-directions.mjs`; interior niceness; option shapes; merge checks;
run-middle, key-is-sum, pair-constant and arith class as reading lists; my IES
trap / additive-total / stated-rule read; my error-direction read on every
extreme key; the three duplicate checks.

A stage-0 failure goes back to that arm ONCE (one return run per arm, 5–7 items;
an arm with more returned items gets two runs). The returned items re-run all of
stage 0, including the duplicate checks. After the return, a per-item failure
drops the item (spare rule, §2); a set-gate failure holds the batch, with no
second return. Then **FREEZE**: the four arm files, the merge and the spares file
committed with their sha before any solver or grader sees them. Nothing is edited
after freeze.

## Stage 1 — options-only attack (screen), bars unchanged

`act-math-v28-attack-draw.mjs` is v27's renderer with only the names, the v28
exclusion (act-math-v16..v28) and the seed (20261038) changed. 50 candidates
interleaved with 50 live ACT Math controls matched 1:1 by domain, three blind
Claude samples of one solver, `score-oo.mjs`. At n = 50: 150 picks per arm; one
pick 0.67 points. **HOLD** if the candidate margin exceeds the control's by more
than +10, or the candidate unanimous-correct rate exceeds the control's by more
than 15 points. Instrument-invalid if the control margin is itself >= +25. Live
ACT Math arms have measured 26–38%, so both bars can fire.

## Stage 2 — with-source grade (decides)

As v27: two independent Claude graders on `make-grade-render.mjs` of a stripped
copy, render sha quoted at start and end, every v26 field plus `ies_counter` on
every IES item; rules 1–12; `act-math-v27-ies-verify.mjs` prints its two lines.
An output missing a required field is re-run, not scored. Difficulty banked = the
graders' label (agree → it; one apart → the easier; easy vs hard → medium).

## Stage 4 — kept set, insert

- The kept set re-runs stage 0 as a set. `key-extremity-gate` and
  `check-key-magnitude act/math` GATE on the whole kept set (>= 10 numeric).
- **IES kept alone (>= 10 numeric): `key-extremity-gate` GATES**; magnitude
  reported. Fewer than 10 IES kept: NOT MEASURED, recorded as such, never a pass.
- A measured gate failing holds the batch, with no dropping or editing.
- Insert with `BANK_FAMILY=act BANK_COHORT=act-math-v28 BANK_BAND=mixed`, then
  `verify-act-draw.ts`, `form-capacity.mjs` and `next-form.mjs act/math`.
- REGISTER §5 and my own ledger entry in ONE commit, the entry written onto the
  `ledger.json` re-read from HEAD, only my files staged. Commit locally; no push.

## Success

- **ACT Math 18 → 19 forms** if >= 1 IES item is kept and inserted.
- **18 → 20** if the kept items meet every form-20 deficit (IES 10, Geometry 7,
  S&P 6, Functions 5, N&Q 2).
- Anything less is partial: inserted if it passes, recorded at its true value with
  denominators and the remaining deficit.
