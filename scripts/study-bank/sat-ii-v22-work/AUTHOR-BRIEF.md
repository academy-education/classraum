# sat-ii-hard-v22 author brief (Digital SAT Information and Ideas, Command of Evidence, hard)

You write six Digital SAT Reading & Writing **Command of Evidence** items for a test-prep app that real students
use. They target the module-2 HARD route. The pre-registration is
`scripts/study-bank/PREREG-II22-2026-10-23.md`. Read it, then read
`scripts/study-bank/sat-ii-hard-v21.kept.batch.json`, v21's nine survivors. Its format is exactly the format you
write. Model your textual items on II21A-02, II21C-02, II21D-02 and II21D-03 (no reversed pairs), and your table
items on II21A-06 and II21B-06 (real arithmetic, accurate but beside-the-point distractors). Do not reuse any v17
or v21 topic (see also `scripts/study-bank/sat-ii-hard-v21.batch.json` and `sat-ii-hard-v17.batch.json`).

Work only in `scripts/study-bank/sat-ii-v22-work/<YOUR LETTER>/`. Do not touch the database, git, npm, or any
other file. Write `items.json`, a JSON array of 6 items with ids `II22<L>-01` … `II22<L>-06`:
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
`{ design: "no-reverse" (textual) | "quant", table_design: "..." (quant), key_rank: "...", names: [...], why_hard: "..." }`.

## Textual items (01-03)
- The passage is 90-150 words. It states a claim or hypothesis, names a rival account, and gives the fact that
  tells the two apart.
- Prompt: "Which finding, if true, would most directly support / weaken <person>'s hypothesis/claim?" Vary
  support and weaken across your three items.
- **One frame.** All four findings share one design and one vocabulary and differ only in which
  group/condition/direction they report. If one option has a comparison or control, all do. No option is
  uniquely hedged or uniquely absolute.
- **No reversed pairs at all (the 2x2 design is BANNED in v22).** In v21 every 2x2 item was dropped: the option
  restating the pattern both accounts fit, and its reverse, are struck on sight. Build four findings that each test a
  DIFFERENT contrast or condition (different sites, groups, timings or measures), only one of which separates the
  two accounts in the hypothesis's favour. `meta.design` must be "no-reverse".
- **No option that restates the pattern the passage says both accounts already fit.** That is a free strike.
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
- **Vary the table design.** v21's graders named "X beats every member of group G" (key = the group's strongest
  member, one lure from outside the group) as a template that solved seven items. Use it at most ONCE, and in your
  other two table items use different designs: a change across columns or a ratio, a trend across rows, an exception
  to a pattern, or a two-condition match. Record `meta.table_design` (group-best | change | ratio | trend |
  exception | two-condition), all different within your three.
- **No option set where exactly one option crosses the relevant group label** (v21's A-05 and B-05 were struck 3/3:
  the key was the only option comparing across the label the claim turns on).
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
- each id, its design (no-reverse / quant), table_design and key_rank;
- the key letters;
- the items you are least sure are uniquely answerable, with why;
- the path of `items.json`.
