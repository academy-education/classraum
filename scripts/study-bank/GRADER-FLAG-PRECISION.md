# A grader's flags are a queue, not a finding — 33% precision, measured

**2026-09-01.** During the TOEFL reading regrade, difficulty graders
volunteered defect reports nobody asked them for. Acting on them
directly would have been a mistake, and the size of the mistake is now
measured.

## Two claims, both checked

**"Two items quote text their passage does not contain."** R0328 asks
about "subject to availability", R0330 about "time permitting", against
passages the grader said read "space permitting". BOTH PHRASES ARE
PRESENT in their own passages. The claim is false. I relayed it to Andy
as "two unambiguous bugs" before running a check that took two seconds.

**"Nine items have two defensible answers."** Sent to an independent
adjudicator told the first opinion was unreliable, and that a merely
tempting distractor is a working distractor rather than a defect.
Verdict: **6 sound, 3 ambiguous, 0 miskeyed. Precision 33%.**

## The failure mode is one thing, and it explains both

The adjudicator diagnosed it without being asked to:

> The reader appears to be scoring options for standalone plausibility
> rather than testing each against the text — which is exactly the
> failure mode behind their earlier "phrase not in the passage" errors:
> both come from not going back to the words.

Every overturned flag has the same shape: a distractor plausible IN THE
WORLD, where one specific phrase in the passage or stem eliminates it —
R0433's "particularly ballet dancers", R0494's "this weekend", R0016's
"a partnership called symbiosis", R0336's "not required".

## But recall is good, and that is why the queue is worth having

The three upheld flags are real, and one is a defect no structural check
here could ever have caught:

- **R0100** — a NOT-question with TWO correct answers. The key is
  explicitly negated by the passage; the rival, "cost reduction
  challenges", is never given as a challenge either, because the passage
  presents cost reduction as an ACHIEVEMENT. Repaired by replacing the
  rival with a challenge the passage states in its own words.
- **R0225** — key reads the hedge's FUNCTION, rival reads its literal
  CONTENT, and the notice adjudicates neither.
- **R0240** — both options fit the passage's own definition of cognitive
  dissonance.

All three repaired by changing ONE DISTRACTOR, with the script asserting
the key neither changed nor moved position. Moving a key silently
changes what an item tests.

## The rule

**Treat a grader's defect flags as a candidate queue that must not be
acted on directly.** Adjudicate every one before repair and expect
roughly two-thirds to be noise. Distrust in particular any claim that
rests on something being ABSENT from a passage — that is the shape both
of this reader's errors took, and absence is exactly what a reader
skimming for plausibility gets wrong.

The queue is still worth running. 3 real defects in 9 flags is a good
yield for free observations, and R0100 would not have been found any
other way.
