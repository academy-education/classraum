# reading-worlds-s4 — RESULT (2026-08-31)

**Shipped 75 of 84. Yield 89.3%** (s3 was 93.6%, pre-registered bar 60%).

SSAT reading 41 → 83 drawable against a 40-item section. It could not
fill one form before this run; it now fills two.

## Gates

    kill spans        1680/1680 verbatim
    keyword parity    0 LONE, 27 INVERTED (s3 shipped with 118/160)
    blind attack      mean 28.6%  ctl 21.4%  margin +7.1  PASS
    cross-variant     84 judged, all 1680 spans read, 7 FAIL
    with-passage QC   NO DISCRIMINATING POWER — see below

## The QC vote is not an instrument

Three SEPARATE agents, fresh context each, key withheld, different
reading stances:

    distinct answer-strings   1 of 3
    agreement with key        84/84, 84/84, 84/84

Same-model agents converge on reading comprehension, so the vote cannot
return a negative. "3 of 3 agree with the key" is a tautology.
Full write-up in QC-VOTE-INDEPENDENCE.md.

What DID work is the FLAGGING task — a judgement the model can vary on.
Two independent agents each flagged RW4-S09-6 and RW4-S12-5 without
seeing each other's work.

## The 9 dropped

Seven from cross-variant, two from both readers:

    S11-1,-2,-3   the kill denies a FACT while the option names a DESIRE.
                  Four of five reasons are checkable ("My hands were
                  whole"); the fifth is the narrator's wish, and the
                  author supplied a parallel-looking denial about someone
                  ELSE's wish. Does not refute.
    S14-6         BACKFIRE, and live. "It wants dancers of sixty" beside
                  "The company is young" makes the sibling's option TRUE.
                  The shipped item had three defensible answers.
    S17-1         four options read "how <cause> falsified a river
                  record", the null variant reads "how a river record
                  survived its tests" — and the odd frame is the key.
    S19-3         a dropped negation: "would have prevented it" should
                  read "would have prevented nothing". Latent, since the
                  shipped item used W1.
    S09-6         the photographs "supply a date: the bare verge first
                  shows in the frame for 1971" — dating the onset of
                  failure, not any road treatment. Answerable only by
                  elimination.
    S12-5         the stem asks the attitude to the LOCAL HISTORIES; the
                  key praises the churchwardens' book.
    S15-5         the passage both grants and denies the rival option.

Repaired, not dropped: S16-2's stem said "ledgers and letters" where the
passage has only ledgers. Prompt-only edit; no passage, option or kill
span touched, so the measured attack still describes it.

## The reviewer refuted the author's own claim

One author asserted its remedy-option kills work because every inference
stem carries a "nothing else on that list is at fault" clause. The
reviewer checked and inverted it: that clause exists only in S09–S15.
S16–S22 carry no such clause and instead give a bespoke negation per
option, which is strictly stronger — and the failures cluster in S11,
where the clause is left carrying the contradiction alone.

## The generalisation, and the proxy that could not capture it

The reviewer's finding: the mechanical negation template produces valid
kills whenever the five slot values are the SAME KIND of thing, and
breaks precisely when one is a different kind — a desire among facts, a
relation among permissions, a null among causes, a different object
among attitudes. 78 of 84 questions had uniform slots and passed.

check-slot-type.mjs tries to detect that cheaply and DOES NOT WORK:
4 of 7 known failures caught, 11 false alarms, precision 27%. Eighth
structural proxy, eighth failure, same reason — the defect is semantic
and a lexical category-guess is not a stand-in for reading. Kept and
scored so nobody builds a ninth.

**The observation belongs in the authoring brief, not in a checker.**

## Bank position

                need   before   after   forms
    SSAT read    40      41       83     2.08
    SSAT math    50      77       77     1.54
    SSAT verbal  60     101      101     1.68
    ISEE read    36      48       48     1.33
    ISEE math    84     130      130     1.55

Every section clears one form comfortably; NO family clears two, because
a second form needs every section at 2.0. Reading is no longer the
binding constraint on SSAT — verbal and math are.
