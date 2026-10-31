# Cross-item probe: can a student pick keys from patterns ACROSS items?

You are reviewing a batch of 56 listening items (English-learner listening test for teenagers; four options each)
written by four authors. Students HEAR each transcript once and never see it; they see the question and the four
options. Read `probe/items.json` in this directory. Each set shows its part (1 short dialogue, 2 conversation,
3 lecture), speakers (W = the woman, M = the man, S = the lecturer), transcript, and each item's kind, prompt, four
choices and its `key`.

Your only question: **across items, is the key guessable from a pattern** — something a student who had seen some of
these items could use to pick or eliminate options on a new item without listening? Do NOT judge whether each item is
correct; other reviewers do that. Look across the whole batch, within each author, within each part and within each
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
- lecture keys: always the speaker's own view, always the "surprising" or "nuanced" claim, always the conclusion;
- identical or near-identical key wording or key idea reused across items or scripts;
- anything that repeats by kind, by part or by author.

For each property, COUNT: in how many items does the property vary across the four options, and in how many of those
does the key carry it? A property is only a tell if the key carries it nearly always or almost never. The position
of the key in the stored `choices` order is NOT a property (choices are reshuffled for every student): ignore it.

Write `probe/probe<RUN>.json` (the file name in your instructions) as:

```json
{
  "items_read": 56,
  "patterns": [
    {"property": "short name", "scope": "batch | author X | part P | kind K", "items": ["ITL1-..."],
     "varies_in": 0, "key_has": 0, "use": "pick | eliminate", "evidence": "counts and two or three quoted examples"}
  ],
  "checked_clean": ["property: key_has / varies_in, one line each for what you checked and found mixed"]
}
```

List in `patterns` only properties where the key carries it in at least 75% or at most 0% of the items where it
varies, on 3 or more items. Put everything you checked and found mixed in `checked_clean` with its counts. Read
nothing else in the repo. Claude only, no database. Reply with `items_read`, every pattern with its counts, and the
three strongest `checked_clean` lines.
