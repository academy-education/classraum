# ACT Science agent re-grade: with-source grader brief

You are one of **two independent with-source graders** for one batch of staged ACT Science items: two
complete forms, 80 items in 14 passages. You may instead be the batch's **re-check grader**, who reads only a
few items. Either way your grades **decide** whether these items reach students. ACT Science is live and
reachable, so a released item is served on the next form.

Pre-registration: `scripts/study-bank/ACT-SCIENCE-AGENT-RELEASE.prereg.md`. The drop rules below are copied from
it. If the two differ, the prereg governs.

Why your half decides: on ACT Science the no-source attack measures the model's science knowledge. The model
scores the shipped bank at 88.9% options-only, and a person scores it at 28.6%. That makes the with-source read
the only instrument that finds real defects (CLAUDE.md, 2026-09-21). The co-founder now sits these items
**blind only**. He sees options and stem with no passage and gives no verdict. Nobody reads the science after
you.

## Blindness (break it and your grades are void)

Open ONLY your own folder (`scratchpad/act-science-regrade/<batch>-<you>/`) and this brief. Never open:

- `scratchpad/act-science-regrade/_coordinator/`, or any other grader's folder
- `scripts/study-bank/act-science-*.batch.json`, `ledger.json`, `REGISTER.md`, `science-release.json`,
  `cofounder-*.json`, `actsciencev5a-bridge1.verdicts-without-graphics.json`, `act-science-withsource-*.json`,
  `act-science-v6.*.json`
- `scratchpad/act-science-v5-work/` .. `act-science-v9-work/` (author briefs, earlier grades)
- `scripts/study-bank/act-science-regrade/results/`
- the database (no queries of any kind)

Every one of these carries keys, earlier grades or the co-founder's verdicts. If you open one by mistake, say so
in your reply. Your grades are then void and a fresh grader replaces you. No web search on item content, and
no GPT.

## Two passes, in order

1. **Cold.** Read `grader-cold.md`. It has no key. Answer every item yourself from the passage and the figure,
   and write `cold.json`:
   ```json
   { "items": [ { "id": "<item id>", "cold_pick": "<A-D>", "cold_defensible": [], "cold_note": "<the cells or points you used>" } ] }
   ```
   `cold_defensible` lists every OTHER letter that you think a careful student could defend. Then stop and tell
   the coordinator. Do not look for the keyed packet. It is not in your folder yet.
2. **Keyed.** The coordinator runs `act-sci-packet.mjs release-keyed`. That command freezes your `cold.json`
   (sha256) and only then copies `grader-keyed.md` into your folder. Grade every item against the key and write
   `keyed.json`. **Never edit `cold.json` after it is frozen.** `check` refuses a keyed file whose cold picks
   differ from it, and an edit voids you. Disagreeing with the key is data, so keep your cold letter.

### How the figures are shown

`act-sci-packet.mjs` decodes every figure the way the student runner (`QuestionGraphicView`) draws it:

- **Tables** show the row labels, column labels and cells the student sees. A `RENDER WARNING` line means the
  screen differs from the data (a blank label shifts rows, or an extra cell row is not drawn). Grade what is
  on screen.
- **Bar charts** show the five y-axis tick labels and no value labels. The heights are listed so that you can
  check whether a student could estimate them.
- **Line and scatter plots** show the five ticks per axis. Every series is black and has no legend.
- **Conflicting Viewpoints** passages usually have no figure. Their source is the viewpoints text.

On screen the figure sits under every question of its passage, and the packet prints it once per passage. Option
letters are this packet's deal. The app shuffles options for each student, so never reason from a letter's
position.

## The fields (one object per item in `keyed.json`)

| field | values | what it means |
|---|---|---|
| `id` | the item id | as printed after `###` |
| `cold_pick`, `cold_defensible`, `cold_note` | copied from `cold.json` | unchanged |
| `key_correct` | `yes` / `no` / `unsure` | Recompute **every** number the key relies on from the table cells or plotted points. Check a trend over **all** rows, not two. For an interpolation, check that the key's interval is the only one consistent with the neighbours. For CV items, check that the key is what the named scientist actually says or implies. |
| `second_defensible` | `null` / `{ "letter": "B", "reason": "..." }` | A distractor that a careful student could defend from this passage, this figure and this stem. "Less complete than the key" is not a defence. A CV distractor that is true in the world, but not what the named scientist holds, is not a defence. |
| `fact_error` | `null` / text | The key or stem states real science wrongly, or the invented data break a real law (a denser liquid floating on a lighter one, a larger current through a larger resistance at the same voltage, a dissolving rate that falls with stirring for no stated reason). Say whether the error is in the shared passage or table (it then affects the whole passage) or in this item only. |
| `no_source_needed` | `yes` / `no` | Cover the passage AND the figure. Could a student with high-school science pick the key from the stem and options alone, using background knowledge, a textbook formula or a named effect (Archimedes, Hardy-Weinberg, inverse-square, Ohm)? If so, answer yes: the item is a recall item wearing a figure. For CV items: could the key be picked without reading the viewpoints? |
| `recognised_real_data` | `null` / text | You recognise a real published dataset or canonical experiment behind an "invented" system: the KNO3 solubility curve, peppered moths, Mendel's counts, real planet tables, a textbook titration curve. A solver who knows it needs no table. |
| `free_elimination` | `null` / `{ "letters": ["A","C"], "how": "..." }` | Name only DISTRACTORS that you can kill from the stem plus the option set, with no passage and no arithmetic. Examples: a unit mismatch; a value outside any possible range; the only option that "performs the comparison"; the lone hedged or lone absolute option; a distractor that duplicates and reverses the key's relation; an option set closed under the stem's operation; an "adjacency" tell. Never list the key. |
| `readability` | `ok` / `problem` | Whether the student can read what the key needs from what is drawn (a RENDER WARNING, ticks too coarse for the value asked, an unlabeled axis or unit, a caption that gives the answer away). Explain in `readability_note`. |
| `readability_note` | text | Empty when `ok`. |
| `single_sentence` | `yes` / `no` | **Recorded only.** Whether the key can be retrieved from one sentence or one table cell, with no inference. |
| `difficulty` | `easy` / `medium` / `hard` | **Recorded only.** Never decides. Model graders compress difficulty. |
| `note` | text | Anything else, with the reason. |

The file also holds one **batch-level** answer:

```json
{ "items": [ ... 80 objects ... ],
  "batch": { "cross_item_pattern": null } }
```

or `"cross_item_pattern": { "rule": "...", "items": ["<item id>", "..."] }`.

### What counts as a cross-item pattern

These items were written to rigid briefs, two forms per brief. That is exactly what produced earlier tells: the
key sat in slot A on 73% of one cohort, every four-item set formed an ABCD permutation, and one key prose
was repeated across eight lectures. Name a pattern only if **all** of these hold:

1. You can state it as a **rule** that another reader could apply mechanically **without the passage** (for
   example "the key is the only option that names two trials", "in every 'which experiment' item the key is the
   one with the most experiments", "the CV key is always the option that concedes and then qualifies",
   "interpolation keys are always the 'between' option nearest the middle").
2. It names **at least 3 items** in this batch, across at least 2 passages.
3. Applied to the items it names, the rule picks the key on more of them than it would by chance.
   Letter position does not count, because options are re-dealt.

A defect that recurs on one passage only is an item finding. A topic that repeats across the two forms (the
same apparatus or the same system) is a `note`, not a pattern, unless it makes the key predictable.

## Drop rules (pre-registered; the coordinator applies them, not you)

| finding | action |
|---|---|
| R1 `key_correct: no` or `unsure` from either grader, or both cold picks on the same non-key letter | The coordinator recomputes. Confirmed wrong: drop. No repair. |
| R2 `second_defensible` from **both** graders on the same option | drop |
| R2b `second_defensible` from **one** grader | One fresh re-check grader reads the item cold. The same option named: drop. Otherwise recorded. |
| R3 `fact_error`, confirmed by the coordinator | drop (the whole passage when the error is in the shared stimulus) |
| R4 `no_source_needed: yes` from **both** graders | drop |
| R4b `no_source_needed: yes` from **one** grader | the re-check grader; `yes` again: drop |
| R5 `recognised_real_data`, confirmed | drop (passage-level when the shared table is the real data) |
| R6 `free_elimination` from **both** graders, each killing 2+ distractors | drop; 1 killed: recorded |
| R7 `readability: problem`, confirmed against the renderer | drop (passage-level when the figure is the problem) |
| R8 `cross_item_pattern` from **both** graders | Holds the batch. The coordinator records the rule. Items it decides drop. A rule deciding half a cohort or more fails that cohort whole. |
| **passage integrity** | Any drop removes its whole passage. The form assembler serves only full passages (Data Representation 5, Research Summaries 6, Conflicting Viewpoints 6), so a short passage is never drawn. |

There are no repairs and no returns to an author in this re-grade. A fix made in response to the round that
caught it is fitting to the instrument.

## Output

Write `cold.json`, and later `keyed.json`, into your own folder only. After the keyed pass, reply with:

- the denominator first (`graded N of M`), then the count for each field
- every `key_correct` that is not `yes`, every `second_defensible`, every `fact_error` and every
  `no_source_needed: yes`, each with its reason
- your batch-level `cross_item_pattern` answer, with its rule and items, or `none`
- whether you opened anything on the blindness list
