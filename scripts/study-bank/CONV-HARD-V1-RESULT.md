# conv-hard-v1 — HELD at the no-source bar (2026-10-02)

Pre-registration: PREREG-CONV-HARD-V1-2026-10-02.md. 22 two-question
Conversation sets (44 items), two Opus authors (CH01-11, CH12-22), DL-FRESH
brief + conversation shape + assigned cross-set variation. Preflight clean
(shape gate 0 blocking, 105-158 words, 8-11 turns; key uniquely longest
18.2%; hedge-only-in-key 2.3%; check-batch-joins clean).
`check-batch-variety.mjs` is NOT applicable to transcripts: the live control
fails the same two measures (pivot 100%, opening word 4%) because it was
built for Choose-a-Response single lines.

## Attack (SPLIT=2, 3 Haiku samples per file, control in the same agents)

    candidate   44 items   mean 56.8%   best-fixed-letter 27.3%   margin +29.5   HOLD (bar <= +15)
    live ctrl   24 items   mean 86.1%   best-fixed-letter 25.0%   margin +61.1   (reported, not decisive: >= 85% ceiling rule)

Unanimity rate 45.5% candidate vs 75.0% control (same correlated solvers).
Elimination: 3 sets with an option certain-rejected by 2+ samples
(CH01, CH16, CH22); no key was ever certain-rejected.

The candidate is 29 points less guessable than the shipped bank and still
fails its own bar by 14.5 points. Not inserted; no item repaired or
cherry-picked (selecting the attack's survivors would be fitting to it).

## Where it leaked — by item kind, not by author

Every item solved by both of the first two samples is one of three kinds:

1. **The quoted line carries its own function.** "Why does the adviser say,
   'Most people do'?", "'We've gone in worse'", "'You could pay that'",
   "'That's unusual for an argument essay'", "'It's already up. I did it
   Sunday'", "'that's the other mistake'". The quote IS the source; the
   key is its context-free reading. Solver c: "Parsing what quoted phrases
   presuppose ... These yielded confident picks."
2. **The stem narrates the story.** "attitude AFTER CHECKING THE SIGN" ->
   embarrassed about an outdated rule; "Why does the TA mention that A
   CORRECTION WENT OUT" -> the student's idea was outdated; "the transfer
   EXCEPTION" -> still has a cutoff, only later.
3. **Lexical echo / majority family.** "Option text directly mirrors
   question phrasing" (solver c); "Three of four options name Osric"
   (solver a, CH07-1).

What held at 0/3: detail items built as a crossed 2x2 grid with the
atypical fact (CH01-2 Thursday/Wednesday x 9:40/2:15), and quoted-line
items whose context-free reading points at a DISTRACTOR ("'Nobody's on
air'" -> keyed "moving the show to Tuesday isn't possible"; "'if a
recruiter actually said that'" -> keyed "a recruiter's word outweighs the
email"; "'Ruth was at that meeting, and I wasn't'").

## Brief revision 1 of 2 -> conv-hard-v2 (fresh items, same bars)

See the addendum in the pre-registration.
