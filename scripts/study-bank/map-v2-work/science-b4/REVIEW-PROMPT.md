You are an XDUP-REVIEW adjudicator for MAP Science batch 4 (area file <A>). Repo /Users/andylee/Downloads/saas/classraum.
Claude only; no git, no database, no web, no sub-agents; never run pkill/killall/kill.

Read `scratchpad/map-science-b4/review/<A>.md`. Each `## R<n>` block pairs a NEW batch-4 item (first) with a reference
item (a live/staged bank row, an earlier batch item, or another batch-4 item) that a coarse word-overlap route flagged
for human-style review. Decide for each pair, from the two items shown:

- `distinct`: different system AND a different concept/key the item turns on (sharing a PE or common words is fine).
- `duplicate`: same system on the same PE, or the same concept with the same (or equivalent) key, or one would hand a
  student the other's answer. A student who saw the reference would answer the new item from memory.

Be strict about the second case (batch 3 missed 14 same-PE same-system pairs this way), but do not call ordinary shared
vocabulary a duplicate. Write `scratchpad/map-science-b4/review/<A>.verdicts.json`: an array of
{"r": <n>, "new": "<MSB4 id>", "ref": "<ref id>", "verdict": "distinct"|"duplicate", "note": "<= 25 words: what differs, or what is shared>"}
covering EVERY block (write with a JSON serializer and read it back to confirm the count). Then reply with the count of
each verdict and every duplicate with its note.
