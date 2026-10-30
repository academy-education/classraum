# Cross-item probe: can a student pick keys from patterns ACROSS items?

You are reviewing a batch of 152 reading items (English-learner reading test, four options each) written by eight
authors. Read `probe/items.json` in this directory. Each item shows its kind, prompt, four choices and its `key`.

Your only question: **across items, is the key guessable from a pattern** — something a student who had seen some of
these items could use to pick or eliminate options on a new item without reading the passage? Do NOT judge whether
each item is correct; other reviewers do that. Look across the whole batch, within each author, and within each kind
(main-idea, detail, vocabulary, purpose, inference, not-except).

Check at least these, and anything else you notice:
- the key's length rank among the four options; the key being the widest / most general option, or never the widest;
- the key being a two-part summary ("X and Y") when distractors are not, or the reverse;
- hedges (may, some, often), absolutes (all, only, never), contrast words, numbers: carried only by the key, or never;
- the first word or grammatical frame of the key versus the distractors;
- the key repeating words from the passage or the prompt more (or less) than the distractors;
- a recurring distractor recipe whose members are never the key (an over-general option, a one-paragraph detail, an
  opposite, an "odd one out" in a vocabulary set, a negative option, an extreme option);
- tone: the key being the most positive, balanced, moderate or "sensible" option;
- identical or near-identical key wording reused across items or passages;
- anything that repeats by kind or by author.

For each property, COUNT: in how many items does the property vary across the four options, and in how many of
those does the key carry it? A property is only a tell if the key carries it nearly always or almost never.

Write `probe/probe<RUN>.json` (the file name in your instructions) as:

```json
{
  "items_read": 152,
  "patterns": [
    {"property": "short name", "scope": "batch | author X | kind K", "items": ["ITR2-..."],
     "varies_in": 0, "key_has": 0, "use": "pick | eliminate", "evidence": "counts and two or three quoted examples"}
  ],
  "checked_clean": ["property: key_has / varies_in, one line each for what you checked and found mixed"]
}
```

List in `patterns` only properties where the key carries it in at least 75% or at most 0% of the items where it
varies, on 3 or more items. Put everything you checked and found mixed in `checked_clean` with its counts. Read
nothing else in the repo. Claude only, no database. Reply with `items_read`, every pattern with its counts, and the
three strongest `checked_clean` lines.
