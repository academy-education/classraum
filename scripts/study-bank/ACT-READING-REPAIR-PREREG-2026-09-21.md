# Pre-registration — ACT Reading repair round, 2026-09-21

**One round only.** The standing rule is that after one failed rewrite you stop.
These authors have not had one, and unlike SSAT reading the cause is stateable,
which is the whole reason a round is justified. If this round misses the bars,
the batch is held permanently and no third round is commissioned.

## The measured diagnosis

Calibrated against the same four live passages, same brief, same definitions:

    measure                            candidate   live control      dev
    key retrievable from 1 sentence       83.3%    69.4% / 69.4%    +13.9
    passage NOT NEEDED at all             69.4%     0.0% / 25.0%    +44.4

`one_sentence` is largely a property of this bank (the shipped control is 69.4%)
and is the secondary target. **`passage not needed` is the defect**, at +44.4
against the more generous control grader.

Three verified text defects, each checked by reading the passage directly:

- `arda-p1` — "he was costing the orchard at the price of one season's fruit"
  does not parse; a word is missing, and ARDA-05's key rests on this sentence.
- `ardb-p1` — ¶2 samples "the same four hydrants"; ¶3–4 require sixteen wards
  each with its own published hydrant figure, rotated four a month, two with
  transposed hydrant numbers. Four hydrants cannot produce sixteen ward figures.
- `ardb-p2` — the third tray set is "a single pour of fresh water onto clay that
  we had salted and left to dry" and it hatched; but ¶5 says the first water to
  fall dissolves the crust and leaves pore water at 14 g/L, so that set should
  have behaved like a first rain, which has produced no hatch in 41 observations.

## Bars, with the ceiling checked

Last round's reject bar was unreachable: it asked for +30 against a control at
96.3%, leaving 3.7 points of headroom. **These bars are stated against controls
with room on both sides.**

Primary, `passage NOT needed`, graded under the control's exact brief:

- control observed range **0.0% – 25.0%**; attainable range 0–100%
- **PASS: candidate ≤ 25.0%** (at or inside the control's own worst grader)
- **FAIL: candidate ≥ 40.0%**
- between is the dead zone: hold, do not insert, do not rewrite again

Secondary, `one_sentence`, same brief:

- control **69.4%** both graders; attainable 0–100%
- **PASS: ≤ 77.0%** (control plus the ~8-point noise floor at n=36)
- above that it is a note, not a block, unless the primary also misses

Both bars sit well inside the attainable range, so either can fire.

## Non-negotiable

- All three text defects repaired, verified by reading the passage.
- A passage ships only if ALL 9 of its items clear. The unit is the passage.
- Keys must stay exclusive; the current batch is 36/36 exclusive across three
  graders and that must not regress.
- The blind attack will NOT be re-run as a gate. It is saturated on this family
  (18 of 18 human-cleared items solved unanimously with no passage) and a pass
  from it means nothing. It may be run as a note.

## What would make me discard this round

- If the repaired items come back with any key disputed by two graders.
- If `passage not needed` improves while exclusivity falls — that is the
  rewrite-inverts-the-tell shape and counts as a miss, not a trade.
