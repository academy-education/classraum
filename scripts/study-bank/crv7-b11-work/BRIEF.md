# Choose a Response (TOEFL Listening): author 20 items, four-world method, STRICT kills

You write TOEFL "Choose a Response" items for Classraum. The student hears ONE short spoken line and picks the most
natural reply from four. A human reviewer (the co-founder) rejects any item where a SECOND reply would also be a
natural thing to say. Read `COFOUNDER-BRIEF-A.md` (his standard) and `b9-example-quads.py` (the exact format) first.

## Why the last batches failed
We author each item as FOUR symmetric "worlds": each world has a spoken line and the natural reply to it. A script
later picks one world at random as the spoken line; the other three worlds' replies become the wrong answers. That
hides which reply was authored as "the answer". But in batches 8-9, 17 of 53 items were flagged: the wrong replies
were still perfectly natural reactions to the selected line ("Sure, I could use the extra hours" to "Can you work
Saturday instead of Friday?"), because the kills only said "the line doesn't mention X".

## The new rule (this is the whole job)
**Every world's line must make each of the other three replies WRONG: contradicted, impossible or nonsensical as a
reply to that line, not merely less likely or not mentioned.** A strong kill points at a FACT in the line that the
other reply denies or presupposes falsely:
- the reply assumes something is ready / available / approved, and the line says it is not;
- the reply answers a yes/no question when the line asks a which/when question, or the reverse;
- the reply accepts an offer, and the line made no offer (it refused, or asked something);
- the reply refers to an object, time or person that the line rules out ("I'll take it now" vs "it'll be ready
  Thursday").
Weak kills you must NOT rely on: "nothing about cost", "the line doesn't mention X", "a different topic".
**Test each reply against each OTHER line by asking: could a polite, sensible person say this reply to that line?
If yes even with a stretch, rewrite until no.** The easiest way: make each reply commit to the situation its own
line creates (e.g. "Then I'll come back for it Thursday" only fits a not-ready line; "Window seat, please" only fits
a seat-choice question), while still not repeating a content word of its own line (that is a different tell).

## Format and other rules
- Write `quads-X.py` (X given in your task) producing `crv7-b11X-quads.json` = {"items":[...]} with 20 items,
  localIds `cr15-X01`..`cr15-X20`, using the W()/item() helpers exactly as in the example.
- 4 worlds per item, kinds from: good news, bad news, neutral info, question, request, offer, correction (vary them;
  use at least 3 kinds per item). Lines 5-14 words, everyday campus or city service situations, natural spoken
  English with contractions. Replies within 1.5x length of each other in an item.
- Each kill quotes 2+ consecutive words of that world's line in double quotes, then says why the other reply is
  CONTRADICTED.
- No reply repeats a content word of its own line. No line or reply may duplicate any text in
  `existing-cr-text.txt`, and no setting may repeat one in `used-settings.txt` or another item.
- `explanationIfSpoken` never names a letter or option position.
- Run `python3 quads-X.py` and then, from the repo root,
  `node scripts/study-bank/render-crv7.mjs --in ../../scratchpad/crv7-b11-work/crv7-b11X-quads.json --out ../../scratchpad/crv7-b11-work/check-X --seed-offset 1100 --force`
  only to confirm it does NOT print "REFUSING" (it writes check-X.* files in this folder; ignore them). Fix every problem.

## When done
Reply with: the render result line, your kinds distribution, and the 3 items whose kills you consider weakest.

## Additions for batch 11 (lessons from batch 10)
- `b10-strict-example-quads.py` is a batch written to this strict rule (4/40 flagged); match its approach.
- **Balance kinds across your 80 worlds:** about 11-12 of each of the seven kinds. Batch 10 was heavy on question /
  bad news / good news, which forced 17 selection re-rolls.
- **Keep replies in an item within 1.3x length of each other** (tighter than 1.5x). Batch 10's selected key came out
  the shortest option on 36% of items, which a test-taker could exploit.
- The three batch-10 drops were replies that stayed natural after the line: a side comment ("Thanks, mine are cracked
  anyway"), a follow-up plan ("Please put my daughter's name down, then"), and a related question ("Oh, where can my
  old printer go, then?"). Test every reply for those three escape routes against every other line.
