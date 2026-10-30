# map-v2 Reading, batch 3 (MRV4) — author brief addendum (2026-10-31)

**Read `scripts/study-bank/map-v2-work/reading/BRIEF.md` first. Everything in it binds** (hard bans, grade sizing,
negation limit, naturalness, real-world facts, the co-founder's rules 1-8, the pasted AUTHORING-RULES, the JSON
format) **except** where this file overrides it: ids are `MRV4-...`, the tools live in
`scripts/study-bank/map-v2-work/reading-b3/`, and the per-item option design below is new and binding.

Hard bans repeated: never run `pkill`, `killall`, `kill` or any process-killing command. No git. No web. No database.
No npm/jest/insert scripts. Claude writing only (no external model calls). **Never open, search for, quote or imitate
any NWEA/MAP item, any file with "herald" in its name, or any PDF.**

`WORK` = `/Users/andylee/Downloads/saas/classraum/scratchpad/map-v4-read-work/<your code>/` (create it).
Files you may open: `reading/BRIEF.md`; everything in `reading-b3/` (this file, `assignments.json`, the two
EXCLUSIONS files, `merge.mjs`, `vocab-check.mjs`, `audit.mjs`); and as format/quality models
`scratchpad/isee-draft16-work/authored/d16.py` (passage authors) or
`scratchpad/map-v3-read-work/V1.json` (vocabulary authors; its 40 words are already excluded). Nothing else.

## Why the method changed

MRV3 (20 passages, 2026-10-29) was held twice by graders reading the batch as a whole, never for a wrong key:

- **Round 1:** 9 of 10 theme items had one lone prescriptive "X should Y" distractor and 8 of 10 keys were hedged
  "X can Y"; in all 10 central-idea items the key was the ONLY whole-passage summary and the three distractors were
  single details. Two keys across passages said the same thing ("honesty beats hiding").
- **Round 2 (the repair):** new template tells. Central idea: every item had exactly one true-but-narrow detail plus
  two overclaims ("every", "for good", "mainly", "because/so") and a moderate key — "drop the one-fact option, drop
  the overclaims". Theme: "usually"/"tends to" appeared in 15 of 30 distractors and 0 keys, and the surviving
  distractor was cynical against a warm key. Purpose: "prove"/"argue" only ever in distractors; keys always
  "show/explain/set up". Within a passage, one item's key echoed another's wording.

A rule applied the same way to every item becomes the tell. So batch 3 fixes the option design **per item, before
writing, from a table that is flat across the batch** (`assignments.json`, field `spec` and `purpose_*`). Your job is
to write excellent items that also meet that table exactly. `audit.mjs` checks it.

## The per-item spec (theme and central-idea items)

`spec.distractor_families` names the three distractors' families (repeats allowed: "N,N,O" means two narrow
details and one off-focus lesson). Add `"family": "<letter>"` to each entry of that item's `distractor_rationales`.

**Theme families** (all three must be things a careful reader rejects by pointing at the story, rule 3):
- `N` true-but-narrow: a literal statement about what happens, true of the story, but an event, not a theme.
- `R` reversed: the opposite lesson; the story's outcome or the character's change contradicts it.
- `O` off-focus: a real, lesson-shaped statement about a minor thread the story touches but does not develop.
- `X` overreach: points the key's direction but claims more, or a different conclusion, than the story earns.
- `W` wrong character / early belief: a lesson a secondary character holds, or what the main character believes
  at the start and the story revises.

**Central-idea families:**
- `N` true-but-narrow: one paragraph's point or one detail, accurately stated.
- `R` reversed relationship: a whole-passage summary that inverts the passage's claim, cause or conclusion.
- `O` off-focus summary: a whole-passage-sounding statement centred on a secondary topic of the passage.
- `B` too broad: a statement about the whole field (all animals, all inventions) that the passage does not make.
- `M` misattributed / misweighted: a whole-passage summary that gets the emphasis, cause or agent wrong.

**Breadth rule (round 1's tell):** in every central-idea item, every non-`N` distractor is written at the same
scope and length as the key, and at least one of them, like the key, joins two parts of the passage. In every theme
item, every non-`N` distractor is lesson-shaped, as abstract as the key.

**Markers (round 2's tell).** Every option has exactly ONE marker class, detected by `audit.mjs` from these words:

| class | words that put an option in it |
|---|---|
| `H` hedge | can, could, may, might, sometimes, often, usually, tend(s/ed) to, some, many, frequently, generally, occasionally, perhaps, likely |
| `A` absolute | always, never, every, everyone, everything, everybody, only, all, any, anyone, anything, nothing, no one, none, nobody, completely, entirely, totally, forever |
| `S` prescriptive | should, must, ought, need(s) to, have to, has to |
| `0` none | none of the above words anywhere in the option |

`spec.key_marker` is the key's class (and word, if given, e.g. `H:usually` = the key uses "usually");
`spec.distractor_markers` is the multiset of the three distractors' classes (and words). Any distractor may carry
any of them — the families and markers are assigned independently, so a reversed lesson may be the hedged one in
one item and the plain one in the next. An option may not mix classes (no "can" and "only" together). An absolute
or prescriptive KEY must still be literally supported by the passage: write the passage so that it is.

**Valence.** Theme keys of P04, P07, P09, P12 and P13 are cautionary or bittersweet (a cost, a limit, a loss);
the rest are warm. In every theme item, at least one distractor has the opposite valence to the key. Never let
"pick the warm moral" or "pick the moderate one" solve an item.

**Purpose items.** `purpose_key_verb` is the key's lead verb ("to suggest that...", "It suggests..."), and
`purpose_distractor_verbs` the three distractors' lead verbs; the four options use four different verbs. The lead
verb is the first of: show, explain, suggest, emphasize, contrast, introduce, argue, prove, reveal, describe,
create, compare, build, set up, highlight, illustrate. "prove" is used nowhere in this batch.

**All other items** (inference, character, detail, structure, figurative, point-of-view, evidence): the key's
marker class must be shared by at least one distractor of the same item (audit enforces). Prefer `0` options.

## Further rules for this batch

- **No key echoes inside a passage.** A key must not reuse the content words of a sibling item's key unless a
  distractor of its own item shares them as much (audit enforces). Write the three keys in three different
  vocabularies.
- **No identical key prose across passages.** Your theme/central-idea key must not share three content words with
  another key (audit enforces within your file; the coordinator checks across files). Coordinate your themes to be
  distinct from every other theme in your own file.
- **No option lifts 7+ consecutive words from the passage** (evidence items excepted, whose options are exact
  passage sentences).
- **Rule 3 (one defensible answer) beats everything in this file.** If a spec'd marker or family makes a distractor
  arguably correct, rewrite the distractor until a sentence of the passage kills it; never weaken the key. A family
  `O` or `X` distractor is the most dangerous: check it is clearly not the story's lesson.
- **Real people and science:** only facts you are certain of, hedged where numbers vary ("about", "as much as").
  Never give a real person a reason, quotation or scene you are not sure is documented. (MRV3's Maathai passage
  was held for giving the adults an ecological reason her own memoir does not give them.)
- Difficulty across your items: about one quarter easy, half medium, one quarter hard.

## Checks (from the repo root) — run until clean, and report the summary lines honestly

    node scripts/study-bank/map-v2-work/reading-b3/merge.mjs WORK/<code>.json
    node scripts/study-bank/check-explanation-quotes.mjs WORK/<code>.merged.json
    node -e 'import("./scripts/study-bank/check-location-refs.mjs").then(({checkItem})=>{const m=require(process.argv[1]);for(const it of m.items){const r=checkItem(it);if(r.status==="mismatch")console.log(it.qid,r)}})' WORK/<code>.merged.json
    node scripts/study-bank/map-v2-work/reading-b3/audit.mjs WORK/<code>.json

merge prints "mechanical problems: 0"; the quote check "not in passage or options 0"; the location check prints
nothing; audit prints "audit violations: 0". (Batch-level parity lines are informational on a single file; the
coordinator enforces them on the whole batch with --full.)

## Vocabulary authors (V1, V2) — 40 items each

As in `reading/BRIEF.md` §VOCABULARY AUTHORS, with: ids `MRV4-V1-01..40` (01-20 grade 5, 21-40 grade 6; target
words a-m) and `MRV4-V2-01..40` (01-20 grade 7, 21-40 grade 8; target words n-z). Subtype mix per author:
multiple-meaning 11, context-clue 11, word-parts 8, figurative 5, connotation 5. Never test a word in
`reading-b3/EXCLUSIONS-vocab-words.txt` (439 words, including MRV3's 40). Put the key FIRST in `choices` (the
coordinator deals slots). Check with

    node scripts/study-bank/map-v2-work/reading-b3/vocab-check.mjs WORK/<code>.json

until `problems: 0`. Lessons from MRV3's vocabulary rounds (which cleared 40/40 after one fix): the context must
rule out every distractor, not merely favour the key ("ominous" thunder that was "distant" let "distant" fit; the
fix put the thunder "right overhead"); a distractor sense must be impossible in this sentence, not just less
likely; keep the key from being uniquely longest more than about a quarter of the time.

## Reply when done

Titles and subjects (or the 40 target words); the four check summary lines exactly as printed; the audit tables for
your file; and the items you are least sure have exactly one defensible answer, with why.
