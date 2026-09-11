# act-english-v2c: repair four items, do not drop them

Three independent graders, all three reporting the same file hash
(`6eedc8d0decc9…`, 30,101 bytes) before and after grading. **All three agreed
with all 10 keys.** No key is wrong.

**Dropping is not available.** `PER_PASSAGE.english = 10` in
`act-bank-helper.mjs` — an ACT English passage ships exactly ten items or the
structure check refuses it. Six survivors cannot insert. Every flagged item
has to be fixed in place.

## The four that must change

**Q01 — comma before an appositive, keyed No Change. 2 of 3 graders call it
non-exclusive, and the batch's own explanation is wrong.** The colon
distractor is defensible: the colon rule is that everything *before* the colon
be a complete sentence, and "The second bay past the scale house belongs to
Odile Bracht, whose bench turns out no parts, only a pattern" is one. CMOS
6.61-6.63 licenses a colon amplifying exactly this. The explanation rejects it
by applying the independent-clause test to "whose bench turns out no parts" —
the wrong span. It also reads worse than the distractor: the key leaves four
commas in one sentence, three of them stacked.
*Fix:* make the pre-colon span genuinely non-independent, or replace the colon
distractor with a dash. **And rewrite the explanation** — it currently states
a false rule.

**Q03 — all three distractors die on one cue. weak/weak/weak, unanimous.**
"over the eleven hours" sits within four words after the blank and kills the
whole option set by itself; one grader called it "one test wearing four hats"
and regraded the item easy. This is the recorded four-words-after defect in
its purest form.
*Fix:* move the resolving phrase upstream or past the window, and give at
least two distractors a failure mode the cue does not reach.

**Q08 — possessives, `shops` -> `shop's`. Non-exclusive, and the explanation
misstates the grammar.** Bare `shop` is also correct: "a strip of tape on the
shop door" is an ordinary attributive-noun compound, like *barn door* or *car
door*. The stem asks what is "most acceptable" and both are. The explanation
rejects `shop` for having "nothing to show ownership", but attributive nouns
are not required to show ownership — that is what distinguishes them from
genitives, and `shop` is among the freest-compounding nouns in English.
*Fix:* one substitution — a head noun that will not compound, or move the
possessive to `Bracht's` / `the foreman's`.

**Q10 — sentence placement, keyed [A]. Non-exclusive.** [B] is defensible:
there the sentence explains the just-asserted "sized from a guess" and hands
off to "Bracht takes the published figure for the nearest metal", with a
lexical link on "published figure" that [A] lacks. The explanation's rebuttal
("explains a problem the paragraph has already begun solving") is false at
[B] — nothing is solved yet. [C] and [D] are correctly dead.
*Fix:* give [B] a reason to fail that the text actually supports.

## Three more the graders flagged that did not drop the item

**Q04 (add-a-sentence) — all three graders agree it is worse than the author's
own 50% estimate**, and this is the 76%-blind Production-of-Writing stratum.
Two free eliminations with no passage at all:
- The stem QUOTES the candidate sentence. Option A claims it supplies "the
  exact fraction"; the sentence contains no number, so A self-refutes from the
  stem alone.
- Option D runs the essay-scope denial formula, which is almost never the key
  in a four-option add-sentence item.
That leaves B vs C, and B is the generic forward-link rationale correct on
most such items. *Fix is on the distractor side:* strike "exact fraction" from
A so it stops self-refuting, and replace D's scope denial with a local claim
only checkable in the text.
Separately, with the source: the added sentence opens "**The** fraction" while
paragraph 2 introduces no fraction (the eighth-of-an-inch figure first appears
in paragraph 3). Two graders found it independently. Exclusivity survives only
because no *No* option states that reason. Give paragraph 2 a fraction, or
reword to "That allowance".

**Q05 — resolved two words after the blank** ("aluminum shrinks" is a full
subject + finite verb, so the semicolon is settled without reading upstream).
Also a prose defect two graders raised separately: "Bronze shrinks" carries no
quantity, sitting between gray iron's eighth-inch-per-foot and aluminum's
"nearly twice as much as gray iron". It reads like a clause that lost its
measure. Supplying the quantity fixes the prose AND pushes the cue off the
blank.

**Q02 — the option set is three singular against one plural**, so the odd one
out is visible blind. Swapping `has been` for `were` makes number and tense
settle separately.

## What the graders said is already good — do not touch it

**Q06 and Q02 are the two clean Conventions items** on the four-words-after
test: both force backward reading across an intervening phrase or a full
series. Q06 is named the model item. **Q09 is the best hard item in the
batch** and `assumption` the strongest distractor present; it is clean because
the blank is sentence-final so all evidence is upstream. One grader warns it
survives on the frame rather than the semantics — "sized from a ___" selects a
quantity — so if that sentence is ever reworded away from "sized from", the
item goes to two answers.

## After repair

Re-run `act-bank-helper.mjs check english`, then a FRESH three-grader
with-source pass — the grades above describe the old bytes and do not transfer.
