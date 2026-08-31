# reading-worlds-s5 — RESULT (2026-08-31)

**Shipped 50 of 54. Yield 92.6%** (s4 89.3%, s3 93.6%, bar 60%).

ISEE reading 48 → 75 drawable against a 36-item section: two forms.

## Gates

    kill spans        648/648 verbatim
    keyword parity    clean
    blind attack      mean 13.6%  ctl 33.3%  margin −19.8  PASS
                      every item position below chance
    cross-variant     54 judged, ALL 648 spans read, 4 FAIL

## The four dropped, and they are two shapes

    I08-1, I08-2   the kill reverses an event's DIRECTION instead of
                   denying the event. "The supreme court refused the
                   company its rate rise in 1901" concedes the ruling
                   happened, while the option text reads only "the
                   supreme court's ruling on rates" — direction-neutral,
                   and still literally true of the passage. The other
                   three siblings get flat event-denials. A stronger
                   sentence exists in the same passages and is assigned
                   to Q3 instead.

    I03-5, I08-5   the variant's OWN keyed sentence entails the sibling's
                   option, and the kill then denies it. W3 says Priest
                   "read the council's papers and none of the company's"
                   — which entails "weak on the company" — and the kill
                   asserts he is "nowhere weak on the company". The
                   passage argues with itself.

Both are new shapes. The three that cost s4 nine items — short fragment
against a compound option, outcome-refutation against an attitude, and
the outright backfire — do not appear anywhere in this batch, which is
the authoring brief working.

## The author's same-category claim, verified rather than accepted

It holds cleanly for I01, I02, I04, I07, I09; loosely for I03, I05, I06,
where the four judgements vary by DIMENSION (soundness, scope, evidential
base, significance) rather than being four values of one dimension; and
is materially false for I08 Q1/Q2, where three slot values are events
that did or did not happen and the fourth happened in every variant.

That loose-vs-false distinction is what predicted the failures: I03 and
I08 are exactly the topics that failed.

## A warning about the RENDERER, which I checked and partly corrected

The reviewer reported that variant index is perfectly confounded with
content — W1 always the first-listed cause, always the unqualified
endorsement, W4 always "right but of small consequence", 9/9 each.

Measured, it is 7/9 and 6/9, not 9/9. The reviewer overstated it.

But the substance is right and it matters: the confound exists in the
SOURCE, and the only thing keeping it out of the served item is the
renderer's seeded shuffle of both the shown variant and the option
order. Key letters by shown variant come out spread across all four.

**So that shuffle is load-bearing.** Anything that emits options in
W1..W4 order — a new renderer, a debug view, an export — reinstates a
deterministic key position. This is the same class as the ISEE maths
finding that ascending numeric order makes the letter check and the rank
check one check rather than two.

## Not failed, but worth fixing

Seven topics carry a passage-level incoherence: paragraph 2 denies a
candidate ever happened, paragraph 5 reports undoing it. "The high
school stands where it stood in 1974, and no plan to move it exists"
followed by "Moving the high school back was tried in 2019". Both push
the reader the same way so no kill is weakened, but a strong reader will
notice. Phrase the paragraph-5 line as a hypothetical trial.
