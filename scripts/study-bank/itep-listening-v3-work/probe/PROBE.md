# Cross-item probe: can a student pick keys from patterns ACROSS items?

You are reviewing a batch of 32 listening items (English-learner listening test for teenagers; four options each):
eight 2-3 minute conversations, four questions each, written by eight authors (`round: "v3"`). Students HEAR each
transcript once and never see it; they see the question and the four options. Read `probe/items.json` in this
directory. Each set shows its speakers (W = the woman, M = the man), transcript, and each item's kind, prompt, four
choices and its `key`. The file also holds 4 conversations (16 items) marked `"shipped": true, "round": "v2"`: they are
already in the bank and students will see them in the same test section. Use them as context: a pattern that spans
both rounds is a pattern; but COUNT only the 32 v3 items, and list only v3 qids in `items`.

Your only question: **across items, is the key guessable from a pattern** — something a student who had seen some of
these items could use to pick or eliminate options on a new item without listening? Do NOT judge whether each item is
correct; other reviewers do that. Look across the whole batch, within each author and within each
kind (main-idea, detail, inference, intent-next, purpose, relationship, attitude).

Check at least these, and anything else you notice:
- the key's length rank among the four options; the key being the widest / most general option, or never the widest;
- the key repeating words from the transcript or the prompt more (or less) than the distractors;
- hedges (may, some, probably), absolutes (all, only, never), contrast words, numbers, negatives: only on the key, or never;
- the first word or grammatical frame of the key versus the distractors;
- which speaker the key favours: the one who speaks first, speaks last, talks most, is older or in charge, makes the
  suggestion, objects; whether conversations always end in agreement or compromise;
- tone: the key being the most cooperative, polite, positive, cautious, sensible or "lesson" option; a distractor
  built from tone (stiff, rude, careless) that is never the key;
- a recurring distractor recipe whose members are never the key (an over-general option, a detail from another
  moment, the wrong speaker, the opposite, an extreme option, an option about the real world rather than the talk);
- whether the plan made first in a conversation is ever the key, or always the one replaced; how undecided endings are keyed;
- main-idea items: which of the four whole-conversation summaries is keyed (the broadest, the one naming the outcome,
  the one naming a compromise);
- identical or near-identical key wording or key idea reused across items or scripts;
- anything that repeats by kind or by author.

For each property, COUNT: in how many items does the property vary across the four options, and in how many of those
does the key carry it? A property is only a tell if the key carries it nearly always or almost never. The position
of the key in the stored `choices` order is NOT a property (choices are reshuffled for every student): ignore it.

Write `probe/probe<RUN>.json` (the file name in your instructions) as:

```json
{
  "items_read": 32,
  "patterns": [
    {"property": "short name", "scope": "batch | author X | kind K | across rounds", "items": ["ITL3-..."],
     "varies_in": 0, "key_has": 0, "use": "pick | eliminate", "evidence": "counts and two or three quoted examples"}
  ],
  "checked_clean": ["property: key_has / varies_in, one line each for what you checked and found mixed"]
}
```

List in `patterns` only properties where the key carries it in at least 75% or at most 0% of the items where it
varies, on 3 or more items. Put everything you checked and found mixed in `checked_clean` with its counts. Read
nothing else in the repo. Claude only, no database. Reply with `items_read`, every pattern with its counts, and the
three strongest `checked_clean` lines.
