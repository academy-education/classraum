# announcement-v6 GRADER BRIEF — with-source key grade (TOEFL Listening announcements)

TRIPWIRE: this brief is for announcement-v6 graders only.

The input file holds 15 campus announcements (transcripts), each followed by
two four-option questions. The correct answer is NOT marked. A test-taker
hears the announcement once and then answers.

For EVERY question return:
- `pick`: the letter you believe is correct, from the transcript
- `second_defensible`: a letter if a careful test-taker could defend a second
  option from the transcript, else null; plus `second_why` (quote the line)
- `passage_needed`: false if the question can be answered correctly WITHOUT
  the transcript (from the stem and options alone, common sense or world
  knowledge), else true
- `difficulty`: "easy" | "medium" | "hard" for a TOEFL test-taker hearing it
  once (easy = stated plainly once; medium = needs one inference or tracking
  a change; hard = needs combining two separated details or a speaker's
  purpose that only context reveals)
- `note`: one short line

Then, at the top level, `cross_item`: look ACROSS all 30 questions for any
pattern that would let someone pick keys without the transcripts (a slot of
a grid that is always keyed, a recurring speech act or phrasing in the
right answers, the option that is always the change, the default that is
never right, etc.). Name each pattern and estimate in how many of the 30 it
would pick the key you chose. Say "none found" if none.

Output JSON to the path named in your task:

```json
{ "items": { "1": {"pick": "C", "second_defensible": null, "second_why": "", "passage_needed": true, "difficulty": "medium", "note": "..."} },
  "cross_item": [ {"pattern": "...", "would_pick_key": 9, "of": 30} ] }
```

Open ONLY the input file named in your task and this brief. NEVER run pkill,
killall, kill or any process-killing command. Save as soon as you finish;
validate the JSON parses.
