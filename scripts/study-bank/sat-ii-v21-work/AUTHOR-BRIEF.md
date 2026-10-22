# sat-ii-hard-v21 author brief (Digital SAT Information and Ideas, Command of Evidence, hard)

You write six Digital SAT Reading & Writing **Command of Evidence** items for a test-prep app that real students
use. They target the module-2 HARD route. The pre-registration is
`scripts/study-bank/PREREG-II21-2026-10-23.md`. Read it, then read
`scripts/study-bank/sat-ii-hard-v17.batch.json`, the last batch made this way. Seven of its twelve items came
out hard. Its format is exactly the format you write; II17A-01 and II17A-04 are the models. Do not reuse its
topics.

Work only in `scripts/study-bank/sat-ii-v21-work/<YOUR LETTER>/`. Do not touch the database, git, npm, or any
other file. Write `items.json`, a JSON array of 6 items with ids `II21<L>-01` … `II21<L>-06`:
- items 01-03 are textual;
- items 04-06 are quantitative.

## Item format (copy v17's fields)
- `id`
- `domain` "Information and Ideas"
- `subskill`: "Command of Textual Evidence" or "Command of Quantitative Evidence"
- `difficulty` "hard"
- `passage`
- `prompt`
- `choices` (4 strings)
- `correct_answer` (exactly one of the choices)
- `explanation`
- `topic_tag`
- quantitative items only: `graphic`
  `{type:"table", title, colLabels, rowLabels, cells}`; cells is rows × cols of strings.

Also add a `meta` object for the self-check. It is stripped before banking:
`{ design: "2x2" | "no-reverse" (textual) | "quant", key_rank: "...", names: [...], why_hard: "..." }`.

## Textual items (01-03)
- The passage is 90-150 words. It states a claim or hypothesis, names a rival account, and gives the fact that
  tells the two apart.
- Prompt: "Which finding, if true, would most directly support / weaken <person>'s hypothesis/claim?" Vary
  support and weaken across your three items.
- **One frame.** All four findings share one design and one vocabulary and differ only in which
  group/condition/direction they report. If one option has a comparison or control, all do. No option is
  uniquely hedged or uniquely absolute.
- **Reversed pairs: 2x2 or none.** In the 2x2 design, the four options are two contrasts × two directions:
  - the key, e.g. north > south at the same elevation;
  - its reverse, which is what the RIVAL predicts;
  - the contrast both accounts predict, which cannot discriminate;
  - that contrast reversed.

  This is II17A-01. Otherwise, no two options may state the same comparison in opposite directions. **Never a
  single reversed pair holding the key.** v17 did this on four items, and blind readers got 9 of 12 right by
  picking from the pair.
- At least one distractor is the finding the rival account predicts, so "sounds plausible" cannot pick the key.
- Hard means the key is decided only by combining the hypothesis with the discriminating fact, which sit in
  different sentences. One sentence alone must not match the key.

## Quantitative items (04-06)
- The passage is 60-120 words and ends in a claim and "______". Prompt: "Which choice most effectively uses
  data from the table to complete the text?"
- The table has 4-6 rows and 2-4 columns. The numbers are invented but plausible, the units are explicit, and
  there are no real-world statistics.
- **All four options are in one sentence frame, and at least three of them read the table ACCURATELY.** Only
  the claim decides the key.
- The key needs two or more cells: a comparison, a "lowest of a subgroup" (II17A-04), a change across columns,
  or a ratio that is easy to state. A single-cell lookup is never the key.
- **Watch for free eliminations.** A strong student holding the stem and options but not doing the work must
  not be able to kill options by any of these:
  - a sum or range bound read off the stem;
  - the option set being closed under some operation;
  - "the key is the extreme/closest value".
- Across your three quantitative items, the key's rank in the options' numeric order must differ: once the
  smallest, once a middle value, and so on. Record it in `meta.key_rank`.

## Everyone
- **Exactly one defensible answer.** For each distractor, the explanation names the passage or table fact that
  kills it. If you cannot point at one, the distractor is a second answer; rewrite it.
- **Explanations** quote choices in double quotes, never say "choice B", and quote passage text verbatim.
- **Length.** The key must not be the longest option in more than 2 of your 6 items, nor the shortest in more
  than 2. The longest option must be at most 1.4× the shortest.
- **Key letter.** Place keys so your six use A, B, C and D at least once each.
- **Proper nouns.** Use only invented names whose surname and given name begin with a letter in YOUR range:
  - A: A-F
  - B: G-L
  - C: M-R
  - D: S-Z

  Never reuse a name across your items. Places are invented too. Never attach an invented finding to a real
  named person or place.
- **Facts.** Real science and history stay correct; hedge where needed. A false background fact is worse than
  a dull passage.
- Academic register, American punctuation, double quotes. In quantitative passages the blank is six
  underscores `______`.

## Before you finish
Re-read every item as a hostile student would. Ask two questions:
- With the passage covered, can I pick the key from the options alone?
- With the passage, does any distractor survive?

Fix what fails. Then reply with these four things:
- each id, its design (2x2 / no-reverse / quant) and key_rank;
- the key letters;
- the items you are least sure are uniquely answerable, with why;
- the path of `items.json`.
