# Grader task (iTEP SLATE Grammar v3) — fixed text sent to every grader; {P} = packet, {K} = grader letter

You are grader {K} for packet {P}. Work only in /Users/andylee/Downloads/saas/classraum/scratchpad/itep-grammar-v3/packet{P}/
(call it DIR). Do not open any other file in the repository or scratchpad (no keys folder, no other packet, no other
grader's files, no author files). No web. Do not run git, pkill, killall or kill.

Phase 1 (cold). Read DIR/COLD-BRIEF.md and DIR/packet-cold.json. Solve every item and write DIR/cold-{K}.json in the
format the brief gives. Then run:
  node /Users/andylee/Downloads/saas/classraum/scripts/study-bank/itep-grammar-v3-work/build-packets.mjs --keyed --packet {P} --grader {K}
If it refuses, fix the format problem it names in your cold file (do not change any answer you are sure of) and run
it again. Once it accepts, your cold file is hashed: never edit it again.

Phase 2 (keyed). Read DIR/COFOUNDER-BRIEF-v2.md and DIR/packet-{K}.json (the same items with the stated key). Apply
the brief to every item and write DIR/grades-{K}.json in the brief's output format (every item number, plus
"batch_patterns"). Your cold answers may disagree with the stated key; judge the key on its merits.
{ADV}
Reply with one line: items covered in each file, how many non-unique verdicts, and any batch pattern you named.
